/**
 * Reading the `.claude/skills/**` bundles and joining them into one index.
 *
 * Two responsibilities, deliberately separated so the joins are testable
 * without a filesystem: `readBundle` does I/O, `parseBundle` and
 * `indexEvidence` are pure functions over already-parsed JSON.
 *
 * ## What this module checks, and what it refuses to check
 *
 * The Python validator owns the frozen evidence contract, and the architecture
 * forbids restating it here — a weaker second validator that disagreed with the
 * first would be worse than none. So this module asserts only what the
 * PROJECTION needs in order to be sound:
 *
 *   - the declared `schema_version` of every file it reads;
 *   - globally unique IDs (anchors are provider IDs verbatim, so a duplicate
 *     would collide two deep links onto one fragment);
 *   - every referenced ID resolves (a dangling reference becomes a dead link
 *     on a published page);
 *   - every entity is owned by exactly one record, and every record's manifest
 *     agrees with the entity's own `record_id` in both directions (an orphan
 *     would be silently dropped from the corpus rather than published);
 *   - the calculated-fact dependency graph is acyclic, so a renderer can walk
 *     `dependsOn` without a guard.
 *
 * It does NOT re-derive contract semantics: whether a COVERED domain has
 * trusted evidence, whether a PASS verdict is earned, whether `blocking_fact_ids`
 * names the right facts. Those are the validator's, and it has already run.
 */

import { join } from "node:path";

import { byCodeUnit } from "../../core/ids.ts";
import { fail } from "../../core/errors.ts";
import { BUNDLE_FILES, SKILLS_ROOT, type BundleFile } from "./paths.ts";
import { readProviderJson } from "./read.ts";
// Type-only, so it is erased at run time: `integration.ts` imports nothing from
// here, and the two modules never form a runtime cycle.
import type {
  ProviderIntegrationRule,
  ProviderIntegrationRules,
} from "./integration.ts";

/** The only provider schema version this adapter knows how to read. */
export const PROVIDER_SCHEMA_VERSION = 1;

// --- provider shapes -------------------------------------------------------
// Narrow structural reads only. These types exist to make the joins
// type-checked, not to re-validate the data.

/**
 * `dnp` lives per PLACEMENT, not per line: `component-spec-audit`'s own
 * contract ("DNP is per placement... the same orderable is DNP at one
 * refdes and fitted at another") means a single line can be DNP at one
 * position and fitted at another (e.g. `line-c23186`: R17/R18 are DNP,
 * board-b's R3 is fitted). led-lamp's inventory schema has no such per-line
 * ambiguity and carries a line-level `dnp` flag that zudo-pd's `inventory.json`
 * does not — see `buildIdentity()` in `index.ts`, which derives
 * `PublicRecordIdentity.dnp` from these instead.
 */
export type InventoryLine = {
  line_id: string;
  mpn: string;
  manufacturer: string;
  lcsc: string;
  package: string;
  owner_skill: string;
  identity_state: string;
  source_state: string;
  function: string;
  placements: { board: string; refdes: string; dnp: boolean }[];
};

export type Inventory = {
  schema_version: number;
  assertions: { orderable_lines: number; fitted_lines: number; dnp_or_hand_fit_lines: number };
  lines: InventoryLine[];
};

export type ProviderRecord = {
  record_id: string;
  line_id: string;
  kind: "standalone" | "subordinate";
  parent_record_id: string | null;
  source_ids: string[];
  fact_ids: string[];
  interaction_ids: string[];
  open_domains: string[];
};

export type ProviderSource = {
  source_id: string;
  record_id: string;
  document_title: string;
  document_number: string;
  revision: string;
  document_date: string;
  authoritative_url: string;
  retrieval_date: string;
  authority_class: string;
  availability: string;
  printed_page_label: string;
  locator: string;
};

/** `value` stays `unknown`: its JSON shape is the thing being preserved. */
export type ProviderFact = {
  fact_id: string;
  record_id: string;
  source_id: string;
  class: string;
  value: unknown;
  unit: string;
  conditions: string;
  locator: string;
  provenance: string;
  verdict: string;
  depends_on: string[];
  expression: string;
};

export type ProviderCoverage = {
  coverage_id: string;
  record_id: string;
  domain: string;
  status: string;
  reason: string;
  fact_ids: string[];
  blocking_fact_ids: string[];
};

export type ProviderInteraction = {
  interaction_id: string;
  record_ids: string[];
  fact_ids: string[];
  conditions: string;
  verdict: string;
};

export type ProviderPin = {
  symbol_pin: string;
  name: string;
  footprint_pad: string;
  function: string;
};

export type ProviderPinMap = {
  pin_map_id: string;
  record_id: string;
  symbol: string;
  footprint: string;
  pins: ProviderPin[];
};

export type ProviderRoute = {
  route_id: string;
  record_id: string;
  aliases: { mpn: string[]; lcsc: string[]; manufacturer: string[]; function: string[] };
};

/** One owner skill's seven files, parsed and version-checked. */
export type ProviderBundle = {
  readonly skill: string;
  readonly records: readonly ProviderRecord[];
  readonly sources: readonly ProviderSource[];
  readonly facts: readonly ProviderFact[];
  readonly coverage: readonly ProviderCoverage[];
  readonly routes: readonly ProviderRoute[];
  readonly interactions: readonly ProviderInteraction[];
  readonly pinMaps: readonly ProviderPinMap[];
};

/** One record with every entity that belongs to it already attached. */
export type IndexedRecord = {
  /** The owner skill that holds this record's bundle. */
  readonly skill: string;
  readonly record: ProviderRecord;
  readonly line: InventoryLine;
  /** Manifest order — curated, primary source first. */
  readonly sources: readonly ProviderSource[];
  /** Manifest order. */
  readonly facts: readonly ProviderFact[];
  /** File order. */
  readonly coverage: readonly ProviderCoverage[];
  /** Manifest order; resolve through `interactionById`. */
  readonly interactionIds: readonly string[];
  /** File order. A record may legitimately have more than one. */
  readonly pinMaps: readonly ProviderPinMap[];
  readonly route: ProviderRoute;
};

export type EvidenceIndex = {
  // zudo-pd has no 3D assets and does not port `references.ts` / the
  // footprint-preview feature, so there is no `references` field here at
  // all (led-lamp's optional `references?: CircuitReferenceContract`).
  readonly inventory: Inventory;
  readonly ownerSkills: readonly string[];
  /**
   * The cross-component rules, in file order.
   *
   * They live in their own skill rather than in an owner bundle, so they hang
   * off the index rather than off a record: one rule spans up to twelve records
   * and belongs to none of them.
   */
  readonly integrationRules: readonly ProviderIntegrationRule[];
  /** Every record the provider has, in bundle order. */
  readonly records: readonly IndexedRecord[];
  readonly recordById: ReadonlyMap<string, IndexedRecord>;
  readonly factById: ReadonlyMap<string, ProviderFact>;
  readonly interactionById: ReadonlyMap<string, ProviderInteraction>;
  /** Corpus totals, counted from what was actually read. */
  readonly totals: {
    readonly sources: number;
    readonly facts: number;
    readonly coverage: number;
    readonly interactions: number;
    readonly routes: number;
    readonly pinMaps: number;
    readonly pins: number;
  };
  /** Every source ID the provider has, in bundle order. */
  readonly sourceIds: readonly string[];
};

// --- reading ---------------------------------------------------------------

/** Relative label for the inventory, used in failure messages. */
const INVENTORY_LABEL = "component-spec-audit/references/inventory.json";

export async function readInventory(path: string): Promise<Inventory> {
  const raw = await readProviderJson(path);
  expectArray(raw, INVENTORY_LABEL, "lines");
  if (!isObject(asObject(raw)?.assertions)) {
    fail("ADAPTER_CONTRACT", "inventory has no assertions block", { file: INVENTORY_LABEL });
  }
  // The version itself is checked in `indexEvidence`, where it is testable
  // without a filesystem.
  return raw as Inventory;
}

/** Relative label for the integration rules, used in failure messages. */
const INTEGRATION_RULES_LABEL = "circuit-spec-integration/references/rules.json";

export async function readIntegrationRules(path: string): Promise<ProviderIntegrationRules> {
  return parseIntegrationRules(await readProviderJson(path));
}

/**
 * Version-check and shape-check the integration ruleset. Pure, like
 * `parseBundle`, so every failure case is constructed from a plain object.
 *
 * Rule and calculation IDs must be unique because both become HTML `id`s on the
 * integration route, so a duplicate would send two deep links to one target.
 *
 * The reference lists are checked more closely here than a bundle's are, for
 * one reason: `rules.json` is the only provider file `validate.py` does not
 * cover — the Python side owns the component-spec contract, and the forward
 * tests exercise routing rather than shape. A missing array would otherwise
 * surface as a `TypeError` from a `.map` deep in the projection instead of a
 * fail-closed error naming the rule, and a record listed twice inside one rule
 * would render twice on the page and twice again on that record's own page.
 */
export function parseIntegrationRules(raw: unknown): ProviderIntegrationRules {
  assertSchemaVersion(raw, INTEGRATION_RULES_LABEL);
  const rules = expectArray(raw, INTEGRATION_RULES_LABEL, "rules") as ProviderIntegrationRule[];

  uniqueById("integration rule", rules, (rule) => rule.rule_id, (rule) => rule);
  uniqueById(
    "conditioned calculation",
    rules.flatMap((rule) => rule.conditioned_calculations ?? []),
    (calculation) => calculation.calculation_id,
    (calculation) => calculation,
  );

  for (const rule of rules) {
    const at = `${INTEGRATION_RULES_LABEL}:${rule.rule_id}`;
    assertDistinctIds(rule.record_ids, `${at}.record_ids`);
    assertDistinctIds(rule.fact_ids, `${at}.fact_ids`);
    assertOptionalArray(rule.conditioned_calculations, `${at}.conditioned_calculations`);
    assertOptionalArray(rule.evidence_chain, `${at}.evidence_chain`);
    for (const calculation of rule.conditioned_calculations ?? []) {
      assertDistinctIds(calculation.fact_ids, `${at}.${calculation.calculation_id}.fact_ids`);
    }
    for (const stage of rule.evidence_chain ?? []) {
      assertDistinctIds(stage.fact_ids, `${at}.${stage.stage}.fact_ids`);
    }
  }

  return { schema_version: PROVIDER_SCHEMA_VERSION, rules };
}

/** An ID list that is present, an array, and free of repeats. */
function assertDistinctIds(value: unknown, where: string): void {
  if (!Array.isArray(value)) {
    fail("ADAPTER_CONTRACT", "integration rule field is not an id array", { where });
  }
  const duplicates = value.filter((id, position) => value.indexOf(id) !== position);
  if (duplicates.length > 0) {
    fail("ADAPTER_CONTRACT", "integration rule lists the same id twice", {
      where,
      ids: [...new Set(duplicates.map(String))].sort(byCodeUnit),
    });
  }
}

function assertOptionalArray(value: unknown, where: string): void {
  if (value !== undefined && !Array.isArray(value)) {
    fail("ADAPTER_CONTRACT", "integration rule field is present but not an array", { where });
  }
}

export async function readBundle(skill: string): Promise<ProviderBundle> {
  const dir = join(SKILLS_ROOT, skill);
  // Read by name, not by position: a tuple destructure of BUNDLE_FILES would
  // silently misalign if that list is ever reordered.
  const entries = await Promise.all(
    BUNDLE_FILES.map(async (file) => [file, await readProviderJson(join(dir, file))] as const),
  );
  const files = Object.fromEntries(entries) as Readonly<Record<BundleFile, unknown>>;
  return parseBundle(skill, files);
}

/**
 * Version-check and shape-check one bundle. Pure — every failure case in the
 * test suite is constructed by handing this plain objects.
 */
export function parseBundle(
  skill: string,
  files: Readonly<Record<BundleFile, unknown>>,
): ProviderBundle {
  const at = (file: BundleFile): string => `${skill}/${file}`;
  for (const file of BUNDLE_FILES) {
    assertSchemaVersion(files[file], at(file));
  }

  const rawRecords = expectArray(files["manifest.json"], at("manifest.json"), "records");

  // zudo-pd's `component-spec-audit` bundles may carry REPLACEMENT CANDIDATE
  // records — research for a part no board places yet, recorded with
  // `line_id: null` and a `candidate_id` in place of an inventory line (see
  // `component-spec-audit` SKILL.md, "Replacement candidates"). led-lamp's
  // schema has no such concept and this join treats every record as
  // resolving to exactly one inventory line, so candidates are excluded here
  // — along with every entity a candidate owns — before they ever reach
  // `indexEvidence`'s join. A candidate is instance-editorial research for
  // future BOM decisions, never part of the corpus this generator projects.
  const candidateRecordIds = new Set(
    rawRecords
      .filter(isObject)
      .filter((record) => record.line_id === null || record.line_id === undefined)
      .map((record) => record.record_id)
      .filter((id): id is string => typeof id === "string"),
  );
  const excludeCandidateRecords = <T extends { record_id: string }>(entities: readonly T[]): T[] =>
    entities.filter((entity) => !candidateRecordIds.has(entity.record_id));

  return {
    skill,
    records: rawRecords.filter(
      (record) => isObject(record) && !candidateRecordIds.has(record.record_id as string),
    ) as ProviderRecord[],
    sources: excludeCandidateRecords(
      expectArray(files["sources.json"], at("sources.json"), "sources") as ProviderSource[],
    ),
    facts: excludeCandidateRecords(
      expectArray(files["facts.json"], at("facts.json"), "facts") as ProviderFact[],
    ),
    coverage: excludeCandidateRecords(
      expectArray(files["coverage.json"], at("coverage.json"), "coverage") as ProviderCoverage[],
    ),
    routes: excludeCandidateRecords(
      expectArray(files["routing.json"], at("routing.json"), "routes") as ProviderRoute[],
    ),
    // No candidate names an interaction today (a candidate is not fitted to
    // any board yet, so it participates in no cross-record behaviour), but
    // filtered defensively for the same reason as the other entity lists: an
    // interaction naming an excluded record would otherwise fail
    // `assertInteractionLinks` with a confusing "unknown record" error rather
    // than the honest "this names a candidate" shape.
    interactions: (
      expectArray(
        files["interactions.json"],
        at("interactions.json"),
        "interactions",
      ) as ProviderInteraction[]
    ).filter(
      (interaction) => !interaction.record_ids.some((id) => candidateRecordIds.has(id)),
    ),
    pinMaps: excludeCandidateRecords(
      expectArray(files["pin-map.json"], at("pin-map.json"), "pin_maps") as ProviderPinMap[],
    ),
  };
}

// --- joining ---------------------------------------------------------------

/**
 * Join the inventory and every bundle into one index, failing on any
 * relationship the projection could not render honestly.
 */
export function indexEvidence(
  inventory: Inventory,
  bundles: readonly ProviderBundle[],
  integrationRules: readonly ProviderIntegrationRule[],
): EvidenceIndex {
  if (inventory.schema_version !== PROVIDER_SCHEMA_VERSION) {
    fail("ADAPTER_CONTRACT", "inventory schema_version is not the contract this adapter reads", {
      expected: PROVIDER_SCHEMA_VERSION,
      actual: inventory.schema_version,
    });
  }

  const lineById = uniqueById(
    "inventory line",
    inventory.lines,
    (line) => line.line_id,
    (line) => line,
  );
  const recordEntries = collect(bundles, (bundle) => bundle.records);
  const recordOwner = uniqueById(
    "record",
    recordEntries,
    (entry) => entry.value.record_id,
    (entry) => entry.skill,
  );

  const sources = indexOwned("source", bundles, (b) => b.sources, (s) => s.source_id, recordOwner);
  const facts = indexOwned("fact", bundles, (b) => b.facts, (f) => f.fact_id, recordOwner);
  const coverage = indexOwned(
    "coverage domain",
    bundles,
    (b) => b.coverage,
    (c) => c.coverage_id,
    recordOwner,
  );
  const pinMaps = indexOwned("pin map", bundles, (b) => b.pinMaps, (p) => p.pin_map_id, recordOwner);
  const routes = indexOwned("route", bundles, (b) => b.routes, (r) => r.route_id, recordOwner);
  const interactions = collect(bundles, (bundle) => bundle.interactions);
  const interactionById = uniqueById(
    "interaction",
    interactions,
    (entry) => entry.value.interaction_id,
    (entry) => entry.value,
  );

  const records: IndexedRecord[] = [];
  for (const { skill, value: record } of recordEntries) {
    const line = lineById.get(record.line_id);
    if (line === undefined) {
      fail("ADAPTER_CONTRACT", "record references an unknown inventory line", {
        recordId: record.record_id,
        lineId: record.line_id,
      });
    }
    if (line.owner_skill !== skill) {
      fail("ADAPTER_CONTRACT", "record is held by a skill the inventory does not assign it to", {
        recordId: record.record_id,
        holder: skill,
        ownerSkill: line.owner_skill,
      });
    }

    const recordRoutes = routes.byRecord.get(record.record_id) ?? [];
    if (recordRoutes.length !== 1) {
      fail("ADAPTER_CONTRACT", "record does not have exactly one routing entry", {
        recordId: record.record_id,
        routes: recordRoutes.length,
      });
    }

    records.push({
      skill,
      record,
      line,
      sources: resolveAll("source", record.record_id, record.source_ids, sources.byId),
      facts: resolveAll("fact", record.record_id, record.fact_ids, facts.byId),
      coverage: coverage.byRecord.get(record.record_id) ?? [],
      interactionIds: record.interaction_ids,
      pinMaps: pinMaps.byRecord.get(record.record_id) ?? [],
      route: recordRoutes[0],
    });
  }

  const recordById = new Map(records.map((entry) => [entry.record.record_id, entry]));

  assertManifestListsEveryEntity(
    "source",
    sources,
    (source) => source.source_id,
    recordById,
    (entry) => entry.record.source_ids,
  );
  assertManifestListsEveryEntity(
    "fact",
    facts,
    (fact) => fact.fact_id,
    recordById,
    (entry) => entry.record.fact_ids,
  );

  assertParents(records, recordById);
  assertFactSources(facts.byId, sources.byId);
  assertCoverageFactsResolve(coverage.byId, facts.byId);
  assertInteractionLinks(interactionById, recordById, facts.byId);
  assertDependenciesResolve(facts.byId);
  assertDependenciesAcyclic(facts.byId);

  return {
    inventory,
    ownerSkills: bundles.map((bundle) => bundle.skill),
    integrationRules,
    records,
    recordById,
    factById: facts.byId,
    interactionById,
    totals: {
      sources: sources.all.length,
      facts: facts.all.length,
      coverage: coverage.all.length,
      interactions: interactionById.size,
      routes: routes.all.length,
      pinMaps: pinMaps.all.length,
      pins: pinMaps.all.reduce((sum, map) => sum + map.pins.length, 0),
    },
    sourceIds: sources.all.map((source) => source.source_id),
  };
}

// --- relationship assertions ----------------------------------------------

function assertParents(
  records: readonly IndexedRecord[],
  recordById: ReadonlyMap<string, IndexedRecord>,
): void {
  const orphans: string[] = [];
  const missing: string[] = [];
  const misparented: string[] = [];

  for (const entry of records) {
    const { record } = entry;
    if (record.kind === "subordinate") {
      if (record.parent_record_id === null) {
        orphans.push(record.record_id);
        continue;
      }
      const parent = recordById.get(record.parent_record_id);
      if (parent === undefined) {
        missing.push(record.record_id);
      } else if (parent.record.kind !== "standalone") {
        // A chain of subordinates would make "parent, then its subordinates"
        // ordering ambiguous, and the page hierarchy is only two levels deep.
        misparented.push(record.record_id);
      }
    } else if (record.parent_record_id !== null) {
      misparented.push(record.record_id);
    }
  }

  if (orphans.length > 0) {
    fail("ADAPTER_CONTRACT", "subordinate record has no parent_record_id", {
      recordIds: orphans.sort(byCodeUnit),
    });
  }
  if (missing.length > 0) {
    fail("ADAPTER_CONTRACT", "record names a parent the provider does not have", {
      recordIds: missing.sort(byCodeUnit),
    });
  }
  if (misparented.length > 0) {
    fail("ADAPTER_CONTRACT", "record kind and parent_record_id disagree", {
      recordIds: misparented.sort(byCodeUnit),
    });
  }
}

function assertFactSources(
  factById: ReadonlyMap<string, ProviderFact>,
  sourceById: ReadonlyMap<string, ProviderSource>,
): void {
  const unresolved: string[] = [];
  const foreign: string[] = [];
  for (const fact of factById.values()) {
    const source = sourceById.get(fact.source_id);
    if (source === undefined) {
      unresolved.push(fact.fact_id);
    } else if (source.record_id !== fact.record_id) {
      // Provenance has to stay on the page the fact is published on; a fact
      // citing another record's source would render a link to nowhere.
      foreign.push(fact.fact_id);
    }
  }
  if (unresolved.length > 0) {
    fail("ADAPTER_CONTRACT", "fact cites a source the provider does not have", {
      factIds: unresolved.sort(byCodeUnit),
    });
  }
  if (foreign.length > 0) {
    fail("ADAPTER_CONTRACT", "fact cites a source owned by another record", {
      factIds: foreign.sort(byCodeUnit),
    });
  }
}

function assertCoverageFactsResolve(
  coverageById: ReadonlyMap<string, ProviderCoverage>,
  factById: ReadonlyMap<string, ProviderFact>,
): void {
  const unresolved: string[] = [];
  for (const entry of coverageById.values()) {
    for (const factId of [...entry.fact_ids, ...entry.blocking_fact_ids]) {
      if (!factById.has(factId)) unresolved.push(`${entry.coverage_id}:${factId}`);
    }
  }
  if (unresolved.length > 0) {
    fail("ADAPTER_CONTRACT", "coverage domain names a fact the provider does not have", {
      references: unresolved.sort(byCodeUnit),
    });
  }
}

/**
 * An interaction states its participants; every record's manifest states its
 * interactions. Both are published, so a disagreement would put two different
 * answers on two different pages.
 */
function assertInteractionLinks(
  interactionById: ReadonlyMap<string, ProviderInteraction>,
  recordById: ReadonlyMap<string, IndexedRecord>,
  factById: ReadonlyMap<string, ProviderFact>,
): void {
  const unresolvedRecords: string[] = [];
  const unresolvedFacts: string[] = [];
  const expected = new Map<string, Set<string>>();

  for (const interaction of interactionById.values()) {
    if (interaction.record_ids.length === 0) {
      fail("ADAPTER_CONTRACT", "interaction names no records", {
        interactionId: interaction.interaction_id,
      });
    }
    for (const recordId of interaction.record_ids) {
      if (!recordById.has(recordId)) {
        unresolvedRecords.push(`${interaction.interaction_id}:${recordId}`);
        continue;
      }
      const bucket = expected.get(recordId) ?? new Set<string>();
      bucket.add(interaction.interaction_id);
      expected.set(recordId, bucket);
    }
    for (const factId of interaction.fact_ids) {
      if (!factById.has(factId)) {
        unresolvedFacts.push(`${interaction.interaction_id}:${factId}`);
      }
    }
  }

  if (unresolvedRecords.length > 0) {
    fail("ADAPTER_CONTRACT", "interaction names a record the provider does not have", {
      references: unresolvedRecords.sort(byCodeUnit),
    });
  }
  if (unresolvedFacts.length > 0) {
    fail("ADAPTER_CONTRACT", "interaction names a fact the provider does not have", {
      references: unresolvedFacts.sort(byCodeUnit),
    });
  }

  const disagreements: string[] = [];
  for (const entry of recordById.values()) {
    const declared = new Set(entry.record.interaction_ids);
    const actual = expected.get(entry.record.record_id) ?? new Set<string>();
    for (const id of declared) if (!actual.has(id)) disagreements.push(`${entry.record.record_id}:${id}`);
    for (const id of actual) if (!declared.has(id)) disagreements.push(`${entry.record.record_id}:${id}`);
  }
  if (disagreements.length > 0) {
    fail("ADAPTER_CONTRACT", "manifest interaction_ids disagree with the interactions themselves", {
      references: [...new Set(disagreements)].sort(byCodeUnit),
    });
  }
}

function assertDependenciesResolve(factById: ReadonlyMap<string, ProviderFact>): void {
  const unresolved: string[] = [];
  for (const fact of factById.values()) {
    for (const dependency of fact.depends_on) {
      if (!factById.has(dependency)) unresolved.push(`${fact.fact_id}:${dependency}`);
    }
  }
  if (unresolved.length > 0) {
    fail("ADAPTER_CONTRACT", "calculated fact depends on a fact the provider does not have", {
      references: unresolved.sort(byCodeUnit),
    });
  }
}

/**
 * A dependency cycle would make a renderer that walks `dependsOn` recurse
 * forever. Depth-first with an explicit stack; the failure names the cycle so
 * the evidence owner can see which edge to cut.
 */
function assertDependenciesAcyclic(factById: ReadonlyMap<string, ProviderFact>): void {
  const settled = new Set<string>();
  const onStack = new Set<string>();

  const visit = (start: string): void => {
    const stack: { id: string; next: number }[] = [{ id: start, next: 0 }];
    onStack.add(start);

    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const dependencies = factById.get(frame.id)?.depends_on ?? [];

      if (frame.next >= dependencies.length) {
        onStack.delete(frame.id);
        settled.add(frame.id);
        stack.pop();
        continue;
      }

      const dependency = dependencies[frame.next];
      frame.next += 1;
      if (settled.has(dependency)) continue;
      if (onStack.has(dependency)) {
        const cycle = stack.map((entry) => entry.id);
        fail("ADAPTER_CONTRACT", "calculated fact dependencies form a cycle", {
          cycle: [...cycle.slice(cycle.indexOf(dependency)), dependency],
        });
      }
      onStack.add(dependency);
      stack.push({ id: dependency, next: 0 });
    }
  };

  // Sorted so the reported cycle is the same one on every machine.
  for (const factId of [...factById.keys()].sort(byCodeUnit)) {
    if (!settled.has(factId)) visit(factId);
  }
}

// --- indexing helpers ------------------------------------------------------

type OwnedEntity = { record_id: string };

type OwnedIndex<T> = {
  readonly all: readonly T[];
  readonly byId: ReadonlyMap<string, T>;
  readonly byRecord: ReadonlyMap<string, T[]>;
};

type BundleEntry<T> = { readonly skill: string; readonly value: T };

function collect<T>(
  bundles: readonly ProviderBundle[],
  pick: (bundle: ProviderBundle) => readonly T[],
): BundleEntry<T>[] {
  return bundles.flatMap((bundle) =>
    pick(bundle).map((value) => ({ skill: bundle.skill, value })),
  );
}

/**
 * Index one entity kind by ID and by owning record, refusing a duplicate ID,
 * an entity whose record does not exist, and an entity held by a bundle that
 * does not own its record.
 */
function indexOwned<T extends OwnedEntity>(
  kind: string,
  bundles: readonly ProviderBundle[],
  pick: (bundle: ProviderBundle) => readonly T[],
  idOf: (value: T) => string,
  recordOwner: ReadonlyMap<string, string>,
): OwnedIndex<T> {
  const entries = collect(bundles, pick);
  const byId = uniqueById(kind, entries, (entry) => idOf(entry.value), (entry) => entry.value);

  const unknownRecord: string[] = [];
  const misplaced: string[] = [];
  const byRecord = new Map<string, T[]>();
  for (const { skill, value } of entries) {
    const owner = recordOwner.get(value.record_id);
    if (owner === undefined) {
      unknownRecord.push(idOf(value));
      continue;
    }
    if (owner !== skill) {
      misplaced.push(idOf(value));
      continue;
    }
    const bucket = byRecord.get(value.record_id) ?? [];
    bucket.push(value);
    byRecord.set(value.record_id, bucket);
  }
  if (unknownRecord.length > 0) {
    fail("ADAPTER_CONTRACT", `${kind} names a record the provider does not have`, {
      kind,
      ids: unknownRecord.sort(byCodeUnit),
    });
  }
  if (misplaced.length > 0) {
    fail("ADAPTER_CONTRACT", `${kind} is held by a bundle that does not own its record`, {
      kind,
      ids: misplaced.sort(byCodeUnit),
    });
  }

  return { all: entries.map((entry) => entry.value), byId, byRecord };
}

function uniqueById<T, V>(
  kind: string,
  values: readonly T[],
  idOf: (value: T) => string,
  project: (value: T) => V,
): Map<string, V> {
  const map = new Map<string, V>();
  const duplicates: string[] = [];
  for (const value of values) {
    const id = idOf(value);
    if (typeof id !== "string" || id === "") {
      fail("ADAPTER_CONTRACT", `${kind} has no usable id`, { kind });
    }
    if (map.has(id)) duplicates.push(id);
    map.set(id, project(value));
  }
  if (duplicates.length > 0) {
    fail("ADAPTER_CONTRACT", `duplicate ${kind} id`, {
      kind,
      ids: [...new Set(duplicates)].sort(byCodeUnit),
    });
  }
  return map;
}

function resolveAll<T>(
  kind: string,
  recordId: string,
  ids: readonly string[],
  byId: ReadonlyMap<string, T>,
): T[] {
  const resolved: T[] = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) {
      fail("ADAPTER_CONTRACT", `record lists the same ${kind} twice`, { recordId, id });
    }
    seen.add(id);
    const value = byId.get(id);
    if (value === undefined) missing.push(id);
    else resolved.push(value);
  }
  if (missing.length > 0) {
    fail("ADAPTER_CONTRACT", `record lists a ${kind} the provider does not have`, {
      recordId,
      ids: missing.sort(byCodeUnit),
    });
  }
  return resolved;
}

/**
 * The reverse of `resolveAll`: an entity whose `record_id` points at a record
 * whose manifest never lists it would be read, counted into the corpus, and
 * then silently dropped from every page.
 */
function assertManifestListsEveryEntity<T extends OwnedEntity>(
  kind: string,
  index: OwnedIndex<T>,
  idOf: (value: T) => string,
  recordById: ReadonlyMap<string, IndexedRecord>,
  declaredIds: (record: IndexedRecord) => readonly string[],
): void {
  const orphans: string[] = [];
  for (const value of index.all) {
    const record = recordById.get(value.record_id);
    if (record === undefined || !declaredIds(record).includes(idOf(value))) {
      orphans.push(idOf(value));
    }
  }
  if (orphans.length > 0) {
    fail("ADAPTER_CONTRACT", `${kind} is not listed by the record that owns it`, {
      kind,
      ids: orphans.sort(byCodeUnit),
    });
  }
}

// --- shape helpers ---------------------------------------------------------

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asObject(value: unknown): Record<string, unknown> | null {
  return isObject(value) ? value : null;
}

function assertSchemaVersion(value: unknown, file: string): void {
  const declared = asObject(value)?.schema_version;
  if (declared !== PROVIDER_SCHEMA_VERSION) {
    fail("ADAPTER_CONTRACT", "provider file declares an unsupported schema_version", {
      file,
      expected: PROVIDER_SCHEMA_VERSION,
      actual: typeof declared === "number" ? declared : String(declared),
    });
  }
}

function expectArray(value: unknown, file: string, key: string): unknown[] {
  const list = asObject(value)?.[key];
  if (!Array.isArray(list)) {
    fail("ADAPTER_CONTRACT", "provider file has no entry array", { file, key });
  }
  return list;
}
