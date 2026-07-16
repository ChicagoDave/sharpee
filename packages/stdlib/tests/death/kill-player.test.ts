/**
 * Unit tests for `killPlayer` — the ADR-224 player-death primitive.
 *
 * Asserts on the actual `HealthTrait` mutation and the emitted canonical event,
 * per the Behavior Statement: DOES set `dead`+`causeOfDeath` (lazily attaching a
 * `HealthTrait`) and emit `if.event.player.died`; REJECTS (no-ops, returns null)
 * when the player is already dead.
 */

import { describe, it, expect } from 'vitest';
import { TraitType, HealthTrait, HealthBehavior } from '@sharpee/world-model';
import { killPlayer, PLAYER_DIED_EVENT } from '../../src/death';
import { setupBasicWorld } from '../test-utils';

function getHealth(player: any): HealthTrait | undefined {
  return player.get(TraitType.HEALTH) as HealthTrait | undefined;
}

describe('killPlayer (ADR-224)', () => {
  it('lazily attaches a HealthTrait when the player has none, then kills (ADR-223 AC-1 caveat)', () => {
    const { world, player } = setupBasicWorld();
    // PRECONDITION: the plain actor has no HealthTrait (opt-in life-state).
    expect(getHealth(player)).toBeUndefined();

    const event = killPlayer(world, player, { cause: 'gas' });

    // POSTCONDITION: a HealthTrait now exists and records the terminal death.
    const health = getHealth(player);
    expect(health).toBeInstanceOf(HealthTrait);
    expect(health!.dead).toBe(true);
    expect(health!.causeOfDeath).toBe('gas');
    expect(HealthBehavior.isAlive(health!)).toBe(false);

    // ...and the canonical event carries the cause + terminal intent.
    expect(event).not.toBeNull();
    expect(event!.type).toBe(PLAYER_DIED_EVENT);
    expect(event!.data).toMatchObject({ cause: 'gas', terminal: true });
    expect(event!.entities.actor).toBe(player.id);
  });

  it('kills through an existing HealthTrait without replacing it', () => {
    const { world, player } = setupBasicWorld();
    const health = new HealthTrait({ health: 10 });
    player.add(health);

    const event = killPlayer(world, player, { cause: 'fall' });

    // Same trait instance is mutated, not a fresh one.
    expect(getHealth(player)).toBe(health);
    expect(health.dead).toBe(true);
    expect(health.causeOfDeath).toBe('fall');
    expect(event!.type).toBe(PLAYER_DIED_EVENT);
  });

  it('is idempotent: a second call on an already-dead player is a no-op returning null', () => {
    const { world, player } = setupBasicWorld();

    const first = killPlayer(world, player, { cause: 'grue' });
    expect(first).not.toBeNull();
    const health = getHealth(player)!;
    expect(health.causeOfDeath).toBe('grue');

    // Second call must not re-emit or overwrite the recorded cause.
    const second = killPlayer(world, player, { cause: 'combat' });
    expect(second).toBeNull();
    expect(health.causeOfDeath).toBe('grue');
  });

  it('passes through messageId and honors terminal:false intent', () => {
    const { world, player } = setupBasicWorld();

    const event = killPlayer(world, player, {
      cause: 'gas',
      messageId: 'dungeo.death.gas',
      terminal: false,
    });

    expect(event!.data).toMatchObject({
      cause: 'gas',
      terminal: false,
      messageId: 'dungeo.death.gas',
    });
  });
});
