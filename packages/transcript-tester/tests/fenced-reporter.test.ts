/**
 * fenced-reporter.test.ts — ADR-287 AC1: a failing fenced assertion must SHOW
 * its fence content. Before this, the reporter keyed its diff solely off
 * `command.expectedOutput`, so a fenced failure printed no expected text at all.
 *
 * Also pins that blank lines survive into the Output block. `normalizeOutput`
 * preserves paragraph breaks, so a blank line is load-bearing for an exact
 * match — the reporter used to drop it, which made a real dungeo failure
 * display as two identical-looking texts (found during Phase 2).
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it, vi } from 'vitest';
import { parseTranscript } from '../src/parser.js';
import { runTranscript } from '../src/runner.js';
import { reportTranscript } from '../src/reporter.js';

/** Run a one-command transcript, report it, and return the captured console output. */
async function reportOf(source: string, response: string): Promise<string> {
  const transcript = parseTranscript(source, 't.transcript');
  const result = await runTranscript(transcript, { executeCommand: () => response } as never);
  const lines: string[] = [];
  const spy = vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    lines.push(args.map(String).join(' '));
  });
  try {
    reportTranscript(result, {});
  } finally {
    spy.mockRestore();
  }
  // Strip ANSI colour so assertions read on the text, not the escapes.
  return lines.join('\n').replace(/\[[0-9;]*m/g, '');
}

describe('ADR-287 AC1 — a failed fenced assertion shows its fence', () => {
  it('prints the fence content under an "Expected (fenced)" heading', async () => {
    const report = await reportOf(
      'title: T\n---\n\n> read sign\n[OK]\n```\nThe vault closes at dusk.\nBeware the "night porter."\n```\n',
      'The vault closes at DAWN.',
    );
    expect(report).toContain('Expected (fenced):');
    expect(report).toContain('+ The vault closes at dusk.');
    expect(report).toContain('+ Beware the "night porter."');
  });

  it('still labels a classic expected-output block plainly', async () => {
    const report = await reportOf(
      'title: T\n---\n\n> look\nA small square den.\n[OK]\n',
      'A large round hall.',
    );
    expect(report).toContain('Expected:');
    expect(report).not.toContain('Expected (fenced):');
    expect(report).toContain('+ A small square den.');
  });

  it('prints nothing extra when the fenced assertion passes', async () => {
    const report = await reportOf(
      'title: T\n---\n\n> look\n[OK]\n```\nA small square den.\n```\n',
      'A small square den.',
    );
    expect(report).not.toContain('Expected');
  });
});

describe('blank lines survive into the Output block', () => {
  it('shows the paragraph break that makes an exact match fail', async () => {
    // Without the blank line rendered, this failure is undiagnosable: the two
    // texts look identical on screen. This is the real dungeo `open mailbox`
    // shape ("...mailbox.\n\nInside...").
    const report = await reportOf(
      'title: T\n---\n\n> open mailbox\n[OK]\n```\nYou open the small mailbox.\nInside you see leaflet.\n```\n',
      'You open the small mailbox.\n\nInside you see leaflet.',
    );
    const outputBlock = report.slice(report.indexOf('─── Output ───'), report.indexOf('─────────────'));
    expect(outputBlock).toMatch(/You open the small mailbox\.\n\s*\n/);
  });
});
