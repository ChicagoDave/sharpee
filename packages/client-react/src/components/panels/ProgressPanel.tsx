/**
 * ProgressPanel - Displays game progress and statistics
 */

import React from 'react';
import { useProgress } from '../../hooks/useProgress';

interface ProgressPanelProps {
  className?: string;
}

export function ProgressPanel({ className = '' }: ProgressPanelProps) {
  const { stats, scoreText, percentageText } = useProgress();

  return (
    <div className={`progress-panel ${className}`}>
      <div className="progress-panel__section">
        <h3 className="progress-panel__heading">Score</h3>
        <div className="progress-panel__score">
          <span className="progress-panel__score-value">{scoreText}</span>
          <span className="progress-panel__score-percent">({percentageText})</span>
        </div>
        <div className="progress-panel__bar">
          <div
            className="progress-panel__bar-fill"
            style={{ width: `${stats.percentage}%` }}
          />
        </div>
      </div>

      <div className="progress-panel__section">
        <h3 className="progress-panel__heading">Statistics</h3>
        <dl className="progress-panel__stats">
          <div className="progress-panel__stat">
            <dt>Turns</dt>
            <dd>{stats.turns}</dd>
          </div>
          {stats.roomsVisited > 0 && (
            <div className="progress-panel__stat">
              <dt>Rooms Visited</dt>
              <dd>{stats.roomsVisited}</dd>
            </div>
          )}
          {stats.roomsDiscovered > 0 && (
            <div className="progress-panel__stat">
              <dt>Rooms Discovered</dt>
              <dd>{stats.roomsDiscovered}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}

/**
 * CSS styles for ProgressPanel
 */
export const progressPanelStyles = `
.progress-panel {
  padding: 0;
}

.progress-panel__section {
  margin-bottom: 1.5rem;
}

.progress-panel__heading {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: bold;
  text-transform: uppercase;
  opacity: 0.8;
}

.progress-panel__score {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.progress-panel__score-value {
  font-size: 1.5rem;
  font-weight: bold;
}

.progress-panel__score-percent {
  font-size: 0.875rem;
  opacity: 0.7;
}

.progress-panel__bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
}

.progress-panel__bar-fill {
  height: 100%;
  background: #00aa00;
  transition: width 0.3s ease;
}

.progress-panel__stats {
  margin: 0;
}

.progress-panel__stat {
  display: flex;
  justify-content: space-between;
  padding: 0.25rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.progress-panel__stat dt {
  opacity: 0.8;
}

.progress-panel__stat dd {
  margin: 0;
  font-weight: bold;
}
`;
