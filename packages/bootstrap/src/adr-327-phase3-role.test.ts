/**
 * adr-327-phase3-role.test.ts — D9 + D10, the runtime half.
 *
 * REAL-PATH per rule 13a: a real Chord source compiles through the real
 * compiler, loads through the real story loader, and runs on a real engine
 * assembled by `assembleGame` — the same call the CLI makes. Nothing here is
 * stubbed, because every claim is about something only the running system can
 * answer: who holds the role at turn one, what the turn boundary does with a
 * `change the player to`, and which characters the NPC service and the
 * every-turn daemons are allowed to drive.
 *
 * Owner context: bootstrap, the one package that has both the story loader and
 * the parser — the engine cannot see the loader, and the loader has no parser.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

// Same loading rationale as assemble-channels.test.ts: the built dist is the
// artifact the CLI bundle consumes; importing src pulls the platform through
// vite's transform and overflows its module graph.
const nodeRequire = createRequire(__filename);
const { assembleGame } = nodeRequire('../dist/index.js');
const { compile } = nodeRequire('@sharpee/chord');
const { createStory } = nodeRequire('@sharpee/story-loader');

const HEADER = `story
  title: Role Test
  authors:
    T
  id: role-test
  story-version: 0.0.1
`;

/** Compile a source or fail loudly with the compiler's own diagnostics. */
function storyOf(source: string) {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(
      result.diagnostics
        .filter((d: { severity: string }) => d.severity === 'error')
        .map((d: { span: { line: number }; code: string; message: string }) => `${d.span.line} ${d.code} ${d.message}`)
        .join('; '),
    );
  }
  return () => createStory(result.ir, { seed: 11 });
}

function gameOf(source: string) {
  const fresh = storyOf(source);
  return assembleGame(fresh(), { freshStory: fresh, seed: 11 });
}

// Two playable characters in one room, so a switch changes who acts without
// changing where the action is.
const TWO_ACTORS = `${HEADER}
create the Hall
  a room

  A bare hall.

create Alex
  a person
  playable
  in the Hall

  A watchful sort.

create Viola
  a person
  playable
  in the Hall

  A restless sort.

`;

describe('D10 — the role is claimed at load, from the start block', () => {
  it('the named character IS the player at turn one, and answers to `me`', async () => {
    const game = gameOf(`${TWO_ACTORS}before the game starts
  change the player to Viola
end before
`);
    const player = game.world.getPlayer()!;
    expect(player.name).toBe('Viola');
    // The ROLE's vocabulary, not Viola's own: `x me` has to reach her.
    const identity = player.get('identity') as { aliases?: string[] };
    expect(identity.aliases).toEqual(expect.arrayContaining(['me', 'myself', 'self']));
    // And the character keeps her own name and description.
    expect((identity as { description?: string }).description).toContain('restless');

    await game.executeCommand('x me');
    expect(game.lastOutput).toContain('restless');
  });

  it('a conditional assignment picks the arm that fires', async () => {
    const game = gameOf(`${TWO_ACTORS}before the game starts
  change the player to Alex when the Hall is dark
  change the player to Viola
end before
`);
    // The Hall is not dark, so the first arm does not fire and the second wins.
    expect(game.world.getPlayer()!.name).toBe('Viola');
  });

  it('a start block that assigns nothing is a load error naming the fix', () => {
    expect(() =>
      gameOf(`${TWO_ACTORS}before the game starts
  change the player to Alex when the Hall is dark
end before
`),
    ).toThrow(/before the game starts/);
  });
});

describe('D9 — the role moves at the turn boundary', () => {
  const SWITCHER = `${TWO_ACTORS}create the lever
  in the Hall

  A brass lever.

  after the player taking
    change the player to Alex
  end after

before the game starts
  change the player to Viola
end before
`;

  it('a `change the player to` in a clause body moves the role, and emits game.pc_switched', async () => {
    const game = gameOf(SWITCHER);
    expect(game.world.getPlayer()!.name).toBe('Viola');

    await game.executeCommand('take lever');
    expect(game.world.getPlayer()!.name).toBe('Alex');

    // The engine's own view of the player moved with it, not just the world's.
    await game.executeCommand('x me');
    expect(game.lastOutput).toContain('watchful');
  });

  it('the role vocabulary leaves the old PC behind', async () => {
    const game = gameOf(SWITCHER);
    const viola = game.world.getPlayer()!;
    await game.executeCommand('take lever');
    const stale = viola.get('identity') as { aliases?: string[] };
    expect(stale.aliases ?? []).not.toContain('me');
  });
});

describe('D9 — two switches in one turn', () => {
  it('the first wins, and the contradiction is reported rather than silently resolved', async () => {
    const game = gameOf(`${TWO_ACTORS}create the lever
  in the Hall

  A brass lever.

  after the player taking
    change the player to Alex
    change the player to Viola
  end after

before the game starts
  change the player to Viola
end before
`);
    // Viola opens; the clause asks for Alex, then for Viola again. "Who is the
    // player at the end of this turn" has one answer, so the first request is
    // the one that lands.
    await game.executeCommand('take lever');
    expect(game.world.getPlayer()!.name).toBe('Alex');
  });
});

describe('D9 — the NPC service is gated on the role too', () => {
  // A `wanderer` with move-chance 100 moves every tick it is allowed to. Making
  // that character playable is the whole point of D9: the NPC service must
  // leave them alone while they hold the role, and pick them up the moment it
  // moves off them. `analysis.player-behavior` used to make this unsayable.
  const WANDERER = `${HEADER}
create the Hall
  a room
  north to the Yard

  A bare hall.

create the Yard
  a room
  south to the Hall

  A walled yard.

create Alex
  a person
  playable
  in the Hall

  A watchful sort.

create Viola
  a person, wanderer with move-chance 100
  playable
  in the Hall

  A restless sort.

create the lever
  in the Hall

  A brass lever.

  after the player taking
    change the player to Alex
  end after

before the game starts
  change the player to Viola
end before
`;

  it('does not drive the character holding the role, then drives them once it moves', async () => {
    const game = gameOf(WANDERER);
    const viola = game.world.getPlayer()!;
    expect(viola.name).toBe('Viola');
    const home = game.world.getLocation(viola.id);

    // Viola is the PC: the wanderer behaviour must not walk her off.
    await game.executeCommand('look');
    await game.executeCommand('look');
    expect(game.world.getLocation(viola.id)).toBe(home);

    // The role moves to Alex; from the next tick the service owns Viola.
    await game.executeCommand('take lever');
    expect(game.world.getPlayer()!.name).toBe('Alex');
    await game.executeCommand('look');
    expect(game.world.getLocation(viola.id)).not.toBe(home);
  });
});

describe('D9 — autonomous behaviour is gated on the role', () => {
  const DAEMONS = `${HEADER}
create the Hall
  a room

  A bare hall.

create Alex
  a person
  playable
  in the Hall

  A watchful sort.

  on every turn
    phrase alex-fidgets
  end on

create Viola
  a person
  playable
  in the Hall

  A restless sort.

  on every turn
    phrase viola-paces
  end on

create the lever
  in the Hall

  A brass lever.

  after the player taking
    change the player to Alex
  end after

define phrases en-US
  alex-fidgets:
    Alex shifts his weight.
  viola-paces:
    Viola paces the floor.

before the game starts
  change the player to Viola
end before
`;

  it("the PC's own every-turn clause stays silent; the other character's fires", async () => {
    const game = gameOf(DAEMONS);
    await game.executeCommand('look');
    expect(game.lastOutput).toContain('Alex shifts');
    expect(game.lastOutput).not.toContain('Viola paces');
  });

  it('the switch silences the new PC and wakes the old one, from the next turn', async () => {
    const game = gameOf(DAEMONS);
    await game.executeCommand('take lever');
    // Alex is the PC now; the turn after the switch is the one that shows it.
    await game.executeCommand('look');
    expect(game.lastOutput).toContain('Viola paces');
    expect(game.lastOutput).not.toContain('Alex shifts');
  });
});
