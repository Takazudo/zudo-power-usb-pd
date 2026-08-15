# Component knowledge docs — architecture contract (zudo-pd port)

Status: **locked** (spec-architecture epic #86; ported from `zudo-led-lamp`'s
epic-#57 engine and trimmed to this repository's adapter reality)
Scope: project-local code under `doc/`. Not a framework feature, not an
installable package, not a change to any other repository.

This document is the contract the generator code cites. Where it names a file,
a command or a rule, that is the decision — not a suggestion. Section numbers
are stable because source comments cite them (`§5`, `§7`). Where this port
deliberately differs from led-lamp, the difference is stated inline; the
led-lamp original remains the reference for the sections of the engine that
were ported unchanged.

---

## 1. What this is

The repository holds validated component evidence as structured JSON under
`.claude/skills/`. That data is the **only** source of technical truth. This
feature adds a **projection** of it into human documentation. It never
re-states a fact in prose, never repairs a value, and never synthesises a
component-wide verdict.

Corpus as of this contract: **21 owner bundles, 41 records (all standalone),
126 sources, 454 facts, 144 coverage domains, 36 interactions, 41 routes, 41
pin maps, 136 pins**, plus **9 cross-component rules** in
`circuit-spec-integration`; 40 inventory lines fitted, 2 DNP/hand-fit (one
line, `line-c23186`, is mixed — fitted on board-b, DNP on board-a — which is
why fit state is carried per placement, §5). These figures are asserted in
code (`adapters/circuit/selection.ts` `expect`, and the test suites) and a
mismatch fails the build.

## 2. Directory ownership

| Path | Owner | Rule |
|---|---|---|
| `doc/component-docs/` | this feature | all generator code, tests, this document |
| `doc/src/content/docs/components/` | **generator, exclusively** | committed; never hand-edit; every file is rewritten from evidence |
| `doc/component-docs/preflight.json` | generator | committed, deterministic, reviewable |
| `doc/pages/_mdx-components.ts` | site | carries the three evidence-component registrations; must stay in sync with `core/mdx.ts` `ALLOWED_COMPONENT_ATTRIBUTES` (guarded by `tests/presentation.test.ts`) |
| `doc/src/styles/global.css` | site | an appended presentation block for the generated pages (`.zld-evidence-*`) |
| `.claude/skills/**` | evidence owners | **read-only** to this feature |

**Matches led-lamp.** The exclusively-owned generated tree is rooted directly
at `doc/src/content/docs/components/` (`GENERATED_ROOT` in
`adapters/circuit/paths.ts`), identical to led-lamp's shape. The public URLs
read `/docs/components/{catalog,integration,records,records/<slug>}/`.

### Module layout under `doc/component-docs/`

```
core/                       provider-neutral; no Python, no `.claude`, no fs paths
  errors.ts                 ErrorCode union + ComponentDocsError + fail()
  text.ts                   SafeText brand + safeText() sanitiser
  url.ts                    SafeUrl brand + classifyUrl() policy
  ids.ts                    Slug/Anchor brands, recordSlug(), anchor(), byCodeUnit()
  view-model.ts             the public view model TYPES (frozen here)
  publication.ts            FieldKey union, PublicationMatrix, PublicationPolicy, PreflightReport
  mdx.ts                    mdast builders + serializeBody() + assertMdxSafe()
  page.ts                   frontmatter + buildPage() + generated-file marker
  emit.ts                   owned-tree write / prune / diff, path containment
  adapter.ts                ComponentDataAdapter + ValidationRunner interfaces
  pipeline.ts               the one generation path
  scan.ts                   denied-value artifact scanning (wired by cli/scan.ts)
  render/landing.ts         /docs/components/                    (landing)
  render/catalog.ts         /docs/components/catalog/
  render/record.ts          /docs/components/records/<slug>/
  render/shared.ts          routes, glosses and orderings the pages share
  render/integration.ts     /docs/components/integration/
adapters/circuit/           this repository's evidence provider
  paths.ts                  every path the adapter may touch
  validate.ts               python3 validate.py --strict subprocess
  read.ts                   contained, symlink-refusing JSON reads
  selection.ts              committed instance allowlist (41 records / 126 sources)
  matrix.ts                 committed per-field decisions
  canaries.ts               denied-key harvest for the artifact scan
  integration.ts            cross-component rules: shapes, projection, closure
  evidence.ts               provider shapes, bundle reads, the joins (pure)
  references.ts             the reviewed document / footprint / model contract
  model-assets.ts           deterministic WRL publication into doc/public/
  index.ts                  the adapter itself; `projectIndex` is the pure projection
footprint-previews/         the committed footprint SVG generator + drift check
cli/                        run.ts (shared body), generate.ts, check.ts, scan.ts, watch.ts, models.ts
ui/                         evidence-{anchor,details,table}.tsx, component-references.tsx,
                            footprint-preview.tsx, package-model-viewer.tsx
scripts/                    model-viewer-browser-smoke.mjs (headless Chrome over CDP)
tests/                      node:test suites + fixtures.ts / provider fixtures
```

The two interactive previews live outside this directory, under
`doc/src/component-preview/` and `doc/src/component-model-viewer/`: they are
`"use client"` islands the site's build bundles, and `ui/` holds only the
SSR-safe bindings that mount them. `three` is imported by exactly one module
(`viewer-runtime.ts`), which the island loads with a dynamic `import()`, so it
ships in its own chunk and never in the page bundle.

`evidence.ts` and `projectIndex` are pure functions over parsed JSON, so every
join rule and every publication rule is provable against a fixture corpus with
no filesystem, no subprocess and no edit to the read-only evidence tree.

The dependency direction is one-way: `adapters/circuit/**` imports from
`core/**`; `core/**` imports nothing from `adapters/**`.

## 3. Build seam — package scripts, not a host plugin

`doc/package.json`:

| Script | Purpose |
|---|---|
| `generate:components` | validate (strict) → project → render → emit |
| `check:components` | dry-run; nonzero on drift |
| `scan:components` | denied-value scan of the BUILT site (`dist/`, §6.1) |
| `test:components` | unit + integration suites |
| `dev:components` | debounced regeneration (watch) |
| `generate:models` / `check:models` | publish (or drift-check) the reviewed WRL models |
| `generate:footprint-previews` / `check:footprint-previews` | the same pair for the footprint SVGs |
| `check:built-component-references` | the reference section's built-`dist/` contract |
| `test:model-viewer:browser` | headless-Chrome smoke over `dist/` (not in `b4push`; needs a browser) |
| `build` | `pnpm generate:models && pnpm generate:components && zfb build` — generation precedes the content snapshot |
| `b4push` | `check && test:components && check:footprint-previews && check:models && build && check:built-component-references && check:components && scan:components` |

Generation ordering is a **package-script** boundary, not a host-plugin
assumption: `generate:components` has finished and exited before `zfb` starts,
which is why `cli/generate.ts` can promise the snapshot already contains its
output. (led-lamp's §3 records the full plugin-vs-script rationale; it applies
here unchanged.) `generate:models` runs before it for the same reason one step
down: the model assets have to be in `public/` before `zfb` copies it.

The browser smoke is deliberately outside `b4push`. It needs a Chrome binary
and roughly a minute of wall clock, which is a reasonable ask of CI and of a
change to the viewer, but not of every push.

## 4. Validation — one validator, in Python, fatal on failure

`adapters/circuit/validate.ts` runs
`python3 .claude/skills/component-spec-audit/scripts/validate.py --strict` as
an argument array (`execFile`, no shell, no interpolation), cwd = repository
root, before any evidence is read. `--strict` matches the mode CI's PR gate
enforces (`component-spec-skills.yml`), so the doc build cannot pass on
evidence the PR gate rejects. Nonzero exit aborts generation with
`VALIDATION_FAILED`. `--online` is never passed. Python is pinned to >= 3.12,
matching the workflow pin; `COMPONENT_DOCS_PYTHON` overrides the interpreter.
No component validation is reimplemented in TypeScript.

## 5. View model and adapter seam

`core/view-model.ts` freezes the public shape. `VIEW_MODEL_VERSION = 1`; an
adapter declares `supportedViewModelVersions` and the pipeline refuses to run
on a mismatch, so a core/adapter skew is a startup error rather than a subtly
wrong page.

**v1 stays v1 while `core/` and the only adapter compile together from this
repository, including through incompatible shape changes.** led-lamp's epic
made two such changes without bumping the number (widening
`PublicFact["value"]`; adding required `ownerSkill` fields), and this port has
made its own (adding required `PublicPlacement.dnp`; deleting the unported
3D/preview seam — `packagePreviews` and its types). None bumped the number,
deliberately: core and the single adapter are compiled together from one
repository, so a skew between them is a *compile* error long before the
runtime check sees it, and nothing outside this repository has ever consumed
v1 — a bump would only churn `preflight.json` and imply a compatibility
boundary that never existed. The number becomes a real boundary the moment
`core/**` is extracted as a package; from then on the rule in the
`VIEW_MODEL_VERSION` doc comment applies literally and any incompatible change
bumps it.

Port-specific shape decisions:

- **`PublicPlacement.dnp`** — fit state is per placement, because one
  inventory line is fitted on one board and DNP on the other
  (`line-c23186`). The line-level `dnp` is only the catalog rollup
  (fitted-if-fitted-anywhere); the record page renders each placement's own
  fit state, and a mixed line labels itself as mixed rather than either
  single state.
- **`ownerSkill` is `null` always** — zudo-pd runs with
  `claudeResources: false`, so `/docs/claude-skills/<name>/` does not exist
  as a route to link back to; `matrix.ts` denies both `record.ownerSkill`
  and `integration.ownerSkill`.
- **No `packagePreviews` seam** — led-lamp carries previews as a top-level
  view-model collection (`PublicPackagePreview` / `packagePreviews`) plus the
  `asset.footprintPreview` / `asset.modelPreview` field keys. Neither is
  ported: here both previews hang off `reference.footprint` on the record that
  uses them, so a preview cannot exist without a record pointing at it. The
  assets themselves do exist (waves 6 and 7) and both previews render — this
  is a shape difference, not an absence. Re-porting the collection starts from
  led-lamp's source, not from a vestigial copy here.
- **`corpus` counts what was published**, not what the provider holds: the
  landing page must never assert counts the site does not deliver. The three
  inventory-scoped rows (`inventoryLines`, `fittedLines`,
  `dnpOrHandFitLines`) stay inventory truth by design.

Identity, ordering and error rules (slugs from record IDs, verbatim provider
anchors scoped per page, inventory-line ordering with `byCodeUnit`, selection
closed under published links, integration rules count-asserted rather than
instance-selected, the closed `ErrorCode` union, fail-closed everywhere) are
ported unchanged from led-lamp §5.

## 6. Publication — default-zero, three gates

A value publishes only if it clears all three:

1. **Instance** — its record ID (and for a source, its source ID) is listed
   in `adapters/circuit/selection.ts`.
2. **Field** — its `FieldKey` is `PUBLISH` in `adapters/circuit/matrix.ts`.
3. **Value** — it survives `safeText()` / `classifyUrl()`.

`InstanceSelection.expect` pins **both sides**: the provider corpus size AND
the selection list lengths. The selection-side check exists because this
corpus once shipped a record (`rec-bzt52c11-c92321`) whose bundle validated
and whose counts were bumped while the ID list was left behind — the record
silently had no page. Either direction failing is a `STALE_SELECTION`.

zudo-pd's `DENY` set is 11 of 97 keys: led-lamp's seven content denials
(`source.sha256`, `source.evidenceExtract`,
`source.alternateAuthoritativeUrl`, `source.physicalPdfPageIndex`,
`routing.positivePrompts`, `routing.negativePrompts`, `pinMap.reviewedBy`),
`asset.binary`, both `ownerSkill` keys (`claudeResources: false`), and
`reference.package.recordIds`, which no renderer reads. All three halves of
`reference.*` publish: `documentSelections` names one reviewed source for 40
of the 41 records and `documentExceptions` names why the 41st has none,
`reference.footprint.{packageId,name,path}` back the rendered footprint
preview and its `Source:` line, and `reference.model.*` backs the interactive
package model viewer (wave 7 sourced a reviewed `.wrl`/`.step` pair for all
27 packages; wave 8 built the viewer). URL policy, the preflight report
contract, and the emitted-vs-withheld accounting are ported unchanged from
led-lamp §6.

### 6.1 Artifact-level proof (`pnpm scan:components`)

Everything above reasons about the projection; it cannot prove the **built
site** is clean, because between the view model and `dist/` sit the MDX
compiler, the HTML minifier and the indexers — none owned by this feature. So
`cli/scan.ts` (wired into `b4push` and `main-deploy.yml` after `pnpm build`)
harvests every value reachable only through a denied provider key
(`adapters/circuit/canaries.ts`), subtracts values independently published by
the hand-authored narrative pages, and scans every text artifact under
`dist/`. The scan fails closed in both directions: a hit is a leak, and too
few canaries or too few files means the scan proved nothing. Positive
controls (including `rec-bzt52c11-c92321`, the record that once shipped
page-less) prove "nothing leaked" is not "nothing shipped".

## 7. Safe generation — three layers

1. **Build.** Content is constructed only through the builders in
   `core/mdx.ts`. They accept `SafeText`/`SafeUrl` and a closed node
   vocabulary; there is no raw-node builder.
2. **Serialize.** `mdast-util-to-markdown` with `mdast-util-mdx` and
   `mdast-util-gfm-table`, plus `unsafe` rules for line-leading `:::` and
   line-leading `import`/`export`.
3. **Guard.** `assertMdxSafe` re-reads the **final** body text and fails the
   build on: line-leading `import`/`export`, line-leading `:::`, a `---`
   fence line, an HTML comment, any un-escaped `{` or `<`, any JSX name
   outside `ALLOWED_COMPONENT_ATTRIBUTES`, any attribute not listed for that
   component, and any attribute value outside `ATTRIBUTE_VALUE_PATTERN`
   (slug paths — slash-separated slug segments, admitted for `CategoryNav`'s
   nested `category` — and nothing else).

The guard's false positives are **deliberate**: it does not ask whether a
brace sat inside an inline-code span where MDX would treat it as inert — it
fails closed and a human decides. Renderers obey this rather than work around
it (monospace is for identifiers, which are code-shaped by construction;
evidence phrases render as text). Evidence text never reaches a JSX
attribute; frontmatter is a closed key set with `JSON.stringify`d values;
no generated data module is imported by any client entry; `safeText`
NFC-normalises and then **rejects** rather than strips. Relaxing any of this
is a publication decision, not a refactor.

## 8. Generated-tree ownership and cleanup

`doc/src/content/docs/components/` is written by `core/emit.ts` and
nothing else. Every write path is `assertContained` (segment-wise); emit
never `rm -rf`s — it prunes only marker-carrying `.mdx` leftovers under the
owned root; a file there without the generated marker is a fatal
`PATH_CONTAINMENT`; symlinks are fatal on both the write side and the
evidence-read side; emit is idempotent (a second run reports `0 written`).

## 9. Routes and navigation

| Route | Source |
|---|---|
| `/docs/components/` | `render/landing.ts` |
| `/docs/components/catalog/` | `render/catalog.ts` |
| `/docs/components/integration/` | `render/integration.ts` |
| `/docs/components/records/` | `render/record.ts` (records index) |
| `/docs/components/records/<slug>/` | `render/record.ts` (per-record pages) |

The landing page's `CategoryNav` targets `components` — this project's
wrapper resolves `category` as a slug path. The three evidence components
(`EvidenceAnchor`, `EvidenceDetails`, `EvidenceTable`) are registered in
`doc/pages/_mdx-components.ts`; that registry and
`ALLOWED_COMPONENT_ATTRIBUTES` must change together, and
`tests/presentation.test.ts` enforces it.

## 10. CI

Two workflows, both credential-free on the checking side:

- **`component-spec-skills.yml`** (PRs + main): the strict Python validator,
  its unit tests, the strict forward tests, `check_baseline.py --self-test`,
  the schgen smoke test, regen-idempotency for both boards (untracked-aware
  via `git add --intent-to-add`), the label-geometry check, baseline drift,
  the decision lock — and a `doc-tests` job running `pnpm test:components`
  (Node + Python, because the pipeline tests shell out to the validator).
- **`main-deploy.yml`** (push to main): typecheck, build, the two-step
  generated-output drift gate (`--intent-to-add` + second-generation
  byte-identity via `check:components`), the `scan:components` artifact scan,
  then the guarded Cloudflare deploy. All actions are SHA-pinned.

## 11. Direct dependencies added

`mdast-util-to-markdown`, `mdast-util-mdx`, `mdast-util-gfm-table` (serializer
+ syntax tables), and `@types/mdast`. Everything else the generator uses is
Node builtin or already a site dependency.

## 12. Portability boundary

`core/**` is written to be extractable as a package: provider-neutral, no
`.claude` paths, no Python, no zudo-pd names. Extraction is deliberately
deferred — the port copies led-lamp's engine rather than sharing it, and both
repositories accept the divergence risk until a third consumer exists. The
`VIEW_MODEL_VERSION` rule flips from "stays 1" to "bumps on every
incompatible change" at that extraction boundary (§5).

## 13. Non-goals

No re-stated facts, no prose summaries of evidence, no component-wide
verdicts, no PDF republication, no `/docs/claude-skills/` routes, no sitemap
change, no framework feature. The generated pages are a projection; where they
disagree with the evidence JSON, the evidence is correct. The 3D preview is
in scope but stays inside that rule: the viewer shows the shared FOOTPRINT
package's geometry and says so on the card, which is a weaker claim than
"this is the part" and is the only one the evidence supports.
