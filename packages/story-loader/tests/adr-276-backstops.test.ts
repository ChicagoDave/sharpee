/**
 * adr-276-backstops.test.ts — ADR-276 Phase 1: the loader's defensive
 * backstops for census entries migrated to compile diagnostics. Every case
 * compiles a GATE-CLEAN story through the real chord compiler, then mutates
 * the IR into the rogue shape the analyzer now refuses at compile — proving
 * the loader still throws its `LoadError` when handed IR that bypassed the
 * gate (ADR-276 acceptance: "hand-built rogue IR still fails with the
 * backstop LoadErrors"). Census 12 (worn-not-wearable) and 13 (gerund
 * implementations) have their backstop tests beside their original suites
 * (loader.test.ts, cuttable.test.ts).
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

const BASE = `story "Backstop" by "T"
  id: backstop
  version: 0.0.1

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

describe('ADR-276 loader backstops (rogue IR, analyzer bypassed)', () => {
  it('census 11: dark on a non-room still throws', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities.find((e) => e.id === 'crate')!.traits.push({ name: 'dark', config: [], condition: null, span });
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/`dark` applies to rooms only/);
  });

  it('census 14: unsupported conditional composition still throws', () => {
    // Steal a real resolved condition (legal room-dark) and graft it onto a
    // composition the loader cannot make conditional.
    const conditional = compileClean(
      BASE.replace('  a room\n', '  a room, dark while the player has the crate\n'),
    );
    const darkComp = conditional.entities
      .find((e) => e.id === 'vault')!
      .traits.find((t) => t.name === 'dark')!;
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities.find((e) => e.id === 'crate')!.traits.push({
      name: 'scenery',
      config: [],
      condition: structuredClone(darkComp.condition),
      span,
    });
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/Conditional composition isn't supported/);
  });

  it('census 15: an undeclared trait still throws', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities.find((e) => e.id === 'crate')!.traits.push({ name: 'glowy', config: [], condition: null, span });
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/`glowy` is not declared/);
  });

  it('census 9: a patrol whose route emptied still throws at engine-ready', () => {
    const ir = compileClean(
      BASE +
        `
create the keeper
  a person, patrol with route [the Vault]
  in the Vault

  A keeper.
`,
    );
    const rogue = structuredClone(ir);
    const patrol = rogue.entities.find((e) => e.id === 'keeper')!.traits.find((t) => t.name === 'patrol')!;
    patrol.config.find((c) => c.key === 'route')!.values = [];
    const story = createStory(rogue);
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);
    expect(() =>
      story.onEngineReady({ getPluginRegistry: () => ({ register: () => undefined }) } as never),
    ).toThrowError(/needs `with route/);
  });

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

  it('census 4: a non-boolean word on a boolean setting still throws', () => {
    const ir = compileClean(
      BASE +
        `
create the keeper
  a person, patrol with route [the Vault] and can-move false
  in the Vault

  A keeper.
`,
    );
    const rogue = structuredClone(ir);
    const patrol = rogue.entities.find((e) => e.id === 'keeper')!.traits.find((t) => t.name === 'patrol')!;
    patrol.config.find((c) => c.key === 'can-move')!.value = 'maybe';
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/`can-move` takes `true` or `false`, got `maybe`/);
  });

  it('census 6: an entity-ref config naming nothing still throws', () => {
    const ir = compileClean(
      BASE +
        `
create the chest
  lockable with the iron key
  in the Vault

  A chest.

create the iron key
  in the Vault

  A key.
`,
    );
    const rogue = structuredClone(ir);
    const lockable = rogue.entities.find((e) => e.id === 'chest')!.traits.find((t) => t.name === 'lockable')!;
    lockable.config.find((c) => c.key === '')!.value = 'ghost key';
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/`ghost key` \(config `key`\) names no entity/);
  });

  it('census 10: an unknown hiding position still throws', () => {
    const ir = compileClean(
      BASE +
        `
create the wardrobe
  hiding-spot with position behind
  in the Vault

  A wardrobe.
`,
    );
    const rogue = structuredClone(ir);
    const spot = rogue.entities.find((e) => e.id === 'wardrobe')!.traits.find((t) => t.name === 'hiding-spot')!;
    spot.config.find((c) => c.key === 'position')!.value = 'sideways';
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/`sideways` is not a hiding position/);
  });

  it('census 17: an unknown kind noun still throws', () => {
    const rogue = structuredClone(compileClean(BASE));
    rogue.entities.find((e) => e.id === 'crate')!.kinds[0].name = 'thing';
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/unknown kind noun `thing`/);
  });

  it('census 18: multiple kind nouns still throw', () => {
    const rogue = structuredClone(compileClean(BASE));
    const crate = rogue.entities.find((e) => e.id === 'crate')!;
    crate.kinds.push({ name: 'supporter', config: [], condition: null, span });
    expect(load(rogue)).toThrowError(LoadError);
    expect(load(rogue)).toThrowError(/more than one kind noun/);
  });
});
