/**
 * GameShell - Main layout component for the React client
 *
 * Provides the classic split layout:
 * - Left (65%): Game transcript with command input
 * - Right (35%): Tabbed panel (Map, Notes, Commentary, Progress)
 *
 * Styling is handled by external theme CSS files in packages/client-react/themes/
 * Build script injects the selected theme into the HTML.
 */

import React, { useMemo, type ReactNode } from 'react';
import { StatusLine } from './status/StatusLine';
import { Transcript } from './transcript/Transcript';
import { CommandInput } from './transcript/CommandInput';
import { TabPanel, type TabConfig } from './panels/TabPanel';
import { NotesPanel } from './panels/NotesPanel';
import { ProgressPanel } from './panels/ProgressPanel';
import { MapPanel } from './panels/MapPanel';
import { CommentaryPanel } from './panels/CommentaryPanel';

interface GameShellProps {
  /** Override the default side panel content */
  sidePanel?: ReactNode;
  /** Story ID for notes persistence */
  storyId?: string;
  /** Additional class name */
  className?: string;
  /** Show side panel (default: true) */
  showSidePanel?: boolean;
  /** Show Map tab - requires author-defined map hints (default: false) */
  mapEnabled?: boolean;
}

export function GameShell({
  sidePanel,
  storyId = 'default',
  className = '',
  showSidePanel = true,
  mapEnabled = false,
}: GameShellProps) {
  // Default tabs - Map tab only shown if author has enabled it (has map hints)
  const defaultTabs = useMemo<TabConfig[]>(() => {
    const tabs: TabConfig[] = [];

    if (mapEnabled) {
      tabs.push({
        id: 'map',
        label: 'Map',
        content: <MapPanel storyId={storyId} />,
      });
    }

    tabs.push(
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
      }
    );

    return tabs;
  }, [storyId, mapEnabled]);

  const defaultTab = mapEnabled ? 'map' : 'commentary';
  const sidePanelContent = sidePanel ?? (
    <TabPanel tabs={defaultTabs} defaultTab={defaultTab} />
  );

  return (
    <div className={`game-shell ${className}`}>
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

