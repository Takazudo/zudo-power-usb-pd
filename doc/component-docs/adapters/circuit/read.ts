/**
 * Contained, symlink-refusing reads of provider JSON.
 *
 * Two rules, both enforced per call rather than per directory:
 *   - the resolved path must live under `.claude/skills/`;
 *   - no component of the path may be a symlink.
 * A symlink inside the evidence tree could otherwise point at `~/.ssh` or at
 * another checkout and the generator would happily publish whatever it found.
 *
 * The rules are implemented against an explicit root and re-exported bound to
 * `SKILLS_ROOT`. The evidence tree is read-only to this feature, so a test can
 * never plant a symlink inside it; taking the root as a parameter is what makes
 * the refusal itself testable against a scratch directory, without softening
 * anything the generator actually does.
 */

import { lstat, readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

import { fail } from "../../core/errors.ts";
import { SKILLS_ROOT } from "./paths.ts";

export async function readProviderJson(path: string): Promise<unknown> {
  return readContainedJson(SKILLS_ROOT, path);
}

export function assertUnderSkillsRoot(path: string): string {
  return assertContainedUnder(SKILLS_ROOT, path);
}

export async function readContainedJson(root: string, path: string): Promise<unknown> {
  const resolved = assertContainedUnder(root, path);
  await assertNoSymlinkOnPath(root, resolved);

  let raw: string;
  try {
    raw = await readFile(resolved, "utf8");
  } catch (error) {
    fail("ADAPTER_CONTRACT", `cannot read provider file`, {
      path: relativeSlashPath(root, resolved),
      reason: (error as Error).message,
    });
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    fail("ADAPTER_CONTRACT", `provider file is not valid JSON`, {
      path: relativeSlashPath(root, resolved),
      reason: (error as Error).message,
    });
  }
}

export function assertContainedUnder(root: string, path: string): string {
  const resolvedRoot = resolve(root);
  const resolved = resolve(path);
  const rel = relative(resolvedRoot, resolved);

  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail("PATH_CONTAINMENT", "provider path escapes the skills root", {
      root: resolvedRoot,
      path: resolved,
    });
  }
  return resolved;
}

/**
 * Walk from the root down to the file, rejecting a symlink at any step.
 * Checking only the leaf would miss a symlinked intermediate directory.
 */
export async function assertNoSymlinkOnPath(root: string, resolved: string): Promise<void> {
  const resolvedRoot = resolve(root);
  const segments = relative(resolvedRoot, resolved).split(sep).filter(Boolean);

  // The root itself first: a symlinked `.claude/skills` would redirect every
  // read below it while each individual segment looked clean.
  const rootStats = await lstat(resolvedRoot);
  if (rootStats.isSymbolicLink()) {
    fail("PATH_CONTAINMENT", "the skills root is a symlink", { root: resolvedRoot });
  }

  let current = resolvedRoot;
  for (const segment of segments) {
    current = resolve(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
    if (stats.isSymbolicLink()) {
      fail("PATH_CONTAINMENT", "provider path crosses a symlink", {
        path: relativeSlashPath(resolvedRoot, current),
      });
    }
  }
}

function relativeSlashPath(root: string, resolved: string): string {
  return relative(resolve(root), resolved).split(sep).join("/");
}
