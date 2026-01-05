/**
 * Tests for perspective placeholder resolution (ADR-089 Phase D)
 */

import { describe, it, expect } from 'vitest';
import {
  resolvePerspectivePlaceholders,
  conjugateVerb,
  PRONOUNS,
  NarrativeContext,
} from '../../../src/perspective';

describe('resolvePerspectivePlaceholders', () => {
  describe('2nd person (default)', () => {
    const context: NarrativeContext = { perspective: '2nd' };

    it('should resolve {You} to "You"', () => {
      expect(resolvePerspectivePlaceholders('{You} take the lamp.', context))
        .toBe('You take the lamp.');
    });

    it('should resolve {your} to "your"', () => {
      expect(resolvePerspectivePlaceholders('{your} inventory', context))
        .toBe('your inventory');
    });

    it('should resolve {yourself} to "yourself"', () => {
      expect(resolvePerspectivePlaceholders("{You} can't take {yourself}.", context))
        .toBe("You can't take yourself.");
    });

    it("should resolve {You're} to \"You're\"", () => {
      expect(resolvePerspectivePlaceholders("{You're} carrying too much.", context))
        .toBe("You're carrying too much.");
    });

    it('should conjugate verbs in base form', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} the lamp.', context))
        .toBe('You take the lamp.');
    });
  });

  describe('1st person', () => {
    const context: NarrativeContext = { perspective: '1st' };

    it('should resolve {You} to "I"', () => {
      expect(resolvePerspectivePlaceholders('{You} take the lamp.', context))
        .toBe('I take the lamp.');
    });

    it('should resolve {your} to "my"', () => {
      expect(resolvePerspectivePlaceholders('{your} inventory', context))
        .toBe('my inventory');
    });

    it('should resolve {yourself} to "myself"', () => {
      expect(resolvePerspectivePlaceholders("{You} can't take {yourself}.", context))
        .toBe("I can't take myself.");
    });

    it("should resolve {You're} to \"I'm\"", () => {
      expect(resolvePerspectivePlaceholders("{You're} carrying too much.", context))
        .toBe("I'm carrying too much.");
    });

    it('should conjugate verbs in base form', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} the lamp.', context))
        .toBe('I take the lamp.');
    });
  });

  describe('3rd person singular (she/her)', () => {
    const context: NarrativeContext = {
      perspective: '3rd',
      playerPronouns: PRONOUNS.SHE_HER,
    };

    it('should resolve {You} to "She"', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} the lamp.', context))
        .toBe('She takes the lamp.');
    });

    it('should resolve {your} to "her"', () => {
      expect(resolvePerspectivePlaceholders('{your} inventory', context))
        .toBe('her inventory');
    });

    it('should resolve {yourself} to "herself"', () => {
      expect(resolvePerspectivePlaceholders("{You} can't take {yourself}.", context))
        .toBe("She can't take herself.");
    });

    it("should resolve {You're} to \"She's\"", () => {
      expect(resolvePerspectivePlaceholders("{You're} carrying too much.", context))
        .toBe("She's carrying too much.");
    });

    it('should conjugate verbs with 3rd person singular', () => {
      expect(resolvePerspectivePlaceholders('{You} {open} the door.', context))
        .toBe('She opens the door.');
    });
  });

  describe('3rd person plural (they/them)', () => {
    const context: NarrativeContext = {
      perspective: '3rd',
      playerPronouns: PRONOUNS.THEY_THEM,
    };

    it('should resolve {You} to "They"', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} the lamp.', context))
        .toBe('They take the lamp.');
    });

    it('should resolve {your} to "their"', () => {
      expect(resolvePerspectivePlaceholders('{your} inventory', context))
        .toBe('their inventory');
    });

    it('should keep verbs in base form for plural', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} the lamp.', context))
        .toBe('They take the lamp.');
    });

    it("should resolve {You're} to \"They're\"", () => {
      expect(resolvePerspectivePlaceholders("{You're} carrying too much.", context))
        .toBe("They're carrying too much.");
    });
  });

  describe('parameter placeholders pass through', () => {
    const context: NarrativeContext = { perspective: '2nd' };

    it('should not affect {item} placeholder', () => {
      expect(resolvePerspectivePlaceholders('{You} {take} {item}.', context))
        .toBe('You take {item}.');
    });

    it('should not affect {target} placeholder', () => {
      expect(resolvePerspectivePlaceholders('{You} {examine} {target}.', context))
        .toBe('You examine {target}.');
    });
  });
});

describe('conjugateVerb', () => {
  describe('regular verbs', () => {
    it('should add -s for 3rd person singular', () => {
      const context: NarrativeContext = { perspective: '3rd', playerPronouns: PRONOUNS.SHE_HER };
      expect(conjugateVerb('take', context)).toBe('takes');
      expect(conjugateVerb('open', context)).toBe('opens');
      expect(conjugateVerb('look', context)).toBe('looks');
    });

    it('should add -es for verbs ending in -s, -sh, -ch, -x, -z', () => {
      const context: NarrativeContext = { perspective: '3rd', playerPronouns: PRONOUNS.HE_HIM };
      expect(conjugateVerb('push', context)).toBe('pushes');
      expect(conjugateVerb('watch', context)).toBe('watches');
      expect(conjugateVerb('fix', context)).toBe('fixes');
    });

    it('should change -y to -ies for consonant + y', () => {
      const context: NarrativeContext = { perspective: '3rd', playerPronouns: PRONOUNS.SHE_HER };
      expect(conjugateVerb('carry', context)).toBe('carries');
      expect(conjugateVerb('try', context)).toBe('tries');
    });
  });

  describe('irregular verbs', () => {
    const context3rd: NarrativeContext = { perspective: '3rd', playerPronouns: PRONOUNS.SHE_HER };
    const context2nd: NarrativeContext = { perspective: '2nd' };

    it('should handle "have" correctly', () => {
      expect(conjugateVerb('have', context3rd)).toBe('has');
      expect(conjugateVerb('have', context2nd)).toBe('have');
    });

    it('should handle "be" correctly', () => {
      expect(conjugateVerb('be', context3rd)).toBe('is');
      expect(conjugateVerb('be', context2nd)).toBe('are');
    });

    it('should handle "do" correctly', () => {
      expect(conjugateVerb('do', context3rd)).toBe('does');
      expect(conjugateVerb('do', context2nd)).toBe('do');
    });

    it('should handle modals (no change)', () => {
      expect(conjugateVerb('can', context3rd)).toBe('can');
      expect(conjugateVerb("can't", context3rd)).toBe("can't");
      expect(conjugateVerb('will', context3rd)).toBe('will');
    });
  });

  describe('plural they/them', () => {
    const context: NarrativeContext = { perspective: '3rd', playerPronouns: PRONOUNS.THEY_THEM };

    it('should use base form for plural verbs', () => {
      expect(conjugateVerb('take', context)).toBe('take');
      expect(conjugateVerb('have', context)).toBe('have');
      expect(conjugateVerb('be', context)).toBe('are');
    });
  });
});
