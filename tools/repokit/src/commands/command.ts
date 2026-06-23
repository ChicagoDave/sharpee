/**
 * command.ts — the repokit command contract (ADR-187).
 *
 * Every repokit command is its own class implementing this interface, in its
 * own file (one class per file). That makes each command a self-contained,
 * portable unit: promoting a hardened command from repokit → devkit is copying
 * a single class file (with audience-specific tweaks), not disentangling it
 * from a monolith. `cli.ts` is a thin dispatcher over a registry of these.
 *
 * Public interface: Command.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */

/** A single repokit subcommand. One class per file implements this. */
export interface Command {
  /** Subcommand name as typed on the CLI, e.g. "build", "test:npm". */
  readonly name: string;

  /** One-line summary shown in the usage listing. */
  readonly summary: string;

  /**
   * Execute the command.
   *
   * @param args - argv tokens following the subcommand name.
   * @returns the process exit code (0 = success); may be async.
   */
  run(args: string[]): Promise<number> | number;
}
