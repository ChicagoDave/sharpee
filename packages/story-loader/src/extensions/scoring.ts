/**
 * scoring.ts — the `use scoring` registry entry.
 *
 * Three moments. `registerWorld` enables scoring on the world at load;
 * `registerPlugin` installs the config-free rank watcher at engine-ready;
 * `installFromIR` builds the promotion narrator from the story's rank
 * ladder — each crossed rung speaks its authored `says` phrase or the
 * overridable platform fallback, under the story's `announce` mode — and
 * registers it whenever a ladder exists. The ladder's thresholds reach the
 * world through the loader's generic `ranks` lowering; only the per-rung
 * phrase keys stay here, in the narrator's closure.
 *
 * Public interface: SCORING_EXTENSION.
 * Owner context: @sharpee/story-loader (language-neutral IR consumer).
 *
 * References:
 * - ADR-261 D1, D7 — `registerWorld` and `registerPlugin` fill two of the
 *   contract's three parts; the promotion reaction reads the phrase keys.
 * - ADR-262 D3, D6 — every crossed rung speaks; `announce` modes; the
 *   band narrator this entry renders through.
 * - ADR-260 D2 — `RankDefinition` carries no phrase key.
 * - ADR-335 D3 — IR-shaped construction lives in the registry entry.
 */
import type { StoryIR } from '@sharpee/chord';
import { registerScoring, registerScoringPlugin } from '@sharpee/ext-scoring';
import { TURN_BANDS, createBandNarrator, type BandAnnounceMode, type BandRung, type TurnPlugin } from '@sharpee/plugins';
import type { ExtensionRegistration } from '../extension-registry.js';

/**
 * The promotion narrator — the Chord render layer over the crossing
 * engine.
 *
 * A promotion *says* the rung's authored `says` phrase; a rung with **no**
 * `says` speaks the overridable platform fallback
 * (`if.action.scoring.promotion`), because silence is explicit — only
 * `announce silent` suppresses. A thin {@link createBandNarrator} over the
 * score scalar: it renders each crossed rung (`all` mode) so a
 * multi-band jump narrates every elevation, and it is fed by the same
 * derived ledger the platform's rank watcher reads, so the two cannot
 * disagree about whether a rung was crossed — what differs is only what
 * each produces, the platform its `band_crossed` event, the story its
 * sentence.
 */
function buildPromotionNarrator(ir: StoryIR): TurnPlugin {
  const phraseByRankId = new Map<string, string>();
  for (const rung of ir.ranks) {
    if (rung.phraseKey !== undefined) phraseByRankId.set(rung.id, rung.phraseKey);
  }

  return createBandNarrator({
    id: 'chord.story.promotion-narrator',
    // Watchers band (ADR-332), after ext-scoring's rank watcher: the sentence follows the event.
    priority: TURN_BANDS.watchers.floor + 15,
    concept: 'rank',
    isEnabled: (world) => world.isScoringEnabled(),
    value: (world) => world.getScore(),
    bands: (world): BandRung[] =>
      world.getRanks().map((r) => ({
        id: r.id,
        threshold: r.threshold,
        name: r.name,
        phraseId: phraseByRankId.get(r.id),
      })),
    // The bottom rung is the starting position — seed it silently.
    seedAtOrBelow: 0,
    // ADR-262 D3: `use scoring, announce <mode>`; default `all` reports each
    // elevation on a multi-band jump (ADR-262 D6). The analyzer validated it.
    mode: (ir.announceModes?.['scoring'] ?? 'all') as BandAnnounceMode,
    narrationEventId: 'if.event.rank_narrated',
    // ADR-262 D3: spoken when a rung has no `says`. Overridable via
    // `override message scoring-promotion`.
    fallbackPhraseId: 'if.action.scoring.promotion',
    // Preserve scoring's authored `{rank}` / `{score}` phrase params.
    paramsFor: (rung, span) => ({ rank: rung.name, score: span.value }),
  });
}

export const SCORING_EXTENSION: ExtensionRegistration = {
  registerWorld: (world) => registerScoring(world),
  registerPlugin: (registry) => registerScoringPlugin(registry),
  installFromIR: (ir, engine) => {
    // Every crossed rung speaks, so the narrator registers whenever a
    // ladder exists, not only when some rung has a phrase. `announce
    // silent` still suppresses output; the narrator simply emits nothing.
    if (ir.ranks.length > 0) {
      engine.getPluginRegistry().register(buildPromotionNarrator(ir));
    }
  },
};
