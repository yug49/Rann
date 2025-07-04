import React, { useState, useEffect } from 'react';

interface GameTimerProps {
  gameState: 'betting' | 'playing' | 'idle';
  timeRemaining: number;
  totalTime: number;
}

export const GameTimer: React.FC<GameTimerProps> = ({ 
  gameState, 
  timeRemaining, 
  totalTime 
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressColor = () => {
    const percentage = (timeRemaining / totalTime) * 100;
    if (percentage > 60) return '#22c55e'; // green
    if (percentage > 30) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getStateText = () => {
    switch (gameState) {
      case 'betting':
        return 'Betting Period';
      case 'playing':
        return 'Battle in Progress';
      default:
        return 'Waiting for Battle';
    }
  };

  if (gameState === 'idle') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 text-center">
        <h3 className="text-white font-bold mb-2">Arena Status</h3>
        <p className="text-gray-300">Waiting for battle initialization...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <h3 className="text-white font-bold mb-2">{getStateText()}</h3>
      <div className="mb-3">
        <div className="text-2xl font-mono text-white mb-2">
          {formatTime(timeRemaining)}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className="h-2 rounded-full transition-all duration-1000"
            style={{
              width: `${(timeRemaining / totalTime) * 100}%`,
              backgroundColor: getProgressColor()
            }}
          />
        </div>
      </div>
      <p className="text-gray-400 text-sm">
        {gameState === 'betting' 
          ? 'Game will start automatically when timer ends'
          : 'Next round will begin automatically'
        }
      </p>
    </div>
  );
};
