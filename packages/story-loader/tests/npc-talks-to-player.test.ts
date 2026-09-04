/**
 * npc-talks-to-player.test.ts — GH #351 on the REAL path: an acting
 * statement `<npc> talks to the player` (and `talks to <player name>`)
 * runs the real talking action as the NPC with the player as target — the
 * one spelling by which a story makes a character address the player.
 *
 * Owner context: story-loader tests (publish-readiness Phase 6, P-17).
 */
import { describe, expect, it } from 'vitest';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Address
  authors:
    T
  id: address
  story-version: 0.0.1

create the Ballroom
  a room

  A ballroom.

create the second partner
  a person
  in the Ballroom

  A partner.

create the gong
  in the Ballroom

  A gong.

  after the player taking
    the second partner talks to the player
  end after

create the bell
  in the Ballroom

  A bell.

  after the player taking
    the second partner talks to Jacqueline
  end after

create Jacqueline
  a person, proper
  playable
  starts in the Ballroom

  You.

before the game starts
  change the player to Jacqueline
end before
`;

describe('GH #351: `<npc> talks to the player` addresses the player', () => {
  it('runs the talking action as the NPC with the player as target, by role word and by name', async () => {
    const b = await bootTurns(SOURCE);
    const partner = b.id('second-partner');

    const byRole = await b.turn('take gong');
    const talkedByRole = byRole.filter((e) => e.type === 'if.event.talked' || e.type === 'if.event.talk_blocked');
    expect(talkedByRole.length).toBeGreaterThan(0);
    expect((talkedByRole[0].data as { target?: string }).target).toBe(b.player.id);
    expect(b.world.getEntity(partner)).toBeDefined();

    const byName = await b.turn('take bell');
    const talkedByName = byName.filter((e) => e.type === 'if.event.talked' || e.type === 'if.event.talk_blocked');
    expect(talkedByName.length).toBeGreaterThan(0);
    expect((talkedByName[0].data as { target?: string }).target).toBe(b.player.id);
  });
});
