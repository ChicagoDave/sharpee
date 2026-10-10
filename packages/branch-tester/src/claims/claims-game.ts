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
 *   `readWorldSnapshot`, `irIdOf`.
 * Owner context: @sharpee/branch-tester — the claims runner (ADR-365 D10).
 */

import { CHORD_IR_ID_ATTRIBUTE } from '@sharpee/story-loader';
import type { SaveForkPlatform } from '@sharpee/transcript-tester';

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
  getPlayer(): ClaimsEntity | undefined;
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

/** Boots one fresh game at the pinned seed — supplied by the caller, who owns the seed. */
export type ClaimsGameLoader = () => Promise<ClaimsGame>;

/** The parsed world snapshot — the fields the identity and the predicates read. */
export interface WorldSnapshot {
  readonly playerId?: string;
  readonly entities?: ReadonlyArray<{
    readonly id: string;
    readonly entity?: {
      readonly attributes?: Record<string, unknown>;
      readonly traits?: ReadonlyArray<{ readonly type?: string } & Record<string, unknown>>;
    };
  }>;
  readonly spatialIndex?: { readonly parentToChildren?: ReadonlyArray<{ readonly parent: string; readonly children?: readonly string[] }> };
  readonly state?: Record<string, unknown>;
  readonly scoreLedger?: unknown;
}

/**
 * Parse the world's canonical snapshot.
 *
 * @param world the live world
 * @returns the snapshot's fields the walk reads
 */
export function readWorldSnapshot(world: ClaimsWorld): WorldSnapshot {
  return JSON.parse(world.toJSON()) as WorldSnapshot;
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
