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
import {
  addAssertion,
  addCommand,
  commandCount,
  deleteCommand,
  editCommand,
  newTranscript,
  parse,
  reparent,
  saveOutlook,
  serialize,
} from '../src/grammar';

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

  // D2 (phase-6 log): a newly created transcript is empty BY DESIGN, and the
  // add-command bar is its fix — so the outlook must not lump it in with
  // damage. `empty`, never `unsound`, for exactly this file.
  it('calls a newly created transcript empty, not unsound', () => {
    const text = newTranscript({ story: 'fernhill', title: 'begin', continuesFrom: null });
    const outlook = saveOutlook(text, 'begin.transcript');
    expect(outlook.kind).toBe('empty');
    expect(outlook.kind === 'empty' && outlook.generated).toBe(text);
  });

  it('keeps zero-command text with any OTHER defect unsound', () => {
    // No title and no story alongside the missing commands: two problems, so
    // the empty classification must not fire.
    const outlook = saveOutlook('---\n', 'probe.transcript');
    expect(outlook.kind).toBe('unsound');
  });

  it('keeps zero-command text the serializer cannot reproduce unsound', () => {
    // Parses to zero commands with a legal header, but the round trip loses
    // the stray text — the husk hazard, not a new file.
    const text = newTranscript({ story: 'fernhill', title: 'begin', continuesFrom: null });
    const outlook = saveOutlook(`${text}\nstray line the serializer drops\n`, 'begin.transcript');
    expect(outlook.kind).not.toBe('empty');
  });

  it('addCommand turns an empty transcript into a sound one-command file', () => {
    const text = newTranscript({ story: 'fernhill', title: 'begin', continuesFrom: null });
    const draft = addCommand(text, 'begin.transcript', 'look');
    expect(draft.text).toContain('\n> look\n');
    expect(draft.text).toContain('[SKIP]');
    expect(draft.outlook.kind).not.toBe('unsound');
    expect(draft.outlook.kind).not.toBe('empty');
  });

  it('addCommand writes a BARE command under an auto-assertion policy (Phase 6e)', () => {
    // A bare command is the policy's trigger — its first run writes the
    // assertion — where [SKIP] means deliberately unasserted and the runner
    // never touches it. The bare file must still be sound: a bare command
    // list is legal grammar (ADR-294 D2; the runner enforces the boundary).
    const text = newTranscript({ story: 'fernhill', title: 'begin', continuesFrom: null });
    const draft = addCommand(text, 'begin.transcript', 'look', true);
    expect(draft.text).toContain('\n> look\n');
    expect(draft.text).not.toContain('[SKIP]');
    expect(draft.outlook.kind).not.toBe('unsound');
    expect(draft.outlook.kind).not.toBe('empty');
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

describe('editCommand', () => {
  it('changes the command and keeps everything asserted about it', () => {
    const text = transcript(
      '> north\n[SKIP]\n\n> examine the doormat\n[OK: contains "worn bald"]\n[CHANNEL: status, contains "Porch"]\n',
    );
    const draft = editCommand(text, 'probe.transcript', 8, 'x doormat');
    expect(draft.text).toContain('> x doormat\n[OK: contains "worn bald"]');
    expect(draft.text).toContain('[CHANNEL: status, contains "Porch"]');
    expect(draft.text).not.toContain('examine the doormat');
    // The other command is untouched — the edit is to one command, not a rewrite.
    expect(draft.text).toContain('> north\n[SKIP]');
  });

  it('refuses a blank replacement', () => {
    const text = transcript('> north\n[SKIP]\n');
    expect(() => editCommand(text, 'probe.transcript', 5, '   ')).toThrow(
      'A command needs some text.',
    );
  });

  it('refuses a line with no command on it', () => {
    const text = transcript('> north\n[SKIP]\n');
    expect(() => editCommand(text, 'probe.transcript', 6, 'south')).toThrow('No command at line 6');
  });

  it('refuses an unsound file rather than serializing a husk over it', () => {
    expect(() => editCommand('not a transcript', 'probe.transcript', 1, 'north')).toThrow(
      'Cannot edit',
    );
  });
});

// The cards address commands by the SOURCE LINE of the last run, and a
// structural edit since that run shifts every later command up. So a stale line
// can land on a DIFFERENT command that now occupies it — and a guard that only
// checked "is there a command here?" would edit the wrong turn silently. The
// caller says what it believes is at the line; the file must agree.
describe('targeting a command the caller can see', () => {
  const text = transcript('> north\n[SKIP]\n\n> look\n[SKIP]\n');

  it('refuses when the line holds a different command than the card showed', () => {
    expect(() => editCommand(text, 'probe.transcript', 5, 'south', 'look')).toThrow(
      'the file has changed since this run',
    );
    expect(() => deleteCommand(text, 'probe.transcript', 5, 'look')).toThrow(
      'the file has changed since this run',
    );
    expect(() =>
      addAssertion(text, 'probe.transcript', 5, { type: 'ok', text: 'x' } as never, 'look'),
    ).toThrow('the file has changed since this run');
  });

  it('proceeds when line and text agree', () => {
    const draft = deleteCommand(text, 'probe.transcript', 5, 'north');
    expect(draft.text).not.toContain('> north');
    expect(draft.text).toContain('> look');
  });
});

// R3: a world-change chip writes a [STATE:] assertion through the same
// addAssertion path a promoted selection uses. The serializer owns the
// spelling, so what lands is exactly what the runner parses back.
describe('state assertions from world changes', () => {
  it('writes [STATE:] in the serializer\'s spelling, replacing a [SKIP] like any promotion', () => {
    const text = transcript('> take key\n[SKIP]\n');
    const draft = addAssertion(text, 'probe.transcript', 5, {
      type: 'state-assert',
      assertTrue: true,
      stateExpression: 'player.inventory contains key',
    } as never);
    expect(draft.text).toContain('[STATE: true, player.inventory contains key]');
    expect(draft.text).not.toContain('[SKIP]');

    const negative = addAssertion(text, 'probe.transcript', 5, {
      type: 'state-assert',
      assertTrue: false,
      stateExpression: 'player.inventory contains sherry',
    } as never);
    expect(negative.text).toContain('[STATE: false, player.inventory contains sherry]');
  });
});

// `continues:` is R5's field: load-bearing, documented nowhere an author
// reads, and owned by the editor end to end so it cannot be misspelled.
describe('reparent', () => {
  it('rewrites what the file continues from, touching nothing else', () => {
    const text = `title: T\nstory: fernhill\ncontinues: arrival\n\n---\n\n> north\n[OK: contains "hall"]\n`;
    const draft = reparent(text, 'probe.transcript', 'key');
    expect(draft.text).toContain('continues: key');
    expect(draft.text).not.toContain('continues: arrival');
    expect(draft.text).toContain('[OK: contains "hall"]');
  });

  it('makes the file a root by removing the field, and can add one to a root', () => {
    const text = `title: T\nstory: fernhill\ncontinues: arrival\n\n---\n\n> north\n[SKIP]\n`;
    const rooted = reparent(text, 'probe.transcript', null);
    expect(rooted.text).not.toContain('continues:');
    const reparented = reparent(rooted.text, 'probe.transcript', 'key');
    expect(reparented.text).toContain('continues: key');
  });

  it('refuses the one-node cycle it can see: a file continuing from itself', () => {
    const text = `title: T\nstory: fernhill\n\n---\n\n> north\n[SKIP]\n`;
    expect(() => reparent(text, 'tests/transcripts/probe.transcript', 'probe')).toThrow(
      'cannot continue from itself',
    );
  });

  it('refuses an unsound file rather than serializing a husk over it', () => {
    expect(() => reparent('not a transcript', 'probe.transcript', 'key')).toThrow('Cannot edit');
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
