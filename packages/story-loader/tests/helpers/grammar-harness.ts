/**
 * grammar-harness.ts — a REAL if-domain GrammarEngine wired up as the story
 * grammar, so loader-emission tests assert on the registered GrammarRule
 * shape (ADR-271 acceptance 3) rather than on a mocked builder chain. Only
 * the pattern compiler is test scaffolding (whitespace tokens, ':' = slot);
 * the registration path — forAction/fullPattern/where/build → addRule — is
 * the engine's own. The full production path (EnglishGrammarEngine + real
 * compiler + parse) is exercised by the transcript suites.
 */
import type { CompiledPattern, GrammarContext, GrammarRule, PatternCompiler, PatternMatch, Token } from '@sharpee/if-domain';
import { GrammarEngine } from '@sharpee/if-domain';
import type { ChordStory } from '../../src';

/** Minimal pattern compiler: whitespace tokens; a leading ':' marks a slot. */
class TestPatternCompiler implements PatternCompiler {
  compile(pattern: string): CompiledPattern {
    const tokens = pattern.split(/\s+/).map((word) =>
      word.startsWith(':')
        ? { type: 'slot' as const, value: word.slice(1) }
        : { type: 'literal' as const, value: word },
    );
    const slots = new Map<string, number>();
    tokens.forEach((token, index) => {
      if (token.type === 'slot') slots.set(token.value, index);
    });
    return { tokens, slots, minTokens: tokens.length, maxTokens: tokens.length };
  }

  validate(pattern: string): boolean {
    return pattern.length > 0;
  }

  extractSlots(pattern: string): string[] {
    return pattern
      .split(/\s+/)
      .filter((word) => word.startsWith(':'))
      .map((word) => word.slice(1));
  }
}

/** Concrete engine for tests — matching is unused; registration is real. */
class TestGrammarEngine extends GrammarEngine {
  constructor() {
    super(new TestPatternCompiler());
  }

  findMatches(_tokens: Token[], _context: GrammarContext, _options?: unknown): PatternMatch[] {
    return [];
  }
}

/**
 * Run the story's extendParser against a real engine and return the
 * registered rules in registration (definition) order — the engine's own
 * order (ADR-268). The builder is story-tier, as getStoryGrammar() is.
 */
export function captureGrammarRules(story: ChordStory): GrammarRule[] {
  const engine = new TestGrammarEngine();
  const fakeParser = { getStoryGrammar: () => engine.createBuilder('story') };
  story.extendParser(fakeParser as never);
  return engine.getRules();
}
