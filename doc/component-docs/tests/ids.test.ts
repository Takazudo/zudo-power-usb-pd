import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { anchor, assertUnique, byCodeUnit, recordSlug } from "../core/ids.ts";

describe("recordSlug", () => {
  it("strips the record prefix", () => {
    assert.equal(recordSlug("rec-al8860mp-13"), "al8860mp-13");
    assert.equal(recordSlug("rec-c13585"), "c13585");
  });

  it("rejects an id that would need mangling rather than mangling it", () => {
    for (const id of ["rec-AL8860", "rec-a b", "rec-a/b", "rec-", "rec-a--b", "rec-1a"]) {
      assert.throws(
        () => recordSlug(id),
        (error: unknown) =>
          error instanceof ComponentDocsError && error.code === "IDENTITY_COLLISION",
        `expected ${id} to be rejected`,
      );
    }
  });

  it("rejects a reserved route segment", () => {
    assert.throws(
      () => recordSlug("rec-sitemap"),
      (error: unknown) =>
        error instanceof ComponentDocsError && error.code === "IDENTITY_COLLISION",
    );
  });
});

describe("anchor", () => {
  it("keeps provider ids verbatim", () => {
    assert.equal(anchor("fact-al8860-vin-absolute-max"), "fact-al8860-vin-absolute-max");
  });

  it("rejects anything outside the slug charset", () => {
    assert.throws(() => anchor("fact x"), ComponentDocsError);
  });
});

describe("assertUnique", () => {
  it("passes on distinct values", () => {
    assert.doesNotThrow(() => assertUnique("slug", ["a", "b"]));
  });

  it("names the duplicates", () => {
    try {
      assertUnique("slug", ["a", "b", "a"]);
      throw new Error("expected a collision");
    } catch (error) {
      assert.ok(error instanceof ComponentDocsError);
      assert.equal(error.code, "IDENTITY_COLLISION");
      assert.deepEqual(error.detail.duplicates, ["a"]);
    }
  });
});

describe("byCodeUnit", () => {
  it("is locale-independent", () => {
    const values = ["b", "A", "a", "B"].sort(byCodeUnit);
    assert.deepEqual(values, ["A", "B", "a", "b"]);
  });
});
