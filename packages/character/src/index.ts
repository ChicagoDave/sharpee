/**
 * @sharpee/character — Character model builder (ADR-141)
 *
 * Fluent builder API for defining NPC characters with rich internal state.
 * Authors describe characters in words; the builder compiles to trait data
 * consumed by CharacterModelTrait in @sharpee/world-model.
 *
 * Public interface: CharacterBuilder, TriggerBuilder, CompiledCharacter,
 *   COGNITIVE_PRESETS, VocabularyExtension, applyCharacter.
 * Owner context: @sharpee/character package
 */

export {
  CharacterBuilder,
  TriggerBuilder,
  type CompiledCharacter,
  type CompiledTrigger,
  type TriggerMutation,
} from './character-builder';

export {
  COGNITIVE_PRESETS,
  isCognitivePreset,
  type CognitivePresetName,
} from './cognitive-presets';

export {
  VocabularyExtension,
  type CustomMoodDef,
  type CustomPersonalityDef,
} from './vocabulary-extension';

export { applyCharacter } from './apply';
