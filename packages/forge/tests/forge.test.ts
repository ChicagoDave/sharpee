/**
 * Tests for the Forge fluent API
 */

import { forge, US_EN, ForgeStory } from '../src';
import { createTestStory, createMysteriousKeyStory } from '../examples/example-stories';

describe('Forge API', () => {
  describe('Basic Story Creation', () => {
    it('should create a basic story with fluent API', () => {
      const story = forge()
        .languageSet(US_EN)
        .title("Test Story")
        .startIn("start")
        .room("start")
          .description("A test room")
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
      expect(story.getTitle()).toBe("Test Story");
    });

    it('should allow method chaining', () => {
      const forge1 = forge();
      const forge2 = forge1.languageSet(US_EN);
      const forge3 = forge2.title("Chain Test");
      
      expect(forge2).toBe(forge1); // Should return same instance
      expect(forge3).toBe(forge1); // Should return same instance
    });
  });

  describe('Room Building', () => {
    it('should create rooms with descriptions and exits', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("room1")
        .room("room1")
          .description("First room")
          .exit("north", "room2")
          .done()
        .room("room2")
          .description("Second room")
          .exit("south", "room1")
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });

    it('should handle dark rooms', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("dark-room")
        .room("dark-room")
          .description("A dark room")
          .dark(true)
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });
  });

  describe('Item Building', () => {
    it('should create takeable items', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("room")
        .room("room")
          .description("A room with items")
          .item("key")
            .description("A brass key")
            .takeable()
            .done()
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });

    it('should create fixed items', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("room")
        .room("room")
          .description("A room with furniture")
          .item("table")
            .description("A heavy table")
            .fixed()
            .surface()
            .done()
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });

    it('should create container items', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("room")
        .room("room")
          .description("A room with containers")
          .item("chest")
            .description("A wooden chest")
            .container(false, true) // closed but openable
            .done()
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });
  });

  describe('Character Building', () => {
    it('should create characters with conversations', () => {
      const story = forge()
        .languageSet(US_EN)
        .startIn("room")
        .room("room")
          .description("A room with people")
          .character("npc")
            .description("A helpful person")
            .friendly()
            .greeting("Hello there!")
            .canTalkAbout("weather", "It's a nice day!")
            .done()
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });
  });

  describe('Example Stories', () => {
    it('should create the test story without errors', () => {
      const story = createTestStory();
      expect(story).toBeInstanceOf(ForgeStory);
      expect(story.getTitle()).toBe("Test Story");
    });

    it('should create the mysterious key story without errors', () => {
      const story = createMysteriousKeyStory();
      expect(story).toBeInstanceOf(ForgeStory);
      expect(story.getTitle()).toBe("The Mysterious Key");
    });
  });

  describe('Story Execution', () => {
    it('should start a story successfully', () => {
      const story = createTestStory();
      expect(() => story.start()).not.toThrow();
      expect(story.isStarted()).toBe(true);
    });

    it('should not allow starting a story twice', () => {
      const story = createTestStory();
      story.start();
      expect(() => story.start()).toThrow('Story has already been started');
    });

    it('should track turn count', () => {
      const story = createTestStory().start();
      expect(story.getTurnCount()).toBe(0);
      
      // Process a command (this will increment turn count)
      try {
        story.processCommand("look");
        expect(story.getTurnCount()).toBe(1);
      } catch (error) {
        // It's okay if the command fails - we're just testing turn counting
        expect(story.getTurnCount()).toBe(1);
      }
    });
  });

  describe('Debug Mode', () => {
    it('should create stories with debug mode enabled', () => {
      const story = forge({ debug: true })
        .languageSet(US_EN)
        .title("Debug Test")
        .startIn("start")
        .room("start")
          .description("Debug room")
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });
  });

  describe('Templates', () => {
    it('should accept custom templates', () => {
      const story = forge({ 
        templates: { 
          "item_taken": "You picked up {0}." 
        } 
      })
        .languageSet(US_EN)
        .title("Template Test")
        .startIn("start")
        .room("start")
          .description("Template room")
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });

    it('should allow setting templates via fluent API', () => {
      const story = forge()
        .languageSet(US_EN)
        .title("Template Test")
        .template("custom_message", "This is a custom message: {0}")
        .startIn("start")
        .room("start")
          .description("Template room")
          .done()
        .build();
      
      expect(story).toBeInstanceOf(ForgeStory);
    });
  });
});

describe('ForgeStory', () => {
  let story: ForgeStory;

  beforeEach(() => {
    story = createTestStory();
  });

  it('should provide access to core story', () => {
    const coreStory = story.getCoreStory();
    expect(coreStory).toBeDefined();
    expect(typeof coreStory.getTitle).toBe('function');
  });

  it('should handle save/load (placeholder)', () => {
    const saveData = story.save();
    expect(typeof saveData).toBe('string');
    
    const newStory = createTestStory();
    expect(() => newStory.load(saveData)).not.toThrow();
  });

  it('should format messages using the language system', () => {
    story.start();
    const message = story.getMessage("test_key");
    expect(typeof message).toBe('string');
  });
});
