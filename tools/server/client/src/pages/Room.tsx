/**
 * Room page — placeholder for `/room/:room_id`.
 *
 * Public interface: {@link Room} default export, {@link RoomProps}.
 *
 * Bounded context: client room view (ADR-153 frontend). Phase 3 only proves
 * the route resolves and that the `:room_id` segment is captured. Real
 * rendering lands in Phase 7 once the WebSocket reducer is ready.
 */

import Button from '../components/Button';
import { navigate } from '../router';

export interface RoomProps {
  roomId: string;
}

export default function Room({ roomId }: RoomProps): JSX.Element {
  return (
    <section
      aria-label="Room"
      style={{
        display: 'grid',
        gap: 'var(--sharpee-spacing-md)',
        maxWidth: 960,
        margin: '0 auto',
        padding: 'var(--sharpee-spacing-lg)',
      }}
    >
      <header>
        <h1 style={{ margin: 0 }}>Room</h1>
        <p style={{ color: 'var(--sharpee-text-muted)' }}>
          <code style={{ fontFamily: 'var(--sharpee-font-input)' }}>{roomId}</code>
        </p>
      </header>
      <p style={{ color: 'var(--sharpee-text-muted)' }}>
        Room view coming in Phase 7.
      </p>
      <Button
        variant="secondary"
        onClick={() => navigate('/')}
        style={{ justifySelf: 'start' }}
      >
        Back to landing
      </Button>
    </section>
  );
}
