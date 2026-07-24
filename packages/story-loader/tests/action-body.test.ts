/**
 * action-body.test.ts — `define action` bodies and action-level musts wired
 * to the dispatch path (zoo-chain platform fixes, 2026-07-12): musts gate
 * in validate (slots ctx), the body executes mutations/reports through the
 * §5.4 phases with its own decision snapshot, and a behavior host is
 * OPTIONAL when the action carries a body (the photographing shape — its
 * award/phrase previously never ran, and with no behavior every use fell
 * to the `cant` dispatch miss).
 *
 * Asserts on WORLD STATE (score, locations) plus emitted phrase events.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const SOURCE = `story "Action Body" by "Sharpee Platform"
  id: action-body
  version: 0.0.1
  use scoring

define condition yard-thing: it is in the Yard

define action photographing
  grammar
    photo :target
  score snapshot worth 5
  the player must hold the camera: no-camera
  award snapshot
  phrase took-photo
  phrase framed with subject = the gnome

  phrases en-US
    no-camera:
      You don't have a camera.
    took-photo:
      Click! You snap {the target}.
    framed:
      Framed: {the subject}.

define action sweeping
  grammar
    sweep :target
  each yard-thing
    move the match to the Shed
    phrase swept-note when the match is in the Shed
  end each

  phrases en-US
    swept-note:
      Swept away.

create the Yard
  a room

  A yard.

create the Shed
  a room

  A shed.

create the player
  starts in the Yard

create the camera
  in the Yard

  A camera.

create the gnome
  in the Yard

  A gnome.
`;

function compileSource(): StoryIR {
  const result = compile(SOURCE);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface FakeContext {
  world: WorldModel;
  player: IFEntity;
  command: { directObject?: { entity?: IFEntity } };
  sharedData: Record<string, unknown>;
  event(type: string, data: Record<string, unknown>): ISemanticEvent;
}

interface DispatchAction {
  id: string;
  validate(ctx: FakeContext): { valid: boolean; error?: string };
  execute(ctx: FakeContext): void;
  report(ctx: FakeContext): ISemanticEvent[];
  blocked(ctx: FakeContext, result: { error?: string }): ISemanticEvent[];
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  actions: Map<string, DispatchAction>;
}

function load(): Loaded {
  const story = createStory(compileSource(), { seed: 42 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const actions = new Map((story.getCustomActions() as DispatchAction[]).map((a) => [a.id, a]));
  return { story, world, player, actions };
}

function run(l: Loaded, actionId: string, targetIrId: string) {
  const ctx: FakeContext = {
    world: l.world,
    player: l.player,
    command: { directObject: { entity: l.world.getEntity(l.story.entityId(targetIrId)!)! } },
    sharedData: {},
    event: (type, data) => ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }),
  };
  const action = l.actions.get(actionId)!;
  const validation = action.validate(ctx);
  if (!validation.valid) return { validation, events: action.blocked(ctx, validation) };
  action.execute(ctx);
  return { validation, events: action.report(ctx) };
}

const messageIds = (events: ISemanticEvent[]) =>
  events.filter((e) => e.type === 'chord.phrase').map((e) => (e.data as { messageId?: string }).messageId);

describe('action-level musts (D6) gate the dispatch in validate', () => {
  it('refuses with the must phrase key while the requirement fails, mutating nothing', () => {
    const l = load();
    const { validation } = run(l, 'chord.action.photographing', 'gnome');
    expect(validation).toEqual({ valid: false, error: 'no-camera' });
    expect(l.world.getScore()).toBe(0);
  });

  it('passes once the requirement holds', () => {
    const l = load();
    l.world.moveEntity(l.story.entityId('camera')!, l.player.id);
    const { validation } = run(l, 'chord.action.photographing', 'gnome');
    expect(validation.valid).toBe(true);
  });
});

describe('action bodies execute through the §5.4 phases (behavior host optional)', () => {
  it('award mutates the score in execute; phrase reports; award dedups on repeat', () => {
    const l = load();
    l.world.moveEntity(l.story.entityId('camera')!, l.player.id);

    const first = run(l, 'chord.action.photographing', 'gnome');
    expect(first.validation.valid).toBe(true);
    expect(l.world.getScore()).toBe(5); // action-owned score, awarded by the BODY
    expect(messageIds(first.events)).toContain('took-photo');
    // Grammar-slot params bind into the phrase event so `{the target}`
    // templates render — the slot entity's name, keyed by slot name.
    const photo = first.events.find(
      (e) => e.type === 'chord.phrase' && (e.data as { messageId?: string }).messageId === 'took-photo',
    )!;
    expect(((photo.data as { params?: Record<string, unknown> }).params ?? {}).target).toBe('gnome');
    // Authored `with subject = the gnome` params flow too (entity values
    // pass as display names).
    const framed = first.events.find(
      (e) => e.type === 'chord.phrase' && (e.data as { messageId?: string }).messageId === 'framed',
    )!;
    expect(((framed.data as { params?: Record<string, unknown> }).params ?? {}).subject).toBe('gnome');

    const second = run(l, 'chord.action.photographing', 'gnome');
    expect(second.validation.valid).toBe(true);
    expect(l.world.getScore()).toBe(5); // dedup by identity (ADR-129)
  });

  it('an each block in an action body iterates with the pre-mutation snapshot', () => {
    const l = load();
    const shed = l.story.entityId('shed')!;
    const { validation, events } = run(l, 'chord.action.sweeping', 'gnome');
    expect(validation.valid).toBe(true);

    // Mutations: every yard-thing (player, camera, gnome — creation order)
    // moved to the Shed.
    expect(l.world.getLocation(l.story.entityId('gnome')!)).toBe(shed);
    expect(l.world.getLocation(l.story.entityId('camera')!)).toBe(shed);
    expect(l.world.getLocation(l.player.id)).toBe(shed);

    // Reports visit the SNAPSHOTTED set: three swept-notes even though a
    // live post-mutation enumeration of yard-thing would now be empty.
    expect(messageIds(events).filter((m) => m === 'swept-note')).toHaveLength(3);
  });
});
