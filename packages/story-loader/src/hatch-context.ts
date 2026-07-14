/**
 * hatch-context.ts — the narrow staging context handed to text-hatch
 * producers, plus the bind-time `'chord.'` source lint (design.md §5.6,
 * hatch-context proposal 2026-07-12).
 *
 * Enforcement is by construction: chord producers are invoked at phrase
 * staging (runtime.ts `phraseEvent`), and the context they receive is built
 * HERE — a fresh object whose `world` exposes only `RenderWorld`'s read
 * methods. A hatch cannot misuse what it is never given; casting the facade
 * finds nothing (the gateStatus precedent: a producer once cast its way to
 * `getStateValue` and read a loader-private `chord.*` key that a later
 * ratchet deleted, silently).
 *
 * Public interface: HATCH_CONTEXT_VERSION, stagingRenderContext,
 * findChordLiteral.
 * Owner context: @sharpee/story-loader.
 */
import type { RenderContext, RenderWorld } from '@sharpee/if-domain';
import type { WorldModel } from '@sharpee/world-model';

/**
 * Version of the surface hatches can see. Bumped only when the narrowed
 * staging surface changes (a `RenderContext`/`RenderWorld` member becomes
 * available to hatches). Re-exported by @sharpee/ide-protocol so the IDE
 * can state exactly what a hatch may touch (the §5.6 IDE contract).
 */
export const HATCH_CONTEXT_VERSION = 1;

/**
 * Build the narrow, honest `RenderContext` a producer is invoked with at
 * staging time. `world` is a three-method facade over the live world
 * (`nounPhraseFor` is omitted — optional, stdlib-bound, and staging-time
 * producers do not realize noun phrases). The remaining seams are inert by
 * construction because they genuinely do not exist at staging: persistent
 * text state is an assembler-time seam — a producer that needs it returns
 * a `Choice` atom (ADR-196) realized later against the engine's real
 * context. No member exposes mutation or state-key reads.
 *
 * @param world the live world model (read-only access only)
 * @returns a genuine `RenderContext` (no cast) safe to hand author code
 */
export function stagingRenderContext(world: WorldModel): RenderContext {
  const facade: RenderWorld = {
    getEntity: (entityId) => world.getEntity(entityId),
    getEntityContents: (entityId) => world.getContents(entityId),
    getContainingRoom: (entityId) => world.getContainingRoom(entityId),
  };
  return {
    world: facade,
    params: {},
    settings: {},
    narrative: { person: 'second' },
    reference: {
      lastMentioned: () => undefined,
      note: () => {
        // Staging has no realization order — nothing to note.
      },
    },
    textState: {
      get: () => undefined,
      set: () => {
        // Inert at staging: persistent choice state belongs to the assembler pass.
      },
    },
    contribute: () => {
      // Slot contributions are a per-turn render seam; staging has no slot store.
    },
  };
}

/** Matches a quoted string literal opening with `chord.` — the loader-private namespace. */
const CHORD_LITERAL = /['"`]chord\./;

/**
 * Bind-time lint (best-effort backstop; the facade is the wall): scan a
 * bound hatch export's source text for a quoted `chord.` literal. For a
 * function export the function's own source is scanned; for an object
 * export (action/behavior hatches) each function-valued own property is.
 *
 * Documented imprecisions (proposal §3.2): minified bundles may evade the
 * scan (the devkit source lint is the authoritative layer), and a QUOTED
 * `chord.` inside a comment in the compiled output trips it — the remedy
 * is rewording the comment.
 *
 * @param bound the module export about to be bound
 * @returns the offending source snippet (trimmed to the match line), or
 *   null when clean or unscannable
 */
export function findChordLiteral(bound: unknown): string | null {
  const sources: string[] = [];
  if (typeof bound === 'function') {
    sources.push(Function.prototype.toString.call(bound));
  } else if (bound !== null && typeof bound === 'object') {
    for (const value of Object.values(bound)) {
      if (typeof value === 'function') sources.push(Function.prototype.toString.call(value));
    }
  }
  for (const source of sources) {
    const match = CHORD_LITERAL.exec(source);
    if (match) {
      const start = source.lastIndexOf('\n', match.index) + 1;
      const end = source.indexOf('\n', match.index);
      return source.slice(start, end === -1 ? undefined : end).trim();
    }
  }
  return null;
}
