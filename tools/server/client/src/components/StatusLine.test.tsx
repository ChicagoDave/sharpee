/**
 * StatusLine behaviour tests (ADR-162 AC-6).
 *
 * Behavior Statement — StatusLine
 *   DOES: derives one banner-line summary from the room's read-only world
 *         mirror — score / max score / turn count from the `scoring`
 *         capability, location from the player's containing room.
 *   WHEN: rendered as a child of `<WorldProvider>` inside the room layout.
 *   BECAUSE: AC-6 — the status line is the canonical proof that the
 *            mirror works end-to-end with a real renderer feature.
 *   REJECTS WHEN: mirror is `null` → renders the placeholder "…";
 *                 `getPlayer()` is undefined → location segment is "—";
 *                 `getCapability('scoring')` is undefined → score, max
 *                 score, and turns are each "—";
 *                 `getContainingRoom(player.id)` is undefined → location
 *                 segment is "—". Each segment degrades independently;
 *                 the renderer never throws.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RoomTrait, StandardCapabilities, WorldModel } from '@sharpee/world-model';
import StatusLine from './StatusLine';
import { WorldProvider } from '../hooks/useWorld';

interface ScoringSeed {
  scoreValue?: number;
  maxScore?: number;
  moves?: number;
}

interface FixtureOpts {
  /** Place the player in a room. Default true. */
  withRoom?: boolean;
  /** Set the player on the world. Default true. */
  withPlayer?: boolean;
  /** Register and update the scoring capability. Default true. */
  scoring?: ScoringSeed | false;
  /** Override the room's name. */
  roomName?: string;
}

function buildMirror(opts: FixtureOpts = {}): WorldModel {
  const {
    withRoom = true,
    withPlayer = true,
    scoring = { scoreValue: 0, maxScore: 0, moves: 0 },
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

  if (scoring !== false) {
    world.registerCapability(StandardCapabilities.SCORING, {
      schema: {
        scoreValue: { type: 'number', default: 0 },
        maxScore: { type: 'number', default: 0 },
        moves: { type: 'number', default: 0 },
      },
      initialData: { scoreValue: 0, maxScore: 0, moves: 0 },
    });
    world.updateCapability(StandardCapabilities.SCORING, scoring);
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

  it('renders score, turns, and location from a hydrated mirror', () => {
    const world = buildMirror({
      scoring: { scoreValue: 12, maxScore: 100, moves: 4 },
      roomName: 'West of House',
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Score: 12/100');
    expect(status.textContent).toContain('Turns: 4');
    expect(status.textContent).toContain('Location: West of House');
  });

  it('degrades the location segment to — when the mirror has no player', () => {
    const world = buildMirror({
      withPlayer: false,
      withRoom: false,
      scoring: { scoreValue: 7, maxScore: 50, moves: 2 },
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Score: 7/50');
    expect(status.textContent).toContain('Turns: 2');
    expect(status.textContent).toContain('Location: —');
  });

  it('degrades score / turns to — when the scoring capability is absent', () => {
    const world = buildMirror({
      scoring: false,
      roomName: 'Kitchen',
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Score: —/—');
    expect(status.textContent).toContain('Turns: —');
    expect(status.textContent).toContain('Location: Kitchen');
  });

  it('degrades the location segment to — when the player has no containing room', () => {
    // Player exists but is not placed in a room.
    const world = buildMirror({
      withRoom: false,
      scoring: { scoreValue: 1, maxScore: 5, moves: 1 },
    });
    render(
      <WorldProvider world={world}>
        <StatusLine />
      </WorldProvider>,
    );
    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Score: 1/5');
    expect(status.textContent).toContain('Turns: 1');
    expect(status.textContent).toContain('Location: —');
  });

  it('re-renders when a fresh mirror replaces the prior (replace-not-patch)', () => {
    const before = buildMirror({
      scoring: { scoreValue: 5, maxScore: 100, moves: 1 },
      roomName: 'Living Room',
    });
    const { rerender } = render(
      <WorldProvider world={before}>
        <StatusLine />
      </WorldProvider>,
    );
    expect(
      screen.getByRole('status', { name: /game status/i }).textContent,
    ).toContain('Score: 5/100');

    // Simulate a new turn: a brand-new mirror with different state replaces
    // the prior. ADR-162 Decision 1 — replace, never patch.
    const after = buildMirror({
      scoring: { scoreValue: 25, maxScore: 100, moves: 7 },
      roomName: 'Cellar',
    });
    rerender(
      <WorldProvider world={after}>
        <StatusLine />
      </WorldProvider>,
    );

    const status = screen.getByRole('status', { name: /game status/i });
    expect(status.textContent).toContain('Score: 25/100');
    expect(status.textContent).toContain('Turns: 7');
    expect(status.textContent).toContain('Location: Cellar');
  });

  it('reflects a mid-game maxScore change in the rendered text', () => {
    // AC-6 acceptance criterion: a mid-game maxScore bump must propagate.
    const before = buildMirror({
      scoring: { scoreValue: 10, maxScore: 100, moves: 3 },
    });
    const { rerender } = render(
      <WorldProvider world={before}>
        <StatusLine />
      </WorldProvider>,
    );
    expect(
      screen.getByRole('status', { name: /game status/i }).textContent,
    ).toContain('Score: 10/100');

    const after = buildMirror({
      scoring: { scoreValue: 10, maxScore: 200, moves: 3 },
    });
    rerender(
      <WorldProvider world={after}>
        <StatusLine />
      </WorldProvider>,
    );

    expect(
      screen.getByRole('status', { name: /game status/i }).textContent,
    ).toContain('Score: 10/200');
  });
});
