/**
 * ownership-runtime.test.ts — Phase C P4: the ownership semantics wired to
 * world state. D4 forward-march at runtime (the analyzer catches only the
 * static change-to-initial case), the decision-10 presence gate with its
 * RNG-not-consumed-off-stage guarantee, the dedicated body-level `must` and
 * statement-`when`-suffix tests (Finding 8 — fixture coverage is
 * incidental), state adjectives read live (D1), and the AC-6 transplant
 * for trait-declared state.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, OpenableTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, ChordStory, createStory, LoadError, SchedulerDaemon } from '../src';

/** The story object's phase key (D2) — not exported via the package index. */
const CHORD_STORY_STATE_KEY = 'chord.story.state';
const CHORD_RNG_KEY = 'chord.rng';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function load(source: string, seed = 11): { story: ChordStory; world: WorldModel; playerId: string } {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, playerId: player.id };
}

const messageIdsOf = (events: ISemanticEvent[]) =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter(Boolean);

/** Fire the `after entering it` clauses of one room, the runtime.test.ts way. */
function enterRoom(story: ChordStory, world: WorldModel, playerId: string, roomIrId: string): ISemanticEvent[] {
  const roomId = story.entityId(roomIrId)!;
  world.moveEntity(playerId, roomId);
  return story.runtime.fireEventClauses(world, {
    id: `move-${roomIrId}`,
    type: 'if.event.actor_moved',
    timestamp: 0,
    entities: { actor: playerId },
    data: { toRoom: roomId, direction: 'NORTH' },
  });
}

// --------------------------------------------------------- forward-march

const MARCH_STORY = `story "March" by "T"
  id: march
  version: 0.0.1
  states: dawn, noon, dusk

define trait ripenable
  states: green, ripe, rotten
end trait

create the Orchard
  a room
  east to the Barn

  An orchard.

  after entering it
    change the plum to ripe
  end after

create the Barn
  a room
  west to the Orchard

  A barn.

  after entering it
    change the story to noon
  end after

create the plum
  scenery
  ripenable
  in the Orchard

create the player
  starts in the Orchard

  You.
`;

describe('D4 forward-march at runtime (non-reversible sets)', () => {
  it('a forward `change` writes the entity state slot', () => {
    const { story, world, playerId } = load(MARCH_STORY);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'plum')).toBe('green');
    enterRoom(story, world, playerId, 'orchard');
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'plum')).toBe('ripe');
  });

  it('a backward `change` against the live state throws (past the static gate)', () => {
    const { story, world, playerId } = load(MARCH_STORY);
    // `change the plum to ripe` passes analysis (ripe is not the initial
    // state) — but from `rotten` it is a back-transition at runtime.
    world.setStateValue(CHORD_STATE_PREFIX + 'plum', 'rotten');
    expect(() => enterRoom(story, world, playerId, 'orchard')).toThrow(LoadError);
    expect(() => enterRoom(story, world, playerId, 'orchard')).toThrow(/forward-only/);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'plum')).toBe('rotten'); // unwritten
  });

  it('the story set marches forward too', () => {
    const { story, world, playerId } = load(MARCH_STORY);
    world.setStateValue(CHORD_STORY_STATE_KEY, 'dusk');
    expect(() => enterRoom(story, world, playerId, 'barn')).toThrow(/forward-only/);
    world.setStateValue(CHORD_STORY_STATE_KEY, 'dawn');
    enterRoom(story, world, playerId, 'barn');
    expect(world.getStateValue(CHORD_STORY_STATE_KEY)).toBe('noon');
  });
});

const REVERSIBLE_STORY = `story "Tide" by "T"
  id: tide
  version: 0.0.1

create the Shore
  a room

  A shore.

  after entering it
    change the tide to low
  end after

create the tide
  scenery
  in the Shore
  states, reversible: low, high

create the player
  starts in the Shore

  You.
`;

describe('D4 reversible sets', () => {
  it('a reversible set permits the back-transition at runtime', () => {
    const { story, world, playerId } = load(REVERSIBLE_STORY);
    world.setStateValue(CHORD_STATE_PREFIX + 'tide', 'high');
    enterRoom(story, world, playerId, 'shore');
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'tide')).toBe('low');
  });
});

// -------------------------------- named-entity change from sequence scope

const SEQUENCE_CHANGE_STORY = `story "Ripening" by "T"
  id: ripening
  version: 0.0.1

create the Orchard
  a room

  An orchard.

create the plum
  scenery
  in the Orchard
  states: green, ripe

define sequence ripening
  at turn 2
    change the plum to ripe
end sequence

create the player
  starts in the Orchard

  You.
`;

describe('named-entity `change` from sequence-step scope (CP6)', () => {
  it('a sequence step names its target explicitly — no `it` in scope', () => {
    const { story, world } = load(SEQUENCE_CHANGE_STORY);
    const daemons = story.runtime.buildSchedulerDaemons();
    const tick = (turn: number) => {
      for (const d of daemons) {
        const ctx = { world, turn };
        if (d.condition && !d.condition(ctx)) continue;
        d.run(ctx);
      }
    };
    tick(1);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'plum')).toBe('green');
    tick(2);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'plum')).toBe('ripe');
  });
});

// --------------------------------------------------------- presence gate

const PRESENCE_STORY = `story "Presence" by "T"
  id: presence
  version: 0.0.1

define trait jumpy
  phrases en-US
    fidget:
      The bull fidgets.

  on every turn
    phrase fidget
  end on
end trait

define phrase snort
  The bull snorts.
end phrase

define phrase hoot
  The owl hoots.
end phrase

define phrase creak
  The rafters creak.
end phrase

create the Meadow
  a room
  east to the Barn

  A meadow.

create the Barn
  a room
  west to the Meadow

  A barn.

  on every turn
    phrase creak
  end on

create the bull
  scenery
  jumpy
  in the Barn

  on every turn while one chance in 2
    phrase snort
  end on

create the owl
  scenery
  in the Barn

  on every turn, once
    phrase hoot
  end on

create the player
  starts in the Meadow

  You.
`;

describe('decision-10 presence gate (performances need an audience)', () => {
  const tick = (daemons: SchedulerDaemon[], world: WorldModel, turn: number): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];
    for (const daemon of daemons) {
      const ctx = { world, turn };
      if (daemon.condition && !daemon.condition(ctx)) continue;
      events.push(...daemon.run(ctx));
    }
    return events;
  };

  it('off-stage clauses do not fire, do not draw the RNG, and do not consume `, once`', () => {
    const { story, world, playerId } = load(PRESENCE_STORY);
    const daemons = story.runtime.buildSchedulerDaemons();

    // Player is in the Meadow; the bull, owl, and the Barn's own clause are
    // all off-stage.
    for (let turn = 1; turn <= 6; turn++) {
      expect(messageIdsOf(tick(daemons, world, turn))).toEqual([]);
    }
    // The bull's `one chance in 2` never drew: the RNG cursor is untouched
    // (AC-5 — on-stage streams stay deterministic regardless of absence).
    expect(world.getStateValue(CHORD_RNG_KEY)).toBeUndefined();

    // Walk into the Barn: room clause, trait clause, and entity clauses all
    // find their audience.
    world.moveEntity(playerId, story.entityId('barn')!);
    const heard = new Set<string>();
    for (let turn = 7; turn <= 12; turn++) {
      for (const id of messageIdsOf(tick(daemons, world, turn))) heard.add(String(id));
    }
    expect(heard).toContain('creak'); // room-owned clause: player IN the room
    expect(heard).toContain('fidget'); // trait every-turn clause
    expect(heard).toContain('snort'); // chance clause draws only on-stage
    expect(heard).toContain('hoot'); // `, once` survived the off-stage turns
    expect(world.getStateValue(CHORD_RNG_KEY)).toBeTypeOf('number');
  });

  it('`, once` fires exactly once on-stage', () => {
    const { story, world, playerId } = load(PRESENCE_STORY);
    const daemons = story.runtime.buildSchedulerDaemons();
    world.moveEntity(playerId, story.entityId('barn')!);
    const first = messageIdsOf(tick(daemons, world, 1));
    expect(first).toContain('hoot');
    for (let turn = 2; turn <= 4; turn++) {
      expect(messageIdsOf(tick(daemons, world, turn))).not.toContain('hoot');
    }
  });
});

// ------------------------------------------- must / when suffix (Finding 8)

const MUSTS_STORY = `story "Musts" by "T"
  id: musts
  version: 0.0.1

define action poking
  grammar
    poke :thing
  refuse without thing: poke-what
  otherwise refuse cant-poke

  phrases en-US
    poke-what:
      Poke what?
    cant-poke:
      Best not.

define trait pokeable
  states, reversible: calm, angry

  phrases en-US
    too-angry:
      It is far too angry to poke again.
    poked:
      Poked. It bristles.

  on poking it
    it must be calm: too-angry
    change it to angry
    phrase poked
  end on
end trait

define phrase glow
  The lantern glows.
end phrase

create the Camp
  a room

  A camp.

create the badger
  scenery
  pokeable
  in the Camp

create the lantern
  scenery
  in the Camp
  states, reversible: dim, bright

  on every turn
    phrase glow when it is bright
  end on

create the player
  starts in the Camp

  You.
`;

interface DispatchAction {
  id: string;
  validate(ctx: unknown): { valid: boolean; error?: string };
  execute(ctx: unknown): void;
  report(ctx: unknown): ISemanticEvent[];
  blocked(ctx: unknown, result: { error?: string }): ISemanticEvent[];
}

describe('body-level `must` and statement `when` suffix (Finding 8)', () => {
  function loadMusts() {
    const loaded = load(MUSTS_STORY);
    const actions = new Map(
      (loaded.story.getCustomActions() as DispatchAction[]).map((a) => [a.id, a]),
    );
    const player = loaded.world.getEntity(loaded.playerId)!;
    const context = (target: IFEntity) => ({
      world: loaded.world,
      player,
      command: { directObject: { entity: target } },
      sharedData: {},
      event: (type: string, data: Record<string, unknown>): ISemanticEvent => ({
        id: `t-${type}`,
        type,
        timestamp: 0,
        entities: {},
        data,
      }),
    });
    const run = (action: DispatchAction, target: IFEntity) => {
      const ctx = context(target);
      const validation = action.validate(ctx);
      if (!validation.valid) return { validation, events: action.blocked(ctx, validation) };
      action.execute(ctx);
      return { validation, events: action.report(ctx) };
    };
    return { ...loaded, actions, run };
  }

  it('`must` holds: the mutation lands and the report fires', () => {
    const { story, world, actions, run } = loadMusts();
    const badger = world.getEntity(story.entityId('badger')!)!;
    const result = run(actions.get('chord.action.poking')!, badger);
    expect(result.validation.valid).toBe(true);
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'badger')).toBe('angry');
    expect(messageIdsOf(result.events)).toContain('poked');
  });

  it('`must` fails: the action blocks with the key and nothing mutates', () => {
    const { story, world, actions, run } = loadMusts();
    const badger = world.getEntity(story.entityId('badger')!)!;
    run(actions.get('chord.action.poking')!, badger); // calm → angry
    const second = run(actions.get('chord.action.poking')!, badger);
    expect(second.validation.valid).toBe(false);
    expect(messageIdsOf(second.events)).toContain('too-angry');
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'badger')).toBe('angry'); // unchanged
  });

  it('a statement `when` suffix gates emission per execution', () => {
    const { story, world } = loadMusts();
    const daemons = story.runtime.buildSchedulerDaemons();
    const tick = (turn: number): ISemanticEvent[] => daemons.flatMap((d) => d.run({ world, turn }));
    expect(messageIdsOf(tick(1))).not.toContain('glow'); // dim: suffix false
    world.setStateValue(CHORD_STATE_PREFIX + 'lantern', 'bright');
    expect(messageIdsOf(tick(2))).toContain('glow');
  });

  it('trait-declared state survives a world-state transplant (AC-6 shape)', () => {
    const first = loadMusts();
    const badger = first.world.getEntity(first.story.entityId('badger')!)!;
    first.run(first.actions.get('chord.action.poking')!, badger); // calm → angry

    // A save carries the namespaced state; a fresh world replays it.
    const saved = first.world.getStateValue(CHORD_STATE_PREFIX + 'badger');
    const second = loadMusts();
    second.world.setStateValue(CHORD_STATE_PREFIX + 'badger', saved);
    const badger2 = second.world.getEntity(second.story.entityId('badger')!)!;
    const result = second.run(second.actions.get('chord.action.poking')!, badger2);
    // The restored `angry` still refuses — behavior resumed, not just data.
    expect(result.validation.valid).toBe(false);
    expect(messageIdsOf(result.events)).toContain('too-angry');
  });
});

// -------------------------------------------------- state adjectives (D1)

const GATE_STORY = `story "Gatehouse" by "T"
  id: gatehouse
  version: 0.0.1

define phrase gate-open
  The gate stands open.
end phrase

create the Yard
  a room

  A yard.

  on every turn
    phrase gate-open when the iron gate is open
  end on

create the iron gate
  scenery
  openable
  in the Yard

create the player
  starts in the Yard

  You.
`;

describe('state adjectives read live from world trait state (D1)', () => {
  it('`is open` tracks OpenableTrait.isOpen with no stored shadow', () => {
    const { story, world } = load(GATE_STORY);
    const daemons = story.runtime.buildSchedulerDaemons();
    const tick = (turn: number): ISemanticEvent[] => daemons.flatMap((d) => d.run({ world, turn }));

    const gate = world.getEntity(story.entityId('iron-gate')!)!;
    const openable = gate.get(TraitType.OPENABLE) as OpenableTrait;
    openable.isOpen = false;
    expect(messageIdsOf(tick(1))).not.toContain('gate-open');
    openable.isOpen = true;
    expect(messageIdsOf(tick(2))).toContain('gate-open');
    // Derivable, never stored: no chord state slot exists for the gate.
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'iron-gate')).toBeUndefined();
  });
});
