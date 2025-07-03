// Frontend service to sync with command-based arena automation
import { useState, useEffect, useCallback } from 'react';

interface ArenaGameState {
  battleId: string | null;
  gameState: 'idle' | 'playing' | 'finished';
  phase: 'startGame' | 'battle';
  timeRemaining: number;
  totalTime: number;
  lastUpdate: number;
  yodha1Id: number | null;
  yodha2Id: number | null;
  currentRound: number;
  totalRounds: number;
  automationEnabled: boolean;
  type: string;
}

export const useArenaSync = (battleId: string | null) => {
  const [gameState, setGameState] = useState<ArenaGameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current game state from status endpoint (not commands)
  const fetchGameState = useCallback(async () => {
    if (!battleId) return;

    try {
      const response = await fetch(`/api/arena/status?battleId=${battleId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.gameState) {
          setGameState(data.gameState);
          setError(null);
        } else {
          // No active automation
          setGameState(null);
        }
      } else if (response.status === 404) {
        // Battle not found - set to idle state
        setGameState(null);
      } else {
        throw new Error('Failed to fetch game state');
      }
    } catch (err) {
      setError('Failed to sync with backend');
      console.error('Arena sync error:', err);
    }
  }, [battleId]);

  // Initialize battle on command-based backend
  const initializeBattle = useCallback(async (yodha1Id: number, yodha2Id: number) => {
    if (!battleId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/arena/commands?battleId=${battleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'initialize',
          yodha1Id,
          yodha2Id,
        }),
      });

      if (!response.ok) {
        // Get the detailed error from the backend
        const errorData = await response.json().catch(() => ({}));
        
        // Enhanced error message with suggestions
        let errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
        console.error('Backend initialization error:', errorData);
        throw new Error(errorMessage);
      }

      // Fetch updated state
      await fetchGameState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize command-based automation';
      setError(errorMessage);
      console.error('Battle initialization error:', err);
      throw err; // Re-throw so the calling function can handle it
    } finally {
      setIsLoading(false);
    }
  }, [battleId, fetchGameState]);

  // Manual start game (not needed in command-based system, but kept for compatibility)
  const manualStartGame = useCallback(async () => {
    if (!battleId) return;

    console.log('Manual start game not needed - command-based system handles timing automatically');
    // In command-based system, the frontend polling handles this automatically
    return;
  }, [battleId]);

  // Manual next round (not needed in command-based system, but kept for compatibility)
  const manualNextRound = useCallback(async () => {
    if (!battleId) return;

    console.log('Manual next round not needed - command-based system handles timing automatically');
    // In command-based system, the frontend polling handles this automatically
    return;
  }, [battleId]);

  // Cleanup battle from command-based system
  const cleanupBattle = useCallback(async () => {
    if (!battleId) return;

    try {
      await fetch(`/api/arena/commands?battleId=${battleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'cleanup',
        }),
      });
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }, [battleId]);

  // Sync with backend every second
  useEffect(() => {
    if (!battleId) return;

    // Poll status endpoint every 2 seconds for timer updates
    const interval = setInterval(fetchGameState, 2000);
    
    // Initial fetch
    fetchGameState();

    return () => clearInterval(interval);
  }, [battleId, fetchGameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameState?.gameState === 'finished') {
        cleanupBattle();
      }
    };
  }, [gameState?.gameState, cleanupBattle]);

  return {
    gameState,
    isLoading,
    error,
    initializeBattle,
    manualStartGame,
    manualNextRound,
    cleanupBattle,
  };
};
