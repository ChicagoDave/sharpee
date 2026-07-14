/**
 * Tests for load-time room-snippet validation (ADR-209 AC-5; ADR-211 AC-3
 * bare-fragment gate).
 *
 * Behavior Statement (validateRoomSnippets):
 *   DOES   throw SnippetValidationError naming every (room, marker) pair where
 *          a snippet-bearing room's description or initialDescription carries
 *          a {snippet:name} with no map entry, AND every (room, marker, text)
 *          whose literal snippet text leads with punctuation/whitespace (the
 *          ADR-211 bare-fragment gate; '' is the legal empty variant and
 *          exempt; { messageId } texts resolve at render and are not checked
 *          here); mutates nothing.
 *   WHEN   GameEngine.setStory calls it right after initializeWorld returns.
 *   BECAUSE an unbound marker puts broken text on screen, and a non-bare
 *          fragment would double-separate under the platform join rule —
 *          fail loudly at load, the PhraseParseError posture.
 *   REJECTS never for rooms without a map (opt-in, AC-7), and never for
 *          unused entries (that asymmetry is the devkit lint, AC-6).
 *
 * Owner context: @sharpee/engine — story-load orchestration
 */

import {
  validateRoomSnippets,
  lintUnusedSnippetEntries,
  SnippetValidationError,
} from '../../src/snippet-validation';
import {
  WorldModel,
  RoomTrait,
  IdentityTrait,
  EntityType,
} from '@sharpee/world-model';
import type { SnippetMap } from '@sharpee/world-model';

function makeRoom(
  world: WorldModel,
  name: string,
  description: string,
  snippets?: SnippetMap,
  initialDescription?: string,
) {
  const room = world.createEntity(name, EntityType.ROOM);
  room.add(new RoomTrait({ snippets, initialDescription }));
  room.add(new IdentityTrait({ name, description }));
  return room;
}

describe('validateRoomSnippets (ADR-209 AC-5)', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('passes a world with no snippet-bearing rooms, including descriptions with literal braces (AC-7)', () => {
    makeRoom(world, 'Plain Room', 'A plain room.');
    makeRoom(world, 'Braces Room', 'A sign reads {snippet:not-scanned}.'); // no map → never scanned
    expect(() => validateRoomSnippets(world)).not.toThrow();
  });

  it('passes a snippet-bearing room whose markers are all bound (bare fragments)', () => {
    makeRoom(world, 'Study', 'A doorway{snippet:cabinet} and a fireplace{snippet:mantel}.', {
      cabinet: 'next to a cabinet',
      mantel: ['the mantel holding keepsakes'],
    });
    expect(() => validateRoomSnippets(world)).not.toThrow();
  });

  it('fails load synchronously, naming room and marker, for an unbound marker in description', () => {
    makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', { mantel: 'x' });
    expect(() => validateRoomSnippets(world)).toThrow(SnippetValidationError);
    expect(() => validateRoomSnippets(world)).toThrow(/room "Study": marker 'cabinet'/);
  });

  it('scans initialDescription with the same map (resolution Q5)', () => {
    makeRoom(
      world,
      'Foyer',
      'The foyer.',
      { rug: 'a worn rug underfoot' },
      'You step into the foyer{snippet:rug}{snippet:chandelier}.',
    );
    expect(() => validateRoomSnippets(world)).toThrow(/room "Foyer": marker 'chandelier'/);
  });

  it('names every unbound (room, marker) pair, not just the first', () => {
    makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', {});
    makeRoom(world, 'Foyer', 'A rug{snippet:rug}.', {});
    try {
      validateRoomSnippets(world);
      throw new Error('expected SnippetValidationError');
    } catch (e) {
      const err = e as SnippetValidationError;
      expect(err.name).toBe('SnippetValidationError');
      expect(err.unbound).toEqual([
        { room: 'Study', marker: 'cabinet' },
        { room: 'Foyer', marker: 'rug' },
      ]);
    }
  });

  it('does not throw for an unused snippet entry (that is the devkit lint, AC-6)', () => {
    makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', {
      cabinet: 'next to a cabinet',
      unused: 'never spliced',
    });
    expect(() => validateRoomSnippets(world)).not.toThrow();
  });

  describe('bare-fragment gate (ADR-211 AC-3)', () => {
    it('fails load for a comma-led string entry, naming room/entry with the fix-it', () => {
      makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', {
        cabinet: ', next to a cabinet',
      });
      expect(() => validateRoomSnippets(world)).toThrow(SnippetValidationError);
      expect(() => validateRoomSnippets(world)).toThrow(
        /room "Study": entry 'cabinet' .* is not a bare fragment — write the fragment bare/,
      );
    });

    it('fails load for a whitespace-led variant in a list or long-form entry', () => {
      makeRoom(world, 'Foyer', 'A rug{snippet:rug} and dust{snippet:dust}.', {
        rug: ['a worn rug', ' a leading-space variant'],
        dust: { selector: 'cycling', texts: ['thick dust', { text: '\tthin dust' }] },
      });
      try {
        validateRoomSnippets(world);
        throw new Error('expected SnippetValidationError');
      } catch (e) {
        const err = e as SnippetValidationError;
        expect(err.notBare).toEqual([
          { room: 'Foyer', marker: 'rug', text: ' a leading-space variant' },
          { room: 'Foyer', marker: 'dust', text: '\tthin dust' },
        ]);
      }
    });

    it('the empty string is the legal empty variant — exempt from the gate', () => {
      makeRoom(world, 'Study', 'A doorway{snippet:pins}.', {
        pins: ['a spinning rack of pins', ''],
      });
      expect(() => validateRoomSnippets(world)).not.toThrow();
    });

    it('{ messageId } texts are not checked at load (render-graceful there, AC-10)', () => {
      makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', {
        cabinet: { messageId: 'story.snippets.cabinet' }, // may resolve non-bare; render logs it
      });
      expect(() => validateRoomSnippets(world)).not.toThrow();
    });

    it('reports unbound markers and non-bare texts together in one error', () => {
      makeRoom(world, 'Study', 'A doorway{snippet:missing}.', {
        cabinet: ', next to a cabinet', // unused AND non-bare — still gated
      });
      try {
        validateRoomSnippets(world);
        throw new Error('expected SnippetValidationError');
      } catch (e) {
        const err = e as SnippetValidationError;
        expect(err.unbound).toEqual([{ room: 'Study', marker: 'missing' }]);
        expect(err.notBare).toEqual([
          { room: 'Study', marker: 'cabinet', text: ', next to a cabinet' },
        ]);
      }
    });
  });
});

describe('lintUnusedSnippetEntries (ADR-209 AC-6)', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('returns [] when every entry has a marker in description or initialDescription', () => {
    makeRoom(
      world,
      'Study',
      'A doorway{snippet:cabinet}.',
      { cabinet: 'x', rug: 'y' },
      'First visit{snippet:rug}.',
    );
    expect(lintUnusedSnippetEntries(world)).toEqual([]);
  });

  it('names room and entry for entries whose marker appears in neither text', () => {
    makeRoom(world, 'Study', 'A doorway{snippet:cabinet}.', {
      cabinet: 'x',
      mantel: 'never spliced',
    });
    expect(lintUnusedSnippetEntries(world)).toEqual([{ room: 'Study', entry: 'mantel' }]);
  });

  it('ignores rooms without a snippet map', () => {
    makeRoom(world, 'Plain Room', 'A plain room.');
    expect(lintUnusedSnippetEntries(world)).toEqual([]);
  });
});
