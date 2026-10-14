/**
 * ADR-371 D3/D4 at load: a `settable` thing gets the setting implementation
 * (a capability behavior built from its reversible states) and a `setting`
 * clause with a `to <value>` tail fires only for that value.
 *
 * Behavior Statement (the settable behavior):
 *   DOES    write `chord.state.<id>` to the normalised typed value when it
 *           names one of the thing's states, and report `if.event.set`.
 *   REJECTS a value that is not a state (`if.action.setting.not_a_setting`,
 *           the values as a list) — the state is unchanged.
 */

import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel, findTraitWithCapability } from '@sharpee/world-model';
import { createStory } from '../src';
import { CHORD_STATE_PREFIX } from '../src/state-keys';

const SOURCE = `story
  title: Dials
  authors:
    T
  id: dials
  story-version: 0.0.1

before the game starts
  change the player to Pilot
end before

create the Cockpit
  a room

  A cockpit.

create Pilot
  a person
  playable
  starts in the Cockpit

  You.

create the guidance selector
  a thing, scenery, settable
  in the Cockpit
  aka selector
  states, reversible: ceres, titan, kepler-station

  A selector.

  on the player setting to kepler-station
    refuse kepler-last
  end on

  after the player setting
    phrase clicks
  end after

define phrase kepler-last
  Kepler is last.
end phrase

define phrase clicks
  Click.
end phrase
`;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.code}: ${d.message}`).join('; '));
  return result.ir;
}

function load() {
  const story = createStory(compileSource(SOURCE), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const selector = world.getAllEntities().find((e) => e.name === 'guidance selector')!;
  const trait = findTraitWithCapability(selector, 'if.action.setting')!;
  const behavior = world.getBehaviorForCapability(trait, 'if.action.setting')!;
  const stateKey = `${CHORD_STATE_PREFIX}guidance-selector`;
  return { world, selector, behavior, stateKey };
}

describe('settable at load (ADR-371 D3)', () => {
  it('registers the setting implementation on the thing', () => {
    const { selector, behavior } = load();
    expect(behavior).toBeDefined();
    expect(selector.has('chord.settable')).toBe(true);
  });

  it('writes the state for a value that names one of the states, spaces as hyphens', () => {
    const { world, selector, behavior, stateKey } = load();
    expect(world.getStateValue(stateKey)).toBe('ceres');
    const shared: Record<string, unknown> = { value: 'Kepler Station' };
    expect(behavior.validate(selector, world, 'pilot', shared).valid).toBe(true);
    behavior.execute(selector, world, 'pilot', shared);
    expect(world.getStateValue(stateKey)).toBe('kepler-station');
    const effects = behavior.report(selector, world, 'pilot', shared);
    expect(effects[0]).toMatchObject({ type: 'if.event.set', payload: { messageId: 'if.action.setting.set', value: 'kepler-station' } });
  });

  it('refuses a value that is not a state and leaves the state alone', () => {
    const { world, selector, behavior, stateKey } = load();
    const shared: Record<string, unknown> = { value: 'mars' };
    const result = behavior.validate(selector, world, 'pilot', shared);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('if.action.setting.not_a_setting');
    expect(JSON.stringify(result.params)).toContain('titan');
    expect(world.getStateValue(stateKey)).toBe('ceres');
  });
});

describe('the `to <value>` tail at fire time (ADR-371 D4)', () => {
  it('the tailed on-clause refuses only for its value; the untailed after-clause fires for every value', () => {
    const { world, selector } = load();
    // The lookup returns the registration ({ interceptor, trait, binding });
    // initializeWorld alone assigns no player (the engine's install does).
    const interceptor = world.getInterceptorForAction(selector, 'if.action.setting')!.interceptor;
    expect(interceptor).toBeDefined();
    const player = world.getAllEntities().find((e) => e.name === 'Pilot')!;
    world.setPlayer(player.id);

    const forKepler = interceptor.preValidate?.(selector, world, player.id, { value: 'kepler-station' });
    expect(forKepler?.valid).toBe(false);

    const forTitan = interceptor.preValidate?.(selector, world, player.id, { value: 'titan' });
    expect(forTitan ?? null).toBeNull();

    // The after-clause has no tail: its report runs for titan too.
    interceptor.postValidate?.(selector, world, player.id, { value: 'titan' });
    const report = interceptor.postReport?.(selector, world, player.id, { value: 'titan' });
    expect(JSON.stringify(report)).toContain('clicks');
  });
});

describe('the clause interceptor claims only its owners (ADR-371 D1a)', () => {
  it('a thing with a clause for another verb is not claimed for setting; the owner is', () => {
    const source = SOURCE.replace(
      'define phrase kepler-last',
      `create the flight couch
  a thing, scenery
  in the Cockpit
  aka couch

  A couch.

  on the player taking
    refuse kepler-last
  end on

define phrase kepler-last`,
    );
    const story = createStory(compileSource(source), { seed: 11 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const selector = world.getAllEntities().find((e) => e.name === 'guidance selector')!;
    const couch = world.getAllEntities().find((e) => e.name === 'flight couch')!;
    // Both carry the shared marker trait, so the lookup finds the one
    // setting interceptor for each; only the selector has a setting arm.
    const forCouch = world.getInterceptorForAction(couch, 'if.action.setting');
    const forSelector = world.getInterceptorForAction(selector, 'if.action.setting');
    expect(forCouch).toBeDefined();
    expect(forCouch!.interceptor.claims?.(couch)).toBe(false);
    expect(forSelector!.interceptor.claims?.(selector)).toBe(true);
  });
});
