/**
 * Transcript - Displays the scrollable game text with illustrations (ADR-124)
 */

import React from 'react';
import { useTranscript } from '../../hooks/useTranscript';
import { usePreferences } from '../../hooks/usePreferences';
import { useAssetMap } from '../../context';
import type { TranscriptIllustration } from '../../types/game-state';
import type { IllustrationSize } from '../../hooks/usePreferences';

interface TranscriptProps {
  className?: string;
}

export function Transcript({ className = '' }: TranscriptProps) {
  const { entries, containerRef } = useTranscript();
  const assetMap = useAssetMap();
  const { preferences } = usePreferences();

  return (
    <div className={`transcript ${className}`} ref={containerRef}>
      {entries.map((entry) => {
        const showIllustrations = preferences.illustrationsEnabled
          && entry.illustrations && entry.illustrations.length > 0;
        const entryClass = showIllustrations
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
            {showIllustrations &&
              entry.illustrations!.map((ill, i) => (
                <IllustrationImage
                  key={i}
                  illustration={ill}
                  assetMap={assetMap}
                  sizeClass={preferences.illustrationSize}
                />
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
  sizeClass,
}: {
  illustration: TranscriptIllustration;
  assetMap: Map<string, string>;
  sizeClass: IllustrationSize;
}) {
  const blobUrl = assetMap.get(illustration.src) ?? assetMap.get(`assets/${illustration.src}`);
  if (!blobUrl) return null;

  const positionClass = `illustration--${illustration.position}`;

  return (
    <img
      className={`illustration ${positionClass} illustration--size-${sizeClass}`}
      src={blobUrl}
      alt={illustration.alt}
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
