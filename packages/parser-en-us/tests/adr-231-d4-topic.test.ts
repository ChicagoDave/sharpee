/**
 * @file ADR-231 D4 — first-class topic field (parser side)
 * @description The 5 ask/tell grammar rules mark `:topic` as a TOPIC slot:
 *   the TextSlotConsumer captures the free text VERBATIM (multi-word,
 *   articles preserved) into `IParsedCommand.topic = { text }`. The topic
 *   is NOT a positional noun phrase — `structure.indirectObject` stays
 *   empty, so the validator never entity-resolves (and never
 *   scope-rejects) it.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('ADR-231 D4: first-class topic field', () => {
  let parser: EnglishParser;
  let language: EnglishLanguageProvider;

  beforeEach(() => {
    language = new EnglishLanguageProvider();
    parser = new EnglishParser(language);
  });

  it('parses "ask guard about the weather" with verbatim topic text and NO indirect object', () => {
    const result = parser.parse('ask guard about the weather');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.asking');
      // Verbatim free text — the article is preserved, not stripped.
      expect(result.value.topic).toMatchObject({ text: 'the weather' });
      // ADR-385 D2: the topic also carries its one split, for the validator's matcher
      expect(result.value.topic!.phrase).toMatchObject({ text: 'weather', head: 'weather', articles: ['the'], determiners: [], modifiers: [] });
      // The recipient is the direct object; the topic is NOT a noun phrase.
      expect(result.value.structure.directObject?.text).toBe('guard');
      expect(result.value.structure.indirectObject).toBeUndefined();
      // textSlots and extras are untouched (PIN 3 constraint).
      expect(result.value.textSlots?.get('topic')).toBeUndefined();
      expect(result.value.extras?.topic).toBeUndefined();
    }
  });

  it('consumes multi-word free text to the end of input', () => {
    const result = parser.parse('ask guard about the ancient stone door');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.topic).toMatchObject({ text: 'the ancient stone door' });
      expect(result.value.structure.indirectObject).toBeUndefined();
    }
  });

  it('parses "tell guard about treasure" with the topic field', () => {
    const result = parser.parse('tell guard about treasure');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.telling');
      expect(result.value.topic).toMatchObject({ text: 'treasure' });
      expect(result.value.structure.directObject?.text).toBe('guard');
      expect(result.value.structure.indirectObject).toBeUndefined();
    }
  });

  it('routes the asking aliases (question, inquire of) through the topic slot', () => {
    const question = parser.parse('question guard about dragons');
    expect(question.success).toBe(true);
    if (question.success) {
      expect(question.value.action).toBe('if.action.asking');
      expect(question.value.topic).toMatchObject({ text: 'dragons' });
    }

    const inquire = parser.parse('inquire of guard about dragons');
    expect(inquire.success).toBe(true);
    if (inquire.success) {
      expect(inquire.value.action).toBe('if.action.asking');
      expect(inquire.value.topic).toMatchObject({ text: 'dragons' });
    }
  });

  it('routes the telling alias (inform) through the topic slot', () => {
    const result = parser.parse('inform guard about dragons');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('if.action.telling');
      expect(result.value.topic).toMatchObject({ text: 'dragons' });
    }
  });

  it('leaves topic undefined for commands without a topic slot', () => {
    const result = parser.parse('take sword');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.topic).toBeUndefined();
    }
  });
});
