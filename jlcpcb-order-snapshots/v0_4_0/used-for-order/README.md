# v0.4.0 — used-for-order (recovered, not a fresh export)

`BOM-zudo-pd.csv`, `CPL-zudo-pd.csv`, and `GERBER-zudo-pd.zip` in this directory are **not**
newly generated — they were recovered on 2026-07-05 from this machine's gitignored `jlcpcb/`
working directory (`kicad-jlcpcb-tools` plugin output), where their file mtimes are
**2026-06-05 03:24**, about 1.5 hours before the design was committed as `7854736`
(`fix(usb-pd): v0.4.0 faston swap to C591344 + harmonize BOM comments`).

They reflect the fixed v0.4.0 design (pin-18 → R14 → VBUS_IN, faston C591344 swap) and are
believed to be the package that was prepared for the v0.4.0 order, but there is no local
evidence confirming they were ever actually uploaded/ordered at JLCPCB — see
`../from-order-detail/README.md` and
`doc/src/content/docs/inbox/v4-asbuilt-audit.md` for the full verification and what to check on
the JLCPCB side.

Known issue in this snapshot: the BOM's R13/R14 rows did not fully collapse per the
harmonization commit's intent (`R13` shows Comment `470`, `R14` shows `470ohm`, same LCSC
`C23179`) — a stale value cached in the plugin's local `project.db`, not a schematic problem.
Regenerate from KiCad before using this for a real order if that matters to you.
