import { lstat, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { FOOTPRINT_MASTER_ROOT, FOOTPRINT_ROOT } from "./config.ts";

/**
 * Keep the authoring copy and KiCad's `.pretty` resolution copy byte-identical.
 * Preview hashes intentionally use the resolution copy, so this guard is what
 * makes a source-only edit in the documented master directory fail closed.
 */
export async function assertFootprintLibraryParity(
  masterRoot = FOOTPRINT_MASTER_ROOT,
  libraryRoot = FOOTPRINT_ROOT,
): Promise<void> {
  const masterNames = await footprintNames(masterRoot);
  const libraryNames = await footprintNames(libraryRoot);
  if (JSON.stringify(masterNames) !== JSON.stringify(libraryNames)) {
    throw new Error(
      `dual-location footprint inventory differs: master=${masterNames.join(",")} library=${libraryNames.join(",")}`,
    );
  }
  for (const name of masterNames) {
    const masterPath = join(masterRoot, name);
    const libraryPath = join(libraryRoot, name);
    await assertRegularFile(masterPath, `master footprint ${name}`);
    await assertRegularFile(libraryPath, `library footprint ${name}`);
    const [master, library] = await Promise.all([readFile(masterPath), readFile(libraryPath)]);
    if (!master.equals(library)) {
      throw new Error(`dual-location footprint bytes differ: ${name}`);
    }
  }
}

async function footprintNames(root: string): Promise<string[]> {
  const rootStat = await lstat(root);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    throw new Error(`footprint root must be a real directory: ${root}`);
  }
  return (await readdir(root))
    .filter((name) => name.endsWith(".kicad_mod"))
    .sort((a, b) => a.localeCompare(b, "en"));
}

async function assertRegularFile(path: string, label: string): Promise<void> {
  const fileStat = await lstat(path);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file`);
  }
}
