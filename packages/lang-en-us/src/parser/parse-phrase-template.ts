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
 *  - `{pronoun:it}` / `{number:n words}` / `{contents:box}` / `{slot:detail}` /
 *    `{verbatim:banner}` → the corresponding reserved (stub) kind.
 *  - No `:`-chain, `?`, `|`, `#`. A `:` head whose prefix is not a known kind,
 *    an unknown leading hint, or an unbound param all raise `PhraseParseError`
 *    AT PARSE TIME (never a silent `Empty` at realize time). (AC-8, AC-11)
 */

import { Phrase, NounPhrase } from '@sharpee/if-domain';

/** Leading hint → the article it selects on a `NounPhrase`. */
const ARTICLE_HINTS: Record<string, NounPhrase['articleType']> = {
  the: 'definite',
  a: 'indefinite',
  an: 'indefinite',
  some: 'some',
};

/** Recognized `kind:` heads → the reserved `Phrase` kind they route to. */
const KIND_PREFIXES: Record<string, Phrase['kind']> = {
  pronoun: 'pronoun',
  number: 'number',
  contents: 'contents',
  slot: 'slot',
  verbatim: 'verbatim',
};

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

/** Parse one placeholder's inner text into a phrase, binding against params. */
function parsePlaceholder(inner: string, template: string, params: Record<string, unknown>): Phrase {
  // A ':' marks a kind head. Its prefix must be a known kind — anything else
  // (a legacy chain like `cap:the:item`, or an unknown kind) fails here.
  if (inner.includes(':')) {
    const prefix = inner.slice(0, inner.indexOf(':')).trim();
    // Verb atom (ADR-199): parses its own lemma + subject and binds the subject.
    if (prefix === 'verb') {
      return parseVerb(inner, template, params);
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
