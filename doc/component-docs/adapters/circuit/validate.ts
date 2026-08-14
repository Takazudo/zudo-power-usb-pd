/**
 * The canonical validator, run as a subprocess.
 *
 * This is the ONLY validation of component evidence. Nothing in TypeScript
 * re-implements any part of the frozen contract — a weaker second validator
 * that disagreed with the Python one would be worse than none, because the
 * projection would look validated while enforcing different rules.
 *
 * Invocation rules:
 *   - argument ARRAY, never a shell string: no quoting, no interpolation, no
 *     `shell: true`;
 *   - cwd is the repository root (the validator resolves its own paths from
 *     `__file__`, so this is belt-and-braces, not a requirement);
 *   - `--online` is never passed: generation must work with no network, and
 *     the online mode mutates retained evidence.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ValidationOutcome, ValidationRunner } from "../../core/adapter.ts";
import { REPO_ROOT, VALIDATOR_SCRIPT } from "./paths.ts";

const execFileAsync = promisify(execFile);

/**
 * Minimum interpreter. 3.12 is what `component-spec-skills.yml` pins via
 * `actions/setup-python`, and what the validator is exercised against; the
 * generator refuses to run on anything older so a local pass cannot disagree
 * with CI.
 */
export const REQUIRED_PYTHON = { major: 3, minor: 12 } as const;

export type PythonValidatorOptions = {
  readonly pythonBin?: string;
  readonly scriptPath?: string;
  readonly cwd?: string;
};

export function createPythonValidator(options: PythonValidatorOptions = {}): ValidationRunner {
  const pythonBin = options.pythonBin ?? process.env.COMPONENT_DOCS_PYTHON ?? "python3";
  const scriptPath = options.scriptPath ?? VALIDATOR_SCRIPT;
  const cwd = options.cwd ?? REPO_ROOT;

  return async (): Promise<ValidationOutcome> => {
    const versionCheck = await assertPythonVersion(pythonBin, cwd);
    if (versionCheck) return versionCheck;

    const command = [pythonBin, scriptPath];
    try {
      const { stdout, stderr } = await execFileAsync(pythonBin, [scriptPath], {
        cwd,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return { ok: true, command, exitCode: 0, stdout, stderr };
    } catch (error) {
      const failure = error as NodeJS.ErrnoException & {
        code?: number | string;
        stdout?: string;
        stderr?: string;
      };
      return {
        ok: false,
        command,
        exitCode: typeof failure.code === "number" ? failure.code : 1,
        stdout: failure.stdout ?? "",
        stderr: failure.stderr ?? String(failure.message ?? failure),
      };
    }
  };
}

/** Returns a failed outcome when the interpreter is missing or too old, else `null`. */
async function assertPythonVersion(
  pythonBin: string,
  cwd: string,
): Promise<ValidationOutcome | null> {
  const command = [pythonBin, "--version"];
  let stdout = "";
  let stderr = "";
  try {
    const result = await execFileAsync(pythonBin, ["--version"], { cwd, windowsHide: true });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (error) {
    return {
      ok: false,
      command,
      exitCode: 127,
      stdout: "",
      stderr: `cannot run ${pythonBin}: ${(error as Error).message}`,
    };
  }

  // Python 2 printed the version to stderr; accept either stream.
  const match = /Python (\d+)\.(\d+)/u.exec(`${stdout}${stderr}`);
  if (!match) {
    return { ok: false, command, exitCode: 1, stdout, stderr: `unrecognised: ${stdout}${stderr}` };
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const tooOld =
    major < REQUIRED_PYTHON.major ||
    (major === REQUIRED_PYTHON.major && minor < REQUIRED_PYTHON.minor);

  if (tooOld) {
    return {
      ok: false,
      command,
      exitCode: 1,
      stdout,
      stderr:
        `${pythonBin} is ${major}.${minor}; component evidence requires ` +
        `>= ${REQUIRED_PYTHON.major}.${REQUIRED_PYTHON.minor} (set COMPONENT_DOCS_PYTHON to override the interpreter)`,
    };
  }

  return null;
}
