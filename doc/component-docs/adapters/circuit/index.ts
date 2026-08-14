/**
 * The circuit adapter: `.claude/skills/**` evidence to the public view model.
 *
 * The joins live in `evidence.ts`; this module is the projection. It decides
 * what a published record contains, routes every value through the publication
 * policy, and sanitises every string and URL on the way out. Nothing here
 * repairs, summarises or re-states evidence: a value that cannot be published
 * as it stands fails the build.
 *
 * Ordering is inventory-line order, then parents before their subordinates.
 * The inventory is generated identity truth, so its order is already stable
 * and reviewable; deriving order from anything else (MPN, manufacturer) would
 * reshuffle pages whenever a part is renamed. Within a record, sources and
 * facts follow the manifest's own order — that order is curated (primary
 * source first) and re-sorting would throw the curation away.
 *
 * Unlike led-lamp's, this adapter's `PublicRecordReference` is partial by
 * design: the footprint identity always resolves, but the reviewed document
 * and the 3D model are each optional and each carry a stated reason when
 * absent. See `references.ts` for why, and `core/view-model.ts` for the shape.
 */

import { anchor, byCodeUnit, recordSlug, type Slug } from "../../core/ids.ts";
import { classifyUrl, type SafeUrl } from "../../core/url.ts";
import { fail } from "../../core/errors.ts";
import { safeText, type SafeText } from "../../core/text.ts";
import { VIEW_MODEL_VERSION } from "../../core/view-model.ts";
import type { ComponentDataAdapter, ProjectionContext } from "../../core/adapter.ts";
import type { FieldKey, PublicationPolicy } from "../../core/publication.ts";
import type {
  CorpusSummary,
  PublicAliases,
  PublicCoverage,
  PublicFact,
  PublicFactValue,
  PublicFactValueEntry,
  PublicFootprintReference,
  PublicInteraction,
  PublicPinMap,
  PublicRecord,
  PublicRecordIdentity,
  PublicRecordReference,
  PublicSource,
  PublicViewModel,
} from "../../core/view-model.ts";
import { CIRCUIT_PUBLICATION_MATRIX } from "./matrix.ts";
import { CIRCUIT_SELECTION } from "./selection.ts";
import {
  readCircuitReferenceContract,
  type CircuitPackageReference,
  type CircuitReferenceContract,
} from "./references.ts";
import { INTEGRATION_RULES_FILE, INTEGRATION_SKILL_NAME, INVENTORY_FILE } from "./paths.ts";
import { projectIntegrationRules } from "./integration.ts";
import { createPythonValidator } from "./validate.ts";
import {
  indexEvidence,
  readBundle,
  readIntegrationRules,
  readInventory,
  type EvidenceIndex,
  type IndexedRecord,
  type Inventory,
  type InventoryLine,
  type ProviderCoverage,
  type ProviderFact,
  type ProviderInteraction,
  type ProviderPinMap,
  type ProviderSource,
} from "./evidence.ts";

/** The frozen component-spec contract this adapter is written against. */
export const CIRCUIT_CONTRACT_VERSION = 1;

export const CIRCUIT_ADAPTER_ID = "circuit-component-spec";

export function createCircuitAdapter(): ComponentDataAdapter {
  return {
    id: CIRCUIT_ADAPTER_ID,
    contractVersion: CIRCUIT_CONTRACT_VERSION,
    supportedViewModelVersions: [VIEW_MODEL_VERSION],
    validate: createPythonValidator(),
    selection: CIRCUIT_SELECTION,
    matrix: CIRCUIT_PUBLICATION_MATRIX,
    project,
  };
}

async function project(context: ProjectionContext): Promise<PublicViewModel> {
  return projectIndex(await readEvidenceIndex(), context.policy);
}

/**
 * The adapter's only I/O: the inventory, every bundle it names, and the
 * cross-component ruleset.
 */
export async function readEvidenceIndex(): Promise<EvidenceIndex> {
  const inventory = await readInventory(INVENTORY_FILE);
  const ownerSkills = uniqueInOrder(inventory.lines.map((line) => line.owner_skill));
  const [bundles, rules] = await Promise.all([
    Promise.all(ownerSkills.map(readBundle)),
    readIntegrationRules(INTEGRATION_RULES_FILE),
  ]);
  const index = indexEvidence(inventory, bundles, rules.rules);
  return { ...index, references: await readCircuitReferenceContract(index, CIRCUIT_SELECTION) };
}

/**
 * The projection itself: pure, so every publication rule below can be proved
 * against a fixture corpus without a filesystem, a subprocess, or the real
 * evidence.
 */
export function projectIndex(index: EvidenceIndex, policy: PublicationPolicy): PublicViewModel {
  const { inventory } = index;

  // Fatal when the committed selection names something the provider lost, and
  // when the corpus size moved. Must run before anything is projected.
  policy.assertSelectionFresh(
    index.records.map((entry) => entry.record.record_id),
    index.sourceIds,
    index.integrationRules.length,
  );

  const selected = index.records.filter((entry) => policy.isRecordSelected(entry.record.record_id));
  const ordered = orderRecords(selected, inventory.lines);
  assertSelectionIsClosed(ordered, index, policy);
  const references = index.references;
  if (references === undefined) {
    fail("ADAPTER_CONTRACT", "reference assets were not validated before projection");
  }

  const slugByRecordId = new Map(
    ordered.map((entry) => [entry.record.record_id, recordSlug(entry.record.record_id)]),
  );

  const records: PublicRecord[] = ordered.map((entry) =>
    projectRecord(entry, index, slugByRecordId, references, policy),
  );

  // The rules are projected against what was actually published, not against
  // what the provider holds: a rule naming a deselected record would render a
  // dead cross-link, and that is a selection mistake rather than something to
  // drop the reference over.
  const integration = projectIntegrationRules(
    index.integrationRules,
    {
      publishedRecordIds: new Set(slugByRecordId.keys()),
      recordIdByFactId: new Map(
        [...index.factById].map(([factId, fact]) => [factId, fact.record_id]),
      ),
      ownerSkill: INTEGRATION_SKILL_NAME,
    },
    policy,
  );

  // Counted from what was actually published (the projected records), not
  // from the provider index: the landing page must never assert counts the
  // site does not deliver. The three inventory rows stay inventory-scoped on
  // purpose — they are identity truth about the whole inventory, and the line
  // count is cross-checked against it below.
  const corpus: CorpusSummary = {
    ownerBundles: new Set(ordered.map((entry) => entry.line.owner_skill)).size,
    records: records.length,
    standaloneRecords: records.filter((record) => record.identity.kind === "standalone").length,
    subordinateRecords: records.filter((record) => record.identity.kind === "subordinate").length,
    sources: records.reduce((total, record) => total + record.sources.length, 0),
    facts: records.reduce((total, record) => total + record.facts.length, 0),
    coverageDomains: records.reduce((total, record) => total + record.coverage.length, 0),
    interactions: new Set(
      records.flatMap((record) =>
        record.interactions.map((interaction) => interaction.interactionId),
      ),
    ).size,
    pinMaps: records.reduce((total, record) => total + record.pinMaps.length, 0),
    pins: records.reduce(
      (total, record) =>
        total + record.pinMaps.reduce((count, pinMap) => count + pinMap.pins.length, 0),
      0,
    ),
    inventoryLines: inventory.assertions.orderable_lines,
    fittedLines: inventory.assertions.fitted_lines,
    dnpOrHandFitLines: inventory.assertions.dnp_or_hand_fit_lines,
  };

  assertCorpusMatchesInventory(corpus, inventory, index);

  return {
    version: VIEW_MODEL_VERSION,
    provider: {
      id: safeText(CIRCUIT_ADAPTER_ID, { field: "provider.id" }),
      contractVersion: CIRCUIT_CONTRACT_VERSION,
    },
    corpus,
    records,
    integration,
  };
}

// --- per-record projection -------------------------------------------------

function projectRecord(
  entry: IndexedRecord,
  index: EvidenceIndex,
  slugByRecordId: ReadonlyMap<string, Slug>,
  references: CircuitReferenceContract,
  policy: PublicationPolicy,
): PublicRecord {
  return {
    identity: buildIdentity(entry, slugByRecordId, policy),
    aliases: projectAliases(entry, policy),
    sources: entry.sources.map((source) => projectSource(source, policy)),
    facts: entry.facts.map((fact) => projectFact(fact, policy)),
    coverage: entry.coverage.map((domain) => projectCoverage(domain, policy)),
    // Every record the interaction names carries it, in the manifest's own
    // order. Six interactions span a standalone and its subordinates, and a
    // reader on the subordinate's page has to see that it participates —
    // `pipeline.ts` scopes anchor uniqueness to a page for exactly this.
    interactions: entry.interactionIds.map((interactionId) =>
      projectInteraction(interactionOf(index, interactionId), policy),
    ),
    pinMaps: entry.pinMaps.map((pinMap) => projectPinMap(pinMap, policy)),
    reference: projectRecordReference(entry, references, policy),
  };
}

/**
 * The curated shortcuts for one record.
 *
 * The footprint half is required — `readCircuitReferenceContract` resolved a
 * canonical footprint for every selected record, and its absence here would
 * mean the contract and the projection disagree about the corpus. The document
 * half is optional: a record with no curated `documentSelections` entry gets a
 * stated reason instead of a card, and the reason distinguishes "nothing was
 * curated yet" from "this record has no manufacturer document to curate".
 */
function projectRecordReference(
  entry: IndexedRecord,
  references: CircuitReferenceContract,
  policy: PublicationPolicy,
): PublicRecordReference {
  const recordId = entry.record.record_id;
  const footprint = references.packageByRecordId.get(recordId);
  if (footprint === undefined) {
    fail("ADAPTER_CONTRACT", "record has no footprint reference", { recordId });
  }
  const document = references.documentsByRecordId.get(recordId);
  if (document === undefined) {
    const reason = references.documentUnresolvedReasonByRecordId.get(recordId);
    if (reason === undefined) {
      // Unreachable while `PublicationPolicy` holds the partition, and checked
      // anyway: a record that reached here with neither a document nor a
      // reason would render a card that states nothing at all.
      fail("ADAPTER_CONTRACT", "record has neither a curated document nor a stated reason", {
        recordId,
      });
    }
    return {
      document: null,
      documentUnresolvedReason: safeText(
        reason,
        { field: `${recordId}.reference.documentUnresolvedReason` },
      ),
      footprint: projectFootprint(footprint, policy),
    };
  }
  const classified = classifyUrl(document.source.authoritative_url);
  if (classified.decision === "DENY") {
    fail("UNSAFE_VALUE", "selected document URL failed classification", {
      recordId,
      sourceId: document.source.source_id,
      reason: classified.reason,
    });
  }
  policy.publishRequired("asset.datasheetPdf", true);
  const labels = {
    datasheet: "Datasheet PDF",
    specification: "Specification PDF",
    drawing: "Mechanical drawing PDF",
  } as const;
  return {
    document: {
      sourceId: policy.publishRequired("reference.document.sourceId", safeText(document.source.source_id, { field: `${recordId}.reference.sourceId` })),
      documentTitle: policy.publishRequired("reference.document.documentTitle", safeText(document.source.document_title, { field: `${recordId}.reference.documentTitle` })),
      label: policy.publishRequired("reference.document.label", safeText(labels[document.documentKind], { field: `${recordId}.reference.label` })),
      authorityClass: policy.publishRequired("reference.document.authorityClass", safeText(document.source.authority_class, { field: `${recordId}.reference.authorityClass` })),
      url: policy.publishRequired("reference.document.url", classified.url),
      availability: policy.publishRequired("reference.document.availability", safeText(document.source.availability, { field: `${recordId}.reference.availability` })),
      documentKind: policy.publishRequired("reference.document.documentKind", document.documentKind),
    },
    documentUnresolvedReason: null,
    footprint: projectFootprint(footprint, policy),
  };
}

function projectFootprint(
  entry: CircuitPackageReference,
  policy: PublicationPolicy,
): PublicFootprintReference {
  const at = `${entry.packageId}.reference`;
  const identity = {
    packageId: policy.publishRequired("reference.footprint.packageId", safeText(entry.packageId, { field: `${at}.packageId` })),
    footprintName: policy.publishRequired("reference.footprint.name", safeText(entry.footprintName, { field: `${at}.footprintName` })),
  };
  if (entry.model === undefined) {
    const reason = entry.modelUnresolvedReason;
    if (reason === undefined) {
      fail("ADAPTER_CONTRACT", "package has neither a model nor a reason for its absence", {
        packageId: entry.packageId,
      });
    }
    return {
      ...identity,
      model: null,
      modelUnresolvedReason: safeText(reason, { field: `${at}.modelUnresolvedReason` }),
    };
  }
  // Not reachable while `MODEL_ROOT` holds no assets. When it does, the
  // `reference.model.*` decisions are still DENY until reviewed, and
  // `publishRequired` fails here rather than publishing them by default.
  return {
    ...identity,
    model: {
      modelPath: policy.publishRequired("reference.model.path", safeText(entry.model.modelPath, { field: `${at}.modelPath` })),
      offset: policy.publishRequired("reference.model.offset", entry.model.offset),
      rotation: policy.publishRequired("reference.model.rotation", entry.model.rotation),
      scale: policy.publishRequired("reference.model.scale", entry.model.scale),
    },
    modelUnresolvedReason: null,
  };
}

function buildIdentity(
  entry: IndexedRecord,
  slugByRecordId: ReadonlyMap<string, Slug>,
  policy: PublicationPolicy,
): PublicRecordIdentity {
  const { record, line } = entry;
  const slug = slugByRecordId.get(record.record_id);
  if (slug === undefined) {
    fail("IDENTITY_COLLISION", `no slug for record ${record.record_id}`, {
      recordId: record.record_id,
    });
  }

  const parentRecordId = policy.publish("record.parentRecordId", record.parent_record_id);
  let parentSlug: Slug | null = null;
  if (parentRecordId != null) {
    const found = slugByRecordId.get(parentRecordId);
    if (found === undefined) {
      fail("STALE_SELECTION", `parent record ${parentRecordId} is not published`, {
        recordId: record.record_id,
        parentRecordId,
      });
    }
    parentSlug = found;
  }

  return {
    recordId: policy.publishRequired(
      "record.recordId",
      safeText(record.record_id, { field: "record_id" }),
    ),
    slug: policy.publishRequired("record.slug", slug),
    anchor: anchor(record.record_id),
    kind: policy.publishRequired("record.kind", record.kind),
    parentRecordId:
      parentRecordId == null
        ? null
        : safeText(parentRecordId, { field: "parent_record_id" }),
    parentSlug,
    lineId: policy.publishRequired("record.lineId", safeText(line.line_id, { field: "line_id" })),
    // `record.ownerSkill` is denied for zudo-pd (see `matrix.ts`):
    // `claudeResources` is `false`, so `/docs/claude-skills/<name>/` does not
    // exist as a route to link back to. `publish()`, not `publishRequired()` —
    // the field is DENY, so this always resolves to `null`.
    ownerSkill:
      policy.publish("record.ownerSkill", safeText(line.owner_skill, { field: "owner_skill" })) ??
      null,
    mpn: policy.publishRequired("record.mpn", safeText(line.mpn, { field: "mpn" })),
    manufacturer: policy.publishRequired(
      "record.manufacturer",
      safeText(line.manufacturer, { field: "manufacturer" }),
    ),
    lcsc: policy.publishRequired("record.lcsc", safeText(line.lcsc, { field: "lcsc" })),
    packageName: policy.publishRequired(
      "record.package",
      safeText(line.package, { field: "package" }),
    ),
    function: policy.publishRequired(
      "record.function",
      safeText(line.function, { field: "function" }),
    ),
    identityState: policy.publishRequired(
      "record.identityState",
      safeText(line.identity_state, { field: "identity_state" }),
    ),
    sourceState: policy.publishRequired(
      "record.sourceState",
      safeText(line.source_state, { field: "source_state" }),
    ),
    // `dnp` lives per placement in zudo-pd's inventory (see `evidence.ts`'s
    // `InventoryLine`). The line-level flag is only the rollup the catalog
    // columns read (fitted if fitted ANYWHERE); the per-placement truth is
    // carried through on each placement below, so a mixed line (board-a
    // R17/R18 DNP, board-b R3 fitted) renders each position's real fit state.
    dnp: policy.publishRequired(
      "record.dnp",
      line.placements.every((placement) => placement.dnp),
    ),
    placements: policy.publishRequired(
      "record.placements",
      line.placements.map((placement) => ({
        board: safeText(placement.board, { field: "placement.board" }),
        refdes: safeText(placement.refdes, { field: "placement.refdes" }),
        dnp: placement.dnp,
      })),
    ),
  };
}

function projectAliases(entry: IndexedRecord, policy: PublicationPolicy): PublicAliases {
  const { route } = entry;
  const list = (values: readonly string[], field: string): SafeText[] =>
    values.map((value) => safeText(value, { field: `${route.route_id}.${field}` }));

  // Agent-steering text, denied by the matrix: recorded as withheld so the
  // preflight report shows the generator saw it and dropped it.
  recordWithheld(policy, "routing.positivePrompts");
  recordWithheld(policy, "routing.negativePrompts");

  return {
    mpn: policy.publishRequired("alias.mpn", list(route.aliases.mpn, "aliases.mpn")),
    lcsc: policy.publishRequired("alias.lcsc", list(route.aliases.lcsc, "aliases.lcsc")),
    manufacturer: policy.publishRequired(
      "alias.manufacturer",
      list(route.aliases.manufacturer, "aliases.manufacturer"),
    ),
    function: policy.publishRequired(
      "alias.function",
      list(route.aliases.function, "aliases.function"),
    ),
  };
}

function projectSource(source: ProviderSource, policy: PublicationPolicy): PublicSource {
  const at = (field: string): string => `${source.source_id}.${field}`;

  recordWithheld(policy, "source.sha256");
  recordWithheld(policy, "source.evidenceExtract");
  recordWithheld(policy, "source.alternateAuthoritativeUrl");
  recordWithheld(policy, "source.physicalPdfPageIndex");

  return {
    sourceId: policy.publishRequired(
      "source.sourceId",
      safeText(source.source_id, { field: at("source_id") }),
    ),
    anchor: anchor(source.source_id),
    documentTitle: policy.publishRequired(
      "source.documentTitle",
      safeText(source.document_title, { field: at("document_title") }),
    ),
    documentNumber: policy.publishRequired(
      "source.documentNumber",
      safeText(source.document_number, { field: at("document_number") }),
    ),
    revision: policy.publishRequired(
      "source.revision",
      safeText(source.revision, { field: at("revision") }),
    ),
    documentDate: policy.publishRequired(
      "source.documentDate",
      safeText(source.document_date, { field: at("document_date") }),
    ),
    retrievalDate: policy.publishRequired(
      "source.retrievalDate",
      safeText(source.retrieval_date, { field: at("retrieval_date") }),
    ),
    authorityClass: policy.publishRequired(
      "source.authorityClass",
      safeText(source.authority_class, { field: at("authority_class") }),
    ),
    // Published whenever the URL is, so a SOURCE UNAVAILABLE document always
    // renders with its unavailability next to the link.
    availability: policy.publishRequired(
      "source.availability",
      safeText(source.availability, { field: at("availability") }),
    ),
    locator: policy.publishRequired(
      "source.locator",
      safeText(source.locator, { field: at("locator") }),
    ),
    printedPageLabel: policy.publishRequired(
      "source.printedPageLabel",
      safeText(source.printed_page_label, { field: at("printed_page_label") }),
    ),
    url: projectSourceUrl(source, policy),
  };
}

/**
 * Classify a source's citation URL and record the decision for preflight.
 *
 * The URL string is recorded only when it is published. A denial already
 * carries its reason and its source ID, which is all a maintainer needs, and
 * the report is a committed file — echoing a URL that policy just refused to
 * republish (an un-opted-in link, a machine path, a `file:` locator) would put
 * it in the repository anyway.
 */
function projectSourceUrl(source: ProviderSource, policy: PublicationPolicy): SafeUrl | null {
  const deny = (reason: string): null => {
    policy.recordUrlUsage({ sourceId: source.source_id, url: "", decision: "DENY", reason });
    return null;
  };

  // The field gate comes first. If the matrix ever denies outbound links, no
  // URL is considered at all — so none can reach the committed report either.
  if (policy.decision("source.authoritativeUrl") === "DENY") {
    recordWithheld(policy, "source.authoritativeUrl");
    return deny("FIELD_DENIED");
  }
  if (!policy.isSourceLinkable(source.source_id)) {
    return deny("SOURCE_NOT_LINKABLE");
  }

  const classified = classifyUrl(source.authoritative_url);
  if (classified.decision === "DENY") {
    return deny(classified.reason);
  }

  policy.recordUrlUsage({
    sourceId: source.source_id,
    url: classified.url,
    decision: "ALLOW",
    reason: "ABSOLUTE_HTTP_URL",
  });
  return policy.publishRequired("source.authoritativeUrl", classified.url);
}

function projectFact(fact: ProviderFact, policy: PublicationPolicy): PublicFact {
  const at = (field: string): string => `${fact.fact_id}.${field}`;

  return {
    factId: policy.publishRequired(
      "fact.factId",
      safeText(fact.fact_id, { field: at("fact_id") }),
    ),
    anchor: anchor(fact.fact_id),
    recordId: safeText(fact.record_id, { field: at("record_id") }),
    sourceId: safeText(fact.source_id, { field: at("source_id") }),
    factClass: policy.publishRequired("fact.class", safeText(fact.class, { field: at("class") })),
    value: policy.publishRequired("fact.value", projectFactValue(fact)),
    unit: policy.publishRequired("fact.unit", safeText(fact.unit, { field: at("unit") })),
    conditions: policy.publishRequired(
      "fact.conditions",
      safeText(fact.conditions, { field: at("conditions") }),
    ),
    locator: policy.publishRequired(
      "fact.locator",
      safeText(fact.locator, { field: at("locator") }),
    ),
    provenance: policy.publishRequired(
      "fact.provenance",
      safeText(fact.provenance, { field: at("provenance") }),
    ),
    verdict: policy.publishRequired(
      "fact.verdict",
      safeText(fact.verdict, { field: at("verdict") }),
    ),
    // Fact IDs are globally unique, so a dependency is a resolvable anchor even
    // when it points at another record's page. `evidence.ts` has already proved
    // every edge resolves and that the graph has no cycle.
    dependsOn: policy.publishRequired(
      "fact.dependsOn",
      fact.depends_on.map((id) => safeText(id, { field: at("depends_on") })),
    ),
    // Empty for every raw fact; an evaluable arithmetic expression for a
    // calculated one. Empty is legal here and nowhere else.
    expression: policy.publishRequired(
      "fact.expression",
      safeText(fact.expression, { field: at("expression"), allowEmpty: true }),
    ),
  };
}

/**
 * Preserve the value's JSON shape. A number stays a number, a string stays a
 * string, and an object becomes sorted key/value entries — never a stringified
 * blob, which is the lossy coercion the contract forbids. Anything else is a
 * shape this projection has no honest rendering for, so it stops the build
 * rather than guessing.
 */
function projectFactValue(fact: ProviderFact): PublicFactValue {
  const field = `${fact.fact_id}.value`;
  const raw = fact.value;

  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      fail("ADAPTER_CONTRACT", "fact value is not a finite number", { factId: fact.fact_id });
    }
    return raw;
  }
  if (typeof raw === "string") {
    return safeText(raw, { field });
  }
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const entries: PublicFactValueEntry[] = Object.keys(raw as Record<string, unknown>)
      .sort(byCodeUnit)
      .map((key) => {
        const nested = (raw as Record<string, unknown>)[key];
        if (typeof nested !== "number" && typeof nested !== "string") {
          fail("ADAPTER_CONTRACT", "structured fact value has a non-scalar member", {
            factId: fact.fact_id,
            key,
          });
        }
        return {
          key: safeText(key, { field: `${field}.key` }),
          value:
            typeof nested === "number" ? nested : safeText(nested, { field: `${field}.${key}` }),
        };
      });
    if (entries.length === 0) {
      fail("ADAPTER_CONTRACT", "structured fact value is empty", { factId: fact.fact_id });
    }
    return entries;
  }

  fail("ADAPTER_CONTRACT", "fact value has an unsupported JSON shape", {
    factId: fact.fact_id,
    shape: raw === null ? "null" : Array.isArray(raw) ? "array" : typeof raw,
  });
}

function projectCoverage(domain: ProviderCoverage, policy: PublicationPolicy): PublicCoverage {
  const at = (field: string): string => `${domain.coverage_id}.${field}`;

  if (domain.status !== "COVERED" && domain.status !== "OPEN") {
    fail("ADAPTER_CONTRACT", "coverage status is neither COVERED nor OPEN", {
      coverageId: domain.coverage_id,
      status: domain.status,
    });
  }

  return {
    coverageId: policy.publishRequired(
      "coverage.coverageId",
      safeText(domain.coverage_id, { field: at("coverage_id") }),
    ),
    anchor: anchor(domain.coverage_id),
    recordId: safeText(domain.record_id, { field: at("record_id") }),
    domain: policy.publishRequired(
      "coverage.domain",
      safeText(domain.domain, { field: at("domain") }),
    ),
    status: policy.publishRequired("coverage.status", domain.status),
    // An OPEN domain must carry its reason, or the page reads as a clean bill
    // of health the evidence never gave.
    reason: policy.publishRequired(
      "coverage.reason",
      safeText(domain.reason, { field: at("reason") }),
    ),
    factIds: policy.publishRequired(
      "coverage.factIds",
      domain.fact_ids.map((id) => safeText(id, { field: at("fact_ids") })),
    ),
    // Legitimately empty on an OPEN domain whose only evidence is NOT
    // APPLICABLE. Empty means "no fact blocks this", never "nothing is open".
    blockingFactIds: policy.publishRequired(
      "coverage.blockingFactIds",
      domain.blocking_fact_ids.map((id) => safeText(id, { field: at("blocking_fact_ids") })),
    ),
  };
}

function projectInteraction(
  interaction: ProviderInteraction,
  policy: PublicationPolicy,
): PublicInteraction {
  const at = (field: string): string => `${interaction.interaction_id}.${field}`;

  return {
    interactionId: policy.publishRequired(
      "interaction.interactionId",
      safeText(interaction.interaction_id, { field: at("interaction_id") }),
    ),
    anchor: anchor(interaction.interaction_id),
    recordIds: policy.publishRequired(
      "interaction.recordIds",
      interaction.record_ids.map((id) => safeText(id, { field: at("record_ids") })),
    ),
    factIds: policy.publishRequired(
      "interaction.factIds",
      interaction.fact_ids.map((id) => safeText(id, { field: at("fact_ids") })),
    ),
    conditions: policy.publishRequired(
      "interaction.conditions",
      safeText(interaction.conditions, { field: at("conditions") }),
    ),
    verdict: policy.publishRequired(
      "interaction.verdict",
      safeText(interaction.verdict, { field: at("verdict") }),
    ),
  };
}

function projectPinMap(pinMap: ProviderPinMap, policy: PublicationPolicy): PublicPinMap {
  const at = (field: string): string => `${pinMap.pin_map_id}.${field}`;

  // Internal review state; denied by the matrix.
  recordWithheld(policy, "pinMap.reviewedBy");

  return {
    pinMapId: policy.publishRequired(
      "pinMap.pinMapId",
      safeText(pinMap.pin_map_id, { field: at("pin_map_id") }),
    ),
    anchor: anchor(pinMap.pin_map_id),
    recordId: safeText(pinMap.record_id, { field: at("record_id") }),
    symbol: policy.publishRequired(
      "pinMap.symbol",
      safeText(pinMap.symbol, { field: at("symbol") }),
    ),
    footprint: policy.publishRequired(
      "pinMap.footprint",
      safeText(pinMap.footprint, { field: at("footprint") }),
    ),
    pins: policy.publishRequired(
      "pinMap.pins",
      pinMap.pins.map((pin) => ({
        symbolPin: safeText(pin.symbol_pin, { field: at("pin.symbol_pin") }),
        name: safeText(pin.name, { field: at("pin.name") }),
        footprintPad: safeText(pin.footprint_pad, { field: at("pin.footprint_pad") }),
        function: safeText(pin.function, { field: at("pin.function") }),
      })),
    ),
  };
}

// --- selection and ordering ------------------------------------------------

/**
 * Selection has to be closed under the links a published page renders.
 *
 * Publishing a record while withholding its source would put an unprovenanced
 * number on a page; publishing an interaction that names an unpublished record
 * would render a link to nowhere. Both are selection mistakes rather than
 * something to paper over by dropping evidence, so they stop the build with
 * the exact IDs to add or remove.
 */
function assertSelectionIsClosed(
  ordered: readonly IndexedRecord[],
  index: EvidenceIndex,
  policy: PublicationPolicy,
): void {
  const publishedRecords = new Set(ordered.map((entry) => entry.record.record_id));
  const unselectedSources: string[] = [];
  const danglingInteractions: string[] = [];
  const danglingDependencies: string[] = [];

  for (const entry of ordered) {
    for (const source of entry.sources) {
      if (!policy.isSourceSelected(source.source_id)) {
        unselectedSources.push(`${entry.record.record_id}:${source.source_id}`);
      }
    }
    for (const fact of entry.facts) {
      for (const dependency of fact.depends_on) {
        const target = index.factById.get(dependency);
        if (target === undefined || !publishedRecords.has(target.record_id)) {
          danglingDependencies.push(`${fact.fact_id}:${dependency}`);
        }
      }
    }
    for (const interactionId of entry.interactionIds) {
      const interaction = interactionOf(index, interactionId);
      for (const recordId of interaction.record_ids) {
        if (!publishedRecords.has(recordId)) {
          danglingInteractions.push(`${interactionId}:${recordId}`);
        }
      }
    }
  }

  if (unselectedSources.length > 0) {
    fail("STALE_SELECTION", "a published record cites a source that is not selected", {
      references: unselectedSources.sort(byCodeUnit),
    });
  }
  if (danglingDependencies.length > 0) {
    fail("STALE_SELECTION", "a published fact depends on a fact that is not published", {
      references: danglingDependencies.sort(byCodeUnit),
    });
  }
  if (danglingInteractions.length > 0) {
    fail("STALE_SELECTION", "a published interaction names a record that is not published", {
      references: [...new Set(danglingInteractions)].sort(byCodeUnit),
    });
  }
}

/** Inventory-line order, parents before their own subordinates. */
function orderRecords(
  records: readonly IndexedRecord[],
  lines: readonly InventoryLine[],
): IndexedRecord[] {
  const lineIndex = new Map(lines.map((line, position) => [line.line_id, position]));
  const rank = (entry: IndexedRecord): number =>
    lineIndex.get(entry.record.line_id) ?? Number.MAX_SAFE_INTEGER;
  const order = (left: IndexedRecord, right: IndexedRecord): number =>
    rank(left) - rank(right) || byCodeUnit(left.record.record_id, right.record.record_id);

  const standalone = records.filter((entry) => entry.record.kind === "standalone").sort(order);

  const childrenByParent = new Map<string, IndexedRecord[]>();
  for (const entry of records) {
    if (entry.record.kind !== "subordinate") continue;
    // `evidence.ts` has already proved every subordinate names an existing
    // standalone parent, so a null here is impossible by construction.
    const parent = entry.record.parent_record_id as string;
    const bucket = childrenByParent.get(parent) ?? [];
    bucket.push(entry);
    childrenByParent.set(parent, bucket);
  }

  const ordered: IndexedRecord[] = [];
  for (const parent of standalone) {
    ordered.push(parent);
    ordered.push(...(childrenByParent.get(parent.record.record_id) ?? []).sort(order));
    childrenByParent.delete(parent.record.record_id);
  }

  // A subordinate whose parent is not selected would silently vanish; that is
  // a selection mistake, not something to paper over with a fallback ordering.
  if (childrenByParent.size > 0) {
    fail("STALE_SELECTION", "subordinate records reference an unselected parent", {
      parents: [...childrenByParent.keys()].sort(byCodeUnit),
    });
  }

  return ordered;
}

// --- helpers ---------------------------------------------------------------

/**
 * Count one value of a denied field for the preflight report.
 *
 * The value itself is never handed to the policy: if the matrix entry were
 * flipped to PUBLISH, this call would have to be rewritten to pass the real
 * value, so a publication decision can never take effect by accident.
 */
function recordWithheld(policy: PublicationPolicy, key: FieldKey): void {
  if (policy.decision(key) !== "DENY") {
    fail("PUBLICATION_POLICY", `field ${key} is counted as withheld but is not denied`, { key });
  }
  policy.publish(key, undefined);
}

function interactionOf(index: EvidenceIndex, interactionId: string): ProviderInteraction {
  const interaction = index.interactionById.get(interactionId);
  if (interaction === undefined) {
    fail("ADAPTER_CONTRACT", "record lists an interaction the provider does not have", {
      interactionId,
    });
  }
  return interaction;
}

function assertCorpusMatchesInventory(
  corpus: CorpusSummary,
  inventory: Inventory,
  index: EvidenceIndex,
): void {
  if (inventory.lines.length !== inventory.assertions.orderable_lines) {
    fail("ADAPTER_CONTRACT", "inventory line count disagrees with its own assertion", {
      lines: inventory.lines.length,
      asserted: inventory.assertions.orderable_lines,
    });
  }
  if (corpus.standaloneRecords + corpus.subordinateRecords !== corpus.records) {
    fail("ADAPTER_CONTRACT", "record kinds do not sum to the record total", {
      standalone: corpus.standaloneRecords,
      subordinate: corpus.subordinateRecords,
      total: corpus.records,
    });
  }
  // One routing entry per record is what makes aliases a total function; a
  // mismatch means some record would publish without search terms. This is a
  // provider-level invariant, so it compares provider totals — the corpus
  // counts above are published counts and may lawfully be smaller.
  if (index.totals.routes !== index.records.length) {
    fail("ADAPTER_CONTRACT", "route count does not match the record count", {
      routes: index.totals.routes,
      records: index.records.length,
    });
  }
}

function uniqueInOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
