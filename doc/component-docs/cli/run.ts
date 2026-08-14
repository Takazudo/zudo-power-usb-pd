/**
 * Shared entrypoint body for `generate:components` and `check:components`.
 *
 * Both scripts run the SAME pipeline; `check` only refuses to write. Keeping
 * one body is the point — a check that exercised a different path could pass
 * while the real generator produced something else.
 */

import { writeFile } from "node:fs/promises";

import { ComponentDocsError } from "../core/errors.ts";
import { runPipeline, type PipelineResult } from "../core/pipeline.ts";
import { createCircuitAdapter } from "../adapters/circuit/index.ts";
import { GENERATED_ROOT, PREFLIGHT_FILE } from "../adapters/circuit/paths.ts";
import type { PreflightReport } from "../core/publication.ts";

export type RunMode = "generate" | "check";

export async function runOnce(mode: RunMode): Promise<PipelineResult> {
  return runPipeline(createCircuitAdapter(), {
    generatedRoot: GENERATED_ROOT,
    dryRun: mode === "check",
  });
}

/** Deterministic: sorted, no timestamps, trailing newline, so it can be diffed. */
export function serializeReport(report: PreflightReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export async function writeReport(report: PreflightReport): Promise<void> {
  await writeFile(PREFLIGHT_FILE, serializeReport(report), "utf8");
}

export function summarize(report: PreflightReport): string {
  const denied = report.fields.filter((field) => field.decision === "DENY");
  const withheld = denied.reduce((sum, field) => sum + field.withheld, 0);
  const allowedUrls = report.urls.filter((entry) => entry.decision === "ALLOW").length;

  return [
    `provider        ${report.provider.id} (contract v${report.provider.contractVersion})`,
    `view model      v${report.viewModelVersion}`,
    `records         ${report.records.selected} selected of ${report.records.available} available`,
    `sources         ${report.sources.selected} selected of ${report.sources.available} available, ${report.sources.linkable} linkable`,
    `fields          ${report.fields.length - denied.length} publish, ${denied.length} deny (${withheld} values withheld)`,
    `urls            ${allowedUrls} allowed of ${report.urls.length} considered`,
    ...Object.entries(report.counts).map(([key, value]) => `${key.padEnd(15)} ${value}`),
  ].join("\n");
}

/** Turn a pipeline failure into a short, actionable message and exit code 1. */
export function reportFailure(error: unknown): never {
  if (error instanceof ComponentDocsError) {
    process.stderr.write(`${error.message}\n`);
    for (const [key, value] of Object.entries(error.detail)) {
      const rendered = Array.isArray(value) ? value.join(", ") : String(value);
      process.stderr.write(`  ${key}: ${rendered}\n`);
    }
  } else {
    process.stderr.write(`${(error as Error).stack ?? String(error)}\n`);
  }
  process.exit(1);
}
