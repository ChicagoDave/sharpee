/**
 * Anti-corruption layer for conversation responses (ADR-142)
 *
 * Translates between the character model domain (ResponseCandidate,
 * CharacterModelTrait) and the language layer domain (ResponseIntent,
 * message IDs, mood variants). Neither side couples to the other's
 * internal structure.
 *
 * Public interface: buildResponseIntent, selectMoodVariant,
 *   applyCognitiveColoring.
 * Owner context: @sharpee/character / conversation
 */

import { CharacterModelTrait, Mood, CognitiveProfile } from '@sharpee/world-model';
import { ResponseCandidate, ResponseIntent } from './response-types';

// ---------------------------------------------------------------------------
// Response intent construction
// ---------------------------------------------------------------------------

/**
 * Build a ResponseIntent from a selected candidate and the NPC's
 * current character state. This is the primary ACL function — it
 * bridges the constraint evaluation result to the language layer.
 *
 * @param candidate - The selected response candidate
 * @param topic - The resolved topic name
 * @param npcTrait - The NPC's CharacterModelTrait
 * @param context - Optional active conversation context label
 * @returns A fully populated ResponseIntent
 */
export function buildResponseIntent(
  candidate: ResponseCandidate,
  topic: string,
  npcTrait: CharacterModelTrait,
  context?: string,
): ResponseIntent {
  const mood = npcTrait.getMood();
  const coherence = npcTrait.cognitiveProfile.coherence;

  // Resolve params if present
  let resolvedParams: Record<string, unknown> | undefined;
  if (candidate.params) {
    resolvedParams = {};
    for (const [key, resolver] of Object.entries(candidate.params)) {
      resolvedParams[key] = resolver();
    }
  }

  // Build the base intent
  const intent: ResponseIntent = {
    action: candidate.action,
    topic,
    messageId: selectMoodVariant(candidate.messageId, mood),
    mood,
    coherence,
    context,
    params: resolvedParams,
  };

  // Apply cognitive coloring
  return applyCognitiveColoring(intent, npcTrait.cognitiveProfile);
}

// ---------------------------------------------------------------------------
// Mood variant selection
// ---------------------------------------------------------------------------

/**
 * Select a mood-specific message variant if one exists.
 * Appends a mood suffix to the base message ID.
 *
 * The language layer registers variants like:
 *   'murder-truth-full' (base)
 *   'murder-truth-full.nervous' (mood variant)
 *   'murder-truth-full.panicked' (mood variant)
 *
 * This function produces the variant key. The language layer
 * falls back to the base if the variant isn't registered.
 *
 * @param baseMessageId - The author-assigned message ID
 * @param mood - The NPC's current mood
 * @returns The mood-suffixed message ID
 */
export function selectMoodVariant(baseMessageId: string, mood: Mood): string {
  // Calm is the default tone — no suffix needed
  if (mood === 'calm') return baseMessageId;

  return `${baseMessageId}.${mood}`;
}

// ---------------------------------------------------------------------------
// Cognitive coloring
// ---------------------------------------------------------------------------

/**
 * Apply cognitive coloring to a response intent based on the NPC's
 * cognitive profile. This modifies the intent to signal to the
 * language layer how to render the text:
 *
 * - fragmented coherence → broken sentence patterns
 * - drifting coherence → mid-sentence topic shifts
 * - fractured selfModel → detached, third-person references
 * - augmented perception → hallucinatory insertions
 *
 * The language layer uses the coherence field and additional markers
 * on the intent to select the appropriate speech pattern.
 *
 * @param intent - The response intent to color
 * @param profile - The NPC's cognitive profile
 * @returns The colored response intent (may be the same object)
 */
export function applyCognitiveColoring(
  intent: ResponseIntent,
  profile: CognitiveProfile,
): ResponseIntent {
  // Coherence is already on the intent from buildResponseIntent.
  // Additional cognitive effects are signaled through message ID suffixes
  // that the language layer can check for.

  // Fractured self-model: append marker so language layer can apply
  // third-person detached speech patterns
  if (profile.selfModel === 'fractured') {
    intent.messageId = `${intent.messageId}#detached`;
  }

  // Augmented perception: append marker so language layer can insert
  // hallucinatory details
  if (profile.perception === 'augmented') {
    intent.messageId = `${intent.messageId}#hallucinating`;
  }

  return intent;
}
