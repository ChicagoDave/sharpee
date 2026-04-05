/**
 * Character model vocabulary types (ADR-141)
 *
 * String literal union types for all word-based authoring inputs.
 * Authors interact with these words; internal numeric values are
 * implementation details managed by CharacterModelTrait.
 *
 * Public interface: All exported types and maps.
 * Owner context: world-model / character-model trait
 */

// ---------------------------------------------------------------------------
// Personality
// ---------------------------------------------------------------------------

/** Core personality traits — fixed at character creation. */
export type PersonalityTrait =
  | 'honest' | 'loyal' | 'cowardly' | 'paranoid'
  | 'cruel' | 'cunning' | 'curious' | 'stubborn'
  | 'generous' | 'vain' | 'devout' | 'impulsive';

/** Intensity modifiers for personality traits. */
export type Intensity = 'slightly' | 'somewhat' | 'very' | 'extremely';

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

/** How confident the NPC is in a piece of knowledge. */
export type ConfidenceWord = 'uncertain' | 'suspects' | 'believes' | 'certain';

/** Maps confidence words to internal 0-1 values. */
export const CONFIDENCE_VALUES: Record<ConfidenceWord, number> = {
  'uncertain': 0.2,
  'suspects':  0.4,
  'believes':  0.7,
  'certain':   0.95,
};

/** A single fact in the NPC's knowledge base. */
export interface Fact {
  source: FactSource;
  confidence: ConfidenceWord;
  turnLearned: number;
}

/** How resistant a belief is to counter-evidence. */
export type ResistanceMode = 'none' | 'reinterprets' | 'ignores';

/** A belief held by the NPC, which may differ from facts. */
export interface Belief {
  strength: ConfidenceWord;
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
