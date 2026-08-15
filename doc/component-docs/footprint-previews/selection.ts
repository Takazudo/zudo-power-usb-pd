/**
 * Fork from led-lamp: builds packages directly from `canonicalFootprint()` +
 * `readPackage()`, not from `readCircuitReferenceContract()`.
 *
 * led-lamp's version is 14 lines, but all 14 are delegation: it calls
 * `readEvidenceIndex()` (which attaches a `references` contract via
 * `readCircuitReferenceContract()`) and maps `contract.packages` down to
 * `FootprintSelection`. That contract also resolves
 * `CIRCUIT_SELECTION.documentSelections` — a 41-record human audit this
 * project is still curating — through `PublicationPolicy`'s completeness
 * check once that curation stops being empty (see `selection.ts`'s own
 * comment on that check). Footprint preview generation has no dependency on
 * document review, so routing through the same contract would serialize this
 * generator behind that unrelated audit for no reason.
 *
 * This builds the evidence index the same way `readEvidenceIndex()` does
 * (`indexEvidence()` over the inventory + bundles + rules), but stops one
 * step short of attaching the references contract, then reuses
 * `references.ts`'s exported `canonicalFootprint()` and `readPackage()` —
 * the #142-forked, model-optional footprint reader — to build packages
 * per-record. That reuses every footprint-side guard `readPackage()`
 * performs (`containedFile()` containment, the
 * `REFERENCE_LIMITS.footprintBytes` cap, `SAFE_BASENAME`, `footprintPath`)
 * instead of reimplementing them, while staying independently correct
 * regardless of how far the document curation has gotten.
 */

import {
  indexEvidence,
  readBundle,
  readIntegrationRules,
  readInventory,
} from "../adapters/circuit/evidence.ts";
import { INTEGRATION_RULES_FILE, INVENTORY_FILE } from "../adapters/circuit/paths.ts";
import { canonicalFootprint, readPackage } from "../adapters/circuit/references.ts";
import { CIRCUIT_SELECTION } from "../adapters/circuit/selection.ts";
import { fail } from "../core/errors.ts";
import type { FootprintSelection } from "./manifest.ts";

export async function readFootprintSelections(): Promise<readonly FootprintSelection[]> {
  const inventory = await readInventory(INVENTORY_FILE);
  const ownerSkills = uniqueInOrder(inventory.lines.map((line) => line.owner_skill));
  const [bundles, rules] = await Promise.all([
    Promise.all(ownerSkills.map(readBundle)),
    readIntegrationRules(INTEGRATION_RULES_FILE),
  ]);
  const index = indexEvidence(inventory, bundles, rules.rules);

  const packagesByName = new Map<string, FootprintSelection>();
  for (const recordId of CIRCUIT_SELECTION.recordIds) {
    const entry = index.recordById.get(recordId);
    if (entry === undefined) fail("STALE_SELECTION", `missing record ${recordId}`, { recordId });
    const footprintName = canonicalFootprint(entry);
    let selection = packagesByName.get(footprintName);
    if (selection === undefined) {
      const reference = await readPackage(footprintName, recordId);
      selection = {
        packageId: reference.packageId,
        footprintName: reference.footprintName,
        footprintPath: reference.footprintPath,
        recordIds: [],
      };
    }
    packagesByName.set(footprintName, { ...selection, recordIds: [...selection.recordIds, recordId] });
  }

  const packages = [...packagesByName.values()];
  const expected = CIRCUIT_SELECTION.expect.footprintPackages;
  if (packages.length !== expected) {
    fail("ADAPTER_CONTRACT", `expected exactly ${expected} footprint packages`, {
      expected,
      actual: packages.length,
    });
  }
  return packages;
}

function uniqueInOrder(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }
  return result;
}
