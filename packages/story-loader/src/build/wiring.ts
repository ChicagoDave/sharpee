/**
 * wiring.ts — pass 2 of the world build: wire every built entity.
 *
 * Pass 1 created every entity; this pass places each where the author
 * wrote, gives holders what they carry and wear, assigns rooms to their
 * regions, connects exits (plain and door), hands vehicles, expanses and
 * aboard rooms to their own module, marks deadly rooms and collects deadly
 * exits, seeds per-entity states and counters, and compiles description
 * markers. Placement is WORLD CONSTRUCTION, not a runtime action: it goes
 * through `AuthorModel.moveEntity`, which bypasses the runtime containment
 * rules (a closed trunk can hold its contents at load).
 *
 * Invariants:
 * - Every id the IR names resolves to a built entity (`requireEntity`);
 *   pass 1 built them all, and ADR-389 D1 makes the IR id the world id.
 * - A door wires exactly once: its mirror reference is verified, then
 *   skipped.
 *
 * Public interface: wireEntities (the `wiring` step), wireEntity, wireExit,
 * toDirection.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-389 D2 — the world build as a named step list.
 * - ADR-289 D4, D6 — placement as written; exits are a room's.
 * - ADR-234 D1, D2, D4 — door exits through the one platform primitive;
 *   one-way exits (GH #327).
 * - ADR-236 D2 — region membership through `assignRoom`.
 * - ADR-227 — `deadly:` rooms and `<direction> is deadly:` exits.
 * - ADR-264 D1/D5 — per-entity counters seeded into world state.
 * - ADR-374 D1 — backdrops; ADR-376 D10 — a `floats` thing's cell.
 * - ADR-388 D5 — the reconciler wires an added exit through `wireExit`.
 */
import type { IREntity, IRExit } from '@sharpee/chord';
import {
  AuthorModel,
  BackdropTrait,
  DeadlyRoomTrait,
  type DirectionType,
  DoorTrait,
  type ExitKey,
  FloatingTrait,
  getOppositeDirection,
  IFEntity,
  isPassageKey,
  RoomTrait,
  TraitType,
  WearableTrait,
  WorldModel,
} from '@sharpee/world-model';
import { exitKeyOfWord } from '../direction-words.js';
import { LoadError } from '../errors.js';
import { requireEntity } from '../identity.js';
import { CHORD_STATE_PREFIX, counterKey } from '../state-keys.js';
import { wireAdmits } from './admittance.js';
import type { BuildContext, DeadlyExitRecord } from './context.js';
import { compileDescriptionSnippets } from './snippets.js';
import { wireExpanse, wireOutsideExits, wireVehicle } from './vehicles.js';

/**
 * The `wiring` step: pass 2 over every entity pass 1 built — placement,
 * exits, blocked exits, initial states. Each entity is found by its IR id,
 * which is its world id (ADR-389 D1, asserted where the entity is made).
 * @param story the build context
 * @param world the world under construction
 */
export function wireEntities(story: BuildContext, world: WorldModel): void {
  // Placement is WORLD CONSTRUCTION, not a runtime action: it goes through
  // AuthorModel.moveEntity, which bypasses the runtime containment rules
  // (a closed trunk can hold its contents at load — the plain
  // world.moveEntity refusal was a silent drop; David-approved fix,
  // 2026-07-18, matching the TS story path's established pattern).
  const author = new AuthorModel(world.getDataStore(), world);
  for (const irEntity of story.ir.entities) {
    wireEntity(story, world, author, irEntity, requireEntity(world, irEntity.id, irEntity));
  }
}

/**
 * Pass 2 for one built entity: placement, what it carries and wears,
 * region membership, exits, vehicle and expanse wiring, deadly marks,
 * initial state and counters, and description snippets. Runs once per
 * entity at build, and again for an entity the restore reconciler adds
 * (ADR-388 D5), which is why it is a method and not the loop body.
 *
 * @param world the world under construction
 * @param author the author model the placement goes through
 * @param irEntity the entity's IR
 * @param entity the built world entity
 */
export function wireEntity(story: BuildContext, world: WorldModel, author: AuthorModel, irEntity: IREntity, entity: IFEntity): void {
  // ADR-289 D4: place what the author wrote, whichever of the three
  // relations they spelled. `starts in` is the emphatic spelling for a
  // thing expected to move, not a second placement concept — and every
  // entity's location is mutable, so there is no principled line to
  // draw. Testing the relation here silently dropped every NPC declared
  // `starts in <room>`.
  if (irEntity.placement) {
    author.moveEntity(entity.id, requireEntity(world, irEntity.placement.place, irEntity).id);
    // ADR-374 D1: a backdrop lives in its first room and is present at
    // every room of its list.
    if (irEntity.placement.places) {
      entity.add(new BackdropTrait({ roomIds: irEntity.placement.places.map((id) => requireEntity(world, id, irEntity).id) }));
    }
    // ADR-376 D10: a `floats` thing placed `in <expanse> at <x>, <y>`
    // holds that cell; an open vehicle's cell is on its model (wireVehicle).
    const floating = entity.get(FloatingTrait);
    if (floating && irEntity.placement.at) floating.position = { x: irEntity.placement.at.x, y: irEntity.placement.at.y };
  }
  // `carries the X` / `wears the X` are facts about the holder, whoever it
  // is — a character's inventory is world construction exactly as its
  // room is (ADR-230 Phase 6 wrote them for the player; the role-holder
  // is one character among the `a person` entities, ADR-327 D10). Found
  // 2026-08-29 under ADR-329: an NPC's `carries` compiled and was never
  // placed — the monkey's necklace, the mercenaries' sword, Teisha's cord.
  for (const carriedIrId of irEntity.carries ?? []) {
    author.moveEntity(requireEntity(world, carriedIrId, irEntity).id, entity.id);
  }
  for (const wornIrId of irEntity.wears ?? []) {
    const worn = requireEntity(world, wornIrId, irEntity);
    author.moveEntity(worn.id, entity.id);
    const wearable = worn.get(TraitType.WEARABLE) as WearableTrait | undefined;
    if (!wearable) {
      // `validateIR` refused this IR before the world was built
      // (analysis.worn-not-wearable); the branch stays because the
      // trait is written next.
      throw new LoadError(`\`${wornIrId}\` is worn by ${irEntity.name} but is not wearable.`, irEntity.span);
    }
    wearable.worn = true;
    wearable.wornBy = entity.id;
  }
  // ADR-236 D2: region membership through the platform seam —
  // `assignRoom` sets RoomTrait.regionId (never touched directly here).
  // A region holds rooms only (ADR-360 D5): the compiler builds the member
  // list from groups and `in` lines, so a member that is not a room is
  // rogue IR.
  for (const member of irEntity.containing ?? []) {
    const memberIr = story.ir.entities.find((e) => e.id === member.id);
    if (!memberIr || !memberIr.kinds.some((k) => k.name === 'room')) {
      throw new LoadError(
        `\`${member.id}\` is listed as a member of ${irEntity.name} but is not a room.`,
        irEntity.span,
      );
    }
    world.assignRoom(requireEntity(world, member.id, irEntity).id, entity.id);
  }
  // ADR-289 D6: exits wire into RoomTrait.exits, so they are a room's —
  // validateIR refused every exit form on a non-room upstream
  // (analysis.exit-non-room, ADR-389 D4).
  for (const exit of irEntity.exits) wireExit(world, irEntity, entity, exit);
  // ADR-366: the vehicle's model, the rooms that admit it, and the rooms
  // aboard it — every id resolvable now that every entity is built.
  if (irEntity.vehicle) wireVehicle(story, world, irEntity, entity);
  if (irEntity.expanse) wireExpanse(world, irEntity, entity);
  if (irEntity.admits) wireAdmits(world, irEntity, entity);
  wireOutsideExits(story, world, irEntity, entity);
  // Blocked exits — ADR-240 D2 (Option A): ALL of them, conditional and
  // unconditional alike, are registered as live evaluators by the
  // runtime's bind(); nothing is stamped onto RoomTrait.blockedExits
  // here anymore (the trait map remains the hand-written TS stories'
  // surface, consulted by going as the fall-through).
  // ADR-227: `deadly: <phrase>` — the no-escape room marker lowers to
  // DeadlyRoomTrait (safeVerbs default look/examine); the ENGINE
  // auto-registers the deadly-room transformer, so no runtime code here.
  // Cause and messageId both derive from the phrase key.
  if (irEntity.deadly) {
    entity.add(new DeadlyRoomTrait({
      cause: irEntity.deadly.phraseKey,
      messageId: irEntity.deadly.phraseKey,
    }));
  }
  // ADR-227: `<direction> is deadly: <phrase>` — collected here, lowered
  // to one command transformer in onEngineReady.
  // The conditional form (`is deadly while`) is post-scope; validateIR
  // refused it upstream (analysis.deadly-while-unsupported).
  for (const deadly of irEntity.deadlyExits) {
    const direction = toDirection(deadly.direction, irEntity);
    const byRoom = story.deadlyExits.get(entity.id) ?? new Map<string, DeadlyExitRecord>();
    byRoom.set(direction, { cause: deadly.phraseKey, messageId: deadly.phraseKey });
    story.deadlyExits.set(entity.id, byRoom);
  }
  if (irEntity.states.length > 0) {
    world.setStateValue(CHORD_STATE_PREFIX + irEntity.id, irEntity.states[0]);
  }
  // ADR-264 D1/D5: seed each per-entity counter's initial value; the state
  // bag serializes per key, so each instance round-trips independently.
  for (const counter of irEntity.counters) {
    world.setStateValue(counterKey(counter.name, irEntity.id), counter.starts);
  }
  // Z2 (ADR-211): compile `{key}` description markers onto ADR-209
  // snippet storage — atomically per entity, before the engine's
  // load-time `validateRoomSnippets` gate ever sees the texts. Rooms
  // and every other described entity alike (GH #364).
  compileDescriptionSnippets(story, world, irEntity, entity);
}

/**
 * Wire one exit line of a room: a plain two-way (or one-way) connection,
 * or a door exit through the one platform primitive. An `outside` exit is
 * wired as a computed exit elsewhere, and a door its mirror already wired
 * is verified and skipped. The reconciler calls this for an exit a story
 * edit added to a room the save already holds (ADR-388 D5).
 *
 * @param world the world
 * @param irEntity the room's IR
 * @param entity the room's world entity
 * @param exit the exit line
 */
export function wireExit(world: WorldModel, irEntity: IREntity, entity: IFEntity, exit: IRExit): void {
  // ADR-366 D7: `to outside` names no room — it is wired as the aboard
  // room's computed exit below, resolved on each use to the vehicle's room.
  if (exit.to.kind === 'outside') return;
  if (exit.to.kind === 'unresolved') throw new LoadError(`\`${irEntity.name}\`: the \`${exit.direction}\` exit names no room.`, exit.span);
  const toId = requireEntity(world, exit.to.id, irEntity).id;
  const direction = toDirection(exit.direction, irEntity);
  // `, one-way` (ADR-234 D4, GH #327): the written direction only —
  // no reverse exit is inferred, so a room reached by an authorial
  // move and left by walking has no back door. A passage is one-way
  // by construction (ADR-378 D1): there is no opposite of its words.
  const oneWay = exit.oneWay === true || isPassageKey(direction);
  if (exit.via === null) {
    // Defensive (Phase 8 #6, belt-and-suspenders with the analyzer's
    // door-plain-mirror gate): connectRooms stamps BOTH directions, so
    // a plain exit whose reverse side is already door-wired would
    // silently unwire that door. The compiler refuses this; reaching
    // here means rogue IR. A one-way exit stamps nothing on the far
    // room, so it cannot unwire anything.
    const targetRoomTrait = world.getEntity(toId)?.get(TraitType.ROOM) as RoomTrait | undefined;
    const reverseExit = oneWay ? undefined : targetRoomTrait?.exits?.[getOppositeDirection(direction as DirectionType)];
    if (!oneWay && reverseExit?.via && reverseExit.destination === entity.id) {
      throw new LoadError(
        `\`${irEntity.name}\`: plain \`${exit.direction}\` exit mirrors a door-wired exit on \`${exit.to.id}\` — rogue IR (the compiler's door-plain-mirror gate refuses this).`,
        exit.span,
      );
    }
    world.connectRooms(entity.id, toId, direction, undefined, { oneWay });
    return;
  }
  // ADR-234 D1/D2 via ADR-237 D4: the door exit wires through the
  // one platform primitive — DoorTrait attached here (room1 = the
  // declaring room, per the createDoor placement convention), then
  // connectRooms stamps `via` both directions and places the door.
  // A door wires exactly once: the analyzer's checkDoors gates
  // guarantee any second reference is the exact mirror, whose exits
  // the first wiring already stamped — verified, then skipped.
  const door = requireEntity(world, exit.via, irEntity);
  const doorId = door.id;
  const doorTrait = door.get(TraitType.DOOR) as DoorTrait | undefined;
  if (doorTrait) {
    const isMirror = doorTrait.room1 === toId && doorTrait.room2 === entity.id;
    if (!isMirror) {
      throw new LoadError(
        `\`${irEntity.name}\`: door \`${exit.via}\` is already wired to a different room pair — rogue IR (the compiler's door gates refuse this).`,
        exit.span,
      );
    }
    return;
  }
  door?.add(new DoorTrait({ room1: entity.id, room2: toId }));
  world.connectRooms(entity.id, toId, direction, doorId, { oneWay });
}

/** Chord exit word → world-model exit key, or a load error for a word that names none. */
export function toDirection(word: string, at?: IREntity): ExitKey {
  const dir = exitKeyOfWord(word);
  // A load-time fact, not a backstop: chord's closed exit DIRECTIONS set
  // (parser.ts) is a strict subset of the Direction enum, so gate-clean IR
  // cannot carry an unknown word here, and this fires only when the two
  // have drifted apart (pinned by the story-loader direction-conformance
  // test).
  if (!dir) throw new LoadError(`Unknown direction \`${word}\`.`, at?.span);
  return dir;
}
