'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import '../home-glass.css';
import { Button } from '../../components/ui/button';
// Unused UI components removed for lint cleanup
// import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
// import { Badge } from '../../components/ui/badge';
import { useArenas, type RankCategory, type ArenaWithDetails } from '../../hooks/useArenas';
import { arenaService, isValidBettingAmount, getClosestValidBettingAmount } from '../../services/arenaService';
import { waitForTransactionReceipt } from '@wagmi/core';
import rainbowKitConfig from '../../rainbowKitConfig';
import Image from 'next/image';
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

// Arena state types
type ArenaState = 'EMPTY' | 'INITIALIZED' | 'BATTLE_ONGOING' | 'FINISHED';
type BattlePhase = 'BETTING' | 'ROUND_INTERVAL' | 'CALCULATING' | 'FINISHED';
type PlayerMove = 'STRIKE' | 'TAUNT' | 'DODGE' | 'SPECIAL' | 'RECOVER';

interface Yodha {
  id: number;
  name: string;
  image: string;
  rank: RankCategory;
  strength: number;
  defense: number;
  charisma: number;
  wit: number;
  personality: number;
  owner: string;
  winnings: number;
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
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {label}
        </span>
        <span 
          className="text-white"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {formattedValue}/{max}
        </span>
      </div>
      <div 
        className="w-full rounded-full h-2"
        style={{
          background: 'rgba(120, 160, 200, 0.1)',
          border: '1px solid #ff8c00'
        }}
      >
        <div 
          className={`h-2 rounded-full ${color} arcade-glow transition-all duration-300`}
          style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
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
      onClick={onClick}
      style={{
        background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
        border: '3px solid #ff8c00',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
        borderRadius: '24px'
      }}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 
              className="text-xl text-orange-400 arcade-glow" 
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {ranking} ARENA #{index + 1}
            </h3>
            <div 
              className={`${isBattleOngoing ? 'bg-red-600' : (isInitialized ? 'bg-green-600' : 'bg-blue-600')} text-white px-3 py-1 text-xs rounded-lg`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {isBattleOngoing ? 'BATTLE ONGOING' : (isInitialized ? 'BATTLE READY' : 'AWAITING WARRIORS')}
            </div>
          </div>
          <div className="text-right">
            <div 
              className="text-sm text-orange-400"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              ADDRESS
            </div>
            <div 
              className="text-orange-400 text-sm font-mono arcade-glow"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        </div>

        {isInitialized ? (
          // Initialized arena showing Yodhas
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Yodha One */}
            <div className="text-center">
              <div 
                className="w-full aspect-square rounded-lg mb-2 overflow-hidden"
                style={{
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <Image 
                  src={details.yodhaOneDetails?.image || '/lazered.png'} 
                  alt={details.yodhaOneDetails?.name || 'Yodha One'}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="text-xs text-orange-400 truncate"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {details.yodhaOneDetails?.name || `Yodha #${details.yodhaOneNFTId}`}
              </div>
              {/* Battle damage indicator if battle is ongoing */}
              {isBattleOngoing && (
                <div className="mt-1">
                  <div 
                    className="text-xs text-red-400"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    DMG: {details.damageOnYodhaOne || 0}
                  </div>
                </div>
              )}
            </div>

            {/* VS */}
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-3xl text-red-500 mb-2">⚔️</div>
                <div 
                  className="text-lg text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  VS
                </div>
                {/* Battle round indicator if battle is ongoing */}
                {isBattleOngoing && (
                  <div 
                    className="text-xs text-yellow-400 mt-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    ROUND {details.currentRound || 1}
                  </div>
                )}
              </div>
            </div>

            {/* Yodha Two */}
            <div className="text-center">
              <div 
                className="w-full aspect-square rounded-lg mb-2 overflow-hidden"
                style={{
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <Image 
                  src={details.yodhaTwoDetails?.image || '/lazered.png'} 
                  alt={details.yodhaTwoDetails?.name || 'Yodha Two'}
                  width={100}
                  height={100}
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="text-xs text-orange-400 truncate"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {details.yodhaTwoDetails?.name || `Yodha #${details.yodhaTwoNFTId}`}
              </div>
              {/* Battle damage indicator if battle is ongoing */}
              {isBattleOngoing && (
                <div className="mt-1">
                  <div 
                    className="text-xs text-red-400"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    DMG: {details.damageOnYodhaTwo || 0}
                  </div>
                </div>
              )}
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
                  style={{
                    background: 'rgba(120, 160, 200, 0.1)',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                >
                  <div className="text-center">
                    <Crown className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                    <span 
                      className="text-orange-400"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
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
                style={{
                  background: 'rgba(120, 160, 200, 0.1)',
                  border: '1px solid #ff8c00',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)'
                }}
              >
                <div 
                  className="text-xs text-orange-400 mb-1"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  STATUS
                </div>
                <div 
                  className="text-sm text-green-400 font-bold"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  OPERATIONAL
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enter Arena Button */}
        <div className="text-center mt-4">
          <button
            className="arcade-button text-xs px-4 py-2"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            style={{fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px'
            }}
          >
            {isBattleOngoing ? 'WATCH BATTLE' : (isInitialized ? 'ENTER BATTLE' : 'INITIALIZE ARENA')}
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
  
  // Toast notification state
  const [toasts, setToasts] = useState<Array<{id: string, message: string, type: 'success' | 'error' | 'info'}>>([]);
  
  // Add toast notification
  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  // Toast Component
  const ToastContainer = () => {
    return (
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300
              ${toast.type === 'success' ? 'bg-green-600 text-white' : 
                toast.type === 'error' ? 'bg-red-600 text-white' : 
                'bg-blue-600 text-white'}
              border-2 border-opacity-50
              ${toast.type === 'success' ? 'border-green-400' : 
                toast.type === 'error' ? 'border-red-400' : 
                'border-blue-400'}
            `}
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs leading-relaxed pr-2">{toast.message}</p>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="text-white hover:text-gray-200 text-xs ml-2"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get arenas for the active rank
  const currentRankArenasWithDetails = arenasWithDetails[activeRank] || [];

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setInitializationError(null);
    setYodhaOneNFTId('');
    setYodhaTwoNFTId('');
    setBetAmount('');
    setSelectedYodha(null);
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
        strength: details.yodhaOneDetails.traits.strength || 50,
        defense: details.yodhaOneDetails.traits.defence || 50,
        charisma: details.yodhaOneDetails.traits.charisma || 50,
        wit: details.yodhaOneDetails.traits.wit || 50,
        personality: details.yodhaOneDetails.traits.luck || 50, // Using luck as personality
        owner: '0x000...000', // You may want to fetch actual owner from contract
        winnings: 0 // You may want to fetch actual winnings
      };
      
      arenaObject.yodhaTwo = {
        id: details.yodhaTwoNFTId,
        name: details.yodhaTwoDetails.name,
        image: details.yodhaTwoDetails.image,
        rank: activeRank,
        strength: details.yodhaTwoDetails.traits.strength || 50,
        defense: details.yodhaTwoDetails.traits.defence || 50,
        charisma: details.yodhaTwoDetails.traits.charisma || 50,
        wit: details.yodhaTwoDetails.traits.wit || 50,
        personality: details.yodhaTwoDetails.traits.luck || 50, // Using luck as personality
        owner: '0x000...000', // You may want to fetch actual owner from contract
        winnings: 0 // You may want to fetch actual winnings
      };
    }
    
    setSelectedArena(arenaObject);
    setIsModalOpen(true);
  };

  // Unused handlers removed for lint cleanup
  // const handleArenaAddressClick = async (arenaAddress: string) => { ... }
  // const handleArenaClick = (arena: Arena) => { ... }

  const handleStartGame = async () => {
    if (!selectedArena) return;
    
    try {
      console.log('Starting battle for arena:', selectedArena.address);
      
      const transactionHash = await arenaService.startGame(selectedArena.address);
      console.log('Start game transaction sent:', transactionHash);
      
      // Wait for confirmation
      await waitForTransactionReceipt(rainbowKitConfig, {
        hash: transactionHash as `0x${string}`,
        chainId: 545,
      });
      
      console.log('Game started successfully!');
      addToast('Game started successfully! The battle has begun!', 'success');
      
      // Close modal and refresh arena data
      setIsModalOpen(false);
      // Optionally trigger a refetch of arena data here
      
    } catch (error) {
      console.error('Failed to start game:', error);
      addToast('Failed to start game. Please try again.', 'error');
    }
  };

  const handleBet = async (yodha: 'ONE' | 'TWO') => {
    if (!betAmount || !selectedArena || !address) return;
    
    try {
      const betAmountNum = parseFloat(betAmount);
      
      // Validate betting amount is a multiple of base bet amount
      if (!isValidBettingAmount(betAmountNum, selectedArena.betAmount)) {
        const closest = getClosestValidBettingAmount(betAmountNum, selectedArena.betAmount);
        addToast(`Invalid bet amount. Amount must be a multiple of ${selectedArena.betAmount} RANN. Closest valid amount: ${closest} RANN`, 'error');
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
      addToast(`Successfully bet ${betAmountNum} RANN on Yodha ${yodha}!`, 'success');
      
      // Note: In a real app you might want to update the arena state
      // For now, we'll just close the modal and reset the form
      
      setIsModalOpen(false);
      setBetAmount('');
      setSelectedYodha(null);
    } catch (error) {
      console.error('Failed to place bet:', error);
      addToast('Failed to place bet. Please try again.', 'error');
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
      addToast(`Successfully influenced Yodha ${yodha}!`, 'success');
      
      // Note: In a real app you might want to update the arena state
      
    } catch (error) {
      console.error('Failed to influence:', error);
      addToast('Failed to influence Yodha. Please try again.', 'error');
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
      addToast(`Successfully defluenced Yodha ${yodha}!`, 'success');
      
      // Note: In a real app you might want to update the arena state
      
    } catch (error) {
      console.error('Failed to defluence:', error);
      addToast('Failed to defluence Yodha. Please try again.', 'error');
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
          strength: updatedArenaDetails.yodhaOneDetails.traits.strength || 50,
          defense: updatedArenaDetails.yodhaOneDetails.traits.defence || 50,
          charisma: updatedArenaDetails.yodhaOneDetails.traits.charisma || 50,
          wit: updatedArenaDetails.yodhaOneDetails.traits.wit || 50,
          personality: updatedArenaDetails.yodhaOneDetails.traits.luck || 50,
          owner: '0x000...000',
          winnings: 0
        };
        
        updatedArena.yodhaTwo = {
          id: updatedArenaDetails.yodhaTwoNFTId,
          name: updatedArenaDetails.yodhaTwoDetails.name,
          image: updatedArenaDetails.yodhaTwoDetails.image,
          rank: activeRank,
          strength: updatedArenaDetails.yodhaTwoDetails.traits.strength || 50,
          defense: updatedArenaDetails.yodhaTwoDetails.traits.defence || 50,
          charisma: updatedArenaDetails.yodhaTwoDetails.traits.charisma || 50,
          wit: updatedArenaDetails.yodhaTwoDetails.traits.wit || 50,
          personality: updatedArenaDetails.yodhaTwoDetails.traits.luck || 50,
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
      
      console.log('Arena initialized successfully!');
      addToast('Arena initialized successfully!', 'success');
      
    } catch (error) {
      console.error('Failed to initialize arena:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Failed to initialize arena. Please try again.';
      setInitializationError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  // Show loading state until component mounts to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
        <div className="fixed inset-0 -z-10">
          <div className="battlefield-bg w-full h-full"></div>
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            }}
          ></div>
        </div>
        <div className="text-center relative z-10">
          <div 
            className="p-8 max-w-md"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            }}
          >
            <h1 
              className="text-2xl text-orange-400 mb-4 arcade-glow" 
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              KURUKSHETRA
            </h1>
            <p 
              className="text-orange-400 mb-6"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              Loading the legendary battlefield...
            </p>
            <div 
              className="text-orange-400 text-sm"
              style={{fontFamily: 'Press Start 2P, monospace'}}
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
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            }}
          ></div>
        </div>
        <div className="text-center relative z-10">
          <div 
            className="p-8 max-w-md"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            }}
          >
            <h1 
              className="text-2xl text-orange-400 mb-4 arcade-glow" 
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              KURUKSHETRA
            </h1>
            <p 
              className="text-orange-400 mb-6"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              Connect your wallet to enter the legendary battlefield and witness epic Yodha battles!
            </p>
            <div 
              className="text-orange-400 text-sm"
              style={{fontFamily: 'Press Start 2P, monospace'}}
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
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.175)',
            zIndex: 1
          }}
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
            style={{
              fontFamily: 'Press Start 2P, monospace'
            }}
          >
            KURUKSHETRA
          </h1>
          <div 
            className="arcade-border p-4 mx-auto max-w-3xl"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '2px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '24px'
            }}
          >
            <p 
              className="text-orange-400 text-sm md:text-base tracking-wide arcade-glow"
              style={{
                fontFamily: 'Press Start 2P, monospace'
              }}
            >
              THE ULTIMATE BATTLEFIELD WHERE LEGENDS CLASH
            </p>
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <div 
            className="p-2 flex gap-2"
            style={{
              background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
              border: '3px solid #ff8c00',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
              borderRadius: '20px'
            }}
          >
            {(['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as RankCategory[]).map((rank) => (
              <button
                key={rank}
                onClick={() => setActiveRank(rank)}
                className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                  activeRank === rank 
                    ? 'arcade-button' 
                    : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
                }`}
                style={{
                  fontFamily: 'Press Start 2P, monospace',
                  borderRadius: '12px',
                  background: activeRank === rank ? undefined : 'rgba(0, 0, 0, 0.3)'
                }}
              >
                {rank}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto">
            {/* Arena List */}
            <div className="space-y-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div 
                    className="p-8"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '3px solid #ff8c00',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                      borderRadius: '24px'
                    }}
                  >
                    <div 
                      className="text-orange-400 text-lg mb-4"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Loading arenas...
                    </div>
                    <div 
                      className="text-orange-400"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      ⚡ Fetching battlefield data...
                    </div>
                  </div>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div 
                    className="p-8"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '3px solid #ff8c00',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                      borderRadius: '24px'
                    }}
                  >
                    <div 
                      className="text-red-400 text-lg mb-4"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Error loading arenas
                    </div>
                    <p 
                      className="text-orange-400 mb-4"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      {error}
                    </p>
                    <button
                      onClick={() => refetch()}
                      className="arcade-button text-xs px-4 py-2"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      RETRY
                    </button>
                  </div>
                </div>
              ) : currentRankArenasWithDetails.length > 0 ? (
                currentRankArenasWithDetails.map((arenaWithDetails, index) => (
                  <EnhancedArenaCard 
                    key={arenaWithDetails.address} 
                    arenaWithDetails={arenaWithDetails}
                    ranking={activeRank}
                    index={index}
                    onClick={() => handleEnhancedArenaClick(arenaWithDetails)}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div 
                    className="p-8"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '3px solid #ff8c00',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                      borderRadius: '24px'
                    }}
                  >
                    <div 
                      className="text-orange-400 text-lg mb-4"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      No arenas found for {activeRank} rank
                    </div>
                    <p 
                      className="text-orange-400"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Check other ranks or create a new arena
                    </p>
                  </div>
                </div>
              )}
            </div>
        </div>

        {/* Arena Detail Modal */}
        {selectedArena && (
          <ArenaModal
            arena={selectedArena}
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            onBet={handleBet}
            onInfluence={handleInfluence}
            onDefluence={handleDefluence}
            onInitialize={handleInitializeArena}
            onStartGame={handleStartGame}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            selectedYodha={selectedYodha}
            setSelectedYodha={setSelectedYodha}
            yodhaOneNFTId={yodhaOneNFTId}
            setYodhaOneNFTId={setYodhaOneNFTId}
            yodhaTwoNFTId={yodhaTwoNFTId}
            setYodhaTwoNFTId={setYodhaTwoNFTId}
            isInitializing={isInitializing}
            initializationError={initializationError}
          />
        )}

        {/* Toast Notifications */}
        <ToastContainer />
      </div>
    </div>
  );
};

// Unused component - removed for lint cleanup
// const CreateArenaForm = () => { ... }

// Arena Detail Modal Component  
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
  betAmount,
  setBetAmount,
  selectedYodha,
  setSelectedYodha,
  yodhaOneNFTId,
  yodhaTwoNFTId,
  getRoundWinner,
  canStartGame,
  userAllowance,
  approveTokens,
  addToast
}: {
  arena: Arena;
  isOpen: boolean;
  onClose: () => void;
  onBet: (yodhaId: number, amount: number) => Promise<void>;
  onInfluence: (yodhaId: number, amount: number) => Promise<void>;
  onDefluence: (yodhaId: number, amount: number) => Promise<void>;
  onInitialize: () => Promise<void>;
  onStartGame: () => Promise<void>;
  betAmount: string;
  setBetAmount: (amount: string) => void;
  selectedYodha: number | null;
  setSelectedYodha: (yodha: number | null) => void;
  yodhaOneNFTId: number | null;
  yodhaTwoNFTId: number | null;
  getRoundWinner: (round: number) => 'yodhaOne' | 'yodhaTwo' | 'tie' | 'pending';
  canStartGame: (arenaState: ArenaState, currentTime: number, bettingEndTime: number) => boolean;
  userAllowance: bigint;
  approveTokens: () => Promise<void>;
  addToast: (message: string, type: 'success' | 'error' | 'info') => void;
}) => {
  if (!isOpen) return null;

  const totalYodhaOneBets = arena.playerOneBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalYodhaTwoBets = arena.playerTwoBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPot = totalYodhaOneBets + totalYodhaTwoBets;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div 
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto arcade-card rounded-lg"
        style={{
          border: '3px solid #ff8c00',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)'
        }}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 
              className="text-xl text-orange-400 arcade-glow" 
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              ARENA {arena.rank}
            </h2>
            <button 
              onClick={onClose}
              className="text-orange-400 hover:text-orange-300 text-xl transition-colors"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              ×
            </button>
          </div>

          {/* Battle State */}
          <div className="text-center mb-6">
            <div 
              className={`getStateColor(arena.state) text-white text-xs px-3 py-2 rounded-lg inline-block`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {arena.state.replace('_', ' ')}
            </div>
            {arena.state === 'BATTLE_ONGOING' && (
              <div className="mt-2">
                <div 
                  className="text-xs text-yellow-400"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  ROUND {arena.currentRound + 1}/10
                </div>
              </div>
            )}
          </div>

          {/* Yodhas Display */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Yodha One */}
            <div 
              className="p-4 rounded-lg border border-orange-400"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 140, 0, 0.05) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            >
              <div className="text-center mb-3">
                <h3 
                  className="text-sm text-orange-400 mb-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  YODHA ONE
                </h3>
                <div className="text-xs text-gray-400 mb-2">
                  NFT ID: {yodhaOneNFTId || 'Loading...'}
                </div>
              </div>

              {/* Yodha One Stats */}
              {arena.yodhaOne && (
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">ATK:</span>
                    <span className="text-red-400">{(arena.yodhaOne.attack / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">DEF:</span>
                    <span className="text-blue-400">{(arena.yodhaOne.defense / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SPD:</span>
                    <span className="text-green-400">{(arena.yodhaOne.speed / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">HP:</span>
                    <span className="text-purple-400">{arena.yodhaOne.health}</span>
                  </div>
                </div>
              )}

              {/* Yodha One Betting */}
              <div className="border-t border-orange-400/30 pt-3">
                <div className="text-xs text-center mb-2">
                  <span className="text-gray-400">Total Bets: </span>
                  <span className="text-orange-400">{totalYodhaOneBets} RANN</span>
                </div>
                {arena.state === 'BETTING_OPEN' && (
                  <button
                    onClick={() => setSelectedYodha(selectedYodha === 1 ? null : 1)}
                    className={`w-full py-2 px-3 rounded text-xs transition-colors ${
                      selectedYodha === 1 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    }`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {selectedYodha === 1 ? 'SELECTED' : 'SELECT'}
                  </button>
                )}
              </div>
            </div>

            {/* Yodha Two */}
            <div 
              className="p-4 rounded-lg border border-orange-400"
              style={{
                background: 'linear-gradient(135deg, rgba(255, 140, 0, 0.1) 0%, rgba(255, 140, 0, 0.05) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            >
              <div className="text-center mb-3">
                <h3 
                  className="text-sm text-orange-400 mb-2"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  YODHA TWO
                </h3>
                <div className="text-xs text-gray-400 mb-2">
                  NFT ID: {yodhaTwoNFTId || 'Loading...'}
                </div>
              </div>

              {/* Yodha Two Stats */}
              {arena.yodhaTwo && (
                <div className="space-y-1 mb-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">ATK:</span>
                    <span className="text-red-400">{(arena.yodhaTwo.attack / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">DEF:</span>
                    <span className="text-blue-400">{(arena.yodhaTwo.defense / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">SPD:</span>
                    <span className="text-green-400">{(arena.yodhaTwo.speed / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">HP:</span>
                    <span className="text-purple-400">{arena.yodhaTwo.health}</span>
                  </div>
                </div>
              )}

              {/* Yodha Two Betting */}
              <div className="border-t border-orange-400/30 pt-3">
                <div className="text-xs text-center mb-2">
                  <span className="text-gray-400">Total Bets: </span>
                  <span className="text-orange-400">{totalYodhaTwoBets} RANN</span>
                </div>
                {arena.state === 'BETTING_OPEN' && (
                  <button
                    onClick={() => setSelectedYodha(selectedYodha === 2 ? null : 2)}
                    className={`w-full py-2 px-3 rounded text-xs transition-colors ${
                      selectedYodha === 2 
                        ? 'bg-orange-500 text-white' 
                        : 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    }`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {selectedYodha === 2 ? 'SELECTED' : 'SELECT'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="space-y-4">
            {/* Betting Input */}
            {arena.state === 'BETTING_OPEN' && selectedYodha && (
              <div className="p-4 rounded-lg bg-gray-800/50 border border-orange-400/30">
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Enter bet amount"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-orange-400 focus:outline-none"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                  <span className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-orange-400 text-xs">
                    RANN
                  </span>
                </div>
                
                <button
                  onClick={() => onBet(selectedYodha, parseFloat(betAmount) || 0)}
                  disabled={!betAmount || parseFloat(betAmount) <= 0}
                  className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  PLACE BET
                </button>
              </div>
            )}

            {/* Battle Actions */}
            {arena.state === 'BATTLE_ONGOING' && (
              <div className="p-4 rounded-lg bg-gray-800/50 border border-orange-400/30">
                <div className="text-center mb-4">
                  <h4 className="text-orange-400 text-xs mb-2" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    BATTLE ACTIONS
                  </h4>
                </div>
                
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:border-orange-400 focus:outline-none"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                  <span className="px-3 py-2 bg-gray-700 border border-gray-600 rounded text-orange-400 text-xs">
                    RANN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => selectedYodha && onInfluence(selectedYodha, parseFloat(betAmount) || 0)}
                    disabled={!selectedYodha || !betAmount || parseFloat(betAmount) <= 0}
                    className="py-2 px-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    INFLUENCE
                  </button>
                  <button
                    onClick={() => selectedYodha && onDefluence(selectedYodha, parseFloat(betAmount) || 0)}
                    disabled={!selectedYodha || !betAmount || parseFloat(betAmount) <= 0}
                    className="py-2 px-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-xs transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    DEFLUENCE
                  </button>
                </div>
              </div>
            )}

            {/* Game Control Actions */}
            <div className="flex gap-4">
              {arena.state === 'BETTING_OPEN' && canStartGame(arena.state, Date.now(), arena.bettingEndTime) && (
                <button
                  onClick={onStartGame}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  START GAME
                </button>
              )}
              
              {arena.state === 'UNINITIALIZED' && (
                <button
                  onClick={onInitialize}
                  className="flex-1 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs transition-colors"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  INITIALIZE ARENA
                </button>
              )}
            </div>
          </div>

          {/* Total Pot */}
          <div className="mt-6 p-4 text-center rounded-lg bg-gray-800/50 border border-orange-400/30">
            <div className="text-xs text-gray-400 mb-2">Total Prize Pool</div>
            <div className="text-lg text-orange-400" style={{fontFamily: 'Press Start 2P, monospace'}}>
              {totalPot} RANN
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function KurukshetraPage() {
  return <KurukshetraPageContent />;
}
