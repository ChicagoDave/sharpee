/**
 * narrative-unexpected-failure.test.ts — beat 7 of the author narrative
 * ("The failure you did not expect"): Tobias shrugs at both topics the author
 * wrote for him. No card covers the conversation; the derived tier catches it
 * because the story's own source says he answers and the engine says he does
 * not, and that fails the build.
 *
 * ROOT CAUSE IS GH #242, a platform defect: entity topics fall through to the
 * generic ask reply when the topic entity is out of scope. WHEN #242 SHIPS,
 * these two `derived-branch` events will read `status: 'passed'`, the
 * exit code will drop to 0, and the failed-status assertions below must flip
 * to passed-status assertions. That is this suite doing its job — the beat
 * changes, the narrative's section is rewritten, the test is not deleted.
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
  it('are the only two failed derived branches, each citing the reply that was not emitted', () => {
    const failed = derivedBranches(run).filter((event) => event.status === 'failed');
    expect(failed.map((event) => event.label)).toEqual(['Tobias · topic boiler', 'Tobias · topic silver-locket']);
    expect(failed[0].failure).toMatch(/^emitted tobias-boiler-reply: "tobias-boiler-reply" was not emitted/);
    expect(failed[1].failure).toMatch(/^emitted tobias-locket-reply: "tobias-locket-reply" was not emitted/);
    // What actually ran: one real command each, after arranging the player where Tobias is.
    expect(failed[0].command).toBe('ask Tobias about boiler');
    expect(failed[1].command).toBe('ask Tobias about silver locket');
    expect(failed[0].arranged?.some((expression) => expression.startsWith('player.location = '))).toBe(true);
    expect(failed.every((event) => event.span !== null && event.span.line > 0)).toBe(true);
  });

  it('fail the build: the summary counts two failures and the run exits 1 though every tree line passed', () => {
    expect(derivedSummary(run).branches.failed).toBe(2);
    const end = runEnd(run);
    expect(end.totalFailed).toBe(0);
    expect(end.exitCode).toBe(1);
    expect(run.status).toBe(1);
    expect(run.stderr).toContain('Derived failures: 2');
  });
});
