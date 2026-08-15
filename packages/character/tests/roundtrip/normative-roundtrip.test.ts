/**
 * normative-roundtrip.test.ts — ADR-318's grammar round-trips through the
 * Phase 1 trait contract the same way ADR-310's does (plan Phase 4 exit
 * state): for every normative construct, Chord source in,
 * CharacterModelTrait out, equal to the trait the normalized builder
 * produces for the same declaration. Exercises the real seam
 * (applyCompiledCharacter), never a re-implementation.
 */
import { describe, expect, it } from 'vitest';
import { compile } from '@sharpee/chord';
import type { StoryIR } from '@sharpee/chord';
import { WorldModel } from '@sharpee/world-model';
import {
  CharacterBuilder,
  applyCharacter,
  applyCompiledCharacter,
  temperamentDefsFrom,
  type AppliedCharacter,
} from '../../src/index.js';

const HEADER = 'story\n  title: T\n  authors: N\n  id: t\n  story-version: 0.0.1\n\n';

const SOURCE =
  HEADER +
  'define temperament steadfast\n' +
  '  duty over fear\n' +
  '  duty over desire\n' +
  'end temperament\n\n' +
  'define honor soldiers-honor\n' +
  '  backs down\n' +
  '  shows fear\n' +
  'end honor\n\n' +
  'define code servants-code\n' +
  '  never betrays a confidence\n' +
  '  never steals\n' +
  'end code\n\n' +
  'create the Regiment\n  a person\n\n  Them.\n\n' +
  'create the Children\n  a person\n\n  Them.\n\n' +
  'create the Witness\n' +
  '  a person\n' +
  '  states: cowed, resolute\n' +
  '  knows the secret, witnessed, confided\n' +
  '  never betrays a confidence\n' +
  '  temperament steadfast while resolute\n' +
  '  burdened by the secret\n' +
  '\n' +
  '  Him.\n\n' +
  'create the Housekeeper\n' +
  '  a person\n' +
  '  code servants-code\n' +
  '  never lies, except to protect the Children\n' +
  '  never harms a servant\n' +
  '  protects the Children\n' +
  '  answers honestly\n' +
  '  temperament duty over fear\n' +
  '\n' +
  '  Her.\n\n' +
  'create the Colonel\n' +
  '  a person\n' +
  '  honor soldiers-honor before the Regiment, except the Children\n' +
  '  temperament steadfast with fear over duty\n' +
  '\n' +
  '  Him.\n';

/** Apply a compiled IR entity's character block to a fresh world entity. */
function applyIR(ir: StoryIR, entityId: string): AppliedCharacter {
  const world = new WorldModel();
  const npc = world.createEntity('Npc', 'actor');
  const entity = ir.entities.find((e) => e.id === entityId)!;
  return applyCompiledCharacter(npc, entity.character!);
}

/** Hand-build the SAME declaration through the normalized builder. */
function applyBuilt(build: (b: CharacterBuilder) => CharacterBuilder): AppliedCharacter {
  const world = new WorldModel();
  const npc = world.createEntity('Npc', 'actor');
  return applyCharacter(npc, build(new CharacterBuilder(npc.id)).compile());
}

describe('ADR-318 — normative round-trip per construct', () => {
  const result = compile(SOURCE);
  const ir = result.ir;

  it('the fixture story compiles clean', () => {
    expect(result.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
  });

  it('D3: a state-bound named temperament binding matches the builder', () => {
    const trait = applyIR(ir, 'witness').trait;
    const built = applyBuilt((b) => b.temperament('steadfast', { while: 'resolute' }));
    expect(trait.temperaments).toEqual(built.trait.temperaments);
    expect(trait.temperaments).toEqual([{ name: 'steadfast', while: 'resolute' }]);
  });

  it('D4: confided knowledge and the principle land as trait state', () => {
    const trait = applyIR(ir, 'witness').trait;
    const built = applyBuilt((b) =>
      b.knows('secret', { source: 'witnessed', confided: true }).never('betray a confidence').burdenedBy('secret'),
    );
    expect(trait.knowledge).toEqual(built.trait.knowledge);
    expect(trait.knowledge['secret']).toMatchObject({ source: 'witnessed', confided: true });
    expect(trait.principles).toEqual(built.trait.principles);
    expect(trait.principles).toEqual([{ category: 'betray a confidence' }]);
  });

  it('D8: burdened-by seeds persist on the trait', () => {
    const trait = applyIR(ir, 'witness').trait;
    expect(trait.burdenedBy).toEqual(['secret']);
    expect(trait.pressure).toEqual({ value: 0, band: 'clear' });
  });

  it('D4/D5/D6: code flatten, scoped principle, protect carve-out, and obligations match the builder', () => {
    const trait = applyIR(ir, 'housekeeper').trait;
    const built = applyBuilt((b) =>
      b
        .never('betray a confidence')
        .never('steal')
        .never('lie', { except: 'to protect children' })
        .never('harm', { scope: 'a servant' })
        .protects('children')
        .answersHonestly(),
    );
    expect(trait.principles).toEqual(built.trait.principles);
    expect(trait.principles.map((p) => p.category)).toEqual(['betray a confidence', 'steal', 'lie', 'harm']);
    expect(trait.principles[2].except).toBe('to protect children');
    expect(trait.principles[3].scope).toBe('a servant');
    expect(trait.obligations).toEqual(built.trait.obligations);
    expect(trait.obligations).toEqual([{ kind: 'protects', scope: 'children' }, { kind: 'answers honestly' }]);
  });

  it('D7: the selective honor bundle with an audience carve-out matches the builder', () => {
    const trait = applyIR(ir, 'colonel').trait;
    const built = applyBuilt((b) =>
      b.honor('regiment', { faceActs: ['backs down', 'shows fear'], except: ['children'] }),
    );
    expect(trait.honor).toEqual(built.trait.honor);
    expect(trait.honor).toEqual({
      scope: 'regiment',
      except: ['children'],
      faceActs: ['backs down', 'shows fear'],
    });
  });

  it('D3: an inline `with` override binds a synthesized def carrying the folded pairs', () => {
    const trait = applyIR(ir, 'colonel').trait;
    expect(trait.temperaments).toEqual([{ name: 'colonel@temperament-1' }]);
    const defs = temperamentDefsFrom(ir.temperaments!);
    expect(defs['steadfast'].pairs).toEqual([
      ['duty', 'fear'],
      ['duty', 'desire'],
    ]);
    // The override replaced (duty, fear) and kept the rest.
    expect(defs['colonel@temperament-1'].pairs).toEqual([
      ['duty', 'desire'],
      ['fear', 'duty'],
    ]);
    expect(defs['housekeeper@temperament-1'].pairs).toEqual([['duty', 'fear']]);
  });

  it('a character with no normative construct carries zero normative fields from the builder path', () => {
    const built = applyBuilt((b) => b.personality('honest'));
    expect(built.trait.temperaments).toEqual([]);
    expect(built.trait.principles).toEqual([]);
    expect(built.trait.obligations).toEqual([]);
    expect(built.trait.honor).toBeUndefined();
    expect(built.trait.burdenedBy).toEqual([]);
  });
});
