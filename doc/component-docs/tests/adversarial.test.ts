/**
 * Hostile input, driven all the way through to the bytes that reach disk.
 *
 * `mdx.test.ts` proves the serializer escapes each construct and that the guard
 * rejects each construct. This file proves the two compose: that a record whose
 * every string is an injection payload produces a FILE — frontmatter, body and
 * all — that carries nothing active, and that the failures which do fire say
 * enough to fix the problem without repeating the value that caused it.
 *
 * The payload classes are the ones the epic enumerates: markup and JSX,
 * directives and ESM, fences and frontmatter breaks, attribute escapes,
 * disallowed URL schemes, control characters, Unicode composition, reserved
 * routes, and duplicate identities.
 */

import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { assertMdxSafe, serializeBody, paragraph, text } from "../core/mdx.ts";
import { buildPage } from "../core/page.ts";
import { assertAnchorIntegrity, runPipeline } from "../core/pipeline.ts";
import { PublicationPolicy } from "../core/publication.ts";
import { recordSlug } from "../core/ids.ts";
import { safeText } from "../core/text.ts";
import { classifyUrl } from "../core/url.ts";
import { buildRecordIndex } from "../core/render/shared.ts";
import { renderRecord } from "../core/render/record.ts";
import { indexEvidence as rawIndexEvidence } from "../adapters/circuit/evidence.ts";
import { projectIndex, createCircuitAdapter } from "../adapters/circuit/index.ts";
import { createPythonValidator } from "../adapters/circuit/validate.ts";
import {
  ALL_CANARY_STRINGS,
  FIXTURE_MATRIX,
  FIXTURE_SELECTION,
  fixtureBundle,
  fixtureIntegrationRules,
  fixtureInventory,
} from "./provider-fixtures.ts";

// zudo-pd's `EvidenceIndex` has no `references` field to attach (see
// `provider-fixtures.ts`) — this is `indexEvidence` unwrapped, kept under a
// local alias so the rest of this file reads the same as led-lamp's.
const indexEvidence = rawIndexEvidence;
import { GUARD_REJECTED_TEXT, HOSTILE_TEXT, fixtureModel } from "./fixtures.ts";

let scratch = "";

before(async () => {
  scratch = await mkdtemp(join(tmpdir(), "component-docs-adversarial-"));
});

after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

/** Every `<` and `{` in the body must be escaped or part of a whitelisted tag. */
function assertNothingActive(contents: string, where: string): void {
  const [, ...rest] = contents.split("\n---\n");
  const body = rest.join("\n---\n");
  // The guard is the authority; calling it here is the assertion.
  assertMdxSafe(body, where);
}

describe("a record built entirely from injection payloads still emits an inert file", () => {
  const model = fixtureModel();
  const index = buildRecordIndex(model);
  const hostile = model.records.find((record) =>
    record.identity.function.includes("brace {expr}"),
  );

  it("has a hostile record to render", () => {
    assert.ok(hostile, "the fixture corpus no longer contains a hostile record");
  });

  it("passes the guard on the fully assembled page, frontmatter included", () => {
    assert.ok(hostile);
    const page = renderRecord(hostile, index);
    assertNothingActive(page.contents, page.relativePath);
  });

  it("keeps the frontmatter to exactly two fences and three known keys", () => {
    assert.ok(hostile);
    const page = renderRecord(hostile, index);
    const lines = page.contents.split("\n");
    const fences = lines
      .map((line, position) => ({ line, position }))
      .filter((entry) => entry.line === "---");
    assert.equal(fences.length, 2, "an evidence string opened or closed a second document");
    assert.equal(fences[0]?.position, 0);

    const header = lines.slice(1, fences[1]?.position);
    const keys = header
      .filter((line) => !line.startsWith("#"))
      .map((line) => line.slice(0, line.indexOf(":")));
    assert.deepEqual(keys, ["title", "description", "sidebar_position"]);
  });

  it("renders the payload as visible text rather than dropping it", () => {
    // Escaping that silently deleted the value would be worse than a live one:
    // the page would show a different claim from the evidence and look correct.
    assert.ok(hostile);
    const page = renderRecord(hostile, index);
    for (const fragment of ["brace", "angle", "pipe", "backslash", "directive"]) {
      assert.ok(page.contents.includes(fragment), `payload fragment ${fragment} was dropped`);
    }
  });
});

describe("payload classes the guard must neutralise", () => {
  const payloads: readonly [name: string, value: string][] = [
    ["MDX expression", "limit is {process.env.SECRET}"],
    ["JSX element", 'see <Danger onClick="steal()">here</Danger>'],
    ["raw HTML", '<img src=x onerror="alert(1)">'],
    ["script tag", "<script>fetch('//evil')</script>"],
    ["attribute break", 'id="a" onload="alert(1)" x="'],
    ["directive", ":::danger\nnot a real admonition\n:::"],
    ["ESM import", "import secrets from './secrets.js'"],
    ["ESM export", "export const leak = 1"],
    ["frontmatter fence", "---\ntitle: injected\n---"],
    ["nested code fence", "```\n```js\nalert(1)\n```\n```"],
    ["template literal", "value ${globalThis.process.env}"],
    ["autolink", "<https://evil.example.com/>"],
    ["entity-encoded tag", "&lt;script&gt;alert(1)&lt;/script&gt;"],
  ];

  for (const [name, value] of payloads) {
    it(`renders ${name} inert`, () => {
      const safe = safeText(value, { field: "test", allowNewlines: true });
      const body = serializeBody([paragraph([text(safe)])]);
      // Throws if anything survived active. Nothing else needs asserting: the
      // guard is what the build itself relies on.
      assertMdxSafe(body, `${name}.mdx`);
    });
  }

  it("refuses a control character rather than stripping it into a different claim", () => {
    assert.throws(
      () => safeText("42\u0000 V absolute maximum", { field: "fact.value" }),
      (error: unknown) => error instanceof ComponentDocsError && error.code === "UNSAFE_VALUE",
    );
  });

  it("refuses a bidi override that could reorder a published limit", () => {
    assert.throws(
      () => safeText("V\u202emax 42", { field: "fact.value" }),
      (error: unknown) => error instanceof ComponentDocsError && error.code === "UNSAFE_VALUE",
    );
  });

  it("emits identical bytes for the two Unicode spellings of the same text", () => {
    // Composed vs decomposed. Without NFC the generated file differs between
    // machines and CI's freshness check fails for a reason no one can see.
    const composed = safeText("Nexperia caf\u00e9 revision", { field: "test" });
    const decomposed = safeText("Nexperia cafe\u0301 revision", { field: "test" });
    assert.equal(
      serializeBody([paragraph([text(composed)])]),
      serializeBody([paragraph([text(decomposed)])]),
    );
  });
});

describe("disallowed URLs are refused, never downgraded into clickable output", () => {
  const schemes = [
    "javascript:alert(1)",
    "data:text/html;base64,PHNjcmlwdD4=",
    "file:///home/operator/private/mirror.pdf",
    "vbscript:msgbox(1)",
    "//evil.example.com/datasheet.pdf",
    "/etc/passwd",
    "C:\\Users\\operator\\datasheet.pdf",
    "../../../../etc/shadow",
    "https://user:password@example.com/ds.pdf",
    "https://example.com/a b.pdf",
  ];

  for (const candidate of schemes) {
    it(`denies ${candidate.slice(0, 32)}`, () => {
      assert.equal(classifyUrl(candidate).decision, "DENY");
    });
  }

  it("publishes such a value as inert text when it arrives in a text field", () => {
    // A denied URL is not silently dropped from the page — the evidence still
    // says what it says. It just never becomes a link.
    const safe = safeText("mirror at file:///private/x.pdf", { field: "source.locator" });
    const body = serializeBody([paragraph([text(safe)])]);
    assertMdxSafe(body, "inert.mdx");
    assert.ok(body.includes("file:///private/x.pdf"));
    assert.equal(body.includes("](file:"), false, "a denied scheme became a link target");
  });
});

describe("identity collisions fail the build rather than overwriting a page", () => {
  it("refuses a reserved route name", () => {
    for (const reserved of ["rec-index", "rec-search", "rec-sitemap", "rec-llms", "rec-con"]) {
      assert.throws(
        () => recordSlug(reserved),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "IDENTITY_COLLISION",
        `${reserved} was accepted as a route`,
      );
    }
  });

  it("refuses a duplicate anchor within one page", () => {
    const model = fixtureModel();
    const record = model.records[0];
    assert.ok(record);
    const collided = {
      ...model,
      records: [
        {
          ...record,
          // A fact anchored on the record's own identity anchor: two elements,
          // one HTML id, and a deep link that resolves to whichever came first.
          facts: record.facts.map((fact) => ({ ...fact, anchor: record.identity.anchor })),
        },
      ],
    };
    assert.throws(
      () => assertAnchorIntegrity(collided),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "IDENTITY_COLLISION",
    );
  });
});

describe("diagnostics stay actionable without repeating the value that failed", () => {
  /**
   * A bundle whose sources carry every canary AND whose facts carry a value
   * shape the projection refuses. The failure has to name the fact, and it has
   * to do so while the denied values are sitting right there in the same
   * objects.
   */
  function projectBroken(): void {
    const index = indexEvidence(fixtureInventory(), [
      fixtureBundle({
        facts: (facts) =>
          facts.map((fact, position) =>
            position === 0 ? { ...fact, value: true } : fact,
          ),
      }),
    ], fixtureIntegrationRules());
    projectIndex(index, new PublicationPolicy(FIXTURE_MATRIX, FIXTURE_SELECTION));
  }

  it("names the offending fact", () => {
    assert.throws(projectBroken, (error: unknown) => {
      assert.ok(error instanceof ComponentDocsError);
      assert.equal(error.code, "ADAPTER_CONTRACT");
      const rendered = error.message + JSON.stringify(error.detail);
      assert.ok(/fact-/u.test(rendered), "the failure does not identify the fact");
      return true;
    });
  });

  it("echoes no denied value into the message or the detail", () => {
    assert.throws(projectBroken, (error: unknown) => {
      assert.ok(error instanceof ComponentDocsError);
      const rendered = error.message + JSON.stringify(error.detail);
      for (const canary of ALL_CANARY_STRINGS) {
        assert.equal(
          rendered.includes(canary),
          false,
          `the failure echoed a denied value: ${canary.slice(0, 40)}`,
        );
      }
      return true;
    });
  });

  it("reports an unsafe value by field name, not by quoting the value", () => {
    const secret = "CANARY-UNSAFE \u0007 bell inside an evidence extract";
    assert.throws(
      () => safeText(secret, { field: "source.evidenceExtract" }),
      (error: unknown) => {
        assert.ok(error instanceof ComponentDocsError);
        const rendered = error.message + JSON.stringify(error.detail);
        assert.ok(rendered.includes("source.evidenceExtract"), "the field is not named");
        assert.equal(rendered.includes("CANARY-UNSAFE"), false, "the value was echoed");
        return true;
      },
    );
  });
});

describe("invalid input fails before the generated tree is replaced", () => {
  it("leaves the previous output byte-identical when validation fails", async () => {
    const generatedRoot = join(scratch, "atomic");
    await runPipeline(createCircuitAdapter(), { generatedRoot, dryRun: false });

    const before = new Map<string, string>();
    for (const name of await readdir(generatedRoot)) {
      const path = join(generatedRoot, name);
      if (name.endsWith(".mdx")) before.set(name, await readFile(path, "utf8"));
    }
    assert.ok(before.size > 0, "the first run produced nothing to protect");

    const failing = join(scratch, "reject.py");
    await writeFile(failing, 'import sys\nsys.stderr.write("FAIL: seeded\\n")\nsys.exit(4)\n');

    await assert.rejects(
      runPipeline(
        { ...createCircuitAdapter(), validate: createPythonValidator({ scriptPath: failing }) },
        { generatedRoot, dryRun: false },
      ),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "VALIDATION_FAILED",
    );

    for (const [name, contents] of before) {
      assert.equal(
        await readFile(join(generatedRoot, name), "utf8"),
        contents,
        `${name} changed during a failed run`,
      );
    }
  });
});

describe("the HTML-comment guard is deliberately permanent", () => {
  /**
   * RULING (#64, and this is the decision the guard was waiting for): keep it.
   *
   * `assertMdxSafe` fails on any line containing `<!--`, and unlike the `{` and
   * `<` checks it does not ask whether the delimiter was backslash-escaped. #60
   * found that this makes evidence containing an HTML comment unpublishable
   * even though the serializer has already neutralised it, documented the
   * behaviour, and left the decision to whoever owns the guard.
   *
   * It stays, for three reasons:
   *
   *   - MDX has no HTML comment syntax. `<!--` is a PARSE ERROR there, not a
   *     comment, so it is not a construct with a well-defined inert form the
   *     way `\<` is.
   *   - The strictness is not redundant with the escape-aware `<` rule, it is
   *     deliberately stricter: it refuses the escaped spelling too. Escaped
   *     `<!--` would be relying on backslash handling staying identical across
   *     future remark/MDX majors, and comment handling is precisely where that
   *     has moved before.
   *   - The cost is a build that stops with a file, a line number and a reason,
   *     on a corpus where nothing triggers it. The remedy is an evidence
   *     decision by the evidence owner, which is where it belongs. The
   *     alternative failure — a page whose meaning depends on the compiler
   *     version — is silent.
   *
   * Relaxing it later is a publication decision, not a refactor.
   */
  it("rejects an HTML comment in evidence text", () => {
    const safe = safeText(GUARD_REJECTED_TEXT, { field: "test" });
    const body = serializeBody([paragraph([text(safe)])]);
    assert.throws(
      () => assertMdxSafe(body, "comment.mdx"),
      (error: unknown) => error instanceof ComponentDocsError && error.code === "UNSAFE_MDX",
    );
  });

  it("rejects it even once the serializer has escaped the angle bracket", () => {
    assert.ok(
      serializeBody([
        paragraph([text(safeText(GUARD_REJECTED_TEXT, { field: "test" }))]),
      ]).includes("\\<!--"),
      "the serializer no longer escapes the comment opener",
    );
    assert.throws(
      () => assertMdxSafe("a \\<!-- b", "escaped.mdx"),
      (error: unknown) => error instanceof ComponentDocsError && error.code === "UNSAFE_MDX",
    );
  });

  it("names the file and the line so the evidence owner can act on it", () => {
    assert.throws(
      () => assertMdxSafe("clean line\nsecond line with <!-- here", "records/x/index.mdx"),
      (error: unknown) => {
        assert.ok(error instanceof ComponentDocsError);
        assert.ok(error.message.includes("records/x/index.mdx"));
        assert.equal(error.detail.line, 2);
        return true;
      },
    );
  });

  it("still accepts the ordinary hostile payload, so the guard is not just strict", () => {
    const safe = safeText(HOSTILE_TEXT, { field: "test" });
    assertMdxSafe(serializeBody([paragraph([text(safe)])]), "hostile.mdx");
  });
});

describe("page assembly refuses a path that would escape the owned tree", () => {
  const frontmatter = {
    title: safeText("T", { field: "t" }),
    description: safeText("D", { field: "d" }),
    sidebarPosition: 1,
  };

  for (const path of [
    "../escape.mdx",
    "/absolute.mdx",
    "records/../../escape.mdx",
    "records/UPPER.mdx",
    "records/x.md",
  ]) {
    it(`refuses ${path}`, () => {
      assert.throws(
        () => buildPage(path, frontmatter, []),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "PATH_CONTAINMENT",
      );
    });
  }
});
