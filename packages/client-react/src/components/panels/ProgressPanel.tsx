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

