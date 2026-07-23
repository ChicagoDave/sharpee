/**
 * examples.ts — seeded starter + example-picker stories for the playground.
 *
 * Every string here is single-file, hatch-free, and gate-clean under the
 * CURRENT (dotless) Chord — verified by `scripts/playground-examples-check.mjs`.
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

const STARTER = `story "Welcome to the Playground" by "You"
  id: playground-starter
  version: 0.1.0

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

  on taking it
    phrase pocketed
  end on

create the player
  starts in the Study

  You feel ready for anything.

define phrase pocketed
  You slip the key into your pocket. It feels important.
end phrase
`;

const TWO_ROOMS = `story "Two Rooms and a Door" by "You"
  id: playground-door
  version: 0.1.0

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

create the player
  starts in the Kitchen

  You.
`;

const LAMP_ROOM = `story "The Lamp Room" by "You"
  id: playground-lamp
  version: 0.1.0

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

create the player
  starts in the Lamp Room

  You.
`;

const LOCKED_STUDY = `story "The Locked Study" by "You"
  id: playground-locked-study
  version: 0.1.0

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

create the player
  starts in the Landing

  You.
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
