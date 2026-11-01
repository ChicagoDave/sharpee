/**
 * validate-ir.test.ts — the IR's invariants have one home (ADR-389 D4).
 * Every case compiles a gate-clean story through the real compiler, mutates
 * the IR into the rogue shape the loader used to refuse with its own copy
 * of the rule, and asks `validateIR` directly: the one function the compile
 * runs as its last pass and the loader calls before it builds a world. A
 * further case pins the seam itself — the compile's diagnostics for a rogue
 * story are exactly `validateIR`'s for its IR.
 */
import { describe, expect, it } from 'vitest';
import { compile, type StoryIR, validateIR } from '../src';

function compileClean(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  }
  return result.ir;
}

const BASE = `story
  title: Invariants
  authors:
    T
  id: invariants
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
const codes = (ir: StoryIR) => validateIR(ir).map((d) => d.code);
const messages = (ir: StoryIR) => validateIR(ir).map((d) => d.message);
const entity = (ir: StoryIR, id: string) => ir.entities.find((e) => e.id === id)!;

describe('validateIR refuses rogue IR with the rule the compile applies', () => {
  it('a sound IR has no diagnostics', () => {
    expect(validateIR(compileClean(BASE))).toEqual([]);
  });

  it('`dark` on a non-room (analysis.dark-rooms-only)', () => {
    const rogue = structuredClone(compileClean(BASE));
    entity(rogue, 'crate').traits.push({ name: 'dark', config: [], condition: null, span });
    expect(codes(rogue)).toEqual(['analysis.dark-rooms-only']);
    expect(messages(rogue)[0]).toContain('`dark` applies to rooms only');
  });

  it('a conditional composition the loader cannot make conditional (analysis.conditional-composition-unsupported)', () => {
    const conditional = compileClean(BASE.replace('  a room\n', '  a room, dark while the player has the crate\n'));
    const darkComp = entity(conditional, 'vault').traits.find((t) => t.name === 'dark')!;
    const rogue = structuredClone(compileClean(BASE));
    entity(rogue, 'crate').traits.push({ name: 'scenery', config: [], condition: structuredClone(darkComp.condition), span });
    expect(codes(rogue)).toEqual(['analysis.conditional-composition-unsupported']);
    expect(messages(rogue)[0]).toContain("Conditional composition isn't supported");
  });

  it('an undeclared trait (analysis.trait-not-declared)', () => {
    const rogue = structuredClone(compileClean(BASE));
    entity(rogue, 'crate').traits.push({ name: 'glowy', config: [], condition: null, span });
    expect(codes(rogue)).toEqual(['analysis.trait-not-declared']);
    expect(messages(rogue)[0]).toContain('`glowy` is not declared');
  });

  it('a patrol whose route line is gone (analysis.patrol-needs-route)', () => {
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
    const patrol = entity(rogue, 'keeper').traits.find((t) => t.name === 'patrol')!;
    patrol.config = patrol.config.filter((c) => c.key !== 'route');
    expect(codes(rogue)).toEqual(['analysis.patrol-needs-route']);
    expect(messages(rogue)[0]).toContain('needs `with route');
  });

  it('a non-boolean word on a boolean setting (analysis.setting-not-boolean)', () => {
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
    entity(rogue, 'keeper').traits.find((t) => t.name === 'patrol')!.config.find((c) => c.key === 'can-move')!.value = 'maybe';
    expect(codes(rogue)).toEqual(['analysis.setting-not-boolean']);
    expect(messages(rogue)[0]).toContain('`can-move` takes `true` or `false`, got `maybe`');
  });

  it('a non-boolean word on a combat boolean setting, under `use combat` (analysis.setting-not-boolean)', () => {
    const ir = compileClean(
      BASE.replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  use combat\n') +
        `
create the guard
  a person, combatant with hostile true
  in the Vault

  A guard.

create the sword
  a thing, weapon with is-blessed false
  in the Vault

  A sword.
`,
    );
    const hostile = structuredClone(ir);
    entity(hostile, 'guard').traits.find((t) => t.name === 'combatant')!.config.find((c) => c.key === 'hostile')!.value = 'maybe';
    expect(codes(hostile)).toEqual(['analysis.setting-not-boolean']);
    expect(messages(hostile)[0]).toContain('`hostile` takes `true` or `false`, got `maybe`');
    const blessed = structuredClone(ir);
    entity(blessed, 'sword').traits.find((t) => t.name === 'weapon')!.config.find((c) => c.key === 'is-blessed')!.value = 'somewhat';
    expect(codes(blessed)).toEqual(['analysis.setting-not-boolean']);
    expect(messages(blessed)[0]).toContain('`is-blessed` takes `true` or `false`, got `somewhat`');
  });

  it('an entity-ref config naming nothing (analysis.setting-names-no-entity)', () => {
    const ir = compileClean(
      BASE +
        `
create the chest
  a thing, lockable with the iron key
  in the Vault

  A chest.

create the iron key
  a thing
  in the Vault

  A key.
`,
    );
    const rogue = structuredClone(ir);
    entity(rogue, 'chest').traits.find((t) => t.name === 'lockable')!.config.find((c) => c.key === '')!.value = 'ghost key';
    expect(codes(rogue)).toEqual(['analysis.setting-names-no-entity']);
    expect(messages(rogue)[0]).toContain('`ghost key` (config `key`) names no entity');
  });

  it('an unknown hiding position (analysis.unknown-hiding-position)', () => {
    const ir = compileClean(
      BASE +
        `
create the wardrobe
  a thing, hiding-spot with position behind
  in the Vault

  A wardrobe.
`,
    );
    const rogue = structuredClone(ir);
    entity(rogue, 'wardrobe').traits.find((t) => t.name === 'hiding-spot')!.config.find((c) => c.key === 'position')!.value = 'sideways';
    expect(codes(rogue)).toEqual(['analysis.unknown-hiding-position']);
    expect(messages(rogue)[0]).toContain('`sideways` is not a hiding position');
  });

  it('an unknown kind noun (analysis.unknown-kind-noun)', () => {
    const rogue = structuredClone(compileClean(BASE));
    entity(rogue, 'crate').kinds[0].name = 'gadget';
    expect(codes(rogue)).toEqual(['analysis.unknown-kind-noun']);
    expect(messages(rogue)[0]).toContain('unknown kind noun `gadget`');
  });

  it('more than one kind noun (analysis.multiple-kind-nouns)', () => {
    const rogue = structuredClone(compileClean(BASE));
    entity(rogue, 'crate').kinds.push({ name: 'supporter', config: [], condition: null, span });
    expect(codes(rogue)).toEqual(['analysis.multiple-kind-nouns']);
    expect(messages(rogue)[0]).toContain('more than one kind noun');
  });

  it('a worn item that is not wearable, on any wearer (analysis.worn-not-wearable)', () => {
    const ir = compileClean(
      BASE +
        `
create the cloak
  a thing, wearable
  in the Vault

  A cloak.

create the keeper
  a person
  in the Vault
  wears the cloak

  A keeper.
`,
    );
    const rogue = structuredClone(ir);
    entity(rogue, 'cloak').traits = entity(rogue, 'cloak').traits.filter((t) => t.name !== 'wearable');
    expect(codes(rogue)).toEqual(['analysis.worn-not-wearable']);
    expect(messages(rogue)[0]).toContain('`cloak` is worn by `keeper` but is not wearable');
  });

  it('a door no `through` exit references (analysis.door-unconnected)', () => {
    const ir = compileClean(
      BASE.replace('  a room\n\n  A vault.\n', '  a room\n  north to the Hall through the oak door\n\n  A vault.\n') +
        `
create the Hall
  a room

  A hall.

create the oak door
  a door

  A door.
`,
    );
    const rogue = structuredClone(ir);
    for (const e of rogue.entities) e.exits = e.exits.map((x) => (x.via === 'oak-door' ? { ...x, via: null } : x));
    expect(codes(rogue)).toEqual(['analysis.door-unconnected']);
    expect(messages(rogue)[0]).toContain('Door `oak door` is never referenced');
  });

  it('an extend-action target naming no story or standard action, with a did-you-mean (analysis.extend-target)', () => {
    const rogue = structuredClone(compileClean(`${BASE}extend action taking\n  grammar\n    snag the item\n`));
    rogue.grammarExtensions![0].action = 'takng';
    expect(codes(rogue)).toEqual(['analysis.extend-target']);
    expect(messages(rogue)[0]).toContain('`extend action takng` — no story action or standard action has that name — did you mean `taking`?');
  });

  it('an extend-action target that is a story action needs no standard id (analysis.extend-target not reported)', () => {
    const rogue = structuredClone(compileClean(`${BASE}define action petting\n  grammar\n    pet the animal\n\nextend action petting\n  grammar\n    stroke the animal\n`));
    rogue.grammarExtensions![0].action = 'petting';
    expect(codes(rogue)).toEqual([]);
  });

  it('a removal target naming no standard action, with a did-you-mean (analysis.removal-target)', () => {
    const rogue = structuredClone(compileClean(`${BASE}remove from action taking\n  get the item\n`));
    rogue.grammarRemovals![0].action = 'taking_offf';
    expect(codes(rogue)).toEqual(['analysis.removal-target']);
    expect(messages(rogue)[0]).toContain('`remove from action taking_offf` — no standard action has that name — did you mean `taking_off`?');
  });

  it('a removal shape no standard rule in the manifest matches (analysis.unmatched-removal-pattern)', () => {
    const rogue = structuredClone(compileClean(`${BASE}remove from action taking\n  get the item\n`));
    const word = rogue.grammarRemovals![0].patterns[0].parts.find((p) => p.kind === 'word') as { word: string };
    word.word = 'yoink';
    expect(codes(rogue)).toEqual(['analysis.unmatched-removal-pattern']);
    expect(messages(rogue)[0]).toMatch(/no standard rule matches `yoink :item`\. The action's standard patterns are: .*`take :item`/);
  });

  it('a conditional deadly exit, which the loader has no wiring for (analysis.deadly-while-unsupported)', () => {
    const source =
      BASE.replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  states: calm, stormy\n').replace(
        '  a room\n\n  A vault.\n',
        '  a room\n  north is deadly while stormy: fall-death\n\n  A vault.\n',
      ) + 'define phrase fall-death\n  You fall.\nend phrase\n';
    const result = compile(source);
    expect(result.ok).toBe(false);
    expect(codes(result.ir)).toEqual(['analysis.deadly-while-unsupported']);
    expect(result.diagnostics.filter((d) => d.code === 'analysis.deadly-while-unsupported')).toEqual(validateIR(result.ir));
    const sound = compileClean(source.replace('north is deadly while stormy: fall-death', 'north is deadly: fall-death'));
    expect(codes(sound)).toEqual([]);
  });
});

const SCORING_SOURCE = BASE
  .replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  use scoring\n    rank "Curious Visitor" at 0\n  score lamp worth 20\n')
  .replace('create the Vault\n  a room\n', 'create the Vault\n  a room\n\n  after the player entering\n    award lamp\n  end after\n');

const CHAPTERS_SOURCE = BASE
  .replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  use chapters\n')
  .replace('create the crate\n  a container\n  in the Vault\n', 'create the crate\n  a container\n  in the Vault\n\n  on the player taking during one\n    refuse no-time\n  end on\n') +
  `define chapters
  one - Chapter I
    begins when the game starts
end chapters

define phrase no-time
  No time.
end phrase
`;

const EXPANSES_SOURCE = BASE
  .replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  use expanses\n  use sailing\n')
  .replace('create the Vault\n  a room\n', 'create the Vault\n  a room\n  seen from afar: a smudge of light\n  sight: 5\n') +
  `create the Belt
  an expanse
  size: 20 by 20
  wind: from northeast
  north is blocked: no-north

  Black, and the slow tumble of rock against it.

  landmarks
    the Vault: 3, 3
  end landmarks

create the skiff
  a vehicle, openable
  in the Belt at 3, 4
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a glint of hull against the dark

  A skiff.

define phrase no-north
  Nothing that way.
end phrase
`;

const COMBAT_SOURCE = BASE
  .replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  use combat\n')
  .replace('create Alex\n', 'create the orc\n  a person, combatant with hostile true\n  in the Vault\n\n  An orc.\n\ncreate Alex\n');

const without = (ir: StoryIR, extension: string): StoryIR => ({ ...ir, uses: ir.uses.filter((u) => u !== extension) });

describe('validateIR holds every `use` gate (D4c: the gated constructs and words)', () => {
  it('scores, a rank rung and an award without `use scoring` each report once, as analysis.scoring-needs-use', () => {
    const rogue = without(compileClean(SCORING_SOURCE), 'scoring');
    expect(codes(rogue)).toEqual(['analysis.scoring-needs-use', 'analysis.scoring-needs-use', 'analysis.scoring-needs-use']);
    const [score, rank, award] = messages(rogue);
    expect(score).toContain('A `score … worth N` line needs `use scoring`');
    expect(rank).toContain('A `rank` rung needs `use scoring`');
    expect(award).toContain('An `award` statement needs `use scoring`');
    expect(validateIR(rogue)[0].span).toEqual(rogue.scores[0].span);
  });

  it('a bare `score` line compiles to exactly the diagnostic validateIR gives its IR', () => {
    const result = compile(BASE.replace('  story-version: 0.0.1\n', '  story-version: 0.0.1\n  score lamp worth 20\n'));
    const fromCompile = result.diagnostics.filter((d) => d.code === 'analysis.scoring-needs-use');
    expect(fromCompile).toHaveLength(1);
    expect(validateIR(result.ir).filter((d) => d.code === 'analysis.scoring-needs-use')).toEqual(fromCompile);
  });

  it('a chapters block and a chapter condition without `use chapters` are analysis.chapters-needs-use, block first', () => {
    const rogue = without(compileClean(CHAPTERS_SOURCE), 'chapters');
    expect(codes(rogue)).toEqual(['analysis.chapters-needs-use', 'analysis.chapters-needs-use']);
    const [block, condition] = messages(rogue);
    expect(block).toContain('A `define chapters` block needs `use chapters`');
    expect(condition).toContain('`during <chapter>` reads a chapter');
    expect(validateIR(rogue)[0].span).toEqual(rogue.chapters![0].span);
    // The analyzer builds the rows either way, so the compile reports the same two.
    const result = compile(CHAPTERS_SOURCE.replace('  use chapters\n', ''));
    expect(result.diagnostics.map((d) => d.code)).toEqual(codes(result.ir));
  });

  it('a sound expanses and sailing IR has no diagnostics — an expanse’s edges are not exits', () => {
    expect(validateIR(compileClean(EXPANSES_SOURCE))).toEqual([]);
  });

  it('without `use expanses`, the kind, the movement type and a room’s lines each report once per entity', () => {
    const rogue = without(compileClean(EXPANSES_SOURCE), 'expanses');
    const found = validateIR(rogue).filter((d) => d.code === 'analysis.expanses-needs-use');
    expect(found.map((d) => d.message)).toEqual([
      expect.stringContaining('`Vault` writes `use expanses` vocabulary'),
      expect.stringContaining('`a expanse` is `use expanses` vocabulary'),
      expect.stringContaining('`movement: open` is `use expanses` vocabulary'),
    ]);
    expect(validateIR(rogue).filter((d) => d.code === 'analysis.sailing-needs-use')).toEqual([]);
  });

  it('without `use sailing`, the wind is analysis.sailing-needs-use on the expanse, and a wind write in a clause is the word', () => {
    const rogue = without(compileClean(EXPANSES_SOURCE), 'sailing');
    expect(codes(rogue)).toEqual(['analysis.sailing-needs-use']);
    expect(messages(rogue)[0]).toContain('`Belt` writes `use sailing` vocabulary');

    const written = without(
      compileClean(EXPANSES_SOURCE.replace('create the crate\n  a container\n  in the Vault\n', "create the crate\n  a container\n  in the Vault\n\n  on the player taking\n    set the Belt's wind to calm\n  end on\n")),
      'sailing',
    );
    const words = validateIR(written).filter((d) => d.message.startsWith('`set … wind`'));
    expect(words.map((d) => d.code)).toEqual(['analysis.sailing-needs-use']);
  });

  it('an extension adjective without its `use` is analysis.extension-not-used, before any setting check', () => {
    const rogue = without(compileClean(COMBAT_SOURCE), 'combat');
    expect(codes(rogue)).toEqual(['analysis.extension-not-used']);
    expect(messages(rogue)[0]).toContain('`combatant` is `combat` extension vocabulary — add `use combat`');
    // Phase 4's G2: a mistyped boolean on an un-`use`d adjective is the use gate, not the domain gate.
    const compiled = compile(COMBAT_SOURCE.replace('  use combat\n', '').replace('hostile true', 'hostile maybe'));
    expect(compiled.diagnostics.map((d) => d.code)).toEqual(['analysis.extension-not-used']);
  });

  it('an unknown field or a mistyped value on an admitted extension adjective is refused by name', () => {
    const unknownKey = compileClean(COMBAT_SOURCE);
    entity(unknownKey, 'orc').traits[0].config.push({ key: 'bogus', value: '1', valueKind: 'number' });
    expect(codes(unknownKey)).toEqual(['analysis.extension-config-key']);
    expect(messages(unknownKey)[0]).toContain('`bogus` is not a `combatant` field — known fields:');

    const wrongKind = compileClean(COMBAT_SOURCE);
    entity(wrongKind, 'orc').traits[0].config[0].valueKind = 'list';
    expect(codes(wrongKind)).toEqual(['analysis.extension-config-value']);
    expect(messages(wrongKind)[0]).toContain('`hostile` takes a');
  });

  it('a `[ … ]` list value on an adjective no extension contributes is analysis.config-list-host', () => {
    const rogue = compileClean(BASE);
    entity(rogue, 'crate').traits.push({ name: 'scenery', config: [{ key: 'route', value: '', valueKind: 'list', values: [] }], condition: null, span });
    expect(codes(rogue)).toEqual(['analysis.config-list-host']);
  });

  it('an entity with no kind noun is analysis.missing-kind-noun; a bare kind word is named as such instead', () => {
    const none = compileClean(BASE);
    entity(none, 'crate').kinds = [];
    expect(codes(none)).toEqual(['analysis.missing-kind-noun']);
    expect(messages(none)[0]).toContain('`crate` names no kind');

    const bare = compileClean(BASE);
    entity(bare, 'crate').kinds = [];
    entity(bare, 'crate').traits.push({ name: 'container', config: [], condition: null, span });
    expect(codes(bare)).toEqual(['analysis.kind-noun-needs-article']);
  });

  it('an exit on a non-room is analysis.exit-non-room, at the exit', () => {
    const source = BASE.replace('create the Vault\n  a room\n', 'create the Vault\n  a room\n  north to the Hall\n') + 'create the Hall\n  a room\n\n  A hall.\n';
    const rogue = compileClean(source);
    const vault = entity(rogue, 'vault');
    const crate = entity(rogue, 'crate');
    crate.exits = vault.exits;
    vault.exits = [];
    expect(codes(rogue)).toEqual(['analysis.exit-non-room']);
    expect(validateIR(rogue)[0].span).toEqual(crate.exits[0].span);
  });
});

describe('the compile reports validateIR as its last pass', () => {
  it('a rogue story compiles to exactly the diagnostics validateIR gives its IR', () => {
    const result = compile(BASE.replace('create the crate\n  a container\n', 'create the crate\n  a container, dark\n'));
    expect(result.ok).toBe(false);
    const fromCompile = result.diagnostics.filter((d) => d.code === 'analysis.dark-rooms-only');
    expect(fromCompile).toHaveLength(1);
    expect(validateIR(result.ir).filter((d) => d.code === 'analysis.dark-rooms-only')).toEqual(fromCompile);
  });

  it('an earlier pass erroring does not skip validateIR, and its codes come after the earlier pass’s', () => {
    // `dark` on the crate is validateIR's; a `through` naming a non-door is checkDoors' (analysis.door-through-kind).
    const source = BASE
      .replace('  a room\n\n  A vault.\n', '  a room\n  north to the Hall through the crate\n\n  A vault.\n')
      .replace('create the crate\n  a container\n', 'create the crate\n  a container, dark\n') +
      `
create the Hall
  a room

  A hall.
`;
    const codesReported = compile(source).diagnostics.map((d) => d.code);
    expect(codesReported).toContain('analysis.door-through-kind');
    expect(codesReported).toContain('analysis.dark-rooms-only');
    expect(codesReported.indexOf('analysis.door-through-kind')).toBeLessThan(codesReported.indexOf('analysis.dark-rooms-only'));
  });

  it('a moved code is reported once per site, never by both the analyzer and validateIR', () => {
    const source = BASE.replace('  a room\n\n  A vault.\n', '  a room\n\n  A vault.\n\ncreate the oak door\n  a door\n\n  A door.\n');
    const worn = compile(
      BASE.replace('create Alex\n  a person\n  playable\n  starts in the Vault\n', 'create Alex\n  a person\n  playable\n  starts in the Vault\n  wears the crate\n'),
    );
    expect(compile(source).diagnostics.filter((d) => d.code === 'analysis.door-unconnected')).toHaveLength(1);
    expect(worn.diagnostics.filter((d) => d.code === 'analysis.worn-not-wearable')).toHaveLength(1);
  });
});
