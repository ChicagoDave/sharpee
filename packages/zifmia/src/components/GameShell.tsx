/**
 * GameShell - Main layout component for the Zifmia story runner
 *
 * Full-width layout: StatusLine + Transcript + CommandInput
 *
 * Styling is handled by external theme CSS files.
 */

import React from 'react';
import { StatusLine } from './status/StatusLine';
import { Transcript } from './transcript/Transcript';
import { CommandInput } from './transcript/CommandInput';

interface GameShellProps {
  /** Story ID for persistence */
  storyId?: string;
  /** Additional class name */
  className?: string;
}

export function GameShell({
  storyId = 'default',
  className = '',
}: GameShellProps) {
  return (
    <div className={`game-shell ${className}`}>
      <StatusLine className="game-shell__status" />

      <div className="game-shell__content">
        <div className="game-shell__main game-shell__main--full">
          <div className="game-shell__transcript-container">
            <Transcript className="game-shell__transcript" />
          </div>
          <div className="game-shell__input-container">
            <CommandInput className="game-shell__input" />
          </div>
        </div>
      </div>
    </div>
  );
}
