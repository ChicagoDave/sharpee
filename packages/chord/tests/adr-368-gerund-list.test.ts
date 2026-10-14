/**
 * adr-368-gerund-list.test.ts — ADR-368: a clause head lists its gerunds.
 *
 * AC-1..AC-4, AC-6, AC-7 and the chord half of AC-8 on a small fixture
 * world; AC-5 compiles every corpus story as written and with every run of
 * adjacent same-body clauses folded onto one head, and asserts the IR is
 * identical apart from spans. Every case asserts an IR field or a specific
 * diagnostic code and span — never "parsed without throwing".
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compile } from '../src';
import type { IROnClause, StoryIR } from '../src/ir';

const HEADER = `story
  title: Lists
  authors:
    T
  id: lists
  story-version: 0.0.1
`;

const PHRASES = `
define phrases en-US
  nope:
    No.
  note:
    Noted.
  morning:
    She waits for morning.
`;

interface Slots {
  top?: string;
  hall?: string;
  jack?: string;
  sword?: string;
  grounds?: string;
}

/** The fixture world; each slot is spliced into that block, already indented. */
const world = (s: Slots = {}) => `${HEADER}
${s.top ?? ''}
create the Grounds
  a region
${s.grounds ?? ''}

create the Hall
  a room
  in the Grounds
  states, reversible: busy, quiet
${s.hall ?? ''}
  A hall.

create Jack
  a person
  in the Hall
${s.jack ?? ''}
  Jack.

create the sword
  a thing
  in the Hall
${s.sword ?? ''}
  A sword.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

${PHRASES}`;

const errors = (s: Slots) => compile(world(s)).diagnostics.filter((d) => d.severity === 'error');
const codes = (s: Slots) => errors(s).map((d) => d.code);
const ok = (s: Slots): StoryIR => {
  const r = compile(world(s));
  const e = r.diagnostics.filter((d) => d.severity === 'error');
  if (e.length) throw new Error(e.map((d) => `${d.code}: ${d.message}`).join('\n'));
  return r.ir;
};
const clausesOf = (ir: StoryIR, id: string): IROnClause[] => ir.entities.find((e) => e.id === id)!.onClauses;

/** An IR value with every span removed. */
function withoutSpans(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(withoutSpans);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === 'span' || k === 'actionSpan') continue;
      out[k] = withoutSpans(v);
    }
    return out;
  }
  return value;
}

const REFUSE = '    refuse nope\n  end on\n';

describe('AC-1 — a listed head is one clause per gerund, in order, otherwise identical', () => {
  it('`on the player taking, touching, pushing` compiles to three clauses', () => {
    const list = clausesOf(ok({ sword: `  on the player taking, touching, pushing\n${REFUSE}` }), 'sword');
    expect(list.map((c) => c.action)).toEqual(['taking', 'touching', 'pushing']);
    const [first, ...rest] = list.map((c) => withoutSpans({ ...c, action: '' }));
    for (const c of rest) expect(c).toEqual(first);
    expect(list[0]).toMatchObject({ clauseKind: 'on', binding: 'object', actor: { kind: 'player' }, routing: 'interceptor' });
  });

  it('is the same IR as the three clauses written out', () => {
    const folded = ok({ sword: `  on the player taking, touching, pushing\n${REFUSE}` });
    const unfolded = ok({
      sword: `  on the player taking\n${REFUSE}  on the player touching\n${REFUSE}  on the player pushing\n${REFUSE}`,
    });
    expect(withoutSpans(folded)).toEqual(withoutSpans(unfolded));
  });

  it('the expanded clauses share the head span and carry their own action spans', () => {
    const list = clausesOf(ok({ sword: `  on the player taking, touching\n${REFUSE}` }), 'sword');
    expect(list[0].span).toEqual(list[1].span);
    expect(list[0].actionSpan).not.toEqual(list[1].actionSpan);
    expect(list[1].actionSpan!.column).toBeGreaterThan(list[0].actionSpan!.column);
  });
});

describe('AC-2 — the list rides every head form', () => {
  it('`after` heads', () => {
    const list = clausesOf(ok({ sword: '  after the player taking, dropping\n    phrase note\n  end after\n' }), 'sword');
    expect(list.map((c) => [c.clauseKind, c.action])).toEqual([['after', 'taking'], ['after', 'dropping']]);
  });

  it('a bare own-block head in a person\'s block, with `while` and `, once`', () => {
    const list = clausesOf(ok({ jack: `  on taking, dropping while the Hall is quiet, once\n    phrase morning\n  end on\n` }), 'jack');
    expect(list.map((c) => c.action)).toEqual(['taking', 'dropping']);
    for (const c of list) {
      expect(c).toMatchObject({ binding: 'self', actor: null, once: true });
      expect(c.condition).not.toBeNull();
    }
    expect(withoutSpans(list[0].condition)).toEqual(withoutSpans(list[1].condition));
  });

  it('a role tail applies to every listed gerund', () => {
    const top =
      'define action petting\n  grammar\n    pet the animal\n  otherwise refuse nope\n\n' +
      'define action grooming\n  grammar\n    groom the animal\n  otherwise refuse nope\n';
    const list = clausesOf(ok({ top, sword: `  on the player petting, grooming anything as the animal\n${REFUSE}` }), 'sword');
    expect(list.map((c) => c.action)).toEqual(['petting', 'grooming']);
    for (const c of list) expect(c).toMatchObject({ binding: 'role', role: 'animal' });
  });

  it('a trait-ordering modifier after the list applies to every clause', () => {
    const top = 'define trait careful\n  on the player taking\n    phrase note\n  end on\nend trait\n';
    const list = clausesOf(ok({ top, sword: `  on the player taking, touching, before careful\n${REFUSE}` }), 'sword');
    expect(list.map((c) => c.action)).toEqual(['taking', 'touching']);
    for (const c of list) expect(c.ordering).toEqual({ relation: 'before', trait: 'careful' });
  });

  it('`during <chapter>` after a list is the chapter condition on every clause', () => {
    const top = 'define chapters\n  opening - Chapter I\n    begins when the game starts\nend chapters\n';
    const header = 'use chapters\n';
    const src = world({ top, sword: `  on the player taking, touching during opening\n${REFUSE}` }).replace('story-version: 0.0.1\n', `story-version: 0.0.1\n  ${header}`);
    const r = compile(src);
    const e = r.diagnostics.filter((d) => d.severity === 'error');
    expect(e.map((d) => d.code)).toEqual([]);
    const list = clausesOf(r.ir, 'sword');
    expect(list.map((c) => c.action)).toEqual(['taking', 'touching']);
    for (const c of list) expect(c.condition).not.toBeNull();
  });
});

describe('AC-3 — what is not a list', () => {
  it('`and`/`or` are not separators: the error quotes from the connective and shows the comma form', () => {
    const e = errors({ sword: `  on the player taking, touching or pushing\n${REFUSE}` });
    expect(e.map((d) => d.code)).toContain('parse.head-gerund');
    const d = e.find((d) => d.code === 'parse.head-gerund')!;
    expect(d.message).toContain('`or pushing`');
    expect(d.message).toContain('`taking, touching, pushing`');
  });

  it('a two-word item is `parse.head-gerund`', () => {
    const e = errors({ sword: `  on the player taking, touching the key\n${REFUSE}` });
    const d = e.find((d) => d.code === 'parse.head-gerund')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`touching the key`');
  });

  it('a comma with nothing after it is `parse.head-gerund`', () => {
    expect(codes({ sword: `  on the player taking,\n${REFUSE}` })).toContain('parse.head-gerund');
  });

  it('`on every turn, taking` stays `parse.on-modifier`', () => {
    const c = codes({ sword: '  on every turn, taking\n    phrase note\n  end on\n' });
    expect(c).toContain('parse.on-modifier');
    expect(c).not.toContain('parse.head-gerund');
  });

  it('`, once` and `, before <trait>` after a single gerund still parse as modifiers', () => {
    const top = 'define trait careful\n  on the player taking\n    phrase note\n  end on\nend trait\n';
    const list = clausesOf(ok({ top, sword: `  on the player taking, once, before careful\n${REFUSE}` }), 'sword');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ action: 'taking', once: true, ordering: { relation: 'before', trait: 'careful' } });
  });
});

describe('AC-4 — repeats', () => {
  it('a gerund repeated on one head is `parse.head-gerund-repeated`, at the repeated word', () => {
    const e = errors({ sword: `  on the player taking, taking\n${REFUSE}` });
    const d = e.find((d) => d.code === 'parse.head-gerund-repeated')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`taking`');
    expect(d.span.column).toBeGreaterThan('  on the player taking, '.length);
    expect(e.map((d) => d.code)).not.toContain('analysis.duplicate-clause');
  });

  it('a folded head and a separate clause sharing a gerund is `analysis.duplicate-clause` on the later one', () => {
    const e = errors({ sword: `  on the player taking, touching\n${REFUSE}  on the player touching\n${REFUSE}` });
    const d = e.find((d) => d.code === 'analysis.duplicate-clause')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`on touching`');
    // The later clause is the unfolded one, three lines below the folded head.
    const foldedHeadLine = world({ sword: '' }).split('\n').findIndex((l) => l === '  A sword.');
    expect(d.span.line).toBeGreaterThan(foldedHeadLine);
  });
});

describe('AC-6 — a diagnostic about one listed action lands on that word', () => {
  it('an unknown role names the action and points at the list item', () => {
    const e = errors({ sword: `  on the player taking, giving anything as the recipient\n${REFUSE}` });
    const d = e.find((d) => d.code === 'analysis.unknown-role')!;
    expect(d).toBeDefined();
    expect(d.message).toContain('`taking`');
    // `taking` is the first item; its span starts after `on the player `.
    expect(d.span.column).toBe('  on the player '.length + 1);
  });
});

describe('AC-7 — a list may mix a standard action and a dispatch verb', () => {
  const top = 'define action petting\n  grammar\n    pet the animal\n  the animal must be reachable\n  refuse without animal: nope\n  otherwise refuse nope\n';

  it('routes each expanded clause by its own action', () => {
    const list = clausesOf(ok({ top, sword: `  on the player taking, petting\n${REFUSE}` }), 'sword');
    expect(list.map((c) => [c.action, c.routing])).toEqual([['taking', 'interceptor'], ['petting', 'capability']]);
  });

  it('a body naming the dispatch verb\'s slot is an error on the standard-action clause only', () => {
    const body = '    move the animal to the Hall\n  end on\n';
    const alone = errors({ top, sword: `  on the player petting\n${body}` });
    expect(alone).toEqual([]);
    const mixed = errors({ top, sword: `  on the player taking, petting\n${body}` });
    expect(mixed.length).toBe(1);
    expect(mixed[0].message).toContain('animal');
  });
});

describe('AC-8 (chord half) — both region crossings on one head', () => {
  it('`after the player entering, leaving` on a region is two event clauses', () => {
    const list = clausesOf(ok({ grounds: '  after the player entering, leaving\n    phrase note\n  end after\n' }), 'grounds');
    expect(list.map((c) => c.action)).toEqual(['entering', 'leaving']);
  });
});

// ---------------------------------------------------------------------------
// AC-5 — the corpus, folded, is the same IR
// ---------------------------------------------------------------------------

const REPO = resolve(__dirname, '..', '..', '..');

const CORPUS = [
  'branch-stories/fernhill/fernhill.story',
  'branch-stories/ides-of-march/ides-of-march.story',
  'branch-stories/secret-letter/secret-letter.story',
  'branch-stories/upps/upps.story',
  'stories/cloak-of-darkness/cloak.story',
  'stories/counter-demo/counter-demo.story',
  'stories/friendly-zoo/zoo.story',
  'stories/grammar-alterations/grammar-alterations.story',
  'stories/hunger-demo/hunger-demo.story',
  'stories/nautical/nautical.story',
  'stories/presence-test/presence-test.story',
  'stories/thealderman/chord/thealderman.story',
  'stories/character-acceptance/chord/character-acceptance.story',
];

const HEAD = /^(\s+)(on|after)\s+(.+?)(\s+(?:while|during|anything)\b.*|,.*)?$/;

interface Clause {
  start: number;
  end: number;
  indent: string;
  kind: string;
  actor: string;
  gerund: string;
  tail: string;
  body: string;
}

/** Read the clause starting at `i`, or null when the line is not a head or the clause does not close. */
function readClause(lines: string[], i: number): Clause | null {
  const m = HEAD.exec(lines[i]);
  if (!m) return null;
  const [, indent, kind, head, tail = ''] = m;
  if (head === 'every turn' || head.includes(',')) return null;
  const words = head.split(/\s+/);
  const gerund = words[words.length - 1];
  const actor = words.slice(0, -1).join(' ');
  for (let j = i + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line === `${indent}end ${kind}`) {
      return { start: i, end: j, indent, kind, actor, gerund, tail, body: lines.slice(i + 1, j).join('\n') };
    }
    if (line !== '' && !line.startsWith(indent) && !line.startsWith('##')) return null;
  }
  return null;
}

/** Fold every run of adjacent clauses that differ only by gerund onto one head. Returns the text and the number of heads folded. */
function fold(text: string): { text: string; folded: number } {
  const lines = text.split('\n');
  const out: string[] = [];
  let folded = 0;
  let i = 0;
  while (i < lines.length) {
    const first = readClause(lines, i);
    if (!first) {
      out.push(lines[i]);
      i++;
      continue;
    }
    const run = [first];
    let k = first.end + 1;
    for (;;) {
      // Blank lines between siblings are allowed, nothing else.
      let n = k;
      while (n < lines.length && lines[n] === '') n++;
      const next = n < lines.length ? readClause(lines, n) : null;
      const same = next && next.kind === first.kind && next.actor === first.actor && next.tail === first.tail && next.body === first.body;
      if (!same || run.some((c) => c.gerund === next!.gerund)) break;
      run.push(next!);
      k = next!.end + 1;
    }
    if (run.length === 1) {
      out.push(...lines.slice(first.start, first.end + 1));
      i = first.end + 1;
      continue;
    }
    const actor = first.actor ? `${first.actor} ` : '';
    out.push(`${first.indent}${first.kind} ${actor}${run.map((c) => c.gerund).join(', ')}${first.tail}`);
    out.push(...lines.slice(first.start + 1, first.end + 1));
    folded++;
    i = k;
  }
  return { text: out.join('\n'), folded };
}

describe('AC-5 — a corpus with its sibling clauses folded compiles to the same IR', () => {
  const totals = { folded: 0 };

  for (const relative of CORPUS) {
    const path = join(REPO, relative);
    it.skipIf(!existsSync(path))(`${relative}: identical IR apart from spans`, () => {
      const dir = dirname(path);
      const read = (name: string) => (existsSync(join(dir, name)) ? readFileSync(join(dir, name), 'utf8') : null);
      const original = compile(readFileSync(path, 'utf8'), { importResolver: read });
      const main = fold(readFileSync(path, 'utf8'));
      let folded = main.folded;
      const result = compile(main.text, {
        importResolver: (name) => {
          const source = read(name);
          if (source === null) return null;
          const fragment = fold(source);
          folded += fragment.folded;
          return fragment.text;
        },
      });
      totals.folded += folded;
      expect(result.diagnostics.map((d) => d.code).sort()).toEqual(original.diagnostics.map((d) => d.code).sort());
      expect(withoutSpans(result.ir)).toEqual(withoutSpans(original.ir));
    });
  }

  it('the fold found sibling runs to fold', () => {
    expect(totals.folded).toBeGreaterThan(0);
  });
});
