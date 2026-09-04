/**
 * Tests for the room description's `{slot:detail}` channel (GH #316).
 *
 * The room handler reads the ADR-195 S2 state-clauses registry at the render
 * point and folds the room's live detail clauses into `if.room.description_body`
 * — the same registry examining consults, so a `phrase detail while <cond>:`
 * line renders on look/arrival, not only on examine. Assertions are on the
 * rendered turn text: clause present while its condition holds, absent while it
 * does not, and byte-identical legacy behavior when no world is wired.
 *
 * @see GH #316, ADR-195 S2 (state clauses), ADR-240 D5 (consult at read point)
 */

import { describe, it, expect } from 'vitest';
import type { IEntity } from '@sharpee/core';
import type { ITextBlock, TextContent } from '@sharpee/text-blocks';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { registerClauseContributor } from '@sharpee/world-model';
import { ProsePipeline } from '../../../src/prose-pipeline/pipeline';
import type { WorldModelLike } from '../../../src/prose-pipeline/render-context';
import { makeEvent } from '../test-helpers';

/** The marker trait type the test contributor is keyed to (unique to this file). */
const DETAIL_TRAIT = 'test.trait.room_detail_slot';

/** Live condition the contributor reads — flipped per test, evaluated per render. */
let bananaBlocked = false;

registerClauseContributor(DETAIL_TRAIT, () =>
  bananaBlocked ? ['The bushel of bananas is currently blocked by the stallkeeper.'] : [],
);

/** A trait-bearing room entity satisfying the IFEntity surface getStateClauses reads. */
function roomEntity(id: string): IEntity {
  return { id, has: (type: string) => type === DETAIL_TRAIT } as unknown as IEntity;
}

/** Minimal world: one room carrying the detail trait; no occupants. */
function fixtureWorld(): WorldModelLike {
  const capabilities: Record<string, Record<string, unknown>> = { textState: {} };
  return {
    getEntity: (id) => (id === 'fruit-stall' ? roomEntity(id) : undefined),
    getContents: () => [],
    getContainingRoom: () => undefined,
    getPlayer: () => ({ id: 'player' } as IEntity),
    getCapability: (name) => capabilities[name],
    updateCapability: (name, updates) => {
      capabilities[name] = { ...(capabilities[name] ?? {}), ...updates };
    },
    hasCapability: (name) => name in capabilities,
    registerCapability: (name, reg) => {
      if (!(name in capabilities)) capabilities[name] = reg?.initialData ?? {};
    },
  };
}

/** Flatten realized blocks to one plain string. */
function blockText(blocks: ITextBlock[]): string {
  const textOf = (n: TextContent): string =>
    typeof n === 'string' ? n : (n.content ?? []).map(textOf).join('');
  return blocks.map((b) => b.content.map(textOf).join('')).join('\n');
}

const DESCRIPTION = 'Crates of apples and a bushel of bananas crowd the stall.';
const CLAUSE = 'The bushel of bananas is currently blocked by the stallkeeper.';

function lookEvent(data: Record<string, unknown> = {}) {
  return makeEvent('if.event.room.description', {
    verbose: false,
    roomId: 'fruit-stall',
    roomDescription: DESCRIPTION,
    ...data,
  });
}

describe('room description {slot:detail} (GH #316)', () => {
  it('renders the gated detail clause after the description while its condition holds', () => {
    bananaBlocked = true;
    const pipeline = new ProsePipeline(new EnglishLanguageProvider(), fixtureWorld());

    const text = blockText(pipeline.processTurn([lookEvent()]));

    expect(text).toContain(DESCRIPTION);
    expect(text).toContain(CLAUSE);
    expect(text.indexOf(DESCRIPTION)).toBeLessThan(text.indexOf(CLAUSE));
  });

  it('renders no clause while the condition does not hold', () => {
    bananaBlocked = false;
    const pipeline = new ProsePipeline(new EnglishLanguageProvider(), fixtureWorld());

    const text = blockText(pipeline.processTurn([lookEvent()]));

    expect(text).toContain(DESCRIPTION);
    expect(text).not.toContain(CLAUSE);
  });

  it('renders no clause for a room the world does not resolve', () => {
    bananaBlocked = true;
    const pipeline = new ProsePipeline(new EnglishLanguageProvider(), fixtureWorld());

    const text = blockText(
      pipeline.processTurn([lookEvent({ roomId: 'somewhere-else' })]),
    );

    expect(text).toContain(DESCRIPTION);
    expect(text).not.toContain(CLAUSE);
  });

  it('keeps the world-less legacy path clause-free and throw-free', () => {
    bananaBlocked = true;
    const pipeline = new ProsePipeline(new EnglishLanguageProvider()); // no world

    let text = '';
    expect(() => {
      text = blockText(pipeline.processTurn([lookEvent()]));
    }).not.toThrow();
    expect(text).toContain(DESCRIPTION);
    expect(text).not.toContain(CLAUSE);
  });
});
