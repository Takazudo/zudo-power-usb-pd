/**
 * Instance-level publication policy: default-zero, opt-in, and exhaustive.
 *
 * Three independent gates. A value publishes only if it clears ALL of them:
 *
 *   1. INSTANCE   — its record ID (and, for a source, its source ID) appears in
 *                   the adapter's committed `InstanceSelection`.
 *   2. FIELD      — its `FieldKey` is `PUBLISH` in the committed matrix.
 *   3. VALUE      — it survives `safeText()` / `classifyUrl()`.
 *
 * "Default-zero" is enforced structurally, not by convention:
 *   - `PublicationMatrix` is `Record<FieldKey, FieldDecision>`, so adding a
 *     leaf to the view model without recording a decision is a COMPILE ERROR;
 *   - `InstanceSelection` is an allowlist — an ID that is not listed is simply
 *     never read, and an ID that is listed but absent from the provider is a
 *     fatal `STALE_SELECTION`.
 *
 * Repository visibility is irrelevant to all three gates: a field that is
 * readable in this repo is still unpublished until it appears in the matrix.
 */

import { fail } from "./errors.ts";
import { byCodeUnit } from "./ids.ts";

/**
 * Every publishable leaf of the view model, named by its path.
 *
 * Ordering is stable and grouped by owner so the committed matrix reads like a
 * review checklist. Do not sort this list — the preflight report sorts its own
 * output.
 */
export const FIELD_KEYS = [
  // --- record identity -----------------------------------------------------
  "record.recordId",
  "record.slug",
  "record.kind",
  "record.parentRecordId",
  "record.lineId",
  "record.ownerSkill",
  "record.mpn",
  "record.manufacturer",
  "record.lcsc",
  "record.package",
  "record.function",
  "record.identityState",
  "record.sourceState",
  "record.dnp",
  "record.placements",
  // --- routing / aliases ---------------------------------------------------
  "alias.mpn",
  "alias.lcsc",
  "alias.manufacturer",
  "alias.function",
  "routing.positivePrompts",
  "routing.negativePrompts",
  // --- sources -------------------------------------------------------------
  "source.sourceId",
  "source.documentTitle",
  "source.documentNumber",
  "source.revision",
  "source.documentDate",
  "source.retrievalDate",
  "source.authorityClass",
  "source.availability",
  "source.locator",
  "source.printedPageLabel",
  "source.physicalPdfPageIndex",
  "source.authoritativeUrl",
  "source.alternateAuthoritativeUrl",
  "source.sha256",
  "source.evidenceExtract",
  // --- facts ---------------------------------------------------------------
  "fact.factId",
  "fact.class",
  "fact.value",
  "fact.unit",
  "fact.conditions",
  "fact.locator",
  "fact.provenance",
  "fact.verdict",
  "fact.dependsOn",
  "fact.expression",
  // --- coverage ------------------------------------------------------------
  "coverage.coverageId",
  "coverage.domain",
  "coverage.status",
  "coverage.reason",
  "coverage.factIds",
  "coverage.blockingFactIds",
  // --- interactions --------------------------------------------------------
  "interaction.interactionId",
  "interaction.recordIds",
  "interaction.factIds",
  "interaction.conditions",
  "interaction.verdict",
  // --- integration rules ---------------------------------------------------
  "integration.ruleId",
  "integration.ownerSkill",
  "integration.domain",
  "integration.recordIds",
  "integration.factIds",
  "integration.conditions",
  "integration.verdict",
  "integration.refusal",
  "integration.calculationId",
  "integration.calculationFactIds",
  "integration.calculationExpression",
  "integration.calculationResultKey",
  "integration.calculationResults",
  "integration.calculationConditions",
  "integration.evidenceChainStage",
  "integration.evidenceChainStatus",
  "integration.evidenceChainFactIds",
  // --- pin maps ------------------------------------------------------------
  "pinMap.pinMapId",
  "pinMap.symbol",
  "pinMap.footprint",
  "pinMap.pins",
  "pinMap.reviewedBy",
  // --- curated component references --------------------------------------
  "reference.document.sourceId",
  "reference.document.documentTitle",
  "reference.document.label",
  "reference.document.authorityClass",
  "reference.document.url",
  "reference.document.availability",
  "reference.document.documentKind",
  "reference.footprint.packageId",
  "reference.footprint.name",
  "reference.footprint.path",
  "reference.model.path",
  "reference.model.offset",
  "reference.model.rotation",
  "reference.model.scale",
  "reference.package.recordIds",
  // --- corpus aggregates ---------------------------------------------------
  "corpus.counts",
  // --- assets --------------------------------------------------------------
  // (led-lamp's `asset.footprintPreview` / `asset.modelPreview` keys are not
  // ported: the 3D/preview feature has no emitter here — see view-model.ts.)
  "asset.datasheetPdf",
  "asset.binary",
] as const;

export type FieldKey = (typeof FIELD_KEYS)[number];

export type FieldDecision = "PUBLISH" | "DENY";

/** Exhaustive by construction: every `FieldKey` needs an explicit decision. */
export type PublicationMatrix = Readonly<Record<FieldKey, FieldDecision>>;

/**
 * Explicit instance allowlist. Both sets are closed: an ID absent from the set
 * is unpublished, and an ID present but unknown to the provider is fatal.
 */
export type InstanceSelection = {
  readonly recordIds: readonly string[];
  readonly sourceIds: readonly string[];
  /**
   * Source IDs whose `authoritativeUrl` may be published. A separate, narrower
   * opt-in than `sourceIds`: selecting a source for publication does not by
   * itself publish an outbound link.
   */
  readonly linkableSourceIds: readonly string[];
  /**
   * One reviewed PDF-representing source for every selected record. This is an
   * audit decision, not a URL heuristic or a request to perform network I/O at
   * generation time.
   */
  readonly documentSelections: readonly {
    readonly recordId: string;
    readonly sourceId: string;
    readonly documentKind: "datasheet" | "specification" | "drawing";
  }[];
  /** Asserted corpus counts; a mismatch means the selection went stale. */
  readonly expect: {
    readonly records: number;
    readonly sources: number;
    /**
     * Cross-component rules. Not instance-selected — the rules live outside
     * every record and each one spans several — but the count is asserted for
     * the same reason as the other two: a rule appearing or vanishing changes
     * what the integration page claims about the whole design, and that must be
     * a reviewed change rather than a diff nobody looked at.
     */
    readonly integrationRules: number;
  };
};

export type FieldUsage = {
  readonly key: FieldKey;
  readonly decision: FieldDecision;
  /** How many values of this field the run actually emitted. */
  readonly emitted: number;
  /** How many values the run withheld because the field is denied. */
  readonly withheld: number;
};

export type UrlUsage = {
  readonly sourceId: string;
  readonly url: string;
  readonly decision: "ALLOW" | "DENY";
  readonly reason: string;
};

/**
 * The preflight report. Deterministic by construction — no timestamps, no
 * absolute paths, every list sorted — so it can be committed and diffed, and
 * so `check:components` can compare it byte-for-byte.
 */
export type PreflightReport = {
  readonly viewModelVersion: number;
  readonly provider: { readonly id: string; readonly contractVersion: number };
  readonly records: {
    readonly available: number;
    readonly selected: number;
    readonly slugs: readonly string[];
  };
  readonly sources: {
    readonly available: number;
    readonly selected: number;
    readonly linkable: number;
    readonly ids: readonly string[];
  };
  readonly fields: readonly FieldUsage[];
  readonly urls: readonly UrlUsage[];
  readonly counts: Readonly<Record<string, number>>;
};

/**
 * Runtime side of the policy. Every read of a provider value goes through
 * `publish()`, which both enforces the decision and records it for preflight —
 * so the report reflects what the generator really did, not what it declared.
 */
export class PublicationPolicy {
  readonly #matrix: PublicationMatrix;
  readonly #selection: InstanceSelection;
  readonly #recordIds: ReadonlySet<string>;
  readonly #sourceIds: ReadonlySet<string>;
  readonly #linkableSourceIds: ReadonlySet<string>;
  readonly #emitted = new Map<FieldKey, number>();
  readonly #withheld = new Map<FieldKey, number>();
  readonly #urls: UrlUsage[] = [];
  #selectionChecked = false;

  constructor(matrix: PublicationMatrix, selection: InstanceSelection) {
    this.#matrix = matrix;
    this.#selection = selection;
    this.#recordIds = new Set(selection.recordIds);
    this.#sourceIds = new Set(selection.sourceIds);
    this.#linkableSourceIds = new Set(selection.linkableSourceIds);

    for (const key of FIELD_KEYS) {
      if (matrix[key] !== "PUBLISH" && matrix[key] !== "DENY") {
        fail("PUBLICATION_POLICY", `no decision recorded for field ${key}`, { key });
      }
    }
    for (const id of selection.linkableSourceIds) {
      if (!this.#sourceIds.has(id)) {
        fail(
          "PUBLICATION_POLICY",
          `source ${id} is linkable but not selected for publication`,
          { sourceId: id },
        );
      }
    }
    const documentRecords = new Set<string>();
    for (const document of selection.documentSelections) {
      if (!this.#recordIds.has(document.recordId) || !this.#sourceIds.has(document.sourceId)) {
        fail("PUBLICATION_POLICY", "document selection is outside the selected corpus", {
          recordId: document.recordId,
          sourceId: document.sourceId,
        });
      }
      if (!this.#linkableSourceIds.has(document.sourceId)) {
        fail("PUBLICATION_POLICY", `document source ${document.sourceId} is not linkable`, {
          recordId: document.recordId,
          sourceId: document.sourceId,
        });
      }
      if (!["datasheet", "specification", "drawing"].includes(document.documentKind)) {
        fail("PUBLICATION_POLICY", `document source ${document.sourceId} has an invalid kind`, {
          recordId: document.recordId,
          sourceId: document.sourceId,
        });
      }
      if (documentRecords.has(document.recordId)) {
        fail("PUBLICATION_POLICY", `record ${document.recordId} has multiple document selections`, {
          recordId: document.recordId,
        });
      }
      documentRecords.add(document.recordId);
    }
    // An entirely empty `documentSelections` is a deliberate opt-out of the
    // curated single-document shortcut, not an incomplete review: zudo-pd
    // denies every `reference.document.*` field (no reviewed WRL/STEP audit
    // pairs exist to back a curated reference — see `matrix.ts`), so no
    // adapter here ever produces a non-empty `documentSelections` to check.
    // The completeness rule stays load-bearing for the case the feature IS
    // used: a provider that selects a document for SOME records but not
    // others still fails closed here, exactly as before.
    if (selection.documentSelections.length > 0) {
      const recordsWithoutDocument = selection.recordIds.filter((id) => !documentRecords.has(id));
      if (recordsWithoutDocument.length > 0 || documentRecords.size !== selection.recordIds.length) {
        fail("PUBLICATION_POLICY", "every selected record must have exactly one document selection", {
          recordsWithoutDocument: recordsWithoutDocument.sort(byCodeUnit),
        });
      }
    }
  }

  decision(key: FieldKey): FieldDecision {
    return this.#matrix[key];
  }

  isRecordSelected(recordId: string): boolean {
    return this.#recordIds.has(recordId);
  }

  isSourceSelected(sourceId: string): boolean {
    return this.#sourceIds.has(sourceId);
  }

  isSourceLinkable(sourceId: string): boolean {
    return this.#linkableSourceIds.has(sourceId);
  }

  /**
   * Gate one value. Returns `undefined` when the field is denied, so a caller
   * that forgets the check still cannot leak: the value never comes back.
   */
  publish<T>(key: FieldKey, value: T): T | undefined {
    if (this.#matrix[key] === "DENY") {
      bump(this.#withheld, key);
      return undefined;
    }
    bump(this.#emitted, key);
    return value;
  }

  /** Gate a value that the page structure requires. A denial is fatal. */
  publishRequired<T>(key: FieldKey, value: T): T {
    const result = this.publish(key, value);
    if (result === undefined) {
      fail("PUBLICATION_POLICY", `field ${key} is required by the page but denied`, { key });
    }
    return result;
  }

  recordUrlUsage(usage: UrlUsage): void {
    this.#urls.push(usage);
  }

  /**
   * Whether `assertSelectionFresh` ran. The pipeline treats `false` as fatal:
   * an adapter that skipped the freshness check could publish against a
   * silently shrunken corpus and nothing downstream would notice.
   */
  get selectionChecked(): boolean {
    return this.#selectionChecked;
  }

  /**
   * Fatal when the selection names instances the provider does not have. The
   * converse is intentionally NOT fatal: a provider instance that is absent
   * from the selection is simply unpublished, which is what default-zero means.
   */
  assertSelectionFresh(
    availableRecordIds: readonly string[],
    availableSourceIds: readonly string[],
    availableIntegrationRules: number,
  ): void {
    const records = new Set(availableRecordIds);
    const sources = new Set(availableSourceIds);
    const missingRecords = this.#selection.recordIds.filter((id) => !records.has(id));
    const missingSources = this.#selection.sourceIds.filter((id) => !sources.has(id));

    if (missingRecords.length > 0 || missingSources.length > 0) {
      fail("STALE_SELECTION", "selection names instances the provider does not have", {
        missingRecords: missingRecords.sort(byCodeUnit),
        missingSources: missingSources.sort(byCodeUnit),
      });
    }
    // The `expect` counts pin BOTH sides. Selection-side first: a selection
    // list that is shorter than the asserted corpus is exactly how a new
    // bundle's record once shipped with no published page — the provider had
    // it, the counts were bumped, and only the ID list was left behind.
    if (this.#selection.expect.records !== this.#selection.recordIds.length) {
      fail("STALE_SELECTION", "selection record count does not match the asserted corpus", {
        expected: this.#selection.expect.records,
        actual: this.#selection.recordIds.length,
      });
    }
    if (this.#selection.expect.sources !== this.#selection.sourceIds.length) {
      fail("STALE_SELECTION", "selection source count does not match the asserted corpus", {
        expected: this.#selection.expect.sources,
        actual: this.#selection.sourceIds.length,
      });
    }
    if (this.#selection.expect.records !== availableRecordIds.length) {
      fail("STALE_SELECTION", "provider record count does not match the asserted corpus", {
        expected: this.#selection.expect.records,
        actual: availableRecordIds.length,
      });
    }
    if (this.#selection.expect.sources !== availableSourceIds.length) {
      fail("STALE_SELECTION", "provider source count does not match the asserted corpus", {
        expected: this.#selection.expect.sources,
        actual: availableSourceIds.length,
      });
    }
    if (this.#selection.expect.integrationRules !== availableIntegrationRules) {
      fail("STALE_SELECTION", "integration rule count does not match the asserted corpus", {
        expected: this.#selection.expect.integrationRules,
        actual: availableIntegrationRules,
      });
    }
    this.#selectionChecked = true;
  }

  buildReport(input: {
    readonly viewModelVersion: number;
    readonly providerId: string;
    readonly providerContractVersion: number;
    readonly availableRecords: number;
    readonly availableSources: number;
    readonly selectedSlugs: readonly string[];
    readonly counts: Readonly<Record<string, number>>;
  }): PreflightReport {
    return {
      viewModelVersion: input.viewModelVersion,
      provider: { id: input.providerId, contractVersion: input.providerContractVersion },
      records: {
        available: input.availableRecords,
        selected: this.#selection.recordIds.length,
        slugs: [...input.selectedSlugs].sort(byCodeUnit),
      },
      sources: {
        available: input.availableSources,
        selected: this.#selection.sourceIds.length,
        linkable: this.#selection.linkableSourceIds.length,
        ids: [...this.#selection.sourceIds].sort(byCodeUnit),
      },
      fields: FIELD_KEYS.map((key) => ({
        key,
        decision: this.#matrix[key],
        emitted: this.#emitted.get(key) ?? 0,
        withheld: this.#withheld.get(key) ?? 0,
      })),
      urls: [...this.#urls].sort(
        (left, right) =>
          byCodeUnit(left.sourceId, right.sourceId) || byCodeUnit(left.url, right.url),
      ),
      counts: sortedCounts(input.counts),
    };
  }
}

function bump(counter: Map<FieldKey, number>, key: FieldKey): void {
  counter.set(key, (counter.get(key) ?? 0) + 1);
}

function sortedCounts(counts: Readonly<Record<string, number>>): Record<string, number> {
  const sorted: Record<string, number> = {};
  for (const key of Object.keys(counts).sort(byCodeUnit)) {
    sorted[key] = counts[key] as number;
  }
  return sorted;
}
