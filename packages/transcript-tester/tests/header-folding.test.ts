/**
 * header-folding.test.ts — folded header continuation lines (ADR-300 D17).
 *
 * Inside the header, an indented line continues the previous field's value.
 * Before this rule the line was discarded outright, or — when it happened to
 * contain a colon — became a header key parsed out of prose. Both silently, so
 * a model-driven serializer (ADR-300 D11) would have deleted the text with the
 * AC-3 round-trip gate agreeing, both parses having read the same truncation.
 *
 * Owner context: transcript-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parseTranscript } from '../src/parser.js';

const BODY = '---\n> look\n[OK]\nA room.\n';

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../..'
);

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

  it('recovers the real corpus file whose description was being truncated', () => {
    // Real path, not a fixture: this file folds `description:` across five
    // physical lines and is one of the 41 that were losing text.
    const file = path.join(
      REPO_ROOT,
      'stories/cloak-of-darkness/tests/transcripts/ac6-undo.transcript'
    );
    const transcript = parseTranscript(fs.readFileSync(file, 'utf-8'), file);

    expect(transcript.header['description']).toContain('ADR-210 AC-6');
    expect(transcript.header['description']).toContain('intact (the win ending) afterward.');
    expect(Object.keys(transcript.header)).toEqual(['title', 'story', 'description']);
  });

  it('produces no header key outside the grammar anywhere in the corpus', () => {
    // Whole-corpus sweep: a phantom key is prose that got read as grammar, and
    // it can only appear where a fold was mis-parsed. Zero of them is the
    // property that makes a model-driven serializer safe to point at these
    // files (ADR-300 D11), so it is asserted over the corpus, not a fixture.
    const LEGAL = new Set([
      'title', 'story', 'entry', 'author', 'description',
      'seed', 'seeds', 'channels', 'events', 'locale', 'forces', 'point-seed'
    ]);

    const storiesDir = path.join(REPO_ROOT, 'stories');
    if (!fs.existsSync(storiesDir)) return;  // published package: no corpus

    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.transcript')) files.push(full);
      }
    };
    walk(storiesDir);
    expect(files.length).toBeGreaterThan(100);

    const offenders: string[] = [];
    for (const file of files) {
      const transcript = parseTranscript(fs.readFileSync(file, 'utf-8'), file);
      for (const key of Object.keys(transcript.header)) {
        if (!LEGAL.has(key)) {
          offenders.push(`${path.relative(REPO_ROOT, file)}: "${key}"`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('leaves no phantom key in the corpus file that produced four of them', () => {
    const file = path.join(
      REPO_ROOT,
      'stories/dungeo/tests/transcripts/article-rendering.transcript'
    );
    const transcript = parseTranscript(fs.readFileSync(file, 'utf-8'), file);

    expect(Object.keys(transcript.header)).toEqual([
      'title',
      'story',
      'author',
      'description'
    ]);
  });
});
