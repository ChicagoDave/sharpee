/**
 * @file English Pattern Compiler
 * @description English-specific implementation of pattern compilation.
 *
 * Public interface: EnglishPatternCompiler (parse, compile).
 * Owner context: parser-en-us. `parse` is the `define(text)` front end, the
 * one place pattern text is read (ADR-382 D3); `compile` turns structured
 * parts into the matcher's tokens and one record per slot (D4).
 */

import {
  type PatternCompiler,
  type CompiledPattern,
  type CompiledSlot,
  type PatternElement,
  type PatternToken,
  PatternSyntaxError,
  SlotType
} from '@sharpee/if-domain';
import { englishWords } from '@sharpee/lang-en-us';

const SLOT_NAME = /^[a-zA-Z_]\w*$/;

/** English articles: a pattern's article after its first element is never required of the player (ADR-380 D2). */
const ARTICLE_WORDS: ReadonlySet<string> = new Set(englishWords.articles.map((a) => a.toLowerCase()));

/**
 * English-specific pattern compiler
 * Handles patterns like: "put :item in|into :container"
 */
export class EnglishPatternCompiler implements PatternCompiler {
  /**
   * Parse pattern text into parts. Elements are whitespace-separated: a
   * word, an alternation `a|b`, or a slot `:name` (greedy `:name...`); any
   * one element may be bracketed `[…]` to make it optional. A bracket that
   * does not wrap exactly one element is refused (ADR-382 D3, Q-5).
   * @param pattern The pattern text
   * @returns The pattern's elements, in order
   * @throws PatternSyntaxError, with the offending offset, on an empty
   *   pattern, an unclosed `[`, a stray `]`, a nested or empty bracket, a
   *   multi-word optional, an invalid slot name or an empty alternation
   */
  parse(pattern: string): PatternElement[] {
    if (!pattern || pattern.trim().length === 0) {
      throw new PatternSyntaxError('Pattern cannot be empty', pattern ?? '');
    }
    const parts: PatternElement[] = [];
    const words = [...pattern.matchAll(/\S+/g)];
    for (let i = 0; i < words.length; i++) {
      const word = words[i][0];
      const at = words[i].index ?? 0;
      let body = word;
      let optional = false;
      if (word.startsWith('[')) {
        if (!word.endsWith(']')) {
          const closesLater = words.slice(i + 1).some((w) => w[0].includes(']'));
          throw new PatternSyntaxError(
            closesLater
              ? 'An optional element is one word, one alternation or one slot; `[…]` cannot span several words'
              : 'Unclosed `[` in pattern',
            pattern,
            at,
          );
        }
        body = word.slice(1, -1);
        optional = true;
        if (body.length === 0) {
          throw new PatternSyntaxError('Empty `[]` in pattern', pattern, at);
        }
      }
      const stray = body.search(/[[\]]/);
      if (stray >= 0) {
        throw new PatternSyntaxError(
          body[stray] === '[' ? 'Nested or misplaced `[` in pattern' : 'Stray `]` in pattern',
          pattern,
          at + stray + (optional ? 1 : 0),
        );
      }
      parts.push(this.parseElement(body, optional, pattern, at));
    }
    return parts;
  }

  /**
   * Compile parts into tokens and slot records. Words and alternates are
   * lowercased here, the one place every literal passes, Chord's and a TS
   * story's alike (parser review B3).
   * @param parts The pattern's elements
   * @param source The rule's display text, quoted in error messages only
   * @returns The compiled pattern
   * @throws PatternSyntaxError on an empty pattern, an invalid or duplicate
   *   slot name, or an empty alternation
   */
  compile(parts: readonly PatternElement[], source = ''): CompiledPattern {
    if (parts.length === 0) {
      throw new PatternSyntaxError('Pattern cannot be empty', source);
    }
    const tokens: PatternToken[] = [];
    const slots: CompiledSlot[] = [];
    const slotsByName = new Map<string, CompiledSlot>();

    parts.forEach((part, index) => {
      const optional = part.optional === true ? true : undefined;
      switch (part.kind) {
        case 'word':
          if (part.word.length === 0) {
            throw new PatternSyntaxError('Empty word in pattern', source, index);
          }
          tokens.push({ type: 'literal', value: part.word.toLowerCase(), ...(optional ? { optional } : {}) });
          break;
        case 'alt': {
          if (part.words.length === 0 || part.words.some((w) => w.length === 0)) {
            throw new PatternSyntaxError('Empty alternative in pattern', source, index);
          }
          const alternates = part.words.map((w) => w.toLowerCase());
          tokens.push({ type: 'alternates', value: alternates[0], alternates, ...(optional ? { optional } : {}) });
          break;
        }
        case 'slot': {
          if (!SLOT_NAME.test(part.name)) {
            throw new PatternSyntaxError(`Invalid slot name: ${part.name}`, source, index);
          }
          if (slotsByName.has(part.name)) {
            throw new PatternSyntaxError(`Duplicate slot name: ${part.name}`, source, index);
          }
          const greedy = part.greedy === true;
          const slot: CompiledSlot = {
            name: part.name,
            tokenIndex: tokens.length,
            optional: part.optional === true,
            greedy,
            slotType: greedy ? SlotType.TEXT_GREEDY : SlotType.ENTITY,
          };
          slots.push(slot);
          slotsByName.set(part.name, slot);
          tokens.push({
            type: 'slot',
            value: part.name,
            ...(optional ? { optional } : {}),
            ...(greedy ? { greedy: true, slotType: SlotType.TEXT_GREEDY } : {}),
          });
          break;
        }
      }
    });

    // What the match requires (ADR-386 D7): every required element less the
    // articles after the first, which the matcher never demands; a
    // pattern's first word is its verb, even when spelled like an article.
    const minTokens = tokens.filter((t, index) => !t.optional && !(index > 0 && t.type === 'literal' && ARTICLE_WORDS.has(t.value))).length;
    return { tokens, slots, slotsByName, minTokens };
  }

  /**
   * One unbracketed element's text → its part.
   * @param body The element's text, brackets removed
   * @param optional Whether it was bracketed
   * @param pattern The whole pattern, for error messages
   * @param at The element's offset in the pattern
   */
  private parseElement(body: string, optional: boolean, pattern: string, at: number): PatternElement {
    const opt = optional ? { optional: true } : {};
    if (body.startsWith(':')) {
      const greedy = body.endsWith('...');
      const name = greedy ? body.slice(1, -3) : body.slice(1);
      if (!SLOT_NAME.test(name)) {
        throw new PatternSyntaxError(`Invalid slot name: ${body}`, pattern, at);
      }
      return { kind: 'slot', name, ...opt, ...(greedy ? { greedy: true } : {}) };
    }
    if (body.includes('|')) {
      const words = body.split('|');
      if (words.some((w) => w.length === 0)) {
        throw new PatternSyntaxError(`Empty alternative in ${body}`, pattern, at);
      }
      return { kind: 'alt', words, ...opt };
    }
    return { kind: 'word', word: body, ...opt };
  }
}
