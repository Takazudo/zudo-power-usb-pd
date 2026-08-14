/**
 * Cross-component integration rules: `circuit-spec-integration` to the public
 * view model.
 *
 * These are a different dataset from the per-record interactions, and the two
 * are easy to conflate. An **interaction** is recorded in an owner bundle's
 * `interactions.json`, names the records it spans, and is published on each of
 * their pages. A **rule** is recorded once in
 * `circuit-spec-integration/references/rules.json`, spans up to twelve records,
 * and carries three things an interaction does not:
 *
 *   - a `refusal` — the exact statement of what may NOT be concluded;
 *   - `conditioned_calculations` — arithmetic across several parts' facts,
 *     with the conditions under which each result is meaningful;
 *   - an `evidence_chain` — official source through to bench, stage by stage.
 *
 * The refusal is why the rules exist. Every one of the six is `UNSOURCED` or
 * `NEEDS BENCH`, and every one names something a reader could otherwise infer
 * from the numbers directly above it. So this module publishes a rule whole or
 * not at all: there is no path that drops the refusal, drops a calculation's
 * conditions, or promotes a stage's status.
 *
 * Nothing here evaluates an expression. The provider recorded both the
 * expression and its results; recomputing either would make this a second
 * calculator that can disagree with the evidence it is projecting.
 *
 * This module imports only from `core/`. `evidence.ts` reads and shape-checks
 * `rules.json` (it owns provider I/O and the schema-version gate) and imports
 * the types below type-only, so nothing here participates in a runtime cycle.
 */

import { anchor, byCodeUnit } from "../../core/ids.ts";
import { fail } from "../../core/errors.ts";
import { safeText, type SafeText } from "../../core/text.ts";
import type { PublicationPolicy } from "../../core/publication.ts";
import type {
  PublicFactValueEntry,
  PublicIntegrationRule,
  PublicRuleCalculation,
  PublicRuleCalculationCase,
  PublicRuleEvidenceStage,
} from "../../core/view-model.ts";

// --- provider shapes -------------------------------------------------------
// Narrow structural reads only, matching `evidence.ts`: these make the joins
// type-checked, they do not re-validate the frozen contract.

/**
 * One conditioned calculation.
 *
 * The index signature is load-bearing rather than lax. A calculation with no
 * varied input stores its answer under its own `result_key` as a sibling
 * property (`{"result_key": "overage_v", "overage_v": 4.4}`), so the key that
 * holds the result is data, not a fixed field name.
 */
export type ProviderRuleCalculation = {
  calculation_id: string;
  fact_ids: string[];
  expression: string;
  result_key: string;
  conditions: string;
  results?: Record<string, unknown>[];
  [key: string]: unknown;
};

export type ProviderRuleEvidenceStage = {
  stage: string;
  status: string;
  fact_ids: string[];
};

export type ProviderIntegrationRule = {
  rule_id: string;
  domain: string;
  record_ids: string[];
  fact_ids: string[];
  conditions: string;
  verdict: string;
  refusal: string;
  conditioned_calculations?: ProviderRuleCalculation[];
  evidence_chain?: ProviderRuleEvidenceStage[];
};

export type ProviderIntegrationRules = {
  schema_version: number;
  rules: ProviderIntegrationRule[];
};

/**
 * What the projection needs in order to know a rule's references will resolve.
 *
 * Deliberately two flat lookups rather than the evidence index: a rule points
 * at records and facts by ID and needs nothing else, and taking the whole index
 * would couple this module to a shape it does not read.
 */
export type IntegrationContext = {
  /** Record IDs that actually have a published page. */
  readonly publishedRecordIds: ReadonlySet<string>;
  /** Fact ID to the record ID that owns it, for every fact in the corpus. */
  readonly recordIdByFactId: ReadonlyMap<string, string>;
  /** The bundle directory the rules were read from. */
  readonly ownerSkill: string;
};

// --- projection ------------------------------------------------------------

/**
 * Project every rule, in file order.
 *
 * File order is the order the integration bundle curates: the rail envelope
 * first, the evidence chain last. Re-sorting would throw that away for an
 * alphabetical ordering that means nothing.
 */
export function projectIntegrationRules(
  rules: readonly ProviderIntegrationRule[],
  context: IntegrationContext,
  policy: PublicationPolicy,
): PublicIntegrationRule[] {
  assertRuleReferencesResolve(rules, context);
  return rules.map((rule) => projectRule(rule, context.ownerSkill, policy));
}

function projectRule(
  rule: ProviderIntegrationRule,
  ownerSkill: string,
  policy: PublicationPolicy,
): PublicIntegrationRule {
  const at = (field: string): string => `${rule.rule_id}.${field}`;

  return {
    ruleId: policy.publishRequired(
      "integration.ruleId",
      safeText(rule.rule_id, { field: at("rule_id") }),
    ),
    anchor: anchor(rule.rule_id),
    // `integration.ownerSkill` is denied for zudo-pd (see `matrix.ts`):
    // `claudeResources` is `false`, so `/docs/claude-skills/<name>/` does not
    // exist as a route to link back to. `publish()`, not `publishRequired()` —
    // the field is DENY, so this always resolves to `null`.
    ownerSkill: policy.publish("integration.ownerSkill", safeText(ownerSkill, { field: at("owner_skill") })) ?? null,
    domain: policy.publishRequired(
      "integration.domain",
      safeText(rule.domain, { field: at("domain") }),
    ),
    recordIds: policy.publishRequired(
      "integration.recordIds",
      rule.record_ids.map((id) => safeText(id, { field: at("record_ids") })),
    ),
    factIds: policy.publishRequired(
      "integration.factIds",
      rule.fact_ids.map((id) => safeText(id, { field: at("fact_ids") })),
    ),
    conditions: policy.publishRequired(
      "integration.conditions",
      safeText(rule.conditions, { field: at("conditions") }),
    ),
    verdict: policy.publishRequired(
      "integration.verdict",
      safeText(rule.verdict, { field: at("verdict") }),
    ),
    // Required, not optional. A rule whose refusal could not be published would
    // put its conditions, its arithmetic and its verdict on a page with nothing
    // stating what none of that proves.
    refusal: policy.publishRequired(
      "integration.refusal",
      safeText(rule.refusal, { field: at("refusal") }),
    ),
    calculations: (rule.conditioned_calculations ?? []).map((calculation) =>
      projectCalculation(calculation, rule.rule_id, policy),
    ),
    evidenceChain: (rule.evidence_chain ?? []).map((stage) =>
      projectEvidenceStage(stage, rule.rule_id, policy),
    ),
  };
}

function projectCalculation(
  calculation: ProviderRuleCalculation,
  ruleId: string,
  policy: PublicationPolicy,
): PublicRuleCalculation {
  const at = (field: string): string => `${ruleId}.${calculation.calculation_id}.${field}`;

  return {
    calculationId: policy.publishRequired(
      "integration.calculationId",
      safeText(calculation.calculation_id, { field: at("calculation_id") }),
    ),
    anchor: anchor(calculation.calculation_id),
    factIds: policy.publishRequired(
      "integration.calculationFactIds",
      calculation.fact_ids.map((id) => safeText(id, { field: at("fact_ids") })),
    ),
    expression: policy.publishRequired(
      "integration.calculationExpression",
      safeText(calculation.expression, { field: at("expression") }),
    ),
    resultKey: policy.publishRequired(
      "integration.calculationResultKey",
      safeText(calculation.result_key, { field: at("result_key") }),
    ),
    // Never optional: every conditions string in this corpus states what its
    // number is not proof of, and the number alone reads as a measurement.
    conditions: policy.publishRequired(
      "integration.calculationConditions",
      safeText(calculation.conditions, { field: at("conditions") }),
    ),
    cases: policy.publishRequired(
      "integration.calculationResults",
      projectCases(calculation, ruleId),
    ),
  };
}

/**
 * Normalise the provider's two recorded forms into one list of cases.
 *
 * `results: [{vbus_v: 15, vgs_v: -6.0}, …]` is a calculation evaluated at
 * several inputs; a bare `{result_key: "overage_v", overage_v: 4.4}` is the
 * same thing evaluated at none. Both become cases, so the renderer has one
 * shape and neither form is the special case that gets less scrutiny.
 */
function projectCases(
  calculation: ProviderRuleCalculation,
  ruleId: string,
): PublicRuleCalculationCase[] {
  const { calculation_id: calculationId, result_key: resultKey } = calculation;
  const detail = { ruleId, calculationId, resultKey };

  if (Array.isArray(calculation.results)) {
    if (calculation.results.length === 0) {
      fail("ADAPTER_CONTRACT", "conditioned calculation records an empty results list", detail);
    }
    return calculation.results.map((row) => {
      // `Object.hasOwn`, not `in`: `in` walks the prototype chain, so a
      // `result_key` of `constructor` or `toString` would appear to be present
      // and the "result" would be an inherited function.
      if (!Object.hasOwn(row, resultKey)) {
        fail("ADAPTER_CONTRACT", "conditioned calculation result row has no result key", detail);
      }
      return {
        inputs: Object.keys(row)
          .filter((key) => key !== resultKey)
          .sort(byCodeUnit)
          .map((key) => entry(key, row[key], calculationId)),
        value: scalar(row[resultKey], `${calculationId}.${resultKey}`),
      };
    });
  }

  if (!Object.hasOwn(calculation, resultKey)) {
    fail("ADAPTER_CONTRACT", "conditioned calculation records neither results nor a result", detail);
  }
  return [
    { inputs: [], value: scalar(calculation[resultKey], `${calculationId}.${resultKey}`) },
  ];
}

function projectEvidenceStage(
  stage: ProviderRuleEvidenceStage,
  ruleId: string,
  policy: PublicationPolicy,
): PublicRuleEvidenceStage {
  const at = (field: string): string => `${ruleId}.${stage.stage}.${field}`;

  return {
    stage: policy.publishRequired(
      "integration.evidenceChainStage",
      safeText(stage.stage, { field: at("stage") }),
    ),
    status: policy.publishRequired(
      "integration.evidenceChainStatus",
      safeText(stage.status, { field: at("status") }),
    ),
    // Legitimately empty on an OPEN stage: nothing has been recorded for it
    // yet, which is the whole point of the stage being listed.
    factIds: policy.publishRequired(
      "integration.evidenceChainFactIds",
      stage.fact_ids.map((id) => safeText(id, { field: at("fact_ids") })),
    ),
  };
}

function entry(key: string, value: unknown, calculationId: string): PublicFactValueEntry {
  return {
    key: safeText(key, { field: `${calculationId}.input key` }),
    value: scalar(value, `${calculationId}.${key}`),
  };
}

/**
 * A recorded number or string, kept in its JSON shape.
 *
 * A number stays a number so `-0.96` renders as `-0.96` rather than as a
 * re-typed string, and there is no third shape to guess a rendering for.
 */
function scalar(value: unknown, field: string): number | SafeText {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      fail("ADAPTER_CONTRACT", "conditioned calculation value is not a finite number", { field });
    }
    return value;
  }
  if (typeof value === "string") return safeText(value, { field });

  fail("ADAPTER_CONTRACT", "conditioned calculation value has an unsupported JSON shape", {
    field,
    shape: value === null ? "null" : Array.isArray(value) ? "array" : typeof value,
  });
}

// --- reference closure -----------------------------------------------------

/**
 * Every ID a published rule names must land on a published page.
 *
 * Same rule as the rest of the selection (`assertSelectionIsClosed`): dropping
 * the reference instead would leave the page with an unexplained gap in a
 * cross-component argument, and rendering it anyway would emit a dead link.
 * Rules reference by record and by fact, and a fact reference is only good if
 * the record that owns it is published too — the anchor lives on that page.
 */
function assertRuleReferencesResolve(
  rules: readonly ProviderIntegrationRule[],
  context: IntegrationContext,
): void {
  const danglingRecords: string[] = [];
  const danglingFacts: string[] = [];

  const checkFact = (ruleId: string, factId: string): void => {
    const ownerRecordId = context.recordIdByFactId.get(factId);
    if (ownerRecordId === undefined || !context.publishedRecordIds.has(ownerRecordId)) {
      danglingFacts.push(`${ruleId}:${factId}`);
    }
  };

  for (const rule of rules) {
    for (const recordId of rule.record_ids) {
      if (!context.publishedRecordIds.has(recordId)) {
        danglingRecords.push(`${rule.rule_id}:${recordId}`);
      }
    }
    for (const factId of rule.fact_ids) checkFact(rule.rule_id, factId);
    for (const calculation of rule.conditioned_calculations ?? []) {
      for (const factId of calculation.fact_ids) {
        checkFact(`${rule.rule_id}.${calculation.calculation_id}`, factId);
      }
    }
    for (const stage of rule.evidence_chain ?? []) {
      for (const factId of stage.fact_ids) checkFact(`${rule.rule_id}.${stage.stage}`, factId);
    }
  }

  if (danglingRecords.length > 0) {
    fail("STALE_SELECTION", "an integration rule names a record that is not published", {
      references: [...new Set(danglingRecords)].sort(byCodeUnit),
    });
  }
  if (danglingFacts.length > 0) {
    fail("STALE_SELECTION", "an integration rule names a fact that is not published", {
      references: [...new Set(danglingFacts)].sort(byCodeUnit),
    });
  }
}
