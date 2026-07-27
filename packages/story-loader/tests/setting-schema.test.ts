/**
 * setting-schema.test.ts — ADR-276 Phase 2 (Q-3): the declarative setting
 * schema is the ONE source of setting value-type facts. Pins (a) the derived
 * route views byte-for-byte against the historical hand-written tables — the
 * refactor-is-behavior-preserving proof at data level; (b) schema ↔ chord
 * manifest agreement per adjective (key sets and value kinds); (c) the
 * keyless v1 entity-ref enumeration census entry 6's compile gate will read.
 */
import { describe, expect, it } from 'vitest';
import { COMBAT_MANIFEST, NPC_MANIFEST } from '@sharpee/chord';
import { COMBAT_FIELD_ROUTES, NPC_FIELD_ROUTES } from '../src/extension-registry';
import { SETTING_SCHEMA } from '../src/setting-schema';

describe('setting schema (ADR-276 Q-3)', () => {
  it('derives COMBAT_FIELD_ROUTES identical to the historical table', () => {
    expect([...COMBAT_FIELD_ROUTES.entries()]).toEqual([
      ['health', { trait: 'health', field: 'health', convert: 'number' }],
      ['max-health', { trait: 'health', field: 'maxHealth', convert: 'number' }],
      ['skill', { trait: 'combatant', field: 'skill', convert: 'number' }],
      ['base-damage', { trait: 'combatant', field: 'baseDamage', convert: 'number' }],
      ['armor', { trait: 'combatant', field: 'armor', convert: 'number' }],
      ['attack-power', { trait: 'combatant', field: 'attackPower', convert: 'number' }],
      ['defense', { trait: 'combatant', field: 'defense', convert: 'number' }],
      ['experience-value', { trait: 'combatant', field: 'experienceValue', convert: 'number' }],
      ['hostile', { trait: 'combatant', field: 'hostile', convert: 'boolean' }],
      ['can-retaliate', { trait: 'combatant', field: 'canRetaliate', convert: 'boolean' }],
      ['drops-inventory', { trait: 'combatant', field: 'dropsInventory', convert: 'boolean' }],
      ['is-undead', { trait: 'combatant', field: 'isUndead', convert: 'boolean' }],
      ['damage', { trait: 'weapon', field: 'damage', convert: 'number' }],
      ['skill-bonus', { trait: 'weapon', field: 'skillBonus', convert: 'number' }],
      ['is-blessed', { trait: 'weapon', field: 'isBlessed', convert: 'boolean' }],
      ['glows-near-danger', { trait: 'weapon', field: 'glowsNearDanger', convert: 'boolean' }],
    ]);
  });

  it('derives NPC_FIELD_ROUTES identical to the historical table', () => {
    expect([...NPC_FIELD_ROUTES.entries()]).toEqual([
      ['can-move', { field: 'canMove', convert: 'boolean' }],
      ['announces-movement', { field: 'announcesMovement', convert: 'boolean' }],
      ['allowed-rooms', { field: 'allowedRooms', convert: 'rooms' }],
      ['forbidden-rooms', { field: 'forbiddenRooms', convert: 'rooms' }],
    ]);
  });

  it('all five NPC adjectives carry the shared NpcTrait settings', () => {
    for (const adjective of ['guard', 'passive', 'wanderer', 'follower', 'patrol']) {
      const schema = SETTING_SCHEMA.get(adjective)!;
      expect(schema, adjective).toBeDefined();
      for (const key of ['can-move', 'announces-movement', 'allowed-rooms', 'forbidden-rooms']) {
        expect(schema.get(key)?.route?.trait, `${adjective}.${key}`).toBe('npc');
      }
    }
  });

  it('agrees with the chord manifests: every manifest field is in the schema with the matching value kind', () => {
    const kindFor = (valueKind: string) =>
      valueKind === 'number' ? 'number' : valueKind === 'list' ? 'rooms' : 'boolean';
    for (const manifest of [COMBAT_MANIFEST, NPC_MANIFEST]) {
      for (const adjective of manifest.traitAdjectives) {
        const schema = SETTING_SCHEMA.get(adjective.word)!;
        expect(schema, adjective.word).toBeDefined();
        for (const field of adjective.fields) {
          const spec = schema.get(field.key);
          expect(spec, `${adjective.word}.${field.key}`).toBeDefined();
          expect(spec!.value, `${adjective.word}.${field.key}`).toBe(kindFor(field.valueKind));
        }
        // And the reverse: no schema key the manifest doesn't declare.
        const manifestKeys = new Set(adjective.fields.map((f) => f.key));
        for (const key of schema.keys()) {
          expect(manifestKeys.has(key), `${adjective.word}.${key} has no manifest field`).toBe(true);
        }
      }
    }
  });

  it('declares the keyless v1 entity-ref settings (census entry 6 enumeration)', () => {
    expect(SETTING_SCHEMA.get('openable')?.get('tool')?.value).toBe('entity-ref');
    expect(SETTING_SCHEMA.get('lockable')?.get('key')?.value).toBe('entity-ref');
    expect(SETTING_SCHEMA.get('cuttable')?.get('tool')?.value).toBe('entity-ref');
    expect(SETTING_SCHEMA.get('diggable')?.get('tool')?.value).toBe('entity-ref');
  });
});
