// packages/world-model/src/traits/actor/index.ts

export {
  ActorTrait,
  type IActorTrait,
  type PronounSet,
  type GrammaticalGender,
  PRONOUNS,
  HONORIFICS,
} from './actorTrait.js';
export { ActorBehavior, type ITakeItemResult, type IDropItemResult } from './actorBehavior.js';
export {
  PLAYER_ROLE_ALIASES,
  addPlayerRoleVocabulary,
  movePlayerRoleVocabulary,
} from './playerRole.js';
