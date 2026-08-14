/**
 * Stable identity: route slugs and in-page anchors.
 *
 * Slugs and anchors are part of the published contract — they appear in
 * external links, search results and cross-references — so they are derived by
 * a total, reversible-enough rule and are never re-derived from prose.
 * A slug is derived from the provider's own record ID, never from an MPN
 * (MPNs contain commas, slashes and case that would need lossy escaping, e.g.
 * `PESD24VS1UB,115`).
 */

import { fail } from "./errors.ts";

declare const slugBrand: unique symbol;
declare const anchorBrand: unique symbol;

/** A URL path segment. Matches `SLUG_PATTERN`. */
export type Slug = string & { readonly [slugBrand]: true };
/** An in-page fragment identifier. Matches `SLUG_PATTERN`. */
export type Anchor = string & { readonly [anchorBrand]: true };

/**
 * Deliberately narrower than what URLs allow: lowercase ASCII, digits and
 * single hyphens. This is also the pattern the MDX guard enforces on every
 * generated JSX attribute value, so a slug can never carry markup.
 */
export const SLUG_PATTERN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u;

/** Segments a generated route may never occupy — reserved by the site or the OS. */
export const RESERVED_SLUGS: readonly string[] = [
  "index",
  "404",
  "500",
  "assets",
  "public",
  "static",
  "api",
  "search",
  "sitemap",
  "robots",
  "llms",
  "con",
  "prn",
  "aux",
  "nul",
  // zudo-pd re-roots the generated tree one level down (`components/records/`),
  // which makes catalog and integration siblings of the record slugs — see
  // `paths.ts` GENERATED_ROOT and `render/shared.ts` route constants.
  "catalog",
  "integration",
];

/** The record-ID prefix the circuit provider uses; stripped for prettier routes. */
const RECORD_ID_PREFIX = "rec-";

/**
 * Derive a route slug from a provider record ID.
 *
 * The provider's own validator already constrains record IDs to
 * `^[a-z][a-z0-9-]*$`, so this is a prefix strip plus a re-assert — not a
 * lossy transliteration. Anything that does not survive is a hard failure, so
 * a future record ID that would need mangling shows up as a build error rather
 * than as a silently renamed page.
 */
export function recordSlug(recordId: string): Slug {
  const stem = recordId.startsWith(RECORD_ID_PREFIX)
    ? recordId.slice(RECORD_ID_PREFIX.length)
    : recordId;

  if (!SLUG_PATTERN.test(stem)) {
    fail("IDENTITY_COLLISION", `record id ${recordId} does not yield a usable slug`, {
      recordId,
      stem,
    });
  }
  if (RESERVED_SLUGS.includes(stem)) {
    fail("IDENTITY_COLLISION", `record id ${recordId} yields the reserved slug ${stem}`, {
      recordId,
      stem,
    });
  }
  return stem as Slug;
}

/**
 * An in-page anchor. Provider IDs are already prefixed and globally unique
 * (`fact-…`, `src-…`, `cov-…`, `int-…`, `pinmap-…`, `rec-…`), so they are used
 * verbatim: a reader who has a fact ID can build the URL by hand.
 */
export function anchor(id: string): Anchor {
  if (!SLUG_PATTERN.test(id)) {
    fail("IDENTITY_COLLISION", `id ${id} is not usable as an anchor`, { id });
  }
  return id as Anchor;
}

/**
 * Assert global uniqueness across a derived identity set. Called once per
 * generation for slugs and once for anchors: a collision would silently
 * overwrite one page or break a cross-link, so it must abort the build.
 */
export function assertUnique(kind: string, values: readonly string[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  if (duplicates.size > 0) {
    fail("IDENTITY_COLLISION", `duplicate ${kind}`, {
      kind,
      duplicates: [...duplicates].sort(),
    });
  }
}

/**
 * Byte-wise ascending comparison. Never `localeCompare`: its ordering depends
 * on the host ICU locale, which would make generated output machine-dependent
 * and trip the CI freshness check.
 */
export function byCodeUnit(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}
