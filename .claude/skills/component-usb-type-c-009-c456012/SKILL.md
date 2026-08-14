---
name: component-usb-type-c-009-c456012
description: Audit the exact board-a USB-C receptacle J1 (project label USB-TYPE-C-009, LCSC C456012, SHOU HAN TYPE-C 6P, 6-pin power-only). Use for CC1/CC2 PD negotiation pads, VBUS/GND/shell topology, the 5 V mirror rating versus the 15 V PD contract, footprint TYPE-C-SMD_TYPE-C-6P, bring-up, or substitution.
---

# USB-TYPE-C-009 (LCSC C456012)

Run the central validator and read every local artifact. The identity is layered and
must not be flattened: `USB-TYPE-C-009` is the project KiCad symbol label resolved as
the inventory MPN; LCSC catalogs C456012 as brand SHOU HAN, product model `TYPE-C 6P`
(Shenzhen Shouhan Technology Co., Ltd.); and DEALON's literal `USB-TYPE-C-009`
(LCSC C2927029) is an unrelated same-name part whose data must never be borrowed. The
led-lamp `TYPE-C-31-M-17` / C283540 is a different 16P connector — format exemplar
only, zero data reuse. No manufacturer-primary document was retrievable (dated
attempt 2026-08-14), so every electrical fact is mirror-sourced and stays UNSOURCED
or NEEDS BENCH; all five coverage domains are OPEN with named blocking facts.

The receptacle is 6P power-only but carries dedicated CC1 (A5) and CC2 (B5) pads —
that is what makes STUSB4500 PD sink negotiation possible without USB data pairs.
The mirror-stated rating is 5 V / 3 A while the negotiated contract is 15 V / 3 A:
15 V exceeds the mirror rating and 3 A has zero margin. Before any board-a order,
continuity-map A5/B5/A9/B9/A12/B12 and the four shell tabs (shared pad 7, tied to
GND) on the dead v4 boards with no cable and both plug orientations.

## Human component reference

Human projection of this bundle:
[rec-usb-type-c-009-c456012](/docs/components/records/usb-type-c-009-c456012/). Those
pages are generated from the JSON files here and add nothing to them — where the two
disagree, this bundle is correct. See also the
[component catalog](/docs/components/catalog/) and the
[cross-component rules](/docs/components/integration/).
