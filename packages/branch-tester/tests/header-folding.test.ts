/**
 * header-folding.test.ts — folded header continuation lines (ADR-300 D17).
 *
 * Inside the header, an indented line continues the previous field's value.
 * Before this rule the line was discarded outright, or — when it happened to
 * contain a colon — became a header key parsed out of prose. Both silently, so
 * a model-driven serializer (ADR-300 D11) would have deleted the text with the
 * AC-3 round-trip gate agreeing, both parses having read the same truncation.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import { parseTranscript } from '../src/parser.js';
import { corpusFiles, corpusRelative, hasCorpus } from './corpus.js';

const BODY = '---\n> look\n[OK]\nA room.\n';


describe('folded header values (ADR-300 D17)', () => {
  it('joins continuation lines into the field value, single-spaced', () => {
    const transcript = parseTranscript(
      `title: T\ndescription: First line.\n  Second line.\n  Third line.\n${BODY}`
    );

    expect(transcript.header['description']).toBe(
      'First line. Second line. Third line.'
    );
  });

  it('treats a colon-bearing continuation as prose, not a new field', () => {
    const transcript = parseTranscript(
      `title: T\ndescription: Locks in the fix.\n  See: ADR-158 for why.\n${BODY}`
    );

    expect(Object.keys(transcript.header)).toEqual(['title', 'description']);
    expect(transcript.header['description']).toBe(
      'Locks in the fix. See: ADR-158 for why.'
    );
  });

  it('validates a config field against the joined value, not its first line', () => {
    // A folded `forces:` whose second line carries the second entry. Judged on
    // the first physical line alone, `b#1=MISS` would never reach the config.
    const transcript = parseTranscript(
      `title: T\nforces: a#1=HIT,\n  b#1=MISS\n${BODY}`
    );

    expect(transcript.parseErrors).toBeUndefined();
    expect(transcript.config!.forces).toEqual(['a#1=HIT', 'b#1=MISS']);
  });

  it('drops a lone | marker and keeps only the text below it', () => {
    const transcript = parseTranscript(
      `title: T\ndescription: |\n  The real text.\n  More of it.\n${BODY}`
    );

    expect(transcript.header['description']).toBe('The real text. More of it.');
  });

  it('does not fold an indented line that appears before any field', () => {
    const transcript = parseTranscript(
      `  orphan continuation\ntitle: T\n${BODY}`
    );

    expect(Object.keys(transcript.header)).toEqual(['title']);
    expect(transcript.header['title']).toBe('T');
  });

  it('does not fold a non-indented line — that is the next field', () => {
    const transcript = parseTranscript(
      `title: T\ndescription: One.\nauthor: Someone\n${BODY}`
    );

    expect(transcript.header['description']).toBe('One.');
    expect(transcript.header['author']).toBe('Someone');
  });

  it('does not fold an indented line below the --- separator', () => {
    // Indented prose under a command is expected output, and stays so.
    const transcript = parseTranscript(
      `title: T\n---\n> look\n[OK]\n  indented prose\n`
    );

    expect(transcript.header['title']).toBe('T');
    expect(transcript.commands[0].expectedOutput).toEqual(['  indented prose']);
  });

  it('closes the last field when the header runs to EOF with no separator', () => {
    const transcript = parseTranscript(`title: T\ndescription: One.\n  Two.\n`);

    expect(transcript.header['description']).toBe('One. Two.');
  });

  it('recovers a five-line folded description without losing its tail', () => {
    // Verbatim header of cloak-of-darkness/ac6-undo, one of the 41 files that
    // were losing text. Inlined rather than read from disk: what is under test
    // is how the parser folds these five lines, not whether that file exists
    // at that path — and a test that reads across the repository breaks when
    // the corpus is reorganised, which says nothing about the parser.
    const transcript = parseTranscript(
      'title: Cloak AC-6 — undo reverts occurrence counters and message state\n' +
      'story: cloak-of-darkness\n' +
      'description: ADR-210 AC-6 (added Phase 6, additive to the frozen golden six).\n' +
      "  Undoing the first dark entry must roll back the first-time ordinal's trample\n" +
      '  along with the movement — occurrence counters and chord.state.* are world\n' +
      '  state, so undo needs no author-written code. The message reads intact (the\n' +
      '  win ending) afterward.\n' +
      BODY
    );

    expect(transcript.header['description']).toContain('ADR-210 AC-6');
    expect(transcript.header['description']).toContain('intact (the win ending) afterward.');
    expect(Object.keys(transcript.header)).toEqual(['title', 'story', 'description']);
  });

  it('leaves no phantom key in the header that produced four of them', () => {
    // Verbatim header of dungeo/article-rendering. Its description contains
    // four colons inside prose — "Locks in ADR-158:", "(`{the:cap:item}`",
    // "See: -", "Original bug report:" — each of which became a header key
    // before continuations were joined. Inlined for the same reason as above.
    const transcript = parseTranscript(
      'title: Article Rendering Regression\n' +
      'story: dungeo\n' +
      'author: Sharpee Team\n' +
      'description: Locks in ADR-158: stdlib actions emit EntityInfo in message\n' +
      '  params so the formatter chain (`{the:cap:item}`, etc.) can choose the\n' +
      '  correct article per nounType / properName / IdentityTrait.article. The\n' +
      '  original bug (rendered "white house is fixed in place." with no article) was\n' +
      "  caused by stdlib's taking action passing `noun.name` (a bare string) where\n" +
      '  the formatter expected EntityInfo. Phase 2 of the lang-articles migration\n' +
      '  migrates the taking action and its templates; this transcript is the\n' +
      '  regression sentinel. See: - ADR-158 Entity-Valued Message Params Carry\n' +
      '  EntityInfo - docs/work/lang-articles/plan-20260424-the-cap-migration.md -\n' +
      '  Original bug report: text "white house is fixed in place." in Dungeo\'s web\n' +
      '  client\n' +
      BODY
    );

    expect(Object.keys(transcript.header)).toEqual([
      'title',
      'story',
      'author',
      'description'
    ]);
  });
});

describe.skipIf(!hasCorpus)('header grammar across a configured corpus', () => {
  // A phantom key is prose that got read as grammar, and it can only appear
  // where a fold was mis-parsed — so this is worth asserting over real files
  // rather than a fixture. It sweeps the corpus it is *given*
  // (SHARPEE_TRANSCRIPT_CORPUS) and skips when given none, instead of hunting
  // for `stories/` and passing silently when it finds nothing.
  const LEGAL = new Set([
    'title', 'story', 'entry', 'author', 'description',
    'seed', 'seeds', 'channels', 'events', 'locale', 'forces', 'point-seed',
    // v2's own addition (ADR-302 D1). Inherited from v1's copy, this list did
    // not know about the key the copy exists to support — and since the legal
    // key set is enforced HERE rather than in the parser, the first real tree
    // in the corpus is what found it.
    'continues'
  ]);

  it('produces no header key outside the grammar', () => {
    const offenders: string[] = [];

    for (const file of corpusFiles()) {
      const transcript = parseTranscript(fs.readFileSync(file, 'utf-8'), file);
      for (const key of Object.keys(transcript.header)) {
        if (!LEGAL.has(key)) {
          offenders.push(`${corpusRelative(file)}: "${key}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
