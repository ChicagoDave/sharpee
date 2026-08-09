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
 *   (The catalog import below is hint-text only — requirement words are
 *   still collected raw here and validated by the analyzer, ADR-271 D1.)
 * - Prose is opaque except `{…}` markers, extracted with precise spans.
 * - Every AST node carries a Span.
 */
import { SCOPE_REQUIREMENT_PREDICATES } from './catalog.js';
import {
  ActionPattern,
  ActionRefusal,
  AwardStmt,
  BlockedExitDecl,
  DeadlyExitDecl,
  KillStmt,
  ChangeStmt,
  CompositionItem,
  ConditionNode,
  ConfigSetting,
  CreateDecl,
  Declaration,
  DefineAction,
  ExtendAction,
  RemoveFromAction,
  DefineCondition,
  DefineHatch,
  DefinePhrase,
  DefinePhrasebook,
  DefinePhrases,
  OverrideMessage,
  OverrideMessages,
  DefineAsset,
  DefineFamilyChannel,
  DefineChannel,
  ChannelReturn,
  ChannelRecordMember,
  DefinePronouns,
  DefineMachine,
  DefineSequence,
  EmitField,
  EmitValue,
  MediaStmt,
  MachineState,
  MachineTransition,
  DefineText,
  DefineTopics,
  DefineTrait,
  DirectionEntry,
  EachStmt,
  EmitStmt,
  ExitDecl,
  GreedySlotDecl,
  MoveStmt,
  SlotTypeDecl,
  RemoveStmt,
  MustRequirement,
  NameRef,
  OnClause,
  OrdinalBlock,
  ParamBinding,
  PatternPart,
  PhraseEntry,
  PhraseOverride,
  PhraseStmt,
  Placement,
  Predicate,
  RefuseStmt,
  ScopeConstraint,
  ScoreDecl,
  CounterDecl,
  DefineCounter,
  CounterMutateStmt,
  SelectArm,
  SelectOnStmt,
  SelectStrategyStmt,
  SequenceStep,
  SetStmt,
  Statement,
  StateName,
  StartsStateDecl,
  TraitField,
  ImportDecl,
  StoryFile,
  StoryFields,
  StoryHeader,
  GrammarHeader,
  TopicRow,
  RankDecl,
  HungerDecl,
  MeterRung,
  UseDecl,
  UsePhrasebookDecl,
  TextMarker,
  TextValue,
  ValueExpr,
} from './ast.js';
import { PRONOUN_CASES, STARTS_STATE_PAIRINGS } from './catalog.js';
import { DiagnosticBag } from './diagnostics.js';
import { lex, Line, Token } from './lexer.js';
import { mergeSpans, Span, spanOf } from './span.js';

const ARTICLES = new Set(['the', 'a', 'an']);
// ADR-298 D4: the structural test for a header prose value being a phrase
// reference — a single kebab atom, nothing else on the value.
const KEBAB_ATOM = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const DIRECTIONS = new Set([
  'north', 'south', 'east', 'west',
  'northeast', 'northwest', 'southeast', 'southwest',
  'up', 'down',
]);
/** Z5 strategy adverbs (ADR-211 Decision 4). `ordered`/`once` are retired — load errors naming their replacement. */
const STRATEGIES = new Set(['randomly', 'cycling', 'stopping', 'sticky', 'first-time']);
/** Retired strategy adverb → its replacement, for the AC-13 fix-it diagnostic. */
const RETIRED_STRATEGIES: Record<string, string> = { ordered: 'stopping', once: 'first-time' };
const ORDINALS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5,
  sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
};
/** Words that terminate a noun phrase in condition/statement positions. */
const PHRASE_STOPS = new Set(['is', 'has', 'holds', 'wears', 'can', 'and', 'or', 'then', 'to', 'while', 'with']);
/** Stop words ending an emit-payload value expression (ADR-216). */
const EMIT_VALUE_STOPS = new Set(['and', 'when']);
/**
 * Words that open a top-level block — the resynchronization set for error
 * recovery, and the "this block ended" signal for unterminated-block
 * detection. `extend`/`remove` are the ADR-270 alteration openers; without
 * them (ADR-289 D8 L1) recovery ran straight past a whole `extend action`
 * block after any earlier parse error, dropping its grammar lines silently.
 */
const TOP_KEYWORDS = new Set([
  'story', 'grammar', 'create', 'define', 'when', 'once', 'every', 'import', 'override',
  'extend', 'remove',
]);

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

/**
 * True for any `##`-prefixed line at any indent (ADR-249). In code
 * positions this is always an error — comments are only legal flagged
 * (indent 0) and between top-level constructs. Prose positions never
 * call this: an indented `##` in prose renders verbatim (§5.2 opacity).
 */
function looksLikeComment(line: Line): boolean {
  return line.raw.trimStart().startsWith('##');
}

/** Words that open a statement or block boundary inside behavior bodies. */
const STATEMENT_OPENERS = new Set([
  'refuse', 'phrase', 'emit', 'set', 'change', 'move', 'remove', 'award', 'win', 'lose', 'kill',
  'raise', 'lower',
  'if', 'select', 'each', 'end', 'else', 'or', 'when', 'at',
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
  if (lineHasMust(line)) return true;
  // `<n> turns later` sequence-step headers open with a number.
  return line.tokens[0]?.kind === 'number' && line.tokens[1]?.text === 'turns';
}

/**
 * True for `must`-requirement lines (ratchet D6): a lowercase subject
 * opener plus a `must` token. Case-sensitive so capitalized prose
 * ("The goats must be fed.") stays prose.
 */
function lineHasMust(line: Line): boolean {
  const word = firstWord(line);
  return (word === 'the' || word === 'it' || word === 'its')
    && line.tokens.some((t) => t.kind === 'word' && t.text === 'must');
}

class Parser {
  private pos = 0;

  /**
   * The line that sat in prose position after `phrase <key>` but opened with a
   * lowercase statement keyword (ADR-289 D8 §3.1). A parse failure on this
   * exact line gets the misparse hint; every other line's message is unchanged,
   * so a genuine `set the flag` error is not told to capitalize itself.
   */
  private proseCandidate: Line | null = null;

  constructor(
    private readonly lines: Line[],
    private readonly diagnostics: DiagnosticBag,
  ) {}

  // ------------------------------------------------------------------ file

  parseFile(): StoryFile {
    let header: StoryHeader | null = null;
    let grammarHeader: GrammarHeader | null = null;
    const declarations: Declaration[] = [];
    const start = this.lines[0] ? lineSpan(this.lines[0]) : spanOf(1, 1);

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.comment) {
        // ADR-249: comments are legal exactly between top-level
        // constructs. A following indented line means this comment sits
        // between a construct's header and its body — inside the block.
        const next = this.lines[this.pos + 1];
        if (next && next.indent > 0) {
          this.reportCommentInsideBlock(line);
          this.pos++;
          this.recoverToTopLevel();
        } else {
          this.pos++;
        }
        continue;
      }
      if (line.indent !== 0) {
        this.diagnostics.error('parse.unexpected-indent', 'Unexpected indentation — expected a top-level declaration.', lineSpan(line));
        this.recoverToTopLevel();
        continue;
      }
      const word = firstWord(line);
      switch (word) {
        case 'story':
          if (grammarHeader) {
            this.diagnostics.error('parse.mixed-headers', 'A file carries either a `story` header or a `grammar` header, never both — this file is a grammar file (ADR-269).', lineSpan(line));
            this.recoverToTopLevel(true);
          } else if (header) {
            this.diagnostics.error('parse.duplicate-story-header', 'Duplicate story header — only one `story` line is allowed.', lineSpan(line));
            this.recoverToTopLevel(true);
          } else {
            header = this.parseStoryHeader();
          }
          break;
        case 'grammar':
          // ADR-269 D8: `grammar "<name>"` declares a grammar file — define
          // action grammar surfaces only (analyzer-gated).
          if (header) {
            this.diagnostics.error('parse.mixed-headers', 'A file carries either a `story` header or a `grammar` header, never both — this file is a story.', lineSpan(line));
            this.recoverToTopLevel(true);
          } else if (grammarHeader) {
            this.diagnostics.error('parse.duplicate-grammar-header', 'Duplicate grammar header — only one `grammar` line is allowed.', lineSpan(line));
            this.recoverToTopLevel(true);
          } else {
            grammarHeader = this.parseGrammarHeader();
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
        case 'import': {
          // ADR-251: `import "<file>"` — the single generalized form.
          // Position IS the spliced content's arbitration position (D4).
          const d = this.parseImport();
          if (d) declarations.push(d);
          break;
        }
        case 'override': {
          // ADR-255: `override message <alias>` / `override messages <locale>`.
          const d = this.parseOverride();
          if (d) declarations.push(d);
          break;
        }
        case 'extend': {
          // ADR-270 D6: `extend action <name>` — story-level grammar
          // alteration of an existing action.
          const next = line.tokens[1];
          if (!next || next.kind !== 'word' || next.text !== 'action') {
            this.diagnostics.error('parse.extend-action', 'Expected `extend action <name>`.', lineSpan(line));
            this.recoverToTopLevel(true);
          } else {
            const d = this.parseExtendAction();
            if (d) declarations.push(d);
          }
          break;
        }
        case 'remove': {
          // ADR-270 D6: `remove from action <name>` — story-level removal
          // of standard-grammar shapes. (The entity-removal `remove` is a
          // body statement; top level is unambiguous.)
          const d = this.parseRemoveFromAction();
          if (d) declarations.push(d);
          break;
        }
        // Ownership-package removals (ratchet 2026-07-11): floating rules
        // are gone — each gets a fix-it naming its owner-attached form.
        case 'when':
          this.diagnostics.error(
            'parse.removed-when',
            'Top-level `when` rules were removed (ownership package, 2026-07-11) — attach the rule to its owner: `after <verb> it` on the entity or room it is about.',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        case 'once':
          this.diagnostics.error(
            'parse.removed-once',
            'Top-level `once <condition>` rules were removed (ownership package, 2026-07-11) — use a `, once` clause modifier on the owner: `on every turn while <condition>, once`.',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        case 'every':
          this.diagnostics.error(
            'parse.removed-every',
            'Top-level `every N turns` rules were removed (ownership package, 2026-07-11) — use a story-owned `define sequence`, or an every-turn clause on the owner.',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        case 'use':
          // ADR-215: `use` lives in the story header's indented body, not
          // at the top level — a pointed fix-it, never a generic error.
          this.diagnostics.error(
            'parse.use-top-level',
            '`use <extension>` goes inside the story header\'s indented body (with `states:`, scores, …), not at the top level.',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        case 'rank':
          // ADR-261 D2: a rung lives in the `use scoring` body, so that the
          // ladder cannot drift away from the line that enables it.
          this.diagnostics.error(
            'parse.rank-outside-scoring',
            '`rank "<name>" at <n>` goes in the indented body of the story header\'s `use scoring` line, not at the top level.',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        case 'each':
          // Never top-level (given 9: all behavior is owned) — ratchet E3.
          this.diagnostics.error(
            'parse.each-top-level',
            '`each` blocks run inside an owner\'s behavior — place the block in an `on`/`after` clause body, an action body, a trait clause body, or a sequence step (never top-level).',
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
          break;
        default:
          this.diagnostics.error(
            'parse.unknown-declaration',
            `Unknown declaration \`${word ?? line.raw.trim()}\` — expected story, create, or define.`,
            lineSpan(line),
          );
          this.recoverToTopLevel(true);
      }
    }

    const last = this.lines[this.lines.length - 1];
    return {
      kind: 'story-file',
      header,
      grammarHeader,
      declarations,
      span: last ? mergeSpans(start, lineSpan(last)) : start,
    };
  }

  /** ADR-249: the one inside-block comment diagnostic, with its fix-it. */
  private reportCommentInsideBlock(line: Line): void {
    this.diagnostics.error(
      'parse.comment-inside-block',
      'Comments are only legal outside blocks, at the top level of the story file.',
      lineSpan(line),
    );
  }

  /** Report an inside-block comment and consume the line (block parsing continues). */
  private skipCommentInsideBlock(line: Line): void {
    this.reportCommentInsideBlock(line);
    this.pos++;
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

  /**
   * `grammar "<name>"` (ADR-269 D8). One line, no `by`, no indented body —
   * a grammar file's content is its `define action` blocks, nothing else.
   */
  private parseGrammarHeader(): GrammarHeader {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.matchWord('grammar');
    const nameTok = c.peek();
    let name = '';
    if (nameTok && nameTok.kind === 'string') {
      name = nameTok.text;
      c.next();
    } else {
      this.diagnostics.error('parse.grammar-name', 'Expected a quoted grammar name after `grammar`.', c.restSpan());
    }
    while (this.pos < this.lines.length && this.lines[this.pos].indent > 0) {
      this.diagnostics.error(
        'parse.grammar-header-body',
        'The `grammar` header takes no indented body — a grammar file carries only `define action` blocks.',
        lineSpan(this.lines[this.pos]),
      );
      this.pos++;
    }
    return { kind: 'grammar-header', name, span: lineSpan(line) };
  }

  private parseStoryHeader(): StoryHeader {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.matchWord('story');
    let title = '';
    // ADR-298 D1: the positional `story "Title" by "Author"` form is removed —
    // anything after the bare `story` word is the removed form.
    if (!c.atEnd()) {
      this.diagnostics.error(
        'parse.removed-story-header',
        '`story "Title" by "Author"` was removed (ADR-298) — use the fielded form: a bare `story` line, then indented `title: <title>` and an `authors:` list (one name per indented line).',
        c.restSpan(),
      );
      while (!c.atEnd()) c.next();
    }

    const fields: StoryFields = { authors: [], testers: [], themes: [] };
    const states: StateName[] = [];
    let statesReversible = false;
    const scores: ScoreDecl[] = [];
    const onClauses: OnClause[] = [];
    const uses: UseDecl[] = [];
    const usePhrasebooks: UsePhrasebookDecl[] = [];
    const ranks: RankDecl[] = [];
    let hunger: HungerDecl | undefined;
    let span = lineSpan(line);
    while (this.pos < this.lines.length && this.lines[this.pos].indent > 0) {
      const peeked = this.lines[this.pos];
      const peekedWord = firstWord(peeked);
      // `use <extension>` — a trusted platform extension (ADR-215): static,
      // one name per line; the analyzer gates the name against the manifest
      // registry.
      if (peekedWord === 'use') {
        const useLine = this.lines[this.pos++];
        span = mergeSpans(span, lineSpan(useLine));
        const uc = new Cursor(useLine.tokens, useLine);
        uc.matchWord('use');
        // ADR-250 D2: exactly the word `phrasebook` selects the two-word
        // form — `use phrasebook <name> [while <condition>]`, stackable.
        // Plain `use <extension>` keeps its strict one-word grammar.
        if (uc.isWord('phrasebook')) {
          uc.next();
          const bookTok = uc.next();
          if (!bookTok || bookTok.kind !== 'word') {
            this.diagnostics.error('parse.use-phrasebook', 'Expected `use phrasebook <name> [while <condition>]` — a single kebab-case book name.', uc.restSpan());
            continue;
          }
          let bookCondition: ConditionNode | null = null;
          if (uc.isWord('while')) {
            uc.next();
            const condTokens: Token[] = [];
            while (!uc.atEnd()) condTokens.push(uc.next()!);
            bookCondition = this.parseCondition(new Cursor(condTokens, useLine), useLine);
          } else if (!uc.atEnd()) {
            this.diagnostics.error('parse.use-phrasebook', 'Unexpected text after the book name — only `while <condition>` may follow.', uc.restSpan());
            continue;
          }
          usePhrasebooks.push({ name: bookTok.text, condition: bookCondition, span: lineSpan(useLine) });
          continue;
        }
        const nameTok = uc.next();
        if (!nameTok || nameTok.kind !== 'word') {
          this.diagnostics.error('parse.use', 'Expected `use <extension>` — one extension name per line.', lineSpan(useLine));
          continue;
        }
        // Optional `, announce <mode>` (ADR-262 D3): how a metering extension's
        // band crossings narrate. The analyzer validates the mode word.
        let announce: string | undefined;
        if (uc.peek()?.kind === 'comma') {
          uc.next(); // consume the comma
          if (!uc.isWord('announce')) {
            this.diagnostics.error('parse.use-announce', 'Expected `announce <mode>` after the comma in a `use` line.', uc.restSpan());
            continue;
          }
          uc.next(); // consume `announce`
          const modeTok = uc.next();
          if (!modeTok || modeTok.kind !== 'word') {
            this.diagnostics.error('parse.use-announce', 'Expected an announce mode (all, collapsed, combined, silent) after `announce`.', uc.restSpan());
            continue;
          }
          announce = modeTok.text;
        }
        if (!uc.atEnd()) {
          this.diagnostics.error('parse.use', 'Expected `use <extension>[, announce <mode>]` — one extension name per line.', lineSpan(useLine));
          continue;
        }
        uses.push(
          announce !== undefined
            ? { name: nameTok.text, announce, span: lineSpan(useLine) }
            : { name: nameTok.text, span: lineSpan(useLine) },
        );
        // ADR-261 D2 / ADR-263 D1: `use scoring` (rank ladder) and `use hunger`
        // (satiety meter) are the `use` lines that take an indented body.
        // `use combat` and `use state-machines` take none.
        const body: Line[] = [];
        while (this.pos < this.lines.length && this.lines[this.pos].indent > useLine.indent) {
          body.push(this.lines[this.pos++]);
        }
        if (body.length === 0) continue;
        if (nameTok.text === 'scoring') {
          for (const bodyLine of body) {
            span = mergeSpans(span, lineSpan(bodyLine));
            const rung = this.parseRankLine(bodyLine);
            if (rung) ranks.push(rung);
          }
        } else if (nameTok.text === 'hunger') {
          span = mergeSpans(span, lineSpan(body[body.length - 1]));
          hunger = this.parseHungerBody(body);
        } else {
          this.diagnostics.error(
            'parse.use-body',
            `\`use ${nameTok.text}\` takes no indented body — only \`use scoring\` and \`use hunger\` declare one.`,
            lineSpan(body[0]),
          );
        }
        continue;
      }
      // `on every turn [while <cond>][, once]` — the story-owned daemon
      // (ADR-236 D7, ratchet R4). The only clause form the header hosts;
      // anything else keeps its owner-attached home.
      if (peekedWord === 'on' || peekedWord === 'after') {
        const clause = this.parseOnClause(peeked.indent, peekedWord);
        span = mergeSpans(span, clause.span);
        if (clause.clauseKind === 'on' && clause.binding === 'every-turn') {
          onClauses.push(clause);
        } else if (!(clause.clauseKind === 'after' && clause.binding === 'every-turn')) {
          // (`after every turn` already got its own parse error inside
          // parseOnClause — don't stack a second diagnostic on it.)
          this.diagnostics.error(
            'parse.story-clause',
            'The story header hosts only `on every turn` clauses (ADR-236 D7) — action and event clauses belong to the entity they are about.',
            clause.span,
          );
        }
        continue;
      }
      const fieldLine = this.lines[this.pos++];
      span = mergeSpans(span, lineSpan(fieldLine));
      const key = firstWord(fieldLine);
      // `states[, reversible]: a, b` — story phases (ratchet D2/D4).
      if (key === 'states') {
        const sc = new Cursor(fieldLine.tokens, fieldLine);
        sc.next();
        const parsed = this.parseStatesTail(sc, fieldLine);
        if (parsed) {
          states.push(...parsed.states);
          statesReversible = parsed.reversible;
        }
        continue;
      }
      // `score <name> worth N` — story-owned score identity (ratchet D12).
      if (key === 'score') {
        const s = this.parseScoreLine(fieldLine);
        if (s) scores.push(s);
        continue;
      }
      // A rung outside a `use scoring` body (ADR-261 D2). Placing the ladder
      // under the line that enables it is what stops a ladder silently doing
      // nothing, so a stray rung is an error rather than a floating field.
      if (key === 'rank') {
        this.diagnostics.error(
          'parse.rank-outside-scoring',
          '`rank "<name>" at <n>` belongs in the indented body of a `use scoring` line.',
          lineSpan(fieldLine),
        );
        continue;
      }
      const colon = fieldLine.tokens[1];
      if (!key || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.header-field', 'Expected `key: value` in the story header.', lineSpan(fieldLine));
        continue;
      }
      const colonAt = fieldLine.raw.indexOf(':');
      const rest = fieldLine.raw.slice(colonAt + 1).trim();
      // ADR-298 D4: closed per-field schema — the parser knows every key;
      // an unknown key is a parse error, never a silent passthrough.
      switch (key) {
        case 'title':
          title = rest;
          break;
        case 'id':
          fields.id = rest;
          break;
        case 'ifid':
          fields.ifid = rest;
          break;
        case 'story-version':
          fields.storyVersion = rest;
          break;
        // ADR-252 D3 client-config keys, folded into the closed set by the
        // ADR-298 amendment (GH #221): scalars, except `themes:` (comma list).
        case 'client':
          fields.client = rest;
          break;
        case 'theme':
          fields.theme = rest;
          break;
        case 'template':
          fields.template = rest;
          break;
        case 'default-theme':
          fields.defaultTheme = rest;
          break;
        case 'storage-prefix':
          fields.storagePrefix = rest;
          break;
        // The first boolean header field. `true`/`false`/`yes`/`no` are all
        // accepted, matching the vocabulary boolean STATES already take
        // (analyzer's BOOLEAN_STATE_WORDS) — this is an author-facing switch,
        // so it reads the way the rest of the header reads. Anything else is a
        // parse error rather than a silent falsey coercion: `publish-source:
        // maybe` must not quietly mean "no".
        case 'publish-source': {
          const word = rest.toLowerCase();
          if (word === 'true' || word === 'yes') fields.publishSource = true;
          else if (word === 'false' || word === 'no') fields.publishSource = false;
          else {
            this.diagnostics.error(
              'parse.header-field-not-boolean',
              `\`publish-source:\` takes \`yes\` or \`no\` (\`true\`/\`false\` also accepted), got \`${rest}\`.`,
              lineSpan(fieldLine),
            );
          }
          break;
        }
        // Phase 6e (issue #253): closed value set, mirroring `publish-source`'s
        // reject-don't-coerce rule — `auto-assertion: everything` must not
        // quietly mean "let me decide".
        case 'auto-assertion': {
          const value = rest.toLowerCase();
          if (
            value === 'all-emitted-text' ||
            value === 'room-description' ||
            value === 'room-name-and-description'
          ) {
            fields.autoAssertion = value;
          } else {
            this.diagnostics.error(
              'parse.header-field-bad-value',
              `\`auto-assertion:\` takes \`all-emitted-text\`, \`room-description\` or \`room-name-and-description\`, got \`${rest}\`. Omit the field for "let me decide".`,
              lineSpan(fieldLine),
            );
          }
          break;
        }
        case 'themes':
          fields.themes = rest
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);
          break;
        case 'authors':
        case 'testers': {
          const entries: string[] = [];
          if (rest.length > 0) entries.push(rest);
          while (this.pos < this.lines.length && this.lines[this.pos].indent > fieldLine.indent) {
            const entryLine = this.lines[this.pos++];
            span = mergeSpans(span, lineSpan(entryLine));
            const name = entryLine.raw.trim();
            if (name.length > 0) entries.push(name);
          }
          if (entries.length === 0) {
            this.diagnostics.error(
              'parse.header-list-empty',
              `\`${key}:\` declares no names — list one name per indented line (or one name inline).`,
              lineSpan(fieldLine),
            );
          }
          if (key === 'authors') fields.authors = entries;
          else fields.testers = entries;
          break;
        }
        case 'prologue':
        case 'description': {
          let valueSpan = lineSpan(fieldLine);
          const parts: string[] = rest.length > 0 ? [rest] : [];
          while (this.pos < this.lines.length && this.lines[this.pos].indent > fieldLine.indent) {
            const bodyLine = this.lines[this.pos++];
            span = mergeSpans(span, lineSpan(bodyLine));
            valueSpan = mergeSpans(valueSpan, lineSpan(bodyLine));
            const text = bodyLine.raw.trim();
            if (text.length > 0) parts.push(text);
          }
          const value = parts.join('\n');
          if (value.length === 0) {
            this.diagnostics.error(
              'parse.header-field',
              `\`${key}:\` has no value — give literal text or a phrase name.`,
              lineSpan(fieldLine),
            );
            break;
          }
          // Structural classification (ADR-298 D4): a lone kebab atom is
          // ALWAYS a phrase reference (the analyzer errors if it doesn't
          // resolve); anything else is literal prose. Never resolve-if-exists.
          const prose = { kind: KEBAB_ATOM.test(value) ? ('phrase-ref' as const) : ('literal' as const), value, span: valueSpan };
          if (key === 'prologue') fields.prologue = prose;
          else fields.description = prose;
          break;
        }
        case 'version':
        case 'blurb':
        case 'by': {
          const replacement = key === 'version' ? 'story-version' : key === 'blurb' ? 'description' : 'authors';
          this.diagnostics.error(
            'parse.header-unknown-field',
            `\`${key}:\` was removed from the story header (ADR-298) — use \`${replacement}:\` instead.`,
            lineSpan(fieldLine),
          );
          break;
        }
        default:
          this.diagnostics.error(
            'parse.header-unknown-field',
            `Unknown story-header field \`${key}:\` — the header takes exactly: title, authors, testers, ifid, id, story-version, prologue, description, client, theme, template, themes, default-theme, storage-prefix, publish-source, auto-assertion (plus states/score/use/on lines).`,
            lineSpan(fieldLine),
          );
      }
    }

    if (title.length === 0) {
      this.diagnostics.error('parse.story-title', 'The story block requires a `title:` field.', lineSpan(line));
    }

    return { kind: 'story-header', title, fields, states, statesReversible, scores, onClauses, uses, usePhrasebooks, ranks, ...(hunger !== undefined ? { hunger } : {}), span };
  }

  /**
   * The indented `use hunger` body (ADR-263 D1): `grows N each turn`,
   * `<band> at <n> [says <key>]` rungs, and `fatal at N`.
   */
  private parseHungerBody(body: Line[]): HungerDecl {
    let grows: number | undefined;
    let fatal: number | undefined;
    const rungs: MeterRung[] = [];
    for (const line of body) {
      const first = firstWord(line);
      if (first === 'grows') {
        const c = new Cursor(line.tokens, line);
        c.matchWord('grows');
        const nTok = c.next();
        if (!nTok || nTok.kind !== 'number' || !c.matchWord('each') || !c.matchWord('turn') || !c.atEnd()) {
          this.diagnostics.error('parse.hunger-grows', 'Expected `grows <number> each turn`.', lineSpan(line));
          continue;
        }
        grows = Number(nTok.text);
      } else if (first === 'fatal') {
        const c = new Cursor(line.tokens, line);
        c.matchWord('fatal');
        if (!c.matchWord('at')) {
          this.diagnostics.error('parse.hunger-fatal', 'Expected `fatal at <number>`.', lineSpan(line));
          continue;
        }
        const nTok = c.next();
        if (!nTok || nTok.kind !== 'number' || !c.atEnd()) {
          this.diagnostics.error('parse.hunger-fatal', 'Expected `fatal at <number>`.', lineSpan(line));
          continue;
        }
        fatal = Number(nTok.text);
      } else {
        const rung = this.parseMeterRungLine(line);
        if (rung) rungs.push(rung);
      }
    }
    return { grows, fatal, rungs, span: lineSpan(body[0]) };
  }

  /**
   * `<band> at <n> [says <key>]` — one rung of a metering body (ADR-263 D1).
   * The band is a bareword and doubles as the band id.
   */
  private parseMeterRungLine(line: Line): MeterRung | null {
    const c = new Cursor(line.tokens, line);
    const bandTok = c.next();
    if (!bandTok || bandTok.kind !== 'word') {
      this.diagnostics.error(
        'parse.hunger-body',
        'The `use hunger` body holds `grows N each turn`, `<band> at <n> [says <key>]` rungs, and `fatal at N`.',
        lineSpan(line),
      );
      return null;
    }
    if (!c.matchWord('at')) {
      this.diagnostics.error('parse.meter-threshold', 'Expected `at <number>` after the band name.', c.restSpan());
      return null;
    }
    const thresholdTok = c.next();
    if (!thresholdTok || thresholdTok.kind !== 'number') {
      this.diagnostics.error('parse.meter-threshold', 'Expected a number after `at`.', c.restSpan());
      return null;
    }
    let phraseKey: string | undefined;
    if (c.isWord('says')) {
      c.next();
      const keyTok = c.next();
      if (!keyTok || keyTok.kind !== 'word') {
        this.diagnostics.error('parse.meter-says', 'Expected a phrase key after `says`.', c.restSpan());
        return null;
      }
      phraseKey = keyTok.text;
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.meter-extra', 'Unexpected text after the rung — the line is `<band> at <n> [says <key>]`.', c.restSpan());
      return null;
    }
    return { kind: 'meter-rung', band: bandTok.text, threshold: Number(thresholdTok.text), phraseKey, span: lineSpan(line) };
  }

  /**
   * `rank "<name>" at <n> [says <key>]` — one rung of the ladder, from the
   * indented `use scoring` body (ADR-261 D2/D7).
   */
  private parseRankLine(line: Line): RankDecl | null {
    const c = new Cursor(line.tokens, line);
    if (!c.matchWord('rank')) {
      this.diagnostics.error(
        'parse.use-scoring-body',
        'The `use scoring` body holds only `rank "<name>" at <n> [says <key>]` lines.',
        lineSpan(line),
      );
      return null;
    }
    const nameTok = c.peek();
    if (!nameTok || nameTok.kind !== 'string') {
      this.diagnostics.error(
        'parse.rank-name',
        'Expected a quoted rank name after `rank` — rank prose is author content, written the way entity names are.',
        c.restSpan(),
      );
      return null;
    }
    c.next();
    if (!c.matchWord('at')) {
      this.diagnostics.error(
        'parse.rank-threshold',
        'Expected `at <number>` after the rank name — a threshold is absolute points, never a percentage of max.',
        c.restSpan(),
      );
      return null;
    }
    const thresholdTok = c.next();
    if (!thresholdTok || thresholdTok.kind !== 'number') {
      this.diagnostics.error('parse.rank-threshold', 'Expected a number after `at`.', c.restSpan());
      return null;
    }
    let phraseKey: string | undefined;
    if (c.isWord('says')) {
      c.next();
      const keyTok = c.next();
      if (!keyTok || keyTok.kind !== 'word') {
        this.diagnostics.error(
          'parse.rank-says',
          'Expected a phrase key after `says` — a kebab-case key in the story\'s own phrase namespace.',
          c.restSpan(),
        );
        return null;
      }
      phraseKey = keyTok.text;
    }
    if (!c.atEnd()) {
      this.diagnostics.error(
        'parse.rank-extra',
        'Unexpected text after the rung — the line is `rank "<name>" at <n> [says <key>]`.',
        c.restSpan(),
      );
      return null;
    }
    return { kind: 'rank', name: nameTok.text, threshold: Number(thresholdTok.text), phraseKey, span: lineSpan(line) };
  }

  /**
   * Parse the tail of a `states` line after the `states` word:
   * `[, reversible] : <name>, <name>…` (ratchet D2/D4/D8). Shared by the
   * story header, create blocks, and trait blocks.
   */
  private parseStatesTail(c: Cursor, line: Line): { states: StateName[]; reversible: boolean } | null {
    let reversible = false;
    if (c.peek()?.kind === 'comma') {
      c.next();
      if (c.matchWord('reversible')) {
        reversible = true;
      } else {
        this.diagnostics.error('parse.states-modifier', 'Expected `reversible` after the comma in the `states` declaration.', c.restSpan());
        return null;
      }
    }
    const colon = c.next();
    if (!colon || colon.kind !== 'colon') {
      this.diagnostics.error('parse.states', 'Expected `:` after `states`.', c.restSpan());
      return null;
    }
    return { states: this.parseStateList(c), reversible };
  }

  /** `score <name> worth <n>` — owner-attached score line (ratchet D12). */
  private parseScoreLine(line: Line): ScoreDecl | null {
    const c = new Cursor(line.tokens, line);
    c.matchWord('score');
    const name = c.next();
    if (!name || name.kind !== 'word') {
      this.diagnostics.error('parse.score-name', 'Expected a score name after `score`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('worth')) {
      this.diagnostics.error('parse.score-worth', 'Expected `worth <number>` in the score line.', c.restSpan());
      return null;
    }
    const worth = c.next();
    if (!worth || worth.kind !== 'number') {
      this.diagnostics.error('parse.score-worth', 'Expected a number after `worth`.', c.restSpan());
      return null;
    }
    return { kind: 'score', name: name.text, worth: Number(worth.text), span: lineSpan(line) };
  }

  /**
   * `[starts <n>] [between <lo> and <hi>]` — the optional suffix shared by
   * `define counter` and a per-entity `counter` line (ADR-264 D1). The cursor
   * is positioned just past the counter name.
   */
  private parseCounterSuffix(c: Cursor, line: Line): { starts: number | null; lo: number | null; hi: number | null } {
    let starts: number | null = null;
    let lo: number | null = null;
    let hi: number | null = null;
    if (c.isWord('starts')) {
      c.next();
      const n = c.next();
      if (!n || n.kind !== 'number') this.diagnostics.error('parse.counter-starts', 'Expected a number after `starts`.', c.restSpan());
      else starts = Number(n.text);
    }
    if (c.isWord('between')) {
      c.next();
      const loTok = c.next();
      if (!loTok || loTok.kind !== 'number') {
        this.diagnostics.error('parse.counter-between', 'Expected `between <lo> and <hi>`.', c.restSpan());
      } else {
        lo = Number(loTok.text);
        if (!c.matchWord('and')) {
          this.diagnostics.error('parse.counter-between', 'Expected `and` in `between <lo> and <hi>`.', c.restSpan());
        } else {
          const hiTok = c.next();
          if (!hiTok || hiTok.kind !== 'number') this.diagnostics.error('parse.counter-between', 'Expected a number after `and`.', c.restSpan());
          else hi = Number(hiTok.text);
        }
      }
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.counter-extra', 'Unexpected text — the line is `counter <name> [starts <n>] [between <lo> and <hi>]`.', c.restSpan());
    }
    return { starts, lo, hi };
  }

  /** `define counter <name> [starts <n>] [between <lo> and <hi>]` (ADR-264 D1). */
  private parseDefineCounter(): DefineCounter | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define counter
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.counter-name', 'Expected a counter name after `define counter`.', c.restSpan());
      return null;
    }
    const { starts, lo, hi } = this.parseCounterSuffix(c, line);
    return { kind: 'define-counter', name: nameTok.text, starts, lo, hi, span: lineSpan(line) };
  }

  /** `counter <name> [starts <n>] [between <lo> and <hi>]` in a `create` block (ADR-264 D1). */
  private parseCounterLine(line: Line): CounterDecl | null {
    const c = new Cursor(line.tokens, line);
    c.matchWord('counter');
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.counter-name', 'Expected a counter name after `counter`.', c.restSpan());
      return null;
    }
    const { starts, lo, hi } = this.parseCounterSuffix(c, line);
    return { kind: 'counter', name: nameTok.text, starts, lo, hi, span: lineSpan(line) };
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
      pronouns: [],
      compositions: [],
      startsStates: [],
      placement: null,
      wears: [],
      carries: [],
      containing: [],
      exits: [],
      blockedExits: [],
      deadlyExits: [],
      deadly: null,
      states: [],
      statesReversible: false,
      scores: [],
      counters: [],
      description: null,
      initialDescription: null,
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
      } else if (word === 'pronouns') {
        // ADR-242 D5: `pronouns <word>` — one word (a standard set or a
        // `define pronouns` name). Person-only legality, word resolution,
        // and duplicate-line rejection are the analyzer's gates.
        this.pos++;
        cur.matchWord('pronouns');
        const wordTok = cur.next();
        if (!wordTok || wordTok.kind !== 'word' || !cur.atEnd()) {
          this.diagnostics.error('parse.pronouns-word', 'Expected one pronoun-set word after `pronouns` (e.g. `pronouns she`).', lineSpan(line));
        } else {
          decl.pronouns.push({ word: wordTok.text.toLowerCase(), span: lineSpan(line) });
        }
      } else if (word === 'states' && (line.tokens[1]?.kind === 'colon' || line.tokens[1]?.kind === 'comma')) {
        this.pos++;
        cur.next();
        const parsed = this.parseStatesTail(cur, line);
        if (parsed) {
          decl.states.push(...parsed.states);
          decl.statesReversible = parsed.reversible;
        }
      } else if (word === 'score') {
        this.pos++;
        const s = this.parseScoreLine(line);
        if (s) decl.scores.push(s);
      } else if (word === 'counter') {
        // ADR-264 D1: a per-entity numeric counter.
        this.pos++;
        const cc = this.parseCounterLine(line);
        if (cc) decl.counters.push(cc);
      } else if (word === 'wears') {
        this.pos++;
        cur.matchWord('wears');
        decl.wears.push(this.parseNameRef(cur, () => false));
      } else if (word === 'carries') {
        // ADR-230 Phase 6 (sketch ruling 7): start inventory, the missing
        // half of `wears` — previously accepted silently and dropped.
        this.pos++;
        cur.matchWord('carries');
        decl.carries.push(this.parseNameRef(cur, () => false));
      } else if (word === 'containing') {
        // ADR-236 D2 (ratchet R2): region membership — `containing the
        // Clearing, the Forest Path, and the Canyon View`. Additive across
        // lines; region-block-only legality is the analyzer's gate.
        this.pos++;
        cur.matchWord('containing');
        decl.containing.push(...this.parseNameRefList(cur, line));
      } else if (word === 'starts' && cur.isWord('in', 1)) {
        // The `starts` dispatch is one-token lookahead (ADR-231 D5a):
        // `starts in <place>` is placement (here); `starts <known-state>` is
        // an initializer clause, handled by the composition-line fallthrough
        // below (parseCompositionLine's `starts` branch — same branch that
        // rejects unknown words after `starts`).
        this.pos++;
        cur.next();
        cur.next();
        decl.placement = this.finishPlacement('starts-in', cur, line);
      } else if ((word === 'in' || word === 'on') && line.tokens[1] && line.tokens[1].kind === 'word' && ARTICLES.has(line.tokens[1].text)) {
        this.pos++;
        cur.next();
        decl.placement = this.finishPlacement(word as 'in' | 'on', cur, line);
      } else if (word === 'on') {
        decl.onClauses.push(this.parseOnClause(line.indent, 'on'));
      } else if (word === 'after') {
        decl.onClauses.push(this.parseOnClause(line.indent, 'after'));
      } else if (
        word === 'phrase' &&
        line.tokens[1]?.kind === 'word' &&
        line.tokens.some((t) => t.kind === 'colon')
      ) {
        // Colon anywhere on the line: the header may carry `, <strategy>`
        // and/or `while <condition>` before it (CP3/Z3b).
        this.pos++;
        decl.phraseOverrides.push(this.parsePhraseOverride(line));
      } else if (word && ORDINALS[word] !== undefined && cur.isWord('time', 1)) {
        // Z1: a `first time` block whose body is bare prose is the
        // first-VISIT description (RoomTrait.initialDescription). Other
        // ordinals have no platform field at create scope — load errors,
        // never a guess.
        this.pos++;
        if (word !== 'first') {
          this.diagnostics.error(
            'parse.create-ordinal-time',
            `\`${word} time\` is not allowed in a \`create\` block — only \`first time\` exists (RoomTrait.initialDescription has no later-visit siblings).`,
            lineSpan(line),
          );
          while (this.pos < this.lines.length && this.lines[this.pos].indent > line.indent && !isEndLine(this.lines[this.pos])) {
            this.pos++;
          }
        } else if (decl.initialDescription) {
          this.diagnostics.error(
            'parse.first-time-duplicate',
            'This `create` block already has a `first time` description.',
            lineSpan(line),
          );
          while (this.pos < this.lines.length && this.lines[this.pos].indent > line.indent && !isEndLine(this.lines[this.pos])) {
            this.pos++;
          }
        } else {
          const next = this.lines[this.pos];
          if (!next || next.indent <= line.indent || isEndLine(next)) {
            this.diagnostics.error(
              'parse.first-time-empty',
              '`first time` needs an indented prose block beneath it.',
              lineSpan(line),
            );
          } else {
            decl.initialDescription = this.parseProseParagraph(next.indent, line.indent);
          }
        }
      } else if (word && DIRECTIONS.has(word) && cur.isWord('to', 1)) {
        this.pos++;
        cur.next();
        cur.next();
        // `through` is reserved on exit lines as the door tail (ADR-234 D1,
        // ratchet R2) — it stops the destination name.
        const to = this.parseNameRef(cur, (t) => t.kind === 'word' && t.text === 'through');
        let via: NameRef | null = null;
        if (cur.matchWord('through')) {
          const doorRef = this.parseNameRef(cur, () => false);
          if (doorRef.words.length === 0) {
            this.diagnostics.error(
              'parse.exit-through',
              'Expected a door name after `through` (e.g. `north to the Hall through the oak door`).',
              lineSpan(line),
            );
          } else {
            via = doorRef;
          }
        }
        // ADR-234 D4: `, one-way` is reserved (traversable in the written
        // direction only) but NOT wired — a legible reservation error, not
        // a generic parse failure, until its own ratchet entry lands.
        if (cur.peek()?.kind === 'comma' && cur.isWord('one-way', 1)) {
          this.diagnostics.error(
            'parse.exit-one-way-reserved',
            '`, one-way` is reserved but not yet wired — exits and doors are bidirectional for now.',
            lineSpan(line),
          );
        }
        decl.exits.push({ kind: 'exit', direction: word, to, via, span: lineSpan(line) } as ExitDecl);
      } else if (word && DIRECTIONS.has(word) && cur.isWord('is', 1) && cur.isWord('blocked', 2)) {
        this.pos++;
        const blocked = this.parseBlockedExit(word, line);
        if (blocked) decl.blockedExits.push(blocked);
      } else if (word && DIRECTIONS.has(word) && cur.isWord('is', 1) && cur.isWord('deadly', 2)) {
        this.pos++;
        const deadly = this.parseDeadlyExit(word, line);
        if (deadly) decl.deadlyExits.push(deadly);
      } else if (word === 'deadly' && line.tokens[1]?.kind === 'colon') {
        // `deadly: <phrase>` — the no-escape room marker (ADR-227).
        this.pos++;
        const dc = new Cursor(line.tokens, line);
        dc.next(); // deadly
        dc.next(); // colon
        const key = dc.next();
        if (!key || key.kind !== 'word') {
          this.diagnostics.error('parse.deadly-room', 'Expected a phrase key after `deadly:`.', lineSpan(line));
        } else if (decl.deadly) {
          this.diagnostics.error('parse.deadly-room', 'Duplicate `deadly:` marker in this `create` block.', lineSpan(line));
        } else {
          decl.deadly = { kind: 'deadly-room', phraseKey: key.text, span: lineSpan(line) };
        }
      } else if (!sawBlank || !line.afterBlank) {
        if (sawBlank) {
          this.diagnostics.error('parse.create-property', `Unrecognized line in \`create\` block: \`${line.raw.trim()}\`.`, lineSpan(line));
          this.pos++;
        } else {
          this.pos++;
          decl.compositions.push(...this.parseCompositionLine(cur, line, decl.startsStates));
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
    const key = this.readLabelKey(c); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
    if (!key) {
      this.diagnostics.error('parse.blocked-exit', 'Expected a phrase key after `is blocked:`.', lineSpan(line));
      return null;
    }
    return { kind: 'blocked-exit', direction, phraseKey: key, condition, span: lineSpan(line) };
  }

  private parseDeadlyExit(direction: string, line: Line): DeadlyExitDecl | null {
    // <direction> is deadly [while <condition>]: <phrase-key> (ADR-227) —
    // mirrors the blocked-exit grammar exactly.
    const c = new Cursor(line.tokens, line);
    c.next(); // direction
    c.next(); // is
    c.next(); // deadly
    let condition: ConditionNode | null = null;
    if (c.matchWord('while')) {
      const condTokens: Token[] = [];
      while (!c.atEnd() && c.peek()!.kind !== 'colon') condTokens.push(c.next()!);
      condition = this.parseCondition(new Cursor(condTokens, line), line);
    }
    const colon = c.next();
    if (!colon || colon.kind !== 'colon') {
      this.diagnostics.error('parse.deadly-exit', 'Expected `: <phrase-key>` after `is deadly`.', lineSpan(line));
      return null;
    }
    const key = this.readLabelKey(c); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
    if (!key) {
      this.diagnostics.error('parse.deadly-exit', 'Expected a phrase key after `is deadly:`.', lineSpan(line));
      return null;
    }
    return { kind: 'deadly-exit', direction, phraseKey: key, condition, span: lineSpan(line) };
  }

  private parseCompositionLine(c: Cursor, line: Line, startsStates: StartsStateDecl[]): CompositionItem[] {
    const items: CompositionItem[] = [];
    while (!c.atEnd()) {
      const startTok = c.peek()!;

      // `starts <state>` initializer clause (ADR-231 D5a) — one-token
      // lookahead on the `starts` word Chord already owns: a known state
      // word (`locked`, `open`, …) initializes the paired trait's initial
      // value; `in` is the placement line's spelling and can't ride a
      // composition list; anything else is its own parse error, never a
      // silent pass into trait-name resolution.
      if (c.isWord('starts')) {
        const startsTok = c.next()!;
        const stateTok = c.peek();
        if (stateTok && stateTok.kind === 'word' && STARTS_STATE_PAIRINGS.has(stateTok.text)) {
          c.next();
          startsStates.push({
            kind: 'starts-state',
            state: stateTok.text,
            span: mergeSpans(startsTok.span, stateTok.span),
          });
          if (c.peek()?.kind === 'comma') {
            c.next();
            continue;
          }
          break;
        }
        if (stateTok && stateTok.kind === 'word' && stateTok.text === 'in') {
          this.diagnostics.error(
            'parse.starts-state',
            '`starts in <place>` is a placement line of its own — it cannot ride a composition list.',
            mergeSpans(startsTok.span, stateTok.span),
          );
        } else {
          const known = [...STARTS_STATE_PAIRINGS.keys()].join(', ');
          this.diagnostics.error(
            'parse.starts-state',
            stateTok
              ? `\`${stateTok.text}\` is not a state \`starts\` can initialize — known states: ${known} (placement is \`starts in <place>\`).`
              : `Expected a state after \`starts\` — known states: ${known} (placement is \`starts in <place>\`).`,
            stateTok ? stateTok.span : startsTok.span,
          );
        }
        while (!c.atEnd()) c.next(); // resynchronize: one mistake, one diagnostic
        break;
      }

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
      // Ratchet R3 (ADR-234 D6): an article directly after `with`/`and`
      // starts the adjective's single-entity config value — no keyword
      // (`lockable with the iron key`). Keyed named fields (`with food the
      // handful of feed` on authored traits) still parse below: their key
      // words come first, so the article is not in first position.
      if (startTok && startTok.kind === 'word' && ARTICLES.has(startTok.text)) {
        c.next(); // article
        const nameWords: string[] = [];
        let lastTok = startTok;
        while (!c.atEnd() && c.peek()!.kind === 'word' && !c.isWord('and') && !c.isWord('while')) {
          lastTok = c.next()!;
          nameWords.push(lastTok.text);
        }
        if (nameWords.length === 0) {
          this.diagnostics.error('parse.config-value', 'Expected an entity name after the article.', c.restSpan());
          break;
        }
        settings.push({
          key: [],
          value: nameWords.join(' '),
          valueKind: 'name',
          span: mergeSpans(startTok.span, lastTok.span),
        });
        if (!c.matchWord('and')) break;
        continue;
      }
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
        // Ratchet R3 (ADR-234 D6): the `key`/`tool` config keywords are
        // removed — the entity is written directly after `with`. One form
        // per concept (Given 7); the fix-it names the replacement.
        if (key.length === 1 && (key[0] === 'key' || key[0] === 'tool')) {
          this.diagnostics.error(
            'parse.removed-config-keyword',
            `\`with ${key[0]} the …\` was removed (ratchet R3) — write the entity directly: \`with the ${nameWords.join(' ')}\`.`,
            startTok ? mergeSpans(startTok.span, lastTok.span) : lastTok.span,
          );
          if (!c.matchWord('and')) break;
          continue;
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
      // `[ … ]` list value (ADR-215): a bracketed, comma-separated list of
      // name references (`patrol route [Hall, Study, Hall]`). Narrower than
      // ADR-216's statement-payload arrays — config lists hold names only.
      const bracketTok = c.peek();
      if (bracketTok && bracketTok.kind === 'lbracket' && key.length > 0) {
        c.next(); // [
        const listValues: NameRef[] = [];
        for (;;) {
          if (c.peek()?.kind === 'rbracket') break;
          const ref = this.parseNameRef(c, () => false);
          if (ref.words.length === 0) {
            this.diagnostics.error('parse.config-list', 'Expected an entity name inside the `[ … ]` list.', c.restSpan());
            while (!c.atEnd() && c.peek()!.kind !== 'rbracket') c.next();
            break;
          }
          listValues.push(ref);
          if (c.peek()?.kind === 'comma') c.next();
          else break;
        }
        const close = c.next();
        let lastSpan = bracketTok.span;
        if (!close || close.kind !== 'rbracket') {
          this.diagnostics.error('parse.config-list', 'Expected `]` to close the list.', c.restSpan());
        } else {
          lastSpan = close.span;
        }
        if (listValues.length === 0) {
          this.diagnostics.error('parse.config-list', 'A `[ … ]` list needs at least one entry.', lastSpan);
        }
        settings.push({
          key,
          value: '',
          valueKind: 'list',
          listValues,
          span: startTok ? mergeSpans(startTok.span, lastSpan) : lastSpan,
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
    // Key word validated by the caller; phrase-key = WORD { "." WORD } (ADR-231 D1b).
    const key = this.readLabelKey(c)!;

    // CP3: optional `, <strategy>` (the Z5 adverb set, retired fix-its
    // included) — `phrase present, cycling:`.
    let strategy: string | null = null;
    if (c.peek()?.kind === 'comma') {
      c.next();
      const s = c.next();
      if (s && s.kind === 'word' && STRATEGIES.has(s.text)) {
        strategy = s.text;
      } else if (s && s.kind === 'word' && RETIRED_STRATEGIES[s.text]) {
        this.diagnostics.error(
          'parse.phrase-strategy-retired',
          `\`${s.text}\` is no longer a strategy adverb — use \`${RETIRED_STRATEGIES[s.text]}\` (ADR-211 Decision 4).`,
          s.span,
        );
      } else {
        this.diagnostics.error('parse.phrase-strategy', 'Expected a strategy (randomly, cycling, stopping, sticky, first-time) after the comma.', s?.span ?? c.restSpan());
      }
    }

    // Z3b: optional `while <condition>` up to the colon — `phrase detail
    // while it is on:` (`it` = the owner; the analyzer resolves).
    let condition: ConditionNode | null = null;
    if (c.isWord('while')) {
      c.next();
      const condTokens: Token[] = [];
      while (!c.atEnd() && c.peek()!.kind !== 'colon') condTokens.push(c.next()!);
      condition = this.parseCondition(new Cursor(condTokens, line), line);
    }
    if (c.peek()?.kind === 'colon') {
      c.next();
    } else {
      this.diagnostics.error('parse.phrase-override-colon', 'Expected `:` to end the `phrase` header.', c.restSpan());
    }

    const variants: TextValue[] = [];
    const str = c.peek();
    if (str && str.kind === 'string') {
      c.next();
      this.reportSameLineText(str.span);
      variants.push(this.textFromString(str)); // recovery: keep the text so analysis continues
    } else {
      // First variant, then `or`-separated further variants (CP3): `or`
      // stands alone at the SAME indent as the `phrase` header line.
      variants.push(this.parseProseParagraph(line.indent + 1, line.indent));
      for (;;) {
        const next = this.lines[this.pos];
        if (!next || next.indent !== line.indent || firstWord(next) !== 'or' || next.tokens.length !== 1) break;
        this.pos++;
        variants.push(this.parseProseParagraph(line.indent + 1, line.indent));
      }
    }
    const last = variants[variants.length - 1];
    return {
      kind: 'phrase-override',
      key,
      strategy,
      condition,
      variants,
      span: mergeSpans(lineSpan(line), last?.span ?? lineSpan(line)),
    };
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

  /**
   * A comma-separated list of entity name references, Oxford-`and` welcome
   * (`the Clearing, the Forest Path, and the Canyon View`). Each reference
   * keeps its own article and span; an empty list is a parse error.
   */
  private parseNameRefList(c: Cursor, line: Line): NameRef[] {
    const refs: NameRef[] = [];
    for (;;) {
      const ref = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'and');
      if (ref.words.length === 0) {
        this.diagnostics.error('parse.name-list', 'Expected an entity name.', c.atEnd() ? lineSpan(line) : c.restSpan());
        break;
      }
      refs.push(ref);
      if (c.peek()?.kind === 'comma') {
        c.next();
        c.matchWord('and'); // Oxford `and` after the comma
      } else if (!c.matchWord('and')) {
        break;
      }
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.name-list', `Unexpected trailing text in name list: \`${c.peek()!.text}\`.`, c.restSpan());
    }
    return refs;
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
      case 'phrasebook':
        // ADR-245/250 D1 (David 2026-07-21) — named, predicated phrase
        // collections; entries reuse the phrase-override grammar.
        return this.parseDefinePhrasebook();
      case 'phrases':
        return this.parseDefinePhrases();
      case 'verb':
        // ADR-270 D7 (2026-07-26): `define verb` is removed — the alteration
        // model subsumes it generally (Chord 3.0.0).
        this.diagnostics.error(
          'parse.removed-define-verb',
          '`define verb` was removed (ADR-270) — add the verb onto the action directly: `extend action <name>` with a `grammar` pattern line (e.g. `extend action putting` → `hook the item on the hook`).',
          lineSpan(line),
        );
        this.recoverToTopLevel(true);
        return null;
      case 'text':
        return this.parseDefineText();
      case 'flag':
        // Removed — given 8 (ratchet 2026-07-11).
        this.diagnostics.error(
          'parse.removed-flag',
          '`define flag` was removed (given 8: no global booleans) — model the fact as `states:` on its owner, or derive it with a condition over world state.',
          lineSpan(line),
        );
        this.recoverToTopLevel(true);
        return null;
      case 'trait':
        return this.parseDefineTrait();
      case 'action':
        return this.parseDefineAction();
      case 'chain':
        return this.parseDefineChainHatch();
      case 'behavior':
        // ADR-235 D2 (removal, 2026-07-18): the behavior hatch carried no
        // trait/action binding key, so it structurally could never fire —
        // removed rather than repaired.
        this.diagnostics.error(
          'parse.removed-behavior-hatch',
          '`define behavior … from` was removed (ADR-235 D2) — it had no binding key and could never fire. Author the behavior in-language (`define trait <name>` with `on <verb> it` clauses, composed on the entity), or ship a full action with `define action <name> from "<module>"`.',
          lineSpan(this.lines[this.pos]),
        );
        this.pos++;
        return null;
      case 'score':
        // Removed — ratchet D12/CP5 (2026-07-11).
        this.diagnostics.error(
          'parse.removed-score',
          '`define score` was removed (ownership package) — attach the score to its earning owner: `score <name> worth N` in the owner\'s create/trait/action block or the story header.',
          lineSpan(line),
        );
        this.recoverToTopLevel(true);
        return null;
      case 'sequence':
        return this.parseDefineSequence();
      case 'counter':
        // ADR-264: a story-global numeric counter.
        return this.parseDefineCounter();
      case 'machine':
        // ADR-215 `use state-machines` depth (spelling A, 2026-07-18) —
        // the `use` requirement is the analyzer's gate.
        return this.parseDefineMachine();
      case 'sound':
      case 'image':
      case 'music':
        // ADR-216 declared assets — DATA references, never hatches.
        return this.parseDefineAsset(subWord as 'sound' | 'image' | 'music');
      case 'ambient':
      case 'layer':
        // ADR-241 D2 — named family channels (an ambient bed / an image
        // layer), one-liners beside the asset declarations.
        return this.parseDefineFamilyChannel(subWord as 'ambient' | 'layer');
      case 'channel':
        // ADR-216 custom channels (spelling A, 2026-07-18) — data projections.
        return this.parseDefineChannel();
      case 'topics':
        // ADR-239 D3 (as amended) — the ask/tell topic table block.
        return this.parseDefineTopics();
      case 'pronouns':
        // ADR-242 D7 (ruled Q-1) — named pronoun set, five named rows.
        return this.parseDefinePronouns();
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
    // EBNF: phrase-key = WORD { "." WORD } (ADR-230 D5). Previously the
    // parser silently registered only the first segment (`if.action.taking`
    // became `if`), which made story-wide overrides of platform message ids
    // impossible.
    const key = this.readLabelKey(c) ?? '';
    if (!key) {
      this.diagnostics.error('parse.phrase-key', 'Expected a phrase key after `define phrase`.', lineSpan(headLine));
      c.next(); // skip the offending token so header options still parse
    }
    const body = this.readPhraseBody(c, headLine, 'phrase');
    return { kind: 'define-phrase', key, ...body };
  }

  /**
   * Read a phrase body from a header cursor positioned after the key/alias:
   * the optional `, <strategy>|verbatim` header modifier, an optional trailing
   * `while <condition>` gate, then the indented variant lines up to
   * `end <endWord>`. Shared by `define phrase` and ADR-255's `override message`
   * so the two constructs never drift (ADR-255 D1). Returns the body fields
   * (the caller supplies the `kind` and key/alias).
   */
  private readPhraseBody(
    c: Cursor,
    headLine: Line,
    endWord: string,
  ): { strategy: string | null; verbatim: boolean; condition: ConditionNode | null; variants: TextValue[]; span: Span } {
    let strategy: string | null = null;
    let verbatim = false;
    if (c.peek()?.kind === 'comma') {
      c.next();
      const s = c.next();
      if (s && s.kind === 'word' && STRATEGIES.has(s.text)) {
        strategy = s.text;
      } else if (s && s.kind === 'word' && RETIRED_STRATEGIES[s.text]) {
        // Z5 / AC-13: retired adverbs are load errors that name their replacement.
        this.diagnostics.error(
          'parse.phrase-strategy-retired',
          `\`${s.text}\` is no longer a strategy adverb — use \`${RETIRED_STRATEGIES[s.text]}\` (ADR-211 Decision 4).`,
          s.span,
        );
      } else if (s && s.kind === 'word' && s.text === 'verbatim') {
        verbatim = true; // grammar log 2026-07-10: whitespace-preserving text
      } else {
        this.diagnostics.error('parse.phrase-strategy', 'Expected a strategy (randomly, cycling, stopping, sticky, first-time) or `verbatim` after the comma.', s?.span ?? c.restSpan());
      }
    }

    // Z2/CP1': optional trailing `while <condition>` gates the fragment —
    // presence conditions compile to `mentions`, anything else registers on
    // the ADR-211 gate seam (resolution is the analyzer's/loader's job).
    let condition: ConditionNode | null = null;
    if (c.isWord('while')) {
      c.next();
      condition = this.parseCondition(c, headLine);
    }

    const variants: TextValue[] = [];
    let span = lineSpan(headLine);
    let flaggedFlushLeft = false;
    for (;;) {
      const line = this.lines[this.pos];
      if (!line) {
        this.diagnostics.error('parse.unterminated-block', `Missing \`end ${endWord}\`.`, span);
        break;
      }
      if (line.comment) {
        // ADR-249 — indented `##` stays prose here; only a flagged
        // (indent-0) comment line is an inside-block error.
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (isEndLine(line)) {
        span = mergeSpans(span, lineSpan(line));
        this.consumeEnd(endWord, headLine);
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
        this.diagnostics.error('parse.unterminated-block', `Missing \`end ${endWord}\`.`, span);
        break;
      }
      if (line.indent === 0) {
        // A flush-left non-keyword line makes zero progress in either
        // variant parser below (both require depth > 0) — without this
        // guard the loop appended empty variants until OOM. One diagnostic
        // for the first offending line; the rest of the flush-left run is
        // consumed so `end <endWord>` still terminates the block.
        if (!flaggedFlushLeft) {
          flaggedFlushLeft = true;
          this.diagnostics.error(
            'parse.phrase-text-indent',
            `Text must be indented under \`${endWord === 'override' ? 'override message' : 'define phrase'}\`.`,
            lineSpan(line),
          );
        }
        this.pos++;
        continue;
      }
      const variant = verbatim ? this.parseVerbatimBlock() : this.parseProseParagraph(1, 0);
      variants.push(variant);
      span = mergeSpans(span, variant.span);
    }

    return { strategy, verbatim, condition, variants, span };
  }

  /**
   * `define phrasebook <name> [while <condition>] … end phrasebook`
   * (ADR-250 D1). Entries are phrase-override-shaped lines
   * (`<key>[, strategy]:` + `or` variants) at one indent level; the
   * body carries the ADR-249 comment guard like every end-terminated
   * block. Entry-level `while` parses here (override grammar) and is
   * gated in the analyzer (`analysis.phrasebook-entry-gate`).
   */
  private parseDefinePhrasebook(): DefinePhrasebook {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('define');
    c.matchWord('phrasebook');
    let name = '';
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.phrasebook-header', 'Expected `define phrasebook <name> [while <condition>]` — a single kebab-case book name.', c.restSpan());
    } else {
      name = nameTok.text;
    }
    let condition: ConditionNode | null = null;
    if (c.isWord('while')) {
      c.next();
      const condTokens: Token[] = [];
      while (!c.atEnd()) condTokens.push(c.next()!);
      condition = this.parseCondition(new Cursor(condTokens, headLine), headLine);
    } else if (!c.atEnd()) {
      this.diagnostics.error('parse.phrasebook-header', 'Unexpected text after the book name — only `while <condition>` may follow.', c.restSpan());
    }

    const entries: PhraseOverride[] = [];
    let span = lineSpan(headLine);
    for (;;) {
      const line = this.lines[this.pos];
      if (!line) {
        this.diagnostics.error('parse.phrasebook-end', 'Missing `end phrasebook`.', span);
        break;
      }
      if (line.comment) {
        // ADR-249: `##` inside a block is never a comment.
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (isEndLine(line)) {
        span = mergeSpans(span, this.consumeEnd('phrasebook', headLine));
        break;
      }
      if (line.indent === 0) {
        this.diagnostics.error('parse.phrasebook-end', 'Missing `end phrasebook`.', span);
        break;
      }
      if (line.tokens[0]?.kind !== 'word' || !line.tokens.some((t) => t.kind === 'colon')) {
        this.diagnostics.error('parse.phrasebook-entry', 'Expected `<key>[, strategy]:` to open a phrasebook entry.', lineSpan(line));
        this.pos++;
        continue;
      }
      this.pos++;
      const entry = this.parsePhraseOverride(line);
      entries.push(entry);
      span = mergeSpans(span, entry.span);
    }

    return { kind: 'define-phrasebook', name, condition, entries, span };
  }

  /**
   * `import "<file>"` (ADR-251 D1) — the single generalized import form.
   * The path is extension-free (the compiler appends `.chord` at resolve
   * time — D2); any string is accepted at parse time. A bare word after
   * `import` (the removed `phrasebook` sub-word, or anything else) or a
   * missing string is `parse.import-form`.
   */
  private parseImport(): ImportDecl | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.matchWord('import');
    const pathTok = c.next();
    if (!pathTok || pathTok.kind !== 'string' || !c.atEnd()) {
      this.diagnostics.error('parse.import-form', 'Expected a quoted file name: `import "<file>"` (no extension — `.chord` is assumed).', c.restSpan());
      return null;
    }
    return { kind: 'import', path: pathTok.text, span: lineSpan(line) };
  }

  private parseDefinePhrases(): DefinePhrases {
    const headLine = this.lines[this.pos++];
    return this.parsePhrasesBlock(headLine, 2);
  }

  /**
   * ADR-255: dispatch the two override forms off the word after `override`.
   * `override message <alias> … end override` (full phrase body) vs.
   * `override messages <locale>` (locale block of `alias: text` entries).
   */
  private parseOverride(): OverrideMessage | OverrideMessages | null {
    const headLine = this.lines[this.pos];
    const kindTok = headLine.tokens[1];
    if (kindTok?.kind === 'word' && kindTok.text === 'messages') {
      return this.parseOverrideMessages();
    }
    if (kindTok?.kind === 'word' && kindTok.text === 'message') {
      return this.parseOverrideMessage();
    }
    this.diagnostics.error(
      'parse.override',
      'Expected `override message <alias>` or `override messages <locale>`.',
      lineSpan(headLine),
    );
    this.pos++;
    return null;
  }

  /** `override message <alias> [, strategy] [while <cond>] … end override` (ADR-255 D1). */
  private parseOverrideMessage(): OverrideMessage {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next(); // override
    c.next(); // message
    const alias = this.readLabelKey(c) ?? '';
    if (!alias) {
      this.diagnostics.error('parse.override-alias', 'Expected an override alias after `override message`.', lineSpan(headLine));
      c.next(); // skip the offending token so header options still parse
    }
    const body = this.readPhraseBody(c, headLine, 'override');
    return { kind: 'override-message', alias, ...body };
  }

  /** `override messages <locale>` — a locale block of `alias: text` entries (ADR-255 D1). */
  private parseOverrideMessages(): OverrideMessages {
    const headLine = this.lines[this.pos++];
    const phrases = this.parsePhrasesBlock(headLine, 2);
    return { kind: 'override-messages', locale: phrases.locale, entries: phrases.entries, span: phrases.span };
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
      const ec = new Cursor(line.tokens, line);
      const key = this.readLabelKey(ec); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
      const colon = ec.peek();
      if (!key || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.phrase-entry', 'Expected `key: <text>` in the phrases block.', lineSpan(line));
        this.pos++;
        continue;
      }
      ec.next(); // colon
      this.pos++;
      let value: TextValue;
      const inline = ec.peek();
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
          this.diagnostics.error('parse.phrase-entry-empty', `Phrase \`${key}\` has no text.`, lineSpan(line));
        }
      }
      entries.push({ key, value, span: mergeSpans(lineSpan(line), value.span) });
      span = mergeSpans(span, entries[entries.length - 1].span);
    }

    return { kind: 'define-phrases', locale, entries, span };
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
    const states: StateName[] = [];
    let statesReversible = false;
    const scores: ScoreDecl[] = [];
    let phrases: DefinePhrases | null = null;
    const onClauses: OnClause[] = [];

    const build = (span: Span): DefineTrait => ({
      kind: 'define-trait', name: nameTok.text, data, states, statesReversible, scores, phrases, onClauses, span,
    });

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (line.indent === 0) {
        if (isEndLine(line)) break;
        this.diagnostics.error('parse.unterminated-block', 'Missing `end trait`.', lineSpan(headLine));
        return build(lineSpan(headLine));
      }
      const word = firstWord(line);
      if (word === 'data' && line.tokens.length === 1) {
        this.pos++;
        data.push(...this.parseTraitFields(line));
      } else if (word === 'states') {
        // Trait-declared states (ratchet D8) — every composer gets the set.
        this.pos++;
        const sc = new Cursor(line.tokens, line);
        sc.next();
        const parsed = this.parseStatesTail(sc, line);
        if (parsed) {
          states.push(...parsed.states);
          statesReversible = parsed.reversible;
        }
      } else if (word === 'score') {
        this.pos++;
        const s = this.parseScoreLine(line);
        if (s) scores.push(s);
      } else if (word === 'phrases') {
        this.pos++;
        phrases = this.parsePhrasesBlock(line, 1);
      } else if (word === 'on') {
        onClauses.push(this.parseOnClause(line.indent, 'on'));
      } else if (word === 'after') {
        onClauses.push(this.parseOnClause(line.indent, 'after'));
      } else {
        this.diagnostics.error('parse.trait-section', `Unrecognized line in \`define trait\`: \`${line.raw.trim()}\` — expected data, states, score, phrases, or an \`on\`/\`after\` clause.`, lineSpan(line));
        this.pos++;
      }
    }
    const endSpan = this.consumeEnd('trait', headLine);
    return build(mergeSpans(lineSpan(headLine), endSpan));
  }

  /** `data` block fields: `locked: flag`, `body part: optional name`, `kind: one of a, b`. */
  private parseTraitFields(dataLine: Line): TraitField[] {
    const fields: TraitField[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > dataLine.indent) {
      const line = this.lines[this.pos++];
      if (looksLikeComment(line)) {
        this.reportCommentInsideBlock(line);
        continue;
      }
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
        if (typeTok && typeTok.kind === 'word' && ['entity', 'number', 'name'].includes(typeTok.text)) {
          type = typeTok.text as TraitField['type'];
        } else if (typeTok && typeTok.kind === 'word' && typeTok.text === 'flag') {
          // Removed — given 8 / ratchet D8 (2026-07-11).
          this.diagnostics.error(
            'parse.removed-flag-field',
            'The `flag` field type was removed (given 8: no booleans at any scope) — declare `states[, reversible]: …` on the trait and name what the thing IS in each state.',
            typeTok.span,
          );
          continue;
        } else {
          this.diagnostics.error('parse.trait-field-type', 'Expected a field type: entity, number, name, or `one of …`.', typeTok?.span ?? c.restSpan());
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
      // Trailing tokens were previously dropped silently — `shine: number
      // starts 1` (missing comma) parsed as a plain field with NO initial
      // (found 2026-07-12 building the zoo chain). Never a guess.
      if (!c.atEnd()) {
        this.diagnostics.error(
          'parse.trait-field-trailing',
          'Unexpected words after the field type — an initial value is written `, starts <value>` (the comma is required).',
          c.restSpan(),
        );
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

    const parts = this.parseActionBlockParts(headLine);
    return { kind: 'define-action', name: nameTok.text, ...parts };
  }

  /**
   * The indented body shared by `define action` and `extend action`
   * (ADR-270 D6 parses the full surface; the analyzer owns the
   * alteration-block gates). Caller has consumed the head line.
   */
  private parseActionBlockParts(headLine: Line): Omit<DefineAction, 'kind' | 'name'> {
    const patterns: ActionPattern[] = [];
    const constraints: ScopeConstraint[] = [];
    const greedy: GreedySlotDecl[] = [];
    const slotTypes: SlotTypeDecl[] = [];
    const directions: DirectionEntry[] = [];
    const musts: MustRequirement[] = [];
    const refusals: ActionRefusal[] = [];
    let otherwise: DefineAction['otherwise'] = null;
    const scores: ScoreDecl[] = [];
    let phrases: DefinePhrases | null = null;
    const body: Statement[] = [];
    let span = lineSpan(headLine);

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent === 0) break; // dedent-terminated (no `end action`, design.md §2.3/§3.4)
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      const word = firstWord(line);
      if (word === 'grammar' && line.tokens.length === 1) {
        this.pos++;
        patterns.push(...this.parseActionPatterns(line));
      } else if (lineHasMust(line)) {
        // With a `: <key>` tail it is a must-requirement (ratchet D6);
        // without one it is the scope-constraint kit (`must be reachable`).
        this.pos++;
        if (line.tokens.some((t) => t.kind === 'colon')) {
          const m = this.parseMustLine(line);
          if (m) musts.push(m);
        } else {
          const sc = this.parseScopeConstraint(line);
          if (sc) constraints.push(sc);
        }
      } else if (word === 'the' && line.tokens.some((t) => t.kind === 'word' && t.text === 'takes')) {
        // `the <slot> takes the rest of the line` — greedy slot (ADR-267
        // D10), same declarative line family as the scope constraints.
        this.pos++;
        const g = this.parseGreedyLine(line);
        if (g) greedy.push(g);
      } else if (word === 'the' && line.tokens.some((t) => t.kind === 'word' && t.text === 'is')) {
        // `the <slot> is an instrument` / `is a topic` — typed slot
        // (ADR-267 D11), the same declarative line family. The type word's
        // closed-set check is the analyzer's.
        this.pos++;
        const ts = this.parseSlotTypeLine(line);
        if (ts) slotTypes.push(ts);
      } else if (word === 'directions' && line.tokens.length === 1) {
        // `directions` block (ADR-267 D12) — bound to the `direction` slot;
        // one block per action, `or`-joined aliases per line.
        this.pos++;
        if (directions.length > 0) {
          this.diagnostics.error('parse.action-directions', 'Only one `directions` block per action.', lineSpan(line));
          while (this.pos < this.lines.length && this.lines[this.pos].indent > line.indent) this.pos++;
        } else {
          directions.push(...this.parseDirectionsBlock(line));
        }
      } else if (word === 'score') {
        this.pos++;
        const s = this.parseScoreLine(line);
        if (s) scores.push(s);
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
          const key = this.readLabelKey(oc); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
          if (key) otherwise = { phraseKey: key, span: lineSpan(line) };
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

    return { patterns, constraints, greedy, slotTypes, directions, musts, refusals, otherwise, scores, phrases, body, span };
  }

  /**
   * `extend action <name>` (ADR-270 D2/D6) — grammar lines added to an
   * existing action. Parses the full define-action surface; the analyzer
   * rejects behavior sections by name (`analysis.alteration-behavior`).
   */
  private parseExtendAction(): ExtendAction | null {
    const headLine = this.lines[this.pos];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // extend action
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.extend-action', 'Expected an action name after `extend action`.', c.restSpan());
      this.recoverToTopLevel(true);
      return null;
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.extend-action', 'Nothing may follow the action name — `extend action <name>` then the indented block.', c.restSpan());
      this.recoverToTopLevel(true);
      return null;
    }
    this.pos++;
    const parts = this.parseActionBlockParts(headLine);
    return { kind: 'extend-action', name: nameTok.text, ...parts };
  }

  /**
   * `remove from action <name>` (ADR-270 D3/D6) — indented pattern lines
   * naming shapes to remove from a standard action. Shapes only: `means`
   * lines and `→` cardinality are analyzer-rejected
   * (`analysis.removal-shape`).
   */
  private parseRemoveFromAction(): RemoveFromAction | null {
    const headLine = this.lines[this.pos];
    const c = new Cursor(headLine.tokens, headLine);
    c.next(); // remove
    if (!c.matchWord('from') || !c.matchWord('action')) {
      this.diagnostics.error('parse.remove-from-action', 'Expected `remove from action <name>`. (To remove an ENTITY from the world, `remove <name>` is a behavior statement inside an owner\'s block.)', c.restSpan());
      this.recoverToTopLevel(true);
      return null;
    }
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.remove-from-action', 'Expected an action name after `remove from action`.', c.restSpan());
      this.recoverToTopLevel(true);
      return null;
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.remove-from-action', 'Nothing may follow the action name — `remove from action <name>` then the indented pattern lines.', c.restSpan());
      this.recoverToTopLevel(true);
      return null;
    }
    this.pos++;
    const patterns = this.parseActionPatterns(headLine);
    if (patterns.length === 0) {
      this.diagnostics.error('parse.remove-from-action', 'A `remove from action` block needs at least one pattern line to remove.', lineSpan(headLine));
      return null;
    }
    const last = patterns[patterns.length - 1];
    return { kind: 'remove-from-action', name: nameTok.text, patterns, span: mergeSpans(lineSpan(headLine), last.span) };
  }

  /**
   * `<subject> must <predicate>: <phrase-key>` — the D6 requirement form
   * (define-action line AND body statement). The predicate is infinitive
   * (`be hungry`, `have its food`, `hold the camera`) and normalized here.
   */
  private parseMustLine(line: Line): MustRequirement | null {
    const colonIndex = line.tokens.map((t) => t.kind === 'colon').lastIndexOf(true);
    if (colonIndex === -1 || colonIndex >= line.tokens.length - 1) {
      this.diagnostics.error('parse.must', 'Expected `<subject> must <predicate>: <phrase-key>`.', lineSpan(line));
      return null;
    }
    const keyCursor = new Cursor(line.tokens.slice(colonIndex + 1), line);
    const phraseKey = this.readLabelKey(keyCursor); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
    if (!phraseKey || !keyCursor.atEnd()) {
      this.diagnostics.error('parse.must', 'Expected a phrase key after the colon in the `must` requirement.', line.tokens[colonIndex + 1].span);
      return null;
    }
    const c = new Cursor(line.tokens.slice(0, colonIndex), line);
    const subject = this.parseValueExpr(c, line, new Set(['must']));
    if (!c.matchWord('must')) {
      this.diagnostics.error('parse.must', 'Expected `must` after the subject in the requirement.', c.restSpan());
      return null;
    }
    if (c.isWord('not')) {
      // Requirements are positive by design (decision 6) — same stance as
      // the analysis.negated-requirement gate on `refuse when not`.
      this.diagnostics.error('parse.must-negative', 'State requirements positively — `must not …` is not a form. Use `refuse when <condition>: <key>` for prohibitions.', c.restSpan());
      return null;
    }
    const predicate = this.parseInfinitivePredicate(c, line);
    if (!predicate) return null;
    return { kind: 'must', subject, predicate, phraseKey, span: lineSpan(line) };
  }

  /** Infinitive predicate after `must`: be / have / hold / wear / see / reach. */
  private parseInfinitivePredicate(c: Cursor, line: Line): Predicate | null {
    const t = c.next();
    if (!t || t.kind !== 'word') {
      this.diagnostics.error('parse.must-predicate', 'Expected a predicate after `must`: be, have, hold, wear, see, or reach.', t?.span ?? c.restSpan());
      return null;
    }
    switch (t.text) {
      case 'be': {
        if (c.isWord('a') || c.isWord('an')) {
          c.next();
          const cls = this.collectWords(c, new Set());
          return { kind: 'is-a', negated: false, classifier: cls.words, span: cls.span ?? t.span };
        }
        if (c.isWord('in')) {
          c.next();
          const place = this.parseNameRef(c, () => false);
          return { kind: 'is-in', negated: false, place, span: place.span };
        }
        // `be any <name>` — membership over a named open condition (David,
        // 2026-07-12, each package P3). Same standalone-name rule as the
        // condition-position quantifiers: a value that merely starts with
        // `any` keeps its ordinary parse.
        if (c.isWord('any')) {
          const nameTok = c.peek(1);
          if (nameTok && nameTok.kind === 'word' && this.isBareConditionRef(c, 1)) {
            const anyTok = c.next()!;
            c.next();
            return { kind: 'is-any', condition: nameTok.text, span: mergeSpans(anyTok.span, nameTok.span) };
          }
        }
        // `be no <name>` — a negated requirement in disguise (decision 6):
        // same stance as `must not`.
        if (c.isWord('no')) {
          const nameTok = c.peek(1);
          if (nameTok && nameTok.kind === 'word' && this.isBareConditionRef(c, 1)) {
            this.diagnostics.error(
              'parse.must-negative',
              'State requirements positively — `must be no <name>` is not a form. Use `refuse when <condition>: <key>` for prohibitions.',
              c.restSpan(),
            );
            return null;
          }
        }
        const value = this.parseValueExpr(c, line, new Set());
        return { kind: 'is', negated: false, value, span: value.span };
      }
      case 'have': {
        const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
        return { kind: 'has', thing, span: thing.span };
      }
      case 'hold': {
        const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
        return { kind: 'holds', thing, span: thing.span };
      }
      case 'wear': {
        const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
        return { kind: 'wears', thing, span: thing.span };
      }
      case 'see':
      case 'reach': {
        const thing = this.parseNameRef(c, (tok) => tok.kind === 'word' && PHRASE_STOPS.has(tok.text));
        return { kind: 'can', ability: t.text, thing, span: mergeSpans(t.span, thing.span) };
      }
      default:
        this.diagnostics.error('parse.must-predicate', `Unknown predicate \`${t.text}\` after \`must\` — expected be, have, hold, wear, see, or reach.`, t.span);
        return null;
    }
  }

  /**
   * One pattern element (ADR-267): `the <slot>` (D15), a plain word, an
   * `or`-alternation of words (D8), or any of these wrapped in `[ ]` (D9).
   * Removed slot spellings (`(word)`, `:word`) and stray `or`/brackets are
   * named parse errors. Returns null after reporting — always having
   * consumed at least one token, so callers cannot loop in place.
   */
  private parsePatternElem(c: Cursor): PatternPart | null {
    const t = c.next()!;
    if (t.kind === 'lbracket') {
      if (c.atEnd() || c.peek()!.kind === 'rbracket') {
        this.diagnostics.error('parse.pattern-bracket', 'Empty `[]` in the pattern — brackets wrap the optional element (`[carefully]`).', t.span);
        if (!c.atEnd()) c.next();
        return null;
      }
      if (c.peek()!.kind === 'lbracket') {
        this.diagnostics.error('parse.pattern-bracket', 'Brackets do not nest in a pattern — one `[ ]` per optional element.', c.peek()!.span);
        return null;
      }
      const inner = this.parsePatternElem(c);
      if (!inner) return null;
      const close = c.next();
      if (!close || close.kind !== 'rbracket') {
        this.diagnostics.error('parse.pattern-bracket', 'Missing `]` after the optional element.', inner.span);
        return null;
      }
      return { ...inner, optional: true, span: mergeSpans(t.span, close.span) };
    }
    if (t.kind === 'word' && t.text === 'the') {
      const slot = c.next();
      if (!slot || slot.kind !== 'word') {
        this.diagnostics.error('parse.action-slot', 'Expected a slot name after `the` in the grammar pattern.', t.span);
        return null;
      }
      return { kind: 'slot', word: slot.text, span: mergeSpans(t.span, slot.span) };
    }
    if (t.kind === 'word' && t.text === 'or') {
      this.diagnostics.error('parse.pattern-or', '`or` joins two pattern words (`in or inside`) — it cannot start an element.', t.span);
      return null;
    }
    if (t.kind === 'word') {
      if (!c.isWord('or')) return { kind: 'word', word: t.text, span: t.span };
      // D8: adjacent literals joined by `or` — one alternation element,
      // emitted as ONE rule (never N split rules; rule identity, ADR-268).
      const words = [t.text];
      let end = t.span;
      while (c.isWord('or')) {
        const orTok = c.next()!;
        const w = c.next();
        if (!w || w.kind !== 'word' || w.text === 'the' || w.text === 'or') {
          this.diagnostics.error('parse.pattern-or', '`or` joins single pattern words (`in or inside`) — it cannot join slots or bracketed elements.', orTok.span);
          return null;
        }
        words.push(w.text);
        end = w.span;
      }
      return { kind: 'alt', words, span: mergeSpans(t.span, end) };
    }
    if (t.kind === 'lparen') {
      const slot = c.peek();
      const name = slot && slot.kind === 'word' ? slot.text : 'name';
      this.diagnostics.error(
        'parse.removed-slot-spelling',
        `The \`(${name})\` slot spelling was removed (ADR-267 D15) — write \`the ${name}\`.`,
        t.span,
      );
      return null;
    }
    if (t.kind === 'colon') {
      const slot = c.peek();
      const name = slot && slot.kind === 'word' ? slot.text : 'name';
      this.diagnostics.error(
        'parse.removed-slot-spelling',
        `The \`:${name}\` slot spelling was removed (ADR-267 D15) — write \`the ${name}\`.`,
        t.span,
      );
      if (slot && slot.kind === 'word') c.next();
      return null;
    }
    this.diagnostics.error('parse.action-pattern', `Unexpected \`${t.text}\` in a grammar pattern.`, t.span);
    return null;
  }

  /** grammar-block pattern lines: pattern elements (ADR-267 — `the <slot>`,
   *  `or`-alternation, `[optional]`), optional `→ each …` cardinality, and
   *  `means <key> <value>` static-default lines under their pattern (D12). */
  private parseActionPatterns(grammarLine: Line): ActionPattern[] {
    const patterns: ActionPattern[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > grammarLine.indent) {
      const line = this.lines[this.pos++];
      // ADR-267 D12: a line beginning `means` is a static default for the
      // pattern above it — never a pattern (the reserved-surface audit
      // holds the word; a leading `means` pattern is unwriteable).
      if (line.tokens[0]?.kind === 'word' && line.tokens[0].text === 'means') {
        const mc = new Cursor(line.tokens, line);
        mc.next(); // means
        const key = mc.next();
        const value = mc.next();
        if (!key || key.kind !== 'word' || !value || value.kind !== 'word' || !mc.atEnd()) {
          this.diagnostics.error('parse.action-means', 'Expected `means <key> <value>` (two single words).', lineSpan(line));
        } else if (patterns.length === 0) {
          this.diagnostics.error('parse.action-means', 'A `means` line sits under the pattern it serves — there is no pattern line above.', lineSpan(line));
        } else {
          patterns[patterns.length - 1].means.push({ key: key.text, value: value.text, span: lineSpan(line) });
        }
        continue;
      }
      const parts: PatternPart[] = [];
      let cardinality: string[] | null = null;
      const c = new Cursor(line.tokens, line);
      while (!c.atEnd()) {
        const t = c.peek()!;
        if (t.kind === 'punct' && t.text === '→') {
          c.next();
          cardinality = [];
          while (!c.atEnd()) cardinality.push(c.next()!.text);
          break;
        }
        const part = this.parsePatternElem(c);
        if (part) parts.push(part);
      }
      if (parts.length === 0) {
        this.diagnostics.error('parse.action-pattern', 'Empty grammar pattern.', lineSpan(line));
        continue;
      }
      patterns.push({ parts, means: [], cardinality, span: lineSpan(line) });
    }
    return patterns;
  }

  /** `the <slot> takes the rest of the line` — greedy slot (ADR-267 D10):
   *  greediness is a slot property (Sharpee `TEXT_GREEDY`), stated where
   *  slot properties are stated, never in the pattern line. */
  private parseGreedyLine(line: Line): GreedySlotDecl | null {
    const c = new Cursor(line.tokens, line);
    c.next(); // the
    const slot = c.next();
    if (!slot || slot.kind !== 'word') {
      this.diagnostics.error('parse.action-greedy', 'Expected `the <slot> takes the rest of the line`.', c.restSpan());
      return null;
    }
    for (const w of ['takes', 'the', 'rest', 'of', 'the', 'line']) {
      if (!c.matchWord(w)) {
        this.diagnostics.error('parse.action-greedy', 'Expected `the <slot> takes the rest of the line`.', c.restSpan());
        return null;
      }
    }
    if (!c.atEnd()) {
      this.diagnostics.error('parse.action-greedy', 'Nothing may follow `takes the rest of the line`.', c.restSpan());
      return null;
    }
    return { slot: slot.text, span: lineSpan(line) };
  }

  /** `directions` block lines (ADR-267 D12): each is `WORD { or WORD }` —
   *  the canonical direction first, aliases after each `or`. The block is
   *  dedent-terminated like the grammar block. */
  private parseDirectionsBlock(headerLine: Line): DirectionEntry[] {
    const entries: DirectionEntry[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].indent > headerLine.indent) {
      const line = this.lines[this.pos++];
      const c = new Cursor(line.tokens, line);
      const canonical = c.next();
      if (!canonical || canonical.kind !== 'word' || canonical.text === 'or') {
        this.diagnostics.error('parse.action-directions', 'Expected a direction word, optionally followed by `or <alias>` pairs.', lineSpan(line));
        continue;
      }
      const aliases: string[] = [];
      let bad = false;
      while (!c.atEnd()) {
        if (!c.matchWord('or')) {
          this.diagnostics.error('parse.action-directions', 'Aliases join with `or` (`north or n`).', c.restSpan());
          bad = true;
          break;
        }
        const alias = c.next();
        if (!alias || alias.kind !== 'word' || alias.text === 'or') {
          this.diagnostics.error('parse.action-directions', 'Expected an alias word after `or`.', c.restSpan());
          bad = true;
          break;
        }
        aliases.push(alias.text);
      }
      if (!bad) entries.push({ canonical: canonical.text, aliases, span: lineSpan(line) });
    }
    if (entries.length === 0) {
      this.diagnostics.error('parse.action-directions', 'A `directions` block needs at least one direction line.', lineSpan(headerLine));
    }
    return entries;
  }

  /** `the <slot> is an instrument` / `the <slot> is a topic` — typed slot
   *  (ADR-267 D11). Article `a`/`an` accepted either way; the type word is
   *  carried raw — the analyzer owns the closed-set check (ADR-271 D11
   *  precedent), so a new type word is one analyzer-table change. */
  private parseSlotTypeLine(line: Line): SlotTypeDecl | null {
    const c = new Cursor(line.tokens, line);
    c.next(); // the
    const slot = c.next();
    if (!slot || slot.kind !== 'word' || !c.matchWord('is')) {
      this.diagnostics.error('parse.action-slot-type', 'Expected `the <slot> is an instrument` or `the <slot> is a topic`.', c.restSpan());
      return null;
    }
    if (!c.matchWord('an') && !c.matchWord('a')) {
      this.diagnostics.error('parse.action-slot-type', 'Expected `an instrument` or `a topic` after `is`.', c.restSpan());
      return null;
    }
    const type = c.next();
    if (!type || type.kind !== 'word' || !c.atEnd()) {
      this.diagnostics.error('parse.action-slot-type', 'Expected a single type word (`instrument` or `topic`) ending the line.', c.restSpan());
      return null;
    }
    return { slot: slot.text, type: type.text, span: lineSpan(line) };
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
      this.diagnostics.error('parse.action-constraint', `Expected a requirement word (${Object.keys(SCOPE_REQUIREMENT_PREDICATES).join(', ')}).`, c.restSpan());
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
      if (!slot || slot.kind !== 'word' || !colon || colon.kind !== 'colon') {
        this.diagnostics.error('parse.action-refusal', 'Expected `refuse without <slot>: <phrase-key>`.', lineSpan(line));
        return null;
      }
      const key = this.readLabelKey(c); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
      if (!key) {
        this.diagnostics.error('parse.action-refusal', 'Expected `refuse without <slot>: <phrase-key>`.', lineSpan(line));
        return null;
      }
      return { kind: 'without', slot: slot.text, condition: null, phraseKey: key, span: lineSpan(line) };
    }
    // when: condition runs to the LAST colon; the key follows it.
    const colonIndex = line.tokens.map((t) => t.kind === 'colon').lastIndexOf(true);
    if (colonIndex === -1 || colonIndex >= line.tokens.length - 1) {
      this.diagnostics.error('parse.action-refusal', 'Expected `refuse when <condition>: <phrase-key>`.', lineSpan(line));
      return null;
    }
    const condCursor = new Cursor(line.tokens.slice(2, colonIndex), line);
    const condition = this.parseCondition(condCursor, line);
    const keyCursor = new Cursor(line.tokens.slice(colonIndex + 1), line);
    const key = this.readLabelKey(keyCursor); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
    if (!key || !keyCursor.atEnd()) {
      this.diagnostics.error('parse.action-refusal', 'Expected a phrase key after the colon.', lineSpan(line));
      return null;
    }
    return { kind: 'when', slot: null, condition, phraseKey: key, span: lineSpan(line) };
  }

  /** `define chain <name> from "<module>"` — a TS chain hatch (ADR-094): the
   *  named stdlib event chain is replaced by the module's handler. */
  private parseDefineChainHatch(): DefineHatch | null {
    const line = this.lines[this.pos];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define chain
    const name = this.readLabelKey(c); // curated chain alias, single kebab word (ADR-254)
    if (!name) {
      this.diagnostics.error(
        'parse.chain-hatch-name',
        'Expected a chain name after `define chain` (e.g. `define chain opened-revealed from "…"`).',
        c.restSpan(),
      );
      this.pos++;
      return null;
    }
    return this.parseHatchTail(line, c, 'chain', name);
  }

  /** Shared `from "<module>"` tail for action / chain hatches. */
  private parseHatchTail(line: Line, c: Cursor, hatchKind: 'action' | 'chain', name: string): DefineHatch | null {
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
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      const sc = new Cursor(line.tokens, line);
      let timing: SequenceStep['timing'] | null = null;
      let turns = 0;
      let owner: NameRef | null = null;
      let state: string | null = null;
      if (sc.isWord('at') && sc.isWord('turn', 1)) {
        sc.next();
        sc.next();
        const n = sc.next();
        if (n && n.kind === 'number') {
          timing = 'at-turn';
          turns = Number(n.text);
        }
      } else if (line.tokens[0]?.kind === 'number' && line.tokens[1]?.text === 'turns' && line.tokens[2]?.text === 'later') {
        timing = 'later';
        turns = Number(line.tokens[0].text);
      } else if (sc.isWord('when')) {
        // `when <owner> becomes <state>` — state anchor (ratchet D10).
        sc.next();
        owner = this.parseNameRef(sc, (t) => t.kind === 'word' && t.text === 'becomes');
        if (sc.matchWord('becomes')) {
          const st = sc.next();
          if (st && st.kind === 'word') {
            timing = 'becomes';
            state = st.text;
          } else {
            this.diagnostics.error('parse.sequence-anchor', 'Expected a state name after `becomes`.', sc.restSpan());
          }
        } else {
          this.diagnostics.error('parse.sequence-anchor', 'Expected `when <owner> becomes <state>` in the step anchor.', sc.restSpan());
        }
      }
      if (!timing) {
        this.diagnostics.error('parse.sequence-step', 'Expected `at turn <n>`, `<n> turns later`, or `when <owner> becomes <state>` to open a sequence step.', lineSpan(line));
        this.pos++;
        continue;
      }
      this.pos++;
      const body = this.parseStatements(line.indent, 'sequence');
      steps.push({ kind: 'sequence-step', timing, turns, owner, state, body, span: lineSpan(line) });
    }
    const endSpan = this.consumeEnd('sequence', headLine);
    return { kind: 'define-sequence', name, steps, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /**
   * `define topics for <entity> … end topics` (ADR-239 D3 as amended) —
   * the ask/tell topic table: `about` rows in two tiers (entity /
   * quoted free-text with comma-separated aliases), each answering with
   * a one-line statement or an indented statement body.
   */
  private parseDefineTopics(): DefineTopics {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define topics
    let owner: NameRef;
    if (!c.matchWord('for')) {
      this.diagnostics.error('parse.topics-for', 'Expected `for <entity>` after `define topics`.', c.restSpan());
      owner = { kind: 'name', article: null, words: [], span: lineSpan(headLine) };
    } else {
      owner = this.parseNameRef(c, () => false);
      if (owner.words.length === 0 || !c.atEnd()) {
        this.diagnostics.error('parse.topics-for', 'Expected `define topics for <entity>` — the owner name runs to the end of the line.', c.restSpan());
      }
    }

    const decl: DefineTopics = { kind: 'define-topics', owner, rows: [], span: lineSpan(headLine) };
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const word = firstWord(line);
      const lc = new Cursor(line.tokens, line);
      if (word === 'end' && lc.isWord('topics', 1)) {
        this.pos++;
        decl.span = mergeSpans(decl.span, lineSpan(line));
        if (decl.rows.length === 0) {
          this.diagnostics.error('parse.topics-empty', 'This `define topics` block declares no rows — add `about …: <response>` rows, or remove the block.', decl.span);
        }
        return decl;
      }
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (line.indent === 0) break; // dedent without `end topics` — reported below
      decl.span = mergeSpans(decl.span, lineSpan(line));
      if (word === 'about') {
        const row = this.parseTopicRow(line);
        if (row) {
          decl.rows.push(row);
          decl.span = mergeSpans(decl.span, row.span);
        }
        continue;
      }
      this.diagnostics.error(
        'parse.topics-row',
        `Unrecognized line in \`define topics\`: \`${line.raw.trim()}\` — expected an \`about …: <response>\` row or \`end topics\`.`,
        lineSpan(line),
      );
      this.pos++;
    }
    this.diagnostics.error('parse.topics-end', 'Expected `end topics` to close the block.', decl.span);
    if (decl.rows.length === 0) {
      this.diagnostics.error('parse.topics-empty', 'This `define topics` block declares no rows — add `about …: <response>` rows, or remove the block.', decl.span);
    }
    return decl;
  }

  /**
   * One `about …: <response>` row. Entity tier: `about the <entity>:`.
   * Free-text tier: `about "<text>"[, "<text>" …]:` — comma-separated
   * quoted aliases (spelling ruled 2026-07-18). The response is either the
   * rest of the line (one statement) or an indented statement body.
   */
  private parseTopicRow(headLine: Line): TopicRow | null {
    const c = new Cursor(headLine.tokens, headLine);
    c.next(); // about
    let filter: TopicRow['filter'];
    const first = c.peek();
    if (first && first.kind === 'string') {
      c.next();
      if (first.text.trim() === '') {
        this.diagnostics.error('parse.topics-row', 'A quoted topic cannot be empty.', first.span);
        this.pos++;
        return null;
      }
      const aliases: string[] = [];
      let span = first.span;
      while (c.peek()?.kind === 'comma') {
        c.next();
        const alias = c.next();
        if (!alias || alias.kind !== 'string' || alias.text.trim() === '') {
          this.diagnostics.error(
            'parse.topics-alias',
            'Expected a quoted alias after the comma — aliases are declared quoted spellings: `about "treasure", "the hoard": …`.',
            alias?.span ?? c.restSpan(),
          );
          this.pos++;
          return null;
        }
        aliases.push(alias.text);
        span = mergeSpans(span, alias.span);
      }
      filter = { kind: 'text', primary: first.text, aliases, span };
    } else {
      const ref = this.parseNameRef(c, () => false);
      if (ref.words.length === 0) {
        this.diagnostics.error('parse.topics-row', 'Expected an entity name or a quoted topic after `about`.', c.restSpan());
        this.pos++;
        return null;
      }
      filter = { kind: 'entity', ref };
    }

    const colon = c.next();
    if (!colon || colon.kind !== 'colon') {
      this.diagnostics.error('parse.topics-colon', 'Expected `:` after the topic key.', colon?.span ?? c.restSpan());
      this.pos++;
      return null;
    }

    let body: Statement[];
    let span = lineSpan(headLine);
    if (!c.atEnd()) {
      // One-line response: the rest of the line is a single statement.
      // parseStatement consumes this.lines[this.pos] (the row line itself).
      const rest: Line = { ...headLine, tokens: headLine.tokens.slice(c.i) };
      const stmt = this.parseStatement(rest, 'topics');
      if (!stmt) return null; // the statement error is already reported
      body = [stmt];
    } else {
      // Indented statement body on the following lines.
      this.pos++;
      body = this.parseStatements(headLine.indent, 'topics');
      if (body.length > 0) span = mergeSpans(span, body[body.length - 1].span);
    }
    if (body.length === 0) {
      this.diagnostics.error('parse.topics-response', 'Expected a response — a one-line statement after the `:`, or an indented statement body.', lineSpan(headLine));
      return null;
    }
    return { kind: 'topic-row', filter, body, span };
  }

  // ------------------------------------------------------------- on clause

  /**
   * `on <verb> it` (intercept) / `after <verb> it` (react, ratchet D3) /
   * `on every turn` — with `while <cond>` on any binding and the `, once`
   * clause modifier (D5). Terminated by `end on` / `end after`.
   */
  private parseOnClause(indent: number, clauseKind: 'on' | 'after'): OnClause {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord(clauseKind);
    const action = c.next();
    let actionWord = '';
    if (action && action.kind === 'word') {
      actionWord = action.text;
    } else {
      this.diagnostics.error('parse.on-action', `Expected an action word after \`${clauseKind}\`.`, lineSpan(headLine));
    }

    let binding: OnClause['binding'] = 'it';
    let role: string | null = null;
    let condition: ConditionNode | null = null;
    let once = false;
    let ordering: OnClause['ordering'] = null;

    if (actionWord === 'every' && c.isWord('turn')) {
      // `on every turn [while <condition>] [, once]` (§3.3 + D5).
      c.next();
      binding = 'every-turn';
      actionWord = 'every-turn';
      if (clauseKind === 'after') {
        this.diagnostics.error('parse.after-every-turn', '`after every turn` is not a form — every-turn clauses are `on every turn` (they are not reactions to an action).', lineSpan(headLine));
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
        this.diagnostics.error('parse.on-target', `Expected \`it\`, \`anything as the <role>\`, or \`every turn\` in the \`${clauseKind}\` header.`, c.restSpan());
      }
    }

    // `while <condition>` — legal on every binding (ownership package).
    if (c.matchWord('while')) {
      condition = this.parseCondition(c, headLine);
    }

    // Comma modifiers: `, once` (D5) and `, before/after <trait>` ordering (§2.2).
    while (c.peek()?.kind === 'comma') {
      c.next();
      const mod = c.next();
      if (mod && mod.kind === 'word' && mod.text === 'once') {
        once = true;
      } else if (mod && (mod.text === 'before' || mod.text === 'after')) {
        const traitTok = c.next();
        if (traitTok && traitTok.kind === 'word') {
          ordering = { relation: mod.text as 'before' | 'after', trait: traitTok.text };
        } else {
          this.diagnostics.error('parse.on-ordering', `Expected a trait name after \`${mod.text}\`.`, c.restSpan());
        }
      } else {
        this.diagnostics.error('parse.on-modifier', 'Expected `once`, `before <trait>`, or `after <trait>` after the comma.', mod?.span ?? c.restSpan());
      }
    }

    const body = this.parseStatements(headLine.indent, clauseKind);
    const endSpan = this.consumeEnd(clauseKind, headLine);

    return {
      kind: 'on-clause',
      clauseKind,
      action: actionWord,
      binding,
      role,
      condition,
      once,
      ordering,
      body,
      span: mergeSpans(lineSpan(headLine), endSpan),
    };
  }

  /**
   * ADR-216 media sugar statements: `play sound|music|ambient <asset>
   * [looping]`, `stop music|ambient`, `show image <asset> [in <layer>]`,
   * `hide image`, `transition <kind>`, `clear` — each with the standard
   * `when` suffix. Asset resolution/kind-checking is the analyzer's.
   */
  private parseMediaStatement(first: string, c: Cursor, line: Line): MediaStmt | null {
    c.next(); // the keyword
    const fail = (message: string): null => {
      this.diagnostics.error('parse.media', message, lineSpan(line));
      return null;
    };
    let form: MediaStmt['form'];
    let asset: string | null = null;
    let layer: string | null = null;
    let channel: string | null = null;
    let looping = false;
    let transitionKind: string | null = null;

    /** ADR-241 D3: optional `in <channel-word>` tail on the ambient forms. */
    const parseChannelTail = (): boolean => {
      if (!c.matchWord('in')) return true;
      const channelTok = c.next();
      if (!channelTok || channelTok.kind !== 'word') {
        fail('Expected a channel word after `in`.');
        return false;
      }
      channel = channelTok.text;
      return true;
    };

    if (first === 'play') {
      const what = c.next();
      if (!what || what.kind !== 'word' || !['sound', 'music', 'ambient'].includes(what.text)) {
        return fail('Expected `play sound|music|ambient <asset>`.');
      }
      const assetTok = c.next();
      if (!assetTok || assetTok.kind !== 'word') return fail(`Expected a declared asset name after \`play ${what.text}\`.`);
      asset = assetTok.text;
      if (what.text === 'music' && c.isWord('looping')) {
        c.next();
        looping = true;
      }
      if (what.text === 'ambient' && !parseChannelTail()) return null;
      form = `play-${what.text}` as MediaStmt['form'];
    } else if (first === 'stop') {
      const what = c.next();
      if (!what || what.kind !== 'word' || !['music', 'ambient'].includes(what.text)) {
        return fail('Expected `stop music` or `stop ambient`.');
      }
      if (what.text === 'ambient' && !parseChannelTail()) return null;
      form = `stop-${what.text}` as MediaStmt['form'];
    } else if (first === 'show') {
      if (!c.matchWord('image')) return fail('Expected `show image <asset> [in <layer>]`.');
      const assetTok = c.next();
      if (!assetTok || assetTok.kind !== 'word') return fail('Expected a declared asset name after `show image`.');
      asset = assetTok.text;
      if (c.matchWord('in')) {
        const layerTok = c.next();
        if (!layerTok || layerTok.kind !== 'word') return fail('Expected a layer word after `in`.');
        layer = layerTok.text;
      }
      form = 'show-image';
    } else if (first === 'hide') {
      if (!c.matchWord('image')) return fail('Expected `hide image`.');
      form = 'hide-image';
    } else if (first === 'transition') {
      const kindTok = c.next();
      if (!kindTok || kindTok.kind !== 'word') return fail('Expected a transition kind after `transition` (e.g. `transition fade`).');
      transitionKind = kindTok.text;
      form = 'transition';
    } else {
      form = 'clear';
    }

    const stmtWhen = this.parseStatementWhen(c, line);
    if (!c.atEnd()) return fail(`Unexpected trailing text: \`${c.peek()!.text}\`.`);
    return { kind: 'media', form, asset, layer, channel, looping, transitionKind, stmtWhen, span: lineSpan(line) };
  }

  /**
   * `define channel <name> … end channel` (ADR-216; spelling A): keyword
   * body lines `mode <word>`, `gated by <capability>`, `from event
   * <dotted.key>`, `take <field>, …`. Value validation (mode set,
   * capability flags, required lines) is the analyzer's.
   */
  private parseDefineChannel(): DefineChannel | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define channel
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.channel-name', 'Expected a channel name after `define channel`.', lineSpan(headLine));
      return null;
    }
    const decl: DefineChannel = {
      kind: 'define-channel',
      name: nameTok.text,
      mode: null,
      gatedBy: null,
      fromEvent: null,
      returns: null,
      span: lineSpan(headLine),
    };

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const word = firstWord(line);
      const lc = new Cursor(line.tokens, line);
      if (word === 'end' && lc.isWord('channel', 1)) {
        this.pos++;
        decl.span = mergeSpans(decl.span, lineSpan(line));
        return decl;
      }
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (line.indent === 0) break;
      decl.span = mergeSpans(decl.span, lineSpan(line));
      this.pos++;
      if (word === 'mode') {
        lc.next();
        const modeTok = lc.next();
        if (!modeTok || modeTok.kind !== 'word' || !lc.atEnd()) {
          this.diagnostics.error('parse.channel-mode', 'Expected `mode replace|append|event`.', lineSpan(line));
        } else {
          decl.mode = modeTok.text;
        }
        continue;
      }
      if (word === 'gated' && lc.isWord('by', 1)) {
        lc.next();
        lc.next();
        const capTok = lc.next();
        if (!capTok || capTok.kind !== 'word' || !lc.atEnd()) {
          this.diagnostics.error('parse.channel-gate', 'Expected `gated by <capability>`.', lineSpan(line));
        } else {
          decl.gatedBy = capTok.text;
        }
        continue;
      }
      if (word === 'return') {
        // ADR-253 D1: `return <field | "text" | phrase <key>> from <event>` —
        // the event rides this clause (the standalone `from event`/`take` lines
        // are removed below).
        lc.next(); // return
        const returns = this.parseChannelReturn(lc, line);
        if (!returns) continue; // error already reported
        if (!lc.matchWord('from')) {
          this.diagnostics.error(
            'parse.channel-return',
            'Expected `from <event>` after the returned construct — `return <construct> from <event>`.',
            lineSpan(line),
          );
          continue;
        }
        const key = this.readLabelKey(lc); // ADR-256: dotless Chord event id; the loader translates to the platform id
        if (!key || !lc.atEnd()) {
          this.diagnostics.error('parse.channel-return', 'Expected a single event id after `from`.', lineSpan(line));
          continue;
        }
        decl.returns = returns;
        decl.fromEvent = key;
        // ADR-300 D10: a record's members are the indented lines that follow.
        if (returns.kind === 'record') {
          returns.members = this.parseChannelRecordMembers();
          if (this.pos > 0) decl.span = mergeSpans(decl.span, lineSpan(this.lines[this.pos - 1]));
        }
        continue;
      }
      if (word === 'from' && lc.isWord('event', 1)) {
        this.diagnostics.error(
          'parse.channel-from-removed',
          '`from event` was removed (ADR-253) — the event rides the `return … from <event>` clause: `return <construct> from <event>`.',
          lineSpan(line),
        );
        continue;
      }
      if (word === 'take') {
        this.diagnostics.error(
          'parse.channel-take-removed',
          '`take` was removed (ADR-253) — a channel `return`s a construct: `return <field> from <event>`, `return "text (slot)" from <event>`, or `return phrase <key> from <event>`.',
          lineSpan(line),
        );
        continue;
      }
      this.diagnostics.error(
        'parse.channel-body',
        `Unrecognized line in \`define channel\`: \`${line.raw.trim()}\` — expected \`mode\`, \`gated by\`, \`return … from <event>\`, or \`end channel\`.`,
        lineSpan(line),
      );
    }
    this.diagnostics.error('parse.channel-end', 'Expected `end channel` to close the block.', decl.span);
    return decl;
  }

  /**
   * Parse the construct after `return` (ADR-253 D1), stopping before `from`:
   * a `"quoted"` text template, a `phrase <key>`, `record` (ADR-300 D10), or
   * a bare field word. On a malformed construct reports
   * `parse.channel-return` and returns null.
   *
   * `record` returns an empty-membered node; the caller fills its members
   * from the indented block that follows the `from <event>` tail, since the
   * members are lines and this parses within one line.
   *
   * @param allowRecord false inside a record's own members — records do not
   *   nest, and the attempt is reported by name rather than mis-parsed.
   */
  private parseChannelReturn(lc: Cursor, line: Line, allowRecord = true): ChannelReturn | null {
    const tok = lc.peek();
    if (!tok) {
      this.diagnostics.error('parse.channel-return', 'Expected a field, a "text" template, `phrase <key>`, or `record` after `return`.', lineSpan(line));
      return null;
    }
    if (tok.kind === 'word' && tok.text === 'record') {
      if (!allowRecord) {
        this.diagnostics.error(
          'parse.channel-record-nested',
          'A `record` member cannot itself be a `record` — records do not nest. Use a `list of <field>` member, or a second channel.',
          lineSpan(line),
        );
        return null;
      }
      lc.next();
      return { kind: 'record', members: [] };
    }
    if (tok.kind === 'string') {
      lc.next();
      return { kind: 'text', text: tok.text };
    }
    if (tok.kind === 'word' && tok.text === 'phrase') {
      lc.next(); // phrase
      const key = this.readLabelKey(lc);
      if (!key) {
        this.diagnostics.error('parse.channel-return', 'Expected a phrase key after `return phrase`.', lineSpan(line));
        return null;
      }
      return { kind: 'phrase', phrase: key };
    }
    if (tok.kind === 'word') {
      const field = this.readLabelKey(lc);
      if (!field) {
        this.diagnostics.error('parse.channel-return', 'Expected a field name after `return`.', lineSpan(line));
        return null;
      }
      return { kind: 'field', field };
    }
    this.diagnostics.error('parse.channel-return', 'Expected a field, a "text" template, `phrase <key>`, or `record` after `return`.', lineSpan(line));
    return null;
  }

  /**
   * Read the indented member lines of a `return record from <event>` block
   * (ADR-300 D10) up to and including `end record`.
   *
   * Each line is `<member-name> <construct>` or
   * `<member-name> list of <construct>`, where a construct is the same set
   * `return` accepts minus `record` itself. Members project from the same
   * event payload the record's `from <event>` names — a record is one event
   * read as structure, not several events joined.
   *
   * Advances `this.pos` past `end record`. Reports and returns whatever it
   * collected on a malformed member, so one bad line does not cascade.
   */
  private parseChannelRecordMembers(): ChannelRecordMember[] {
    const members: ChannelRecordMember[] = [];
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const word = firstWord(line);
      const mc = new Cursor(line.tokens, line);
      if (word === 'end' && mc.isWord('record', 1)) {
        this.pos++;
        return members;
      }
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      // Dedent out of the record block: let `define channel`'s own loop
      // report the missing `end record` rather than swallowing the line.
      if (line.indent === 0) break;
      this.pos++;

      const nameTok = mc.next();
      if (!nameTok || nameTok.kind !== 'word') {
        this.diagnostics.error(
          'parse.channel-record-member',
          'Expected a member name — `<name> <construct>` or `<name> list of <construct>`.',
          lineSpan(line),
        );
        continue;
      }
      let list = false;
      if (mc.isWord('list') && mc.isWord('of', 1)) {
        mc.next();
        mc.next();
        list = true;
      }
      const value = this.parseChannelReturn(mc, line, false);
      if (value !== null && !mc.atEnd()) {
        this.diagnostics.error(
          'parse.channel-record-member',
          `Unexpected trailing text in record member \`${nameTok.text}\`: \`${mc.peek()!.text}\`.`,
          lineSpan(line),
        );
      }
      members.push({ name: nameTok.text, list, value, span: lineSpan(line) });
    }
    this.diagnostics.error(
      'parse.channel-record-end',
      'Expected `end record` to close the `return record` block.',
      this.pos > 0 ? lineSpan(this.lines[this.pos - 1]) : spanOf(1, 1, 1),
    );
    return members;
  }

  /**
   * `define pronouns <name> … end pronouns` (ADR-242 D7, ruled Q-1):
   * five named rows, each `<case> <form>` — `subject`, `object`,
   * `possessive`, `possessive-pronoun`, `reflexive`. Row completeness,
   * duplicates, and standard-word shadowing are the analyzer's gates
   * (the parseDefineChannel split: parser collects, analyzer validates).
   */
  private parseDefinePronouns(): DefinePronouns | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define pronouns
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word' || !c.atEnd()) {
      this.diagnostics.error('parse.pronouns-name', 'Expected a set name after `define pronouns` (e.g. `define pronouns ze`).', lineSpan(headLine));
      return null;
    }
    const decl: DefinePronouns = {
      kind: 'define-pronouns',
      name: nameTok.text.toLowerCase(),
      rows: [],
      span: lineSpan(headLine),
    };

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const word = firstWord(line);
      const lc = new Cursor(line.tokens, line);
      if (word === 'end' && lc.isWord('pronouns', 1)) {
        this.pos++;
        decl.span = mergeSpans(decl.span, lineSpan(line));
        return decl;
      }
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (line.indent === 0) break;
      decl.span = mergeSpans(decl.span, lineSpan(line));
      this.pos++;
      if (word && PRONOUN_CASES.includes(word)) {
        lc.next();
        const formTok = lc.next();
        if (!formTok || formTok.kind !== 'word' || !lc.atEnd()) {
          this.diagnostics.error('parse.pronouns-row', `Expected one form word after \`${word}\` (e.g. \`${word} zir\`).`, lineSpan(line));
        } else {
          decl.rows.push({ case: word, form: formTok.text, span: lineSpan(line) });
        }
        continue;
      }
      this.diagnostics.error(
        'parse.pronouns-body',
        `Unrecognized line in \`define pronouns\`: \`${line.raw.trim()}\` — expected \`${PRONOUN_CASES.join('`, `')}\`, or \`end pronouns\`.`,
        lineSpan(line),
      );
    }
    this.diagnostics.error('parse.pronouns-end', 'Expected `end pronouns` to close the block.', decl.span);
    return decl;
  }

  /** `define sound|image|music <name> from "<file>"` (ADR-216) — data asset. */
  private parseDefineAsset(assetKind: 'sound' | 'image' | 'music'): DefineAsset | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define <kind>
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.asset-name', `Expected an asset name after \`define ${assetKind}\`.`, c.restSpan());
      return null;
    }
    if (!c.matchWord('from')) {
      this.diagnostics.error('parse.asset-from', `Expected \`from "<file>"\` in the ${assetKind} declaration.`, c.restSpan());
      return null;
    }
    const pathTok = c.next();
    if (!pathTok || pathTok.kind !== 'string') {
      this.diagnostics.error('parse.asset-path', 'Expected a quoted file path after `from`.', c.restSpan());
      return null;
    }
    return { kind: 'define-asset', assetKind, name: nameTok.text, path: pathTok.text, span: lineSpan(line) };
  }

  /**
   * `define ambient <word>` / `define layer <word>` (ADR-241 D2): a
   * one-line named family channel declaration. Exactly one word — the
   * bed/layer name; the registered id is the loader's business.
   */
  private parseDefineFamilyChannel(family: 'ambient' | 'layer'): DefineFamilyChannel | null {
    const line = this.lines[this.pos++];
    const c = new Cursor(line.tokens, line);
    c.next();
    c.next(); // define ambient|layer
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error(
        'parse.channel-name',
        `Expected a ${family === 'ambient' ? 'bed' : 'layer'} name after \`define ${family}\`.`,
        c.restSpan(),
      );
      return null;
    }
    if (!c.atEnd()) {
      this.diagnostics.error(
        'parse.channel-name',
        `Unexpected trailing text after \`define ${family} ${nameTok.text}\` — the declaration is one word.`,
        c.restSpan(),
      );
      return null;
    }
    return { kind: 'define-family-channel', family, name: nameTok.text, span: lineSpan(line) };
  }

  // ---------------------------------------------------------- emit payload

  /**
   * ADR-216 payload fields: `<field> <value>` separated by `and` at the
   * flat (statement) level, by commas inside `{ … }` objects. Values:
   * literals, `[ … ]` arrays, `{ … }` objects, or value expressions
   * (world-state reads).
   */
  private parseEmitFields(c: Cursor, line: Line, mode: 'flat' | 'braced'): EmitField[] {
    const fields: EmitField[] = [];
    for (;;) {
      if (mode === 'braced' && c.peek()?.kind === 'rbrace') break;
      if (mode === 'flat' && (c.atEnd() || c.isWord('when'))) break;
      const startTok = c.peek();
      const key: string[] = [];
      while (!c.atEnd() && c.peek()!.kind === 'word' && !c.isWord('and') && !c.isWord('when')) {
        const t = c.peek()!;
        if (ARTICLES.has(t.text) && key.length > 0) break;
        const after = c.peek(1);
        const atValuePosition =
          !after ||
          after.kind === 'comma' ||
          after.kind === 'rbrace' ||
          (after.kind === 'word' && (after.text === 'and' || after.text === 'when'));
        if (atValuePosition && key.length > 0) break;
        key.push(t.text);
        c.next();
      }
      if (key.length === 0) {
        this.diagnostics.error('parse.emit-payload', 'Expected a payload field name.', c.restSpan());
        break;
      }
      const value = this.parseEmitValue(c, line);
      if (!value) break;
      fields.push({ key, value, span: startTok ? mergeSpans(startTok.span, value.span) : value.span });
      if (mode === 'flat') {
        if (!c.matchWord('and')) break;
      } else if (c.peek()?.kind === 'comma') {
        c.next();
      } else {
        break;
      }
    }
    return fields;
  }

  /** One ADR-216 payload value (recursive: literals, arrays, objects, value exprs). */
  private parseEmitValue(c: Cursor, line: Line): EmitValue | null {
    const t = c.peek();
    if (!t) {
      this.diagnostics.error('parse.emit-payload', 'Expected a payload value.', c.restSpan());
      return null;
    }
    if (t.kind === 'number' || t.kind === 'string') {
      c.next();
      return { kind: 'literal', value: t.text, literalKind: t.kind, span: t.span };
    }
    if (t.kind === 'lbracket') {
      c.next();
      const items: EmitValue[] = [];
      while (c.peek() && c.peek()!.kind !== 'rbracket') {
        const item = this.parseEmitValue(c, line);
        if (!item) break;
        items.push(item);
        if (c.peek()?.kind === 'comma') c.next();
        else break;
      }
      const close = c.next();
      let endSpan = t.span;
      if (!close || close.kind !== 'rbracket') {
        this.diagnostics.error('parse.emit-payload', 'Expected `]` to close the array.', c.restSpan());
      } else {
        endSpan = close.span;
      }
      return { kind: 'array', items, span: mergeSpans(t.span, endSpan) };
    }
    if (t.kind === 'lbrace') {
      c.next();
      const fields = this.parseEmitFields(c, line, 'braced');
      const close = c.next();
      let endSpan = t.span;
      if (!close || close.kind !== 'rbrace') {
        this.diagnostics.error('parse.emit-payload', 'Expected `}` to close the object.', c.restSpan());
      } else {
        endSpan = close.span;
      }
      return { kind: 'object', fields, span: mergeSpans(t.span, endSpan) };
    }
    const expr = this.parseValueExpr(c, line, EMIT_VALUE_STOPS);
    return { kind: 'expr', expr, span: expr.span };
  }

  // -------------------------------------------------------------- machines

  /**
   * `define machine <name> … end machine` (ADR-215 `use state-machines`
   * depth; spelling A ratified 2026-07-18): `role <name> is <entity>`
   * bindings, `starts <state>`, and `state <name>[, terminal]` blocks. The
   * `use` requirement is the analyzer's gate.
   */
  private parseDefineMachine(): DefineMachine | null {
    const headLine = this.lines[this.pos++];
    const c = new Cursor(headLine.tokens, headLine);
    c.next();
    c.next(); // define machine
    const name: string[] = [];
    while (!c.atEnd() && c.peek()!.kind === 'word') name.push(c.next()!.text);
    if (name.length === 0) {
      this.diagnostics.error('parse.machine-name', 'Expected a machine name after `define machine`.', lineSpan(headLine));
    }
    const decl: DefineMachine = { kind: 'define-machine', name, roles: [], initialState: null, states: [], span: lineSpan(headLine) };

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      const word = firstWord(line);
      const lc = new Cursor(line.tokens, line);
      if (word === 'end' && lc.isWord('machine', 1)) {
        this.pos++;
        decl.span = mergeSpans(decl.span, lineSpan(line));
        return decl;
      }
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      if (line.indent === 0) break; // dedent without `end machine` — reported below
      decl.span = mergeSpans(decl.span, lineSpan(line));
      if (word === 'role') {
        this.pos++;
        lc.next();
        const roleTok = lc.next();
        if (!roleTok || roleTok.kind !== 'word' || !lc.matchWord('is')) {
          this.diagnostics.error('parse.machine-role', 'Expected `role <name> is <entity>`.', lineSpan(line));
          continue;
        }
        const entity = this.parseNameRef(lc, () => false);
        if (entity.words.length === 0 || !lc.atEnd()) {
          this.diagnostics.error('parse.machine-role', 'Expected `role <name> is <entity>`.', lineSpan(line));
          continue;
        }
        decl.roles.push({ name: roleTok.text, entity, span: lineSpan(line) });
        continue;
      }
      if (word === 'starts') {
        this.pos++;
        lc.next();
        const stateTok = lc.next();
        if (!stateTok || stateTok.kind !== 'word' || !lc.atEnd()) {
          this.diagnostics.error('parse.machine-starts', 'Expected `starts <state>`.', lineSpan(line));
          continue;
        }
        if (decl.initialState !== null) {
          this.diagnostics.error('parse.machine-starts', 'This machine already declared its `starts` state.', lineSpan(line));
          continue;
        }
        decl.initialState = stateTok.text;
        continue;
      }
      if (word === 'state') {
        const state = this.parseMachineState(line);
        if (state) {
          decl.states.push(state);
          decl.span = mergeSpans(decl.span, state.span);
        }
        continue;
      }
      this.diagnostics.error('parse.machine-body', `Unrecognized line in \`define machine\`: \`${line.raw.trim()}\` — expected \`role\`, \`starts\`, \`state\`, or \`end machine\`.`, lineSpan(line));
      this.pos++;
    }
    this.diagnostics.error('parse.machine-end', 'Expected `end machine` to close the block.', decl.span);
    return decl;
  }

  /** One `state <name>[, terminal]` block: transition lines + `on enter`/`on exit` bodies. */
  private parseMachineState(headLine: Line): MachineState | null {
    this.pos++;
    const c = new Cursor(headLine.tokens, headLine);
    c.next(); // state
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.machine-state', 'Expected a state name after `state`.', lineSpan(headLine));
      return null;
    }
    let terminal = false;
    if (c.peek()?.kind === 'comma') {
      c.next();
      if (c.matchWord('terminal')) terminal = true;
      else this.diagnostics.error('parse.machine-state', 'Only `, terminal` may follow the state name.', c.restSpan());
    }
    const state: MachineState = { name: nameTok.text, terminal, transitions: [], onEnter: [], onExit: [], span: lineSpan(headLine) };

    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= headLine.indent) break; // next state / end machine
      state.span = mergeSpans(state.span, lineSpan(line));
      const word = firstWord(line);
      if (word === 'when') {
        const transition = this.parseMachineTransition(line);
        if (transition) state.transitions.push(transition);
        continue;
      }
      if (word === 'on') {
        const lc = new Cursor(line.tokens, line);
        lc.next();
        const which = lc.next();
        if (which && which.kind === 'word' && (which.text === 'enter' || which.text === 'exit') && lc.atEnd()) {
          this.pos++;
          const body = this.parseStatements(line.indent, 'on');
          const endSpan = this.consumeEnd('on', line);
          state.span = mergeSpans(state.span, endSpan);
          if (which.text === 'enter') state.onEnter.push(...body);
          else state.onExit.push(...body);
          continue;
        }
        this.diagnostics.error('parse.machine-on', 'Only `on enter` and `on exit` blocks live in a machine `state`.', lineSpan(line));
        this.pos++;
        continue;
      }
      this.diagnostics.error('parse.machine-state-body', `Unrecognized line in a machine \`state\` block: \`${line.raw.trim()}\` — expected \`when …: <state>\`, \`on enter\`, or \`on exit\`.`, lineSpan(line));
      this.pos++;
    }
    return state;
  }

  /**
   * `when <trigger>[ while <condition>]: <target-state>`. Triggers:
   * `event <dotted.key>`, `<gerund> <entity name>` (action on a target),
   * a single bare word (analyzer resolves condition-vs-gerund), or a
   * condition.
   */
  private parseMachineTransition(line: Line): MachineTransition | null {
    this.pos++;
    const tokens = line.tokens;
    const colonIndex = tokens.map((t) => t.kind === 'colon').lastIndexOf(true);
    if (colonIndex === -1 || colonIndex !== tokens.length - 2 || tokens[tokens.length - 1].kind !== 'word') {
      this.diagnostics.error('parse.machine-when', 'Expected `when <trigger>[ while <condition>]: <target-state>`.', lineSpan(line));
      return null;
    }
    const target = tokens[tokens.length - 1].text;
    let head = tokens.slice(1, colonIndex);
    let condition: ConditionNode | null = null;
    const whileIndex = head.findIndex((t) => t.kind === 'word' && t.text === 'while');
    if (whileIndex !== -1) {
      condition = this.parseCondition(new Cursor(head.slice(whileIndex + 1), line), line);
      head = head.slice(0, whileIndex);
    }
    const hc = new Cursor(head, line);
    const first = hc.peek();
    if (!first) {
      this.diagnostics.error('parse.machine-when', 'Expected a trigger after `when`.', lineSpan(line));
      return null;
    }
    let trigger: MachineTransition['trigger'];
    if (first.kind === 'word' && first.text === 'event') {
      hc.next();
      const key = this.readLabelKey(hc); // ADR-256: dotless Chord event id; story-loader translates to the platform id
      if (!key || !hc.atEnd()) {
        this.diagnostics.error('parse.machine-when', 'Expected `event <event.key>`.', lineSpan(line));
        return null;
      }
      trigger = { kind: 'event', event: key };
    } else if (first.kind === 'word' && !ARTICLES.has(first.text) && head.length === 1) {
      trigger = { kind: 'word', word: first.text, span: first.span };
    } else if (first.kind === 'word' && !ARTICLES.has(first.text) && head[1]?.kind === 'word' && (ARTICLES.has(head[1].text) || head[1].text === 'it')) {
      const action = hc.next()!.text;
      if (hc.isWord('it')) {
        // Machines are story-owned — there is no `it` (mirror of the
        // story-clause rule); name the entity or role.
        this.diagnostics.error('parse.machine-when', '`it` is not bound in a machine — name the entity or a declared role.', lineSpan(line));
        return null;
      }
      const targetRef = this.parseNameRef(hc, () => false);
      if (targetRef.words.length === 0 || !hc.atEnd()) {
        this.diagnostics.error('parse.machine-when', `Expected an entity or role name after \`${action}\`.`, lineSpan(line));
        return null;
      }
      trigger = { kind: 'action', action, target: targetRef };
    } else {
      trigger = { kind: 'condition', condition: this.parseCondition(hc, line) };
    }
    return { trigger, condition, target, span: lineSpan(line) };
  }

  // ------------------------------------------------------------ statements

  /**
   * Parse statement lines until an `end`/`else`/`or`/`when`-arm boundary at
   * or below `openIndent` is reached. The terminator line is NOT consumed.
   */
  /**
   * Parse an indented statement body.
   *
   * @param openIndent     indent of the line that opened the body
   * @param clauseKeyword  the HOST CLAUSE's keyword (`on`, `after`, …), which
   *                       governs refusal legality and descends unchanged into
   *                       nested routing blocks (ADR-289 D3)
   * @param blockName      the innermost enclosing block, for diagnostics only;
   *                       defaults to the clause when the body is the clause's own
   */
  private parseStatements(openIndent: number, clauseKeyword: string, blockName = clauseKeyword): Statement[] {
    const body: Statement[] = [];
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= openIndent) break;
      if (isEndLine(line) || ((firstWord(line) === 'else' || firstWord(line) === 'or') && line.tokens.length === 1)) break;
      if (looksLikeComment(line)) {
        this.skipCommentInsideBlock(line);
        continue;
      }
      const stmt = this.parseStatement(line, clauseKeyword, blockName);
      if (stmt) body.push(stmt);
    }
    return body;
  }

  private parseStatement(line: Line, blockKeyword: string, blockName: string = blockKeyword): Statement | null {
    const word = firstWord(line);
    const c = new Cursor(line.tokens, line);

    if (word && ORDINALS[word] !== undefined && c.isWord('time', 1)) {
      return this.parseOrdinalBlock(line, blockKeyword);
    }

    // `<subject> must <predicate>: <key>` body statement (ratchet D6).
    if (lineHasMust(line)) {
      this.pos++;
      if (blockKeyword === 'after') {
        this.reportRefusalInAfter(line);
        return null;
      }
      return this.parseMustLine(line);
    }

    switch (word) {
      case 'refuse':
      case 'phrase': {
        this.pos++;
        c.next();
        // `refuse when <condition>: <key>` — the prohibition form (D6) in
        // body position; same shape as the define-action line.
        if (word === 'refuse' && c.isWord('when')) {
          if (blockKeyword === 'after') {
            this.reportRefusalInAfter(line);
            return null;
          }
          return this.parseRefuseWhenStatement(line);
        }
        const key = this.readLabelKey(c);
        if (!key) {
          this.diagnostics.error('parse.phrase-ref', `Expected a phrase key after \`${word}\`.`, c.restSpan());
          return null;
        }
        const params = this.parseParams(c, line);
        if (word === 'refuse') {
          if (blockKeyword === 'after') {
            this.reportRefusalInAfter(line);
            return null;
          }
          // Misordered prohibition (platform-issue-sweep Phase 8 #15c):
          // `refuse <key> when <condition>` used to leave the `when …`
          // tokens unconsumed and silently compile as an UNCONDITIONAL
          // refuse. Error with a fix-it instead.
          if (c.isWord('when')) {
            this.diagnostics.error(
              'parse.refuse-order',
              `The condition comes first — write \`refuse when <condition>: ${key}\`.`,
              c.restSpan(),
            );
            return null;
          }
          return { kind: 'refuse', phraseKey: key, params, span: lineSpan(line) } as RefuseStmt;
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        // Declare-and-emit sugar (§2.6/§3.3): a deeper-indented bare prose
        // block after `phrase <key>` registers the text under the key.
        let inlineText: TextValue | null = null;
        const next = this.lines[this.pos];
        if (next && next.indent > line.indent && !isStatementLine(next)) {
          inlineText = this.parseProseParagraph(line.indent + 1, line.indent);
        } else if (next && next.indent > line.indent) {
          // The fork D8 §3.1 is about: this line sits where prose is legal but
          // opens with a lowercase statement keyword, so it is read as a
          // statement. The heuristic is unchanged — we only remember that
          // prose was possible here, so a parse failure on this exact line can
          // name the author's remedy instead of only the parser's confusion.
          this.proseCandidate = next;
        }
        const span = inlineText ? mergeSpans(lineSpan(line), inlineText.span) : lineSpan(line);
        return { kind: 'phrase', phraseKey: key, params, inlineText, stmtWhen, span } as PhraseStmt;
      }
      case 'emit': {
        this.pos++;
        c.next();
        // ADR-256: an event id is a single dotless Chord token (`media-sound-play`);
        // story-loader translates it to the platform's dotted id at the emit seam.
        // A `.` now raises `parse.dotted-key` (ADR-254 uniform).
        const event: string[] = [];
        while (!c.atEnd() && !c.isWord('when') && !c.isWord('with')) {
          const segment = this.readLabelKey(c);
          if (!segment) break;
          event.push(segment);
        }
        if (event.length === 0) {
          this.diagnostics.error('parse.emit', 'Expected an event name after `emit`.', lineSpan(line));
          return null;
        }
        // ADR-216 payload: `with <field> <value> [and …]` — the create-data
        // grammar; bracketed/braced structures inside separate with commas.
        const payload: EmitField[] = [];
        if (c.matchWord('with')) {
          payload.push(...this.parseEmitFields(c, line, 'flat'));
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'emit', event, payload, stmtWhen, span: lineSpan(line) } as EmitStmt;
      }
      case 'play':
      case 'stop':
      case 'show':
      case 'hide':
      case 'transition':
      case 'clear': {
        this.pos++;
        return this.parseMediaStatement(word, c, line);
      }
      case 'set': {
        this.pos++;
        c.next();
        const target = this.parseValueExpr(c, line, new Set(['to']));
        if (!c.matchWord('to')) {
          this.diagnostics.error('parse.set-to', `Expected \`to <value>\` in the \`set\` statement.${this.misparseHint(line)}`, c.restSpan());
          return null;
        }
        const value = this.parseValueExpr(c, line, new Set());
        return { kind: 'set', target, value, span: lineSpan(line) } as SetStmt;
      }
      case 'raise':
      case 'lower': {
        // ADR-264 D2: `raise`/`lower <target> by <n> [when <cond>]`.
        this.pos++;
        c.next();
        const target = this.parseValueExpr(c, line, new Set(['by']));
        if (!c.matchWord('by')) {
          this.diagnostics.error('parse.counter-by', `Expected \`by <number>\` in the \`${word}\` statement.`, c.restSpan());
          return null;
        }
        const amtTok = c.next();
        if (!amtTok || amtTok.kind !== 'number') {
          this.diagnostics.error('parse.counter-amount', 'Expected a non-negative number after `by`.', c.restSpan());
          return null;
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: word, target, amount: Number(amtTok.text), stmtWhen, span: lineSpan(line) } as CounterMutateStmt;
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
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'change', entity, state: state.text, stmtWhen, span: lineSpan(line) } as ChangeStmt;
      }
      case 'move': {
        this.pos++;
        c.next();
        const entity = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'to');
        if (!c.matchWord('to')) {
          this.diagnostics.error('parse.move-to', `Expected \`to <place>\` in the \`move\` statement.${this.misparseHint(line)}`, c.restSpan());
          return null;
        }
        const place = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'when');
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'move', entity, place, stmtWhen, span: lineSpan(line) } as MoveStmt;
      }
      case 'remove': {
        // Z6 (ADR-213 Q3): `remove <entity> [when <cond>]` — out of play
        // entirely, permanently. No `to` clause (orphaning is not a form).
        this.pos++;
        c.next();
        const entity = this.parseNameRef(c, (t) => t.kind === 'word' && t.text === 'when');
        if (entity.words.length === 0) {
          this.diagnostics.error('parse.remove-entity', 'Expected an entity after `remove`.', c.restSpan());
          return null;
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'remove', entity, stmtWhen, span: lineSpan(line) } as RemoveStmt;
      }
      case 'award': {
        this.pos++;
        c.next();
        const expression: string[] = [];
        let once = false;
        while (!c.atEnd() && !c.isWord('when')) {
          const t = c.next()!;
          if (t.kind === 'comma' && c.isWord('once')) {
            c.next();
            once = true;
            break;
          }
          expression.push(t.text);
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'award', expression, once, stmtWhen, span: lineSpan(line) } as AwardStmt;
      }
      case 'win':
      case 'lose': {
        this.pos++;
        c.next();
        const key = c.peek();
        let phraseKey: string | null = null;
        if (key && key.kind === 'word' && key.text !== 'when') {
          phraseKey = key.text;
          c.next();
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: word, phraseKey, stmtWhen, span: lineSpan(line) } as Statement;
      }
      case 'kill': {
        // `kill the player [<phrase-key>] [when <cond>]` (ADR-227) — peer to
        // win/lose; terminal death via the platform killPlayer sink.
        this.pos++;
        c.next();
        if (!c.matchWord('the') || !c.matchWord('player')) {
          this.diagnostics.error(
            'parse.kill-statement',
            'Expected `kill the player [<phrase-key>] [when <condition>]`.',
            lineSpan(line),
          );
          return null;
        }
        const key = c.peek();
        let phraseKey: string | null = null;
        if (key && key.kind === 'word' && key.text !== 'when') {
          phraseKey = key.text;
          c.next();
        }
        const stmtWhen = this.parseStatementWhen(c, line);
        return { kind: 'kill', phraseKey, stmtWhen, span: lineSpan(line) } as KillStmt;
      }
      case 'if':
        // Removed — given 4 amended (ratchet 2026-07-11).
        this.diagnostics.error(
          'parse.removed-if',
          '`if` was removed (given 4 amended) — use a `must` requirement for guards (`it must be hungry: already-fed`), a statement `when` suffix for conditionals (`award X when <condition>`), or `select` for branching.',
          lineSpan(line),
        );
        this.pos++;
        this.recoverPastEndNested('if', line.indent);
        return null;
      case 'select':
        return this.parseSelect(line, blockKeyword);
      case 'each':
        return this.parseEachBlock(line, blockKeyword);
      default:
        this.diagnostics.error(
          'parse.unknown-statement',
          `Unknown statement \`${word ?? line.raw.trim()}\` in \`${blockName}\` block.${this.misparseHint(line)}`,
          lineSpan(line),
        );
        this.pos++;
        return null;
    }
  }

  /** The statement `when <condition>` suffix (ratchet D7); null when absent. */
  private parseStatementWhen(c: Cursor, line: Line): ConditionNode | null {
    if (!c.matchWord('when')) return null;
    return this.parseCondition(c, line);
  }

  /** `refuse when <condition>: <key>` as a body statement (prohibition, D6). */
  private parseRefuseWhenStatement(line: Line): Statement | null {
    const colonIndex = line.tokens.map((t) => t.kind === 'colon').lastIndexOf(true);
    if (colonIndex === -1 || colonIndex >= line.tokens.length - 1) {
      this.diagnostics.error('parse.refuse-when', 'Expected `refuse when <condition>: <phrase-key>`.', lineSpan(line));
      return null;
    }
    const keyCursor = new Cursor(line.tokens.slice(colonIndex + 1), line);
    const key = this.readLabelKey(keyCursor); // label-key = single WORD (ADR-254; readLabelKey rejects dots)
    if (!key || !keyCursor.atEnd()) {
      this.diagnostics.error('parse.refuse-when', 'Expected a phrase key after the colon.', line.tokens[colonIndex + 1].span);
      return null;
    }
    const condCursor = new Cursor(line.tokens.slice(2, colonIndex), line);
    const condition = this.parseCondition(condCursor, line);
    return { kind: 'refuse-when', condition, phraseKey: key, span: lineSpan(line) };
  }

  /**
   * The second line a misparsed prose paragraph's diagnostic carries (ADR-289
   * D8 §3.1, Acceptance 21). Empty for every line that was not sitting in
   * prose position — "every error names its fix" is the bar, and a fix that
   * does not apply is worse than none.
   *
   * @param line the line the diagnostic is about
   * @returns the hint, prefixed with a space, or `''`
   */
  private misparseHint(line: Line): string {
    if (line !== this.proseCandidate) return '';
    return ' If this was meant to be prose, capitalize the first word or quote the paragraph — a lowercase keyword in this position reads as a statement.';
  }

  /** `refuse`/`must` inside an `after` clause — reactions cannot refuse (D3). */
  private reportRefusalInAfter(line: Line): void {
    this.diagnostics.error(
      'parse.react-refusal',
      'Refusals (`refuse`, `must`) cannot appear in an `after` clause — reactions run after the action succeeded. Use an `on` clause to intercept.',
      lineSpan(line),
    );
  }

  /**
   * Read a label/key: a single kebab-case `WORD` (ADR-254). A `.` in any label
   * position — author labels (phrase, exit, refusal keys) AND the event-type
   * sites (`emit`, channel `from event`, machine `when event`) — is a parse
   * error (`parse.dotted-key`). The ban is uniform: ADR-256 made the event-type
   * sites dotless too (the dotless Chord event id is translated to the platform's
   * dotted id in `@sharpee/story-loader`, so no dotted form ever appears in a
   * `.story`). Returns `null` when no word is present.
   */
  private readLabelKey(c: Cursor): string | null {
    const first = c.peek();
    if (!first || first.kind !== 'word') return null;
    c.next();
    const key = first.text;
    const dotFollows = () =>
      c.peek()?.kind === 'punct' && c.peek()!.text === '.' && c.peek(1)?.kind === 'word';
    if (!dotFollows()) return key;
    // ADR-254/256: a `.` in a label is a parse error. Consume the dotted
    // segments (one clean error, no cascade), flag the first dot, and hand back
    // the kebab-cased form so downstream parsing does not spuriously break.
    const dot = c.peek()!;
    const segments = [key];
    while (dotFollows()) {
      c.next();
      segments.push(c.next()!.text);
    }
    this.diagnostics.error(
      'parse.dotted-key',
      `Labels are single words; "." is not allowed in "${segments.join('.')}" — use kebab-case, e.g. "${segments.join('-')}".`,
      dot.span,
    );
    return segments.join('-');
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

  /**
   * `<ordinal> time … ` — the body takes the host's statement kit, so
   * refusal legality follows the host clause (ADR-289 D3): a refusal nested
   * here inside an `after` clause is as illegal as one written directly in
   * it. Same rule `parseEachBlock` has always followed.
   */
  private parseOrdinalBlock(headLine: Line, blockKeyword: string): OrdinalBlock {
    this.pos++;
    const word = firstWord(headLine)!;
    const body: Statement[] = [];
    let span = lineSpan(headLine);
    while (this.pos < this.lines.length) {
      const line = this.lines[this.pos];
      if (line.indent <= headLine.indent) break;
      if (isEndLine(line)) break;
      const stmt = this.parseStatement(line, blockKeyword, `${word} time`);
      if (stmt) {
        body.push(stmt);
        span = mergeSpans(span, stmt.span);
      }
    }
    return { kind: 'ordinal', ordinal: ORDINALS[word], ordinalWord: word, body, span };
  }

  /**
   * `each <condition-name> … end each` — body-position iteration block
   * (ratchet E3, 2026-07-12). The body takes the host's statement kit —
   * `blockKeyword` propagates so refusal legality follows the host clause
   * (legal in `on`, error in `after`, exactly as outside the block).
   * The open-condition requirement is the analyzer's gate, not the parser's.
   */
  private parseEachBlock(headLine: Line, blockKeyword: string): EachStmt | null {
    this.pos++;
    const c = new Cursor(headLine.tokens, headLine);
    c.matchWord('each');
    const nameTok = c.next();
    if (!nameTok || nameTok.kind !== 'word') {
      this.diagnostics.error('parse.each-condition', 'Expected a condition name after `each`.', c.restSpan());
      this.recoverPastEndNested('each', headLine.indent);
      return null;
    }
    if (!c.atEnd()) {
      this.diagnostics.error(
        'parse.each-trailing',
        `Unexpected \`${c.peek()!.text}\` after the condition name — an \`each\` header is \`each <condition-name>\`.`,
        c.restSpan(),
      );
    }
    const body = this.parseStatements(headLine.indent, blockKeyword, 'each');
    const endSpan = this.consumeEnd('each', headLine);
    return { kind: 'each', condition: nameTok.text, body, span: mergeSpans(lineSpan(headLine), endSpan) };
  }

  /**
   * `select on <value>` / `select <strategy>` — arm and alternative bodies
   * take the host's statement kit (ADR-289 D3), so the `after`-clause
   * refusal ban descends instead of being lost at the block boundary.
   */
  private parseSelect(headLine: Line, blockKeyword: string): SelectOnStmt | SelectStrategyStmt | null {
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
          const body = this.parseStatements(line.indent, blockKeyword, 'select');
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
      // Z5 applies everywhere strategies are legal (ratchet 2026-07-12) —
      // a retired adverb here gets the same fix-it as at `define phrase`.
      if (strategyTok && strategyTok.kind === 'word' && RETIRED_STRATEGIES[strategyTok.text]) {
        this.diagnostics.error(
          'parse.select-strategy-retired',
          `\`${strategyTok.text}\` is no longer a strategy adverb — use \`${RETIRED_STRATEGIES[strategyTok.text]}\` (ADR-211 Decision 4).`,
          strategyTok.span,
        );
      } else {
        this.diagnostics.error('parse.select-strategy', 'Expected `on <value>` or a strategy (randomly, cycling, stopping, sticky, first-time) after `select`.', strategyTok?.span ?? lineSpan(headLine));
      }
      this.recoverPastEndNested('select', headLine.indent);
      return null;
    }
    const alternatives: Statement[][] = [];
    for (;;) {
      alternatives.push(this.parseStatements(headLine.indent, blockKeyword, 'select'));
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

    // `the match` — the `each`-block binder (ratchet E3, 2026-07-12).
    // Only the exact form: a following name word keeps the ordinary
    // reference parse (`the match box` stays an entity name). Position
    // validity (inside an `each` body) is the analyzer's gate.
    if (first.kind === 'word' && first.text === 'the') {
      const m = c.peek(1);
      const after = c.peek(2);
      const matchStandsAlone =
        !after || after.kind !== 'word' || PHRASE_STOPS.has(after.text) || extraStops.has(after.text);
      if (m && m.kind === 'word' && m.text === 'match' && matchStandsAlone) {
        c.next();
        c.next();
        return { kind: 'match', span: mergeSpans(first.span, m.span) };
      }
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

    // `client has <capability>` (ADR-216) — `client` is reserved in
    // condition-subject position; the capability word is the analyzer's gate.
    if (t.kind === 'word' && t.text === 'client' && c.isWord('has', 1)) {
      c.next();
      c.next(); // client has
      const capability = c.next();
      if (!capability || capability.kind !== 'word') {
        this.diagnostics.error('parse.client-has', 'Expected a capability word after `client has` (sound, images, …).', c.restSpan());
        return { kind: 'condition-ref', name: '', span: lineSpan(line) };
      }
      return { kind: 'client-has', capability: capability.text, span: mergeSpans(t.span, capability.span) };
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

    // `any <name>` / `no <name>` — existential / negated existential over a
    // named open condition (ratchet E1/E2, 2026-07-12). Triggers only on the
    // quantifier plus a single STANDALONE condition name, so a subject that
    // merely starts with one of these words (`no smoking sign is …`) keeps
    // its ordinary predicate parse.
    if (t.kind === 'word' && (t.text === 'any' || t.text === 'no')) {
      const nameTok = c.peek(1);
      if (nameTok && nameTok.kind === 'word' && this.isBareConditionRef(c, 1)) {
        c.next();
        c.next();
        return {
          kind: t.text === 'any' ? 'any-of' : 'none-of',
          condition: nameTok.text,
          span: mergeSpans(t.span, nameTok.span),
        };
      }
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

  /**
   * True when the word at `offset` stands alone (connective, comma, or
   * nothing follows) — a bare condition-name position.
   */
  private isBareConditionRef(c: Cursor, offset = 0): boolean {
    const after = c.peek(offset + 1);
    if (!after) return true;
    if (after.kind === 'rparen' || after.kind === 'comma') return true;
    return after.kind === 'word' && (after.text === 'and' || after.text === 'or' || after.text === 'then');
  }

  private parsePredicate(c: Cursor, line: Line, subject: ValueExpr): ConditionNode {
    const t = c.peek();
    // ADR-264 D3: symbolic comparison `<subject> >=|>|<=|< <n>`.
    if (t && t.kind === 'compare') {
      c.next();
      const op = t.text === '>=' ? 'gte' : t.text === '>' ? 'gt' : t.text === '<=' ? 'lte' : 'lt';
      const value = this.parseValueExpr(c, line, new Set());
      return {
        kind: 'predicate',
        subject,
        predicate: { kind: 'compare', op, value, span: value.span },
        span: mergeSpans(subject.span, value.span),
      };
    }
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
      if (c.isWord('here')) {
        // Z4 deictic: `<subject> is here` — subject shares the player's
        // location. Must precede the generic value branch (`here` would
        // otherwise parse as a bare value word).
        const hereTok = c.next()!;
        return {
          kind: 'predicate',
          subject,
          predicate: { kind: 'is-here', negated, span: hereTok.span },
          span: mergeSpans(subject.span, hereTok.span),
        };
      }
      // ADR-264 D3 word comparisons: `is at least|at most|more than|less than <n>`.
      let cmpOp: 'gte' | 'gt' | 'lte' | 'lt' | null = null;
      if (c.isWord('at') && c.isWord('least', 1)) { c.next(); c.next(); cmpOp = 'gte'; }
      else if (c.isWord('at') && c.isWord('most', 1)) { c.next(); c.next(); cmpOp = 'lte'; }
      else if (c.isWord('more') && c.isWord('than', 1)) { c.next(); c.next(); cmpOp = 'gt'; }
      else if (c.isWord('less') && c.isWord('than', 1)) { c.next(); c.next(); cmpOp = 'lt'; }
      if (cmpOp) {
        const cmpValue = this.parseValueExpr(c, line, new Set());
        const node: ConditionNode = {
          kind: 'predicate',
          subject,
          predicate: { kind: 'compare', op: cmpOp, value: cmpValue, span: cmpValue.span },
          span: mergeSpans(subject.span, cmpValue.span),
        };
        return negated ? { kind: 'not', operand: node, span: node.span } : node;
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
