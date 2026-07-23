/**
 * chain-hatch.test.ts — ADR-094 `define chain … from` through the REAL loader.
 * The bound EventChainHandler registers under the stdlib chain KEY so it REPLACES
 * the platform default in place; the alias→key map is pinned against the live
 * stdlib `OPENED_REVEALED_CHAIN_KEY` (drift guard, like event-id-map). REAL-PATH:
 * real compile → createStory → initializeWorld against a real WorldModel.
 */
import { describe, expect, it, vi } from 'vitest';
import { compile } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { OPENED_REVEALED_CHAIN_KEY } from '@sharpee/stdlib';
import { createStory } from '../src';
import { CHORD_CHAIN_MAP, resolveChain } from '../src/chain-map';

const CHAIN_STORY = `story "T" by "T"
  id: t
  version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

define chain opened-revealed from "./reveal.ts"`;

const irOf = (src: string) => {
  const r = compile(src);
  if (!r.ok) throw new Error(r.diagnostics.map((d) => `${d.code} ${d.message}`).join('; '));
  return r.ir;
};

describe('chain-map conformance (ADR-094)', () => {
  it('pins `opened-revealed` to the LIVE stdlib chain key', () => {
    expect(CHORD_CHAIN_MAP['opened-revealed'].key).toBe(OPENED_REVEALED_CHAIN_KEY);
  });

  it('the Chord alias is the dotted platform key with `stdlib.chain.` dropped, dotless', () => {
    expect('opened-revealed').toBe(OPENED_REVEALED_CHAIN_KEY.replace(/^stdlib\.chain\./, ''));
  });
});

describe('chain hatch binding (ADR-094)', () => {
  it('registers the handler under the stdlib key + trigger, replacing the default', () => {
    const handler = vi.fn(() => null);
    const story = createStory(irOf(CHAIN_STORY), { hatchModules: { './reveal.ts': { default: handler } } });
    const world = new WorldModel();
    const spy = vi.spyOn(world, 'chainEvent');

    story.initializeWorld(world);

    // Same KEY as the stdlib chain → chainEvent replaces it in place (ADR-094).
    expect(spy).toHaveBeenCalledWith('if.event.opened', handler, {
      key: OPENED_REVEALED_CHAIN_KEY,
      priority: 100,
    });
    expect(resolveChain('opened-revealed')).toEqual({
      key: OPENED_REVEALED_CHAIN_KEY,
      trigger: 'if.event.opened',
      priority: 100,
    });
  });

  it('a chain hatch whose module has no handler export fails the load', () => {
    expect(() =>
      createStory(irOf(CHAIN_STORY), { hatchModules: { './reveal.ts': { notTheDefault: 1 } } }),
    ).toThrow(/Chain hatch `opened-revealed`.*expected an EventChainHandler/);
  });

  it('the pure-IR profile refuses a chain-bearing story (browser build boundary)', () => {
    expect(() =>
      createStory(irOf(CHAIN_STORY), { profile: 'pure-ir', hatchModules: { './reveal.ts': { default: vi.fn() } } }),
    ).toThrow(/pure-IR stories only/);
  });
});
