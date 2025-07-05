import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { chainsToTSender } from '../constants';

export type RankCategory = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export interface LeaderboardYodha {
  tokenId: number;
  name: string;
  image: string;
  rank: RankCategory;
  winnings: bigint;
  owner: string;
  traits: {
    strength: number;
    wit: number;
    charisma: number;
    defence: number;
    luck: number;
  };
  moves: {
    strike: string;
    taunt: string;
    dodge: string;
    special: string;
    recover: string;
  };
  bio?: string;
  life_history?: string;
  adjectives?: string;
  knowledge_areas?: string;
}

export interface LeaderboardData {
  UNRANKED: LeaderboardYodha[];
  BRONZE: LeaderboardYodha[];
  SILVER: LeaderboardYodha[];
  GOLD: LeaderboardYodha[];
  PLATINUM: LeaderboardYodha[];
}

export function useLeaderboard() {
  const chainId = useChainId();
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    UNRANKED: [],
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get contract address for current chain
  const contractAddress = chainsToTSender[chainId]?.yodhaNFT;

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      if (!contractAddress) {
        setError('Contract address not found for current chain');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Temporary solution: Return empty data to avoid API spam
        // In production, you would implement proper event listening or have the contract maintain a registry
        console.log('Leaderboard: Using temporary empty data to avoid API errors');
        
        const groupedData: LeaderboardData = {
          UNRANKED: [],
          BRONZE: [],
          SILVER: [],
          GOLD: [],
          PLATINUM: []
        };

        setLeaderboardData(groupedData);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError('Failed to fetch leaderboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboardData();
  }, [contractAddress, chainId]);

  return {
    leaderboardData,
    isLoading,
    error,
    refetch: () => {
      setIsLoading(true);
      // Trigger re-fetch by updating a dependency
    }
  };
};
