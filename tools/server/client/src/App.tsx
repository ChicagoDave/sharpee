/**
 * Application shell and routing for the Sharpee multi-user client.
 *
 * Public interface: {@link App} default export — rendered by main.tsx.
 *
 * Bounded context: client root (ADR-153 frontend). Phase 3 wires two routes:
 *   - `/`              → {@link Landing}
 *   - `/room/:room_id` → {@link Room}
 * Any other path falls back to the landing page. The passcode deep-link at
 * `/r/:code` and the create-room flow land in Phases 4–5.
 */

import { useCallback } from 'react';
import Landing from './pages/Landing';
import Room from './pages/Room';
import ThemePicker from './components/ThemePicker';
import { matchRoomPath, navigate, useRoute } from './router';

export default function App(): JSX.Element {
  const path = useRoute();
  const roomId = matchRoomPath(path);

  const handleRoomCreated = useCallback((room_id: string) => {
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  const handleEnter = useCallback((room_id: string) => {
    // Placeholder — PasscodeModal lands in Phase 5. For now, navigate
    // straight to the room route; real join flow comes later.
    navigate(`/room/${encodeURIComponent(room_id)}`);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        role="banner"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--sharpee-spacing-md) var(--sharpee-spacing-lg)',
          borderBottom: '1px solid var(--sharpee-border)',
          background: 'var(--sharpee-bg-secondary)',
        }}
      >
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            navigate('/');
          }}
          style={{
            color: 'inherit',
            textDecoration: 'none',
            fontFamily: 'var(--sharpee-font-ui)',
            fontWeight: 600,
          }}
        >
          Sharpee
        </a>
        <ThemePicker />
      </header>
      <main style={{ flex: 1 }}>
        {roomId !== null ? (
          <Room roomId={roomId} />
        ) : (
          <Landing onRoomCreated={handleRoomCreated} onEnter={handleEnter} />
        )}
      </main>
    </div>
  );
}
