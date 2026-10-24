/**
 * patterns.ts — every walk over a Chord grammar pattern's parts, in one home
 * (ADR-382 D5): lowering an action's patterns to the rules it registers,
 * rendering parts as display text, expanding optionals and alternations to
 * their readings and a passage's commands, and comparing two patterns by
 * shape.
 *
 * Public interface: lowerParts, lowerActionRules, LoweredRule, commandParts,
 * renderPattern, expandReadings, expandCommands, samePatternShape.
 * Owner context: @sharpee/chord. The element type is if-domain's
 * PatternElement (ADR-382 D1), imported as a type only, so chord stays free
 * of platform runtime (ADR-210). The loader, the analyzer and repokit call
 * these; none keeps a walker of its own.
 */

import type { PatternElement } from '@sharpee/if-domain';

/** A Chord pattern element as the AST and IR spell it: a slot names itself in `word`. */
type ChordPart =
  | { kind: 'word'; word: string; optional?: boolean }
  | { kind: 'slot'; word: string; optional?: boolean }
  | { kind: 'alt'; words: readonly string[]; optional?: boolean };

/** The action fields `lowerActionRules` reads (an IR `define action` or `extend action`). */
export interface LowerableAction {
  patterns: ReadonlyArray<{
    parts: readonly ChordPart[];
    cardinality?: readonly string[] | null;
    means?: ReadonlyArray<{ key: string; value: string }>;
  }>;
  constraints: ReadonlyArray<{ slot: string; requirement: string }>;
  greedy?: readonly string[];
  slotTypes?: ReadonlyArray<{ slot: string; type: 'instrument' | 'topic' }>;
  directions?: ReadonlyArray<{ canonical: string; aliases: readonly string[] }>;
}

/** One rule an action registers, as data for the grammar's `rule(spec)` entry. */
export interface LoweredRule {
  parts: PatternElement[];
  /** The display text, from `renderPattern`. */
  pattern: string;
  /** Per-rule semantic defaults (`means`, a direction's canonical), or null. */
  defaults: Record<string, string> | null;
  /** The typed slots this rule carries. */
  slotTypes: Record<string, 'instrument' | 'topic'>;
  /** The scope requirements on slots this rule carries, as written words. */
  requirements: Array<{ slot: string; requirement: string }>;
  /** True for a bare-verb form (the literal prefix of a slotted pattern). */
  bare: boolean;
}

/**
 * Chord parts → pattern elements. A slot's `word` becomes its `name`, and a
 * slot named by the action's greedy lines becomes greedy (ADR-267 D10).
 * @param parts The AST or IR pattern elements
 * @param greedy The action's greedy slot names
 * @returns The elements, in order
 */
export function lowerParts(parts: readonly ChordPart[], greedy: readonly string[] = []): PatternElement[] {
  return parts.map((part): PatternElement => {
    const optional = part.optional ? { optional: true } : {};
    if (part.kind === 'slot') {
      return { kind: 'slot', name: part.word, ...optional, ...(greedy.includes(part.word) ? { greedy: true } : {}) };
    }
    if (part.kind === 'alt') return { kind: 'alt', words: [...part.words], ...optional };
    return { kind: 'word', word: part.word, ...optional };
  });
}

/**
 * Pattern elements → display text: `a|b` for an alternation, `:name` for a
 * slot (`:name...` greedy), `[…]` around an optional element. The only
 * renderer; nothing parses what it returns.
 * @param parts The elements
 * @returns The display text
 */
export function renderPattern(parts: readonly PatternElement[]): string {
  return parts
    .map((part) => {
      const core =
        part.kind === 'alt' ? part.words.join('|') : part.kind === 'slot' ? `:${part.name}${part.greedy ? '...' : ''}` : part.word;
      return part.optional ? `[${core}]` : core;
    })
    .join(' ');
}

/**
 * Every reading a pattern admits: each optional element taken first with
 * the element and then without it, each alternation as each of its words in
 * written order, slots kept. The first reading is the pattern as written.
 * A reading has no optional element and no alternation.
 * @param parts The elements
 * @returns The readings, none empty, in order
 */
export function expandReadings(parts: readonly PatternElement[]): PatternElement[][] {
  let out: PatternElement[][] = [[]];
  for (const part of parts) {
    const choices: PatternElement[][] =
      part.kind === 'alt'
        ? part.words.map((word) => [{ kind: 'word', word }])
        : [[part.kind === 'slot' ? { kind: 'slot', name: part.name, ...(part.greedy ? { greedy: true } : {}) } : { kind: 'word', word: part.word }]];
    if (part.optional) choices.push([]);
    out = out.flatMap((prefix) => choices.map((choice) => [...prefix, ...choice]));
  }
  return out.filter((reading) => reading.length > 0);
}

/**
 * The commands a slot-free pattern admits (ADR-380 D1): its readings,
 * lowercased and joined by spaces, the pattern as written first.
 * @param parts The elements; none is a slot
 * @returns The commands, in order
 */
export function expandCommands(parts: readonly PatternElement[]): string[] {
  return expandReadings(parts).map((reading) =>
    reading.map((part) => (part.kind === 'word' ? part.word.toLowerCase() : '')).join(' '),
  );
}

/**
 * A command from `expandCommands` → its word elements, the inverse of that
 * function's join: a command is words joined by single spaces (ADR-382 D8,
 * a passage's command registered through `rule(spec)`).
 * @param command One command `expandCommands` returned
 * @returns One word element per word, in order
 */
export function commandParts(command: string): PatternElement[] {
  return command.split(' ').map((word): PatternElement => ({ kind: 'word', word }));
}

/**
 * Whether two patterns have the same shape (ADR-382 D6, the removal
 * identity): the same number of elements, each pair alike in kind and in
 * `optional`; words equal after lowercasing; alternations the same set of
 * words after lowercasing, in any order (Q-4); slots alike whatever their
 * names.
 * @param a One pattern's elements
 * @param b The other's
 * @returns True when they have the same shape
 */
export function samePatternShape(a: readonly PatternElement[], b: readonly PatternElement[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((left, index) => {
    const right = b[index];
    if (left.kind !== right.kind || Boolean(left.optional) !== Boolean(right.optional)) return false;
    if (left.kind === 'word' && right.kind === 'word') return left.word.toLowerCase() === right.word.toLowerCase();
    if (left.kind === 'alt' && right.kind === 'alt') {
      const words = new Set(left.words.map((w) => w.toLowerCase()));
      const others = new Set(right.words.map((w) => w.toLowerCase()));
      return words.size === others.size && [...words].every((w) => others.has(w));
    }
    return left.kind === 'slot';
  });
}

/**
 * The rules one `define action` or `extend action` registers, in definition
 * order (ADR-382 D7): one per written pattern, or per alias × pattern where
 * a pattern uses the `directions` block's `direction` slot (a bare
 * `the direction` line registering the standalone aliases), each with its
 * own `means` defaults (ADR-267 D12). With `bareVerbForms`, each slotted
 * pattern's literal prefix follows as its own rule, once per distinct
 * prefix, after every written pattern.
 * @param action The action's patterns, constraints, greedy and typed slots and directions
 * @param options `bareVerbForms` adds the bare-verb prefixes (dispatch actions)
 * @returns The rules, in registration order
 */
export function lowerActionRules(action: LowerableAction, options: { bareVerbForms: boolean }): LoweredRule[] {
  const greedy = action.greedy ?? [];
  const directions = action.directions ?? [];
  const rules: LoweredRule[] = [];
  const bareTexts = new Set<string>();
  const bare: LoweredRule[] = [];

  const ruleOf = (parts: PatternElement[], defaults: Record<string, string> | null): LoweredRule => {
    const slots = new Set(parts.flatMap((part) => (part.kind === 'slot' ? [part.name] : [])));
    const slotTypes: Record<string, 'instrument' | 'topic'> = {};
    for (const typed of action.slotTypes ?? []) if (slots.has(typed.slot)) slotTypes[typed.slot] = typed.type;
    return {
      parts,
      pattern: renderPattern(parts),
      defaults,
      slotTypes,
      requirements: action.constraints.filter((c) => slots.has(c.slot)).map((c) => ({ slot: c.slot, requirement: c.requirement })),
      bare: false,
    };
  };

  for (const pattern of action.patterns) {
    // `→` cardinality is refused at compile time (parser review B2); IR
    // that still carries it registers nothing for the pattern.
    if (pattern.cardinality) continue;
    const means = pattern.means?.length ? Object.fromEntries(pattern.means.map((m) => [m.key, m.value])) : null;
    const parts = lowerParts(pattern.parts, greedy);
    const usesDirection = directions.length > 0 && parts.some((part) => part.kind === 'slot' && part.name === 'direction');

    if (usesDirection) {
      const isBare = parts.length === 1;
      for (const entry of directions) {
        for (const alias of [entry.canonical, ...entry.aliases]) {
          const aliased: PatternElement[] = isBare
            ? [{ kind: 'word', word: alias }]
            : parts.map((part): PatternElement => (part.kind === 'slot' && part.name === 'direction' ? { kind: 'word', word: alias } : part));
          rules.push(ruleOf(aliased, { ...(means ?? {}), direction: entry.canonical }));
        }
      }
    } else {
      rules.push(ruleOf(parts, means));
    }

    // The bare-verb form: the literal prefix before the first slot, taken
    // from the written parts (direction expansion included — the prefix is
    // the verb).
    const slotIndex = parts.findIndex((part) => part.kind === 'slot');
    if (options.bareVerbForms && slotIndex > 0) {
      const prefix = parts.slice(0, slotIndex);
      const text = renderPattern(prefix);
      if (!bareTexts.has(text)) {
        bareTexts.add(text);
        bare.push({ ...ruleOf(prefix, null), bare: true });
      }
    }
  }
  return [...rules, ...bare];
}
