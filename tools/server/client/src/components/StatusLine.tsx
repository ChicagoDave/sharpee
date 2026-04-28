/**
 * StatusLine — first renderer that consumes the world mirror (ADR-162 AC-6).
 *
 * Public interface: {@link StatusLine} default export.
 *
 * Bounded context: client room view (ADR-153 frontend). Mounted inside
 * `RoomView`'s `WorldProvider` scope so that `useWorld()` returns the
 * room's read-only mirror. Renders one banner-line summary of game
 * state — location / score / turns — directly off the mirror, with no
 * per-frame derivation in the reducer.
 *
 * Layout matches `@sharpee/platform-browser` and `@sharpee/zifmia`:
 *   `<Location>                                       Score: N | Turns: M`
 * Two flex columns, `justify-content: space-between`. The max-score
 * fraction is intentionally not surfaced here — players see max via the
 * in-game `score` command (ADR-129 ScoreLedger reports `getMaxScore()`).
 *
 * Sources:
 *   - score: `world.getScore()` — ADR-129 ScoreLedger total.
 *   - turns: scoring capability `moves` field. The sandbox (deno-entry)
 *     mirrors its per-COMMAND counter into this field before each
 *     world snapshot, so the mirror surfaces a fresh value per turn.
 *   - location: `world.getContainingRoom(player.id).name`.
 *
 * Behavior contract (CLAUDE.md rule 11):
 *   - Mirror unhydrated (`null`) → placeholder "…", layout slot preserved.
 *   - Mirror hydrated but a sub-lookup misses (no player, no scoring
 *     capability, no containing room) → degrade only that segment to
 *     `—`. The renderer never throws.
 *   - Re-renders on every fresh mirror identity (replace-not-patch from
 *     ADR-162); no internal caching.
 */

import { StandardCapabilities } from '@sharpee/world-model';
import { useWorld } from '../hooks/useWorld';

/** The dash glyph used for any segment whose source data is unavailable. */
const MISSING = '—';

/**
 * Minimal read-shape of the stdlib `scoring` capability that StatusLine
 * consumes for the turns segment. Score (and max) come from the
 * ScoreLedger directly.
 */
interface ScoringMovesRead {
  moves?: number;
}

export default function StatusLine(): JSX.Element {
  const world = useWorld();

  if (!world) {
    return (
      <div
        role="status"
        aria-label="Game status"
        aria-live="polite"
        style={statusLineStyle}
      >
        …
      </div>
    );
  }

  const player = world.getPlayer();

  // Score: ADR-129 ScoreLedger total. `getScore()` returns 0 when no
  // points have been awarded — a real value, not "missing".
  const score = String(world.getScore());

  // Turns: scoring capability's `moves` field, mirrored from the
  // sandbox's per-COMMAND counter. Cast at the boundary —
  // `getCapability` returns raw `ICapabilityData`.
  const scoring = world.getCapability(StandardCapabilities.SCORING) as
    | ScoringMovesRead
    | undefined;
  const turns =
    scoring && typeof scoring.moves === 'number' ? String(scoring.moves) : MISSING;

  let location = MISSING;
  if (player) {
    const room = world.getContainingRoom(player.id);
    if (room) location = room.name;
  }

  return (
    <div
      role="status"
      aria-label="Game status"
      aria-live="polite"
      style={statusLineStyle}
    >
      <span style={locationStyle}>{location}</span>
      <span style={rightGroupStyle}>
        <span>Score: {score}</span>
        <span aria-hidden="true">|</span>
        <span>Turns: {turns}</span>
      </span>
    </div>
  );
}

const statusLineStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--sharpee-spacing-md)',
  padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-lg)',
  borderBottom: '1px solid var(--sharpee-border)',
  background: 'var(--sharpee-bg-secondary)',
  color: 'var(--sharpee-text-muted)',
  fontFamily: 'var(--sharpee-font-ui)',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
} as const;

const locationStyle = {
  textTransform: 'uppercase',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;

const rightGroupStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--sharpee-spacing-sm)',
  flexShrink: 0,
} as const;
