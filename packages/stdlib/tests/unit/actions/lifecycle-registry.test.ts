/**
 * Wired-action registry — ADR-228 D5 pinning tests.
 *
 * The registry is the loader-facing contract: `interceptorConsultingActionIds`
 * is derived mechanically from the descriptor table, and the table covers
 * every entity-keyed standard action (33 per ADR-228 Consequences). The
 * completeness test scans the source tree so an action added with a
 * descriptor but never listed in the table fails here, not silently in Chord.
 */

import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { EnglishParser } from '@sharpee/parser-en-us';
import EnglishLanguageProvider, { englishVerbs } from '@sharpee/lang-en-us';
import {
  actionLifecycleDescriptors,
  interceptorConsultingActionIds
} from '../../../src/actions/lifecycle/registry';
import { IFActions } from '../../../src/actions/constants';
import { standardActions } from '../../../src/actions/standard';

describe('wired-action registry (ADR-228 D5)', () => {
  test('covers all 38 entity-keyed standard actions with unique primary ids', () => {
    // 33 per ADR-228 Consequences + cutting (ADR-230 D3c) + digging,
    // asking, telling (ADR-230 Phase 6) + turning (chord go-live G1
    // shortlist, 2026-07-17)
    expect(actionLifecycleDescriptors).toHaveLength(38);
    const primaryIds = actionLifecycleDescriptors.map((d) => d.actionId);
    expect(new Set(primaryIds).size).toBe(38);
    for (const descriptor of actionLifecycleDescriptors) {
      expect(descriptor.slots.length).toBeGreaterThan(0);
      for (const slot of descriptor.slots) {
        expect(slot.actionIds.length).toBeGreaterThan(0);
      }
    }
  });

  test('every descriptor export in the source tree is listed in the table', () => {
    // Mechanical completeness gate: a 34th action whose author forgets the
    // registry line would break table.length === export-count here.
    const standardDir = path.join(__dirname, '../../../src/actions/standard');
    let exportCount = 0;
    for (const dir of fs.readdirSync(standardDir, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      for (const file of fs.readdirSync(path.join(standardDir, dir.name))) {
        if (!file.endsWith('.ts')) continue;
        const source = fs.readFileSync(path.join(standardDir, dir.name, file), 'utf8');
        exportCount += (source.match(/export const \w+Lifecycle: ActionLifecycleDescriptor/g) ?? []).length;
      }
    }
    expect(exportCount).toBe(actionLifecycleDescriptors.length);
  });

  test('the id set is exactly the union of all slot actionIds', () => {
    const union = new Set(
      actionLifecycleDescriptors.flatMap((d) => d.slots.flatMap((s) => s.actionIds))
    );
    expect(interceptorConsultingActionIds).toEqual(union);
  });

  test('contains the primary, delegation-seam, and implicit-entity ids', () => {
    expect(interceptorConsultingActionIds.has(IFActions.TAKING)).toBe(true);
    expect(interceptorConsultingActionIds.has(IFActions.TALKING)).toBe(true);
    // D6 both-ids seams contribute the delegated id through removing's slots
    expect(interceptorConsultingActionIds.has(IFActions.REMOVING)).toBe(true);
    // ADR-126 room-entry consultation comes from going's destination slot
    expect(interceptorConsultingActionIds.has(IFActions.ENTERING_ROOM)).toBe(true);
  });

  test('excludes full-delegation capability actions and unimplemented constants', () => {
    expect(interceptorConsultingActionIds.has(IFActions.LOWERING)).toBe(false);
    expect(interceptorConsultingActionIds.has(IFActions.RAISING)).toBe(false);
    expect(interceptorConsultingActionIds.has('if.action.tasting')).toBe(false);
    expect(interceptorConsultingActionIds.has('if.action.looking')).toBe(false);
  });
});

/**
 * Grammar reachability gate — ADR-230 D1.
 *
 * Direction 1 (reachability): every wired action id must be reachable from
 * core grammar, or sit on a documented exceptions list. Direction 2 (orphan
 * inverse): every `if.action.*` id core grammar maps to must resolve to a
 * registered standard action, or sit on its own documented list.
 *
 * Exception discipline (ADR-230 pins.md PIN 5, staged-exceptions plan): each
 * TEMPORARY entry names the plan phase that removes it, and the staleness
 * tests below fail the moment an exception becomes obsolete — the lists can
 * only shrink honestly, never rot.
 */
describe('grammar reachability gate (ADR-230 D1)', () => {
  // A freshly constructed parser carries exactly the core grammar.
  const coreReachable = new EnglishParser(EnglishLanguageProvider).getReachableActionIds();
  const registeredActionIds = new Set(standardActions.map((action) => action.id));

  /** PERMANENT: internal redirect targets, by design never player-typeable. */
  const permanentUnreachable = new Set<string>([
    IFActions.ENTERING_ROOM, // ADR-126 room-entry consultation seam
    'if.action.deadly_room_death' // ADR-227 internal death redirect
  ]);

  /** TEMPORARY: ADR-230 D2 gaps — each entry is removed by the named phase.
   *  (Phase 3 closed all five D2 gaps on 2026-07-17 — list currently empty.) */
  const temporaryUnreachable = new Set<string>([]);

  /** TEMPORARY: grammar-mapped ids with no registered action.
   *  EMPTY since the Phase 6 sketch rulings executed (2026-07-17): the D3
   *  orphans were remapped/implemented (Phases 3-5); asking/telling/digging
   *  became real actions; saying/saying_to/shouting/whispering/writing/
   *  writing_on lost their grammar pending real systems; taking_with was
   *  remapped onto removing. */
  const documentedOrphans = new Set<string>([]);

  test('every wired action id is grammar-reachable or a documented exception', () => {
    const unreachable = [...interceptorConsultingActionIds].filter(
      (id) =>
        !coreReachable.has(id) &&
        !permanentUnreachable.has(id) &&
        !temporaryUnreachable.has(id)
    );
    expect(unreachable).toEqual([]);
  });

  test('every grammar-mapped if.action.* id resolves to a registered action or documented orphan', () => {
    const orphans = [...coreReachable].filter(
      (id) =>
        id.startsWith('if.action.') &&
        !registeredActionIds.has(id) &&
        !documentedOrphans.has(id)
    );
    expect(orphans.sort()).toEqual([]);
  });

  test('temporary unreachable exceptions stay honest (delete entries as phases close them)', () => {
    const stale = [...temporaryUnreachable].filter((id) => coreReachable.has(id));
    expect(stale).toEqual([]);
  });

  test('orphan exceptions stay honest (delete entries as ids gain actions or lose grammar)', () => {
    const stale = [...documentedOrphans].filter(
      (id) => registeredActionIds.has(id) || !coreReachable.has(id)
    );
    expect(stale).toEqual([]);
  });

  /**
   * D4 verb-reachability (ADR-230): every verb phrase the lang-en-us help
   * surface declares must lead some core grammar pattern. DEFERRED verbs
   * belong to actions whose disposition awaits the Phase 6 design-sketch
   * rulings (turning/using/answering + conversation family) — pins.md.
   */
  /** EMPTY since the Phase 6 sketch rulings executed: turning became a
   *  capability action (rotate/twist parse); using/answering left verbs.ts;
   *  inquire/question/inform ride the revived asking/telling actions. */
  const deferredDesignVerbs = new Set<string>([]);

  /** A verb phrase "leads" a pattern when its first word matches the
   *  pattern's first token and its remaining words appear in order among
   *  the pattern's literal tokens — slots may intervene, so split
   *  phrasals like `put in` match `put :item in|into|inside :container`.
   *  Alternations expand; `[optional]` tokens are stripped. */
  const patternLeadsWith = (pattern: string, verbPhrase: string): boolean => {
    const verbTokens = verbPhrase.split(' ');
    const patternTokens = pattern.split(' ').filter((t) => !t.startsWith('['));
    if (patternTokens.length === 0) return false;
    if (!patternTokens[0].split('|').includes(verbTokens[0])) return false;
    let cursor = 1;
    for (const vt of verbTokens.slice(1)) {
      let found = false;
      while (cursor < patternTokens.length) {
        const token = patternTokens[cursor++];
        if (token.startsWith(':')) continue; // slot — may intervene
        if (token.split('|').includes(vt)) {
          found = true;
          break;
        }
      }
      if (!found) return false;
    }
    return true;
  };

  test('every lang-declared verb phrase leads some core grammar pattern', () => {
    const patterns = new EnglishParser(EnglishLanguageProvider).getGrammarPatterns();
    const unparsed: string[] = [];
    for (const definition of englishVerbs) {
      for (const verb of definition.verbs) {
        if (deferredDesignVerbs.has(verb)) continue;
        if (!patterns.some((p) => patternLeadsWith(p, verb))) {
          unparsed.push(`${verb} (${definition.action})`);
        }
      }
    }
    expect(unparsed).toEqual([]);
  });

  test('deferred-design verb exceptions stay honest (delete entries once they parse)', () => {
    const patterns = new EnglishParser(EnglishLanguageProvider).getGrammarPatterns();
    const stale = [...deferredDesignVerbs].filter((verb) =>
      patterns.some((p) => patternLeadsWith(p, verb))
    );
    expect(stale).toEqual([]);
  });

  test('keyless unlock is a grammar-form gap, not a registry mismatch', () => {
    // ADR-230 plan Phase 2 exit-state check: unlocking is registered AND
    // reachable (keyed form), so it must never appear on an exceptions list.
    expect(coreReachable.has(IFActions.UNLOCKING)).toBe(true);
    expect(registeredActionIds.has(IFActions.UNLOCKING)).toBe(true);
  });
});
