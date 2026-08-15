# CLAUDE.md - KiCad Library Management

This project uses [easyeda2kicad.py](https://github.com/uPesy/easyeda2kicad.py) to download KiCad footprints and symbols from LCSC/EasyEDA.

## File Organization

**Footprints (PCB physical pads):**
- **KiCad source files**: `/footprints/kicad/*.kicad_mod` (individual footprint files)
- **Documentation previews**: generated automatically into
  `/doc/public/assets/component-previews/footprints/*.svg` by
  `doc/component-docs/footprint-previews/generate.ts` (`pnpm generate:footprint-previews`
  from `doc/`) — do not hand-export or hand-edit
- **Package previews**: `/doc/static/footprints/*.png` (datasheet images)
- **Datasheets**: `/doc/static/datasheets/*.pdf` (component specs)

**Symbols (schematic symbols):**
- **Symbol library**: `/symbols/zudo-pd.kicad_sym` (single file containing all project symbols)

## Downloading Footprints and Symbols

**For detailed instructions, see:**
- **[Download KiCad Footprints and Symbols Guide](/doc/src/content/docs/how-to/kicad-parts-download.md)**

**Quick reference:**
```bash
# Download BOTH footprint and symbol (recommended)
easyeda2kicad --lcsc_id <LCSC_ID> --footprint --symbol

# Copy footprints to project
cp ~/Documents/Kicad/easyeda2kicad/easyeda2kicad.pretty/*.kicad_mod ./footprints/kicad/

# Copy symbols to project
cp ~/Documents/Kicad/easyeda2kicad/easyeda2kicad.kicad_sym ./symbols/zudo-pd.kicad_sym
```

**For users**: Download directly from GitHub:
- [Footprints](https://github.com/Takazudo/zudo-pd/tree/main/footprints)
- [Symbols](https://github.com/Takazudo/zudo-pd/tree/main/symbols)

## Generating SVG Files for Documentation

Documentation footprint previews are **generated automatically**, not hand-exported.
When a footprint is added or updated, regenerate previews from `doc/`:

```bash
pnpm generate:footprint-previews
```

This renders each footprint straight from `footprints/kicad/*.kicad_mod` (via a
digest-pinned KiCad container) into
`doc/public/assets/component-previews/footprints/*.svg`, and the generated component
record pages embed it automatically. `pnpm check:footprint-previews` fails the build
on drift. Do not hand-export a footprint SVG and link it from navigation — update the
footprint file or the component evidence and re-run the generator instead.

The former Docusaurus-era manual workflow (`footprints/scripts/generate-footprint-svgs.sh`,
copying into `doc/docs/_fragments/footprints/`) has been removed — that directory no
longer exists.

## Dual-location sync rule

> Every `.kicad_mod` file must exist in BOTH `footprints/kicad/*.kicad_mod` (source of truth) AND `footprints/kicad/zudo-power.pretty/*.kicad_mod` (KiCad library resolution path). A file only in the master dir will NOT resolve when KiCad opens the PCB. The Quick Workflow `cp *.kicad_mod zudo-power.pretty/` step is mandatory, not optional.

## Courtyards are generated, not hand-drawn

Every `.kicad_mod` carries an `F.CrtYd` rectangle produced by
`footprints/scripts/gen_courtyards.py`. Do not hand-edit courtyard geometry —
change the script (or the pads/body artwork it derives from) and re-run it.

```bash
python3 footprints/scripts/gen_courtyards.py --check   # report drift, write nothing
python3 footprints/scripts/gen_courtyards.py           # rewrite in place, both locations
```

The rule is IPC-7351 density-B: the courtyard is the bounding box of **every pad
plus every body graphic**, expanded by 0.25 mm, drawn at 0.05 mm width. It is a
plain rectangle on purpose — a courtyard is a DRC keepout, not artwork, and a
body-shaped outline can end up *smaller* than the pads it is meant to protect.

That is exactly what the library had before: most footprints carried no courtyard
at all, and the four that did (inherited from easyeda2kicad) drew it around the
body only, so it did not enclose their own pads — `CAP-SMD_BD8.0` had a ±4.15 mm
courtyard over pads reaching ±5.095 mm. Silkscreen and fab artwork are untouched
by the script, including the chamfer that marks electrolytic polarity.

Both output locations are written in one pass, so the dual-location sync rule
below is satisfied automatically.

## Hand-created footprints

Some parts do not exist in LCSC or EasyEDA. For those, create the footprint by hand rather than running `easyeda2kicad`.

### When to hand-create

Create a footprint manually when the component is not a standard LCSC part:

- Bare test pads
- Card-edge / board-edge pads
- Mechanical mounting features
- Fiducial marks
- Logos and silkscreen art
- Pogo pin arrays for programming jigs

### File format

Use the legacy `(module ...)` S-expression format. Copy the style and layer assignments from an existing neighbor such as `footprints/kicad/R0603.kicad_mod` for consistency with the rest of the library.

### Library prefix convention

- **Hand-created footprints** can use the library tag `zudo-pd:<Name>` — this matches the `fp-lib-table` library name `zudo-pd`.
- **Downloaded footprints** (via `easyeda2kicad`) keep their original `easyeda2kicad:<Name>` tag.

Both prefix styles resolve correctly because the single `fp-lib-table` entry `zudo-pd` points at the `footprints/kicad/zudo-power.pretty/` directory. The library prefix stored inside the `.kicad_mod` file itself is documentation only — KiCad resolves footprints by directory, not by the prefix string inside the file.

### Where to save

Write the new footprint to **two locations**:

1. `footprints/kicad/<Name>.kicad_mod` — master / source of truth
2. `footprints/kicad/zudo-power.pretty/<Name>.kicad_mod` — KiCad library resolution path

Then run the SVG export workflow above so documentation stays up to date.

## Hand-created inventory

The following footprints in this library were created by hand (not downloaded from LCSC/EasyEDA):

- `PogoPad_1x04_P2.54mm` — 4P 2.54 mm pogo pad array for STUSB4500 NVM I2C programming (see `doc/src/content/docs/inbox/nvm-programming.md`)
- `PogoPad_1x08_P2.54mm` — 8P 2.54 mm pogo pad array for STUSB4500 chip-side debug signals (CC1DB, CC2DB, VREG_2V7, VDD, RESET, ATTACH, PD_OK, VBUS_EN_SNK; see `doc/src/content/docs/overview/board-a-usb-pd-core.md`)
