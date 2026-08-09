/**
 * serializer-roundtrip.test.ts — ADR-300 AC-3 and AC-4.
 *
 * AC-3 (round-trip fidelity): for every `.transcript` in the repository,
 * parse → serialize → parse yields the same model. This is the test that proves
 * nothing the parser silently drops gets deleted on save — the whole reason a
 * model editor is safe to point at a corpus it did not write.
 *
 * AC-4 (idempotency): serializing an already-canonical file is a byte no-op.
 * That is the property making D11's "an ordinary edit produces a minimal diff"
 * true rather than aspirational, and it is testable before the normalization
 * commit by serializing twice rather than comparing against the file on disk.
 *
 * Owner context: branch-tester test suite (tooling).
 */
import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import { parseTranscript } from '../src/parser.js';
import { serializeTranscript } from '../src/serializer.js';
import type { Transcript } from '../src/types.js';

import { corpusFiles, corpusRelative, hasCorpus } from './corpus.js';

/**
 * Positional metadata that necessarily moves when a file is reformatted.
 *
 * Stripped before comparison because they describe where a thing sat in the
 * old file, not what it says. Everything else — every value the transcript
 * asserts, in order — is compared.
 */
const POSITIONAL = new Set([
  'lineNumber',
  'seedLineNumber',
  'forcesLineNumber',
  'pointSeedsLineNumber',
  'filePath'
]);

/**
 * Drop positional metadata and put object keys in a stable order.
 *
 * Keys are sorted because the comparison below stringifies, and stringifying is
 * order-sensitive in a way the model is not: the header is a map, and the
 * serializer writes its fields in a fixed order rather than the order they were
 * read in. Two headers with the same fields are the same header.
 */
function stripPositional(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripPositional);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      if (POSITIONAL.has(key)) continue;
      out[key] = stripPositional((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

const FILES = hasCorpus ? corpusFiles() : [];

describe.skipIf(!hasCorpus)('serializer round trip (ADR-300 AC-3)', () => {
  it('the configured corpus is not empty', () => {
    // Not an assertion about how big the repository is — that is not this
    // test's business. A configured corpus holding no transcripts means the
    // configuration is wrong, and every sweep below would pass vacuously.
    expect(FILES.length).toBeGreaterThan(0);
  });

  it('preserves the model across parse → serialize → parse, for every file', () => {
    const diverged: string[] = [];

    for (const file of FILES) {
      const first: Transcript = parseTranscript(fs.readFileSync(file, 'utf-8'), file);
      const second: Transcript = parseTranscript(serializeTranscript(first), file);

      const a = JSON.stringify(stripPositional(first));
      const b = JSON.stringify(stripPositional(second));
      if (a !== b) diverged.push(corpusRelative(file));
    }

    expect(diverged).toEqual([]);
  });

  it('introduces no parse error into a file that parsed clean', () => {
    const broken: string[] = [];

    for (const file of FILES) {
      const first = parseTranscript(fs.readFileSync(file, 'utf-8'), file);
      if (first.parseErrors) continue;   // already broken on disk: not ours to fix
      const second = parseTranscript(serializeTranscript(first), file);
      if (second.parseErrors) {
        broken.push(`${corpusRelative(file)}: ${second.parseErrors[0].message}`);
      }
    }

    expect(broken).toEqual([]);
  });
});

describe.skipIf(!hasCorpus)('serializer idempotency (ADR-300 AC-4)', () => {
  it('is a byte no-op on already-canonical output, for every file', () => {
    const unstable: string[] = [];

    for (const file of FILES) {
      const once = serializeTranscript(parseTranscript(fs.readFileSync(file, 'utf-8'), file));
      const twice = serializeTranscript(parseTranscript(once, file));
      if (once !== twice) unstable.push(corpusRelative(file));
    }

    expect(unstable).toEqual([]);
  });
});

describe('canonical form (ADR-300 D17)', () => {
  const sample = (body: string): string =>
    serializeTranscript(parseTranscript(`title: T\nstory: s\n---\n${body}`));

  it('ends the file with a trailing newline', () => {
    expect(sample('> look\n[OK: contains "room"]\n').endsWith('\n')).toBe(true);
  });

  it('writes the command as "> " plus the command, single space', () => {
    expect(sample('>    look   \n[SKIP]\n')).toContain('\n> look\n');
  });

  it('puts a blank line after the --- separator', () => {
    expect(sample('> look\n[SKIP]\n')).toContain('---\n\n> look');
  });

  it('puts a blank line before each stanza, above its leading comments', () => {
    const out = sample('> one\n[SKIP]\n# why the second\n> two\n[SKIP]\n');
    expect(out).toContain('[SKIP]\n\n# why the second\n> two');
  });

  // An indented block under a comment marker is how an author pastes captured
  // output into a transcript. The parser trimmed it until 2026-08-08, which made
  // `#     > look` and `# > look` the same comment in the model — so a round trip
  // through an editing tool flattened a pasted failure into one unreadable line.
  it('keeps the indentation an author wrote inside a comment', () => {
    const pasted = '#\n#     > look                     FAIL\n#       Error: Engine is not running\n#\n';
    const out = sample(`${pasted}> north\n[SKIP]\n`);
    expect(out).toContain('#     > look                     FAIL\n');
    expect(out).toContain('#       Error: Engine is not running\n');
  });

  // The space after the hash is a separator, so an empty comment is `#`. Writing
  // `# ` put trailing whitespace into the file on every save, and a blank comment
  // line is the usual way to open and close a pasted block.
  it('writes an empty comment as "#", with no trailing space', () => {
    const out = sample('#\n> look\n[SKIP]\n');
    expect(out).toContain('\n#\n');
    expect(out).not.toContain('# \n');
  });

  it('round-trips a pasted comment block byte-for-byte', () => {
    const source =
      'title: T\nstory: s\n\n---\n\n#\n#     > look                     FAIL\n#       Error: Engine is not running\n#\n> north\n[SKIP]\n';
    expect(serializeTranscript(parseTranscript(source))).toBe(source);
  });

  it('puts a blank line after a goal label and does not double it', () => {
    const out = sample('[GOAL: Reach the cave]\n> look\n[SKIP]\n[END GOAL]\n');
    expect(out).toContain('[GOAL: Reach the cave]\n\n> look');
    expect(out).not.toContain('\n\n\n');
  });

  it('never separates an assertion from its literal block', () => {
    const out = sample('> look\n[OK]\ntext\nA room.\nend text\n');
    expect(out).toContain('[OK]\ntext\nA room.\nend text');
  });

  it('emits header fields in D3 order, moving seed after description', () => {
    const out = serializeTranscript(
      parseTranscript('seed: 7\nstory: s\ntitle: T\n---\n> look\n[SKIP]\n')
    );
    expect(out.slice(0, out.indexOf('---'))).toBe('title: T\nstory: s\nseed: 7\n\n');
  });

  it('folds a long header value at 78 columns with a 2-space continuation', () => {
    const long = 'word '.repeat(40).trim();
    const out = serializeTranscript(
      parseTranscript(`title: T\ndescription: ${long}\n---\n> look\n[SKIP]\n`)
    );
    const headerLines = out.slice(0, out.indexOf('---')).trimEnd().split('\n');
    const continuations = headerLines.filter((l) => l.startsWith('  '));

    expect(continuations.length).toBeGreaterThan(0);
    for (const line of headerLines) expect(line.length).toBeLessThanOrEqual(78);
    for (const line of continuations) expect(line.startsWith('  ')).toBe(true);
  });

  it('keeps a bare [FAIL] bare and a reasoned one reasoned', () => {
    expect(sample('> look\n[FAIL]\n')).toContain('\n[FAIL]\n');
    expect(sample('> look\n[FAIL: parser bug]\n')).toContain('\n[FAIL: parser bug]\n');
  });
});
