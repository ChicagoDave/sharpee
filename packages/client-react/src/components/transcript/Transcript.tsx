/**
 * Transcript - Displays the scrollable game text
 */

import React from 'react';
import { useTranscript } from '../../hooks/useTranscript';

interface TranscriptProps {
  className?: string;
}

export function Transcript({ className = '' }: TranscriptProps) {
  const { entries, containerRef } = useTranscript();

  return (
    <div className={`transcript ${className}`} ref={containerRef}>
      {entries.map((entry) => (
        <div key={entry.id} className="transcript-entry">
          {entry.command && (
            <div className="transcript-command">
              <span className="transcript-prompt">&gt; </span>
              {entry.command}
            </div>
          )}
          <div
            className="transcript-text"
            dangerouslySetInnerHTML={{ __html: formatText(entry.text) }}
          />
        </div>
      ))}
    </div>
  );
}

/**
 * Format game text for display
 * Converts newlines to <br> and preserves paragraph breaks
 */
function formatText(text: string): string {
  // Split into paragraphs (double newline)
  const paragraphs = text.split(/\n\n+/);

  return paragraphs
    .map((p) => {
      // Convert single newlines to <br>
      const lines = p.split('\n').join('<br>');
      return `<p>${lines}</p>`;
    })
    .join('');
}
