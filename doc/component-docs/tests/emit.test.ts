import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { assertContained, diffAgainstDisk, emit } from "../core/emit.ts";
import { GENERATED_MARKER, buildPage, isGeneratedContents } from "../core/page.ts";
import { paragraph, text } from "../core/mdx.ts";
import { literal } from "../core/text.ts";

let root = "";

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "component-docs-emit-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

function page(relativePath: string, body: string) {
  return buildPage(
    relativePath,
    {
      title: literal("Title"),
      description: literal("Description"),
      sidebarPosition: 1,
    },
    [paragraph([text(literal(body))])],
  );
}

describe("assertContained", () => {
  it("accepts a child path", () => {
    assert.equal(
      assertContained("/a/b", "/a/b/c/d.mdx", "test"),
      "/a/b/c/d.mdx",
    );
  });

  it("rejects a sibling that merely shares a prefix", () => {
    assert.throws(
      () => assertContained("/a/b", "/a/bc/d.mdx", "test"),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
    );
  });

  it("rejects traversal", () => {
    assert.throws(
      () => assertContained("/a/b", "/a/b/../../etc/passwd", "test"),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
    );
  });

  it("rejects the root itself", () => {
    assert.throws(() => assertContained("/a/b", "/a/b", "test"), ComponentDocsError);
  });
});

describe("buildPage", () => {
  it("marks generated output", () => {
    const built = page("index.mdx", "hello");
    assert.ok(built.contents.startsWith(`---\n${GENERATED_MARKER}\n`));
    assert.ok(isGeneratedContents(built.contents));
  });

  it("JSON-encodes frontmatter so evidence cannot break out of the block", () => {
    const built = buildPage(
      "index.mdx",
      {
        title: literal('He said "---" and: {x}'),
        description: literal("d"),
        sidebarPosition: 0,
      },
      [],
    );
    assert.match(built.contents, /^title: "He said \\"---\\" and: \{x\}"$/mu);
    // Exactly two fence lines: the open and the close of the frontmatter block.
    assert.equal(built.contents.split("\n").filter((line) => line === "---").length, 2);
  });

  it("rejects a path shape outside the owned tree's naming rules", () => {
    for (const bad of ["../escape.mdx", "/abs.mdx", "Upper.mdx", "index.md", "a//b.mdx"]) {
      assert.throws(
        () => page(bad, "x"),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
        `expected ${bad} to be rejected`,
      );
    }
  });
});

describe("emit", () => {
  it("writes, then reports unchanged on a second run (idempotent)", async () => {
    const plan = { root, pages: [page("index.mdx", "hello")] };

    const first = await emit(plan);
    assert.deepEqual(first.written, ["index.mdx"]);

    const second = await emit(plan);
    assert.deepEqual(second.written, []);
    assert.deepEqual(second.unchanged, ["index.mdx"]);

    const onDisk = await readFile(join(root, "index.mdx"), "utf8");
    assert.equal(onDisk, plan.pages[0]?.contents);
  });

  it("removes its own stale output", async () => {
    await emit({ root, pages: [page("index.mdx", "a"), page("gone.mdx", "b")] });
    const result = await emit({ root, pages: [page("index.mdx", "a")] });
    assert.deepEqual(result.removed, ["gone.mdx"]);
  });

  it("refuses to delete a hand-authored file found in the owned tree", async () => {
    await emit({ root, pages: [page("index.mdx", "a")] });
    await writeFile(join(root, "hand-written.mdx"), "---\ntitle: mine\n---\n\nkeep me\n", "utf8");

    await assert.rejects(
      emit({ root, pages: [page("index.mdx", "a")] }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
    );
    assert.match(await readFile(join(root, "hand-written.mdx"), "utf8"), /keep me/u);
  });

  it("refuses to walk a symlink inside the owned tree", async () => {
    await mkdir(join(root, "sub"), { recursive: true });
    await symlink("/etc", join(root, "sub", "escape"));

    await assert.rejects(
      emit({ root, pages: [page("index.mdx", "a")] }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
    );
  });

  it("writes nested pages", async () => {
    const result = await emit({ root, pages: [page("records/al8860mp-13.mdx", "x")] });
    assert.deepEqual(result.written, ["records/al8860mp-13.mdx"]);
  });

  /**
   * These assert on the OUTSIDE directory, not on the rejection.
   *
   * Before the path-walk guard, both cases already rejected — but from the
   * pruning walk at the very end of `emit`, which runs after the page has been
   * written. So "it throws PATH_CONTAINMENT" passed while the bytes had already
   * landed in the link target. The escape is only actually closed if the
   * outside directory stays empty.
   */
  describe("a symlink on the path out of the owned tree", () => {
    it("writes nothing outside when an intermediate directory is a symlink", async () => {
      const outside = await mkdtemp(join(tmpdir(), "component-docs-outside-"));
      try {
        await symlink(outside, join(root, "records"));

        await assert.rejects(
          emit({ root, pages: [page("records/escaped.mdx", "payload")] }),
          (error: unknown) =>
            error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
        );
        assert.deepEqual(await readdir(outside), [], "a page was written outside the owned root");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it("writes nothing outside when the root itself is a symlink", async () => {
      const outside = await mkdtemp(join(tmpdir(), "component-docs-outside-"));
      const linkedRoot = join(root, "linked-root");
      try {
        await symlink(outside, linkedRoot);

        await assert.rejects(
          emit({ root: linkedRoot, pages: [page("index.mdx", "payload")] }),
          (error: unknown) =>
            error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
        );
        assert.deepEqual(await readdir(outside), [], "a page was written outside the owned root");
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });

    it("refuses a drift check that would read through a symlinked parent", async () => {
      // `check:components` decides whether committed output is stale. Reading
      // through a symlink would compare against a file this generator does not
      // own and could report "up to date" for content it never wrote.
      const outside = await mkdtemp(join(tmpdir(), "component-docs-outside-"));
      try {
        await symlink(outside, join(root, "records"));

        await assert.rejects(
          diffAgainstDisk({ root, pages: [page("records/escaped.mdx", "payload")] }),
          (error: unknown) =>
            error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
        );
      } finally {
        await rm(outside, { recursive: true, force: true });
      }
    });
  });
});

describe("diffAgainstDisk", () => {
  it("reports nothing when the tree matches", async () => {
    const plan = { root, pages: [page("index.mdx", "a")] };
    await emit(plan);
    assert.deepEqual(await diffAgainstDisk(plan), []);
  });

  it("reports a missing, a changed and a stale page", async () => {
    await emit({ root, pages: [page("index.mdx", "a"), page("stale.mdx", "b")] });
    const drift = await diffAgainstDisk({
      root,
      pages: [page("index.mdx", "changed"), page("new.mdx", "c")],
    });
    assert.deepEqual(drift, ["changed: index.mdx", "missing: new.mdx", "stale: stale.mdx"]);
  });

  it("writes nothing", async () => {
    await diffAgainstDisk({ root, pages: [page("index.mdx", "a")] });
    await assert.rejects(readFile(join(root, "index.mdx"), "utf8"));
  });
});
