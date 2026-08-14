import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

import { createScheduler } from "../cli/watch.ts";

describe("createScheduler", () => {
  it("collapses a burst of triggers into one run", async () => {
    let runs = 0;
    const scheduler = createScheduler(async () => {
      runs += 1;
    }, 20);

    for (let index = 0; index < 25; index += 1) scheduler.trigger();
    await delay(80);
    await scheduler.idle();

    assert.equal(runs, 1);
    scheduler.stop();
  });

  it("never runs two generations concurrently", async () => {
    let inFlight = 0;
    let maxInFlight = 0;
    const scheduler = createScheduler(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await delay(30);
      inFlight -= 1;
    }, 5);

    scheduler.trigger();
    await delay(15);
    scheduler.trigger();
    await delay(15);
    scheduler.trigger();
    await delay(200);
    await scheduler.idle();

    assert.equal(maxInFlight, 1);
    scheduler.stop();
  });

  it("runs exactly once more when triggers arrive mid-run", async () => {
    let runs = 0;
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const scheduler = createScheduler(async () => {
      runs += 1;
      if (runs === 1) await gate;
    }, 5);

    scheduler.trigger();
    await delay(30);
    assert.equal(runs, 1);

    scheduler.trigger();
    scheduler.trigger();
    scheduler.trigger();
    await delay(30);
    release();
    await delay(60);
    await scheduler.idle();

    assert.equal(runs, 2);
    scheduler.stop();
  });

  it("ignores triggers after stop", async () => {
    let runs = 0;
    const scheduler = createScheduler(async () => {
      runs += 1;
    }, 5);

    scheduler.stop();
    scheduler.trigger();
    await delay(40);

    assert.equal(runs, 0);
  });

  it("keeps running after a failing task and reports the failure", async () => {
    let runs = 0;
    const errors: unknown[] = [];
    const scheduler = createScheduler(
      async () => {
        runs += 1;
        if (runs === 1) throw new Error("boom");
      },
      5,
      (error) => errors.push(error),
    );

    scheduler.trigger();
    await delay(40);
    scheduler.trigger();
    await delay(40);
    await scheduler.idle();

    assert.equal(runs, 2);
    assert.equal(errors.length, 1);
    scheduler.stop();
  });
});
