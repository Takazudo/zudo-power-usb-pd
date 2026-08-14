/**
 * The seam between the provider-neutral core and a concrete evidence provider.
 *
 * The core never imports a provider module, never spawns a process, never
 * mentions Python or `.claude`, and never touches a provider file path. It
 * receives a `ComponentDataAdapter` and calls it. Swapping providers means
 * writing one new adapter — nothing under `core/` changes.
 */

import type { PublicationMatrix, InstanceSelection } from "./publication.ts";
import type { PublicViewModel, ViewModelVersion } from "./view-model.ts";

/** Outcome of the provider's own canonical validator. */
export type ValidationOutcome = {
  readonly ok: boolean;
  /** Command line as executed, for the failure message. Never a shell string. */
  readonly command: readonly string[];
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
};

/**
 * A callback, not a command string. The core does not know what a validator is
 * made of — only that it can be run and can fail.
 */
export type ValidationRunner = () => Promise<ValidationOutcome>;

export type ComponentDataAdapter = {
  /** Stable provider id, surfaced in the preflight report. */
  readonly id: string;
  /** The provider's own frozen-contract version. */
  readonly contractVersion: number;
  /**
   * View-model versions this adapter can produce. The pipeline refuses to run
   * when the core's `VIEW_MODEL_VERSION` is absent from this list, so a
   * core/adapter mismatch is a startup error rather than a subtly wrong page.
   */
  readonly supportedViewModelVersions: readonly ViewModelVersion[];

  /** The provider's canonical validator. Nonzero exit is fatal. */
  readonly validate: ValidationRunner;

  /** The committed instance allowlist for this provider. */
  readonly selection: InstanceSelection;
  /** The committed per-field decisions for this provider. */
  readonly matrix: PublicationMatrix;

  /**
   * Read provider data and project it into the public view model.
   * Called only after `validate()` succeeded and the selection proved fresh.
   */
  readonly project: (context: ProjectionContext) => Promise<PublicViewModel>;
};

export type ProjectionContext = {
  /** Applies the instance and field gates; also accumulates the preflight report. */
  readonly policy: import("./publication.ts").PublicationPolicy;
};
