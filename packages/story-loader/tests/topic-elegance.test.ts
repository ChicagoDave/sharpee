/**
 * topic-elegance.test.ts — ADR-239 Phase 3 elegance-parity demo
 * (topic-vignette.story): a conversation-driven NPC beat authored as ONE
 * `define topics` table — an entity-tier row, a comma-declared alias, a
 * rich body-form row that also mutates state, and the owner's unfiltered
 * `on asking it` as the miss voice. What previously took one blanket
 * answer (the audit's ⚠️ floor) is a branching interrogation in seven
 * lines of table. REAL-PATH: every ask drives the real askingAction
 * against the loaded world, asserting per-topic message ids and the row
 * body's actual state change — the demo IS the smoke.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import type { ISemanticEvent } from '@sharpee/core';
import { askingAction } from '@sharpee/stdlib';
import { IFEntity, WorldModel } from '@sharpee/world-model';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ChordStory, createStory } from '../src';

const FIXTURE = readFileSync(
  join(__dirname, '..', '..', 'chord', 'tests', 'fixtures', 'topic-vignette.story'),
  'utf8',
);

describe('gamekeeper interrogation vignette (ADR-239 elegance parity)', () => {
  it('locket → the old fire → her ladyship → a miss, all real asks on the loaded world', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    const story: ChordStory = createStory(result.ir as StoryIR);
    const world = new WorldModel();
    story.initializeWorld(world);
    const player = story.createPlayer(world);
    world.setPlayer(player.id);

    const byId = (irId: string): IFEntity => world.getEntity(story.entityId(irId)!)!;
    const keeper = byId('gamekeeper');

    const ask = (topic: { text: string; entity?: string }) => {
      const context: any = {
        world,
        player,
        action: askingAction,
        currentLocation: world.getContainingRoom(player.id)!,
        command: { directObject: { entity: keeper }, topic },
        sharedData: {},
        canSee: (target: IFEntity) => world.getVisible(player.id).some((e) => e.id === target.id),
        requireScope: (target: IFEntity) =>
          world.getInScope(player.id).some((e) => e.id === target.id)
            ? { ok: true }
            : { ok: false, error: { valid: false, error: 'not_in_scope' } },
        event: (type: string, data: Record<string, unknown>): ISemanticEvent =>
          ({ id: `t-${type}`, type, timestamp: 0, entities: {}, data }) as ISemanticEvent,
      };
      const validation = askingAction.validate(context);
      context.validationResult = validation;
      expect(validation.valid).toBe(true);
      askingAction.execute(context);
      const events = askingAction.report(context);
      return (events[0]?.data as any)?.messageId as string;
    };

    // Entity tier: the locket in scope resolves quietly; its row answers.
    expect(ask({ text: 'locket', entity: byId('locket').id })).toBe('locket-reply');

    // Free-text tier through the DECLARED alias (comma list, normalized).
    expect(ask({ text: 'the old fire' })).toBe('fire-reply');

    // Body-form row: the answer lands AND the keeper's state actually moves.
    expect(world.getStateValue('chord.state.gamekeeper')).not.toBe('unsettled');
    expect(ask({ text: 'her ladyship' })).toBe('ladyship-reply');
    expect(world.getStateValue('chord.state.gamekeeper')).toBe('unsettled');

    // A miss falls to the keeper's own voice — never a blanket answer on hits.
    expect(ask({ text: 'the weather' })).toBe('keeper-shrug');
  });
});
