/**
 * The single gate every provider string must pass before it can reach a page.
 *
 * `SafeText` is a branded string: the only way to obtain one is `safeText()`.
 * The mdast builders in `mdx.ts` accept `SafeText` and nothing else, so
 * "evidence strings never become raw MDX" is enforced by the type checker
 * rather than by reviewer discipline.
 *
 * Sanitisation never silently strips: anything that cannot be represented as
 * plain published text is a hard failure. Silent stripping would let a mutated
 * evidence string publish as a different-looking claim.
 *
 * The forbidden sets below are expressed as numeric code-point ranges rather
 * than regex character classes on purpose — a source file about rejecting
 * invisible characters must not itself contain any.
 */

import { fail } from "./errors.ts";

declare const safeTextBrand: unique symbol;

/** A string that has passed `safeText()`. Structurally a string at runtime. */
export type SafeText = string & { readonly [safeTextBrand]: true };

type CodePointRange = readonly [start: number, end: number];

/**
 * C0/C1 controls minus tab (0x09) and newline (0x0A), which a published
 * paragraph may legitimately contain. NUL, BEL, ESC, DEL and the C1 range are
 * a terminal- and log-injection vector with no use in evidence text.
 */
const FORBIDDEN_CONTROL: readonly CodePointRange[] = [
  [0x00, 0x08],
  [0x0b, 0x0c],
  [0x0e, 0x1f],
  [0x7f, 0x9f],
];

/**
 * Bidirectional overrides/isolates and invisible formatting characters. These
 * reorder rendered text so a published limit can read as a different number
 * (Trojan Source, CVE-2021-42574) — never acceptable in a spec table.
 */
const FORBIDDEN_INVISIBLE: readonly CodePointRange[] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x061c, 0x061c], // Arabic letter mark
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // zero-width space/non-joiner/joiner, LRM, RLM
  [0x202a, 0x202e], // LRE, RLE, PDF, LRO, RLO
  [0x2060, 0x2064], // word joiner, invisible operators
  [0x2066, 0x206f], // isolates and deprecated formatting
  [0xfeff, 0xfeff], // zero-width no-break space / BOM
  [0xfff9, 0xfffb], // interlinear annotation
];

/** Longest single provider string V1 will publish inline. */
export const MAX_TEXT_LENGTH = 4000;

export type SafeTextOptions = {
  /** Where the value came from; quoted verbatim in the failure message. */
  readonly field: string;
  /** Allow embedded newlines (paragraph-splitting is the caller's job). */
  readonly allowNewlines?: boolean;
  /** Accept an empty/whitespace-only result. Default: reject. */
  readonly allowEmpty?: boolean;
};

/**
 * Normalise and validate a provider string.
 *
 * NFC normalisation runs first so visually identical strings serialise
 * identically across machines — without it, generated output can differ
 * byte-for-byte between runs and trip the CI freshness check.
 */
export function safeText(raw: unknown, options: SafeTextOptions): SafeText {
  const { field, allowNewlines = false, allowEmpty = false } = options;

  if (typeof raw !== "string") {
    fail("UNSAFE_VALUE", `${field}: expected a string`, { field, got: typeof raw });
  }
  if (hasLoneSurrogate(raw)) {
    fail("UNSAFE_VALUE", `${field}: contains a lone surrogate`, { field });
  }

  const normalized = raw.normalize("NFC").replace(/\r\n?/gu, "\n");

  const control = firstInRanges(normalized, FORBIDDEN_CONTROL);
  if (control !== null) {
    fail("UNSAFE_VALUE", `${field}: contains a forbidden control character`, {
      field,
      codePoint: formatCodePoint(control),
    });
  }

  const invisible = firstInRanges(normalized, FORBIDDEN_INVISIBLE);
  if (invisible !== null) {
    fail("UNSAFE_VALUE", `${field}: contains an invisible or bidi-control character`, {
      field,
      codePoint: formatCodePoint(invisible),
    });
  }

  if (!allowNewlines && normalized.includes("\n")) {
    fail("UNSAFE_VALUE", `${field}: newline is not allowed in this position`, { field });
  }
  if (normalized.length > MAX_TEXT_LENGTH) {
    fail("UNSAFE_VALUE", `${field}: exceeds ${MAX_TEXT_LENGTH} characters`, {
      field,
      length: normalized.length,
    });
  }

  const collapsed = allowNewlines
    ? normalized.replace(/[ \t]+/gu, " ").replace(/\n{3,}/gu, "\n\n").trim()
    : normalized.replace(/\s+/gu, " ").trim();

  if (!allowEmpty && collapsed === "") {
    fail("UNSAFE_VALUE", `${field}: is empty after normalisation`, { field });
  }

  return collapsed as SafeText;
}

/**
 * Compose already-safe fragments. Explicit so no caller builds a `SafeText` by
 * casting: joining safe pieces with a safe separator is safe; joining a safe
 * piece with a raw one is a type error.
 */
export function joinSafe(parts: readonly SafeText[], separator: string): SafeText {
  if (
    firstInRanges(separator, FORBIDDEN_CONTROL) !== null ||
    firstInRanges(separator, FORBIDDEN_INVISIBLE) !== null
  ) {
    fail("UNSAFE_VALUE", "joinSafe: separator is not publishable", { separator });
  }
  return parts.join(separator) as SafeText;
}

/** Literal text authored in this repository (page headings, fixed labels). */
export function literal(value: string): SafeText {
  return safeText(value, { field: "literal", allowNewlines: true });
}

function firstInRanges(value: string, ranges: readonly CodePointRange[]): number | null {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    for (const [start, end] of ranges) {
      if (codePoint >= start && codePoint <= end) return codePoint;
    }
  }
  return null;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (Number.isNaN(next) || next < 0xdc00 || next > 0xdfff) return true;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function formatCodePoint(codePoint: number): string {
  return `U+${codePoint.toString(16).toUpperCase().padStart(4, "0")}`;
}
