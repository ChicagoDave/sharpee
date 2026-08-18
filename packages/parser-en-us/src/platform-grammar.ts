/**
 * platform-grammar.ts — the ruled platform-side exception rules (ADR-269 D1).
 *
 * Two command families stay TypeScript while the standard grammar lives as
 * Chord (grammar/standard-en-us.story → the generated grammar.ts):
 *
 * - `?` → if.action.help — a punctuation-literal pattern Chord cannot lex
 *   (ruled platform-side, David 2026-07-25, session 2d5bc7).
 * - `and?` → if.action.talking — the fourth frozen continuation-prompt form
 *   (ADR-320 D14); its three lexable siblings ("tell me more" / "continue" /
 *   "go on") live in the Chord source. Same punctuation ruling as `?`.
 * - the `trace …` family → author.trace — the author/debug meta-command
 *   (`author.*` namespace: tooling grammar, never story vocabulary; outside
 *   ADR-269 D10's `if.action.<name>` derivation by design — ruled
 *   platform-side, David 2026-07-26, session f9e069).
 *
 * Four patterns cover the thirteen accepted phrasings; the `trace` family was
 * eleven literal patterns until 2026-07-30 (#81).
 *
 * Registered at the standard tier after the Chord-derived rules; these
 * patterns collide with nothing, so their position carries no ordering
 * weight. Hand-maintained — duplicates nothing in the Chord source.
 *
 * Public interface: definePlatformGrammar(grammar).
 * Owner context: parser-en-us.
 */

import { type GrammarBuilder } from '@sharpee/if-domain';

/**
 * Register the platform-side exception rules.
 * @param grammar The grammar builder to use
 */
export function definePlatformGrammar(grammar: GrammarBuilder): void {
  // `?` — help alias (punctuation, unlexable in Chord).
  grammar.define('?').mapsTo('if.action.help').build();

  // `and?` — continuation prompt (ADR-320 D14 frozen list): targetless
  // thread-advance input; stdlib's talking action resolves the partner
  // implicitly. Tokenization is whitespace-only, so the input arrives as
  // the single literal token `and?` — the same ruling as `?`.
  grammar.define('and?').mapsTo('if.action.talking').build();

  // TRACE — author/debug meta-command (stdlib/src/actions/author/trace.ts).
  //
  // Literal alternates, not slots: TraceAction reads `command.parsed.tokens` and
  // validates the category/state itself, so the grammar's whole job is to match. Slots
  // would additionally send `parser`/`all` through entity scope resolution, which has
  // nothing to resolve them to.
  //
  // Two patterns, not one: `[…]` marks exactly the next word optional
  // (EnglishPatternCompiler.expandOptionalElements), so `trace [category] [state]` cannot
  // express "a category only ever comes with a state". Written as one pattern it would
  // also accept `trace parser`, widening the language; these two accept exactly what the
  // eleven literals did.
  grammar.define('trace [on|off]').mapsTo('author.trace').build();
  grammar.define('trace parser|validation|system|all on|off').mapsTo('author.trace').build();
}
