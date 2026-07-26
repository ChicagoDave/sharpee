/**
 * entityless-dispatch.test.ts — ADR-275: entity-less dispatch commands and
 * semantic word binding. Drives the sailing action's four-phase dispatch
 * directly (the dispatch.test.ts harness shape) with `parsed.extras`
 * carrying the matched rule's defaultSemantics, as the parser merges them
 * (ADR-148):
 *   D1 — an entity-less command runs the body; a bare verb (no binding)
 *        still refuses via the `refuse without` arm; an action with NO
 *        entity-less pattern keeps the old miss.
 *   D2 — `{the direction}` renders the WORD verbatim in the report phrase.
 *   D4 — `refuse when the direction is aft` refuses by word equality.
 *   D6 — a must with an unbindable subject refuses with its key (closed);
 *        a refuse-when arm over an unbound binding does not fire (open).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const HEADER = 'story "T" by "N"\n  id: t\n  version: 0.0.1\n\n';
const WORLD = `create the Cockpit\n  a room\n\n  A cockpit.\n\ncreate the tiller\n  scenery\n  in the Cockpit\n\n  A tiller.\n\ncreate the player\n  starts in the Cockpit\n\n  You.\n`;

const SAILING = `${HEADER}define action sailing
  grammar
    sail the direction
    the direction
  directions
    port or p
    starboard or sb
    fore
    aft
  refuse without direction: sail-where
  refuse when the direction is aft: no-aft
  phrase sailed

  phrases en-US
    sail-where:
      Sail which way?
    no-aft:
      Never aft.
    sailed:
      The sloop swings {the direction}.

${WORLD}`;

interface FakeContext {
  world: WorldModel;
  player: IFEntity;
  command: { directObject?: { entity?: IFEntity }; parsed?: { extras?: Record<string, unknown> } };
  sharedData: Record<string, unknown>;
  event(type: string, data: Record<string, unknown>): ISemanticEvent;
}

interface DispatchAction {
  id: string;
  validate(ctx: FakeContext): { valid: boolean; error?: string };
  execute(ctx: FakeContext): void;
  report(ctx: FakeContext): ISemanticEvent[];
}

function load(source: string): { story: ChordStory; world: WorldModel; player: IFEntity; actions: Map<string, DispatchAction> } {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const actions = new Map<string, DispatchAction>();
  for (const a of story.getCustomActions() as DispatchAction[]) actions.set(a.id, a);
  return { story, world, player, actions };
}

function ctxOf(world: WorldModel, player: IFEntity, extras?: Record<string, unknown>): FakeContext {
  return {
    world,
    player,
    command: { parsed: extras ? { extras } : undefined },
    sharedData: {},
    event: (type, data) => ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

describe('entity-less dispatch (ADR-275)', () => {
  let world: WorldModel;
  let player: IFEntity;
  let sailing: DispatchAction;

  beforeEach(() => {
    const loaded = load(SAILING);
    world = loaded.world;
    player = loaded.player;
    sailing = loaded.actions.get('chord.action.sailing')!;
  });

  it('D1/D2: `sail port` validates entity-less and the report renders the word', () => {
    const ctx = ctxOf(world, player, { direction: 'port' });
    expect(sailing.validate(ctx)).toEqual({ valid: true });
    sailing.execute(ctx);
    const events = sailing.report(ctx);
    expect(events.length).toBeGreaterThan(0);
    const text = JSON.stringify(events.map((e) => e.data));
    expect(text).toContain('port');
  });

  it('D1: a bare verb (no binding at all) refuses via the without arm', () => {
    const ctx = ctxOf(world, player);
    expect(sailing.validate(ctx)).toEqual({ valid: false, error: 'sail-where' });
  });

  it('D4: `sail aft` refuses by word equality in the refuse-when arm', () => {
    const ctx = ctxOf(world, player, { direction: 'aft' });
    expect(sailing.validate(ctx)).toEqual({ valid: false, error: 'no-aft' });
  });

  it('D4: non-aft directions sail on — the arm compares words, never entities', () => {
    for (const word of ['starboard', 'fore']) {
      const ctx = ctxOf(world, player, { direction: word });
      expect(sailing.validate(ctx)).toEqual({ valid: true });
    }
  });

  it('D2: only DECLARED semantic keys bind — arbitrary extras never leak into scope', () => {
    const ctx = ctxOf(world, player, { direction: 'port', smuggled: 'contraband' });
    expect(sailing.validate(ctx)).toEqual({ valid: true });
    sailing.execute(ctx);
    const text = JSON.stringify(sailing.report(ctx).map((e) => e.data));
    expect(text).not.toContain('contraband');
  });

  it('D6: a must whose subject cannot be bound on this shape refuses with its key (fails closed)', () => {
    // Mixed-shape action: `sail the boat` binds an entity slot the
    // entity-less `sail port` never fills — the must fails CLOSED.
    const source = `${HEADER}define action sailing
  grammar
    sail the boat
    sail the direction
    the direction
  directions
    port or p
    starboard or sb
  the boat must hold the tiller: boat-gone
  phrase sailed

  phrases en-US
    boat-gone:
      No boat under you.
    sailed:
      The sloop swings {the direction}.

${WORLD}`;
    const loaded = load(source);
    const action = loaded.actions.get('chord.action.sailing')!;
    const ctx = ctxOf(loaded.world, loaded.player, { direction: 'port' });
    expect(action.validate(ctx)).toEqual({ valid: false, error: 'boat-gone' });
  });

  it('D1: an action with no entity-less pattern keeps the dispatch miss', () => {
    const source = `${HEADER}define action polishing\n  grammar\n    polish the target\n  otherwise refuse cant-polish\n\n  phrases en-US\n    cant-polish:\n      No.\n\n${WORLD}`;
    const loaded = load(source);
    const action = loaded.actions.get('chord.action.polishing')!;
    const ctx = ctxOf(loaded.world, loaded.player);
    expect(action.validate(ctx)).toEqual({ valid: false, error: 'cant-polish' });
  });
});
