/**
 * The one generation path. `generate`, `check` and the watcher all call
 * `runPipeline` — there is no second code path that could drift.
 *
 * Order is load-bearing and fail-closed at every step:
 *
 *   1. negotiate  — adapter must support this core's view-model version
 *   2. validate   — the provider's OWN validator; nonzero exit aborts here,
 *                   before a single byte is projected
 *   3. project    — adapter reads its data and asserts its selection is fresh
 *   4. render     — data to AST to text, guarded
 *   5. link check — every internal destination exists (see `links.ts`)
 *   6. emit       — into the exclusively-owned tree (or diff, in check mode)
 *   7. preflight  — deterministic report of what was published and withheld
 */

import { diffAgainstDisk, emit, type EmitResult } from "./emit.ts";
import { fail } from "./errors.ts";
import { assertUnique } from "./ids.ts";
import { assertLinkIntegrity } from "./links.ts";
import { PublicationPolicy, type PreflightReport } from "./publication.ts";
import { renderCatalog } from "./render/catalog.ts";
import { renderIntegration } from "./render/integration.ts";
import { renderLanding } from "./render/landing.ts";
import { renderRecord, renderRecordsIndex } from "./render/record.ts";
import { buildRecordIndex, type RecordIndex } from "./render/shared.ts";
import {
  VIEW_MODEL_VERSION,
  type PublicInteraction,
  type PublicRecord,
  type PublicViewModel,
} from "./view-model.ts";
import type { ComponentDataAdapter } from "./adapter.ts";
import type { GeneratedPage } from "./page.ts";

export type PipelineOptions = {
  /** Absolute path of the exclusively-owned generated root. */
  readonly generatedRoot: string;
  /** `true` reports drift and writes nothing. */
  readonly dryRun: boolean;
};

export type PipelineResult = {
  readonly pages: readonly GeneratedPage[];
  readonly report: PreflightReport;
  /** Present only when `dryRun` is false. */
  readonly emitted: EmitResult | null;
  /** Present only when `dryRun` is true; empty means the tree is in sync. */
  readonly drift: readonly string[];
};

/**
 * Anchors become HTML `id` attributes, so the invariant that actually matters is
 * uniqueness *within a document* — not across the site.
 *
 * Record-scoped nodes (identity, sources, facts, coverage, pin maps) each carry a
 * singular `recordId` and therefore live on exactly one page, so for them the two
 * invariants coincide and global uniqueness is the stricter, better check.
 *
 * Interactions are the one node type with a plural `recordIds`: the same interaction is
 * published on every participating record's page (6 of this corpus's 50 span 2-4
 * records). Its anchor legitimately recurs across pages, so a flat global check would
 * abort the build on exactly the fan-out the view model exists to express. What must
 * still hold is that one anchor never denotes two different interactions — otherwise a
 * deep link would resolve to two different rules depending on where it was followed.
 */
export function assertAnchorIntegrity(
  model: PublicViewModel,
  // The per-page check must see the anchors the RENDERER emits, not the ones
  // the adapter happened to attach. `render/record.ts` publishes an interaction
  // on every record it names, whether or not the adapter attached it there — so
  // checking `record.interactions` alone would leave an interaction anchor
  // unvalidated on every participant page but one, and a collision with a fact
  // or source anchor on such a page would ship duplicate HTML ids with the build
  // still green. Defaulted so callers that only want the invariant, including
  // the tests, need not build an index.
  index: RecordIndex = buildRecordIndex(model),
): void {
  const renderedInteractions = (record: PublicRecord): readonly PublicInteraction[] =>
    index.interactionsByRecordId.get(record.identity.recordId) ?? record.interactions;

  assertUnique(
    "anchor",
    model.records.flatMap((record) => [
      record.identity.anchor,
      ...record.sources.map((source) => source.anchor),
      ...record.facts.map((fact) => fact.anchor),
      ...record.coverage.map((entry) => entry.anchor),
      ...record.pinMaps.map((entry) => entry.anchor),
    ]),
  );

  for (const record of model.records) {
    assertUnique(`anchor on record ${record.identity.slug}`, [
      record.identity.anchor,
      ...record.sources.map((source) => source.anchor),
      ...record.facts.map((fact) => fact.anchor),
      ...record.coverage.map((entry) => entry.anchor),
      ...renderedInteractions(record).map((entry) => entry.anchor),
      ...record.pinMaps.map((entry) => entry.anchor),
    ]);
  }

  // The integration page is the one page whose anchors come from neither a
  // record nor an interaction: a rule anchor and a conditioned-calculation
  // anchor are both ids on that single document, so uniqueness among them is
  // the invariant that keeps a `#rule-…` or `#calc-…` deep link unambiguous.
  assertUnique("anchor on the integration page", [
    ...model.integration.map((rule) => rule.anchor),
    ...model.integration.flatMap((rule) =>
      rule.calculations.map((calculation) => calculation.anchor),
    ),
  ]);

  const interactionByAnchor = new Map<string, string>();
  for (const record of model.records) {
    for (const entry of renderedInteractions(record)) {
      const seen = interactionByAnchor.get(entry.anchor);
      if (seen !== undefined && seen !== entry.interactionId) {
        fail("IDENTITY_COLLISION", "duplicate anchor", {
          kind: "interaction anchor",
          duplicates: [entry.anchor],
        });
      }
      interactionByAnchor.set(entry.anchor, entry.interactionId);
    }
  }
}

export async function runPipeline(
  adapter: ComponentDataAdapter,
  options: PipelineOptions,
): Promise<PipelineResult> {
  if (!adapter.supportedViewModelVersions.includes(VIEW_MODEL_VERSION)) {
    fail("ADAPTER_CONTRACT", `adapter ${adapter.id} does not support view model v${VIEW_MODEL_VERSION}`, {
      adapter: adapter.id,
      required: VIEW_MODEL_VERSION,
      supported: adapter.supportedViewModelVersions.map(String),
    });
  }

  const validation = await adapter.validate();
  if (!validation.ok) {
    fail("VALIDATION_FAILED", `provider validator exited ${validation.exitCode}`, {
      command: validation.command,
      exitCode: validation.exitCode,
      stdout: tail(validation.stdout),
      stderr: tail(validation.stderr),
    });
  }

  const policy = new PublicationPolicy(adapter.matrix, adapter.selection);
  const model = await adapter.project({ policy });

  if (!policy.selectionChecked) {
    fail("ADAPTER_CONTRACT", `adapter ${adapter.id} did not assert its selection is fresh`, {
      adapter: adapter.id,
    });
  }
  if (model.version !== VIEW_MODEL_VERSION) {
    fail("ADAPTER_CONTRACT", `adapter ${adapter.id} returned view model v${model.version}`, {
      adapter: adapter.id,
      expected: VIEW_MODEL_VERSION,
    });
  }

  const slugs = model.records.map((record) => record.identity.slug);
  assertUnique("record slug", slugs);

  // One index built once, handed to every record page AND to the anchor check —
  // so what is validated is exactly what is rendered. The evidence graph crosses
  // records: a calculated fact cites a fact owned by another part, an
  // interaction spans several, so a page cannot resolve its own links from its
  // own record alone.
  const recordIndex = buildRecordIndex(model);
  assertAnchorIntegrity(model, recordIndex);

  const pages: GeneratedPage[] = [
    renderLanding(model, policy),
    renderCatalog(model),
    renderRecordsIndex(model.records),
    ...model.records.map((record) => renderRecord(record, recordIndex)),
    // Rendered after the record pages it links into, so a missing record page
    // is reported by `assertLinkIntegrity` against a complete page set rather
    // than by ordering luck.
    renderIntegration(model, recordIndex),
  ];
  assertUnique("generated path", pages.map((page) => page.relativePath));
  assertLinkIntegrity(pages);

  const plan = { root: options.generatedRoot, pages };
  const emitted = options.dryRun ? null : await emit(plan);
  const drift = options.dryRun ? await diffAgainstDisk(plan) : [];

  const report = policy.buildReport({
    viewModelVersion: model.version,
    providerId: adapter.id,
    providerContractVersion: adapter.contractVersion,
    availableRecords: model.corpus.records,
    availableSources: model.corpus.sources,
    selectedSlugs: slugs,
    counts: {
      generatedPages: pages.length,
      publishedRecords: model.records.length,
      publishedFacts: model.records.reduce((sum, record) => sum + record.facts.length, 0),
      publishedSources: model.records.reduce((sum, record) => sum + record.sources.length, 0),
      publishedCoverageDomains: model.records.reduce(
        (sum, record) => sum + record.coverage.length,
        0,
      ),
      // Distinct interactions, not attachments. Every other node type carries a
      // singular recordId and so is attached once, but an interaction is published on
      // each of its participating records — summing lengths would report this corpus's
      // 50 interactions as 59 and break the epic's asserted count.
      publishedInteractions: new Set(
        model.records.flatMap((record) =>
          record.interactions.map((entry) => entry.interactionId),
        ),
      ).size,
      publishedPinMaps: model.records.reduce((sum, record) => sum + record.pinMaps.length, 0),
      publishedIntegrationRules: model.integration.length,
    },
  });

  return { pages, report, emitted, drift };
}

/** Keep failure detail bounded; a validator can print a lot on a bad day. */
function tail(value: string, limit = 2000): string {
  const trimmed = value.trimEnd();
  return trimmed.length <= limit ? trimmed : `…${trimmed.slice(-limit)}`;
}
