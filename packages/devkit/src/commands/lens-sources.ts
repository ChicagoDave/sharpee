/**
 * lens-sources.ts — where a lens source sits in the author's files: devkit
 * as the consumer that turns the lens's keys and IR ids into spans
 * (ADR-333 D2, ADR-408 D4).
 *
 * The lens names each passage by its phrase key and owner IR id, never by
 * span. A keyed passage sits where the IR's phrase table says it does (the
 * span world-index publishes as `prose[].span`). A passage with no key is a
 * literal the owner's declaration holds, so it sits at that declaration.
 *
 * Inside a keyed passage the phrase itself is found by world-index's words
 * rule (`locatePhrase`), clipped to the passage, with no fallback (ADR-321's
 * 2026-11-23 notes, ADR-408 D2, D9). A source with no key spans its owner's
 * whole declaration, which can hold the same words in its name or `aka`
 * line, so it is never searched: a wrong span is worse than none.
 *
 * Public interface: `resolveSourceSpan`, `lensSourceLocator`,
 *   `lensSourceReader`, `locateSourcePhrase`, `utf16Length`, `PhrasePlace`.
 * Owner context: @sharpee/devkit — the author CLI.
 */

import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import type { Span, StoryIR } from '@sharpee/chord';
import type { LensSourceLocator } from '@sharpee/branch-tester';
import type { LensSource } from '@sharpee/ide-protocol';
import { locatePhrase, type SourceReader } from '@sharpee/world-index';

/**
 * The span of a source's passage in the story's default locale.
 *
 * @param ir the compiled story the lens ran on
 * @param source one source from the lens document
 * @returns the passage's span for a keyed source; the owner's declaration
 *   span for a source with no key; null when the IR carries neither
 */
export function resolveSourceSpan(ir: StoryIR, source: LensSource): Span | null {
  if (source.key !== null) {
    const phrase = ir.phrases.locales[ir.phrases.defaultLocale]?.[source.key];
    return phrase?.span ?? null;
  }
  if (source.ownerId === null) return null;
  return ir.entities.find((entity) => entity.id === source.ownerId)?.span ?? null;
}

/**
 * A locator for the console form: each source's file and first line.
 *
 * @param ir the compiled story the lens ran on
 * @param storyFileName the main file's name, for spans that name no file
 *   (Chord's `Span.file` is absent for the main file)
 * @returns the locator `formatExaminableReport` takes
 */
export function lensSourceLocator(ir: StoryIR, storyFileName: string): LensSourceLocator {
  return (source) => {
    const span = resolveSourceSpan(ir, source);
    return span ? { file: span.file ?? storyFileName, line: span.line } : undefined;
  };
}

/** A phrase's place inside its passage: its own span, and its extent in UTF-16 code units. */
export interface PhrasePlace {
  at: Span;
  length: number;
}

/**
 * A reader over a story's source files, keyed the way a `Span` names its
 * file, reading each file at most once.
 *
 * @param storyFile the main `.story` file
 * @returns a reader that answers `undefined` with the main file and any other
 *   name from disk relative to the main file's directory; null for a file
 *   that cannot be read
 */
export function lensSourceReader(storyFile: string): SourceReader {
  const main = path.resolve(storyFile);
  const directory = path.dirname(main);
  const files = new Map<string, string | null>();
  return (file) => {
    const target = file === undefined ? main : path.resolve(directory, file);
    if (!files.has(target)) {
      let text: string | null;
      try {
        text = readFileSync(target, 'utf8');
      } catch {
        text = null;
      }
      files.set(target, text);
    }
    return files.get(target) ?? null;
  };
}

/**
 * Where a source's phrase sits inside its passage.
 *
 * Each form is tried in order, and the first found wins: a number-form
 * finding's `phrase` is the number the prose did not write, its
 * `resolvedForm` the one it did.
 *
 * @param source the lens source
 * @param span the source's passage span, from `resolveSourceSpan`
 * @param forms the phrase forms to look for, in order (empty ones skipped)
 * @param read the story's source reader
 * @returns the phrase's span and length; undefined for a source with no key,
 *   a null span, a file that cannot be read, or words not in the passage
 */
export function locateSourcePhrase(
  source: LensSource,
  span: Span | null,
  forms: readonly (string | undefined)[],
  read: SourceReader,
): PhrasePlace | undefined {
  if (source.key === null || span === null) return undefined;
  const text = read(span.file);
  if (text === null) return undefined;
  for (const form of forms) {
    if (form === undefined) continue;
    const words = form.split(/\s+/).filter((word) => word.length > 0);
    const at = locatePhrase(text, span, words);
    if (at !== null) return { at, length: utf16Length(text, at) };
  }
  return undefined;
}

/**
 * A span's extent in its source, in UTF-16 code units: from its start to just
 * past its end, every line break inside it counted as the source writes it
 * (`\r\n` is two). Lines split the way Chord's lexer splits them.
 *
 * @param source the whole text of the span's file
 * @param at a span inside that text (1-based lines and columns, `endColumn`
 *   just past the last character)
 * @returns the number of code units the span covers
 * @throws RangeError when the span's lines fall outside the source or its end
 *   precedes its start
 */
export function utf16Length(source: string, at: Span): number {
  const starts: number[] = [0];
  const breaks = /\r\n|\n|\r/g;
  for (let match = breaks.exec(source); match !== null; match = breaks.exec(source)) {
    starts.push(match.index + match[0].length);
  }
  if (at.line < 1 || at.endLine > starts.length || at.endLine < at.line) {
    throw new RangeError(`span ${at.line}:${at.column}-${at.endLine}:${at.endColumn} lies outside the source`);
  }
  const length = (starts[at.endLine - 1] + at.endColumn - 1) - (starts[at.line - 1] + at.column - 1);
  if (length < 0) throw new RangeError(`span ${at.line}:${at.column}-${at.endLine}:${at.endColumn} ends before it starts`);
  return length;
}
