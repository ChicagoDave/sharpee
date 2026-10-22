/**
 * claim-lock.ts — lock a reached state as a claim, with its necessary set
 * proposed from the line that reached it (ADR-367 D1, D2, D4, D8).
 *
 * Purpose: an author standing at a card of a played line picks a fact true
 * there and the tool writes it as a claim whose `needs` nobody typed. The
 * lock reads two records that already exist: the line (the tree's cards,
 * replayed at the pinned seed) and the world after the card. From the
 * replay it records, turn by turn, the room the player stood in, the
 * entities the validated command resolved to, and what the turn changed;
 * from those it proposes the set — rooms entered, things touched or
 * changed, verbs typed — and trims the things through the compiler's cone
 * (ADR-365 D12). Verbs are not trimmed (D8). The fact itself is validated
 * by compiling a candidate block through `compileClaims`, which is the one
 * place a sentence becomes a predicate, and then checked to hold at the
 * card. Nothing is written here: the result carries the Chord block, which
 * Chord's own `renderClaimBlock` writes, and the caller splices it into the
 * fragment through Chord (`spliceClaimIntoFragment`, `claimsFragmentWith`)
 * and writes files.
 *
 * Public interface: `proposeLock`, `lockOnCard`, `LockRequest`,
 *   `LockProposal`, `LockGame`, `LockOffer`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { claimCone, renderClaimBlock, type ClaimsCompileResult, type IREntity, type StoryIR } from '@sharpee/chord';
import { CHORD_STATE_PREFIX, CHORD_STORY_STATE_KEY } from '@sharpee/story-loader';
import { normalizeClaimSet, type Claim } from './claim-set.js';
import { claimHolds, clauseKeysByFiredOf, entityIdByIrOf } from './claim-predicates.js';
import { FLAG_SENTENCES, participleOf, writtenName } from './claim-vocabulary.js';
import { irIdOf, readWorldSnapshot, type ClaimsTurnEvent, type ClaimsWorld, type WorldSnapshot } from './claims-game.js';
import { branchLineLabelOf, mainLineLabelOf, roomSlugOf, type TreeCard, type TreeDocument } from '../tree-document.js';
import { flattenTreeLines, type TreeLine } from '../tree-walker.js';

/** The slice of a booted game the lock drives — bootstrap's `LoadedGame` shape. */
export interface LockGame {
  readonly world: ClaimsWorld;
  executeCommand(input: string): Promise<string> | string;
  lastEvents?: readonly ClaimsTurnEvent[];
  lastTurnResult?: {
    validatedCommand?: {
      actionId: string;
      parsed: { structure: { verb?: { text: string } } };
      directObject?: { entity: { id: string } };
      indirectObject?: { entity: { id: string } };
      instrument?: { entity: { id: string } };
    };
  } | null;
}

/** What a lock asks for. */
export interface LockRequest {
  readonly ir: StoryIR;
  readonly document: TreeDocument;
  /** A segment id, or a line's first typed command when exactly one line starts with it. */
  readonly line: string;
  /** 1-based typed turns from the root through the card; defaults to the line's last typed card. */
  readonly turn?: number;
  /** The fact, as a claim predicate sentence. Absent: offer only. */
  readonly fact?: string;
  /** The claim's name; defaults to the fact. */
  readonly name?: string;
  /**
   * The author's edited lists (D7's chips), written instead of the
   * proposal's — names as the fragment spells them, each list replacing
   * the proposed one when present. Compiled and checked like any fact; the
   * cone trims nothing from a list the author wrote.
   */
  readonly needs?: { readonly rooms?: readonly string[]; readonly things?: readonly string[]; readonly verbs?: readonly string[] };
  readonly loadGame: () => Promise<LockGame>;
  /** `compileClaims` bound to the story's source and import resolver. */
  readonly compileCandidate: (fragment: string) => ClaimsCompileResult;
  /** The lock's date, `YYYY-MM-DD` — carried in the proposal for the caller's words. */
  readonly date: string;
}

/** A fact true at the card and not at boot, as a sentence the fragment accepts (D1). */
export interface LockOffer {
  readonly sentence: string;
}

/** What the lock proposes. `claim` and the set are present only when a fact was given. */
export interface LockProposal {
  readonly line: { readonly id: string; readonly label: string };
  readonly turn: number;
  readonly cardId: string | undefined;
  readonly offer: readonly LockOffer[];
  readonly name?: string;
  readonly fact?: string;
  /** Names as written in the fragment, in the proposal's order. */
  readonly rooms?: readonly string[];
  readonly things?: readonly string[];
  /** The things the cone trimmed, with the reason each kept thing stays, for `--verbose`. */
  readonly trimmed?: readonly string[];
  readonly kept?: ReadonlyArray<{ readonly thing: string; readonly reason: string }>;
  readonly verbs?: readonly string[];
  /** The Chord block to splice, two-space indented, ending in a newline. */
  readonly block?: string;
}

/** The walk's own stateful traits plus `readable` — what "a thing changed" reads. */
const CHANGE_TRAITS = new Set([
  'openable', 'lockable', 'switchable', 'wearable', 'edible', 'health',
  'container', 'supporter', 'lightSource', 'equipped', 'combatant', 'readable',
]);

/** The engine's going action — a direction is an exit to the walk, not a verb. */
const GOING_ACTION = 'if.action.going';

/** One turn of the replayed line, as the lock reads it. */
interface TurnRecord {
  readonly input: string;
  readonly room: string | undefined;
  readonly actionId: string | undefined;
  readonly resolved: readonly string[];
  readonly verb: string | undefined;
  readonly changed: readonly string[];
  readonly snapshot: WorldSnapshot;
  readonly events: readonly ClaimsTurnEvent[];
}

/** The per-entity facts a snapshot carries, for diffing two of them. */
interface SnapshotFacts {
  readonly place: ReadonlyMap<string, string>;
  readonly states: ReadonlyMap<string, unknown>;
  readonly flags: ReadonlyMap<string, string>;
  readonly counters: ReadonlyMap<string, number>;
  readonly storyState: unknown;
}

function factsOf(snapshot: WorldSnapshot, irById: ReadonlyMap<string, string>): SnapshotFacts {
  const place = new Map<string, string>();
  for (const row of snapshot.spatialIndex?.parentToChildren ?? []) {
    for (const child of row.children ?? []) place.set(child, row.parent);
  }
  const states = new Map<string, unknown>();
  const counters = new Map<string, number>();
  let storyState: unknown;
  for (const [key, value] of Object.entries(snapshot.state ?? {})) {
    if (key === CHORD_STORY_STATE_KEY) storyState = value;
    else if (key.startsWith(CHORD_STATE_PREFIX)) states.set(key.slice(CHORD_STATE_PREFIX.length), value);
    else if (typeof value === 'number') counters.set(key, value);
  }
  const flags = new Map<string, string>();
  for (const row of snapshot.entities ?? []) {
    if (!irById.has(row.id)) continue;
    const keep: string[] = [];
    for (const trait of row.entity?.traits ?? []) {
      if (typeof trait.type === 'string' && CHANGE_TRAITS.has(trait.type)) keep.push(JSON.stringify(trait));
    }
    if (keep.length) flags.set(row.id, keep.sort().join(','));
  }
  return { place, states, flags, counters, storyState };
}

/** Runtime ids whose place, Chord state, or stateful flags differ between two snapshots. */
function changedBetween(before: SnapshotFacts, after: SnapshotFacts, irById: ReadonlyMap<string, string>): string[] {
  const out = new Set<string>();
  for (const [id, parent] of after.place) if (before.place.get(id) !== parent) out.add(id);
  for (const [id] of before.place) if (!after.place.has(id)) out.add(id);
  for (const [id, flags] of after.flags) if (before.flags.get(id) !== flags) out.add(id);
  // Chord states are keyed by IR id; map back to runtime ids for one vocabulary.
  const runtimeByIr = new Map<string, string>();
  for (const [runtime, ir] of irById) runtimeByIr.set(ir, runtime);
  for (const [irId, value] of after.states) {
    if (before.states.get(irId) !== value) {
      const runtime = runtimeByIr.get(irId);
      if (runtime !== undefined) out.add(runtime);
    }
  }
  return [...out];
}

/** The verb the parser read in the command — the word the candidate filter matches a command's start against. */
function verbOf(validated: NonNullable<LockGame['lastTurnResult']>['validatedCommand']): string | undefined {
  if (!validated) return undefined;
  if (validated.actionId === GOING_ACTION) return undefined;
  const verb = validated.parsed.structure.verb?.text.trim().toLowerCase();
  return verb ? verb : undefined;
}

/**
 * Propose a lock: read the line through the card, offer the facts that
 * became true, and — when a fact is given — lower it, check it holds there,
 * propose the set from the line, trim it through the cone, and render the
 * block.
 *
 * @param request the line, the card, the fact, and how to boot and compile
 * @returns the proposal; never writes
 * @throws when the line, the turn, or the fact cannot be used, with the reason
 */
export async function proposeLock(request: LockRequest): Promise<LockProposal> {
  const { ir, document, loadGame, compileCandidate } = request;
  const { lines, defects } = flattenTreeLines(document);
  if (defects.length > 0) throw new Error(`the tree has card-position defects: ${defects[0].message}`);
  const line = resolveLine(lines, request.line);

  const typedCards = line.cards.map((card, index) => ({ card, index })).filter(({ card }) => card.type === 'turn');
  if (typedCards.length === 0) throw new Error(`line ${line.id} has no typed turn to lock`);
  const lastTurn = line.prefixTurns + typedCards.length;
  const turn = request.turn ?? lastTurn;
  if (!Number.isInteger(turn) || turn <= line.prefixTurns || turn > lastTurn) {
    throw new Error(`line ${line.id} runs from turn ${line.prefixTurns + 1} to turn ${lastTurn}; turn ${turn} is not on it`);
  }
  const target = typedCards[turn - line.prefixTurns - 1];
  // A card after the END STATE card never runs (ADR-356 D4).
  if (line.endingIndex !== undefined && target.index > line.endingIndex) {
    throw new Error(`turn ${turn} is after the line's ending at turn ${line.prefixTurns + typedCards.findIndex(({ index }) => index === line.endingIndex) + 1}`);
  }

  const game = await loadGame();
  const world = game.world;
  const entityById = new Map(ir.entities.map((entity) => [entity.id, entity]));
  const irById = new Map<string, string>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined) irById.set(entity.id, irId);
  }
  const roomOf = (): string | undefined => {
    const player = world.getPlayer();
    const room = player && world.getContainingRoom(player.id);
    return room ? irIdOf(room) : undefined;
  };

  const bootSnapshot = readWorldSnapshot(world);
  const bootRoom = roomOf();
  let before = factsOf(bootSnapshot, irById);
  const turns: TurnRecord[] = [];
  const play = async (input: string): Promise<void> => {
    await game.executeCommand(input);
    const snapshot = readWorldSnapshot(world);
    const after = factsOf(snapshot, irById);
    const validated = game.lastTurnResult?.validatedCommand;
    const resolved = [validated?.directObject, validated?.indirectObject, validated?.instrument]
      .map((ref) => ref?.entity.id)
      .filter((id): id is string => id !== undefined);
    turns.push({
      input,
      room: roomOf(),
      actionId: validated?.actionId,
      resolved,
      verb: verbOf(validated),
      changed: changedBetween(before, after, irById),
      snapshot,
      events: game.lastEvents ?? [],
    });
    before = after;
  };

  // The main line's boot look is the first prefix command of every branch; a
  // line's own boot card is its own `look`. Neither is a typed turn.
  const hasBootCard = document.cards.some((card) => card.type === 'boot');
  const prefixIsTyped = (index: number) => !(hasBootCard && index === 0);
  const labelRoom = (): string | undefined => {
    const player = world.getPlayer();
    const room = player && world.getContainingRoom(player.id);
    return room?.name;
  };
  let label = mainLineLabelOf(roomSlugOf(labelRoom()));
  for (const [index, command] of line.prefix.entries()) {
    await play(command);
    if (!prefixIsTyped(index)) turns.pop();
  }
  if (line.parentId !== undefined) label = branchLineLabelOf(roomSlugOf(labelRoom()), line.ordinal!, line.firstCommand);
  for (let index = 0; index <= target.index; index++) {
    const card = line.cards[index];
    if (card.type === 'boot') {
      await play('look');
      turns.pop();
    } else if (card.type === 'turn') {
      await play(card.command!);
    }
  }
  if (turns.length !== turn) throw new Error(`replay reached turn ${turns.length} where turn ${turn} was asked for`);

  const atCard = turns[turns.length - 1];
  const cardFacts = factsOf(atCard.snapshot, irById);
  const bootFacts = factsOf(bootSnapshot, irById);
  const offer = offerOf(ir, world, irById, entityById, bootFacts, cardFacts, bootRoom, atCard.room, clauseKeysByFiredOf(ir));

  const base: LockProposal = { line: { id: line.id, label }, turn, cardId: target.card.id, offer };
  if (request.fact === undefined) return base;

  // The set from the line (D2): rooms entered, things resolved or changed, verbs typed.
  const rooms: string[] = [];
  const pushRoom = (room: string | undefined) => { if (room !== undefined && !rooms.includes(room)) rooms.push(room); };
  pushRoom(bootRoom);
  const things: string[] = [];
  const pushThing = (runtimeId: string) => {
    const irId = irById.get(runtimeId);
    if (irId === undefined || things.includes(irId)) return;
    const entity = entityById.get(irId);
    if (!entity || entity.kinds.some((kind) => kind.name === 'room')) return;
    if (runtimeId === world.getPlayer()?.id) return;
    things.push(irId);
  };
  const verbs: string[] = [];
  for (const record of turns) {
    pushRoom(record.room);
    for (const id of record.resolved) pushThing(id);
    for (const id of record.changed) pushThing(id);
    if (record.verb !== undefined && !verbs.includes(record.verb)) verbs.push(record.verb);
  }

  const name = request.name ?? request.fact;
  const nameOf = (id: string) => writtenName(entityById.get(id)!);
  // The author's lists win over the line's (D7): each present list is
  // written as given, in the fragment's own spelling.
  const roomNames = request.needs?.rooms ?? rooms.map(nameOf);
  const verbNames = request.needs?.verbs ?? verbs;
  // Chord writes the block (no provenance comment: `##` is top-level only,
  // ADR-249, so the card's `locks` entry is the lock's record).
  const fact = request.fact;
  const render = (thingNames: readonly string[]): string =>
    renderClaimBlock({ name, predicate: fact, needs: { rooms: roomNames, things: thingNames, verbs: verbNames } });

  // Lower the fact through the compiler: the candidate block is the written
  // block with the untrimmed set, so every name in it is checked too.
  const compiled = compileCandidate(`claims\n${render(request.needs?.things ?? things.map(nameOf))}end claims\n`);
  if (!compiled.ok || compiled.claims === null) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error').map((d) => d.message);
    throw new Error(`the fact "${request.fact}" does not compile as a claim: ${errors.join('; ')}`);
  }
  const claimSet = normalizeClaimSet(compiled.claims, 'the lock');
  const claim: Claim = claimSet.claims[0];
  const holds = claimHolds(claim, {
    world,
    snapshot: atCard.snapshot,
    events: atCard.events,
    entityIdByIr: entityIdByIrOf(world),
    clauseKeysByFired: clauseKeysByFiredOf(ir),
  });
  if (!holds) throw new Error(`"${request.fact}" does not hold at turn ${turn} of line ${line.id}; nothing written`);

  if (request.needs?.things !== undefined) {
    // The author's things are written as given; the cone's verdict on them
    // is still reported, so a chip the claim cannot depend on is named.
    const cone = claimCone(ir, compiled.claims.claims[0], claim.set);
    const inertNames = new Set(cone.inert.map((id) => (entityById.has(id) ? nameOf(id) : id)));
    return {
      ...base,
      name,
      fact: request.fact,
      rooms: [...roomNames],
      things: [...request.needs.things],
      trimmed: request.needs.things.filter((thing) => inertNames.has(thing)),
      kept: cone.kept.map((row) => ({ thing: entityById.has(row.thing) ? nameOf(row.thing) : row.thing, reason: row.reason })),
      verbs: [...verbNames],
      block: render(request.needs.things),
    };
  }
  const cone = claimCone(ir, compiled.claims.claims[0], claim.set);
  const trimmed = cone.inert;
  const keptThings = things.filter((id) => !trimmed.includes(id));
  return {
    ...base,
    name,
    fact: request.fact,
    rooms: [...roomNames],
    things: keptThings.map(nameOf),
    trimmed: trimmed.map(nameOf),
    kept: cone.kept.map((row) => ({ thing: nameOf(row.thing), reason: row.reason })),
    verbs: [...verbNames],
    block: render(keptThings.map(nameOf)),
  };
}

/** The facts true at the card and not at boot, each as a sentence (D1). */
function offerOf(
  ir: StoryIR,
  world: ClaimsWorld,
  irById: ReadonlyMap<string, string>,
  entityById: ReadonlyMap<string, IREntity>,
  boot: SnapshotFacts,
  card: SnapshotFacts,
  bootRoom: string | undefined,
  cardRoom: string | undefined,
  clauseKeysByFired: ReadonlyMap<string, readonly string[]>,
): LockOffer[] {
  const out: LockOffer[] = [];
  const nameOf = (irId: string) => {
    const entity = entityById.get(irId);
    return entity ? writtenName(entity) : undefined;
  };
  const ending = world.getEnding();
  if (ending && (ending.kind === 'victory' || ending.kind === 'defeat')) out.push({ sentence: `the story ends in ${ending.kind}` });
  if (cardRoom !== undefined && cardRoom !== bootRoom) {
    const room = nameOf(cardRoom);
    if (room) out.push({ sentence: `the player is in ${room}` });
  }
  const player = world.getPlayer();
  if (player) {
    for (const [id, parent] of card.place) {
      if (parent !== player.id || boot.place.get(id) === player.id) continue;
      const irId = irById.get(id);
      const name = irId && nameOf(irId);
      if (name) out.push({ sentence: `the player has ${name}` });
    }
  }
  if (card.storyState !== boot.storyState && typeof card.storyState === 'string') out.push({ sentence: `the story is ${card.storyState}` });
  for (const [irId, value] of card.states) {
    if (boot.states.get(irId) === value || typeof value !== 'string') continue;
    const name = nameOf(irId);
    if (name) out.push({ sentence: `${name} is ${value}` });
  }
  for (const [id, flags] of card.flags) {
    if (boot.flags.get(id) === flags) continue;
    const irId = irById.get(id);
    const name = irId && nameOf(irId);
    if (!name) continue;
    const entity = world.getEntity(id);
    for (const flag of FLAG_SENTENCES) {
      const trait = entity?.get(flag.trait) as Record<string, unknown> | undefined;
      if (!trait) continue;
      const bootTrait = boot.flags.get(id);
      const now = trait[flag.field] === true;
      // Offered when this field moved: the boot flags string carries the trait's old json.
      const was = bootTrait !== undefined && bootTrait.includes(`"${flag.field}":${now ? 'false' : 'true'}`);
      if (was) out.push({ sentence: `${name} is ${now ? flag.whenTrue : flag.whenFalse}` });
    }
  }
  for (const entity of ir.entities) {
    for (const action of new Set(entity.onClauses.map((clause) => clause.action))) {
      const keys = clauseKeysByFired.get(`${entity.id}.${action}`) ?? [];
      const firedNow = keys.some((key) => (card.counters.get(key) ?? 0) > 0);
      const firedAtBoot = keys.some((key) => (boot.counters.get(key) ?? 0) > 0);
      const participle = participleOf(action);
      if (firedNow && !firedAtBoot && participle) out.push({ sentence: `${writtenName(entity)} has been ${participle}` });
    }
  }
  return out;
}

/** A line by segment id, or by its first typed command when that names exactly one line. */
function resolveLine(lines: readonly TreeLine[], key: string): TreeLine {
  const byId = lines.find((line) => line.id === key);
  if (byId) return byId;
  const byCommand = lines.filter((line) => line.firstCommand === key);
  if (byCommand.length === 1) return byCommand[0];
  const listing = lines.map((line) => `  ${line.id}  ${line.firstCommand ?? '(opening)'}`).join('\n');
  if (byCommand.length > 1) {
    throw new Error(`"${key}" starts ${byCommand.length} lines — name the segment id:\n${byCommand.map((line) => `  ${line.id}`).join('\n')}`);
  }
  throw new Error(`no line "${key}" — the tree's lines, by segment id and first command:\n${listing}`);
}

// The lock's card entry lives with the document it mutates (browser-safe, so
// the Testing tab locks through the same function the CLI does — ADR-367 D7).
export { lockOnCard } from '../tree-document.js';
