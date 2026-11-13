/**
 * claims-game.ts — the slice of a booted game the claims walk reads.
 *
 * Purpose: name exactly what the walk needs from the world, the engine and
 * the game wrapper, so a real `LoadedGame` from bootstrap satisfies it
 * structurally and a test can read the contract in one place. The walk
 * forks the engine through its save/restore hooks and hashes the world
 * through its own serializer, so the snapshot that serializer produces is
 * typed here too — only the fields the identity and the predicates read.
 *
 * Public interface: `ClaimsGame`, `ClaimsGameLoader`, `ClaimsWorld`,
 *   `ClaimsEntity`, `ClaimsEngine`, `ClaimsTurnEvent`, `WorldSnapshot`,
 *   `SnapshotValue`, `readWorldSnapshot`, `irIdOf`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { CHORD_IR_ID_ATTRIBUTE } from '@sharpee/story-loader';
import type { SaveForkPlatform } from '@sharpee/transcript-tester';
import type { GameLoadRequest } from '../game-load-request.js';

/** An entity as the walk reads it. */
export interface ClaimsEntity {
  readonly id: string;
  readonly name: string;
  readonly attributes: Record<string, unknown>;
  has(traitType: string): boolean;
  get(traitType: string): unknown;
}

/** The world as the walk reads it — `WorldModel`'s own surface, narrowed. */
export interface ClaimsWorld {
  /** Whether any actor holds the player role (ADR-390 D1). */
  readonly hasPlayerCharacter: boolean;
  /** The actor holding the player role; throws when none does. */
  readonly playerCharacter: ClaimsEntity;
  getEntity(id: string): ClaimsEntity | undefined;
  getAllEntities(): ClaimsEntity[];
  getLocation(entityId: string): string | undefined;
  getContents(containerId: string): ClaimsEntity[];
  getContainingRoom(entityId: string): ClaimsEntity | undefined;
  getVisible(observerId: string): ClaimsEntity[];
  getEnding(): { readonly kind: string; readonly messageId?: string; readonly cause?: string } | undefined;
  /** The world's canonical snapshot — what the identity hashes. */
  toJSON(): string;
}

/** One event of a turn, as an event claim reads it. */
export interface ClaimsTurnEvent {
  readonly type: string;
  readonly data?: unknown;
}

/** The engine as the walk drives it: the fork, the turn and the language. */
export interface ClaimsEngine extends SaveForkPlatform {
  /** The engine's own turn entry, so the turn's events come back for event claims. */
  executeTurn(input: string): Promise<{ events?: readonly ClaimsTurnEvent[] }>;
  getLanguageProvider(): { getActionPatterns(actionId: string): string[] | undefined };
}

/** A booted game the walk can fork. */
export interface ClaimsGame {
  readonly world: ClaimsWorld;
  readonly engine: ClaimsEngine;
  /** The wrapper's command entry, used once to settle the opening turn. */
  executeCommand(input: string): Promise<string> | string;
}

/**
 * Boots one fresh game at the pinned seed — supplied by the caller, who owns
 * the seed. A walk's commands come from its candidate generator, which
 * writes exits and verbs on things and never the undo command, so a walk
 * always asks for a game that keeps no undo snapshots.
 */
export type ClaimsGameLoader = (request: GameLoadRequest) => Promise<ClaimsGame>;

/** A value in the world's JSON snapshot. */
export type SnapshotValue = string | number | boolean | null | readonly SnapshotValue[] | { readonly [key: string]: SnapshotValue | undefined };

/** One trait of a snapshot entity: its type and its data. */
export type SnapshotTrait = { readonly [field: string]: SnapshotValue | undefined };

/** One entity row of the snapshot. */
export type SnapshotEntityRow = {
  readonly id: string;
  readonly entity?: {
    readonly [field: string]: SnapshotValue | undefined;
    readonly attributes?: { readonly [name: string]: SnapshotValue | undefined };
    readonly traits?: readonly SnapshotTrait[];
  };
};

/** One capability of the snapshot: its name, its data and its schema. */
export type SnapshotCapability = { readonly [field: string]: SnapshotValue | undefined; readonly name: string };

/**
 * The parsed world snapshot. The parts the predicates and the identity read
 * by name are typed; every other part the serializer writes is still here,
 * under the index signature, because the identity hashes the snapshot whole
 * (`claim-identity`).
 */
export interface WorldSnapshot {
  readonly [part: string]: SnapshotValue | undefined;
  /** The role holder's id, read from the live world at capture (ADR-390 D1: the snapshot itself carries no player id). */
  readonly playerId?: string;
  readonly entities?: readonly SnapshotEntityRow[];
  readonly spatialIndex?: { readonly parentToChildren?: ReadonlyArray<{ readonly parent: string; readonly children?: readonly string[] }> };
  readonly state?: { readonly [key: string]: SnapshotValue | undefined };
  readonly scoreLedger?: SnapshotValue;
  readonly capabilities?: readonly SnapshotCapability[];
}

/**
 * Parse the world's canonical snapshot.
 *
 * @param world the live world
 * @returns the snapshot's fields the walk reads
 */
export function readWorldSnapshot(world: ClaimsWorld): WorldSnapshot {
  const parsed = JSON.parse(world.toJSON()) as WorldSnapshot;
  // ADR-390 D1: the world stores no player id — the role flag rides the
  // actor — so the walk's identity takes the holder from the live world.
  return { ...parsed, playerId: world.hasPlayerCharacter ? world.playerCharacter.id : undefined };
}

/**
 * The IR id the Chord loader stamped on a runtime entity.
 *
 * @param entity a runtime entity, or nothing
 * @returns the IR id, or undefined when the entity carries none
 */
export function irIdOf(entity: ClaimsEntity | undefined): string | undefined {
  const value = entity?.attributes[CHORD_IR_ID_ATTRIBUTE];
  return typeof value === 'string' ? value : undefined;
}
