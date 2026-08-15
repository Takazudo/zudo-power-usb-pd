/**
 * The vocabulary the catalog and the record pages share.
 *
 * Both surfaces publish the same evidence graph at different magnifications,
 * so the words they put next to a value — and the routes they link it by —
 * have to be decided once. Two renderers each inventing a phrase for `OPEN`
 * would be two different claims about the same data.
 *
 * Three rules hold everywhere in this module:
 *
 *   1. A friendly label sits BESIDE the exact recorded string, never instead of
 *      it. `PASS - primary-source confirmed` is always shown verbatim; the
 *      plain-language gloss is an addition, and it lives in the page legend
 *      rather than replacing the term at the point of use.
 *   2. Nothing is rolled up. There is no function here that reduces a record to
 *      a verdict, a grade or a badge, and there must never be one — coverage is
 *      per-domain and an absent open domain is not a safety claim.
 *   3. An unknown provider string degrades, it does not fail and it does not
 *      disappear. Evidence gains new verdicts and domains over time; a term
 *      this module has no gloss for is still published exactly as recorded,
 *      and the legend says the gloss is missing rather than silently omitting
 *      the row.
 */

import { byCodeUnit, type Anchor, type Slug } from "../ids.ts";
import {
  code,
  fragmentRoute,
  route,
  routeCodeLink,
  space,
  text,
  type Route,
} from "../mdx.ts";
import { joinSafe, literal, safeText, type SafeText } from "../text.ts";
import type { PhrasingContent } from "mdast";
import type {
  PublicCoverage,
  PublicFact,
  PublicIntegrationRule,
  PublicInteraction,
  PublicPlacement,
  PublicRecord,
  PublicViewModel,
} from "../view-model.ts";

// --- routes ----------------------------------------------------------------

// Matches led-lamp's route shape exactly: the generated tree is rooted
// directly at `/docs/components/` (see `paths.ts` GENERATED_ROOT), with
// `catalog/`, `integration/` and `records/` as siblings. `records/` also
// holds the record pages themselves, one directory per slug.
export const COMPONENTS_ROUTE: Route = route("/docs/components/");
export const CATALOG_ROUTE: Route = route("/docs/components/catalog/");
export const RECORDS_ROUTE: Route = route("/docs/components/records/");
export const INTEGRATION_ROUTE: Route = route("/docs/components/integration/");

/** `/docs/components/records/<slug>/`, optionally at one anchor inside it. */
export function recordRoute(slug: Slug, fragment?: Anchor): Route {
  return route(`/docs/components/records/${slug}/`, fragment);
}

/** One rule's, or one conditioned calculation's, place on the integration page. */
export function integrationRoute(fragment: Anchor): Route {
  return route("/docs/components/integration/", fragment);
}

/** The record's entry on the catalog page. */
export function catalogEntryRoute(fragment: Anchor): Route {
  return route("/docs/components/catalog/", fragment);
}

/**
 * The raw agent resource a record's evidence actually lives in.
 *
 * The doc site already publishes every `.claude/skills/<name>/SKILL.md` at this
 * route (`claudeResources` in `zfb.config.ts`), so this links the projection
 * back to the thing it is a projection OF. It is deliberately a link and not a
 * copy: the bundle is the source of truth and these pages must not restate it.
 */
export function agentResourceRoute(ownerSkill: string): Route {
  return route(`/docs/claude-skills/${ownerSkill}/`);
}

/** A destination inside the page currently being rendered. */
export function samePage(fragment: Anchor): Route {
  return fragmentRoute(fragment);
}

// --- cross-record index ----------------------------------------------------

/**
 * Everything a renderer needs to turn an evidence ID into a link.
 *
 * The view model is a list of records, but the graph is not a tree: a
 * calculated fact on the AL8860 depends on a fact owned by its sense resistor,
 * and an interaction names up to four records. Rendering those as bare IDs
 * would leave the reader to guess which page to open, so every renderer gets
 * this index and links across.
 */
export type RecordIndex = {
  readonly slugByRecordId: ReadonlyMap<string, Slug>;
  readonly mpnByRecordId: ReadonlyMap<string, SafeText>;
  /** Which record owns a fact — the join that makes cross-record links work. */
  readonly recordIdByFactId: ReadonlyMap<string, string>;
  readonly anchorByFactId: ReadonlyMap<string, Anchor>;
  /** Sidebar order, so a record page never has to know its own position. */
  readonly sidebarPositionByRecordId: ReadonlyMap<string, number>;
  /**
   * Every interaction a record takes part in — not only the ones attached to it.
   *
   * `PublicInteraction.recordIds` is plural: 6 of this corpus's 50 interactions
   * span 2-4 records, a parent and its subordinates. Whether the adapter
   * attaches such an interaction to all its participants or only to one is the
   * adapter's business, and it has changed once already. Reading
   * `record.interactions` directly makes the page depend on that choice — and
   * under one-record attachment the SS26, RLP25, FXL, PESD, external-Rd, FNR,
   * CL21 and SWD-header pages would each silently show no interactions at all,
   * losing nine record/interaction links from the site.
   *
   * So this index is the union of both readings, deduplicated by interaction ID.
   * It is correct under either attachment scheme, and it cannot double-render
   * one interaction on one page.
   */
  readonly interactionsByRecordId: ReadonlyMap<string, readonly PublicInteraction[]>;
  /**
   * Every cross-component rule a record is named in.
   *
   * Rules are not attached to records at all — they live in their own bundle
   * and name their participants — so this is the only way a record page can
   * find the ones that concern it. It is what makes the reciprocal link work:
   * the integration page names records, and each record page names its rules
   * back, without either restating the other's content.
   */
  readonly rulesByRecordId: ReadonlyMap<string, readonly PublicIntegrationRule[]>;
};

/**
 * The records index page occupies position 1 inside `records/`, so the first
 * record starts at 2. Positions follow model order, which is inventory order
 * with each subordinate directly after its parent — the sidebar then reads the
 * same way the bill of materials does.
 */
const FIRST_RECORD_SIDEBAR_POSITION = 2;

export function buildRecordIndex(model: PublicViewModel): RecordIndex {
  const slugByRecordId = new Map<string, Slug>();
  const mpnByRecordId = new Map<string, SafeText>();
  const recordIdByFactId = new Map<string, string>();
  const anchorByFactId = new Map<string, Anchor>();
  const sidebarPositionByRecordId = new Map<string, number>();
  const interactionsByRecordId = new Map<string, PublicInteraction[]>();
  const rulesByRecordId = new Map<string, PublicIntegrationRule[]>();

  for (const [position, record] of model.records.entries()) {
    slugByRecordId.set(record.identity.recordId, record.identity.slug);
    mpnByRecordId.set(record.identity.recordId, record.identity.mpn);
    sidebarPositionByRecordId.set(
      record.identity.recordId,
      position + FIRST_RECORD_SIDEBAR_POSITION,
    );
    for (const fact of record.facts) {
      recordIdByFactId.set(fact.factId, fact.recordId);
      anchorByFactId.set(fact.factId, fact.anchor);
    }
  }

  // Walk every attached interaction and file it under each record it names.
  // Model order is preserved, so the result is deterministic regardless of which
  // record the adapter chose to attach it to.
  for (const record of model.records) {
    for (const interaction of record.interactions) {
      for (const participantId of interaction.recordIds) {
        const bucket = interactionsByRecordId.get(participantId) ?? [];
        if (bucket.some((entry) => entry.interactionId === interaction.interactionId)) {
          continue;
        }
        bucket.push(interaction);
        interactionsByRecordId.set(participantId, bucket);
      }
    }
  }

  // Rules keep model order (which is the ruleset's own file order) under every
  // record they name. No deduplication here, unlike interactions: the adapter
  // may attach one interaction to several records, whereas a rule names each
  // participant exactly once — and `parseIntegrationRules` fails the build on a
  // rule that repeats a record rather than letting this quietly render it twice.
  for (const rule of model.integration) {
    for (const participantId of rule.recordIds) {
      const bucket = rulesByRecordId.get(participantId) ?? [];
      bucket.push(rule);
      rulesByRecordId.set(participantId, bucket);
    }
  }

  return {
    slugByRecordId,
    mpnByRecordId,
    recordIdByFactId,
    anchorByFactId,
    sidebarPositionByRecordId,
    interactionsByRecordId,
    rulesByRecordId,
  };
}

/**
 * Where a fact ID should link from the page for `currentRecordId`.
 *
 * `null` means "do not link": the fact is not published, so a link would 404.
 * The caller still renders the ID as code — an unpublished dependency is
 * information, and dropping it would hide that the chain leaves the corpus.
 *
 * `currentRecordId` is `null` on a page that is not a record page — the
 * integration page cites facts owned by twelve different records and owns none
 * of them, so every reference there is a cross-page link. Passing `null` is
 * what makes that explicit; a sentinel record ID would just be a value that
 * happens never to match.
 */
export function factDestination(
  index: RecordIndex,
  factId: string,
  currentRecordId: string | null,
): Route | null {
  const ownerRecordId = index.recordIdByFactId.get(factId);
  const anchor = index.anchorByFactId.get(factId);
  if (ownerRecordId === undefined || anchor === undefined) return null;
  if (ownerRecordId === currentRecordId) return samePage(anchor);

  const slug = index.slugByRecordId.get(ownerRecordId);
  return slug === undefined ? null : recordRoute(slug, anchor);
}

/**
 * A reference to a fact by ID, linked wherever the fact is published.
 *
 * A fact that lives on another record is named as well as linked: the ID alone
 * does not tell a reader they are about to leave the page, and the whole point
 * of publishing the chain is that it can be followed. An unpublished fact is
 * still printed, marked as such — dropping it would hide that the chain leaves
 * the corpus.
 *
 * Shared rather than per-page because the record pages and the integration page
 * cite the same facts, and two renderers each inventing a way to print a
 * dependency would be two different claims about one edge of the graph.
 */
export function factReference(
  index: RecordIndex,
  factId: SafeText,
  currentRecordId: string | null,
): PhrasingContent[] {
  const destination = factDestination(index, factId, currentRecordId);
  if (destination === null) {
    return [code(factId), space(), text(literal("(not published)"))];
  }

  const reference: PhrasingContent[] = [routeCodeLink(destination, factId)];
  const ownerRecordId = index.recordIdByFactId.get(factId);
  if (ownerRecordId !== undefined && ownerRecordId !== currentRecordId) {
    const mpn = index.mpnByRecordId.get(ownerRecordId);
    if (mpn !== undefined) {
      reference.push(space(), text(literal("on")), space(), text(mpn));
    }
  }
  return reference;
}

// --- fixed labels ----------------------------------------------------------

/**
 * As-built fit state.
 *
 * `dnp` is one boolean covering two situations the project treats together —
 * a part deliberately not fitted, and one fitted by hand rather than by the
 * assembler — so the label names both instead of asserting the wrong one.
 */
export function fitLabel(dnp: boolean): SafeText {
  return dnp ? literal("DNP or hand-fit") : literal("Fitted");
}

/**
 * Line-level fit label that refuses to flatten a mixed line.
 *
 * One line can be fitted on one board and DNP on another; labelling that line
 * with either single state would tell a reader building one of the boards the
 * wrong thing, so a mixed line says so and defers to the per-placement table.
 */
export function lineFitLabel(dnp: boolean, placements: readonly PublicPlacement[]): SafeText {
  const states = new Set(placements.map((placement) => placement.dnp));
  if (states.size > 1) return literal("Mixed — see per-placement fit");
  return fitLabel(dnp);
}

/**
 * How much of a record's coverage is unresolved.
 *
 * The denominator is the point. A bare "0 open" invites the reading "nothing
 * open, therefore fine", which is exactly the component-wide safety verdict
 * this feature refuses to make. "0 open of 7 published domains" says what was
 * actually checked, and a record with no published coverage says so rather
 * than counting to zero.
 */
export function openDomainSummary(coverage: readonly PublicCoverage[]): SafeText {
  if (coverage.length === 0) return literal("no coverage domains published");
  const open = coverage.filter((entry) => entry.status === "OPEN").length;
  return safeText(`${open} open of ${coverage.length} published`, {
    field: "coverage summary",
  });
}

/** The same figure as a bare ratio, for a table cell that already has a header. */
export function openDomainRatio(coverage: readonly PublicCoverage[]): SafeText {
  if (coverage.length === 0) return literal("none published");
  const open = coverage.filter((entry) => entry.status === "OPEN").length;
  return safeText(`${open} of ${coverage.length}`, { field: "coverage ratio" });
}

/**
 * Placements grouped by board.
 *
 * One inventory line is placed 24 times. A flat run of 24 designators is a wall
 * of text; grouped by board it reads as "two boards, this many each" at a
 * glance while still naming every designator exactly.
 */
export function placementSummary(placements: readonly PublicPlacement[]): SafeText {
  if (placements.length === 0) return literal("no placement published");

  const boards: string[] = [];
  const byBoard = new Map<string, string[]>();
  for (const placement of placements) {
    const bucket = byBoard.get(placement.board);
    if (bucket === undefined) {
      boards.push(placement.board);
      byBoard.set(placement.board, [placement.refdes]);
    } else {
      bucket.push(placement.refdes);
    }
  }

  const parts = boards.map((board) =>
    safeText(`${board} ${(byBoard.get(board) ?? []).join(", ")}`, {
      field: "placement group",
    }),
  );
  return joinSafe(parts, "; ");
}

/**
 * The record's alternate search terms, minus the ones already on the page.
 *
 * `PublicAliases` exists to make exact-term discovery work: several records are
 * routed by their LCSC code rather than a part number, so the page **title** is
 * the MPN and the aliases are what let someone find the record by typing the
 * other identifier. That only works if the terms are in the rendered HTML —
 * search indexes the page, not the view model — so a record whose aliases are
 * never printed is a record that cannot be found by its alternate names.
 *
 * Values already rendered as identity fields are dropped, because repeating
 * `C100001` twice on one page helps nobody. Order follows the arrays, so it
 * stays whatever the provider decided rather than being re-sorted here.
 */
export function aliasTerms(record: PublicRecord): SafeText[] {
  const { identity, aliases } = record;
  const shown = new Set<string>([
    identity.mpn,
    identity.lcsc,
    identity.manufacturer,
    identity.function,
  ]);

  const terms: SafeText[] = [];
  for (const value of [
    ...aliases.mpn,
    ...aliases.lcsc,
    ...aliases.manufacturer,
    ...aliases.function,
  ]) {
    if (shown.has(value)) continue;
    shown.add(value);
    terms.push(value);
  }
  return terms;
}

/**
 * One key/value pair of a structured fact value.
 *
 * Three facts in the corpus record an object rather than a scalar — the
 * distributor-identity bindings, whose value is `{lcsc, manufacturer, mpn,
 * variant}`. The evidence contract forbids flattening them into a string, so
 * the view model keeps the shape and the renderer has to present it as the
 * several values it is.
 */
export type FactValueEntry = {
  readonly key: SafeText;
  readonly value: number | SafeText;
};

/**
 * The structured form of a fact value, or `null` for a scalar.
 *
 * Deliberately takes `unknown`. `PublicFact["value"]` is being widened by the
 * adapter from `number | SafeText` to include the entry array, and this narrows
 * correctly on both the old and the new union — so the renderer is right before
 * and after that lands, without this feature editing the view model it does not
 * own. `Array.isArray` is the discriminator because it narrows cleanly against a
 * branded string.
 */
export function factValueEntries(value: unknown): readonly FactValueEntry[] | null {
  return Array.isArray(value) ? (value as readonly FactValueEntry[]) : null;
}

/** A scalar fact value as published text. Structured values do not come here. */
export function factValue(fact: PublicFact): SafeText {
  if (typeof fact.value === "number") {
    return safeText(String(fact.value), { field: `${fact.factId} value` });
  }
  if (typeof fact.value === "string") return fact.value;

  // Structured values normally reach the page through factValueEntries()/entryValue(),
  // which renders each pair separately so every component stays individually visible
  // and searchable — the three real ones are orderable-identity bindings carrying MPN
  // and LCSC, the exact terms the index is required to find. This branch only catches a
  // caller that skipped that check. It joins legible pairs rather than casting an array
  // to SafeText: the widened union is on the base now, so the cast would be unsound.
  return joinSafe(
    fact.value.map((entry) => joinSafe([entry.key, entryValue(entry, fact.factId)], "=")),
    "; ",
  );
}

/** One entry of a structured value as published text. */
export function entryValue(entry: FactValueEntry, factId: string): SafeText {
  return typeof entry.value === "number"
    ? safeText(String(entry.value), { field: `${factId} ${entry.key}` })
    : entry.value;
}

// --- fact classes ----------------------------------------------------------

/**
 * The order fact classes are presented in, and why each one exists.
 *
 * Not alphabetical: the ordering is the reading order a spec is meant to be
 * read in. An absolute maximum and a recommended operating value are the pair
 * most often collapsed into one "rating" by a hurried reader, and collapsing
 * them is how parts get destroyed, so they lead and they lead adjacent.
 *
 * A class absent from this list still renders — it sorts after the known ones
 * and simply has no gloss. New evidence classes must not need a code change to
 * become visible.
 */
export const FACT_CLASS_ORDER: readonly string[] = [
  "ABSOLUTE_MAXIMUM",
  "RECOMMENDED_OPERATION",
  "GUARANTEED_ELECTRICAL",
  "TYPICAL_CURVE",
  "TRANSIENT",
  "THERMAL_SOA",
  "PROTECTION_STANDOFF",
  "PROTECTION_BREAKDOWN",
  "PROTECTION_CLAMP",
  "PROJECT_STATE",
];

export const FACT_CLASS_GLOSS: Readonly<Record<string, string>> = {
  ABSOLUTE_MAXIMUM:
    "A never-exceed limit. Reaching it may damage the part; it is not an operating target " +
    "and there is no margin implied by it.",
  RECOMMENDED_OPERATION:
    "The range the manufacturer intends the part to be used in. Always narrower than the " +
    "absolute maximum.",
  GUARANTEED_ELECTRICAL:
    "A parameter the manufacturer guarantees over the stated conditions, usually with " +
    "minimum, typical and maximum values.",
  TYPICAL_CURVE:
    "A representative figure read from a characteristic curve. Typical values are not " +
    "guaranteed and vary part to part.",
  TRANSIENT: "Behaviour during a short event — startup, a switching edge, a fault or a surge.",
  THERMAL_SOA:
    "Thermal and safe-operating-area behaviour: how much the part may dissipate, and under " +
    "what mounting and ambient conditions.",
  PROTECTION_STANDOFF:
    "The voltage a protection device is expected to sit at without conducting.",
  PROTECTION_BREAKDOWN: "The voltage at which a protection device begins to conduct.",
  PROTECTION_CLAMP:
    "The voltage a protection device clamps to while conducting its rated surge current.",
  PROJECT_STATE:
    "A value this project recorded about how the part is used here — a chosen operating " +
    "point, a net assignment, or a derived figure. Not a manufacturer specification.",
};

/** Classes present on a record, known ones in reading order, then the rest. */
export function orderedFactClasses(facts: readonly PublicFact[]): SafeText[] {
  const present = [...new Set(facts.map((fact) => fact.factClass))];
  const known = present.filter((entry) => FACT_CLASS_ORDER.includes(entry));
  known.sort(
    (left, right) => FACT_CLASS_ORDER.indexOf(left) - FACT_CLASS_ORDER.indexOf(right),
  );
  const unknown = present.filter((entry) => !FACT_CLASS_ORDER.includes(entry)).sort(byCodeUnit);
  return [...known, ...unknown];
}

// --- plain-language glosses ------------------------------------------------

/**
 * What each recorded term means, in words a reader who has never opened the
 * evidence bundle can act on.
 *
 * These gloss the vocabulary, never a value. "NEEDS BENCH means it cannot be
 * settled from documents" is a definition; "this part is fine" would be a
 * verdict, and no gloss here makes one.
 *
 * Only terms that actually appear on a page reach that page's legend, so the
 * legend stays a legend rather than becoming a glossary of the whole schema.
 * Fields the publication matrix denies appear in none of these tables — the
 * legend must not describe something the pages do not show.
 */
export const VERDICT_GLOSS: Readonly<Record<string, string>> = {
  "PASS - primary-source confirmed":
    "Confirmed against the manufacturer's own document for this exact part.",
  "CONFIRMED - distributor identity only":
    "A distributor listing confirms which part this is, and nothing more. It carries no " +
    "electrical, thermal or lifetime authority.",
  "NEEDS BENCH":
    "Cannot be settled from documents. It needs measurement on real hardware before it can " +
    "be relied on.",
  UNSOURCED: "No accepted source backs this value yet. Treat it as a claim, not a fact.",
  "NOT APPLICABLE": "The parameter does not apply to this part as it is used here.",
};

export const PROVENANCE_GLOSS: Readonly<Record<string, string>> = {
  "PRIMARY-SPEC": "Taken from the manufacturer's own specification document.",
  "DISTRIBUTOR-IDENTITY": "Taken from a distributor listing. Identity information only.",
  "REFERENCE-DESIGN":
    "Taken from a vendor reference design or application note rather than the device " +
    "specification.",
  CALCULATED:
    "Derived arithmetically from other facts listed here. The expression and every input " +
    "are shown, so the number can be recomputed rather than trusted.",
  "PROJECT-CHOICE": "A decision made by this project. No vendor asserts it.",
  UNVERIFIED: "Recorded, but not yet backed by an accepted source.",
};

export const AVAILABILITY_GLOSS: Readonly<Record<string, string>> = {
  AVAILABLE: "The document was retrieved and is on record.",
  "SOURCE UNAVAILABLE":
    "The document could not be retrieved. It stays listed so the gap is visible; anything " +
    "resting on it remains unsourced.",
};

export const AUTHORITY_GLOSS: Readonly<Record<string, string>> = {
  MANUFACTURER_PRIMARY: "The manufacturer's own document for this exact part.",
  MANUFACTURER_MIRROR:
    "A copy of a manufacturer document hosted elsewhere. Usable, but weaker than the " +
    "manufacturer's own copy.",
  DISTRIBUTOR_IDENTITY: "A distributor listing. Establishes which part this is, nothing more.",
  REFERENCE_DESIGN: "A reference design or application note rather than a device specification.",
  PROJECT_GENERATOR: "A document this project generated, such as a schematic or netlist export.",
};

export const COVERAGE_STATUS_GLOSS: Readonly<Record<string, string>> = {
  COVERED: "Every question this domain asks is answered by the facts listed against it.",
  OPEN:
    "Unresolved. Open means the question has not been answered, not that the part is unsafe — " +
    "the reason states what is missing.",
};

export const IDENTITY_STATE_GLOSS: Readonly<Record<string, string>> = {
  VERIFIED: "The exact orderable part has been confirmed against a source.",
  UNRESOLVED:
    "The exact orderable part is not yet confirmed. Substituting a same-name part from " +
    "another vendor is not permitted on that basis.",
};

export const SOURCE_STATE_GLOSS: Readonly<Record<string, string>> = {
  AVAILABLE: "At least one document backing this line was retrieved.",
  "SOURCE UNAVAILABLE": "No document backing this line could be retrieved.",
};

/**
 * What each cross-component rule is asking, in ordinary words.
 *
 * A definition of the question, never an answer to it. "Whether the input rail
 * stays inside every part's own limits" is a description of scope; "the rail is
 * fine" would be a verdict, and the rule's own verdict and refusal are the only
 * things on the page allowed to speak to that.
 *
 * A domain with no entry still publishes and simply has no gloss, the same way
 * an unknown verdict does — the ruleset must be able to grow without a code
 * change hiding a rule.
 */
export const INTEGRATION_DOMAIN_GLOSS: Readonly<Record<string, string>> = {
  "rail-envelope":
    "Whether every part on the input rail stays inside its own recorded limits across a legal " +
    "power contract, a mis-contract, and a transient clamp event.",
  "usb-pd-nvm-load-switch":
    "How the power-delivery controller's stored configuration and its enable output drive the " +
    "load switch, through every state from detached to fault.",
  "al8860-led-stage":
    "How the LED driver, its sense resistor, inductor, catch diode and per-branch ballast " +
    "behave together across the LED forward-voltage, tolerance and temperature envelope.",
  "ap63203-logic-stage":
    "How the logic-rail converter, its inductor and its output capacitor behave together under " +
    "the real load the microcontroller presents.",
  "ntc-adc-firmware":
    "How the thermistor, its divider, the analog-to-digital input and the firmware that reads " +
    "them combine into a temperature the design can act on.",
  "source-to-bench-chain":
    "How far each claim has travelled from a manufacturer document towards a measurement on " +
    "real hardware, stage by stage.",
};

/**
 * The stages a claim passes through, from a vendor document to a measurement.
 *
 * The order is the chain's own and is never reordered: each stage describes a
 * different kind of proof, and a completed earlier stage says nothing about a
 * later one.
 */
export const EVIDENCE_STAGE_GLOSS: Readonly<Record<string, string>> = {
  "official-source": "The claim appears in a document the manufacturer published.",
  "conditioned-requirement":
    "The claim has been restated as a requirement with the conditions it holds under.",
  "generated-netlist": "The requirement is reflected in the netlist the project generates.",
  "symbol-footprint": "The schematic symbol's pins are mapped onto the footprint's pads.",
  "pcb-orientation": "The part's orientation and pad mapping are confirmed on the board layout.",
  "bom-cpl": "The exact orderable part and its placement are confirmed in the assembly files.",
  "as-built": "The assembled board has been inspected and matches what was specified.",
  programmed: "The device's stored configuration has been written and read back.",
  bench: "The behaviour has been measured on powered hardware.",
};

export const EVIDENCE_STAGE_STATUS_GLOSS: Readonly<Record<string, string>> = {
  MIXED:
    "Some claims at this stage are settled and others are not. It is not a completed stage, and " +
    "the facts listed against it are the ones that carry it.",
  OPEN:
    "Nothing at this stage has been established yet. A completed earlier stage does not imply " +
    "it.",
  CLOSED: "Every claim this stage covers is settled.",
};

export const UNIT_NONE_GLOSS =
  "The value is not a physical quantity, so it carries no unit. Recorded as `NONE`.";

/** The fallback for a recorded term this module has no wording for yet. */
export const MISSING_GLOSS = "No plain-language description is recorded for this term yet.";

export function glossFor(table: Readonly<Record<string, string>>, term: string): SafeText {
  return literal(table[term] ?? MISSING_GLOSS);
}

/** Terms of one kind that actually occur on a page, in stable order. */
export function presentTerms(values: readonly SafeText[]): SafeText[] {
  return [...new Set(values)].sort(byCodeUnit);
}

// --- owner skill -----------------------------------------------------------

/**
 * The evidence bundle a record belongs to.
 *
 * `PublicRecordIdentity.ownerSkill` is an approved addition owned by the
 * adapter (13 bundles across 32 lines, and `component-project-passives` alone
 * owns 11, so it is not derivable from anything else the model publishes). The
 * read sits behind one accessor purely so this feature does not have to guess
 * at the exact moment that leaf lands.
 *
 * The leaf has since landed, so this reads it directly — the structural cast it
 * was written behind is gone, and dropping the field is now a compile error here
 * rather than a page that silently degrades to a plausible-but-wrong link.
 *
 * The nullable return and the callers' absent-owner branches are kept: every
 * record in THIS provider has an owning bundle, but the fallback is the correct
 * behaviour for one that does not, and it is deliberately never a stand-in link.
 * Pointing the reciprocal link at the agent-resource index would look like the
 * owning bundle and lead somewhere else, and a wrong link is worse than a stated
 * absence.
 */
export function ownerSkillOf(record: PublicRecord): SafeText | null {
  return record.identity.ownerSkill;
}

/**
 * Where a record's raw evidence bundle is published, when the owner is known.
 *
 * zudo-pd runs with `claudeResources: false` (see `doc/zfb.config.ts`),
 * so neither `/docs/claude-skills/<bundle>/` nor a `/docs/claude/` hub exists as
 * a route — `ownerSkillOf()` therefore always returns `null` here (the matrix
 * denies `record.ownerSkill`/`integration.ownerSkill`), and every caller below
 * takes the "owning bundle not identified" branch rather than link to a route
 * that does not exist.
 */
export function agentResourceDestination(record: PublicRecord): Route | null {
  const ownerSkill = ownerSkillOf(record);
  return ownerSkill === null ? null : agentResourceRoute(ownerSkill);
}
