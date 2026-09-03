/**
 * take-from-container.test.ts — GH #314 on the REAL path: the bread-and-
 * butter phrasings `take <item> from <container>` and `get <item> from
 * <container>` parse to the removing action without a tool and behave as
 * `remove <item> from <container>`; and removing a wearable from a
 * container leaves it carried, not worn — the worn flag is a fact about
 * location (GH #334's invariant), so a cap that went into the satchel by
 * an authorial move comes out carried.
 *
 * Owner context: story-loader tests (publish-readiness Phase 7, P-19).
 */
import { describe, expect, it } from 'vitest';
import { TraitType, WearableTrait } from '@sharpee/world-model';
import { bootTurns } from './helpers/boot-turns';

const SOURCE = `story
  title: Satchel
  authors:
    T
  id: satchel
  story-version: 0.0.1

create the Stall
  a room

  A stall.

create the cloth satchel
  a container, openable, starts open

  A satchel.

create the woolen cap
  wearable
  in the cloth satchel

  A cap.

create the pear
  in the cloth satchel

  A pear.

create the bell
  in the Stall

  A bell.

  after the player taking
    move the woolen cap to the cloth satchel
  end after

create Jack
  a person
  playable
  starts in the Stall
  carries the cloth satchel

  You.

before the game starts
  change the player to Jack
end before
`;

describe('GH #314: tool-less take-from and the worn flag through a container', () => {
  it('`take X from Y` and `get X from Y` remove from the container', async () => {
    const b = await bootTurns(SOURCE);

    const took = await b.turnText('take pear from satchel');
    expect(took.text).toContain('You take the pear from the cloth satchel.');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);

    await b.turnText('put pear in satchel');
    const got = await b.turnText('get pear from satchel');
    expect(got.text).toContain('You take the pear from the cloth satchel.');
    expect(b.world.getLocation(b.id('pear'))).toBe(b.player.id);
  });

  it('a wearable taken from the container is carried, not worn — even after it went in while worn', async () => {
    const b = await bootTurns(SOURCE);
    const cap = b.id('woolen-cap');
    const wearable = () => b.world.getEntity(cap)!.get(TraitType.WEARABLE) as WearableTrait;

    await b.turnText('take cap from satchel');
    await b.turnText('wear cap');
    expect(wearable().worn).toBe(true);

    // The authorial move (GH #334's case) sends the worn cap into the satchel.
    await b.turnText('take bell');
    expect(b.world.getLocation(cap)).toBe(b.id('cloth-satchel'));
    expect(wearable().worn).toBe(false);

    const removed = await b.turnText('remove cap from satchel');
    expect(removed.text).toContain('You take the woolen cap from the cloth satchel.');
    expect(b.world.getLocation(cap)).toBe(b.player.id);
    expect(wearable().worn).toBe(false);
    const inventory = await b.turnText('i');
    expect(inventory.text).toContain('woolen cap');
    expect(inventory.text).not.toContain('(worn)');
  });
});
