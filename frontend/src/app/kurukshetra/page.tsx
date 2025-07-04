'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWatchContractEvent } from 'wagmi';
import { encodePacked, keccak256, decodeEventLog } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import '../home-glass.css';
import { Button } from '../../components/ui/button';
// Unused UI components removed for lint cleanup
// import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
// import { Badge } from '../../components/ui/badge';
import { useArenas, type RankCategory, type ArenaWithDetails } from '../../hooks/useArenas';
import { arenaService, isValidBettingAmount, getClosestValidBettingAmount } from '../../services/arenaService';
import { near_agent_move_selecter, KurukshetraAbi, chainsToTSender, yodhaNFTAbi } from '../../constants';
import { waitForTransactionReceipt, readContract } from '@wagmi/core';
import rainbowKitConfig from '../../rainbowKitConfig';
import {
  Users,
  Sword,
  Shield,
  Crown,
  TrendingUp,
  TrendingDown,
  Trophy,
  Heart
} from 'lucide-react';
import { GameTimer } from '../../components/GameTimer';
import { useArenaSync } from '../../hooks/useArenaSync';

// PlayerMoves enum mapping (based on Kurukshetra.sol)
const PlayerMoves = {
  STRIKE: 0,
  TAUNT: 1,
  DODGE: 2,
  SPECIAL: 3,
  RECOVER: 4
} as const;

// Convert move name to enum value
const getMoveEnum = (moveName: string): number => {
  const normalizedMove = normalizeMoveName(moveName).toUpperCase() as keyof typeof PlayerMoves;
  return PlayerMoves[normalizedMove] ?? PlayerMoves.STRIKE; // Default to STRIKE if invalid
};

// Normalize move names to handle variations (e.g., SPECIAL_MOVE -> SPECIAL)
const normalizeMoveName = (moveName: string): string => {
  const normalized = moveName.toUpperCase().trim();
  
  // Handle variations of move names that AI might return
  switch (normalized) {
    case 'SPECIAL_MOVE':
    case 'SPECIAL MOVE':
      return 'SPECIAL';
    default:
      return normalized;
  }
};

// Move name cache for Yodha NFTs
interface YodhaMoves {
  strike: string;
  taunt: string;
  dodge: string;
  special: string;
  recover: string;
}

// Cache for storing move names to avoid repeated contract calls
const moveNamesCache = new Map<string, YodhaMoves>();

// Helper function to get specific move name from cached moves with move type in brackets
const getSpecificMoveName = (moves: YodhaMoves, moveType: PlayerMove): string => {
  let specificName: string;
  switch (moveType) {
    case 'STRIKE': 
      specificName = moves.strike;
      break;
    case 'TAUNT': 
      specificName = moves.taunt;
      break;
    case 'DODGE': 
      specificName = moves.dodge;
      break;
    case 'SPECIAL': 
      specificName = moves.special;
      break;
    case 'RECOVER': 
      specificName = moves.recover;
      break;
    default: 
      specificName = moveType;
  }
  
  // Return specific name with move type in brackets
  return `${specificName} (${moveType})`;
};

// Arena state types
type ArenaState = 'EMPTY' | 'INITIALIZED' | 'BATTLE_ONGOING' | 'FINISHED';
type BattlePhase = 'BETTING' | 'ROUND_INTERVAL' | 'CALCULATING' | 'FINISHED';
type PlayerMove = 'STRIKE' | 'TAUNT' | 'DODGE' | 'SPECIAL' | 'RECOVER';

// Enhanced battle notification type with HIT/MISS information
interface BattleNotification {
  isVisible: boolean;
  yodhaOneName: string;
  yodhaTwoName: string;
  yodhaOneMove: string;
  yodhaTwoMove: string;
  yodhaOneHitStatus?: 'HIT' | 'MISS' | 'PENDING';
  yodhaTwoHitStatus?: 'HIT' | 'MISS' | 'PENDING';
}

// Enhanced battle result for tracking move execution details
interface BattleMoveResult {
  yodhaOneResult: {
    moveName: string;
    hitStatus: 'HIT' | 'MISS';
    damageDealt: number;
    recoveryGained: number;
    dodged: boolean;
  };
  yodhaTwoResult: {
    moveName: string;
    hitStatus: 'HIT' | 'MISS';
    damageDealt: number;
    recoveryGained: number;
    dodged: boolean;
  };
}

interface Yodha {
  id: number;
  name: string;
  image: string;
  rank: RankCategory;
  strength: number;
  defense: number;
  charisma: number;
  wit: number;
  luck: number;
  owner: string;
  winnings: number;
  // IPFS metadata fields for AI prompts
  adjectives?: string;
  knowledge_areas?: string;
}

interface Arena {
  id: string;
  address: string;
  rank: RankCategory;
  state: ArenaState;
  yodhaOne?: Yodha;
  yodhaTwo?: Yodha;
  costToInfluence: number;
  costToDefluence: number;
  costToInfluenceYodhaOne: number;
  costToInfluenceYodhaTwo: number;
  costToDefluenceYodhaOne: number;
  costToDefluenceYodhaTwo: number;
  betAmount: number;
  currentRound: number;
  maxRounds: number;
  yodhaOneDamage: number;
  yodhaTwoDamage: number;
  playerOneBets: { address: string; amount: number }[];
  playerTwoBets: { address: string; amount: number }[];
  battlePhase: BattlePhase;
  isBettingPeriod: boolean;
  gameInitializedAt: number;
  minBettingPeriod: number;
  roundStartTime?: number;
  lastMoves?: {
    yodhaOne: PlayerMove;
    yodhaTwo: PlayerMove;
    yodhaOneDamage: number;
    yodhaTwoDamage: number;
    yodhaOneRecovery: number;
    yodhaTwoRecovery: number;
  };
  winner?: 'ONE' | 'TWO';
}

// Mock data for demonstration - commented out to fix lint errors
// const mockYodhas: Yodha[] = [ ... ];

const getRankColor = (rank: RankCategory) => {
  switch (rank) {
    case 'UNRANKED': return 'text-gray-400';
    case 'BRONZE': return 'text-orange-500';
    case 'SILVER': return 'text-gray-300';
    case 'GOLD': return 'text-yellow-400';
    case 'PLATINUM': return 'text-cyan-400';
    default: return 'text-gray-400';
  }
};

const getMoveIcon = (move: PlayerMove) => {
  switch (move) {
    case 'STRIKE': return <Sword className="w-4 h-4" />;
    case 'TAUNT': return <Users className="w-4 h-4" />;
    case 'DODGE': return <Shield className="w-4 h-4" />;
    case 'SPECIAL': return <Crown className="w-4 h-4" />;
    case 'RECOVER': return <Heart className="w-4 h-4" />;
  }
};

const getStateColor = (state: ArenaState) => {
  switch (state) {
    case 'EMPTY': return 'bg-gray-600';
    case 'INITIALIZED': return 'bg-blue-600';
    case 'BATTLE_ONGOING': return 'bg-red-600';
    case 'FINISHED': return 'bg-green-600';
    default: return 'bg-gray-600';
  }
};

// Components
const TraitBar = ({ label, value, max = 100, color = "bg-orange-400" }: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) => {
  // Format decimal values to show up to 2 decimal places
  const formattedValue = Number(value.toFixed(2));

  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1">
        <span
          className="text-orange-400"
          style={ { fontFamily: 'Press Start 2P, monospace' } }
        >
          { label }
        </span>
        <span
          className="text-white"
          style={ { fontFamily: 'Press Start 2P, monospace' } }
        >
          { formattedValue }/{ max }
        </span>
      </div>
      <div
        className="w-full rounded-full h-2"
        style={ {
          background: 'rgba(120, 160, 200, 0.1)',
          border: '1px solid #ff8c00'
        } }
      >
        <div
          className={ `h-2 rounded-full ${color} arcade-glow transition-all duration-300` }
          style={ { width: `${Math.min((value / max) * 100, 100)}%` } }
        />
      </div>
    </div>
  );
};







const EnhancedArenaCard = ({
  arenaWithDetails,
  ranking,
  index,
  onClick
}: {
  arenaWithDetails: ArenaWithDetails;
  ranking: RankCategory;
  index: number;
  onClick: () => void;
}) => {
  const { address, details } = arenaWithDetails;
  const isInitialized = details?.isInitialized && details?.yodhaOneDetails && details?.yodhaTwoDetails;
  const isBattleOngoing = details?.isBattleOngoing;

  return (
    <div
      className="cursor-pointer w-full transition-all duration-300 hover:transform hover:translateY(-2px)"
      onClick={ onClick }
      style={ {
        background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
        border: '3px solid #ff8c00',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
        borderRadius: '24px'
      } }
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3
              className="text-xl text-orange-400 arcade-glow"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              { ranking } ARENA #{ index + 1 }
            </h3>
            <div
              className={ `${isBattleOngoing ? 'bg-red-600' : (isInitialized ? 'bg-green-600' : 'bg-blue-600')} text-white px-3 py-1 text-xs rounded-lg` }
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              { isBattleOngoing ? 'BATTLE ONGOING' : (isInitialized ? 'BATTLE READY' : 'AWAITING WARRIORS') }
            </div>
          </div>
          <div className="text-right">
            <div
              className="text-sm text-orange-400"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              ADDRESS
            </div>
            <div
              className="text-orange-400 text-sm font-mono arcade-glow"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              { address.slice(0, 6) }...{ address.slice(-4) }
            </div>
          </div>
        </div>

        { isInitialized ? (
          // Initialized arena showing Yodhas
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Yodha One */}
            <div className="text-center">
              <div
                className="w-full aspect-square rounded-lg mb-2 overflow-hidden"
                style={ {
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                } }
              >
                <img
                  src={ details.yodhaOneDetails?.image || '/lazered.png' }
                  alt={ details.yodhaOneDetails?.name || 'Yodha One' }
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="text-xs text-orange-400 truncate"
                style={ { fontFamily: 'Press Start 2P, monospace' } }
              >
                { details.yodhaOneDetails?.name || `Yodha #${details.yodhaOneNFTId}` }
              </div>
              {/* Battle damage indicator if battle is ongoing */}
              { isBattleOngoing && (
                <div className="mt-1">
                  <div
                    className="text-xs text-red-400"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    DMG: { ((details.damageOnYodhaOne || 0) / 100).toFixed(2) }
                  </div>
                </div>
              ) }
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl text-red-500 mb-2">⚔️</div>
                <div
                  className="text-lg text-orange-400 arcade-glow"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  VS
                </div>
                {/* Battle round indicator if battle is ongoing */}
                { isBattleOngoing && (
                  <div
                    className="text-xs text-yellow-400 mt-2"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    ROUND { details.currentRound || 1 }
                  </div>
                ) }
              </div>
            </div>

            {/* Yodha Two */}
            <div className="text-center">
              <div
                className="w-full aspect-square rounded-lg mb-2 overflow-hidden"
                style={ {
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                } }
              >
                <img
                  src={ details.yodhaTwoDetails?.image || '/lazered.png' }
                  alt={ details.yodhaTwoDetails?.name || 'Yodha Two' }
                  className="w-full h-full object-cover"
                />
              </div>
              <div
                className="text-xs text-orange-400 truncate"
                style={ { fontFamily: 'Press Start 2P, monospace' } }
              >
                { details.yodhaTwoDetails?.name || `Yodha #${details.yodhaTwoNFTId}` }
              </div>
              {/* Battle damage indicator if battle is ongoing */}
              { isBattleOngoing && (
                <div className="mt-1">
                  <div
                    className="text-xs text-red-400"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    DMG: { ((details.damageOnYodhaTwo || 0) / 100).toFixed(2) }
                  </div>
                </div>
              ) }
            </div>
          </div>
        ) : (
          // Empty arena - ready for initialization
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Arena Status */}
            <div className="lg:col-span-2">
              <div className="text-center py-8">
                <div
                  className="w-full h-24 border-2 border-dashed border-orange-400 rounded flex items-center justify-center mb-4"
                  style={ {
                    background: 'rgba(120, 160, 200, 0.1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  } }
                >
                  <div className="text-center">
                    <Crown className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <span
                      className="text-orange-400"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      ARENA READY FOR BATTLE
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Arena Info */}
            <div className="space-y-4">
              <div
                className="text-center p-3 rounded"
                style={ {
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '1px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                } }
              >
                <div
                  className="text-xs text-orange-400 mb-1"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  STATUS
                </div>
                <div
                  className="text-sm text-green-400 font-bold"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  OPERATIONAL
                </div>
              </div>
            </div>
          </div>
        ) }

        {/* Enter Arena Button */}
        <div className="text-center mt-4">
          <button
            className="arcade-button text-xs px-4 py-2"
            onClick={ (e) => {
              e.stopPropagation();
              onClick();
            } }
            style={ {
              fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px'
            } }
          >
            { isBattleOngoing ? 'WATCH BATTLE' : (isInitialized ? 'ENTER BATTLE' : 'INITIALIZE ARENA') }
          </button>
        </div>
      </div>
    </div>
  );
};

export default function KurukshetraPage() {
  const { isConnected, address } = useAccount();
  const { arenasWithDetails, isLoading, error, refetch } = useArenas();
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [activeRank, setActiveRank] = useState<RankCategory>('UNRANKED');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [selectedYodha, setSelectedYodha] = useState<'ONE' | 'TWO' | null>(null);
  const [yodhaOneNFTId, setYodhaOneNFTId] = useState('');
  const [yodhaTwoNFTId, setYodhaTwoNFTId] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  
  // Battle animation states
  const [battleNotification, setBattleNotification] = useState<BattleNotification | null>(null);
  
  // Cache move names for current arena Yodhas
  const [yodhaMovesCache, setYodhaMovesCache] = useState<{
    yodhaOne?: YodhaMoves;
    yodhaTwo?: YodhaMoves;
  }>({});
  
  // Winner display state
  const [winnerDisplay, setWinnerDisplay] = useState<{
    isVisible: boolean;
    winnerName: string;
    winnerNFTId: string;
  } | null>(null);
  
  // Contract hooks
  const { writeContract } = useWriteContract();

  // Arena automation hook
  const arenaSync = useArenaSync(selectedArena?.address || null);

  // Function to fetch move names from YodhaNFT contract
  const fetchYodhaMoves = useCallback(async (tokenId: number): Promise<YodhaMoves | null> => {
    try {
      const cacheKey = `${tokenId}`;
      
      // Check cache first
      if (moveNamesCache.has(cacheKey)) {
        return moveNamesCache.get(cacheKey)!;
      }

      // Fetch from contract
      const moves = await readContract(rainbowKitConfig, {
        address: chainsToTSender[545].yodhaNFT as `0x${string}`,
        abi: yodhaNFTAbi,
        functionName: 'getMoves',
        args: [tokenId],
        chainId: 545,
      });

      const movesData = moves as { strike?: string; taunt?: string; dodge?: string; special?: string; recover?: string };
      const yodhaMoves: YodhaMoves = {
        strike: movesData.strike || 'Strike',
        taunt: movesData.taunt || 'Taunt',
        dodge: movesData.dodge || 'Dodge',
        special: movesData.special || 'Special',
        recover: movesData.recover || 'Recover'
      };

      console.log(`🎯 Fetched moves for Yodha ${tokenId}:`, yodhaMoves);

      // Cache the result
      moveNamesCache.set(cacheKey, yodhaMoves);
      return yodhaMoves;
    } catch (error) {
      console.error('Error fetching Yodha moves:', error);
      return null;
    }
  }, []);

  // Function to cache moves for both Yodhas when arena modal opens
  const cacheArenaYodhaMoves = useCallback(async () => {
    if (!selectedArena?.yodhaOne?.id || !selectedArena?.yodhaTwo?.id) {
      return;
    }

    console.log('🎯 Caching move names for Yodhas...');
    
    try {
      const [yodhaOneMoves, yodhaTwoMoves] = await Promise.all([
        fetchYodhaMoves(selectedArena.yodhaOne.id),
        fetchYodhaMoves(selectedArena.yodhaTwo.id)
      ]);

      setYodhaMovesCache({
        yodhaOne: yodhaOneMoves || undefined,
        yodhaTwo: yodhaTwoMoves || undefined
      });

      console.log('✅ Move names cached successfully:', {
        yodhaOne: yodhaOneMoves,
        yodhaTwo: yodhaTwoMoves
      });
    } catch (error) {
      console.error('❌ Error caching move names:', error);
    }
  }, [selectedArena?.yodhaOne?.id, selectedArena?.yodhaTwo?.id, fetchYodhaMoves]);

  // Execute battle moves after receiving AI response
  const executeBattleMoves = async (moves: { agent_1: { move: string }, agent_2: { move: string } }) => {
    if (!selectedArena || !address) {
      console.error('No arena selected or user not connected');
      return;
    }

    try {
      console.log('Executing battle moves:', moves);

      // Get specific move names from cache with proper normalization
      const normalizedYodhaOneMove = normalizeMoveName(moves.agent_1.move) as PlayerMove;
      const normalizedYodhaTwoMove = normalizeMoveName(moves.agent_2.move) as PlayerMove;
      
      console.log('🎯 Move normalization:', {
        original: { agent_1: moves.agent_1.move, agent_2: moves.agent_2.move },
        normalized: { agent_1: normalizedYodhaOneMove, agent_2: normalizedYodhaTwoMove }
      });
      
      const yodhaOneMoveName = yodhaMovesCache.yodhaOne 
        ? getSpecificMoveName(yodhaMovesCache.yodhaOne, normalizedYodhaOneMove)
        : `${normalizedYodhaOneMove} (${normalizedYodhaOneMove})`;
      
      const yodhaTwoMoveName = yodhaMovesCache.yodhaTwo 
        ? getSpecificMoveName(yodhaMovesCache.yodhaTwo, normalizedYodhaTwoMove)
        : `${normalizedYodhaTwoMove} (${normalizedYodhaTwoMove})`;
        
      console.log('🎯 Final move names:', {
        yodhaOne: yodhaOneMoveName,
        yodhaTwo: yodhaTwoMoveName,
        cacheStatus: {
          yodhaOne: !!yodhaMovesCache.yodhaOne,
          yodhaTwo: !!yodhaMovesCache.yodhaTwo
        }
      });

      // Trigger battle notification
      console.log(`🎯 BATTLE: ${selectedArena.yodhaOne?.name || 'Yodha One'} used ${yodhaOneMoveName} vs ${selectedArena.yodhaTwo?.name || 'Yodha Two'} used ${yodhaTwoMoveName}`);

      // Set battle notification for UI display with specific move names
      setBattleNotification({
        isVisible: true,
        yodhaOneName: selectedArena.yodhaOne?.name || 'Yodha One',
        yodhaTwoName: selectedArena.yodhaTwo?.name || 'Yodha Two',
        yodhaOneMove: yodhaOneMoveName,
        yodhaTwoMove: yodhaTwoMoveName,
        yodhaOneHitStatus: 'PENDING',
        yodhaTwoHitStatus: 'PENDING'
              });
        
        const yodhaOneMove = getMoveEnum(normalizedYodhaOneMove);
        const yodhaTwoMove = getMoveEnum(normalizedYodhaTwoMove);

        console.log('Move enums:', { yodhaOneMove, yodhaTwoMove });      // Get game master private key from environment
      const gameStandardPrivateKey = process.env.NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY;
      if (!gameStandardPrivateKey) {
        throw new Error('Game master private key not found');
      }

      // Ensure private key has 0x prefix for viem
      const formattedPrivateKey = gameStandardPrivateKey.startsWith('0x') 
        ? gameStandardPrivateKey 
        : `0x${gameStandardPrivateKey}`;

      // Pack data for signing - ONLY the moves (as per contract: abi.encodePacked(_yodhaOneMove, _yodhaTwoMove))
      const dataToSign = encodePacked(
        ['uint8', 'uint8'],
        [yodhaOneMove, yodhaTwoMove]
      );
      
      const dataHash = keccak256(dataToSign);
      
      // Sign with game master private key (this will automatically add the Ethereum message prefix)
      const gameStandardAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      const signature = await gameStandardAccount.signMessage({
        message: { raw: dataHash }
      });

      console.log('Signature:', signature);

      // Create Game Master wallet client for transaction
      const { createWalletClient, http } = await import('viem');
      const { defineChain } = await import('viem');
      
      const flowTestnet = defineChain({
        id: 545,
        name: 'Flow Testnet',
        network: 'flow-testnet',
        nativeCurrency: {
          decimals: 18,
          name: 'Flow',
          symbol: 'FLOW',
        },
        rpcUrls: {
          default: {
            http: ['https://testnet.evm.nodes.onflow.org'],
          },
        },
      });

      const gameMasterWalletClient = createWalletClient({
        account: gameStandardAccount,
        chain: flowTestnet,
        transport: http('https://testnet.evm.nodes.onflow.org'),
      });

      // Call the battle function using Game Master's wallet client
      const hash = await gameMasterWalletClient.writeContract({
        address: selectedArena.address as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'battle',
        args: [yodhaOneMove, yodhaTwoMove, signature]
      });

      console.log('Battle transaction sent:', hash);

      // Wait for confirmation
      const { createPublicClient } = await import('viem');
      const publicClient = createPublicClient({
        chain: flowTestnet,
        transport: http('https://testnet.evm.nodes.onflow.org'),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60000
      });

      console.log('Battle confirmed in block:', receipt.blockNumber);
      
      // Listen for YodhaMoveExecuted events to determine HIT/MISS status
      try {
        const moveExecutedEvents = receipt.logs.filter(log => {
          try {
            const decodedLog = decodeEventLog({
              abi: KurukshetraAbi,
              data: log.data,
              topics: log.topics,
            });
            return decodedLog.eventName === 'YodhaMoveExecuted';
          } catch {
            return false;
          }
        });

        console.log('🎯 YodhaMoveExecuted events found:', moveExecutedEvents.length);
        
        // Process events to determine HIT/MISS for each Yodha
        let yodhaOneHitStatus: 'HIT' | 'MISS' = 'MISS';
        let yodhaTwoHitStatus: 'HIT' | 'MISS' = 'MISS';
        
        moveExecutedEvents.forEach((log) => {
          try {
            const decodedLog = decodeEventLog({
              abi: KurukshetraAbi,
              data: log.data,
              topics: log.topics,
            });
            
            if (decodedLog.eventName === 'YodhaMoveExecuted') {
              const { args } = decodedLog;
              const eventArgs = args as any;
              const damageOnOpponentYodha = eventArgs.damageOnOpponentYodha;
              const recoveryOnSelfYodha = eventArgs.recoveryOnSelfYodha;
              const dodged = eventArgs.dodged;
              
              // Determine if it's a HIT or MISS based on YodhaMoveExecuted event data
              // MISS: damageOnOpponent=0 AND recoveryOfSelf=0 AND dodged=false (all conditions fail)
              // HIT: any one of these is true: damage dealt > 0 OR self recovery > 0 OR successfully dodged
              const isHit = damageOnOpponentYodha > 0 || recoveryOnSelfYodha > 0 || dodged === true;
              
              // We'll get 2 events (one for each Yodha), so we track both
              // The order matches the battle function call order: yodhaOne first, then yodhaTwo
              if (moveExecutedEvents.indexOf(log) === 0) {
                yodhaOneHitStatus = isHit ? 'HIT' : 'MISS';
              } else {
                yodhaTwoHitStatus = isHit ? 'HIT' : 'MISS';
              }
              
              console.log(`📊 Move result - Damage: ${damageOnOpponentYodha}, Recovery: ${recoveryOnSelfYodha}, Dodged: ${dodged} = ${isHit ? 'HIT' : 'MISS'}`);
            }
          } catch (error) {
            console.error('Error decoding YodhaMoveExecuted event:', error);
          }
        });

        // Update battle notification with HIT/MISS status
        setBattleNotification(prev => prev ? {
          ...prev,
          yodhaOneHitStatus,
          yodhaTwoHitStatus
        } : null);

        console.log(`🎯 Final hit status - ${selectedArena.yodhaOne?.name}: ${yodhaOneHitStatus}, ${selectedArena.yodhaTwo?.name}: ${yodhaTwoHitStatus}`);
        
      } catch (error) {
        console.error('❌ Error processing YodhaMoveExecuted events:', error);
      }

      // Hide notification after 8 seconds (longer to show HIT/MISS results)
      setTimeout(() => {
        setBattleNotification(null);
      }, 8000);
      
      // Refresh arena data to get updated influence/defluence costs and other state changes
      console.log('🔄 Refreshing arena data after battle execution...');
      await refetch();

    } catch (error) {
      console.error('Error executing battle moves:', error);
    }
  };

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Cache move names when arena modal opens and has both Yodhas
  useEffect(() => {
    if (selectedArena?.yodhaOne?.id && selectedArena?.yodhaTwo?.id && !yodhaMovesCache.yodhaOne && !yodhaMovesCache.yodhaTwo) {
      cacheArenaYodhaMoves();
    }
  }, [selectedArena?.yodhaOne?.id, selectedArena?.yodhaTwo?.id, yodhaMovesCache.yodhaOne, yodhaMovesCache.yodhaTwo, cacheArenaYodhaMoves]);

  // Helper function to convert ArenaWithDetails to Arena
  const convertArenaWithDetailsToArena = useCallback((arenaWithDetails: ArenaWithDetails): Arena | null => {
    const { address, details } = arenaWithDetails;

    if (!details) {
      return null;
    }

    // Create arena object from the prefetched details
    const arenaObject: Arena = {
      id: address,
      address: address,
      rank: activeRank,
      state: details.isBattleOngoing
        ? 'BATTLE_ONGOING'
        : (details.isInitialized ? 'INITIALIZED' : 'EMPTY'),
      costToInfluence: details.costToInfluence,
      costToDefluence: details.costToDefluence,
      costToInfluenceYodhaOne: details.costToInfluenceYodhaOne,
      costToInfluenceYodhaTwo: details.costToInfluenceYodhaTwo,
      costToDefluenceYodhaOne: details.costToDefluenceYodhaOne,
      costToDefluenceYodhaTwo: details.costToDefluenceYodhaTwo,
      betAmount: details.betAmount,
      currentRound: details.currentRound,
      maxRounds: 5,
      yodhaOneDamage: details.damageOnYodhaOne,
      yodhaTwoDamage: details.damageOnYodhaTwo,
      playerOneBets: details.playerOneBetAddresses.map(address => ({ address, amount: details.betAmount })),
      playerTwoBets: details.playerTwoBetAddresses.map(address => ({ address, amount: details.betAmount })),
      battlePhase: details.isBattleOngoing ? 'CALCULATING' : (details.isBettingPeriod ? 'BETTING' : 'ROUND_INTERVAL'),
      isBettingPeriod: details.isBettingPeriod,
      gameInitializedAt: details.gameInitializedAt,
      minBettingPeriod: details.minBettingPeriod
    };

    // If arena is initialized and has Yodha details, add them
    if (details.isInitialized && details.yodhaOneDetails && details.yodhaTwoDetails) {
      arenaObject.yodhaOne = {
        id: details.yodhaOneNFTId,
        name: details.yodhaOneDetails.name,
        image: details.yodhaOneDetails.image,
        rank: activeRank,
        strength: details.yodhaOneDetails.traits.strength ?? 50,
        defense: details.yodhaOneDetails.traits.defence ?? 50,
        charisma: details.yodhaOneDetails.traits.charisma ?? 50,
        wit: details.yodhaOneDetails.traits.wit ?? 50,
        luck: details.yodhaOneDetails.traits.luck ?? 50,
        owner: '0x000...000',
        winnings: 0,
        adjectives: details.yodhaOneDetails.adjectives,
        knowledge_areas: details.yodhaOneDetails.knowledge_areas
      };

      arenaObject.yodhaTwo = {
        id: details.yodhaTwoNFTId,
        name: details.yodhaTwoDetails.name,
        image: details.yodhaTwoDetails.image,
        rank: activeRank,
        strength: details.yodhaTwoDetails.traits.strength ?? 50,
        defense: details.yodhaTwoDetails.traits.defence ?? 50,
        charisma: details.yodhaTwoDetails.traits.charisma ?? 50,
        wit: details.yodhaTwoDetails.traits.wit ?? 50,
        luck: details.yodhaTwoDetails.traits.luck ?? 50,
        owner: '0x000...000',
        winnings: 0,
        adjectives: details.yodhaTwoDetails.adjectives,
        knowledge_areas: details.yodhaTwoDetails.knowledge_areas
      };
    }

    return arenaObject;
  }, [activeRank]);

  // Update selectedArena when arenas data changes (e.g., after RoundOver events)
  useEffect(() => {
    if (selectedArena && arenasWithDetails) {
      // Find the updated version of the selected arena across all ranks
      const allArenas = [
        ...arenasWithDetails.UNRANKED,
        ...arenasWithDetails.BRONZE,
        ...arenasWithDetails.SILVER,
        ...arenasWithDetails.GOLD,
        ...arenasWithDetails.PLATINUM
      ];
      const updatedArenaWithDetails = allArenas.find((arena: ArenaWithDetails) => arena.address === selectedArena.address);
      if (updatedArenaWithDetails) {
        const updatedArena = convertArenaWithDetailsToArena(updatedArenaWithDetails);
        if (updatedArena) {
          setSelectedArena(updatedArena);
        }
      }
    }
  }, [arenasWithDetails, selectedArena?.address, activeRank, convertArenaWithDetailsToArena]);

  // Get arenas for the active rank
  const currentRankArenasWithDetails = arenasWithDetails[activeRank] || [];

  // Manual automation functions - updated for command-based system
  const manualStartGame = async () => {
    if (!selectedArena) return;
    
    try {
      console.log('🤖 Manual start game triggered - calling handleStartGame directly');
      await handleStartGame(false); // Pass false for manual start
      console.log('✅ Manual start game successful');
    } catch (error) {
      console.error('❌ Manual start game error:', error);
    }
  };

  const manualNextRound = async () => {
    if (!selectedArena) return;
    
    try {
      console.log('⚔️ Manual next round triggered - calling handleNextRound directly');
      await handleNextRound();
      console.log('✅ Manual next round successful');
    } catch (error) {
      console.error('❌ Manual next round error:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInitializationError(null);
    setYodhaOneNFTId('');
    setYodhaTwoNFTId('');
    setBetAmount('');
    setSelectedYodha(null);
    setBattleNotification(null);
    // Clear move cache for next arena
    setYodhaMovesCache({});
  };

  const handleEnhancedArenaClick = (arenaWithDetails: ArenaWithDetails) => {
    const { address, details } = arenaWithDetails;

    if (!details) {
      console.error('Arena details not available');
      return;
    }

    // Create arena object from the prefetched details
    const arenaObject: Arena = {
      id: address,
      address: address,
      rank: activeRank,
      state: details.isBattleOngoing
        ? 'BATTLE_ONGOING'
        : (details.isInitialized ? 'INITIALIZED' : 'EMPTY'),
      costToInfluence: details.costToInfluence,
      costToDefluence: details.costToDefluence,
      costToInfluenceYodhaOne: details.costToInfluenceYodhaOne,
      costToInfluenceYodhaTwo: details.costToInfluenceYodhaTwo,
      costToDefluenceYodhaOne: details.costToDefluenceYodhaOne,
      costToDefluenceYodhaTwo: details.costToDefluenceYodhaTwo,
      betAmount: details.betAmount,
      currentRound: details.currentRound,
      maxRounds: 5,
      yodhaOneDamage: details.damageOnYodhaOne,
      yodhaTwoDamage: details.damageOnYodhaTwo,
      playerOneBets: details.playerOneBetAddresses.map(address => ({ address, amount: details.betAmount })),
      playerTwoBets: details.playerTwoBetAddresses.map(address => ({ address, amount: details.betAmount })),
      battlePhase: details.isBattleOngoing ? 'CALCULATING' : (details.isBettingPeriod ? 'BETTING' : 'ROUND_INTERVAL'),
      isBettingPeriod: details.isBettingPeriod,
      gameInitializedAt: details.gameInitializedAt,
      minBettingPeriod: details.minBettingPeriod
    };

    // If arena is initialized and has Yodha details, add them
    if (details.isInitialized && details.yodhaOneDetails && details.yodhaTwoDetails) {
      arenaObject.yodhaOne = {
        id: details.yodhaOneNFTId,
        name: details.yodhaOneDetails.name,
        image: details.yodhaOneDetails.image,
        rank: activeRank,
        strength: details.yodhaOneDetails.traits.strength ?? 50,
        defense: details.yodhaOneDetails.traits.defence ?? 50,
        charisma: details.yodhaOneDetails.traits.charisma ?? 50,
        wit: details.yodhaOneDetails.traits.wit ?? 50,
        luck: details.yodhaOneDetails.traits.luck ?? 50, // Using luck as personality
        owner: '0x000...000', // You may want to fetch actual owner from contract
        winnings: 0, // You may want to fetch actual winnings
        adjectives: details.yodhaOneDetails.adjectives,
        knowledge_areas: details.yodhaOneDetails.knowledge_areas
      };

      arenaObject.yodhaTwo = {
        id: details.yodhaTwoNFTId,
        name: details.yodhaTwoDetails.name,
        image: details.yodhaTwoDetails.image,
        rank: activeRank,
        strength: details.yodhaTwoDetails.traits.strength ?? 50,
        defense: details.yodhaTwoDetails.traits.defence ?? 50,
        charisma: details.yodhaTwoDetails.traits.charisma ?? 50,
        wit: details.yodhaTwoDetails.traits.wit ?? 50,
        luck: details.yodhaTwoDetails.traits.luck ?? 50, // Using luck as personality
        owner: '0x000...000', // You may want to fetch actual owner from contract
        winnings: 0, // You may want to fetch actual winnings
        adjectives: details.yodhaTwoDetails.adjectives,
        knowledge_areas: details.yodhaTwoDetails.knowledge_areas
      };
    }

    setSelectedArena(arenaObject);
    setIsModalOpen(true);
  };

  // Unused handlers removed for lint cleanup
  // const handleArenaAddressClick = async (arenaAddress: string) => { ... }
  // const handleArenaClick = (arena: Arena) => { ... }

  const handleStartGame = useCallback(async (isAutomated: boolean = false) => {
    if (!selectedArena) return;

    try {
      console.log('Starting battle for arena using Game Master private key:', selectedArena.address);

      // Get game master private key from environment
      const gameStandardPrivateKey = process.env.NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY;
      if (!gameStandardPrivateKey) {
        throw new Error('Game master private key not found');
      }

      // Ensure private key has 0x prefix for viem
      const formattedPrivateKey = gameStandardPrivateKey.startsWith('0x') 
        ? gameStandardPrivateKey 
        : `0x${gameStandardPrivateKey}`;

      // Create Game Master account and wallet client
      const gameStandardAccount = privateKeyToAccount(formattedPrivateKey as `0x${string}`);
      
      const { createWalletClient, http } = await import('viem');
      const { defineChain } = await import('viem');
      
      const flowTestnet = defineChain({
        id: 545,
        name: 'Flow Testnet',
        network: 'flow-testnet',
        nativeCurrency: {
          decimals: 18,
          name: 'Flow',
          symbol: 'FLOW',
        },
        rpcUrls: {
          default: {
            http: ['https://testnet.evm.nodes.onflow.org'],
          },
        },
      });

      const gameMasterWalletClient = createWalletClient({
        account: gameStandardAccount,
        chain: flowTestnet,
        transport: http('https://testnet.evm.nodes.onflow.org'),
      });

      console.log(`Using Game Master account: ${gameStandardAccount.address}`);

      // Call startGame using Game Master's wallet client
      const hash = await gameMasterWalletClient.writeContract({
        address: selectedArena.address as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'startGame',
        args: []
      });

      console.log('Start game transaction sent:', hash);

      // Wait for confirmation
      const { createPublicClient } = await import('viem');
      const publicClient = createPublicClient({
        chain: flowTestnet,
        transport: http('https://testnet.evm.nodes.onflow.org'),
      });

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: hash as `0x${string}`,
        timeout: 60000
      });

      console.log('Game started successfully! Block:', receipt.blockNumber);

      // Refresh arena data to get the updated state
      console.log('🔄 Refreshing arena data after game start...');
      await refetch();
      
      // If this was automated, verify the contract state
      if (isAutomated) {
        console.log('🔍 Automated start - verifying contract state...');
        
        // Wait for transaction to be confirmed (5 seconds)
        setTimeout(async () => {
          try {
            const currentRound = await arenaService.getCurrentRound(selectedArena.address);
            console.log(`📊 Contract current round: ${currentRound}`);
            
            if (currentRound === 0) {
              // Game was reset due to insufficient bets, notify backend to stop automation
              console.log('⚠️ Game was reset (insufficient bets) - stopping automation');
              
              const response = await fetch(`/api/arena/commands?battleId=${selectedArena.address}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: 'reset'
                })
              });
              
              if (response.ok) {
                const result = await response.json();
                console.log('✅ Automation stopped due to insufficient bets');
                console.log('ℹ️ To restart automation, you can reinitialize it manually');
                
                // Optionally show a notification to the user
                // You can add a toast notification here if you have a notification system
                alert('Automation stopped: Game was reset due to insufficient bets. You can restart automation manually if needed.');
              } else {
                console.error('❌ Failed to stop automation');
              }
            } else {
              console.log('✅ Game started successfully, round:', currentRound);
            }
          } catch (error) {
            console.error('❌ Error verifying contract state:', error);
          }
        }, 5000);
      }
      
      // If this was a manual start (not automated), close the modal
      // If automated (backend trigger), keep modal open to show battle interface
      if (!isAutomated) {
        console.log('📝 Manual start - closing modal');
        setIsModalOpen(false);
      } else {
        console.log('🤖 Automated start - keeping modal open and updating arena state');
        // Give a moment for refetch to complete, then update selectedArena with fresh data
        setTimeout(() => {
          // Search across all ranks for the updated arena
          const allArenas = [
            ...arenasWithDetails.UNRANKED,
            ...arenasWithDetails.BRONZE,
            ...arenasWithDetails.SILVER,
            ...arenasWithDetails.GOLD,
            ...arenasWithDetails.PLATINUM
          ];
          const updatedArenaWithDetails = allArenas.find(a => a.address === selectedArena.address);
          if (updatedArenaWithDetails) {
            const updatedArena = convertArenaWithDetailsToArena(updatedArenaWithDetails);
            if (updatedArena) {
              console.log('🆕 Updated arena state after game start:', updatedArena);
              setSelectedArena(updatedArena);
            }
          }
        }, 2000); // Give 2 seconds for the refetch to complete
      }

    } catch (error) {
      console.error('Failed to start game:', error);
      // Handle error - maybe show a toast notification
    }
  }, [selectedArena, refetch]); // Add refetch to dependency array

  const handleBet = async (yodha: 'ONE' | 'TWO') => {
    if (!betAmount || !selectedArena || !address) return;

    try {
      const betAmountNum = parseFloat(betAmount);

      // Validate betting amount is a multiple of base bet amount
      if (!isValidBettingAmount(betAmountNum, selectedArena.betAmount)) {
        const closest = getClosestValidBettingAmount(betAmountNum, selectedArena.betAmount);
        alert(`Invalid bet amount. Amount must be a multiple of ${selectedArena.betAmount} RANN.\nClosest valid amount: ${closest} RANN`);
        setBetAmount(closest.toString());
        return;
      }

      console.log(`Betting ${betAmountNum} RANN (${betAmountNum / selectedArena.betAmount}x multiplier) on Yodha ${yodha}`);

      // Import the wei conversion utility
      const { toWei } = await import('../../services/arenaService');
      const betAmountWei = toWei(betAmountNum);

      // Check current allowance
      console.log('Checking RANN token allowance...');
      const currentAllowance = await arenaService.getRannAllowance(address, selectedArena.address);

      // If allowance is insufficient, request approval
      if (currentAllowance < betAmountWei) {
        console.log(`Insufficient allowance. Current: ${currentAllowance.toString()}, Required: ${betAmountWei.toString()}`);
        console.log('Requesting RANN token approval...');

        // Request approval for a reasonable amount (e.g., 10x the bet amount to avoid frequent approvals)
        const approvalAmount = betAmountWei * BigInt(10);
        const approvalHash = await arenaService.approveRannTokens(selectedArena.address, approvalAmount);

        console.log('Approval transaction sent:', approvalHash);

        // Wait for approval confirmation
        await waitForTransactionReceipt(rainbowKitConfig, {
          hash: approvalHash as `0x${string}`,
          chainId: 545,
        });

        console.log('RANN token approval confirmed!');
      } else {
        console.log('Sufficient allowance available');
      }

      // Now place the bet
      let transactionHash: string;
      if (yodha === 'ONE') {
        transactionHash = await arenaService.betOnYodhaOneWithAmount(selectedArena.address, betAmountNum);
      } else {
        transactionHash = await arenaService.betOnYodhaTwoWithAmount(selectedArena.address, betAmountNum);
      }

      console.log('Bet transaction sent:', transactionHash);

      // Wait for confirmation
      await waitForTransactionReceipt(rainbowKitConfig, {
        hash: transactionHash as `0x${string}`,
        chainId: 545,
      });

      console.log('Bet confirmed!');

      // Note: In a real app you might want to update the arena state
      // For now, we'll just close the modal and reset the form

      setIsModalOpen(false);
      setBetAmount('');
      setSelectedYodha(null);
    } catch (error) {
      console.error('Failed to place bet:', error);
      // Handle error - maybe show a toast notification
    }
  };

  const handleInfluence = async (yodha: 'ONE' | 'TWO') => {
    if (!selectedArena || !address) return;

    try {
      console.log(`Influencing Yodha ${yodha}`);

      // Import the wei conversion utility
      const { toWei } = await import('../../services/arenaService');

      // Get the cost to influence
      const influenceCost = yodha === 'ONE' ? selectedArena.costToInfluenceYodhaOne : selectedArena.costToInfluenceYodhaTwo;
      const influenceCostWei = toWei(influenceCost);

      // Check current allowance
      console.log('Checking RANN token allowance for influence...');
      const currentAllowance = await arenaService.getRannAllowance(address, selectedArena.address);

      // If allowance is insufficient, request approval
      if (currentAllowance < influenceCostWei) {
        console.log(`Insufficient allowance for influence. Current: ${currentAllowance.toString()}, Required: ${influenceCostWei.toString()}`);
        console.log('Requesting RANN token approval...');

        // Request approval for a reasonable amount
        const approvalAmount = influenceCostWei * BigInt(5);
        const approvalHash = await arenaService.approveRannTokens(selectedArena.address, approvalAmount);

        console.log('Approval transaction sent:', approvalHash);

        // Wait for approval confirmation
        await waitForTransactionReceipt(rainbowKitConfig, {
          hash: approvalHash as `0x${string}`,
          chainId: 545,
        });

        console.log('RANN token approval confirmed!');
      } else {
        console.log('Sufficient allowance available for influence');
      }

      let transactionHash: string;
      if (yodha === 'ONE') {
        transactionHash = await arenaService.influenceYodhaOne(selectedArena.address);
      } else {
        transactionHash = await arenaService.influenceYodhaTwo(selectedArena.address);
      }

      console.log('Influence transaction sent:', transactionHash);

      // Wait for confirmation
      await waitForTransactionReceipt(rainbowKitConfig, {
        hash: transactionHash as `0x${string}`,
        chainId: 545,
      });

      console.log('Influence confirmed!');

      // Refresh arena data to get updated influence costs and other state changes
      console.log('🔄 Refreshing arena data after influence...');
      await refetch();

    } catch (error) {
      console.error('Failed to influence:', error);
      // Handle error - maybe show a toast notification
    }
  };

  const handleDefluence = async (yodha: 'ONE' | 'TWO') => {
    if (!selectedArena || !address) return;

    try {
      console.log(`Defluencing Yodha ${yodha}`);

      // Import the wei conversion utility
      const { toWei } = await import('../../services/arenaService');

      // Get the cost to defluence
      const defluenceCost = yodha === 'ONE' ? selectedArena.costToDefluenceYodhaOne : selectedArena.costToDefluenceYodhaTwo;
      const defluenceCostWei = toWei(defluenceCost);

      // Check current allowance
      console.log('Checking RANN token allowance for defluence...');
      const currentAllowance = await arenaService.getRannAllowance(address, selectedArena.address);

      // If allowance is insufficient, request approval
      if (currentAllowance < defluenceCostWei) {
        console.log(`Insufficient allowance for defluence. Current: ${currentAllowance.toString()}, Required: ${defluenceCostWei.toString()}`);
        console.log('Requesting RANN token approval...');

        // Request approval for a reasonable amount
        const approvalAmount = defluenceCostWei * BigInt(5);
        const approvalHash = await arenaService.approveRannTokens(selectedArena.address, approvalAmount);

        console.log('Approval transaction sent:', approvalHash);

        // Wait for approval confirmation
        await waitForTransactionReceipt(rainbowKitConfig, {
          hash: approvalHash as `0x${string}`,
          chainId: 545,
        });

        console.log('RANN token approval confirmed!');
      } else {
        console.log('Sufficient allowance available for defluence');
      }

      let transactionHash: string;
      if (yodha === 'ONE') {
        transactionHash = await arenaService.defluenceYodhaOne(selectedArena.address);
      } else {
        transactionHash = await arenaService.defluenceYodhaTwo(selectedArena.address);
      }

      console.log('Defluence transaction sent:', transactionHash);

      // Wait for confirmation
      await waitForTransactionReceipt(rainbowKitConfig, {
        hash: transactionHash as `0x${string}`,
        chainId: 545,
      });

      console.log('Defluence confirmed!');

      // Refresh arena data to get updated defluence costs and other state changes
      console.log('🔄 Refreshing arena data after defluence...');
      await refetch();

    } catch (error) {
      console.error('Failed to defluence:', error);
      // Handle error - maybe show a toast notification
    }
  };

  const handleInitializeArena = async () => {
    if (!yodhaOneNFTId || !yodhaTwoNFTId || !selectedArena) return;

    try {
      setIsInitializing(true);
      setInitializationError(null);

      console.log(`Initializing arena ${selectedArena.address} with Yodha One: ${yodhaOneNFTId}, Yodha Two: ${yodhaTwoNFTId}`);

      // Call the smart contract function
      const transactionHash = await arenaService.initializeGame(
        selectedArena.address,
        parseInt(yodhaOneNFTId),
        parseInt(yodhaTwoNFTId)
      );

      console.log('Transaction sent:', transactionHash);

      // Wait for transaction confirmation
      const receipt = await waitForTransactionReceipt(rainbowKitConfig, {
        hash: transactionHash as `0x${string}`,
        chainId: 545,
      });

      console.log('Transaction confirmed:', receipt);

      // Fetch updated arena details with Yodha metadata
      const updatedArenaDetails = await arenaService.getArenaDetails(selectedArena.address);

      // Update the arena object with new data
      const updatedArena: Arena = {
        ...selectedArena,
        state: 'INITIALIZED' as ArenaState,
        costToInfluence: updatedArenaDetails.costToInfluence,
        costToDefluence: updatedArenaDetails.costToDefluence,
        betAmount: updatedArenaDetails.betAmount
      };

      // Add Yodha details if they were fetched
      if (updatedArenaDetails.yodhaOneDetails && updatedArenaDetails.yodhaTwoDetails) {
        updatedArena.yodhaOne = {
          id: updatedArenaDetails.yodhaOneNFTId,
          name: updatedArenaDetails.yodhaOneDetails.name,
          image: updatedArenaDetails.yodhaOneDetails.image,
          rank: activeRank,
          strength: updatedArenaDetails.yodhaOneDetails.traits.strength ?? 50,
          defense: updatedArenaDetails.yodhaOneDetails.traits.defence ?? 50,
          charisma: updatedArenaDetails.yodhaOneDetails.traits.charisma ?? 50,
          wit: updatedArenaDetails.yodhaOneDetails.traits.wit ?? 50,
          luck: updatedArenaDetails.yodhaOneDetails.traits.luck ?? 50,
          owner: '0x000...000',
          winnings: 0
        };

        updatedArena.yodhaTwo = {
          id: updatedArenaDetails.yodhaTwoNFTId,
          name: updatedArenaDetails.yodhaTwoDetails.name,
          image: updatedArenaDetails.yodhaTwoDetails.image,
          rank: activeRank,
          strength: updatedArenaDetails.yodhaTwoDetails.traits.strength ?? 50,
          defense: updatedArenaDetails.yodhaTwoDetails.traits.defence ?? 50,
          charisma: updatedArenaDetails.yodhaTwoDetails.traits.charisma ?? 50,
          wit: updatedArenaDetails.yodhaTwoDetails.traits.wit ?? 50,
          luck: updatedArenaDetails.yodhaTwoDetails.traits.luck ?? 50,
          owner: '0x000...000',
          winnings: 0
        };
      }

      setSelectedArena(updatedArena);

      // Refresh the arena list to show updated state in the cards
      await refetch();

      // Reset form
      setYodhaOneNFTId('');
      setYodhaTwoNFTId('');

      // Initialize automation backend
      if (arenaSync?.initializeBattle) {
        console.log('Initializing automation backend...');
        try {
          await arenaSync.initializeBattle(
            updatedArenaDetails.yodhaOneNFTId, 
            updatedArenaDetails.yodhaTwoNFTId
          );
          console.log('Backend automation initialized successfully!');
        } catch (backendError) {
          console.error('Backend automation initialization failed:', backendError);
          
          // Extract the helpful error message from the backend
          const errorMessage = backendError instanceof Error ? backendError.message : 'Unknown error';
          
          // Show the detailed error message to the user
          setInitializationError(
            `Backend automation setup failed:\n\n${errorMessage}\n\nThe arena is still initialized and you can use manual controls.`
          );
          
          // Log additional context for debugging
          console.warn('The arena initialization succeeded, but backend automation failed.');
          console.warn('Manual controls are still available for this arena.');
        }
      }

      console.log('Arena initialized successfully!');

    } catch (error) {
      console.error('Failed to initialize arena:', error);
      setInitializationError(
        error instanceof Error
          ? error.message
          : 'Failed to initialize arena. Please try again.'
      );
    } finally {
      setIsInitializing(false);
    }
  };

  const handleNextRound = useCallback(async () => {
    console.log('🎯 handleNextRound() function called!');
    
    if (!selectedArena || !address) {
      console.log('❌ handleNextRound: Missing selectedArena or address');
      return;
    }

    try {
      console.log('⚔️ Starting next round process...');
      
      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Next round process timed out')), 180000); // Increased to 180 seconds
      });

      const nextRoundProcess = async () => {
        console.log('🤖 Generating next round moves with AI...');

        // Fetch current battle data from contract
        const currentRound = await arenaService.getCurrentRound(selectedArena.address);
        const damageOnYodhaOne = await arenaService.getDamageOnYodhaOne(selectedArena.address);
        const damageOnYodhaTwo = await arenaService.getDamageOnYodhaTwo(selectedArena.address);

        console.log('📊 Battle data:', { currentRound, damageOnYodhaOne, damageOnYodhaTwo });

        // Get Yodha details with personality and traits
        const yodhaOneDetails = selectedArena.yodhaOne;
        const yodhaTwoDetails = selectedArena.yodhaTwo;

        if (!yodhaOneDetails || !yodhaTwoDetails) {
          console.error('Missing Yodha details for AI generation');
          return;
        }

      // Safely handle adjectives and knowledge_areas - they might be arrays or strings
      const getAdjectives = (yodha: { adjectives?: string | string[] }) => {
        if (!yodha?.adjectives) return ['brave', 'fierce'];
        if (Array.isArray(yodha.adjectives)) return yodha.adjectives;
        if (typeof yodha.adjectives === 'string') return yodha.adjectives.split(',').map((s: string) => s.trim());
        return ['brave', 'fierce'];
      };

      const getKnowledgeAreas = (yodha: { knowledge_areas?: string | string[] }) => {
        if (!yodha?.knowledge_areas) return ['combat', 'strategy'];
        if (Array.isArray(yodha.knowledge_areas)) return yodha.knowledge_areas;
        if (typeof yodha.knowledge_areas === 'string') return yodha.knowledge_areas.split(',').map((s: string) => s.trim());
        return ['combat', 'strategy'];
      };

      // Create the JSON structure similar to KurukshetraAiPrompt.json
      const battlePrompt = {
        current_round: currentRound,
        agent_1: {
          personality: {
            adjectives: getAdjectives(yodhaOneDetails),
            knowledge_areas: getKnowledgeAreas(yodhaOneDetails)
          },
          traits: {
            Strength: Math.round(yodhaOneDetails.strength * 100), // Convert back to contract format
            Wit: Math.round(yodhaOneDetails.wit * 100),
            Charisma: Math.round(yodhaOneDetails.charisma * 100),
            Defence: Math.round(yodhaOneDetails.defense * 100),
            Luck: Math.round(yodhaOneDetails.luck * 100) // Using personality as luck
          },
          total_damage_received: damageOnYodhaOne
        },
        agent_2: {
          personality: {
            adjectives: getAdjectives(yodhaTwoDetails),
            knowledge_areas: getKnowledgeAreas(yodhaTwoDetails)
          },
          traits: {
            Strength: Math.round(yodhaTwoDetails.strength * 100), // Convert back to contract format
            Wit: Math.round(yodhaTwoDetails.wit * 100),
            Charisma: Math.round(yodhaTwoDetails.charisma * 100),
            Defence: Math.round(yodhaTwoDetails.defense * 100),
            Luck: Math.round(yodhaTwoDetails.luck * 100) // Using personality as luck
          },
          total_damage_received: damageOnYodhaTwo
        },
        moveset: [
          "strike",
          "taunt",
          "dodge",
          "recover",
          "special_move"
        ]
      };

      console.log('Battle prompt data:', battlePrompt);

      // Pass only the JSON directly as the prompt since AI is configured to output JSON
      const promptString = JSON.stringify(battlePrompt);

      // Use the pre-made auth token from environment variable
      const authKey = process.env.NEXT_PUBLIC_AUTH_KEY;
      if (!authKey) {
        console.error('NEXT_PUBLIC_AUTH_KEY not found in environment variables');
        return;
      }

      let authData;
      try {
        authData = JSON.parse(authKey);
      } catch (error) {
        console.error('Failed to parse NEXT_PUBLIC_AUTH_KEY:', error);
        return;
      }

      // Convert auth to the format expected by the API (matching chaavani pattern)
      const authForApi = {
        signature: authData.signature,
        account_id: authData.account_id,
        public_key: authData.public_key,
        message: authData.message,
        nonce: authData.nonce,
        recipient: authData.recipient,
        callback_url: authData.callback_url
      };

      // Call our backend API route for NEAR AI move selection
      console.log('🕐 Starting NEAR AI API call at:', new Date().toLocaleTimeString());
      console.log('Sending request to /api/near-ai-moves with:', {
        auth: authForApi,
        prompt: promptString,
        assistantId: near_agent_move_selecter
      });

      const response = await fetch('/api/near-ai-moves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth: authForApi,
          prompt: promptString,
          assistantId: near_agent_move_selecter // Use the move selector from constants
        })
      });

      console.log('🕐 NEAR AI API response received at:', new Date().toLocaleTimeString());
      console.log('Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', errorText);
        throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Unknown error from NEAR AI move selector');
      }

      console.log("NEAR AI Move Selector Response:", data.response);      // Parse the AI response to extract moves and execute battle
      try {
        const aiResponse = JSON.parse(data.response);
        console.log('Parsed AI response:', aiResponse);
        
        // Handle multiple possible AI response formats
        let agent1Move: string | undefined;
        let agent2Move: string | undefined;
        
        // Format 1: {"agent_1": {"move": "strike"}, "agent_2": {"move": "dodge"}}
        if (aiResponse.agent_1?.move && aiResponse.agent_2?.move) {
          agent1Move = aiResponse.agent_1.move;
          agent2Move = aiResponse.agent_2.move;
        }
        // Format 2: {"agent_1_move": "strike", "agent_2_move": "dodge"}
        else if (aiResponse.agent_1_move && aiResponse.agent_2_move) {
          agent1Move = aiResponse.agent_1_move;
          agent2Move = aiResponse.agent_2_move;
        }
        // Format 3: {"moves": {"agent_1": "strike", "agent_2": "taunt"}}
        else if (aiResponse.moves?.agent_1 && aiResponse.moves?.agent_2) {
          agent1Move = aiResponse.moves.agent_1;
          agent2Move = aiResponse.moves.agent_2;
        }
        // Format 4: {"agent_1": "taunt", "agent_2": "strike"} (flat format)
        else if (typeof aiResponse.agent_1 === 'string' && typeof aiResponse.agent_2 === 'string') {
          agent1Move = aiResponse.agent_1;
          agent2Move = aiResponse.agent_2;
        }
        // Format 5: {"agent_1.Move": "dodge", "agent_2.Move": "taunt"} (dotted property format)
        else if (aiResponse['agent_1.Move'] && aiResponse['agent_2.Move']) {
          agent1Move = aiResponse['agent_1.Move'];
          agent2Move = aiResponse['agent_2.Move'];
        }
        // Format 6: {"agent_moves": {"agent_1": "taunt", "agent_2": "recover"}} (nested agent_moves format)
        else if (aiResponse.agent_moves && aiResponse.agent_moves.agent_1 && aiResponse.agent_moves.agent_2) {
          agent1Move = aiResponse.agent_moves.agent_1;
          agent2Move = aiResponse.agent_moves.agent_2;
        }
        
        if (agent1Move && agent2Move) {
          console.log(`Agent 1 move: ${agent1Move}, Agent 2 move: ${agent2Move}`);
          
          // Execute the battle with the AI-selected moves
          await executeBattleMoves({
            agent_1: { move: agent1Move },
            agent_2: { move: agent2Move }
          });
        } else {
          console.error('Invalid AI response format - missing moves');
          console.error('Expected format 1: {"agent_1": {"move": "strike"}, "agent_2": {"move": "dodge"}}');
          console.error('Expected format 2: {"agent_1_move": "strike", "agent_2_move": "dodge"}');
          console.error('Expected format 3: {"moves": {"agent_1": "strike", "agent_2": "taunt"}}');
          console.error('Expected format 4: {"agent_1": "taunt", "agent_2": "strike"}');
          console.error('Expected format 5: {"agent_1.Move": "dodge", "agent_2.Move": "taunt"}');
          console.error('Expected format 6: {"agent_moves": {"agent_1": "taunt", "agent_2": "recover"}}');
          console.error('Received:', aiResponse);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        console.log('Raw response that failed to parse:', data.response);
      }
      };

      // Execute with timeout protection
      await Promise.race([nextRoundProcess(), timeoutPromise]);
      console.log('✅ Next round process completed successfully');

    } catch (error) {
      console.error('Failed to generate next round moves:', error);
      // Continue anyway - don't block the automation
    }
  }, [selectedArena, address]);

  // Command polling for backend automation - checks for startGame and nextRound commands
  useEffect(() => {
    if (!selectedArena) {
      return;
    }

    console.log('🎯 Starting command polling for arena:', selectedArena.address);

    const pollForCommands = async () => {
      try {
        const response = await fetch(`/api/arena/commands?battleId=${selectedArena.address}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📡 Poll response:', data);
          
          if (data.hasCommand && data.command) {
            console.log('🤖 Received automation command:', data.command);
            
            switch (data.command.action) {
              case 'startGame':
                console.log('🎮 Backend triggered START GAME - calling handleStartGame()');
                await handleStartGame(true); // Pass true for isAutomated
                console.log('✅ handleStartGame() completed');
                break;
                
              case 'nextRound':
                console.log(`⚔️ Backend triggered NEXT ROUND ${data.command.round} - calling handleNextRound()`);
                await handleNextRound();
                console.log('✅ handleNextRound() completed');
                break;
                
              default:
                console.log('⚠️ Unknown command action:', data.command.action);
            }
          } else {
            console.log('📡 No commands available, current state:', data.gameState);
          }
        } else {
          console.warn('Failed to poll for commands:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error polling for commands:', error);
      }
    };

    // Poll every 2 seconds when arena is selected
    const pollInterval = setInterval(pollForCommands, 2000);
    
    // Initial poll
    pollForCommands();
    
    // Cleanup on unmount or when arena changes
    return () => {
      console.log('🛑 Stopping command polling for arena:', selectedArena.address);
      clearInterval(pollInterval);
    };
  }, [selectedArena, handleStartGame, handleNextRound]);

  // Function to execute battle moves with AI-selected moves

  // Event listeners for battle events using wagmi
  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'RoundOver',
    onLogs(logs) {
      console.log('RoundOver event received:', logs);
      // Refresh arena data when round is over
      refetch();
    },
  });

  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'GameFinished',
    onLogs(logs) {
      console.log('GameFinished event received:', logs);
      
      // Parse the game finished event to determine winner
      if (logs && logs.length > 0 && selectedArena) {
        // The event contains winner information
        setTimeout(async () => {
          try {
            // Refetch arena data to get final state
            await refetch();
            
            if (selectedArena) {
              // Determine winner based on damage (lower damage wins, or use winner field if available)
              const winnerIsYodhaOne = selectedArena.winner === 'ONE' || 
                (selectedArena.winner === undefined && selectedArena.yodhaOneDamage < selectedArena.yodhaTwoDamage);
              const winnerYodha = winnerIsYodhaOne ? selectedArena.yodhaOne : selectedArena.yodhaTwo;
              const winnerName = winnerYodha?.name || `Yodha #${winnerYodha?.id || 'Unknown'}`;
              
              // Show winner display
              setWinnerDisplay({
                isVisible: true,
                winnerName,
                winnerNFTId: winnerYodha?.id?.toString() || '0'
              });
              
              // Hide winner display after 10 seconds
              setTimeout(() => {
                setWinnerDisplay(null);
              }, 10000);
            }
          } catch (error) {
            console.error('Error showing winner:', error);
          }
        }, 500); // Small delay to ensure arena state is updated
      }
      
      // Refresh arena data when game is finished
      refetch();
      console.log('Battle has ended!');
    },
  });

  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'GameStarted',
    onLogs(logs) {
      console.log('GameStarted event received:', logs);
      // Refresh arena data when game starts
      refetch();
      console.log('Battle has started!');
    },
  });

  // Listen for influence events to refresh costs
  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'YodhaOneInfluenced',
    onLogs(logs) {
      console.log('YodhaOneInfluenced event received:', logs);
      // Refresh arena data to get updated influence costs
      refetch();
    },
  });

  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'YodhaOneDefluenced',
    onLogs(logs) {
      console.log('YodhaOneDefluenced event received:', logs);
      // Refresh arena data to get updated defluence costs
      refetch();
    },
  });

  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'YodhaTwoInfluenced',
    onLogs(logs) {
      console.log('YodhaTwoInfluenced event received:', logs);
      // Refresh arena data to get updated influence costs
      refetch();
    },
  });

  useWatchContractEvent({
    address: selectedArena?.address as `0x${string}`,
    abi: KurukshetraAbi,
    eventName: 'YodhaTwoDefluenced',
    onLogs(logs) {
      console.log('YodhaTwoDefluenced event received:', logs);
      // Refresh arena data to get updated defluence costs
      refetch();
    },
  });

  // Show loading state until component mounts to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <div className="battlefield-bg w-full h-full"></div>
          <div
            className="absolute inset-0"
            style={ {
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            } }
          ></div>
        </div>
        <div className="text-center relative z-10">
          <div
            className="p-8 max-w-md"
            style={ {
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            } }
          >
            <h1
              className="text-2xl text-orange-400 mb-4 arcade-glow"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              KURUKSHETRA
            </h1>
            <p
              className="text-orange-400 mb-6"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              Loading the legendary battlefield...
            </p>
            <div
              className="text-orange-400 text-sm"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              ⚡ Initializing...
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <div className="battlefield-bg w-full h-full"></div>
          <div
            className="absolute inset-0"
            style={ {
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            } }
          ></div>
        </div>
        <div className="text-center relative z-10">
          <div
            className="p-8 max-w-md"
            style={ {
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            } }
          >
            <h1
              className="text-2xl text-orange-400 mb-4 arcade-glow"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              KURUKSHETRA
            </h1>
            <p
              className="text-orange-400 mb-6"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              Connect your wallet to enter the legendary battlefield and witness epic Yodha battles!
            </p>
            <div
              className="text-orange-400 text-sm"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              ⚠️ Wallet connection required
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image with subtle overlay */}
      <div className="fixed inset-0 -z-10">
        <div className="battlefield-bg w-full h-full"></div>
        {/* Very subtle black overlay to improve readability */}
        <div
          className="absolute inset-0"
          style={ {
            backgroundColor: 'rgba(0, 0, 0, 0.175)',
            zIndex: 1
          } }
        ></div>
      </div>

      {/* Epic Background Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Geometric Battle Lines */}
        <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-600 to-transparent opacity-30"></div>
        <div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1
            className="text-4xl md:text-6xl text-orange-400 mb-6 tracking-widest arcade-glow"
            style={ {
              fontFamily: 'Press Start 2P, monospace'
            } }
          >
            KURUKSHETRA
          </h1>
          <div
            className="arcade-border p-4 mx-auto max-w-3xl"
            style={ {
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '2px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            } }
          >
            <p
              className="text-orange-400 text-sm md:text-base tracking-wide arcade-glow"
              style={ {
                fontFamily: 'Press Start 2P, monospace'
              } }
            >
              THE ULTIMATE BATTLEFIELD WHERE LEGENDS CLASH
            </p>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div
            className="p-2 flex gap-2"
            style={ {
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '20px'
            } }
          >
            { (['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as RankCategory[]).map((rank) => (
              <button
                key={ rank }
                onClick={ () => setActiveRank(rank) }
                className={ `px-6 py-3 text-xs tracking-wide transition-all duration-300 ${activeRank === rank
                    ? 'arcade-button'
                    : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
                  }` }
                style={ {
                  fontFamily: 'Press Start 2P, monospace',
                  borderRadius: '12px',
                  background: activeRank === rank ? undefined : 'rgba(0, 0, 0, 0.3)'
                } }
              >
                { rank }
              </button>
            )) }
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
          {/* Arena List */}
          <div className="space-y-6">
            { isLoading ? (
              <div className="text-center py-12">
                <div
                  className="p-8"
                  style={ {
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                    border: '3px solid #ff8c00',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                    borderRadius: '24px'
                  } }
                >
                  <div
                    className="text-orange-400 text-lg mb-4"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Loading arenas...
                  </div>
                  <div
                    className="text-orange-400"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    ⚡ Fetching battlefield data...
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div
                  className="p-8"
                  style={ {
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                    border: '3px solid #ff8c00',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                    borderRadius: '24px'
                  } }
                >
                  <div
                    className="text-red-400 text-lg mb-4"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Error loading arenas
                  </div>
                  <p
                    className="text-orange-400 mb-4"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    { error }
                  </p>
                  <button
                    onClick={ () => refetch() }
                    className="arcade-button text-xs px-4 py-2"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    RETRY
                  </button>
                </div>
              </div>
            ) : currentRankArenasWithDetails.length > 0 ? (
              currentRankArenasWithDetails.map((arenaWithDetails, index) => (
                <EnhancedArenaCard
                  key={ arenaWithDetails.address }
                  arenaWithDetails={ arenaWithDetails }
                  ranking={ activeRank }
                  index={ index }
                  onClick={ () => handleEnhancedArenaClick(arenaWithDetails) }
                />
              ))
            ) : (
              <div className="text-center py-12">
                <div
                  className="p-8"
                  style={ {
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                    border: '3px solid #ff8c00',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                    borderRadius: '24px'
                  } }
                >
                  <div
                    className="text-orange-400 text-lg mb-4"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    No arenas found for { activeRank } rank
                  </div>
                  <p
                    className="text-orange-400"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Check other ranks or create a new arena
                  </p>
                </div>
              </div>
            ) }
          </div>
        </div>

        {/* Arena Detail Modal */}
        { selectedArena && (
          <ArenaModal
            arena={ selectedArena }
            isOpen={ isModalOpen }
            onClose={ handleCloseModal }
            onBet={ handleBet }
            onInfluence={ handleInfluence }
            onDefluence={ handleDefluence }
                       onInitialize={ handleInitializeArena }
            onStartGame={ () => handleStartGame(false) } // Manual start from modal
            onNextRound={ handleNextRound }
            betAmount={ betAmount }
            setBetAmount={ setBetAmount }
            selectedYodha={ selectedYodha }
            setSelectedYodha={ setSelectedYodha }
            yodhaOneNFTId={ yodhaOneNFTId }
            setYodhaOneNFTId={ setYodhaOneNFTId }
            yodhaTwoNFTId={ yodhaTwoNFTId }
            setYodhaTwoNFTId={ setYodhaTwoNFTId }
            isInitializing={ isInitializing }
            initializationError={ initializationError }
            battleNotification={ battleNotification }
            winnerDisplay={ winnerDisplay }
            arenaSync={ arenaSync }
            manualStartGame={ manualStartGame }
            manualNextRound={ manualNextRound }
          />
        ) }
      </div>
    </div>
  );
}

// Unused component - removed for lint cleanup
// const CreateArenaForm = () => { ... }

// Arena Detail Modal Component  
const ArenaModal = ({
  arena,
  isOpen,
  onClose,
  onBet,
  onInfluence,
  onDefluence,
  onInitialize,
  onStartGame,
  onNextRound,
  betAmount,
  setBetAmount,
  selectedYodha,
  setSelectedYodha,
  yodhaOneNFTId,
  setYodhaOneNFTId,
  yodhaTwoNFTId,
  setYodhaTwoNFTId,
  isInitializing = false,
  initializationError = null,
  battleNotification,
  winnerDisplay,
  arenaSync,
  manualStartGame,
  manualNextRound
}: {
  arena: Arena;
  isOpen: boolean;
  onClose: () => void;
  onBet: (yodha: 'ONE' | 'TWO') => void;
  onInfluence: (yodha: 'ONE' | 'TWO') => void;
  onDefluence: (yodha: 'ONE' | 'TWO') => void;
  onInitialize: () => void;
  onStartGame: () => void;
  onNextRound: () => void;
  betAmount: string;
  setBetAmount: (amount: string) => void;
  selectedYodha: 'ONE' | 'TWO' | null;
  setSelectedYodha: (yodha: 'ONE' | 'TWO' | null) => void;
  yodhaOneNFTId: string;
  setYodhaOneNFTId: (id: string) => void;
  yodhaTwoNFTId: string;
  setYodhaTwoNFTId: (id: string) => void;
  isInitializing?: boolean;
  initializationError?: string | null;
  battleNotification?: BattleNotification | null;
  winnerDisplay?: {
    isVisible: boolean;
    winnerName: string;
    winnerNFTId: string;
  } | null;
  arenaSync?: any;
  manualStartGame?: () => Promise<void>;
  manualNextRound?: () => Promise<void>;
}) => {
  if (!isOpen) return null;

  const totalYodhaOneBets = arena.playerOneBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalYodhaTwoBets = arena.playerTwoBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPot = totalYodhaOneBets + totalYodhaTwoBets;
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div
        className="max-w-7xl w-full max-h-[90vh] overflow-y-auto"
        style={ {
          background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
          border: '3px solid #ff8c00',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
          borderRadius: '24px'
        } }
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2
              className="text-2xl text-orange-400 arcade-glow"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              { arena.rank } ARENA
            </h2>
            <button
              onClick={ onClose }
              className="text-orange-400 hover:text-orange-300 text-2xl transition-colors"
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              ×
            </button>
          </div>

          {/* Battle State */}
          <div className="text-center mb-6">
            <div
              className={ `${getStateColor(arena.state)} text-white text-sm px-4 py-2 rounded-lg inline-block` }
              style={ { fontFamily: 'Press Start 2P, monospace' } }
            >
              { arena.state.replace('_', ' ') }
            </div>
            { arena.state === 'BATTLE_ONGOING' && (
              <div className="mt-2">
                <div
                  className="text-orange-400"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  Round { arena.currentRound }/{ arena.maxRounds }
                </div>
                <div
                  className="text-xs text-yellow-300 mt-2 max-w-md mx-auto leading-relaxed"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  Note: Players should only place bets after the round counter updates. NEAR AI's response, blockchain validation, and their synchronization with the timer above can sometimes vary.
                </div>
                <div
                  className="text-sm text-blue-400 mt-1"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  Phase: { arena.battlePhase.replace('_', ' ') }
                </div>
              </div>
            ) }
          </div>

          {/* Automation Status - Show when automation is active */}
          {arenaSync?.gameState && (
            <div className="mb-6">
              <GameTimer
                gameState={arenaSync.gameState.gameState || 'idle'}
                timeRemaining={arenaSync.gameState.timeRemaining || 0}
                totalTime={arenaSync.gameState.totalTime || 0}
              />
              
              {/* Manual Override Buttons */}
              {(arenaSync.gameState.gameState === 'betting' || arenaSync.gameState.gameState === 'playing') && (
                <div className="mt-4 flex gap-4 justify-center">
                  {arenaSync.gameState.gameState === 'betting' && manualStartGame && (
                    <div className="text-center">
                      <button
                        onClick={manualStartGame}
                        className="arcade-button px-4 py-2 text-sm"
                        style={{ fontFamily: 'Press Start 2P, monospace' }}
                      >
                        START NOW
                      </button>
                      <div
                        className="text-xs text-red-300 mt-2 max-w-xs mx-auto leading-relaxed"
                        style={{ fontFamily: 'Press Start 2P, monospace' }}
                      >
                        This button is only to be used if the automation mechanism fails (timer gets to 0 and hangs there, or the timer is not visible). This is a manual override button and must not be used unless the above condition occurs, as this can break automation for this battle.
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Automation Status */}
              <div className="mt-2 text-center">
                <div
                  className="text-xs text-green-400"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  🤖 AUTOMATION ACTIVE
                </div>
                {arenaSync.error && (
                  <div
                    className="text-xs text-red-400 mt-1"
                    style={{ fontFamily: 'Press Start 2P, monospace' }}
                  >
                    ⚠️ {arenaSync.error}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Arena Initialization Form - Only for EMPTY arenas and when not showing winner */}
          { arena.state === 'EMPTY' && (!winnerDisplay || !winnerDisplay.isVisible) && (
            <div
              className="p-6 mb-6"
              style={ {
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '2px solid #ff8c00',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                borderRadius: '20px'
              } }
            >
              <h3
                className="text-orange-400 text-lg mb-6 text-center arcade-glow"
                style={ { fontFamily: 'Press Start 2P, monospace' } }
              >
                Initialize Arena
              </h3>
              
              <div className="grid gap-4">
                <div>
                  <label
                    className="block text-orange-400 text-sm mb-3"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Yodha One NFT ID
                  </label>
                  <input
                    type="number"
                    value={ yodhaOneNFTId }
                    onChange={ (e) => setYodhaOneNFTId(e.target.value) }
                    className="w-full p-3 rounded text-white"
                    style={ {
                      background: 'rgba(120, 160, 200, 0.1)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontFamily: 'Press Start 2P, monospace'
                    } }
                    placeholder="Enter NFT ID for Yodha One"
                    min="1"
                  />
                </div>

                <div>
                  <label
                    className="block text-orange-400 text-sm mb-3"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Yodha Two NFT ID
                  </label>
                  <input
                    type="number"
                    value={ yodhaTwoNFTId }
                    onChange={ (e) => setYodhaTwoNFTId(e.target.value) }
                    className="w-full p-3 rounded text-white"
                    style={ {
                      background: 'rgba(120, 160, 200, 0.1)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontFamily: 'Press Start 2P, monospace'
                    } }
                    placeholder="Enter NFT ID for Yodha Two"
                    min="1"
                  />
                </div>
              </div>

              <div className="text-center space-y-4">
                <div
                  className="text-sm text-orange-400"
                  style={ { fontFamily: 'Press Start 2P, monospace' } }
                >
                  Arena Details: <span className="text-orange-400">{ arena.rank }</span> •
                  Bet Amount: <span className="text-orange-400">{ arena.betAmount } RANN</span>
                </div>

                { initializationError && (
                  <div
                    className="text-red-400 text-xs p-3 rounded"
                    style={ {
                      fontFamily: 'Press Start 2P, monospace',
                      background: 'rgba(255, 0, 0, 0.1)',
                      border: '1px solid rgba(255, 0, 0, 0.3)',
                      whiteSpace: 'pre-line',
                      lineHeight: '1.6'
                    } }
                  >
                    ⚠️ { initializationError }
                  </div>
                ) }

                <button
                  onClick={ onInitialize }
                  className={ `arcade-button px-8 py-3 ${isInitializing ? 'opacity-50 cursor-not-allowed' : ''}` }
                  disabled={ !yodhaOneNFTId || !yodhaTwoNFTId || isInitializing }
                  style={ {
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px'
                  } }
                >
                  { isInitializing ? 'INITIALIZING...' : 'INITIALIZE ARENA' }
                </button>

                { isInitializing && (
                  <div
                    className="text-orange-400 text-xs"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    ⚡ Transaction in progress... Please wait.
                  </div>
                ) }

                { (!yodhaOneNFTId || !yodhaTwoNFTId) && !isInitializing && (
                  <div
                    className="text-red-400 text-xs"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Please enter both Yodha NFT IDs to initialize the arena
                  </div>
                ) }
              </div>
            </div>
          ) }

          {/* Winner Display - Shows for 10 seconds after battle ends */}
          {winnerDisplay && winnerDisplay.isVisible && (
            <div className="mb-6 p-8 rounded-lg text-center bg-gradient-to-r from-yellow-500/30 to-orange-500/30 border-4 border-yellow-400 shadow-2xl">
              <div className="animate-bounce">
                <div
                  className="text-3xl text-yellow-400 mb-4"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  🏆 VICTORY! 🏆
                </div>
                <div
                  className="text-2xl text-orange-400 mb-2"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  {winnerDisplay.winnerName}
                </div>
                <div
                  className="text-lg text-yellow-300"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  WINS THE BATTLE!
                </div>
                <div
                  className="text-sm text-gray-400 mt-4"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  #{winnerDisplay.winnerNFTId}
                </div>
              </div>
            </div>
          )}

          {/* Battle Notification Message */}
          {battleNotification && battleNotification.isVisible && (
            <div className="mb-6 p-4 rounded-lg text-center animate-pulse bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-orange-400">
              <div
                className="text-lg text-orange-400 mb-2"
                style={{ fontFamily: 'Press Start 2P, monospace' }}
              >
                🎯 BATTLE MOVES! 🎯
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div
                  className="text-sm text-blue-400"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  {battleNotification.yodhaOneName}
                  <br />
                  <span className="text-yellow-400">used {battleNotification.yodhaOneMove}</span>
                  {battleNotification.yodhaOneHitStatus && battleNotification.yodhaOneHitStatus !== 'PENDING' && (
                    <br />
                  )}
                  {battleNotification.yodhaOneHitStatus === 'HIT' && (
                    <span className="text-green-400 text-xs">✅ HIT!</span>
                  )}
                  {battleNotification.yodhaOneHitStatus === 'MISS' && (
                    <span className="text-red-400 text-xs">❌ MISS</span>
                  )}
                  {battleNotification.yodhaOneHitStatus === 'PENDING' && (
                    <span className="text-gray-400 text-xs animate-pulse">⏳ ...</span>
                  )}
                </div>
                <div
                  className="text-xl text-orange-400"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  VS
                </div>
                <div
                  className="text-sm text-blue-400"
                  style={{ fontFamily: 'Press Start 2P, monospace' }}
                >
                  {battleNotification.yodhaTwoName}
                  <br />
                  <span className="text-yellow-400">used {battleNotification.yodhaTwoMove}</span>
                  {battleNotification.yodhaTwoHitStatus && battleNotification.yodhaTwoHitStatus !== 'PENDING' && (
                    <br />
                  )}
                  {battleNotification.yodhaTwoHitStatus === 'HIT' && (
                    <span className="text-green-400 text-xs">✅ HIT!</span>
                  )}
                  {battleNotification.yodhaTwoHitStatus === 'MISS' && (
                    <span className="text-red-400 text-xs">❌ MISS</span>
                  )}
                  {battleNotification.yodhaTwoHitStatus === 'PENDING' && (
                    <span className="text-gray-400 text-xs animate-pulse">⏳ ...</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Yodhas Display */}
          { arena.yodhaOne && arena.yodhaTwo && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Yodha One */}
              <div
                className="space-y-4 p-4"
                style={ {
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                  borderRadius: '20px'
                } }
              >
                <div className="text-center">
                  <h3
                    className="text-orange-400 mb-2 arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Yodha One
                  </h3>
                  <div
                    className="w-32 h-32 mx-auto mb-2 overflow-hidden rounded aspect-square"
                    style={ {
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    } }
                  >
                    <img
                      src={ arena.yodhaOne.image }
                      alt={ arena.yodhaOne.name }
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4
                    className="text-orange-400 font-bold arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    { arena.yodhaOne.name }
                  </h4>
                  <div
                    className={ `${getRankColor(arena.yodhaOne.rank)} inline-block px-2 py-1 rounded mt-2` }
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    { arena.yodhaOne.rank }
                  </div>
                </div>

                {/* Traits */}
                <div className="space-y-2">
                  <div
                    className="text-sm text-orange-400 mb-2"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    TRAITS
                  </div>
                  <TraitBar label="Strength" value={ arena.yodhaOne.strength } />
                  <TraitBar label="Defense" value={ arena.yodhaOne.defense } />
                  <TraitBar label="Charisma" value={ arena.yodhaOne.charisma } />
                  <TraitBar label="Wit" value={ arena.yodhaOne.wit } />
                  <TraitBar label="Luck" value={ arena.yodhaOne.luck } />
                </div>

                {/* Action Buttons */}
                { arena.state === 'BATTLE_ONGOING' && (
                  <div className="space-y-2">
                    <button
                      onClick={ () => onInfluence('ONE') }
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      <TrendingUp className="w-4 h-4 mr-2 inline" />
                      INFLUENCE ({ arena.costToInfluenceYodhaOne } RANN)
                    </button>
                    <button
                      onClick={ () => onDefluence('ONE') }
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      <TrendingDown className="w-4 h-4 mr-2 inline" />
                      DEFLUENCE ({ arena.costToDefluenceYodhaOne } RANN)
                    </button>
                  </div>
                ) }
              </div>

              {/* Battle Center */}
              <div className="space-y-6">
                {/* VS */}
                <div className="text-center">
                  <div className="text-4xl text-red-500 mb-4">⚔️</div>
                  <div
                    className="text-xl text-orange-400 arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    VS
                  </div>
                </div>

                {/* Last Moves Display */}
                { arena.lastMoves && arena.state === 'BATTLE_ONGOING' && (
                  <div
                    className="p-4 text-center"
                    style={ {
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                      borderRadius: '20px'
                    } }
                  >
                    <div
                      className="text-sm text-orange-400 mb-2"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      Last Round
                    </div>
                    <div className="flex justify-center items-center gap-4 mb-2">
                      <div className="text-center">
                        { getMoveIcon(arena.lastMoves.yodhaOne) }
                        <div
                          className="text-xs text-orange-400 mt-1"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          { arena.lastMoves.yodhaOne }
                        </div>
                      </div>
                      <span
                        className="text-orange-400"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        vs
                      </span>
                      <div className="text-center">
                        { getMoveIcon(arena.lastMoves.yodhaTwo) }
                        <div
                          className="text-xs text-orange-400 mt-1"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          { arena.lastMoves.yodhaTwo }
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span
                          className="text-red-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          DMG: { (arena.lastMoves.yodhaTwoDamage / 100).toFixed(2) }
                        </span>
                        <br />
                        <span
                          className="text-green-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          REC: { arena.lastMoves.yodhaOneRecovery }
                        </span>
                      </div>
                      <div>
                        <span
                          className="text-red-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          DMG: { (arena.lastMoves.yodhaOneDamage / 100).toFixed(2) }
                        </span>
                        <br />
                        <span
                          className="text-green-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          REC: { arena.lastMoves.yodhaTwoRecovery }
                        </span>
                      </div>
                    </div>
                  </div>
                ) }

                {/* Total Damages */}
                { arena.state === 'BATTLE_ONGOING' && (
                  <div
                    className="p-4 text-center"
                    style={ {
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                      borderRadius: '20px'
                    } }
                  >
                    <div
                      className="text-sm text-orange-400 mb-2"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      Total Damage
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div
                          className="text-red-400 text-lg font-bold"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          { (arena.yodhaOneDamage / 100).toFixed(2) }
                        </div>
                        <div
                          className="text-xs text-orange-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          Yodha One
                        </div>
                      </div>
                      <div>
                        <div
                          className="text-red-400 text-lg font-bold"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          { (arena.yodhaTwoDamage / 100).toFixed(2) }
                        </div>
                        <div
                          className="text-xs text-orange-400"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          Yodha Two
                        </div>
                      </div>
                    </div>
                  </div>
                ) }

                {/* Next Round Button - Only show when battle is ongoing */}
                { arena.state === 'BATTLE_ONGOING' && (
                  <div
                    className="p-4 text-center"
                    style={ {
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                      borderRadius: '20px'
                    } }
                  >
                    <button
                      onClick={ onNextRound }
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded text-sm transition-colors"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      <Trophy className="w-4 h-4 mr-2 inline" />
                      NEXT ROUND
                    </button>
                    <div
                        className="text-xs text-red-300 mt-2 max-w-xs mx-auto leading-relaxed"
                        style={{ fontFamily: 'Press Start 2P, monospace' }}
                      >
                        This button is only to be used if the automation mechanism fails (timer gets to 0 and hangs there, or the timer is not visible). This is a manual override button and must not be used unless the above condition occurs, as this can break automation for this battle.
                      </div>
                  </div>
                ) }

                {/* Winner Announcement */}
                { arena.winner && (
                  <div className="arcade-card p-6 text-center">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <div className="text-xl text-yellow-400 mb-2">WINNER!</div>
                    <div className="text-lg text-white">
                      { arena.winner === 'ONE' ? arena.yodhaOne.name : arena.yodhaTwo.name }
                    </div>
                    <Button className="mt-4 arcade-button">
                      Initialize New Battle
                    </Button>
                  </div>
                ) }
              </div>

              {/* Yodha Two */}
              <div
                className="space-y-4 p-4"
                style={ {
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                  borderRadius: '20px'
                } }
              >
                <div className="text-center">
                  <h3
                    className="text-orange-400 mb-2 arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Yodha Two
                  </h3>
                  <div
                    className="w-32 h-32 mx-auto mb-2 overflow-hidden rounded aspect-square"
                    style={ {
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    } }
                  >
                    <img
                      src={ arena.yodhaTwo.image }
                      alt={ arena.yodhaTwo.name }
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4
                    className="text-orange-400 font-bold arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    { arena.yodhaTwo.name }
                  </h4>
                  <div
                    className={ `${getRankColor(arena.yodhaTwo.rank)} inline-block px-2 py-1 rounded mt-2` }
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    { arena.yodhaTwo.rank }
                  </div>
                </div>

                {/* Traits */}
                <div className="space-y-2">
                  <div
                    className="text-sm text-orange-400 mb-2"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    TRAITS
                  </div>
                  <TraitBar label="Strength" value={ arena.yodhaTwo.strength } />
                  <TraitBar label="Defense" value={ arena.yodhaTwo.defense } />
                  <TraitBar label="Charisma" value={ arena.yodhaTwo.charisma } />
                  <TraitBar label="Wit" value={ arena.yodhaTwo.wit } />
                  <TraitBar label="Luck" value={ arena.yodhaTwo.luck } />
                </div>

                {/* Action Buttons */}
                { arena.state === 'BATTLE_ONGOING' && (
                  <div className="space-y-2">
                    <button
                      onClick={ () => onInfluence('TWO') }
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-xs"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      <TrendingUp className="w-4 h-4 mr-2 inline" />
                      INFLUENCE ({ arena.costToInfluenceYodhaTwo } RANN)
                    </button>
                    <button
                      onClick={ () => onDefluence('TWO') }
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      <TrendingDown className="w-4 h-4 mr-2 inline" />
                      DEFLUENCE ({ arena.costToDefluenceYodhaTwo } RANN)
                    </button>
                  </div>
                ) }
              </div>
            </div>
          ) }

          {/* Betting or Start Battle Section */}
          { arena.state === 'INITIALIZED' && (
            <div
              className="p-6 mb-6"
              style={ {
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '2px solid #ff8c00',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                borderRadius: '20px'
              } }
            >
              { arena.isBettingPeriod ? (
                // Show betting interface if battle hasn't started
                <>
                  <h3
                    className="text-orange-400 text-lg mb-4 text-center arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Place Your Bets
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Yodha One Betting */}
                    <div className="text-center">
                      <div
                        className="text-lg text-orange-400 mb-2 arcade-glow"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        { arena.yodhaOne?.name }
                      </div>
                      {/* Only show betting totals if game has started (currentRound > 0) */}
                      { arena.currentRound > 0 && (
                        <div
                          className="text-sm text-orange-400 mb-4"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          Total Bets: { totalYodhaOneBets } RANN
                        </div>
                      ) }
                      <button
                        onClick={ () => setSelectedYodha('ONE') }
                        className={ `w-full px-4 py-2 rounded transition-all ${selectedYodha === 'ONE' ? 'bg-yellow-600' : 'arcade-button'} ${arena.currentRound === 0 ? 'mt-4' : ''}` }
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        Bet on Yodha One
                      </button>
                    </div>

                    {/* Yodha Two Betting */}
                    <div className="text-center">
                      <div
                        className="text-lg text-orange-400 mb-2 arcade-glow"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        { arena.yodhaTwo?.name }
                      </div>
                      {/* Only show betting totals if game has started (currentRound > 0) */}
                      { arena.currentRound > 0 && (
                        <div
                          className="text-sm text-orange-400 mb-4"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          Total Bets: { totalYodhaTwoBets } RANN
                        </div>
                      ) }
                      <button
                        onClick={ () => setSelectedYodha('TWO') }
                        className={ `w-full px-4 py-2 rounded transition-all ${selectedYodha === 'TWO' ? 'bg-yellow-600' : 'arcade-button'} ${arena.currentRound === 0 ? 'mt-4' : ''}` }
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        Bet on Yodha Two
                      </button>
                    </div>
                  </div>

                  {/* Bet Amount Input */}
                  { selectedYodha && (
                    <div className="mt-6 max-w-md mx-auto">
                      <label
                        className="block text-orange-400 text-sm mb-2"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        Bet Amount (Multiples of { arena.betAmount } RANN)
                      </label>
                      <div
                        className="text-xs text-orange-300 mb-3"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        Valid amounts: { arena.betAmount }, { arena.betAmount * 2 }, { arena.betAmount * 3 }, { arena.betAmount * 4 }...
                      </div>

                      {/* Quick bet buttons */}
                      <div className="flex gap-2 mb-3 flex-wrap">
                        { [1, 2, 3, 5, 10].map(multiplier => (
                          <button
                            key={ multiplier }
                            onClick={ () => setBetAmount((arena.betAmount * multiplier).toString()) }
                            className="text-xs px-3 py-1 rounded transition-colors bg-orange-600 hover:bg-orange-700 text-white"
                            style={ { fontFamily: 'Press Start 2P, monospace' } }
                          >
                            { multiplier }x ({ arena.betAmount * multiplier })
                          </button>
                        )) }
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="number"
                          step={ arena.betAmount }
                          value={ betAmount }
                          onChange={ (e) => setBetAmount(e.target.value) }
                          className="flex-1 p-3 rounded text-white"
                          style={ {
                            background: 'rgba(120, 160, 200, 0.1)',
                            border: '2px solid #ff8c00',
                            backdropFilter: 'blur(10px)',
                            WebkitBackdropFilter: 'blur(10px)',
                            fontFamily: 'Press Start 2P, monospace'
                          } }
                          placeholder={ arena.betAmount.toString() }
                          min={ arena.betAmount }
                        />
                        <button
                          onClick={ () => onBet(selectedYodha) }
                          className="arcade-button px-4 py-3"
                          disabled={ !betAmount || parseFloat(betAmount) < arena.betAmount || parseFloat(betAmount) % arena.betAmount !== 0 }
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          Place Bet
                        </button>
                      </div>
                      { betAmount && parseFloat(betAmount) % arena.betAmount !== 0 && (
                        <div
                          className="text-red-400 text-xs mt-2"
                          style={ { fontFamily: 'Press Start 2P, monospace' } }
                        >
                          ⚠️ Amount must be a multiple of { arena.betAmount } RANN
                        </div>
                      ) }
                    </div>
                  ) }

                  {/* Total Pot - Only show if game has started */}
                  { arena.currentRound > 0 && (
                    <div className="text-center mt-6">
                      <div
                        className="text-lg text-orange-400 arcade-glow"
                        style={ { fontFamily: 'Press Start 2P, monospace' } }
                      >
                        Total Pot: { totalPot } RANN
                      </div>
                    </div>
                  ) }
                </>
              ) : (
                // Show Start Battle button if battle is ready to start
                <div className="text-center">
                  <h3
                    className="text-orange-400 text-lg mb-6 arcade-glow"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    Battle Ready to Begin!
                  </h3>

                  <div className="mb-6">
                    <div
                      className="text-sm text-orange-400 mb-2"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      Total Prize Pool: { totalPot } RANN
                    </div>
                    <div
                      className="text-xs text-orange-300"
                      style={ { fontFamily: 'Press Start 2P, monospace' } }
                    >
                      Click below to commence the battle between the Yodhas
                    </div>
                  </div>

                  <button
                    onClick={ onStartGame }
                    className="arcade-button text-lg px-8 py-4 bg-red-600 hover:bg-red-700 transition-colors"
                    style={ {
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px',
                      boxShadow: '0 4px 8px rgba(220, 38, 38, 0.3)'
                    } }
                  >
                    ⚔️ START BATTLE ⚔️
                  </button>
                  
                  <div
                    className="text-xs text-red-300 mt-4 max-w-lg mx-auto leading-relaxed"
                    style={ { fontFamily: 'Press Start 2P, monospace' } }
                  >
                    This button is only to be used if the automation mechanism fails (timer gets to 0 and hangs there, or the timer is not visible). This is a manual override button and must not be used unless the above condition occurs, as this can break automation for this battle.
                  </div>
                </div>
              ) }
            </div>
          ) }

          {/* Betting History */}
          { (arena.playerOneBets.length > 0 || arena.playerTwoBets.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yodha One Bets */}
              <div className="arcade-card p-4">
                <h4 className="text-yellow-400 mb-3">Yodha One Supporters</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  { arena.playerOneBets.map((bet, index) => (
                    <div key={ index } className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        { bet.address.slice(0, 6) }...{ bet.address.slice(-4) }
                      </span>
                      <span className="text-white">{ bet.amount } RANN</span>
                    </div>
                  )) }
                </div>
              </div>

              {/* Yodha Two Bets */}
              <div className="arcade-card p-4">
                <h4 className="text-yellow-400 mb-3">Yodha Two Supporters</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  { arena.playerTwoBets.map((bet, index) => (
                    <div key={ index } className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        { bet.address.slice(0, 6) }...{ bet.address.slice(-4) }
                      </span>
                      <span className="text-white">{ bet.amount } RANN</span>
                    </div>
                  )) }
                </div>
              </div>
            </div>
          ) }
        </div>
      </div>
    </div>
  );
};
