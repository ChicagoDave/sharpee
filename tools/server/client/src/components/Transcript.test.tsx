/**
 * Transcript behaviour tests (restored-entry styling).
 *
 * Behavior Statement — Transcript
 *   DOES: renders every text_block in each entry as a paragraph; when an
 *         entry carries a `restored` marker, renders it with a
 *         distinguishable "RESTORED · {name}" label and a data-restored
 *         attribute so visual treatment can be asserted.
 *   WHEN: the room view passes `state.transcript` into the component.
 *   BECAUSE: a restore is a rollback; participants need to see the seam.
 *   REJECTS WHEN: N/A — presentational.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Transcript from './Transcript';
import type { TranscriptEntry } from '../state/types';

describe('<Transcript>', () => {
  it('renders regular entries as plain paragraphs', () => {
    const entries: TranscriptEntry[] = [
      {
        turn_id: 't-1',
        text_blocks: [{ kind: 'paragraph', text: 'You are in a dusty room.' }],
        events: [],
      },
    ];
    render(<Transcript entries={entries} />);
    expect(screen.getByText(/you are in a dusty room/i)).toBeInTheDocument();
    expect(screen.queryByText(/restored/i)).toBeNull();
  });

  it('marks a restored entry with a visible label and data-restored attribute', () => {
    const entries: TranscriptEntry[] = [
      {
        turn_id: 'restore-s-1',
        text_blocks: [
          { kind: 'paragraph', text: 'The rug peels itself off the floor.' },
        ],
        events: [],
        restored: { save_id: 's-1', save_name: 'zork t-3' },
      },
    ];
    render(<Transcript entries={entries} />);
    const article = screen.getByLabelText(/restored zork t-3/i);
    expect(article.getAttribute('data-restored')).toBe('true');
    expect(article).toHaveTextContent(/restored · zork t-3/i);
    expect(screen.getByText(/the rug peels/i)).toBeInTheDocument();
  });
});
