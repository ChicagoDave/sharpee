/**
 * hatch-lint.ts — source-level `'chord.'` lint for hatch modules
 * (design.md §5.6; hatch-context proposal 2026-07-12).
 *
 * The `chord.*` state namespace is the loader's private encoding of Chord
 * semantics — off-limits to hatches. This is the AUTHORITATIVE lint layer:
 * it scans the author's declared hatch source files (the loader's bind-time
 * toString scan is a best-effort backstop; the staging facade is the wall).
 * Comments are stripped before matching, so prose mentions don't trip it.
 *
 * Public interface: lintHatchSources().
 * Owner context: @sharpee/devkit — hosted by `sharpee compose`; the
 * standalone build gains the call when it grows `.story` support.
 */
import * as path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';

/** One lint hit: a quoted `chord.` literal in hatch source. */
export interface HatchLintFinding {
  /** The scanned file (absolute path). */
  file: string;
  /** 1-based line of the offending literal. */
  line: number;
  /** The offending source line, trimmed. */
  text: string;
}

/** Matches a quoted string literal opening with `chord.`. */
const CHORD_LITERAL = /['"`]chord\./g;

/**
 * Blank out `//` and `/* *​/` comments, preserving offsets and newlines so
 * match indices still map to real lines. String literals (including
 * template strings) are left intact — they are exactly what the lint is
 * looking for. A small state machine, not a regex: comment-vs-string
 * context can't be told apart reliably by patterns alone.
 */
function blankComments(source: string): string {
  const out = source.split('');
  type State = 'code' | 'line' | 'block' | 'single' | 'double' | 'template';
  let state: State = 'code';
  for (let i = 0; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];
    switch (state) {
      case 'code':
        if (ch === '/' && next === '/') state = 'line';
        else if (ch === '/' && next === '*') state = 'block';
        else if (ch === "'") state = 'single';
        else if (ch === '"') state = 'double';
        else if (ch === '`') state = 'template';
        if (state === 'line' || state === 'block') out[i] = ' ';
        break;
      case 'line':
        if (ch === '\n') state = 'code';
        else out[i] = ' ';
        break;
      case 'block':
        if (ch === '*' && next === '/') {
          out[i] = ' ';
          out[i + 1] = ' ';
          i++;
          state = 'code';
        } else if (ch !== '\n') out[i] = ' ';
        break;
      case 'single':
        if (ch === '\\') i++;
        else if (ch === "'" || ch === '\n') state = 'code';
        break;
      case 'double':
        if (ch === '\\') i++;
        else if (ch === '"' || ch === '\n') state = 'code';
        break;
      case 'template':
        if (ch === '\\') i++;
        else if (ch === '`') state = 'code';
        break;
    }
  }
  return out.join('');
}

/**
 * Resolve a declared hatch module path to the file to scan: the declared
 * source itself when present (`./extras.ts` beside the `.story` file),
 * otherwise the compiled candidates the host would load (`dist/<base>.js`,
 * `<base>.js`). Absent files are skipped — the load step reports those.
 */
function resolveScanTarget(storyDir: string, modulePath: string): string | undefined {
  const base = modulePath.replace(/\.(ts|js)$/, '');
  const candidates = [
    path.resolve(storyDir, modulePath),
    path.resolve(storyDir, `${base}.ts`),
    path.resolve(storyDir, 'dist', `${base}.js`),
    path.resolve(storyDir, `${base}.js`),
  ];
  return candidates.find((p) => existsSync(p));
}

/**
 * Scan the declared hatch modules of a story for quoted `chord.` string
 * literals (comments stripped first).
 *
 * @param storyDir directory of the `.story` file (module paths are relative to it)
 * @param modulePaths the story's declared hatch module paths, deduplicated by the caller or not
 * @returns findings, empty when clean
 */
export function lintHatchSources(storyDir: string, modulePaths: string[]): HatchLintFinding[] {
  const findings: HatchLintFinding[] = [];
  const seen = new Set<string>();
  for (const modulePath of modulePaths) {
    const target = resolveScanTarget(storyDir, modulePath);
    if (!target || seen.has(target)) continue;
    seen.add(target);
    const source = readFileSync(target, 'utf-8');
    const scannable = blankComments(source);
    CHORD_LITERAL.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = CHORD_LITERAL.exec(scannable)) !== null) {
      const line = scannable.slice(0, match.index).split('\n').length;
      const lineStart = scannable.lastIndexOf('\n', match.index) + 1;
      const lineEnd = scannable.indexOf('\n', match.index);
      findings.push({
        file: target,
        line,
        text: source.slice(lineStart, lineEnd === -1 ? undefined : lineEnd).trim(),
      });
    }
  }
  return findings;
}
