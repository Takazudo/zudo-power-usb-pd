/**
 * Development regeneration for `pnpm dev`.
 *
 * Three properties matter and each is enforced here rather than assumed:
 *
 *   - SELF-OUTPUT EXCLUSION. The watcher watches `.claude/skills/` only. It
 *     never watches `doc/src/content/docs/components/`, so writing a page can
 *     never wake the watcher that wrote it. (zfb's own content watcher does
 *     see that write, which is what refreshes the browser.)
 *   - DEBOUNCE. An editor save, or a `git checkout` touching thirteen bundles,
 *     arrives as a burst of events; they collapse into one run.
 *   - SERIALIZATION. At most one generation runs at a time. Events arriving
 *     mid-run set a re-run flag instead of starting a second, overlapping
 *     writer.
 *
 * The scheduler is exported separately from the filesystem watcher so it can
 * be tested without touching the disk or waiting on real events.
 */

import { watch } from "node:fs";

import { ComponentDocsError } from "../core/errors.ts";
import { runOnce, summarize, writeReport } from "./run.ts";
import { SKILLS_ROOT } from "../adapters/circuit/paths.ts";

export const DEBOUNCE_MS = 150;

export type Scheduler = {
  /** Note that something changed; runs after the debounce window settles. */
  readonly trigger: () => void;
  /** Resolves when no run is in flight and nothing is pending. */
  readonly idle: () => Promise<void>;
  readonly stop: () => void;
};

/**
 * Debounced, serialized scheduler. `task` never runs concurrently with itself;
 * triggers that arrive during a run cause exactly one follow-up run, not one
 * per trigger.
 */
export function createScheduler(
  task: () => Promise<void>,
  debounceMs = DEBOUNCE_MS,
  onError: (error: unknown) => void = defaultOnError,
): Scheduler {
  let timer: NodeJS.Timeout | null = null;
  let running = false;
  let pending = false;
  let stopped = false;
  let idleWaiters: (() => void)[] = [];

  const settle = (): void => {
    if (running || pending || timer !== null) return;
    const waiters = idleWaiters;
    idleWaiters = [];
    for (const resolve of waiters) resolve();
  };

  const run = async (): Promise<void> => {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    try {
      await task();
    } catch (error) {
      // A watcher outlives its failures: an editor save can land mid-write and
      // leave JSON briefly unparsable. Report and wait for the next change.
      onError(error);
    } finally {
      running = false;
      if (pending && !stopped) {
        pending = false;
        void run();
      } else {
        pending = false;
        settle();
      }
    }
  };

  return {
    trigger(): void {
      if (stopped) return;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void run();
      }, debounceMs);
    },
    idle(): Promise<void> {
      return new Promise((resolve) => {
        idleWaiters.push(resolve);
        settle();
      });
    },
    stop(): void {
      stopped = true;
      if (timer !== null) clearTimeout(timer);
      timer = null;
      settle();
    },
  };
}

function defaultOnError(error: unknown): void {
  const message =
    error instanceof ComponentDocsError ? error.message : (error as Error).message;
  process.stderr.write(`[components] ${message}\n`);
}

export async function watchAndRegenerate(): Promise<void> {
  const scheduler = createScheduler(async () => {
    const result = await runOnce("generate");
    await writeReport(result.report);
    const written = result.emitted?.written.length ?? 0;
    const removed = result.emitted?.removed.length ?? 0;
    process.stdout.write(`[components] regenerated: ${written} written, ${removed} removed\n`);
  });

  const initial = await runOnce("generate");
  await writeReport(initial.report);
  process.stdout.write(`${summarize(initial.report)}\n[components] watching ${SKILLS_ROOT}\n`);

  const watcher = watch(SKILLS_ROOT, { recursive: true }, (_event, filename) => {
    if (filename && !filename.endsWith(".json")) return;
    scheduler.trigger();
  });

  const shutdown = (): void => {
    scheduler.stop();
    watcher.close();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
