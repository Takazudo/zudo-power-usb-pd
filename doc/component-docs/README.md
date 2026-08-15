# component-docs — the evidence-to-docs generator

Projects the validated component evidence under `.claude/skills/` into the
generated human reference at `/docs/components/records/`. The evidence JSON is
the only source of truth; every generated page is a projection of it —
nothing is re-stated in prose, repaired, or rolled up into a verdict.

- **Architecture contract**: [`ARCHITECTURE.md`](./ARCHITECTURE.md) — the
  document the source comments cite (`§5` view-model versioning, `§7` safe
  generation). Read it before changing anything here.
- **Layout**: `core/` (provider-neutral engine) → `adapters/circuit/` (this
  repository's evidence provider) → `cli/` (generate / check / scan / watch /
  models) → `footprint-previews/` (SVG generator) → `ui/` (the MDX components)
  → `scripts/` (browser smoke) → `tests/`.
- **Commands** (run from `doc/`):
  - `pnpm generate:components` — validate (strict) → project → render → emit
  - `pnpm check:components` — dry-run drift check (CI's determinism gate)
  - `pnpm scan:components` — denied-value scan of the built `dist/`
  - `pnpm test:components` — the full test suite
  - `pnpm generate:models` / `pnpm check:models` — publish (or drift-check) the
    reviewed WRL package models into `public/assets/component-previews/models/`
  - `pnpm generate:footprint-previews` / `pnpm check:footprint-previews` — the
    same pair for the footprint SVGs
  - `pnpm check:built-component-references` — the built-`dist/` contract for the
    reference section (needs `pnpm build` first)
  - `pnpm test:model-viewer:browser` — headless-Chrome smoke over the built
    site: layout, WebGL, both enlarge dialogs, SPA teardown, no-JS fallback
- **Owned output**: `doc/src/content/docs/components/records/`,
  `preflight.json`, and the two published preview asset directories under
  `doc/public/assets/component-previews/` — committed, deterministic, never
  hand-edited.

Ported from `zudo-led-lamp`'s component-docs engine; the port's deliberate
differences (re-rooted generated tree, no `packagePreviews` seam, independently
optional reference cards, `ownerSkill` denied, per-placement DNP) are
catalogued in `ARCHITECTURE.md`.
