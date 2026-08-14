import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { MAX_TEXT_LENGTH, joinSafe, literal, safeText } from "../core/text.ts";

const field = "test";

function rejects(value: string, options: { allowNewlines?: boolean } = {}): ComponentDocsError {
  try {
    safeText(value, { field, ...options });
  } catch (error) {
    assert.ok(error instanceof ComponentDocsError, `expected ComponentDocsError, got ${error}`);
    return error;
  }
  throw new Error(`expected rejection for ${JSON.stringify(value)}`);
}

describe("safeText", () => {
  it("keeps ordinary evidence text intact", () => {
    assert.equal(
      safeText("40 V recommended, TA=25 C", { field }),
      "40 V recommended, TA=25 C",
    );
  });

  it("normalises to NFC so equal-looking strings serialise identically", () => {
    const decomposed = `e${String.fromCodePoint(0x0301)}`;
    const composed = String.fromCodePoint(0x00e9);
    assert.equal(safeText(decomposed, { field }), composed);
  });

  it("collapses whitespace and CRLF", () => {
    assert.equal(safeText("a \t b\r\nc", { field, allowNewlines: true }), "a b\nc");
  });

  it("rejects control characters", () => {
    const error = rejects(`bell${String.fromCodePoint(0x07)}`);
    assert.equal(error.code, "UNSAFE_VALUE");
    assert.equal(error.detail.codePoint, "U+0007");
  });

  it("rejects NUL", () => {
    assert.equal(rejects(`a${String.fromCodePoint(0x00)}b`).detail.codePoint, "U+0000");
  });

  it("rejects bidi overrides (Trojan Source)", () => {
    // U+202E right-to-left override can make "42 V" render as "V 24".
    const error = rejects(`42${String.fromCodePoint(0x202e)} V`);
    assert.equal(error.code, "UNSAFE_VALUE");
    assert.equal(error.detail.codePoint, "U+202E");
  });

  it("rejects zero-width space", () => {
    assert.equal(rejects(`4${String.fromCodePoint(0x200b)}2`).detail.codePoint, "U+200B");
  });

  it("rejects a lone surrogate", () => {
    assert.equal(rejects(`a${String.fromCharCode(0xd800)}b`).code, "UNSAFE_VALUE");
  });

  it("rejects a newline where the field is single-line", () => {
    assert.equal(rejects("a\nb").code, "UNSAFE_VALUE");
  });

  it("rejects an over-long value", () => {
    assert.equal(rejects("x".repeat(MAX_TEXT_LENGTH + 1)).code, "UNSAFE_VALUE");
  });

  it("rejects an empty value by default", () => {
    assert.equal(rejects("   ").code, "UNSAFE_VALUE");
  });

  it("accepts an empty value when the caller opts in", () => {
    assert.equal(safeText("", { field, allowEmpty: true }), "");
  });

  it("rejects a non-string", () => {
    assert.throws(() => safeText(42, { field }), ComponentDocsError);
  });

  it("passes markup-looking text through unchanged — escaping is the serializer's job", () => {
    const raw = "value < 5 and {x} and <script>";
    assert.equal(safeText(raw, { field }), raw);
  });
});

describe("joinSafe", () => {
  it("joins safe fragments", () => {
    assert.equal(joinSafe([literal("a"), literal("b")], ", "), "a, b");
  });

  it("rejects an unpublishable separator", () => {
    assert.throws(
      () => joinSafe([literal("a")], String.fromCodePoint(0x202e)),
      ComponentDocsError,
    );
  });
});
