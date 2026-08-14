/**
 * `/docs/components/integration/` — the cross-component view.
 *
 * Every other page in this section is organised around one part. This one is
 * organised around the questions that cannot be answered by looking at one
 * part: whether the whole input rail survives a clamp event, whether a gate
 * divider built from two resistors keeps a MOSFET inside its own limit at a
 * voltage nobody contracted for, whether eight parallel LED branches share
 * current when their forward voltages do not match.
 *
 * The rules are the only place in this corpus that records a **refusal** — an
 * explicit statement of what may not be concluded from the evidence shown. That
 * makes the page's shape non-negotiable in one respect: a rule's refusal is
 * rendered with the rule, every time, immediately after its verdict and before
 * any arithmetic. A reader who stops early must stop having read what the rule
 * will not claim, not having read a number.
 *
 * Three consequences the rest of this file obeys:
 *
 *   - **Nothing is aggregated.** There is no count of how many rules pass,
 *     no chain-completion figure, no board-level state. Six per-rule verdicts
 *     are six separate claims and are published as six separate claims.
 *   - **No expression is evaluated here.** The provider recorded both the
 *     expression and its results; recomputing either would put a second
 *     calculator on the page that can disagree with the evidence.
 *   - **Every ID is a link.** A rule names records and facts that live on other
 *     pages; naming them without linking would leave a reader to guess which of
 *     32 record pages holds `fact-c22807-r12-topology`.
 */

import {
  bulletList,
  code,
  evidenceAnchor,
  heading,
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
import { anchor } from "../ids.ts";
import { buildPage, type GeneratedPage } from "../page.ts";
import { joinSafe, literal, safeText, type SafeText } from "../text.ts";
import {
  EVIDENCE_STAGE_GLOSS,
  EVIDENCE_STAGE_STATUS_GLOSS,
  INTEGRATION_DOMAIN_GLOSS,
  VERDICT_GLOSS,
  agentResourceRoute,
  factReference,
  glossFor,
  presentTerms,
  recordRoute,
  samePage,
  type RecordIndex,
} from "./shared.ts";
import type {
  PublicIntegrationRule,
  PublicRuleCalculation,
  PublicRuleCalculationCase,
  PublicRuleEvidenceStage,
  PublicViewModel,
} from "../view-model.ts";
import type { PhrasingContent, RootContent } from "mdast";

/** Anchor the record and narrative pages link the rule index by. Public contract. */
export const INTEGRATION_INDEX_ANCHOR = "integration-index";

/**
 * This page cites facts owned by every record and owns none of them, so no fact
 * reference is ever a same-page link. `factReference` takes the current record
 * as `null` for exactly this case.
 */
const NO_CURRENT_RECORD = null;

/*
 * Why some recorded strings are monospace here and others are not.
 *
 * `assertMdxSafe` fails on any unescaped `{` in the final file, and it does not
 * ask whether the brace was inside an inline-code span — where MDX would in
 * fact treat it as inert. That is a deliberate false positive (ARCHITECTURE.md
 * §7): the guard fails closed and a human decides. The consequence for this
 * page is a rule the renderer obeys rather than works around:
 *
 *   monospace is for IDENTIFIERS — rule, calculation, record and fact ids, the
 *   expression and its result key — all of which are code-shaped by
 *   construction. A domain, a stage name, a status and a verdict are phrases
 *   the evidence chose, and one of them containing a brace must render, not
 *   stop the build.
 *
 * Weakening the guard to admit braces inside code spans would be the wrong fix:
 * it is the layer that catches a serializer regression, and it is worth more
 * than a monospace domain.
 */

export function renderIntegration(
  model: PublicViewModel,
  index: RecordIndex,
): GeneratedPage {
  const rules = model.integration;

  const body: RootContent[] = [
    ...orientation(),
    ...ruleIndex(rules),
    ...(rules.length === 0
      ? [paragraph([text(literal("No cross-component rule is published."))])]
      : rules.flatMap((rule) => ruleSection(rule, index))),
    ...legendSection(rules),
    ...agentResourceSection(rules),
  ];

  return buildPage(
    "integration/index.mdx",
    {
      title: literal("Integration"),
      description: pageDescription(rules),
      // After the landing page (1), the catalog (2) and the records index (3):
      // a reader needs the parts before the relationships between them.
      sidebarPosition: 4,
    },
    body,
  );
}

/**
 * Carries the exact rule identifiers on purpose.
 *
 * The site's search index stores `title` and `description` whole but caps
 * `body` at 300 characters (`MAX_BODY_LENGTH` in zudo-doc, not configurable),
 * and matching is plain case-insensitive substring. Every rule ID on this page
 * sits far past that cut-off, so without them here a reader who has
 * `rule-rail-envelope` in hand — from a narrative page, a commit message or the
 * evidence bundle itself — could not search their way to the page that
 * publishes it. The same reasoning put the orderable ID and the placements in
 * each record page's description.
 *
 * Kept short enough to still read as a description: it is also the meta
 * description and the search-result subtitle.
 */
function pageDescription(rules: readonly PublicIntegrationRule[]): SafeText {
  if (rules.length === 0) {
    return literal("Cross-component rules. None is currently published.");
  }
  return joinSafe(
    [
      literal("Cross-component rules —"),
      joinSafe(
        rules.map((rule) => rule.ruleId),
        ", ",
      ),
      literal(
        "— with the records and facts each spans, its conditioned calculations, and what it " +
          "refuses to conclude.",
      ),
    ],
    " ",
  );
}

function orientation(): RootContent[] {
  return [
    paragraph([
      text(
        literal(
          "A component record answers questions about one part. These rules answer the ones " +
            "that span several — whether a divider built from two resistors keeps a third part " +
            "inside its own limit, whether a clamp event stays under everything downstream of " +
            "it. Each rule is projected whole from stored evidence: its conditions, the exact " +
            "facts it rests on, any conditioned arithmetic, and the exact wording of what it " +
            "refuses to conclude.",
        ),
      ),
    ]),

    heading(2, literal("How to read these rules")),
    bulletList([
      labelled(
        "The refusal is the rule.",
        "Every rule states, in its own words, what may NOT be concluded from the evidence " +
          "above it. That sentence is the rule's real output; the verdict is shorthand for it.",
      ),
      labelled(
        "A verdict belongs to the rule, not to a part.",
        "A rule's verdict says how far the cross-component question has been settled. It is " +
          "never a judgement about any of the parts the rule names, and the verdicts are never " +
          "combined into one.",
      ),
      labelled(
        "Calculations are conditioned, and the conditions are the point.",
        "Each calculation publishes its expression, its inputs and the exact results that were " +
          "recorded, together with the conditions under which the answer means anything. A " +
          "result read without them is arithmetic mistaken for a measurement.",
      ),
      labelled(
        "Numbers here were carried, not computed.",
        "The expressions are published so a reader can redo the arithmetic. This page does not " +
          "evaluate them — the results shown are the ones the evidence recorded.",
      ),
      labelled(
        "An evidence chain does not flow downhill.",
        "A stage being settled says nothing about any stage after it. A document confirming a " +
          "limit is not a measurement of the assembled board.",
      ),
    ]),
  ];
}

/**
 * The index table.
 *
 * Deliberately carries the verdict but not the refusal: a refusal runs to a
 * full sentence and putting six of them in a table column would make the column
 * unreadable, which is the one thing a refusal must never be. The column names
 * the rule and the reader arrives at the full statement one link away.
 */
function ruleIndex(rules: readonly PublicIntegrationRule[]): RootContent[] {
  const head = [
    heading(2, literal("Rules at a glance")),
    evidenceAnchor(anchor(INTEGRATION_INDEX_ANCHOR)),
  ];
  if (rules.length === 0) return head;

  return [
    ...head,
    scrollableTable(
      "rules-index",
      [
        literal("Rule"),
        literal("Domain"),
        literal("Records"),
        literal("Facts"),
        literal("Verdict"),
      ],
      rules.map((rule) => indexRow(rule)),
    ),
  ];
}

function indexRow(rule: PublicIntegrationRule): TableRow {
  return [
    [routeCodeLink(samePage(rule.anchor), rule.ruleId)],
    [text(rule.domain)],
    [text(count(rule.recordIds.length, `${rule.ruleId} records`))],
    [text(count(rule.factIds.length, `${rule.ruleId} facts`))],
    [text(rule.verdict)],
  ];
}

function ruleSection(rule: PublicIntegrationRule, index: RecordIndex): RootContent[] {
  const gloss = INTEGRATION_DOMAIN_GLOSS[rule.domain];

  const blocks: RootContent[] = [
    heading(2, rule.ruleId),
    evidenceAnchor(rule.anchor),
    ...(gloss === undefined
      ? []
      : [paragraph([strong(literal("What this rule asks:")), space(), text(literal(gloss))])]),
    bulletList([
      // `text`, not `code`: a domain is a phrase the evidence chose, not an
      // identifier. See MONOSPACE_IS_FOR_IDENTIFIERS below.
      field("Domain", [text(rule.domain)]),
      field("Verdict", [text(rule.verdict)]),
    ]),
    // Immediately after the verdict and before any evidence. A reader who takes
    // one line from this section must take this one.
    paragraph([strong(literal("This rule refuses to conclude:")), space(), text(rule.refusal)]),
    paragraph([strong(literal("Conditions:")), space(), text(rule.conditions)]),
    ...recordsBlock(rule, index),
    ...factsBlock(rule, index),
    ...calculationBlocks(rule, index),
    ...evidenceChainBlock(rule, index),
  ];

  return blocks;
}

/** The parts a rule spans, each linked to its own record page. */
function recordsBlock(rule: PublicIntegrationRule, index: RecordIndex): RootContent[] {
  if (rule.recordIds.length === 0) {
    return [
      paragraph([
        strong(literal("Records this rule spans:")),
        space(),
        text(literal("none are recorded against it.")),
      ]),
    ];
  }

  return [
    paragraph([strong(literal("Records this rule spans:"))]),
    bulletList(rule.recordIds.map((recordId) => recordReference(recordId, index))),
  ];
}

function recordReference(recordId: SafeText, index: RecordIndex): PhrasingContent[] {
  const slug = index.slugByRecordId.get(recordId);
  if (slug === undefined) {
    return [code(recordId), space(), text(literal("(not published)"))];
  }

  const reference: PhrasingContent[] = [routeCodeLink(recordRoute(slug), recordId)];
  const mpn = index.mpnByRecordId.get(recordId);
  if (mpn !== undefined) reference.push(space(), text(literal("—")), space(), text(mpn));
  return reference;
}

function factsBlock(rule: PublicIntegrationRule, index: RecordIndex): RootContent[] {
  if (rule.factIds.length === 0) {
    return [
      paragraph([
        strong(literal("Facts this rule rests on:")),
        space(),
        text(literal("none are recorded against it.")),
      ]),
    ];
  }

  return [
    paragraph([
      strong(literal("Facts this rule rests on:")),
      space(),
      text(
        literal(
          "each is published in full on the record page that owns it, at the anchor linked " +
            "here.",
        ),
      ),
    ]),
    bulletList(rule.factIds.map((factId) => factReference(index, factId, NO_CURRENT_RECORD))),
  ];
}

/**
 * The conditioned calculations, one heading each.
 *
 * A heading rather than a row because each one carries a conditions paragraph
 * that runs to several lines and is the part that keeps the number honest —
 * `calc-led-hot-branch-headroom` in particular records a negative result whose
 * conditions say precisely what it is and is not evidence of. Collapsing that
 * into a table cell would bury it.
 */
function calculationBlocks(
  rule: PublicIntegrationRule,
  index: RecordIndex,
): RootContent[] {
  if (rule.calculations.length === 0) {
    return [
      paragraph([
        strong(literal("Conditioned calculations:")),
        space(),
        text(literal("none are recorded for this rule.")),
      ]),
    ];
  }

  return [
    heading(3, literal("Conditioned calculations")),
    paragraph([
      text(
        literal(
          "Arithmetic across the facts above. The expression and every input are published so " +
            "the result can be recomputed rather than trusted, and each carries the conditions " +
            "under which it means anything at all.",
        ),
      ),
    ]),
    ...rule.calculations.flatMap((calculation) => calculationBlock(calculation, index)),
  ];
}

function calculationBlock(
  calculation: PublicRuleCalculation,
  index: RecordIndex,
): RootContent[] {
  const blocks: RootContent[] = [
    heading(4, calculation.calculationId),
    evidenceAnchor(calculation.anchor),
    bulletList([
      field("Expression", [code(calculation.expression)]),
      field("Result", [code(calculation.resultKey)]),
    ]),
    paragraph([strong(literal("Conditions:")), space(), text(calculation.conditions)]),
  ];

  if (calculation.factIds.length > 0) {
    blocks.push(
      paragraph([strong(literal("Inputs:"))]),
      bulletList(
        calculation.factIds.map((factId) => factReference(index, factId, NO_CURRENT_RECORD)),
      ),
    );
  } else {
    blocks.push(
      paragraph([
        strong(literal("Inputs:")),
        space(),
        text(literal("no input fact is recorded for this calculation.")),
      ]),
    );
  }

  blocks.push(...resultsTable(calculation));
  return blocks;
}

/**
 * The recorded results.
 *
 * Columns are the varied inputs followed by the result key, so the table reads
 * as "at this input, that answer". A calculation evaluated at no varied input
 * has one column and one row, which is the honest shape for a single number and
 * keeps every calculation presented the same way.
 */
function resultsTable(calculation: PublicRuleCalculation): RootContent[] {
  if (calculation.cases.length === 0) {
    return [paragraph([text(literal("No result is recorded for this calculation."))])];
  }

  const inputKeys = orderedInputKeys(calculation.cases);
  const header = [...inputKeys, calculation.resultKey];
  const rows = calculation.cases.map((entry) => resultRow(entry, inputKeys));

  // Only the wide ones get a scroll container. A calculation with a single
  // input is a two-column table that fits any viewport, and wrapping it would
  // add a tab stop to something that never scrolls — a focus stop that does
  // nothing is noise for a keyboard user, which is why the invariant runs both
  // ways: every table wider than two columns wrapped, and no narrow one.
  return [
    header.length > 2
      ? scrollableTable("calculation-results", header, rows)
      : table(header, rows),
  ];
}

/**
 * Every input key any case carries, in stable order.
 *
 * Taking the first case's keys would silently drop a column if the provider
 * ever records cases that vary in different parameters; the union cannot, and
 * a case missing one prints an explicit gap rather than a shifted row.
 */
function orderedInputKeys(cases: readonly PublicRuleCalculationCase[]): SafeText[] {
  return presentTerms(cases.flatMap((entry) => entry.inputs.map((input) => input.key)));
}

function resultRow(
  entry: PublicRuleCalculationCase,
  inputKeys: readonly SafeText[],
): TableRow {
  const byKey = new Map(entry.inputs.map((input) => [String(input.key), input.value]));
  const cells: PhrasingContent[][] = inputKeys.map((key) => {
    const value = byKey.get(key);
    return value === undefined
      ? [text(literal("not recorded"))]
      : [text(scalarText(value, key))];
  });
  cells.push([text(scalarText(entry.value, literal("result")))]);
  return cells;
}

/**
 * The evidence chain: how far a claim has travelled from a document to a bench.
 *
 * A table rather than a heading each, because the stages are a fixed ordered
 * sequence and the comparison down the status column IS the content — the shape
 * of this rule is that the first four stages are partly settled and the last
 * five are untouched.
 */
function evidenceChainBlock(
  rule: PublicIntegrationRule,
  index: RecordIndex,
): RootContent[] {
  if (rule.evidenceChain.length === 0) return [];

  return [
    heading(3, literal("Source-to-bench evidence chain")),
    paragraph([
      text(
        literal(
          "The stages a claim passes through, in order. A settled stage says nothing about any " +
            "stage after it: a manufacturer document confirming a limit is not an inspection of " +
            "the assembled board, and neither is a measurement. A stage with no facts against " +
            "it is not one nobody got round to filling in: nothing has been established there " +
            "yet, so the rule's conditions and its refusal above are the whole of what is known " +
            "about it.",
        ),
      ),
    ]),
    scrollableTable(
      "evidence-chain",
      [literal("Stage"), literal("Status"), literal("Facts at this stage")],
      rule.evidenceChain.map((stage) => evidenceChainRow(stage, index)),
    ),
  ];
}

function evidenceChainRow(stage: PublicRuleEvidenceStage, index: RecordIndex): TableRow {
  return [
    [text(stage.stage)],
    [text(stage.status)],
    // Five of the nine real stages are OPEN with nothing recorded against them.
    // "none recorded" reads as an unfilled cell; this says which of the two it
    // is. Same distinction the record pages draw for an open coverage domain
    // with no blocking fact, and for the same reason: nothing addresses these,
    // so the prose above the table is the only content the row has.
    stage.factIds.length === 0
      ? [text(literal("no fact is recorded at this stage"))]
      : joinCells(
          stage.factIds.map((factId) => factReference(index, factId, NO_CURRENT_RECORD)),
        ),
  ];
}

/**
 * The legend, built from the terms this page actually uses.
 *
 * Same rule as the record pages: a reader is told what the words in front of
 * them mean, and a term with no wording recorded yet still gets a row rather
 * than disappearing.
 */
function legendSection(rules: readonly PublicIntegrationRule[]): RootContent[] {
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
      title: "Rule verdict",
      terms: presentTerms(rules.map((rule) => rule.verdict)),
      gloss: VERDICT_GLOSS,
    },
    {
      title: "Domain",
      terms: presentTerms(rules.map((rule) => rule.domain)),
      gloss: INTEGRATION_DOMAIN_GLOSS,
    },
    {
      title: "Evidence stage",
      terms: presentTerms(
        rules.flatMap((rule) => rule.evidenceChain.map((stage) => stage.stage)),
      ),
      gloss: EVIDENCE_STAGE_GLOSS,
    },
    {
      title: "Evidence stage status",
      terms: presentTerms(
        rules.flatMap((rule) => rule.evidenceChain.map((stage) => stage.status)),
      ),
      gloss: EVIDENCE_STAGE_STATUS_GLOSS,
    },
  ];

  for (const group of groups) {
    if (group.terms.length === 0) continue;
    blocks.push(
      heading(3, literal(group.title)),
      table(
        [literal("Recorded term"), literal("What it means")],
        // Every term here is a phrase the evidence chose rather than an
        // identifier, so none of them is monospace — see the note above.
        group.terms.map((term) => [[text(term)], [text(glossFor(group.gloss, term))]]),
      ),
    );
  }

  return blocks;
}

/**
 * The reciprocal link back to the bundle these rules are stored in.
 *
 * The counterpart of the record pages' own link: this page is a projection, and
 * `circuit-spec-integration` is the thing it is a projection of. The owning
 * bundle comes from the model rather than from a constant here, because `core/`
 * knows no provider's directory names.
 */
function agentResourceSection(rules: readonly PublicIntegrationRule[]): RootContent[] {
  // Always empty for zudo-pd: `integration.ownerSkill` is denied (see
  // `matrix.ts`), so every rule's `ownerSkill` is `null` and this section
  // always takes the "no owning bundle identified" branch below.
  const owners = presentTerms(
    rules
      .map((rule) => rule.ownerSkill)
      .filter((ownerSkill): ownerSkill is SafeText => ownerSkill !== null),
  );

  return [
    heading(2, literal("Raw agent resource")),
    paragraph([
      text(
        literal(
          "These rules are generated from a stored evidence bundle and do not restate it. The " +
            "bundle is the source of truth: where the two ever disagree, the bundle is right " +
            "and this page is stale.",
        ),
      ),
    ]),
    owners.length === 0
      ? paragraph([
          text(
            literal(
              "No owning bundle is identified in the published model, so no reciprocal link " +
                "can be given.",
            ),
          ),
        ])
      : bulletList(
          owners.map((ownerSkill) => [
            routeLink(agentResourceRoute(ownerSkill), literal("Open the owning bundle")),
            space(),
            code(ownerSkill),
          ]),
        ),
  ];
}

// --- small shared shapes ---------------------------------------------------

/** `**Label:** value`, matching the record and catalog pages. */
function field(label: string, value: readonly PhrasingContent[]): PhrasingContent[] {
  return [strong(literal(`${label}:`)), space(), ...value];
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

/** Several inline runs in one table cell, comma-separated. */
function joinCells(runs: readonly PhrasingContent[][]): PhrasingContent[] {
  const cell: PhrasingContent[] = [];
  for (const [position, run] of runs.entries()) {
    if (position > 0) cell.push(text(literal(",")), space());
    cell.push(...run);
  }
  return cell;
}

/** A recorded number or string as published text. Numbers keep their exact form. */
function scalarText(value: number | SafeText, field: SafeText): SafeText {
  return typeof value === "number"
    ? safeText(String(value), { field: `integration ${field}` })
    : value;
}

function count(value: number, field: string): SafeText {
  return safeText(String(value), { field });
}
