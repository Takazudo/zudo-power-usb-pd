/**
 * The committed instance-level publication selection for this circuit.
 *
 * Default-zero means this list, not a filter: a record or source that does not
 * appear here is never read into the view model, whatever the repository makes
 * visible. Every ID is spelled out so that adding a component to the project
 * does NOT silently add a public page — the reviewed `expect` assertions fail
 * the build until someone explicitly updates this selection and its counts.
 *
 * The `expect` counts are the other half of that guarantee, in the opposite
 * direction: if the provider corpus shrinks or grows, generation fails instead
 * of quietly publishing a different set. 41 records across the 20 wave-3
 * bundles (#107-#117) and the 9 cross-component rules (#118) are unchanged;
 * `sources` moved from 128 to 126 when the wave-6 part-swap decisions
 * (issue #132 repoint) swapped 4 demoted sources (SD05, the old PTC1, and
 * the C22383803/C22383804 passive aliases) for 3 replacement source sets
 * (C335982, C7529589, C87267 -- the fitted C22387780 sources were already
 * selected).
 *
 * `documentSelections` is deliberately omitted (empty): it is led-lamp's
 * curated single-document shortcut for the 3D-preview / reference feature,
 * and zudo-pd has no 3D assets at all — every `reference.*` field is DENY in
 * `matrix.ts`, so nothing would ever read a document selection. See
 * `core/publication.ts`'s `PublicationPolicy` constructor: the "every
 * selected record needs exactly one document selection" completeness check
 * is conditioned on `documentSelections` being non-empty for exactly this
 * reason.
 *
 * `linkableSourceIds` is a SEPARATE, narrower opt-in: selecting a source
 * publishes its title, revision, locator and availability; it does not by
 * itself publish an outbound link. Every entry here was checked to carry an
 * absolute `http:`/`https:` `authoritative_url` — including six sources
 * recorded as SOURCE UNAVAILABLE, which still publish their (unreachable)
 * URL next to the stated unavailability, matching led-lamp's convention.
 */

import type { InstanceSelection } from "../../core/publication.ts";

export const CIRCUIT_SELECTION: InstanceSelection = {
  recordIds: [
    // component-stusb4500qtr
    "rec-stusb4500qtr",
    // component-usb-type-c-009-c456012
    "rec-usb-type-c-009-c456012",
    // component-umw-ao3401a-c347476
    "rec-umw-ao3401a-c347476",
    // component-high-diode-smaj20a-c571370
    "rec-high-diode-smaj20a-c571370",
    // component-project-passives
    "rec-c25803",
    "rec-c23206",
    "rec-c23179",
    "rec-c23162",
    "rec-c25804",
    "rec-c21190",
    "rec-c17513",
    "rec-c23186",
    "rec-c21189",
    "rec-c13585",
    "rec-c15849",
    "rec-c1711",
    "rec-c1623",
    "rec-c1729",
    "rec-c2983319",
    "rec-c335982",
    "rec-c970687",
    "rec-c22387780",
    "rec-c2289",
    "rec-c2288",
    "rec-c2286",
    // component-jst-b6b-xh-a
    "rec-jst-b6b-xh-a",
    // component-pesd24vs1ub-c85382
    "rec-pesd24vs1ub-c85382",
    // component-lm2596s-adj-c347423
    "rec-lm2596s-adj-c347423",
    // component-cya1265-100uh-c19268674
    "rec-cya1265-100uh-c19268674",
    // component-ss34-c8678
    "rec-ss34-c8678",
    // component-l7812cd2t-c13456
    "rec-l7812cd2t-c13456",
    // component-l7805abd2t-c86206
    "rec-l7805abd2t-c86206",
    // component-cj7912-c94173
    "rec-cj7912-c94173",
    // component-ptc-smd1210p200tf-c20808 (decision g replacement: RUILON SMD1210P150TF/16, C7529589)
    "rec-ptc-smd1210p150tf16-c7529589",
    // component-ptc-msmd110-33v-c70119
    "rec-ptc-msmd110-33v-c70119",
    // component-ptc-bsmd1206-150-16v-c883133
    "rec-ptc-bsmd1206-150-16v-c883133",
    // component-smaj15a-c571368
    "rec-smaj15a-c571368",
    // component-sd05-c502527 (decision a replacement: Brightking SMAJ6.5A, C87267)
    "rec-cand-smaj6-5a-c87267",
    // component-faston-c591344
    "rec-faston-c591344",
    // component-hdr-2541wr-2x08p-c5383092
    "rec-hdr-2541wr-2x08p-c5383092",
  ],

  sourceIds: [
    // component-stusb4500qtr
    "src-stusb-ds12499", // rec-stusb4500qtr
    "src-stusb-ds12499-ratings", // rec-stusb4500qtr
    "src-stusb-um2650", // rec-stusb4500qtr
    "src-stusb-um2398", // rec-stusb4500qtr  // SOURCE UNAVAILABLE
    "src-stusb-stsw004", // rec-stusb4500qtr  // SOURCE UNAVAILABLE
    "src-stusb-ds12499-primary-attempt", // rec-stusb4500qtr  // SOURCE UNAVAILABLE
    "src-stusb-um2650-primary-attempt", // rec-stusb4500qtr  // SOURCE UNAVAILABLE
    "src-stusb-board-a-baseline", // rec-stusb4500qtr
    // component-usb-type-c-009-c456012
    "src-usb-type-c-009-mirror-spec", // rec-usb-type-c-009-c456012
    "src-usb-type-c-009-lcsc-catalog", // rec-usb-type-c-009-c456012
    "src-usb-type-c-009-primary-attempt", // rec-usb-type-c-009-c456012  // SOURCE UNAVAILABLE
    "src-usb-type-c-009-kicad-footprint", // rec-usb-type-c-009-c456012
    "src-usb-type-c-009-kicad-symbol", // rec-usb-type-c-009-c456012
    "src-usb-type-c-009-board-a-baseline", // rec-usb-type-c-009-c456012
    "src-usb-type-c-009-bom-v040", // rec-usb-type-c-009-c456012
    // component-umw-ao3401a-c347476
    "src-umw-ao3401a-c347476-datasheet", // rec-umw-ao3401a-c347476
    "src-ao3401a-board-a-baseline", // rec-umw-ao3401a-c347476
    "src-ao3401a-usb-pd-input-sch", // rec-umw-ao3401a-c347476
    // component-high-diode-smaj20a-c571370
    "src-smaj20a-c571370-distributor", // rec-high-diode-smaj20a-c571370
    "src-smaj20a-c571370-primary", // rec-high-diode-smaj20a-c571370
    "src-smaj20a-board-a-baseline", // rec-high-diode-smaj20a-c571370
    // component-project-passives
    "src-c25803-uniroyal", // rec-c25803
    "src-c25803-boardadoc", // rec-c25803
    "src-c23206-uniroyal", // rec-c23206
    "src-c23206-boardadoc", // rec-c23206
    "src-c23179-uniroyal", // rec-c23179
    "src-c23179-boardadoc", // rec-c23179
    "src-c23162-uniroyal", // rec-c23162
    "src-c23162-boardadoc", // rec-c23162
    "src-c25804-uniroyal", // rec-c25804
    "src-c25804-boardadoc", // rec-c25804
    "src-c21190-uniroyal", // rec-c21190
    "src-c21190-boardadoc", // rec-c21190
    "src-c17513-uniroyal", // rec-c17513
    "src-c17513-boardadoc", // rec-c17513
    "src-c23186-uniroyal", // rec-c23186
    "src-c23186-boardadoc", // rec-c23186
    "src-c21189-uniroyal", // rec-c21189
    "src-c21189-boardadoc", // rec-c21189
    "src-c13585-page", // rec-c13585
    "src-c13585-catalog", // rec-c13585
    "src-c13585-boardadoc", // rec-c13585
    "src-c15849-page", // rec-c15849
    "src-c15849-catalog", // rec-c15849
    "src-c15849-boardadoc", // rec-c15849
    "src-c1711-yageo", // rec-c1711
    "src-c1711-boardadoc", // rec-c1711
    "src-c1623-page", // rec-c1623
    "src-c1623-catalog", // rec-c1623
    "src-c1623-boardbdoc", // rec-c1623
    "src-c1729-page", // rec-c1729
    "src-c1729-catalog", // rec-c1729
    "src-c1729-boardbdoc", // rec-c1729
    "src-c2983319-datasheet", // rec-c2983319
    "src-c2983319-boardbdoc", // rec-c2983319
    "src-c335982-identity", // rec-c335982
    "src-c970687-datasheet", // rec-c970687
    "src-c970687-boardbdoc", // rec-c970687
    "src-c22387780-datasheet", // rec-c22387780
    "src-c22387780-boardbdoc", // rec-c22387780
    "src-c2289-datasheet", // rec-c2289
    "src-c2289-boardbdoc", // rec-c2289
    "src-c2288-datasheet", // rec-c2288
    "src-c2288-boardbdoc", // rec-c2288
    "src-c2286-datasheet", // rec-c2286
    "src-c2286-boardbdoc", // rec-c2286
    // component-jst-b6b-xh-a
    "src-jst-xh-catalog", // rec-jst-b6b-xh-a
    "src-jst-xh-header", // rec-jst-b6b-xh-a
    "src-jst-board-split-decision", // rec-jst-b6b-xh-a
    // component-pesd24vs1ub-c85382
    "src-pesd24vs1ub-nexperia-primary", // rec-pesd24vs1ub-c85382
    "src-pesd24vs1ub-lcsc-identity", // rec-pesd24vs1ub-c85382
    // component-lm2596s-adj-c347423
    "src-lm2596-umw-ds", // rec-lm2596s-adj-c347423
    "src-lm2596-schematic-dcdc", // rec-lm2596s-adj-c347423
    "src-lm2596-board-b-baseline", // rec-lm2596s-adj-c347423
    // component-cya1265-100uh-c19268674
    "src-cya1265-datasheet", // rec-cya1265-100uh-c19268674
    // component-ss34-c8678
    "src-ss34-datasheet", // rec-ss34-c8678
    // component-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-identity", // rec-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-pinout", // rec-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-absmax", // rec-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-thermal", // rec-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-elec", // rec-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-appinfo", // rec-l7812cd2t-c13456
    "src-l7812cd2t-project-blocker", // rec-l7812cd2t-c13456
    // component-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-identity", // rec-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-pinout", // rec-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-absmax", // rec-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-thermal", // rec-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-elec", // rec-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-appinfo", // rec-l7805abd2t-c86206
    "src-l7805abd2t-project-rail", // rec-l7805abd2t-c86206
    "src-l7805abd2t-project-rating", // rec-l7805abd2t-c86206
    // component-cj7912-c94173
    "src-cj7912-ds-identity", // rec-cj7912-c94173
    "src-cj7912-ds-pinout", // rec-cj7912-c94173
    "src-cj7912-ds-absmax", // rec-cj7912-c94173
    "src-cj7912-ds-electrical", // rec-cj7912-c94173
    "src-cj7912-ds-application", // rec-cj7912-c94173
    "src-cj7912-ds-package", // rec-cj7912-c94173
    "src-cj7912-project-baseline", // rec-cj7912-c94173
    "src-cj7912-project-docs", // rec-cj7912-c94173
    "src-cj7912-schematic", // rec-cj7912-c94173
    // component-ptc-smd1210p200tf-c20808 (decision g replacement)
    "src-ptc1b-smd1210-datasheet", // rec-ptc-smd1210p150tf16-c7529589
    // component-ptc-msmd110-33v-c70119
    "src-ptc2-msmd110-datasheet", // rec-ptc-msmd110-33v-c70119
    // component-ptc-bsmd1206-150-16v-c883133
    "src-ptc3-bsmd1206-datasheet", // rec-ptc-bsmd1206-150-16v-c883133
    // component-smaj15a-c571368
    "src-smaj15a-hdiode-primary", // rec-smaj15a-c571368
    "src-smaj15a-lcsc-identity", // rec-smaj15a-c571368
    // component-sd05-c502527 (decision a replacement)
    "src-cand-smaj6-5a-brightking-primary", // rec-cand-smaj6-5a-c87267
    "src-cand-smaj6-5a-lcsc-identity", // rec-cand-smaj6-5a-c87267
    // component-faston-c591344
    "src-faston-te-mirror-spec", // rec-faston-c591344
    "src-faston-lcsc-catalog", // rec-faston-c591344
    "src-faston-te-primary-attempt", // rec-faston-c591344  // SOURCE UNAVAILABLE
    "src-faston-catalog-1654369-1", // rec-faston-c591344
    "src-faston-lcsc-c305825-catalog", // rec-faston-c591344
    "src-faston-kicad-symbol", // rec-faston-c591344
    "src-faston-kicad-footprint", // rec-faston-c591344
    "src-faston-board-b-synthpower-doc", // rec-faston-c591344
    "src-faston-board-b-baseline", // rec-faston-c591344
    "src-faston-bom-v040", // rec-faston-c591344
    // component-hdr-2541wr-2x08p-c5383092
    "src-hdr-hanelec-drawing", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-lcsc-catalog", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-kicad-symbol", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-kicad-footprint", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-board-b-synthpower-doc", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-board-b-baseline", // rec-hdr-2541wr-2x08p-c5383092
    "src-hdr-bom-v040", // rec-hdr-2541wr-2x08p-c5383092
  ],

  // Every selected source carries an absolute http(s) authoritative_url
  // (verified against `sources.json` for every bundle), so all are linkable —
  // matching led-lamp's own selection, whose `linkableSourceIds` list is
  // identical to its `sourceIds` list.
  linkableSourceIds: [
    // component-stusb4500qtr
    "src-stusb-ds12499",
    "src-stusb-ds12499-ratings",
    "src-stusb-um2650",
    "src-stusb-um2398",
    "src-stusb-stsw004",
    "src-stusb-ds12499-primary-attempt",
    "src-stusb-um2650-primary-attempt",
    "src-stusb-board-a-baseline",
    // component-usb-type-c-009-c456012
    "src-usb-type-c-009-mirror-spec",
    "src-usb-type-c-009-lcsc-catalog",
    "src-usb-type-c-009-primary-attempt",
    "src-usb-type-c-009-kicad-footprint",
    "src-usb-type-c-009-kicad-symbol",
    "src-usb-type-c-009-board-a-baseline",
    "src-usb-type-c-009-bom-v040",
    // component-umw-ao3401a-c347476
    "src-umw-ao3401a-c347476-datasheet",
    "src-ao3401a-board-a-baseline",
    "src-ao3401a-usb-pd-input-sch",
    // component-high-diode-smaj20a-c571370
    "src-smaj20a-c571370-distributor",
    "src-smaj20a-c571370-primary",
    "src-smaj20a-board-a-baseline",
    // component-project-passives
    "src-c25803-uniroyal",
    "src-c25803-boardadoc",
    "src-c23206-uniroyal",
    "src-c23206-boardadoc",
    "src-c23179-uniroyal",
    "src-c23179-boardadoc",
    "src-c23162-uniroyal",
    "src-c23162-boardadoc",
    "src-c25804-uniroyal",
    "src-c25804-boardadoc",
    "src-c21190-uniroyal",
    "src-c21190-boardadoc",
    "src-c17513-uniroyal",
    "src-c17513-boardadoc",
    "src-c23186-uniroyal",
    "src-c23186-boardadoc",
    "src-c21189-uniroyal",
    "src-c21189-boardadoc",
    "src-c13585-page",
    "src-c13585-catalog",
    "src-c13585-boardadoc",
    "src-c15849-page",
    "src-c15849-catalog",
    "src-c15849-boardadoc",
    "src-c1711-yageo",
    "src-c1711-boardadoc",
    "src-c1623-page",
    "src-c1623-catalog",
    "src-c1623-boardbdoc",
    "src-c1729-page",
    "src-c1729-catalog",
    "src-c1729-boardbdoc",
    "src-c2983319-datasheet",
    "src-c2983319-boardbdoc",
    "src-c335982-identity",
    "src-c970687-datasheet",
    "src-c970687-boardbdoc",
    "src-c22387780-datasheet",
    "src-c22387780-boardbdoc",
    "src-c2289-datasheet",
    "src-c2289-boardbdoc",
    "src-c2288-datasheet",
    "src-c2288-boardbdoc",
    "src-c2286-datasheet",
    "src-c2286-boardbdoc",
    // component-jst-b6b-xh-a
    "src-jst-xh-catalog",
    "src-jst-xh-header",
    "src-jst-board-split-decision",
    // component-pesd24vs1ub-c85382
    "src-pesd24vs1ub-nexperia-primary",
    "src-pesd24vs1ub-lcsc-identity",
    // component-lm2596s-adj-c347423
    "src-lm2596-umw-ds",
    "src-lm2596-schematic-dcdc",
    "src-lm2596-board-b-baseline",
    // component-cya1265-100uh-c19268674
    "src-cya1265-datasheet",
    // component-ss34-c8678
    "src-ss34-datasheet",
    // component-l7812cd2t-c13456
    "src-l7812cd2t-ds0422-identity",
    "src-l7812cd2t-ds0422-pinout",
    "src-l7812cd2t-ds0422-absmax",
    "src-l7812cd2t-ds0422-thermal",
    "src-l7812cd2t-ds0422-elec",
    "src-l7812cd2t-ds0422-appinfo",
    "src-l7812cd2t-project-blocker",
    // component-l7805abd2t-c86206
    "src-l7805abd2t-ds0422-identity",
    "src-l7805abd2t-ds0422-pinout",
    "src-l7805abd2t-ds0422-absmax",
    "src-l7805abd2t-ds0422-thermal",
    "src-l7805abd2t-ds0422-elec",
    "src-l7805abd2t-ds0422-appinfo",
    "src-l7805abd2t-project-rail",
    "src-l7805abd2t-project-rating",
    // component-cj7912-c94173
    "src-cj7912-ds-identity",
    "src-cj7912-ds-pinout",
    "src-cj7912-ds-absmax",
    "src-cj7912-ds-electrical",
    "src-cj7912-ds-application",
    "src-cj7912-ds-package",
    "src-cj7912-project-baseline",
    "src-cj7912-project-docs",
    "src-cj7912-schematic",
    // component-ptc-smd1210p200tf-c20808 (decision g replacement)
    "src-ptc1b-smd1210-datasheet",
    // component-ptc-msmd110-33v-c70119
    "src-ptc2-msmd110-datasheet",
    // component-ptc-bsmd1206-150-16v-c883133
    "src-ptc3-bsmd1206-datasheet",
    // component-smaj15a-c571368
    "src-smaj15a-hdiode-primary",
    "src-smaj15a-lcsc-identity",
    // component-sd05-c502527 (decision a replacement)
    "src-cand-smaj6-5a-brightking-primary",
    "src-cand-smaj6-5a-lcsc-identity",
    // component-faston-c591344
    "src-faston-te-mirror-spec",
    "src-faston-lcsc-catalog",
    "src-faston-te-primary-attempt",
    "src-faston-catalog-1654369-1",
    "src-faston-lcsc-c305825-catalog",
    "src-faston-kicad-symbol",
    "src-faston-kicad-footprint",
    "src-faston-board-b-synthpower-doc",
    "src-faston-board-b-baseline",
    "src-faston-bom-v040",
    // component-hdr-2541wr-2x08p-c5383092
    "src-hdr-hanelec-drawing",
    "src-hdr-lcsc-catalog",
    "src-hdr-kicad-symbol",
    "src-hdr-kicad-footprint",
    "src-hdr-board-b-synthpower-doc",
    "src-hdr-board-b-baseline",
    "src-hdr-bom-v040",
  ],

  documentSelections: [],

  expect: {
    records: 41,
    sources: 126,
    integrationRules: 9,
  },
};
