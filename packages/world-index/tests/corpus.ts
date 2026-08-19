/**
 * corpus.ts — the repository's three Chord stories, compiled from source.
 *
 * The acceptance method is fault injection against a real story (ADR-321
 * Acceptance): a story is compiled, a known fault is written into its IR, and
 * the analyzer must name that fault. Compiling the `.story` source rather than
 * reading a committed `.ir.json` keeps the fixture honest — a stale build
 * artifact would pin yesterday's compiler.
 *
 * Owner context: @sharpee/world-index — tests.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compile, type StoryIR } from '@sharpee/chord';

/** Repository root, resolved from this file rather than the working directory. */
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

/** The three Chord stories the corpus tests run against. */
export const CORPUS = {
  fernhill: 'branch-stories/fernhill/fernhill.story',
  alderman: 'stories/thealderman/chord/thealderman.story',
  idesOfMarch: 'branch-stories/ides-of-march/ides-of-march.story',
} as const;

/**
 * Compile one corpus story to IR.
 *
 * @param relativePath the story's path from the repository root
 * @returns the compiled IR
 * @throws when the story does not compile — a broken fixture must fail loudly
 */
export function compileStory(relativePath: string): StoryIR {
  const result = compile(readFileSync(`${REPO_ROOT}${relativePath}`, 'utf8'));
  if (!result.ok) {
    throw new Error(
      `${relativePath} did not compile:\n${result.diagnostics.map((d) => d.message).join('\n')}`,
    );
  }
  return result.ir;
}

/**
 * A private copy of a story's IR, for writing a fault into.
 *
 * @param ir the IR to copy
 * @returns a deep copy no other test shares
 */
export function faultable(ir: StoryIR): StoryIR {
  return structuredClone(ir);
}

/**
 * One entity from a story, by id.
 *
 * @param ir the story IR
 * @param id the entity id
 * @returns the entity
 * @throws when the story has no such entity — the fixture has drifted
 */
export function entity(ir: StoryIR, id: string) {
  const found = ir.entities.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`fixture has no entity \`${id}\``);
  return found;
}

/**
 * Compile Chord source written inline by a test.
 *
 * @param source the Chord source
 * @returns the compiled IR
 * @throws when the source does not compile — a broken fixture must fail loudly
 */
export function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) {
    throw new Error(`fixture did not compile:\n${result.diagnostics.map((d) => d.message).join('\n')}`);
  }
  return result.ir;
}
