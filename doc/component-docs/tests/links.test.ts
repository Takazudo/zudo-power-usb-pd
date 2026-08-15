import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ComponentDocsError } from "../core/errors.ts";
import { anchor } from "../core/ids.ts";
import { assertLinkIntegrity } from "../core/links.ts";
import {
  evidenceAnchor,
  paragraph,
  route,
  routeLink,
  fragmentRoute,
  text,
  type Route,
} from "../core/mdx.ts";
import { buildPage, type GeneratedPage } from "../core/page.ts";
import { literal } from "../core/text.ts";
import type { RootContent } from "mdast";

function page(relativePath: string, body: readonly RootContent[]): GeneratedPage {
  return buildPage(
    relativePath,
    { title: literal("Title"), description: literal("Description"), sidebarPosition: 1 },
    body,
  );
}

function linkTo(target: Route): RootContent {
  return paragraph([routeLink(target, literal("go"))]);
}

function breaks(pages: readonly GeneratedPage[]): string[] | null {
  try {
    assertLinkIntegrity(pages);
    return null;
  } catch (error) {
    assert.ok(error instanceof ComponentDocsError);
    assert.equal(error.code, "BROKEN_LINK");
    return error.detail.broken as string[];
  }
}

describe("collecting references off the AST", () => {
  it("reads anchors and links out of nested content, not out of the text", () => {
    const built = page("index.mdx", [
      evidenceAnchor(anchor("rec-one")),
      paragraph([
        routeLink(fragmentRoute(anchor("rec-one")), literal("here")),
        // A label containing brackets is exactly what a regex over the
        // serialized file would misread as a second link.
        routeLink(route("/docs/components/catalog/"), literal("a [bracketed] label")),
      ]),
    ]);

    assert.deepEqual(built.anchors, ["rec-one"]);
    assert.deepEqual(built.links, ["#rec-one", "/docs/components/catalog/"]);
  });

  it("does not mistake a plain text mention of a path for a link", () => {
    const built = page("index.mdx", [
      paragraph([text(literal("see /docs/components/records/nope/ for details"))]),
    ]);

    assert.deepEqual(built.links, []);
  });
});

describe("link integrity", () => {
  it("accepts a same-page fragment whose anchor is on the page", () => {
    assert.equal(
      breaks([
        page("index.mdx", [
          evidenceAnchor(anchor("fact-one")),
          linkTo(fragmentRoute(anchor("fact-one"))),
        ]),
      ]),
      null,
    );
  });

  it("rejects a same-page fragment whose anchor is on a DIFFERENT page", () => {
    const broken = breaks([
      page("index.mdx", [linkTo(fragmentRoute(anchor("fact-one")))]),
      page("catalog/index.mdx", [evidenceAnchor(anchor("fact-one"))]),
    ]);

    assert.deepEqual(broken, ["index.mdx → #fact-one (no such anchor on this page)"]);
  });

  it("resolves a cross-page link through the route-to-file mapping", () => {
    assert.equal(
      breaks([
        page("index.mdx", [
          linkTo(route("/docs/components/records/al8860mp-13/", anchor("rec-al8860mp-13"))),
        ]),
        page("records/al8860mp-13/index.mdx", [evidenceAnchor(anchor("rec-al8860mp-13"))]),
      ]),
      null,
    );
  });

  it("rejects a link to a route no page in this run produced", () => {
    const broken = breaks([
      page("index.mdx", [linkTo(route("/docs/components/records/ghost/"))]),
    ]);

    assert.deepEqual(broken, [
      "index.mdx → /docs/components/records/ghost/ (no such generated page)",
    ]);
  });

  it("rejects a cross-page fragment the target page does not define", () => {
    const broken = breaks([
      page("index.mdx", [linkTo(route("/docs/components/catalog/", anchor("rec-ghost")))]),
      page("catalog/index.mdx", [evidenceAnchor(anchor("rec-real"))]),
    ]);

    assert.deepEqual(broken, [
      "index.mdx → /docs/components/catalog/#rec-ghost (no such anchor on the target page)",
    ]);
  });

  it("treats a route that merely shares a string prefix as outside the tree", () => {
    // Containment is segment-wise: `/docs/components-other/` is NOT inside
    // `/docs/components/`, so it must fall through rather than be
    // mapped onto a generated page and reported as missing.
    assert.equal(breaks([page("index.mdx", [linkTo(route("/docs/components-other/"))])]), null);
  });

  it("leaves routes outside the generated tree to the built-site check", () => {
    // These pages come from zudo-doc's claudeResources generator, which this
    // run never sees. Resolving them here would fail every build.
    assert.equal(
      breaks([
        page("index.mdx", [
          linkTo(route("/docs/claude/")),
          linkTo(route("/docs/claude-skills/component-al8860mp-13/")),
        ]),
      ]),
      null,
    );
  });

  it("reports every broken link, not just the first", () => {
    const broken = breaks([
      page("index.mdx", [
        linkTo(fragmentRoute(anchor("gone-one"))),
        linkTo(fragmentRoute(anchor("gone-two"))),
      ]),
    ]);

    assert.equal(broken?.length, 2);
  });
});
