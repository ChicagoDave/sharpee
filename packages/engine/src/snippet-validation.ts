/**
 * Load-time room-snippet validation (ADR-209 AC-5; ADR-211 AC-3 bare-fragment
 * gate).
 *
 * After a story's `initializeWorld` returns, every snippet-bearing room's
 * `description` and `initialDescription` are scanned with the shared
 * marker-extraction helper; a `{snippet:name}` marker with no entry in the
 * room's map fails story load synchronously, naming room and marker — the
 * same posture as `PhraseParseError`. Rooms without a snippet map are never
 * scanned (the opt-in rule, AC-7). Additionally (ADR-211), every LITERAL
 * snippet text must be a bare fragment: a non-empty text leading with
 * punctuation or whitespace fails load with the fix-it — the separator is
 * platform-owned. `{ messageId }` texts resolve at render and stay
 * render-graceful there (ADR-211 AC-10), never checked here.
 *
 * Public interface: `validateRoomSnippets`, `SnippetValidationError`.
 *
 * Owner context: `@sharpee/engine` — story-load orchestration
 * (`GameEngine.setStory`). Render-time degradation for maps mutated after
 * load lives in the room-description handler path, not here.
 */

import { extractSnippetMarkers } from '@sharpee/if-domain';
import type { SnippetEntry, SnippetText } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';
import { TraitType, RoomTrait, IdentityTrait } from '@sharpee/world-model';

/** Separator-shaped leading characters a bare fragment must not carry (ADR-211). */
const SEPARATOR_LED = /^[\s,.;:?!]/;

/** The literal texts of one snippet entry (messageId texts excluded — render-checked). */
function literalTexts(entry: SnippetEntry): string[] {
  if (typeof entry === 'string') return [entry];
  if (Array.isArray(entry)) return entry; // short form is string[] (Q3)
  if ('texts' in entry) {
    return entry.texts.flatMap((t: string | SnippetText) =>
      typeof t === 'string' ? [t] : 'text' in t ? [t.text] : [],
    );
  }
  return 'text' in entry ? [entry.text] : [];
}

/**
 * Story-load failure for room snippets: unbound `{snippet:name}` markers
 * (ADR-209 AC-5) and non-bare literal fragments (ADR-211 AC-3).
 */
export class SnippetValidationError extends Error {
  /** `(room, marker)` pairs with no snippet entry, in discovery order. */
  readonly unbound: ReadonlyArray<{ room: string; marker: string }>;
  /** `(room, marker, text)` triples whose literal text is not bare, in discovery order. */
  readonly notBare: ReadonlyArray<{ room: string; marker: string; text: string }>;

  constructor(
    unbound: Array<{ room: string; marker: string }>,
    notBare: Array<{ room: string; marker: string; text: string }> = [],
  ) {
    const lines = [
      ...unbound.map((u) => `  room "${u.room}": marker '${u.marker}' has no snippet entry`),
      ...notBare.map(
        (b) =>
          `  room "${b.room}": entry '${b.marker}' text ${JSON.stringify(b.text)} is not a bare ` +
          `fragment — write the fragment bare; the separator is platform-owned (ADR-211)`,
      ),
    ];
    super('Invalid room snippets:\n' + lines.join('\n'));
    this.name = 'SnippetValidationError';
    this.unbound = unbound;
    this.notBare = notBare;
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
  const notBare: Array<{ room: string; marker: string; text: string }> = [];

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

    // ADR-211 AC-3: every literal fragment text is bare. The empty string is
    // the legal absent-on-some-visits variant and is exempt.
    for (const [marker, entry] of Object.entries(snippets)) {
      for (const t of literalTexts(entry)) {
        if (t !== '' && SEPARATOR_LED.test(t)) {
          notBare.push({ room: room.name, marker, text: t });
        }
      }
    }
  }

  if (unbound.length > 0 || notBare.length > 0) {
    throw new SnippetValidationError(unbound, notBare);
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
