/**
 * entity-scoped-refusal.test.ts — ADR-231 D1: a bare `refuse <key>` written
 * inside an entity's `on taking it` clause, where the entity also declares a
 * per-entity `phrase <key>:` block, must travel as the ENTITY-SCOPED message
 * id `<irId>.<key>` (runtime.resolvePhraseKey), cross into stdlib's blocked()
 * marked errorQualified, and land on the blocked event verbatim — never as
 * the bare key. REAL-PATH pin for the shipped iron-ring doc example: real
 * compiler, real loader, real registered interceptor, stdlib takingAction.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { takingAction } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

function loadStory(source: string): { story: ChordStory; world: WorldModel; player: IFEntity } {
  const story = createStory(compileSource(source), { seed: 11 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

// The iron-ring doc example: an entity-local refusal key with an
// entity-local phrase override.
const RING_STORY = `story "Ring" by "T"
  id: ring
  version: 0.0.1

create the Vault
  a room

  A vault.

create the player
  starts in the Vault

  You.

create the iron ring
  in the Vault
  phrase stuck-fast:
    The ring is fused to the stone; it will not budge.

  An iron ring set into the flagstones.

  on taking it
    refuse stuck-fast
  end on
`;

describe('entity-scoped refusal key resolution (ADR-231 D1)', () => {
  it('registers the per-entity phrase under the SCOPED id, not the bare key', () => {
    const { story } = loadStory(RING_STORY);
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);

    // The per-entity `phrase stuck-fast:` block registers entity-scoped.
    expect(registered.get('iron-ring.stuck-fast')).toContain('will not budge');
    // No bare-key registration to collide with other entities' locals.
    expect(registered.has('stuck-fast')).toBe(false);
  });

  it('REAL-PATH: `refuse stuck-fast` reaches takingAction blocked() as `iron-ring.stuck-fast`', () => {
    const { story, world, player } = loadStory(RING_STORY);
    const ring = world.getEntity(story.entityId('iron-ring')!)!;
    const vaultId = story.entityId('vault')!;

    // Structural ActionContext (cuttable.test.ts precedent) over the REAL
    // loader-built world — the interceptor consulted is the one the loader
    // registered from the story source.
    const context: any = {
      world,
      player,
      action: takingAction,
      command: {
        directObject: { entity: ring },
        parsed: { structure: { directObject: { isAll: false, isList: false } } },
      },
      sharedData: {},
      requireScope: () => ({ ok: true }),
      event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
        ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
    };

    const validation = takingAction.validate(context);

    expect(validation.valid).toBe(false);
    // resolvePhraseKey found the entity-local phrase, so the refusal
    // travels scoped — and the lifecycle engine stamps the veto qualified.
    expect(validation.error).toBe('iron-ring.stuck-fast');
    expect(validation.errorQualified).toBe(true);

    const events = takingAction.blocked(context, validation);
    const blocked = events.find((e) => e.type === 'if.event.take_blocked')!;
    expect(blocked).toBeDefined();
    // THE pin: the entity-scoped id verbatim — never the bare key, never
    // an 'if.action.taking.'-prefixed reshape.
    expect((blocked.data as any).messageId).toBe('iron-ring.stuck-fast');
    expect((blocked.data as any).messageId).not.toBe('stuck-fast');

    // State: the refusal really blocked the take — the ring never moved.
    expect(world.getLocation(ring.id)).toBe(vaultId);
  });
});
