/**
 * patterns.ts — every walk over a Chord grammar pattern's parts, in one home
 * (ADR-382 D5): lowering an action's patterns to the rules it registers,
 * rendering parts as display text, expanding optionals and alternations to
 * their readings and a passage's commands, comparing two patterns by

 * shape, and seating each entity slot by the action's seat table.
 *
 * Public interface: lowerParts, lowerActionRules, LoweredRule, seatTable,
 * SeatTable, SeatProblem, commandParts, renderPattern, expandReadings,
 * expandCommands, samePatternShape.
 * Owner context: @sharpee/chord. The element types are if-domain's
 * PatternElement (ADR-382 D1) and Seat (ADR-383 D1), imported as types only,
 * so chord stays free of platform runtime (ADR-210). The loader, the
 * analyzer and repokit call these; none keeps a walker of its own.
 */

import type { PatternElement, Seat } from '@sharpee/if-domain';

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
  /** The seat of every entity slot this rule carries, from the action's seat table. */
  seats: Record<string, Seat>;
  /** The scope requirements on slots this rule carries, as written words. */
  requirements: Array<{ slot: string; requirement: string }>;
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

/** An action's seat table (ADR-383 D3): each entity slot name's one seat. */
export type SeatTable = Readonly<Record<string, Seat>>;

/**
 * A pattern line the seat table cannot seat. `conflict`: two of the line's
 * names hold one seat (`slots` both, `seat` theirs), or a name finds no seat
 * left (`slots` the line's seated name and the unseated one). `unknown`: a
 * line of an extension whose two entity slots are both names the table
 * lacks, so its seats would be a guess (ADR-383 D4).
 */
export interface SeatProblem {
  kind: 'conflict' | 'unknown';
  /** Index of the offending pattern in the action's `patterns`. */
  pattern: number;
  /** The two slot names involved, in pattern order. */
  slots: [string, string];
  /** For a conflict, the seat both would hold. */
  seat?: Seat;
  /**
   * Where each of `slots` was seated: a pattern index, or `inherited` for a
   * name the starting table already held, or null for a name the line
   * itself seats.
   */
  seatedBy: [number | 'inherited' | null, number | 'inherited' | null];
}

/** The seats an entity slot can take, in the order a line's open seats fill. */
const SEATS: readonly Seat[] = ['direct', 'indirect'];

/**
 * The entity slot names of one written pattern, in pattern order: every
 * slot that is not greedy, typed (instrument, topic) or the `directions`
 * block's `direction` (lowered to words). Optional slots count (ADR-383 D2).
 */
function entitySlotNames(action: LowerableAction, parts: readonly ChordPart[]): string[] {
  const greedy = action.greedy ?? [];
  const typed = new Set((action.slotTypes ?? []).map((t) => t.slot));
  const directions = (action.directions ?? []).length > 0;
  const names: string[] = [];
  for (const part of parts) {
    if (part.kind !== 'slot') continue;
    const name = part.word;
    if (greedy.includes(name) || typed.has(name) || (directions && name === 'direction')) continue;
    if (!names.includes(name)) names.push(name);
  }
  return names;
}

/**
 * The action's seat table (ADR-383 D3, D4). Lines are read in definition
 * order. A name already in the table keeps its seat; each new name, in
 * pattern order, takes the first seat its line leaves open — on the first
 * line that is the positional default, the first entity slot direct and
 * the second indirect. Starting from `inherited` (an `extend action`'s
 * target table), a line whose two entity slots are both new names is an
 * `unknown` problem and seats nothing. Cardinality patterns register
 * nothing and are skipped.
 * @param action The action's patterns and the slot lines that type them
 * @param inherited The table an extension starts from; absent for an action's own lines
 * @returns The table, including the inherited names, and every problem found
 */
export function seatTable(action: LowerableAction, inherited?: SeatTable): { table: Record<string, Seat>; problems: SeatProblem[] } {
  const table: Record<string, Seat> = { ...(inherited ?? {}) };
  const origin = new Map<string, number | 'inherited'>(Object.keys(table).map((name) => [name, 'inherited' as const]));
  const problems: SeatProblem[] = [];

  action.patterns.forEach((pattern, index) => {
    if (pattern.cardinality) return;
    const names = entitySlotNames(action, pattern.parts);
    const known = names.filter((name) => name in table);
    if (inherited && names.length >= 2 && known.length === 0) {
      problems.push({ kind: 'unknown', pattern: index, slots: [names[0], names[1]], seatedBy: [null, null] });
      return;
    }
    const holder = new Map<Seat, string>();
    for (const name of known) {
      const other = holder.get(table[name]);
      if (other !== undefined) {
        problems.push({ kind: 'conflict', pattern: index, slots: [other, name], seat: table[name], seatedBy: [origin.get(other)!, origin.get(name)!] });
        return;
      }
      holder.set(table[name], name);
    }
    const seated: Array<[string, Seat]> = [];
    for (const name of names) {
      if (name in table) continue;
      const free = SEATS.find((seat) => !holder.has(seat));
      if (free === undefined) {
        const other = holder.get('indirect')!;
        problems.push({ kind: 'conflict', pattern: index, slots: [other, name], seatedBy: [origin.get(other) ?? null, null] });
        return;
      }
      holder.set(free, name);
      seated.push([name, free]);
    }
    for (const [name, seat] of seated) {
      table[name] = seat;
      origin.set(name, index);
    }
  });
  return { table, problems };
}

/**
 * The rules one `define action` or `extend action` registers, in definition
 * order (ADR-382 D7): one per written pattern, or per alias × pattern where
 * a pattern uses the `directions` block's `direction` slot (a bare
 * `the direction` line registering the standalone aliases), each with its
 * own `means` defaults (ADR-267 D12). Exactly the written lines: no rule is
 * added for a line's verb alone (ADR-384 D5). Every entity slot carries its
 * seat from the action's seat table (ADR-383 D3), started from
 * `inheritedSeats` for an extension (D4).
 * @param action The action's patterns, constraints, greedy and typed slots and directions
 * @param options `inheritedSeats` is the extended action's table
 * @returns The rules, in registration order
 * @throws Error when the seat table has a problem — the analyzer refuses
 *   such a line (`analysis.seat-conflict`, `analysis.unknown-slot`), so only
 *   IR that bypassed it reaches this
 */
export function lowerActionRules(
  action: LowerableAction,
  options: { inheritedSeats?: SeatTable } = {},
): LoweredRule[] {
  const greedy = action.greedy ?? [];
  const directions = action.directions ?? [];
  const rules: LoweredRule[] = [];

  const { table, problems } = seatTable(action, options.inheritedSeats);
  if (problems.length > 0) {
    const problem = problems[0];
    const line = renderPattern(lowerParts(action.patterns[problem.pattern].parts, greedy));
    throw new Error(
      problem.kind === 'unknown'
        ? `Pattern \`${line}\` seats neither \`${problem.slots[0]}\` nor \`${problem.slots[1]}\` from the action's seat table`
        : `Pattern \`${line}\` puts \`${problem.slots[0]}\` and \`${problem.slots[1]}\` in one seat`,
    );
  }

  const ruleOf = (parts: PatternElement[], defaults: Record<string, string> | null): LoweredRule => {
    const slots = new Set(parts.flatMap((part) => (part.kind === 'slot' ? [part.name] : [])));
    const slotTypes: Record<string, 'instrument' | 'topic'> = {};
    for (const typed of action.slotTypes ?? []) if (slots.has(typed.slot)) slotTypes[typed.slot] = typed.type;
    const seats: Record<string, Seat> = {};
    for (const part of parts) {
      if (part.kind === 'slot' && !part.greedy && !(part.name in slotTypes)) seats[part.name] = table[part.name];
    }
    return {
      parts,
      pattern: renderPattern(parts),
      defaults,
      slotTypes,
      seats,
      requirements: action.constraints.filter((c) => slots.has(c.slot)).map((c) => ({ slot: c.slot, requirement: c.requirement })),
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
  }
  return rules;
}
