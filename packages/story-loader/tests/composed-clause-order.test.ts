/**
 * composed-clause-order.test.ts — every clause a thing carries for one
 * action is consulted: its own clauses, then its composed traits' in the
 * order written (GH #708, GH #332), and a trait's guarded clause that sits
 * out leaves the owner's topic table to answer (GH #350). A clause that
 * says `, before <trait>` or `, after <trait>` is placed by that word, and
 * an order that cannot be honored refuses to load. The topic table answers
 * once however its owner's clauses are ordered. Run through real engine
 * turns: the real parser, the standard actions, the loader's own binding.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, clause binding.
 */
import { describe, expect, it } from 'vitest';
import { traitClausePriority } from '../src/clause-order';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { bootTurns, compileSource } from './helpers/boot-turns';

const HEAD = `story
  title: Bell Room
  authors:
    T
  id: bell-room
  story-version: 0.0.1

`;

const ALEX = `
create Alex
  a person
  playable
  starts in the Bell Room

  You.

before the game starts
  change the player to Alex
end before
`;

const SOURCE = `${HEAD}define trait corded
  on the player pulling
    the charm must be in the tin: no-charm
    phrase cord-gives
  end on
end trait

define trait stuck
  on the player pulling
    refuse when it is in the Bell Room: stuck-fast
  end on
end trait

define trait jammed
  on the player pulling
    refuse when it is in the Bell Room: jammed-tight
  end on
end trait

define trait barred
  on the player pulling, before stuck
    refuse when it is in the Bell Room: barred-shut
  end on
end trait

define trait latched
  on the player pulling, after stuck
    refuse when it is in the Bell Room: latched-down
  end on
end trait

define trait chiming
  after the player pulling
    phrase chime-rings
  end after
end trait

create the Bell Room
  a room

  A room of ropes.

create the tin
  a container, singular
  in the Bell Room

  A tin.

create the charm
  a thing, singular
  in the tin

  A charm.

create the lens
  a thing, singular
  in the Bell Room

  A lens.

create the lantern
  a container, singular, corded
  states: dim, glowing
  in the Bell Room

  A lantern.

  on the player pulling
    the lens must be in the lantern: lantern-empty
  end on

  after the player pulling
    change the lantern to glowing
    phrase lantern-glows
  end after

create the censer
  a thing, singular, corded, chiming
  states: cold, smoking
  in the Bell Room

  A censer.

  after the player pulling
    change the censer to smoking
    phrase censer-smokes
  end after

create the bell
  a thing, singular, stuck
  in the Bell Room

  A bell.

  on the player pulling
    refuse when the bell is in the Bell Room: own-refusal
  end on

create the gong
  a thing, singular, stuck
  in the Bell Room

  A gong.

  on the player pulling, after stuck
    refuse when the gong is in the Bell Room: own-refusal
  end on

create the drum
  a thing, singular, stuck
  in the Bell Room

  A drum.

  on the player pulling, before stuck
    refuse when the drum is in the Bell Room: own-refusal
  end on

create the lamp
  a thing, singular, corded
  states: cold, warm
  in the Bell Room

  A lamp.

  on the player pulling, after corded
    change the lamp to warm
    phrase own-words
  end on

create the torch
  a thing, singular, corded
  states: cold, warm
  in the Bell Room

  A torch.

  on the player pulling
    change the torch to warm
    phrase own-words
  end on

create the chime
  a thing, singular, stuck, jammed
  in the Bell Room

  A chime.

create the rattle
  a thing, singular, jammed, stuck
  in the Bell Room

  A rattle.

create the shutter
  a thing, singular, stuck, barred
  in the Bell Room

  A shutter.

create the hatch
  a thing, singular, latched, stuck
  in the Bell Room

  A hatch.
${ALEX}
define phrase no-charm
  The cord wants the charm in the tin.
end phrase

define phrase cord-gives
  The cord gives.
end phrase

define phrase lantern-empty
  The lantern has no lens.
end phrase

define phrase lantern-glows
  The lantern glows.
end phrase

define phrase censer-smokes
  The censer smokes.
end phrase

define phrase chime-rings
  A chime rings.
end phrase

define phrase stuck-fast
  It is stuck fast.
end phrase

define phrase jammed-tight
  It is jammed tight.
end phrase

define phrase barred-shut
  It is barred shut.
end phrase

define phrase latched-down
  It is latched down.
end phrase

define phrase own-refusal
  This one refuses in its own words.
end phrase

define phrase own-words
  It answers in its own words.
end phrase
`;

describe('a thing\'s own clauses and its trait\'s clauses for one action (GH #708)', () => {
  it('checks the thing\'s own requirement when the trait\'s is met', async () => {
    const b = await bootTurns(SOURCE);
    const pulled = await b.turnText('pull lantern');
    expect(pulled.text).toContain('The lantern has no lens.');
    expect(pulled.text).not.toContain('The cord gives.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lantern')).not.toBe('glowing');
  });

  it('runs the thing\'s own `after` clause beside the trait\'s `on` clause', async () => {
    const b = await bootTurns(SOURCE);
    b.world.moveEntity(b.id('lens'), b.id('lantern'));
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lantern')).not.toBe('glowing');
    const pulled = await b.turnText('pull lantern');
    expect(pulled.text).toContain('The cord gives.');
    expect(pulled.text).toContain('The lantern glows.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lantern')).toBe('glowing');
  });

  it('still checks the trait\'s requirement when the thing\'s own is met', async () => {
    const b = await bootTurns(SOURCE);
    b.world.moveEntity(b.id('lens'), b.id('lantern'));
    b.world.moveEntity(b.id('charm'), b.id('bell-room'));
    const pulled = await b.turnText('pull lantern');
    expect(pulled.text).toContain('The cord wants the charm in the tin.');
    expect(pulled.text).not.toContain('The lantern glows.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lantern')).not.toBe('glowing');
  });

  it('runs an own `after` with no own `on`, and a second trait\'s `after`, beside the trait\'s `on`', async () => {
    const b = await bootTurns(SOURCE);
    const pulled = await b.turnText('pull censer');
    expect(pulled.text).toContain('The cord gives.');
    expect(pulled.text).toContain('The censer smokes.');
    expect(pulled.text).toContain('A chime rings.');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'censer')).toBe('smoking');
  });
});

describe('the order clauses are consulted in', () => {
  it('asks the thing\'s own clause before its trait\'s', async () => {
    const b = await bootTurns(SOURCE);
    const pulled = await b.turnText('pull bell');
    expect(pulled.text).toContain('This one refuses in its own words.');
    expect(pulled.text).not.toContain('It is stuck fast.');
  });

  it('asks an own clause marked `, after <trait>` behind the trait\'s', async () => {
    const b = await bootTurns(SOURCE);
    const pulled = await b.turnText('pull gong');
    expect(pulled.text).toContain('It is stuck fast.');
    expect(pulled.text).not.toContain('This one refuses in its own words.');
  });

  it('runs an own clause marked `, after <trait>` behind the trait\'s: its change lands and the trait\'s phrase answers first', async () => {
    const b = await bootTurns(SOURCE);
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lamp')).not.toBe('warm');
    const late = await b.turnText('pull lamp');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'lamp')).toBe('warm');
    expect(late.text).toContain('The cord gives.');
    expect(late.text).not.toContain('It answers in its own words.');

    // The same thing without the word: its own phrase answers first.
    const front = await b.turnText('pull torch');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'torch')).toBe('warm');
    expect(front.text).toContain('It answers in its own words.');
    expect(front.text).not.toContain('The cord gives.');
  });

  it('leaves an own clause marked `, before <trait>` in front, where it already stands', async () => {
    const b = await bootTurns(SOURCE);
    const pulled = await b.turnText('pull drum');
    expect(pulled.text).toContain('This one refuses in its own words.');
  });

  it('asks two composed traits in the order they are written (GH #332)', async () => {
    const b = await bootTurns(SOURCE);
    expect((await b.turnText('pull chime')).text).toContain('It is stuck fast.');
    expect((await b.turnText('pull rattle')).text).toContain('It is jammed tight.');
  });

  it('places a trait clause marked `, before <trait>` ahead of that trait, whatever order they are written in', async () => {
    const b = await bootTurns(SOURCE);
    expect((await b.turnText('pull shutter')).text).toContain('It is barred shut.');
  });

  it('places a trait clause marked `, after <trait>` behind that trait, whatever order they are written in', async () => {
    const b = await bootTurns(SOURCE);
    expect((await b.turnText('pull hatch')).text).toContain('It is stuck fast.');
  });
});

const DANCE = `${HEAD}define trait hand-of-the-dance
  on the player asking while it is waiting
    refuse not-your-hand
  end on
end trait

create the Bell Room
  a room

  A room of ropes.

create Mara
  a person, hand-of-the-dance
  states: dancing, waiting
  in the Bell Room

  A dancer.

define topics for Mara
  about "the weather":
    phrase mara-weather
end topics

create the cord
  a thing, singular
  in the Bell Room

  A cord.

  on the player pulling
    change Mara to waiting
    phrase music-stops
  end on
${ALEX}
define phrase not-your-hand
  She is not your hand in this dance.
end phrase

define phrase mara-weather
  "Fair, for the season."
end phrase

define phrase music-stops
  The music stops.
end phrase
`;

describe('a trait\'s guarded clause beside the owner\'s topic table (GH #350)', () => {
  it('leaves the table to answer while the guard is false, and refuses once it is true', async () => {
    const b = await bootTurns(DANCE);
    const answered = await b.turnText('ask mara about the weather');
    expect(answered.text).toContain('Fair, for the season.');
    expect(answered.text).not.toContain('She is not your hand in this dance.');

    await b.turnText('pull cord');
    expect(b.world.getStateValue(CHORD_STATE_PREFIX + 'mara')).toBe('waiting');
    const refused = await b.turnText('ask mara about the weather');
    expect(refused.text).toContain('She is not your hand in this dance.');
    expect(refused.text).not.toContain('Fair, for the season.');
  });
});

/** A one-room story whose traits and one thing are given, for the load refusals. */
const withTraits = (traits: string, kindLine: string, ownClause = ''): string => `${HEAD}${traits}
create the Bell Room
  a room

  A room of ropes.

create the bell
  ${kindLine}
  singular
  in the Bell Room

  A bell.
${ownClause}${ALEX}
define phrase nope
  No.
end phrase
`;

const refusing = (name: string, modifier = ''): string => `define trait ${name}
  on the player pulling${modifier}
    refuse when it is in the Bell Room: nope
  end on
end trait

`;

describe('a stated order that cannot be honored refuses to load', () => {
  it('refuses a trait clause ordered against a name that is no trait', async () => {
    const source = withTraits(refusing('stuck', ', before sealed'), 'a thing, stuck');
    await expect(bootTurns(source)).rejects.toThrow(/`, before sealed` names no trait/);
  });

  it('refuses a thing\'s own clause ordered against a name that is no trait', async () => {
    const own = `
  on the player pulling, after sealed
    refuse when the bell is in the Bell Room: nope
  end on
`;
    const source = withTraits(refusing('stuck'), 'a thing, stuck', own);
    await expect(bootTurns(source)).rejects.toThrow(/`, after sealed` names no trait/);
  });

  it('refuses traits that order one another in a circle', async () => {
    const source = withTraits(refusing('stuck', ', before jammed') + refusing('jammed', ', before stuck'), 'a thing, stuck, jammed');
    await expect(bootTurns(source)).rejects.toThrow(/order their `pulling` clauses in a circle/);
  });

  it('refuses a stated order on a clause that is not consulted in an order', async () => {
    const own = `
  after the player entering, after stuck
    phrase nope
  end after
`;
    const source = `${HEAD}${refusing('stuck')}
create the Bell Room
  a room

  A room of ropes.
${own}${ALEX}
define phrase nope
  No.
end phrase
`;
    await expect(bootTurns(source)).rejects.toThrow(/`, after stuck` places nothing on this `entering` clause/);
  });

  it('refuses to move a topic table owner\'s own asking clause behind the traits', async () => {
    const source = DANCE.replace(
      'define topics for Mara',
      `define phrase mara-shrugs
  She shrugs.
end phrase

define topics for Mara`,
    ).replace(
      '  A dancer.\n',
      `  A dancer.

  on the player asking, after hand-of-the-dance
    phrase mara-shrugs
  end on
`,
    );
    await expect(bootTurns(source)).rejects.toThrow(/cannot move `Mara`'s `asking` clause/);
  });
});

describe('the priority a trait\'s clauses are registered under', () => {
  const priorities = (traits: string, names: string[]): number[] => {
    const ir = compileSource(withTraits(traits, 'a thing'));
    return names.map((name) => traitClausePriority(ir, name, 'pulling'));
  };

  it('is zero for a trait no stated order touches', () => {
    expect(priorities(refusing('stuck') + refusing('jammed'), ['stuck', 'jammed'])).toEqual([0, 0]);
  });

  it('puts the earlier of a stated pair above zero and the later below', () => {
    const [barred, stuck, jammed] = priorities(
      refusing('stuck') + refusing('jammed') + refusing('barred', ', before stuck'),
      ['barred', 'stuck', 'jammed'],
    );
    expect(barred).toBeGreaterThan(jammed);
    expect(jammed).toBe(0);
    expect(stuck).toBeLessThan(jammed);
  });

  it('accepts the same order stated from both sides', () => {
    const [aa, bb] = priorities(refusing('aa', ', before bb') + refusing('bb', ', after aa'), ['aa', 'bb']);
    expect(aa).toBeGreaterThan(bb);
  });

  it('honors a chain stated in mixed directions', () => {
    // cc before aa, bb after cc, aa after bb: cc, bb, aa.
    const [aa, bb, cc] = priorities(
      refusing('aa', ', after bb') + refusing('bb', ', after cc') + refusing('cc', ', before aa'),
      ['aa', 'bb', 'cc'],
    );
    expect(cc).toBeGreaterThan(bb);
    expect(bb).toBeGreaterThan(aa);
  });

  it('places one trait between two others when it states both', () => {
    const torn = `define trait torn
  on the player pulling, before stuck
    refuse when it is in the Bell Room: nope
  end on

  after the player pulling, after jammed
    phrase nope
  end after
end trait

`;
    const [jammed, tornAt, stuck] = priorities(refusing('stuck') + refusing('jammed') + torn, ['jammed', 'torn', 'stuck']);
    expect(jammed).toBeGreaterThan(tornAt);
    expect(tornAt).toBeGreaterThan(stuck);
  });
});
