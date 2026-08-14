/**
 * The scanner's own correctness.
 *
 * `scan:artifacts` is the last gate between the evidence tree and the public
 * internet, and it is the one gate nothing else checks — a bug that makes it
 * report zero hits looks exactly like a clean build. So its logic is proven
 * here against constructed corpora rather than trusted because the real run
 * came back green.
 *
 * Every false-positive mode below was observed in the real corpus. They are
 * tested as behaviours, not as regressions against specific strings, so the
 * scanner keeps handling them after the evidence changes.
 */

import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import {
  assertNoLeaks,
  assertPositiveControls,
  assertRequiredRoutes,
  harvestCanaries,
  isBinaryContent,
  isBinaryPath,
  isNonCanary,
  normalizeForScan,
  readScanTargets,
  scanTargets,
  subtractPublishedElsewhere,
  MIN_CANARY_LENGTH,
  type Canary,
  type ScanTarget,
} from "../core/scan.ts";

const DENIED_KEYS = ["sha256", "evidence_extract", "alternate_authoritative_url", "positive"];

function harvest(document: unknown): readonly Canary[] {
  return harvestCanaries([document], { deniedKeys: DENIED_KEYS });
}

function values(canaries: readonly Canary[]): readonly string[] {
  return canaries.map((canary) => canary.normalized).sort();
}

let scratch = "";

before(async () => {
  scratch = await mkdtemp(join(tmpdir(), "component-docs-scan-"));
});

after(async () => {
  await rm(scratch, { recursive: true, force: true });
});

describe("normalisation folds the encodings artifacts apply", () => {
  it("undoes the MDX backslash escape that mutates a published URL", () => {
    // Observed: the citation URL serialises into MDX with a backslash before
    // the ampersand, so raw-byte comparison compares two different strings.
    const evidence = "http://www.ichjc.com/productDetail.html?type1=%E7%AE%A1&type2=2";
    const emitted = "http://www.ichjc.com/productDetail.html?type1=%E7%AE%A1\\&type2=2";
    assert.equal(normalizeForScan(emitted), normalizeForScan(evidence));
  });

  it("decodes the numeric character reference the serializer uses for MDX ESM", () => {
    // `import` at the start of a line cannot be backslash-escaped, so
    // `mdast-util-to-markdown` emits a character reference instead.
    assert.equal(normalizeForScan("&#x69;mportant limit"), normalizeForScan("important limit"));
    assert.equal(normalizeForScan("&#101;xport clause"), normalizeForScan("export clause"));
  });

  it("decodes the HTML entities the built pages carry", () => {
    assert.equal(normalizeForScan("A &amp; B &lt;tag&gt;"), normalizeForScan("A & B <tag>"));
    assert.equal(normalizeForScan("this&#39;s a quote"), normalizeForScan("this's a quote"));
  });

  it("decodes JSON string escapes, so the search index compares equal", () => {
    const evidence = 'he said "no" \\ then left';
    const inJson = JSON.stringify(evidence).slice(1, -1);
    assert.equal(normalizeForScan(inJson), normalizeForScan(evidence));
    assert.equal(normalizeForScan("caf\\u00e9 limit value"), normalizeForScan("café limit value"));
  });

  it("collapses whitespace, so a value reflowed across lines still matches", () => {
    assert.equal(
      normalizeForScan("mean sense threshold\n   is 96/100/104 mV"),
      normalizeForScan("mean sense threshold is 96/100/104 mV"),
    );
  });

  it("folds a value containing a literal backslash to the same string either way", () => {
    // The asymmetry this guards against: read raw from the evidence, `\ ` would
    // unescape to a space; read back out of JSON the same value arrives as
    // `\\` and would unescape to a backslash. One level of unescaping cannot
    // tell the two apart, and a canary that normalises differently from its own
    // leak never matches it. Deleting every backslash collapses both.
    const evidence = "path C:\\Users\\evidence limit";
    const inJson = JSON.stringify(evidence).slice(1, -1);
    assert.equal(normalizeForScan(inJson), normalizeForScan(evidence));
    assert.equal(normalizeForScan("a\\\\b"), normalizeForScan("ab"));
  });

  it("does not percent-decode, because published URLs keep their encoding", () => {
    assert.notEqual(normalizeForScan("%E7%AE%A1"), normalizeForScan("管"));
  });
});

describe("harvesting subtracts values that publish legitimately elsewhere", () => {
  it("keeps a value only a denied key holds", () => {
    const canaries = harvest({
      sources: [
        {
          source_id: "src-a",
          sha256: "a0c8c9a6524a044bdfca8814fd6be82fa220eb2e72070467991cb4f72b5a65f0",
          document_title: "A datasheet",
        },
      ],
    });
    assert.deepEqual(values(canaries), [
      "a0c8c9a6524a044bdfca8814fd6be82fa220eb2e72070467991cb4f72b5a65f0",
    ]);
  });

  it("drops a denied value that is a PREFIX of a published one", () => {
    // The real shape: `alternate_authoritative_url` is `http://www.ichjc.com/`
    // while `authoritative_url` is that plus a path. The denied string appears
    // in every correct build, because the published superstring contains it.
    const canaries = harvest({
      sources: [
        {
          alternate_authoritative_url: "http://www.ichjc.com/",
          authoritative_url: "http://www.ichjc.com/productDetail.html?type1=1",
        },
      ],
    });
    assert.deepEqual(values(canaries), []);
  });

  it("drops a denied value another record publishes through an allowed key", () => {
    const canaries = harvest({
      sources: [
        { source_id: "src-a", alternate_authoritative_url: "https://mirror.example.com/ds.pdf" },
        { source_id: "src-b", authoritative_url: "https://mirror.example.com/ds.pdf" },
      ],
    });
    assert.deepEqual(values(canaries), []);
  });

  it("keeps a denied value that merely SHARES A PREFIX with a published one", () => {
    // The converse of the case above, and the one an over-eager subtraction
    // would swallow: sharing a host is not being published.
    const canaries = harvest({
      sources: [
        {
          alternate_authoritative_url: "https://example.com/internal-mirror-archive",
          authoritative_url: "https://example.com/public-datasheet",
        },
      ],
    });
    assert.deepEqual(values(canaries), ["https://example.com/internal-mirror-archive"]);
  });

  it("treats a value under a denied key as denied however deeply it nests", () => {
    const canaries = harvest({
      routes: [{ aliases: { positive: [{ nested: ["steer toward this exact component"] }] } }],
    });
    assert.deepEqual(values(canaries), ["steer toward this exact component"]);
  });
});

describe("degenerate values are not canaries", () => {
  it("rejects the all-zero placeholder digest", () => {
    // A SOURCE UNAVAILABLE document carries 64 zeros. As a search term it
    // matched a zero run inside a `.wasm` bundle.
    const zeros = "0".repeat(64);
    assert.equal(isNonCanary(zeros), true);
    assert.deepEqual(values(harvest({ sources: [{ sha256: zeros }] })), []);
  });

  it("rejects any single-character repeat, not just zeros", () => {
    assert.equal(isNonCanary("f".repeat(64)), true);
  });

  it("rejects all-digit values, which are page indices and counts", () => {
    assert.equal(isNonCanary("12345678901234"), true);
  });

  it("rejects values too short to be an identifier", () => {
    assert.equal(isNonCanary("x".repeat(MIN_CANARY_LENGTH - 1)), true);
    assert.equal(isNonCanary("mixed-value-1234"), false);
  });

  it("discards a numeric denied field entirely — a page index is not searchable", () => {
    assert.deepEqual(values(harvest({ sources: [{ physical_pdf_page_index: 1 }] })), []);
  });
});

describe("scanning finds a real leak and ignores an encoded published value", () => {
  const leak = "internal review pending manager sign-off";
  const canaries = harvest({ pin_maps: [{ reviewed_by: leak, sha256: "x" }] , denied_marker: 0 });

  it("has a canary to search for", () => {
    // Guards the rest of this block from passing vacuously.
    assert.equal(harvestCanaries([{ reviewed_by: leak }], { deniedKeys: ["reviewed_by"] }).length, 1);
  });

  it("catches the value verbatim", () => {
    const found = scanTargets(
      [{ label: "page.html", text: `<p>${leak}</p>` }],
      harvestCanaries([{ reviewed_by: leak }], { deniedKeys: ["reviewed_by"] }),
    );
    assert.equal(found.hits.length, 1);
    assert.equal(found.hits[0]?.label, "page.html");
  });

  it("catches it through HTML entity encoding and reflowed whitespace", () => {
    const encoded = "internal review pending\n  manager&#32;sign&#45;off";
    const found = scanTargets(
      [{ label: "page.html", text: encoded }],
      harvestCanaries([{ reviewed_by: leak }], { deniedKeys: ["reviewed_by"] }),
    );
    assert.equal(found.hits.length, 1);
  });

  it("reports nothing for a clean artifact", () => {
    const found = scanTargets([{ label: "page.html", text: "nothing to see" }], canaries);
    assert.equal(found.hits.length, 0);
  });

  it("never text-searches a binary target, and counts it separately", () => {
    const found = scanTargets(
      [
        { label: "bundle.wasm", text: null },
        { label: "page.html", text: "clean" },
      ],
      canaries,
    );
    assert.equal(found.filesScanned, 1);
    assert.equal(found.filesSkippedBinary, 1);
  });
});

describe("the site-wide subtraction excuses only what another source publishes", () => {
  const canaries = harvestCanaries(
    [{ routes: [{ positive: ["UMW (Youtai Semiconductor) AO3401A", "some private prompt text"] }] }],
    { deniedKeys: ["positive"] },
  );

  it("starts with both values", () => {
    assert.equal(canaries.length, 2);
  });

  it("drops the one a hand-authored page already names", () => {
    const content: readonly ScanTarget[] = [
      { label: "content/power/front-end.mdx", text: "We chose the UMW (Youtai Semiconductor) AO3401A here." },
    ];
    const remaining = subtractPublishedElsewhere(canaries, content);
    assert.deepEqual(values(remaining), ["some private prompt text"]);
  });

  it("keeps everything when no other source publishes any of it", () => {
    assert.equal(subtractPublishedElsewhere(canaries, []).length, 2);
  });

  it("never lets a match straddle two artifacts", () => {
    // Two files that each hold half of a canary do not between them publish it.
    // Joined with a space they would, and the canary would be dropped — a
    // silent hole in the very check that decides what gets searched for.
    const split = harvestCanaries([{ positive: ["alpha bravo charlie delta"] }], {
      deniedKeys: ["positive"],
    });
    assert.equal(split.length, 1);
    const halves: readonly ScanTarget[] = [
      { label: "a.mdx", text: "alpha bravo" },
      { label: "b.mdx", text: "charlie delta" },
    ];
    assert.equal(subtractPublishedElsewhere(split, halves).length, 1);
  });

  it("never lets a positive control be satisfied by two artifacts jointly", () => {
    assert.throws(
      () =>
        assertPositiveControls(
          [
            { label: "a.html", text: "AL8860MP" },
            { label: "b.html", text: "-13 driver" },
          ],
          [{ label: "mpn", value: "AL8860MP-13" }],
          "test",
        ),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });
});

describe("the scan fails closed rather than passing vacuously", () => {
  const clean = scanTargets([{ label: "a", text: "clean" }], []);

  it("refuses to pass with too few canaries", () => {
    assert.throws(
      () => assertNoLeaks(clean, { canaries: 10, files: 1 }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });

  it("refuses to pass with too few artifacts", () => {
    const result = scanTargets([], [{ value: "v", normalized: "v", path: "p" }]);
    assert.throws(
      () => assertNoLeaks(result, { canaries: 1, files: 1 }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });

  it("refuses an agent corpus that carries none of the required routes", () => {
    // The hole this closes: an empty surface makes assertPositiveControls a
    // no-op, and the other owned surfaces alone clear the file floor — so
    // `scan:doc-skill` exited 0 while proving nothing about what an agent
    // reads back. Measured on the real build before the fix.
    const routes = ["/docs/components/catalog/", "/docs/components/records/"];
    assert.throws(
      () => assertRequiredRoutes([{ label: "agent-skill/SKILL.md", text: "x" }], routes, "corpus"),
      (error: unknown) => {
        assert.ok(error instanceof ComponentDocsError);
        assert.equal(error.code, "PUBLICATION_POLICY");
        assert.match(error.message, /2 required route/u);
        return true;
      },
    );
  });

  it("accepts an agent corpus once every required route is present", () => {
    assert.doesNotThrow(() =>
      assertRequiredRoutes(
        [
          { label: "agent-skill/docs/components/catalog/index.mdx", text: "x" },
          { label: "agent-skill/docs/components/records/al8860mp-13/index.mdx", text: "x" },
        ],
        ["/docs/components/catalog/", "/docs/components/records/"],
        "corpus",
      ),
    );
  });

  it("counts an unreadable file as present, because labels decide", () => {
    // Labels alone decide this, so a binary or unreadable file still counts as
    // present — the claim is about what the corpus contains, not what it says.
    assert.doesNotThrow(() =>
      assertRequiredRoutes(
        [{ label: "agent-skill/docs/components/records/x/index.mdx", text: null }],
        ["/docs/components/records/"],
        "corpus",
      ),
    );
  });

  it("does not echo the leaked value into the failure message", () => {
    // This message lands in CI logs. Reprinting a denied value to prove it
    // leaked would publish it a second time, in a place with a longer memory.
    const secret = "verbatim vendor datasheet quotation kept for audit";
    const result = scanTargets(
      [{ label: "dist/page.html", text: secret }],
      harvestCanaries([{ evidence_extract: secret }], { deniedKeys: ["evidence_extract"] }),
    );
    assert.throws(
      () => assertNoLeaks(result, { canaries: 1, files: 1 }),
      (error: unknown) => {
        assert.ok(error instanceof ComponentDocsError);
        const rendered = error.message + JSON.stringify(error.detail);
        assert.equal(rendered.includes(secret), false, "the failure echoed the denied value");
        assert.ok(rendered.includes("dist/page.html"), "the failure names the artifact");
        assert.ok(rendered.includes("evidence_extract"), "the failure names the denied field");
        return true;
      },
    );
  });
});

describe("positive controls refuse an empty projection", () => {
  it("passes when every control is present", () => {
    assertPositiveControls(
      [{ label: "page.html", text: "AL8860MP-13 and C500782" }],
      [
        { label: "mpn", value: "AL8860MP-13" },
        { label: "lcsc", value: "C500782" },
      ],
      "test",
    );
  });

  it("fails when the artifact is empty, which is what makes a negative scan meaningful", () => {
    assert.throws(
      () =>
        assertPositiveControls(
          [{ label: "page.html", text: "" }],
          [{ label: "mpn", value: "AL8860MP-13" }],
          "test",
        ),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });

  it("matches a control through the same escaping fold the negative scan uses", () => {
    assertPositiveControls(
      [{ label: "page.html", text: "PESD24VS1UB,115 &amp; friends" }],
      [{ label: "mpn", value: "PESD24VS1UB,115 & friends" }],
      "test",
    );
  });
});

describe("reading artifacts from disk", () => {
  it("classifies by extension and by content, and refuses to follow a symlink", async () => {
    const root = join(scratch, "artifacts");
    await mkdir(join(root, "nested"), { recursive: true });
    await writeFile(join(root, "page.html"), "<p>text</p>");
    await writeFile(join(root, "nested", "data.json"), '{"a":1}');
    await writeFile(join(root, "bundle.wasm"), "not really wasm but named so");
    await writeFile(join(root, "blob.bin"), Buffer.from([0x41, 0x00, 0x42]));
    await symlink(join(root, "page.html"), join(root, "alias.html"));

    const targets = await readScanTargets(root, "dist");
    const byLabel = new Map(targets.map((target) => [target.label, target]));

    assert.equal(byLabel.get("dist/page.html")?.text, "<p>text</p>");
    assert.equal(byLabel.get("dist/nested/data.json")?.text, '{"a":1}');
    // Named binary: skipped without reading, so the content is irrelevant.
    assert.equal(byLabel.get("dist/bundle.wasm")?.text, null);
    // Sniffed binary: a NUL byte is enough.
    assert.equal(byLabel.get("dist/blob.bin")?.text, null);
    // A symlink could point outside the tree; what matters is the bytes this
    // build produced, so it is not read at all.
    assert.equal(byLabel.has("dist/alias.html"), false);
  });

  it("agrees with the standalone binary predicates", () => {
    assert.equal(isBinaryPath("/a/b/islands-resource.wasm"), true);
    assert.equal(isBinaryPath("/a/b/font.WOFF2"), true);
    assert.equal(isBinaryPath("/a/b/page.html"), false);
    assert.equal(isBinaryContent(Buffer.from([0x41, 0x42])), false);
    assert.equal(isBinaryContent(Buffer.from([0x41, 0x00])), true);
  });
});
