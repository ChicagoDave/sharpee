/**
 * phrasebooks-runtime.test.ts — ADR-250 AC-3/AC-5 (loader side): the
 * phrasebook resolution seam. One evaluator per book-covered,
 * not-story-defined key (story-beats-book decided at LOAD); first-match
 * arbitration in declaration order; live predicate flips at the next read
 * (ADR-240 — no re-registration, no stored state); Choice atoms keyed
 * `phrasebook.<book>` / key (D5); used-book data-registry conformance.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { compile, PHRASEBOOK_REGISTRY } from '@sharpee/chord';
import { phrasebookTemplateKey, type PhrasebookResolution } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { createStory, PHRASEBOOK_DATA } from '../src';

const SOURCE = `story "Voices" by "T"
  id: voices
  version: 0.0.1
  states: evening, midnight

create the Parlour
  a room

  A parlour.

create the bell
  scenery
  in the Parlour

  A hand bell.

  on pushing it
    change the story to midnight
  end on

create the player
  starts in the Parlour

  You.

define phrase told-tale
  The story text wins.
end phrase

define phrasebook midnight-voice while midnight
  cold-returns:
    The cold, at midnight.

  told-tale:
    A book must never win this.
end phrasebook

define phrasebook evening-voice
  cold-returns, first-time:
    The cold, first time.
  or
    The cold, later.

  hearth-call:
    The hearth glows.
end phrasebook
`;

function load(source = SOURCE) {
  const result = compile(source);
  expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  const story = createStory(result.ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world, player };
}

/** Flip the story to midnight through the bell's REAL registered interceptor. */
function ringBell({ story, world, player }: ReturnType<typeof load>): void {
  const bell = world.getEntity(story.entityId('bell')!)!;
  const lookup = world.getInterceptorForAction(bell, 'if.action.pushing')!;
  const data = {};
  lookup.interceptor.postValidate!(bell, world, player.id, data);
  lookup.interceptor.postExecute!(bell, world, player.id, data);
}

const resolve = (world: WorldModel, key: string) =>
  world.evaluate(phrasebookTemplateKey(key)) as PhrasebookResolution | undefined;

afterEach(() => {
  PHRASEBOOK_REGISTRY.clear();
  PHRASEBOOK_DATA.clear();
});

describe('the key convention (ADR-240 D6)', () => {
  it('is pinned: phrasebook.template.<key>', () => {
    expect(phrasebookTemplateKey('cold-returns')).toBe('phrasebook.template.cold-returns');
  });
});

describe('story-beats-book is decided at load (ADR-250 D4.2)', () => {
  it('a story-defined key gets NO evaluator — even while a covering book is active', () => {
    const cw = load();
    ringBell(cw); // midnight-voice active, and it covers told-tale
    expect(cw.world.evaluate(phrasebookTemplateKey('told-tale'))).toBeUndefined();
  });
});

describe('arbitration + live predicates (ADR-245 D3 / ADR-240)', () => {
  it('first predicate-match in declaration order, per key; a state flip moves the voice at the next read', () => {
    const cw = load();
    // Evening: midnight-voice predicate false → evening-voice (default book).
    expect(resolve(cw.world, 'cold-returns')?.book).toBe('evening-voice');
    ringBell(cw);
    // Midnight: midnight-voice is declared first and now matches.
    const hit = resolve(cw.world, 'cold-returns');
    expect(hit?.book).toBe('midnight-voice');
    expect(hit?.template).toBe('The cold, at midnight.');
  });

  it('a key the first active book does not cover falls through to the next book', () => {
    const cw = load();
    ringBell(cw); // midnight-voice active but does not cover hearth-call
    expect(resolve(cw.world, 'hearth-call')?.book).toBe('evening-voice');
  });

  it('no active covering book resolves undefined (fall through to the render default)', () => {
    const noDefault = SOURCE.replace(/define phrasebook evening-voice[\s\S]*?end phrasebook\n/, '');
    const cw = load(noDefault);
    // Evening: only midnight-voice exists and its predicate is false.
    expect(resolve(cw.world, 'cold-returns')).toBeUndefined();
  });
});

describe('variant state per (book, key) — Choice keying (ADR-250 D5)', () => {
  it('a multi-variant strategy entry carries a Choice keyed phrasebook.<book> / key', () => {
    const cw = load();
    const hit = resolve(cw.world, 'cold-returns');
    expect(hit?.template).toBe('{variants}');
    const choice = hit?.params?.variants as { kind: string; selector: string; entityId: string; messageKey: string; alternatives: unknown[] };
    expect(choice.kind).toBe('choice');
    expect(choice.selector).toBe('firstTime');
    expect(choice.entityId).toBe('phrasebook.evening-voice');
    expect(choice.messageKey).toBe('cold-returns');
    expect(choice.alternatives).toHaveLength(2);
  });
});

describe('used books: data registry + conformance (ADR-250 D3)', () => {
  const USE_SOURCE = SOURCE.replace(
    '  states: evening, midnight\n',
    '  states: evening, midnight\n  use phrasebook candle-voice\n',
  );
  const ENTRY = { strategy: null, variants: [{ text: 'By candlelight.', markers: [] }], span: { line: 1, column: 1 } };

  it('a used book resolves from the data registry and joins arbitration ahead of body books', () => {
    PHRASEBOOK_REGISTRY.set('candle-voice', { name: 'candle-voice', keys: ['cold-returns'] });
    PHRASEBOOK_DATA.set('candle-voice', { entries: { 'cold-returns': ENTRY } });
    const cw = load(USE_SOURCE);
    // Header position beats both body books; predicate-less = always.
    const hit = resolve(cw.world, 'cold-returns');
    expect(hit?.book).toBe('candle-voice');
    expect(hit?.template).toBe('By candlelight.');
  });

  it('a used book missing from the data registry is a load-time error', () => {
    PHRASEBOOK_REGISTRY.set('candle-voice', { name: 'candle-voice', keys: ['cold-returns'] });
    const result = compile(USE_SOURCE);
    expect(result.ok).toBe(true);
    const story = createStory(result.ir);
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(/candle-voice/);
  });

  it('manifest/data key mismatch is a load-time error', () => {
    PHRASEBOOK_REGISTRY.set('candle-voice', { name: 'candle-voice', keys: ['cold-returns'] });
    PHRASEBOOK_DATA.set('candle-voice', { entries: { 'other-key': ENTRY } });
    const result = compile(USE_SOURCE);
    expect(result.ok).toBe(true);
    const story = createStory(result.ir);
    const world = new WorldModel();
    expect(() => story.initializeWorld(world)).toThrow(/disagree/);
  });
});
