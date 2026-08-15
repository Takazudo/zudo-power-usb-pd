#!/usr/bin/env python3
"""Generate IPC-style F.CrtYd outlines for the project's KiCad footprints.

Most of this library came from easyeda2kicad, which either omits the courtyard
entirely or draws it around the component *body only* -- so it does not enclose
the part's own pads, and KiCad's courtyard DRC either cannot run at all or runs
against a keepout smaller than the copper it is meant to protect. This tool
replaces whatever is on F.CrtYd with a rectangle enclosing every pad and every
body graphic, plus an IPC clearance.

The courtyard is deliberately a plain rectangle rather than a chamfered outline:
it is a DRC keepout, not artwork, and a rectangle cannot accidentally cut inside
the pads the way a body-shaped outline does. Silkscreen and fab artwork -- the
chamfer that marks electrolytic polarity included -- are left untouched.

Parsing goes through scripts/schgen/sexp.py rather than regexes so both the
legacy easyeda2kicad `(module ...)` layout and the modern multi-line KiCad
`(footprint ...)` layout are handled identically.

Usage:
    python3 footprints/scripts/gen_courtyards.py --check    # report drift, write nothing
    python3 footprints/scripts/gen_courtyards.py            # rewrite in place

Both the master `footprints/kicad/*.kicad_mod` and the KiCad resolution copies in
`footprints/kicad/zudo-power.pretty/` are kept in sync, per the dual-location rule
in footprints/CLAUDE.md.
"""

from __future__ import annotations

import argparse
import math
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts" / "schgen"))

from sexp import atom, parse, tokenize  # noqa: E402

# IPC-7351 density-B ("nominal") courtyard excess, and the KiCad official-library
# default for non-fine-pitch parts.
CLEARANCE_MM = 0.25
LINE_WIDTH_MM = 0.05

MASTER_DIR = ROOT / "footprints" / "kicad"
PRETTY_DIR = MASTER_DIR / "zudo-power.pretty"

BODY_LAYERS = {"F.Fab", "B.Fab", "F.SilkS", "B.SilkS"}
GRAPHIC_NODES = {"fp_line", "fp_rect", "fp_circle", "fp_arc", "fp_poly"}


def node_name(node):
    return atom(node[0]) if isinstance(node, list) and node else None


def child(node, name):
    for item in node[1:] if isinstance(node, list) else []:
        if isinstance(item, list) and node_name(item) == name:
            return item
    return None


def numbers(node):
    out = []
    for item in node[1:]:
        if not isinstance(item, list):
            try:
                out.append(float(atom(item)))
            except (TypeError, ValueError):
                pass
    return out


def layers_of(node):
    found = set()
    for name in ("layer", "layers"):
        holder = child(node, name)
        if holder:
            found |= {atom(x) for x in holder[1:] if not isinstance(x, list)}
    return found


def pad_box(pad):
    at, size = child(pad, "at"), child(pad, "size")
    if not at or not size:
        return None
    coords, dims = numbers(at), numbers(size)
    if len(coords) < 2 or len(dims) < 2:
        return None
    x, y = coords[0], coords[1]
    rot = coords[2] if len(coords) > 2 else 0.0
    w, h = dims[0], dims[1]
    # Only right angles occur in this library; anything else is bounded by its
    # circumscribed box so the courtyard can never come out too small.
    if abs(math.sin(math.radians(rot))) > 0.999:
        w, h = h, w
    elif abs(math.cos(math.radians(rot))) < 0.999:
        w = h = math.hypot(w, h)
    return (x - w / 2, y - h / 2, x + w / 2, y + h / 2)


def graphic_box(node):
    """Bounding box of one body graphic, or None if it is not body artwork."""
    if not layers_of(node) & BODY_LAYERS:
        return None
    name = node_name(node)
    points = []
    if name == "fp_circle":
        centre, edge = child(node, "center"), child(node, "end")
        if centre and edge:
            (cx, cy), (ex, ey) = numbers(centre)[:2], numbers(edge)[:2]
            r = math.dist((cx, cy), (ex, ey))
            points = [(cx - r, cy - r), (cx + r, cy + r)]
    elif name == "fp_poly":
        pts = child(node, "pts")
        for xy in (pts[1:] if pts else []):
            if isinstance(xy, list) and node_name(xy) == "xy":
                coords = numbers(xy)
                if len(coords) >= 2:
                    points.append((coords[0], coords[1]))
    else:
        for key in ("start", "mid", "end", "center"):
            part = child(node, key)
            if part:
                coords = numbers(part)
                if len(coords) >= 2:
                    points.append((coords[0], coords[1]))
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return (min(xs), min(ys), max(xs), max(ys))


def walk(node):
    if isinstance(node, list):
        yield node
        for item in node:
            yield from walk(item)


def compute_courtyard(text):
    tree = parse(tokenize(text))
    boxes, pads = [], 0
    for node in walk(tree):
        name = node_name(node)
        if name == "pad":
            pads += 1
            box = pad_box(node)
            if box is None:
                raise ValueError("a pad has no parseable at/size")
            boxes.append(box)
        elif name in GRAPHIC_NODES:
            box = graphic_box(node)
            if box:
                boxes.append(box)
    if not pads:
        raise ValueError("no pads found")
    return (
        round(min(b[0] for b in boxes) - CLEARANCE_MM, 2),
        round(min(b[1] for b in boxes) - CLEARANCE_MM, 2),
        round(max(b[2] for b in boxes) + CLEARANCE_MM, 2),
        round(max(b[3] for b in boxes) + CLEARANCE_MM, 2),
    )


def render(box, indent, quoted):
    x0, y0, x1, y1 = box
    layer = '"F.CrtYd"' if quoted else "F.CrtYd"
    corners = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    return "".join(
        f"{indent}(fp_line (start {a[0]:.2f} {a[1]:.2f}) (end {b[0]:.2f} {b[1]:.2f})"
        f" (layer {layer}) (width {LINE_WIDTH_MM}))\n"
        for a, b in zip(corners, corners[1:])
    )


def strip_courtyard(text):
    """Remove existing F.CrtYd graphics in either single-line or multi-line form."""
    out, i, n = [], 0, len(text)
    while i < n:
        match = re.compile(r"[ \t]*\((fp_line|fp_rect|fp_poly|fp_circle|fp_arc)\s").match(text, i)
        if not match:
            out.append(text[i])
            i += 1
            continue
        depth, j = 0, text.index("(", i)
        while j < n:
            if text[j] == "(":
                depth += 1
            elif text[j] == ")":
                depth -= 1
                if depth == 0:
                    j += 1
                    break
            j += 1
        block = text[i:j]
        trailing = j
        while trailing < n and text[trailing] in " \t":
            trailing += 1
        if trailing < n and text[trailing] == "\n":
            trailing += 1
        if re.search(r'\(layer\s+"?F\.CrtYd"?\s*\)', block):
            i = trailing
            continue
        out.append(text[i:trailing])
        i = trailing
    return "".join(out)


def rewrite(text):
    box = compute_courtyard(text)
    stripped = strip_courtyard(text)
    quoted = '(layer "' in stripped
    body = re.search(r"^([ \t]+)\(pad", stripped, re.M)
    indent = body.group(1) if body else "\t"
    anchor = stripped.rfind(f"{indent}(model ")
    if anchor == -1:
        tail = stripped.rstrip()
        anchor = tail.rfind("\n)")
        anchor = anchor + 1 if anchor != -1 else len(stripped)
    return stripped[:anchor] + render(box, indent, quoted) + stripped[anchor:]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="report drift without writing")
    args = parser.parse_args()

    drift, skipped = [], []
    for path in sorted(MASTER_DIR.glob("*.kicad_mod")):
        original = path.read_text(encoding="utf-8")
        try:
            updated = rewrite(original)
            box = compute_courtyard(original)
        except (ValueError, IndexError) as exc:
            skipped.append(f"{path.name}: {exc}")
            continue
        changed = updated != original
        if changed:
            drift.append(path.name)
            if not args.check:
                path.write_text(updated, encoding="utf-8", newline="")
        mirror = PRETTY_DIR / path.name
        if mirror.exists() and not args.check and mirror.read_text(encoding="utf-8") != updated:
            mirror.write_text(updated, encoding="utf-8", newline="")
        print(f"{'DRIFT' if changed else '  ok '} {path.name:48s} {box[2] - box[0]:6.2f} x {box[3] - box[1]:6.2f} mm")

    for note in skipped:
        print(f"SKIP  {note}")
    if skipped:
        print(f"\n{len(skipped)} footprint(s) could not be parsed — fix before relying on courtyard DRC")
        return 1
    if args.check and drift:
        print(f"\n{len(drift)} footprint(s) need a courtyard refresh; run without --check")
        return 1
    print(f"\n{len(drift)} footprint(s) {'would be ' if args.check else ''}updated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
