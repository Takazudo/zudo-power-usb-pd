/**
 * Every filesystem location this adapter is allowed to touch, resolved once.
 *
 * The doc site is a pnpm project rooted at `doc/` with no package.json above
 * it, so every command runs with cwd `doc/` and the repository root is exactly
 * one level up. Resolving from `import.meta.url` rather than `process.cwd()`
 * keeps the paths correct when a test or a watcher runs from elsewhere.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** `doc/component-docs/adapters/circuit/` */
const HERE = dirname(fileURLToPath(import.meta.url));

/** `doc/` — the pnpm project root and the cwd of every package script. */
export const DOC_ROOT = resolve(HERE, "..", "..", "..");

/** The repository root. */
export const REPO_ROOT = resolve(DOC_ROOT, "..");

/** The only directory the adapter reads evidence from. */
export const SKILLS_ROOT = join(REPO_ROOT, ".claude", "skills");

export const AUDIT_SKILL = join(SKILLS_ROOT, "component-spec-audit");
export const INVENTORY_FILE = join(AUDIT_SKILL, "references", "inventory.json");
export const SCHEMA_FILE = join(AUDIT_SKILL, "references", "schema.json");
export const VALIDATOR_SCRIPT = join(AUDIT_SKILL, "scripts", "validate.py");

/**
 * The bundle directory the cross-component rules live in.
 *
 * Also the last segment of the raw agent route the integration page WOULD
 * link back to on a site with `claudeResources` enabled — kept as a named
 * constant even though `integration.ownerSkill` is denied here (see
 * `matrix.ts`), so a future flip of that setting has one place to read from.
 */
export const INTEGRATION_SKILL_NAME = "circuit-spec-integration";

export const INTEGRATION_SKILL = join(SKILLS_ROOT, INTEGRATION_SKILL_NAME);
export const INTEGRATION_RULES_FILE = join(INTEGRATION_SKILL, "references", "rules.json");

/** Every page source the site publishes, this feature's tree included. */
export const CONTENT_ROOT = join(DOC_ROOT, "src", "content", "docs");

/**
 * The exclusively-owned generated tree.
 *
 * Matches led-lamp's `join(CONTENT_ROOT, "components")` exactly. Nothing
 * outside this directory is ever written, and everything inside it is
 * regenerated from evidence — `core/emit.ts` treats any unmarked `.mdx`
 * under the owned root as a fatal `PATH_CONTAINMENT`.
 */
export const GENERATED_ROOT = join(CONTENT_ROOT, "components");

/** Committed, deterministic publication preflight report. */
export const PREFLIGHT_FILE = join(DOC_ROOT, "component-docs", "preflight.json");

/**
 * The built site. Not written by this feature — it is the artifact the
 * publication-safety scan reads, because everything between the view model and
 * these bytes (MDX compiler, HTML minifier, search indexer, llms.txt writer) is
 * owned by the site framework rather than by this generator.
 */
export const DIST_ROOT = join(DOC_ROOT, "dist");

/**
 * The KiCad footprint library, and the 3D-model directory that does not exist
 * yet.
 *
 * `FOOTPRINT_MASTER_ROOT` is the authoring copy — every `.kicad_mod` here is
 * expected to be byte-identical to its `FOOTPRINT_ROOT` copy;
 * `footprint-previews/parity.ts` `assertFootprintLibraryParity()` is what
 * enforces that rather than assuming it.
 *
 * `FOOTPRINT_ROOT` is the library `fp-lib-table` registers as `zudo-pd`
 * (`${KIPRJMOD}/footprints/kicad/zudo-power.pretty`) — the name is a leftover
 * from an earlier project name and is load-bearing, so it is spelled out here
 * rather than derived from the repository name.
 *
 * `MODEL_ROOT` is where reviewed `.wrl`/`.step` pairs WILL live. Today the
 * directory does not exist: every footprint either has no `(model …)` line at
 * all or points at `${EASYEDA2KICAD}` / a stale `tmp/` path, none of which
 * resolves to a committed asset. `readPackage()` treats that as an unresolved
 * model with a stated reason rather than as a failure — see `references.ts`.
 */
export const FOOTPRINT_MASTER_ROOT = join(REPO_ROOT, "footprints", "kicad");
export const FOOTPRINT_ROOT = join(FOOTPRINT_MASTER_ROOT, "zudo-power.pretty");
export const MODEL_ROOT = join(REPO_ROOT, "footprints", "kicad", "zudo-pd.3dshapes");

/** Per-record bundle files, in the order a record page consumes them. */
export const BUNDLE_FILES = [
  "manifest.json",
  "sources.json",
  "facts.json",
  "coverage.json",
  "routing.json",
  "interactions.json",
  "pin-map.json",
] as const;

export type BundleFile = (typeof BUNDLE_FILES)[number];
