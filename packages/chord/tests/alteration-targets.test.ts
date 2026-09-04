/**
 * alteration-targets.test.ts — ADR-276 Phase 3 (census entries 1–2):
 * alteration target names resolve at compile against the story's own actions
 * plus the generated stdlib manifest, mirroring the loader's story-first
 * order (ADR-270 D2). The loader keeps the same checks as rogue-IR backstops
 * (tested in @sharpee/story-loader).
 * REAL-PATH: every case drives Chord source through the actual compile
 * pipeline; the manifest consulted is the committed generated module.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import { STDLIB_MANIFEST } from '../src/stdlib-manifest';

const STORY =
  'story\n  title: T\n  authors:\n    N\n\ncreate the Barn\n  a room\n\n  A barn.\n\ncreate Alex\n  a person\n  playable\n  starts in the Barn\n\n  You.\n\nbefore the game starts\n  change the player to Alex\nend before\n\n';

const errors = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');

describe('alteration targets (ADR-276 census 1–2)', () => {
  it('the generated manifest carries the stdlib action surface', () => {
    expect(STDLIB_MANIFEST.actionIds.has('if.action.taking')).toBe(true);
    expect(STDLIB_MANIFEST.actionIds.size).toBeGreaterThanOrEqual(40);
    expect(Object.keys(STDLIB_MANIFEST.locales)).toEqual(['en-US']);
  });

  it('extend action with an unknown target reports analysis.extend-target with a did-you-mean', () => {
    const found = errors(`${STORY}extend action takng\n  grammar\n    snag the item\n`);
    expect(found.map((d) => d.code)).toEqual(['analysis.extend-target']);
    expect(found[0].message).toContain('`extend action takng` — no story action or standard action');
    expect(found[0].message).toContain('did you mean `taking`');
    expect(found[0].span.line).toBeGreaterThan(0);
  });

  it('remove from action with an unknown target reports analysis.removal-target', () => {
    const found = errors(`${STORY}remove from action snarf\n  grammar\n    take the item\n`);
    expect(found.map((d) => d.code)).toEqual(['analysis.removal-target']);
    expect(found[0].message).toContain('`remove from action snarf` — no standard action');
  });

  it('story-first: a story-defined action of the same name wins, declared in any order', () => {
    const src =
      `${STORY}extend action snoozing\n  grammar\n    doze off\n\n` +
      `define action snoozing\n  grammar\n    snooze\n  phrases en-US\n    dozed:\n      You doze.\n\n  phrase dozed\n`;
    expect(errors(src).map((d) => d.code)).toEqual([]);
  });

  it('a standard-action target compiles clean', () => {
    expect(errors(`${STORY}extend action taking\n  grammar\n    snag the item\n`)).toEqual([]);
  });

  it('census 3: a removal pattern matching no standard shape is analysis.unmatched-removal-pattern, listing the shapes', () => {
    const found = errors(`${STORY}remove from action taking\n  yoink the item\n`);
    expect(found.map((d) => d.code)).toEqual(['analysis.unmatched-removal-pattern']);
    expect(found[0].message).toContain('no standard rule matches `yoink :item`');
    expect(found[0].message).toContain('`take :item`');
    expect(found[0].message).toContain('`pick up :item`');
  });

  it('census 3: a matching removal pattern compiles clean (not stricter than the load check)', () => {
    expect(errors(`${STORY}remove from action taking\n  get the item\n  take up the item\n`)).toEqual([]);
  });

  it('census 3: the manifest shape strings are the registered rule patterns verbatim', () => {
    const shapes = STDLIB_MANIFEST.locales['en-US'].grammarShapes['if.action.taking'];
    expect(shapes).toContain('take :item');
    expect(shapes).toContain('get :item');
    expect(Object.keys(STDLIB_MANIFEST.locales['en-US'].grammarShapes).length).toBeGreaterThanOrEqual(50);
  });

  it('removals do not resolve story-first — a story action name is still analysis.removal-target', () => {
    const src =
      `${STORY}remove from action snoozing\n  grammar\n    snooze\n\n` +
      `define action snoozing\n  grammar\n    snooze\n  phrases en-US\n    dozed:\n      You doze.\n\n  phrase dozed\n`;
    expect(errors(src).map((d) => d.code)).toEqual(['analysis.removal-target']);
  });
});
