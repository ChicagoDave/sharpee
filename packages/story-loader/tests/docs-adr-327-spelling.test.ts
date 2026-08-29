/**
 * docs-adr-327-spelling.test.ts — the ADR-327 spelling gate over the published
 * Chord reference (`website/src/app/chord/**` and `website/src/app/learn/**`).
 *
 * ADR-327 removed syntactic `it`/`its` and `create the player` from Chord
 * (4.0.0, `story language 4`). The reference documentation was written against
 * the old spelling and is migrating to the new one under
 * `docs/work/chord-reference-adr-327/plan.md`. This test is that migration's
 * ratchet and, once the migration completes, its standing drift gate.
 *
 * WHY THIS IS NOT `docs-examples-load.test.ts` WIDENED (ADR-272 D6).
 * That test requires a fence to FULLY LOAD — compile -> createStory ->
 * initializeWorld -> createPlayer -> extendParser — so a fence that cannot
 * load must be excluded wholesale, which is what its `KNOWN_PARTIAL_PAGES`
 * set does. That set currently excludes ten pages, INCLUDING `define-trait`
 * and `define-condition` — precisely ADR-327 D8's carrier-exception pages,
 * where `it`/`its` legally survive and where a regression would therefore be
 * invisible. Every diagnostic this test looks for fires at `compile()` alone,
 * on a bare fence with only a story header (verified 2026-08-27: no world, no
 * player, no grammar seeding needed), so this gate admits strictly more of the
 * corpus than the load test can. Different admission bar, not a duplicate
 * instrument.
 *
 * TWO KNOWN BLIND SPOTS, both measured rather than assumed:
 *   1. A fence that dies at parse never reaches the analyzer, so sites behind
 *      the error are invisible. Those fences are pinned below.
 *   2. An UNRESOLVED REFERENT masks the check: a fence that references a
 *      person it never creates emits `analysis.unknown-entity`, and the
 *      `it`-removal check on that owner never fires. Measured 2026-08-27:
 *      7 sites across 5 fences; 6 were real and fixed, and the 7th
 *      (`learn/fernhill/state` #2) is a `define trait` body whose `it` is a
 *      legal D8 carrier — a textual cross-check will always flag that as a
 *      false positive, which is correct behaviour, not a defect. This is why
 *      the prose suite below exists as a SECOND, independent reading of the
 *      same corpus — a textual check catches what an unresolvable compile
 *      cannot, and the compiler overrules it where `it` is legal.
 *
 * Local gate only — never wired to CI, per the project's standing rule.
 *
 * Public interface: none (vitest suite).
 * Owner context: packages/story-loader — doc-example verification, the home
 * ADR-272 D7 already names for it.
 */
import { readFileSync, globSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';

/** The published reference tree, read from source the way the docs-tab build reads it. */
const DOCS_ROOT = join(__dirname, '..', '..', '..', 'website', 'src', 'app');

/**
 * The six diagnostics ADR-327 introduced. The first three are the migration's
 * debt (spellings the reform removed); the last three are regression guards —
 * they score zero today and would only appear if a migration edit named the
 * wrong actor.
 */
const ADR_327_CODES = new Set([
  'analysis.it-removed',
  'parse.removed-head-it',
  'parse.removed-create-player',
  'analysis.head-bare-outside-actor',
  'analysis.head-actor',
  'analysis.head-actor-is-owner',
]);

/**
 * The scaffolding a documentation fence legitimately omits. Only a story
 * header is needed: every code above fires at parse/analyze, before any world
 * exists. Deliberately NOT the load test's full world — a fence that could
 * never load is still checkable for spelling, and that is the whole point.
 */
const HEADER = 'story\n  title: Docs\n  authors:\n    T\n  id: docs\n  story-version: 0.0.1\n\n';

/**
 * Files still carrying the removed spelling, with their exact diagnostic
 * count — the migration's remaining work, machine-checked.
 *
 * THIS MAP ONLY EVER SHRINKS. A phase migrates a file and deletes its row; an
 * empty map means the migration is complete and this suite becomes a pure
 * drift gate. Because the assertion is on the EXACT count, a new violation in
 * an already-clean file fails immediately rather than hiding inside a total.
 *
 * Baseline recorded 2026-08-27 (session a3a4af): 161 diagnostics across 78
 * files. Phase 2 (guide) took it to 114/54, Phase 3 (stdlib, cookbook, and the
 * prose surface) to 21/8, Phase 4 (fernhill + migration guide) to ZERO. The map
 * is empty and this suite is now a pure drift gate.
 */
const UNMIGRATED: ReadonlyArray<readonly [string, number]> = [
  // EMPTY — the migration is complete. Any entry appearing here is a regression.
];

/**
 * Fences that die at parse before the analyzer runs, so their `it` sites are
 * invisible to this gate. Pinned, not ignored: a fence that JOINS this list is
 * a fence whose spelling silently stopped being checked.
 *
 * Every one was cross-checked against a textual scan and read by hand where it
 * hid debt; as of the migration's completion NO pinned fence hides a removed
 * spelling. The list stays because a fence that JOINS it has silently stopped
 * being spelling-checked.
 */
const PARSE_BLOCKED_FENCES: ReadonlySet<string> = new Set([
  'chord/getting-started/first-story/content.mdx#1',
  'chord/guide/behavior/conditions/content.mdx#1',
  'chord/guide/behavior/conditions/content.mdx#2',
  'chord/guide/behavior/conditions/content.mdx#4',
  'chord/guide/behavior/refusals/content.mdx#1',
  'chord/guide/behavior/requirements/content.mdx#2',
  'chord/guide/behavior/the-statements/content.mdx#1',
  'chord/guide/behavior/the-statements/content.mdx#2',
  'chord/guide/behavior/the-statements/content.mdx#3',
  'chord/guide/behavior/the-statements/content.mdx#4',
  'chord/guide/behavior/what-a-clause-can-bind/content.mdx#1',
  'chord/guide/flow/death/content.mdx#1',
  'chord/guide/flow/each-blocks/content.mdx#2',
  'chord/guide/flow/each-blocks/content.mdx#3',
  'chord/guide/flow/endings/content.mdx#1',
  'chord/guide/flow/endings/content.mdx#2',
  'chord/guide/flow/hunger/content.mdx#1',
  'chord/guide/flow/ordinal-blocks/content.mdx#1',
  'chord/guide/flow/scoring/content.mdx#1',
  'chord/guide/flow/select-on-a-value/content.mdx#1',
  'chord/guide/flow/select-with-a-strategy/content.mdx#1',
  'chord/guide/flow/select-with-a-strategy/content.mdx#2',
  'chord/guide/project/multi-file-stories/content.mdx#1',
  'chord/guide/reading/content.mdx#1',
  'chord/guide/tooling/migrating-from-removed-constructs/content.mdx#1',
  'chord/guide/vocabulary/comments/content.mdx#3',
  'chord/guide/vocabulary/define-condition/content.mdx#2',
  'chord/guide/vocabulary/define-phrasebook/content.mdx#2',
  'chord/guide/vocabulary/use/content.mdx#1',
  'chord/guide/world/the-story-header/content.mdx#1',
  'chord/guide/world/the-story-header/content.mdx#2',
  'chord/reference/grammar/content.mdx#1',
  'chord/reference/grammar/content.mdx#2',
  'chord/stdlib/meta/content.mdx#1',
  'chord/stdlib/npcs/attacking-and-combat/content.mdx#1',
  'chord/stdlib/plugins/npc-and-state-machine-plugins/content.mdx#2',
  'chord/stdlib/plugins/scheduler/content.mdx#1',
  'chord/stdlib/plugins/scheduler/content.mdx#2',
  'learn/fernhill/browser/content.mdx#2',
  'learn/fernhill/browser/content.mdx#4',
  'learn/fernhill/browser/content.mdx#5',
  'learn/fernhill/people/content.mdx#5',
  'learn/fernhill/state/content.mdx#3',
  'learn/fernhill/world/content.mdx#1',
]);

/** Every published reference page, in the two trees the docs-tab build ships. */
function referencePages(): string[] {
  return globSync('{chord,learn}/**/content.mdx', { cwd: DOCS_ROOT }).sort();
}

/** Extract every ```chord fence from an MDX file, in document order. */
function chordFences(relativePath: string): string[] {
  const source = readFileSync(join(DOCS_ROOT, relativePath), 'utf-8');
  const fences: string[] = [];
  const pattern = /```chord\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) fences.push(match[1]);
  return fences;
}

/**
 * Compile one fence and report only what ADR-327 cares about.
 *
 * @param fence the raw fence body, without its backtick delimiters
 * @returns the ADR-327 diagnostic codes it emits, and whether an unrelated
 *   parse error stopped the analyzer from reaching the rest of the fence
 */
function checkFence(fence: string): { codes: string[]; parseBlocked: boolean } {
  // A fence that declares its own story header must not get a second one —
  // prepending unconditionally produced `parse.duplicate-story-header` and
  // hid every site behind it.
  const ownHeader = /^story\b/.test(fence.split('\n')[0] ?? '');
  const result = compile(ownHeader ? `${fence.trimEnd()}\n` : `${HEADER}${fence.trimEnd()}\n`);
  const all = (result.diagnostics ?? []).map((d) => d.code);
  const codes = all.filter((c) => ADR_327_CODES.has(c));
  // A partial snippet always emits noise (unknown-entity, missing-phrase,
  // start-block-missing); that is expected and harmless. Only a PARSE error
  // truncates analysis, and a truncated fence is under-checked whether or not
  // it also reported a hit — an early parse error can hide sites BEHIND a
  // diagnostic that did surface. So this does not require `codes` to be empty:
  // requiring that was the first version of this rule, and it under-reported
  // by 20 fences.
  const parseBlocked = all.some((c) => c.startsWith('parse.') && !ADR_327_CODES.has(c));
  return { codes, parseBlocked };
}

describe('published Chord reference carries the ADR-327 spelling', () => {
  const pages = referencePages();
  const expected = new Map(UNMIGRATED);

  it('the reference tree is readable and non-empty', () => {
    expect(pages.length).toBeGreaterThan(100);
  });

  it.each(pages)('%s', (page) => {
    let found = 0;
    chordFences(page).forEach((fence, index) => {
      const { codes, parseBlocked } = checkFence(fence);
      found += codes.length;
      if (parseBlocked) {
        // Pinned so a NEW unreachable fence is a failure, not a silent gap.
        expect(PARSE_BLOCKED_FENCES).toContain(`${page}#${index + 1}`);
      }
    });
    // Exact, not at-most: a file that regresses fails even while the
    // migration total is still falling.
    expect(found).toBe(expected.get(page) ?? 0);
  });

  it('the unmigrated map names only files that exist', () => {
    for (const [page] of UNMIGRATED) expect(pages).toContain(page);
  });
});

/**
 * Removed spellings quoted in PROSE — inline code spans outside every fence.
 *
 * The compiler reads fenced code only, so after every fence was migrated the
 * surrounding prose still TAUGHT `on <gerund> it`: 100 clause-head references
 * across 46 files, invisible to the suite above. A corpus can be compiler-clean
 * and still wrong, because a reader follows the prose.
 */
// The tail is `[^`]*`, NOT `[^`\n]*`: an inline code span may wrap across a
// line, and requiring the tail to stay on one line missed two real sites in the
// fernhill tutorial that only the shipped IDE bundle surfaced. The span must
// still OPEN with the removed construct, which is what keeps this from matching
// the ordinary prose that sits between two unrelated code spans.
/**
 * A removed spelling occurring ANYWHERE inside an inline code span.
 *
 * The first version of this anchored the match to the START of the span, on the
 * theory that it kept the pattern from running across the ordinary prose
 * between two unrelated spans. It did — and it also missed every span where the
 * construct sits mid-span: `phrase detail while it is lit:`,
 * `on every turn while it is ticking`, `award softened, once when it is
 * softened`. Six real sites survived a "clean" run and only surfaced when the
 * shipped IDE bundle was scanned. Extracting each span and testing its CONTENTS
 * gets both properties at once, because a span by construction cannot contain a
 * backtick.
 */
const CODE_SPAN = /`([^`]+)`/g;
// EVERY separator is `\s+`, never a literal space. A span wraps across lines,
// so `while it\nis on:` is the same construct as `while it is on:` — a literal
// space missed exactly that, in the one place it mattered, and only the shipped
// bundle surfaced it.
const REMOVED_IN_SPAN =
  /(?:^|[^a-z])(?:on|after)\s+[a-z_]+(?:\s+[a-z_]+)?\s+it\b|create\s+the\s+player|\bchange\s+it\s+to\b|\bmove\s+it\b|\b(?:while|when)\s+it\s+is\b|\b(?:raise|lower|set|reset)\s+its\b/;

/**
 * Pages whose SUBJECT is the removed syntax, so quoting it is correct: the
 * migration guide, and the page teaching what replaced `create the player`.
 *
 * `guide/vocabulary/define-trait` is deliberately NOT exempt — its
 * `set its <field> to …` really is legal (ADR-327 D8's carrier), so it is
 * listed as a specific allowed span instead of blanket-exempting the page,
 * which would stop checking everything else on it.
 */
const PROSE_EXEMPT = ['guide/tooling/migrating-from-removed-constructs', 'guide/world/the-player-role'];

/** Spans that are legal D8 carrier references, quoted on the page that teaches them. */
const ALLOWED_SPANS = new Set(['its <field>', 'set its <field> to …']);

describe('published Chord reference does not TEACH the removed spelling', () => {
  it.each(referencePages())('%s', (page) => {
    if (PROSE_EXEMPT.some((e) => page.includes(e))) return;
    const prose = readFileSync(join(DOCS_ROOT, page), 'utf-8').replace(/```[\s\S]*?```/g, '');
    const offending = [...prose.matchAll(CODE_SPAN)]
      .map((m) => m[1])
      .filter((span) => REMOVED_IN_SPAN.test(span) && !ALLOWED_SPANS.has(span.trim()));
    expect(offending).toEqual([]);
  });
});
