/**
 * The provider-neutral public view model.
 *
 * This is the ONLY shape the renderer sees. It contains no file paths, no
 * provider identifiers, no raw JSON, and every string is already `SafeText`.
 * A different evidence provider (a different circuit, a different repository,
 * a different validator) can populate the same shape without the renderer
 * changing.
 *
 * Ownership of population:
 *   - `corpus` and `records[].identity` — Wave 1 (this module's adapter).
 *   - `records[].facts/sources/coverage/interactions/pinMaps` — issue #59.
 *   - `integration` — issue #63.
 * The TYPES are frozen here in Wave 1 so #59/#60/#63 code against one shape.
 * `PublicIntegrationRule` gained `calculations` and `evidenceChain` in #63 —
 * both are provider data the rules carry and the integration route is required
 * to publish; see ARCHITECTURE.md §5 for why that did not bump the version.
 *
 * Every leaf below has exactly one `FieldKey` in `publication.ts`. Adding a
 * leaf without adding its key is a compile error.
 */

import type { Anchor, Slug } from "./ids.ts";
import type { SafeText } from "./text.ts";
import type { SafeUrl } from "./url.ts";

/**
 * Adapters negotiate on this. Bumped when the shape changes incompatibly —
 * **except for the duration of epic #57**, where it deliberately stays at 1
 * through such changes because core and the only adapter compile together from
 * one repository, so a skew is a compile error long before this number is read,
 * and nothing outside the repository has ever consumed v1. It becomes a real
 * boundary at extraction, and the rule then applies literally. Full reasoning
 * and the epic's two incompatible changes: ARCHITECTURE.md §5.
 */
export const VIEW_MODEL_VERSION = 1;

export type ViewModelVersion = typeof VIEW_MODEL_VERSION;

/** Which provider produced this model, and against which of its contracts. */
export type ProviderIdentity = {
  /** Stable provider id, e.g. `"circuit-component-spec"`. */
  readonly id: SafeText;
  /** The provider's own frozen-contract version (NOT the view-model version). */
  readonly contractVersion: number;
};

/**
 * Corpus-level counts. Presentation-only aggregates — never a synthesised
 * pass/fail verdict for a component or for the board.
 */
export type CorpusSummary = {
  readonly ownerBundles: number;
  readonly records: number;
  readonly standaloneRecords: number;
  readonly subordinateRecords: number;
  readonly sources: number;
  readonly facts: number;
  readonly coverageDomains: number;
  readonly interactions: number;
  readonly pinMaps: number;
  readonly pins: number;
  readonly inventoryLines: number;
  readonly fittedLines: number;
  readonly dnpOrHandFitLines: number;
};

/**
 * Where a record's part is placed on a board. `dnp` is per-placement truth:
 * one line can be fitted on one board and DNP on another (board-a R17/R18 are
 * DNP provisions while board-b R3 is fitted, all on the same 5.1k line), so
 * fit state must survive to each row, not only as a line-level rollup.
 */
export type PublicPlacement = {
  readonly board: SafeText;
  readonly refdes: SafeText;
  readonly dnp: boolean;
};

/** Identity of one orderable line, as published. */
export type PublicRecordIdentity = {
  readonly recordId: SafeText;
  readonly slug: Slug;
  readonly anchor: Anchor;
  readonly kind: "standalone" | "subordinate";
  /** Present only for `kind: "subordinate"`. */
  readonly parentRecordId: SafeText | null;
  readonly parentSlug: Slug | null;
  readonly lineId: SafeText;
  /**
   * The owner bundle that holds this record's evidence, e.g.
   * `component-stusb4500qtr`. `null` here always: zudo-pd runs with
   * `claudeResources: false`, so `/docs/claude-skills/<name>/` does not exist
   * as a route to link back to, and the matrix denies `record.ownerSkill`
   * accordingly (see `adapters/circuit/matrix.ts`).
   */
  readonly ownerSkill: SafeText | null;
  readonly mpn: SafeText;
  readonly manufacturer: SafeText;
  readonly lcsc: SafeText;
  readonly packageName: SafeText;
  readonly function: SafeText;
  /** Verbatim provider state strings, e.g. `VERIFIED` / `UNRESOLVED`. */
  readonly identityState: SafeText;
  readonly sourceState: SafeText;
  readonly dnp: boolean;
  readonly placements: readonly PublicPlacement[];
};

/** Search/routing aliases. Powers exact-term discovery in the catalog index. */
export type PublicAliases = {
  readonly mpn: readonly SafeText[];
  readonly lcsc: readonly SafeText[];
  readonly manufacturer: readonly SafeText[];
  readonly function: readonly SafeText[];
};

/**
 * One evidence source. `url` is `null` whenever the URL was denied by policy —
 * the source itself still publishes so a reader can see that evidence exists
 * and what state it is in.
 */
export type PublicSource = {
  readonly sourceId: SafeText;
  readonly anchor: Anchor;
  readonly documentTitle: SafeText;
  readonly documentNumber: SafeText;
  readonly revision: SafeText;
  readonly documentDate: SafeText;
  readonly retrievalDate: SafeText;
  readonly authorityClass: SafeText;
  /** `AVAILABLE` or `SOURCE UNAVAILABLE`, verbatim. */
  readonly availability: SafeText;
  readonly locator: SafeText;
  readonly printedPageLabel: SafeText;
  readonly url: SafeUrl | null;
};

/**
 * One key/value pair of a structured fact value.
 *
 * Entries are sorted by key with `byCodeUnit` so the rendered order is stable
 * across machines — JSON object key order is an artefact of how the evidence
 * file was written, not a claim the evidence makes.
 */
export type PublicFactValueEntry = {
  readonly key: SafeText;
  readonly value: number | SafeText;
};

/**
 * A fact value in its original JSON shape.
 *
 * A number stays a number so the page renders `42` and not `"42"`, and an
 * object stays an object: three facts in this corpus record a distributor
 * identity binding as `{lcsc, manufacturer, mpn, variant}`, and flattening
 * that into one string would be exactly the lossy coercion the contract
 * forbids. There is no fourth shape — a boolean, array or null value is a
 * fatal `ADAPTER_CONTRACT`, not something to guess a rendering for.
 */
export type PublicFactValue = number | SafeText | readonly PublicFactValueEntry[];

/**
 * One fact. Value keeps its original JSON shape, and unit/conditions stay
 * separate fields so nothing has to be re-parsed out of prose.
 */
export type PublicFact = {
  readonly factId: SafeText;
  readonly anchor: Anchor;
  readonly recordId: SafeText;
  readonly sourceId: SafeText;
  readonly factClass: SafeText;
  readonly value: PublicFactValue;
  readonly unit: SafeText;
  readonly conditions: SafeText;
  readonly locator: SafeText;
  readonly provenance: SafeText;
  readonly verdict: SafeText;
  readonly dependsOn: readonly SafeText[];
  /** Empty for raw facts; an evaluable arithmetic expression for calculated ones. */
  readonly expression: SafeText;
};

/** One coverage domain. `status` is per-domain and is never rolled up. */
export type PublicCoverage = {
  readonly coverageId: SafeText;
  readonly anchor: Anchor;
  readonly recordId: SafeText;
  readonly domain: SafeText;
  readonly status: "COVERED" | "OPEN";
  readonly reason: SafeText;
  readonly factIds: readonly SafeText[];
  readonly blockingFactIds: readonly SafeText[];
};

/** One cross-record interaction. */
export type PublicInteraction = {
  readonly interactionId: SafeText;
  readonly anchor: Anchor;
  readonly recordIds: readonly SafeText[];
  readonly factIds: readonly SafeText[];
  readonly conditions: SafeText;
  readonly verdict: SafeText;
};

export type PublicPin = {
  readonly symbolPin: SafeText;
  readonly name: SafeText;
  readonly footprintPad: SafeText;
  readonly function: SafeText;
};

export type PublicPinMap = {
  readonly pinMapId: SafeText;
  readonly anchor: Anchor;
  readonly recordId: SafeText;
  readonly symbol: SafeText;
  readonly footprint: SafeText;
  readonly pins: readonly PublicPin[];
};

export type PublicDocumentKind = "datasheet" | "specification" | "drawing";

/** The one reviewed, PDF-representing shortcut for a record. */
export type PublicDocumentReference = {
  readonly sourceId: SafeText;
  /** The source's own title, preserved rather than replaced by UI wording. */
  readonly documentTitle: SafeText;
  /** Exactly one of Datasheet PDF / Specification PDF / Mechanical drawing PDF. */
  readonly label: SafeText;
  readonly authorityClass: SafeText;
  readonly url: SafeUrl;
  readonly availability: SafeText;
  readonly documentKind: PublicDocumentKind;
};

export type PublicTransform3d = {
  readonly x: number;
  readonly y: number;
  readonly z: number;
};

/** A safe local WRL descriptor, derived from one canonical KiCad footprint. */
export type PublicPackageModel = {
  readonly modelPath: SafeText;
  readonly offset: PublicTransform3d;
  readonly rotation: PublicTransform3d;
  readonly scale: PublicTransform3d;
};

/**
 * The footprint half of a record's references.
 *
 * Unlike led-lamp's, the model is optional: `model` is `null` and
 * `modelUnresolvedReason` states why whenever no reviewed WRL/STEP pair backs
 * this package. Exactly one of the two is set — the adapter never produces a
 * reference with both or with neither.
 */
export type PublicFootprintReference = {
  readonly packageId: SafeText;
  readonly footprintName: SafeText;
  /**
   * The reviewed `.kicad_mod` source path, repo-root-relative — provenance
   * for the rendered footprint preview, not the preview asset URL itself
   * (which is derived from `footprintName`; see `matrix.ts`'s
   * `reference.footprint.path`).
   */
  readonly footprintPath: SafeText;
  readonly model: PublicPackageModel | null;
  readonly modelUnresolvedReason: SafeText | null;
};

/**
 * A record's curated reference shortcuts. The footprint is always known (it
 * comes from the reviewed pin map); the document and the 3D model are each
 * independently optional, and each carries its own reason when absent so the
 * page can name why rather than drop the card.
 *
 * `PublicPackagePreview` / `packagePreviews` are still NOT ported: they are
 * the deduplicated input to led-lamp's preview GENERATOR, which has no
 * counterpart here yet. The deduplicated package list lives on the adapter's
 * `CircuitReferenceContract` in the meantime.
 */
export type PublicRecordReference = {
  readonly document: PublicDocumentReference | null;
  readonly documentUnresolvedReason: SafeText | null;
  readonly footprint: PublicFootprintReference;
};

/** One published record page's complete data. */
export type PublicRecord = {
  readonly identity: PublicRecordIdentity;
  readonly aliases: PublicAliases;
  readonly sources: readonly PublicSource[];
  readonly facts: readonly PublicFact[];
  readonly coverage: readonly PublicCoverage[];
  readonly interactions: readonly PublicInteraction[];
  readonly pinMaps: readonly PublicPinMap[];
  /**
   * Always present — the footprint identity always resolves. Its document and
   * model halves may each be unresolved, with a stated reason.
   */
  readonly reference: PublicRecordReference;
};

/**
 * One evaluated case of a conditioned calculation.
 *
 * The provider records a calculation either as a single result or as a list of
 * cases evaluated at different inputs — `calc-q1-steady-vgs` is evaluated at
 * 15 V, 20 V and 32.4 V, and the three answers are the substance of the rule.
 * Both forms normalise to this: `inputs` are the varied parameters of the case
 * (empty when the calculation has none) and `value` is the result the provider
 * recorded under the calculation's `resultKey`.
 *
 * Values are carried, never recomputed. The expression is published so a reader
 * can redo the arithmetic themselves; the generator evaluating it would make
 * the page a second, disagreeing calculator.
 */
export type PublicRuleCalculationCase = {
  readonly inputs: readonly PublicFactValueEntry[];
  readonly value: number | SafeText;
};

/**
 * One conditioned calculation belonging to an integration rule.
 *
 * `conditions` is load-bearing and is never abridged: every one of these in the
 * corpus says in words what the number is NOT proof of ("ideal steady
 * VBEN-low divider only", "not proof of the real installed sharing"). A
 * calculation published without it is exactly the friendly implied PASS this
 * section refuses to make.
 */
export type PublicRuleCalculation = {
  readonly calculationId: SafeText;
  readonly anchor: Anchor;
  readonly factIds: readonly SafeText[];
  readonly expression: SafeText;
  /** Which key of each case carries the result, e.g. `margin_v`. */
  readonly resultKey: SafeText;
  readonly conditions: SafeText;
  readonly cases: readonly PublicRuleCalculationCase[];
};

/**
 * One stage of a rule's source-to-bench evidence chain.
 *
 * `status` is per-stage and verbatim. A completed upstream stage never implies
 * a later one, so these are published as the ordered list the provider recorded
 * and are never reduced to a single "how far along" figure.
 */
export type PublicRuleEvidenceStage = {
  readonly stage: SafeText;
  readonly status: SafeText;
  readonly factIds: readonly SafeText[];
};

/** One cross-component rule, published on the integration page. */
export type PublicIntegrationRule = {
  readonly ruleId: SafeText;
  readonly anchor: Anchor;
  /**
   * The bundle this rule's evidence lives in, e.g. `circuit-spec-integration`.
   *
   * The same role `PublicRecordIdentity.ownerSkill` plays for a record: it is
   * what lets the integration page link back to the raw agent resource it is a
   * projection of, without `core/` knowing any provider's directory names.
   * `null` always for zudo-pd, for the same reason as the record-level field —
   * `matrix.ts` denies `integration.ownerSkill` because `claudeResources` is
   * `false` and no `/docs/claude-skills/<name>/` route exists to link to.
   */
  readonly ownerSkill: SafeText | null;
  readonly domain: SafeText;
  readonly recordIds: readonly SafeText[];
  readonly factIds: readonly SafeText[];
  readonly conditions: SafeText;
  readonly verdict: SafeText;
  readonly refusal: SafeText;
  /** Empty for a rule the provider records no conditioned arithmetic for. */
  readonly calculations: readonly PublicRuleCalculation[];
  /** Empty for every rule but the one that tracks the chain explicitly. */
  readonly evidenceChain: readonly PublicRuleEvidenceStage[];
};

export type PublicViewModel = {
  readonly version: ViewModelVersion;
  readonly provider: ProviderIdentity;
  readonly corpus: CorpusSummary;
  /** Deterministically ordered: inventory-line order, parents before children. */
  readonly records: readonly PublicRecord[];
  readonly integration: readonly PublicIntegrationRule[];
};
