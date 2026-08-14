/**
 * `/docs/components/records/<slug>/` — one record's complete published evidence.
 *
 * The information architecture here is the deliverable, not the plumbing. The
 * data is a graph — facts cite sources, coverage domains cite facts, calculated
 * facts cite other records' facts, interactions cite several records at once —
 * and a graph rendered as a flat dump is unreadable. The page therefore orders
 * its sections by the question a reader arrives with:
 *
 *   Identity      which exact part is this, and where is it fitted?
 *   Coverage      what has been settled, and what is still open?
 *   Facts         what exactly is recorded, under what conditions?
 *   Calculations  which numbers were derived, from what?
 *   Pin maps      how does the symbol map to the footprint?
 *   Interactions  what does this part's behaviour depend on elsewhere?
 *   Rules         which cross-component rules is this part named in?
 *   Sources       what documents is any of this resting on?
 *   Legend        what do the recorded terms mean?
 *
 * Coverage precedes facts deliberately. A reader who meets 59 facts before
 * learning that four domains are unresolved will read the facts as a settled
 * specification, which is exactly the misreading this whole feature exists to
 * prevent.
 *
 * Three rules the sections obey:
 *
 *   - Exact strings are never paraphrased at the point of use. A verdict reads
 *     `PASS - primary-source confirmed` in the table; the plain-language
 *     explanation lives in the legend, built from the terms this page actually
 *     uses.
 *   - An empty section says it is empty. A section that vanished when its array
 *     was empty would be indistinguishable from a record that has nothing to
 *     declare, and those are very different statements.
 *   - Nothing is summarised into a verdict for the record as a whole. There is
 *     no badge, no score and no roll-up anywhere on this page.
 */

import {
  bulletList,
  code,
  containerComponent,
  evidenceAnchor,
  heading,
  inlineEvidenceAnchor,
  link,
  paragraph,
  routeCodeLink,
  routeLink,
  scrollableTable,
  space,
  strong,
  table,
  text,
  type TableRow,
} from "../mdx.ts";
import { buildPage, type GeneratedPage } from "../page.ts";
import { joinSafe, literal, safeText, type SafeText } from "../text.ts";
import {
  AUTHORITY_GLOSS,
  AVAILABILITY_GLOSS,
  COVERAGE_STATUS_GLOSS,
  FACT_CLASS_GLOSS,
  IDENTITY_STATE_GLOSS,
  PROVENANCE_GLOSS,
  SOURCE_STATE_GLOSS,
  UNIT_NONE_GLOSS,
  VERDICT_GLOSS,
  INTEGRATION_DOMAIN_GLOSS,
  CATALOG_ROUTE,
  INTEGRATION_ROUTE,
  agentResourceDestination,
  aliasTerms,
  catalogEntryRoute,
  entryValue,
  factReference as sharedFactReference,
  factValue,
  factValueEntries,
  fitLabel,
  glossFor,
  integrationRoute,
  openDomainSummary,
  orderedFactClasses,
  ownerSkillOf,
  placementSummary,
  presentTerms,
  recordRoute,
  samePage,
  type RecordIndex,
} from "./shared.ts";
import type {
  PublicCoverage,
  PublicFact,
  PublicIntegrationRule,
  PublicInteraction,
  PublicPinMap,
  PublicRecord,
  PublicSource,
} from "../view-model.ts";
import type { PhrasingContent, RootContent } from "mdast";

/** The unit string the provider records when a value is not a quantity. */
const UNIT_NONE = "NONE";

export function renderRecord(record: PublicRecord, index: RecordIndex): GeneratedPage {
  const { identity } = record;

  const body: RootContent[] = [
    evidenceAnchor(identity.anchor),
    ...orientation(record),
    ...subordinateSection(record),
    ...identitySection(record),
    ...placementSection(record),
    ...coverageSection(record, index),
    ...factsSection(record, index),
    ...calculationSection(record, index),
    ...pinMapSection(record),
    ...interactionSection(record, index),
    ...ruleSection(record, index),
    ...sourceSection(record),
    ...legendSection(record),
    ...agentResourceSection(record),
  ];

  return buildPage(
    `records/${identity.slug}/index.mdx`,
    {
      title: identity.mpn,
      // Carries the exact identifiers on purpose. The site's search index
      // stores `title` and `description` whole but caps `body` at 300
      // characters (`MAX_BODY_LENGTH` in zudo-doc, not configurable), and
      // matching is plain case-insensitive substring — so a term is findable
      // only where it literally appears in one of these two fields. The
      // orderable ID and the board/refdes placements are exactly the terms a
      // reader searches by and they sit far past the body cut-off, so they go
      // here. Keep this line short enough to still read as a description: it
      // is also the meta description and the search-result subtitle.
      description: joinSafe(
        [
          identity.function,
          identity.manufacturer,
          identity.lcsc,
          placementSummary(identity.placements),
          identity.recordId,
        ],
        " — ",
      ),
      // Ordering inside `records/` is inventory order, which the model already
      // holds; the caller supplies the position so this renderer never has to
      // know where it sits in the sequence.
      sidebarPosition: index.sidebarPositionByRecordId.get(identity.recordId) ?? 1,
    },
    body,
  );
}

function orientation(record: PublicRecord): RootContent[] {
  return [
    paragraph([
      text(
        literal(
          "Everything below is projected from this project's stored component evidence. " +
            "Values keep the exact wording, conditions, units and verdicts they were recorded " +
            "with — nothing here is re-typed, corrected, or combined into an overall judgement " +
            "about the part.",
        ),
      ),
    ]),
    paragraph([
      text(literal("This record in the catalog:")),
      space(),
      routeLink(catalogEntryRoute(record.identity.anchor), record.identity.mpn),
    ]),
  ];
}

/**
 * Why a subordinate record exists, said out loud.
 *
 * A subordinate is a real orderable line with its own page, but its evidence is
 * audited as part of another part's bundle: the sense resistor's tolerance is
 * what makes the driver's output current a range rather than a number. Without
 * this paragraph the relationship is only visible as a field, and a reader who
 * skims fields will not understand why the page is thin.
 */
function subordinateSection(record: PublicRecord): RootContent[] {
  const { identity } = record;
  if (identity.kind !== "subordinate") return [];

  // `safeText` trims, so every separating space is a `space()` node rather than
  // padding inside a literal — a padded literal comes back collapsed and the
  // words run into the link that follows.
  const explanation: PhrasingContent[] = [
    text(
      literal(
        "This is a subordinate record. It is a component in its own right, with its own " +
          "orderable identity and its own placements, but its evidence is audited as part of",
      ),
    ),
    space(),
  ];

  if (identity.parentSlug !== null && identity.parentRecordId !== null) {
    explanation.push(
      routeCodeLink(recordRoute(identity.parentSlug), identity.parentRecordId),
      text(
        literal(
          ", because its behaviour is only meaningful in that part's circuit. Read the parent " +
            "record for the shared context; the facts below are the ones specific to this line.",
        ),
      ),
    );
  } else {
    explanation.push(
      text(
        literal(
          "another record that is not published here, so the shared context is not available " +
            "on this site.",
        ),
      ),
    );
  }

  return [heading(2, literal("Subordinate record")), paragraph(explanation)];
}

function identitySection(record: PublicRecord): RootContent[] {
  const { identity } = record;
  const ownerSkill = ownerSkillOf(record);
  const aliases = aliasTerms(record);

  return [
    heading(2, literal("Identity")),
    bulletList([
      field("Record ID", [code(identity.recordId)]),
      field("Record kind", [text(literal(identity.kind))]),
      field("Manufacturer part number", [code(identity.mpn)]),
      field("Manufacturer", [text(identity.manufacturer)]),
      field("Function", [text(identity.function)]),
      field("Orderable ID", [code(identity.lcsc)]),
      field("Package", [code(identity.packageName)]),
      field("Inventory line", [code(identity.lineId)]),
      // This record's route may be its LCSC code rather than its part number,
      // so the alternate terms must appear in the rendered page or nobody can
      // search their way here by the other name.
      ...(aliases.length === 0 ? [] : [field("Also known as", termList(aliases))]),
      ...(ownerSkill === null ? [] : [field("Owner skill", [code(ownerSkill)])]),
      field("Fit", [text(fitLabel(identity.dnp))]),
      field("Identity state", [text(identity.identityState)]),
      field("Source state", [text(identity.sourceState)]),
      field("Coverage", [text(openDomainSummary(record.coverage))]),
    ]),
  ];
}

function placementSection(record: PublicRecord): RootContent[] {
  const { placements } = record.identity;
  if (placements.length === 0) {
    return [
      heading(2, literal("Placements")),
      paragraph([text(literal("No board placement is published for this record."))]),
    ];
  }

  return [
    heading(2, literal("Placements")),
    paragraph([
      text(
        literal(
          "Every position this exact line occupies in the as-built design. One line may be " +
            "placed many times and across more than one board.",
        ),
      ),
    ]),
    table(
      [literal("Board"), literal("Reference designator")],
      placements.map((placement) => [[text(placement.board)], [code(placement.refdes)]]),
    ),
  ];
}

/**
 * Coverage: what has been settled, one domain at a time.
 *
 * Rendered as a heading per domain rather than as a table, because the reason
 * text is the substance — some run to a full paragraph explaining exactly which
 * document was checked and what it did not contain — and a table cell turns
 * that into an unreadable column.
 */
function coverageSection(record: PublicRecord, index: RecordIndex): RootContent[] {
  const head = [
    heading(2, literal("Coverage")),
    paragraph([
      text(
        literal(
          "Coverage is stated one domain at a time and is never rolled up. A domain marked " +
            "open is a question that has not been answered; it is not a finding that the part " +
            "is unsuitable. A record with no open domains has not thereby been declared safe.",
        ),
      ),
    ]),
  ];

  if (record.coverage.length === 0) {
    return [
      ...head,
      paragraph([text(literal("No coverage domain is published for this record."))]),
    ];
  }

  return [...head, ...record.coverage.flatMap((entry) => coverageEntry(entry, record, index))];
}

function coverageEntry(
  entry: PublicCoverage,
  record: PublicRecord,
  index: RecordIndex,
): RootContent[] {
  const blocks: RootContent[] = [
    heading(3, entry.domain),
    evidenceAnchor(entry.anchor),
    bulletList([
      field("Coverage ID", [code(entry.coverageId)]),
      field("Status", [text(literal(entry.status))]),
    ]),
    paragraph([strong(literal("Reason:")), space(), text(entry.reason)]),
  ];

  if (entry.factIds.length > 0) {
    blocks.push(
      paragraph([strong(literal("Facts in this domain:"))]),
      bulletList(entry.factIds.map((factId) => factReference(factId, record, index))),
    );
  } else {
    blocks.push(
      paragraph([
        strong(literal("Facts in this domain:")),
        space(),
        text(literal("none are recorded against it.")),
      ]),
    );
  }

  if (entry.blockingFactIds.length > 0) {
    blocks.push(
      paragraph([
        strong(literal("Blocked by:")),
        space(),
        text(
          literal(
            "these facts must be resolved before the domain can close. Each is listed in full " +
              "under Facts.",
          ),
        ),
      ]),
      bulletList(entry.blockingFactIds.map((factId) => factReference(factId, record, index))),
    );
  } else if (entry.status === "OPEN") {
    // The explicit no-blocker state. An open domain with no blocking fact is
    // not an oversight and not a milder kind of open: it means what is missing
    // has not been reduced to a recorded fact yet, so there is nothing to link.
    // Rendering nothing here would read as "open, and nothing is blocking it".
    blocks.push(
      paragraph([
        strong(literal("Blocked by:")),
        space(),
        text(
          literal(
            "no blocking fact is recorded. What is missing has not been reduced to a specific " +
              "recorded fact, so the reason above is the whole of what is known.",
          ),
        ),
      ]),
    );
  }

  return blocks;
}

/**
 * Facts, grouped by class.
 *
 * Class is the grouping that carries meaning: an absolute maximum and a
 * recommended operating value are the pair a hurried reader most often
 * collapses into one "rating", and collapsing them is how parts are destroyed.
 * Grouping by class puts them under separate headings with separate
 * explanations, so the distinction survives skimming.
 */
function factsSection(record: PublicRecord, index: RecordIndex): RootContent[] {
  const head = [
    heading(2, literal("Facts")),
    paragraph([
      text(
        literal(
          "Each fact keeps its value, its unit, the conditions it holds under, where it came " +
            "from and how far it has been confirmed as separate fields, because they are " +
            "separate claims. A value without its conditions is not the same fact, and a " +
            "verdict is about the evidence for the value, not about the part.",
        ),
      ),
    ]),
  ];

  if (record.facts.length === 0) {
    return [...head, paragraph([text(literal("No fact is published for this record."))])];
  }

  return [
    ...head,
    ...orderedFactClasses(record.facts).flatMap((factClass) =>
      factClassBlock(factClass, record, index),
    ),
  ];
}

function factClassBlock(
  factClass: SafeText,
  record: PublicRecord,
  index: RecordIndex,
): RootContent[] {
  const facts = record.facts.filter((fact) => fact.factClass === factClass);
  const gloss = FACT_CLASS_GLOSS[factClass];

  return [
    heading(3, factClass),
    ...(gloss === undefined ? [] : [paragraph([text(literal(gloss))])]),
    scrollableTable(
      "facts",
      [
        literal("Fact"),
        literal("Value"),
        literal("Unit"),
        literal("Conditions"),
        literal("Verdict"),
        literal("Provenance"),
        literal("Evidence"),
      ],
      facts.map((fact) => factRow(fact, record, index)),
    ),
  ];
}

function factRow(fact: PublicFact, record: PublicRecord, index: RecordIndex): TableRow {
  return [
    [inlineEvidenceAnchor(fact.anchor), code(fact.factId)],
    valueCell(fact),
    [code(fact.unit)],
    [text(fact.conditions)],
    [text(fact.verdict)],
    [text(fact.provenance)],
    evidenceCell(fact, record),
  ];
}

/**
 * A fact's value, scalar or structured.
 *
 * Three facts record an object rather than a scalar — the distributor-identity
 * bindings, whose value is `{lcsc, manufacturer, mpn, variant}`. The evidence
 * contract forbids flattening those into one string, so each pair is rendered as
 * `key=value`, keys as code because they are field names. A reader can still see
 * every component of the identity, and a search for the LCSC code still finds
 * the row.
 */
function valueCell(fact: PublicFact): PhrasingContent[] {
  const entries = factValueEntries(fact.value);
  if (entries === null) return [text(factValue(fact))];
  if (entries.length === 0) return [text(literal("no value recorded"))];

  const cell: PhrasingContent[] = [];
  for (const [position, entry] of entries.entries()) {
    if (position > 0) cell.push(text(literal(";")), space());
    cell.push(code(entry.key), text(literal("=")), text(entryValue(entry, fact.factId)));
  }
  return cell;
}

/**
 * Where a fact came from: the recorded locator, linked to the source it cites.
 *
 * The locator is the citation — it names the document and the place inside it,
 * and in this corpus it usually opens with the source ID itself. So the locator
 * is what gets linked, and the source ID is printed separately only when the
 * locator does not already contain it, which in practice means derived values
 * whose locator reads `CALCULATED: …`.
 *
 * That test decides what to *show*; it never alters what is shown. The locator
 * is published exactly as recorded, prefix included — trimming a redundant
 * prefix would tidy the column at the cost of making the page disagree with the
 * bundle, which is never a trade this feature makes.
 */
function evidenceCell(fact: PublicFact, record: PublicRecord): PhrasingContent[] {
  const sourceAnchor = record.sources.find(
    (source) => source.sourceId === fact.sourceId,
  )?.anchor;
  const locatorNamesSource = fact.locator.includes(fact.sourceId);

  const cell: PhrasingContent[] = [];
  if (!locatorNamesSource) {
    cell.push(
      sourceAnchor === undefined
        ? code(fact.sourceId)
        : routeCodeLink(samePage(sourceAnchor), fact.sourceId),
      space(),
      text(literal("—")),
      space(),
    );
  }
  cell.push(
    sourceAnchor === undefined || !locatorNamesSource
      ? text(fact.locator)
      : routeLink(samePage(sourceAnchor), fact.locator),
  );
  return cell;
}

/**
 * Calculated facts and what they were derived from.
 *
 * Given its own section rather than two more columns on the fact tables,
 * because it is a different question — "can I recompute this?" rather than
 * "what is this?" — and because it is the only place the cross-record structure
 * of the evidence becomes visible. Seven facts in this corpus depend on a fact
 * owned by a different record; those dependencies link across to the other
 * record's page and name the part, so the chain can be followed rather than
 * guessed at.
 */
function calculationSection(record: PublicRecord, index: RecordIndex): RootContent[] {
  const calculated = record.facts.filter(
    (fact) => fact.expression !== "" || fact.dependsOn.length > 0,
  );
  if (calculated.length === 0) return [];

  return [
    heading(2, literal("Calculation dependencies")),
    paragraph([
      text(
        literal(
          "These values were derived from other recorded facts rather than read from a " +
            "document. The expression and every input are published so the number can be " +
            "recomputed instead of trusted. A derived value is never stronger than the weakest " +
            "fact it depends on.",
        ),
      ),
    ]),
    scrollableTable(
      "calculation-dependencies",
      [literal("Fact"), literal("Expression"), literal("Depends on")],
      calculated.map((fact) => [
        [routeCodeLink(samePage(fact.anchor), fact.factId)],
        fact.expression === "" ? [text(literal("not recorded"))] : [code(fact.expression)],
        dependencyCell(fact, record, index),
      ]),
    ),
  ];
}

function dependencyCell(
  fact: PublicFact,
  record: PublicRecord,
  index: RecordIndex,
): PhrasingContent[] {
  if (fact.dependsOn.length === 0) return [text(literal("nothing recorded"))];

  const cell: PhrasingContent[] = [];
  for (const [position, dependencyId] of fact.dependsOn.entries()) {
    if (position > 0) cell.push(text(literal(",")), space());
    cell.push(...factReference(dependencyId, record, index));
  }
  return cell;
}

/**
 * A reference to a fact by ID, from this record's page.
 *
 * The rendering itself lives in `shared.ts`: the integration page cites the
 * same facts, and a dependency has to look and link the same way wherever it is
 * printed. This wrapper only supplies "the page we are on".
 */
function factReference(
  factId: SafeText,
  record: PublicRecord,
  index: RecordIndex,
): PhrasingContent[] {
  return sharedFactReference(index, factId, record.identity.recordId);
}

/**
 * Pin maps: how the schematic symbol maps onto the footprint.
 *
 * One record here carries two maps, because the same connector is documented in
 * two contexts. Each map is therefore headed by its own ID rather than by the
 * part, and each states its symbol and footprint, so two maps for one record
 * are distinguishable at a glance instead of merging into one long table.
 *
 * The pin table itself is the only content on these pages placed inside a
 * disclosure element. It is reference data a reader looks up rather than reads,
 * it is the longest table on the page, and hiding it costs nothing: `<details>`
 * is native HTML that opens without JavaScript, and the rows stay in the
 * generated file, the built HTML and `llms-full.txt` either way. Nothing that
 * carries a claim — no value, condition, verdict, coverage reason or source —
 * is ever placed inside one.
 *
 * Site search is the one surface they do NOT reach, and the disclosure is not
 * why: zudo-doc's index truncates `body` to 300 characters, so a pin row is
 * past the cut-off open or closed. Measured, not assumed.
 */
function pinMapSection(record: PublicRecord): RootContent[] {
  const head = [
    heading(2, literal("Pin maps")),
    paragraph([
      text(
        literal(
          "The mapping between the schematic symbol's pins and the footprint's pads, as " +
            "recorded. A record may carry more than one map when the same part is documented " +
            "in more than one context.",
        ),
      ),
    ]),
  ];

  if (record.pinMaps.length === 0) {
    return [...head, paragraph([text(literal("No pin map is published for this record."))])];
  }

  return [...head, ...record.pinMaps.flatMap((pinMap) => pinMapEntry(pinMap))];
}

function pinMapEntry(pinMap: PublicPinMap): RootContent[] {
  const blocks: RootContent[] = [
    heading(3, pinMap.pinMapId),
    evidenceAnchor(pinMap.anchor),
    bulletList([
      field("Symbol", [code(pinMap.symbol)]),
      field("Footprint", [code(pinMap.footprint)]),
      field("Pins", [text(safeText(String(pinMap.pins.length), { field: "pin count" }))]),
    ]),
  ];

  if (pinMap.pins.length === 0) {
    blocks.push(paragraph([text(literal("No pin is published for this map."))]));
    return blocks;
  }

  blocks.push(
    containerComponent("EvidenceDetails", { label: "pin-assignments" }, [
      scrollableTable(
        "pin-assignments",
        [
          literal("Symbol pin"),
          literal("Name"),
          literal("Footprint pad"),
          literal("Function"),
        ],
        pinMap.pins.map((pin) => [
          [code(pin.symbolPin)],
          [code(pin.name)],
          [code(pin.footprintPad)],
          [text(pin.function)],
        ]),
      ),
    ]),
  );
  return blocks;
}

/** Cross-record behaviour: what this part's operation is entangled with. */
function interactionSection(record: PublicRecord, index: RecordIndex): RootContent[] {
  const head = [
    heading(2, literal("Interactions")),
    paragraph([
      text(
        literal(
          "Behaviour that is not a property of this part alone. Each interaction names the " +
            "records it spans, the conditions it holds under, and how far it has been " +
            "confirmed. An interaction that spans several parts appears on every one of " +
            "their pages, under the same identifier, because it is equally a fact about each.",
        ),
      ),
    ]),
  ];

  const interactions = index.interactionsByRecordId.get(record.identity.recordId) ?? [];
  if (interactions.length === 0) {
    return [...head, paragraph([text(literal("No interaction is published for this record."))])];
  }

  return [...head, ...interactions.flatMap((entry) => interactionEntry(entry, record, index))];
}

function interactionEntry(
  entry: PublicInteraction,
  record: PublicRecord,
  index: RecordIndex,
): RootContent[] {
  const blocks: RootContent[] = [
    heading(3, entry.interactionId),
    evidenceAnchor(entry.anchor),
    bulletList([
      field("Records involved", recordReferences(entry.recordIds, record, index)),
      field("Conditions", [text(entry.conditions)]),
      field("Verdict", [text(entry.verdict)]),
    ]),
  ];

  if (entry.factIds.length > 0) {
    blocks.push(
      paragraph([strong(literal("Facts this rests on:"))]),
      bulletList(entry.factIds.map((factId) => factReference(factId, record, index))),
    );
  } else {
    blocks.push(
      paragraph([
        strong(literal("Facts this rests on:")),
        space(),
        text(literal("none are recorded against it.")),
      ]),
    );
  }

  return blocks;
}

function recordReferences(
  recordIds: readonly SafeText[],
  record: PublicRecord,
  index: RecordIndex,
): PhrasingContent[] {
  if (recordIds.length === 0) return [text(literal("none recorded"))];

  const cell: PhrasingContent[] = [];
  for (const [position, recordId] of recordIds.entries()) {
    if (position > 0) cell.push(text(literal(",")), space());
    if (recordId === record.identity.recordId) {
      cell.push(code(recordId), space(), text(literal("(this record)")));
      continue;
    }
    const slug = index.slugByRecordId.get(recordId);
    cell.push(slug === undefined ? code(recordId) : routeCodeLink(recordRoute(slug), recordId));
  }
  return cell;
}

/**
 * The cross-component rules this record is named in.
 *
 * Deliberately a list of links and not a copy. The rules live on the
 * integration page, where each one carries its conditions, its conditioned
 * arithmetic, its evidence chain and — the part that matters most — the exact
 * statement of what may not be concluded from any of it. Restating a rule here
 * would create a second place a reader could form a judgement, and the shorter
 * of the two would always be the one that dropped the refusal.
 *
 * The domain and verdict are printed because they are what a reader needs to
 * decide whether to follow the link, and both are the rule's own recorded
 * strings. Neither is a verdict about this part: a record can be named in a
 * rule purely as the component whose limit another part must stay under.
 */
function ruleSection(record: PublicRecord, index: RecordIndex): RootContent[] {
  const head = [
    heading(2, literal("Cross-component rules")),
    paragraph([
      text(
        literal(
          "Rules that span several parts at once and are published in full on the integration " +
            "page. Each rule's verdict below is that rule's own — it is a statement about the " +
            "cross-component question, not about this part — and the exact wording of what the " +
            "rule refuses to conclude is published with the rule itself.",
        ),
      ),
    ]),
  ];

  const rules = index.rulesByRecordId.get(record.identity.recordId) ?? [];
  if (rules.length === 0) {
    return [
      ...head,
      paragraph([text(literal("No cross-component rule names this record."))]),
    ];
  }

  return [
    ...head,
    bulletList(rules.map((rule) => ruleReference(rule))),
    paragraph([
      routeLink(INTEGRATION_ROUTE, literal("All cross-component rules")),
    ]),
  ];
}

function ruleReference(rule: PublicIntegrationRule): PhrasingContent[] {
  const reference: PhrasingContent[] = [
    routeCodeLink(integrationRoute(rule.anchor), rule.ruleId),
    space(),
    text(literal("—")),
    space(),
    text(rule.domain),
    space(),
    text(literal("—")),
    space(),
    strong(literal("rule verdict:")),
    space(),
    text(rule.verdict),
  ];
  // The gloss goes last because it is the longest part: the identifier, the
  // domain and the verdict are what a reader scans for, and burying them behind
  // a sentence would make a list of three rules unscannable.
  const gloss = INTEGRATION_DOMAIN_GLOSS[rule.domain];
  if (gloss !== undefined) {
    reference.push(space(), text(literal("—")), space(), text(literal(gloss)));
  }
  return reference;
}

/**
 * Sources: the documents everything above rests on.
 *
 * Published whether or not they could be retrieved. A source recorded as
 * unavailable is the most important kind to show — it is the difference between
 * "no evidence was sought" and "evidence was sought and could not be obtained",
 * and hiding it would erase that distinction.
 */
function sourceSection(record: PublicRecord): RootContent[] {
  const head = [
    heading(2, literal("Sources")),
    paragraph([
      text(
        literal(
          "Every document cited above, with its identification, when it was retrieved, and " +
            "what kind of authority it carries. Sources that could not be retrieved are listed " +
            "too, with their unavailability stated, so a gap in the evidence is visible rather " +
            "than absent.",
        ),
      ),
    ]),
  ];

  if (record.sources.length === 0) {
    return [...head, paragraph([text(literal("No source is published for this record."))])];
  }

  return [...head, ...record.sources.flatMap((source) => sourceEntry(source))];
}

function sourceEntry(source: PublicSource): RootContent[] {
  const details: PhrasingContent[][] = [
    field("Source ID", [code(source.sourceId)]),
    field("Document number", [text(source.documentNumber)]),
    field("Revision", [text(source.revision)]),
    field("Document date", [text(source.documentDate)]),
    field("Retrieved", [text(source.retrievalDate)]),
    field("Authority", [text(source.authorityClass)]),
    field("Locator", [text(source.locator)]),
    field("Printed page", [text(source.printedPageLabel)]),
    // Availability sits immediately before the link it qualifies. Twelve of the
    // corpus's sources publish a perfectly well-formed URL and are still
    // recorded as unretrievable; separating the two invites a reader to follow
    // the link and assume the document backs the facts citing it.
    field("Availability", [text(source.availability)]),
  ];

  details.push(
    source.url === null
      ? field("Document URL", [text(literal("no link is published for this source"))])
      : field("Document URL", [link(source.url, safeText(source.url, { field: "source url" }))]),
  );

  return [heading(3, source.documentTitle), evidenceAnchor(source.anchor), bulletList(details)];
}

/**
 * The legend, built from the terms this page actually uses.
 *
 * Deriving it from the page's own content rather than from the schema keeps it
 * a legend instead of a glossary: a reader is told what the words in front of
 * them mean and is not handed definitions for states this record never reaches.
 * It also makes it structurally impossible to describe a field the publication
 * matrix denies — a term that is never rendered is never collected.
 *
 * A recorded term with no wording yet still gets a row, marked as such. Losing
 * the row would hide that the vocabulary has grown.
 */
function legendSection(record: PublicRecord): RootContent[] {
  const blocks: RootContent[] = [
    heading(2, literal("Legend")),
    paragraph([
      text(
        literal(
          "What the recorded terms on this page mean, in ordinary words. The exact terms above " +
            "are the ones that count; these descriptions explain them and never replace them.",
        ),
      ),
    ]),
  ];

  const groups: readonly {
    readonly title: string;
    readonly terms: readonly SafeText[];
    readonly gloss: Readonly<Record<string, string>>;
  }[] = [
    {
      title: "Verdict",
      terms: presentTerms(record.facts.map((fact) => fact.verdict)),
      gloss: VERDICT_GLOSS,
    },
    {
      title: "Provenance",
      terms: presentTerms(record.facts.map((fact) => fact.provenance)),
      gloss: PROVENANCE_GLOSS,
    },
    {
      title: "Fact class",
      terms: presentTerms(record.facts.map((fact) => fact.factClass)),
      gloss: FACT_CLASS_GLOSS,
    },
    {
      title: "Coverage status",
      // `status` is a TypeScript union rather than a projected string, so it
      // becomes SafeText here the same way any authored label does.
      terms: presentTerms(record.coverage.map((entry) => literal(entry.status))),
      gloss: COVERAGE_STATUS_GLOSS,
    },
    {
      title: "Source availability",
      terms: presentTerms(record.sources.map((source) => source.availability)),
      gloss: AVAILABILITY_GLOSS,
    },
    {
      title: "Source authority",
      terms: presentTerms(record.sources.map((source) => source.authorityClass)),
      gloss: AUTHORITY_GLOSS,
    },
    {
      title: "Identity state",
      terms: [record.identity.identityState],
      gloss: IDENTITY_STATE_GLOSS,
    },
    {
      title: "Source state",
      terms: [record.identity.sourceState],
      gloss: SOURCE_STATE_GLOSS,
    },
  ];

  for (const group of groups) {
    if (group.terms.length === 0) continue;
    blocks.push(
      heading(3, literal(group.title)),
      table(
        [literal("Recorded term"), literal("What it means")],
        group.terms.map((term) => [
          [code(term)],
          [text(glossFor(group.gloss, term))],
        ]),
      ),
    );
  }

  if (record.facts.some((fact) => fact.unit === UNIT_NONE)) {
    blocks.push(
      heading(3, literal("Unit")),
      table(
        [literal("Recorded term"), literal("What it means")],
        [[[code(literal(UNIT_NONE))], [text(literal(UNIT_NONE_GLOSS))]]],
      ),
    );
  }

  return blocks;
}

/**
 * The reciprocal link back to the evidence itself.
 *
 * This page is a projection; the JSON bundle behind the linked skill is the
 * thing it is a projection of. The link exists so a reader who needs the
 * authoritative form can reach it, and the wording says which of the two wins,
 * so the projection is never mistaken for the record.
 */
function agentResourceSection(record: PublicRecord): RootContent[] {
  const ownerSkill = ownerSkillOf(record);
  const destination = agentResourceDestination(record);

  return [
    heading(2, literal("Raw agent resource")),
    paragraph([
      text(
        literal(
          "This page is generated from a stored evidence bundle and does not restate it. The " +
            "bundle is the source of truth: where the two ever disagree, the bundle is right " +
            "and this page is stale.",
        ),
      ),
    ]),
    paragraph(
      // No fallback link when the owner is unknown. A link to the resource index
      // would look like the owning bundle and lead somewhere else, and a
      // convincingly wrong link is worse than a stated absence.
      destination === null || ownerSkill === null
        ? [
            text(
              literal(
                "The owning bundle is not identified in the published model, so no reciprocal " +
                  "link can be given for this record.",
              ),
            ),
          ]
        : [
            routeLink(destination, literal("Open the owning bundle")),
            space(),
            code(ownerSkill),
          ],
    ),
  ];
}

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

/**
 * `/docs/components/records/` — the landing page the `records/` directory needs.
 *
 * This site's navigation is its filesystem: a directory without an `index.mdx`
 * has no landing page and does not present correctly in the sidebar. The
 * package's `CategoryNav` component only takes a top-level category name, so it
 * cannot list a nested directory — hence a hand-built list here.
 *
 * Kept deliberately thin. The catalog is where records are compared; this page
 * exists to be the category's front door and to get a reader to the right one,
 * so it carries names and IDs and sends everything else to the catalog.
 */
export function renderRecordsIndex(records: readonly PublicRecord[]): GeneratedPage {
  const body: RootContent[] = [
    paragraph([
      text(
        literal(
          "One page per published component record, each carrying that record's facts, " +
            "sources, coverage domains, pin maps and interactions. They are ordered as the " +
            "bill of materials orders them, with each subordinate record directly after the " +
            "part it belongs to.",
        ),
      ),
    ]),
    paragraph([
      text(literal("To compare records against each other, start from the")),
      space(),
      routeLink(CATALOG_ROUTE, literal("catalog")),
      text(literal(".")),
    ]),
  ];

  if (records.length === 0) {
    body.push(paragraph([text(literal("No component record is published."))]));
  } else {
    body.push(
      heading(2, literal("Records")),
      bulletList(
        records.map((record) => [
          routeLink(recordRoute(record.identity.slug), record.identity.mpn),
          space(),
          text(literal("—")),
          space(),
          code(record.identity.recordId),
          space(),
          text(record.identity.function),
        ]),
      ),
    );
  }

  return buildPage(
    "records/index.mdx",
    {
      title: literal("Records"),
      description: literal(
        "Per-record evidence pages: facts, sources, coverage domains, pin maps and interactions.",
      ),
      sidebarPosition: 3,
    },
    body,
  );
}
