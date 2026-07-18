/**
 * lockable-key.test.ts — ADR-230 Phase 9a: the key-entity config
 * (`lockable with the brass key` — keyless per ratchet R3, ADR-234 D6)
 * survives the loader on CONTAINER kinds (previously the container branch
 * pre-added a bare LockableTrait and the configured re-add was
 * guard-skipped), and the key config is a resolved WORLD id, never the
 * raw display-name string.
 * REAL-PATH: the loaded world drives stdlib's unlockingAction end-to-end.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { unlockingAction } from '@sharpee/stdlib';
import { IFEntity, TraitType, WorldModel, LockableTrait } from '@sharpee/world-model';
import { createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const STORY = `story "Locks" by "T"
  id: locks
  version: 0.0.1

create the Vault
  a room

  A vault.

create the strongbox
  a container
  in the Vault
  openable, lockable with the brass key

  A strongbox.

create the player
  starts in the Vault
  carries the brass key

  You.

create the brass key

  A small brass key.
`;

describe('lockable with key on container kinds (ADR-230 Phase 9a)', () => {
  const load = () => {
    const story = createStory(compileSource(STORY), { seed: 11 });
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);
    return { story, world, player };
  };

  it('stamps the key as a resolved WORLD id on the container (not dropped, not a raw name)', () => {
    const { story, world } = load();
    const strongbox = world.getEntity(story.entityId('strongbox')!)!;
    const keyWorldId = story.entityId('brass-key')!;

    const lockable = strongbox.get(TraitType.LOCKABLE) as LockableTrait;
    expect(lockable).toBeDefined();
    expect(lockable.keyId).toBe(keyWorldId);
    expect(lockable.keyId).not.toBe('brass key');
  });

  it('REAL-PATH: the loaded key unlocks the loaded container through stdlib unlockingAction', () => {
    const { story, world, player } = load();
    const strongbox = world.getEntity(story.entityId('strongbox')!)!;
    const key = world.getEntity(story.entityId('brass-key')!)!;
    // `carries the brass key` (Phase 6) put the key in hand.
    expect(world.getLocation(key.id)).toBe(player.id);

    // Lock it first so the unlock is a real mutation.
    (strongbox.get(TraitType.LOCKABLE) as LockableTrait).isLocked = true;

    const context: any = {
      world,
      player,
      action: unlockingAction,
      command: {
        directObject: { entity: strongbox },
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

    // THE state assertion: actually unlocked, by the configured key.
    expect((strongbox.get(TraitType.LOCKABLE) as LockableTrait).isLocked).toBe(false);
  });
});
