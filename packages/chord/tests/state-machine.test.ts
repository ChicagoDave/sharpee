/**
 * state-machine.test.ts — ADR-215 `use state-machines` depth, compile
 * side (spelling A, ratified 2026-07-18): `define machine … end machine`
 * with role bindings, `starts`, state blocks, transition triggers
 * (action-on-role, condition/story-state, bare word, event), `, terminal`,
 * and `on enter`/`on exit` bodies. Gates: the `use` requirement, unknown
 * states, duplicate machines/roles, and the story-owned `it` rule.
 * REAL-PATH: every case drives the real parse → analyze pipeline.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'drawbridge.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (machine: string, header = '  use state-machines\n') => `story "Bridge" by "T"
  id: bridge
  version: 0.0.1
${header}
create the Gatehouse
  a room

  A gatehouse.

create the winch
  in the Gatehouse

  A winch.

create the player
  starts in the Gatehouse

  You.

${machine}`;

describe('define machine (ADR-215 state-machines depth, spelling A)', () => {
  it('compiles the drawbridge fixture to the full IR shape', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.uses).toEqual(['state-machines']);
    const machine = result.ir.machines[0];
    expect(machine.name).toBe('drawbridge');
    expect(machine.initialState).toBe('raised');
    expect(machine.roles).toEqual([{ name: 'winch', entity: 'rusty-winch' }]);
    const raised = machine.states.find((s) => s.name === 'raised')!;
    // Action trigger targets the role via the platform binding convention.
    expect(raised.transitions[0]).toMatchObject({
      trigger: { kind: 'action', action: 'turning', target: '$winch' },
      target: 'lowering',
    });
    const lowering = machine.states.find((s) => s.name === 'lowering')!;
    // Bare-word trigger resolved to a story-state condition.
    expect(lowering.transitions[0].trigger.kind).toBe('condition');
    expect(lowering.onEnter).toHaveLength(1);
    const lowered = machine.states.find((s) => s.name === 'lowered')!;
    expect(lowered.terminal).toBe(true);
  });

  it('a bare-word trigger that is no condition resolves as an action gerund', () => {
    const result = compile(
      story(`define machine watch
  starts idle

  state idle
    when waiting: alert

  state alert
end machine
`),
    );
    expect(result.diagnostics).toEqual([]);
    const idle = result.ir.machines[0].states.find((s) => s.name === 'idle')!;
    expect(idle.transitions[0].trigger).toMatchObject({ kind: 'action', action: 'waiting', target: null });
  });

  it('event triggers and `while` guards parse', () => {
    const result = compile(
      story(`define machine watch
  starts idle

  state idle
    when event gate-opened while the player is in the Gatehouse: alert

  state alert
end machine
`),
    );
    expect(result.diagnostics).toEqual([]);
    const transition = result.ir.machines[0].states[0].transitions[0];
    expect(transition.trigger).toMatchObject({ kind: 'event', event: 'gate-opened' });
    expect(transition.condition).not.toBeNull();
  });

  it('`define machine` without `use state-machines` → analysis.extension-not-used', () => {
    const codes = errorCodes(
      story(
        `define machine watch
  starts idle

  state idle
end machine
`,
        '',
      ),
    );
    expect(codes).toContain('analysis.extension-not-used');
  });

  it('an unknown transition target → analysis.machine-target with a suggestion', () => {
    expect(
      errorCodes(
        story(`define machine watch
  starts idle

  state idle
    when waiting: alerted

  state alert
end machine
`),
      ),
    ).toContain('analysis.machine-target');
  });

  it('a `starts` state that is not declared → analysis.machine-starts', () => {
    expect(
      errorCodes(
        story(`define machine watch
  starts asleep

  state idle
end machine
`),
      ),
    ).toContain('analysis.machine-starts');
  });

  it('`it` in a machine body → the story-owned unbound-referent gate', () => {
    expect(
      errorCodes(
        story(`define machine watch
  starts idle

  state idle
    on enter
      move it to the Gatehouse
    end on
end machine
`),
      ),
    ).toContain('analysis.story-clause-it');
  });

  it('a missing `end machine` is a parse error', () => {
    expect(
      errorCodes(
        story(`define machine watch
  starts idle

  state idle
`),
      ),
    ).toContain('parse.machine-end');
  });
});
