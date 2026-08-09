/**
 * auto-assertion.ts — the `auto-assertion:` policy's synthesis engine (Phase
 * 6e, #253), extracted so the runner and play-promotion (ADR-305 D5) share one
 * implementation.
 *
 * The runner calls this at the ADR-294 D2 tier boundary (a bare command's
 * first run under a policy); `createTranscriptFromPlay` calls it at creation
 * time from a played session's captures. Anything either writer would put in a
 * file comes from HERE — a second spelling of the synthesis is the drift
 * ADR-305 D5 forbids. (`@sharpee/transcript-tester` keeps its full copy per
 * ADR-302 D15; that copy is frozen and cannot drift because it never moves.)
 *
 * Public interface: `synthesizePolicyAssertions(policy, actualOutput,
 * channelValues)`, `proseTextLinesOf(values)`.
 * Owner context: @sharpee/branch-tester (test authoring infrastructure).
 */
import { Assertion, AutoAssertionPolicy } from './types.js';

/**
 * Build the assertions an `auto-assertion:` policy writes for a bare command's
 * first run, from the turn's real output.
 *
 * - `all-emitted-text` — `[OK]` + literal block of the whole composed turn
 *   (ADR-287 exact match): every ordered emission — before text, room name,
 *   description, list contents, NPC activity — in order, all of them.
 * - `room-description` / `room-name-and-description` — contains-form built
 *   from the turn's `room-name`/`room-description` STRUCTURED channel
 *   captures (churn survival is the point of choosing less than all-text;
 *   the flattened capture is a JSON rendering, so the text is read out of
 *   the structured values). A turn that emitted neither chosen channel gets
 *   `[SKIP]` — under a policy, "nothing of what I assert on was said" is a
 *   deliberate skip, and the file then distinguishes it from a command
 *   still awaiting its first run.
 *
 * @param policy the story's declared policy
 * @param actualOutput the turn's composed prose, as captured
 * @param channelValues the turn's structured channel captures (bootstrap
 *   auto-captures the two room channels whenever a room policy is declared)
 * @returns the assertions to push onto the command — never empty
 */
export function synthesizePolicyAssertions(
  policy: AutoAssertionPolicy,
  actualOutput: string,
  channelValues?: Record<string, unknown[]>
): Assertion[] {
  if (policy === 'all-emitted-text') {
    return [{ type: 'ok', block: actualOutput.replace(/\s+$/, '').split('\n') }];
  }

  /** Inline `[OK: contains "…"]` for a clean single line; block form when a
   *  quote would corrupt the inline grammar or the fragment spans lines. */
  const containsOf = (lines: string[]): Assertion =>
    lines.length === 1 && !lines[0].includes('"')
      ? { type: 'ok-contains', value: lines[0] }
      : { type: 'ok-contains', block: lines };

  const nameLines = proseTextLinesOf(channelValues?.['room-name']);
  const descriptionLines = proseTextLinesOf(channelValues?.['room-description']);

  const assertions: Assertion[] = [];
  if (policy === 'room-name-and-description' && nameLines.length > 0) {
    assertions.push(containsOf(nameLines));
  }
  if (descriptionLines.length > 0) {
    assertions.push(containsOf(descriptionLines));
  }
  return assertions.length > 0 ? assertions : [{ type: 'skip' }];
}

/**
 * Extract the player-visible text of a prose channel's structured capture,
 * one line per captured entry. A prose entry is `{ content: [...] }` where
 * content items are plain strings or decorations (`{ className, content }`,
 * ADR-174) — decorations flatten to their inner text, exactly what a
 * `contains` fragment should hold. Plain strings pass through, so unit
 * stubs and simple channels need no wrapping.
 */
export function proseTextLinesOf(values: unknown[] | undefined): string[] {
  const textOf = (v: unknown): string => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map(textOf).join('');
    if (v !== null && typeof v === 'object' && 'content' in (v as Record<string, unknown>)) {
      return textOf((v as { content: unknown }).content);
    }
    return '';
  };
  return (values ?? [])
    .map(textOf)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}
