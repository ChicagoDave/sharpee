/**
 * game-load-request.ts — what a runner tells its loader about the game it is
 * about to boot (engine-test-performance plan, Phase 3).
 *
 * Purpose: the engine takes an undo snapshot — the whole world serialized —
 * before every turn, so that a later `undo` can go back. A test runner knows
 * every command a game will run before it boots that game, so it knows
 * whether any of them can ask for undo. The loader is told, and boots an
 * engine that keeps no snapshots when none can. An engine that can still be
 * asked to `undo` keeps them, so the command behaves as it does in play.
 *
 * Invariant: `undo` is false only when the runner has read every command the
 * game will be given and none of them is the undo command.
 *
 * Public interface: `GameLoadRequest`, `typesUndo`.
 * Owner context: @sharpee/branch-tester — shared by the tree walker, the
 *   derived runner and the claims walk. Browser-safe: no runtime imports.
 */

/** What the runner knows about the game it asks its loader to boot. */
export interface GameLoadRequest {
  /**
   * Whether a command this game will run can ask for undo. False lets the
   * loader boot an engine that takes no undo snapshots.
   */
  readonly undo: boolean;
}

/**
 * Whether any of these commands can ask for undo. The standard grammar has
 * one pattern for it, the word `undo` alone, but the engine splits a typed
 * line into several turns (`take crate. undo`, `take crate then undo`), so
 * the word counts wherever it stands in the line. That also counts lines
 * that only mention it (`ask clerk about undo`), which errs toward keeping
 * the snapshots.
 *
 * Known limit: a story that gives the undoing action a word of its own
 * (`extend action undoing`) is not seen here, since the runners hold the
 * commands and not the story's grammar. See GH #690.
 *
 * @param commands every command the game will be given, in any order
 * @returns true when at least one contains the word `undo`
 */
export function typesUndo(commands: ReadonlyArray<string | undefined>): boolean {
  return commands.some((command) => command !== undefined && /\bundo\b/i.test(command));
}
