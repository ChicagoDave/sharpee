/**
 * character-dialogue.test.ts — ADR-310/318 Phase 6: character
 * consultation in the topic dispatch, REAL-PATH end to end: a
 * Chord-loaded world drives stdlib's REAL askingAction through the
 * ADR-228 lifecycle (seedData wire, table lookup, override) with the
 * character model consulted at the selection point. Asserts on trait
 * state (ledger, pressure, witness knowledge) and delivered message ids.
 *
 * Covers: the mint rule (a delivered lie pins), the pin filter (the
 * truth line can never escape a maintained lie), maintenance deposits,
 * the confided-reveal arbitration gate (refuse suppresses the row;
 * fear-forced comply delivers, deposits, and the room witnesses the
 * betrayal under its `witnessed as` alias).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { EngineRandomService } from '@sharpee/engine';
import { bootEngine } from './helpers/boot-engine';
import { askingAction } from '@sharpee/stdlib';
import { CharacterModelTrait, IFEntity, TraitType, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

const SOURCE =
  'story\n  title: T\n  authors:\n    N\n  id: char-dialogue\n  story-version: 0.0.1\n\n' +
  'define fact the killer\n  Viola, nobody\nend fact\n\n' +
  'create the Parlor\n  a room\n\n  A parlor.\n\n' +
  'create the Study\n  a room\n\n  A study.\n\n' +
  'create Alex\n  a person\n  playable\n  in the Parlor\n\n  Me.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n' +
  'create Viola\n  a person, proper\n  in the Study\n\n  An actress.\n\n' +
  'create Watson\n  a person, proper\n  in the Parlor\n  mood calm\n\n  A friend.\n\n' +
  'create the Maid\n' +
  '  a person\n' +
  '  in the Parlor\n' +
  '  mood calm\n' +
  '  thinks the killer is Viola, certain\n' +
  '  knows the secret, witnessed, confided\n' +
  '  never betrays a confidence\n' +
  '\n' +
  '  Her.\n\n' +
  'define topic the Maid betrays a confidence as the-betrayal\n\n' +
  'define topics for the Maid\n' +
  '  about "the killer":\n' +
  '    phrase maid-killer-lie when the Maid is calm\n' +
  '    phrase maid-killer-truth\n' +
  '  about "the secret": phrase maid-secret-reveal\n' +
  '  about "the weather": phrase maid-weather\n' +
  'end topics\n\n' +
  'define phrase maid-killer-lie, claims the killer is nobody\n  "No one did it."\nend phrase\n\n' +
  'define phrase maid-killer-truth, claims the killer is Viola\n  "Viola did it."\nend phrase\n\n' +
  'define phrase maid-secret-reveal\n  "The secret, then."\nend phrase\n\n' +
  'define phrase maid-weather\n  "Fine weather."\nend phrase\n';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

interface Loaded {
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
}

function load(): Loaded {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

const entity = (l: Loaded, irId: string): IFEntity => l.world.getEntity(l.story.entityId(irId)!)!;
const traitOf = (l: Loaded, irId: string): CharacterModelTrait =>
  entity(l, irId).get(TraitType.CHARACTER_MODEL) as CharacterModelTrait;

/** Four-phase context over the LIVE world (topic-dispatch harness model). */
function makeContext(l: Loaded, command: Record<string, unknown>): any {
  const currentLocation =
    l.world.getContainingRoom(l.player.id) ?? l.world.getEntity(l.world.getLocation(l.player.id)!)!;
  return {
    world: l.world,
    player: l.player,
    actor: l.player,
    action: askingAction,
    currentLocation,
    command,
    sharedData: {},
    canSee: (target: IFEntity) => l.world.getVisible(l.player.id).some((e) => e.id === target.id),
    requireScope: (target: IFEntity) =>
      l.world.getInScope(l.player.id).some((e) => e.id === target.id)
        ? { ok: true }
        : { ok: false, error: { valid: false, error: 'not_in_scope' } },
    event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
      ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
  };
}

/** Ask the Maid about a topic through the real four-phase action. */
function ask(l: Loaded, text: string) {
  const context = makeContext(l, { directObject: { entity: entity(l, 'maid') }, topic: { text } });
  const validation = askingAction.validate(context);
  context.validationResult = validation;
  let events: ISemanticEvent[] = [];
  if (validation.valid) {
    askingAction.execute(context);
    events = askingAction.report(context);
  }
  return { validation, events };
}

const messageId = (r: { events: ISemanticEvent[] }) => (r.events[0]?.data as any)?.messageId;
const eventOfType = (r: { events: ISemanticEvent[] }, type: string) => r.events.find((e) => e.type === type);

describe('the mint rule and the pin (ADR-318 D9) through the real ask path', () => {
  it('a delivered lie mints a pinned ledger entry and deposits pressure', () => {
    const l = load();
    const r = ask(l, 'the killer');

    expect(messageId(r)).toBe('maid-killer-lie');
    const trait = traitOf(l, 'maid');
    expect(trait.ledger).toEqual([
      {
        kind: 'claim',
        audience: l.player.id,
        factId: 'killer',
        claimedValue: 'nobody',
        turnMinted: 1,
        pinned: true,
      },
    ]);
    expect(trait.pressure.value).toBeGreaterThan(0);
    expect(eventOfType(r, 'character.author.ledger_mint')).toBeDefined();
  });

  it('an honest delivery mints nothing', () => {
    const l = load();
    ask(l, 'the weather');
    expect(traitOf(l, 'maid').ledger).toEqual([]);
    expect(traitOf(l, 'maid').pressure.value).toBe(0);
  });

  it('the truth line can never escape a maintained lie: mood drift filters it to the default reply', () => {
    const l = load();
    ask(l, 'the killer'); // mints the pin while calm
    const trait = traitOf(l, 'maid');
    trait.setMood('angry'); // the lie line's `when it is calm` now fails

    const r = ask(l, 'the killer');

    // The truth line passed its (absent) condition but contradicts the
    // pin — filtered; no phrase survives, so the action's default reply
    // stands and the pinned claim is never contradicted.
    expect(messageId(r)).not.toBe('maid-killer-truth');
    expect(trait.ledger).toHaveLength(1);
    expect(trait.ledger[0].claimedValue).toBe('nobody');
  });

  it('after real NPC ticks, a mint stamps the mirrored turn + 1 (not the unset-mirror fallback)', () => {
    // A real engine: its actor phase's tick path writes the
    // CHARACTER_TURN_KEY mirror (ADR-328 D5).
    const l = bootEngine(SOURCE, 7);
    const random = new EngineRandomService(7);
    for (const turn of [1, 2]) {
      l.phase.onAfterAction({
        world: l.world,
        turn,
        random,
        playerLocation: l.world.getLocation(l.player.id)!,
        playerId: l.player.id,
        actionEvents: [],
      } as never);
    }

    ask(l, 'the killer');

    // Mirror = 2 (last completed tick); the player acts in turn 3.
    expect(traitOf(l, 'maid').ledger[0]).toMatchObject({ factId: 'killer', turnMinted: 3 });
  });

  it('any ask reaching a modeled owner stamps the conversation marker — row hits and misses alike (D16)', () => {
    const l = load();
    const trait = traitOf(l, 'maid');
    expect(trait.activeConversation).toBeUndefined();

    // A row hit stamps it (mirror unset → the player acts in turn 1).
    ask(l, 'the killer');
    expect(trait.activeConversation).toEqual({ partnerId: l.player.id, lastTurn: 1 });

    // A row MISS still stamps: the exchange is a conversation in
    // progress even when the default not-interested reply stands.
    trait.activeConversation = undefined;
    ask(l, 'the weather in patagonia');
    expect(trait.activeConversation).toEqual({ partnerId: l.player.id, lastTurn: 1 });
  });

  it('re-delivering the pinned lie maintains it: no duplicate mint, another pressure deposit', () => {
    const l = load();
    ask(l, 'the killer');
    const trait = traitOf(l, 'maid');
    const afterMint = trait.pressure.value;

    const r = ask(l, 'the killer'); // still calm → the lie line again

    expect(messageId(r)).toBe('maid-killer-lie');
    expect(trait.ledger).toHaveLength(1);
    expect(trait.pressure.value).toBeGreaterThan(afterMint);
    expect(eventOfType(r, 'character.author.pin_held')).toBeDefined();
  });

  it('author events reach the stream attributed to the NPC, not the player (D9)', () => {
    const l = load();
    const first = ask(l, 'the killer'); // mint
    const maidId = entity(l, 'maid').id;
    const mint = eventOfType(first, 'character.author.ledger_mint');
    expect(mint).toBeDefined();
    expect(mint!.entities.actor).toBe(maidId);

    const second = ask(l, 'the killer'); // maintenance → pin_held
    const pin = eventOfType(second, 'character.author.pin_held');
    expect(pin).toBeDefined();
    expect(pin!.entities.actor).toBe(maidId);
  });
});

describe('the confided-reveal arbitration gate (ADR-318 D4/D12a) through the real ask path', () => {
  it('duty holds when unafraid: the row is suppressed, the default reply stands, nothing deposits', () => {
    const l = load();
    const r = ask(l, 'the secret');

    expect(messageId(r)).not.toBe('maid-secret-reveal');
    const trait = traitOf(l, 'maid');
    expect(trait.pressure.value).toBe(0); // duty WON — no defeats, no deposit
    const arbitration = eventOfType(r, 'character.author.arbitration');
    expect(arbitration).toBeDefined();
    expect((arbitration!.data as any).act).toBe('refuse');
    expect((arbitration!.data as any).winner).toBe('duty');
  });

  it('cornered fear forces the reveal: the row delivers, the principle deposits, the room witnesses the aliased betrayal', () => {
    const l = load();
    const trait = traitOf(l, 'maid');
    trait.adjustThreat(100); // cornered — fear 1.0 outburns the principle's 0.7

    const r = ask(l, 'the secret');

    expect(messageId(r)).toBe('maid-secret-reveal');
    const arbitration = eventOfType(r, 'character.author.arbitration');
    expect((arbitration!.data as any).act).toBe('comply');
    expect((arbitration!.data as any).winner).toBe('fear');
    // The defeated principle deposits conscience pressure (D8).
    expect(trait.pressure.value).toBeGreaterThan(0);
    // Watson (co-located, character-model) witnesses the betrayal under
    // its `witnessed as` alias (D12a); Viola (elsewhere) learns nothing.
    expect(traitOf(l, 'watson').knows('the-betrayal')).toBe(true);
    expect(eventOfType(r, 'character.author.act_witnessed')).toBeDefined();
  });

  it('the gate arbitrates once per firing: a second ask arbitrates afresh, an unrelated topic not at all', () => {
    const l = load();
    ask(l, 'the secret'); // refused, no deposit
    const r2 = ask(l, 'the weather'); // ungated topic
    expect(messageId(r2)).toBe('maid-weather');
    expect(eventOfType(r2, 'character.author.arbitration')).toBeUndefined();
  });
});
