/**
 * two-traits-one-story-action.test.ts — a thing composing two traits that
 * both answer one story action runs both clauses (GH #773). A lantern that
 * is a `wick` (`change it to lit`) and a `lens-seat` (`the glass lens must
 * be in it`) asks for its lens and lights, whichever trait its kind line
 * names first, and a refusal in either trait stops the command before the
 * other trait changes anything. Run through real engine turns: the real
 * parser, the loader's own binding, the real world.
 *
 * Public interface: none (test file).
 * Owner context: @sharpee/story-loader, dispatch verbs.
 */
import { describe, expect, it } from 'vitest';
import { LightSourceTrait, TraitType } from '@sharpee/world-model';
import { clauseOccurrenceKey } from '../src/state-keys';
import { bootTurns, compileSource, type BootedTurns } from './helpers/boot-turns';

/** The story, with the lantern's two story traits in the order given. */
const source = (traits: string): string => `story
  title: Lantern Gallery
  authors:
    T
  id: lantern-gallery
  story-version: 0.0.1

define trait wick
  on the player kindling
    refuse when it is lit: already-burning
    change it to lit
    phrase kindled
  end on
end trait

define trait lens-seat
  on the player kindling
    the glass lens must be in it: lantern-empty
    phrase light-thrown
  end on
end trait

define trait gilded
  on the player kindling while the glass lens is in the great lantern
    phrase gilt-gleams
  end on
end trait

define trait first-spark
  on the player kindling, once
    change it to lit
    phrase first-spark-takes
  end on
end trait

define trait chime
  on the player kindling, once
    phrase chimed
  end on
end trait

define trait ember
  on the player kindling
    phrase ember-glows
  end on

  on the player stoking
    change it to lit
    phrase ember-flares
  end on
end trait

define trait rub-warm
  on the player rubbing-down
    phrase rub-glows
  end on
end trait

define action rubbing-down
  grammar
    burnish the target
  the target must be reachable
  refuse when the player has the glass lens: body-refuses
  phrase rubbed

define action stoking
  grammar
    stoke the target
  the target must be reachable
  phrase stoked

define action kindling
  grammar
    kindle the target
  the target must be reachable
  otherwise refuse nothing-to-kindle

create the Gallery
  a room

  A gallery.

create the great lantern
  a container, scenery, light-source, starts unlit, ${traits}
  in the Gallery
  aka lantern

  A lantern.

create the glass lens
  a thing
  in the Gallery
  aka lens

  A lens.

create the hand lamp
  a thing, light-source, starts unlit, wick
  in the Gallery
  aka lamp

  A lamp.

create the censer
  a thing, light-source, starts unlit, chime, ember
  in the Gallery

  A censer.

create the brass plate
  a thing, rub-warm
  in the Gallery
  aka plate

  A plate.

create the stone
  a thing
  in the Gallery

  A stone.

create Alex
  a person, proper
  playable
  starts in the Gallery

before the game starts
  change the player to Alex
end before

define phrase already-burning
  It is burning already.
end phrase

define phrase kindled
  It catches.
end phrase

define phrase lantern-empty
  There is no lens in it.
end phrase

define phrase light-thrown
  The lens throws the light down the gallery.
end phrase

define phrase gilt-gleams
  The gilt gleams.
end phrase

define phrase first-spark-takes
  The first spark takes.
end phrase

define phrase body-refuses
  Not with your hands full.
end phrase

define phrase rubbed
  You rub it.
end phrase

define phrase rub-glows
  It glows under your hand.
end phrase

define phrase chimed
  It chimes, the once.
end phrase

define phrase ember-glows
  The ember glows.
end phrase

define phrase ember-flares
  The ember flares.
end phrase

define phrase stoked
  You stoke it.
end phrase

define phrase nothing-to-kindle
  Nothing there takes a flame.
end phrase
`;

const lanternIsLit = (b: BootedTurns): boolean =>
  (b.world.getEntity(b.id('great-lantern'))!.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit === true;

/** How many times a trait's kindling clause has passed its validation on a thing (the lantern unless named). */
function firings(b: BootedTurns, trait: string, thing = 'great-lantern'): number {
  const def = compileSource(source('lens-seat, wick')).traits.find((candidate) => candidate.name === trait)!;
  return (b.world.getStateValue(clauseOccurrenceKey(def.onClauses[0].id, b.id(thing))) as number | undefined) ?? 0;
}

describe.each([['lens-seat, wick'], ['wick, lens-seat']])('a lantern composing `%s`, kindled', (traits) => {
  it('refuses for want of a lens and does not light, though the wick alone would have lit', async () => {
    const b = await bootTurns(source(traits));
    expect(lanternIsLit(b)).toBe(false);

    const turn = await b.turnText('kindle lantern');

    expect(turn.text).toContain('There is no lens in it.');
    expect(turn.text).not.toContain('It catches.');
    expect(lanternIsLit(b)).toBe(false);
  });

  it('with the lens seated, lights and says both traits\' phrases', async () => {
    const b = await bootTurns(source(traits));
    await b.turn('take lens');
    await b.turn('put lens in lantern');
    expect(lanternIsLit(b)).toBe(false);

    const turn = await b.turnText('kindle lantern');

    expect(lanternIsLit(b)).toBe(true);
    expect(turn.text).toContain('It catches.');
    expect(turn.text).toContain('The lens throws the light down the gallery.');
    expect(firings(b, 'wick')).toBe(1);
    expect(firings(b, 'lens-seat')).toBe(1);
  });

  it('once lit, the wick\'s refusal stops the lens-seat\'s phrase as well', async () => {
    const b = await bootTurns(source(traits));
    await b.turn('take lens');
    await b.turn('put lens in lantern');
    await b.turn('kindle lantern');

    const again = await b.turnText('kindle lantern');

    expect(again.text).toContain('It is burning already.');
    expect(again.text).not.toContain('The lens throws the light');
    // The wick refused, so its clause has still fired only the once.
    expect(firings(b, 'wick')).toBe(1);
  });
});

describe('a lantern composing two traits — the order of what is said', () => {
  it('says each trait\'s phrase in the order the kind line names the traits', async () => {
    for (const [traits, first, second] of [
      ['lens-seat, wick', 'The lens throws the light', 'It catches.'],
      ['wick, lens-seat', 'It catches.', 'The lens throws the light'],
    ]) {
      const b = await bootTurns(source(traits));
      await b.turn('take lens');
      await b.turn('put lens in lantern');
      const turn = await b.turnText('kindle lantern');
      expect(turn.text.indexOf(first), traits).toBeGreaterThanOrEqual(0);
      expect(turn.text.indexOf(second), traits).toBeGreaterThan(turn.text.indexOf(first));
    }
  });
});

describe('a refused command spends no firing', () => {
  it('a `, once` clause is not used up by a command another trait refuses, and fires when the command does run', async () => {
    const b = await bootTurns(source('first-spark, lens-seat'));

    const refused = await b.turnText('kindle lantern');
    expect(refused.text).toContain('There is no lens in it.');
    expect(lanternIsLit(b)).toBe(false);
    expect(firings(b, 'first-spark')).toBe(0);
    expect(firings(b, 'lens-seat')).toBe(0);

    await b.turn('take lens');
    await b.turn('put lens in lantern');
    const ran = await b.turnText('kindle lantern');

    expect(ran.text).toContain('The first spark takes.');
    expect(lanternIsLit(b)).toBe(true);
    expect(firings(b, 'first-spark')).toBe(1);
    expect(firings(b, 'lens-seat')).toBe(1);
  });

  it('a trait\'s firing is not counted when the action\'s own body refuses', async () => {
    const b = await bootTurns(source('lens-seat, wick'));
    const def = compileSource(source('lens-seat, wick')).traits.find((candidate) => candidate.name === 'rub-warm')!;
    const rubs = (): number =>
      (b.world.getStateValue(clauseOccurrenceKey(def.onClauses[0].id, b.id('brass-plate'))) as number | undefined) ?? 0;

    await b.turn('take lens');
    const refused = await b.turnText('burnish plate');
    expect(refused.text).toContain('Not with your hands full.');
    expect(rubs()).toBe(0);

    await b.turn('put lens in lantern');
    const ran = await b.turnText('burnish plate');
    expect(ran.text).toContain('It glows under your hand.');
    expect(rubs()).toBe(1);
  });
});

describe('a story action on things that compose one answering trait, or none', () => {
  it('a gated-out trait answers nothing, and the other trait still runs', async () => {
    const b = await bootTurns(source('gilded, wick'));

    const turn = await b.turnText('kindle lantern');

    expect(turn.text).not.toContain('The gilt gleams.');
    expect(turn.text).toContain('It catches.');
    expect(lanternIsLit(b)).toBe(true);
  });

  it('a gate that holds lets both traits answer', async () => {
    const b = await bootTurns(source('gilded, wick'));
    await b.turn('take lens');
    await b.turn('put lens in lantern');

    const turn = await b.turnText('kindle lantern');

    expect(turn.text).toContain('The gilt gleams.');
    expect(turn.text).toContain('It catches.');
    expect(lanternIsLit(b)).toBe(true);
  });

  it('a used-up `, once` clause answers nothing the second time, and the other trait still answers', async () => {
    const b = await bootTurns(source('lens-seat, wick'));

    const first = await b.turnText('kindle censer');
    expect(first.text).toContain('It chimes, the once.');
    expect(first.text).toContain('The ember glows.');
    expect([firings(b, 'chime', 'censer'), firings(b, 'ember', 'censer')]).toEqual([1, 1]);

    const second = await b.turnText('kindle censer');
    expect(second.text).not.toContain('It chimes, the once.');
    expect(second.text).toContain('The ember glows.');
    expect([firings(b, 'chime', 'censer'), firings(b, 'ember', 'censer')]).toEqual([1, 2]);
  });

  it('the action\'s own body runs after the trait\'s clause: the trait lights the thing, then the body speaks', async () => {
    const b = await bootTurns(source('lens-seat, wick'));
    const censer = b.world.getEntity(b.id('censer'))!;
    expect((censer.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit === true).toBe(false);

    const turn = await b.turnText('stoke censer');

    expect((censer.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(true);
    expect(turn.text.indexOf('The ember flares.')).toBeGreaterThanOrEqual(0);
    expect(turn.text.indexOf('You stoke it.')).toBeGreaterThan(turn.text.indexOf('The ember flares.'));
  });

  it('a thing with one answering trait runs it, as before', async () => {
    const b = await bootTurns(source('lens-seat, wick'));
    const lamp = b.world.getEntity(b.id('hand-lamp'))!;

    const turn = await b.turnText('kindle lamp');

    expect(turn.text).toContain('It catches.');
    expect((lamp.get(TraitType.LIGHT_SOURCE) as LightSourceTrait).isLit).toBe(true);
  });

  it('a thing no trait answers for is the action\'s `otherwise` miss', async () => {
    const b = await bootTurns(source('lens-seat, wick'));

    const turn = await b.turnText('kindle stone');

    expect(turn.text).toContain('Nothing there takes a flame.');
  });
});
