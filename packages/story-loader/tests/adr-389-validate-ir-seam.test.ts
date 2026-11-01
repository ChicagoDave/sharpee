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
