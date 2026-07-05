# v0.4.0 — from-order-detail (placeholder)

This directory is empty on purpose. Unlike `v0_1_0`, `v0_2_0`, and `v0_3_0` (each of which has a
`from-order-detail/` containing JLCPCB's own confirmed BOM export, layout render, and/or
product-detail photo), no equivalent artifact for the v0.4.0 order could be found anywhere on
this machine as of 2026-07-05. See
`doc/src/content/docs/inbox/v4-asbuilt-audit.md` for the full investigation.

## What to do

1. Log into the JLCPCB account used for this project's orders
   (`https://jlcpcb.com/user/order/list` → Order History).
2. Look for an order placed on or after **2026-06-05** for this board (the pin-18 fix + faston
   swap + BOM harmonization were committed at that date/time in `7854736`/`2c29375`).
3. If found, from the order-detail page download:
   - The **confirmed BOM** export (shows JLCPCB's actual matched/substituted LCSC parts — this
     is the only way to rule out a silent substitution, e.g. for D4 USBLC6-2SC6).
   - Any **layout / placement-preview render** JLCPCB generated.
   - Any **product-detail photo** (post-assembly photo, if the order has shipped).
4. Save them into this directory using the same naming convention as `v0_3_0/from-order-detail/`
   (`bom.xls`, `layout.png`, `product-detail.png`).
5. If **no** order exists for this date, v0.4.0 has not actually been manufactured yet — the
   design fix only exists in git plus the locally-generated package in
   `../used-for-order/` (recovered from this machine's gitignored `jlcpcb/` working directory).
   The next step would be to actually place the order using those files.
