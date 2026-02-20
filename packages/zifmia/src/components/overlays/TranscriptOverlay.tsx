/**
 * TranscriptOverlay - Standard transcript rendering (default overlay)
 *
 * Extracted from GameShell to enable overlay switching.
 * Behavior is identical to the original inline rendering.
 */

import React from 'react';
import { Transcript } from '../transcript/Transcript';
import { CommandInput } from '../transcript/CommandInput';

export function TranscriptOverlay() {
  return (
    <>
      <div className="game-shell__transcript-container">
        <Transcript className="game-shell__transcript" />
      </div>
      <div className="game-shell__input-container">
        <CommandInput className="game-shell__input" />
      </div>
    </>
  );
}
