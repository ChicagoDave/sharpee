/**
 * Tests for Story module
 */

import { Story, StoryConfig, validateStoryConfig } from '../src/install/story';
import { WorldModel, IFEntity, IdentityTrait, EntityType } from '@sharpee/world-model';
import { Action, endStory } from '@sharpee/stdlib';

describe('Story', () => {
  describe('StoryConfig validation', () => {
    it('should validate valid story config', () => {
      const config: StoryConfig = {
        id: 'test-story',
        title: 'Test Story',
        authors: ['Test Author'],
        version: '1.0.0',
        description: 'A test story'
      };
      
      expect(() => validateStoryConfig(config)).not.toThrow();
    });

    it('should accept multiple authors', () => {
      const config: StoryConfig = {
        id: 'test-story',
        title: 'Test Story',
        authors: ['Author 1', 'Author 2'],
        version: '1.0.0'
      };
      
      expect(() => validateStoryConfig(config)).not.toThrow();
    });

    it('should validate semantic version', () => {
      const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];
      
      validVersions.forEach(version => {
        const config: StoryConfig = {
          id: 'test',
          title: 'Test',
          authors: ['Test'],
          version
        };
        expect(() => validateStoryConfig(config)).not.toThrow();
      });
    });

    it('should reject invalid versions', () => {
      const invalidVersions = ['1.0', '1', 'v1.0.0', 'abc', '1.0.0.0'];

      invalidVersions.forEach(version => {
        const config: StoryConfig = {
          id: 'test',
          title: 'Test',
          authors: ['Test'],
          version
        };
        expect(() => validateStoryConfig(config)).toThrow('Invalid version format');
      });
    });

    it('should accept prerelease versions', () => {
      const prereleaseVersions = ['1.0.0-beta', '1.0.0-alpha.1', '2.3.4-rc.2'];

      prereleaseVersions.forEach(version => {
        const config: StoryConfig = {
          id: 'test',
          title: 'Test',
          authors: ['Test'],
          version
        };
        expect(() => validateStoryConfig(config)).not.toThrow();
      });
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['id', 'title', 'authors', 'version'];
      
      requiredFields.forEach(field => {
        const config: any = {
          id: 'test',
          title: 'Test',
          authors: ['Test'],
          version: '1.0.0'
        };
        
        delete config[field];
        expect(() => validateStoryConfig(config)).toThrow();
      });
    });
  });

  describe('Story lifecycle', () => {
    class LifecycleTestStory implements Story {
      config: StoryConfig = {
        id: 'lifecycle-test',
        title: 'Lifecycle Test',
        authors: ['Test'],
        version: '1.0.0'
      };

      private turnCount = 0;
      private world: WorldModel | null = null;

      initializeWorld(world: WorldModel): void {
        this.world = world;
        const room = world.createEntity('Room', EntityType.ROOM);
        room.add(new IdentityTrait({ name: 'Room' }));
      }

      createPlayer(world: WorldModel): IFEntity {
        const player = world.createEntity('Player', EntityType.ACTOR);
        player.add(new IdentityTrait({ name: 'Player' }));
        return player;
      }

      incrementTurn(): void {
        this.turnCount++;
        // Declared, never polled (ADR-347 D2b): the story ends the story at
        // the moment its own condition becomes true.
        if (this.turnCount >= 10 && this.world) {
          endStory(this.world, 'victory', { turn: this.turnCount });
        }
      }
    }

    it('declares its ending on the world once its own condition holds', () => {
      const story = new LifecycleTestStory();
      const world = new WorldModel();
      story.initializeWorld(world);

      // PRECONDITION: nothing has ended.
      expect(world.getEnding()).toBeUndefined();

      for (let i = 0; i < 10; i++) {
        story.incrementTurn();
      }

      // POSTCONDITION: the world carries the ending, stamped with the turn.
      expect(world.getEnding()).toEqual({ kind: 'victory', turn: 10 });
    });
  });
});
