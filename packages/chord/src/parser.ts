/**
 * parser.ts — the Chord recursive-descent parser (Phase A grammar subset).
 *
 * Purpose: turn lexed lines into a StoryFile AST. Line-driven: block
 * structure comes from indentation (create blocks, `define phrases`,
 * ordinal blocks are dedent-terminated) and explicit `end <keyword>`
 * terminators (`when`, `on`, `if`, `select`, `define phrase`). After an
 * error the parser resynchronizes at the next `end` or top-level keyword
 * so one mistake yields one diagnostic (design.md §5.2).
 *
 * Public interface: parseStory().
 * Owner context: @sharpee/chord (language frontend; browser-safe).
 *
 * Invariants:
 * - The parser is vocabulary-free: entity names, event verbs, and phrase
 *   keys are collected as raw words; the analyzer resolves them (Phase 3).
 * - Prose is opaque except `{…}` markers, extracted with precise spans.
 * - Every AST node carries a Span.
 */
import {
  ActionPattern,
  ActionRefusal,
  AwardStmt,
  BlockedExitDecl,
  ChangeStmt,
  CompositionItem,
  ConditionNode,
  ConfigSetting,
  CreateDecl,
  Declaration,
  DefineAction,
  DefineCondition,
  DefineFlag,
  DefineHatch,
  DefinePhrase,
  DefinePhrases,
  DefineScore,
  DefineSequence,
  DefineText,
  DefineTrait,
  DefineVerb,
  EmitStmt,
  EveryRule,
  OnceRule,
  ExitDecl,
  IfStmt,
  MoveStmt,
  NameRef,
  OnClause,
  OrdinalBlock,
  ParamBinding,
  PatternPart,
  PhraseEntry,
  PhraseOverride,
  PhraseStmt,
  Placement,
  RefuseStmt,
  ScopeConstraint,
  SelectArm,
  SelectOnStmt,
  SelectStrategyStmt,
  SequenceStep,
  SetStmt,
  Statement,
  StateName,
  TraitField,
  StoryFile,
  StoryHeader,
  TextMarker,
  TextValue,
  ValueExpr,
  WhenRule,
} from './ast';
import { DiagnosticBag } from './diagnostics';
import { lex, Line, Token } from './lexer';
import { mergeSpans, Span, spanOf } from './span';

const ARTICLES = new Set(['the', 'a', 'an']);
const DIRECTIONS = new Set([
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down',
]);
const STRATEGIES = new Set(['randomly', 'cycling', 'ordered', 'once']);
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};
/** Words that terminate a noun phrase in condition/statement positions. */
const PHRASE_STOPS = new Set(['is', 'has', 'holds', 'wears', 'can', 'and', 'or', 'then', 'to', 'while', 'with']);
const TOP_KEYWORDS = new Set(['story', 'create', 'define', 'when', 'once', 'every']);

/**
 * Parse `.story` source into an AST.
 * @param source full `.story` text
 * @param diagnostics receives lex + parse diagnostics; parse always returns
 *   a (possibly partial) StoryFile — callers gate on diagnostics.hasErrors()
 */
export function parseStory(source: string, diagnostics: DiagnosticBag): StoryFile {
  return new Parser(lex(source, diagnostics), diagnostics).parseFile();
}

/** Cursor over one line's tokens. */
class Cursor {
  i = 0;
  constructor(readonly tokens: Token[], readonly line: Line) {}

  peek(offset = 0): Token | null {
    return this.tokens[this.i + offset] ?? null;
  }
  next(): Token | null {
    return this.tokens[this.i++] ?? null;
  }
  atEnd(): boolean {
    return this.i >= this.tokens.length;
  }
  /** Consume the next token iff it is the given word (case-sensitive). */
  matchWord(word: string): Token | null {
    const t = this.peek();
    if (t && t.kind === 'word' && t.text === word) return this.next();
    return null;
  }
  isWord(word: string, offset = 0): boolean {
    const t = this.peek(offset);
    return !!t && t.kind === 'word' && t.text === word;
  }
  /** Span from the current position to end of line (or whole line when spent). */
  restSpan(): Span {
    const t = this.peek();
    if (t) return mergeSpans(t.span, this.tokens[this.tokens.length - 1].span);
    return lineSpan(this.line);
  }
}

function lineSpan(line: Line): Span {
  if (line.tokens.length === 0) return spanOf(line.lineNo, line.indent + 1, Math.max(1, line.raw.trim().length));
  return mergeSpans(line.tokens[0].span, line.tokens[line.tokens.length - 1].span);
}

function firstWord(line: Line): string | null {
  const t = line.tokens[0];
  return t && t.kind === 'word' ? t.text : null;
}

/** True for `end <keyword>` lines. */
function isEndLine(line: Line): boolean {
  return firstWord(line) === 'end';
}

/** Words that open a statement or block boundary inside behavior bodies. */
const STATEMENT_OPENERS = new Set([
  'refuse', 'phrase', 'emit', 'set', 'change', 'move', 'award', 'win', 'lose',
  'if', 'select', 'end', 'else', 'or', 'when', 'at',
]);

/**
 * True when a line reads as a statement/boundary rather than bare prose —
 * used to decide whether a deeper-indented line after `phrase <key>` is the
 * declare-and-emit inline text. Case-sensitive on purpose: prose sentences
 * start capitalized, statement keywords are lowercase.
 */
function isStatementLine(line: Line): boolean {
  const word = firstWord(line);
  if (word && STATEMENT_OPENERS.has(word)) return true;
  if (word && ORDINALS[word] !== undefined) return true;
  // `<n> turns later` sequence-step headers open with a number.
  return line.tokens[0]?.kind === 'number' && line.tokens[1]?.text === 'turns';
}

class Parser {
  private pos = 0;

  constructor(
    private readonly lines: Line[],
    private readonly diagnostics: DiagnosticBag,
  ) {}

  // ------------------------------------------------------------------ file

  parseFile(): StoryFile {
    let header: StoryHeader | null = null;
    const declarations: Declaration[] = [];
    const start = this.lines[0] ? lineSpan(this.lines[0]) : spanOf(1, 1);

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent !== 0) {
        this.diagnostics.error('parse.unexpected-indent', 'Unexpected indentation — expected a top-level declaration.', lineSpan(line));
        this.recoverToTopLevel();
        continue;
      }
      const word = firstWord(line);
      switch (word) {
        case 'story':
          if (header) {
            this.diagnostics.error('parse.duplicate-story-header', 'Duplicate story header — only one `story` line is allowed.', lineSpan(line));
            this.recoverToTopLevel(true);
          } else {
            header = this.parseStoryHeader();
          }
          break;
        case 'create':
          declarations.push(this.parseCreate());
          break;
        case 'define': {
          const d = this.parseDefine();
          if (d) declarations.push(d);
          break;
        }
        case 'when':
          declarations.push(this.parseWhen());
          break;
        case 'once': {
          const d = this.parseOnce();
          if (d) declarations.push(d);
          break;
        }
        case 'every': {
          const d = this.parseEvery();
          if (d) declarations.push(d);
          break;
        }
        default:
          this.diagnostics.error(
            'parse.unknown-declaration',
            `Unknown declaration \`${word ?? line.raw.trim()}\` — expected story, create, define, or when.`,
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
      }
    }

    const last = this.lines[this.lines.length - 1];
    return {
      kind: 'story-file',
      header,
      declarations,
      span: last ? mergeSpans(start, lineSpan(last)) : start,
    };
  }

  /** Skip lines until the next top-level keyword at indent 0. */
  private recoverToTopLevel(consumeCurrent = false): void {
    if (consumeCurrent) this.pos++;
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent === 0 && TOP_KEYWORDS.has(firstWord(line) ?? '')) return;
      this.pos++;
    }
  }

  // ---------------------------------------------------------------- header

  private parseStoryHeader(): StoryHeader {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.matchWord('story');
    const titleTok = c.peek();
    let title = '';
    if (titleTok && titleTok.kind === 'string') {
      title = titleTok.text;
      c.next();
    } else {
      this.diagnostics.error('parse.story-title', 'Expected a quoted story title after `story`.', c.restSpan());
    }
    let author = '';
    if (c.matchWord('by')) {
      const authorTok = c.peek();
      if (authorTok && authorTok.kind === 'string') {
        author = authorTok.text;
        c.next();
      } else {
        this.diagnostics.error('parse.story-author', 'Expected a quoted author after `by`.', c.restSpan());
      }
    }

    const fields: Record<string, string> = {};
    let span = lineSpan(line);
    while (this.pos < this.lines.length && this.lines[this.pos].indent > 0) {
      const fieldLine = this.lines[this.pos++];
      span = mergeSpans(span, lineSpan(fieldLine));
      const key = firstWord(fieldLine);
      const colon = fieldLine.tokens[1];
      if (!key || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.header-field', 'Expected `key: value` in the story header.', lineSpan(fieldLine));
        continue;
      }
      const colonAt = fieldLine.raw.indexOf(':');
      fields[key] = fieldLine.raw.slice(colonAt + 1).trim();
    }

    return { kind: 'story-header', title, author, fields, span };
  }

  // ---------------------------------------------------------------- create

  private parseCreate(): CreateDecl {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('create');
    const name = this.parseNameRef(c, () => false);
    if (name.words.length === 0) {
      this.diagnostics.error('parse.create-name', 'Expected an entity name after `create`.', lineSpan(headLine));
    }

    const decl: CreateDecl = {
      kind: 'create',
      name,
      aka: [],
      compositions: [],
      placement: null,
      wears: [],
      exits: [],
      blockedExits: [],
      states: [],
      description: null,
      phraseOverrides: [],
      onClauses: [],
      span: lineSpan(headLine),
    };

    let sawBlank = false;
    while (this.pos < this.lines.length && this.lines[this.pos].indent > 0) {
      const line = this.lines[this.pos];
      sawBlank = sawBlank || line.afterBlank;
      decl.span = mergeSpans(decl.span, lineSpan(line));
      const word = firstWord(line);
      const cur = new Cursor(line.tokens, line);

      if (word === 'aka') {
        this.pos++;
        cur.matchWord('aka');
        decl.aka.push(...this.parseCommaWords(cur));
      } else if (word === 'states' && cur.isWord('states') && line.tokens[1]?.kind === 'colon') {
        this.pos++;
        cur.next();
        cur.next();
        decl.states.push(...this.parseStateList(cur));
      } else if (word === 'wears') {
        this.pos++;
        cur.matchWord('wears');
        decl.wears.push(this.parseNameRef(cur, () => false));
      } else if (word === 'starts' && cur.isWord('in', 1)) {
        this.pos++;
        cur.next();
        cur.next();
        decl.placement = this.finishPlacement('starts-in', cur, line);
      } else if ((word === 'in' || word === 'on') && line.tokens[1] && line.tokens[1].kind === 'word' && ARTICLES.has(line.tokens[1].text)) {
        this.pos++;
        cur.next();
        decl.placement = this.finishPlacement(word as 'in' | 'on', cur, line);
      } else if (word === 'on') {
        decl.onClauses.push(this.parseOnClause(line.indent));
      } else if (word === 'phrase' && line.tokens[1]?.kind === 'word' && line.tokens[2]?.kind === 'colon') {
        this.pos++;
        decl.phraseOverrides.push(this.parsePhraseOverride(line));
      } else if (word && DIRECTIONS.has(word) && cur.isWord('to', 1)) {
        this.pos++;
        cur.next();
        cur.next();
        const to = this.parseNameRef(cur, () => false);
        decl.exits.push({ kind: 'exit', direction: word, to, span: lineSpan(line) } as ExitDecl);
      } else if (word && DIRECTIONS.has(word) && cur.isWord('is', 1) && cur.isWord('blocked', 2)) {
        this.pos++;
        const blocked = this.parseBlockedExit(word, line);
        if (blocked) decl.blockedExits.push(blocked);
      } else if (!sawBlank || !line.afterBlank) {
        if (sawBlank) {
          this.diagnostics.error('parse.create-property', `Unrecognized line in \`create\` block: \`${line.raw.trim()}\`.`, lineSpan(line));
          this.pos++;
        } else {
          this.pos++;
          decl.compositions.push(...this.parseCompositionLine(cur, line));
        }
      } else {
        const prose = this.parseProseParagraph(line.indent);
        if (decl.description) {
          // All consecutive bare paragraphs form the description — a later
          // bare paragraph appends as a new paragraph (grammar log 2026-07-10).
          decl.description = {
            ...decl.description,
            text: `${decl.description.text}\n\n${prose.text}`,
            markers: [...decl.description.markers, ...prose.markers],
            span: mergeSpans(decl.description.span, prose.span),
          };
        } else {
          decl.description = prose;
        }
      }
    }

    return decl;
  }

  private finishPlacement(relation: Placement['relation'], c: Cursor, line: Line): Placement {
    const place = this.parseNameRef(c, () => false);
    if (place.words.length === 0) {
      this.diagnostics.error('parse.placement', 'Expected a place name.', lineSpan(line));
    }
    return { kind: 'placement', relation, place, span: lineSpan(line) };
  }

  private parseBlockedExit(direction: string, line: Line): BlockedExitDecl | null {
    // <direction> is blocked [while <condition>]: <phrase-key>
    // (conditional form: grammar log 2026-07-10, Phase B)
    const c = new Cursor(line.tokens, line);
    c.next(); // direction
    c.next(); // is
    c.next(); // blocked
    let condition: ConditionNode | null = null;
    if (c.matchWord('while')) {
      const condTokens: Token[] = [];
      while (!c.atEnd() && c.peek()!.kind !== 'colon') condTokens.push(c.next()!);
      condition = this.parseCondition(new Cursor(condTokens, line), line);
    }
    const colon = c.next();
    if (!colon || colon.kind !== 'colon') {
      this.diagnostics.error('parse.blocked-exit', 'Expected `: <phrase-key>` after `is blocked`.', lineSpan(line));
      return null;
    }
    const key = c.next();
    if (!key || key.kind !== 'word') {
      this.diagnostics.error('parse.blocked-exit', 'Expected a phrase key after `is blocked:`.', lineSpan(line));
      return null;
    }
    return { kind: 'blocked-exit', direction, phraseKey: key.text, condition, span: lineSpan(line) };
  }

  private parseCompositionLine(c: Cursor, line: Line): CompositionItem[] {
    const items: CompositionItem[] = [];
    while (!c.atEnd()) {
      const startTok = c.peek()!;
      let article: string | null = null;
      const first = c.peek();
      if (first && first.kind === 'word' && ARTICLES.has(first.text)) {
        article = first.text;
        c.next();
      }
      const words: string[] = [];
      while (!c.atEnd() && c.peek()!.kind === 'word' && !c.isWord('with') && !c.isWord('while')) {
        if (c.peek()!.kind !== 'word') break;
        words.push(c.next()!.text);
        if (c.peek()?.kind === 'comma') break;
      }
      const config: ConfigSetting[] = [];
      let condition: ConditionNode | null = null;
      if (c.matchWord('with')) {
        config.push(...this.parseConfigSettings(c, line));
      }
      if (c.matchWord('while')) {
        condition = this.parseCondition(c, line);
      }
      const endTok = c.tokens[c.i - 1] ?? startTok;
      if (words.length === 0) {
        this.diagnostics.error('parse.composition', 'Expected a kind or trait name.', lineSpan(line));
        break;
      }
      items.push({
        kind: 'composition',
        article,
        words,
        config,
        condition,
        span: mergeSpans(startTok.span, endTok.span),
      });
      if (c.peek()?.kind === 'comma') c.next();
      else break;
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.composition-trailing', `Unexpected trailing text in composition line: \`${c.peek()!.text}\`.`, c.restSpan());
    }
    return items;
  }

  private parseConfigSettings(c: Cursor, line: Line): ConfigSetting[] {
    const settings: ConfigSetting[] = [];
    for (;;) {
      const startTok = c.peek();
      const key: string[] = [];
      while (!c.atEnd() && c.peek()!.kind === 'word' && !c.isWord('and') && !c.isWord('while')) {
        const t = c.peek()!;
        // An article starts an entity-name value (`with food the handful of
        // feed`, Phase B) — everything after it is the value.
        if (ARTICLES.has(t.text) && key.length > 0) break;
        // Otherwise the last token of a setting is its value; words before
        // it are the key.
        const after = c.peek(1);
        const isValuePosition = !after || after.kind === 'comma' || (after.kind === 'word' && (after.text === 'and' || after.text === 'while'));
        if (isValuePosition && key.length > 0) break;
        key.push(t.text);
        c.next();
      }
      const articleTok = c.peek();
      if (articleTok && articleTok.kind === 'word' && ARTICLES.has(articleTok.text) && key.length > 0) {
        c.next(); // article
        const nameWords: string[] = [];
        let lastTok = articleTok;
        while (!c.atEnd() && c.peek()!.kind === 'word' && !c.isWord('and') && !c.isWord('while')) {
          lastTok = c.next()!;
          nameWords.push(lastTok.text);
        }
        if (nameWords.length === 0) {
          this.diagnostics.error('parse.config-value', 'Expected an entity name after the article.', c.restSpan());
          break;
        }
        settings.push({
          key,
          value: nameWords.join(' '),
          valueKind: 'name',
          span: startTok ? mergeSpans(startTok.span, lastTok.span) : lastTok.span,
        });
        if (!c.matchWord('and')) break;
        continue;
      }
      const valueTok = c.peek();
      if (!valueTok || (valueTok.kind !== 'number' && valueTok.kind !== 'string' && valueTok.kind !== 'word')) {
        this.diagnostics.error('parse.config-value', 'Expected a value to end this `with` setting.', c.restSpan());
        break;
      }
      c.next();
      settings.push({
        key,
        value: valueTok.text,
        valueKind: valueTok.kind as ConfigSetting['valueKind'],
        span: startTok ? mergeSpans(startTok.span, valueTok.span) : valueTok.span,
      });
      if (!c.matchWord('and')) break;
    }
    return settings;
  }

  private parsePhraseOverride(line: Line): PhraseOverride {
    const c = new Cursor(line.tokens, line);
    c.matchWord('phrase');
    const key = c.next()!; // validated by caller
    c.next(); // colon
    let value: TextValue;
    const str = c.peek();
    if (str && str.kind === 'string') {
      c.next();
      this.reportSameLineText(str.span);
      value = this.textFromString(str); // recovery: keep the text so analysis continues
    } else {
      value = this.parseProseParagraph(line.indent + 1, line.indent);
    }
    return { kind: 'phrase-override', key: key.text, value, span: mergeSpans(lineSpan(line), value.span) };
  }

  /** Same-line phrase text (quoted or bare) was removed — grammar log 2026-07-10. */
  private reportSameLineText(span: Span): void {
    this.diagnostics.error(
      'parse.phrase-text-form',
      'Phrase text goes in an indented prose block — the same-line form was removed (grammar log 2026-07-10).',
      span,
    );
  }

  private parseCommaWords(c: Cursor): string[] {
    const out: string[] = [];
    let current: string[] = [];
    while (!c.atEnd()) {
      const t = c.next()!;
      if (t.kind === 'comma') {
        if (current.length) out.push(current.join(' '));
        current = [];
      } else {
        current.push(t.text);
      }
    }
    if (current.length) out.push(current.join(' '));
    return out;
  }

  private parseStateList(c: Cursor): StateName[] {
    const out: StateName[] = [];
    while (!c.atEnd()) {
      const t = c.next()!;
      if (t.kind === 'word') out.push({ name: t.text, span: t.span });
      else if (t.kind !== 'comma') {
        this.diagnostics.error('parse.states', 'Expected a comma-separated list of state names.', t.span);
      }
    }
    return out;
  }

  // ------------------------------------------------------------------ prose

  /**
   * Collect a prose block: consecutive lines at indent >= minIndent. When
   * `strictlyAbove` is given, lines must be indented strictly deeper than it
   * (phrase-entry values, variants, overrides) — and in that mode a blank
   * line starts a new PARAGRAPH (`\n\n` in the text) instead of ending the
   * block (grammar log 2026-07-10), since the block is already delimited by
   * shallower-indented lines. In minIndent mode (create-block descriptions)
   * a blank line still ends the block — the create loop merges consecutive
   * bare paragraphs itself, keeping keyword lines out of prose.
   */
  private parseProseParagraph(minIndent: number, strictlyAbove?: number): TextValue {
    const paragraphs: string[][] = [];
    let current: string[] = [];
    const markers: TextMarker[] = [];
    let span: Span | null = null;
    let first = true;

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const deepEnough = strictlyAbove !== undefined ? line.indent > strictlyAbove : line.indent >= minIndent;
      if (!deepEnough || isEndLine(line)) break;
      if (!first && line.afterBlank) {
        if (strictlyAbove === undefined) break;
        paragraphs.push(current);
        current = [];
      }
      this.pos++;
      const text = line.raw.trim();
      this.extractMarkers(line, markers);
      current.push(text);
      span = span ? mergeSpans(span, lineSpan(line)) : lineSpan(line);
      first = false;
    }
    if (current.length) paragraphs.push(current);

    return {
      kind: 'text',
      form: 'prose',
      text: paragraphs.map((p) => p.join(' ')).join('\n\n'),
      markers,
      span: span ?? spanOf(this.lines[this.pos - 1]?.lineNo ?? 1, 1),
    };
  }

  /**
   * Collect a verbatim block (`define phrase X, verbatim`): every line
   * deeper than the head line, with line structure, interior blank lines,
   * and relative indentation preserved exactly. The common leading indent
   * is stripped; lines join with `\n`.
   */
  private parseVerbatimBlock(): TextValue {
    const collected: Array<{ raw: string; blankBefore: boolean }> = [];
    const markers: TextMarker[] = [];
    let span: Span | null = null;
    let first = true;

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      // Only a column-1 line (`end phrase`, next top-level keyword) ends the
      // block — verbatim content may contain any words, including `end`.
      if (line.indent === 0) break;
      collected.push({ raw: line.raw, blankBefore: !first && line.afterBlank });
      this.extractMarkers(line, markers);
      span = span ? mergeSpans(span, lineSpan(line)) : lineSpan(line);
      this.pos++;
      first = false;
    }

    const common = Math.min(...collected.map((l) => l.raw.length - l.raw.trimStart().length));
    const lines: string[] = [];
    for (const l of collected) {
      if (l.blankBefore) lines.push('');
      lines.push(l.raw.slice(common).trimEnd());
    }

    return {
      kind: 'text',
      form: 'verbatim',
      text: lines.join('\n'),
      markers,
      span: span ?? spanOf(this.lines[this.pos - 1]?.lineNo ?? 1, 1),
    };
  }

  private extractMarkers(line: Line, into: TextMarker[]): void {
    const re = /\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(line.raw)) !== null) {
      into.push({ content: m[1], span: spanOf(line.lineNo, m.index + 1, m[0].length) });
    }
  }

  /** Error-recovery only: a removed same-line quoted value, kept as prose text. */
  private textFromString(tok: Token): TextValue {
    const markers: TextMarker[] = [];
    const re = /\{([^}]*)\}/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(tok.text)) !== null) {
      markers.push({ content: m[1], span: spanOf(tok.span.line, tok.span.column + 1 + m.index, m[0].length) });
    }
    return { kind: 'text', form: 'prose', text: tok.text, markers, span: tok.span };
  }

  // ---------------------------------------------------------------- define

  private parseDefine(): Declaration | null {
    const line = this.lines[this.pos];
    const sub = line.tokens[1];
    const subWord = sub && sub.kind === 'word' ? sub.text : null;
    switch (subWord) {
      case 'condition':
        return this.parseDefineCondition();
      case 'phrase':
        return this.parseDefinePhrase();
      case 'phrases':
        return this.parseDefinePhrases();
      case 'verb':
        return this.parseDefineVerb();
      case 'text':
        return this.parseDefineText();
      case 'flag':
        return this.parseDefineFlag();
      case 'trait':
        return this.parseDefineTrait();
      case 'action':
        return this.parseDefineAction();
      case 'behavior':
        return this.parseDefineBehaviorHatch();
      case 'score':
        return this.parseDefineScore();
      case 'sequence':
        return this.parseDefineSequence();
      default:
        this.diagnostics.error('parse.unknown-define', `Unknown declaration \`define ${subWord ?? ''}\`.`, lineSpan(line));
        this.recoverToTopLevel(true);
        return null;
    }
  }

  private parseDefineCondition(): DefineCondition | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define condition
    const name = c.next();
    if (!name || name.kind !== 'word') {
      this.diagnostics.error('parse.condition-name', 'Expected a condition name after `define condition`.', c.restSpan());
      return null;
    }
    const colon = c.next();
    if (!colon || colon.kind !== 'colon') {
      this.diagnostics.error('parse.condition-colon', 'Expected `:` after the condition name.', c.restSpan());
      return null;
    }
    const condition = this.parseCondition(c, line);
    return { kind: 'define-condition', name: name.text, condition, span: lineSpan(line) };
  }

  private parseDefinePhrase(): DefinePhrase {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define phrase
    const keyTok = c.next();
    const key = keyTok && keyTok.kind === 'word' ? keyTok.text : '';
    if (!key) {
      this.diagnostics.error('parse.phrase-key', 'Expected a phrase key after `define phrase`.', lineSpan(headLine));
    }
    let strategy: string | null = null;
    let verbatim = false;
    if (c.peek()?.kind === 'comma') {
      c.next();
      const s = c.next();
      if (s && s.kind === 'word' && STRATEGIES.has(s.text)) {
        strategy = s.text;
      } else if (s && s.kind === 'word' && s.text === 'verbatim') {
        verbatim = true; // grammar log 2026-07-10: whitespace-preserving text
      } else {
        this.diagnostics.error('parse.phrase-strategy', 'Expected a strategy (randomly, cycling, ordered, once) or `verbatim` after the comma.', s?.span ?? c.restSpan());
      }
    }

    const variants: TextValue[] = [];
    let span = lineSpan(headLine);
    for (;;) {
      const line = this.lines[this.pos];
      if (!line) {
        this.diagnostics.error('parse.unterminated-block', 'Missing `end phrase`.', span);
        break;
      }
      if (isEndLine(line)) {
        span = mergeSpans(span, lineSpan(line));
        this.consumeEnd('phrase', headLine);
        break;
      }
      if (firstWord(line) === 'or' && line.tokens.length === 1) {
        if (verbatim) {
          this.diagnostics.error('parse.verbatim-variants', 'A verbatim phrase has a single text — `or` variants need a strategy instead.', lineSpan(line));
        }
        this.pos++;
        continue;
      }
      if (line.indent === 0 && TOP_KEYWORDS.has(firstWord(line) ?? '')) {
        this.diagnostics.error('parse.unterminated-block', 'Missing `end phrase`.', span);
        break;
      }
      const variant = verbatim ? this.parseVerbatimBlock() : this.parseProseParagraph(1, 0);
      variants.push(variant);
      span = mergeSpans(span, variant.span);
    }

    return { kind: 'define-phrase', key, strategy, verbatim, variants, span };
  }

  private parseDefinePhrases(): DefinePhrases {
    const headLine = this.lines[this.pos++];
    return this.parsePhrasesBlock(headLine, 2);
  }

  /**
   * Parse a phrases block from its header line (`define phrases <locale>` at
   * top level, or `phrases <locale>` inside a trait/action, Phase B). The
   * locale token index distinguishes the two; entries are lines indented
   * deeper than the header.
   */
  private parsePhrasesBlock(headLine: Line, localeTokenIndex: number): DefinePhrases {
    const locTok = headLine.tokens[localeTokenIndex];
    let locale = '';
    if (locTok && locTok.kind === 'word') {
      locale = locTok.text;
    } else {
      this.diagnostics.error('parse.phrases-locale', 'Expected a locale after `phrases` (e.g. en-US).', lineSpan(headLine));
    }

    const entries: PhraseEntry[] = [];
    let span = lineSpan(headLine);
    while (this.pos < this.lines.length && this.lines[this.pos].indent > headLine.indent) {
      const line = this.lines[this.pos];
      const key = line.tokens[0];
      const colon = line.tokens[1];
      if (!key || key.kind !== 'word' || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.phrase-entry', 'Expected `key: <text>` in the phrases block.', lineSpan(line));
        this.pos++;
        continue;
      }
      this.pos++;
      let value: TextValue;
      const inline = line.tokens[2];
      if (inline && inline.kind === 'string') {
        this.reportSameLineText(inline.span);
        value = this.textFromString(inline); // recovery: keep the text so analysis continues
      } else if (inline) {
        // Same-line bare text after the colon — removed with the quoted form.
        this.reportSameLineText(inline.span);
        const colonAt = line.raw.indexOf(':');
        const text = line.raw.slice(colonAt + 1).trim();
        const markers: TextMarker[] = [];
        this.extractMarkers(line, markers);
        value = { kind: 'text', form: 'prose', text, markers, span: lineSpan(line) };
      } else {
        value = this.parseProseParagraph(line.indent + 1, line.indent);
        if (value.text === '') {
          this.diagnostics.error('parse.phrase-entry-empty', `Phrase \`${key.text}\` has no text.`, lineSpan(line));
        }
      }
      entries.push({ key: key.text, value, span: mergeSpans(lineSpan(line), value.span) });
      span = mergeSpans(span, entries[entries.length - 1].span);
    }

    return { kind: 'define-phrases', locale, entries, span };
  }

  private parseDefineVerb(): DefineVerb | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define verb
    const verbs: string[] = [];
    for (;;) {
      const v = c.next();
      if (!v || v.kind !== 'word') {
        this.diagnostics.error('parse.verb-name', 'Expected a verb word.', v?.span ?? c.restSpan());
        return null;
      }
      verbs.push(v.text);
      if (!c.matchWord('or')) break;
    }
    if (!c.matchWord('means')) {
      this.diagnostics.error('parse.verb-means', 'Expected `means <pattern>` in the verb definition.', c.restSpan());
      return null;
    }
    const pattern: PatternPart[] = [];
    while (!c.atEnd()) {
      const t = c.next()!;
      if (t.kind === 'lparen') {
        const slot = c.next();
        const close = c.next();
        if (!slot || slot.kind !== 'word' || !close || close.kind !== 'rparen') {
          this.diagnostics.error('parse.verb-slot', 'Expected `(something)` slot in the verb pattern.', t.span);
          return null;
        }
        pattern.push({ kind: 'slot', word: slot.text, span: mergeSpans(t.span, close.span) });
      } else if (t.kind === 'word') {
        pattern.push({ kind: 'word', word: t.text, span: t.span });
      } else {
        this.diagnostics.error('parse.verb-pattern', `Unexpected \`${t.text}\` in the verb pattern.`, t.span);
      }
    }
    return { kind: 'define-verb', verbs, pattern, span: lineSpan(line) };
  }

  private parseDefineText(): DefineText | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define text
    const name = c.next();
    if (!name || name.kind !== 'word') {
      this.diagnostics.error('parse.text-name', 'Expected a producer name after `define text`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('from')) {
      this.diagnostics.error('parse.text-from', 'Expected `from "<module>"` in the hatch declaration.', c.restSpan());
      return null;
    }
    const mod = c.next();
    if (!mod || mod.kind !== 'string') {
      this.diagnostics.error('parse.text-module', 'Expected a quoted module path after `from`.', c.restSpan());
      return null;
    }
    return { kind: 'define-text', name: name.text, modulePath: mod.text, span: lineSpan(line) };
  }

  private parseDefineFlag(): DefineFlag | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define flag
    const name = c.next();
    if (!name || name.kind !== 'word') {
      this.diagnostics.error('parse.flag-name', 'Expected a flag name after `define flag`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('starts')) {
      this.diagnostics.error('parse.flag-starts', 'Expected `starts <value>` in the flag declaration.', c.restSpan());
      return null;
    }
    const value = c.next();
    if (!value) {
      this.diagnostics.error('parse.flag-value', 'Expected an initial value after `starts`.', c.restSpan());
      return null;
    }
    return { kind: 'define-flag', name: name.text, initial: value.text, span: lineSpan(line) };
  }

  // -------------------------------------------- Phase B declarations (§2.2/§2.3/§2.5)

  /** `define trait <name>` … `end trait` — data, phrases, on-clauses. */
  private parseDefineTrait(): DefineTrait | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define trait
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.trait-name', 'Expected a trait name after `define trait`.', c.restSpan());
      return null;
    }

    const data: TraitField[] = [];
    let phrases: DefinePhrases | null = null;
    const onClauses: OnClause[] = [];

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent === 0) {
        if (isEndLine(line)) break;
        this.diagnostics.error('parse.unterminated-block', 'Missing `end trait`.', lineSpan(headLine));
        return { kind: 'define-trait', name: nameTok.text, data, phrases, onClauses, span: lineSpan(headLine) };
      }
      const word = firstWord(line);
      if (word === 'data' && line.tokens.length === 1) {
        this.pos++;
        data.push(...this.parseTraitFields(line));
      } else if (word === 'phrases') {
        this.pos++;
        phrases = this.parsePhrasesBlock(line, 1);
      } else if (word === 'on') {
        onClauses.push(this.parseOnClause(line.indent));
      } else {
        this.diagnostics.error('parse.trait-section', `Unrecognized line in \`define trait\`: \`${line.raw.trim()}\` — expected data, phrases, or an \`on\` clause.`, lineSpan(line));
        this.pos++;
      }
    }
    const endSpan = this.consumeEnd('trait', headLine);
    return { kind: 'define-trait', name: nameTok.text, data, phrases, onClauses, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /** `data` block fields: `locked: flag`, `body part: optional name`, `kind: one of a, b`. */
  private parseTraitFields(dataLine: Line): TraitField[] {
    const fields: TraitField[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > dataLine.indent) {
      const line = this.lines[this.pos++];
      const c = new Cursor(line.tokens, line);
      const name: string[] = [];
      while (!c.atEnd() && c.peek()!.kind === 'word') name.push(c.next()!.text);
      const colon = c.next();
      if (name.length === 0 || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.trait-field', 'Expected `<field>: <type>` in the data block.', lineSpan(line));
        continue;
      }
      const optional = !!c.matchWord('optional');
      let type: TraitField['type'] | null = null;
      let oneOf: string[] | null = null;
      if (c.isWord('one') && c.isWord('of', 1)) {
        c.next();
        c.next();
        type = 'one-of';
        oneOf = [];
        while (!c.atEnd()) {
          const t = c.next()!;
          if (t.kind === 'word') oneOf.push(t.text);
          else if (t.kind !== 'comma') break;
        }
        if (oneOf.length === 0) {
          this.diagnostics.error('parse.trait-field-oneof', 'Expected members after `one of`.', c.restSpan());
        }
      } else {
        const typeTok = c.next();
        if (typeTok && typeTok.kind === 'word' && ['flag', 'entity', 'number', 'name'].includes(typeTok.text)) {
          type = typeTok.text as TraitField['type'];
        } else {
          this.diagnostics.error('parse.trait-field-type', 'Expected a field type: flag, entity, number, name, or `one of …`.', typeTok?.span ?? c.restSpan());
          continue;
        }
      }
      let initial: string | null = null;
      if (c.peek()?.kind === 'comma') {
        c.next();
        if (c.matchWord('starts')) {
          const v = c.next();
          if (v) initial = v.text;
          else this.diagnostics.error('parse.trait-field-starts', 'Expected a value after `starts`.', c.restSpan());
        } else {
          this.diagnostics.error('parse.trait-field-starts', 'Expected `starts <value>` after the comma.', c.restSpan());
        }
      }
      fields.push({ name, type: type!, optional, initial, oneOf, span: lineSpan(line) });
    }
    return fields;
  }

  /** `define action <name>` — dispatch declaration (dedent-terminated) or `from "<mod>"` hatch. */
  private parseDefineAction(): DefineAction | DefineHatch | null {
    const headLine = this.lines[this.pos];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define action
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.action-name', 'Expected an action name after `define action`.', c.restSpan());
      this.pos++;
      return null;
    }
    if (c.isWord('from')) {
      return this.parseHatchTail(headLine, c, 'action', nameTok.text);
    }
    this.pos++;

    const patterns: ActionPattern[] = [];
    const constraints: ScopeConstraint[] = [];
    const refusals: ActionRefusal[] = [];
    let otherwise: DefineAction['otherwise'] = null;
    let phrases: DefinePhrases | null = null;
    const body: Statement[] = [];
    let span = lineSpan(headLine);

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent === 0) break; // dedent-terminated (no `end action`, design.md §2.3/§3.4)
      const word = firstWord(line);
      if (word === 'grammar' && line.tokens.length === 1) {
        this.pos++;
        patterns.push(...this.parseActionPatterns(line));
      } else if (word === 'the' && line.tokens.some((t) => t.kind === 'word' && t.text === 'must')) {
        this.pos++;
        const sc = this.parseScopeConstraint(line);
        if (sc) constraints.push(sc);
      } else if (word === 'refuse' && (line.tokens[1]?.text === 'without' || line.tokens[1]?.text === 'when')) {
        this.pos++;
        const r = this.parseActionRefusal(line);
        if (r) refusals.push(r);
      } else if (word === 'otherwise') {
        this.pos++;
        const oc = new Cursor(line.tokens, line);
        oc.next();
        if (!oc.matchWord('refuse')) {
          this.diagnostics.error('parse.action-otherwise', 'Expected `otherwise refuse <phrase-key>`.', lineSpan(line));
        } else {
          const key = oc.next();
          if (key && key.kind === 'word') otherwise = { phraseKey: key.text, span: lineSpan(line) };
          else this.diagnostics.error('parse.action-otherwise', 'Expected a phrase key after `otherwise refuse`.', oc.restSpan());
        }
      } else if (word === 'phrases') {
        this.pos++;
        phrases = this.parsePhrasesBlock(line, 1);
      } else {
        const stmt = this.parseStatement(line, 'action');
        if (stmt) body.push(stmt);
      }
      span = mergeSpans(span, lineSpan(line));
    }

    return { kind: 'define-action', name: nameTok.text, patterns, constraints, refusals, otherwise, phrases, body, span };
  }

  /** grammar-block pattern lines: words + `:slot`s, optional `→ each …` cardinality. */
  private parseActionPatterns(grammarLine: Line): ActionPattern[] {
    const patterns: ActionPattern[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > grammarLine.indent) {
      const line = this.lines[this.pos++];
      const parts: PatternPart[] = [];
      let cardinality: string[] | null = null;
      const c = new Cursor(line.tokens, line);
      while (!c.atEnd()) {
        const t = c.next()!;
        if (t.kind === 'punct' && t.text === '→') {
          cardinality = [];
          while (!c.atEnd()) cardinality.push(c.next()!.text);
          break;
        }
        if (t.kind === 'colon') {
          const slot = c.next();
          if (slot && slot.kind === 'word') {
            parts.push({ kind: 'slot', word: slot.text, span: mergeSpans(t.span, slot.span) });
          } else {
            this.diagnostics.error('parse.action-slot', 'Expected a slot name after `:`.', t.span);
          }
        } else if (t.kind === 'word') {
          parts.push({ kind: 'word', word: t.text, span: t.span });
        } else {
          this.diagnostics.error('parse.action-pattern', `Unexpected \`${t.text}\` in a grammar pattern.`, t.span);
        }
      }
      if (parts.length === 0) {
        this.diagnostics.error('parse.action-pattern', 'Empty grammar pattern.', lineSpan(line));
        continue;
      }
      patterns.push({ parts, cardinality, span: lineSpan(line) });
    }
    return patterns;
  }

  /** `the <slot> must be <requirement>` */
  private parseScopeConstraint(line: Line): ScopeConstraint | null {
    const c = new Cursor(line.tokens, line);
    c.next(); // the
    const slot = c.next();
    if (!slot || slot.kind !== 'word') {
      this.diagnostics.error('parse.action-constraint', 'Expected a slot name after `the`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('must') || !c.matchWord('be')) {
      this.diagnostics.error('parse.action-constraint', 'Expected `must be <requirement>`.', c.restSpan());
      return null;
    }
    const req = c.next();
    if (!req || req.kind !== 'word') {
      this.diagnostics.error('parse.action-constraint', 'Expected a requirement word (reachable, visible, …).', c.restSpan());
      return null;
    }
    return { slot: slot.text, requirement: req.text, span: lineSpan(line) };
  }

  /** `refuse without <slot>: <key>` / `refuse when <condition>: <key>` */
  private parseActionRefusal(line: Line): ActionRefusal | null {
    const c = new Cursor(line.tokens, line);
    c.next(); // refuse
    const form = c.next()!.text as 'without' | 'when';
    if (form === 'without') {
      const slot = c.next();
      const colon = c.next();
      const key = c.next();
      if (!slot || slot.kind !== 'word' || !colon || colon.kind !== 'colon' || !key || key.kind !== 'word') {
        this.diagnostics.error('parse.action-refusal', 'Expected `refuse without <slot>: <phrase-key>`.', lineSpan(line));
        return null;
      }
      return { kind: 'without', slot: slot.text, condition: null, phraseKey: key.text, span: lineSpan(line) };
    }
    // when: condition runs to the LAST colon; the key follows it.
    const colonIndex = line.tokens.map((t) => t.kind === 'colon').lastIndexOf(true);
    if (colonIndex === -1 || colonIndex !== line.tokens.length - 2) {
      this.diagnostics.error('parse.action-refusal', 'Expected `refuse when <condition>: <phrase-key>`.', lineSpan(line));
      return null;
    }
    const condCursor = new Cursor(line.tokens.slice(2, colonIndex), line);
    const condition = this.parseCondition(condCursor, line);
    const key = line.tokens[colonIndex + 1];
    if (!key || key.kind !== 'word') {
      this.diagnostics.error('parse.action-refusal', 'Expected a phrase key after the colon.', lineSpan(line));
      return null;
    }
    return { kind: 'when', slot: null, condition, phraseKey: key.text, span: lineSpan(line) };
  }

  /** `define behavior <name> from "<module>"` — CapabilityBehavior hatch. */
  private parseDefineBehaviorHatch(): DefineHatch | null {
    const line = this.lines[this.pos];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define behavior
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.behavior-name', 'Expected a behavior name after `define behavior`.', c.restSpan());
      this.pos++;
      return null;
    }
    return this.parseHatchTail(line, c, 'behavior', nameTok.text);
  }

  /** Shared `from "<module>"` tail for action/behavior hatches. */
  private parseHatchTail(line: Line, c: Cursor, hatchKind: 'action' | 'behavior', name: string): DefineHatch | null {
    this.pos++;
    if (!c.matchWord('from')) {
      this.diagnostics.error('parse.hatch-from', 'Expected `from "<module>"` in the hatch declaration.', c.restSpan());
      return null;
    }
    const mod = c.next();
    if (!mod || mod.kind !== 'string') {
      this.diagnostics.error('parse.hatch-module', 'Expected a quoted module path after `from`.', c.restSpan());
      return null;
    }
    return { kind: 'define-hatch', hatchKind, name, modulePath: mod.text, span: lineSpan(line) };
  }

  /** `define score <name> worth <n>` */
  private parseDefineScore(): DefineScore | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define score
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.score-name', 'Expected a score name after `define score`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('worth')) {
      this.diagnostics.error('parse.score-worth', 'Expected `worth <number>` in the score declaration.', c.restSpan());
      return null;
    }
    const worth = c.next();
    if (!worth || worth.kind !== 'number') {
      this.diagnostics.error('parse.score-worth', 'Expected a number after `worth`.', c.restSpan());
      return null;
    }
    return { kind: 'define-score', name: nameTok.text, worth: Number(worth.text), span: lineSpan(line) };
  }

  /** `once <condition>` … `end once` — fires once, then retires (§3.3). */
  private parseOnce(): OnceRule | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('once');
    if (c.atEnd()) {
      this.diagnostics.error('parse.once-condition', 'Expected a condition after `once`.', lineSpan(headLine));
      return null;
    }
    const condition = this.parseCondition(c, headLine);
    const body = this.parseStatements(headLine.indent, 'once');
    const endSpan = this.consumeEnd('once', headLine);
    return { kind: 'once-rule', condition, body, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /** `every <n> turns [, <m> times]` … `end every` — recurring daemon (§2.5). */
  private parseEvery(): EveryRule | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('every');
    const n = c.next();
    if (!n || n.kind !== 'number' || !c.matchWord('turns')) {
      this.diagnostics.error('parse.every-turns', 'Expected `every <number> turns`.', lineSpan(headLine));
      return null;
    }
    let times: number | null = null;
    if (c.peek()?.kind === 'comma') {
      c.next();
      const m = c.next();
      if (m && m.kind === 'number' && c.matchWord('times')) {
        times = Number(m.text);
      } else {
        this.diagnostics.error('parse.every-times', 'Expected `<number> times` after the comma.', c.restSpan());
      }
    }
    const body = this.parseStatements(headLine.indent, 'every');
    const endSpan = this.consumeEnd('every', headLine);
    return { kind: 'every-rule', turns: Number(n.text), times, body, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /** `define sequence <name>` … steps … `end sequence` — timeline (§2.5/§3.3). */
  private parseDefineSequence(): DefineSequence | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define sequence
    const name: string[] = [];
    while (!c.atEnd() && c.peek()!.kind === 'word') name.push(c.next()!.text);
    if (name.length === 0) {
      this.diagnostics.error('parse.sequence-name', 'Expected a sequence name after `define sequence`.', c.restSpan());
    }

    const steps: SequenceStep[] = [];
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent === 0) break;
      const sc = new Cursor(line.tokens, line);
      let timing: SequenceStep['timing'] | null = null;
      let turns = 0;
      if (sc.matchWord('at') && sc.isWord('turn')) {
        sc.next();
        const n = sc.next();
        if (n && n.kind === 'number') {
          timing = 'at-turn';
          turns = Number(n.text);
        }
      } else if (line.tokens[0]?.kind === 'number' && line.tokens[1]?.text === 'turns' && line.tokens[2]?.text === 'later') {
        timing = 'later';
        turns = Number(line.tokens[0].text);
      }
      if (!timing) {
        this.diagnostics.error('parse.sequence-step', 'Expected `at turn <n>` or `<n> turns later` to open a sequence step.', lineSpan(line));
        this.pos++;
        continue;
      }
      this.pos++;
      const body = this.parseStatements(line.indent, 'sequence');
      steps.push({ kind: 'sequence-step', timing, turns, body, span: lineSpan(line) });
    }
    const endSpan = this.consumeEnd('sequence', headLine);
    return { kind: 'define-sequence', name, steps, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  // ------------------------------------------------------------------ when

  private parseWhen(): WhenRule {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('when');

    const headerWords: string[] = [];
    let headerSpan: Span | null = null;
    while (!c.atEnd() && !c.isWord('while')) {
      const t = c.next()!;
      headerWords.push(t.text);
      headerSpan = headerSpan ? mergeSpans(headerSpan, t.span) : t.span;
    }
    if (headerWords.length === 0) {
      this.diagnostics.error('parse.when-header', 'Expected an event header after `when`.', lineSpan(headLine));
    }

    let condition: ConditionNode | null = null;
    if (c.matchWord('while')) {
      condition = this.parseCondition(c, headLine);
    }

    const body = this.parseStatements(headLine.indent, 'when');
    const endSpan = this.consumeEnd('when', headLine);

    return {
      kind: 'when-rule',
      headerWords,
      headerSpan: headerSpan ?? lineSpan(headLine),
      condition,
      body,
      span: mergeSpans(lineSpan(headLine), endSpan),
    };
  }

  // ------------------------------------------------------------- on clause

  private parseOnClause(indent: number): OnClause {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('on');
    const action = c.next();
    let actionWord = '';
    if (action && action.kind === 'word') {
      actionWord = action.text;
    } else {
      this.diagnostics.error('parse.on-action', 'Expected an action word after `on`.', lineSpan(headLine));
    }

    let binding: OnClause['binding'] = 'it';
    let role: string | null = null;
    let condition: ConditionNode | null = null;
    let ordering: OnClause['ordering'] = null;

    if (actionWord === 'every' && c.isWord('turn')) {
      // `on every turn [while <condition>]` (design.md §3.3, NPC-behavior shape).
      c.next();
      binding = 'every-turn';
      actionWord = 'every-turn';
      if (c.matchWord('while')) {
        condition = this.parseCondition(c, headLine);
      }
    } else if (c.matchWord('anything')) {
      // `on <action> anything as the <role>` (design.md §2.2 role binding).
      binding = 'role';
      if (!c.matchWord('as') || !c.matchWord('the')) {
        this.diagnostics.error('parse.on-role', 'Expected `as the <role>` after `anything`.', c.restSpan());
      }
      const roleTok = c.next();
      if (roleTok && roleTok.kind === 'word') {
        role = roleTok.text;
      } else {
        this.diagnostics.error('parse.on-role', 'Expected a role name after `as the`.', c.restSpan());
      }
    } else {
      if (!c.matchWord('it')) {
        this.diagnostics.error('parse.on-target', 'Expected `it`, `anything as the <role>`, or `every turn` in the `on` header.', c.restSpan());
      }
      // `, before <trait>` / `, after <trait>` explicit ordering (§2.2).
      if (c.peek()?.kind === 'comma') {
        c.next();
        const rel = c.next();
        const traitTok = c.next();
        if (rel && (rel.text === 'before' || rel.text === 'after') && traitTok && traitTok.kind === 'word') {
          ordering = { relation: rel.text as 'before' | 'after', trait: traitTok.text };
        } else {
          this.diagnostics.error('parse.on-ordering', 'Expected `before <trait>` or `after <trait>` after the comma.', c.restSpan());
        }
      }
    }

    const body = this.parseStatements(headLine.indent, 'on');
    const endSpan = this.consumeEnd('on', headLine);

    return {
      kind: 'on-clause',
      action: actionWord,
      binding,
      role,
      condition,
      ordering,
      body,
      span: mergeSpans(lineSpan(headLine), endSpan),
    };
  }

  // ------------------------------------------------------------ statements

  /**
   * Parse statement lines until an `end`/`else`/`or`/`when`-arm boundary at
   * or below `openIndent` is reached. The terminator line is NOT consumed.
   */
  private parseStatements(openIndent: number, blockKeyword: string): Statement[] {
    const body: Statement[] = [];
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= openIndent) break;
      if (isEndLine(line) || ((firstWord(line) === 'else' || firstWord(line) === 'or') && line.tokens.length === 1)) break;
      const stmt = this.parseStatement(line, blockKeyword);
      if (stmt) body.push(stmt);
    }
    return body;
  }

  private parseStatement(line: Line, blockKeyword: string): Statement | null {
    const word = firstWord(line);
    const c = new Cursor(line.tokens, line);

    if (word && ORDINALS[word] !== undefined && c.isWord('time', 1)) {
      return this.parseOrdinalBlock(line);
    }

    switch (word) {
      case 'refuse':
      case 'phrase': {
        this.pos++;
        c.next();
        const key = this.readDottedKey(c);
        if (!key) {
          this.diagnostics.error('parse.phrase-ref', `Expected a phrase key after \`${word}\`.`, c.restSpan());
          return null;
        }
        const params = this.parseParams(c, line);
        if (word === 'refuse') {
          return { kind: 'refuse', phraseKey: key, params, span: lineSpan(line) } as RefuseStmt;
        }
        // Declare-and-emit sugar (§2.6/§3.3): a deeper-indented bare prose
        // block after `phrase <key>` registers the text under the key.
        let inlineText: TextValue | null = null;
        const next = this.lines[this.pos];
        if (next && next.indent > line.indent && !isStatementLine(next)) {
          inlineText = this.parseProseParagraph(line.indent + 1, line.indent);
        }
        const span = inlineText ? mergeSpans(lineSpan(line), inlineText.span) : lineSpan(line);
        return { kind: 'phrase', phraseKey: key, params, inlineText, span } as PhraseStmt;
      }
      case 'emit': {
        this.pos++;
        c.next();
        const event: string[] = [];
        while (!c.atEnd()) event.push(c.next()!.text);
        if (event.length === 0) {
          this.diagnostics.error('parse.emit', 'Expected an event name after `emit`.', lineSpan(line));
          return null;
        }
        return { kind: 'emit', event, span: lineSpan(line) } as EmitStmt;
      }
      case 'set': {
        this.pos++;
        c.next();
        const target = this.parseValueExpr(c, line, new Set(['to']));
        if (!c.matchWord('to')) {
          this.diagnostics.error('parse.set-to', 'Expected `to <value>` in the `set` statement.', c.restSpan());
          return null;
        }
        const value = this.parseValueExpr(c, line, new Set());
        return { kind: 'set', target, value, span: lineSpan(line) } as SetStmt;
      }
      case 'change': {
        this.pos++;
        c.next();
        const entity = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'to');
        if (!c.matchWord('to')) {
          this.diagnostics.error('parse.change-to', 'Expected `to <state>` in the `change` statement.', c.restSpan());
          return null;
        }
        const state = c.next();
        if (!state || state.kind !== 'word') {
          this.diagnostics.error('parse.change-state', 'Expected a state name after `to`.', c.restSpan());
          return null;
        }
        return { kind: 'change', entity, state: state.text, span: lineSpan(line) } as ChangeStmt;
      }
      case 'move': {
        this.pos++;
        c.next();
        const entity = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'to');
        if (!c.matchWord('to')) {
          this.diagnostics.error('parse.move-to', 'Expected `to <place>` in the `move` statement.', c.restSpan());
          return null;
        }
        const place = this.parseNameRef(c, () => false);
        return { kind: 'move', entity, place, span: lineSpan(line) } as MoveStmt;
      }
      case 'award': {
        this.pos++;
        c.next();
        const expression: string[] = [];
        let once = false;
        while (!c.atEnd()) {
          const t = c.next()!;
          if (t.kind === 'comma' && c.isWord('once')) {
            c.next();
            once = true;
            break;
          }
          expression.push(t.text);
        }
        return { kind: 'award', expression, once, span: lineSpan(line) } as AwardStmt;
      }
      case 'win':
      case 'lose': {
        this.pos++;
        c.next();
        const key = c.peek();
        let phraseKey: string | null = null;
        if (key && key.kind === 'word') {
          phraseKey = key.text;
          c.next();
        }
        return { kind: word, phraseKey, span: lineSpan(line) } as Statement;
      }
      case 'if':
        return this.parseIf(line);
      case 'select':
        return this.parseSelect(line);
      default:
        this.diagnostics.error(
          'parse.unknown-statement',
          `Unknown statement \`${word ?? line.raw.trim()}\` in \`${blockKeyword}\` block.`,
          lineSpan(line),
        );
        this.pos++;
        return null;
    }
  }

  /**
   * Read a phrase key: a word, optionally continued by `.`-joined words
   * (`zoo.pa.closing-3`, design.md §3.3). Returns null when no word follows.
   */
  private readDottedKey(c: Cursor): string | null {
    const first = c.peek();
    if (!first || first.kind !== 'word') return null;
    c.next();
    let key = first.text;
    while (c.peek()?.kind === 'punct' && c.peek()!.text === '.' && c.peek(1)?.kind === 'word') {
      c.next();
      key += '.' + c.next()!.text;
    }
    return key;
  }

  private parseParams(c: Cursor, line: Line): ParamBinding[] {
    const params: ParamBinding[] = [];
    while (c.matchWord('with')) {
      const start = c.peek();
      const param: string[] = [];
      while (!c.atEnd() && !(c.peek()!.kind === 'punct' && c.peek()!.text === '=')) {
        param.push(c.next()!.text);
      }
      const eq = c.next();
      if (!eq) {
        this.diagnostics.error('parse.param-eq', 'Expected `= <value>` in the `with` binding.', c.restSpan());
        break;
      }
      const value = this.parseValueExpr(c, line, new Set(['with']));
      params.push({ param, value, span: start ? mergeSpans(start.span, value.span) : value.span });
    }
    return params;
  }

  private parseOrdinalBlock(headLine: Line): OrdinalBlock {
    this.pos++;
    const word = firstWord(headLine)!;
    const body: Statement[] = [];
    let span = lineSpan(headLine);
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= headLine.indent) break;
      if (isEndLine(line)) break;
      const stmt = this.parseStatement(line, 'ordinal');
      if (stmt) {
        body.push(stmt);
        span = mergeSpans(span, stmt.span);
      }
    }
    return { kind: 'ordinal', ordinal: ORDINALS[word], ordinalWord: word, body, span };
  }

  private parseIf(headLine: Line): IfStmt | null {
    this.pos++;
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('if');

    // Condition runs to the trailing `then`.
    const thenIndex = headLine.tokens.map((t) => t.kind === 'word' && t.text === 'then').lastIndexOf(true);
    if (thenIndex === -1) {
      this.diagnostics.error('parse.if-then', 'Expected `then` at the end of the `if` line.', lineSpan(headLine));
      return null;
    }
    const condCursor = new Cursor(headLine.tokens.slice(1, thenIndex), headLine);
    const condition = this.parseCondition(condCursor, headLine);

    const thenBody = this.parseStatements(headLine.indent, 'if');
    let elseBody: Statement[] | null = null;
    const elseLine = this.lines[this.pos];
    if (elseLine && firstWord(elseLine) === 'else' && elseLine.indent === headLine.indent) {
      this.pos++;
      elseBody = this.parseStatements(headLine.indent, 'if');
    }
    const endSpan = this.consumeEnd('if', headLine);

    return { kind: 'if', condition, then: thenBody, else: elseBody, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  private parseSelect(headLine: Line): SelectOnStmt | SelectStrategyStmt | null {
    this.pos++;
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('select');

    if (c.matchWord('on')) {
      const subject = this.parseValueExpr(c, headLine, new Set());
      const arms: SelectArm[] = [];
      while (this.pos < this.lines.length) {
        const line = this.lines[this.pos];
        if (line.indent <= headLine.indent) break;
        if (firstWord(line) === 'when') {
          this.pos++;
          const armCursor = new Cursor(line.tokens, line);
          armCursor.next();
          const valueTok = armCursor.next();
          if (!valueTok || valueTok.kind !== 'word') {
            this.diagnostics.error('parse.select-arm', 'Expected a value after `when` in the select arm.', lineSpan(line));
            continue;
          }
          const body = this.parseStatements(line.indent, 'select');
          arms.push({ value: valueTok.text, body, span: lineSpan(line) });
        } else {
          this.diagnostics.error('parse.select-body', `Expected \`when <value>\` arm in \`select on\`, got \`${line.raw.trim()}\`.`, lineSpan(line));
          this.pos++;
        }
      }
      const endSpan = this.consumeEnd('select', headLine);
      return { kind: 'select-on', subject, arms, span: mergeSpans(lineSpan(headLine), endSpan) };
    }

    const strategyTok = c.next();
    if (!strategyTok || strategyTok.kind !== 'word' || !STRATEGIES.has(strategyTok.text)) {
      this.diagnostics.error('parse.select-strategy', 'Expected `on <value>` or a strategy (randomly, cycling, ordered, once) after `select`.', strategyTok?.span ?? lineSpan(headLine));
      this.recoverPastEndNested('select', headLine.indent);
      return null;
    }
    const alternatives: Statement[][] = [];
    for (;;) {
      alternatives.push(this.parseStatements(headLine.indent, 'select'));
      const line = this.lines[this.pos];
      if (line && firstWord(line) === 'or' && line.tokens.length === 1 && line.indent === headLine.indent) {
        this.pos++;
        continue;
      }
      break;
    }
    const endSpan = this.consumeEnd('select', headLine);
    return { kind: 'select-strategy', strategy: strategyTok.text, alternatives, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /** Consume the expected `end <keyword>` line; diagnose a mismatch or absence. */
  private consumeEnd(keyword: string, openLine: Line): Span {
    const line = this.lines[this.pos];
    if (line && isEndLine(line)) {
      this.pos++;
      const kw = line.tokens[1];
      if (!kw || kw.kind !== 'word' || kw.text !== keyword) {
        this.diagnostics.error(
          'parse.end-mismatch',
          `Expected \`end ${keyword}\` to close the block opened at line ${openLine.lineNo}, got \`${line.raw.trim()}\`.`,
          lineSpan(line),
        );
      }
      return lineSpan(line);
    }
    this.diagnostics.error(
      'parse.unterminated-block',
      `Missing \`end ${keyword}\` for the block opened at line ${openLine.lineNo}.`,
      line ? lineSpan(line) : lineSpan(openLine),
    );
    return line ? lineSpan(line) : lineSpan(openLine);
  }

  /** Error recovery inside statement blocks: skip past a nested `end` at the open indent. */
  private recoverPastEndNested(keyword: string, openIndent: number): void {
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= openIndent && isEndLine(line)) {
        this.pos++;
        return;
      }
      if (line.indent === 0 && TOP_KEYWORDS.has(firstWord(line) ?? '')) return;
      this.pos++;
    }
  }

  // ----------------------------------------------------------- expressions

  /** Parse a name reference: optional article + words until a stop. */
  private parseNameRef(c: Cursor, stop: (t: Token) => boolean): NameRef {
    let article: string | null = null;
    const first = c.peek();
    let span: Span | null = first ? first.span : null;
    if (first && first.kind === 'word' && ARTICLES.has(first.text)) {
      article = first.text;
      c.next();
    }
    const words: string[] = [];
    while (!c.atEnd()) {
      const t = c.peek()!;
      if (t.kind !== 'word' && t.kind !== 'number') break;
      if (stop(t)) break;
      words.push(t.text);
      span = span ? mergeSpans(span, t.span) : t.span;
      c.next();
    }
    return { kind: 'name', article, words, span: span ?? spanOf(c.line.lineNo, 1) };
  }

  /**
   * Parse a value expression: literal, name reference, or possessive chain
   * (`the player's location`, `its state`). Stops at PHRASE_STOPS or any
   * word in `extraStops`.
   */
  private parseValueExpr(c: Cursor, line: Line, extraStops: Set<string>): ValueExpr {
    const first = c.peek();
    if (!first) {
      this.diagnostics.error('parse.value', 'Expected a value.', lineSpan(line));
      return { kind: 'bare', words: [], span: lineSpan(line) };
    }
    if (first.kind === 'number' || first.kind === 'string') {
      c.next();
      return { kind: 'literal', value: first.text, literalKind: first.kind, span: first.span };
    }

    // `its <field>` — possessive on `it`.
    if (first.kind === 'word' && first.text === 'its') {
      c.next();
      const field = this.collectWords(c, extraStops);
      const base: ValueExpr = { kind: 'ref', ref: { kind: 'name', article: null, words: ['it'], span: first.span }, span: first.span };
      return { kind: 'possessive', base, field: field.words, span: mergeSpans(first.span, field.span ?? first.span) };
    }

    let article: string | null = null;
    let span: Span = first.span;
    if (first.kind === 'word' && ARTICLES.has(first.text)) {
      article = first.text;
      c.next();
    }

    const words: string[] = [];
    let possessiveBase: string | null = null;
    while (!c.atEnd()) {
      const t = c.peek()!;
      if (t.kind !== 'word') break;
      if (PHRASE_STOPS.has(t.text) || extraStops.has(t.text)) break;
      c.next();
      span = mergeSpans(span, t.span);
      const poss = /^(.*)'s$/.exec(t.text);
      if (poss) {
        words.push(poss[1]);
        possessiveBase = poss[1];
        break;
      }
      words.push(t.text);
    }

    if (words.length === 0) {
      this.diagnostics.error('parse.value', 'Expected a value.', first.span);
      return { kind: 'bare', words: [], span: first.span };
    }

    const refExpr: ValueExpr = {
      kind: 'ref',
      ref: { kind: 'name', article, words, span },
      span,
    };

    if (possessiveBase !== null) {
      const field = this.collectWords(c, extraStops);
      return { kind: 'possessive', base: refExpr, field: field.words, span: mergeSpans(span, field.span ?? span) };
    }
    return refExpr;
  }

  private collectWords(c: Cursor, extraStops: Set<string>): { words: string[]; span: Span | null } {
    const words: string[] = [];
    let span: Span | null = null;
    while (!c.atEnd()) {
      const t = c.peek()!;
      if (t.kind !== 'word' || PHRASE_STOPS.has(t.text) || extraStops.has(t.text)) break;
      words.push(t.text);
      span = span ? mergeSpans(span, t.span) : t.span;
      c.next();
    }
    return { words, span };
  }

  // ------------------------------------------------------------ conditions

  /** `or`-composed condition (lowest precedence). */
  private parseCondition(c: Cursor, line: Line): ConditionNode {
    const left = this.parseConditionAnd(c, line);
    if (!c.isWord('or')) return left;
    const operands = [left];
    let span = left.span;
    while (c.matchWord('or')) {
      const right = this.parseConditionAnd(c, line);
      operands.push(right);
      span = mergeSpans(span, right.span);
    }
    return { kind: 'or', operands, span };
  }

  private parseConditionAnd(c: Cursor, line: Line): ConditionNode {
    const left = this.parseConditionUnary(c, line);
    if (!c.isWord('and')) return left;
    const operands = [left];
    let span = left.span;
    while (c.matchWord('and')) {
      const right = this.parseConditionUnary(c, line);
      operands.push(right);
      span = mergeSpans(span, right.span);
    }
    return { kind: 'and', operands, span };
  }

  private parseConditionUnary(c: Cursor, line: Line): ConditionNode {
    const t = c.peek();
    if (!t) {
      this.diagnostics.error('parse.condition', 'Expected a condition.', lineSpan(line));
      return { kind: 'condition-ref', name: '', span: lineSpan(line) };
    }

    if (t.kind === 'word' && t.text === 'not') {
      c.next();
      const operand = this.parseConditionUnary(c, line);
      return { kind: 'not', operand, span: mergeSpans(t.span, operand.span) };
    }

    if (t.kind === 'lparen') {
      c.next();
      const inner = this.parseCondition(c, line);
      const close = c.next();
      if (!close || close.kind !== 'rparen') {
        this.diagnostics.error('parse.condition-paren', 'Missing closing `)` in the condition.', c.restSpan());
      }
      return inner;
    }

    // one chance in <n>
    if (t.kind === 'word' && t.text === 'one' && c.isWord('chance', 1) && c.isWord('in', 2)) {
      c.next();
      c.next();
      c.next();
      const n = c.next();
      if (!n || n.kind !== 'number') {
        this.diagnostics.error('parse.chance', 'Expected a number after `one chance in`.', n?.span ?? c.restSpan());
        return { kind: 'chance', n: 0, span: t.span };
      }
      return { kind: 'chance', n: Number(n.text), span: mergeSpans(t.span, n.span) };
    }

    // Bare single word (before a connective or end of condition): a named
    // condition reference, e.g. `while in-darkness`.
    if (t.kind === 'word' && !ARTICLES.has(t.text) && this.isBareConditionRef(c)) {
      c.next();
      return { kind: 'condition-ref', name: t.text, span: t.span };
    }

    // <subject> <predicate>
    const subject = this.parseValueExpr(c, line, new Set());
    return this.parsePredicate(c, line, subject);
  }

  /** True when the next word stands alone (connective or nothing follows). */
  private isBareConditionRef(c: Cursor): boolean {
    const after = c.peek(1);
    if (!after) return true;
    if (after.kind === 'rparen') return true;
    return after.kind === 'word' && (after.text === 'and' || after.text === 'or' || after.text === 'then');
  }

  private parsePredicate(c: Cursor, line: Line, subject: ValueExpr): ConditionNode {
    const t = c.peek();
    if (!t || t.kind !== 'word') {
      this.diagnostics.error('parse.predicate', 'Expected a predicate (is, has, holds, wears) after the subject.', t?.span ?? c.restSpan());
      return { kind: 'predicate', subject, predicate: { kind: 'is', negated: false, value: { kind: 'bare', words: [], span: subject.span }, span: subject.span }, span: subject.span };
    }

    if (t.text === 'is') {
      c.next();
      const negated = !!c.matchWord('not');
      if (c.isWord('a') || c.isWord('an')) {
        c.next();
        const cls = this.collectWords(c, new Set());
        return {
          kind: 'predicate',
          subject,
          predicate: { kind: 'is-a', negated, classifier: cls.words, span: cls.span ?? t.span },
          span: mergeSpans(subject.span, cls.span ?? t.span),
        };
      }
      if (c.isWord('in')) {
        c.next();
        const place = this.parseNameRef(c, () => false);
        return {
          kind: 'predicate',
          subject,
          predicate: { kind: 'is-in', negated, place, span: place.span },
          span: mergeSpans(subject.span, place.span),
        };
      }
      const value = this.parseValueExpr(c, line, new Set());
      return {
        kind: 'predicate',
        subject,
        predicate: { kind: 'is', negated, value, span: value.span },
        span: mergeSpans(subject.span, value.span),
      };
    }

    if (t.text === 'has' || t.text === 'holds' || t.text === 'wears') {
      c.next();
      const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
      return {
        kind: 'predicate',
        subject,
        predicate: { kind: t.text as 'has' | 'holds' | 'wears', thing, span: thing.span },
        span: mergeSpans(subject.span, thing.span),
      };
    }

    if (t.text === 'can') {
      // `can see <thing>` / `can reach <thing>` (design.md §2.7, Phase B).
      c.next();
      const ability = c.next();
      if (!ability || ability.kind !== 'word' || (ability.text !== 'see' && ability.text !== 'reach')) {
        this.diagnostics.error('parse.predicate-can', 'Expected `see` or `reach` after `can`.', ability?.span ?? c.restSpan());
        return { kind: 'condition-ref', name: 'can', span: t.span };
      }
      const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
      return {
        kind: 'predicate',
        subject,
        predicate: { kind: 'can', ability: ability.text, thing, span: mergeSpans(ability.span, thing.span) },
        span: mergeSpans(subject.span, thing.span),
      };
    }

    this.diagnostics.error('parse.predicate', `Unknown predicate \`${t.text}\` — expected is, is a, is in, has, holds, wears, or can see/reach.`, t.span);
    c.next();
    return { kind: 'condition-ref', name: t.text, span: t.span };
  }
}
