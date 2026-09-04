/**
 * Turn-phase bands (ADR-332): the after-action run order as three named
 * bands. Priority stays the mechanism `PluginRegistry.getAll()` sorts by;
 * the band is what a plugin's author chooses, by name — a plugin takes its
 * priority from its band's constant, so the order across bands is the
 * principle (what the author wrote happens first; the platform acts on the
 * world the author left; the watchers read the finished turn) and the
 * order within a band is local.
 *
 * Public interface: TURN_BANDS, TurnBandName, TurnBand, bandOf.
 * Owner context: @sharpee/plugins — the turn-plugin registry.
 */

/** One band: its name, its inclusive priority range, and why it runs where it does. */
export interface TurnBand {
  /** The band's name — what a plugin declares. */
  readonly name: TurnBandName;
  /** Lowest priority inside the band (inclusive). */
  readonly floor: number;
  /** Highest priority inside the band (inclusive). */
  readonly ceiling: number;
  /** Why the band runs where it does (ADR-332 D2). */
  readonly rationale: string;
}

/** The three band names, in run order. */
export type TurnBandName = 'storyReactions' | 'platformPhases' | 'watchers';

/**
 * The bands, highest priority first — the run order (ADR-332 D2).
 *
 * - `storyReactions` (300–399): the scheduler — every Chord timer,
 *   every-turn and sequence clause; TS daemons and fuses. What the author
 *   wrote happens first.
 * - `platformPhases` (200–299): the actor phase, state machines, scene
 *   evaluation. The platform acts on the world the author left; their
 *   relative order is ADR-120's, unchanged.
 * - `watchers` (100–199): scoring, hunger, chapters. They read the finished
 *   turn and announce — a rank crossed, a band entered, a chapter begun.
 */
export const TURN_BANDS: Readonly<Record<TurnBandName, TurnBand>> = Object.freeze({
  storyReactions: Object.freeze({
    name: 'storyReactions',
    floor: 300,
    ceiling: 399,
    rationale: 'what the author wrote happens first',
  }),
  platformPhases: Object.freeze({
    name: 'platformPhases',
    floor: 200,
    ceiling: 299,
    rationale: 'the platform acts on the world the author left',
  }),
  watchers: Object.freeze({
    name: 'watchers',
    floor: 100,
    ceiling: 199,
    rationale: 'read the finished turn and announce',
  }),
});

/** The band names in run order (highest priority first). */
export const TURN_BAND_ORDER: readonly TurnBandName[] = Object.freeze([
  'storyReactions',
  'platformPhases',
  'watchers',
]);

/**
 * The band a priority falls in, or `undefined` for an unbanded number. The
 * registry never refuses an unbanded priority (ADR-120: "stories can adjust
 * ordering"); this is how tooling and the placement test read one.
 *
 * @param priority - A turn plugin's priority
 * @returns The band name, or undefined when the number is outside every band
 */
export function bandOf(priority: number): TurnBandName | undefined {
  for (const name of TURN_BAND_ORDER) {
    const band = TURN_BANDS[name];
    if (priority >= band.floor && priority <= band.ceiling) return name;
  }
  return undefined;
}
