/**
 * use-extensions.test.ts — ADR-215 Phase 1 compile side: the `use
 * <extension>` header line, manifest-gated vocabulary admission
 * (`combatant`/`weapon` legal only under `use combat`), typed
 * `with`-field validation against the manifest, and the ADR-235 D2
 * `define behavior` removal (parse error with fix-it). REAL-PATH: every
 * case drives source through the real parse → analyze pipeline.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile, EXTENSION_MANIFESTS } from '../src';

const FIXTURE = readFileSync(join(__dirname, 'fixtures', 'use-combat.story'), 'utf8');

const errorCodes = (source: string) =>
  compile(source).diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);

const story = (header: string, body: string) => `story "Arena" by "T"
  id: arena
  version: 0.0.1
${header}
create the Arena
  a room

  A pit.

${body}create the player
  starts in the Arena

  You.
`;

describe('`use <extension>` (ADR-215)', () => {
  it('the manifest registry knows combat', () => {
    expect(EXTENSION_MANIFESTS.has('combat')).toBe(true);
  });

  it('compiles the use-combat fixture clean, uses on the IR, hasHatches false (AC-3 pure IR)', () => {
    const result = compile(FIXTURE);
    expect(result.diagnostics).toEqual([]);
    expect(result.ir.uses).toEqual(['combat']);
    expect(result.ir.hasHatches).toBe(false);
    const troll = result.ir.entities.find((e) => e.id === 'troll')!;
    expect(troll.traits.map((t) => t.name)).toContain('combatant');
    const sword = result.ir.entities.find((e) => e.id === 'elvish-sword')!;
    expect(sword.traits.map((t) => t.name)).toContain('weapon');
  });

  it('unknown `use foo` → analysis.unknown-extension', () => {
    expect(errorCodes(story('  use foo\n', ''))).toEqual(['analysis.unknown-extension']);
  });

  it('duplicate `use combat` → analysis.duplicate-use', () => {
    expect(errorCodes(story('  use combat\n  use combat\n', ''))).toEqual(['analysis.duplicate-use']);
  });

  it('`use` at the top level → parse.use-top-level with a header fix-it', () => {
    const result = compile(`story "Arena" by "T"
  id: arena
  version: 0.0.1

use combat

create the Arena
  a room

  A pit.
`);
    const diagnostic = result.diagnostics.find((d) => d.code === 'parse.use-top-level')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('story header');
  });
});

describe('manifest-gated vocabulary (ADR-215 AC-2 compile half)', () => {
  const TROLL = `create the troll
  a person, combatant with health 20 and skill 40
  in the Arena

  A troll.

`;

  it('combatant without `use combat` → analysis.extension-not-used naming the fix', () => {
    const result = compile(story('', TROLL));
    const codes = result.diagnostics.filter((d) => d.severity === 'error').map((d) => d.code);
    expect(codes).toEqual(['analysis.extension-not-used']);
    expect(result.diagnostics[0].message).toContain('use combat');
  });

  it('an unknown with-field → analysis.extension-config-key naming the known set', () => {
    const result = compile(
      story('  use combat\n', `create the troll
  a person, combatant with ferocity 9
  in the Arena

  A troll.

`),
    );
    const diagnostic = result.diagnostics.find((d) => d.code === 'analysis.extension-config-key')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('skill');
  });

  it('a mistyped with-field value → analysis.extension-config-value', () => {
    expect(
      errorCodes(
        story('  use combat\n', `create the troll
  a person, combatant with skill high
  in the Arena

  A troll.

`),
      ),
    ).toEqual(['analysis.extension-config-value']);
  });
});

describe('`define behavior` removal (ADR-235 D2)', () => {
  it('is a parse error with a fix-it naming the live paths', () => {
    const result = compile(story('', '') + `
define behavior crowd-control from "./stunts.ts"
`);
    const diagnostic = result.diagnostics.find((d) => d.code === 'parse.removed-behavior-hatch')!;
    expect(diagnostic).toBeDefined();
    expect(diagnostic.message).toContain('define trait');
    expect(diagnostic.message).toContain('define action');
  });
});

describe('CORE npc vocabulary (ADR-215 Q4)', () => {
  const NPC_BODY = `create the keeper
  a person, patrol with route [the Arena]
  in the Arena

  A keeper.

`;

  it('behavior adjectives compile with NO use line, route list resolved on the IR', () => {
    const result = compile(story('', NPC_BODY));
    expect(result.diagnostics).toEqual([]);
    const keeper = result.ir.entities.find((e) => e.id === 'keeper')!;
    const patrol = keeper.traits.find((t) => t.name === 'patrol')!;
    expect(patrol.config).toMatchObject([{ key: 'route', valueKind: 'list', values: ['arena'] }]);
  });

  it('`use npc` → analysis.extension-core (always on, never used)', () => {
    const result = compile(story('  use npc\n', NPC_BODY));
    expect(result.diagnostics.map((d) => d.code)).toContain('analysis.extension-core');
  });

  it('a `[ … ]` list on a non-extension adjective → analysis.config-list-host', () => {
    expect(
      errorCodes(
        story('', `create the crate
  a container, openable with route [the Arena]
  in the Arena

  A crate.

`),
      ),
    ).toEqual(['analysis.config-list-host']);
  });

  it('an unresolved route entry → the standard unknown-entity gate', () => {
    expect(
      errorCodes(
        story('', `create the keeper
  a person, patrol with route [the Nowhere]
  in the Arena

  A keeper.

`),
      ),
    ).toEqual(['analysis.unknown-entity']);
  });
});
