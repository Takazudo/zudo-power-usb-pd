#!/usr/bin/env python3
"""Gate: bare-copper footprints must carry the CPL/BOM exclusion attributes.

Every spec line in scripts/schgen/board_a_spec.py / board_b_spec.py with an
empty LCSC field is a bare-copper feature (pogo pad, test pad) with no part to
assemble. Its footprint must carry `exclude_from_pos_files` and
`exclude_from_bom` on the `(attr ...)` line — otherwise KiCad's position-file
export emits a phantom pick-and-place row (the v0.4.0 order shipped phantom
J2/J3/TP* rows exactly this way; see footprints/CLAUDE.md "Assembly
attributes"). Checked in both dual-rule locations, which must be byte-identical.

Usage:
    python3 footprints/scripts/check_bare_copper_attrs.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SPEC_DIR = REPO / "scripts" / "schgen"
MASTER_DIR = REPO / "footprints" / "kicad"
PRETTY_DIR = MASTER_DIR / "zudo-power.pretty"
REQUIRED_TOKENS = ("exclude_from_pos_files", "exclude_from_bom")

sys.path.insert(0, str(SPEC_DIR))
from schgen_core import load_spec_module  # noqa: E402


def bare_copper_footprints() -> dict[str, list[str]]:
    """Footprint name -> refs of empty-LCSC spec lines that use it."""
    users: dict[str, list[str]] = {}
    for spec_name in ("board_a_spec.py", "board_b_spec.py"):
        spec = load_spec_module(str(SPEC_DIR / spec_name))
        for ref, line in spec.COMPONENTS.items():
            mpn, value, lcsc, footprint = line[0], line[1], line[2], line[3]
            if lcsc:
                continue
            name = footprint.split(":", 1)[-1]
            users.setdefault(name, []).append(f"{spec_name[:7]}:{ref}")
    return users


def main() -> int:
    errors: list[str] = []
    for name, refs in sorted(bare_copper_footprints().items()):
        master = MASTER_DIR / f"{name}.kicad_mod"
        pretty = PRETTY_DIR / f"{name}.kicad_mod"
        for path in (master, pretty):
            if not path.exists():
                errors.append(f"{name}: missing {path.relative_to(REPO)} (used by {', '.join(refs)})")
                continue
            attr = re.search(r"^\s*\(attr ([^)]*)\)", path.read_text(), re.M)
            tokens = attr.group(1).split() if attr else []
            missing = [t for t in REQUIRED_TOKENS if t not in tokens]
            if missing:
                errors.append(
                    f"{path.relative_to(REPO)}: (attr ...) lacks {' '.join(missing)} "
                    f"(used by {', '.join(refs)})"
                )
        if master.exists() and pretty.exists() and master.read_bytes() != pretty.read_bytes():
            errors.append(f"{name}: dual-location copies differ (must be byte-identical)")

    if errors:
        print("bare-copper attr check FAILED:")
        for e in errors:
            print(f"  {e}")
        return 1
    print(f"{len(bare_copper_footprints())} bare-copper footprint(s) carry both exclusion attrs in both locations")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
