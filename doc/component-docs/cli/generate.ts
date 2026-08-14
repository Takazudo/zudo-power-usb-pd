/**
 * `pnpm generate:components`
 *
 * Runs BEFORE `zfb build` (see the `build` script), so the content snapshot the
 * site takes already contains this output. That ordering is a package-script
 * dependency, not an internal build-stage assumption — see
 * `doc/component-docs/ARCHITECTURE.md`.
 *
 * `--watch` regenerates on evidence changes for `pnpm dev`.
 */

import { reportFailure, runOnce, summarize, writeReport } from "./run.ts";
import { watchAndRegenerate } from "./watch.ts";

async function main(): Promise<void> {
  if (process.argv.includes("--watch")) {
    await watchAndRegenerate();
    return;
  }

  const result = await runOnce("generate");
  await writeReport(result.report);

  const emitted = result.emitted;
  process.stdout.write(`${summarize(result.report)}\n`);
  if (emitted) {
    process.stdout.write(
      `pages           ${emitted.written.length} written, ${emitted.unchanged.length} unchanged, ${emitted.removed.length} removed\n`,
    );
    for (const path of emitted.written) process.stdout.write(`  + ${path}\n`);
    for (const path of emitted.removed) process.stdout.write(`  - ${path}\n`);
  }
}

try {
  await main();
} catch (error) {
  reportFailure(error);
}
