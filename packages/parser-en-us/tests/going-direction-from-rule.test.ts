/**
 * @file A going command's direction is the matched rule's own
 * @description Parser review C3: the direction a going command carries comes
 * from the rule that matched (its default semantics), never from scanning
 * the input for the first direction-tagged word. A story-tier passage rule
 * whose words hold a compass word (`climb down the ladder`, registered as the
 * story loader registers a passage) keeps its passage key; the standard
 * compass commands still yield the Direction constant; and a match that fails
 * to convert prints nothing. Assertions read the parsed command.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { Direction } from '@sharpee/world-model';

/** A room with nothing in it: going commands name no entity. */
class EmptyWorld {
  getEntity() {
    return undefined;
  }
  getAllEntities() {
    return [];
  }
  getVisibleEntities() {
    return [];
  }
  getTouchableEntities() {
    return [];
  }
  getCarriedEntities() {
    return [];
  }
  getVisible() {
    return [];
  }
  getReachable() {
    return [];
  }
  getCarriedAndWorn() {
    return { carried: [], worn: [] };
  }
}

/** Register a passage's commands the way the story loader does. */
function passage(parser: EnglishParser, key: string, forms: string[]): void {
  for (const form of forms) {
    const parts = new EnglishPatternCompiler(new EnglishLanguageProvider()).parse(form);
    parser.getStoryGrammar().rule({ action: 'if.action.going', parts, pattern: form, defaults: { direction: key } });
  }
}

describe('a going command carries the matched rule\'s direction', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new EmptyWorld(), 'player', 'room');
  });

  it('a passage command holding `down` keeps its passage key, not DOWN', () => {
    passage(parser, 'passage:climb-down-the-ladder', ['climb down the ladder']);
    const result = parser.parse('climb down the ladder');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.going');
      expect(result.value.extras?.direction).toBe('passage:climb-down-the-ladder');
    }
  });

  it('a passage command holding `up` keeps its passage key, not UP', () => {
    passage(parser, 'passage:climb-up-the-rope', ['climb up the rope']);
    const result = parser.parse('climb up the rope');
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.extras?.direction).toBe('passage:climb-up-the-rope');
  });

  it.each([
    ['go north', Direction.NORTH],
    ['north', Direction.NORTH],
    ['n', Direction.NORTH],
    ['out', Direction.OUT],
    ['d', Direction.DOWN],
  ])('the standard `%s` still yields the Direction constant', (input, expected) => {
    const result = parser.parse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.going');
      expect(result.value.extras?.direction).toBe(expected);
    }
  });
});

describe('a match that fails to convert prints nothing', () => {
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('parsing `throw` input writes nothing to the console', () => {
    const parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new EmptyWorld(), 'player', 'room');
    parser.parse('throw');
    parser.parse('throw the ball at the wall');
    expect(log).not.toHaveBeenCalled();
  });
});
