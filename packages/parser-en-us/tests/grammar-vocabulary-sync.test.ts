/**
 * @file Grammar/Vocabulary Sync Verification (platform-issue-sweep Phase 6)
 * @description Every action id the core grammar maps to must have at least
 *   one verb-vocabulary entry in lang-en-us (`data/verbs.ts`, surfaced via
 *   `getVerbs()`).
 *
 *   Verb vocabulary is NOT what makes grammar literals parse (verified
 *   2026-07-20: `restart` parsed with no entry) — it feeds the parser's verb
 *   CLASSIFICATION: comma-chained command splitting ("take sword, drop
 *   sword" — english-parser.ts:572) and word lookup for candidate/failure
 *   handling (:1217). A grammar action whose verbs are missing here parses
 *   standalone but silently breaks chaining and degrades error quality —
 *   the drift this test pins.
 *
 *   Companion to grammar-lang-sync.test.ts (which checks the help-only
 *   `patterns` lists in lang action files, a different surface).
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { defineGrammar } from '../src/grammar';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('Grammar/Vocabulary sync (Phase 6)', () => {
  let grammarActionIds: Set<string>;
  let vocabularyActionIds: Set<string>;

  beforeAll(() => {
    const engine = new EnglishGrammarEngine();
    const builder = engine.createBuilder();
    defineGrammar(builder);

    grammarActionIds = new Set(builder.getRules().map(rule => rule.action));

    const language = new EnglishLanguageProvider();
    vocabularyActionIds = new Set(language.getVerbs().map(v => v.actionId));
  });

  it('every core-grammar action id has a verb-vocabulary entry (no exceptions)', () => {
    const missing = [...grammarActionIds]
      .filter(id => !vocabularyActionIds.has(id))
      .sort();

    expect(
      missing,
      `Core grammar maps to action ids with NO entry in lang-en-us data/verbs.ts.\n` +
      `Standalone parsing still works, but comma-chained commands and verb\n` +
      `classification silently break for these verbs. Add a VerbDefinition\n` +
      `(mirroring the grammar's verb set) for each:\n  ${missing.join('\n  ')}`
    ).toEqual([]);
  });

  it('sanity: the sweep-era gap actions stay covered', () => {
    // The eight ids found unrepresented on 2026-07-20 (plus restarting,
    // fixed the same day) — pinned individually so a future refactor of the
    // blanket check above cannot silently drop them.
    const pinned = [
      'if.action.restarting',
      'if.action.again',
      'if.action.undoing',
      'if.action.version',
      'if.action.cutting',
      'if.action.digging',
      'if.action.hiding',
      'if.action.removing',
      'if.action.revealing',
    ];
    for (const id of pinned) {
      expect(vocabularyActionIds.has(id), `vocabulary missing ${id}`).toBe(true);
    }
  });
});
