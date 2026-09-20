/**
 * outline.ts — the tree read as a manifest of lines, grouped at its fork
 * points (ADR-353 D1's companion: the pane visits one line, so it needs a way
 * to choose one).
 *
 * Purpose: a derivation from the tree document alone — no engine, no replay,
 * no run. `secret-letter` measures 61 lines behind 53 sibling chips; grouped
 * at their fork points the same tree is 19 headings with a median of two
 * lines each.
 *
 * NAMING A LINE is the hard part, and two obvious answers are both wrong on
 * real data. Its FIRST command names nothing: only 31 of 60 branches differ
 * from a sibling there, and one fork has nine siblings all starting `se`. The
 * command where it first DIVERGES from its siblings is accurate and often
 * useless — branch 2 of the `d` fork is `se › wait ×7`, and the first command
 * no sibling shares is its seventh wait, so it comes out named "wait".
 *
 * So a line is named by the command its siblings are least likely to have:
 * the rarest command it contains, latest occurrence winning because later is
 * more specific. That yields `attack mercenaries` and `kick mercenaries` for
 * the two branches that are otherwise identical for seven commands. When even
 * the rarest command is shared by more than a third of its siblings the line
 * has nothing distinctive in it, and rather than print a filler word the
 * manifest describes its SHAPE instead — `se › wait ×7`. Measured over
 * `secret-letter`: 52 of 60 lines get a distinctive command, 8 get a shape.
 *
 * DESTINATIONS are reported only where a line asserts one. An earlier version
 * inherited the fork's location and marked it; that still printed `Alley`
 * against branches that plainly walk away from Alley, and a wrong room with a
 * marker on it is a wrong room. 25 of 60 branches assert no location, and for
 * those the manifest says nothing — which is also the authoring finding.
 *
 * Public interface: OutlineLine, OutlineFork, Outline, outlineOf().
 * Owner context: tools/ide — the testing play surface's web bundle.
 */

import type { TreeCard, TreeDocument } from '@sharpee/branch-tester/tree-document';

/** How a line's name was arrived at. */
export type OutlineNameKind =
  /** A command few or none of its siblings contain. */
  | 'distinctive'
  /** Nothing in it is rare, so the name describes its shape instead. */
  | 'shape'
  /** The line has no turns yet. */
  | 'empty';

/** One line of the tree as the manifest names it. */
export interface OutlineLine {
  /** The branch id; `0` for the main line. */
  lineId: number;
  /** What this line is, in as few words as the tree allows. */
  name: string;
  nameKind: OutlineNameKind;
  /** The line's own first typed command, absent when it has no turns yet. */
  start?: string;
  /** Its own last typed command. */
  end?: string;
  /**
   * Where it ends — present ONLY when the line itself asserts a location.
   * Absent means the tests never say, never that the line stayed put.
   */
  destination?: string;
  /** How many turn cards the line owns. */
  turns: number;
}

/** One card that carries branches, with the lines hanging off it. */
export interface OutlineFork {
  /** How many forks deep this card sits; the main line's own forks are 0. */
  depth: number;
  /** The command on the card the branches fork from. */
  command?: string;
  /** The location in force at that card, asserted or carried down the path. */
  location?: string;
  /** Whether that location was asserted at the fork card itself. */
  locationAsserted: boolean;
  lines: OutlineLine[];
}

/** The whole manifest. */
export interface Outline {
  root: OutlineLine;
  forks: OutlineFork[];
  /** Lines in the tree, the root included. */
  lineCount: number;
}

/** `player.location = Northwest Junction` → `Northwest Junction`. */
const PLAYER_LOCATION = /^\s*player\.location\s*=\s*(.+?)\s*$/;

/** A command is distinctive when at most this share of siblings contain it. */
const DISTINCTIVE_SHARE = 1 / 3;

/** How many runs a shape summary shows before it elides. */
const SHAPE_RUNS = 5;

/** The location a card asserts for the player, if it asserts one. */
function assertedLocation(card: TreeCard): string | undefined {
  for (const state of card.assertions?.states ?? []) {
    const match = PLAYER_LOCATION.exec(state);
    if (match) return match[1];
  }
  return undefined;
}

/** A line's own turn cards, in play order. */
function turnsOf(cards: readonly TreeCard[]): TreeCard[] {
  return cards.filter((card) => card.type === 'turn');
}

/** `se wait wait wait` → `se › wait ×3`, elided past {@link SHAPE_RUNS}. */
function shapeOf(commands: readonly string[]): string {
  const runs: string[] = [];
  for (let i = 0; i < commands.length; ) {
    let j = i;
    while (j < commands.length && commands[j] === commands[i]) j += 1;
    runs.push(j - i === 1 ? commands[i] : `${commands[i]} ×${j - i}`);
    i = j;
  }
  return runs.slice(0, SHAPE_RUNS).join(' › ') + (runs.length > SHAPE_RUNS ? ' …' : '');
}

/**
 * Name a line against its siblings.
 *
 * @param own      this line's commands in order
 * @param siblings every other line's commands at the same fork
 * @returns the name and how it was arrived at
 */
function nameOf(
  own: readonly string[],
  siblings: readonly (readonly string[])[],
): { name: string; nameKind: OutlineNameKind } {
  if (own.length === 0) return { name: '(no turns yet)', nameKind: 'empty' };
  if (siblings.length === 0) return { name: own[0], nameKind: 'distinctive' };

  const share = new Map<string, number>();
  for (const command of new Set(own)) {
    share.set(command, siblings.filter((sibling) => sibling.includes(command)).length);
  }
  const rarest = Math.min(...share.values());
  if (rarest <= siblings.length * DISTINCTIVE_SHARE) {
    // Latest wins: a distinctive command late in the line describes it more
    // sharply than the same rarity early, where siblings are still together.
    const candidates = own.filter((command) => share.get(command) === rarest);
    return { name: candidates[candidates.length - 1], nameKind: 'distinctive' };
  }
  return { name: shapeOf(own), nameKind: 'shape' };
}

/**
 * Read one line's manifest row from its cards.
 *
 * @param cards    the line's own cards (not its prefix)
 * @param lineId   the branch id, or 0 for the main line
 * @param siblings every other line at the same fork, as command lists
 */
function lineOf(
  cards: readonly TreeCard[],
  lineId: number,
  siblings: readonly (readonly string[])[],
): OutlineLine {
  const turns = turnsOf(cards);
  const commands = turns.map((turn) => turn.command ?? '');

  let destination: string | undefined;
  for (const card of turns) {
    const here = assertedLocation(card);
    if (here !== undefined) destination = here;
  }

  const { name, nameKind } = nameOf(commands, siblings);
  const line: OutlineLine = { lineId, name, nameKind, turns: turns.length };
  if (turns.length > 0) {
    line.start = commands[0];
    line.end = commands[commands.length - 1];
  }
  if (destination !== undefined) line.destination = destination;
  return line;
}

/**
 * Derive the manifest from a tree document.
 *
 * @param doc the document, exactly as the model serializes it
 * @returns the root line and every fork point, in document order
 */
export function outlineOf(doc: TreeDocument): Outline {
  const forks: OutlineFork[] = [];

  const walk = (cards: readonly TreeCard[], depth: number, entering?: string): void => {
    let here = entering;
    for (const card of cards) {
      const asserted = assertedLocation(card);
      if (asserted !== undefined) here = asserted;
      const branches = card.branches ?? [];
      if (branches.length === 0) continue;

      const sequences = branches.map((branch) =>
        turnsOf(branch.cards).map((turn) => turn.command ?? ''));

      const fork: OutlineFork = {
        depth,
        locationAsserted: asserted !== undefined,
        lines: branches.map((branch, index) =>
          lineOf(branch.cards, branch.branch, sequences.filter((_, i) => i !== index))),
      };
      if (card.command !== undefined) fork.command = card.command;
      if (here !== undefined) fork.location = here;
      forks.push(fork);

      for (const branch of branches) walk(branch.cards, depth + 1, here);
    }
  };

  const root = lineOf(doc.cards, 0, []);
  walk(doc.cards, 0, undefined);

  const lineCount = 1 + forks.reduce((total, fork) => total + fork.lines.length, 0);
  return { root, forks, lineCount };
}
