/**
 * starts-state.test.ts — ADR-231 D5a: `starts <state>` initializers
 * round-trip through the REAL loader into trait initial-value fields:
 * locked → LockableTrait.isLocked true, closed → OpenableTrait.isOpen
 * false (beating the container builder's `openable()` pre-add, which
 * defaults isOpen true until ADR-231 Phase 9 removes it), on →
 * SwitchableTrait.isOn true. REAL-PATH per Integration Reality: real
 * @sharpee/chord compile, real createStory/initializeWorld — no stubs of
 * any owned dependency; assertions are on world trait state, and the
 * locked case additionally drives stdlib's unlockingAction against the
 * loaded key to prove the lock is live (cuttable.test.ts precedent).
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { unlockingAction } from '@sharpee/stdlib';
import { IFEntity, LockableTrait, OpenableTrait, SwitchableTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const STORY = `story "Starts" by "T"
  id: starts
  version: 0.0.1

create the Vault
  a room

  A vault.

create the safe
  a container, openable, lockable with key the brass key, starts locked
  in the Vault

  A safe.

create the crate
  a container, openable, starts closed
  in the Vault

  A crate.

create the hamper
  a container, openable
  in the Vault

  A hamper.

create the generator
  switchable, starts on
  in the Vault

  A generator.

create the player
  starts in the Vault
  carries the brass key

  You.

create the brass key

  A small brass key.
`;

const load = () => {
  const story = createStory(compileSource(STORY), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  const entity = (slug: string): IFEntity => world.getEntity(story.entityId(slug)!)!;
  return { story, world, player, entity };
};

describe('starts <state> through the real loader (ADR-231 D5a)', () => {
  it('starts locked: LockableTrait.isLocked is true on the loaded world, key config intact', () => {
    const { story, entity } = load();
    const lockable = entity('safe').get(TraitType.LOCKABLE) as LockableTrait;
    expect(lockable).toBeDefined();
    expect(lockable.isLocked).toBe(true);
    // The initializer rides the same composition line as `with key` — the
    // resolved key id must survive it.
    expect(lockable.keyId).toBe(story.entityId('brass-key')!);
  });

  it('REAL-PATH: the declared lock is live — stdlib unlockingAction unlocks it with the loaded key', () => {
    const { world, player, entity } = load();
    const safe = entity('safe');
    const key = entity('brass-key');
    expect(world.getLocation(key.id)).toBe(player.id);

    const context: any = {
      world,
      player,
      action: unlockingAction,
      command: {
        directObject: { entity: safe },
        indirectObject: { entity: key },
        preposition: 'with'
      },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };
    const validation = unlockingAction.validate(context);
    (context as any).validationResult = validation;
    expect(validation.valid, JSON.stringify(validation)).toBe(true);
    unlockingAction.execute(context);
    unlockingAction.report(context);
    // THE state assertion: `starts locked` produced a real lock that the
    // real action just mutated — no seeding of isLocked anywhere in this test.
    expect((safe.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
  });

  it('starts closed beats the container builder openable() pre-add: isOpen is false', () => {
    const { entity } = load();
    const openable = entity('crate').get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable).toBeDefined();
    expect(openable.isOpen).toBe(false);
  });

  it('control: without an initializer the container pre-add still opens (pins what `starts closed` beat)', () => {
    // Phase 9 (D5b) will flip this default; today it documents that the
    // crate assertion above is a genuine override, not the builder default.
    const { entity } = load();
    const openable = entity('hamper').get(TraitType.OPENABLE) as OpenableTrait;
    expect(openable.isOpen).toBe(true);
  });

  it('starts on: SwitchableTrait.isOn is true on the loaded world', () => {
    const { entity } = load();
    const switchable = entity('generator').get(TraitType.SWITCHABLE) as SwitchableTrait;
    expect(switchable).toBeDefined();
    expect(switchable.isOn).toBe(true);
  });
});
