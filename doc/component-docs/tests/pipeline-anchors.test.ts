import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { anchor, recordSlug } from "../core/ids.ts";
import { assertAnchorIntegrity } from "../core/pipeline.ts";
import { literal } from "../core/text.ts";
import { VIEW_MODEL_VERSION, type PublicRecord, type PublicViewModel } from "../core/view-model.ts";

/**
 * `assertAnchorIntegrity` reads only anchors, ids and the slug used in its error text.
 * Building fully-populated records here would obscure which field each case is about,
 * so these fixtures carry just the nodes under test.
 */
type RecordParts = {
  readonly recordId: string;
  readonly sourceAnchors?: readonly string[];
  readonly factAnchors?: readonly string[];
  readonly coverageAnchors?: readonly string[];
  readonly pinMapAnchors?: readonly string[];
  readonly interactions?: readonly {
    readonly id: string;
    readonly anchor: string;
    /** Every record the interaction names. Defaults to the one it is attached to. */
    readonly recordIds?: readonly string[];
  }[];
};

function record(parts: RecordParts): PublicRecord {
  return {
    identity: {
      // `recordId` is read too: it is the key the rendered-interaction index is
      // filed under, so without it a page's interactions cannot be resolved.
      recordId: literal(parts.recordId),
      anchor: anchor(parts.recordId),
      slug: recordSlug(parts.recordId),
    },
    aliases: {},
    sources: (parts.sourceAnchors ?? []).map((id) => ({ anchor: anchor(id) })),
    facts: (parts.factAnchors ?? []).map((id) => ({ anchor: anchor(id) })),
    coverage: (parts.coverageAnchors ?? []).map((id) => ({ anchor: anchor(id) })),
    interactions: (parts.interactions ?? []).map((entry) => ({
      anchor: anchor(entry.anchor),
      interactionId: literal(entry.id),
      // Read by the check: an interaction is rendered on every record it NAMES,
      // not only the one it is attached to, so its participants decide which
      // pages its anchor lands on.
      recordIds: (entry.recordIds ?? [parts.recordId]).map(literal),
    })),
    pinMaps: (parts.pinMapAnchors ?? []).map((id) => ({ anchor: anchor(id) })),
  } as unknown as PublicRecord;
}

function model(records: readonly PublicRecord[]): PublicViewModel {
  return { version: VIEW_MODEL_VERSION, records, integration: [] } as unknown as PublicViewModel;
}

function collides(subject: PublicViewModel): boolean {
  try {
    assertAnchorIntegrity(subject);
    return false;
  } catch (error) {
    assert.ok(error instanceof ComponentDocsError);
    assert.equal(error.code, "IDENTITY_COLLISION");
    return true;
  }
}

describe("anchor integrity", () => {
  it("publishes one interaction on every participating record", () => {
    // The real corpus does this 6 times over; int-al8860-power-stage spans 4 records.
    // A flat global uniqueness check would abort the build here.
    const participants = [
      "rec-al8860mp-13",
      "rec-rlp25feer200",
      "rec-fxl0630-330-m",
      "rec-ro-ss26",
    ];
    const shared = [
      {
        id: "int-al8860-power-stage",
        anchor: "int-al8860-power-stage",
        recordIds: participants,
      },
    ];
    assert.equal(
      collides(
        model([
          record({ recordId: "rec-al8860mp-13", interactions: shared }),
          record({ recordId: "rec-rlp25feer200", interactions: shared }),
          record({ recordId: "rec-fxl0630-330-m", interactions: shared }),
          record({ recordId: "rec-ro-ss26", interactions: shared }),
        ]),
      ),
      false,
    );
  });

  it("refuses one anchor denoting two different interactions", () => {
    assert.equal(
      collides(
        model([
          record({
            recordId: "rec-one",
            interactions: [{ id: "int-alpha", anchor: "int-shared" }],
          }),
          record({
            recordId: "rec-two",
            interactions: [{ id: "int-beta", anchor: "int-shared" }],
          }),
        ]),
      ),
      true,
    );
  });

  it("still refuses a record-scoped anchor reused across records", () => {
    // Facts, sources, coverage and pin maps each carry a singular recordId, so they
    // belong to exactly one page and stay globally unique.
    assert.equal(
      collides(
        model([
          record({ recordId: "rec-one", factAnchors: ["fact-vin-max"] }),
          record({ recordId: "rec-two", factAnchors: ["fact-vin-max"] }),
        ]),
      ),
      true,
    );
  });

  it("refuses an interaction anchor colliding with a fact on a page it only NAMES", () => {
    // The subtle case. The interaction is attached to rec-one, but names rec-two
    // as well, so the renderer publishes it on rec-two's page too — where its
    // anchor collides with a fact. Checking only the attached record would pass
    // this and ship two elements with the same HTML id.
    assert.equal(
      collides(
        model([
          record({
            recordId: "rec-one",
            interactions: [
              { id: "int-alpha", anchor: "shared-anchor", recordIds: ["rec-one", "rec-two"] },
            ],
          }),
          record({ recordId: "rec-two", factAnchors: ["shared-anchor"] }),
        ]),
      ),
      true,
    );
  });

  it("refuses an interaction anchor colliding with a fact on the same page", () => {
    // Same document, so this would emit a duplicate HTML id.
    assert.equal(
      collides(
        model([
          record({
            recordId: "rec-one",
            factAnchors: ["shared-anchor"],
            interactions: [{ id: "int-alpha", anchor: "shared-anchor" }],
          }),
        ]),
      ),
      true,
    );
  });
});
