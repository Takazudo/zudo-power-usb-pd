import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createComponentReferencesDescriptor,
  decodeComponentReferencesDescriptor,
  encodeComponentReferencesDescriptor,
  footprintAssetUrl,
} from "../core/reference-descriptor.ts";

const resolvedDocument = {
  label: "Specification PDF",
  title: "Fixture specification",
  authority: "MANUFACTURER_PRIMARY",
  availability: "AVAILABLE",
  url: "https://example.invalid/fixture.pdf",
} as const;

const resolvedModel = {
  version: 1,
  packageId: "PKG-FIXTURE",
  packageLabel: "PKG-FIXTURE",
  modelUrl: "/assets/component-previews/models/PKG-FIXTURE.wrl",
  offset: { x: 0, y: 0, z: 0 },
  rotation: { x: 0, y: 0, z: 0 },
  scale: { x: 1, y: 1, z: 1 },
} as const;

const resolvedFootprintPath = "footprints/kicad/zudo-power.pretty/PKG-FIXTURE.kicad_mod";

/** Everything resolved — led-lamp's only shape, and this fork's happy path. */
const descriptor = createComponentReferencesDescriptor({
  document: resolvedDocument,
  footprintName: "PKG-FIXTURE",
  footprintPath: resolvedFootprintPath,
  footprintPreview: { available: true },
  model: resolvedModel,
});

/** The shape the real corpus produces today: every card unresolved. */
const unresolved = createComponentReferencesDescriptor({
  document: { unresolvedReason: "No single document has been reviewed yet." },
  footprintName: "PKG-FIXTURE",
  footprintPath: resolvedFootprintPath,
  footprintPreview: { unresolvedReason: "No footprint preview image is generated yet." },
  model: { unresolvedReason: "The KiCad footprint names no 3D model." },
});

describe("component references descriptor", () => {
  it("round-trips the reviewed PDF values and local preview paths", () => {
    const encoded = encodeComponentReferencesDescriptor(descriptor);
    assert.deepEqual(decodeComponentReferencesDescriptor(encoded), descriptor);
    assert.equal(footprintAssetUrl("PKG-FIXTURE"), "/assets/component-previews/footprints/PKG-FIXTURE.svg");
  });

  it("rejects an unsafe or mismatched footprint asset path", () => {
    assert.throws(() => footprintAssetUrl("../escape"));
    const altered = {
      ...descriptor,
      footprint: { ...descriptor.footprint, assetUrl: "/assets/component-previews/footprints/other.svg" },
    };
    assert.throws(() => encodeComponentReferencesDescriptor(altered as typeof descriptor));
  });

  it("rejects a PDF label that was not supplied by the reviewed model", () => {
    const altered = { ...descriptor, document: { ...descriptor.document, label: "Product page" } };
    assert.throws(() => encodeComponentReferencesDescriptor(altered as typeof descriptor));
  });

  it("rejects non-HTTP(S) and credential-bearing document URLs", () => {
    for (const url of ["javascript:alert(1)", "https://user:password@example.invalid/reference.pdf"]) {
      const altered = { ...descriptor, document: { ...descriptor.document, url } };
      assert.throws(() => encodeComponentReferencesDescriptor(altered as typeof descriptor));
    }
  });

  // --- the fork: cards are independently optional -------------------------

  it("round-trips a descriptor whose every card is unresolved", () => {
    const encoded = encodeComponentReferencesDescriptor(unresolved);
    assert.deepEqual(decodeComponentReferencesDescriptor(encoded), unresolved);
    assert.equal(unresolved.document.resolved, false);
    assert.equal(unresolved.model.resolved, false);
    // The footprint NAME survives even unresolved: it is reviewed pin-map
    // truth, and a card that names the package beats one that only apologises.
    assert.equal(unresolved.footprint.resolved, false);
    assert.equal(unresolved.footprint.name, "PKG-FIXTURE");
  });

  it("lets each card resolve independently of the other two", () => {
    const documentOnly = createComponentReferencesDescriptor({
      document: resolvedDocument,
      footprintName: "PKG-FIXTURE",
      footprintPath: resolvedFootprintPath,
      footprintPreview: { unresolvedReason: "not generated" },
      model: { unresolvedReason: "no reviewed WRL" },
    });
    assert.equal(documentOnly.document.resolved, true);
    assert.equal(documentOnly.footprint.resolved, false);
    assert.equal(documentOnly.model.resolved, false);
    assert.deepEqual(
      decodeComponentReferencesDescriptor(encodeComponentReferencesDescriptor(documentOnly)),
      documentOnly,
    );
  });

  it("refuses an unresolved card that does not state its reason", () => {
    // The whole point of the fork: unresolved must NAME why. A blank reason
    // renders as an apology with no content, which is worse than the card it
    // replaces, so it fails closed at the descriptor boundary.
    for (const card of ["document", "footprint", "model"] as const) {
      const blank = {
        ...unresolved,
        [card]: { ...unresolved[card], reason: "" },
      };
      assert.throws(() => encodeComponentReferencesDescriptor(blank as typeof unresolved));
    }
  });

  it("refuses a card with no resolution state at all", () => {
    // led-lamp's descriptor had no `resolved` discriminant. A payload in that
    // older shape must not decode as either variant by accident.
    const legacy = {
      version: 1,
      document: { label: "Datasheet PDF", title: "t", authority: "a", availability: "AVAILABLE", url: "https://example.invalid/a.pdf" },
      footprint: { name: "PKG-FIXTURE", assetUrl: "/assets/component-previews/footprints/PKG-FIXTURE.svg" },
      model: { descriptor: "00" },
    };
    assert.throws(() => encodeComponentReferencesDescriptor(legacy as unknown as typeof descriptor));
  });

  it("refuses an unresolved card carrying extra fields", () => {
    // Exact-key-set discipline is kept per variant rather than dropped: an
    // unresolved card must not smuggle a URL past the resolved card's checks.
    const smuggled = {
      ...unresolved,
      document: { ...unresolved.document, url: "javascript:alert(1)" },
    };
    assert.throws(() => encodeComponentReferencesDescriptor(smuggled as typeof unresolved));
  });
});
