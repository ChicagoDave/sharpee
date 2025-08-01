/**
 * Tests for Story module
 */

import { Story, StoryConfig, loadLanguageProvider, validateStoryConfig } from '../src/story';
import { WorldModel, IFEntity, IdentityTrait } from '@sharpee/world-model';
import { Action } from '@sharpee/stdlib';

describe('Story', () => {
  describe('StoryConfig validation', () => {
    it('should validate valid story config', () => {
      const config: StoryConfig = {
        id: 'test-story',
        title: 'Test Story',
        author: 'Test Author',
        version: '1.0.0',
        language: 'en-us',
        description: 'A test story'
      };
      
      expect(() => validateStoryConfig(config)).not.toThrow();
    });

    it('should accept author as array', () => {
      const config: StoryConfig = {
        id: 'test-story',
        title: 'Test Story',
        author: ['Author 1', 'Author 2'],
        version: '1.0.0',
        language: 'en-us'
      };
      
      expect(() => validateStoryConfig(config)).not.toThrow();
    });

    it('should validate semantic version', () => {
      const validVersions = ['1.0.0', '2.1.3', '0.0.1', '10.20.30'];
      
      validVersions.forEach(version => {
        const config: StoryConfig = {
          id: 'test',
          title: 'Test',
          author: 'Test',
          version,
          language: 'en-us'
        };
        expect(() => validateStoryConfig(config)).not.toThrow();
      });
    });

    it('should reject invalid versions', () => {
      const invalidVersions = ['1.0', '1', 'v1.0.0', '1.0.0-beta'];
      
      invalidVersions.forEach(version => {
        const config: StoryConfig = {
          id: 'test',
          title: 'Test',
          author: 'Test',
          version,
          language: 'en-us'
        };
        expect(() => validateStoryConfig(config)).toThrow('Invalid version format');
      });
    });

    it('should require all mandatory fields', () => {
      const requiredFields = ['id', 'title', 'author', 'version', 'language'];
      
      requiredFields.forEach(field => {
        const config: any = {
          id: 'test',
          title: 'Test',
          author: 'Test',
          version: '1.0.0',
          language: 'en-us'
        };
        
        delete config[field];
        expect(() => validateStoryConfig(config)).toThrow();
      });
    });
  });

  describe('loadLanguageProvider', () => {
    it('should load en-us language provider', async () => {
      const provider = await loadLanguageProvider('en-us');
      
      expect(provider).toBeDefined();
      expect(provider.languageCode).toBe('en-US');
      expect(provider.languageName).toBe('English (US)');
      expect(typeof provider.getVerbs).toBe('function');
      expect(typeof provider.lemmatize).toBe('function');
      expect(typeof provider.formatList).toBe('function');
    });

    it('should throw for unsupported language', async () => {
      await expect(loadLanguageProvider('unsupported-lang'))
        .rejects.toThrow('Unsupported language');
    });
  });

  describe('Story lifecycle', () => {
    class LifecycleTestStory implements Story {
      config: StoryConfig = {
        id: 'lifecycle-test',
        title: 'Lifecycle Test',
        author: 'Test',
        version: '1.0.0',
        language: 'en-us'
      };

      private turnCount = 0;

      initializeWorld(world: WorldModel): void {
        const room = world.createEntity('room', 'Room');
        room.add(new IdentityTrait({ name: 'Room' }));
      }

      createPlayer(world: WorldModel): IFEntity {
        const player = world.createEntity('player', 'Player');
        player.add(new IdentityTrait({ name: 'Player' }));
        return player;
      }

      isComplete(): boolean {
        return this.turnCount >= 10;
      }

      incrementTurn(): void {
        this.turnCount++;
      }
    }

    it('should track completion state', () => {
      const story = new LifecycleTestStory();
      
      expect(story.isComplete()).toBe(false);
      
      for (let i = 0; i < 10; i++) {
        story.incrementTurn();
      }
      
      expect(story.isComplete()).toBe(true);
    });
  });
});
