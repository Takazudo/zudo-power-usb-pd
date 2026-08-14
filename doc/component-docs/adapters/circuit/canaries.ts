/**
 * The denied-value canary set, harvested from this provider's raw evidence.
 *
 * Deliberately reads the bundles as untyped JSON rather than through
 * `evidence.ts`. The provider shapes there are narrow structural reads that
 * name only the fields the projection consumes — `sha256`, `evidence_extract`
 * and `reviewed_by` are not among them, precisely because nothing is allowed to
 * consume them. Harvesting through those types would therefore find nothing to
 * canary, and the scan would pass by knowing less rather than by leaking less.
 *
 * So this walks the JSON as it is on disk, which is also what makes the scan
 * robust against the shapes changing: a new denied key added to the evidence
 * contract is picked up here without a code change, as long as its NAME is
 * listed below.
 */

import { join } from "node:path";
import { readdir } from "node:fs/promises";

import { harvestCanaries, type Canary } from "../../core/scan.ts";
import { BUNDLE_FILES, INTEGRATION_RULES_FILE, INVENTORY_FILE, SKILLS_ROOT } from "./paths.ts";
import { readProviderJson } from "./read.ts";

/**
 * Provider key names whose values must never reach a published artifact.
 *
 * The first eight mirror the `DENY` rows of `matrix.ts`, named in the
 * provider's own snake_case. The rest are retrieval bookkeeping that the view
 * model has no leaf for at all — there is no `FieldKey` to deny, so the matrix
 * cannot speak about them, and an adapter change that started reading one would
 * be caught by nothing else.
 *
 * `physical_pdf_page_index` is listed for completeness; its values are small
 * integers, so `harvestCanaries` will discard them. That field's absence is
 * proven structurally instead — see the module comment in `core/scan.ts`.
 */
export const DENIED_PROVIDER_KEYS: readonly string[] = [
  // --- the seven led-lamp's matrix denies ---------------------------------
  "sha256",
  "evidence_extract",
  "alternate_authoritative_url",
  "physical_pdf_page_index",
  "positive",
  "negative",
  "reviewed_by",
  // --- retrieval bookkeeping with no view-model leaf ----------------------
  "identity_extract_sha256",
  "request_headers",
  "refresh_policy",
  "refresh_note",
  // --- zudo-pd's additional matrix denials ---------------------------------
  // `record.ownerSkill`/`integration.ownerSkill` are denied here (see
  // `matrix.ts`): `claudeResources` is `false`, so no `/docs/claude-skills/`
  // route exists to link back to. The remaining `reference.*` denials have no
  // provider JSON counterpart to canary — they are derived from the KiCad
  // library rather than from an evidence bundle field.
  "owner_skill",
];

/** Every owner bundle on disk, in directory order. */
async function listBundleDirectories(): Promise<readonly string[]> {
  const entries = await readdir(SKILLS_ROOT, { withFileTypes: true });
  const bundles: string[] = [];
  for (const entry of entries) {
    // `isDirectory()` is false for a symlinked directory, which is the wanted
    // behaviour: `read.ts` would refuse to read through it anyway.
    if (!entry.isDirectory()) continue;
    bundles.push(entry.name);
  }
  return bundles.sort();
}

/**
 * Read every JSON document this provider holds — every owner bundle, the
 * inventory and the integration rules — and return the values reachable only
 * through a denied key.
 *
 * Bundles that do not carry the full seven-file layout are skipped rather than
 * failed: `.claude/skills/` also holds the audit skill and the integration
 * skill, which are not component bundles. Their own reference files are read
 * explicitly below, so nothing is missed by the skip.
 */
export async function readCanaries(): Promise<readonly Canary[]> {
  const documents: unknown[] = [];

  for (const bundle of await listBundleDirectories()) {
    for (const file of BUNDLE_FILES) {
      const path = join(SKILLS_ROOT, bundle, file);
      try {
        documents.push(await readProviderJson(path));
      } catch {
        // Not a component bundle, or not this file. The component bundles are
        // read in full by `evidence.ts` on every generation, so a genuinely
        // unreadable one fails the build long before this scan runs.
      }
    }
  }

  for (const path of [INVENTORY_FILE, INTEGRATION_RULES_FILE]) {
    documents.push(await readProviderJson(path));
  }

  return harvestCanaries(documents, { deniedKeys: DENIED_PROVIDER_KEYS });
}
