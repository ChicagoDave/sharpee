/**
 * claim-candidates.ts — the commands worth trying from a state, cut to the
 * necessary set (ADR-365 D2).
 *
 * Purpose: the walk's branching factor. Commands come from the room's exits
 * and from each visible entity's affordances — the trait IS the affordance,
 * which is what makes this cheaper than grammar times vocabulary — plus the
 * story's own declarations read off its IR: declared actions, conversation
 * topics, the actions an entity's `on` clauses say it answers to, and the
 * instrument a trait config names. Then the set cuts the list: an exit is
 * kept only when it leads into a necessary room, and every other command
 * only when its verb is a necessary verb and every entity it names is a
 * necessary thing. The cut is the author's claim that nothing else is on
 * the way; the walk reports under that claim and never beyond it.
 *
 * Public interface: `deriveCommandVocabulary`, `candidateCommands`,
 *   `CommandVocabulary`, `CandidateBreadth`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import type { IRPatternPart, StoryIR } from '@sharpee/chord';
import { TraitType } from '@sharpee/world-model';
import type { NecessarySet } from './claim-set.js';
import type { ClaimsEngine, ClaimsEntity, ClaimsWorld } from './claims-game.js';
import { irIdOf } from './claims-game.js';

/** `basic` — one verb per affordance; `full` — adds put-in / put-on over the carried set. */
export type CandidateBreadth = 'basic' | 'full';

/** What the story itself declares a player can say, read off its IR and its language. */
export interface CommandVocabulary {
  /** Declared actions with exactly one slot: the slot takes an entity name. */
  readonly actions: ReadonlyArray<{ readonly name: string; readonly parts: readonly IRPatternPart[] }>;
  /** Per-entity conversation topics, by IR id. */
  readonly topics: ReadonlyMap<string, ReadonlyArray<{ kind: 'entity'; id: string } | { kind: 'text'; text: string }>>;
  /** The actions each entity's `on` clauses say it answers to, by IR id. */
  readonly entityActions: ReadonlyMap<string, readonly string[]>;
  /** Trait configs naming an instrument (`cuttable "garden shears"`), by IR id. */
  readonly instruments: ReadonlyMap<string, ReadonlyArray<{ trait: string; instrument: string }>>;
  /** Chord action name (`turning`) to the language's `[something]` pattern (`turn [something]`). */
  readonly verbTemplates: ReadonlyMap<string, string>;
}

/** The verb that consumes a trait's declared instrument. */
const INSTRUMENT_VERBS: Readonly<Record<string, string>> = {
  openable: 'open', lockable: 'unlock', cuttable: 'cut', feedable: 'feed',
};

/**
 * Derive the story's declared vocabulary from its IR and the engine's
 * language. Only single-slot action patterns are kept: a multi-slot pattern
 * would cross the vocabulary with itself.
 *
 * @param ir the compiled story
 * @param engine the booted engine, for the language's action patterns
 * @returns the vocabulary the candidate generator reads
 */
export function deriveCommandVocabulary(ir: StoryIR, engine: ClaimsEngine): CommandVocabulary {
  const actions: Array<{ name: string; parts: readonly IRPatternPart[] }> = [];
  for (const action of ir.actions ?? []) {
    for (const pattern of action.patterns ?? []) {
      if (pattern.parts.filter((part) => part.kind === 'slot').length !== 1) continue;
      actions.push({ name: action.name, parts: pattern.parts });
    }
  }

  const topics = new Map<string, Array<{ kind: 'entity'; id: string } | { kind: 'text'; text: string }>>();
  const entityActions = new Map<string, string[]>();
  const instruments = new Map<string, Array<{ trait: string; instrument: string }>>();
  const actionNames = new Set<string>();
  for (const entity of ir.entities ?? []) {
    const list: Array<{ kind: 'entity'; id: string } | { kind: 'text'; text: string }> = [];
    for (const row of entity.topics ?? []) {
      if (row.filter.kind === 'entity') list.push({ kind: 'entity', id: row.filter.id });
      else list.push({ kind: 'text', text: row.filter.primary });
    }
    if (list.length) topics.set(entity.id, list);

    const names = new Set<string>();
    for (const clause of entity.onClauses ?? []) names.add(clause.action);
    if (names.size) {
      entityActions.set(entity.id, [...names]);
      for (const name of names) actionNames.add(name);
    }

    for (const trait of entity.traits ?? []) {
      for (const setting of trait.config ?? []) {
        if (setting.valueKind === 'name' && setting.value) {
          const rows = instruments.get(entity.id) ?? [];
          rows.push({ trait: trait.name, instrument: setting.value });
          instruments.set(entity.id, rows);
        }
      }
    }
  }

  // The language owns every user-facing word: `turning` is spoken as the
  // first `[something]` pattern of `if.action.turning`.
  const provider = engine.getLanguageProvider();
  const verbTemplates = new Map<string, string>();
  for (const name of actionNames) {
    const template = (provider.getActionPatterns(`if.action.${name}`) ?? []).find((pattern) => pattern.includes('[something]'));
    if (template) verbTemplates.set(name, template);
  }

  return { actions, topics, entityActions, instruments, verbTemplates };
}

function exitsOf(room: ClaimsEntity | undefined): Record<string, { destination?: string } | undefined> {
  const trait = room?.get(TraitType.ROOM) as { exits?: Record<string, { destination?: string } | undefined> } | undefined;
  return trait?.exits ?? {};
}

function isPortable(entity: ClaimsEntity): boolean {
  if (entity.has(TraitType.ROOM) || entity.has(TraitType.ACTOR) || entity.has(TraitType.DOOR)) return false;
  return !entity.has(TraitType.SCENERY);
}

/**
 * The commands worth trying in the current world state, cut to the set.
 *
 * @param world the live world
 * @param vocabulary the story's declared vocabulary
 * @param set the necessary set the walk runs under
 * @param nameByIrId runtime names by IR id, for topic references
 * @param breadth `basic` or `full`
 * @returns command strings, deduplicated, in a stable order
 */
export function candidateCommands(
  world: ClaimsWorld,
  vocabulary: CommandVocabulary,
  set: NecessarySet,
  nameByIrId: ReadonlyMap<string, string>,
  breadth: CandidateBreadth,
): string[] {
  const player = world.getPlayer();
  if (!player) return [];
  const room = world.getContainingRoom(player.id);
  const out: string[] = [];
  /** Which entities each command names — the set's filter reads this. */
  const names = new Map<string, Set<ClaimsEntity>>();
  const emit = (command: string, ...entities: Array<ClaimsEntity | undefined>) => {
    out.push(command);
    const named = names.get(command) ?? new Set<ClaimsEntity>();
    for (const entity of entities) if (entity) named.add(entity);
    names.set(command, named);
  };

  const exits = exitsOf(room);
  for (const direction of Object.keys(exits)) {
    const info = exits[direction];
    const destination = info?.destination ? world.getEntity(info.destination) : undefined;
    emit(direction.toLowerCase(), destination);
  }

  const carriedIds = new Set(world.getContents(player.id).map((entity) => entity.id));
  const carried = () => [...carriedIds].map((id) => world.getEntity(id)).filter((entity): entity is ClaimsEntity => entity !== undefined);

  for (const entity of world.getVisible(player.id)) {
    if (entity.has(TraitType.ROOM) || entity.id === player.id) continue;
    const n = entity.name;
    const isCarried = carriedIds.has(entity.id);

    emit(`examine ${n}`, entity);
    if (entity.has(TraitType.READABLE)) emit(`read ${n}`, entity);
    if (entity.has(TraitType.PUSHABLE)) emit(`push ${n}`, entity);
    if (entity.has(TraitType.PULLABLE)) emit(`pull ${n}`, entity);
    if (entity.has(TraitType.CLIMBABLE)) emit(`climb ${n}`, entity);
    if (entity.has(TraitType.EDIBLE)) emit(`eat ${n}`, entity);
    if (entity.has(TraitType.OPENABLE)) {
      const trait = entity.get(TraitType.OPENABLE) as { isOpen?: boolean } | undefined;
      emit(trait?.isOpen ? `close ${n}` : `open ${n}`, entity);
    }
    if (entity.has(TraitType.SWITCHABLE)) {
      const trait = entity.get(TraitType.SWITCHABLE) as { isOn?: boolean } | undefined;
      emit(trait?.isOn ? `turn off ${n}` : `turn on ${n}`, entity);
    }
    if (entity.has(TraitType.WEARABLE)) {
      const trait = entity.get(TraitType.WEARABLE) as { worn?: boolean } | undefined;
      emit(trait?.worn ? `take off ${n}` : `wear ${n}`, entity);
    }
    if (entity.has(TraitType.CONTAINER) || entity.has(TraitType.SUPPORTER)) emit(`search ${n}`, entity);
    if (isCarried) emit(`drop ${n}`, entity);
    else if (isPortable(entity)) emit(`take ${n}`, entity);

    // Instrument verbs, bounded by the carried set and by the trait that
    // makes the verb meaningful.
    if (entity.has(TraitType.CUTTABLE)) for (const tool of carried()) emit(`cut ${n} with ${tool.name}`, entity, tool);
    if (entity.has(TraitType.LOCKABLE)) {
      for (const key of carried()) {
        emit(`unlock ${n} with ${key.name}`, entity, key);
        emit(`open ${n} with ${key.name}`, entity, key);
      }
    }
    if (entity.has(TraitType.ACTOR)) for (const gift of carried()) emit(`give ${gift.name} to ${n}`, entity, gift);

    const irId = irIdOf(entity);
    for (const topic of (irId && vocabulary.topics.get(irId)) || []) {
      const about = topic.kind === 'text' ? topic.text : nameByIrId.get(topic.id);
      if (about) emit(`ask ${n} about ${about}`, entity);
    }
    for (const action of vocabulary.actions) {
      emit(action.parts.map((part) => (part.kind === 'word' ? part.word : part.kind === 'alt' ? part.words[0] : n)).join(' '), entity);
    }
    for (const actionName of (irId && vocabulary.entityActions.get(irId)) || []) {
      const template = vocabulary.verbTemplates.get(actionName);
      if (template) emit(template.replace('[something]', n), entity);
    }
    for (const required of (irId && vocabulary.instruments.get(irId)) || []) {
      const verb = INSTRUMENT_VERBS[required.trait];
      if (!verb) continue;
      const instrument = carried().find((tool) => tool.name === required.instrument);
      emit(`${verb} ${n} with ${required.instrument}`, entity, instrument);
    }

    if (breadth === 'full' && !isCarried) {
      if (entity.has(TraitType.CONTAINER)) for (const item of carried()) emit(`put ${item.name} in ${n}`, entity, item);
      if (entity.has(TraitType.SUPPORTER)) for (const item of carried()) emit(`put ${item.name} on ${n}`, entity, item);
    }
  }

  const rooms = new Set(set.rooms);
  const things = new Set(set.things);
  const exitDirections = new Set(Object.keys(exits).map((direction) => direction.toLowerCase()));
  return [...new Set(out)].filter((command) => {
    const entities = [...(names.get(command) ?? [])];
    if (exitDirections.has(command)) return entities.some((destination) => rooms.has(irIdOf(destination) ?? ''));
    if (!set.verbs.some((verb) => command === verb || command.startsWith(`${verb} `))) return false;
    if (entities.length === 0) return false;
    return entities.every((entity) => things.has(irIdOf(entity) ?? ''));
  });
}
