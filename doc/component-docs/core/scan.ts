/**
 * Artifact-level denied-value scanning: the proof that nothing denied survived
 * into anything a reader, a crawler or an agent can fetch.
 *
 * Everything upstream of this module reasons about the *projection*: the matrix
 * refuses a field, `publish()` returns `undefined`, the branded types make an
 * unsanitised string a compile error. That chain proves the view model is
 * clean. It cannot prove the built site is, because between the view model and
 * `dist/` sit an MDX serializer, an MDX compiler, an HTML minifier, a search
 * indexer and an `llms.txt` generator — none of which this feature owns.
 *
 * So this scans the bytes.
 *
 * ## Why a naive substring search is worse than useless
 *
 * A canary that cries wolf gets suppressed, and a suppressed canary masks the
 * leak it exists to catch. Three failure modes are live in this corpus, and a
 * scanner that does not handle all three produces false positives on a clean
 * build:
 *
 *  1. **A denied value that is a substring of a published one.**
 *     `src-ss26-primary-attempt` records `alternate_authoritative_url` (DENY)
 *     as `http://www.ichjc.com/` while its `authoritative_url` (PUBLISH) is
 *     `http://www.ichjc.com/productDetail.html?…`. The denied string is a
 *     prefix of the published one, so it appears in correct output, always.
 *     `harvestCanaries` subtracts it: a value independently reachable through a
 *     published key is not a canary. This is also why the subtraction is
 *     *containment*, not equality — the published superstring is what actually
 *     appears in the bytes.
 *
 *  2. **Output escaping mutates published values.** That same URL serialises
 *     into MDX as `…%E7%AE%A1\&type2=…` — a backslash the evidence never had.
 *     Comparing raw bytes to raw evidence therefore compares two different
 *     strings. `normalizeForScan` folds escaping away on BOTH sides so the
 *     comparison is between meanings rather than between encodings.
 *
 *  3. **Degenerate values that are not identifiers at all.** A `SOURCE
 *     UNAVAILABLE` document carries a placeholder `sha256` of 64 zeros. As a
 *     search term that matches any zero run in any file — it hit a `.wasm`
 *     bundle. `isNonCanary` rejects it, and binary files are not text-scanned.
 *
 * ## What this module deliberately does not do
 *
 * It does not percent-decode. Evidence URLs are published verbatim (`url.ts`
 * refuses to normalise, because the evidence locked a hash against the exact
 * string), so both sides already carry the same encoding and decoding would only
 * invent collisions between distinct values.
 *
 * It does not attempt to canary numbers. `source.physicalPdfPageIndex` is a
 * small integer: searching output for `1` is not a test. That field's absence is
 * proven structurally instead — the matrix denies it, the view model has no such
 * leaf, and preflight records `emitted: 0`.
 */

import { readFile, readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

import { fail } from "./errors.ts";

/**
 * Shortest value worth searching for. Below this a string is not an identifier,
 * it is a word — `OPEN`, `2026-04`, `Rev. 8` — and any hit is noise. Denied
 * fields in practice hold hashes, URLs, sentences and prompts; all are far
 * longer.
 */
export const MIN_CANARY_LENGTH = 12;

/** How many hits to name before a failure message stops being readable. */
const REPORTED_LIMIT = 20;

/** A value that must not appear in any published artifact. */
export type Canary = {
  /**
   * The value as the provider recorded it. Present for tests and debugging —
   * failure messages deliberately report `path` instead, because they land in
   * CI logs.
   */
  readonly value: string;
  /** Normalised form; this is what is actually searched for. */
  readonly normalized: string;
  /** Dotted path of the denied key it was reached through, for the report. */
  readonly path: string;
};

/**
 * Separator for the concatenated corpora below.
 *
 * A space would let a match straddle two independent values — which in a
 * subtraction means silently dropping a real canary, and in a positive control
 * means passing because two artifacts each hold half of it. NUL survives
 * `normalizeForScan` (it is neither whitespace, nor a backslash, nor a
 * character reference) and `safeText` rejects it outright, so no published
 * string can contain one.
 */
const CORPUS_SEPARATOR = "\\u0000";

/** One artifact, as the scanner sees it. */
export type ScanTarget = {
  /** Stable label used in failure messages — a repo-relative path. */
  readonly label: string;
  /** Decoded text, or `null` when the file is binary and was not text-scanned. */
  readonly text: string | null;
};

export type ScanHit = {
  readonly label: string;
  readonly canary: Canary;
};

export type ScanResult = {
  readonly hits: readonly ScanHit[];
  readonly filesScanned: number;
  readonly filesSkippedBinary: number;
  readonly canaries: number;
};

// --- normalisation ---------------------------------------------------------

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Fold every encoding an artifact might have applied, so that two spellings of
 * the same value compare equal.
 *
 * Order matters. Character references are decoded first because the MDX
 * serializer emits them (`&#x69;mport`) and the HTML compiler emits them
 * (`&amp;`); decoding them can reveal a backslash, which the next step then
 * handles. Backslash unescaping runs second because MDX escaping is what
 * produced `\&` and `\{`, and JSON string escaping is what produced `\"`.
 * Whitespace collapses last, so a value reflowed across lines by a formatter
 * still matches one recorded on a single line.
 *
 * The result is lowercased. That only ever makes the scan MORE sensitive, and
 * because `harvestCanaries` subtracts published values through the same
 * function, it cannot introduce a false positive.
 */
export function normalizeForScan(value: string): string {
  return collapseWhitespace(foldBackslashes(decodeReferences(value.normalize("NFC")))).toLowerCase();
}

function decodeReferences(value: string): string {
  return value.replace(
    /&(#[Xx][0-9A-Fa-f]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,9});/gu,
    (match, body: string) => {
      if (body.startsWith("#")) {
        const digits = body.slice(1);
        const codePoint =
          digits.startsWith("x") || digits.startsWith("X")
            ? Number.parseInt(digits.slice(1), 16)
            : Number.parseInt(digits, 10);
        // Surrogates and out-of-range values are not decodable; leaving the
        // reference intact is the honest answer, and it cannot hide a leak
        // because the canary side went through the same transform.
        if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;
        if (codePoint >= 0xd800 && codePoint <= 0xdfff) return match;
        return String.fromCodePoint(codePoint);
      }
      return NAMED_ENTITIES[body.toLowerCase()] ?? match;
    },
  );
}

/**
 * Decode the backslash escapes that carry information, then delete every
 * remaining backslash.
 *
 * Deleting rather than unescaping is deliberate, and it is what makes the
 * comparison symmetric. One level of unescaping cannot tell a literal backslash
 * from an escape character without knowing the encoding — so a value that
 * contains a real backslash normalises one way when read raw from the evidence
 * (`\ ` → ` `) and another way when read back out of JSON (`\\` → `\`), and the
 * canary silently stops matching its own leak. Deleting all of them collapses
 * both spellings onto the same string.
 *
 * The cost is that two values differing only in backslashes compare equal. That
 * only ever makes the scan match MORE, never less, and both the subtraction and
 * the search run through this same function — so it cannot manufacture a false
 * positive, only a redundant one.
 *
 * `\uXXXX` is decoded first because it encodes a character rather than escaping
 * one, and `\n`/`\t`/`\r` become spaces so that whitespace collapsing sees them.
 */
function foldBackslashes(value: string): string {
  let result = "";
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== "\\") {
      result += value[index];
      continue;
    }
    const next = index + 1 < value.length ? (value[index + 1] as string) : "";
    if (next === "u" && /^[0-9A-Fa-f]{4}$/u.test(value.slice(index + 2, index + 6))) {
      result += String.fromCharCode(Number.parseInt(value.slice(index + 2, index + 6), 16));
      index += 5;
      continue;
    }
    if (next === "n" || next === "t" || next === "r") {
      result += " ";
      index += 1;
      continue;
    }
    // Drop the backslash itself and keep looking at the next character on its
    // own terms — `\\<` must fold to the same thing `<` does.
  }
  return result;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

// --- canary selection ------------------------------------------------------

/**
 * Whether a value is unusable as a search term regardless of where it came from.
 *
 * A single repeated character covers the 64-zero placeholder digest and any
 * `ffff…` sibling. All-digit values are page indices and counts. Both would
 * match arbitrary unrelated bytes, and a canary that matches everything proves
 * nothing.
 */
export function isNonCanary(normalized: string): boolean {
  if (normalized.length < MIN_CANARY_LENGTH) return true;
  if (/^(.)\1*$/u.test(normalized)) return true;
  if (/^[0-9]+$/u.test(normalized)) return true;
  return false;
}

export type HarvestOptions = {
  /** Provider key names whose values are denied publication. */
  readonly deniedKeys: readonly string[];
};

/**
 * Walk parsed provider JSON and return the values reachable ONLY through a
 * denied key.
 *
 * The subtraction is the part that is easy to skip and fatal to skip. A value
 * that also arrives through a published key is not evidence of a leak — it is
 * the same words published legitimately, and asserting its absence would fail
 * on correct output. In this corpus that is not hypothetical: several alternate
 * URLs are another source's citation URL, and several routing prompts are bare
 * LCSC codes that the catalog publishes as identity.
 *
 * Containment rather than equality, because mode 1 above is about a denied
 * value that is a *substring* of a published one: the superstring is what
 * appears in the artifact, so searching for the substring would always hit.
 */
export function harvestCanaries(
  roots: readonly unknown[],
  options: HarvestOptions,
): readonly Canary[] {
  const denied = new Set(options.deniedKeys);
  const deniedValues = new Map<string, { value: string; path: string }>();
  const publishedValues: string[] = [];

  const walk = (node: unknown, path: string, underDenied: boolean): void => {
    if (typeof node === "string") {
      const normalized = normalizeForScan(node);
      if (normalized === "") return;
      if (underDenied) {
        if (!deniedValues.has(normalized)) deniedValues.set(normalized, { value: node, path });
      } else {
        publishedValues.push(normalized);
      }
      return;
    }
    if (Array.isArray(node)) {
      for (const [index, item] of node.entries()) walk(item, `${path}[${index}]`, underDenied);
      return;
    }
    if (typeof node === "object" && node !== null) {
      for (const [key, value] of Object.entries(node)) {
        walk(value, path === "" ? key : `${path}.${key}`, underDenied || denied.has(key));
      }
    }
  };

  for (const [index, root] of roots.entries()) walk(root, `[${index}]`, false);

  const publishedBlob = publishedValues.join(CORPUS_SEPARATOR);

  const canaries: Canary[] = [];
  for (const [normalized, origin] of deniedValues) {
    if (isNonCanary(normalized)) continue;
    if (publishedBlob.includes(normalized)) continue;
    canaries.push({ value: origin.value, normalized, path: origin.path });
  }
  return canaries;
}

/**
 * Drop canaries that some OTHER publication channel already puts on the site.
 *
 * This is the same subtraction `harvestCanaries` performs, extended past the
 * evidence tree. A denied provider value can be independently public for
 * reasons that have nothing to do with this generator: the narrative docs are
 * hand-authored and name parts in prose, and `claudeResources` mirrors every
 * `SKILL.md` verbatim — and a routing prompt is, unsurprisingly, close to the
 * skill's own description. Four values in this corpus are in exactly that
 * position.
 *
 * Without this step the site-wide scan reports them on every clean build, and a
 * check that fails on clean builds gets switched off.
 *
 * It is a subtraction against re-derived text, never a list of excused strings:
 * the day one of those narrative pages stops mentioning a part, the value
 * becomes a canary again automatically. And it is only ever applied to the
 * site-wide tier — artifacts this feature actually writes are scanned with the
 * full set, where any hit is unambiguously this generator's.
 */
export function subtractPublishedElsewhere(
  canaries: readonly Canary[],
  corpus: readonly ScanTarget[],
): readonly Canary[] {
  const blob = corpus
    .map((target) => (target.text === null ? "" : normalizeForScan(target.text)))
    .join(CORPUS_SEPARATOR);
  return canaries.filter((canary) => !blob.includes(canary.normalized));
}

// --- binary detection ------------------------------------------------------

/**
 * Extensions never worth text-scanning. Listed rather than sniffed alone
 * because a compressed asset can be NUL-free by chance, and a false "this is
 * text" reading would spend the scan on noise.
 */
const BINARY_EXTENSIONS: readonly string[] = [
  ".wasm",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".pdf",
  ".zip",
  ".gz",
  ".br",
  ".mp4",
  ".webm",
];

/** How much of a file to sniff for NUL before deciding it is text. */
const SNIFF_BYTES = 8192;

export function isBinaryPath(path: string): boolean {
  const lower = path.toLowerCase();
  return BINARY_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

export function isBinaryContent(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, SNIFF_BYTES);
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) return true;
  }
  return false;
}

// --- reading artifacts -----------------------------------------------------

/**
 * Read every file under `root` as a scan target.
 *
 * Exhaustive by construction, and that is the point: an allow-list of "the
 * artifacts worth checking" is a list someone has to remember to update when
 * the build starts emitting a new one. Walking the whole tree means a new
 * artifact is covered the day it appears.
 *
 * Binary files are returned with `text: null` — counted, reported, never
 * text-searched. UTF-8 decoding is lossy by design (`fatal: false`): a file
 * that is *mostly* text still gets scanned rather than skipped.
 */
export async function readScanTargets(
  root: string,
  labelPrefix: string,
): Promise<readonly ScanTarget[]> {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const targets: ScanTarget[] = [];

  const walk = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries.sort((left, right) => (left.name < right.name ? -1 : 1))) {
      const path = join(directory, entry.name);
      // A symlink is neither followed nor read: it could point outside the
      // tree, and what matters here is the bytes this build actually produced.
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(path);
        continue;
      }
      if (!entry.isFile()) continue;

      const label = `${labelPrefix}/${relative(root, path).split(sep).join("/")}`;
      if (isBinaryPath(path)) {
        targets.push({ label, text: null });
        continue;
      }
      const bytes = await readFile(path);
      targets.push({
        label,
        text: isBinaryContent(bytes) ? null : decoder.decode(bytes),
      });
    }
  };

  await walk(root);
  return targets;
}

// --- scanning --------------------------------------------------------------

export function scanTargets(
  targets: readonly ScanTarget[],
  canaries: readonly Canary[],
): ScanResult {
  const hits: ScanHit[] = [];
  let filesScanned = 0;
  let filesSkippedBinary = 0;

  for (const target of targets) {
    if (target.text === null) {
      filesSkippedBinary += 1;
      continue;
    }
    filesScanned += 1;
    const haystack = normalizeForScan(target.text);
    for (const canary of canaries) {
      if (haystack.includes(canary.normalized)) hits.push({ label: target.label, canary });
    }
  }

  return { hits, filesScanned, filesSkippedBinary, canaries: canaries.length };
}

/**
 * Fail-closed wrapper. Both directions are fatal: a hit is a leak, and an empty
 * canary set or an empty target set means the scan proved nothing and silently
 * passed — the exact shape of a safety check that has quietly stopped working.
 */
export function assertNoLeaks(result: ScanResult, minimums: {
  readonly canaries: number;
  readonly files: number;
}): void {
  if (result.canaries < minimums.canaries) {
    fail("PUBLICATION_POLICY", "denied-value scan has too few canaries to be meaningful", {
      canaries: result.canaries,
      required: minimums.canaries,
    });
  }
  if (result.filesScanned < minimums.files) {
    fail("PUBLICATION_POLICY", "denied-value scan covered too few artifacts to be meaningful", {
      filesScanned: result.filesScanned,
      required: minimums.files,
    });
  }
  if (result.hits.length > 0) {
    fail("PUBLICATION_POLICY", `${result.hits.length} denied value(s) reached a published artifact`, {
      count: result.hits.length,
      hits: result.hits
        .slice(0, REPORTED_LIMIT)
        // The canary's own value is NOT echoed: this message lands in CI logs,
        // and reprinting a denied value to prove it leaked would publish it a
        // second time. The path and the file are what a fixer needs.
        .map((hit) => `${hit.label} ← ${hit.canary.path}`),
    });
  }
}

/**
 * Fails unless every named route fragment appears in at least one target label.
 *
 * A positive control proves the right *content* is present; this proves the
 * right *files* are, which is the weaker claim a positive control cannot make
 * on its own — `assertPositiveControls` below is skipped for an empty surface,
 * so a corpus assembled from the wrong directory passes every content check
 * vacuously. Routes are a parameter: which ones matter is the caller's
 * decision, and this file stays free of any particular route shape.
 */
export function assertRequiredRoutes(
  targets: readonly ScanTarget[],
  routes: readonly string[],
  where: string,
): void {
  const missing = routes.filter(
    (route) => !targets.some((target) => target.label.includes(route)),
  );
  if (missing.length > 0) {
    fail("PUBLICATION_POLICY", `${where} is missing ${missing.length} required route(s)`, {
      where,
      missing: missing.slice(0, REPORTED_LIMIT),
    });
  }
}

/**
 * Assert that values which MUST be published really are. A denied-value scan
 * passes trivially against an empty site, so every negative scan is paired with
 * positive controls; without them "nothing leaked" and "nothing shipped" are
 * indistinguishable.
 */
export function assertPositiveControls(
  targets: readonly ScanTarget[],
  controls: readonly { readonly label: string; readonly value: string }[],
  where: string,
): void {
  const haystack = targets
    .map((target) => (target.text === null ? "" : normalizeForScan(target.text)))
    .join(CORPUS_SEPARATOR);

  const missing = controls
    .filter((control) => !haystack.includes(normalizeForScan(control.value)))
    .map((control) => control.label);

  if (missing.length > 0) {
    fail("PUBLICATION_POLICY", `${missing.length} positive control(s) are absent from ${where}`, {
      where,
      missing: missing.slice(0, REPORTED_LIMIT),
    });
  }
}
