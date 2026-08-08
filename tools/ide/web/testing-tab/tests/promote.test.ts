/**
 * promote.test.ts — which assertion a selected span earns, and what it writes.
 *
 * These pin R2's rule: the editor picks the form from the span, so the author
 * never meets the quote rule, the fence spelling, or `end text`. The cases that
 * matter most are the ones where the OBVIOUS form is wrong — a span carrying a
 * double quote, and a span that is the whole response.
 *
 * Owner context: tools/ide — the Testing tab's web bundle.
 */

import { describe, expect, it } from 'vitest';
import {
  addAssertion,
  addCommand,
  assertionsByCommandLine,
  deleteCommand,
  parse,
  newTranscript,
  removeAssertion,
  saveOutlook,
  serialize,
} from '../src/grammar';
import { promotionFor } from '../src/promote';

const OUTPUT = 'The lid gives with a soft complaint of old hinges.\nInside: a folded deed.';

describe('promotionFor', () => {
  it('has nothing to offer for an empty or whitespace selection', () => {
    expect(promotionFor(OUTPUT, '')).toBeNull();
    expect(promotionFor(OUTPUT, '   \n  ')).toBeNull();
  });

  it('writes an inline contains for a fragment of one line', () => {
    const promotion = promotionFor(OUTPUT, 'a folded deed');
    expect(promotion?.form).toBe('contains-inline');
    expect(promotion?.label).toBe('[OK: contains "a folded deed"]');
    expect(promotion?.assertion).toEqual({ type: 'ok-contains', value: 'a folded deed' });
  });

  it('trims the selection, because a drag picks up the space beside a word', () => {
    expect(promotionFor(OUTPUT, '  a folded deed \n')?.assertion).toEqual({
      type: 'ok-contains',
      value: 'a folded deed',
    });
  });

  // The trap R2 exists to close. Fernhill is mostly quoted dialogue, so this is
  // the common case, not the exotic one.
  it('uses a block when the span carries a double quote, never an inline fragment', () => {
    const quoted = '"You will not," she says.';
    const promotion = promotionFor(quoted, '"You will not,"');
    expect(promotion?.form).toBe('contains-block');
    expect(promotion?.label).not.toContain('"You will not,"');
    expect(promotion?.assertion).toEqual({ type: 'ok-contains', block: ['"You will not,"'] });
    expect(promotion?.because).toContain('double quote');
  });

  it('uses a block when the span crosses a line', () => {
    const promotion = promotionFor(OUTPUT, 'old hinges.\nInside:');
    expect(promotion?.form).toBe('contains-block');
    expect(promotion?.assertion).toEqual({
      type: 'ok-contains',
      block: ['old hinges.', 'Inside:'],
    });
  });

  it('offers the exact form when the whole response is selected', () => {
    const promotion = promotionFor(OUTPUT, OUTPUT);
    expect(promotion?.form).toBe('exact');
    expect(promotion?.label).toBe('[OK]');
    expect(promotion?.assertion).toEqual({ type: 'ok', block: OUTPUT.split('\n') });
  });
});

describe('what promotion writes into the file', () => {
  const file = 'probe.transcript';
  const before = `title: T\nstory: s\n\n---\n\n> open the deed box\n[SKIP]\n`;
  /** The `> open the deed box` line, 1-based, as the wire reports it. */
  const commandLine = 6;

  it('adds an inline contains to the right command', () => {
    const promotion = promotionFor(OUTPUT, 'a folded deed')!;
    const draft = addAssertion(before, file, commandLine, promotion.assertion);
    // The draft `[SKIP]` gives way to the assertion — see the short-circuit case
    // below for why they must never both be present.
    expect(draft.text).toContain('> open the deed box\n[OK: contains "a folded deed"]');
  });

  // The author never types `text` or `end text`, and the fence is not backticks.
  it('writes a block form with the fence the grammar actually uses', () => {
    const promotion = promotionFor(OUTPUT, OUTPUT)!;
    const draft = addAssertion(before, file, commandLine, promotion.assertion);
    expect(draft.text).toContain(
      '[OK]\ntext\nThe lid gives with a soft complaint of old hinges.\nInside: a folded deed.\nend text',
    );
    expect(draft.text).not.toContain('```');
  });

  it('produces a file that parses back to the assertion it wrote', () => {
    const promotion = promotionFor(OUTPUT, 'a folded deed')!;
    const draft = addAssertion(before, file, commandLine, promotion.assertion);
    const reparsed = parse(draft.text, file);
    expect(reparsed.commands[0].assertions).toContainEqual({
      type: 'ok-contains',
      value: 'a folded deed',
    });
    // And is stable: writing it again changes nothing.
    expect(serialize(reparsed)).toBe(draft.text);
    expect(draft.outlook.kind).toBe('clean');
  });

  // Most transcripts run `look` more than once, so text is not identity. An edit
  // that lands on the wrong turn is worse than one that refuses.
  it('finds the command by source line, not by its text', () => {
    const twice = `title: T\nstory: s\n\n---\n\n> look\n[SKIP]\n\n> look\n[SKIP]\n`;
    const draft = addAssertion(twice, file, 9, { type: 'ok-contains', value: 'second' });
    const commands = parse(draft.text, file).commands;
    expect(commands.map((c) => c.assertions.map((a) => a.type))).toEqual([
      ['skip'],
      ['ok-contains'],
    ]);
  });

  it('refuses an edit with nowhere to land rather than dropping it', () => {
    expect(() => addAssertion(before, file, 999, { type: 'ok-contains', value: 'x' })).toThrow(
      /No command at line 999/,
    );
  });

  // Serializing an unsound file writes a husk, so an edit to one would delete the
  // author's work. It must throw before it ever produces text.
  it('refuses to edit a file the runner would refuse', () => {
    expect(() => addAssertion('not a transcript', file, 1, { type: 'ok', block: ['x'] })).toThrow(
      /Cannot edit/,
    );
  });

  // The runner short-circuits on [SKIP]: a command carrying both [SKIP] and an
  // [OK] passes WITHOUT evaluating the [OK]. Appending would therefore write an
  // assertion that is dead and green, which is worse than writing none.
  it('replaces a [SKIP] rather than writing an assertion beside it', () => {
    const draft = addAssertion(before, file, commandLine, { type: 'ok-contains', value: 'deed' });
    expect(draft.text).not.toContain('[SKIP]');
    expect(draft.text).toContain('[OK: contains "deed"]');

    const command = parse(draft.text, file).commands[0];
    expect(command.assertions.map((a) => a.type)).toEqual(['ok-contains']);
  });

  // [TODO] short-circuits the same way but means something the editor has no
  // business resolving on the author's behalf, so it refuses and says why.
  it('refuses to add an assertion to a command marked [TODO]', () => {
    const todo = `title: T\nstory: s\n\n---\n\n> open the deed box\n[TODO: the box is not implemented]\n`;
    expect(() => addAssertion(todo, file, commandLine, { type: 'ok-contains', value: 'deed' }))
      .toThrow(/\[TODO\]/);
  });
});

describe('adding and removing commands', () => {
  const file = 'probe.transcript';
  const before = `title: T\nstory: s\n\n---\n\n> look\n[OK: contains "room"]\n`;

  // R1: a new command asserts nothing, runs, and shows what the story said. The
  // author is never asked to predict output in order to add a command.
  it('adds a command as a [SKIP] draft', () => {
    const draft = addCommand(before, file, 'open the deed box');
    expect(draft.text).toContain('> open the deed box\n[SKIP]');
    expect(draft.outlook.kind).toBe('clean');

    const commands = parse(draft.text, file).commands;
    expect(commands.map((c) => c.input)).toEqual(['look', 'open the deed box']);
  });

  it('trims the command and refuses a blank one', () => {
    expect(addCommand(before, file, '  north  ').text).toContain('> north\n');
    expect(() => addCommand(before, file, '   ')).toThrow(/needs some text/);
  });

  it('produces a file that parses back to what it wrote, and is stable', () => {
    const draft = addCommand(before, file, 'north');
    expect(serialize(parse(draft.text, file))).toBe(draft.text);
  });

  it('removes a command and everything asserted about it', () => {
    const two = `title: T\nstory: s\n\n---\n\n> look\n[OK: contains "room"]\n\n> north\n[OK: contains "hall"]\n`;
    const draft = deleteCommand(two, file, 9);
    expect(draft.text).not.toContain('> north');
    expect(draft.text).not.toContain('hall');
    expect(draft.text).toContain('> look');
    expect(parse(draft.text, file).commands).toHaveLength(1);
  });

  // A transcript with no commands is one the runner refuses, so deleting the last
  // command must be reported rather than written as a husk.
  it('reports that removing the only command leaves an unsound file', () => {
    const draft = deleteCommand(before, file, 6);
    expect(draft.outlook.kind).toBe('unsound');
  });

  it('refuses to remove a command that is not there', () => {
    expect(() => deleteCommand(before, file, 999)).toThrow(/No command at line 999/);
  });
});

describe('a new transcript', () => {
  const file = 'new.transcript';

  it('writes continues: itself, so the author never types a stem', () => {
    const text = newTranscript({ story: 'fernhill', title: 'The vine', continuesFrom: 'arrival' });
    expect(text).toContain('continues: arrival');
    expect(parse(text, file).header.continues).toBe('arrival');
  });

  it('omits continues: for a root', () => {
    const text = newTranscript({ story: 'fernhill', title: 'Arrival', continuesFrom: null });
    expect(text).not.toContain('continues:');
  });

  // Empty rather than seeded with a placeholder command: the author's first
  // command should be their own, not one they have to notice and delete.
  it('carries no command, and says so as a problem rather than pretending', () => {
    const text = newTranscript({ story: 'fernhill', title: 'The vine', continuesFrom: 'arrival' });
    const outlook = saveOutlook(text, file);
    expect(outlook.kind).toBe('unsound');
    expect(outlook.kind === 'unsound' && outlook.problems).toEqual(['Transcript has no commands']);
  });

  // …and that one problem must not lock the file: the edit that fixes it is the
  // one the editor has to allow.
  it('accepts its first command despite being unsound until it has one', () => {
    const text = newTranscript({ story: 'fernhill', title: 'The vine', continuesFrom: 'arrival' });
    const draft = addCommand(text, file, 'north');
    expect(draft.outlook.kind).toBe('clean');
    expect(draft.text).toContain('> north\n[SKIP]');
  });

  it('still refuses edits that would not fix the emptiness', () => {
    const text = newTranscript({ story: 'fernhill', title: 'The vine', continuesFrom: 'arrival' });
    expect(() => deleteCommand(text, file, 1)).toThrow(/Cannot edit/);
  });

  it('is canonical from its first byte, so its first save changes nothing', () => {
    const text = newTranscript({ story: 'fernhill', title: 'The vine', continuesFrom: 'arrival' });
    expect(serialize(parse(text, file))).toBe(text);
  });
});

describe('what a turn claims, and taking one back', () => {
  const file = 'probe.transcript';
  const source =
    `title: T\nstory: s\n\n---\n\n> look\n[OK: contains "room"]\n[OK: not contains "grue"]\n\n> north\n[SKIP]\n`;

  it("reports each command's assertions as the serializer writes them", () => {
    const byLine = assertionsByCommandLine(source, file);
    expect(byLine.get(6)?.map((a) => a.tag)).toEqual([
      '[OK: contains "room"]',
      '[OK: not contains "grue"]',
    ]);
    expect(byLine.get(10)?.map((a) => a.tag)).toEqual(['[SKIP]']);
  });

  // A command carrying [SKIP] or [TODO] has everything after it unevaluated, so a
  // surface listing its claims as equals would misreport what the suite checks.
  it('marks the forms that stop the run from checking anything further', () => {
    const byLine = assertionsByCommandLine(source, file);
    expect(byLine.get(6)?.map((a) => a.haltsEvaluation)).toEqual([false, false]);
    expect(byLine.get(10)?.[0].haltsEvaluation).toBe(true);
  });

  it('carries the literal block for the forms that have one', () => {
    const withBlock = `title: T\nstory: s\n\n---\n\n> look\n[OK]\ntext\nA room.\nend text\n`;
    expect(assertionsByCommandLine(withBlock, file).get(6)?.[0].block).toEqual(['A room.']);
  });

  it('shows nothing for a file it cannot parse, rather than guessing', () => {
    expect(assertionsByCommandLine('not a transcript', file).size).toBe(0);
  });

  it('removes one assertion and leaves the others alone', () => {
    const draft = removeAssertion(source, file, 6, 0);
    expect(draft.text).not.toContain('contains "room"');
    expect(draft.text).toContain('[OK: not contains "grue"]');
    expect(draft.outlook.kind).toBe('clean');
  });

  // A command with no assertions is legal grammar but fails at run time with a
  // named error unless the transcript has a recording. Returning it to [SKIP] —
  // the draft state — is what removing the last claim means.
  it('leaves [SKIP] behind rather than a bare command', () => {
    const one = `title: T\nstory: s\n\n---\n\n> look\n[OK: contains "room"]\n`;
    const draft = removeAssertion(one, file, 6, 0);
    expect(draft.text).toContain('> look\n[SKIP]');
    expect(draft.outlook.kind).toBe('clean');
  });

  it('refuses an index that is not there', () => {
    expect(() => removeAssertion(source, file, 6, 5)).toThrow(/no assertion 6/);
  });
});
