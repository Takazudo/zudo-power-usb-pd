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
 * Re-rooted one level down from led-lamp's `join(CONTENT_ROOT, "components")`:
 * `doc/src/content/docs/components/` already holds 17 hand-written pages
 * (including `index.mdx`), and `core/emit.ts` treats any unmarked `.mdx`
 * under the owned root as a fatal `PATH_CONTAINMENT`. Nothing outside this
 * directory is ever written, and everything inside it is regenerated from
 * evidence.
 */
export const GENERATED_ROOT = join(CONTENT_ROOT, "components", "records");

/** Committed, deterministic publication preflight report. */
export const PREFLIGHT_FILE = join(DOC_ROOT, "component-docs", "preflight.json");

/**
 * The built site. Not written by this feature — it is the artifact the
 * publication-safety scan reads, because everything between the view model and
 * these bytes (MDX compiler, HTML minifier, search indexer, llms.txt writer) is
 * owned by the site framework rather than by this generator.
 */
export const DIST_ROOT = join(DOC_ROOT, "dist");

// No `FOOTPRINT_MASTER_ROOT` / `FOOTPRINT_ROOT` / `MODEL_ROOT`: those back
// led-lamp's footprint-preview / 3D-model feature (`references.ts`,
// `model-assets.ts`), which is not ported. zudo-pd has no 3D assets at all —
// `find` for `*.3dshapes` / `*.wrl` / `*.step` returns nothing.

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
