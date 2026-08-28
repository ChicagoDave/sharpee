/**
 * actor-voice.test.ts — ADR-328 D4, REAL PATH (rule 13a): a real `WorldModel`,
 * the real `EnglishLanguageProvider` with its shipped action templates, and the
 * real `ProsePipeline`. No formatter double, no handler stub. The event is input
 * data — the thing under test is the rendering layer, which runs unmodified.
 *
 * An `if.event.*` whose `entities.actor` is a non-player entity renders the
 * `{You}`-family template in the third person with the actor's name; the same
 * event actored by the player renders in the second person, byte-for-byte as
 * before. The event PRODUCED by a non-player action is Phase 3/6b's — here the
 * event is supplied.
 */
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { nounPhraseFor } from '@sharpee/stdlib';
import { IdentityTrait, StandardCapabilities, WorldModel, type IFEntity } from '@sharpee/world-model';
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { ProsePipeline } from '../../src/prose-pipeline/pipeline';

/** The shipped closing template: "{You} {close} {the item}." */
const CLOSED = 'if.action.closing.closed';

function textOf(node: TextContent): string {
  return typeof node === 'string' ? node : (node.content ?? []).map(textOf).join('');
}
function blockText(blocks: ITextBlock[]): string {
  return blocks.map((b) => b.content.map(textOf).join('')).join('\n');
}

interface Fixture {
  world: WorldModel;
  provider: EnglishLanguageProvider;
  pipeline: ProsePipeline;
  player: IFEntity;
  thief: IFEntity;
  lamp: IFEntity;
}

function fixture(): Fixture {
  const world = new WorldModel();
  // Mirror the engine's setup registration (game-engine.ts) for the text-state seam.
  world.registerCapability(StandardCapabilities.TEXT_STATE, { initialData: {} });

  const player = world.createEntity('you', 'actor');
  world.setPlayer(player.id);
  const thief = world.createEntity('thief', 'actor');
  thief.add(new IdentityTrait({ name: 'thief', nounType: 'unique' }));
  const lamp = world.createEntity('brass lamp', 'item');
  lamp.add(new IdentityTrait({ name: 'brass lamp' }));

  const provider = new EnglishLanguageProvider();
  const pipeline = new ProsePipeline(provider, world);
  return { world, provider, pipeline, player, thief, lamp };
}

/** A domain event of the shape stdlib actions emit (ADR-097): messageId + params, actor on `entities`. */
function closedBy(actorId: string, lamp: IFEntity): ISemanticEvent {
  return {
    id: `evt-${actorId}`,
    type: 'if.event.closed',
    timestamp: 0,
    entities: { actor: actorId, target: lamp.id },
    data: { messageId: CLOSED, params: { item: nounPhraseFor(lamp) } },
  };
}

describe('ADR-328 D4 — actor voice through the real pipeline', () => {
  it('the shipped template under test is the {You}-family one', () => {
    expect(new EnglishLanguageProvider().getTemplate?.(CLOSED)).toBe('{You} {close} {the item}.');
  });

  it('a non-player actor renders in the third person with its definite name', () => {
    const { pipeline, thief, lamp } = fixture();
    expect(blockText(pipeline.processTurn([closedBy(thief.id, lamp)]))).toBe('The thief closes the brass lamp.');
  });

  it('the player renders in the second person, exactly as before', () => {
    const { pipeline, player, lamp } = fixture();
    expect(blockText(pipeline.processTurn([closedBy(player.id, lamp)]))).toBe('You close the brass lamp.');
  });

  it('both voices in one turn — the player and the thief each get their own person', () => {
    const { pipeline, player, thief, lamp } = fixture();
    const out = blockText(pipeline.processTurn([closedBy(player.id, lamp), closedBy(thief.id, lamp)]));
    expect(out).toBe('You close the brass lamp.\nThe thief closes the brass lamp.');
  });

  it('a game.message event (the generic handler) follows its actor too', () => {
    const { pipeline, provider, thief, player } = fixture();
    // A story-registered template on the same provider the pipeline renders with.
    provider.addMessage('story.wave', '{You} {wave}.');
    const message = (actorId: string): ISemanticEvent => ({
      id: `msg-${actorId}`,
      type: 'game.message',
      timestamp: 0,
      entities: { actor: actorId },
      data: { messageId: 'story.wave' },
    });
    expect(blockText(pipeline.processTurn([message(thief.id)]))).toBe('The thief waves.');
    expect(blockText(pipeline.processTurn([message(player.id)]))).toBe('You wave.');
  });

  it('an actorless event renders in the player voice', () => {
    const { pipeline, lamp } = fixture();
    const event = closedBy('x', lamp);
    event.entities = { target: lamp.id };
    expect(blockText(pipeline.processTurn([event]))).toBe('You close the brass lamp.');
  });
});
