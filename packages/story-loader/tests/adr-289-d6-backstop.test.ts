/**
 * adr-289-d6-backstop.test.ts — ADR-289 D6's loader half.
 *
 * D6 gates exits to rooms at COMPILE; per ADR-276's two-layer pattern the
 * loader keeps a defensive throw against IR that bypassed the gate. Same
 * method as `adr-276-backstops.test.ts`: compile a gate-clean story through
 * the real compiler, then mutate the IR into the rogue shape the analyzer
 * now refuses — proving the backstop, not the analyzer, is what fires.
 *
 * The throw lives in `loader.ts` deliberately (ADR-289 Phase 3/5 note):
 * ADR-276's LoadError census is `loader.ts`-scoped, and Acceptance 20's
 * count only reaches 52 if this and D2's id-less-select backstop both
 * live there.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
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
  authors: T
  id: backstop
  story-version: 0.0.1

create the Vault
  a room

  A vault.

create the crate
  a container
  in the Vault

  A crate.

create the player
  starts in the Vault

  You.
`;

const load = (ir: StoryIR) => () => {
  const story = createStory(ir);
  const world = new WorldModel();
  story.initializeWorld(world);
  story.createPlayer(world);
};

const span = { line: 1, column: 1, endLine: 1, endColumn: 1 };

describe('D6 backstop — a non-room exit in rogue IR still throws', () => {
  it('the clean story loads — the fixture proves the mutation is what breaks it', () => {
    expect(load(compileClean(BASE))).not.toThrow();
  });

  it('an exit on a container throws a LoadError naming the entity', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities.find((e) => e.id === 'crate')!.exits.push({ direction: 'north', to: 'vault', via: null, span });
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/crate/);
  });

  it('a blocked exit on a container throws too', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities
      .find((e) => e.id === 'crate')!
      .blockedExits.push({ direction: 'north', phraseKey: 'sealed', condition: null, span });
    expect(load(rogue)).toThrowError(LoadError);
  });

  it('a deadly exit on a container throws too', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities
      .find((e) => e.id === 'crate')!
      .deadlyExits.push({ direction: 'north', phraseKey: 'fell', condition: null, span });
    expect(load(rogue)).toThrowError(LoadError);
  });
});
