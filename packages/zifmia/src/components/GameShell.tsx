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
import { TranscriptOverlay, ChatOverlay } from './overlays';
import type { StoryMetadata } from '../types/story-metadata';

export interface GameShellProps {
  /** Story ID for persistence */
  storyId?: string;
  /** Story title for menu bar display */
  storyTitle?: string;
  /** Bundle metadata for About dialog */
  storyMetadata?: StoryMetadata;
  /** Zifmia client version */
  zifmiaVersion?: string;
  /** Engine version */
  engineVersion?: string;
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
  onOverlayChange?: (overlay: string) => void;
  /** Overlay type: 'transcript' (default) or 'chat' */
  overlay?: 'transcript' | 'chat';
  /** Overlay configuration from story config.custom */
  overlayConfig?: Record<string, unknown>;
}

export function GameShell({
  storyId = 'default',
  storyTitle,
  storyMetadata,
  zifmiaVersion,
  engineVersion,
  className = '',
  onSave,
  onRestore,
  onQuit,
  onExportTranscript,
  onExportWalkthrough,
  onThemeChange,
  currentTheme,
  onOverlayChange,
  overlay = 'transcript',
  overlayConfig,
}: GameShellProps) {
  const showMenuBar = onSave || onRestore || onQuit;

  return (
    <div className={`game-shell ${className}`}>
      {showMenuBar && (
        <MenuBar
          storyTitle={storyTitle}
          storyMetadata={storyMetadata}
          zifmiaVersion={zifmiaVersion}
          engineVersion={engineVersion}
          onSave={onSave}
          onRestore={onRestore}
          onQuit={onQuit}
          onExportTranscript={onExportTranscript}
          onExportWalkthrough={onExportWalkthrough}
          onThemeChange={onThemeChange}
          currentTheme={currentTheme}
          onOverlayChange={onOverlayChange}
          currentOverlay={overlay}
        />
      )}

      {overlay !== 'chat' && <StatusLine className="game-shell__status" />}

      <div className="game-shell__content">
        <div className="game-shell__main game-shell__main--full">
          <div className="story-content">
            {overlay === 'chat'
              ? <ChatOverlay config={overlayConfig} />
              : <TranscriptOverlay />}
          </div>
        </div>
      </div>
    </div>
  );
}
