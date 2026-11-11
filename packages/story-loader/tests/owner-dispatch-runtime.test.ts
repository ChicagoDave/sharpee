/**
 * owner-dispatch-runtime.test.ts — the owner-clause rewrite of a
 * noun-dispatch story does what the noun-dispatch story was written to do.
 *
 * `packages/chord/tests/fixtures/gates/noun-dispatch.story` decides each
 * response in the action body by testing which thing the player named, and
 * no longer compiles. `owner-dispatch.story` is the same pawnshop with each
 * response moved to its owner: the lamp, the spoon and the cup react in their
 * own `after` clauses, the glass eye refuses through its `counterfeit`
 * trait's `on` clause (a story action runs those two, never a thing's own
 * `on` clause), `treasure` and `polishable` are traits that classify, the
 * first-time line reads the pawnbroker's own state instead of a flag thing,
 * and taking is the standard action. Driven through the real engine, the same
 * commands must leave the world state the noun-dispatch story was written to
 * produce, step by step.
 *
 * REAL-PATH: compile, createStory, GameEngine.executeTurn — no stub.
 *
 * Owner context: story-loader tests (rule 13a real-path gate).
 *
 * References:
 * - ADR-394 — responses belong to their owners (D1, D3, D4, D5, D6, D7, D9).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { ISemanticEvent } from '@sharpee/core';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { CHORD_STATE_PREFIX } from '../src/state-keys';
import { compileSource } from './helpers/boot-engine';

const SOURCE = readFileSync(join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'owner-dispatch.story'), 'utf8');

/** Boot the rewrite in the real engine with the story's grammar registered; `play` returns the turn's message ids. */
async function boot() {
  const story = createStory(compileSource(SOURCE), { seed: 7 });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const stream: ISemanticEvent[] = [];
  const engine = new GameEngine({
    world,
    parser,
    language,
    perceptionService: new PerceptionService(),
    config: { seed: 7, onEvent: (e) => stream.push(e) },
  });
  engine.installStory(story);
  story.extendParser(parser);
  await engine.start();
  const player = world.playerCharacter;
  const play = async (command: string): Promise<string[]> => {
    stream.length = 0;
    await engine.executeTurn(command);
    return stream.map((e) => (e.data as { messageId?: string } | undefined)?.messageId).filter((id): id is string => typeof id === 'string');
  };
  const state = (id: string) => world.getStateValue(`${CHORD_STATE_PREFIX}${id}`);
  const locationOf = (id: string) => world.getLocation(id);
  return { world, player, play, state, locationOf, room: world.getLocation(player.id) };
}

/** True when a turn's message ids name the phrase key, bare or owner-qualified. */
function said(ids: readonly string[], key: string): boolean {
  return ids.some((id) => id === key || id.endsWith(`.${key}`));
}

describe('the owner-clause rewrite produces the noun-dispatch story\'s intended world state', () => {
  it('starts with the lamp and spoon shelved, the cup dull and the pawnbroker watchful', async () => {
    const b = await boot();
    expect([b.state('brass-lamp'), b.state('silver-spoon'), b.state('tin-cup'), b.state('pawnbroker')]).toEqual([
      'shelved',
      'shelved',
      'dull',
      'watchful',
    ]);
  });

  it('pricing the lamp: the lamp\'s own clause prices it, and the first appraisal makes the pawnbroker chatty', async () => {
    const b = await boot();
    const turn = await b.play('appraise lamp');
    expect(b.state('brass-lamp')).toBe('priced');
    expect(b.state('silver-spoon')).toBe('shelved');
    expect(b.state('pawnbroker')).toBe('chatty');
    expect(said(turn, 'first-appraisal')).toBe(true);
  });

  it('the glass eye refuses in its own clause, and the refusal stops the action body', async () => {
    const b = await boot();
    const turn = await b.play('appraise eye');
    expect(said(turn, 'paste')).toBe(true);
    expect(b.state('pawnbroker')).toBe('watchful');
  });

  it('a held spoon is refused before its clause can price it; put down, it is priced', async () => {
    const b = await boot();
    await b.play('take spoon');
    expect(b.locationOf('silver-spoon')).toBe(b.player.id);
    const held = await b.play('appraise spoon');
    expect(said(held, 'put-it-down')).toBe(true);
    expect(b.state('silver-spoon')).toBe('shelved');
    await b.play('drop spoon');
    await b.play('appraise spoon');
    expect(b.state('silver-spoon')).toBe('priced');
    expect(b.locationOf('silver-spoon')).toBe(b.room);
  });

  it('the cup is not a treasure and the display case is scenery: both refused, nothing changes', async () => {
    const b = await boot();
    const cup = await b.play('appraise cup');
    expect(said(cup, 'worthless')).toBe(true);
    const fixture = await b.play('appraise case');
    expect(said(fixture, 'fixed')).toBe(true);
    expect([b.state('tin-cup'), b.state('pawnbroker')]).toEqual(['dull', 'watchful']);
  });

  it('polishing: the cup\'s own clause shines it; the lamp is not polishable and keeps its state', async () => {
    const b = await boot();
    await b.play('polish cup');
    expect(b.state('tin-cup')).toBe('shiny');
    const lamp = await b.play('polish lamp');
    expect(said(lamp, 'cant-polish')).toBe(true);
    expect(b.state('brass-lamp')).toBe('shelved');
  });

  it('the whole sequence ends in the state the noun-dispatch story was written to produce', async () => {
    const b = await boot();
    for (const command of [
      'appraise lamp',
      'appraise eye',
      'take spoon',
      'appraise spoon',
      'drop spoon',
      'appraise spoon',
      'appraise cup',
      'appraise case',
      'polish cup',
      'polish lamp',
    ]) {
      await b.play(command);
    }
    expect({
      lamp: b.state('brass-lamp'),
      spoon: b.state('silver-spoon'),
      cup: b.state('tin-cup'),
      pawnbroker: b.state('pawnbroker'),
      spoonPlace: b.locationOf('silver-spoon'),
      lampPlace: b.locationOf('brass-lamp'),
    }).toEqual({
      lamp: 'priced',
      spoon: 'priced',
      cup: 'shiny',
      pawnbroker: 'chatty',
      spoonPlace: b.room,
      lampPlace: b.room,
    });
  });
});
