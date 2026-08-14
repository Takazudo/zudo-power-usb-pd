import { basename, join } from "node:path";
import { lstat, readFile, readdir } from "node:fs/promises";

import { CIRCUIT_SELECTION } from "../adapters/circuit/selection.ts";
import { fail } from "../core/errors.ts";
import {
  EXPORT_LAYERS, EXPORT_OPTIONS, EXPORT_THEME, FOOTPRINT_ROOT, KICAD_IMAGE, KICAD_VERSION,
  PREVIEW_FORMAT_VERSION, PREVIEW_MANIFEST, PREVIEW_ROOT,
} from "./config.ts";
import { aggregateHash, sha256 } from "./hash.ts";
import type { FootprintPreviewManifest, FootprintSelection } from "./manifest.ts";
import { assertFootprintLibraryParity } from "./parity.ts";
import { readFootprintSelections } from "./selection.ts";
import { validateSvg } from "./svg.ts";

export async function checkFootprintPreviews(
  requestedSelections?: readonly FootprintSelection[],
  root = PREVIEW_ROOT,
  footprintRoot = FOOTPRINT_ROOT,
  masterRoot?: string,
): Promise<void> {
  await assertFootprintLibraryParity(masterRoot, footprintRoot);
  const selections = requestedSelections ?? await readFootprintSelections();
  const manifestPath = root === PREVIEW_ROOT ? PREVIEW_MANIFEST : join(root, "manifest.json");
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error("footprint preview root must be a real directory");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as FootprintPreviewManifest;
  assertMetadata(manifest);
  // Read from `CIRCUIT_SELECTION.expect` rather than a literal — see
  // `generate.ts`'s `assertSelection()` for why.
  const expectedPackages = CIRCUIT_SELECTION.expect.footprintPackages;
  if (manifest.packages.length !== expectedPackages || selections.length !== expectedPackages) {
    fail("ADAPTER_CONTRACT", `manifest and selection must contain exactly ${expectedPackages} packages`, {
      expected: expectedPackages,
      manifestActual: manifest.packages.length,
      selectionActual: selections.length,
    });
  }
  const expectedFiles = new Set(["manifest.json", ...selections.map((entry) => `${entry.footprintName}.svg`)]);
  const actualFiles = await readdir(root);
  for (const filename of actualFiles) if (!expectedFiles.has(filename)) throw new Error(`extra footprint preview output: ${filename}`);
  for (const filename of expectedFiles) if (!actualFiles.includes(filename)) throw new Error(`missing footprint preview output: ${filename}`);
  for (const filename of actualFiles) {
    const stat = await lstat(join(root, filename));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`footprint preview output is not a regular file: ${filename}`);
  }

  const inputHashes: Array<{ path: string; sha256: string }> = [];
  const outputHashes: Array<{ path: string; sha256: string }> = [];
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index] as FootprintSelection;
    const entry = manifest.packages[index];
    if (entry === undefined || JSON.stringify(pickSelection(entry)) !== JSON.stringify(selection)) {
      throw new Error(`stale package selection at index ${index}`);
    }
    const expectedAssetPath = `/assets/component-previews/footprints/${selection.footprintName}.svg`;
    if (entry.assetPath !== expectedAssetPath) throw new Error(`unsafe or stale asset path for ${selection.packageId}`);
    const inputHash = sha256(await readFile(join(footprintRoot, `${selection.footprintName}.kicad_mod`)));
    if (entry.canonicalInputSha256 !== inputHash) throw new Error(`stale canonical input hash for ${selection.packageId}`);
    const svg = await readFile(join(root, `${selection.footprintName}.svg`), "utf8");
    validateSvg(svg);
    if (/REF\*\*|%R|<text\b|class="stroked-text"/iu.test(svg)) throw new Error(`visible footprint text survived in ${selection.packageId}`);
    const outputHash = sha256(svg);
    if (entry.generatedOutputSha256 !== outputHash) throw new Error(`stale generated output hash for ${selection.packageId}`);
    inputHashes.push({ path: entry.footprintPath, sha256: inputHash });
    outputHashes.push({ path: entry.assetPath, sha256: outputHash });
  }
  if (manifest.canonicalInputSha256 !== aggregateHash(inputHashes)) throw new Error("aggregate canonical input hash is stale");
  if (manifest.generatedOutputSha256 !== aggregateHash(outputHashes)) throw new Error("aggregate generated output hash is stale");
}

function assertMetadata(manifest: FootprintPreviewManifest): void {
  if (manifest.formatVersion !== PREVIEW_FORMAT_VERSION || manifest.renderer.image !== KICAD_IMAGE || manifest.renderer.version !== KICAD_VERSION) {
    throw new Error("footprint renderer metadata is stale");
  }
  if (JSON.stringify(manifest.export.layers) !== JSON.stringify(EXPORT_LAYERS) || manifest.export.theme !== EXPORT_THEME || JSON.stringify(manifest.export.options) !== JSON.stringify(EXPORT_OPTIONS) || manifest.export.textPolicy !== "suppress-all-fp-text-in-temporary-library" || manifest.export.postprocessor !== "repository-svg-normalizer-v1") {
    throw new Error("footprint export contract is stale");
  }
}

function pickSelection(entry: FootprintPreviewManifest["packages"][number]): FootprintSelection {
  return { packageId: entry.packageId, footprintName: entry.footprintName, footprintPath: entry.footprintPath, recordIds: entry.recordIds };
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === "check.ts") {
  await checkFootprintPreviews();
  const selections = await readFootprintSelections();
  process.stdout.write(`${selections.length} committed footprint previews are current and safe\n`);
}
