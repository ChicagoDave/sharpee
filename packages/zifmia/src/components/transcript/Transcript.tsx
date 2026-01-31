/**
 * Transcript - Displays the scrollable game text with illustrations (ADR-124)
 */

import React from 'react';
import { useTranscript } from '../../hooks/useTranscript';
import { useAssetMap } from '../../context';
import type { TranscriptIllustration } from '../../types/game-state';

interface TranscriptProps {
  className?: string;
}

export function Transcript({ className = '' }: TranscriptProps) {
  const { entries, containerRef } = useTranscript();
  const assetMap = useAssetMap();

  return (
    <div className={`transcript ${className}`} ref={containerRef}>
      {entries.map((entry) => {
        const hasIllustrations = entry.illustrations && entry.illustrations.length > 0;
        const entryClass = hasIllustrations
          ? 'transcript-entry illustrated-passage'
          : 'transcript-entry';

        return (
          <div key={entry.id} className={entryClass}>
            {entry.command && (
              <div className="transcript-command">
                <span className="transcript-prompt">&gt; </span>
                {entry.command}
              </div>
            )}
            {hasIllustrations &&
              entry.illustrations!.map((ill, i) => (
                <IllustrationImage key={i} illustration={ill} assetMap={assetMap} />
              ))}
            <div
              className="transcript-text"
              dangerouslySetInnerHTML={{ __html: formatText(entry.text) }}
            />
          </div>
        );
      })}
    </div>
  );
}

function IllustrationImage({
  illustration,
  assetMap,
}: {
  illustration: TranscriptIllustration;
  assetMap: Map<string, string>;
}) {
  const blobUrl = assetMap.get(illustration.src) ?? assetMap.get(`assets/${illustration.src}`);
  if (!blobUrl) return null;

  const positionClass = `illustration--${illustration.position}`;

  return (
    <img
      className={`illustration ${positionClass}`}
      src={blobUrl}
      alt={illustration.alt}
      style={{ width: illustration.width }}
    />
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
