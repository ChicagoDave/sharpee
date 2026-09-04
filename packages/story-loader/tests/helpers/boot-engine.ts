/**
 * boot-engine.ts — a REAL `GameEngine` over a compiled Chord story, for the
 * suites that drive the engine-owned actor turn phase (ADR-328 D5).
 *
 * `setStory` is the engine's own path: it builds the world, creates the
 * player, and calls the story's `onEngineReady`, which registers the
 * story's NPC behaviors and character-model tick phase on the engine's
 * NPC service. The returned `phase` is the engine's actor turn plugin —
 * the same instance the engine runs after every player action — with the
 * engine's real execution entry behind it, so every act a behavior
 * chooses runs the real standard action against the real world.
 *
 * Public interface: bootEngine, Booted, compileSource.
 * Owner context: story-loader tests
 */
import { expect } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { ACTOR_TURN_PLUGIN_ID, GameEngine, type ActorTurnPlugin } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { EntityType, WorldModel, type IFEntity } from '@sharpee/world-model';
import { ChordStory, createStory } from '../../src';

/** Compile Chord source, failing loudly on diagnostics. */
export function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

export interface Booted {
  engine: GameEngine;
  story: ChordStory;
  world: WorldModel;
  player: IFEntity;
  /** The engine's own actor turn phase (its execution entry is the engine's). */
  phase: ActorTurnPlugin;
}

/**
 * Boot a real engine over the story.
 *
 * @param source - Chord source
 * @param seed - The story's and the engine's session seed
 * @returns The engine, the story, its world and player, and the actor phase
 */
export function bootEngine(source: string, seed: number): Booted {
  const story = createStory(compileSource(source), { seed });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });

  // The engine wants a player at construction; setStory replaces it with
  // the story's own (the setup-test-engine pattern).
  const placeholder = world.createEntity('placeholder', EntityType.ACTOR);
  world.setPlayer(placeholder.id);
  const engine = new GameEngine({ world, player: placeholder, parser, language, config: { seed } });
  engine.setStory(story);
  world.removeEntity(placeholder.id);

  const player = world.getPlayer()!;
  const phase = engine.getPluginRegistry().getById(ACTOR_TURN_PLUGIN_ID) as ActorTurnPlugin;
  expect(phase, 'the engine registered its actor turn phase').toBeDefined();
  return { engine, story, world, player, phase };
}
