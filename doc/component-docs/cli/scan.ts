/**
 * `pnpm scan:components` — the publication-safety scan, run against `dist/`.
 *
 * This is the wiring for `core/scan.ts`: everything upstream proves the view
 * model is clean, but between the view model and the built site sit the MDX
 * compiler, the HTML minifier, the search indexer and the llms.txt writer —
 * none owned by this feature. So after `pnpm build`, this reads the actual
 * bytes under `dist/` and fails the build when any denied provider value
 * survived into them.
 *
 * Composition, in order:
 *   1. harvest the canary set from the raw evidence (`readCanaries`);
 *   2. subtract values independently published by the hand-authored narrative
 *      pages (`subtractPublishedElsewhere` against `src/content/docs/` MINUS
 *      the generated tree — subtracting against generator output would neuter
 *      the scan);
 *   3. scan every text artifact under `dist/`;
 *   4. prove the scan itself is meaningful: enough canaries, enough files,
 *      the generated routes present, and positive controls that MUST appear —
 *      without these, "nothing leaked" and "nothing shipped" look identical.
 *
 * Runs standalone (`pnpm scan:components`) and is wired into `b4push` and the
 * deploy workflow after `pnpm build`.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { readCanaries } from "../adapters/circuit/canaries.ts";
import { CONTENT_ROOT, DIST_ROOT, FOOTPRINT_ROOT, GENERATED_ROOT } from "../adapters/circuit/paths.ts";
import { sha256 } from "../footprint-previews/hash.ts";
import {
  assertNoLeaks,
  assertPositiveControls,
  assertRequiredRoutes,
  readScanTargets,
  scanTargets,
  subtractPublishedElsewhere,
} from "../core/scan.ts";

/**
 * Route fragments every correct build must contain — the three generated
 * sections. Proves the scan is looking at a real site tree, not an empty or
 * wrongly-rooted directory.
 */
const REQUIRED_ROUTE_FRAGMENTS = [
  "components/index",
  "components/catalog",
  "components/integration",
] as const;

/**
 * Values that MUST be present in the built site. `rec-bzt52c11-c92321` is the
 * record that once shipped with no published page (its selection entry was
 * forgotten) — its presence here makes that exact regression a build failure.
 */
const POSITIVE_CONTROLS = [
  { label: "record id rec-stusb4500qtr", value: "rec-stusb4500qtr" },
  { label: "record id rec-bzt52c11-c92321", value: "rec-bzt52c11-c92321" },
  { label: "landing corpus anchor", value: "components-corpus" },
] as const;

/** Floors mirroring tests/gates.test.ts: below these the scan proved nothing. */
const MINIMUMS = { canaries: 150, files: 50 } as const;

async function main(): Promise<void> {
  const harvested = await readCanaries();

  const generatedPrefix = `content/${relative(CONTENT_ROOT, GENERATED_ROOT).split(sep).join("/")}/`;
  const handAuthored = (await readScanTargets(CONTENT_ROOT, "content")).filter(
    (target) => !target.label.startsWith(generatedPrefix),
  );

  /**
   * A handful of records (e.g. `component-faston-c591344`) have no real
   * manufacturer datasheet and cite the project's own committed KiCad
   * footprint file as their evidentiary "document" instead — see
   * `document_title: "zudo-pd canonical KiCad footprint …"` in their
   * `sources.json`. That source's retained-copy `sha256` is a DENIED canary
   * (`matrix.ts` `source.sha256`), but its value is the hash of the SAME
   * bytes this feature's manifest also hashes as `canonicalInputSha256` —
   * bytes that are independently, fully public via the committed
   * `footprints/kicad/**` files, the raw GitHub URL already printed on that
   * record's page, and `reference.footprint.path` (PUBLISH). Flagging that
   * hash as a leak would flag content this project already decided to
   * publish under a different field, so it is subtracted here exactly like a
   * hand-authored page's independently-published values.
   */
  const footprintFiles = (await readdir(FOOTPRINT_ROOT)).filter((name) => name.endsWith(".kicad_mod"));
  const footprintHashes = await Promise.all(
    footprintFiles.map(async (name) => sha256(await readFile(join(FOOTPRINT_ROOT, name)))),
  );
  const publiclyHashedFootprints = {
    label: "footprints/kicad/zudo-power.pretty (independently PUBLISH via reference.footprint.path)",
    text: footprintHashes.join("\n"),
  };

  const canaries = subtractPublishedElsewhere(harvested, [...handAuthored, publiclyHashedFootprints]);

  const targets = await readScanTargets(DIST_ROOT, "dist");
  assertRequiredRoutes(targets, [...REQUIRED_ROUTE_FRAGMENTS], "dist");
  assertPositiveControls(targets, [...POSITIVE_CONTROLS], "dist");

  const result = scanTargets(targets, canaries);
  assertNoLeaks(result, MINIMUMS);

  console.log(
    `scan:components PASS — ${result.canaries} canaries ` +
      `(${harvested.length - canaries.length} independently published, subtracted), ` +
      `${result.filesScanned} artifacts scanned, ${result.filesSkippedBinary} binary skipped, 0 leaks`,
  );
}

main().catch((error: unknown) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exitCode = 1;
});
