/**
 * @file dialogue-attribution-realpath.test.ts
 * @description ADR-201 §6 (Phase 1) — REAL-PATH integration across the
 *   stdlib→lang seam. Drives the actual `talkingAction` against a real *plural*
 *   NPC entity, then renders the emitted `if.event.talked` event through a real
 *   `EnglishLanguageProvider`. Proves the full chain — action → `nounPhraseFor`
 *   (number: 'plural') → catalog `{verb:says target}` → agreement — yields
 *   "say", not the old hardcoded "says". No stubs on either side of the seam.
 *
 * AC map (ADR-201): AC-3 (speech verb agrees with speaker number),
 * AC-7 (talking catalog uses `{verb:…}` for attribution).
 */

import { describe, test, expect } from 'vitest';
import { EntityType, IdentityTrait, TraitType } from '@sharpee/world-model';
import type { NarrativeAgreement, RenderContext } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { talkingAction } from '../../src/actions/standard/talking';
import { IFActions } from '../../src/actions/constants';
import {
  createRealTestContext,
  setupBasicWorld,
  executeWithValidation,
  createCommand,
} from '../test-utils';

/** A render context that mirrors the engine's `makeRenderContext(params)`. */
function makeCtx(params: Record<string, unknown>, narrative: NarrativeAgreement = { person: 'third' }): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative,
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

/** Flatten realized blocks to plain text. */
function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : '⟦deco⟧'))
    .join('');
}

describe('dialogue attribution — real path (ADR-201 §6, AC-3/AC-7)', () => {
  test('a plural NPC greeted via talkingAction renders "say" end-to-end', () => {
    const { world, room } = setupBasicWorld();

    // A plural-speaker NPC: plural identity + a formal conversation personality
    // so talkingAction selects the `formal_greeting` attribution message.
    const acrobats = world.createEntity('triplet acrobats', EntityType.ACTOR);
    acrobats.add(new IdentityTrait({ name: 'triplet acrobats', nounType: 'plural' }));
    acrobats.add({
      type: TraitType.ACTOR,
      conversation: { hasGreeted: false, personality: 'formal' },
    } as any);
    world.moveEntity(acrobats.id, room.id);

    // Drive the real action (validate → execute → report).
    const context = createRealTestContext(
      talkingAction,
      world,
      createCommand(IFActions.TALKING, { entity: acrobats }),
    );
    const events = executeWithValidation(talkingAction, context);

    const talked = events.find((e) => e.type === 'if.event.talked');
    expect(talked).toBeDefined();
    const data = talked!.data as { messageId: string; params: Record<string, unknown> };

    // The action chose the attribution greeting and emitted a plural target.
    expect(data.messageId).toBe('if.action.talking.formal_greeting');
    expect((data.params.target as { number?: string }).number).toBe('plural');

    // Render the emitted event through the REAL provider (auto-loads the catalog).
    const provider = new EnglishLanguageProvider();
    const rendered = text(provider.renderMessage(data.messageId, data.params, makeCtx(data.params)));

    expect(rendered).toBe('The triplet acrobats say, "Good day to you."');
    expect(rendered).not.toContain('says,');
  });
});
