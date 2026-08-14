/**
 * Fail-closed construction of the circuit's reviewed document and KiCad
 * preview contract. Network verification is deliberately NOT performed here:
 * it is a human audit that changes committed selection, while generation must
 * remain deterministic and offline.
 *
 * ## Fork from led-lamp: the model half is optional
 *
 * led-lamp's `readPackage()` is a single fail-closed function that, per
 * footprint, REQUIRES exactly one `(model "…")` line, a `${KIPRJMOD}`-rooted
 * prefix into its own `.3dshapes` directory, an existing size-checked `.wrl`,
 * an existing same-basename `.step`, and VRML validation. Its
 * `CircuitPackageReference` carries `modelPath`/`offset`/`rotation`/`scale` as
 * required fields.
 *
 * At the time this fork was written, zudo-pd had zero `.wrl`/`.step` files:
 * every footprint either carried no `(model …)` line at all or pointed at
 * `${EASYEDA2KICAD}` / a stale `tmp/` path, none of which resolved to
 * anything committed. Porting led-lamp's version verbatim would have failed
 * every record on the first footprint. Wave 7 later sourced a reviewed pair
 * for every package `easyeda2kicad` could supply one for (27 of 27 published
 * packages), but the fork stands: a package the tool genuinely cannot supply
 * a model for is not a hypothetical this design has to keep tolerating.
 *
 * So the model half is resolved OPTIONALLY here: every check led-lamp performs
 * still runs, and every one of them is still fatal for a model that claims to
 * be local and reviewed, but a model that is simply ABSENT — no line, or a
 * line pointing outside this repository's asset root — yields
 * `model: undefined` plus a `modelUnresolvedReason` naming why, which the
 * record page renders as an explicit unresolved card. The document half is
 * optional for the same reason in the opposite direction: `documentSelections`
 * is curated per record, and a record with no manufacturer document at all
 * (`rec-c335982` has one `DISTRIBUTOR_IDENTITY` source and no datasheet) must
 * be able to say so rather than block the build. Optional is not unchecked:
 * every such record is named in `documentExceptions` with its own reason, and
 * `PublicationPolicy` refuses a corpus where the two lists do not partition
 * `recordIds` exactly.
 *
 * A model that IS present and local is validated exactly as strictly as in
 * led-lamp — the relaxation is only about absence, never about trust.
 */

import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative } from "node:path";

import { fail } from "../../core/errors.ts";
import type { InstanceSelection } from "../../core/publication.ts";
import type { EvidenceIndex, IndexedRecord, ProviderSource } from "./evidence.ts";
import { FOOTPRINT_ROOT, MODEL_ROOT, REPO_ROOT } from "./paths.ts";

export const REFERENCE_LIMITS = {
  footprintBytes: 512 * 1024,
  modelBytes: 2 * 1024 * 1024,
  aggregateModelBytes: 8 * 1024 * 1024,
} as const;

export type Transform3d = { readonly x: number; readonly y: number; readonly z: number };

export type CircuitDocumentReference = {
  readonly recordId: string;
  readonly source: ProviderSource;
  readonly documentKind: "datasheet" | "specification" | "drawing";
};

/**
 * The 3D half of a package reference. Present only when the footprint names a
 * reviewed local WRL that exists next to a same-basename STEP; grouped into
 * one object so "all four values or none" is structural rather than four
 * independent optional fields a caller could half-check.
 */
export type CircuitPackageModel = {
  readonly modelPath: string;
  readonly offset: Transform3d;
  readonly rotation: Transform3d;
  readonly scale: Transform3d;
};

export type CircuitPackageReference = {
  readonly packageId: string;
  readonly footprintName: string;
  readonly footprintPath: string;
  /** Absent while no reviewed WRL/STEP pair exists for this footprint. */
  readonly model?: CircuitPackageModel;
  /** Set exactly when `model` is absent. Rendered as the unresolved reason. */
  readonly modelUnresolvedReason?: string;
  readonly recordIds: readonly string[];
};

export type CircuitReferenceContract = {
  readonly documentsByRecordId: ReadonlyMap<string, CircuitDocumentReference>;
  /**
   * Why a record has no entry in `documentsByRecordId`, in the reviewer's own
   * words. Exactly complementary to that map — `PublicationPolicy` refuses a
   * selection where any record is in neither or in both.
   */
  readonly documentUnresolvedReasonByRecordId: ReadonlyMap<string, string>;
  readonly packages: readonly CircuitPackageReference[];
  readonly packageByRecordId: ReadonlyMap<string, CircuitPackageReference>;
};

const SAFE_BASENAME = /^[A-Za-z0-9][A-Za-z0-9._+-]*$/u;
const MODEL_PREFIX = "${KIPRJMOD}/../../footprints/kicad/zudo-pd.3dshapes/";
const ALLOWED_VRML_NODES = new Set([
  "Appearance",
  "Coordinate",
  "IndexedFaceSet",
  "Material",
  "Shape",
]);

export async function readCircuitReferenceContract(
  index: EvidenceIndex,
  selection: InstanceSelection,
): Promise<CircuitReferenceContract> {
  const documentsByRecordId = selectDocuments(index, selection);
  const documentUnresolvedReasonByRecordId = selectDocumentExceptions(index, selection);
  const packageByRecordId = new Map<string, CircuitPackageReference>();
  const packagesByName = new Map<string, CircuitPackageReference>();
  let aggregateModelBytes = 0;

  for (const recordId of selection.recordIds) {
    const entry = index.recordById.get(recordId);
    if (entry === undefined) fail("STALE_SELECTION", `missing record ${recordId}`, { recordId });
    const footprintName = canonicalFootprint(entry);
    let packageReference = packagesByName.get(footprintName);
    if (packageReference === undefined) {
      packageReference = await readPackage(footprintName, recordId);
      if (packageReference.model !== undefined) {
        aggregateModelBytes += await fileSize(
          join(REPO_ROOT, packageReference.model.modelPath),
          "model",
          recordId,
        );
        assertReferenceSize("aggregate", aggregateModelBytes, recordId);
      }
      packagesByName.set(footprintName, packageReference);
    }
    const recordIds = [...packageReference.recordIds, recordId];
    packageReference = { ...packageReference, recordIds };
    packagesByName.set(footprintName, packageReference);
    packageByRecordId.set(recordId, packageReference);
    // Replace earlier record lookups with the immutable descriptor carrying the
    // complete shared-record list.
    for (const sharedRecordId of recordIds) packageByRecordId.set(sharedRecordId, packageReference);
  }

  // The expected count is a reviewed number in the selection, not a literal
  // here: promoting a replacement candidate or adding a bundle changes both
  // the record list and the package collapse, and both must be updated in the
  // same reviewed place. led-lamp hardcodes its 22 in this file instead.
  const packages = [...packagesByName.values()];
  const expected = selection.expect.footprintPackages;
  if (packages.length !== expected) {
    fail("ADAPTER_CONTRACT", `preview manifest must contain exactly ${expected} packages`, {
      expected,
      actual: packages.length,
    });
  }
  return { documentsByRecordId, documentUnresolvedReasonByRecordId, packages, packageByRecordId };
}

export function selectDocuments(
  index: EvidenceIndex,
  selection: InstanceSelection,
): ReadonlyMap<string, CircuitDocumentReference> {
  const result = new Map<string, CircuitDocumentReference>();
  for (const selected of selection.documentSelections) {
    const record = index.recordById.get(selected.recordId);
    const source = record?.sources.find((candidate) => candidate.source_id === selected.sourceId);
    if (record === undefined || source === undefined || source.record_id !== selected.recordId) {
      fail("STALE_SELECTION", "document selection does not resolve within its record", {
        recordId: selected.recordId,
        sourceId: selected.sourceId,
      });
    }
    if (!/^https?:\/\//u.test(source.authoritative_url)) {
      fail("PUBLICATION_POLICY", "selected document does not have an allowed public URL", {
        recordId: selected.recordId,
        sourceId: selected.sourceId,
      });
    }
    result.set(selected.recordId, {
      recordId: selected.recordId,
      source,
      documentKind: selected.documentKind,
    });
  }
  return result;
}

/**
 * The reviewed reasons for the records the audit left without a document.
 *
 * Resolved against the index for the same reason `selectDocuments` is: an
 * exception naming a record the provider no longer carries is a stale
 * selection, and a stale selection must fail rather than be skipped.
 */
export function selectDocumentExceptions(
  index: EvidenceIndex,
  selection: InstanceSelection,
): ReadonlyMap<string, string> {
  const result = new Map<string, string>();
  for (const exception of selection.documentExceptions) {
    if (!index.recordById.has(exception.recordId)) {
      fail("STALE_SELECTION", "document exception does not resolve to a record", {
        recordId: exception.recordId,
      });
    }
    result.set(exception.recordId, exception.reason);
  }
  return result;
}

export function canonicalFootprint(entry: IndexedRecord): string {
  const names = new Set(entry.pinMaps.map((pinMap) => pinMap.footprint));
  if (names.size !== 1) {
    fail("ADAPTER_CONTRACT", "record must resolve to exactly one footprint", {
      recordId: entry.record.record_id,
      footprints: [...names],
    });
  }
  const name = [...names][0];
  if (name === undefined || !SAFE_BASENAME.test(name)) {
    fail("PATH_CONTAINMENT", "record has an unsafe footprint name", {
      recordId: entry.record.record_id,
      footprint: name ?? "",
    });
  }
  return name;
}

/**
 * Exported so `footprint-previews/selection.ts` can build packages straight
 * from `canonicalFootprint()` + this function, without routing through
 * `readCircuitReferenceContract()` (which also resolves the — separately
 * curated — `documentSelections` half). Reusing this rather than
 * reimplementing it keeps the footprint-side safety (`containedFile()`
 * containment, the `REFERENCE_LIMITS.footprintBytes` cap, `SAFE_BASENAME`,
 * `footprintPath`) defined exactly once.
 */
export async function readPackage(footprintName: string, recordId: string): Promise<CircuitPackageReference> {
  const footprintFile = await containedFile(FOOTPRINT_ROOT, `${footprintName}.kicad_mod`, recordId);
  const footprintStat = await lstat(footprintFile);
  if (footprintStat.size > REFERENCE_LIMITS.footprintBytes) {
    assertReferenceSize("footprint", footprintStat.size, recordId);
  }
  const footprint = await readFile(footprintFile, "utf8");
  const identity = {
    packageId: footprintName,
    footprintName,
    footprintPath: relative(REPO_ROOT, footprintFile),
    recordIds: [] as readonly string[],
  };
  const unresolved = (modelUnresolvedReason: string): CircuitPackageReference => ({
    ...identity,
    modelUnresolvedReason,
  });

  const models = [...footprint.matchAll(/\(model\s+"([^"]+)"/gu)];
  if (models.length > 1) {
    // Ambiguity is still fatal: two models means nobody reviewed which one the
    // page would show. Only ABSENCE is tolerated.
    fail("ADAPTER_CONTRACT", "footprint must reference at most one model", {
      recordId,
      footprint: footprintName,
      modelCount: models.length,
    });
  }
  if (models.length === 0) {
    return unresolved("The KiCad footprint names no 3D model.");
  }
  const modelLocator = models[0]?.[1] ?? "";
  if (!modelLocator.startsWith(MODEL_PREFIX)) {
    // `${EASYEDA2KICAD}/…` and stale `tmp/…` locators land here. They name an
    // asset this repository does not carry, so the model is unresolved rather
    // than unsafe — but the reason repeats the locator so the page says what
    // it would take to resolve it.
    return unresolved(`The footprint's 3D model is not a reviewed local asset: ${modelLocator}`);
  }
  const modelName = modelLocator.slice(MODEL_PREFIX.length);
  if (!SAFE_BASENAME.test(modelName) || extname(modelName).toLowerCase() !== ".wrl") {
    fail("PATH_CONTAINMENT", "footprint model has an unsafe WRL name", {
      recordId,
      footprint: footprintName,
      model: modelLocator,
    });
  }
  const modelFile = await containedFile(MODEL_ROOT, modelName, recordId);
  const modelStat = await lstat(modelFile);
  if (modelStat.size > REFERENCE_LIMITS.modelBytes) {
    assertReferenceSize("model", modelStat.size, recordId);
  }
  const stepName = `${modelName.slice(0, -4)}.step`;
  assertSameBasenamePair(modelName, stepName, recordId);
  await containedFile(MODEL_ROOT, stepName, recordId);
  validateVrml(await readFile(modelFile, "utf8"), recordId, modelName);

  return {
    ...identity,
    model: {
      modelPath: relative(REPO_ROOT, modelFile),
      offset: transform(footprint, "offset", recordId, footprintName),
      rotation: transform(footprint, "rotate", recordId, footprintName),
      scale: transform(footprint, "scale", recordId, footprintName),
    },
  };
}

export function validateVrml(contents: string, recordId: string, modelName: string): void {
  const withoutComments = contents.replace(/^\s*#.*$/gmu, "");
  if (!/^\s*#VRML V2\.0 utf8/mu.test(contents)) {
    fail("ADAPTER_CONTRACT", "model is not supported VRML 2.0", { recordId, model: modelName });
  }
  if (/\.\.[/\\]/u.test(withoutComments)) {
    fail("PATH_CONTAINMENT", "model contains a traversal sequence", {
      recordId,
      model: modelName,
    });
  }
  if (/(?:https?:|file:|javascript:|data:)|\burl\s|\b(?:Inline|Script|EXTERNPROTO|PROTO|ImageTexture|MovieTexture|AudioClip|Anchor|WWWInline|LoadSensor|ROUTE|IMPORT|EXPORT|USE|IS)\b/iu.test(withoutComments)) {
    fail("PUBLICATION_POLICY", "model contains a resource-loading or executable VRML construct", {
      recordId,
      model: modelName,
    });
  }
  for (const match of withoutComments.matchAll(/\b([A-Za-z][A-Za-z0-9_]*)\s*\{/gu)) {
    const node = match[1] as string;
    if (!ALLOWED_VRML_NODES.has(node)) {
      fail("PUBLICATION_POLICY", `model contains loader-unsupported VRML node ${node}`, {
        recordId,
        model: modelName,
        node,
      });
    }
  }
}

export function assertSafePreviewAssetName(name: string, recordId: string): void {
  if (isAbsolute(name) || name.includes("/") || name.includes("\\") || !SAFE_BASENAME.test(name)) {
    fail("PATH_CONTAINMENT", "preview asset name is not a safe basename", { recordId, path: name });
  }
}

export function assertSameBasenamePair(wrlName: string, stepName: string, recordId: string): void {
  if (extname(wrlName).toLowerCase() !== ".wrl" || extname(stepName).toLowerCase() !== ".step" || basename(wrlName, extname(wrlName)) !== basename(stepName, extname(stepName))) {
    fail("ADAPTER_CONTRACT", "WRL and STEP preview assets must have the same basename", {
      recordId,
      wrl: wrlName,
      step: stepName,
    });
  }
}

export function assertReferenceSize(kind: "footprint" | "model" | "aggregate", actual: number, recordId: string): void {
  const limit = kind === "footprint"
    ? REFERENCE_LIMITS.footprintBytes
    : kind === "model"
      ? REFERENCE_LIMITS.modelBytes
      : REFERENCE_LIMITS.aggregateModelBytes;
  if (!Number.isSafeInteger(actual) || actual < 0 || actual > limit) sizeFailure(kind, recordId, actual, limit);
}

function transform(body: string, key: string, recordId: string, footprint: string): Transform3d {
  const match = new RegExp(`\\(${key}\\s+\\(xyz\\s+([^\\s)]+)\\s+([^\\s)]+)\\s+([^\\s)]+)\\)\\)`, "u").exec(body);
  if (match === null) {
    fail("ADAPTER_CONTRACT", `footprint model has no ${key} transform`, { recordId, footprint });
  }
  const values = match.slice(1).map(Number);
  if (values.some((value) => !Number.isFinite(value))) {
    fail("ADAPTER_CONTRACT", `footprint model has invalid ${key} transform`, { recordId, footprint });
  }
  return { x: values[0] as number, y: values[1] as number, z: values[2] as number };
}

async function containedFile(root: string, name: string, recordId: string): Promise<string> {
  assertSafePreviewAssetName(name, recordId);
  let canonicalRoot: string;
  let canonicalFile: string;
  try {
    canonicalRoot = await realpath(root);
    canonicalFile = await realpath(join(root, name));
  } catch (error) {
    fail("ADAPTER_CONTRACT", "preview asset is missing", {
      recordId,
      path: relative(REPO_ROOT, join(root, name)),
      cause: error instanceof Error ? error.message : String(error),
    });
  }
  const rel = relative(canonicalRoot, canonicalFile);
  if (rel.startsWith("..") || isAbsolute(rel)) {
    fail("PATH_CONTAINMENT", "preview asset escapes its allowed root", { recordId, path: name });
  }
  const stat = await lstat(join(root, name));
  if (!stat.isFile() || stat.isSymbolicLink()) {
    fail("PATH_CONTAINMENT", "preview asset must be a regular non-symlink file", { recordId, path: name });
  }
  return canonicalFile;
}

async function fileSize(path: string, kind: string, recordId: string): Promise<number> {
  try {
    return (await lstat(path)).size;
  } catch {
    fail("ADAPTER_CONTRACT", `${kind} asset is missing`, { recordId, path });
  }
}

function sizeFailure(kind: string, recordId: string, actual: number, limit: number): never {
  fail("PUBLICATION_POLICY", `${kind} exceeds preview size limit`, {
    recordId,
    actualBytes: actual,
    limitBytes: limit,
  });
}
