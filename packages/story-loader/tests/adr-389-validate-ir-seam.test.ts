/**
 * adr-389-validate-ir-seam.test.ts — the loader asks the IR's one rule once
 * (ADR-389 D4). `createStory` calls `validateIR` after the format and
 * identity checks: the first error-severity diagnostic becomes the
 * LoadError that refuses the load, carrying the diagnostic's message and
 * span, and an IR that carries only warnings loads exactly as before.
 */
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR } from '@sharpee/chord';
import { type NpcTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { createStory, LoadError } from '../src';

const BASE = `story
  title: Seam
  authors:
    T
  id: seam
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

function compileClean(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

describe('createStory and validateIR (ADR-389 D4)', () => {
  it('refuses a mutated IR with a LoadError carrying the first diagnostic’s message and span', () => {
    const rogue = structuredClone(compileClean(BASE));
    const crate = rogue.entities.find((e) => e.id === 'crate')!;
    crate.traits.push({ name: 'dark', config: [], condition: null, span: { line: 14, column: 3, endLine: 14, endColumn: 7 } });
    let thrown: unknown;
    try {
      createStory(rogue);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(LoadError);
    expect((thrown as LoadError).message).toContain('`dark` applies to rooms only');
    expect((thrown as LoadError).span?.line).toBe(14);
  });

  it('refuses a non-boolean NPC setting at createStory, and composes the boolean when it is one', () => {
    const KEEPER = `
create the keeper
  a person, guard with can-move false
  in the Vault

  A keeper.
`;
    const rogue = structuredClone(compileClean(BASE + KEEPER));
    const guard = rogue.entities.find((e) => e.id === 'keeper')!.traits.find((t) => t.name === 'guard')!;
    guard.config.find((c) => c.key === 'can-move')!.value = 'maybe';
    expect(() => createStory(rogue)).toThrow(LoadError);
    expect(() => createStory(rogue)).toThrow(/`can-move` takes `true` or `false`, got `maybe`/);

    const story = createStory(compileClean(BASE + KEEPER));
    const world = new WorldModel();
    story.initializeWorld(world);
    const npc = world.getEntity('keeper')!.get(TraitType.NPC) as NpcTrait;
    expect(npc.canMove).toBe(false);
  });

  it('refuses an IR whose `is a` names neither a kind nor a declared trait (ADR-394 D2)', () => {
    const VALUING = `define trait treasure
  phrases en-US
    gleams:
      It gleams.
end trait

define action valuing
  grammar
    value the item
  the item must be a treasure: worthless

  phrases en-US
    worthless:
      Worthless.
`;
    const ir = compileClean(BASE + VALUING);
    expect(() => createStory(ir)).not.toThrow();
    const rogue = structuredClone(ir);
    rogue.traits = rogue.traits.filter((t) => t.name !== 'treasure');
    expect(() => createStory(rogue)).toThrow(LoadError);
    expect(() => createStory(rogue)).toThrow(/`treasure` is not a kind, and the story declares no trait of that name/);
  });

  it('refuses an IR whose action tests its slot for identity with a named thing (ADR-394 D4)', () => {
    const OPENING = `define action prying
  grammar
    pry the item
  phrase pried

  phrases en-US
    pried:
      It gives.
    not-that:
      Not that.
`;
    const ir = compileClean(BASE + OPENING);
    expect(() => createStory(ir)).not.toThrow();
    const rogue = structuredClone(ir);
    rogue.actions.find((a) => a.name === 'prying')!.refusals.push({
      kind: 'when',
      condition: {
        kind: 'predicate',
        pred: 'is',
        negated: false,
        subject: { kind: 'slot', name: 'item' },
        object: { kind: 'entity', id: 'crate' },
      },
      phraseKey: 'not-that',
      span: { line: 50, column: 3, endLine: 50, endColumn: 40 },
    });
    expect(() => createStory(rogue)).toThrow(LoadError);
    expect(() => createStory(rogue)).toThrow(/`the item is the crate` asks which thing the player named/);
  });

  it('refuses a thing\'s own `on` clause on a story action at compile and at load with one message (ADR-394 D9)', () => {
    const OPENING = `define action prying
  grammar
    pry the item
  phrase pried

  phrases en-US
    pried:
      It gives.
`;
    const CLAUSE = `
create the lever
  a thing
  in the Vault

  A lever.

  on the player prying
    phrase pried
  end on
`;
    expect(() => createStory(compileClean(BASE + OPENING))).not.toThrow();
    const result = compile(BASE + OPENING + CLAUSE);
    const errors = result.diagnostics.filter((d) => d.severity === 'error');
    expect(errors.map((d) => d.code)).toEqual(['analysis.story-action-on-clause']);
    expect(errors[0].message).toContain('write `after the player prying`');
    expect(() => createStory(result.ir)).toThrow(LoadError);
    expect(() => createStory(result.ir)).toThrow(errors[0].message);
  });

  it('loads an IR whose compile reported only warnings', () => {
    // A room with no description is a warning (analysis.room-no-description), never an error.
    const result = compile(BASE.replace('  a room\n\n  A vault.\n', '  a room\n'));
    expect(result.ok).toBe(true);
    expect(result.diagnostics.some((d) => d.severity === 'warning')).toBe(true);
    const story = createStory(result.ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    expect(world.getEntity('vault')).toBeDefined();
  });
});

describe('the grammar seam (ADR-276 census 1 and 2) — createStory refuses through validateIR before any grammar is registered', () => {
  // The rules themselves are pinned in packages/chord/tests/validate-ir.test.ts;
  // the loader carries no copy (ADR-389 D4).
  const span = { line: 1, column: 1, endLine: 1, endColumn: 1 };

  it('an extend-action target naming no action is refused at createStory, with the did-you-mean', () => {
    const rogue = structuredClone(compileClean(`${BASE}extend action taking\n  grammar\n    snag the item\n`));
    rogue.grammarExtensions![0].action = 'takng';
    expect(() => createStory(rogue)).toThrowError(LoadError);
    expect(() => createStory(rogue)).toThrowError(/`extend action takng` — no story action or standard action has that name — did you mean `taking`\?/);
  });

  it('a removal target naming no standard action is refused at createStory, at the removal’s span', () => {
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
