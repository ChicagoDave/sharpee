/**
 * RECIndicator — persistent recording-transparency cue shown in the room
 * header for every participant, every session (ADR-153 Decision 8).
 *
 * Public interface: {@link RECIndicator} default export.
 *
 * Bounded context: client UI primitive. Purely visual; the transparency
 * notice copy itself is delivered via the `recording_notice` field on the
 * welcome message and displayed by the room page on first join.
 */

export default function RECIndicator(): JSX.Element {
  return (
    <span
      role="img"
      aria-label="This session is being recorded"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.06em',
        color: 'var(--sharpee-error)',
        padding: '4px 8px',
        background: 'color-mix(in srgb, var(--sharpee-error) 15%, transparent)',
        borderRadius: 'var(--sharpee-border-radius)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: 'var(--sharpee-error)',
          boxShadow: '0 0 6px var(--sharpee-error)',
        }}
      />
      REC
    </span>
  );
}
