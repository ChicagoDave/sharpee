/**
 * narrative-unexpected-failure.test.ts — beat 7 of the author narrative
 * ("The failure you did not expect"): the derived tier reads a topic row the
 * tree never played and proves it — the keeper answers about the cider press and the
 * windfall, though the windfall's conversation has no card.
 *
 * HISTORY (on Fernhill, where this suite first ran: Tobias, the boiler and the
 * silver locket). On 2026-09-26 these two rows were fernhill's only red rows and
 * failed the build. That was the tester's fault, not the story's: it stood
 * the player beside Tobias but left the boiler in its shed and the locket
 * nowhere, and the parser resolves "the boiler" against what the player can
 * see. Since 2026-09-27 the runner brings the thing asked about into the
 * speaker's room (the same way it puts the shears in the hand before
 * `prune vine`), the rows pass, and the story exits 0. Since 2026-11-11 the suite runs on the
 * test story `orchard`. The rows are asserted
 * here as passed, with the arrangement that makes them so.
 *
 * Owner context: repo tooling — `scripts/__tests__/`.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { derivedBranches, derivedSummary, runEnd, runOrchardTest, type TestRun } from './support/story-run';

let run: TestRun;

beforeAll(() => {
  run = runOrchardTest();
}, 60_000);

describe('keeper · topic cider-press and topic windfall', () => {
  it('pass, each proving the reply the story names, with the thing asked about brought to the keeper', () => {
    const rows = derivedBranches(run).filter((event) => /^keeper · topic (cider-press|windfall)$/.test(event.label));
    expect(rows.map((event) => [event.label, event.status])).toEqual([
      ['keeper · topic cider-press', 'passed'],
      ['keeper · topic windfall', 'passed'],
    ]);
    // A passed row carries no failure line; the wire's verdict is the status.
    expect(rows.every((event) => event.failure === undefined)).toBe(true);
    // What actually ran: one real command each, after placing the player with
    // the keeper and the topic entity in that same room.
    expect(rows[0].command).toBe('ask keeper about cider press');
    expect(rows[1].command).toBe('ask keeper about windfall');
    for (const row of rows) {
      const player = row.arranged?.find((expression) => expression.startsWith('player.location = '));
      expect(player).toBeDefined();
      const room = player!.slice('player.location = '.length);
      const entity = row.label.endsWith('cider-press') ? 'cider-press' : 'windfall';
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
