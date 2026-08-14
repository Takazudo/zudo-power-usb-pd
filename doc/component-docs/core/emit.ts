/**
 * Writing the exclusively-owned generated tree.
 *
 * The generator owns exactly one directory and never reaches outside it. It
 * does not `rm -rf` that directory either: it writes this run's files, then
 * removes only the leftovers that (a) live under the owned root, (b) end in
 * `.mdx`, and (c) carry the generated marker. A file failing (c) is reported
 * as a fatal error rather than deleted — that is the case where someone
 * hand-authored content into a generated tree, and destroying it silently
 * would be the worst possible outcome.
 */

import { mkdir, lstat, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

import { fail } from "./errors.ts";
import { byCodeUnit } from "./ids.ts";
import { isGeneratedContents, type GeneratedPage } from "./page.ts";

export type EmitPlan = {
  /** Absolute path of the exclusively-owned generated root. */
  readonly root: string;
  readonly pages: readonly GeneratedPage[];
};

export type EmitResult = {
  readonly written: readonly string[];
  readonly removed: readonly string[];
  readonly unchanged: readonly string[];
};

/**
 * Assert that `candidate` resolves inside `root`. String prefixes are not
 * enough (`/a/bc` starts with `/a/b`), so compare on path segments.
 */
export function assertContained(root: string, candidate: string, what: string): string {
  const resolvedRoot = resolve(root);
  const resolvedCandidate = resolve(candidate);
  const rel = relative(resolvedRoot, resolvedCandidate);

  // `relative` returns an absolute path when the two live on different Windows
  // drives, and "" when they are the same path — neither is a contained child.
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    fail("PATH_CONTAINMENT", `${what} escapes its owned root`, {
      what,
      root: resolvedRoot,
      candidate: resolvedCandidate,
    });
  }
  return resolvedCandidate;
}

/**
 * Refuse to traverse a symlink. Checked with `lstat` per path so a symlinked
 * directory in the middle of a walk cannot redirect reads or writes outside
 * the tree we believe we are in.
 */
export async function assertNotSymlink(path: string): Promise<void> {
  try {
    const stats = await lstat(path);
    if (stats.isSymbolicLink()) {
      fail("PATH_CONTAINMENT", `${path} is a symlink`, { path });
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/**
 * Refuse a symlink anywhere on the walk from `root` down to `target`.
 *
 * `assertContained` is **lexical**: it proves the resolved string sits under the
 * root, not that walking there stays inside it. `mkdir -p`, `writeFile` and
 * `lstat` all follow an intermediate symlink, so checking only the leaf lets a
 * symlinked `records/` redirect a write outside the owned tree entirely — and
 * the pruning walk at the end of `emit` notices only *after* the bytes have
 * landed. Reproduced before this was added: a symlinked `records/` wrote its
 * page into the link target and then raised PATH_CONTAINMENT, i.e. the error
 * arrived one write too late.
 *
 * Segments that do not exist yet are fine (`assertNotSymlink` no-ops on ENOENT)
 * — `mkdir` will create them as real directories.
 */
export async function assertPathNotSymlinked(root: string, target: string): Promise<void> {
  const resolvedRoot = resolve(root);
  await assertNotSymlink(resolvedRoot);

  let current = resolvedRoot;
  for (const segment of relative(resolvedRoot, resolve(target)).split(sep)) {
    if (segment === "") continue;
    current = join(current, segment);
    await assertNotSymlink(current);
  }
}

export async function emit(plan: EmitPlan): Promise<EmitResult> {
  const root = resolve(plan.root);
  await mkdir(root, { recursive: true });

  const written: string[] = [];
  const unchanged: string[] = [];
  const owned = new Set<string>();

  for (const page of plan.pages) {
    const target = assertContained(root, join(root, page.relativePath), page.relativePath);
    owned.add(target);

    // Before mkdir, not after: mkdir -p happily traverses an existing symlinked
    // parent, so a check that runs afterwards has already let the directory be
    // created outside the owned tree.
    await assertPathNotSymlinked(root, target);
    await mkdir(dirname(target), { recursive: true });
    await assertNotSymlink(target);

    const existing = await readIfPresent(target);
    if (existing === page.contents) {
      unchanged.push(page.relativePath);
      continue;
    }
    await writeFile(target, page.contents, "utf8");
    written.push(page.relativePath);
  }

  const removed = await prune(root, owned);

  return {
    written: written.sort(byCodeUnit),
    removed: removed.sort(byCodeUnit),
    unchanged: unchanged.sort(byCodeUnit),
  };
}

/** Compare a plan against what is on disk without touching anything. */
export async function diffAgainstDisk(plan: EmitPlan): Promise<readonly string[]> {
  const root = resolve(plan.root);
  const drift: string[] = [];
  const owned = new Set<string>();

  for (const page of plan.pages) {
    const target = assertContained(root, join(root, page.relativePath), page.relativePath);
    owned.add(target);
    // A symlinked parent would point the drift read at a file outside the owned
    // tree, so `check:components` could report "up to date" against content this
    // generator does not own. Same guard as the write path, same reason.
    await assertPathNotSymlinked(root, target);
    const existing = await readIfPresent(target);
    if (existing === null) drift.push(`missing: ${page.relativePath}`);
    else if (existing !== page.contents) drift.push(`changed: ${page.relativePath}`);
  }

  for (const path of await walkMdx(root)) {
    if (!owned.has(path)) drift.push(`stale: ${relative(root, path).split(sep).join("/")}`);
  }

  return drift.sort(byCodeUnit);
}

async function prune(root: string, owned: ReadonlySet<string>): Promise<string[]> {
  const removed: string[] = [];

  for (const path of await walkMdx(root)) {
    if (owned.has(path)) continue;
    const contents = await readIfPresent(path);
    if (contents === null) continue;

    if (!isGeneratedContents(contents)) {
      fail("PATH_CONTAINMENT", "hand-authored file found inside the generated tree", {
        path: relative(root, path).split(sep).join("/"),
        hint: "move it out of doc/src/content/docs/components/ — this tree is generated",
      });
    }
    await rm(path);
    removed.push(relative(root, path).split(sep).join("/"));
  }

  return removed;
}

/** Depth-first walk of `.mdx` files, refusing to follow symlinks. */
async function walkMdx(root: string): Promise<string[]> {
  const found: string[] = [];
  const stack = [root];

  while (stack.length > 0) {
    const current = stack.pop() as string;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    for (const entry of entries) {
      const path = join(current, entry.name);
      if (entry.isSymbolicLink()) {
        fail("PATH_CONTAINMENT", "symlink inside the generated tree", {
          path: relative(root, path).split(sep).join("/"),
        });
      }
      if (entry.isDirectory()) stack.push(path);
      else if (entry.isFile() && entry.name.endsWith(".mdx")) found.push(path);
    }
  }

  return found;
}

async function readIfPresent(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
