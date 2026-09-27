/**
 * narrative-unexpected-failure.test.ts — beat 7 of the author narrative
 * ("The failure you did not expect"): the derived tier reads a topic row the
 * tree never played and proves it — Tobias answers about the boiler and the
 * silver locket, though neither conversation has a card.
 *
 * HISTORY. On 2026-09-26 these two rows were fernhill's only red rows and
 * failed the build. That was the tester's fault, not the story's: it stood
 * the player beside Tobias but left the boiler in its shed and the locket
 * nowhere, and the parser resolves "the boiler" against what the player can
 * see. Since 2026-09-27 the runner brings the thing asked about into the
 * speaker's room (the same way it puts the shears in the hand before
 * `prune vine`), the rows pass, and fernhill exits 0. The rows are asserted
 * here as passed, with the arrangement that makes them so.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { derivedBranches, derivedSummary, runEnd, runFernhillTest, type TestRun } from './support/fernhill-run';

let run: TestRun;

beforeAll(() => {
  run = runFernhillTest();
}, 60_000);

describe('Tobias · topic boiler and topic silver-locket', () => {
  it('pass, each proving the reply the story names, with the thing asked about brought to Tobias', () => {
    const rows = derivedBranches(run).filter((event) => /^Tobias · topic (boiler|silver-locket)$/.test(event.label));
    expect(rows.map((event) => [event.label, event.status])).toEqual([
      ['Tobias · topic boiler', 'passed'],
      ['Tobias · topic silver-locket', 'passed'],
    ]);
    // A passed row carries no failure line; the wire's verdict is the status.
    expect(rows.every((event) => event.failure === undefined)).toBe(true);
    // What actually ran: one real command each, after placing the player with
    // Tobias and the topic entity in that same room.
    expect(rows[0].command).toBe('ask Tobias about boiler');
    expect(rows[1].command).toBe('ask Tobias about silver locket');
    for (const row of rows) {
      const player = row.arranged?.find((expression) => expression.startsWith('player.location = '));
      expect(player).toBeDefined();
      const room = player!.slice('player.location = '.length);
      const entity = row.label.endsWith('boiler') ? 'boiler' : 'silver-locket';
      expect(row.arranged).toContain(`${entity}.location = ${room}`);
    }
    expect(rows.every((event) => event.span !== null && event.span.line > 0)).toBe(true);
  });

  it('no derived row fails: the summary counts zero failures and the run exits 0', () => {
    expect(derivedSummary(run).branches.failed).toBe(0);
    expect(derivedBranches(run).filter((event) => event.status === 'failed')).toEqual([]);
    const end = runEnd(run);
    expect(end.totalFailed).toBe(0);
    expect(end.exitCode).toBe(0);
    expect(run.status).toBe(0);
    expect(run.stderr).not.toContain('Derived failures:');
  });
});
