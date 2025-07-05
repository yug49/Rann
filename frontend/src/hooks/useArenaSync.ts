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

  // Fetch current game state from status endpoint (NEVER consumes commands)
  const fetchGameState = useCallback(async () => {
    if (!battleId) return;

    try {
      const response = await fetch(`/api/arena/status?battleId=${battleId}`);
      if (response.ok) {
        const data = await response.json();
        // Handle both existing gameState and null gameState gracefully
        if (data.gameState) {
          setGameState(data.gameState);
          setError(null);
        } else {
          // No active automation - this is normal, not an error
          setGameState(null);
          setError(null);
        }
      } else {
        // Only set error for actual server errors, not missing data
        console.warn(`Status API returned ${response.status} for battle ${battleId}`);
        setError(null); // Don't treat this as an error
        setGameState(null);
      }
    } catch (err) {
      // Only log actual network/parsing errors
      console.warn('Arena sync warning (non-critical):', err);
      setError(null); // Don't treat connectivity issues as blocking errors
      setGameState(null);
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
        const errorMessage = errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        
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
      console.warn('Cleanup warning (non-critical):', err);
    }
  }, [battleId]);

  // Sync with backend every 2 seconds - ONLY uses status endpoint, never commands
  useEffect(() => {
    if (!battleId) return;

    // Poll status endpoint every 2 seconds for timer updates
    // This endpoint NEVER consumes commands, only reads state
    const interval = setInterval(() => {
      fetchGameState().catch(err => {
        console.warn('Status polling warning (non-critical):', err);
      });
    }, 2000);
    
    // Initial fetch
    fetchGameState().catch(err => {
      console.warn('Initial status fetch warning (non-critical):', err);
    });

    return () => clearInterval(interval);
  }, [battleId, fetchGameState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameState?.gameState === 'finished') {
        cleanupBattle().catch(err => {
          console.warn('Cleanup on unmount warning (non-critical):', err);
        });
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
