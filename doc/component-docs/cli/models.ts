import { fail } from "../core/errors.ts";
import { publishModelAssets } from "../adapters/circuit/model-assets.ts";
import { reportFailure } from "./run.ts";

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--check");
  const result = await publishModelAssets(dryRun);
  process.stdout.write(
    `models          ${result.expected} selected; ${result.written.length} written, ${result.unchanged.length} unchanged\n`,
  );
  if (result.drift.length > 0) {
    fail("GENERATED_DRIFT", "published model assets are out of date; run pnpm generate:models", {
      drift: result.drift,
    });
  }
}

try {
  await main();
} catch (error) {
  reportFailure(error);
}
