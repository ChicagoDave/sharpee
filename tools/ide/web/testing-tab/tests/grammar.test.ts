/**
 * grammar.test.ts — what the tab's transcript grammar promises.
 *
 * `saveOutlook` is what the source face shows and what slice 2b's save will act
 * on, so each of its three answers — clean, reformats, unsound — is pinned here.
 * The real-path suite drives one of them through the rendered page; these cover
 * the branches that surface cannot reach cheaply, and one that matters more than
 * the others: an unsound parse must never be reported as a formatting question.
 *
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { describe, expect, it } from 'vitest';
import { commandCount, parse, saveOutlook, serialize } from '../src/grammar';

/** The smallest thing the parser accepts, so a case shows only what it is about. */
function transcript(body: string): string {
  return `story: fernhill\n\n---\n\n${body}`;
}

describe('saveOutlook', () => {
  it('reports a file the serializer would leave alone', () => {
    const text = transcript('> north\n[OK: contains "Entrance Hall"]\n');
    const outlook = saveOutlook(text, 'probe.transcript');
    expect(outlook.kind).toBe('clean');
    expect(outlook.kind === 'clean' && outlook.generated).toBe(text);
  });

  it('reports what a save would rewrite, and how much', () => {
    // Spacing around a command is not preserved: `>    look   ` is canonicalised
    // to `> look`. One line out, one line in.
    const text = transcript('>    look   \n[SKIP]\n');
    const outlook = saveOutlook(text, 'probe.transcript');
    expect(outlook.kind).toBe('reformats');
    if (outlook.kind !== 'reformats') return;
    expect(outlook.changedLines).toBe(2);
    expect(outlook.generated).toContain('\n> look\n');
  });

  it('counts a rewrite as a diff would, not by line position', () => {
    // A header value re-wraps into three lines where the author wrote one, near
    // the top of the file, so every line below shifts. Counting by position would
    // call that a whole-file rewrite and scare an author off a four-line one.
    const text = `title: T\nstory: s\ndescription: ${'word '.repeat(30).trim()}\n\n---\n\n> look\n[SKIP]\n`;
    const outlook = saveOutlook(text, 'probe.transcript');
    expect(outlook.kind).toBe('reformats');
    if (outlook.kind !== 'reformats') return;
    expect(outlook.changedLines).toBe(4);
  });

  // A known limitation, pinned so it is a decision rather than a surprise: the
  // serializer's block is a command, its assertions, and the comments ABOVE it,
  // so a comment written between two of one command's assertions has nowhere to
  // go and ends up after them. This is why the source face previews a save.
  it('shows a comment between assertions moving, rather than hiding it', () => {
    const text = transcript('> north\n[OK: contains "a"]\n\n# note\n[OK: contains "b"]\n');
    const outlook = saveOutlook(text, 'probe.transcript');
    expect(outlook.kind).toBe('reformats');
    if (outlook.kind !== 'reformats') return;
    expect(outlook.generated).toContain('[OK: contains "a"]\n[OK: contains "b"]');
    expect(outlook.generated).toContain('# note');
  });

  // The hazard this type exists for. `parseTranscript` does NOT throw on text it
  // cannot read — it returns a transcript with no commands, which serializes to
  // a three-line husk. An outlook that only caught throws would call this
  // "reformats 5 lines" and a save would then delete the file.
  it('calls unreadable text unsound rather than a five-line reformat', () => {
    const outlook = saveOutlook('not a transcript at all', 'probe.transcript');
    expect(outlook.kind).toBe('unsound');
    expect(outlook.kind === 'unsound' && outlook.problems).toContain('Transcript has no commands');
  });

  it('is unsound for a file the runner would refuse, and says why', () => {
    // A header with no story or title: `validateTranscript` refuses it, and it is
    // the same function `sharpee test` refuses transcripts with.
    const outlook = saveOutlook('---\n\n> north\n[OK: contains "x"]\n', 'probe.transcript');
    expect(outlook.kind).toBe('unsound');
    if (outlook.kind !== 'unsound') return;
    expect(outlook.problems.join(' ')).toContain('title or story');
  });

  it('never offers generated text for an unsound file', () => {
    const outlook = saveOutlook('nothing here', 'probe.transcript');
    expect(outlook).not.toHaveProperty('generated');
  });
});

describe('commandCount', () => {
  it('counts the commands a transcript runs, through the runner\'s own parser', () => {
    const text = transcript('> north\n[SKIP]\n\n> look\n[OK: contains "hall"]\n');
    expect(commandCount(text, 'probe.transcript')).toBe(2);
  });

  it('answers null for text the grammar half-read, never a guess', () => {
    // An unclosed text block is a parse ERROR the lenient parser records
    // rather than throws, and it can swallow the commands after it — so the
    // count is untrustworthy. A wrong count here would feed a warning about
    // OTHER files' turn numbers.
    const text = transcript('> look\n[OK]\ntext\nA den.\n');
    expect(commandCount(text, 'probe.transcript')).toBeNull();
  });
});

describe('the grammar is the one the test run uses', () => {
  // branch-tester and transcript-tester are different grammars. transcript-tester
  // answers this form with `Unknown assertion format` and a null, dropping the
  // assertion — so a tab built on it would delete assertions on save. This is the
  // cheapest place to catch the wrong import.
  it('round-trips [CHANNEL: id, is absent], which the other parser drops', () => {
    const text = transcript('> north\n[CHANNEL: clock, is absent]\n');
    expect(serialize(parse(text, 'probe.transcript'))).toContain('[CHANNEL: clock, is absent]');
  });

  it('round-trips the [CHANNEL:] contains form too', () => {
    const text = transcript('> north\n[CHANNEL: status, contains "Fountain Court"]\n');
    expect(serialize(parse(text, 'probe.transcript'))).toContain(
      '[CHANNEL: status, contains "Fountain Court"]',
    );
  });
});
