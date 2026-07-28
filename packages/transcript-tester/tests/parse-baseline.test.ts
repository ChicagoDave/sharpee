/**
 * parse-baseline.test.ts — the D2 safety net for ADR-287 (fenced literal payloads).
 *
 * ADR-287 D2 rules the fence *additive*: every existing transcript must parse
 * exactly as it did before the grammar grew. Acceptance 3 asks for
 * "byte-identical results before and after the change".
 *
 * This pins that as a digest per transcript over the whole in-repo corpus. It
 * is deliberately written and committed BEFORE the parser is touched — a
 * baseline captured after the change proves nothing.
 *
 * When a digest changes, the parser changed the meaning of an existing
 * transcript. That is a D2 violation until proven otherwise; do not re-bless
 * the snapshot to make it green. Use `dumpAst()` below on the offending file
 * to see what moved.
 *
 * Owner context: transcript-tester test suite (tooling; no story-domain behavior).
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// Imported from the parser module directly, not the package barrel: the barrel
// re-exports the runner, which pulls in @sharpee/bootstrap and the whole engine.
// The parser depends on nothing but ./types.js, and this baseline should stay
// runnable without a built platform.
import { parseTranscriptFile } from '../src/parser.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const STORIES_DIR = path.join(REPO_ROOT, 'stories');

/** Recursively collect every `.transcript` file under a directory, sorted. */
function findTranscripts(dir: string): string[] {
  const found: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      found.push(...findTranscripts(full));
    } else if (entry.name.endsWith('.transcript')) {
      found.push(full);
    }
  }
  return found.sort();
}

/**
 * Serialize a parsed transcript to a stable canonical string.
 *
 * Keys are sorted so key-order churn can't register as a semantic change, and
 * RegExp values (`ok-matches` assertions carry a live RegExp) are rendered
 * explicitly — `JSON.stringify` turns them into `{}` and would hide a changed
 * pattern completely.
 */
function canonicalize(value: unknown): string {
  return JSON.stringify(value, function (this: unknown, _key, val) {
    if (val instanceof RegExp) return `RegExp(${val.source}/${val.flags})`;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(val as Record<string, unknown>).sort()) {
        sorted[k] = (val as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return val;
  });
}

/** Parse one transcript and canonicalize it, with the machine-specific path stripped. */
function astOf(absolutePath: string): string {
  const transcript = parseTranscriptFile(absolutePath);
  transcript.filePath = path.relative(REPO_ROOT, absolutePath);
  return canonicalize(transcript);
}

/** Debugging aid: print one transcript's canonical AST. Not used by the assertions. */
export function dumpAst(relativePath: string): string {
  return astOf(path.join(REPO_ROOT, relativePath));
}

describe('ADR-287 D2 — existing transcripts parse identically', () => {
  const transcripts = findTranscripts(STORIES_DIR);

  it('finds the in-repo transcript corpus', () => {
    // Guards against the vacuous pass: an empty or collapsed corpus would make
    // every digest assertion below trivially true.
    expect(transcripts.length).toBeGreaterThanOrEqual(180);
  });

  it('parses every transcript to its recorded digest', () => {
    const digests: Record<string, string> = {};
    for (const file of transcripts) {
      const relative = path.relative(REPO_ROOT, file);
      digests[relative] = createHash('sha256').update(astOf(file)).digest('hex').slice(0, 16);
    }
    expect(digests).toMatchSnapshot();
  });

  it('parses the corpus without throwing', () => {
    // A parser that crashes on an existing file is a D2 violation the digest
    // snapshot cannot express — the test would error out before comparing.
    for (const file of transcripts) {
      expect(() => parseTranscriptFile(file), `parsing ${path.relative(REPO_ROOT, file)}`).not.toThrow();
    }
  });
});
