# Asset Paths

zfb serves `doc/public/` at the site root, so a file at `doc/public/circuits/foo.svg` is available at URL `/circuits/foo.svg`.

## Old → New path mapping

| Asset type | Old path | New `doc/public/` path | Public URL |
|---|---|---|---|
| Circuit SVGs | `doc/static/circuits/<name>.svg` | `doc/public/circuits/<name>.svg` | `/circuits/<name>.svg` |
| Datasheets | `doc/static/datasheets/<name>` | `doc/public/datasheets/<name>` | `/datasheets/<name>` |
| Images | `doc/static/img/<name>` | `doc/public/img/<name>` | `/img/<name>` |
| KiCad assets | `doc/static/kicad/<name>` | `doc/public/kicad/<name>` | `/kicad/<name>` |
| Favicon | `doc/static/favicon.ico` | `doc/public/favicon.ico` | `/favicon.ico` |

## UPDATE (components-docs-restructure epic, #133): the hand-authored footprint gallery is gone

The hand-authored footprint SVG/PNG dual-directory scheme documented below
until this note (`doc/public/footprints/` and `doc/public/footprint-imgs/`,
54 SVGs + 11 PNGs, linked by hand from content pages) was **purged** by the
Components Docs Restructure epic — neither directory exists anymore. Every
component record's footprint preview is now **generated** straight from the
KiCad library into a single directory:

- **`/assets/component-previews/footprints/<footprint-name>.svg`** — one
  generated preview per distinct footprint (27 files as of wave 6), embedded
  automatically on each component record page via `FootprintPreviewIsland`.
  Regenerate with `pnpm generate:footprint-previews`; do not hand-add or
  hand-edit files here (`pnpm check:footprint-previews` fails on drift).

There is no longer a separate hand-authored SVG-vs-PNG split, and no more
filename-collision concern between the two — content pages never link a
footprint preview by hand; the generator wires it to the record automatically.

## `doc/public/` contents summary

| Directory | Notes |
|---|---|
| `doc/public/circuits/` | Circuit stage diagrams |
| `doc/public/datasheets/` | PDF datasheets |
| `doc/public/img/` | Site images (logo, favicon copy, enlarge icon) |
| `doc/public/kicad/` | KiCad setup screenshots |
| `doc/public/favicon.ico` | Site favicon |
| `doc/public/assets/component-previews/footprints/` | 27 SVGs — **Generated** — `pnpm generate:footprint-previews` |
| `doc/public/assets/component-previews/models/` | 27 WRLs — **Generated** — `pnpm generate:models` |

(Per-directory file counts for the hand-authored asset types above drift as
content is curated; only the generated `component-previews/` counts are
pinned to a checked invariant, so those two are the only counts kept here.)

The two `assets/component-previews/` directories are owned by
`doc/component-docs/` and regenerated from the KiCad library; do not hand-edit
or hand-add files there. They are committed, and `pnpm check:footprint-previews`
/ `pnpm check:models` fail on drift.

## Not moved (S7/S8 handle these)

The following files remain in `doc/static/` and are handled by later waves:
- `doc/static/netlify.toml` — S8 deletes
- `doc/static/_redirects` — S8 deletes
- `doc/static/.nojekyll` — S7 cleans up

## Diagram MDX fragments (NOT moved)

The 7 `.mdx` diagram fragments in `doc/docs/_fragments/` are **not** assets — they are content fragments inlined by content waves (S3+). They remain at their original location:
- `doc/docs/_fragments/buck-u2-diagram.mdx`
- `doc/docs/_fragments/buck-u3-diagram.mdx`
- `doc/docs/_fragments/buck-u5-diagram.mdx`
- `doc/docs/_fragments/inverter-u4-diagram.mdx`
- `doc/docs/_fragments/ldo-u6-diagram.mdx`
- `doc/docs/_fragments/ldo-u7-diagram.mdx`
- `doc/docs/_fragments/ldo-u8-diagram.mdx`
