/**
 * Tests for SceneTrait, createScene(), and scene convenience queries (ADR-149).
 *
 * Covers: SceneTrait initialization, createScene() atomicity and condition
 * storage, isSceneActive/hasSceneEnded/hasSceneHappened lifecycle queries.
 * Owner context: @sharpee/world-model — traits / temporal
 */

import { SceneTrait, ISceneData } from '../../../src/traits/scene/sceneTrait';
import { TraitType } from '../../../src/traits/trait-types';
import { EntityType } from '../../../src/entities/entity-types';
import { WorldModel } from '../../../src/world/WorldModel';

describe('SceneTrait', () => {
  describe('initialization', () => {
    it('should set required name field', () => {
      const trait = new SceneTrait({ name: 'The Flood' });

      expect(trait.name).toBe('The Flood');
      expect(trait.type).toBe(TraitType.SCENE);
    });

    it('should default state to waiting', () => {
      const trait = new SceneTrait({ name: 'The Flood' });

      expect(trait.state).toBe('waiting');
    });

    it('should default recurring to false', () => {
      const trait = new SceneTrait({ name: 'The Flood' });

      expect(trait.recurring).toBe(false);
    });

    it('should default activeTurns to 0', () => {
      const trait = new SceneTrait({ name: 'The Flood' });

      expect(trait.activeTurns).toBe(0);
    });

    it('should accept all optional fields', () => {
      const data: ISceneData = {
        name: 'The Siege',
        state: 'active',
        recurring: true,
        activeTurns: 5,
        beganAtTurn: 10,
        endedAtTurn: 15,
      };
      const trait = new SceneTrait(data);

      expect(trait.name).toBe('The Siege');
      expect(trait.state).toBe('active');
      expect(trait.recurring).toBe(true);
      expect(trait.activeTurns).toBe(5);
      expect(trait.beganAtTurn).toBe(10);
      expect(trait.endedAtTurn).toBe(15);
    });

    it('should have correct static and instance type', () => {
      expect(SceneTrait.type).toBe(TraitType.SCENE);
      expect(SceneTrait.type).toBe('scene');

      const trait = new SceneTrait({ name: 'Test' });
      expect(trait.type).toBe(SceneTrait.type);
    });
  });
});

describe('WorldModel — createScene()', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
  });

  it('should create entity with SCENE type', () => {
    const scene = world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });

    expect(scene.type).toBe(EntityType.SCENE);
  });

  it('should use the author-supplied id', () => {
    const scene = world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });

    expect(scene.id).toBe('scene-flood');
  });

  it('should attach SceneTrait with correct name and default state', () => {
    const scene = world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });

    const trait = scene.get<SceneTrait>(TraitType.SCENE);
    expect(trait).toBeDefined();
    expect(trait!.name).toBe('The Flood');
    expect(trait!.state).toBe('waiting');
    expect(trait!.activeTurns).toBe(0);
  });

  it('should store condition closures retrievable via getSceneConditions', () => {
    const beginFn = () => true;
    const endFn = () => false;

    world.createScene('scene-flood', {
      name: 'The Flood',
      begin: beginFn,
      end: endFn,
    });

    const conditions = world.getSceneConditions('scene-flood');
    expect(conditions).toBeDefined();
    expect(conditions!.begin).toBe(beginFn);
    expect(conditions!.end).toBe(endFn);
  });

  it('should store recurring flag on trait', () => {
    const scene = world.createScene('scene-patrol', {
      name: 'Guard Patrol',
      begin: () => false,
      end: () => false,
      recurring: true,
    });

    const trait = scene.get<SceneTrait>(TraitType.SCENE);
    expect(trait!.recurring).toBe(true);
  });

  it('should make entity retrievable via getEntity()', () => {
    world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });

    const retrieved = world.getEntity('scene-flood');
    expect(retrieved).toBeDefined();
    expect(retrieved!.get<SceneTrait>(TraitType.SCENE)!.name).toBe('The Flood');
  });

  it('should throw if id already exists', () => {
    world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });

    expect(() => {
      world.createScene('scene-flood', {
        name: 'The Flood 2',
        begin: () => false,
        end: () => false,
      });
    }).toThrow("createScene: entity 'scene-flood' already exists");
  });

  it('should include scene in getAllSceneConditions()', () => {
    world.createScene('scene-a', { name: 'A', begin: () => false, end: () => false });
    world.createScene('scene-b', { name: 'B', begin: () => false, end: () => false });

    const all = world.getAllSceneConditions();
    expect(all.size).toBe(2);
    expect(all.has('scene-a')).toBe(true);
    expect(all.has('scene-b')).toBe(true);
  });
});

describe('WorldModel — scene convenience queries', () => {
  let world: WorldModel;

  beforeEach(() => {
    world = new WorldModel();
    world.createScene('scene-flood', {
      name: 'The Flood',
      begin: () => false,
      end: () => false,
    });
  });

  describe('isSceneActive()', () => {
    it('should return false for a waiting scene', () => {
      expect(world.isSceneActive('scene-flood')).toBe(false);
    });

    it('should return true for an active scene', () => {
      const entity = world.getEntity('scene-flood')!;
      entity.get<SceneTrait>(TraitType.SCENE)!.state = 'active';

      expect(world.isSceneActive('scene-flood')).toBe(true);
    });

    it('should return false for an ended scene', () => {
      const entity = world.getEntity('scene-flood')!;
      entity.get<SceneTrait>(TraitType.SCENE)!.state = 'ended';

      expect(world.isSceneActive('scene-flood')).toBe(false);
    });

    it('should return false for nonexistent scene', () => {
      expect(world.isSceneActive('nonexistent')).toBe(false);
    });
  });

  describe('hasSceneEnded()', () => {
    it('should return false for a waiting scene', () => {
      expect(world.hasSceneEnded('scene-flood')).toBe(false);
    });

    it('should return true for an ended scene', () => {
      const entity = world.getEntity('scene-flood')!;
      entity.get<SceneTrait>(TraitType.SCENE)!.state = 'ended';

      expect(world.hasSceneEnded('scene-flood')).toBe(true);
    });

    it('should return false for nonexistent scene', () => {
      expect(world.hasSceneEnded('nonexistent')).toBe(false);
    });
  });

  describe('hasSceneHappened()', () => {
    it('should return false for a scene that never began', () => {
      expect(world.hasSceneHappened('scene-flood')).toBe(false);
    });

    it('should return true for a scene with beganAtTurn set', () => {
      const entity = world.getEntity('scene-flood')!;
      entity.get<SceneTrait>(TraitType.SCENE)!.beganAtTurn = 5;

      expect(world.hasSceneHappened('scene-flood')).toBe(true);
    });

    it('should return true even after scene ended', () => {
      const entity = world.getEntity('scene-flood')!;
      const trait = entity.get<SceneTrait>(TraitType.SCENE)!;
      trait.beganAtTurn = 5;
      trait.state = 'ended';

      expect(world.hasSceneHappened('scene-flood')).toBe(true);
    });

    it('should return false for nonexistent scene', () => {
      expect(world.hasSceneHappened('nonexistent')).toBe(false);
    });
  });
});
