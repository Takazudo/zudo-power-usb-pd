import { defineConfig } from "zfb/config";
import { zudoDoc } from "@takazudo/zudo-doc/config";

// The entire site configuration is this one zudoDoc() call — collections,
// markdown features, plugins (search-index, doc-history), routes and the
// virtual route-context payload are all built by the package (#180 rescaffold).
// Every key below differs from the package's DEFAULT_SETTINGS; omitting one
// silently changes behavior.
export default defineConfig(
  zudoDoc({
    siteName: "zudo-PD",
    githubUrl: "https://github.com/Takazudo/zudo-pd",
    // siteUrl host MUST match the wrangler.toml custom-domain route pattern.
    siteUrl: "https://pd.takazudomodular.com",
    // Package default "auto" would generate a deterministic SVG; this site
    // ships a real asset.
    logo: "/img/logo.svg",
    cjkFriendly: true,
    docHistory: true,
    // The ejected head builder emitted og:image (+ width/height/alt) and the
    // twitter summary_large_image card unconditionally; the package defaults
    // are ogImage:false/twitterCard:false, which silently dropped every social
    // card. This object REPLACES the default wholesale, so all five keys are
    // spelled out even where they match the default.
    metaTags: {
      description: true,
      keywords: false,
      ogImage: "/img/ogp.png",
      ogSiteName: true,
      twitterCard: "summary_large_image",
    },
    sidebarResizer: true,
    sidebarToggle: true,
    imageEnlarge: true,
    // D4 (#180): the old ejected sitemap route emitted a populated sitemap even
    // with settings.sitemap=false; the package route returns an EMPTY <urlset>
    // when false, so `true` is what preserves today's output.
    sitemap: true,
    // Today's site ships the SPA router + loading overlay unconditionally.
    dynamicPageTransition: true,
    // D3 (#180): keep strict route equivalence — no /docs/claude* trees. The
    // repo-root .claude/ holds many skills that would bloat the build.
    claudeResources: false,
    headerNav: [
      { label: "Overview", path: "/docs/overview", categoryMatch: "overview" },
      { label: "Components", path: "/docs/components", categoryMatch: "components" },
      { label: "Learning", path: "/docs/learning", categoryMatch: "learning" },
      { label: "HowTo", path: "/docs/how-to", categoryMatch: "how-to" },
      { label: "Misc", path: "/docs/misc", categoryMatch: "misc" },
      { label: "INBOX", path: "/docs/inbox", categoryMatch: "inbox" },
    ],
    headerRightItems: [
      { type: "component", component: "github-link" },
      { type: "component", component: "theme-toggle" },
      { type: "component", component: "search" },
    ],
    // Registers the MDX components generated component pages reference,
    // without editing the package-owned route stub under pages/.
    chromeBindingsModule: "./src/chrome-bindings.tsx",
    // Cloudflare Workers adapter — required for the deploy (dist/_worker.js).
    adapter: "@takazudo/zfb-adapter-cloudflare",
  }),
);
