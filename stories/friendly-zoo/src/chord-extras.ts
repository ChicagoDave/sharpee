/**
 * chord-extras.ts — TS escape hatch for zoo.story (ADR-210 §5.6).
 *
 * Bound by `define text flavor from "./chord-extras.ts"`: the loader binds
 * the named export to the `{flavor}` marker in the parrot's description.
 * Returns the same persistent cycling Choice the hand-written story's C2
 * consumer stages (dynamic-text.ts), keyed to the parrot so the cycle
 * position survives save/restore.
 *
 * Public interface: flavor (a PhraseProducer, ADR-196).
 * Owner context: @sharpee/story-friendly-zoo (story content; Chord edition).
 */
import type { Choice, Literal, PhraseProducer } from '@sharpee/if-domain';

const lit = (text: string): Literal => ({ kind: 'literal', text });

/** Cycling parrot flavor line (C2), keyed to the parrot entity. */
export const flavor: PhraseProducer = () => {
  const choice: Choice = {
    kind: 'choice',
    selector: 'cycling',
    alternatives: [
      lit('The parrot ruffles its scarlet feathers and whistles a jaunty tune.'),
      lit('The parrot cocks its head and rasps, "Pretty bird! Pretty bird!"'),
      lit('The parrot preens one wing, ignoring you with theatrical disdain.'),
    ],
    entityId: 'zoo-parrot',
    messageKey: 'parrot-cycle',
  };
  return choice;
};

/**
 * Once-only plaque aside (C2 firstTime): the leading space lives inside
 * alt[0]; later examinations get Empty, ending the sentence cleanly.
 */
export const aside: PhraseProducer = () => {
  const choice: Choice = {
    kind: 'choice',
    selector: 'firstTime',
    alternatives: [
      lit(' (A small plaque notes the macaws are rescues from the illegal pet trade.)'),
      { kind: 'empty' } as never,
    ],
    entityId: 'zoo-parrot',
    messageKey: 'parrot-aside',
  };
  return choice;
};

/**
 * Gate status line (C1 Optional shape): the mid-sentence clause appears
 * only while the staff gate stands open (reads the story's gate-closed
 * flag at render staging).
 */
export const gateStatus: PhraseProducer = (ctx) => {
  const world = (ctx as unknown as { world?: { getStateValue(key: string): unknown } }).world;
  const closed = world?.getStateValue('chord.flag.gate-closed');
  const open = !(closed === true || closed === 'true');
  return lit(open ? 'The staff gate is set into the fence, standing wide open.' : 'The staff gate is set into the fence.');
};

export { gateStatus as 'gate-status' };
