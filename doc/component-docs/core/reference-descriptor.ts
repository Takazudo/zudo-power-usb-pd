/**
 * The encoded, validated payload behind `<ComponentReferences descriptor="…" />`.
 *
 * ## Fork from led-lamp: every card is independently optional
 *
 * led-lamp's `assertComponentReferencesDescriptor()` enforces one exact key
 * set covering a document, a footprint preview and a 3D model, so a record
 * missing any of the three cannot produce a valid descriptor at all.
 *
 * zudo-pd cannot meet that: `rec-c335982` has a single `DISTRIBUTOR_IDENTITY`
 * source and no manufacturer document, no footprint preview SVG has been
 * generated yet, and no reviewed `.wrl`/`.step` pair exists for any package.
 * So each card here is `{ resolved: true, … }` or `{ resolved: false, reason }`
 * independently, and the exact-key-set discipline is kept per VARIANT rather
 * than dropped — an unresolved card still cannot smuggle in extra fields, and
 * a resolved card still needs every field it claims.
 *
 * A missing card renders as an explicit unresolved card naming its reason,
 * never as a silently omitted section. That matches the contract the records
 * index already publishes: "Open means unresolved, not unsafe. An open domain
 * names the reason it is open."
 */

import { decodeModelDescriptor, encodeModelDescriptor, type ModelViewerDescriptor } from "./model-descriptor.ts";

export const FOOTPRINT_ASSET_BASE = "/assets/component-previews/footprints/";

/** Why a card could not be resolved. Displayed verbatim to the reader. */
export type UnresolvedCard = { readonly resolved: false; readonly reason: string };

export type ResolvedDocumentCard = {
  readonly resolved: true;
  readonly label: string;
  readonly title: string;
  readonly authority: string;
  readonly availability: string;
  readonly url: string;
};

export type ResolvedFootprintCard = {
  readonly resolved: true;
  readonly name: string;
  readonly assetUrl: string;
};

/**
 * The footprint's unresolved form still carries the package name: the name is
 * known from the reviewed pin map even when no preview image exists, and a
 * card that names the package is more useful than one that only apologises.
 */
export type UnresolvedFootprintCard = {
  readonly resolved: false;
  readonly name: string;
  readonly reason: string;
};

/** Kept encoded so the same validated descriptor reaches the client island. */
export type ResolvedModelCard = { readonly resolved: true; readonly descriptor: string };

export type ComponentReferencesDescriptor = {
  readonly version: 1;
  readonly document: ResolvedDocumentCard | UnresolvedCard;
  readonly footprint: ResolvedFootprintCard | UnresolvedFootprintCard;
  readonly model: ResolvedModelCard | UnresolvedCard;
};

const HEX = /^(?:[0-9a-f]{2})+$/u;
const DOCUMENT_LABELS = new Set(["Datasheet PDF", "Specification PDF", "Mechanical drawing PDF"]);
const SAFE_FOOTPRINT_NAME = /^[A-Za-z0-9][A-Za-z0-9 ._+(),/-]*$/u;
const SAFE_FOOTPRINT_ASSET = /^\/assets\/component-previews\/footprints\/[A-Za-z0-9][A-Za-z0-9._+-]*\.svg$/u;

export function footprintAssetUrl(footprintName: string): string {
  const assetUrl = `${FOOTPRINT_ASSET_BASE}${footprintName}.svg`;
  if (!SAFE_FOOTPRINT_ASSET.test(assetUrl)) throw new Error("Footprint preview asset path is unsafe");
  return assetUrl;
}

export function encodeComponentReferencesDescriptor(descriptor: ComponentReferencesDescriptor): string {
  assertComponentReferencesDescriptor(descriptor);
  return [...new TextEncoder().encode(JSON.stringify(descriptor))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function decodeComponentReferencesDescriptor(encoded: string): ComponentReferencesDescriptor {
  if (!HEX.test(encoded) || encoded.length > 8192) throw new Error("Invalid component references descriptor encoding");
  const bytes = new Uint8Array(encoded.length / 2);
  for (let index = 0; index < encoded.length; index += 2) {
    bytes[index / 2] = Number.parseInt(encoded.slice(index, index + 2), 16);
  }
  const candidate: unknown = JSON.parse(new TextDecoder().decode(bytes));
  assertComponentReferencesDescriptor(candidate);
  return candidate;
}

export function createComponentReferencesDescriptor(input: {
  readonly document: Omit<ResolvedDocumentCard, "resolved"> | { readonly unresolvedReason: string };
  readonly footprintName: string;
  /** Resolved once a preview SVG for `footprintName` is emitted to the site. */
  readonly footprintPreview: { readonly available: true } | { readonly unresolvedReason: string };
  readonly model: ModelViewerDescriptor | { readonly unresolvedReason: string };
}): ComponentReferencesDescriptor {
  return {
    version: 1,
    document: "unresolvedReason" in input.document
      ? { resolved: false, reason: input.document.unresolvedReason }
      : { resolved: true, ...input.document },
    footprint: "unresolvedReason" in input.footprintPreview
      ? { resolved: false, name: input.footprintName, reason: input.footprintPreview.unresolvedReason }
      : { resolved: true, name: input.footprintName, assetUrl: footprintAssetUrl(input.footprintName) },
    model: "unresolvedReason" in input.model
      ? { resolved: false, reason: input.model.unresolvedReason }
      : { resolved: true, descriptor: encodeModelDescriptor(input.model) },
  };
}

export function assertComponentReferencesDescriptor(value: unknown): asserts value is ComponentReferencesDescriptor {
  if (typeof value !== "object" || value === null) throw new Error("Component references descriptor must be an object");
  const descriptor = value as Record<string, unknown>;
  if (Object.keys(descriptor).sort().join(",") !== "document,footprint,model,version" || descriptor.version !== 1) {
    throw new Error("Component references descriptor has unexpected fields");
  }
  assertDocument(descriptor.document);
  assertFootprint(descriptor.footprint);
  assertModel(descriptor.model);
}

/**
 * Shared entry point for every card: reads the `resolved` discriminant, and
 * for the unresolved branch enforces the exact `{resolved, reason}` key set
 * with a non-empty displayable reason. Returns `null` when the card resolved,
 * so each caller continues into its own key-set check.
 */
function unresolvedOrNull(value: unknown, card: string): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) throw new Error(`Component reference ${card} is invalid`);
  const record = value as Record<string, unknown>;
  if (record.resolved === true) return record;
  if (record.resolved !== false) throw new Error(`Component reference ${card} has no resolution state`);
  if (typeof record.reason !== "string" || !isDisplayText(record.reason)) {
    // An unresolved card whose reason is missing or unreadable would render as
    // a blank apology, which is worse than the resolved card it replaces.
    throw new Error(`Component reference ${card} is unresolved without a stated reason`);
  }
  return null;
}

function assertDocument(value: unknown): asserts value is ComponentReferencesDescriptor["document"] {
  const document = unresolvedOrNull(value, "document");
  if (document === null) {
    if (Object.keys(value as object).sort().join(",") !== "reason,resolved") {
      throw new Error("Component reference document has unexpected fields");
    }
    return;
  }
  if (Object.keys(document).sort().join(",") !== "authority,availability,label,resolved,title,url") {
    throw new Error("Component reference document has unexpected fields");
  }
  if (typeof document.label !== "string" || !DOCUMENT_LABELS.has(document.label)) {
    throw new Error("Component reference document label is not reviewed");
  }
  if (typeof document.title !== "string" || !isDisplayText(document.title)) {
    throw new Error("Component reference document title is unsafe");
  }
  if (typeof document.authority !== "string" || !isDisplayText(document.authority)) {
    throw new Error("Component reference document authority is unsafe");
  }
  if (typeof document.availability !== "string" || !isDisplayText(document.availability)) {
    throw new Error("Component reference document availability is unsafe");
  }
  if (typeof document.url !== "string" || !isSafeHttpUrl(document.url)) {
    throw new Error("Component reference document URL is unsafe");
  }
}

function assertFootprint(value: unknown): asserts value is ComponentReferencesDescriptor["footprint"] {
  const footprint = unresolvedOrNull(value, "footprint");
  const source = (footprint ?? value) as Record<string, unknown>;
  if (typeof source.name !== "string" || !SAFE_FOOTPRINT_NAME.test(source.name)) {
    throw new Error("Component reference footprint contains an unsafe value");
  }
  if (footprint === null) {
    if (Object.keys(source).sort().join(",") !== "name,reason,resolved") {
      throw new Error("Component reference footprint has unexpected fields");
    }
    return;
  }
  if (
    Object.keys(footprint).sort().join(",") !== "assetUrl,name,resolved" ||
    typeof footprint.assetUrl !== "string" ||
    !SAFE_FOOTPRINT_ASSET.test(footprint.assetUrl) ||
    footprint.assetUrl !== footprintAssetUrl(footprint.name as string)
  ) {
    throw new Error("Component reference footprint contains an unsafe value");
  }
}

function assertModel(value: unknown): asserts value is ComponentReferencesDescriptor["model"] {
  const model = unresolvedOrNull(value, "model");
  if (model === null) {
    if (Object.keys(value as object).sort().join(",") !== "reason,resolved") {
      throw new Error("Component reference model has unexpected fields");
    }
    return;
  }
  if (Object.keys(model).sort().join(",") !== "descriptor,resolved" || typeof model.descriptor !== "string") {
    throw new Error("Component references model descriptor is invalid");
  }
  decodeModelDescriptor(model.descriptor);
}

export function isSafeHttpUrl(value: string): boolean {
  if (value.length === 0 || value.length > 2000 || /[\s\p{Cc}\p{Cf}]/u.test(value)) return false;
  // The source URL has already passed `classifyUrl` during projection. The
  // SSR sandbox does not expose the URL constructor, so this second boundary
  // checks the dangerous distinctions directly instead of reparsing it there.
  const authority = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/u.exec(value)?.[1];
  return authority !== undefined && authority !== "" && !authority.includes("@");
}

/** Evidence strings are already SafeText in the renderer; this decoder only
 * needs to reject empty/control-filled external input before Preact escapes it. */
function isDisplayText(value: string): boolean {
  return value.length > 0 && value.length <= 1000 && !/[\p{Cc}\p{Cf}]/u.test(value);
}
