/**
 * story-events-ir.test.ts — the compiled IR records the story-event
 * vocabulary: the event id of every `emit` in the story, wherever it sits,
 * each once and sorted. `validateIR` refuses an IR whose list disagrees with
 * its own `emit` statements.
 *
 * Public interface: none (test module).
 * Owner context: @sharpee/chord tests
 */
import { describe, expect, it } from 'vitest';
import { compile, validateIR, type StoryIR } from '../src';

const SOURCE = `story
  title: Signal Yard
  authors:
    T
  id: signal-yard
  ifid: 3F2A1B0C-5D6E-4F70-8A91-B2C3D4E5F607
  story-version: 0.0.1

create the Yard
  a room

  A yard.

create Alex
  a person
  playable
  in the Yard

before the game starts
  change the player to Alex
end before

define sound chime from "chime.ogg"

create the bell
  a thing, singular
  in the Yard

  A bell.

  on the player pushing
    emit yard-bell-pushed with force 2
    emit yard-bell-pushed with force 3
    play sound chime
  end on

  after the player examining
    emit yard-bell-seen
  end after

create the clock
  a thing, singular
  in the Yard

  A clock.

  on every turn
    emit yard-clock-ticked
  end on

define trait pettable
  on the player touching
    emit animal-touched
  end on
end trait

define action whistling
  grammar
    whistle
  emit yard-whistled
  phrase whistled

  phrases en-US
    whistled:
      You whistle.
`;

function compiled(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('the IR records the story-event vocabulary', () => {
  it('lists the event of every emit, wherever it sits, each once and sorted', () => {
    const ir = compiled(SOURCE);

    expect(ir.storyEvents).toEqual([
      'animal-touched',
      'yard-bell-pushed',
      'yard-bell-seen',
      'yard-clock-ticked',
      'yard-whistled',
    ]);
  });

  it('a story with no emit records an empty list', () => {
    const ir = compiled(SOURCE.split('define sound chime')[0]);

    expect(ir.storyEvents).toEqual([]);
  });

  it('a media statement that lowers to an emit is listed under its media id', () => {
    const source = SOURCE.replace('    play sound chime\n', '    stop music\n');
    expect(source).toContain('stop music');

    const ir = compiled(source);

    expect(ir.storyEvents).toContain('media-music-stop');
  });
});

describe('validateIR refuses a story-event list that disagrees with the emits', () => {
  const codes = (ir: StoryIR): string[] => validateIR(ir).map((d) => d.code);

  it('accepts the list the compiler recorded', () => {
    expect(codes(compiled(SOURCE))).not.toContain('analysis.story-events-mismatch');
  });

  it('refuses a list that leaves an emitted event out, and names it', () => {
    const ir = compiled(SOURCE);
    const rogue: StoryIR = { ...ir, storyEvents: ir.storyEvents.filter((id) => id !== 'yard-clock-ticked') };

    const found = validateIR(rogue).filter((d) => d.code === 'analysis.story-events-mismatch');

    expect(found).toHaveLength(1);
    expect(found[0].severity).toBe('error');
    expect(found[0].message).toContain('`yard-clock-ticked`');
  });

  it('refuses a list that names an event no emit raises', () => {
    const ir = compiled(SOURCE);
    const rogue: StoryIR = { ...ir, storyEvents: [...ir.storyEvents, 'taken'] };

    const found = validateIR(rogue).filter((d) => d.code === 'analysis.story-events-mismatch');

    expect(found).toHaveLength(1);
    expect(found[0].message).toContain('`taken`');
  });

  it('refuses a list that names an event twice', () => {
    const ir = compiled(SOURCE);
    const rogue: StoryIR = { ...ir, storyEvents: [...ir.storyEvents, 'yard-whistled'] };

    expect(codes(rogue)).toContain('analysis.story-events-mismatch');
  });
});
