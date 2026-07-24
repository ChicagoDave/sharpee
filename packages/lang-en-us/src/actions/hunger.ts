/**
 * Language content for the hunger meter (ADR-263 / ADR-262 D3).
 *
 * Hunger contributes no verb — like scoring, `if.action.hunger` is only a
 * namespace for the crossing fallback line. `crossed` is the overridable
 * platform sentence a hunger band speaks when the author gave the rung no `says`
 * phrase (silence is explicit, ADR-262 D3). It is deliberately generic — an
 * author who wants band-specific prose writes `says <key>`; this is the neutral
 * escalation shown when they did not. (It avoids interpolating the band word,
 * which the assembler would article as a noun — "a hungry" — the same cosmetic
 * quirk scoring's `{rank}` has; a per-band line belongs in the author's `says`.)
 */

export const hungerLanguage = {
  actionId: 'if.action.hunger',

  patterns: [],

  messages: {
    // ADR-262 D3 fallback: spoken on a hunger crossing when the rung has no
    // `says`. Overridable via `override message hunger-crossed`.
    'crossed': "The hunger sharpens.",

    // ADR-263 D1 `fatal`: the death line when severity reaches the threshold.
    // Routed through the death event's messageId (like combat's player_died),
    // so it is lang-en-us prose, not a hardcoded string, and is overridable via
    // `override message hunger-starved`.
    'starved': "{You} {have} starved to death."
  },

  help: {
    description: 'Hunger meter (ADR-263).',
    examples: '',
    summary: 'Hunger meter — internal.'
  }
};
