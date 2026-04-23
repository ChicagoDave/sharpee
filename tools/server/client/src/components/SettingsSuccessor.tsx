/**
 * SettingsSuccessor — PH-only Co-Host successor nomination list.
 *
 * Public interface: {@link SettingsSuccessor} default export.
 *
 * Bounded context: client room settings (Plan 02 Phase 4; ADR-153 Decision 6).
 * Renders the current Co-Hosts as a radio group with the currently-designated
 * successor pre-selected. Saving the selection dispatches `nominate_successor`
 * over the WebSocket. The Save button is disabled when the selection
 * matches the existing nominee (no-op) or when there are no Co-Hosts to
 * nominate from.
 *
 * When no Co-Host exists the form renders an explanatory empty state — the
 * PH must promote someone to Co-Host first. ADR-153 D6 also notes that the
 * server auto-nominates a successor on hello if none is set, so this panel
 * is usually a confirmation surface rather than a required action.
 */

import { useCallback, useState } from 'react';
import Button from './Button';
import { sendNominateSuccessor, type Sender } from '../api/ws';
import type { ParticipantSummary } from '../types/wire';

export interface SettingsSuccessorProps {
  participants: ParticipantSummary[];
  designatedSuccessorId: string | null;
  send: Sender;
}

export default function SettingsSuccessor({
  participants,
  designatedSuccessorId,
  send,
}: SettingsSuccessorProps): JSX.Element {
  const cohosts = participants.filter((p) => p.tier === 'co_host');
  const [selected, setSelected] = useState<string | null>(designatedSuccessorId);

  const nothingToDo = cohosts.length === 0;
  const unchanged = selected === designatedSuccessorId;

  const submit = useCallback(() => {
    if (!selected || unchanged) return;
    sendNominateSuccessor(send, selected);
  }, [selected, unchanged, send]);

  return (
    <section
      aria-labelledby="settings-successor-heading"
      style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
    >
      <h3 id="settings-successor-heading" style={{ margin: 0, fontSize: '0.95rem' }}>
        Successor
      </h3>
      <p style={{ margin: 0, color: 'var(--sharpee-text-muted)', fontSize: '0.85rem' }}>
        The Co-Host who becomes Primary Host if you lose connection for more
        than five minutes.
      </p>
      {nothingToDo ? (
        <p
          role="status"
          style={{
            margin: 0,
            fontStyle: 'italic',
            color: 'var(--sharpee-text-muted)',
          }}
        >
          No Co-Hosts yet — promote a participant to Co-Host first.
        </p>
      ) : (
        <fieldset
          style={{
            border: '1px solid var(--sharpee-border)',
            borderRadius: 'var(--sharpee-border-radius)',
            padding: 'var(--sharpee-spacing-sm)',
            margin: 0,
          }}
        >
          <legend style={{ padding: '0 6px', fontSize: '0.8rem' }}>
            Co-Hosts
          </legend>
          {cohosts.map((p) => (
            <label
              key={p.participant_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 0',
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="successor"
                value={p.participant_id}
                checked={selected === p.participant_id}
                onChange={() => setSelected(p.participant_id)}
              />
              <span>{p.display_name}</span>
              {p.participant_id === designatedSuccessorId && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: 'var(--sharpee-text-muted)',
                  }}
                >
                  (current)
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}
      <Button
        type="button"
        variant="primary"
        onClick={submit}
        disabled={nothingToDo || !selected || unchanged}
        style={{ alignSelf: 'start' }}
      >
        Save successor
      </Button>
    </section>
  );
}
