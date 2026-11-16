/**
 * gh-712-machine-trigger-answers-verb.test.ts — a machine's `when turning
 * the <role>` trigger is the role's thing answering the verb, and a refused
 * turn never advances the machine (GH #712).
 *
 * REAL-PATH: real @sharpee/chord compile, the loader's real binding, the
 * real parser and `GameEngine.executeTurn`, the real StateMachinePlugin
 * ticked by the engine's own plugin-tick stage. The machine's state is read
 * from the plugin's registry after each typed command.
 *
 * Public interface: none (test module).
 * Owner context: story-loader tests
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { bootTurns, eventsOfType, messageIdsOf, type BootedTurns } from './helpers/boot-turns';

const DRAWBRIDGE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'drawbridge.story'),
  'utf8',
);

/** The drawbridge with a winch whose own clause refuses the turn while the story is calm. */
const SEIZED_WINCH = DRAWBRIDGE.replace(
  '  A rusty winch wound with chain.\n',
  [
    '  A rusty winch wound with chain.',
    '',
    '  on the player turning',
    '    refuse when calm: winch-seized',
    '    phrase winch-turns',
    '  end on',
    '',
  ].join('\n'),
).concat(
  [
    '',
    'define phrase winch-seized',
    '  The winch is seized solid.',
    'end phrase',
    '',
    'define phrase winch-turns',
    '  The winch turns.',
    'end phrase',
    '',
  ].join('\n'),
);

const machineState = (booted: BootedTurns): string | undefined => {
  const plugin = booted.engine
    .getPluginRegistry()
    .getAll()
    .find((p): p is StateMachinePlugin => p instanceof StateMachinePlugin);
  if (!plugin) throw new Error('no StateMachinePlugin registered');
  return plugin.getRegistry().getMachineState('chord.machine.drawbridge');
};

describe('a machine action trigger and the verb it names (GH #712)', () => {
  it('the fixture under test carries the refusing clause', () => {
    expect(SEIZED_WINCH).toContain('refuse when calm: winch-seized');
  });

  it('a trigger that names the thing itself, with no role, answers the verb the same way', async () => {
    const source = DRAWBRIDGE.replace('  role winch is the rusty winch\n', '').replace(
      'when turning the winch: lowering',
      'when turning the rusty winch: lowering',
    );
    expect(source).not.toContain('role winch');
    expect(source).toContain('when turning the rusty winch: lowering');
    const booted = await bootTurns(source);
    expect(machineState(booted)).toBe('raised');

    const events = await booted.turn('turn winch');

    expect(machineState(booted)).toBe('lowering');
    expect(eventsOfType(events, 'if.event.turn_blocked')).toEqual([]);
    expect(eventsOfType(events, 'if.event.turned')).toHaveLength(1);
  });

  it('turning a role thing with no clause of its own runs the action and advances the machine', async () => {
    const booted = await bootTurns(DRAWBRIDGE);
    expect(machineState(booted)).toBe('raised');

    const events = await booted.turn('turn winch');

    expect(machineState(booted)).toBe('lowering');
    expect(eventsOfType(events, 'if.event.turn_blocked')).toEqual([]);
    expect(eventsOfType(events, 'if.event.turned')).toHaveLength(1);
    expect(messageIdsOf(events)).toContain('chains-groan');
  });

  it('a turn the thing\'s own clause refuses leaves the machine where it was', async () => {
    const booted = await bootTurns(SEIZED_WINCH);
    expect(machineState(booted)).toBe('raised');

    const refused = await booted.turn('turn winch');

    expect(machineState(booted)).toBe('raised');
    expect(messageIdsOf(refused)).toContain('winch-seized');
    expect(messageIdsOf(refused)).not.toContain('chains-groan');
    expect(eventsOfType(refused, 'if.event.turned')).toEqual([]);
  });

  it('turning a thing no machine names and no clause answers is still refused', async () => {
    const source = DRAWBRIDGE.replace(
      'create Alex\n',
      ['create the iron ring', '  a thing', '  aka ring', '  in the Gatehouse', '', '  An iron ring set in the wall.', '', 'create Alex', ''].join('\n'),
    );
    expect(source).toContain('create the iron ring');
    const booted = await bootTurns(source);

    const events = await booted.turn('turn ring');

    expect(eventsOfType(events, 'if.event.turn_blocked')).toHaveLength(1);
    expect(eventsOfType(events, 'if.event.turned')).toEqual([]);
    expect(machineState(booted)).toBe('raised');
  });
});
