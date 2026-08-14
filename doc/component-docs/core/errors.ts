/**
 * Provider-neutral error shapes. Every failure in the component-docs pipeline
 * is fail-closed: it aborts generation and propagates a nonzero exit code.
 * There is no "skip the bad record and carry on" path.
 */

export const ERROR_CODES = [
  /** The provider's own validator exited nonzero (or could not be run at all). */
  "VALIDATION_FAILED",
  /** Provider data did not satisfy the shape the adapter promised. */
  "ADAPTER_CONTRACT",
  /** A read/write path escaped its allowed root, or crossed a symlink. */
  "PATH_CONTAINMENT",
  /** Instance selection named an ID the provider does not have (stale selection). */
  "STALE_SELECTION",
  /** A publication decision was missing, or a denied field reached the emitter. */
  "PUBLICATION_POLICY",
  /** A string or URL failed sanitisation and may not be published. */
  "UNSAFE_VALUE",
  /** Serialized MDX failed the post-serialisation safety guard. */
  "UNSAFE_MDX",
  /** Two records/anchors resolved to the same slug, or a slug was unusable. */
  "IDENTITY_COLLISION",
  /** A generated link points at a page or anchor this run did not produce. */
  "BROKEN_LINK",
  /** The committed generated tree does not match a fresh generation. */
  "GENERATED_DRIFT",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** Machine-readable detail attached to a failure; always JSON-serialisable. */
export type ErrorDetail = Readonly<Record<string, string | number | readonly string[]>>;

export class ComponentDocsError extends Error {
  readonly code: ErrorCode;
  readonly detail: ErrorDetail;

  constructor(code: ErrorCode, message: string, detail: ErrorDetail = {}) {
    super(`[${code}] ${message}`);
    this.name = "ComponentDocsError";
    this.code = code;
    this.detail = detail;
  }
}

export function fail(code: ErrorCode, message: string, detail?: ErrorDetail): never {
  throw new ComponentDocsError(code, message, detail);
}
