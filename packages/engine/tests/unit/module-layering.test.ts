/**
 * The package's internal layering is pinned by edge (game-engine-residue
 * plan, Phase 9): the import graph of `src/` — every relative `import`
 * and `export … from` — is acyclic once the one allow-listed edge is
 * removed, the facade is imported by nothing but the barrel and that
 * edge, the barrel is imported by nothing, `types.ts` is a leaf, and
 * `ports/` and `install/narrative/` read nothing in the package but
 * `types.ts`. A new edge that breaks any of these fails here by name.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const SRC_DIR = join(__dirname, '..', '..', 'src');

/**
 * Edges the package knowingly carries, each with its reason. An edge
 * listed here must still exist — when it goes, remove it from the list.
 */
const ALLOWED_CYCLE_EDGES: ReadonlyArray<readonly [from: string, to: string, why: string]> = [
  ['install/story.ts', 'game-engine.ts', '`Story.onEngineReady(engine: GameEngine)` names the concrete class; a role interface for what a story needs at ready time is its own ADR'],
];

/** Every `.ts` file under `src/`, recursively, as paths relative to `src/`. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? sourceFiles(full) : full.endsWith('.ts') ? [full] : [];
  });
}

/** The relative-import graph of `src/`: file → the files it imports. */
function importGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  const specifier = /(?:import|export)\s[^'"]*?from\s+['"](\.[^'"]+)['"]|import\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g;
  for (const file of sourceFiles(SRC_DIR)) {
    const from = relative(SRC_DIR, file);
    const out = new Set<string>();
    const text = readFileSync(file, 'utf-8');
    for (const match of text.matchAll(specifier)) {
      const spec = (match[1] ?? match[2]).replace(/\.js$/, '');
      let target = resolve(dirname(file), spec);
      if (existsSync(`${target}.ts`)) target = `${target}.ts`;
      else if (existsSync(join(target, 'index.ts'))) target = join(target, 'index.ts');
      else continue;
      out.add(relative(SRC_DIR, target));
    }
    graph.set(from, out);
  }
  return graph;
}

/** Strongly connected components of size two or more — the cycles. */
function cycles(graph: Map<string, Set<string>>): string[][] {
  let counter = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const found: string[][] = [];
  const visit = (v: string) => {
    index.set(v, counter);
    low.set(v, counter);
    counter += 1;
    stack.push(v);
    onStack.add(v);
    for (const w of graph.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) {
        low.set(v, Math.min(low.get(v)!, index.get(w)!));
      }
    }
    if (low.get(v) === index.get(v)) {
      const component: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        component.push(w);
      } while (w !== v);
      if (component.length > 1) found.push(component.sort());
    }
  };
  for (const v of graph.keys()) if (!index.has(v)) visit(v);
  return found;
}

const edges = (graph: Map<string, Set<string>>) =>
  [...graph].flatMap(([from, outs]) => [...outs].map((to) => `${from} -> ${to}`)).sort();

describe('engine module layering (Phase 9)', () => {
  const graph = importGraph();

  it('the allow-listed edges still exist — remove one from the list when it goes', () => {
    const missing = ALLOWED_CYCLE_EDGES.filter(([from, to]) => !graph.get(from)?.has(to)).map(([from, to]) => `${from} -> ${to}`);
    expect(missing).toEqual([]);
  });

  it('is acyclic once the allow-listed edges are removed', () => {
    const pruned = new Map([...graph].map(([from, outs]) => [from, new Set(outs)]));
    for (const [from, to] of ALLOWED_CYCLE_EDGES) pruned.get(from)?.delete(to);
    expect(cycles(pruned)).toEqual([]);
  });

  it('nothing imports game-engine.ts but index.ts and the allow-list', () => {
    const allowed = new Set(['index.ts', ...ALLOWED_CYCLE_EDGES.filter(([, to]) => to === 'game-engine.ts').map(([from]) => from)]);
    const offenders = edges(graph).filter((e) => e.endsWith(' -> game-engine.ts') && !allowed.has(e.split(' -> ')[0]));
    expect(offenders).toEqual([]);
  });

  it('nothing imports index.ts — the barrel is for consumers', () => {
    expect(edges(graph).filter((e) => e.endsWith(' -> index.ts'))).toEqual([]);
  });

  it('types.ts imports nothing in the package', () => {
    expect([...(graph.get('types.ts') ?? [])]).toEqual([]);
  });

  it('ports/ and install/narrative/ read nothing in the package but types.ts', () => {
    const offenders = edges(graph).filter((e) => {
      const [from, to] = e.split(' -> ');
      const gated = from.startsWith('ports/') || from.startsWith('install/narrative/');
      return gated && to !== 'types.ts' && dirname(to) !== dirname(from);
    });
    expect(offenders).toEqual([]);
  });
});
