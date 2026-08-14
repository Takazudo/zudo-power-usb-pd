/**
 * The reference contract against the REAL corpus.
 *
 * led-lamp's version of this file asserts a curated document for every record
 * and a resolved WRL for every package. Neither holds here yet, so the same
 * questions are asked in the opposite direction: every record must reach an
 * explicitly unresolved state that names its reason, and the collapse figure
 * is retargeted from led-lamp's 32 records → 22 packages to zudo-pd's 41 → 27.
 */

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { PublicationPolicy } from "../core/publication.ts";
import { projectIndex, readEvidenceIndex } from "../adapters/circuit/index.ts";
import { CIRCUIT_PUBLICATION_MATRIX } from "../adapters/circuit/matrix.ts";
import { CIRCUIT_SELECTION } from "../adapters/circuit/selection.ts";
import {
  REFERENCE_LIMITS,
  assertReferenceSize,
  assertSafePreviewAssetName,
  assertSameBasenamePair,
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
  it("selects no document yet, and says so on every one of the 41 records", () => {
    assert.equal(CIRCUIT_SELECTION.documentSelections.length, 0);
    assert.equal(model.records.length, 41);
    for (const record of model.records) {
      assert.equal(record.reference.document, null);
      const reason = record.reference.documentUnresolvedReason;
      assert.notEqual(reason, null, `${record.identity.recordId} is unresolved with no reason`);
      assert.ok(String(reason).length > 0);
    }
  });

  it("keeps the curated path live for the records that will get one", () => {
    // Not a hypothetical: this is the code #143 turns on. A selection that
    // resolves must produce the reviewed label and the source's own URL.
    const record = index.recordById.get("rec-stusb4500qtr");
    const source = record?.sources.find((entry) => entry.source_id === "src-stusb-ds12499");
    assert.ok(source !== undefined);
    const selected = selectDocuments(index, {
      ...CIRCUIT_SELECTION,
      documentSelections: [
        { recordId: "rec-stusb4500qtr", sourceId: "src-stusb-ds12499", documentKind: "datasheet" },
      ],
    });
    assert.equal(selected.size, 1);
    assert.equal(selected.get("rec-stusb4500qtr")?.documentKind, "datasheet");
    assert.match(selected.get("rec-stusb4500qtr")?.source.authoritative_url ?? "", /^https?:\/\//u);
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

describe("the 3D model is optional, and says why", () => {
  it("leaves every package model unresolved with a stated reason", () => {
    // This repository has no `.wrl`/`.step` files at all. led-lamp's
    // `readPackage()` would fail the build on the first footprint.
    for (const entry of references.packages) {
      assert.equal(entry.model, undefined, `${entry.packageId} resolved a model that cannot exist`);
      assert.ok(
        (entry.modelUnresolvedReason ?? "").length > 0,
        `${entry.packageId} is model-unresolved with no reason`,
      );
    }
    for (const record of model.records) {
      assert.equal(record.reference.footprint.model, null);
      assert.notEqual(record.reference.footprint.modelUnresolvedReason, null);
    }
  });

  it("distinguishes a missing model line from one pointing outside the repo", () => {
    // The two real cases, kept apart so the page says which one applies.
    const reasons = new Set(references.packages.map((entry) => entry.modelUnresolvedReason));
    assert.ok([...reasons].some((reason) => reason === "The KiCad footprint names no 3D model."));
    assert.ok([...reasons].some((reason) => reason?.includes("EASYEDA2KICAD")));
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
