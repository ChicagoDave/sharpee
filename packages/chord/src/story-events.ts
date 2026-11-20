/**
 * story-events.ts — the story-event vocabulary of a compiled story: every
 * event id its `emit` statements name.
 *
 * Purpose: a story event is a signal the story raises for channels and
 * machines; it is not prose (GH #724). The vocabulary is recorded in the IR
 * as `storyEvents` so the platform can tell a story event from prose by its
 * type alone, with nothing carried on the event.
 *
 * Public interface: `collectStoryEvents(ir)` — the one derivation, used by
 * the analyzer's `emitStoryEvents` pass (which records the list) and by
 * `validateIR` (which refuses an IR whose list disagrees with it).
 *
 * Owner context: @sharpee/chord (the compiler; browser-safe, no platform
 * dependency). The ids are Chord's own dotless spelling; the loader
 * translates them to runtime event types.
 *
 * Invariant: the list is complete by construction. The walk visits every
 * object in the IR, so an `emit` in a statement family added later is found
 * without this module changing.
 */
import type { StoryIR } from './ir.js';

/** Any value a lowered IR node can hold in a field. */
type IRFieldValue = object | string | number | boolean | null | undefined;

/**
 * The Chord event id an `emit` statement node names, or undefined when the
 * node is not an `emit` statement.
 */
function emittedEventOf(node: object): string | undefined {
  const kind: IRFieldValue = Object.getOwnPropertyDescriptor(node, 'kind')?.value;
  if (kind !== 'emit') return undefined;
  const event: IRFieldValue = Object.getOwnPropertyDescriptor(node, 'event')?.value;
  return typeof event === 'string' ? event : undefined;
}

/** Visit every object under `root`, depth first, adding each `emit`'s event id to `found`. */
function gather(root: object, found: Set<string>): void {
  const event = emittedEventOf(root);
  if (event !== undefined) found.add(event);
  const children: ReadonlyArray<IRFieldValue> = Object.values(root);
  for (const child of children) {
    if (typeof child === 'object' && child !== null) gather(child, found);
  }
}

/**
 * Every event id the story's `emit` statements name: each once, sorted by
 * code unit. Media statements other than `play sound` lower to `emit` nodes,
 * so their `media-*` ids are included; `play sound` is its own statement
 * and contributes nothing here.
 *
 * @param ir the compiled Story IR (its own `storyEvents` field is not read)
 * @returns the story-event vocabulary, in Chord's dotless spelling
 */
export function collectStoryEvents(ir: StoryIR): string[] {
  const found = new Set<string>();
  gather(ir, found);
  return [...found].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
