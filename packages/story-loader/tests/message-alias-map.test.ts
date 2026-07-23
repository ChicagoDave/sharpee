/**
 * message-alias-map.test.ts — ADR-255 D5 completeness pinning. The override
 * alias catalog must be a TOTAL BIJECTION with the live lang-en-us
 * standard-action message-id set: every `if.action.<action>.<key>` has exactly
 * one alias, and every alias maps to a real id. A new stdlib message without an
 * alias fails the build — completeness is mechanical, not curated by vigilance.
 * Also pins the chord names-side set (MESSAGE_OVERRIDE_ALIASES) equal to the
 * loader map's keys (Interface Contract 3: the two sides never drift).
 */
import { describe, expect, it } from 'vitest';
import { MESSAGE_OVERRIDE_ALIASES } from '@sharpee/chord';
import { standardActionLanguage } from '@sharpee/lang-en-us';
import { MESSAGE_ALIAS_TO_ACTION_ID, aliasToActionMessageId } from '../src/message-alias-map';

/** Enumerate the live standard-action message ids from lang-en-us. */
function liveMessageIds(): string[] {
  const ids: string[] = [];
  for (const mod of standardActionLanguage as Array<{ actionId?: string; messages?: Record<string, string> }>) {
    if (!mod.actionId || !mod.messages) continue;
    for (const key of Object.keys(mod.messages)) ids.push(`${mod.actionId}.${key}`);
  }
  return ids;
}

describe('ADR-255 D5 — alias catalog is a total bijection with live lang-en-us', () => {
  const liveIds = liveMessageIds();
  const mapIds = Object.values(MESSAGE_ALIAS_TO_ACTION_ID);

  it('every live standard-action message id has exactly one alias (no gap)', () => {
    const covered = new Set(mapIds);
    const uncovered = liveIds.filter((id) => !covered.has(id));
    expect(uncovered, `live message ids without an override alias: ${uncovered.join(', ')}`).toEqual([]);
  });

  it('every alias maps to a real live message id (no stale entry)', () => {
    const live = new Set(liveIds);
    const stale = mapIds.filter((id) => !live.has(id));
    expect(stale, `aliases mapping to a non-existent message id: ${stale.join(', ')}`).toEqual([]);
  });

  it('the mapping is injective — no two aliases share a platform id', () => {
    expect(new Set(mapIds).size).toBe(mapIds.length);
  });

  it('covers the full live set (bijection, both directions)', () => {
    expect(new Set(mapIds)).toEqual(new Set(liveIds));
  });
});

describe('ADR-255 Interface Contract 3 — the chord names side equals the loader map keys', () => {
  it('MESSAGE_OVERRIDE_ALIASES (chord) === keys of MESSAGE_ALIAS_TO_ACTION_ID (loader)', () => {
    expect([...MESSAGE_OVERRIDE_ALIASES].sort()).toEqual(Object.keys(MESSAGE_ALIAS_TO_ACTION_ID).sort());
  });

  it('no alias contains a dot (ADR-254 — single kebab token)', () => {
    expect(Object.keys(MESSAGE_ALIAS_TO_ACTION_ID).filter((a) => a.includes('.'))).toEqual([]);
  });
});

describe('aliasToActionMessageId', () => {
  it('resolves a known alias to its dotted platform id', () => {
    expect(aliasToActionMessageId('taking-fixed-in-place')).toBe('if.action.taking.fixed_in_place');
  });
  it('returns undefined for an unknown alias', () => {
    expect(aliasToActionMessageId('not-a-real-alias')).toBeUndefined();
  });
});
