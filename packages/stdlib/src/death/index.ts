/**
 * @sharpee/stdlib/death — the player-death primitive (ADR-224).
 *
 * Owner context: stdlib. The single canonical death event and the `killPlayer`
 * helper every death mechanism lowers to. The engine imports `PLAYER_DIED_EVENT`
 * for its game-over routing; the stdlib `death` channel imports it too — one wire
 * shape, no drift (DEVARCH rule 8b).
 *
 * Public interface:
 * - `killPlayer` — apply the lethal transition + produce the canonical event.
 * - `PLAYER_DIED_EVENT`, `IPlayerDiedPayload` — the canonical event type and payload.
 * - `IKillPlayerOptions` — `killPlayer`'s options.
 */

export { killPlayer, type IKillPlayerOptions } from './kill-player.js';
export { PLAYER_DIED_EVENT, type IPlayerDiedPayload } from './player-death-events.js';
export { rollLethal } from './probabilistic-death.js';
export {
  createDeadlyRoomTransformer,
  DEADLY_ROOM_DEATH_ACTION_ID,
  DEADLY_ROOM_CAUSE_KEY,
  DEADLY_ROOM_MESSAGE_KEY,
} from './deadly-room-transformer.js';
