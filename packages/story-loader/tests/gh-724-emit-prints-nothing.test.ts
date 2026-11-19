/**
 * gh-724-emit-prints-nothing.test.ts — an `emit` raises a story event, and a
 * story event is not prose: it prints nothing, whatever it is called,
 * whatever its fields are named, and wherever in the story the `emit` sits
 * (GH #724).
 *
 * The reported case: a trait emits `petted` beside `phrase petted`, and each
 * animal overrides the phrase. The player saw the trait's default line and
 * then the animal's own, because the event's name was also a phrase key.
 *
 * REAL-PATH: real @sharpee/chord compile, the loader's real binding, the
 * real parser, `GameEngine.executeTurn` and the engine's own prose pipeline;
 * the text asserted is what the engine's `text:output` carried. The channel
 * value comes from the story's own channel, registered on the real registry
 * and run over the turn's real events; the machine's state is read from the
 * engine's own state-machine plugin.
 *
 * Public interface: none (test module).
 * Owner context: story-loader tests
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { StateMachinePlugin } from '@sharpee/plugin-state-machine';
import { StdlibChannelRegistry } from '@sharpee/stdlib';
import { bootTurns, eventsOfType, type BootedTurns } from './helpers/boot-turns';

const HEADER = `story
  title: Petting Yard
  authors:
    T
  id: petting-yard
  ifid: 7C2D4E10-93AB-4F6E-8D21-5B6A7C8D9E0F
  story-version: 0.0.1

create the Yard
  a room

  A yard of trodden straw.

create Alex
  a person
  playable
  in the Yard

before the game starts
  change the player to Alex
end before

define action petting
  grammar
    pet the animal
  the animal must be reachable
  refuse without animal: cant-pet
  otherwise refuse cant-pet

  phrases en-US
    cant-pet:
      You can't pet that.
`;

/** The trait as the report had it: the event and the phrase share a name. */
const COLLIDING = `${HEADER}
define trait pettable
  phrases en-US
    petted:
      You pet the animal. It seems pleased.

  on the player petting
    emit petted
    phrase petted
  end on
end trait

create the goat
  a thing
  in the Yard
  pettable

  A pygmy goat.

  phrase petted:
    The goat leans into your hand.

create the hen
  a thing
  in the Yard
  pettable

  A speckled hen.
`;

/**
 * One `emit` in every place a statement can run, each carrying the three
 * payload fields the prose pipeline would otherwise read as text. Every
 * marker starts LEAK, so one search of the play's whole text finds any that
 * printed.
 */
const EVERY_PATH = `${HEADER}
define trait pettable
  phrases en-US
    stroked:
      The goat leans into your hand.

  on the player petting
    emit yard-animal-petted with message "LEAK-TRAIT-CLAUSE" and text "LEAK-TRAIT-TEXT" and messageId "cant-pet"
    phrase stroked
  end on
end trait

create the goat
  a thing
  in the Yard
  pettable

  A pygmy goat.

create the bell
  a thing
  in the Yard

  A brass bell.

  phrase rings:
    The bell rings.

  on the player pushing
    emit yard-bell-pushed with message "LEAK-ON-CLAUSE"
    start the bell's echo
    phrase rings
  end on

  after the player examining
    emit yard-bell-seen with message "LEAK-AFTER-CLAUSE"
  end after

  when echo expires
    emit yard-echo-ended with message "LEAK-TIMER-EXPIRY"
  end when

define timer echo for the bell
  first
  second
  meanwhile
    emit yard-echo-heard with message "LEAK-TIMER-MEANWHILE"
end timer

create the clock
  a thing
  in the Yard

  A clock.

  on every turn
    emit yard-clock-ticked with message "LEAK-EVERY-TURN"
  end on

define action whistling
  grammar
    whistle
  emit yard-whistled with message "LEAK-ACTION-BODY"
  emit media-sound-play with src "chime.ogg" and text "LEAK-MEDIA"
  phrase whistled

  phrases en-US
    whistled:
      You whistle.

define sequence yard day
  at turn 2
    emit yard-day-turned with message "LEAK-SEQUENCE"
end sequence

define machine gate
  starts shut

  state shut
    when event yard-bell-pushed: open

  state open, terminal
    on enter
      emit yard-gate-opened with message "LEAK-MACHINE-ENTER"
      phrase gate-opens
    end on
end machine

define phrase gate-opens
  The gate swings open.
end phrase

define phrase weathervane-creaks
  The weathervane creaks.
end phrase

define trait creaking
  on every turn
    phrase weathervane-creaks
  end on
end trait

create the weathervane
  a thing
  in the Yard
  creaking

  A weathervane.

define channel petting-log
  mode replace
  return message from yard-animal-petted
end channel
`;

/** The commands that drive every path of `EVERY_PATH` at least once. */
const PLAY = ['push bell', 'examine bell', 'whistle', 'pet goat', 'wait', 'wait'];

/** Each statement path, with the runtime type its `emit` raises and the marker it carries. */
const PATHS: ReadonlyArray<{ path: string; type: string; marker: string; field: 'message' | 'text' }> = [
  { path: "a thing's on clause", type: 'yard-bell-pushed', marker: 'LEAK-ON-CLAUSE', field: 'message' },
  { path: "a thing's after clause", type: 'yard-bell-seen', marker: 'LEAK-AFTER-CLAUSE', field: 'message' },
  { path: "a trait's clause", type: 'yard-animal-petted', marker: 'LEAK-TRAIT-CLAUSE', field: 'message' },
  { path: "an action's own body", type: 'yard-whistled', marker: 'LEAK-ACTION-BODY', field: 'message' },
  { path: 'a media emit', type: 'media.sound.play', marker: 'LEAK-MEDIA', field: 'text' },
  { path: 'an every-turn clause', type: 'yard-clock-ticked', marker: 'LEAK-EVERY-TURN', field: 'message' },
  { path: "a timer's meanwhile", type: 'yard-echo-heard', marker: 'LEAK-TIMER-MEANWHILE', field: 'message' },
  { path: "a timer's expiry clause", type: 'yard-echo-ended', marker: 'LEAK-TIMER-EXPIRY', field: 'message' },
  { path: 'a sequence step', type: 'yard-day-turned', marker: 'LEAK-SEQUENCE', field: 'message' },
  { path: "a machine state's on enter", type: 'yard-gate-opened', marker: 'LEAK-MACHINE-ENTER', field: 'message' },
];

/** Play `PLAY` through and return everything printed and every event raised. */
async function playEveryPath(): Promise<{ booted: BootedTurns; text: string; events: ISemanticEvent[] }> {
  const booted = await bootTurns(EVERY_PATH);
  const printed: string[] = [];
  const events: ISemanticEvent[] = [];
  for (const command of PLAY) {
    const turn = await booted.turnText(command);
    printed.push(turn.text);
    events.push(...turn.events);
  }
  return { booted, text: printed.join('\n'), events };
}

describe('the reported case: an event named like a phrase (GH #724)', () => {
  it('prints only the entity\'s own phrase', async () => {
    const booted = await bootTurns(COLLIDING);

    const { events, text } = await booted.turnText('pet goat');

    expect(eventsOfType(events, 'petted')).toHaveLength(1);
    expect(text).toContain('The goat leans into your hand.');
    expect(text).not.toContain('You pet the animal. It seems pleased.');
  });

  it('the trait\'s default phrase still prints, once, for an animal with no override', async () => {
    const booted = await bootTurns(COLLIDING);

    const { text } = await booted.turnText('pet hen');

    expect(text.split('You pet the animal. It seems pleased.')).toHaveLength(2);
  });

  it('the story declares `petted` as a story event', async () => {
    const booted = await bootTurns(COLLIDING);

    expect(booted.story.storyEvents).toEqual(['petted']);
  });
});

describe('an emit prints nothing from any statement path', () => {
  it.each(PATHS)('$path raises its event with its payload', async ({ type, marker, field }) => {
    const { events } = await playEveryPath();

    const raised = eventsOfType(events, type);
    expect(raised.length).toBeGreaterThan(0);
    // The engine's enrichment adds its own keys beside the authored ones.
    expect(raised[0].data).toMatchObject({ [field]: marker });
  });

  it('nothing any of those events carries is printed', async () => {
    const { text } = await playEveryPath();

    // The play did print: the prose beside the emits is there.
    expect(text).toContain('The bell rings.');
    expect(text).toContain('You whistle.');
    expect(text).toContain('The goat leans into your hand.');
    expect(text).not.toContain('LEAK');
    // The trait clause's `messageId "cant-pet"` named a real phrase.
    expect(text).not.toContain("You can't pet that.");
  });

  it('prose from the scheduler-run bodies still reaches the player', async () => {
    const { text } = await playEveryPath();

    // A machine state's `on enter`, beside its emit.
    expect(text).toContain('The gate swings open.');
    // A trait's every-turn clause: once per command played.
    expect(text.split('The weathervane creaks.').length - 1).toBe(PLAY.length);
  });

  it('the story declares every one of those types, media included, as a story event', async () => {
    const booted = await bootTurns(EVERY_PATH);

    expect([...booted.story.storyEvents].sort()).toEqual(PATHS.map((p) => p.type).sort());
  });
});

describe('a story event still reaches what listens for it', () => {
  it('a channel fed by the event receives its field', async () => {
    const booted = await bootTurns(EVERY_PATH);
    const registry = new StdlibChannelRegistry();
    booted.story.registerChannels(registry);
    const channel = registry.get('petting-log');
    expect(channel, 'the story-declared channel registered on the real registry').toBeDefined();

    const events = await booted.turn('pet goat');

    expect(channel!.produce({ world: booted.world, events, blocks: [], turn: 1, prevValue: undefined })).toBe('LEAK-TRAIT-CLAUSE');
  });

  it('a machine whose trigger is the event steps on it', async () => {
    const booted = await bootTurns(EVERY_PATH);
    const plugin = booted.engine
      .getPluginRegistry()
      .getAll()
      .find((p): p is StateMachinePlugin => p instanceof StateMachinePlugin);
    if (!plugin) throw new Error('no StateMachinePlugin registered');
    expect(plugin.getRegistry().getMachineState('chord.machine.gate')).toBe('shut');

    await booted.turn('push bell');

    expect(plugin.getRegistry().getMachineState('chord.machine.gate')).toBe('open');
  });
});

describe('the one place an emit cannot be written', () => {
  it('the compiler refuses an emit before the game starts', () => {
    const source = HEADER.replace(
      'before the game starts\n  change the player to Alex\n',
      'before the game starts\n  change the player to Alex\n  emit yard-opened\n',
    );
    expect(source).toContain('  emit yard-opened\n');

    const result = compile(source);

    expect(result.ok).toBe(false);
    expect(result.diagnostics.map((d) => d.code)).toContain('analysis.start-block-narration');
  });
});
