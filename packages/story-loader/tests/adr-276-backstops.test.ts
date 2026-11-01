/**
 * adr-276-backstops.test.ts — the grammar seam of ADR-389 D4: a rogue IR
 * whose alteration targets name no action (ADR-276 census 1 and 2) is
 * refused by `createStory`, through the one call to chord's `validateIR`,
 * before any grammar is registered. The rules themselves are pinned in
 * `packages/chord/tests/validate-ir.test.ts`; the loader no longer carries
 * a copy. This file is retired in the D4c phase, when the last gates move.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { createStory, LoadError } from '../src';

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

describe('ADR-276 grammar seam (rogue IR, analyzer bypassed) — createStory refuses through validateIR', () => {
  it('census 1: an extend-action target naming no action is refused at createStory, with the did-you-mean', () => {
    const rogue = structuredClone(compileClean(`${BASE}extend action taking\n  grammar\n    snag the item\n`));
    rogue.grammarExtensions![0].action = 'takng';
    expect(() => createStory(rogue)).toThrowError(LoadError);
    expect(() => createStory(rogue)).toThrowError(/`extend action takng` — no story action or standard action has that name — did you mean `taking`\?/);
  });

  it('census 2: a removal target naming no standard action is refused at createStory, at the removal’s span', () => {
    const rogue = structuredClone(compileClean(`${BASE}remove from action taking\n  get the item\n`));
    rogue.grammarRemovals![0].action = 'snarf';
    rogue.grammarRemovals![0].span = span;
    let thrown: LoadError | undefined;
    try {
      createStory(rogue);
    } catch (error) {
      thrown = error as LoadError;
    }
    expect(thrown).toBeInstanceOf(LoadError);
    expect(thrown!.message).toMatch(/`remove from action snarf` — no standard action has that name/);
    expect(thrown!.span).toEqual(span);
  });
});
