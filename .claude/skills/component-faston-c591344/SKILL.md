---
name: component-faston-c591344
description: Audit the exact board-b output rail power tabs J6-J9 (project/schematic value 63951-1, LCSC C591344, TE Connectivity FASTON 250 PCB tab terminal, footprint CONN-TH_1217754-1). Use for the 63951-1 vs 1217754-1 identity normalization, tab/hole dimensions, current rating vs the +12V/+5V/-12V rail budgets, THT solder retention, rail assignment, or substitution.
---

# TE Connectivity 63951-1 (LCSC C591344)

Run the central validator and read every local artifact. The identity is layered and
must not be flattened: LCSC catalogs C591344 as TE Connectivity MPN `63951-1`, and this
matches both the project schematic Value field and the v0.4.0 as-ordered BOM row for
J6-J9 exactly -- so the CONFIRMED distributor-identity lane is open for this record. The
KiCad schematic symbol/footprint pair used for J6-J9 (`zudo-pd:1217754-1`,
`CONN-TH_1217754-1`) is named after a *different*, separately-orderable TE FASTON 250
PCB tab terminal, `1217754-1` (LCSC C305825) -- a real part, not a typo or unrelated
same-name component, reused here only for its footprint/symbol geometry at
easyeda2kicad import time. Never treat `1217754-1`/C305825 as this record's canonical
identity; it is a routing alias only. te.com blocks automated retrieval of both product
pages (403, dated 2026-08-14), so all electrical/mechanical facts are mirror-sourced and
stay UNSOURCED or NEEDS BENCH; every coverage domain except identity is OPEN.

J6/J7/J8/J9 carry -12V/+12V/+5V/GND respectively (one 2-pin FASTON tab terminal per
rail, both pins tied to the same net). This doc-level rail-assignment table is **not**
promoted into the Ref.Pin-granularity `scripts/schgen/baselines/board-b.json` baseline,
which explicitly lists J6-J9's nets as unresolved -- assert only what the doc table
states, never a netlist-verified connection.

## Human component reference

Human projection of this bundle:
[rec-faston-c591344](/docs/components/records/faston-c591344/). Those pages are
generated from the JSON files here and add nothing to them -- where the two disagree,
this bundle is correct. See also the [component catalog](/docs/components/catalog/)
and the [cross-component rules](/docs/components/integration/).
