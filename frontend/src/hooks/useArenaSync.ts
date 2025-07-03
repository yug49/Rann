// Frontend service to sync with backend arena automation
import { useState, useEffect, useCallback } from 'react';

interface ArenaGameState {
  battleId: number | null;
  gameState: 'idle' | 'betting' | 'playing' | 'finished';
  timeRemaining: number;
  totalTime: number;
  lastUpdate: number;
  yodha1Id: number | null;
  yodha2Id: number | null;
  currentRound: number;
  totalRounds: number;
}

export const useArenaSync = (battleId: string | null) => {
  const [gameState, setGameState] = useState<ArenaGameState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch current game state from backend
  const fetchGameState = useCallback(async () => {
    if (!battleId) return;

    try {
      const response = await fetch(`/api/arena/${battleId}`);
      if (response.ok) {
        const data = await response.json();
        setGameState(data);
        setError(null);
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

  // Initialize battle on backend
  const initializeBattle = useCallback(async (yodha1Id: number, yodha2Id: number) => {
    if (!battleId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/arena/${battleId}`, {
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
        
        if (errorData.suggestion) {
          errorMessage += `\n\n💡 Suggestion: ${errorData.suggestion}`;
        }
        
        if (errorData.simulationMode) {
          errorMessage += `\n\n🎮 ${errorData.simulationMode}`;
        }
        
        console.error('Backend initialization error:', errorData);
        throw new Error(errorMessage);
      }

      // Fetch updated state
      await fetchGameState();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize battle';
      setError(errorMessage);
      console.error('Battle initialization error:', err);
      throw err; // Re-throw so the calling function can handle it
    } finally {
      setIsLoading(false);
    }
  }, [battleId, fetchGameState]);

  // Manual start game (override)
  const manualStartGame = useCallback(async () => {
    if (!battleId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/arena/${battleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'manual_start',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start game manually');
      }

      await fetchGameState();
    } catch (err) {
      setError('Failed to start game manually');
      console.error('Manual start error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [battleId, fetchGameState]);

  // Manual next round (override)
  const manualNextRound = useCallback(async () => {
    if (!battleId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/arena/${battleId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'manual_next_round',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to call next round manually');
      }

      await fetchGameState();
    } catch (err) {
      setError('Failed to call next round manually');
      console.error('Manual next round error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [battleId, fetchGameState]);

  // Cleanup battle
  const cleanupBattle = useCallback(async () => {
    if (!battleId) return;

    try {
      await fetch(`/api/arena/${battleId}`, {
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

    const interval = setInterval(fetchGameState, 1000);
    
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
