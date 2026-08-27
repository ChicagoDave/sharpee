/**
 * examples.ts — seeded starter + example-picker stories for the playground.
 *
 * Every string here is single-file, hatch-free, and gate-clean under the
 * CURRENT (dotless) Chord — verified by `scripts/playground-examples-check.mjs`,
 * which compiles each one with the real @sharpee/chord and exits non-zero on
 * any diagnostic error. Run it after touching anything below.
 *
 * That claim used to be written here while the script did not exist — no file,
 * no git history — and every example duly rotted past Chord 3.0.0's fielded
 * story block (ADR-298), each opening with the removed positional
 * `story "Title" by "Author"` form and a removed `version:` key. Three errors
 * apiece, in the starter a first-time visitor sees before touching anything.
 * The header form is now: a bare `story` line, then indented `title:`,
 * `authors:`, `id:`, `story-version:`.
 *
 * NB: the docs/work/stdlib-cookbook/fixtures/*.story files are NOT usable yet —
 * they still carry pre-dotless `if.action.*` keys and fail to compile (a Phase 3
 * finding recorded in docs/work/playground-adr191/plan.md). Curate here until
 * those are migrated.
 *
 * Owner: website (not the platform workspace).
 */

export interface PlaygroundExample {
  /** Stable id (also the example-picker option value). */
  id: string;
  /** Human label for the picker. */
  label: string;
  /** The full .story source. */
  source: string;
}

const STARTER = `story
  title: Welcome to the Playground
  authors:
    You
  id: playground-starter
  story-version: 0.1.0

create the Study
  a room

  A snug study with a green-shaded lamp and one high window. A brass
  key lies on the desk. Try: look, examine the desk, take the key.

create the desk
  scenery
  in the Study

  A leather-topped writing desk, its surface scarred by decades of ink.

create the brass key
  aka key
  in the Study

  A small brass key, worn bright with handling.

  on the player taking
    phrase pocketed
  end on

create Alex
  a person
  playable
  starts in the Study

  You feel ready for anything.

define phrase pocketed
  You slip the key into your pocket. It feels important.
end phrase

before the game starts
  change the player to Alex
end before
`;

const TWO_ROOMS = `story
  title: Two Rooms and a Door
  authors:
    You
  id: playground-door
  story-version: 0.1.0

create the Kitchen
  a room
  north to the Hall through the oak door

  A tidy kitchen. A doorway leads north. Try: north, south, open the oak door.

create the Hall
  a room

  A long, panelled hall. The kitchen is back to the south.

create the oak door
  a door

  A heavy oak door, iron-banded.

create Alex
  a person
  playable
  starts in the Kitchen

  You.

before the game starts
  change the player to Alex
end before
`;

const LAMP_ROOM = `story
  title: The Lamp Room
  authors:
    You
  id: playground-lamp
  story-version: 0.1.0

create the Lamp Room
  a room

  Shelves of unlit lamps line every wall. Try: take the lantern, examine the statue.

create the brass lantern
  aka lantern
  in the Lamp Room

  A dented brass lantern with a wire handle.

create the marble statue
  aka statue
  scenery
  in the Lamp Room

  A blank-eyed statue, far too heavy to move.

create Alex
  a person
  playable
  starts in the Lamp Room

  You.

before the game starts
  change the player to Alex
end before
`;

const LOCKED_STUDY = `story
  title: The Locked Study
  authors:
    You
  id: playground-locked-study
  story-version: 0.1.0

create the Landing
  a room
  north to the Study through the study door

  A dim landing at the top of the stairs. An iron key hangs on a hook.
  Try: take the iron key, unlock the study door with the iron key, open the study door, north.

create the Study
  a room

  Bookshelves crowd every wall. You made it in.

create the study door
  a door, lockable with the iron key
  aka paneled door

  A paneled oak door with a heavy iron lock.

create the iron key
  aka key
  in the Landing

  Cold, old, and heavier than it looks.

create Alex
  a person
  playable
  starts in the Landing

  You.

before the game starts
  change the player to Alex
end before
`;

/** The story the editor opens with. */
export const STARTER_EXAMPLE: PlaygroundExample = {
  id: 'starter',
  label: 'Starter — a study and a key',
  source: STARTER,
};

/** The full example-picker list (starter first). */
export const EXAMPLES: PlaygroundExample[] = [
  STARTER_EXAMPLE,
  { id: 'two-rooms', label: 'Two rooms and a door', source: TWO_ROOMS },
  { id: 'lamp-room', label: 'The Lamp Room', source: LAMP_ROOM },
  { id: 'locked-study', label: 'The Locked Study (key + lock)', source: LOCKED_STUDY },
];
