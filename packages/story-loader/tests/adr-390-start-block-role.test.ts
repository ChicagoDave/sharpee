/**
 * adr-390-start-block-role.test.ts — the start block assigns the role
 * through the world's one writer (ADR-390 D3): the first `change the player
 * to` is the set, a later line is the change and the old holder's flag
 * clears; outside the start block the statement is a request the engine
 * drains at turn end, not an immediate world write.
 */
import { describe, expect, it } from 'vitest';
import { ActorTrait, TraitType } from '@sharpee/world-model';
import { bootTurns, eventsOfType } from './helpers/boot-turns';

const SOURCE = (start: string) => `story
  title: Roles
  authors:
    T
  id: roles
  story-version: 0.0.1

define action becoming-alex
  grammar
    become alex
  change the player to Alex

create the Yard
  a room

  A yard.

create Alex
  a person, proper
  playable
  starts in the Yard

  Alex.

create Brook
  a person, proper
  playable
  starts in the Yard

  Brook.

before the game starts
${start}
end before
`;

const flag = (b: Awaited<ReturnType<typeof bootTurns>>, irId: string): boolean =>
  (b.world.getEntity(irId)!.get(TraitType.ACTOR) as ActorTrait).isPlayer;

describe('the start block and the player role (ADR-390 D3)', () => {
  it('one line: the named character holds the role after boot', async () => {
    const b = await bootTurns(SOURCE('  change the player to Alex'));
    expect(b.world.playerCharacter.id).toBe('alex');
    expect(flag(b, 'alex')).toBe(true);
    expect(flag(b, 'brook')).toBe(false);
  });

  it('two lines: the first is the set, the second the change, and exactly one flag is left set', async () => {
    const b = await bootTurns(SOURCE('  change the player to Alex\n  change the player to Brook'));
    expect(b.world.playerCharacter.id).toBe('brook');
    expect(flag(b, 'brook')).toBe(true);
    expect(flag(b, 'alex')).toBe(false);
  });

  it('outside the start block the statement is a request the engine honours at turn end, not a loader write', async () => {
    const b = await bootTurns(SOURCE('  change the player to Brook'));
    expect(b.world.playerCharacter.id).toBe('brook');

    const events = await b.turn('become alex');

    expect(eventsOfType(events, 'if.event.player.switch_requested').length).toBe(1);
    expect(b.world.playerCharacter.id).toBe('alex');
    expect(flag(b, 'brook')).toBe(false);
  });
});
