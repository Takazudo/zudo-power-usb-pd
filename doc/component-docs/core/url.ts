/**
 * URL publication policy.
 *
 * V1 publishes a link only when it is an absolute `http:`/`https:` URL that a
 * reader can follow. Everything else — `file:`, `data:`, `javascript:`,
 * protocol-relative, bare host names, machine paths — is denied and reported.
 * There is no "best effort" repair: a URL that needs fixing is a data problem
 * for the evidence owner, not something the projection may guess at.
 */

import { fail } from "./errors.ts";

declare const safeUrlBrand: unique symbol;

/** An absolute URL that passed `classifyUrl` with decision `"ALLOW"`. */
export type SafeUrl = string & { readonly [safeUrlBrand]: true };

export const ALLOWED_URL_SCHEMES: readonly string[] = ["http:", "https:"];

export type UrlDecision =
  | { readonly decision: "ALLOW"; readonly url: SafeUrl }
  | { readonly decision: "DENY"; readonly reason: UrlDenyReason };

export type UrlDenyReason =
  | "EMPTY"
  | "NOT_ABSOLUTE"
  | "SCHEME_NOT_ALLOWED"
  | "CREDENTIALS_IN_URL"
  | "NO_HOST"
  | "CONTAINS_WHITESPACE_OR_CONTROL"
  | "TOO_LONG";

const MAX_URL_LENGTH = 2000;

/**
 * Classify a candidate URL. Pure and total: never throws, so a caller can
 * report every denial in the preflight report instead of aborting on the first
 * one. `assertSafeUrl` is the fail-closed wrapper for the emit path.
 */
export function classifyUrl(raw: unknown): UrlDecision {
  if (typeof raw !== "string" || raw.trim() === "") {
    return { decision: "DENY", reason: "EMPTY" };
  }
  if (raw.length > MAX_URL_LENGTH) {
    return { decision: "DENY", reason: "TOO_LONG" };
  }
  // A URL that needs trimming, or that carries a space/control character, is
  // never repaired here: `URL` would silently percent-encode it into something
  // that no longer matches the recorded evidence locator.
  if (raw !== raw.trim() || /[\s]/u.test(raw) || hasControlCharacter(raw)) {
    return { decision: "DENY", reason: "CONTAINS_WHITESPACE_OR_CONTROL" };
  }

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { decision: "DENY", reason: "NOT_ABSOLUTE" };
  }

  if (!ALLOWED_URL_SCHEMES.includes(parsed.protocol)) {
    return { decision: "DENY", reason: "SCHEME_NOT_ALLOWED" };
  }
  if (parsed.username !== "" || parsed.password !== "") {
    return { decision: "DENY", reason: "CREDENTIALS_IN_URL" };
  }
  if (parsed.hostname === "") {
    return { decision: "DENY", reason: "NO_HOST" };
  }

  // Publish the ORIGINAL string, not `parsed.href`: `URL` normalises case,
  // default ports and percent-encoding, and a normalised URL no longer matches
  // the hash the evidence record locked against it.
  return { decision: "ALLOW", url: raw as SafeUrl };
}

/** Fail-closed variant for the emit path. */
export function assertSafeUrl(raw: unknown, field: string): SafeUrl {
  const result = classifyUrl(raw);
  if (result.decision === "DENY") {
    fail("UNSAFE_VALUE", `${field}: URL denied (${result.reason})`, {
      field,
      reason: result.reason,
    });
  }
  return result.url;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint <= 0x1f || (codePoint >= 0x7f && codePoint <= 0x9f)) return true;
  }
  return false;
}
