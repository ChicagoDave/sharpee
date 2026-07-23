/**
 * chord-mode.ts — a CodeMirror 6 syntax-highlighting mode for Chord.
 *
 * Highlighting only (ADR-191 Phase 1 — no as-you-type diagnostics; those run
 * server-side... i.e. in the playground iframe, on Play). A StreamLanguage
 * tokenizer is enough: Chord's grammar keywords are recognized in the parser,
 * not exported as a table, so the keyword list is hand-curated here; the KIND /
 * TRAIT / STATE closed sets are MIRRORED from packages/chord/src/catalog.ts
 * (the website is outside the pnpm workspace, so it cannot import them). Keep
 * the mirrored sets in sync when catalog.ts changes.
 *
 * Public interface: chordLanguage (Extension), chordHighlightStyle (Extension).
 * Owner: website (not the platform workspace).
 */
import { StreamLanguage, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

/** Structural Chord grammar keywords (clause/line openers + connectors). */
const KEYWORDS = new Set([
  'story', 'create', 'define', 'use', 'end',
  'on', 'after', 'before', 'once', 'first', 'second', 'third', 'time', 'every', 'turn',
  'select', 'when', 'while', 'if', 'refuse', 'require', 'change', 'emit', 'now',
  'play', 'stop', 'sound', 'music', 'ambient',
  'phrase', 'phrases', 'channel', 'verb', 'text', 'trait', 'action', 'condition',
  'pronouns', 'phrasebook', 'chain', 'override', 'message', 'messages',
  'return', 'mode', 'replace', 'append', 'states', 'starts', 'wears', 'aka',
  'win', 'lose', 'blocked', 'containing', 'gated', 'means',
  'to', 'toward', 'through', 'from', 'with', 'by', 'and', 'in',
]);

/** MIRRORED from catalog.ts KIND_NOUNS. */
const KINDS = new Set(['room', 'door', 'person', 'container', 'supporter', 'region']);

/** MIRRORED from catalog.ts TRAIT_ADJECTIVES + STATE_ADJECTIVES. */
const ADJECTIVES = new Set([
  // traits
  'scenery', 'wearable', 'readable', 'openable', 'lockable', 'switchable', 'edible',
  'pushable', 'pullable', 'light-source', 'plural', 'dark', 'enterable', 'climbable',
  'cuttable', 'diggable', 'drinkable', 'concealed', 'hiding-spot', 'proper',
  // states
  'open', 'closed', 'locked', 'unlocked', 'on', 'off', 'worn', 'lit',
]);

const chordStream = StreamLanguage.define<{}>({
  name: 'chord',
  token(stream) {
    if (stream.eatSpace()) return null;
    // Line comments: `#` / `##` to end of line.
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }
    // Double-quoted strings.
    if (stream.peek() === '"') {
      stream.next();
      let ch: string | void;
      while ((ch = stream.next()) != null) {
        if (ch === '"') break;
      }
      return 'string';
    }
    // Words (identifiers / keywords / kinds / adjectives).
    const m = stream.match(/^[A-Za-z][A-Za-z0-9_-]*/) as RegExpMatchArray | null;
    if (m) {
      const w = m[0].toLowerCase();
      if (KEYWORDS.has(w)) return 'keyword';
      if (KINDS.has(w)) return 'typeName';
      if (ADJECTIVES.has(w)) return 'atom';
      return null;
    }
    stream.next();
    return null;
  },
});

/** The Chord language extension for a CodeMirror EditorState. */
export const chordLanguage = chordStream;

/**
 * Highlight style bound to the site palette (theme-aware via CSS variables —
 * the same tokens the rest of the site uses, so it tracks light/dark).
 */
export const chordHighlightStyle = syntaxHighlighting(
  HighlightStyle.define([
    { tag: t.keyword, color: 'var(--sh-link)', fontWeight: '600' },
    { tag: t.typeName, color: 'var(--sh-navy-700)', fontWeight: '600' },
    { tag: t.atom, color: 'var(--sh-slate-600)' },
    { tag: t.string, color: 'var(--sh-rose-700)' },
    { tag: t.comment, color: 'var(--sh-muted)', fontStyle: 'italic' },
  ]),
);
