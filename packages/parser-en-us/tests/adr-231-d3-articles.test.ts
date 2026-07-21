/**
 * @file ADR-231 D3 — INounPhrase.articles population
 * @description Leading ARTICLE-tagged tokens are split into the noun
 *   phrase's `articles` field and stripped from `text`/`head`/`candidates`
 *   (previously hardcoded `articles: []` at the three construction sites).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry } from '@sharpee/if-domain';

describe('ADR-231 D3: noun-phrase article population', () => {
  let parser: EnglishParser;
  let language: EnglishLanguageProvider;

  beforeEach(() => {
    vocabularyRegistry.clear();
    language = new EnglishLanguageProvider();
    parser = new EnglishParser(language);
  });

  it('splits a leading "the" into articles and strips it from text/head/candidates', () => {
    const result = parser.parse('take the sword');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      expect(dobj.articles).toEqual(['the']);
      expect(dobj.text).toBe('sword');
      expect(dobj.head).toBe('sword');
      expect(dobj.candidates).toEqual(['sword']);
    }
  });

  it('strips articles from multi-word noun phrases, keeping modifier words', () => {
    const result = parser.parse('take the brass key');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      expect(dobj.articles).toEqual(['the']);
      expect(dobj.text).toBe('brass key');
      expect(dobj.head).toBe('key');
    }
  });

  it('handles articles on both objects of a two-slot pattern', () => {
    const result = parser.parse('put the ball in the box');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      const iobj = result.value.structure.indirectObject!;
      expect(dobj.articles).toEqual(['the']);
      expect(dobj.text).toBe('ball');
      expect(iobj.articles).toEqual(['the']);
      expect(iobj.text).toBe('box');
    }
  });

  it('supports "a" and "an" as articles', () => {
    const result = parser.parse('take an apple');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      expect(dobj.articles).toEqual(['an']);
      expect(dobj.text).toBe('apple');
    }
  });

  it('leaves article-free noun phrases untouched', () => {
    const result = parser.parse('take sword');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      expect(dobj.articles).toEqual([]);
      expect(dobj.text).toBe('sword');
      expect(dobj.head).toBe('sword');
    }
  });

  it('strips per-item leading articles in list phrases', () => {
    const result = parser.parse('take the sword and the lantern');

    expect(result.success).toBe(true);
    if (result.success) {
      const dobj = result.value.structure.directObject!;
      expect(dobj.isList).toBe(true);
      const items = dobj.items!;
      expect(items).toHaveLength(2);
      expect(items[0].text).toBe('sword');
      expect(items[0].articles).toEqual(['the']);
      expect(items[1].text).toBe('lantern');
      expect(items[1].articles).toEqual(['the']);
    }
  });
});
