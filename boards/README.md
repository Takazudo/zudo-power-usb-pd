# boards/

Home for the split-board KiCad projects — **Board A** (USB-PD sink core:
STUSB4500 + USB-C + load switch + NVM pads) and **Board B** (synth power
conversion: DC-DCs + LDOs + protection + outputs). See
`doc/src/content/docs/inbox/board-split-decision.md` for the full board-split
decision and the A/B interface contract.

This directory is currently a stub — no board projects exist yet. Board A and
Board B are each created in their own later sub-issue.

## Layout

Each board gets its own directory with its own KiCad project, named after the
board:

```
boards/
  board-a/
    board-a.kicad_pro
    board-a.kicad_sch
    board-a.kicad_pcb
    fp-lib-table
    sym-lib-table
  board-b/
    board-b.kicad_pro
    board-b.kicad_sch
    board-b.kicad_pcb
    fp-lib-table
    sym-lib-table
```

## Depth rule for library tables

The repo's shared symbol and footprint libraries live at the repo root
(`symbols/zudo-pd.kicad_sym`, `footprints/kicad/zudo-power.pretty`). The
root-level `zudo-pd.kicad_pro`'s own `sym-lib-table`/`fp-lib-table` reference
them directly, because `${KIPRJMOD}` (the project's own directory) *is* the
repo root there:

```
(lib (name "zudo-pd")(uri "${KIPRJMOD}/symbols/zudo-pd.kicad_sym") ...)
```

Each board project instead lives two directories below the repo root
(`boards/<name>/`), so `${KIPRJMOD}` there resolves to `boards/<name>/`, not
the repo root. Board `fp-lib-table`/`sym-lib-table` files must therefore add
one extra `..` to reach back up to the shared libraries:

```
(lib (name "zudo-pd")(uri "${KIPRJMOD}/../../symbols/zudo-pd.kicad_sym") ...)
(lib (name "zudo-pd")(uri "${KIPRJMOD}/../../footprints/kicad/zudo-power.pretty") ...)
```

Getting this depth wrong is the classic "board opens with missing symbols"
failure mode — double-check it whenever a new board project is created here.

## Regenerating a board schematic

Board schematics are not hand-drawn; they're generated from a Python spec
module by the `schgen` toolchain. See `scripts/schgen/README.md` for the full
workflow. Short version, once a board's spec module exists:

```
python3 scripts/schgen/gen_schematic.py <spec_module>
```

The spec module name is `sys.argv[1]` (an importable module name like
`board_a_spec`, not a file path); there is no `--help`.
