/**
 * platform-grammar.ts — the ruled platform-side exception rules (ADR-269 D1).
 *
 * Twelve rules stay TypeScript while the standard grammar lives as Chord
 * (grammar/standard-en-us.story → the generated grammar.ts):
 *
 * - `?` → if.action.help — a punctuation-literal pattern Chord cannot lex
 *   (ruled platform-side, David 2026-07-25, session 2d5bc7).
 * - the `trace …` family → author.trace — the author/debug meta-command
 *   (`author.*` namespace: tooling grammar, never story vocabulary; outside
 *   ADR-269 D10's `if.action.<name>` derivation by design — ruled
 *   platform-side, David 2026-07-26, session f9e069).
 *
 * Registered at the standard tier after the Chord-derived rules; these
 * patterns collide with nothing, so their position carries no ordering
 * weight. Hand-maintained — duplicates nothing in the Chord source.
 *
 * Public interface: definePlatformGrammar(grammar).
 * Owner context: parser-en-us.
 */

import { GrammarBuilder } from '@sharpee/if-domain';

/**
 * Register the platform-side exception rules.
 * @param grammar The grammar builder to use
 */
export function definePlatformGrammar(grammar: GrammarBuilder): void {
  // `?` — help alias (punctuation, unlexable in Chord).
  grammar.define('?').mapsTo('if.action.help').build();

  // TRACE — author/debug meta-command (stdlib/src/actions/author/trace.ts).
  grammar.define('trace').mapsTo('author.trace').build();
  grammar.define('trace on').mapsTo('author.trace').build();
  grammar.define('trace off').mapsTo('author.trace').build();
  grammar.define('trace parser on').mapsTo('author.trace').build();
  grammar.define('trace parser off').mapsTo('author.trace').build();
  grammar.define('trace validation on').mapsTo('author.trace').build();
  grammar.define('trace validation off').mapsTo('author.trace').build();
  grammar.define('trace system on').mapsTo('author.trace').build();
  grammar.define('trace system off').mapsTo('author.trace').build();
  grammar.define('trace all on').mapsTo('author.trace').build();
  grammar.define('trace all off').mapsTo('author.trace').build();
}
