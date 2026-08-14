/**
 * `/docs/components/catalog/` — every published record on one page.
 *
 * The catalog answers two questions a record page cannot, because both are
 * comparisons: *what parts is this project committed to?* and *which of them
 * have evidence still unresolved?* It is therefore built in two passes over the
 * same ordered list rather than one:
 *
 *   1. an index table — one row per record, carrying only the columns worth
 *      scanning down a column of 32. This is the comparison surface.
 *   2. an entry per record — the full orderable identity, every placement, and
 *      the two outbound links. This is the reference surface, and it is what
 *      makes find-in-page useful across the whole bill of materials.
 *
 * Neither pass aggregates. No row says whether a part is good, because that
 * judgement does not exist in the evidence and inventing it here would be the
 * worst thing this feature could do.
 *
 * Everything is static markup: no filtering, no sorting controls, no
 * client-side anything. A row is meaningful with JavaScript switched off
 * because there is no JavaScript to switch off.
 */

import {
  bulletList,
  code,
  evidenceAnchor,
  heading,
  inlineEvidenceAnchor,
  paragraph,
  routeCodeLink,
  routeLink,
  scrollableTable,
  space,
  strong,
  text,
  type TableRow,
} from "../mdx.ts";
import { anchor } from "../ids.ts";
import { buildPage, type GeneratedPage } from "../page.ts";
import { joinSafe, literal, type SafeText } from "../text.ts";
import {
  agentResourceDestination,
  aliasTerms,
  fitLabel,
  openDomainRatio,
  openDomainSummary,
  ownerSkillOf,
  placementSummary,
  recordRoute,
} from "./shared.ts";
import type { PublicRecord, PublicViewModel } from "../view-model.ts";
import type { PhrasingContent, RootContent } from "mdast";

/** Anchor the landing and record pages link the index by. Public contract. */
export const CATALOG_INDEX_ANCHOR = "catalog-index";

export function renderCatalog(model: PublicViewModel): GeneratedPage {
  const records = model.records;

  const body: RootContent[] = [
    paragraph([
      text(
        literal(
          "Every component record this project publishes, in the order the bill of materials " +
            "lists them, with each subordinate record directly after the part it belongs to. " +
            "The identity, placement and state columns are projected from stored evidence; the " +
            "record pages behind them carry the facts, sources and coverage themselves.",
        ),
      ),
    ]),

    heading(2, literal("How to read this catalog")),
    paragraph([
      text(
        literal(
          "Four columns describe state. None of them is a grade, and there is deliberately no " +
            "column combining them — a part is not summarised into a verdict here or anywhere " +
            "else in this section.",
        ),
      ),
    ]),
    bulletList([
      labelled(
        "Fit",
        "Whether the part is fitted in the as-built design, or is marked do-not-populate or " +
          "hand-fit.",
      ),
      labelled(
        "Identity",
        "Whether the exact orderable part has been confirmed. Unresolved does not mean the " +
          "wrong part is fitted; it means the confirmation is not on record, so a same-name " +
          "part from another vendor may not be substituted on the strength of it.",
      ),
      labelled(
        "Sources",
        "Whether any document backing this line could be retrieved. A line whose sources are " +
          "unavailable still publishes, so the gap stays visible rather than absent.",
      ),
      labelled(
        "Open domains",
        "How many of the record's published coverage domains are unresolved, out of how many " +
          "were published at all. The denominator is the point: no open domains out of none " +
          "published means nothing was checked, not that everything passed.",
      ),
    ]),

    heading(2, literal("Parts at a glance")),
    evidenceAnchor(anchor(CATALOG_INDEX_ANCHOR)),
    scrollableTable(
      "parts-index",
      [
        literal("Part"),
        literal("Record"),
        literal("Function"),
        literal("Fit"),
        literal("Identity"),
        literal("Sources"),
        literal("Open domains"),
      ],
      records.map((record) => indexRow(record)),
    ),

    heading(2, literal("Part entries")),
    paragraph([
      text(
        literal(
          "One entry per record, carrying the orderable identity and every board placement. " +
            "Each entry links to its record page, where the evidence itself is published, and " +
            "to the raw agent resource that evidence is stored in.",
        ),
      ),
    ]),
    ...records.flatMap((record) => entry(record)),
  ];

  return buildPage(
    "catalog/index.mdx",
    {
      title: literal("Catalog"),
      description: literal(
        "Every published component record with its orderable identity, board placements and " +
          "evidence state.",
      ),
      sidebarPosition: 2,
    },
    body,
  );
}

/**
 * One index row.
 *
 * The part cell carries the record's anchor as well as its link, so
 * `/docs/components/catalog/#rec-al8860mp-13` lands on the row and not only on
 * the entry further down the page.
 */
function indexRow(record: PublicRecord): TableRow {
  const { identity } = record;
  const part: PhrasingContent[] = [
    inlineEvidenceAnchor(identity.anchor),
    routeLink(recordRoute(identity.slug), identity.mpn),
  ];
  if (identity.kind === "subordinate") {
    part.push(space(), text(literal("(subordinate)")));
  }

  return [
    part,
    [code(identity.recordId)],
    [text(identity.function)],
    [text(fitLabel(identity.dnp))],
    [text(identity.identityState)],
    [text(identity.sourceState)],
    [text(openDomainRatio(record.coverage))],
  ];
}

/** One full entry: exact identity, every placement, and where to go next. */
function entry(record: PublicRecord): RootContent[] {
  const { identity } = record;
  const ownerSkill = ownerSkillOf(record);
  const aliases = aliasTerms(record);

  const details: readonly PhrasingContent[][] = [
    field("Record ID", [code(identity.recordId)]),
    field("Kind", kindValue(record)),
    field("Manufacturer", [text(identity.manufacturer)]),
    field("Function", [text(identity.function)]),
    field("Orderable ID", [code(identity.lcsc)]),
    field("Package", [code(identity.packageName)]),
    field("Inventory line", [code(identity.lineId)]),
    // Several records are routed by LCSC code rather than part number, so the
    // alternate terms have to be ON the page for anyone to find them by search.
    ...(aliases.length === 0 ? [] : [field("Also known as", termList(aliases))]),
    ...(ownerSkill === null ? [] : [field("Owner skill", [code(ownerSkill)])]),
    field("Placements", [text(placementSummary(identity.placements))]),
    field("Fit", [text(fitLabel(identity.dnp))]),
    field("Identity state", [text(identity.identityState)]),
    field("Source state", [text(identity.sourceState)]),
    field("Open coverage domains", [text(openDomainSummary(record.coverage))]),
  ];

  const agentResource = agentResourceDestination(record);
  // The part is named INSIDE each link rather than only in the heading above
  // it. This page carries 64 links whose text would otherwise be one of two
  // phrases repeated 32 times each, and a screen reader's link list — or any
  // reader tabbing through — sees link text without the heading that gave it
  // its subject.
  const links: PhrasingContent[] = [
    routeLink(recordRoute(identity.slug), linkLabel(identity.mpn, "record details")),
  ];
  // Only linked when the owning bundle is actually known — see
  // `agentResourceDestination`. A stand-in link to the resource index would read
  // as this record's bundle and go somewhere else.
  if (agentResource !== null) {
    links.push(
      space(),
      text(literal("—")),
      space(),
      routeLink(agentResource, linkLabel(identity.mpn, "raw agent resource")),
    );
  }

  return [heading(3, identity.mpn), bulletList(details), paragraph(links)];
}

/**
 * A subordinate record's relationship, stated rather than implied.
 *
 * Nine of the 32 records exist only as part of another part's audit — a sense
 * resistor whose tolerance sets a driver's output current, a catch diode chosen
 * for one converter. They are listed as their own rows because they are their
 * own orderable lines, so each row has to say which of the two it is.
 */
function kindValue(record: PublicRecord): PhrasingContent[] {
  const { identity } = record;
  if (identity.kind !== "subordinate") {
    return [
      text(literal("standalone")),
      space(),
      text(literal("—")),
      space(),
      text(literal("audited in its own right")),
    ];
  }

  const value: PhrasingContent[] = [
    text(literal("subordinate")),
    space(),
    text(literal("—")),
    space(),
    text(literal("audited as part of")),
    space(),
  ];
  if (identity.parentSlug !== null && identity.parentRecordId !== null) {
    value.push(routeCodeLink(recordRoute(identity.parentSlug), identity.parentRecordId));
  } else {
    value.push(text(literal("a parent record that is not published")));
  }
  return value;
}

/**
 * `**Label:** value`. `safeText` trims, so the separators are built from
 * `space()` rather than padded into the strings — a padded literal would come
 * back collapsed and the words would run together.
 */
function field(label: string, value: readonly PhrasingContent[]): PhrasingContent[] {
  return [strong(literal(`${label}:`)), space(), ...value];
}

/** Exact terms, comma-separated, each rendered as the identifier it is. */
function termList(terms: readonly SafeText[]): PhrasingContent[] {
  const list: PhrasingContent[] = [];
  for (const [position, term] of terms.entries()) {
    if (position > 0) list.push(text(literal(",")), space());
    list.push(code(term));
  }
  return list;
}

/** `<MPN> record details` — the part first, so the link reads as a subject. */
function linkLabel(mpn: SafeText, purpose: string): SafeText {
  return joinSafe([mpn, literal(purpose)], " ");
}

function labelled(label: string, description: string): PhrasingContent[] {
  return [
    strong(literal(label)),
    space(),
    text(literal("—")),
    space(),
    text(literal(description)),
  ];
}
