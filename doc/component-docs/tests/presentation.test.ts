/**
 * Presentation invariants: the parts of how a generated page reads that are
 * decided in the generator rather than in CSS.
 *
 * Everything asserted here is checkable from the serialized MDX and the two
 * files that have to agree with it — the component allow-list and the host
 * binding registry. Nothing here needs a browser, so all of it runs in CI on
 * every change rather than being re-checked by eye.
 *
 * The rules under test are the ones that fail silently if broken: an MDX
 * component the host does not register renders as literal text and swallows
 * the table it wraps, and a table that loses its scroll container does not
 * error — it just crushes its columns on a phone.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { ALLOWED_COMPONENT_ATTRIBUTES, ATTRIBUTE_VALUE_PATTERN } from "../core/mdx.ts";
import { renderCatalog } from "../core/render/catalog.ts";
import { renderIntegration } from "../core/render/integration.ts";
import { renderRecord } from "../core/render/record.ts";
import { buildRecordIndex } from "../core/render/shared.ts";
import { FIXTURE_IDS, fixtureModel } from "./fixtures.ts";

/** Names bound by the host rather than by this project. */
const PACKAGE_GLOBAL_COMPONENTS: readonly string[] = ["CategoryNav"];

// zudo-pd binds MDX components in `doc/pages/_mdx-components.ts`'s
// `createMdxComponents()` factory, not in an `mdxExtras: {...}` registry —
// `src/chrome-bindings.tsx` and the `chromeBindingsModule` config key it
// depends on are not supported by `zfb 0.1.0-next.49` this project runs
// (see the doc-engine port's locked plan, forced edit #4).
const BINDINGS_PATH = fileURLToPath(new URL("../../pages/_mdx-components.ts", import.meta.url));
const STYLESHEET_PATH = fileURLToPath(new URL("../../src/styles/global.css", import.meta.url));

const model = fixtureModel();
const index = buildRecordIndex(model);
const catalogPage = renderCatalog(model).contents;
const recordPages = model.records.map((record) => renderRecord(record, index).contents);
/**
 * The integration page was NOT in this list until a browser pass found its
 * tables scrolling by pointer only — no tab stop, no focus ring — while every
 * record page had both. The suite said "on every page" and walked
 * `model.records`, so the one page rendered by a different renderer was
 * structurally invisible to it. Any future renderer must be added here too.
 */
const integrationPage = renderIntegration(model, index).contents;
/** The fixture record carrying facts, calculations and two pin maps. */
const driverPage = pageFor(FIXTURE_IDS.driverRecord);

function pageFor(recordId: string): string {
  const record = model.records.find((entry) => entry.identity.recordId === recordId);
  assert.ok(record, `fixture has no record ${recordId}`);
  return renderRecord(record, index).contents;
}

/** Every `| … | … |` header row, with its cell count. */
function tableHeaderWidths(page: string): number[] {
  const widths: number[] = [];
  const lines = page.split("\n");
  for (const [position, line] of lines.entries()) {
    const next = lines[position + 1];
    // A GFM header is a row followed by the `| --- |` delimiter row.
    if (next === undefined || !/^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/u.test(next)) continue;
    widths.push(line.split("|").length - 2);
  }
  return widths;
}

/** The text between an opening `<EvidenceDetails …>` and its close. */
function disclosedBlocks(page: string): string[] {
  return [...page.matchAll(/<EvidenceDetails[^>]*>([\s\S]*?)<\/EvidenceDetails>/gu)].map(
    (match) => match[1] ?? "",
  );
}

describe("host bindings stay in step with the component allow-list", () => {
  const bindings = readFileSync(BINDINGS_PATH, "utf8");
  // The `createMdxComponents()` factory body, comments stripped. Matching the
  // whole file would let a name mentioned only in a comment satisfy the
  // assertion — which is exactly the near-miss this test exists to catch.
  const registry = (
    /export function createMdxComponents[\s\S]*?return \{([\s\S]*?)\n {2}\};\n\}/u.exec(
      bindings,
    )?.[1] ?? ""
  ).replace(/\/\/[^\n]*/gu, "");

  it("finds the createMdxComponents() registry at all", () => {
    assert.notEqual(registry.trim(), "", "_mdx-components.ts has no createMdxComponents() return object");
  });

  for (const name of Object.keys(ALLOWED_COMPONENT_ATTRIBUTES)) {
    if (PACKAGE_GLOBAL_COMPONENTS.includes(name)) continue;

    it(`registers ${name} in createMdxComponents()`, () => {
      // An unregistered name is not an error at build time: MDX renders it as
      // literal text and silently drops whatever it wrapped. This is the only
      // place that failure becomes visible before a reader finds it.
      assert.match(
        bindings,
        new RegExp(`\\bimport\\s*\\{\\s*${name}\\s*\\}`, "u"),
        `${name} is on the allow-list but _mdx-components.ts does not import it`,
      );
      assert.match(
        registry,
        new RegExp(`^\\s*${name}\\s*,\\s*$`, "mu"),
        `${name} is imported but not registered in createMdxComponents()`,
      );
    });
  }
});

describe("dense tables carry a scroll container", () => {
  it("wraps every table wider than two columns, on every page", () => {
    for (const page of [catalogPage, integrationPage, ...recordPages]) {
      const wide = tableHeaderWidths(page).filter((width) => width > 2);
      const wrappers = [...page.matchAll(/<EvidenceTable\b/gu)].length;
      assert.equal(
        wrappers,
        wide.length,
        `page has ${wide.length} tables wider than two columns but ${wrappers} scroll containers`,
      );
    }
  });

  it("keeps every column — the container scrolls, the table does not shrink", () => {
    // The seven fact columns are seven separate claims. A "responsive" table
    // that drops Conditions or Provenance on a narrow screen would publish a
    // value without the terms it holds under, which is a different fact.
    assert.match(
      driverPage,
      /\| Fact\s*\| Value\s*\| Unit\s*\| Conditions\s*\| Verdict\s*\| Provenance\s*\| Evidence\s*\|/u,
    );
  });

  it("labels each container with a slug the guard would accept", () => {
    const labels = [...catalogPage.matchAll(/<EvidenceTable label="([^"]*)"/gu)].map(
      (match) => match[1] ?? "",
    );
    assert.ok(labels.length > 0);
    for (const label of labels) {
      assert.match(label, ATTRIBUTE_VALUE_PATTERN, `${label} would fail the MDX guard`);
    }
  });

  it("never lets a label carry evidence text", () => {
    // Attribute values are the one place evidence may never reach. Every label
    // the renderers emit is authored in this repository.
    const authored = new Set(["parts-index", "facts", "calculation-dependencies", "pin-assignments", "placements"]);
    for (const page of [catalogPage, ...recordPages]) {
      for (const match of page.matchAll(/<Evidence(?:Table|Details) label="([^"]*)"/gu)) {
        assert.ok(authored.has(match[1] ?? ""), `unexpected label ${match[1]}`);
      }
    }
  });
});

describe("nothing carrying a claim sits behind a disclosure", () => {
  it("discloses pin assignments and nothing else", () => {
    for (const page of recordPages) {
      for (const block of disclosedBlocks(page)) {
        assert.match(block, /<EvidenceTable label="pin-assignments">/u);
        for (const forbidden of ["Verdict", "Provenance", "Coverage ID", "Source ID", "Reason:"]) {
          assert.ok(
            !block.includes(forbidden),
            `a disclosure on a record page conceals ${forbidden}`,
          );
        }
      }
    }
  });

  it("leaves the disclosed rows in the page body", () => {
    // `<details>` changes how the rows are presented, never whether they are in
    // the file — so they stay in the built HTML and in the search index whether
    // the element is open or closed.
    assert.match(
      driverPage,
      /\| Symbol pin\s*\| Name\s*\| Footprint pad\s*\| Function\s*\|/u,
    );
  });
});

describe("link text names its subject", () => {
  it("never repeats a bare 'record details' across the catalog", () => {
    assert.ok(
      !catalogPage.includes("[Record details]"),
      "catalog links read the same for every one of its records",
    );
    for (const record of model.records) {
      assert.ok(
        catalogPage.includes(`[${record.identity.mpn} record details]`),
        `${record.identity.recordId} has no self-describing catalog link`,
      );
    }
  });
});

describe("the stylesheet declares what the components emit", () => {
  const stylesheet = readFileSync(STYLESHEET_PATH, "utf8");

  it("styles every class the evidence components render", () => {
    for (const className of [
      "zld-evidence-anchor",
      "zld-evidence-details",
      "zld-evidence-table",
      "zld-evidence-table--parts-index",
      "zld-evidence-table--facts",
    ]) {
      assert.ok(stylesheet.includes(`.${className}`), `global.css has no rule for .${className}`);
    }
  });

  it("makes the scroll container a scroll container with a focus ring", () => {
    // Both halves matter: `overflow-x` without a focus style leaves a region
    // that only a pointer can scroll.
    assert.match(stylesheet, /\.zld-evidence-table\s*\{[^}]*overflow-x:\s*auto/u);
    assert.match(stylesheet, /\.zld-evidence-table:focus-visible\s*\{[^}]*outline:/u);
  });

  it("gives the tables a min-width so the container can overflow at all", () => {
    assert.match(stylesheet, /\.zld-evidence-table table\s*\{[^}]*min-width:/u);
  });

  it("gives component references an auto-fit grid and contained preview media", () => {
    assert.match(
      stylesheet,
      /\.zld-component-references__grid\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit, minmax\(min\(18rem, 100%\), 1fr\)\)/u,
    );
    assert.match(
      stylesheet,
      /\.zld-component-references__footprint-frame > a\s*\{[^}]*aspect-ratio:\s*16 \/ 9/u,
    );
    assert.match(
      stylesheet,
      /\.zld-component-references__footprint img\s*\{[^}]*object-fit:\s*contain/u,
    );
  });

  it("styles an unresolved card as a stated fact, not as an error", () => {
    // Every footprint-preview and model card is unresolved today, and one
    // record's document card is too. If they read as failures the page looks
    // broken rather than honest, so the rule must use the muted token the
    // metadata it stands in for uses — never a danger/warning colour.
    const rule = /\.zld-component-references__unresolved\s*\{([^}]*)\}/u.exec(stylesheet)?.[1] ?? "";
    assert.match(rule, /color:\s*var\(--color-muted\)/u);
    assert.doesNotMatch(rule, /--color-(?:danger|warning)/u);
  });

  // led-lamp's `.zld-preview-dialog*` / `.zld-model-viewer*` rules (enlarge
  // dialogs, 44px touch targets, WebGL viewport) style features that are not
  // ported here — neither the dialog nor the interactive viewer exists yet, so
  // there is no such markup to style.
});
