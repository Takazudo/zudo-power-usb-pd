import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { assertSafeUrl, classifyUrl } from "../core/url.ts";

describe("classifyUrl", () => {
  it("allows https", () => {
    const result = classifyUrl("https://www.diodes.com/datasheet/download/AL8860.pdf");
    assert.equal(result.decision, "ALLOW");
  });

  it("allows http", () => {
    assert.equal(classifyUrl("http://example.com/x").decision, "ALLOW");
  });

  it("publishes the original string rather than a normalised one", () => {
    const raw = "https://Example.COM:443/A%2Fb?q=1";
    const result = classifyUrl(raw);
    assert.equal(result.decision, "ALLOW");
    assert.equal(result.decision === "ALLOW" ? result.url : "", raw);
  });

  const denied: [string, string, string][] = [
    ["javascript", "javascript:alert(1)", "SCHEME_NOT_ALLOWED"],
    ["data", "data:text/html;base64,PHNjcmlwdD4=", "SCHEME_NOT_ALLOWED"],
    ["file", "file:///home/user/.ssh/id_rsa", "SCHEME_NOT_ALLOWED"],
    ["vbscript", "vbscript:msgbox(1)", "SCHEME_NOT_ALLOWED"],
    ["machine path", "/home/takazudo/repos/x.pdf", "NOT_ABSOLUTE"],
    ["windows path", "C:\\Users\\x\\a.pdf", "SCHEME_NOT_ALLOWED"],
    ["protocol relative", "//example.com/x", "NOT_ABSOLUTE"],
    ["bare host", "example.com/x", "NOT_ABSOLUTE"],
    ["credentials", "https://user:pass@example.com/x", "CREDENTIALS_IN_URL"],
    ["embedded space", "https://example.com/a b", "CONTAINS_WHITESPACE_OR_CONTROL"],
    ["leading whitespace", " https://example.com/", "CONTAINS_WHITESPACE_OR_CONTROL"],
    ["empty", "", "EMPTY"],
  ];

  for (const [name, value, reason] of denied) {
    it(`denies ${name}`, () => {
      const result = classifyUrl(value);
      assert.equal(result.decision, "DENY");
      assert.equal(result.decision === "DENY" ? result.reason : "", reason);
    });
  }

  it("denies a URL carrying a control character", () => {
    const result = classifyUrl(`https://example.com/${String.fromCodePoint(0x0d)}x`);
    assert.equal(result.decision, "DENY");
  });

  it("denies an over-long URL", () => {
    const result = classifyUrl(`https://example.com/${"x".repeat(2100)}`);
    assert.equal(result.decision === "DENY" ? result.reason : "", "TOO_LONG");
  });
});

describe("assertSafeUrl", () => {
  it("throws on a denied URL", () => {
    assert.throws(
      () => assertSafeUrl("javascript:alert(1)", "source.authoritativeUrl"),
      (error: unknown) => error instanceof ComponentDocsError && error.code === "UNSAFE_VALUE",
    );
  });
});
