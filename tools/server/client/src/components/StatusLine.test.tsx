/**
 * StatusLine behaviour tests (ADR-162 AC-6, ScoreLedger fix, layout match).
 *
 * Behavior Statement — StatusLine
 *   DOES: renders a two-column status bar — location left, `Score: N |
 *         Turns: M` right — matching the layout in
 *         `@sharpee/platform-browser` and `@sharpee/zifmia`. Score from
 *         the ADR-129 ScoreLedger (`world.getScore()`); turns from the
 *         scoring capability's `moves` field (the sandbox mirrors its
 *         per-COMMAND counter into this field before each snapshot).
 *         Location from the player's containing room.
 *   WHEN: rendered as a child of `<WorldProvider>` inside the room layout.
 *   BECAUSE: AC-6 — proves the world mirror works end-to-end with a real
 *            renderer; the layout matches what single-player surfaces
 *            ship so multi-user players see a familiar status bar.
 *   REJECTS WHEN: mirror is `null` → renders the placeholder "…";
 *                 `getPlayer()` is undefined → location segment is "—";
 *                 `getCapability('scoring')` is undefined → turns is "—";
 *                 `getContainingRoom(player.id)` is undefined → location
 *                 segment is "—". Each segment degrades independently;
 *                 the renderer never throws.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomTrait, StandardCapabilities, WorldModel } from '@sharpee/world-model';
import StatusLine from './StatusLine';
import { WorldProvider } from '../hooks/useWorld';

interface FixtureOpts {
  /** Place the player in a room. Default true. */
  withRoom?: boolean;
  /** Set the player on the world. Default true. */
  withPlayer?: boolean;
  /** Award this many points to the ScoreLedger via a single entry. */
  score?: number;
  /** Update the scoring capability's `moves` field. Default `0`. */
  moves?: number;
  /** Skip registering the scoring capability entirely. Default false. */
  withoutScoringCapability?: boolean;
  /** Override the room's name. */
  roomName?: string;
}

function buildMirror(opts: FixtureOpts = {}): WorldModel {
  const {
    withRoom = true,
    withPlayer = true,
    score = 0,
    moves = 0,
    withoutScoringCapability = false,
    roomName = 'Test Room',
  } = opts;

  const world = new WorldModel();

  let playerId: string | undefined;
  if (withPlayer) {
    const player = world.createEntity('Player', 'actor');
    playerId = player.id;
    world.setPlayer(playerId);
  }

  if (withRoom && playerId) {
    const room = world.createEntity(roomName, 'room');
    // getContainingRoom() walks up the location chain looking for an
    // entity with RoomTrait — the entity-type alone isn't enough.
    room.add(new RoomTrait());
    world.moveEntity(playerId, room.id);
  }

  // ScoreLedger: a single award equal to `score`.
  if (score > 0) {
    world.awardScore('test-award', score, 'test fixture');
  }

  // Scoring capability — only the `moves` field is consumed by StatusLine.
  if (!withoutScoringCapability) {
    world.registerCapability(StandardCapabilities.SCORING, {
      schema: {
        moves: { type: 'number', default: 0 },
      },
      initialData: { moves: 0 },
    });
    world.updateCapability(StandardCapabilities.SCORING, { moves });
  }

  return world;
}

describe('<StatusLine>', () => {
  it('renders the placeholder when the mirror is null (unhydrated)', () => {
    render(
      <WorldProvider world={null}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toBe('…');
  });

  it('renders location, score, and turns from a hydrated mirror', () => {
    const world = buildMirror({
      score: 12,
      moves: 4,
      roomName: 'West of House',
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('West of House');
    expect(status.textContent).toContain('Score: 12');
    expect(status.textContent).toContain('Turns: 4');
    // Negative: no `/max` fraction in the rendered output.
    expect(status.textContent).not.toMatch(/Score:\s*\d+\s*\//);
  });

  it('degrades the location segment to — when the mirror has no player', () => {
    const world = buildMirror({
      withPlayer: false,
      withRoom: false,
      score: 7,
      moves: 2,
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('—');
    expect(status.textContent).toContain('Score: 7');
    expect(status.textContent).toContain('Turns: 2');
  });

  it('renders score 0 from an empty ledger (the ledger never returns "missing")', () => {
    // No award → score is 0 (a real value, not "—"). The right column is
    // `Score: 0 | Turns: 0`, with no `/max` segment.
    const world = buildMirror({
      score: 0,
      moves: 0,
      roomName: 'Foyer',
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Foyer');
    expect(status.textContent).toContain('Score: 0');
    expect(status.textContent).toContain('Turns: 0');
    expect(status.textContent).not.toMatch(/Score:\s*0\s*\//);
  });

  it('degrades only the turns segment to — when the scoring capability is absent', () => {
    // Score still reads from the ledger, so it does NOT degrade — only
    // turns (which is on the capability) goes to "—".
    const world = buildMirror({
      score: 3,
      withoutScoringCapability: true,
      roomName: 'Kitchen',
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Kitchen');
    expect(status.textContent).toContain('Score: 3');
    expect(status.textContent).toContain('Turns: —');
  });

  it('degrades the location segment to — when the player has no containing room', () => {
    // Player exists but is not placed in a room.
    const world = buildMirror({
      withRoom: false,
      score: 1,
      moves: 1,
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('—');
    expect(status.textContent).toContain('Score: 1');
    expect(status.textContent).toContain('Turns: 1');
  });

  it('re-renders when a fresh mirror replaces the prior (replace-not-patch)', () => {
    const before = buildMirror({
      score: 5,
      moves: 1,
      roomName: 'Living Room',
    });
    const { rerender } = render(
      <WorldProvider world={before}>
        <StatusLine />
      </WorldProvider>,
    );
    const initial = screen.getByRole('status', { name: /game status/i }).textContent;
    expect(initial).toContain('Living Room');
    expect(initial).toContain('Score: 5');
    expect(initial).toContain('Turns: 1');

    // Simulate a new turn: a brand-new mirror with different state replaces
    // the prior. ADR-162 Decision 1 — replace, never patch.
    const after = buildMirror({
      score: 25,
      moves: 7,
      roomName: 'Cellar',
    });
    rerender(
      <WorldProvider world={after}>
        <StatusLine />
      </WorldProvider>,
    );

    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Cellar');
    expect(status.textContent).toContain('Score: 25');
    expect(status.textContent).toContain('Turns: 7');
  });

  it('reflects an across-turn moves bump in the rendered text', () => {
    // Mirrors the sandbox's per-COMMAND increment behavior — each new
    // mirror has a fresh `moves` value that StatusLine surfaces.
    const before = buildMirror({
      score: 10,
      moves: 3,
    });
    const { rerender } = render(
      <WorldProvider world={before}>
        <StatusLine />
      </WorldProvider>,
    );
    expect(
      screen.getByRole('status', { name: /game status/i }).textContent,
    ).toContain('Turns: 3');

    const after = buildMirror({
      score: 10,
      moves: 4,
    });
    rerender(
      <WorldProvider world={after}>
        <StatusLine />
      </WorldProvider>,
    );

    expect(
      screen.getByRole('status', { name: /game status/i }).textContent,
    ).toContain('Turns: 4');
  });
});
