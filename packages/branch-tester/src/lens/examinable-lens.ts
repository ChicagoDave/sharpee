/**
 * examinable-lens.ts — the examinable lens (ADR-294 D23, ADR-407, ADR-408):
 * the nouns a player reads in a room's prose that the parser cannot use, or
 * that name a thing the author never described.
 *
 * Purpose: for every room a player can walk to — reached by the shortest
 * route over the exits open at the start (`room-routes.ts`), typed in a fork
 * of the real engine, arrival checked (ADR-408 Amendment 1; no state search,
 * ADR-294 D23) — take the prose a player sees there: the room's
 * first-visit text, its description, and the description of everything in
 * view — pull out the noun phrases through the story language's extractor,
 * and type `examine <phrase>` in both grammatical numbers through the real
 * engine. Each phrase's class is the engine's (`examinable-classify.ts`).
 *
 * Soundness (ADR-322 D7): every report names its seed, its time budget,
 * rooms reached against rooms declared, and each room it did not reach with
 * the reason. Findings are real; absence is not proof.
 *
 * Language guard (ADR-407 D2, D6): a story whose language has no extractor
 * is refused before any game is loaded, and an engine whose language is not
 * the story's is refused after the opening, before any route is typed.
 * The lens holds no language rules of its own and never falls back to
 * English.
 *
 * Public interface: `runExaminableLens`, `ExaminableLensOptions`,
 *   `ExaminableLensReport`, `ExaminableLensRefusal`, `ExaminableLensResult`,
 *   `LensGame`, `ExaminableRoom`, `UnreachedRoom`, `countDeclaredRooms`.
 * Owner context: @sharpee/branch-tester — the lenses (ADR-408 D3).
 */

import type { StoryIR } from '@sharpee/chord';
import { languageMismatchRefusal, type NounExtractor, type NounExtractorLookup } from '@sharpee/if-domain/nouns';
import { captureSave, restoreSave } from '@sharpee/transcript-tester';
import { deriveReach, roomsOf } from '@sharpee/world-index';
import type { ClaimsEngine, ClaimsEntity, ClaimsGame, ClaimsTurnEvent, ClaimsWorld } from '../claims/claims-game.js';
import { irIdOf } from '../claims/claims-game.js';
import { planRoomRoutes } from './room-routes.js';
import {
  classifyCandidates,
  classifyExamine,
  foldFindings,
  type ExaminableFinding,
  type ExaminableKind,
  type ExaminableRow,
  type ExamineVerdict,
} from './examinable-classify.js';

/** The language provider as the lens reads it. */
interface LensLanguage {
  readonly languageCode: string;
  getActionPatterns(actionId: string): string[] | undefined;
  getMessage(messageId: string, params?: Record<string, string>): string;
  getTemplate?(messageId: string): string | undefined;
}

/** The engine as the lens drives it: the walk's engine, its language, and a turn's result. */
export interface LensEngine extends ClaimsEngine {
  executeTurn(input: string): Promise<{ events?: readonly ClaimsTurnEvent[]; success?: boolean; error?: string }>;
  getLanguageProvider(): LensLanguage;
}

/** An entity as the lens reads it: the walk's entity and its description getter. */
interface LensEntity extends ClaimsEntity {
  /** The entity's literal description, a trait-state literal in force winning (the getter's priority). */
  readonly description?: string;
}

/** A booted game the lens can walk. */
export interface LensGame extends ClaimsGame {
  readonly engine: LensEngine;
}

/** The lens's time budget, its seed for the report, and its extractor lookup. */
export interface ExaminableLensOptions {
  /** Seconds the lens may spend; rooms not yet visited when it runs out are unreached. Default 120. */
  readonly maxSeconds?: number;
  /** The story file's name, for the report. */
  readonly story: string;
  /** The seed the caller booted the game at, for the report. */
  readonly seed: number;
  /** Language code to extractor or refusal; the caller's (ADR-407 D8). */
  readonly lookup: NounExtractorLookup;
}

/** One passage a player reads in a room. */
export interface ProsePassage {
  /** `room (first visit)`, `room`, or the thing's display name. */
  readonly source: string;
  readonly text: string;
}

/** One room's record: the prose read there and its rows. */
export interface ExaminableRoom {
  readonly roomId: string;
  readonly room: string;
  readonly path: readonly string[];
  /** True when the room was first seen in the move that ended the game: no rows. */
  readonly ended?: true;
  readonly prose: readonly ProsePassage[];
  readonly rows: readonly ExaminableRow[];
}

/** A declared room the lens did not examine, and why. */
export interface UnreachedRoom {
  readonly roomId: string;
  readonly room: string;
  readonly reason: string;
}

/** The lens's report. */
export interface ExaminableLensReport {
  readonly lens: 'examinable';
  readonly format: 2;
  readonly story: string;
  readonly seed: number;
  /** How far the lens got (ADR-322 D7, ADR-408 Amendment 1): rooms reached of declared, and each one it did not reach. */
  readonly reach: {
    readonly roomsReached: number;
    readonly roomsDeclared: number;
    readonly unreached: readonly UnreachedRoom[];
    readonly commandsTyped: number;
    readonly ms: number;
    readonly maxSeconds: number;
  };
  readonly phrasesExecuted: number;
  readonly counts: Readonly<Partial<Record<ExaminableKind, number>>>;
  readonly findings: readonly ExaminableFinding[];
  readonly rooms: readonly ExaminableRoom[];
}

/** A refused run: no walk was made. */
export interface ExaminableLensRefusal {
  readonly lens: 'examinable';
  readonly format: 2;
  readonly story: string;
  readonly refused: string;
}

export type ExaminableLensResult = ExaminableLensReport | ExaminableLensRefusal;

/** Rooms the story declares, so rooms reached reads against a total (ADR-322 D7): world-index's own count. */
export function countDeclaredRooms(ir: StoryIR): number {
  return roomsOf(ir).length;
}

/**
 * A description message id's registered text, the raw template, the way the
 * engine's prose pipeline resolves it (ADR-107 id mode, ADR-333 D1a).
 */
function resolveDescriptionText(language: LensLanguage, id: string | undefined): string | undefined {
  if (!id) return undefined;
  if (typeof language.getTemplate === 'function') return language.getTemplate(id);
  const message = language.getMessage(id, {});
  return message && message !== id ? message : undefined;
}

/** A thing's description as examining shows it: a trait-state literal in force, else its id's text, else its literal. */
function thingText(entity: LensEntity, language: LensLanguage): string | undefined {
  const identity = entity.get('identity') as { descriptionId?: string; description?: string } | undefined;
  const stateText = entity.description;
  if (identity?.descriptionId && (!stateText || stateText === identity.description)) {
    const resolved = resolveDescriptionText(language, identity.descriptionId);
    if (resolved) return resolved;
  }
  return stateText || undefined;
}

/**
 * The prose a player sees on arriving in a room: its first-visit text, its
 * description, and each visible thing's description.
 *
 * @param world the world, in the state the walk arrived in
 * @param room the room first seen
 * @param language the engine's language provider
 * @returns the passages, in that order
 */
function visibleProse(world: ClaimsWorld, room: LensEntity, language: LensLanguage): ProsePassage[] {
  const player = world.playerCharacter;
  const out: ProsePassage[] = [];
  const roomTrait = room.get('room') as { initialDescriptionId?: string; initialDescription?: string } | undefined;
  const identity = room.get('identity') as { descriptionId?: string } | undefined;
  const firstVisit = roomTrait ? (resolveDescriptionText(language, roomTrait.initialDescriptionId) || roomTrait.initialDescription) : undefined;
  if (firstVisit) out.push({ source: 'room (first visit)', text: String(firstVisit) });
  const standard = resolveDescriptionText(language, identity?.descriptionId) || room.description;
  if (standard) out.push({ source: 'room', text: String(standard) });
  for (const entity of world.getVisible(player.id) as LensEntity[]) {
    if (entity.id === room.id || entity.id === player.id) continue;
    const text = thingText(entity, language);
    if (text) out.push({ source: entity.name, text: String(text) });
  }
  return out;
}

/** The room's candidates, folded across its prose: one entry per distinct phrase, with every source. */
function phrasesIn(prose: readonly ProsePassage[], extractor: NounExtractor): Map<string, { words: readonly string[]; sources: string[] }> {
  const folded = new Map<string, { words: readonly string[]; sources: string[] }>();
  for (const { source, text } of prose) {
    for (const candidate of extractor.extract(text)) {
      const phrase = candidate.words.join(' ');
      const row = folded.get(phrase) ?? { words: candidate.words, sources: [] };
      if (!row.sources.includes(source)) row.sources.push(source);
      folded.set(phrase, row);
    }
  }
  return folded;
}

/**
 * The language guard: the story language's extractor, or the refusal line.
 * A language with no extractor is refused first, then an engine whose
 * language is not the story's, so both refusals are reachable.
 */
function guardLanguage(storyLanguageCode: string, engineLanguageCode: string, lookup: NounExtractorLookup): { found: true; extractor: NounExtractor } | { found: false; refusal: string } {
  const resolution = lookup(storyLanguageCode);
  if (!resolution.found) return { found: false, refusal: resolution.refusal };
  if (engineLanguageCode !== storyLanguageCode) return { found: false, refusal: languageMismatchRefusal(engineLanguageCode, storyLanguageCode) };
  return { found: true, extractor: resolution.extractor };
}

/**
 * Run the examinable lens over every room a route reaches (ADR-408 D3,
 * Amendment 1): each route typed from the opening in a fork of the real
 * engine, arrival checked, the room's nouns examined from the arrival state.
 *
 * @param ir the compiled story: its language, its rooms and its exits
 * @param loadGame boots the game the lens forks, at the caller's seed; never
 *   called when the story's language has no extractor
 * @param options the report's story and seed, the time budget, and the
 *   extractor lookup
 * @returns the report, or a refusal typed before any route
 * @throws when the engine refuses a save or a restore, naming the state
 */
export async function runExaminableLens(ir: StoryIR, loadGame: () => Promise<LensGame>, options: ExaminableLensOptions): Promise<ExaminableLensResult> {
  const refused = (line: string): ExaminableLensRefusal => ({ lens: 'examinable', format: 2, story: options.story, refused: line });

  const storyLanguageCode = String(ir.phrases?.defaultLocale ?? '');
  const early = options.lookup(storyLanguageCode);
  if (!early.found) return refused(early.refusal);

  const game = await loadGame();
  const { world, engine } = game;
  const language = engine.getLanguageProvider();
  const roomsDeclared = countDeclaredRooms(ir);
  const rooms: ExaminableRoom[] = [];
  let phrasesExecuted = 0;
  let extractor: NounExtractor | null = null;

  /** Types `examine <form>` from the room's state and reads the engine's answer. */
  const examineFrom = (restore: () => Promise<void>) => async (form: string): Promise<ExamineVerdict> => {
    await restore();
    phrasesExecuted++;
    try {
      const result = await engine.executeTurn(`examine ${form}`);
      return classifyExamine({ events: result.events ?? [], success: result.success, error: result.error });
    } catch (thrown) {
      return classifyExamine({ events: [], thrown: thrown instanceof Error ? thrown.message : String(thrown) });
    }
  };

  // The story's opening, so every route starts from the state a player first
  // sees. The engine's language is known here, before any route is typed.
  if (game.openingPending) await game.runOpening();
  const guard = guardLanguage(storyLanguageCode, language.languageCode, options.lookup);
  if (!guard.found) return refused(guard.refusal);
  extractor = guard.extractor;

  const started = Date.now();
  const maxSeconds = options.maxSeconds ?? DEFAULT_MAX_SECONDS;
  const opening = await saveOrThrow(engine, 'the opening');
  const nameByIrId = new Map<string, string>();
  const entityByIrId = new Map<string, ClaimsEntity>();
  for (const entity of world.getAllEntities()) {
    const irId = irIdOf(entity);
    if (irId !== undefined) { nameByIrId.set(irId, entity.name); entityByIrId.set(irId, entity); }
  }
  const nameOf = (irId: string): string => nameByIrId.get(irId) ?? irId;

  const plan = planRoomRoutes(ir, deriveReach(ir));
  const unreached: UnreachedRoom[] = plan.unrouted.map((room) => ({ roomId: room.roomId, room: nameOf(room.roomId), reason: room.reason }));
  let commandsTyped = 0;
  const type = async (command: string): Promise<void> => {
    commandsTyped++;
    try { await engine.executeTurn(command); } catch { /* a refused move is read off where the player ends up */ }
  };

  for (const route of plan.routes) {
    if ((Date.now() - started) / 1000 >= maxSeconds) {
      unreached.push({ roomId: route.roomId, room: nameOf(route.roomId), reason: `the time budget (${maxSeconds}s) ran out first` });
      continue;
    }
    await restoreOrThrow(engine, opening, 'the opening');
    const path: string[] = [];
    for (const step of route.steps) {
      // A route through a door opens it first; opening an open door is harmless.
      if (step.door !== undefined) { const open = `open ${nameOf(step.door)}`; path.push(open); await type(open); }
      path.push(step.command);
      await type(step.command);
      if (world.getEnding()) break;
    }
    const here = world.getContainingRoom(world.playerCharacter.id);
    const arrived = here !== undefined && irIdOf(here) === route.roomId;
    const room = entityByIrId.get(route.roomId);
    // A room reached by the move that ends the game is not a room the player
    // ever gets a turn in, so its phrases are not findings.
    if (world.getEnding()) {
      if (arrived && room) rooms.push({ roomId: room.id, room: room.name, path, ended: true, prose: [], rows: [] });
      else unreached.push({ roomId: route.roomId, room: nameOf(route.roomId), reason: `the game ended on the way, after "${path.join(', ')}"` });
      continue;
    }
    if (!arrived || !room) {
      unreached.push({ roomId: route.roomId, room: nameOf(route.roomId), reason: `the route "${path.join(', ')}" ended in ${here?.name ?? 'no room'}` });
      continue;
    }
    const arrival = await saveOrThrow(engine, `"${path.join(', ')}"`);
    const prose = visibleProse(world, room as LensEntity, language);
    const rows = await classifyCandidates(phrasesIn(prose, extractor), examineFrom(() => restoreOrThrow(engine, arrival, `"${path.join(', ')}"`)), extractor);
    rooms.push({ roomId: room.id, room: room.name, path, prose, rows });
  }

  const counts: Partial<Record<ExaminableKind, number>> = {};
  for (const room of rooms) for (const row of room.rows) counts[row.kind] = (counts[row.kind] ?? 0) + 1;

  return {
    lens: 'examinable',
    format: 2,
    story: options.story,
    seed: options.seed,
    reach: {
      roomsReached: rooms.length,
      roomsDeclared,
      unreached,
      commandsTyped,
      ms: Date.now() - started,
      maxSeconds,
    },
    phrasesExecuted,
    counts,
    findings: foldFindings(rooms),
    rooms,
  };
}

/** The lens's time budget when the caller names none: the explorer's. */
const DEFAULT_MAX_SECONDS = 120;

/** The engine's save of one state, or a thrown error naming it: the lens never examines a world it could not fork. */
async function saveOrThrow(engine: LensEngine, at: string): Promise<NonNullable<Awaited<ReturnType<typeof captureSave>>>> {
  const save = await captureSave(engine);
  if (save === null) throw new Error(`examinable lens: the engine refused to save the state at ${at}`);
  return save;
}

/** Restore a save, or throw naming it: a refused restore would credit the next examine to the wrong state. */
async function restoreOrThrow(engine: LensEngine, save: NonNullable<Awaited<ReturnType<typeof captureSave>>>, at: string): Promise<void> {
  if (!(await restoreSave(engine, save))) throw new Error(`examinable lens: the engine refused to restore the state at ${at}`);
}
