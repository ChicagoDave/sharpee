/**
 * boot-turns.ts — a REAL `GameEngine` over a compiled Chord story, driven
 * one command at a time, with the engine's own event stream sliced per
 * turn. The harness the publish-readiness fixtures share: the loader's real
 * binding, the real parser and language layer, the real perception service,
 * `GameEngine.executeTurn` — no doubles anywhere on the path.
 *
 * Public interface: bootTurns, BootedTurns, compileSource (re-exported),
 * messageIdsOf, eventsOfType.
 * Owner context: story-loader tests
 */
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { EntityType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../../src';
import { compileSource } from './boot-engine';

export { compileSource };

export interface BootedTurns {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** Every event the engine has emitted since boot, in stream order. */
  stream: ISemanticEvent[];
  /** Run one command and return only that turn's events, in stream order. */
  turn: (input: string) => Promise<ISemanticEvent[]>;
  /** Run one command and return that turn's events plus its rendered text (the engine's `text:output` blocks, flattened). */
  turnText: (input: string) => Promise<{ events: ISemanticEvent[]; text: string }>;
  /** The world id of a Chord entity, by its IR id. */
  id: (irId: string) => string;
}

/**
 * Boot a real engine over the story and start it (the boot look runs).
 *
 * @param source - Chord source
 * @param seed - The story's and the engine's session seed
 * @returns The engine, the story, its world and player, and a per-turn driver
 */
export async function bootTurns(source: string, seed = 7): Promise<BootedTurns> {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const rendered: unknown[] = [];
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  const engine = new GameEngine({
    world,
    player: placeholder,
    parser,
    language,
    perceptionService: new PerceptionService(),
    config: { seed, onEvent: (e) => stream.push(e) },
  });
  engine.on('text:output', (blocks) => rendered.push(...blocks));
  // Bootstrap's order: parser and language extended before setStory, so the
  // story's phrase texts and vocabulary are registered when the boot look runs.
  story.extendParser(parser);
  story.extendLanguage(language);
  engine.setStory(story);
  world.removeEntity(placeholder.id);
  await engine.start();
  const turnText = async (input: string) => {
    const from = stream.length;
    const renderedFrom = rendered.length;
    await engine.executeTurn(input);
    return { events: stream.slice(from), text: flattenText(rendered.slice(renderedFrom)) };
  };
  const turn = async (input: string) => (await turnText(input)).events;
  const id = (irId: string) => {
    const worldId = story.entityId(irId);
    if (!worldId) throw new Error(`no world entity for IR id \`${irId}\``);
    return worldId;
  };
  return { engine, story, world, player: world.getPlayer()!, stream, turn, turnText, id };
}

/** Every string inside the text blocks' content, joined with newlines. */
function flattenText(blocks: unknown[]): string {
  const out: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') out.push(node);
    else if (Array.isArray(node)) node.forEach(walk);
    else if (node && typeof node === 'object') {
      const rec = node as Record<string, unknown>;
      if ('content' in rec) walk(rec.content);
      else if ('text' in rec) walk(rec.text);
    }
  };
  walk(blocks);
  return out.join('\n');
}

/** The message ids the events carry, in order (events without one dropped). */
export const messageIdsOf = (events: ISemanticEvent[]): string[] =>
  events.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((m): m is string => typeof m === 'string');

/** The events of one type, in order. */
export const eventsOfType = (events: ISemanticEvent[], type: string): ISemanticEvent[] =>
  events.filter((e) => e.type === type);
