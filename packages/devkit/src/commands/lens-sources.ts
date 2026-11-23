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
 * Public interface: `resolveSourceSpan`, `lensSourceLocator`.
 * Owner context: @sharpee/devkit — the author CLI.
 */

import type { Span, StoryIR } from '@sharpee/chord';
import type { LensSourceLocator } from '@sharpee/branch-tester';
import type { LensSource } from '@sharpee/ide-protocol';

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
