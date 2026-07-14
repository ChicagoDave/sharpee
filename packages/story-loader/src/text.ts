/**
 * text.ts — Chord text-formatting mapping (grammar log 2026-07-10).
 *
 * Purpose: translate Chord's formatting constructs onto the platform's
 * newline conventions before registration/emission: `{br}` (hard line
 * break) becomes `\n`, which the engine prose pipeline lifts to a `tight`
 * block; paragraph breaks arrive from the compiler as `\n\n` and map to
 * paragraph blocks (engine `createBlocks` splitting policy).
 *
 * Public interface: withLineBreaks().
 * Owner context: @sharpee/story-loader (loader-internal text policy).
 */

/**
 * Replace the built-in `{br}` marker with a hard line break. Spaces around
 * the marker are absorbed — the break replaces the inter-word space the
 * prose join inserted between source lines.
 */
export function withLineBreaks(text: string): string {
  return text.replace(/ *\{br\} */g, '\n');
}
