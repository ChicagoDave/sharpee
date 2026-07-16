/**
 * Tests for load-time combatant/health validation (ADR-226 / ADR-223 child A, AC-7).
 *
 * Behavior Statement (validateCombatantHealth):
 *   DOES   throw CombatantHealthValidationError naming every entity that carries a
 *          CombatantTrait but no HealthTrait; mutates nothing.
 *   WHEN   GameEngine.setStory calls it right after initializeWorld returns.
 *   BECAUSE combat operates on the entity's health (ADR-226 §2) — a combatant with
 *          no HealthTrait has no target for damage; fail loudly at load, the same
 *          posture as validateRoomSnippets.
 *   REJECTS never for combatants that have a HealthTrait, and never for entities
 *          with no CombatantTrait at all.
 *
 * Owner context: @sharpee/engine — story-load orchestration.
 */

import {
  validateCombatantHealth,
  CombatantHealthValidationError,
} from '../../src/combatant-health-validation';
import {
  WorldModel,
  CombatantTrait,
  HealthTrait,
  EntityType,
} from '@sharpee/world-model';

describe('validateCombatantHealth (ADR-226 AC-7)', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('passes a world with no combatants', () => {
    world.createEntity('Rock', EntityType.OBJECT);
    expect(() => validateCombatantHealth(world)).not.toThrow();
  });

  it('passes a combatant that carries a HealthTrait', () => {
    const troll = world.createEntity('Troll', EntityType.ACTOR);
    troll.add(new CombatantTrait({ skill: 40 }));
    troll.add(new HealthTrait({ health: 30, maxHealth: 30 }));
    expect(() => validateCombatantHealth(world)).not.toThrow();
  });

  it('fails load, naming the entity, for a combatant with no HealthTrait', () => {
    const troll = world.createEntity('Troll', EntityType.ACTOR);
    troll.add(new CombatantTrait({ skill: 40 })); // no HealthTrait

    expect(() => validateCombatantHealth(world)).toThrow(CombatantHealthValidationError);
    expect(() => validateCombatantHealth(world)).toThrow(/Troll.*has CombatantTrait but no HealthTrait/);
  });

  it('reports every offending combatant, in discovery order', () => {
    const a = world.createEntity('Goblin', EntityType.ACTOR);
    a.add(new CombatantTrait());
    const b = world.createEntity('Ogre', EntityType.ACTOR);
    b.add(new CombatantTrait());
    b.add(new HealthTrait({ health: 50, maxHealth: 50 })); // this one is fine

    try {
      validateCombatantHealth(world);
      throw new Error('expected validateCombatantHealth to throw');
    } catch (e) {
      expect(e).toBeInstanceOf(CombatantHealthValidationError);
      const err = e as CombatantHealthValidationError;
      expect(err.missing.map((m) => m.name)).toEqual(['Goblin']); // only the health-less one
    }
  });
});
