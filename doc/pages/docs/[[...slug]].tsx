/** @jsxRuntime automatic */
/** @jsxImportSource preact */
// Locked manifest (zudolab/zudo-doc#2653 Decision 4): a SELF-CONTAINED
// doc-route stub — REQUIRED because the injected DYNAMIC `/docs/[[...slug]]`
// route 404s in `zfb dev` (real pre-existing gap in zfb's dev-mode
// dynamic-route rendering, distinct from the `/`-injection gap zfb#1227;
// empirically confirmed on #2653). This stub reconstructs the doc route from
// scratch using ONLY the sanctioned package entrypoints — no `pages/lib`, no
// `@/config`:
//   1. the `virtual:zudo-doc-route-context` virtual module (serializable
//      settings/translations/tagVocabulary/colorSchemes payload),
//   2. `@takazudo/zudo-doc/route-context` (`createRouteContext`),
//   3. `@takazudo/zudo-doc/chrome` (`createChrome`), and
//   4. `virtual:zudo-doc-chrome-bindings` (the host-callables channel).
// The bindings import is unconditional: the routes plugin supplies an empty
// object when `chromeBindingsModule` is unset, while configured projects get
// their MDX/chrome bindings without editing this stub.
//
// PRECEDENCE IS LOAD-BEARING: the routes plugin injects `/docs/[[...slug]]`
// unconditionally, and this host file wins over it. That host-over-package
// precedence is what puts the island imports below into the scanned graph — if
// zfb ever flips it, the injected route serves instead, both islands stop
// registering, and nothing errors at build time.
//
// docHistory note: DocHistory is statically imported from
// "@takazudo/zudo-doc/doc-history" and merged over chromeBindings in
// createChrome's hostBindings (second) argument — DocHistory's chrome-derive
// default is a no-op stub (unlike DesignTokenPanelBootstrap, which the
// package auto-defaults), so without this merge the doc-history button never
// hydrates on this route, with no error.

import type { JSX } from "preact";
import { routeContext } from "virtual:zudo-doc-route-context";
import {
  createRouteContext,
  type RouteContextPayload,
} from "@takazudo/zudo-doc/route-context";
import { createChrome } from "@takazudo/zudo-doc/chrome";
import { DocHistory } from "@takazudo/zudo-doc/doc-history";
import { defineChromeBindings } from "@takazudo/zudo-doc/chrome-bindings";
import { chromeBindings } from "virtual:zudo-doc-chrome-bindings";
import { FootprintPreviewIsland } from "../../src/component-preview/footprint-preview-island.tsx";
import { PackageModelViewerIsland } from "../../src/component-model-viewer/package-model-viewer-island.tsx";

// zfb's island scanner follows this route's static import graph, not a
// generated MDX record page's runtime component tree (`ComponentReferences`
// -> `FootprintPreview` / `PackageModelViewer` -> these islands are reached
// only at render time). Keeping the real client components reachable here
// registers the islands the generated record MDX renders. Dropping either
// import fails SILENTLY — no build error, the component renders as a dead
// placeholder (S2, #177).
void FootprintPreviewIsland;
void PackageModelViewerIsland;

const ctx = routeContext as unknown as RouteContextPayload;
const routeCtx = createRouteContext(ctx);
const { renderDocPage } = createChrome(routeCtx, {
  ...chromeBindings,
  ...defineChromeBindings({ DocHistory }),
});

export const frontmatter = { title: "Docs" };

export function paths(): Array<{ params: { slug: string[] }; props: unknown }> {
  const locale = routeCtx.defaultLocale;
  const source = routeCtx.resolveNavSource(locale, undefined);
  return routeCtx.buildDocRouteEntries({
    source,
    locale,
    routeSig: `docs;${locale}`,
  }).map((item) => ({
    params: { slug: item.slugParams },
    props: item.props,
  }));
}

type PageArgs = { params: { slug: string[] } } & Record<string, unknown>;

export default function DocsPage(props: PageArgs): JSX.Element {
  return renderDocPage(props as never, {
    locale: routeCtx.defaultLocale,
    docHistoryContentDir: routeCtx.settings.docsDir,
  });
}
