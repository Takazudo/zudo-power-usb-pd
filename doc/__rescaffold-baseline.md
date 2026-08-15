# Pre-Rescaffold Behavioral Baseline

Captured for issue [#175](https://github.com/Takazudo/zudo-pd/issues/175) (Doc Rescaffold epic),
sub-issue [#176](https://github.com/Takazudo/zudo-pd/issues/176) (S1).

This is the **acceptance checklist for the S6 sweep**. It records the exact `pnpm build`
output of `doc/` at commit `750b5b3` (branch `doc-rescaffold/s1-baseline`, based on
`chore/bump-zudo-deps-2.5.1` via `base/doc-rescaffold`), captured on 2026-08-15, before any
rescaffold changes land. Later sub-issues diff their own `pnpm build` output against this
file. S8 deletes this file once the sweep is done.

Build command: `pnpm build` (= `pnpm generate:models && pnpm generate:components && zfb build`).
Build result: **succeeded**, `✓ 101 pages built in 5.98s`. No build-breaking errors — only
pre-existing `zfb warn: ... broken link: #fact-...` / `#src-...` warnings on two component
record pages (`umw-ao3401a-c347476`, `usb-type-c-009-c456012`); these are pre-existing and
out of scope for this sub-issue.

Note: the build log says `101 pages built` while exactly 100 `*.html` files land in `dist/`
(see below) — a pre-existing one-off between the reported page count and emitted file count.
Not investigated here (out of scope: read-and-record only); flag if S6 sees a different
delta.

## Route list (100 files)

Command: `find dist -name '*.html' | sed 's|^dist||' | sort`

Result: **100 lines** (matches the epic's expected 100).

```
/404.html
/docs/components/catalog/index.html
/docs/components/index.html
/docs/components/integration/index.html
/docs/components/records/bzt52c11-c92321/index.html
/docs/components/records/c13585/index.html
/docs/components/records/c15849/index.html
/docs/components/records/c1623/index.html
/docs/components/records/c1711/index.html
/docs/components/records/c1729/index.html
/docs/components/records/c17513/index.html
/docs/components/records/c21189/index.html
/docs/components/records/c21190/index.html
/docs/components/records/c22387780/index.html
/docs/components/records/c2286/index.html
/docs/components/records/c2288/index.html
/docs/components/records/c2289/index.html
/docs/components/records/c23162/index.html
/docs/components/records/c23179/index.html
/docs/components/records/c23186/index.html
/docs/components/records/c23206/index.html
/docs/components/records/c25803/index.html
/docs/components/records/c25804/index.html
/docs/components/records/c2983319/index.html
/docs/components/records/c335982/index.html
/docs/components/records/c970687/index.html
/docs/components/records/cand-smaj6-5a-c87267/index.html
/docs/components/records/cj7912-c94173/index.html
/docs/components/records/cya1265-100uh-c19268674/index.html
/docs/components/records/faston-c591344/index.html
/docs/components/records/hdr-2541wr-2x08p-c5383092/index.html
/docs/components/records/high-diode-smaj20a-c571370/index.html
/docs/components/records/index.html
/docs/components/records/jst-b6b-xh-a/index.html
/docs/components/records/l7805abd2t-c86206/index.html
/docs/components/records/l7812cd2t-c13456/index.html
/docs/components/records/lm2596s-adj-c347423/index.html
/docs/components/records/pesd24vs1ub-c85382/index.html
/docs/components/records/ptc-bsmd1206-150-16v-c883133/index.html
/docs/components/records/ptc-msmd110-33v-c70119/index.html
/docs/components/records/ptc-smd1210p150tf16-c7529589/index.html
/docs/components/records/smaj15a-c571368/index.html
/docs/components/records/ss34-c8678/index.html
/docs/components/records/stusb4500qtr/index.html
/docs/components/records/umw-ao3401a-c347476/index.html
/docs/components/records/usb-type-c-009-c456012/index.html
/docs/how-to/dcdc-converter-design/index.html
/docs/how-to/index.html
/docs/how-to/kicad-jlcpcb-tools/index.html
/docs/how-to/kicad-parts-download/index.html
/docs/how-to/kicad-workflow/index.html
/docs/how-to/linear-regulator-layout/index.html
/docs/how-to/net-table-convention/index.html
/docs/how-to/power-rail-bench-test/index.html
/docs/how-to/regulator-assembly-and-inspection/index.html
/docs/inbox/board-b-architecture-review/index.html
/docs/inbox/board-split-decision/index.html
/docs/inbox/current-status/index.html
/docs/inbox/index.html
/docs/inbox/nvm-programming/index.html
/docs/inbox/pcba-v1-debug/index.html
/docs/inbox/pcba-v2-debug/index.html
/docs/inbox/spec-architecture-review/index.html
/docs/inbox/stusb4500-pinout/index.html
/docs/inbox/v3-bringup-test-procedure/index.html
/docs/inbox/v3-pd-failure-diagnosis/index.html
/docs/inbox/v4-asbuilt-audit/index.html
/docs/inbox/v4-pd-failure-diagnosis/index.html
/docs/inbox/versioning/index.html
/docs/inbox/wave-7-3d-model-coverage/index.html
/docs/learning/ai-circuit-design-research/index.html
/docs/learning/buck-converter-feedback/index.html
/docs/learning/ch224d-usb-pd-controller/index.html
/docs/learning/esd-protection-tvs-diodes/index.html
/docs/learning/eurorack-power-distribution/index.html
/docs/learning/gnd-component-placement/index.html
/docs/learning/gndd-gnda-split-ground/index.html
/docs/learning/index.html
/docs/learning/inductor-voltage-reversal/index.html
/docs/learning/linear-regulator-capacitors/index.html
/docs/learning/open-drain-pg-pin/index.html
/docs/learning/p-channel-mosfet-load-switch/index.html
/docs/learning/pcb-layout-power-circuits/index.html
/docs/learning/protection-fuse-strategy/index.html
/docs/learning/trace-width-copper-weight/index.html
/docs/learning/transformer-polarity-flyback/index.html
/docs/learning/two-stage-dc-dc-ldo-architecture/index.html
/docs/learning/usb-pd-vs-traditional-usb/index.html
/docs/learning/usb-type-c-pinout/index.html
/docs/misc/index.html
/docs/overview/board-a-usb-pd-core/index.html
/docs/overview/board-b-synth-power/index.html
/docs/overview/bom/index.html
/docs/overview/circuit-diagrams/index.html
/docs/overview/index.html
/docs/overview/mechanical-design/index.html
/docs/overview/overview/index.html
/docs/overview/two-board-plan/index.html
/docs/overview/usb-pd-adapter/index.html
/index.html
```

## Sitemap

Command: `grep -c '<loc>' dist/sitemap.xml`

Result: **99** (matches the epic's expected 99 — one less than the 100 html routes, since
`/404.html` is excluded from the sitemap).

## Adapter / static asset presence

| Path | Present |
|---|---|
| `dist/_worker.js` | yes |
| `dist/_zfb_inner.mjs` | yes |
| `dist/.assetsignore` | yes |
| `dist/_redirects` | yes |
| `dist/search-index.json` | yes — **98 entries** (build log: `[plugin:search-index] Generated search index with 98 entries`; confirmed via `JSON.parse` length) |
| `dist/favicon.ico` | yes |
| `dist/datasheets/*.pdf` | yes — **8 files**: `CH224D-datasheet.pdf`, `CJ7912-datasheet.pdf`, `L7805ABD2T-datasheet.pdf`, `L7812CD2T-datasheet.pdf`, `LM2596S-datasheet.pdf`, `PRTR5V0U2X-datasheet.pdf`, `SMAJ-datasheet.pdf`, `USB-TYPE-C-009-datasheet.pdf` |

## `<head>` block — `dist/index.html`

```html
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><title>zudo-PD</title><style>
.zfb-route-announcer {
	position: absolute;
	left: 0;
	top: 0;
	clip: rect(0 0 0 0);
	clip-path: inset(50%);
	overflow: hidden;
	white-space: nowrap;
	width: 1px;
	height: 1px;
}
</style><meta name="zfb-view-transitions-enabled" content="true"/><meta name="zfb-view-transitions-fallback" content="animate"/><meta name="zfb-preserve-html-attrs" content="data-sidebar-hidden data-theme data-theme-pack style data-toc-hidden"/><meta property="og:title" content="zudo-PD"/><meta property="og:type" content="website"/><meta property="og:image" content="https://pd.takazudomodular.com/img/ogp.png"/><meta property="og:site_name" content="zudo-PD"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:image:alt" content="zudo-PD"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:image" content="https://pd.takazudomodular.com/img/ogp.png"/><style>:root { ...theme tokens (--zd-*)... }</style><script>...theme bootstrap IIFE (localStorage "zudo-doc-theme", prefers-color-scheme)...</script><script>...sidebar width restore IIFE (localStorage "zudo-doc-sidebar-width")...</script><link rel="icon" href="/favicon.ico" sizes="any"/><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"/><link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png"/><link rel="stylesheet" href="/assets/styles-3d1794a4.css"><script type="module" src="/assets/islands-54ef1f58.js"></script></head>
```

Notes: `dist/index.html` has **no `<link rel="canonical">`**, no `og:description`/`og:url`,
and no `<meta name="description">` — only `og:title`/`og:type`/`og:image*`/`og:site_name` and
the twitter card tags. Title is the bare site name `zudo-PD`.

## `<head>` block — one doc page (`dist/docs/overview/two-board-plan/index.html`)

```html
<title>Two-Board Plan (USB-PD Core + Synth Power) | zudo-PD</title>
<link rel="canonical" href="https://pd.takazudomodular.com/docs/overview/two-board-plan"/>
<meta property="og:title" content="Two-Board Plan (USB-PD Core + Synth Power) | zudo-PD"/>
<meta property="og:description" content="Why zudo-pd is splitting from one PCBA into a reusable USB-PD core board plus a synth power conversion board, and how the two fit together."/>
<meta property="og:type" content="website"/>
<meta property="og:url" content="https://pd.takazudomodular.com/docs/overview/two-board-plan"/>
<meta property="og:image" content="https://pd.takazudomodular.com/img/ogp.png"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:image:alt" content="Two-Board Plan (USB-PD Core + Synth Power) | zudo-PD"/>
<meta name="description" content="Why zudo-pd is splitting from one PCBA into a reusable USB-PD core board plus a synth power conversion board, and how the two fit together."/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:image" content="https://pd.takazudomodular.com/img/ogp.png"/>
```

(Same base head as `index.html` — theme `<style>`/scripts, favicon links, `styles-3d1794a4.css`,
`islands-54ef1f58.js` — omitted above since already shown for `index.html`; only the
page-specific canonical/og/description block is new.)

## Rendered doc page markup (`dist/docs/overview/two-board-plan/index.html`)

**DocHistory** — rendered as an island-skip-ssr placeholder (not a "button" in the local
build, because doc-history generation is skipped by default locally):

```html
<div data-zfb-island-skip-ssr="DocHistory" data-when="idle" data-props="{&quot;slug&quot;:&quot;overview/two-board-plan&quot;,&quot;basePath&quot;:&quot;/&quot;}"><div class="sr-only"><span>Takeshi Takatsudo</span><span>Created: 2026-07-05T13:58:18+09:00</span><span>Updated: 2026-08-15T06:13:34+09:00</span></div></div>
```

Build log confirms why: `zfb info: [plugin:doc-history] Skipping doc history generation
(local default — set GEN_DOC_HISTORY=1 to generate)`.

**`ClientRouterBootstrap`**: present — `data-zfb-island="ClientRouterBootstrap"` appears
once in this page (and once in `dist/index.html`).

**`PageLoadingOverlay`**: **absent** — does not appear anywhere in `dist/` (checked with
`grep -rl 'PageLoadingOverlay' dist/`, zero matches across all 100 rendered pages).

**Islands present on this doc page** (`data-zfb-island="..."` values, deduped): `ClientRouterBootstrap`,
`DesktopSidebarToggle`, `MobileToc`, `SidebarToggle`, `SidebarTree`, `ThemeToggle`, `Toc`.

**`zd-enlargeable` figure** (found on `dist/docs/overview/circuit-diagrams/index.html`, not
on `two-board-plan`):

```html
<figure class="zd-enlargeable"><img src="/circuits/buck-u2-diagram.svg" alt="LM2596S Buck Converter U2" width="696" height="362"/><button type="button" class="zd-enlarge-btn" hidden aria-label="Enlarge image"><svg viewBox="0 0 38.99 38.99" fill="currentColor" focusable="false" aria-hidden="true">...</svg></button></figure>
```

Pages with at least one `zd-enlargeable` figure (for later spot-checks):
`docs/overview/circuit-diagrams`, `docs/how-to/kicad-workflow`, `docs/how-to/dcdc-converter-design`.

**`<pre>` color mechanism** (found on `dist/docs/how-to/kicad-workflow/index.html`) — carried
via **inline `--shiki-light`/`--shiki-dark` CSS custom properties per `<span>`**, not via
classes:

```html
<pre style="--shiki-light-bg:#eff1f5;--shiki-dark-bg:#2b303b;" class="syntect-dual"><code><span class="line"><span><span style="--shiki-light:#8fa1b3;--shiki-dark:#8fa1b3">python3</span><span style="--shiki-light:#4f5b66;--shiki-dark:#c0c5ce"> scripts/schgen/gen_schematic.py board_a_spec   </span><span style="--shiki-light:#a7adba;--shiki-dark:#65737e">#</span><span style="--shiki-light:#a7adba;--shiki-dark:#65737e"> or board_b_spec</span></span></span></code></pre>
```

`<pre>` itself carries `--shiki-light-bg`/`--shiki-dark-bg` inline plus class `syntect-dual`;
each token `<span>` carries its own `--shiki-light`/`--shiki-dark` inline vars. No
`shiki-light`/`shiki-dark` *class* switching is used.

**Known heading anchor id** — on `dist/docs/overview/two-board-plan/index.html`, the `## Why
split?` heading renders `id="why-split"` (and `## How they connect?` renders
`id="how-they-connect"`).

## Hero block — `dist/index.html`

```html
<main class="flex-1 min-w-0 px-hsp-xl py-vsp-xl lg:px-hsp-2xl lg:py-vsp-2xl"><article class="zd-content max-w-none"><div class="flex justify-center mb-vsp-xl"><div class="flex flex-col items-center text-center gap-hsp-md lg:flex-row lg:text-left lg:gap-hsp-xl"><div style="-webkit-mask:url(/img/logo.svg) center/contain no-repeat;mask:url(/img/logo.svg) center/contain no-repeat;" aria-hidden="true" class="w-[320px] max-w-full aspect-[1200/630] bg-fg shrink-0"></div><div><h1 class="text-heading font-bold mb-vsp-2xs">zudo-PD</h1><p class="text-muted text-small mb-vsp-sm"></p><div class="flex items-center justify-center lg:justify-start gap-hsp-md text-small"><a href="/docs/overview" class="text-fg underline hover:text-accent">Overview</a><span class="text-muted">/</span><a href="https://github.com/Takazudo/zudo-pd" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-[0.3em] text-fg underline hover:text-accent"><svg viewBox="0 0 16 16" aria-hidden="true" class="w-[1em] h-[1em] shrink-0"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59...z"></path></svg>GitHub</a><span class="text-muted">/</span><a href="https://x.com/Takazudo" target="_blank" rel="noopener noreferrer" class="text-fg underline hover:text-accent">@Takazudo</a></div></div></div></div><div data-zfb-island="SiteTreeNav" data-when="idle" data-props="{...site tree JSON...}">...</div>
```

Hero = a logo mask (`/img/logo.svg` via CSS `mask`), `<h1>zudo-PD</h1>`, an empty tagline
`<p>`, and an Overview / GitHub / @Takazudo link row — followed by the `SiteTreeNav` island
that renders the top-level doc tree.

## Minification

The emitted HTML **is minified at the markup level** — `dist/index.html` is `<!doctype html>`
on its own line, then the entire `<html>...</html>` tree (head + body) is a **single line**
with no inter-tag whitespace (185,731 bytes on line 2, no leading indentation anywhere in the
tag structure).

Caveat: inline `<style>` and `<script>` block **contents** are NOT minified/uglified — they
retain their original source formatting (multi-line, tab-indented CSS; multi-line JS with
normal formatting), which is why `wc -l dist/index.html` reports 1,500 lines even though the
markup itself is single-line. Same pattern holds for every other page (each page's own inline
`<style>`/`<script>` blocks, e.g. the shiki `<pre>` blocks above, are single-line since they
have no embedded newlines).

## `.gitignore`

Added `.zudo-doc/` to `doc/.gitignore` in this same commit, ahead of `packageOwnedRoutes`
going active (which will write ~21 generated files into `doc/.zudo-doc/routes-src/` on every
build).
