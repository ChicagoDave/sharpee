/**
 * parser-error-templates.test.ts — the parser's seat questions and failure
 * sentences are the language's (ADR-387 D3), worded byte-identically to what
 * the parser used to build.
 */
import { describe, it, expect } from 'vitest';
import { EnglishLanguageProvider } from '../src/language-provider';

describe('ADR-387 D3: the parse-failure sentences are lang-en-us templates', () => {
  const provider = new EnglishLanguageProvider();
  const text = (id: string, params?: Record<string, string>) => provider.getMessage(id, params);

  it('words every seat question and failure as the parser did', () => {
    expect(text('parser.error.noInput')).toBe('I beg your pardon?');
    expect(text('parser.error.unknownVerb', { verb: 'frobnicate' })).toBe('I don\'t know the verb "frobnicate".');
    expect(text('parser.error.unknownVerb.noVerb')).toBe("I don't understand that sentence.");
    expect(text('parser.error.missingObject', { verb: 'take' })).toBe('What do you want to take?');
    expect(text('parser.error.missingObject.noVerb')).toBe('What do you want to do that to?');
    expect(text('parser.error.missingIndirect', { verb: 'unlock', slot: 'key' })).toBe('Unlock it where?');
    expect(text('parser.error.missingIndirect', { verb: 'put down', slot: 'surface' })).toBe('Put down it where?');
    expect(text('parser.error.missingIndirect.noVerb')).toBe('Where do you want to do that?');
    expect(text('parser.error.entityNotFound', { verb: 'take', noun: 'widget' })).toBe('I don\'t see any "widget" here.');
    expect(text('parser.error.entityNotFound.noNoun', { verb: 'take' })).toBe("I don't see that here.");
    expect(text('parser.error.notUnderstood')).toBe("I don't understand that.");
  });

  it('capitalises a value whose placeholder is written capitalised, as {You} is', () => {
    provider.addMessage('test.capitalised', '{Item} fell; the {item} fell.');
    expect(text('test.capitalised', { item: 'lamp' })).toBe('Lamp fell; the lamp fell.');
    // No param of either case: the placeholder stays literal, as every unbound placeholder does
    expect(text('test.capitalised', { other: 'lamp' })).toBe('{Item} fell; the {item} fell.');
  });
});
