/**
 * @sharpee/world-index
 *
 * Static derivation of a Chord story's **map**, **reachability**, and **vocabulary
 * gaps** from its compiled Story IR — the three questions the IDE's World tab asks
 * (ADR-321 D1). No engine run, no world walk: one pass over the IR the build already
 * produced.
 *
 * The IR types come from `@sharpee/chord` by direct import, so an IR schema change
 * fails this package's build in the same commit (ADR-321 D2, DEVARCH 8b). The
 * loader-semantics module is the correctness surface everything else rests on: the
 * IR records what an author wrote, not what the loader wires, and reading a row
 * literally yields confident wrong answers about the author's own story (D3).
 *
 * @packageDocumentation
 * @see ADR-321: The World Index — Map, Reach, Incomplete
 */

export {
  initialStateOf,
  isInitialState,
  undirectedExits,
  doorStartsLocked,
  platformTraitForState,
  isPlatformStateWord,
  isStartableStateWord,
  platformStateWordsFor,
} from './loader-semantics.js';

export {
  readStoryIR,
  StoryIRReadError,
  isRoom,
  isRegion,
  isDoor,
  roomsOf,
  thingsOf,
  startRoomOf,
} from './story.js';
