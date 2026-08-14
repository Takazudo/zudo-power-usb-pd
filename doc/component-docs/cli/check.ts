/**
 * `pnpm check:components`
 *
 * Fails when the committed generated tree or the committed preflight report
 * differs from what a fresh run would produce. This is the local mirror of
 * CI's `git diff --exit-code -- doc/src/content/docs`, and it additionally
 * covers `doc/component-docs/preflight.json`, which that CI step does not see.
 *
 * It writes nothing, so it is safe to run on a dirty tree.
 */

import { readFile } from "node:fs/promises";

import { fail } from "../core/errors.ts";
import { reportFailure, runOnce, serializeReport, summarize } from "./run.ts";
import { PREFLIGHT_FILE } from "../adapters/circuit/paths.ts";

async function main(): Promise<void> {
  const result = await runOnce("check");
  const drift = [...result.drift];

  const expected = serializeReport(result.report);
  const actual = await readFile(PREFLIGHT_FILE, "utf8").catch(() => null);
  if (actual === null) drift.push("missing: component-docs/preflight.json");
  else if (actual !== expected) drift.push("changed: component-docs/preflight.json");

  process.stdout.write(`${summarize(result.report)}\n\n`);

  if (drift.length > 0) {
    fail("GENERATED_DRIFT", "generated output is out of date; run `pnpm generate:components`", {
      drift,
    });
  }

  process.stdout.write("generated output is up to date\n");
}

try {
  await main();
} catch (error) {
  reportFailure(error);
}
