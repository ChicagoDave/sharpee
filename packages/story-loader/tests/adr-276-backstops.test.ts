/**
 * adr-276-backstops.test.ts — the loader's remaining load-time refusals for
 * rogue IR in the grammar seam (ADR-276 census 1 and 2): the IR compiled
 * clean, then its alteration targets are rewritten to name no action, and
 * grammar registration throws the LoadError. The entity and composition
 * gates that used to live beside these moved to `validateIR` in chord
 * (ADR-389 D4, Phase 4) and are pinned in `packages/chord/tests/validate-ir.test.ts`;
 * the two here follow in the grammar phase.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';
import { captureGrammarRules } from './helpers/grammar-harness';

function compileClean(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const BASE = `story
  title: Backstop
  authors:
    T
  id: backstop
  story-version: 0.0.1

create the Vault
  a room

  A vault.

create the crate
  a container
  in the Vault

  A crate.

create Alex
  a person
  playable
  starts in the Vault

  You.

before the game starts
  change the player to Alex
end before

`;

const span = { line: 1, column: 1, endLine: 1, endColumn: 1 };

describe('ADR-276 loader backstops (rogue IR, analyzer bypassed)', () => {
  it('census 1: an extend-action target naming no action still throws at grammar registration', () => {
    const rogue = structuredClone(compileClean(BASE));
    (rogue as { grammarExtensions?: unknown[] }).grammarExtensions = [
      { action: 'snarf', patterns: [], constraints: [], span },
    ];
    const story = createStory(rogue);
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);
    expect(() => captureGrammarRules(story)).toThrowError(LoadError);
    expect(() => captureGrammarRules(story)).toThrowError(/`extend action snarf` — no story action or standard action/);
  });

  it('census 2: a removal target naming no standard action still throws at grammar registration', () => {
    const rogue = structuredClone(compileClean(BASE));
    (rogue as { grammarRemovals?: unknown[] }).grammarRemovals = [{ action: 'snarf', patterns: [], span }];
    const story = createStory(rogue);
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);
    expect(() => captureGrammarRules(story)).toThrowError(LoadError);
    expect(() => captureGrammarRules(story)).toThrowError(/`remove from action snarf` — no standard action/);
  });
});
