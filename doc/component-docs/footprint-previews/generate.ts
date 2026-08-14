import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative } from "node:path";
import { promisify } from "node:util";

import { CIRCUIT_SELECTION } from "../adapters/circuit/selection.ts";
import { fail } from "../core/errors.ts";
import {
  EXPORT_LAYERS,
  EXPORT_OPTIONS,
  EXPORT_THEME,
  FOOTPRINT_ROOT,
  KICAD_IMAGE,
  KICAD_PLATFORM,
  KICAD_VERSION,
  PREVIEW_FORMAT_VERSION,
  PREVIEW_MANIFEST,
  PREVIEW_ROOT,
} from "./config.ts";
import { suppressFootprintText } from "./footprint.ts";
import { aggregateHash, sha256 } from "./hash.ts";
import type { FootprintPreviewEntry, FootprintPreviewManifest, FootprintSelection } from "./manifest.ts";
import { assertFootprintLibraryParity } from "./parity.ts";
import { readFootprintSelections } from "./selection.ts";
import { normalizeSvg } from "./svg.ts";

const execFileAsync = promisify(execFile);

export async function generateFootprintPreviews(
  requestedSelections?: readonly FootprintSelection[],
): Promise<FootprintPreviewManifest> {
  await assertFootprintLibraryParity();
  const selections = requestedSelections ?? await readFootprintSelections();
  assertSelection(selections);
  const temporaryRoot = await mkdtemp(join(tmpdir(), "zpd-footprint-previews-"));
  const libraryRoot = join(temporaryRoot, "preview.pretty");
  const exportRoot = join(temporaryRoot, "export");
  const canonicalBefore = new Map<string, string>();
  try {
    await mkdir(libraryRoot);
    await mkdir(exportRoot);
    for (const selection of selections) {
      const canonical = await readFile(join(FOOTPRINT_ROOT, `${selection.footprintName}.kicad_mod`));
      canonicalBefore.set(selection.footprintName, sha256(canonical));
      const exportOnly = suppressFootprintText(canonical.toString("utf8"));
      await writeFile(join(libraryRoot, `${selection.footprintName}.kicad_mod`), exportOnly, "utf8");
    }

    const version = await runContainer(["kicad-cli", "--version"], temporaryRoot);
    if (version.trim() !== KICAD_VERSION) {
      throw new Error(`pinned renderer reported unexpected version: ${version.trim()}`);
    }
    await runContainer([
      "kicad-cli", "fp", "export", "svg",
      "--layers", EXPORT_LAYERS.join(","),
      "--theme", EXPORT_THEME,
      ...EXPORT_OPTIONS,
      "--output", "/work/export",
      "/work/preview.pretty",
    ], temporaryRoot);

    const emitted = (await readdir(exportRoot)).sort();
    const expected = selections.map((selection) => `${selection.footprintName}.svg`).sort();
    if (JSON.stringify(emitted) !== JSON.stringify(expected)) {
      throw new Error(`renderer output inventory mismatch: expected ${expected.join(", ")}; got ${emitted.join(", ")}`);
    }

    const entries: FootprintPreviewEntry[] = [];
    const outputs = new Map<string, string>();
    for (const selection of selections) {
      const filename = `${selection.footprintName}.svg`;
      const normalized = normalizeSvg(await readFile(join(exportRoot, filename), "utf8"));
      outputs.set(filename, normalized);
      entries.push({
        ...selection,
        assetPath: `/assets/component-previews/footprints/${filename}`,
        canonicalInputSha256: canonicalBefore.get(selection.footprintName) as string,
        generatedOutputSha256: sha256(normalized),
      });
    }
    const manifest: FootprintPreviewManifest = {
      formatVersion: PREVIEW_FORMAT_VERSION,
      renderer: { image: KICAD_IMAGE, version: KICAD_VERSION },
      export: {
        layers: EXPORT_LAYERS,
        theme: EXPORT_THEME,
        options: EXPORT_OPTIONS,
        textPolicy: "suppress-all-fp-text-in-temporary-library",
        postprocessor: "repository-svg-normalizer-v1",
      },
      canonicalInputSha256: aggregateHash(entries.map((entry) => ({ path: entry.footprintPath, sha256: entry.canonicalInputSha256 }))),
      generatedOutputSha256: aggregateHash(entries.map((entry) => ({ path: entry.assetPath, sha256: entry.generatedOutputSha256 }))),
      packages: entries,
    };
    for (const selection of selections) {
      const canonicalAfter = sha256(await readFile(join(FOOTPRINT_ROOT, `${selection.footprintName}.kicad_mod`)));
      if (canonicalAfter !== canonicalBefore.get(selection.footprintName)) {
        throw new Error(`canonical footprint changed during generation: ${selection.footprintName}`);
      }
    }
    // This directory is exclusively generated. Replacing it after every input,
    // renderer output, and canonical immutability check has passed guarantees
    // regeneration also prunes stale assets from a previous selection.
    await rm(PREVIEW_ROOT, { recursive: true, force: true });
    await mkdir(PREVIEW_ROOT, { recursive: true });
    for (const [filename, normalized] of outputs) await writeFile(join(PREVIEW_ROOT, filename), normalized, "utf8");
    await writeFile(PREVIEW_MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    return manifest;
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runContainer(arguments_: readonly string[], mount: string): Promise<string> {
  const { stdout, stderr } = await execFileAsync("docker", [
    // KICAD_IMAGE's manifest list carries linux/amd64 only — no arm64 entry — so on an
    // ARM host (Apple Silicon, ARM CI) both pull and run fail with "no matching manifest
    // for linux/arm64/v8" unless the platform is stated. Emulated amd64 was verified to
    // reproduce the committed SVG bytes exactly, so pinning it here costs nothing on an
    // amd64 host and is what makes the renderer portable.
    "run", "--rm", "--platform", KICAD_PLATFORM, "--network", "none",
    "--mount", `type=bind,src=${mount},dst=/work`, KICAD_IMAGE,
    ...arguments_,
  ], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (stderr.trim() !== "") process.stderr.write(stderr);
  return stdout;
}

/**
 * The expected counts are read from `CIRCUIT_SELECTION.expect`, not literals
 * here: led-lamp hardcodes 22 packages / 32 record aliases in this file, but
 * zudo-pd's is a reviewed number that changes with the selection (see
 * `references.ts`'s `readCircuitReferenceContract()`, which applies the same
 * rule to `expect.footprintPackages`). A promotion or bundle addition has to
 * update the count in the one reviewed place, not in a second copy here.
 */
function assertSelection(selections: readonly FootprintSelection[]): void {
  const expectedPackages = CIRCUIT_SELECTION.expect.footprintPackages;
  const expectedRecords = CIRCUIT_SELECTION.expect.records;
  if (selections.length !== expectedPackages) {
    fail("ADAPTER_CONTRACT", `expected exactly ${expectedPackages} selected packages`, {
      expected: expectedPackages,
      actual: selections.length,
    });
  }
  const names = new Set<string>();
  const records = new Set<string>();
  for (const selection of selections) {
    if (!/^[A-Za-z0-9][A-Za-z0-9._+-]*$/u.test(selection.footprintName)) throw new Error("unsafe footprint name");
    if (names.has(selection.footprintName)) throw new Error(`duplicate footprint ${selection.footprintName}`);
    names.add(selection.footprintName);
    for (const recordId of selection.recordIds) {
      if (records.has(recordId)) throw new Error(`record ${recordId} maps to multiple packages`);
      records.add(recordId);
    }
  }
  if (records.size !== expectedRecords) {
    fail("ADAPTER_CONTRACT", `expected aliases to cover ${expectedRecords} records`, {
      expected: expectedRecords,
      actual: records.size,
    });
  }
}

if (process.argv[1] !== undefined && basename(process.argv[1]) === "generate.ts") {
  const manifest = await generateFootprintPreviews();
  process.stdout.write(`Generated ${manifest.packages.length} footprint previews in ${relative(process.cwd(), PREVIEW_ROOT)}\n`);
}
