/**
 * @file parsePhraseTemplate — the phrase-tree template parser (ADR-192 §5).
 *
 * Purpose: parse an author template string into a `Phrase` tree, binding each
 * placeholder to a producer/param value. Replaces `parsePlaceholder` and the
 * `:`-chain formatter grammar. Placeholders are producer references, never
 * formatter chains.
 *
 * Public interface: `parsePhraseTemplate(template, params)` and
 * `PhraseParseError`.
 *
 * Owner context: `@sharpee/lang-en-us`. The grammar is English-locale authoring
 * surface; the produced `Phrase` tree is language-neutral.
 *
 * Grammar (ADR-192 §5):
 *  - `{item}` / `{the item}` / `{a item}` / `{an item}` / `{some item}` /
 *    `{capitalize the item}` → `NounPhrase` (last bare token = param name,
 *    leading bare tokens = reserved hints).
 *  - `{verb:is target}` / `{verb:has target}` / `{verb:opens door}` → a `Verb`
 *    atom (ADR-199): leading bare token is the lemma, last bare token is the
 *    subject param to agree with. The subject must be a bound param.
 *  - `{verbatim:name}` → a `Verbatim` atom (ADR-200): the param's value rendered
 *    as opaque, whitespace-exempt text. The param must be bound.
 *  - `{number:coins}` / `{number:coins words}` / `{number:floor ordinal}` → a
 *    `Numeral` atom (ADR-198): the numeric param, optional format. Must be bound.
 *  - `{pronoun:subject}` / `{pronoun:object}` / `{pronoun:possessive}` → a `Pronoun`
 *    atom (ADR-197): a grammatical case; the referent is the last-mentioned entity.
 *  - `{contents:box}` → a `Contents` atom (ADR-194): the container's live contents
 *    as a grouped list, read at realize time. The container must be bound.
 *  - `{slot:here}` / `{slot:detail clause}` / `{slot:detail clause or}` → a `Slot`
 *    combinator (ADR-195): the first bare token is the contribution channel key;
 *    optional trailing hints set `mode` (`sentence` default | `clause`) and the
 *    `clause` conjunction (`and` default | `or`). The key need NOT be a bound param
 *    — an unfilled slot is valid (AC-7); a keyless `{slot:}` is a parse error (AC-9).
 *  - No `:`-chain, `?`, `|`, `#`. A `:` head whose prefix is not a known kind,
 *    an unknown leading hint, or an unbound param all raise `PhraseParseError`
 *    AT PARSE TIME (never a silent `Empty` at realize time). (AC-8, AC-11)
 */

import { Phrase, NounPhrase, Slot } from '@sharpee/if-domain';

/** Leading hint → the article it selects on a `NounPhrase`. */
const ARTICLE_HINTS: Record<string, NounPhrase['articleType']> = {
  the: 'definite',
  a: 'indefinite',
  an: 'indefinite',
  some: 'some',
};

/**
 * Recognized `kind:` heads → the reserved (stub) `Phrase` kind they route to.
 * Empty for now: `slot` parses through `parseSlot`; the remaining stubs
 * (`optional` / `choice`, ADR-196) populate this when their parse rules land.
 */
const KIND_PREFIXES: Record<string, Phrase['kind']> = {};

/** Recognized `{number:param format?}` formats (ADR-198). */
const NUMERAL_FORMATS = new Set(['digits', 'words', 'ordinal']);

/** Recognized `{pronoun:case}` cases (ADR-197). */
const PRONOUN_CASES = new Set(['subject', 'object', 'possessive', 'possessive-pronoun', 'reflexive']);

/**
 * Raised when a template cannot be parsed: a legacy `:`-chain, an unknown
 * kind-prefix, an unknown leading hint, or a reference to an unbound param.
 * Carries the offending token and the full template so the author sees both.
 */
export class PhraseParseError extends Error {
  readonly offendingToken: string;
  readonly template: string;
  readonly reason: string;

  constructor(offendingToken: string, template: string, reason: string) {
    super(`Cannot parse template "${template}": ${reason} (at "${offendingToken}").`);
    this.name = 'PhraseParseError';
    this.offendingToken = offendingToken;
    this.template = template;
    this.reason = reason;
  }
}

/** True if a param value is already a phrase (rather than a scalar to wrap). */
function isPhraseValue(value: unknown): value is Phrase {
  return typeof value === 'object' && value !== null && typeof (value as { kind?: unknown }).kind === 'string';
}

/** Build the phrase for a NounPhrase-default placeholder from its bound value. */
function bindNounPhrase(
  value: unknown,
  articleType: NounPhrase['articleType'] | undefined,
  capitalize: boolean,
): Phrase {
  if (isPhraseValue(value)) {
    // A producer already supplied a phrase. Hints apply only to noun phrases;
    // other kinds (e.g. a bound PhraseList) pass through untouched.
    if (value.kind === 'noun') {
      const np: NounPhrase = { ...value };
      if (articleType !== undefined) np.articleType = articleType;
      if (capitalize) np.capitalize = true;
      return np;
    }
    return value;
  }

  // Numbers/booleans with no hint render as literal text (not "a 42").
  if ((typeof value === 'number' || typeof value === 'boolean') && articleType === undefined && !capitalize) {
    return { kind: 'literal', text: String(value) };
  }

  // Strings (and hinted scalars) become the unprefixed NounPhrase default.
  const np: NounPhrase = {
    kind: 'noun',
    name: String(value),
    number: 'singular',
    articleType: articleType ?? 'indefinite',
  };
  if (capitalize) np.capitalize = true;
  return np;
}

/**
 * Parse a `{verb:lemma subject}` head into a `Verb` atom (ADR-199 §2). Leading
 * bare token(s) are the lemma; the last bare token is the subject param to agree
 * with. The subject must be bound — an unbound subject is an authoring error and
 * fails here at parse time (AC-11), matching the NounPhrase unbound-param rule.
 */
function parseVerb(inner: string, template: string, params: Record<string, unknown>): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 2) {
    throw new PhraseParseError(
      inner,
      template,
      'a verb needs a lemma and a subject, e.g. {verb:is target}',
    );
  }
  const subjectRef = tokens.pop() as string;
  const lemma = tokens.join(' ');
  if (!(subjectRef in params)) {
    throw new PhraseParseError(subjectRef, template, `verb subject '${subjectRef}' is not bound`);
  }
  return { kind: 'verb', lemma, subjectRef };
}

/**
 * Parse a `{verbatim:x}` head into a `Verbatim` atom (ADR-200): the last bare
 * token is the param whose value is rendered as opaque text. The param must be
 * bound — an unbound param fails at parse time (ADR-192 AC-11).
 *
 * A bound value that is already a phrase passes through untouched (matching
 * `bindNounPhrase` / `{quote:…}`): ADR-209 binds a spliced-description
 * `Sequence` as the `description` param of `{verbatim:description}` — the
 * param's VALUE becomes composite while the template keeps its shape.
 */
function parseVerbatim(inner: string, template: string, params: Record<string, unknown>): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length !== 1) {
    throw new PhraseParseError(inner, template, 'verbatim takes a single param, e.g. {verbatim:name}');
  }
  const name = tokens[0];
  if (!(name in params)) {
    throw new PhraseParseError(name, template, `verbatim param '${name}' is not bound`);
  }
  const value = params[name];
  if (isPhraseValue(value)) return value;
  return { kind: 'verbatim', text: String(value) };
}

/**
 * Parse a `{number:param format?}` head into a `Numeral` atom (ADR-198). The
 * first bare token is the numeric param; an optional trailing token is the format
 * (`digits` default | `words` | `ordinal`). The param must be bound (AC-11).
 */
function parseNumber(inner: string, template: string, params: Record<string, unknown>): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 1 || tokens.length > 2) {
    throw new PhraseParseError(inner, template, 'a number takes a param and an optional format, e.g. {number:coins words}');
  }
  const name = tokens[0];
  const format = tokens[1] ?? 'digits';
  if (!NUMERAL_FORMATS.has(format)) {
    throw new PhraseParseError(format, template, `'${format}' is not a number format (digits | words | ordinal)`);
  }
  if (!(name in params)) {
    throw new PhraseParseError(name, template, `number param '${name}' is not bound`);
  }
  return { kind: 'number', value: Number(params[name]), format: format as 'digits' | 'words' | 'ordinal' };
}

/**
 * Parse a `{pronoun:case}` head into a `Pronoun` atom (ADR-197). The referent is
 * the last-mentioned entity (resolved at realize time); the single token is the
 * grammatical case. An unknown case fails at parse time (AC-11).
 *
 * `capitalize` (ADR-201 §2, from a `{capitalize pronoun:…}` head) sets the S40
 * explicit override so the pronoun caps regardless of position.
 */
function parsePronoun(inner: string, template: string, capitalize = false): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length !== 1 || !PRONOUN_CASES.has(tokens[0])) {
    throw new PhraseParseError(
      inner,
      template,
      'a pronoun takes one case: {pronoun:subject|object|possessive|possessive-pronoun|reflexive}',
    );
  }
  const cased = tokens[0] as 'subject' | 'object' | 'possessive' | 'possessive-pronoun' | 'reflexive';
  return capitalize ? { kind: 'pronoun', case: cased, capitalize: true } : { kind: 'pronoun', case: cased };
}

/**
 * Parse a `{quote:utterance [terminal]}` head into a `Quote` atom (ADR-201 §5).
 * The first bare token is the utterance param (must be bound); an optional second
 * token sets the terminal placed inside the closing quote (`.` default | `?` | `!`).
 * A bound `Phrase` value is used as the utterance directly; a scalar becomes a
 * `Literal` (quoted speech, not an article-bearing noun phrase). An unbound param
 * or a missing utterance fails at parse time (AC-10).
 */
function parseQuote(inner: string, template: string, params: Record<string, unknown>): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 1) {
    throw new PhraseParseError(inner, template, 'a quote needs an utterance param, e.g. {quote:line}');
  }
  if (tokens.length > 2) {
    throw new PhraseParseError(inner, template, 'a quote takes an utterance param and an optional terminal, e.g. {quote:line !}');
  }
  const name = tokens[0];
  const terminal = tokens[1];
  if (terminal !== undefined && terminal !== '.' && terminal !== '?' && terminal !== '!') {
    throw new PhraseParseError(terminal, template, `'${terminal}' is not a terminal (. | ? | !)`);
  }
  if (!(name in params)) {
    throw new PhraseParseError(name, template, `quote utterance '${name}' is not bound`);
  }
  const value = params[name];
  const utterance: Phrase = isPhraseValue(value) ? value : { kind: 'literal', text: String(value) };
  return terminal ? { kind: 'quote', utterance, terminal } : { kind: 'quote', utterance };
}

/**
 * Parse a `{contents:container [or]}` head into a `Contents` atom (ADR-194). The
 * first bare token is the container param (must be bound); an optional `or`/`and`
 * sets the conjunction (default `and`). The contents are read at realize time.
 */
function parseContents(inner: string, template: string, params: Record<string, unknown>): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length < 1 || tokens.length > 2) {
    throw new PhraseParseError(inner, template, 'contents takes a container and an optional conjunction, e.g. {contents:box}');
  }
  const name = tokens[0];
  const conj = tokens[1];
  if (conj !== undefined && conj !== 'and' && conj !== 'or') {
    throw new PhraseParseError(conj, template, `'${conj}' is not a conjunction (and | or)`);
  }
  if (!(name in params)) {
    throw new PhraseParseError(name, template, `contents container '${name}' is not bound`);
  }
  return conj === 'or'
    ? { kind: 'contents', containerRef: name, conj: 'or' }
    : { kind: 'contents', containerRef: name };
}

/**
 * Parse a `{slot:key [mode] [conj]}` head into a `Slot` combinator (ADR-195 §5).
 * The first bare token is the contribution channel key; optional trailing hints
 * set `mode` (`sentence` | `clause`) and the `clause` conjunction (`and` | `or`).
 *
 * The key is a channel name, NOT a param binding — an unfilled slot is valid and
 * renders to nothing (AC-7), so there is no `in params` check. A keyless `{slot:}`
 * is an authoring error and fails here at parse time (AC-9).
 */
function parseSlot(inner: string, template: string): Phrase {
  const rest = inner.slice(inner.indexOf(':') + 1).trim();
  const tokens = rest.split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new PhraseParseError(inner, template, 'a slot needs a key, e.g. {slot:here}');
  }
  if (tokens.length > 3) {
    throw new PhraseParseError(inner, template, 'a slot takes a key and optional mode/conj, e.g. {slot:detail clause or}');
  }
  const slot: Slot = { kind: 'slot', slotKey: tokens[0] };
  for (const hint of tokens.slice(1)) {
    if (hint === 'sentence' || hint === 'clause') {
      slot.mode = hint;
    } else if (hint === 'and' || hint === 'or') {
      slot.conj = hint;
    } else {
      throw new PhraseParseError(hint, template, `'${hint}' is not a slot hint (sentence | clause | and | or)`);
    }
  }
  return slot;
}

/** Parse one placeholder's inner text into a phrase, binding against params. */
function parsePlaceholder(inner: string, template: string, params: Record<string, unknown>): Phrase {
  // A ':' marks a kind head. Its prefix must be a known kind — anything else
  // (a legacy chain like `cap:the:item`, or an unknown kind) fails here.
  if (inner.includes(':')) {
    // A leading `capitalize` modifier on a kind head — only `pronoun` accepts it
    // (ADR-201 §2). NounPhrase `{capitalize the item}` is handled in the no-`:`
    // branch below; `{capitalize number:…}` / `verb` / `quote` etc. are authoring
    // errors that throw at parse time (AC-10).
    let capitalize = false;
    let body = inner;
    const trimmedStart = inner.trimStart();
    if (trimmedStart.startsWith('capitalize ')) {
      capitalize = true;
      body = trimmedStart.slice('capitalize '.length).trimStart();
    }
    const prefix = body.slice(0, body.indexOf(':')).trim();
    if (capitalize && prefix !== 'pronoun') {
      throw new PhraseParseError(inner, template, `capitalize is not a valid modifier for '${prefix}'`);
    }
    // Verb atom (ADR-199): parses its own lemma + subject and binds the subject.
    if (prefix === 'verb') {
      return parseVerb(body, template, params);
    }
    // Verbatim atom (ADR-200): binds a single param, rendered as opaque text.
    if (prefix === 'verbatim') {
      return parseVerbatim(body, template, params);
    }
    // Numeral atom (ADR-198): binds a numeric param + optional format.
    if (prefix === 'number') {
      return parseNumber(body, template, params);
    }
    // Pronoun atom (ADR-197): a grammatical case; referent is last-mentioned.
    if (prefix === 'pronoun') {
      return parsePronoun(body, template, capitalize);
    }
    // Quote atom (ADR-201): a bound utterance wrapped in locale quote glyphs.
    if (prefix === 'quote') {
      return parseQuote(body, template, params);
    }
    // Contents atom (ADR-194): binds a container; contents read at realize time.
    if (prefix === 'contents') {
      return parseContents(body, template, params);
    }
    // Slot combinator (ADR-195): a contribution channel key + optional mode/conj.
    if (prefix === 'slot') {
      return parseSlot(body, template);
    }
    // Sentence (ADR-201) is emitted by message structure / Quote, not authored.
    if (prefix === 'sentence') {
      throw new PhraseParseError(
        inner,
        template,
        'sentence is not an author-facing kind prefix — it is emitted by message structure / quote',
      );
    }
    const kind = KIND_PREFIXES[prefix];
    if (kind === undefined) {
      throw new PhraseParseError(
        inner,
        template,
        `'${prefix}' is not a known kind prefix — legacy ':' chains are not supported`,
      );
    }
    // Stub kinds reserve only their discriminant in ADR-192; their binding and
    // fields are parsed by the follow-on ADR. Route to the bare kind for now.
    return { kind } as Phrase;
  }

  const tokens = inner.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) {
    throw new PhraseParseError(inner, template, 'empty placeholder');
  }

  const name = tokens.pop() as string;
  let articleType: NounPhrase['articleType'] | undefined;
  let capitalize = false;
  for (const hint of tokens) {
    if (hint in ARTICLE_HINTS) {
      articleType = ARTICLE_HINTS[hint];
    } else if (hint === 'capitalize') {
      capitalize = true;
    } else {
      throw new PhraseParseError(hint, template, `'${hint}' is not a recognized hint`);
    }
  }

  if (!(name in params)) {
    throw new PhraseParseError(name, template, `param '${name}' is not bound`);
  }
  return bindNounPhrase(params[name], articleType, capitalize);
}

/**
 * Parse a template into a phrase tree.
 *
 * @param template author template, e.g. "You take {the item}."
 * @param params param/producer bindings keyed by placeholder name
 * @returns the parsed phrase (a `Sequence` when the template mixes literal text
 *          and placeholders; the bare phrase when it is a single placeholder)
 * @throws PhraseParseError on a legacy `:`-chain, unknown kind-prefix, unknown
 *         hint, or unbound param — synchronously, at parse time (AC-8, AC-11)
 */
export function parsePhraseTemplate(template: string, params: Record<string, unknown> = {}): Phrase {
  const parts: Phrase[] = [];
  const placeholder = /\{([^}]*)\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = placeholder.exec(template)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ kind: 'literal', text: template.slice(lastIndex, match.index) });
    }
    parts.push(parsePlaceholder(match[1], template, params));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < template.length) {
    parts.push({ kind: 'literal', text: template.slice(lastIndex) });
  }

  if (parts.length === 0) return { kind: 'literal', text: '' };
  if (parts.length === 1) return parts[0];
  return { kind: 'seq', parts };
}
