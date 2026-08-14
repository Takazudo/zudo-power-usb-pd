/**
 * Every link this generator emits into its own tree must land somewhere.
 *
 * This check exists because the build cannot do it. zfb's `linkValidation`
 * feature resolves fragments against HEADING-derived anchors only: it parses
 * MDX without expanding components, so `<EvidenceAnchor id="fact-x" />` is
 * invisible to it and `[…](#fact-x)` is reported broken. Probed directly — a
 * heading anchor validates, a raw-HTML `id` and an MDX component id both warn —
 * so this is a property of the validator, not of the markup, and no markup
 * change would satisfy it. The warnings are noise; the links resolve in the
 * built HTML. Turning `linkValidation` off is not the answer either: it still
 * protects every hand-authored page on the site.
 *
 * So the generator proves its own links instead, on structured data, fatally,
 * before anything is written.
 *
 * SCOPE, precisely: destinations inside `/docs/components/` and same-page
 * fragments. Links out of the tree — `/docs/claude-skills/<bundle>/` and the
 * `/docs/claude/` hub — are pages zudo-doc generates from `.claude/`, which
 * this run never sees, so they are deliberately NOT resolved here. Those are
 * verified against the built site.
 *
 * An anchor here means an `EvidenceAnchor` id, which is every anchor these
 * renderers emit. A renderer that starts linking to a heading-derived slug
 * instead would have to teach `buildPage` about heading anchors first —
 * otherwise this reports the link as broken, correctly by its own lights.
 */

import { fail } from "./errors.ts";
import type { GeneratedPage } from "./page.ts";

/**
 * The route prefix the generated tree owns. Mirrors `render/shared.ts`.
 *
 * zudo-pd re-roots the generated tree one level down, under
 * `components/records/`, so the hand-written pages directly under
 * `components/` stay untouched by the emitter's owned-root pruning.
 */
const GENERATED_ROUTE_PREFIX = "/docs/components/records/";

/** How many broken links to name before the message gets useless. */
const REPORTED_LIMIT = 20;

/**
 * `/docs/components/records/al8860mp-13/` → `records/al8860mp-13/index.mdx`,
 * and `/docs/components/` → `index.mdx`. Every generated route is a directory
 * route, so the mapping is total.
 */
function pagePathForRoute(routePath: string): string {
  return `${routePath.slice(GENERATED_ROUTE_PREFIX.length)}index.mdx`;
}

export function assertLinkIntegrity(pages: readonly GeneratedPage[]): void {
  const anchorsByPath = new Map(
    pages.map((page) => [page.relativePath, new Set(page.anchors)]),
  );

  const broken: string[] = [];
  for (const page of pages) {
    for (const target of page.links) {
      const reason = unresolved(target, page, anchorsByPath);
      if (reason !== null) broken.push(`${page.relativePath} → ${target} (${reason})`);
    }
  }

  if (broken.length > 0) {
    fail("BROKEN_LINK", `${broken.length} generated link(s) do not resolve`, {
      count: broken.length,
      broken: broken.slice(0, REPORTED_LIMIT),
    });
  }
}

function unresolved(
  target: string,
  page: GeneratedPage,
  anchorsByPath: ReadonlyMap<string, ReadonlySet<string>>,
): string | null {
  if (target.startsWith("#")) {
    const fragment = target.slice(1);
    return anchorsByPath.get(page.relativePath)?.has(fragment) === true
      ? null
      : "no such anchor on this page";
  }

  if (!target.startsWith(GENERATED_ROUTE_PREFIX)) return null;

  const [routePath, fragment] = splitFragment(target);
  const anchors = anchorsByPath.get(pagePathForRoute(routePath));
  if (anchors === undefined) return "no such generated page";
  if (fragment !== null && !anchors.has(fragment)) return "no such anchor on the target page";
  return null;
}

function splitFragment(target: string): [string, string | null] {
  const hash = target.indexOf("#");
  return hash === -1 ? [target, null] : [target.slice(0, hash), target.slice(hash + 1)];
}
