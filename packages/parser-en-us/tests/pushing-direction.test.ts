/**
 * `push <thing> <direction>` and `shove <thing> <direction>` (ADR-378 D6):
 * the standard grammar's pushing block carries the three verbs with every
 * direction, long and short, so a pushed thing's direction reaches the
 * action as `extras.direction`. `move <thing> <direction>` was there
 * already; the other two were promised by lang-en-us and never parsed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('pushing with a direction (ADR-378 D6)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  it.each([
    ['push cart north', 'NORTH'],
    ['push cart n', 'NORTH'],
    ['shove cart east', 'EAST'],
    ['shove cart w', 'WEST'],
    ['move cart south', 'SOUTH'],
    ['push cart up', 'UP'],
    ['shove cart d', 'DOWN'],
    ['push cart inside', 'IN'],
    ['shove cart out', 'OUT'],
    ['push cart northeast', 'NORTHEAST'],
    ['shove cart sw', 'SOUTHWEST'],
  ])('%s is pushing with direction %s', (input, direction) => {
    const result = parser.parse(input);
    expect(result.success, input).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.pushing');
      expect(result.value.extras?.direction).toBe(direction);
      expect(result.value.structure.directObject?.text).toBe('cart');
    }
  });

  it('push with no direction is still the press', () => {
    const result = parser.parse('push cart');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.pushing');
      expect(result.value.extras?.direction).toBeUndefined();
    }
  });
});
