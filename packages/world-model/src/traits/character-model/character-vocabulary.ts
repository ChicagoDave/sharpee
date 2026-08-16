/**
 * Character model vocabulary types (ADR-141, ADR-310, ADR-318)
 *
 * String literal union types for all word-based authoring inputs, plus the
 * serializable shapes for valued beliefs (ADR-310 D14), the normative layer
 * (ADR-318), and the runtime state that rides the trait (ADR-310 D17).
 * Authors interact with these words; internal numeric values are
 * implementation details managed by CharacterModelTrait.
 *
 * The word lists here are frozen author-facing compatibility surface
 * (freeze review: David, 2026-08-15 — docs/work/adr-310/contracts.md §6).
 * Removing a word breaks stories; additions stay possible.
 *
 * Public interface: All exported types and maps.
 * Owner context: world-model / character-model trait
 */

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

/**
 * Core personality traits — fixed at character creation.
 * `remorseful` / `untroubled` are conscience sensitivity (ADR-318 D8).
 */
export type PersonalityTrait =
  | 'honest' | 'loyal' | 'cowardly' | 'paranoid'
  | 'cruel' | 'cunning' | 'curious' | 'stubborn'
  | 'generous' | 'vain' | 'devout' | 'impulsive'
  | 'remorseful' | 'untroubled';

/** All personality traits, for vocabulary export and iteration (ADR-310 D2). */
export const PERSONALITY_TRAITS: readonly PersonalityTrait[] = [
  'honest', 'loyal', 'cowardly', 'paranoid',
  'cruel', 'cunning', 'curious', 'stubborn',
  'generous', 'vain', 'devout', 'impulsive',
  'remorseful', 'untroubled',
];

/** Intensity modifiers for personality traits. */
export type Intensity = 'slightly' | 'somewhat' | 'very' | 'extremely';

/** All intensity words, for vocabulary export and iteration (excludes the internal `bare` step). */
export const INTENSITY_WORDS: readonly Intensity[] = ['slightly', 'somewhat', 'very', 'extremely'];

/** A personality expression: bare trait or intensity-qualified. */
export type PersonalityExpr = PersonalityTrait | `${Intensity} ${PersonalityTrait}`;

/** Maps intensity words to internal 0-1 values. */
export const INTENSITY_VALUES: Record<Intensity | 'bare', number> = {
  slightly:  0.2,
  somewhat:  0.4,
  bare:      0.6,
  very:      0.8,
  extremely: 0.95,
};

/**
 * Parse a PersonalityExpr into trait name and numeric value.
 *
 * @param expr - A personality expression like 'very honest' or 'loyal'
 * @returns Tuple of [trait name, intensity value]
 */
export function parsePersonalityExpr(expr: PersonalityExpr): [PersonalityTrait, number] {
  const parts = expr.split(' ');
  if (parts.length === 2) {
    const intensity = parts[0] as Intensity;
    const trait = parts[1] as PersonalityTrait;
    return [trait, INTENSITY_VALUES[intensity]];
  }
  return [expr as PersonalityTrait, INTENSITY_VALUES.bare];
}

// ---------------------------------------------------------------------------
// Disposition
// ---------------------------------------------------------------------------

/**
 * Disposition words — how the NPC feels about a specific entity.
 * Directed and persistent. Distinct from mood (transient, undirected)
 * and threat (situational).
 */
export type DispositionWord =
  | 'despises' | 'hates' | 'dislikes' | 'wary of'
  | 'neutral' | 'likes' | 'trusts' | 'devoted to';

/** All disposition words, for vocabulary export and iteration (ADR-310 D3). */
export const DISPOSITION_WORDS: readonly DispositionWord[] = [
  'despises', 'hates', 'dislikes', 'wary of',
  'neutral', 'likes', 'trusts', 'devoted to',
];

/** Internal numeric ranges for each disposition word. */
export const DISPOSITION_RANGES: Record<DispositionWord, { min: number; max: number; midpoint: number }> = {
  'despises':    { min: -100, max: -90,  midpoint: -95 },
  'hates':       { min:  -90, max: -70,  midpoint: -80 },
  'dislikes':    { min:  -70, max: -50,  midpoint: -60 },
  'wary of':     { min:  -40, max: -20,  midpoint: -30 },
  'neutral':     { min:  -10, max:  10,  midpoint:   0 },
  'likes':       { min:   30, max:  50,  midpoint:  40 },
  'trusts':      { min:   50, max:  70,  midpoint:  60 },
  'devoted to':  { min:   80, max: 100,  midpoint:  90 },
};

/**
 * Resolve a disposition word to its midpoint numeric value.
 *
 * @param word - A disposition word
 * @returns The midpoint of the disposition range
 */
export function dispositionToValue(word: DispositionWord): number {
  return DISPOSITION_RANGES[word].midpoint;
}

/**
 * Resolve a numeric disposition value back to the nearest word.
 *
 * @param value - A numeric disposition value (-100 to 100)
 * @returns The disposition word whose range contains the value
 */
export function valueToDisposition(value: number): DispositionWord {
  if (value <= -90)  return 'despises';
  if (value <= -70)  return 'hates';
  if (value <= -50)  return 'dislikes';
  if (value <= -20)  return 'wary of';
  if (value <= 10)   return 'neutral';
  if (value <= 50)   return 'likes';
  if (value <= 70)   return 'trusts';
  return 'devoted to';
}

// ---------------------------------------------------------------------------
// Mood
// ---------------------------------------------------------------------------

/**
 * Mood words — the NPC's current transient emotional state.
 * Undirected (not about anyone in particular). Changes frequently
 * based on events and decays toward a baseline.
 */
export type Mood =
  | 'calm' | 'content' | 'cheerful'
  | 'nervous' | 'anxious' | 'panicked'
  | 'angry' | 'furious'
  | 'sad' | 'grieving'
  | 'suspicious' | 'confused' | 'resigned';

/** All platform mood words, for vocabulary export and iteration (ADR-310 D3). */
export const MOODS: readonly Mood[] = [
  'calm', 'content', 'cheerful',
  'nervous', 'anxious', 'panicked',
  'angry', 'furious',
  'sad', 'grieving',
  'suspicious', 'confused', 'resigned',
];

/**
 * Internal valence-arousal coordinates for each mood.
 * Valence: -1 (negative) to +1 (positive).
 * Arousal: 0 (low energy) to 1 (high energy).
 */
export const MOOD_AXES: Record<Mood, { valence: number; arousal: number }> = {
  'calm':       { valence:  0.3,  arousal: 0.1 },
  'content':    { valence:  0.5,  arousal: 0.2 },
  'cheerful':   { valence:  0.8,  arousal: 0.5 },
  'nervous':    { valence: -0.3,  arousal: 0.5 },
  'anxious':    { valence: -0.4,  arousal: 0.7 },
  'panicked':   { valence: -0.7,  arousal: 0.95 },
  'angry':      { valence: -0.6,  arousal: 0.7 },
  'furious':    { valence: -0.9,  arousal: 0.95 },
  'sad':        { valence: -0.5,  arousal: 0.2 },
  'grieving':   { valence: -0.8,  arousal: 0.3 },
  'suspicious': { valence: -0.3,  arousal: 0.4 },
  'confused':   { valence: -0.2,  arousal: 0.3 },
  'resigned':   { valence: -0.4,  arousal: 0.1 },
};

/**
 * Mood nudge modifiers (ADR-310 D5 custom-mood syntax — Option 2, David
 * 2026-08-15): `define mood <name> like <mood>, but <modifier>`. Each
 * shifts ONE axis a fixed runtime-owned step from the anchor mood.
 */
export type MoodModifier = 'restless' | 'stiller' | 'darker' | 'brighter';

/** All mood modifiers, for vocabulary export and iteration. */
export const MOOD_MODIFIERS: readonly MoodModifier[] = ['restless', 'stiller', 'darker', 'brighter'];

/**
 * Apply a mood modifier's fixed nudge to valence-arousal coordinates.
 * The step sizes are runtime-owned (numbers never appear in Chord);
 * results clamp to the axes' ranges.
 *
 * @param axes - The anchor mood's coordinates
 * @param modifier - The nudge word
 * @returns Nudged, clamped coordinates
 */
export function applyMoodModifier(
  axes: { valence: number; arousal: number },
  modifier: MoodModifier,
): { valence: number; arousal: number } {
  const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  switch (modifier) {
    case 'restless':
      return { valence: axes.valence, arousal: clamp(axes.arousal + 0.25, 0, 1) };
    case 'stiller':
      return { valence: axes.valence, arousal: clamp(axes.arousal - 0.25, 0, 1) };
    case 'darker':
      return { valence: clamp(axes.valence - 0.3, -1, 1), arousal: axes.arousal };
    case 'brighter':
      return { valence: clamp(axes.valence + 0.3, -1, 1), arousal: axes.arousal };
  }
}

/**
 * Find the closest mood word to a valence-arousal coordinate.
 *
 * @param valence - Valence value (-1 to 1)
 * @param arousal - Arousal value (0 to 1)
 * @returns The mood word with the smallest Euclidean distance
 */
export function nearestMood(valence: number, arousal: number): Mood {
  let best: Mood = 'calm';
  let bestDist = Infinity;
  for (const [mood, axes] of Object.entries(MOOD_AXES) as [Mood, { valence: number; arousal: number }][]) {
    const dist = (axes.valence - valence) ** 2 + (axes.arousal - arousal) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = mood;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Threat
// ---------------------------------------------------------------------------

/**
 * Threat level — how endangered the NPC feels.
 * Situational and distinct from mood and disposition.
 */
export type ThreatLevel =
  | 'safe' | 'uneasy' | 'wary' | 'threatened' | 'cornered' | 'desperate';

/** All threat words, for vocabulary export and iteration. */
export const THREAT_LEVELS: readonly ThreatLevel[] = [
  'safe', 'uneasy', 'wary', 'threatened', 'cornered', 'desperate',
];

/** Maps threat words to internal 0-100 values. */
export const THREAT_VALUES: Record<ThreatLevel, number> = {
  'safe':       0,
  'uneasy':    20,
  'wary':      40,
  'threatened': 60,
  'cornered':  80,
  'desperate': 95,
};

/**
 * Resolve a numeric threat value back to the nearest threat level.
 *
 * @param value - A numeric threat value (0-100)
 * @returns The threat level word
 */
export function valueToThreat(value: number): ThreatLevel {
  if (value <= 10)  return 'safe';
  if (value <= 30)  return 'uneasy';
  if (value <= 50)  return 'wary';
  if (value <= 70)  return 'threatened';
  if (value <= 85)  return 'cornered';
  return 'desperate';
}

// ---------------------------------------------------------------------------
// Cognitive Profile
// ---------------------------------------------------------------------------

/** How the NPC perceives events. */
export type PerceptionMode =
  | 'accurate'     // perceives events as they happen
  | 'filtered'     // misses certain categories of events
  | 'augmented';   // perceives events that didn't happen (hallucinations)

/** How the NPC forms and updates beliefs from evidence. */
export type BeliefFormation =
  | 'flexible'     // updates beliefs when presented with evidence
  | 'rigid'        // slow to update, requires strong evidence
  | 'resistant';   // reinterprets counter-evidence to fit existing beliefs

/** How coherently the NPC maintains topic focus. */
export type Coherence =
  | 'focused'      // stays on topic, responds to what was asked
  | 'drifting'     // occasionally wanders to adjacent topics
  | 'fragmented';  // jumps between unrelated topics, mixes timeframes

/** How stable the NPC's cognitive profile is over time. */
export type Lucidity =
  | 'stable'       // cognitive profile is constant
  | 'fluctuating'  // shifts gradually based on conditions
  | 'episodic';    // discrete windows of clarity and confusion

/** How intact the NPC's sense of identity is. */
export type SelfModel =
  | 'intact'       // consistent sense of identity
  | 'uncertain'    // questions own memories and perceptions
  | 'fractured';   // may not recognize self or maintain continuity

/** The five-dimensional cognitive profile. */
export interface CognitiveProfile {
  perception: PerceptionMode;
  beliefFormation: BeliefFormation;
  coherence: Coherence;
  lucidity: Lucidity;
  selfModel: SelfModel;
}

/**
 * The five cognitive dimensions and their closed value sets, keyed by the
 * Chord (kebab-case) dimension spelling (ADR-310 D4). Data mirror of the
 * dimension types above, for vocabulary export and iteration; the TS-side
 * camelCase field names live on CognitiveProfile.
 */
export const COGNITIVE_DIMENSIONS: Readonly<Record<string, readonly string[]>> = {
  'perception': ['accurate', 'filtered', 'augmented'],
  'belief-formation': ['flexible', 'rigid', 'resistant'],
  'coherence': ['focused', 'drifting', 'fragmented'],
  'lucidity': ['stable', 'fluctuating', 'episodic'],
  'self-model': ['intact', 'uncertain', 'fractured'],
};

/** Default stable cognitive profile. */
export const STABLE_COGNITIVE_PROFILE: Readonly<CognitiveProfile> = {
  perception: 'accurate',
  beliefFormation: 'flexible',
  coherence: 'focused',
  lucidity: 'stable',
  selfModel: 'intact',
};

// ---------------------------------------------------------------------------
// Knowledge & Beliefs
// ---------------------------------------------------------------------------

/** How the NPC acquired a piece of knowledge. */
export type FactSource = 'witnessed' | 'told' | 'inferred' | 'assumed' | 'hallucinated';

/** All fact sources, for vocabulary export and iteration (ADR-310 D3). */
export const FACT_SOURCES: readonly FactSource[] = [
  'witnessed', 'told', 'inferred', 'assumed', 'hallucinated',
];

/** How confident the NPC is in a piece of knowledge. */
export type ConfidenceWord = 'uncertain' | 'suspects' | 'believes' | 'certain';

/** All confidence words, in ascending order (ADR-310 D14). */
export const CONFIDENCE_WORDS: readonly ConfidenceWord[] = [
  'uncertain', 'suspects', 'believes', 'certain',
];

/** Maps confidence words to internal 0-1 values. */
export const CONFIDENCE_VALUES: Record<ConfidenceWord, number> = {
  'uncertain': 0.2,
  'suspects':  0.4,
  'believes':  0.7,
  'certain':   0.95,
};

/** How resistant a held topic or belief is to counter-evidence. */
export type ResistanceMode = 'none' | 'reinterprets' | 'ignores';

/** All resistance modes, for vocabulary export and iteration. */
export const RESISTANCE_MODES: readonly ResistanceMode[] = ['none', 'reinterprets', 'ignores'];

/**
 * A single valueless fact in the NPC's knowledge base (`knows`).
 * `resistance` is the fold of the retired standalone belief map
 * (ADR-310 D14 — one belief construct, not two).
 */
export interface Fact {
  source: FactSource;
  confidence: ConfidenceWord;
  turnLearned: number;
  resistance?: ResistanceMode;
  /**
   * The topic was received in confidence (ADR-318 D4 — the `confided`
   * marker in the knows line's comma slot). Revealing a confided topic
   * is the `betray a confidence` act category.
   */
  confided?: boolean;
}

/**
 * A valued belief (`thinks`, ADR-310 D14): what the holder thinks a declared
 * fact's value is. Addressing is (holder, subject, facet) → value; the holder
 * is the trait's owner and (subject, facet) is the factId introduced by
 * `define fact`. `value` must be in the fact declaration's closed value set —
 * checked at compile time by chord and at load time by story-loader.
 */
export interface ValuedBelief {
  value: string;
  confidence: ConfidenceWord;
  source: FactSource;
  turnLearned: number;
  resistance: ResistanceMode;
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

/** A goal with author-assigned priority. Higher priority = more important. */
export interface Goal {
  id: string;
  priority: number;
}

/**
 * Mutable runtime state of a goal's pursuit (ADR-310 D17 — relocated onto
 * the trait from the retired GoalManager service state, so a restored NPC
 * resumes mid-sequence).
 */
export interface GoalRuntimeState {
  /** Whether the goal is in the active queue (activation is edge-triggered, so this persists). */
  active: boolean;
  /** Current step index in the goal's ordered sequence. */
  currentStep: number;
  /** Preempted by a higher-priority goal. */
  paused: boolean;
  /** Interrupt conditions met. */
  interrupted: boolean;
  /** Prepared-mode: preparatory steps complete, now opportunistic. */
  prepared?: boolean;
  /**
   * Last sampled truth of the goal's activation condition (seam-1 ruling
   * 2026-08-16). Activation requires a rising edge — condition true now,
   * not true at the previous sample — so a completed goal whose condition
   * held throughout does not re-run; it re-runs only after the condition
   * goes false and comes back. Absent = never sampled (a true first
   * sample is an edge, preserving first-turn activation).
   */
  conditionHeld?: boolean;
}

// ---------------------------------------------------------------------------
// Influence in force (ADR-146, relocated per ADR-310 D17)
// ---------------------------------------------------------------------------

/**
 * An influence effect currently in force. Serializable relocation of the
 * retired InfluenceTracker's per-effect record; @sharpee/character's
 * evaluators read and write this shape directly (no parallel type —
 * ADR-310 D11a). Home rule: the record lives on the TARGET's trait when the
 * target carries a character model (target id implicit — `target` absent);
 * when the target has no trait (the player), it lives on the EXERTER's
 * trait with `target` set explicitly.
 */
export interface InfluenceInForce {
  /** The author-invented influence name (joins exerter and resister). */
  influenceName: string;
  /** The exerting entity's id. */
  influencerId: string;
  /** Explicit target id — present only when the record rides the exerter's trait. */
  target?: string;
  /** Vocabulary-word state mutations in effect (mood, threat, focus, ...). */
  effect: Record<string, string>;
  /**
   * Whether the target resists this exertion. Absent means 'applied'
   * (pre-status records deserialize as applied). Resisted records exist so
   * the applied↔resisted flip is a detectable transition; they never
   * contribute to effective state.
   */
  status?: 'applied' | 'resisted';
  /** Duration mode. */
  duration: 'while present' | 'momentary' | 'lingering';
  /** Turn the effect was applied. */
  appliedAtTurn: number;
  /** For lingering: turn when the effect expires. */
  expiresAtTurn?: number;
  /** For lingering: predicate condition that clears the effect. */
  clearCondition?: string;
}

// ---------------------------------------------------------------------------
// Normative layer (ADR-318)
// ---------------------------------------------------------------------------

/** The five arbiter forces, closed — each has a runtime feed (ADR-318 D1). */
export type Force = 'fear' | 'desire' | 'duty' | 'honor' | 'love';

/** All forces, for runtime validation and iteration. */
export const FORCES: readonly Force[] = ['fear', 'desire', 'duty', 'honor', 'love'];

/**
 * Act categories the runtime can detect (ADR-318 D4). A category the
 * runtime cannot detect cannot be a word. Scope is marked on data
 * (PrincipleDecl.scope), never on the act.
 */
export type ActCategory =
  | 'betray a confidence'  // reveal a topic marked `confided`
  | 'lie'                  // assert contrary to own held belief (needs D14 values)
  | 'harm'                 // scoped
  | 'steal'
  | 'break a promise'      // defined by the lie ledger (ADR-318 D9)
  | 'abandon'              // scoped — depart while a protected entity is in danger
  | 'trespass';            // enter where not permitted

/** All act categories, for runtime validation and iteration. */
export const ACT_CATEGORIES: readonly ActCategory[] = [
  'betray a confidence', 'lie', 'harm', 'steal', 'break a promise',
  'abandon', 'trespass',
];

/** Obligation words — compile to standing goals with a duty feed (ADR-318 D5). */
export type ObligationWord = 'protects' | 'answers honestly';

/** All obligation words, for runtime validation and iteration. */
export const OBLIGATION_WORDS: readonly ObligationWord[] = ['protects', 'answers honestly'];

/** Face-acts — the closed honor vocabulary, frozen at six (ADR-318 D7). */
export type FaceAct =
  | 'backs down' | 'shows fear' | 'admits fault'
  | 'pleads' | 'accepts insult' | 'caught lying';

/** All face-acts, for runtime validation and iteration. */
export const FACE_ACTS: readonly FaceAct[] = [
  'backs down', 'shows fear', 'admits fault', 'pleads', 'accepts insult',
  'caught lying',
];

/** Conscience pressure bands — baseline, visible strain, discharge (ADR-318 D8). */
export type PressureBand = 'clear' | 'burdened' | 'breaking';

/** All pressure bands, in monotonic order (ADR-318 D11: ordering is the contract). */
export const PRESSURE_BANDS: readonly PressureBand[] = ['clear', 'burdened', 'breaking'];

/** Conscience pressure: runtime-owned curve value plus its derived band (both persist). */
export interface PressureState {
  value: number;
  band: PressureBand;
}

/**
 * A named temperament definition (ADR-318 D3): force-pair orderings.
 * Authored data, re-registered at load — pairs mean "first over second".
 */
export interface TemperamentDef {
  name: string;
  pairs: Array<[Force, Force]>;
}

/**
 * A temperament binding on a character (ADR-318 D3). Static (`while`
 * absent) or bound to an entity state. Never directly mutated — the state
 * ratchet is the only lever. At most one binding live per state
 * (compile-checked).
 */
export interface TemperamentBinding {
  name: string;
  while?: string;
}

/** A principle line: `never <category> [scope] [except <predicate>]` (ADR-318 D4). */
export interface PrincipleDecl {
  category: ActCategory;
  scope?: string;
  except?: string;
}

/** An obligation line: `protects <scope>` / `answers honestly` (ADR-318 D5). */
export interface ObligationDecl {
  kind: ObligationWord;
  scope?: string;
}

/** Honor declaration: audience scope plus the face-acts it binds on (ADR-318 D7). */
export interface HonorDecl {
  scope: string;
  /** `except <entities>` audience carve-out — entity ids (D9/D10 scope grammar). */
  except?: string[];
  faceActs: FaceAct[];
}

/**
 * A lie-ledger entry (ADR-318 D9): the holder's own utterance to an
 * audience, never a model of what the listener concluded. A promise is an
 * entry whose subject is the holder's own future act; violation is detected
 * by act detection, not scheduling.
 */
export interface LedgerEntry {
  kind: 'claim' | 'promise';
  audience: string;
  factId: string;
  claimedValue: string;
  turnMinted: number;
  /** While true, the dialogue selector holds this claim consistent to the audience. */
  pinned: boolean;
}

// ---------------------------------------------------------------------------
// Lucidity Windows
// ---------------------------------------------------------------------------

/** Timing for a lucidity transition. */
export type TransitionTiming = 'immediate' | 'next turn';

/** Rate at which lucidity decays back to baseline. */
export type DecayRate = 'slow' | 'moderate' | 'fast';

/** A single lucidity trigger rule. */
export interface LucidityTrigger {
  target: string;
  transition: TransitionTiming;
}

/** Full lucidity window configuration. */
export interface LucidityConfig {
  baseline: string;
  triggers: Record<string, LucidityTrigger>;
  decay: 'gradual' | 'sudden';
  decayRate: DecayRate;
}

// ---------------------------------------------------------------------------
// Perception Filters
// ---------------------------------------------------------------------------

/** Configuration for filtered/augmented perception. */
export interface PerceptionFilterConfig {
  misses: string[];
  amplifies: string[];
}

/** A hallucinated perceived event definition. */
export interface PerceivedEvent {
  when: string;
  as: FactSource;
  content: string;
}
