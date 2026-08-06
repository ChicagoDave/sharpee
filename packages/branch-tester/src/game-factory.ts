/**
 * game-factory.ts — build the `GameFactory` a tree walk needs, once.
 *
 * ADR-302 D1 makes a root a fresh game; D17 makes every divergent sibling one
 * too. So the same root is booted several times in one run, and all of those
 * boots must land on the SAME master seed — a root that declared no `seed:`
 * would otherwise draw a fresh clock seed per boot, and the prefix replayed for
 * a later sibling would diverge from the one the first child actually saw. The
 * seed the first boot resolved is therefore remembered per root stem and
 * re-pinned on every subsequent boot.
 *
 * This lived as a hand-copied closure in each caller (`cli.ts` and the bundle's
 * `scripts/bundle-entry.js`). The copies drifted — one read the root's seed from
 * `transcript.seed`, the other from `config.seeds[0]` — and the re-pin rule had
 * to be rediscovered when the bundle copy was missed. One implementation, three
 * callers.
 *
 * Public interface: createRootGameFactory(options) → GameFactory.
 * Owner context: @sharpee/branch-tester (test infrastructure).
 */
import type { TreeNode } from './tree.js';

/** What a caller's loader needs in order to boot a root. */
export interface RootBootSpec {
  /** The root's `entry:` header field — a module story's sub-entry, if any. */
  entry?: string;
  /**
   * The seed to boot at: the root's own pin on the first boot, and thereafter
   * whatever that first boot actually resolved. `undefined` only when the root
   * pinned nothing AND the first boot reported no master seed.
   */
  seed?: number;
  /** The root's declared `channels:`, empty when it declared none. */
  channels: string[];
  /** The root's stem (filename identity, ADR-302 D14) — for diagnostics. */
  stem: string;
}

export interface RootGameFactoryOptions<G> {
  /** Boot one fresh game. Called once per root, then once per fork below it. */
  load: (spec: RootBootSpec) => Promise<G>;
  /**
   * Read the master seed a booted game actually resolved. Returning `undefined`
   * disables re-pinning for that root, which is correct only when the caller's
   * engine cannot report one.
   */
  masterSeedOf: (game: G) => number | undefined;
  /**
   * Called once per root, on its FIRST boot only, with the seed that boot
   * resolved. Callers that announce the seed do it here so the announcement is
   * not repeated at every fork.
   */
  onFirstBoot?: (stem: string, seed: number | undefined) => void;
}

/**
 * The root's declared pin, preferring the singular `seed:` and falling back to
 * the first entry of a `seeds:` matrix.
 *
 * The parser mirrors `seed: N` into `config.seeds` as a single entry, so for the
 * singular form the two agree. They part only on a `seeds: A, B` matrix root,
 * where `transcript.seed` is unset — the matrix's first entry is the boot seed,
 * matching how the runner threads a matrix per recording.
 */
function declaredSeed(root: TreeNode): number | undefined {
  const transcript = root.transcript as { seed?: number; config?: { seeds?: number[] } };
  return transcript.seed ?? transcript.config?.seeds?.[0];
}

/**
 * Build the `GameFactory` passed to `runTree`.
 *
 * @param options the caller's loader, its master-seed reader, and an optional
 *   first-boot hook.
 * @returns a factory that boots a fresh game per root, re-pinning each root's
 *   resolved seed on every boot after the first.
 */
export function createRootGameFactory<G>(options: RootGameFactoryOptions<G>): (root: TreeNode) => Promise<G> {
  const { load, masterSeedOf, onFirstBoot } = options;
  /** stem → the master seed that root's first boot resolved. */
  const bootedSeeds = new Map<string, number | undefined>();

  return async (root: TreeNode): Promise<G> => {
    const stem = root.stem;
    const booted = bootedSeeds.has(stem);
    const header = root.transcript as { header?: { entry?: string }; config?: { channels?: string[] } };

    const game = await load({
      entry: header.header?.entry,
      seed: booted ? bootedSeeds.get(stem) : declaredSeed(root),
      channels: header.config?.channels ?? [],
      stem,
    });

    if (!booted) {
      const resolved = masterSeedOf(game) ?? declaredSeed(root);
      bootedSeeds.set(stem, resolved);
      onFirstBoot?.(stem, resolved);
    }
    return game;
  };
}
