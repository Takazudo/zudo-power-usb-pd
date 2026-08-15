/**
 * The reference contract against the REAL corpus.
 *
 * led-lamp's version of this file asserts a curated document for every record
 * and a resolved WRL for every package. The document half holds for 40 of 41
 * records here (one honest gap, see below); the model half was a documented
 * exception through wave 6 (zero `.wrl`/`.step` files existed) and now also
 * holds in full since wave 7 sourced one for every package — so the same
 * questions are asked in both directions: a curated record must produce the
 * reviewed label and its source's own URL, an excepted one must reach an
 * explicitly unresolved state that names its reason, and the collapse figure
 * is retargeted from led-lamp's 32 records → 22 packages to zudo-pd's
 * 41 → 27.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { PublicationPolicy } from "../core/publication.ts";
import { projectIndex, readEvidenceIndex } from "../adapters/circuit/index.ts";
import { CIRCUIT_PUBLICATION_MATRIX } from "../adapters/circuit/matrix.ts";
import { CIRCUIT_DOCUMENT_VERIFICATION, CIRCUIT_SELECTION } from "../adapters/circuit/selection.ts";
import {
  REFERENCE_LIMITS,
  assertReferenceSize,
  assertSafePreviewAssetName,
  assertSameBasenamePair,
  selectDocumentExceptions,
  selectDocuments,
  validateVrml,
  type CircuitReferenceContract,
} from "../adapters/circuit/references.ts";
import type { EvidenceIndex } from "../adapters/circuit/evidence.ts";
import type { PublicViewModel } from "../core/view-model.ts";

let index: EvidenceIndex;
let references: CircuitReferenceContract;
let model: PublicViewModel;

before(async () => {
  index = await readEvidenceIndex();
  references = index.references as CircuitReferenceContract;
  model = projectIndex(index, new PublicationPolicy(CIRCUIT_PUBLICATION_MATRIX, CIRCUIT_SELECTION));
});

describe("reviewed document shortcuts", () => {
  it("partitions all 41 records into 40 curated and 1 excepted", () => {
    assert.equal(CIRCUIT_SELECTION.documentSelections.length, 40);
    assert.equal(CIRCUIT_SELECTION.documentExceptions.length, 1);
    assert.equal(model.records.length, 41);
    const curated = new Set(CIRCUIT_SELECTION.documentSelections.map((entry) => entry.recordId));
    const excepted = new Set(CIRCUIT_SELECTION.documentExceptions.map((entry) => entry.recordId));
    assert.equal(curated.size, 40);
    assert.equal(excepted.size, 1);
    for (const recordId of CIRCUIT_SELECTION.recordIds) {
      assert.equal(
        Number(curated.has(recordId)) + Number(excepted.has(recordId)),
        1,
        `${recordId} must be in exactly one of the two lists`,
      );
    }
  });

  it("gives every curated record a reviewed label and its source's own URL", () => {
    for (const record of model.records) {
      const document = record.reference.document;
      if (document === null) continue;
      assert.match(String(document.url), /^https?:\/\//u);
      assert.ok(
        ["Datasheet PDF", "Specification PDF", "Mechanical drawing PDF"].includes(String(document.label)),
        `${record.identity.recordId} has label ${String(document.label)}`,
      );
      assert.ok(String(document.sourceId).length > 0);
      assert.ok(String(document.documentTitle).length > 0);
      assert.ok(String(document.authorityClass).length > 0);
      assert.ok(String(document.availability).length > 0);
      // The published URL is the selected source's own, never derived.
      const source = index.recordById
        .get(record.identity.recordId)
        ?.sources.find((entry) => entry.source_id === String(document.sourceId));
      assert.equal(String(document.url), source?.authoritative_url);
      assert.equal(record.reference.documentUnresolvedReason, null);
    }
    assert.equal(model.records.filter((record) => record.reference.document !== null).length, 40);
  });

  it("leaves rec-c335982 unresolved with a reason naming the missing document", () => {
    // The audit's one honest gap: a single DISTRIBUTOR_IDENTITY source and no
    // manufacturer document behind it. The page must say that rather than
    // present the LCSC listing as a datasheet.
    const record = model.records.find((entry) => entry.identity.recordId === "rec-c335982");
    assert.ok(record !== undefined);
    assert.equal(record.reference.document, null);
    const reason = String(record.reference.documentUnresolvedReason ?? "");
    assert.match(reason, /No manufacturer document exists/u);
    assert.match(reason, /distributor product listing/u);
    // And the LCSC page it does have stays visible, with its class printed.
    const listing = record.sources.find((entry) => String(entry.sourceId) === "src-c335982-identity");
    assert.equal(String(listing?.authorityClass), "DISTRIBUTOR_IDENTITY");
  });

  it("does not infer kind from the source ID's suffix", () => {
    // Both of these are named `-datasheet` and are not datasheets. The kind
    // follows the document's own self-description.
    for (const [recordId, expected] of [
      ["rec-cya1265-100uh-c19268674", "Specification PDF"],
      ["rec-ptc-msmd110-33v-c70119", "Specification PDF"],
      ["rec-ss34-c8678", "Datasheet PDF"],
    ] as const) {
      const record = model.records.find((entry) => entry.identity.recordId === recordId);
      assert.equal(String(record?.reference.document?.label), expected, recordId);
      assert.match(String(record?.reference.document?.sourceId), /-datasheet$/u);
    }
    const drawing = model.records.find(
      (entry) => entry.identity.recordId === "rec-hdr-2541wr-2x08p-c5383092",
    );
    assert.equal(String(drawing?.reference.document?.label), "Mechanical drawing PDF");
  });

  it("publishes the four mirror selections as mirrors, not as primaries", () => {
    // Each of these is the best document that exists for its part, and the
    // card has to keep saying so — silently reading as MANUFACTURER_PRIMARY
    // would overstate the evidence.
    assert.equal(CIRCUIT_DOCUMENT_VERIFICATION.mirrorSourceIds.length, 4);
    for (const sourceId of CIRCUIT_DOCUMENT_VERIFICATION.mirrorSourceIds) {
      const record = model.records.find(
        (entry) => String(entry.reference.document?.sourceId) === sourceId,
      );
      assert.ok(record !== undefined, `${sourceId} is not a selected document`);
      assert.equal(String(record.reference.document?.authorityClass), "MANUFACTURER_MIRROR");
      assert.equal(String(record.reference.document?.availability), "AVAILABLE");
    }
    const mirrors = model.records.filter(
      (entry) => String(entry.reference.document?.authorityClass) === "MANUFACTURER_MIRROR",
    );
    assert.equal(mirrors.length, 4);
  });

  it("records how the document audit was performed, at its real strength", () => {
    // led-lamp downloaded and parsed every PDF. This audit read the evidence
    // bundles' recorded metadata instead, and the constant must not be
    // mistakable for the stronger check.
    assert.equal(CIRCUIT_DOCUMENT_VERIFICATION.checkedOn, "2026-08-15");
    assert.equal(CIRCUIT_DOCUMENT_VERIFICATION.expectedContent, "PDF");
    assert.equal(CIRCUIT_DOCUMENT_VERIFICATION.method, "EVIDENCE_BUNDLE_METADATA");
    assert.deepEqual(
      [...CIRCUIT_DOCUMENT_VERIFICATION.unresolvedRecordIds],
      CIRCUIT_SELECTION.documentExceptions.map((entry) => entry.recordId),
    );
    // What the audit could check offline, checked here too: no selected
    // document is one the evidence itself records as unreachable. (The
    // hash-lock half of the audit reads `sha256`/`refresh_policy`, which
    // `ProviderSource` deliberately does not expose — `component-spec-audit`'s
    // validator owns that contract and this file must not restate it.)
    for (const selected of CIRCUIT_SELECTION.documentSelections) {
      const source = index.recordById
        .get(selected.recordId)
        ?.sources.find((entry) => entry.source_id === selected.sourceId);
      assert.ok(source !== undefined, selected.sourceId);
      assert.equal(source.availability, "AVAILABLE", selected.sourceId);
      assert.match(source.authoritative_url, /^https?:\/\//u, selected.sourceId);
    }
  });

  it("refuses a document exception that does not resolve to a record", () => {
    assert.throws(
      () => selectDocumentExceptions(index, {
        ...CIRCUIT_SELECTION,
        documentExceptions: [{ recordId: "rec-does-not-exist", reason: "because" }],
      }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "STALE_SELECTION",
    );
  });

  it("refuses a record that is neither curated nor excepted", () => {
    assert.throws(
      () => new PublicationPolicy(CIRCUIT_PUBLICATION_MATRIX, {
        ...CIRCUIT_SELECTION,
        documentSelections: CIRCUIT_SELECTION.documentSelections.slice(1),
      }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });

  it("refuses a record listed twice, which one covering entry would satisfy", () => {
    // The uncovered-list filter alone cannot see this: both occurrences of the
    // duplicate resolve to the same covering entry.
    assert.throws(
      () => new PublicationPolicy(CIRCUIT_PUBLICATION_MATRIX, {
        ...CIRCUIT_SELECTION,
        recordIds: [...CIRCUIT_SELECTION.recordIds, "rec-ss34-c8678"],
      }),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
    );
  });

  it("refuses an exception that states no reason, and one that doubles a selection", () => {
    for (const documentExceptions of [
      [{ recordId: "rec-c335982", reason: "   " }],
      [
        ...CIRCUIT_SELECTION.documentExceptions,
        { recordId: "rec-ss34-c8678", reason: "contradicts its own curated entry" },
      ],
    ]) {
      assert.throws(
        () => new PublicationPolicy(CIRCUIT_PUBLICATION_MATRIX, {
          ...CIRCUIT_SELECTION,
          documentExceptions,
        }),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "PUBLICATION_POLICY",
      );
    }
  });

  it("refuses a document selection that does not resolve inside its record", () => {
    for (const selection of [
      { recordId: "rec-stusb4500qtr", sourceId: "src-does-not-exist" },
      // A real source, but owned by a different record.
      { recordId: "rec-stusb4500qtr", sourceId: "src-ss34-datasheet" },
      { recordId: "rec-does-not-exist", sourceId: "src-stusb-ds12499" },
    ]) {
      assert.throws(
        () => selectDocuments(index, {
          ...CIRCUIT_SELECTION,
          documentSelections: [{ ...selection, documentKind: "datasheet" }],
        }),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "STALE_SELECTION",
      );
    }
  });
});

describe("KiCad preview manifest", () => {
  it("maps every record to one descriptor and collapses 41 records to 27 packages", () => {
    assert.equal(references.packages.length, 27);
    assert.equal(new Set(references.packages.map((entry) => entry.packageId)).size, 27);
    assert.equal(references.packages.flatMap((entry) => entry.recordIds).length, 41);
    assert.equal(references.packageByRecordId.size, 41);
    for (const record of model.records) {
      assert.ok(String(record.reference.footprint.footprintName).length > 0);
    }
  });

  it("reads the collapse figure from the reviewed selection, not a literal", () => {
    // led-lamp hardcodes 22 inside `references.ts`. Here the number lives in
    // `selection.ts` next to the record list it is derived from, so promoting
    // a candidate cannot change one without the other being looked at.
    assert.equal(CIRCUIT_SELECTION.expect.footprintPackages, 27);
    assert.equal(references.packages.length, CIRCUIT_SELECTION.expect.footprintPackages);
  });

  it("shares one package descriptor across every record that uses it", () => {
    // R0603 is the worst case: eight records on one footprint. Each of them
    // must see the SAME descriptor carrying the complete shared-record list,
    // not a partial one built when the first of the eight was reached.
    const r0603 = references.packages.find((entry) => entry.footprintName === "R0603");
    assert.ok(r0603 !== undefined);
    assert.equal(r0603.recordIds.length, 8);
    for (const recordId of r0603.recordIds) {
      assert.deepEqual(references.packageByRecordId.get(recordId)?.recordIds, r0603.recordIds);
    }
  });
});

describe("the 3D model is optional, and best-effort resolved it in full", () => {
  it("resolves a reviewed model for every package (27 of 27, wave 7)", () => {
    // Wave 7 sourced a reviewed `.wrl`/`.step` pair via `easyeda2kicad` for
    // every package the tool could supply one for, against the central
    // inventory's LCSC ids — including the 3 packages that previously carried
    // no `(model …)` line at all. The real corpus therefore has zero
    // unresolved packages today; `readPackage()`'s unresolved branches (no
    // `(model …)` line, or one pointing outside `MODEL_ROOT`) stay live code
    // for whatever a future promoted/candidate part cannot supply, but this
    // corpus no longer exercises either case — see the wave-7 coverage
    // manifest for the one LCSC substitution that made this possible
    // (`CAP-SMD_BD10.0-L10.3-W10.3-LS11.0-FD`'s first inventory line returns a
    // mismatched, undersized model; its sibling line does not).
    for (const entry of references.packages) {
      assert.notEqual(entry.model, undefined, `${entry.packageId} did not resolve a model`);
      assert.equal(entry.modelUnresolvedReason, undefined, `${entry.packageId} has a stale unresolved reason`);
      const modelPath = String(entry.model?.modelPath);
      assert.match(modelPath, /^footprints\/kicad\/zudo-pd\.3dshapes\/[^/]+\.wrl$/u, entry.packageId);
      for (const axis of ["x", "y", "z"] as const) {
        for (const transform of [entry.model?.offset, entry.model?.rotation, entry.model?.scale]) {
          assert.equal(typeof transform?.[axis], "number", entry.packageId);
          assert.ok(Number.isFinite(transform?.[axis]), entry.packageId);
        }
      }
    }
    for (const record of model.records) {
      assert.notEqual(record.reference.footprint.model, null);
      assert.equal(record.reference.footprint.modelUnresolvedReason, null);
    }
  });
});

describe("preview assets fail closed", () => {
  const rejects = (fn: () => void, code: ComponentDocsError["code"]) =>
    assert.throws(fn, (error: unknown) => error instanceof ComponentDocsError && error.code === code);

  it("rejects traversal, absolute and external-looking asset names", () => {
    for (const path of ["../part.wrl", "/tmp/part.wrl", "models/part.wrl", "C:\\part.wrl", "https:part.wrl"]) {
      rejects(() => assertSafePreviewAssetName(path, "rec-hostile"), "PATH_CONTAINMENT");
    }
  });

  it("rejects resource-loading, executable and loader-unsupported VRML nodes", () => {
    for (const payload of [
      "#VRML V2.0 utf8\nInline { url \"https://evil.invalid/model.wrl\" }",
      "#VRML V2.0 utf8\nScript { url \"javascript:alert(1)\" }",
      "#VRML V2.0 utf8\nImageTexture { url \"data:image/png;base64,AA\" }",
      "#VRML V2.0 utf8\nTransform { children [] }",
      "#VRML V2.0 utf8\nShape { url \"relative-model.wrl\" }",
      "#VRML V2.0 utf8\nROUTE A.out TO B.in",
    ]) rejects(() => validateVrml(payload, "rec-hostile", "hostile.wrl"), "PUBLICATION_POLICY");
    rejects(
      () => validateVrml('#VRML V2.0 utf8\nShape { name "../../private/model.wrl" }', "rec-hostile", "hostile.wrl"),
      "PATH_CONTAINMENT",
    );
  });

  it("allows harmless URLs in generator comments but not live nodes", () => {
    assert.doesNotThrow(() => validateVrml("#VRML V2.0 utf8\n# generated by https://example.invalid\nShape { }", "rec-safe", "safe.wrl"));
  });

  it("rejects missing/mismatched format pairs and all size-cap violations", () => {
    rejects(() => assertSameBasenamePair("part.wrl", "other.step", "rec-hostile"), "ADAPTER_CONTRACT");
    rejects(() => assertSameBasenamePair("part.wrl", "part.stp", "rec-hostile"), "ADAPTER_CONTRACT");
    rejects(() => assertReferenceSize("footprint", REFERENCE_LIMITS.footprintBytes + 1, "rec-hostile"), "PUBLICATION_POLICY");
    rejects(() => assertReferenceSize("model", REFERENCE_LIMITS.modelBytes + 1, "rec-hostile"), "PUBLICATION_POLICY");
    rejects(() => assertReferenceSize("aggregate", REFERENCE_LIMITS.aggregateModelBytes + 1, "rec-hostile"), "PUBLICATION_POLICY");
  });
});
