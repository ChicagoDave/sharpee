/**
 * setting-domains.test.ts — ADR-276 Phase 5 (census entries 4–6): platform
 * setting value domains gated at compile from the manifest's setting-schema
 * slice (Q-3 table): boolean words, entity-ref name resolution (keyless v1
 * refs and declared-trait fields — the latter IR-internal, duck-typed on
 * valueKind exactly as the loader is). Census 5 (number domain) was found
 * ALREADY gated by analysis.extension-config-value — pinned here.
 * REAL-PATH: every case drives Chord source through the actual compile
 * pipeline; the loader keeps the same rules as rogue-IR backstops.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '../src';

const story = (body: string, header = '') => `story
  title: Domains
  authors:
    T${header}

create the Vault
  a room

  A vault.

create the player
  starts in the Vault

  You.

${body}`;

const errors = (src: string) => compile(src).diagnostics.filter((d) => d.severity === 'error');
const errorCodes = (src: string) => errors(src).map((d) => d.code);

describe('census 4 — boolean settings take true/false (analysis.setting-not-boolean)', () => {
  it('reports a non-boolean word on a core NPC boolean setting', () => {
    const found = errors(
      story('create the guard\n  a person, patrol with route [the Vault] and can-move maybe\n  in the Vault\n\n  A guard.'),
    );
    expect(found.map((d) => d.code)).toEqual(['analysis.setting-not-boolean']);
    expect(found[0].message).toContain('`can-move` takes `true` or `false`, got `maybe`');
  });

  it('reports a non-boolean word on a combat boolean setting (use admitted)', () => {
    const found = errors(
      story('create the orc\n  a person, combatant with hostile maybe\n  in the Vault\n\n  An orc.', '\n  use combat'),
    );
    expect(found.map((d) => d.code)).toEqual(['analysis.setting-not-boolean']);
  });

  it('accepts true/false', () => {
    expect(
      errorCodes(
        story('create the guard\n  a person, patrol with route [the Vault] and can-move false\n  in the Vault\n\n  A guard.'),
      ),
    ).toEqual([]);
  });

  it('stays silent when the extension is not used — the use-gate owns that case', () => {
    expect(
      errorCodes(story('create the orc\n  a person, combatant with hostile maybe\n  in the Vault\n\n  An orc.')),
    ).toEqual(['analysis.extension-not-used']);
  });
});

describe('census 5 — number domain was pre-gated (analysis.extension-config-value pin)', () => {
  it('a word on a number setting is the existing valueKind gate, not a new code', () => {
    expect(
      errorCodes(
        story('create the orc\n  a person, combatant with skill high\n  in the Vault\n\n  An orc.', '\n  use combat'),
      ),
    ).toEqual(['analysis.extension-config-value']);
  });
});

describe('census 10 — hiding positions are the closed domain (analysis.unknown-hiding-position)', () => {
  it('reports an unknown position with the listed domain', () => {
    const found = errors(
      story('create the wardrobe\n  hiding-spot with position sideways\n  in the Vault\n\n  A wardrobe.'),
    );
    expect(found.map((d) => d.code)).toEqual(['analysis.unknown-hiding-position']);
    expect(found[0].message).toContain('`sideways` is not a hiding position — use behind, under, on, or inside');
  });

  it('accepts each domain word, and the bare form', () => {
    for (const pos of ['behind', 'under', 'on', 'inside']) {
      expect(
        errorCodes(story(`create the wardrobe\n  hiding-spot with position ${pos}\n  in the Vault\n\n  A wardrobe.`)),
      ).toEqual([]);
    }
    expect(errorCodes(story('create the wardrobe\n  hiding-spot\n  in the Vault\n\n  A wardrobe.'))).toEqual([]);
  });
});

describe('census 6 — entity-ref settings resolve (analysis.setting-names-no-entity)', () => {
  it('reports a keyless v1 ref naming no entity, labeled with the schema key', () => {
    const found = errors(story('create the chest\n  lockable with the missing key\n  in the Vault\n\n  A chest.'));
    expect(found.map((d) => d.code)).toEqual(['analysis.setting-names-no-entity']);
    expect(found[0].message).toContain('`missing key` (config `key`) names no entity');
  });

  it('accepts a resolving v1 ref (name or aka)', () => {
    const src = story(
      'create the chest\n  lockable with the iron key\n  in the Vault\n\n  A chest.\n\ncreate the iron key\n  in the Vault\n\n  A key.',
    );
    expect(errorCodes(src)).toEqual([]);
  });

  it('reports a declared-trait name value that resolves to nothing', () => {
    const src =
      story('create the goat\n  feedable with food the missing snack\n  in the Vault\n\n  A goat.') +
      '\ndefine trait feedable\n  data\n    food: entity\nend trait\n';
    const found = errors(src);
    expect(found.map((d) => d.code)).toEqual(['analysis.setting-names-no-entity']);
    expect(found[0].message).toContain('`missing snack` (config `food`) names no entity');
  });

  it('accepts a declared-trait name value that resolves via aka', () => {
    const src =
      story(
        'create the goat\n  feedable with food the snack\n  in the Vault\n\n  A goat.\n\ncreate the handful of feed\n  aka snack\n  in the Vault\n\n  Feed.',
      ) + '\ndefine trait feedable\n  data\n    food: entity\nend trait\n';
    expect(errorCodes(src)).toEqual([]);
  });
});
