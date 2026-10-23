/**
 * grammar-harness.ts — a REAL if-domain GrammarEngine wired up as the story
 * grammar, so loader-emission tests assert on the registered GrammarRule
 * shape (ADR-271 acceptance 3) rather than on a mocked builder chain. The
 * pattern compiler is the real English one (ADR-382 D3), and the
 * registration path — forAction/fullPattern/where/build → addRule — is the
 * engine's own. Only matching is left out; the full production path
 * (EnglishGrammarEngine + parse) is exercised by the transcript suites.
 */
import type { GrammarBuilder, GrammarContext, GrammarRule, PatternMatch, Token } from '@sharpee/if-domain';
import { GrammarEngine } from '@sharpee/if-domain';
import { EnglishPatternCompiler } from '@sharpee/parser-en-us';
import type { ChordStory } from '../../src';

/** Concrete engine for tests — matching is unused; registration is real. */
class TestGrammarEngine extends GrammarEngine {
  constructor() {
    super(new EnglishPatternCompiler());
  }

  findMatches(_tokens: Token[], _context: GrammarContext, _options?: unknown): PatternMatch[] {
    return [];
  }
}

/**
 * Run the story's extendParser against a real engine and return the engine
 * (ADR-270 alteration tests read rules AND removals from it). An optional
 * `seedStandard` callback pre-registers standard-tier rules first — the
 * parser-construction order (standard before story) that removal targets.
 */
export function captureGrammarEngine(
  story: ChordStory,
  seedStandard?: (builder: GrammarBuilder) => void,
): GrammarEngine {
  const engine = new TestGrammarEngine();
  if (seedStandard) seedStandard(engine.createBuilder('standard'));
  const fakeParser = { getStoryGrammar: () => engine.createBuilder('story') };
  story.extendParser(fakeParser as never);
  return engine;
}

/**
 * Run the story's extendParser against a real engine and return the
 * registered rules in registration (definition) order — the engine's own
 * order (ADR-268). The builder is story-tier, as getStoryGrammar() is.
 */
export function captureGrammarRules(story: ChordStory): GrammarRule[] {
  return captureGrammarEngine(story).getRules();
}
