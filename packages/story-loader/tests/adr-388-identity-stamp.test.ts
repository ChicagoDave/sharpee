/**
 * adr-388-identity-stamp.test.ts — ADR-388 D4's loader and engine half:
 * the loader exposes the compile's stamp and refuses IR without a manifest
 * (AC-8), and a save written through the real engine records the stamp.
 *
 * Behavior Statement — `assertIdentity` / `ChordStory.identityStamp` /
 * `SaveRestoreService.createSaveData`
 *   DOES: `createStory` sets `identityStamp` to `ir.identity.stamp`; the
 *         engine writes that string into `ISaveData.metadata.identityStamp`
 *         on every save.
 *   WHEN: the IR carries an identity manifest with a non-empty stamp.
 *   BECAUSE: a restore compares the save's stamp with the current story's
 *            to decide whether the save needs reconciling (ADR-388 D5), and
 *            a stamp derived at load would name the wrong compile.
 *   REJECTS WHEN: the IR carries no `identity`, or one with an empty
 *                 stamp — `createStory` throws a `LoadError` naming the
 *                 compiler pass (ADR-276's backstop), and nothing loads.
 *
 * Public interface: none — a test module. Owner context: `@sharpee/story-loader`.
 */
import { describe, expect, it } from 'vitest';
import type { ISaveData } from '@sharpee/core';
import type { StoryIR } from '@sharpee/chord';
import { GameEngine } from '@sharpee/engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '@sharpee/parser-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';
import { LoadError } from '../src/errors';
import { assertIdentity } from '../src/select-ids';
import { compileSource } from './helpers/boot-engine';

const SOURCE = (extraExit = '') => `story
  title: Stamp
  authors:
    T
  id: stamp
  story-version: 0.0.1

create the Hall
  a room
${extraExit}

  A hall.

create the Yard
  a room

  A yard.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before
`;

type EnginePrivate = { createSaveData(): ISaveData };

async function boot(ir: StoryIR) {
  const story = createStory(ir, { seed: 3 });
  const world = new WorldModel();
  const language = new EnglishLanguageProvider();
  const parser = new EnglishParser(language, { world });
  const engine = new GameEngine({ world, parser, language, perceptionService: new PerceptionService(), config: { seed: 3 } });
  engine.installStory(story);
  await engine.start();
  return { story, saver: engine as unknown as EnginePrivate };
}

describe('ADR-388 D4 — the loader exposes the compile stamp', () => {
  it('`identityStamp` is the IR manifest stamp', () => {
    const ir = compileSource(SOURCE());
    expect(ir.identity.stamp).toMatch(/^[0-9a-f]{64}$/);
    expect(createStory(ir).identityStamp).toBe(ir.identity.stamp);
  });
});

describe('ADR-388 AC-8 — rogue IR without a manifest is refused on the real `createStory` path', () => {
  it('IR with no `identity` raises a LoadError naming the compiler pass', () => {
    const ir = compileSource(SOURCE());
    delete (ir as { identity?: unknown }).identity;
    let err: unknown;
    try {
      createStory(ir);
    } catch (e) {
      err = e;
    }
    expect(err).toBeInstanceOf(LoadError);
    expect(String(err)).toMatch(/no identity manifest/);
    expect(String(err)).toMatch(/ADR-388 D4/);
  });

  it('IR whose stamp is empty is refused the same way', () => {
    const ir = compileSource(SOURCE());
    ir.identity.stamp = '';
    expect(() => assertIdentity(ir)).toThrow(LoadError);
    expect(() => createStory(ir)).toThrow(/no identity manifest/);
  });
});

describe('ADR-388 D4 — a save records the stamp, through the real engine save', () => {
  it('`metadata.identityStamp` is the installed story\'s stamp, and an edited story stamps its saves differently', async () => {
    const ir = compileSource(SOURCE());
    const a = await boot(ir);
    const save = a.saver.createSaveData();
    expect(save.metadata.identityStamp).toBe(ir.identity.stamp);
    expect(save.metadata.storyVersion).toBe('0.0.1');

    const edited = compileSource(SOURCE('  north to the Yard'));
    const b = await boot(edited);
    const editedSave = b.saver.createSaveData();
    expect(editedSave.metadata.identityStamp).toBe(edited.identity.stamp);
    expect(editedSave.metadata.identityStamp).not.toBe(save.metadata.identityStamp);
  });
});
