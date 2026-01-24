/**
 * GameShell - Main layout component for the React client
 *
 * Provides the classic split layout:
 * - Left (65%): Game transcript with command input
 * - Right (35%): Tabbed panel (Map, Notes, Commentary, Progress)
 */

import React, { useMemo, type ReactNode } from 'react';
import { StatusLine } from './status/StatusLine';
import { Transcript } from './transcript/Transcript';
import { CommandInput } from './transcript/CommandInput';
import { TabPanel, tabPanelStyles, type TabConfig } from './panels/TabPanel';
import { NotesPanel, notesPanelStyles } from './panels/NotesPanel';
import { ProgressPanel, progressPanelStyles } from './panels/ProgressPanel';
import { MapPanel, mapPanelStyles } from './panels/MapPanel';
import { CommentaryPanel, commentaryPanelStyles } from './panels/CommentaryPanel';

interface GameShellProps {
  /** Override the default side panel content */
  sidePanel?: ReactNode;
  /** Story ID for notes persistence */
  storyId?: string;
  /** Additional class name */
  className?: string;
  /** Theme name for styling */
  theme?: 'infocom' | 'modern';
  /** Show side panel (default: true) */
  showSidePanel?: boolean;
}

export function GameShell({
  sidePanel,
  storyId = 'default',
  className = '',
  theme = 'infocom',
  showSidePanel = true,
}: GameShellProps) {
  // Default tabs
  const defaultTabs = useMemo<TabConfig[]>(
    () => [
      {
        id: 'map',
        label: 'Map',
        content: <MapPanel storyId={storyId} />,
      },
      {
        id: 'commentary',
        label: 'Events',
        content: <CommentaryPanel />,
      },
      {
        id: 'notes',
        label: 'Notes',
        content: <NotesPanel storyId={storyId} />,
      },
      {
        id: 'progress',
        label: 'Progress',
        content: <ProgressPanel />,
      },
    ],
    [storyId]
  );

  const sidePanelContent = sidePanel ?? (
    <TabPanel tabs={defaultTabs} defaultTab="map" />
  );

  return (
    <div className={`game-shell game-shell--${theme} ${className}`}>
      <StatusLine className="game-shell__status" />

      <div className="game-shell__content">
        <div className={`game-shell__main ${!showSidePanel ? 'game-shell__main--full' : ''}`}>
          <div className="game-shell__transcript-container">
            <Transcript className="game-shell__transcript" />
          </div>
          <div className="game-shell__input-container">
            <CommandInput className="game-shell__input" />
          </div>
        </div>

        {showSidePanel && (
          <div className="game-shell__sidebar">
            {sidePanelContent}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Default CSS styles for GameShell
 * Combines all panel styles for easy injection
 */
export const gameShellStyles = `
.game-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
}

.game-shell__status {
  flex-shrink: 0;
}

.game-shell__content {
  flex: 1;
  display: flex;
  min-height: 0;
}

.game-shell__main {
  flex: 0 0 65%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.game-shell__main--full {
  flex: 1;
}

.game-shell__transcript-container {
  flex: 1;
  overflow: hidden;
}

.game-shell__transcript {
  height: 100%;
  overflow-y: auto;
  padding: 1rem;
}

.game-shell__input-container {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
}

.game-shell__sidebar {
  flex: 0 0 35%;
  border-left: 1px solid currentColor;
  overflow: hidden;
}

/* Infocom theme */
.game-shell--infocom {
  background-color: #0000aa;
  color: #ffffff;
}

.game-shell--infocom .status-line {
  background-color: #00aaaa;
  color: #000000;
  padding: 0.25rem 1rem;
  display: flex;
  justify-content: space-between;
}

.game-shell--infocom .command-input-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.game-shell--infocom .command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  outline: none;
}

.game-shell--infocom .transcript-command {
  color: #ffff55;
}

.game-shell--infocom .transcript-entry p {
  margin: 0 0 1em 0;
}

/* Modern theme */
.game-shell--modern {
  background-color: #1a1a2e;
  color: #eaeaea;
}

.game-shell--modern .status-line {
  background-color: #16213e;
  color: #e94560;
  padding: 0.5rem 1rem;
  display: flex;
  justify-content: space-between;
}

.game-shell--modern .command-input-form {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: #0f0f23;
  border-radius: 4px;
  padding: 0.5rem;
}

.game-shell--modern .command-input {
  flex: 1;
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  outline: none;
}

.game-shell--modern .transcript-command {
  color: #e94560;
}

.game-shell--modern .transcript-entry p {
  margin: 0 0 1em 0;
  line-height: 1.5;
}

/* Panel styles */
${tabPanelStyles}
${mapPanelStyles}
${commentaryPanelStyles}
${notesPanelStyles}
${progressPanelStyles}
`;
