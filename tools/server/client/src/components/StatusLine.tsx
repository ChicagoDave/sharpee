/**
 * StatusLine — first renderer that consumes the world mirror (ADR-162 AC-6).
 *
 * Public interface: {@link StatusLine} default export.
 *
 * Bounded context: client room view (ADR-153 frontend). Mounted inside
 * `RoomView`'s `WorldProvider` scope so that `useWorld()` returns the
 * room's read-only mirror. Renders one banner-line summary of game
 * state — score / max score / turns / containing room — directly off
 * the mirror, with no per-frame derivation in the reducer.
 *
 * Behavior contract (from session Behavior Statement, CLAUDE.md rule 11):
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
 * consumes. Mirrors the subset of `ScoringData` the renderer needs without
 * pulling `@sharpee/stdlib` into the client bundle.
 */
interface ScoringRead {
  scoreValue?: number;
  maxScore?: number;
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

  // Cast at the boundary: getCapability returns the raw ICapabilityData
  // store. ScoringData is the typed view stdlib defines for the 'scoring'
  // schema. Mirror reads can't enforce the schema at runtime; the cast
  // documents the shape we expect from any story that registered scoring.
  const scoring = world.getCapability(StandardCapabilities.SCORING) as
    | ScoringRead
    | undefined;

  const score =
    scoring && typeof scoring.scoreValue === 'number'
      ? String(scoring.scoreValue)
      : MISSING;
  const maxScore =
    scoring && typeof scoring.maxScore === 'number'
      ? String(scoring.maxScore)
      : MISSING;
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
      <span>
        Score: {score}/{maxScore}
      </span>
      <span aria-hidden="true">|</span>
      <span>Turns: {turns}</span>
      <span aria-hidden="true">|</span>
      <span>Location: {location}</span>
    </div>
  );
}

const statusLineStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--sharpee-spacing-sm)',
  padding: 'var(--sharpee-spacing-xs) var(--sharpee-spacing-lg)',
  borderBottom: '1px solid var(--sharpee-border)',
  background: 'var(--sharpee-bg-secondary)',
  color: 'var(--sharpee-text-muted)',
  fontFamily: 'var(--sharpee-font-ui)',
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
} as const;
