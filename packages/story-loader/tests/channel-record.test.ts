/**
 * channel-record.test.ts — ADR-300 **AC-6**: a `.story` file defines a record
 * channel and the running game populates it, with no TypeScript escape hatch.
 *
 * REAL-PATH (CLAUDE.md rule 13a): real `compile` → real `createStory` → real
 * `StdlibChannelRegistry` → the registered channel's own `produce` closure,
 * driven by real events from the real scheduler daemon. Nothing here
 * hand-builds IR, stubs the registry, or reaches past the loader to construct
 * the value — which is the whole claim AC-6 makes.
 *
 * The seam under test: ADR-300 D7 lets a channel's value BE a record, and the
 * platform already emits one (`banner`). Until D10 an author could not declare
 * one, so a story wanting structure had to reach around the language for
 * something the engine does natively.
 */
import { describe, expect, it } from 'vitest';
import { createNpcService } from '@sharpee/stdlib';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { StdlibChannelRegistry } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory, SchedulerDaemon } from '../src';

const SOURCE = `story
  title: Record Channel
  authors:
    T
  id: record-channel
  ifid: 6E12F1B0-4A5B-4C8D-9E11-0A2B3C4D5E6F
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the clock
  in the Hall

  A clock.

  on every turn
    emit estate-clock with hour "evening" and chime "one" and tone "brass"
  end on

define channel clock
  mode replace
  return record from estate-clock
    when hour
    label "It is (hour)"
    chimes list of chime
  end record
end channel

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
`;

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(
      result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '),
    );
  }
  return result.ir;
}

/** Boot the story for real and return its registry plus this turn's events. */
function load(source: string) {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  story.onEngineReady({ getNpcService: () => createNpcService(), getPluginRegistry: () => ({ register: () => {} }) });

  const registry = new StdlibChannelRegistry();
  story.registerChannels(registry);

  const daemons: SchedulerDaemon[] = story.runtime.buildSchedulerDaemons();
  const events: ISemanticEvent[] = daemons.flatMap((d) => d.run({ world, turn: 1 }));
  return { registry, world, events };
}

/** Run the registered channel's own produce closure against the turn. */
function produce(source: string): unknown {
  const { registry, world, events } = load(source);
  const channel = registry.get('clock');
  expect(channel, 'the story-declared channel registered on the real registry').toBeDefined();
  return channel!.produce({ world, events, blocks: [], turn: 1, prevValue: undefined });
}

/**
 * Run the real closure against the story's own event with one payload field
 * dropped.
 *
 * Why not express this in the `.story` source: the analyzer's ADR-253 D1
 * check rejects a member naming a field the event never emits, which is the
 * right static gate and leaves no way to *declare* runtime absence. A field
 * can still be missing at runtime — an event emitted from two sites with
 * different `when` guards carries different payloads per turn, which is
 * exactly what Fernhill's `estate-clock` does. So the event here is the real
 * emitted one, minus a field; only the payload is narrowed, never the closure.
 */
function produceWithout(source: string, field: string): unknown {
  const { registry, world, events } = load(source);
  const narrowed = events.map((event) => {
    const data = { ...(event.data as Record<string, unknown>) };
    delete data[field];
    return { ...event, data };
  });
  return registry
    .get('clock')!
    .produce({ world, events: narrowed, blocks: [], turn: 1, prevValue: undefined });
}

describe('record-valued channels declared in Chord (ADR-300 D10, AC-6, REAL-PATH)', () => {
  it('AC-6 — the running game populates the declared record', () => {
    expect(produce(SOURCE)).toEqual({
      when: 'evening',
      label: 'It is evening',
      chimes: ['one'],
    });
  });

  it('registers as a json channel carrying the declared mode', () => {
    const { registry } = load(SOURCE);
    const channel = registry.get('clock')!;
    expect(channel.contentType).toBe('json');
    expect(channel.mode).toBe('replace');
  });

  it('a `list of` member whose field is already an array passes through', () => {
    const source = SOURCE.replace(
      'and chime "one"',
      'and chime [ "one", "two", "three" ]',
    );
    expect(produce(source)).toMatchObject({ chimes: ['one', 'two', 'three'] });
  });

  it('a `list of` member the turn did not carry is [] — not a hole', () => {
    // "The event carried none" has to read as an empty list, or every consumer
    // needs a null check the shape was supposed to remove.
    expect(produceWithout(SOURCE, 'chime')).toMatchObject({ chimes: [] });
  });

  it('a scalar member the turn did not carry is omitted, so a consumer can branch on presence', () => {
    // Matches how the platform's own bannerChannel omits absent pieces
    // (`title`, `subtitle`, …) rather than emitting undefined — `'x' in value`
    // is then a real answer instead of "present but undefined".
    const source = SOURCE.replace(
      '    chimes list of chime',
      '    chimes list of chime\n    timbre tone',
    );
    const value = produceWithout(source, 'tone') as Record<string, unknown>;
    expect('timbre' in value).toBe(false);
    // The rest of the record still populates — absence removes one member,
    // not the value.
    expect(value.when).toBe('evening');
    expect(value.chimes).toEqual(['one']);
  });

  it('every declared member is present when the turn carries them all', () => {
    const source = SOURCE.replace(
      '    chimes list of chime',
      '    chimes list of chime\n    timbre tone',
    );
    expect(produce(source)).toEqual({
      when: 'evening',
      label: 'It is evening',
      chimes: ['one'],
      timbre: 'brass',
    });
  });

  it('an append-mode record channel emits its record wrapped as one entry', () => {
    const source = SOURCE.replace('  mode replace', '  mode append');
    expect(produce(source)).toEqual([
      { when: 'evening', label: 'It is evening', chimes: ['one'] },
    ]);
  });

  it('emits nothing on a turn with no matching event', () => {
    const { registry, world } = load(SOURCE);
    const channel = registry.get('clock')!;
    expect(
      channel.produce({ world, events: [], blocks: [], turn: 2, prevValue: undefined }),
    ).toBeUndefined();
  });
});
