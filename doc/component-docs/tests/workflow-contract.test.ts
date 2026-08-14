import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, it } from "node:test";

import { REPO_ROOT } from "../adapters/circuit/paths.ts";

/**
 * Static checks over the three workflow files that guard the doc/ site and
 * the component evidence it is built from:
 *
 *   - pr-checks.yml              PR-time doc build (S9, #147) — the gap this
 *                                 epic left open until this issue.
 *   - main-deploy.yml            push-to-main build + guarded Cloudflare
 *                                 deploy.
 *   - component-spec-skills.yml  offline board/schematic validation (job
 *                                 "validate") + the doc-engine test suite
 *                                 (job "doc-tests").
 *
 * This is a REWORK of the led-lamp reference version, not a port: that
 * project has exactly two workflows (pr-checks.yml, main-deploy.yml) with a
 * symmetric path-filter shape and shares REQUIRED_CHECKS across both.
 * zudo-pd has a third workflow with a different job split, main-deploy.yml
 * has no `paths:` filter at all (it deploys on every push to main and gates
 * the *publish* on secrets, not the *build* on changed paths — see its
 * header comment), and each workflow runs a deliberately different subset of
 * pnpm scripts (main-deploy.yml does not run test:model-viewer:browser,
 * unlike its led-lamp counterpart). So the required-check set is per-file
 * here, and the path-filter assertions only apply to the two workflows that
 * declare one.
 *
 * These are cheap, static, YAML-agnostic checks (line-oriented regex, no
 * `yaml` dependency) — they cannot prove a workflow actually runs green on
 * GitHub Actions, only that the file says what this codebase's contract
 * requires it to say.
 */

const REQUIRED_CHECKS: Record<string, readonly string[]> = {
  "pr-checks.yml": [
    "pnpm check",
    "pnpm test:components",
    "pnpm check:footprint-previews",
    "pnpm check:models",
    "pnpm build",
    "pnpm check:built-component-references",
    "pnpm test:model-viewer:browser",
    "pnpm check:components",
    "pnpm scan:components",
  ],
  "main-deploy.yml": [
    "pnpm check",
    "pnpm check:footprint-previews",
    "pnpm check:models",
    "pnpm build",
    "pnpm check:built-component-references",
    "pnpm check:components",
    "pnpm scan:components",
  ],
  "component-spec-skills.yml": [
    "pnpm test:components",
    "pnpm check:footprint-previews",
    "pnpm check:models",
  ],
};

// Only the workflows that declare a `paths:` trigger filter are checked
// against it. main-deploy.yml deliberately has none (see its header
// comment) — it is not a gap this test should paper over.
const REQUIRED_PATHS: Record<string, readonly string[]> = {
  "pr-checks.yml": [
    "doc/**",
    ".claude/skills/**",
    "footprints/**/*.kicad_mod",
    "footprints/**/*.wrl",
    "footprints/**/*.step",
    "CLAUDE.md",
  ],
  "component-spec-skills.yml": [
    "CLAUDE.md",
    ".claude/skills/**",
    "footprints/**/*.kicad_mod",
    "footprints/**/*.wrl",
    "footprints/**/*.step",
    "doc/**",
  ],
};

// The generated tree + preflight index every workflow that builds the site
// must prove committed-and-up-to-date, plus the preview-asset tree that
// check:footprint-previews / check:models hash but do not themselves diff
// against git.
const DRIFT_GATED_PATHS = [
  "doc/src/content/docs",
  "doc/component-docs/preflight.json",
  "doc/public/assets/component-previews",
];
const WORKFLOWS_WITH_DRIFT_GATE = ["pr-checks.yml", "main-deploy.yml"] as const;

describe("workflow contract", () => {
  it("doc/package.json defines every pnpm script every workflow runs", async () => {
    const packageJson = JSON.parse(
      await readFile(join(REPO_ROOT, "doc", "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    const scripts = new Set(Object.keys(packageJson.scripts ?? {}));
    assert.ok(scripts.size > 0, "doc/package.json has no scripts");

    for (const workflowName of Object.keys(REQUIRED_CHECKS)) {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      for (const pnpmInvocation of extractPnpmInvocations(source)) {
        assert.ok(
          scripts.has(pnpmInvocation),
          `${workflowName} runs "pnpm ${pnpmInvocation}", which is not a script in doc/package.json`,
        );
      }
    }
  });

  it("doc/package.json pins packageManager to the pnpm version CI installs", async () => {
    const packageJson = JSON.parse(
      await readFile(join(REPO_ROOT, "doc", "package.json"), "utf8"),
    ) as { packageManager?: string };
    assert.ok(packageJson.packageManager, "doc/package.json has no packageManager field");

    for (const workflowName of ["main-deploy.yml", "component-spec-skills.yml", "pr-checks.yml"]) {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      const pinned = /pnpm\/action-setup@[0-9a-f]+\s*#[^\n]*\n\s*with:\s*\n\s*version:\s*([0-9.]+)/u.exec(
        source,
      );
      if (pinned === null) continue; // component-spec-skills.yml's "validate" job has no pnpm step
      assert.equal(
        `pnpm@${pinned[1]}`,
        packageJson.packageManager,
        `${workflowName} pins pnpm ${pinned[1]}, which does not match doc/package.json's packageManager`,
      );
    }
  });

  for (const [workflowName, required] of Object.entries(REQUIRED_CHECKS)) {
    it(`${workflowName} runs every required production guard`, async () => {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      for (const command of required) {
        assert.ok(
          commandIsWired(source, command),
          `${workflowName} does not run "${command}"`,
        );
      }
    });
  }

  for (const [workflowName, required] of Object.entries(REQUIRED_PATHS)) {
    it(`${workflowName} selects every source its build depends on`, async () => {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      const paths = extractWorkflowPaths(source);
      for (const pattern of required) {
        assert.ok(paths.includes(pattern), `${workflowName} is missing path filter ${pattern}`);
      }
    });
  }

  it("a footprint or model geometry edit selects both check:footprint-previews and check:models gates", async () => {
    for (const workflowName of Object.keys(REQUIRED_PATHS)) {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      const paths = extractWorkflowPaths(source);

      for (const [changedPath, expectedCheck] of [
        ["footprints/kicad/C1206.kicad_mod", "pnpm check:footprint-previews"],
        [
          "footprints/kicad/zudo-pd.3dshapes/CAP-SMD_BD10.0-L10.4-W10.4-LS11.2-FD.wrl",
          "pnpm check:models",
        ],
        [
          "footprints/kicad/zudo-pd.3dshapes/CAP-SMD_BD10.0-L10.4-W10.4-LS11.2-FD.step",
          "pnpm check:models",
        ],
      ] as const) {
        assert.ok(
          paths.some((pattern) => matchesPathFilter(pattern, changedPath)),
          `${workflowName} does not select source-only change ${changedPath}`,
        );
        assert.ok(
          commandIsWired(source, expectedCheck),
          `${workflowName} does not run ${expectedCheck}`,
        );
      }
    }
  });

  for (const workflowName of WORKFLOWS_WITH_DRIFT_GATE) {
    it(`${workflowName} drift-gates every committed generated path`, async () => {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      // The gate is a `git diff --exit-code -- <paths>` line preceded by a
      // matching `git add --intent-to-add -A -- <paths>` — assert both carry
      // every path, not just that the paths appear somewhere in the file.
      const addLine = /git add --intent-to-add -A -- ([^\n]+)/u.exec(source);
      const diffLine = /git diff --exit-code -- ([^\n]+)/u.exec(source);
      assert.ok(addLine, `${workflowName} has no --intent-to-add drift-gate step`);
      assert.ok(diffLine, `${workflowName} has no git diff --exit-code drift-gate step`);
      for (const path of DRIFT_GATED_PATHS) {
        assert.ok(
          addLine![1]!.includes(path),
          `${workflowName}'s --intent-to-add line is missing ${path}`,
        );
        assert.ok(
          diffLine![1]!.includes(path),
          `${workflowName}'s git diff line is missing ${path}`,
        );
      }
    });
  }

  it("every setup-python step across all three workflows agrees on the Python version", async () => {
    // Every occurrence in every file, not one-per-file: component-spec-skills.yml
    // alone has two (the "validate" and "doc-tests" jobs), and collapsing them
    // would hide a divergence between those two jobs as easily as one between
    // files.
    const occurrences: string[] = [];
    for (const workflowName of ["main-deploy.yml", "component-spec-skills.yml", "pr-checks.yml"]) {
      const source = await readFile(
        join(REPO_ROOT, ".github", "workflows", workflowName),
        "utf8",
      );
      for (const match of source.matchAll(/python-version:\s*'?([0-9.]+)'?/gu)) {
        occurrences.push(`${workflowName}:${match[1]}`);
      }
    }
    assert.ok(occurrences.length > 0, "no setup-python step found in any workflow");
    const distinct = new Set(occurrences.map((entry) => entry.split(":")[1]));
    assert.equal(
      distinct.size,
      1,
      `workflows disagree on Python version: ${JSON.stringify(occurrences)}`,
    );
  });
});

/** True if `command` appears wired on a non-comment line of `source`. */
function commandIsWired(source: string, command: string): boolean {
  return source.split(/\r?\n/u).some((line) => {
    const trimmed = line.trim();
    return !trimmed.startsWith("#") && trimmed.includes(command);
  });
}

// pnpm's own built-in subcommands, not package.json scripts — `pnpm install`
// appears in every "Install dependencies" step.
const PNPM_BUILTINS = new Set(["install", "add", "remove", "exec", "dlx", "run"]);

/** Every top-level `pnpm <script>` word this workflow invokes via `run:`. */
function extractPnpmInvocations(source: string): string[] {
  const invocations: string[] = [];
  for (const match of source.matchAll(/(?<!\S)pnpm (?:run )?([\w:-]+)/gu)) {
    const word = match[1]!;
    if (!PNPM_BUILTINS.has(word)) invocations.push(word);
  }
  return invocations;
}

function extractWorkflowPaths(source: string): string[] {
  const lines = source.split(/\r?\n/u);
  const paths: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^ {4}paths:\s*$/u.test(lines[index] ?? "")) continue;
    for (let next = index + 1; next < lines.length; next += 1) {
      const line = lines[next] ?? "";
      if (/^ {0,4}\S/u.test(line)) break;
      const match = /^ {6}-\s+["']?([^"'#]+?)["']?\s*$/u.exec(line);
      if (match?.[1] !== undefined) paths.push(match[1].trim());
    }
  }
  assert.ok(paths.length > 0, "workflow has no parsed path filters");
  return paths;
}

function matchesPathFilter(pattern: string, path: string): boolean {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      if (pattern[index + 2] === "/") {
        expression += "(?:.*/)?";
        index += 2;
      } else {
        expression += ".*";
        index += 1;
      }
    } else if (character === "*") {
      expression += "[^/]*";
    } else {
      expression += escapeRegExp(character ?? "");
    }
  }
  return new RegExp(`${expression}$`, "u").test(path);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
