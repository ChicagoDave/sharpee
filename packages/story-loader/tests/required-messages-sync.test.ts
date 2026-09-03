/**
 * required-messages-sync.test.ts — GH #108: every standard action's
 * `requiredMessages` key has an English template in lang-en-us. The
 * contract was declared and never enforced; it drifted to 39 orphan keys,
 * each a silent turn. This test enumerates the real registries on both
 * sides and fails on any orphan, naming it.
 *
 * Owner context: story-loader tests (the one package depending on both
 * stdlib and lang-en-us; publish-readiness Phase 10, P-31).
 */
import { describe, expect, it } from 'vitest';
import { standardActions } from '@sharpee/stdlib';
import { standardActionLanguage } from '@sharpee/lang-en-us';

describe('GH #108: stdlib required messages have lang-en-us templates', () => {
  it('reports zero orphan keys across every standard action', () => {
    const byId = new Map(standardActionLanguage.map((l) => [l.actionId, l]));
    const orphans: string[] = [];
    for (const action of standardActions as Array<{ id: string; requiredMessages?: string[] }>) {
      const required = action.requiredMessages ?? [];
      if (required.length === 0) continue;
      const language = byId.get(action.id);
      if (!language) {
        orphans.push(`${action.id}: no language file (${required.join(', ')})`);
        continue;
      }
      for (const key of required) {
        if (!(key in language.messages)) orphans.push(`${action.id}.${key}`);
      }
    }
    expect(orphans).toEqual([]);
  });
});
