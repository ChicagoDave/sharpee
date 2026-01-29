/**
 * StatusLine - Displays current location, score, and turn count
 */

import React from 'react';
import { useGameState } from '../../context/GameContext';

interface StatusLineProps {
  className?: string;
}

export function StatusLine({ className = '' }: StatusLineProps) {
  const { currentRoom, score, maxScore, turns } = useGameState();

  const locationName = currentRoom?.name || 'Unknown';
  const scoreText = maxScore > 0 ? `${score}/${maxScore}` : String(score);

  return (
    <div className={`status-line ${className}`}>
      <span className="status-location">{locationName}</span>
      <span className="status-right">
        <span className="status-score">Score: {scoreText}</span>
        <span className="status-separator"> | </span>
        <span className="status-turns">Turns: {turns}</span>
      </span>
    </div>
  );
}
