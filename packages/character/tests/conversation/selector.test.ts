/**
 * Dialogue-selector socket tests (ADR-310 D15; ADR-318 D9; contracts.md §4/§5)
 *
 * Derived from the selectAndRecordResponse / recordClaim Behavior
 * Statements: the pin holds a maintained lie's response consistent, the
 * mint rule fires only on lying deliveries, and every DOES line asserts
 * on trait.ledger / trait.pressure state.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorldModel,
  IFEntity,
  CharacterModelTrait,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  NpcTrait,
} from '@sharpee/world-model';
import { CharacterModelDialogue } from '../../src/conversation/dialogue-extension';
import {
  createCharacterDialogueSelector,
  registerCharacterDialogue,
} from '../../src/conversation/selector';
import type { ConversationData, AuthoredResponse } from '../../src/conversation/builder';
import type { ResponseCandidate } from '../../src/conversation/response-types';

function candidate(partial: Partial<ResponseCandidate> & { messageId: string }): ResponseCandidate {
  return { action: 'tell', constraints: [], ...partial };
}

function authored(c: ResponseCandidate): AuthoredResponse {
  return { candidate: c } as AuthoredResponse;
}

/** Conversation data with one 'the crime' topic and truth/lie lines (D9's Steward). */
function stewardData(): ConversationData {
  const responses = new Map<string, AuthoredResponse[]>();
  responses.set('asked about the crime', [
    // First-match-wins order: the lie leads while 'protecting-self' holds
    authored(candidate({
      action: 'lie', messageId: 'steward-alibi',
      constraints: ['protecting-self'],
      claims: { factId: 'the-killer', value: 'nobody' },
    })),
    authored(candidate({
      action: 'tell', messageId: 'steward-truth',
      claims: { factId: 'the-killer', value: 'the-master' },
    })),
  ]);
  return {
    topics: [{ name: 'the crime', keywords: ['crime', 'murder'] }],
    responses,
    initiatives: [],
  } as unknown as ConversationData;
}

describe('the lie ledger through the selector (ADR-318 D9)', () => {
  let trait: CharacterModelTrait;
  let dialogue: CharacterModelDialogue;

  beforeEach(() => {
    trait = new CharacterModelTrait({});
    // The Steward believes the Master did it
    trait.setFactBelief('the-killer', {
      value: 'the-master', confidence: 'certain', source: 'witnessed',
      turnLearned: 0, resistance: 'none',
    });
    trait.registerPredicate('protecting-self', () => true);
    dialogue = new CharacterModelDialogue();
    dialogue.registerNpc('steward', stewardData(), trait, () => 5);
  });

  it('a lying delivery mints a pinned claim and deposits pressure', () => {
    const result = dialogue.handleAsk('steward', 'the crime', 'player');

    expect(result.messageId).toBe('steward-alibi');
    expect(trait.ledger).toHaveLength(1);
    expect(trait.ledger[0]).toMatchObject({
      kind: 'claim', audience: 'player', factId: 'the-killer',
      claimedValue: 'nobody', turnMinted: 5, pinned: true,
    });
    expect(trait.pressure.value).toBe(15);
  });

  it('honest assertion mints nothing (disagreement is not lying)', () => {
    // Drop the self-protection predicate: the truth line is selected
    trait.registerPredicate('protecting-self', () => false);

    const result = dialogue.handleAsk('steward', 'the crime', 'player');

    expect(result.messageId).toBe('steward-truth');
    expect(trait.ledger).toHaveLength(0);
    expect(trait.pressure.value).toBe(0);
  });

  it('the pin holds the lie consistent when constraints drift (contracts §4)', () => {
    // First delivery mints the pin
    dialogue.handleAsk('steward', 'the crime', 'player');
    expect(trait.ledger).toHaveLength(1);

    // Constraint drift: the lie line no longer matches — without the pin,
    // first-match-wins would now pick the truth line
    trait.registerPredicate('protecting-self', () => false);

    const result = dialogue.handleAsk('steward', 'the crime', 'player');

    // The contradicting truth line is filtered by the pin; the lie stands…
    // but its constraint fails too, so nothing matches — the maintained
    // lie is never silently evaporated into the truth
    expect(result.messageId).not.toBe('steward-truth');
  });

  it('a lying delivery carries author-channel events (D11)', () => {
    const result = dialogue.handleAsk('steward', 'the crime', 'player');

    const types = (result.authorEvents ?? []).map(e => e.type);
    expect(types).toEqual([
      'character.author.ledger_mint',
      'character.author.pressure_deposit',
    ]);
    expect(result.authorEvents![0].data).toMatchObject({
      audience: 'player', factId: 'the-killer',
      claimedValue: 'nobody', heldValue: 'the-master',
    });

    // Maintenance delivery: pin_held instead of a second mint
    const again = dialogue.handleAsk('steward', 'the crime', 'player');
    expect((again.authorEvents ?? []).map(e => e.type)).toEqual([
      'character.author.pin_held',
      'character.author.pressure_deposit',
    ]);
  });

  it('re-delivering the pinned lie mints no duplicate but still costs (D9)', () => {
    dialogue.handleAsk('steward', 'the crime', 'player');
    dialogue.handleAsk('steward', 'the crime', 'player');

    expect(trait.ledger).toHaveLength(1);
    // Two lying deliveries → two duty-defeat deposits
    expect(trait.pressure.value).toBe(30);
    expect(trait.pressure.band).toBe('burdened');
  });

  it('claims about facts with no held belief mint nothing', () => {
    const blank = new CharacterModelTrait({});
    blank.registerPredicate('protecting-self', () => true);
    const d = new CharacterModelDialogue();
    d.registerNpc('gossip', stewardData(), blank, () => 1);

    d.handleAsk('gossip', 'the crime', 'player');

    expect(blank.ledger).toHaveLength(0);
    expect(blank.pressure.value).toBe(0);
  });

  it('no audience → no pin filtering, no minting (pre-socket callers unchanged)', () => {
    const result = dialogue.handleAsk('steward', 'the crime');

    expect(result.messageId).toBe('steward-alibi');
    expect(trait.ledger).toHaveLength(0);
    expect(trait.pressure.value).toBe(0);
  });
});

describe('createCharacterDialogueSelector — the world socket (ADR-310 D15)', () => {
  function makeWorldWithNpc(): { world: WorldModel; npc: IFEntity; trait: CharacterModelTrait } {
    const world = new WorldModel();
    const room = world.createEntity('Hall', 'room');
    room.add(new ContainerTrait());
    const player = world.createEntity('Player', 'actor');
    player.add(new ActorTrait({ isPlayer: true }));
    world.setPlayer(player.id);
    world.moveEntity(player.id, room.id);

    const trait = new CharacterModelTrait({});
    const npc = world.createEntity('Steward', 'actor');
    npc.add(new IdentityTrait({ name: 'Steward' }));
    npc.add(new ActorTrait({ isPlayer: false }));
    npc.add(new NpcTrait({}));
    npc.add(trait);
    world.moveEntity(npc.id, room.id);
    return { world, npc, trait };
  }

  it('routes intents to the dialogue handlers with the speaker as audience', () => {
    const { world, npc, trait } = makeWorldWithNpc();
    trait.setFactBelief('the-killer', {
      value: 'the-master', confidence: 'certain', source: 'witnessed',
      turnLearned: 0, resistance: 'none',
    });
    trait.registerPredicate('protecting-self', () => true);

    const dialogue = new CharacterModelDialogue();
    dialogue.registerNpc(npc.id, stewardData(), trait, () => 7);
    registerCharacterDialogue(world, dialogue);

    const selector = world.getDialogueSelector()!;
    const selection = selector(npc, { type: 'ask', text: 'the crime' }, {
      world, speakerId: world.getPlayer()!.id,
    });

    expect(selection).toMatchObject({
      handled: true, messageId: 'steward-alibi',
    });
    // The mint's author events ride the selection to the consulting action
    expect(selection!.authorEvents!.map(e => e.type)).toEqual([
      'character.author.ledger_mint',
      'character.author.pressure_deposit',
    ]);
    // The speaker became the ledger audience — the mint landed on the trait
    expect(trait.ledger[0]?.audience).toBe(world.getPlayer()!.id);
  });

  it('returns undefined for unregistered NPCs (falls through to the default)', () => {
    const { world, npc } = makeWorldWithNpc();
    const selector = createCharacterDialogueSelector(new CharacterModelDialogue());

    const selection = selector(npc, { type: 'ask', text: 'anything' }, {
      world, speakerId: 'player',
    });

    expect(selection).toBeUndefined();
  });

  it('talk-to fires the greeting through the socket', () => {
    const { world, npc, trait } = makeWorldWithNpc();
    const dialogue = new CharacterModelDialogue();
    dialogue.registerNpc(npc.id, stewardData(), trait, () => 1);
    registerCharacterDialogue(world, dialogue);

    const selection = world.getDialogueSelector()!(npc, { type: 'talk-to' }, {
      world, speakerId: world.getPlayer()!.id,
    });

    expect(selection?.handled).toBe(true);
    expect(selection?.messageId).toBe('character.conversation.greeting');
  });
});
