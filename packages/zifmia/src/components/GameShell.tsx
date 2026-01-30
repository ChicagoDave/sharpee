/**
 * GameShell - Main layout component for the Zifmia story runner
 *
 * Full-width layout: MenuBar + StatusLine + Transcript + CommandInput
 *
 * Styling is handled by external theme CSS files.
 */

import React from 'react';
import { MenuBar } from './menu/MenuBar';
import { StatusLine } from './status/StatusLine';
import { Transcript } from './transcript/Transcript';
import { CommandInput } from './transcript/CommandInput';

export interface GameShellProps {
  /** Story ID for persistence */
  storyId?: string;
  /** Story title for menu bar display */
  storyTitle?: string;
  /** Additional class name */
  className?: string;
  /** Save/restore/export callbacks — MenuBar renders when any are provided */
  onSave?: () => void;
  onRestore?: () => void;
  onQuit?: () => void;
  onExportTranscript?: () => void;
  onExportWalkthrough?: () => void;
  onThemeChange?: (theme: string) => void;
  currentTheme?: string;
}

export function GameShell({
  storyId = 'default',
  storyTitle,
  className = '',
  onSave,
  onRestore,
  onQuit,
  onExportTranscript,
  onExportWalkthrough,
  onThemeChange,
  currentTheme,
}: GameShellProps) {
  const showMenuBar = onSave || onRestore || onQuit;

  return (
    <div className={`game-shell ${className}`}>
      {showMenuBar && (
        <MenuBar
          storyTitle={storyTitle}
          onSave={onSave}
          onRestore={onRestore}
          onQuit={onQuit}
          onExportTranscript={onExportTranscript}
          onExportWalkthrough={onExportWalkthrough}
          onThemeChange={onThemeChange}
          currentTheme={currentTheme}
        />
      )}

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
