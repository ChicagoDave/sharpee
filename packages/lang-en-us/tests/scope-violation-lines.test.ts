// packages/lang-en-us/tests/scope-violation-lines.test.ts
//
// ADR-385 D8: the three lines a parse-time scope violation renders, one per
// scope base the slot required, registered in the live message map and
// naming the found entity through the formatter chain.

import { describe, it, expect } from 'vitest';
import { EnglishLanguageProvider } from '../src/language-provider';

describe('parser scope-violation lines (ADR-385 D8)', () => {
  const provider = new EnglishLanguageProvider();

  it.each([
    ['parser.error.scopeViolation.carried', "{You} aren't holding {the entity}."],
    ['parser.error.scopeViolation.touchable', "{You} {can't} reach {the entity}."],
    ['parser.error.scopeViolation.visible', "{You} {can't} see {the entity} from here."],
  ])('%s is registered with its template', (id, template) => {
    expect(provider.getTemplate(id)).toBe(template);
  });

  it('the named not-found line takes the phrase', () => {
    expect(provider.getMessage('core.entity_not_found_named', { phrase: 'widget' })).toBe("You can't see any widget here.");
  });
});
