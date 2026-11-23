/**
 * story-walk.ts — one breadth-first walk of a story's reachable states,
 * shared by every client that walks the forked real engine.
 *
 * Purpose: fork the real engine through its save/restore hooks and walk the
 * reachable states breadth-first, trying from each state the commands the
 * candidate generator offers, cut to a necessary set when there is one
 * (ADR-365 D2) or uncut when there is none (ADR-408 D3). Two states are one
 * state when their identities are equal: the world's snapshot (cut to the
 * set, when there is one) minus `IDENTITY_IGNORES`, plus whatever tag the
 * client adds. The walk stops when the client says it is done, or the
 * frontier or a budget runs out.
 *
 * Two clients walk it: the claims runner (`claims-walk.ts`), which tags each
 * state with the claims its path has satisfied and stops when every claim is
 * settled, and the lenses (ADR-294 D23, ADR-408 D3), which run their
 * questions in each room on its first sighting and stop when every declared
 * room has been seen.
 *
 * Invariants:
 *   - The walk never runs a command on a world it did not restore. A save or
 *     a restore the engine refuses stops the walk with a thrown error naming
 *     the node, so a state that could not be saved is never counted as
 *     walked.
 *   - A room hook may run any commands it likes. The walk restores the
 *     state the room was first seen in before it continues, and the state's
 *     snapshot, tag and identity are read before the hook runs, so nothing a
 *     hook does reaches the identity, the frontier or a client's tag.
 *   - Each room's hook fires at most once, the first time the player is seen
 *     in it, the walk's start included.
 *
 * Public interface: `walkStory`, `StoryWalkOptions`, `StoryWalkClient`,
 *   `StoryWalkReport`, `StoryWalkTurn`.
 * Owner context: @sharpee/branch-tester — the walk the claims runner and the
 *   lenses share (ADR-365 D10, ADR-408 D3).
 */

import { captureSave, restoreSave } from '@sharpee/transcript-tester';
import type { StoryIR } from '@sharpee/chord';
import type { NecessarySet } from '../claims/claim-set.js';
import { candidateCommands, deriveCommandVocabulary } from '../claims/claim-candidates.js';
import type { CandidateBreadth, WalkStopReason } from '../claims/claim-results.js';
import type { ClaimsEntity, ClaimsGame, ClaimsTurnEvent, WorldSnapshot } from '../claims/claims-game.js';
import { irIdOf, readWorldSnapshot } from '../claims/claims-game.js';
import { necessaryIdentity } from '../claims/claim-identity.js';

/** The budgets and breadth of one walk. */
export interface StoryWalkOptions {
  readonly breadth?: CandidateBreadth;
  readonly maxStates?: number;
  readonly maxSeconds?: number;
  readonly maxDepth?: number;
}

/** The walk's defaults: the explorer's budgets. */
export const STORY_WALK_DEFAULTS = { breadth: 'basic' as CandidateBreadth, maxStates: 5000, maxSeconds: 120, maxDepth: 40 };

/** One state the walk has just reached, as a client's tag reads it. */
export interface StoryWalkTurn {
  /** The commands from the walk's start to this state; empty at the start. */
  readonly path: readonly string[];
  /** The events of the turn that reached it; empty at the start. */
  readonly events: readonly ClaimsTurnEvent[];
  /** The tag of the state the turn was taken from; empty at the start. */
  readonly inheritedTag: string;
  /** The world's snapshot in this state, read once. */
  readonly snapshot: WorldSnapshot;
}

/** A room's first sighting, as a room hook receives it. */
export interface StoryWalkRoomSighting {
  /** The room the player was first seen in. */
  readonly room: ClaimsEntity;
  /** The commands that first reached it. */
  readonly path: readonly string[];
  /** Puts the world back in the state the room was first seen in. */
  readonly restore: () => Promise<void>;
}

/** What one client of the walk adds to it. Every member but `label` is optional. */
export interface StoryWalkClient {
  /** How the walk names itself in a refusal: `claims walk`, `examinable lens`. */
  readonly label: string;
  /**
   * A tag for the state just reached, folded into its identity, so two
   * paths whose tags differ never merge. Called once per state reached,
   * before any room hook.
   */
  readonly tagState?: (turn: StoryWalkTurn) => string;
  /**
   * Called on each room's first sighting. The walk restores the sighting's
   * state after it, whatever it did.
   */
  readonly onRoomFirstSeen?: (sighting: StoryWalkRoomSighting) => Promise<void>;
  /**
   * When the walk may stop early: checked after the start and after every
   * command, and the reason it reports when `done` returns true.
   */
  readonly stopWhen?: { readonly reason: WalkStopReason; readonly done: (roomsReached: ReadonlySet<string>) => boolean };
}

/** What one walk did, whatever its client asked of it. */
export interface StoryWalkReport {
  readonly budgets: { readonly maxStates: number; readonly maxSeconds: number; readonly maxDepth: number };
  readonly breadth: CandidateBreadth;
  readonly stopReason: WalkStopReason;
  readonly walkMs: number;
  readonly statesDiscovered: number;
  readonly commandsExecuted: number;
  readonly restores: number;
  readonly saves: number;
  readonly deadEnds: number;
  readonly queueRemaining: number;
  /** IR ids of the rooms the player was seen in (the runtime id when a room has none), sorted. */
  readonly roomsReached: readonly string[];
  readonly frontierByDepth: Readonly<Record<number, number>>;
}

/** The engine's save of one walked state, held in memory for the length of the walk. */
type WalkSave = NonNullable<Awaited<ReturnType<typeof captureSave>>>;

/** One state on the frontier: its save, the path that reached it, and its client tag. */
interface WalkNode {
  readonly save: WalkSave;
  readonly path: readonly string[];
  readonly depth: number;
  readonly tag: string;
}

/** Commands between two yields to the event loop. */
const YIELD_EVERY = 200;

/**
 * Walk one booted game breadth-first.
 *
 * The game is consumed: the walk forks it through the engine's save/restore
 * hooks and leaves it in whatever state it last restored.
 *
 * @param game a freshly booted game at the pinned seed; its opening is run
 *   here when it has not run yet
 * @param ir the compiled story, for the declared vocabulary
 * @param set the necessary set to cut candidates and identity to, or null
 *   for none: every candidate is tried and every entity counts
 * @param client what the caller adds: a state tag, a room hook, a stop
 * @param options budgets and breadth; the defaults are the explorer's
 * @returns the walk's report
 * @throws before anything runs when `maxStates` or `maxSeconds` is not
 *   positive or `maxDepth` is negative; when the engine refuses to save a
 *   state the walk must continue from, or to restore a node's save (the
 *   message names the node). A client's own throw propagates unchanged.
 */
export async function walkStory(
  game: ClaimsGame,
  ir: StoryIR,
  set: NecessarySet | null,
  client: StoryWalkClient,
  options: StoryWalkOptions = {},
): Promise<StoryWalkReport> {
  const { breadth, maxStates, maxSeconds, maxDepth } = { ...STORY_WALK_DEFAULTS, ...options };
  // A depth of 0 is a real budget: the start state is read and nothing is
  // tried from it (the claims floor walks that way). No states or no seconds
  // is not a walk at all.
  if (!(maxStates > 0) || !(maxSeconds > 0) || !(maxDepth >= 0)) {
    throw new Error(`story walk: maxStates and maxSeconds must be positive and maxDepth not negative (maxStates ${maxStates}, maxSeconds ${maxSeconds}, maxDepth ${maxDepth})`);
  }
  const { world, engine } = game;

  // The story's opening, so the walk starts from the state a player first
  // sees. It is the game's routine and costs no turn; a game some caller
  // already opened is left as it is.
  if (game.openingPending) await game.runOpening();

  const vocabulary = deriveCommandVocabulary(ir, engine);
  const nameByIrId = new Map<string, string>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined) nameByIrId.set(irId, entity.name);
  }

  const roomsSeen = new Set<string>();
  /** Records the player's room; returns it when this is its first sighting. */
  const noteRoom = (): ClaimsEntity | undefined => {
    const player = world.playerCharacter;
    const room = player && world.getContainingRoom(player.id);
    if (!room) return undefined;
    const key = irIdOf(room) ?? room.id;
    if (roomsSeen.has(key)) return undefined;
    roomsSeen.add(key);
    return room;
  };

  const tagOf = (turn: StoryWalkTurn): string => (client.tagState ? client.tagState(turn) : '');
  const identityOf = (tag: string, snapshot: WorldSnapshot): string =>
    `${necessaryIdentity(snapshot, set)}${client.tagState ? `|${tag}` : ''}`;
  const isDone = (): boolean => (client.stopWhen ? client.stopWhen.done(roomsSeen) : false);

  let commandsExecuted = 0;
  let restores = 0;
  let saves = 0;

  const nodeLabel = (path: readonly string[]): string => (path.length === 0 ? 'the walk\'s start' : `"${path.join(' / ')}"`);
  const saveNode = async (path: readonly string[]): Promise<WalkSave> => {
    const save = await captureSave(engine);
    if (save === null) {
      throw new Error(`${client.label}: the engine refused to save the state at ${nodeLabel(path)}, so the walk could not continue from it`);
    }
    saves++;
    return save;
  };
  const restoreTo = async (save: WalkSave, path: readonly string[], about: string): Promise<void> => {
    if (!(await restoreSave(engine, save))) {
      throw new Error(`${client.label}: the engine refused to restore the state at ${nodeLabel(path)}, so the walk stopped before ${about}`);
    }
    restores++;
  };
  /** Runs the room hook on a first sighting, then puts the sighting's state back. */
  const sighted = async (room: ClaimsEntity | undefined, save: WalkSave, path: readonly string[]): Promise<void> => {
    if (!room || !client.onRoomFirstSeen) return;
    await client.onRoomFirstSeen({ room, path, restore: () => restoreTo(save, path, 'a room hook\'s restore') });
    await restoreTo(save, path, 'continuing past a room hook');
  };

  const rootRoom = noteRoom();
  const rootSnapshot = readWorldSnapshot(world);
  const rootTag = tagOf({ path: [], events: [], inheritedTag: '', snapshot: rootSnapshot });
  const rootSave = await saveNode([]);
  const seen = new Set<string>([identityOf(rootTag, rootSnapshot)]);
  await sighted(rootRoom, rootSave, []);
  let queue: WalkNode[] = [{ save: rootSave, path: [], depth: 0, tag: rootTag }];

  let deadEnds = 0;
  const frontierByDepth: Record<number, number> = { 0: 1 };
  const walkStart = Date.now();
  let stopReason: WalkStopReason = 'frontier-exhausted';
  if (isDone()) { stopReason = client.stopWhen!.reason; queue = []; }

  const elapsedSeconds = () => (Date.now() - walkStart) / 1000;

  walk: while (queue.length > 0) {
    if (seen.size >= maxStates) { stopReason = 'max-states'; break; }
    if (elapsedSeconds() >= maxSeconds) { stopReason = 'max-seconds'; break; }
    const node = queue.shift()!;
    if (node.depth >= maxDepth) { stopReason = 'max-depth-reached'; continue; }

    await restoreTo(node.save, node.path, 'reading its commands');
    const commands = candidateCommands(world, vocabulary, set, nameByIrId, breadth);
    if (commands.length === 0) deadEnds++;

    for (const command of commands) {
      if (seen.size >= maxStates) { stopReason = 'max-states'; break walk; }
      if (elapsedSeconds() >= maxSeconds) { stopReason = 'max-seconds'; break walk; }

      await restoreTo(node.save, node.path, `trying "${command}"`);
      let events: readonly ClaimsTurnEvent[] = [];
      try {
        const result = await engine.executeTurn(command);
        events = result.events ?? [];
      } catch {
        // A refused turn is information about the state, not a failure of the walk.
      }
      commandsExecuted++;
      // The engine's turn resolves through microtasks alone, so a long walk
      // never reaches the macrotask queue on its own and starves whatever
      // hosts it — a test runner's worker channel timed out at a minute.
      // Yield to the event loop now and then.
      if (commandsExecuted % YIELD_EVERY === 0) await new Promise<void>((resolve) => setImmediate(resolve));
      const path = [...node.path, command];
      const firstSeen = noteRoom();
      const snapshot = readWorldSnapshot(world);
      const tag = tagOf({ path, events, inheritedTag: node.tag, snapshot });
      const identity = identityOf(tag, snapshot);
      let save: WalkSave | undefined;
      if (!seen.has(identity)) {
        seen.add(identity);
        save = await saveNode(path);
        const depth = node.depth + 1;
        frontierByDepth[depth] = (frontierByDepth[depth] ?? 0) + 1;
        queue.push({ save, path, depth, tag });
      }
      // A room seen for the first time is a new state too, so its save is
      // in hand; the capture here only guards an identity that hid the move.
      if (firstSeen) await sighted(firstSeen, save ?? (await saveNode(path)), path);
      if (isDone()) { stopReason = client.stopWhen!.reason; queue = []; break walk; }
    }
  }

  return {
    budgets: { maxStates, maxSeconds, maxDepth },
    breadth,
    stopReason,
    walkMs: Date.now() - walkStart,
    statesDiscovered: seen.size,
    commandsExecuted,
    restores,
    saves,
    deadEnds,
    queueRemaining: queue.length,
    roomsReached: [...roomsSeen].sort(),
    frontierByDepth,
  };
}
