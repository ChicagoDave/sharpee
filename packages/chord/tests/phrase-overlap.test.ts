/**
 * phrase-overlap.test.ts — the topic-arm only-match rule
 * (`analysis.phrase-overlap`, D7 ruling 2026-08-16): conditional response
 * lines must be provably pairwise exclusive; one unconditional default,
 * last in the row. Through the real parse → analyze pipeline, asserting
 * specific diagnostic codes — and the clean cases compile with none.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const overlapErrors = (source: string) =>
  compile(source)
    .diagnostics.filter((d) => d.severity === 'error' && d.code === 'analysis.phrase-overlap');

/** Clean cases assert NO errors at all — a parse error would empty the row and pass vacuously. */
const allErrors = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => `${d.code}: ${d.message}`);

const story = (rows: string) => `story
  title: Overlap
  authors:
    T
  id: overlap
  story-version: 0.0.1
  states: daytime, after-hours

create the player

  You.

create the Lodge
  a room

create the porter
  a person
  in the Lodge
  states: sober, drunk
  mood calm

create the sword
  in the Lodge

define phrase reply-a
  One answer.
end phrase

define phrase reply-b
  Another answer.
end phrase

define phrase reply-c
  A third answer.
end phrase

define topics for the porter
  about "the folly":
${rows}
end topics`;

describe('analysis.phrase-overlap — defaults', () => {
  it('one conditional line plus a trailing default is the legal idiom', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is nervous
    phrase reply-b`,
    ))).toEqual([]);
  });

  it('a second unconditional line is an error naming the first', () => {
    const errs = overlapErrors(story(
      `    phrase reply-a
    phrase reply-b`,
    ));
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain('reply-a');
    expect(errs[0].message).toContain('one default per row');
  });

  it('a default written above a conditional line shadows it — error', () => {
    const errs = overlapErrors(story(
      `    phrase reply-a
    phrase reply-b when the porter is nervous`,
    ));
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain('last line');
    expect(errs[0].message).toContain('reply-b');
  });
});

describe('analysis.phrase-overlap — provable exclusivity', () => {
  it('two mood words are disjoint (one mood at a time)', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is nervous
    phrase reply-b when the porter is calm
    phrase reply-c`,
    ))).toEqual([]);
  });

  it('two conscience bands are disjoint', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is breaking
    phrase reply-b when the porter is burdened
    phrase reply-c`,
    ))).toEqual([]);
  });

  it('two declared entity states are disjoint (one current state)', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is sober
    phrase reply-b when the porter is drunk
    phrase reply-c`,
    ))).toEqual([]);
  });

  it('two story phases are disjoint', () => {
    expect(allErrors(story(
      `    phrase reply-a when daytime
    phrase reply-b when after-hours
    phrase reply-c`,
    ))).toEqual([]);
  });

  it('an atom against its own negation is disjoint', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is nervous
    phrase reply-b when the porter is not nervous`,
    ))).toEqual([]);
  });

  it('a conjunction is disjoint when any conjunct is', () => {
    expect(allErrors(story(
      `    phrase reply-a when the porter is nervous and the porter holds the sword
    phrase reply-b when the porter is calm and the porter holds the sword
    phrase reply-c`,
    ))).toEqual([]);
  });

  it('independent conditions are ambiguous — error naming both lines', () => {
    const errs = overlapErrors(story(
      `    phrase reply-a when the porter holds the sword
    phrase reply-b when the porter is nervous`,
    ));
    expect(errs).toHaveLength(1);
    expect(errs[0].message).toContain('reply-a');
    expect(errs[0].message).toContain('can both match');
  });

  it('a mood word next to a band word is ambiguous (different axes)', () => {
    const errs = overlapErrors(story(
      `    phrase reply-a when the porter is nervous
    phrase reply-b when the porter is burdened`,
    ));
    expect(errs).toHaveLength(1);
  });

  it('three pairwise-disjoint lines are clean; one overlapping pair reports once', () => {
    const errs = overlapErrors(story(
      `    phrase reply-a when the porter is nervous
    phrase reply-b when the porter is calm
    phrase reply-c when the porter holds the sword`,
    ));
    // reply-c overlaps both mood lines — two pair reports
    expect(errs).toHaveLength(2);
  });
});
