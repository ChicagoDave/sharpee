/**
 * Load-time room-snippet validation (ADR-209 AC-5).
 *
 * After a story's `initializeWorld` returns, every snippet-bearing room's
 * `description` and `initialDescription` are scanned with the shared
 * marker-extraction helper; a `{snippet:name}` marker with no entry in the
 * room's map fails story load synchronously, naming room and marker — the
 * same posture as `PhraseParseError`. Rooms without a snippet map are never
 * scanned (the opt-in rule, AC-7).
 *
 * Public interface: `validateRoomSnippets`, `SnippetValidationError`.
 *
 * Owner context: `@sharpee/engine` — story-load orchestration
 * (`GameEngine.setStory`). Render-time degradation for maps mutated after
 * load lives in the room-description handler path, not here.
 */

import { extractSnippetMarkers } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';
import { TraitType, RoomTrait, IdentityTrait } from '@sharpee/world-model';

/** Story-load failure for an unbound `{snippet:name}` marker (ADR-209 AC-5). */
export class SnippetValidationError extends Error {
  /** `(room, marker)` pairs with no snippet entry, in discovery order. */
  readonly unbound: ReadonlyArray<{ room: string; marker: string }>;

  constructor(unbound: Array<{ room: string; marker: string }>) {
    super(
      'Unbound snippet markers:\n' +
        unbound.map((u) => `  room "${u.room}": marker '${u.marker}' has no snippet entry`).join('\n'),
    );
    this.name = 'SnippetValidationError';
    this.unbound = unbound;
  }
}

/**
 * Validate every snippet-bearing room's descriptions against its snippet map.
 *
 * @param world the initialized world model (after `initializeWorld`)
 * @throws SnippetValidationError naming every unbound `(room, marker)` pair
 */
export function validateRoomSnippets(world: WorldModel): void {
  const unbound: Array<{ room: string; marker: string }> = [];

  for (const room of world.findByTrait(TraitType.ROOM)) {
    const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
    const snippets = roomTrait?.snippets;
    if (!snippets) continue; // opt-in: no map, no scan

    const identity = room.get<IdentityTrait>(TraitType.IDENTITY);
    const texts = [identity?.description, roomTrait?.initialDescription];
    for (const text of texts) {
      if (!text) continue;
      for (const marker of extractSnippetMarkers(text)) {
        if (!(marker in snippets)) {
          unbound.push({ room: room.name, marker });
        }
      }
    }
  }

  if (unbound.length > 0) {
    throw new SnippetValidationError(unbound);
  }
}

/**
 * Lint for snippet entries whose marker appears in NEITHER description text
 * (ADR-209 AC-6, resolution Q4): usually mid-edit author drift. A warning,
 * never an error — an unused entry renders nothing, unlike an unbound marker
 * which puts broken text on screen. The devkit build prints these.
 *
 * @param world the initialized world model
 * @returns `(room, entry)` pairs with no matching marker, in discovery order
 */
export function lintUnusedSnippetEntries(
  world: WorldModel,
): Array<{ room: string; entry: string }> {
  const unused: Array<{ room: string; entry: string }> = [];

  for (const room of world.findByTrait(TraitType.ROOM)) {
    const roomTrait = room.get<RoomTrait>(TraitType.ROOM);
    const snippets = roomTrait?.snippets;
    if (!snippets) continue;

    const identity = room.get<IdentityTrait>(TraitType.IDENTITY);
    const used = new Set<string>(
      [identity?.description, roomTrait?.initialDescription]
        .filter((t): t is string => Boolean(t))
        .flatMap((t) => extractSnippetMarkers(t)),
    );
    for (const entry of Object.keys(snippets)) {
      if (!used.has(entry)) {
        unused.push({ room: room.name, entry });
      }
    }
  }

  return unused;
}
