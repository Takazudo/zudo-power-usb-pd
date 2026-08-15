/**
 * `/docs/components/` — the landing page.
 *
 * Deliberately small: a short orientation paragraph, a corpus summary, and the
 * category navigation. It states what the reader is looking at and what the
 * data does NOT mean; it never aggregates verdicts.
 *
 * Sibling renderers: `catalog.ts` and `record.ts` (#60), `integration.ts`
 * (#63, still to come). They share the builders in `../mdx.ts` and must not
 * introduce a second serialisation path.
 */

import {
  bulletList,
  component,
  evidenceAnchor,
  heading,
  paragraph,
  space,
  strong,
  table,
  text,
  type TableRow,
} from "../mdx.ts";
import { anchor } from "../ids.ts";
import { buildPage, type GeneratedPage } from "../page.ts";
import { literal, safeText } from "../text.ts";
import type { PublicationPolicy } from "../publication.ts";
import type { PublicViewModel } from "../view-model.ts";
import type { RootContent } from "mdast";

/** Anchor the integration and narrative pages link to. Part of the public contract. */
export const CORPUS_ANCHOR = "components-corpus";

export function renderLanding(
  model: PublicViewModel,
  policy: PublicationPolicy,
): GeneratedPage {
  const { corpus } = model;
  const counts = policy.publishRequired("corpus.counts", corpus);

  const body: RootContent[] = [
    paragraph([
      text(
        literal(
          "This section publishes the validated component evidence this project already " +
            "holds as structured data. Every value below is projected from that data — " +
            "nothing here is re-typed, summarised into a grade, or reconciled by hand.",
        ),
      ),
    ]),

    heading(2, literal("How to read these pages")),
    bulletList([
      [
        strong(literal("Per-domain, never per-part.")),
        space(),
        text(
          literal(
            "Coverage is stated one domain at a time. There is no component-wide " +
              "pass/fail verdict, and the absence of an open domain is not a safety claim.",
          ),
        ),
      ],
      [
        strong(literal("Verdicts keep their exact wording.")),
        space(),
        text(
          literal(
            "A distributor-confirmed identity and a primary-source confirmation are " +
              "different verdicts and are shown as different verdicts.",
          ),
        ),
      ],
      [
        strong(literal("Open means unresolved, not unsafe.")),
        space(),
        text(
          literal(
            "An open domain names the reason it is open and the exact facts that block it.",
          ),
        ),
      ],
      [
        strong(literal("Sources may be unavailable.")),
        space(),
        text(
          literal(
            "A source recorded as unavailable stays visible so the gap is auditable " +
              "rather than invisible.",
          ),
        ),
      ],
    ]),

    heading(2, literal("Corpus")),
    evidenceAnchor(anchor(CORPUS_ANCHOR)),
    table(
      [literal("Item"), literal("Count")],
      [
        countRow("Owner bundles", counts.ownerBundles),
        countRow("Records", counts.records),
        countRow("Standalone records", counts.standaloneRecords),
        countRow("Subordinate records", counts.subordinateRecords),
        countRow("Evidence sources", counts.sources),
        countRow("Facts", counts.facts),
        countRow("Coverage domains", counts.coverageDomains),
        countRow("Interactions", counts.interactions),
        countRow("Pin maps", counts.pinMaps),
        countRow("Pins", counts.pins),
        countRow("Inventory lines", counts.inventoryLines),
        countRow("Fitted lines", counts.fittedLines),
        countRow("DNP or hand-fit lines", counts.dnpOrHandFitLines),
      ],
    ),

    heading(2, literal("Sections")),
    // The page is emitted at `components/index.mdx` (see `paths.ts`), and
    // this project's CategoryNav wrapper resolves `category` as a slug
    // PATH — so the value must name this page's own section.
    component("CategoryNav", { category: "components" }),
  ];

  return buildPage(
    "index.mdx",
    {
      title: literal("Components"),
      description: literal(
        "Human reference projected from this project's validated component evidence.",
      ),
      sidebarPosition: 1,
    },
    body,
  );
}

function countRow(label: string, value: number): TableRow {
  return [[text(literal(label))], [text(safeText(String(value), { field: label }))]];
}
