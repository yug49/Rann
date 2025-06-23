'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import '../home-glass.css';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Modal } from '../../components/ui/modal';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { 
  Clock, 
  Users, 
  Sword, 
  Shield, 
  Crown, 
  Zap,
  TrendingUp,
  TrendingDown,
  Play,
  Pause,
  Trophy,
  Star,
  Target,
  Heart,
  DollarSign
} from 'lucide-react';

// Arena state types
type ArenaState = 'EMPTY' | 'INITIALIZED' | 'BATTLE_ONGOING' | 'FINISHED';
type BattlePhase = 'BETTING' | 'ROUND_INTERVAL' | 'CALCULATING' | 'FINISHED';
type RankCategory = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
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
  betAmount: number;
  currentRound: number;
  maxRounds: number;
  yodhaOneDamage: number;
  yodhaTwoDamage: number;
  playerOneBets: { address: string; amount: number }[];
  playerTwoBets: { address: string; amount: number }[];
  battlePhase: BattlePhase;
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

// Mock data for demonstration
const mockYodhas: Yodha[] = [
  {
    id: 1,
    name: "Arjuna the Mighty",
    image: "/lazered.png",
    rank: "GOLD",
    strength: 85,
    defense: 70,
    charisma: 60,
    wit: 75,
    personality: 80,
    owner: "0x742d35Cc6634C0532925a3b8D",
    winnings: 1500
  },
  {
    id: 2,
    name: "Bhima the Destroyer", 
    image: "/lazered.png",
    rank: "GOLD",
    strength: 95,
    defense: 85,
    charisma: 40,
    wit: 45,
    personality: 70,
    owner: "0x742d35Cc6634C0532925a3b8D",
    winnings: 2200
  }
];

const mockArenas: Arena[] = [
  {
    id: "arena-1",
    address: "0x123...abc",
    rank: "UNRANKED",
    state: "EMPTY",
    costToInfluence: 10,
    costToDefluence: 15,
    betAmount: 50,
    currentRound: 0,
    maxRounds: 5,
    yodhaOneDamage: 0,
    yodhaTwoDamage: 0,
    playerOneBets: [],
    playerTwoBets: [],
    battlePhase: "BETTING"
  },
  {
    id: "arena-2", 
    address: "0x456...def",
    rank: "BRONZE",
    state: "INITIALIZED",
    yodhaOne: mockYodhas[0],
    yodhaTwo: mockYodhas[1],
    costToInfluence: 20,
    costToDefluence: 30,
    betAmount: 100,
    currentRound: 0,
    maxRounds: 5,
    yodhaOneDamage: 0,
    yodhaTwoDamage: 0,
    playerOneBets: [
      { address: "0x742d35Cc6634C0532925a3b8D", amount: 100 },
      { address: "0x832f45Cc6634C0532925a3c9E", amount: 200 }
    ],
    playerTwoBets: [
      { address: "0x952g56Dd7745D0643a36b4f0F", amount: 150 }
    ],
    battlePhase: "BETTING"
  },
  {
    id: "arena-3",
    address: "0x789...ghi", 
    rank: "GOLD",
    state: "BATTLE_ONGOING",
    yodhaOne: mockYodhas[0],
    yodhaTwo: mockYodhas[1],
    costToInfluence: 50,
    costToDefluence: 75,
    betAmount: 250,
    currentRound: 3,
    maxRounds: 5,
    yodhaOneDamage: 120,
    yodhaTwoDamage: 95,
    playerOneBets: [
      { address: "0x742d35Cc6634C0532925a3b8D", amount: 250 },
      { address: "0x832f45Cc6634C0532925a3c9E", amount: 500 }
    ],
    playerTwoBets: [
      { address: "0x952g56Dd7745D0643a36b4f0F", amount: 375 },
      { address: "0xa62h67Ee8856E0754b47c5g1G", amount: 250 }
    ],
    battlePhase: "ROUND_INTERVAL",
    roundStartTime: Date.now() - 45000,
    lastMoves: {
      yodhaOne: "STRIKE",
      yodhaTwo: "DODGE",
      yodhaOneDamage: 0,
      yodhaTwoDamage: 25,
      yodhaOneRecovery: 0,
      yodhaTwoRecovery: 10
    }
  }
];

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
}) => (
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
        {value}/{max}
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
        style={{ width: `${(value / max) * 100}%` }}
      />
    </div>
  </div>
);

const YodhaCard = ({ yodha, size = "normal" }: { yodha: Yodha; size?: "small" | "normal" | "large" }) => {
  const sizeClasses = {
    small: "w-16 h-20",
    normal: "w-24 h-32", 
    large: "w-32 h-40"
  };

  return (
    <div className={`${sizeClasses[size]} arcade-card rounded-lg p-2 flex flex-col items-center`}>
      <img 
        src={yodha.image} 
        alt={yodha.name}
        className="w-full h-3/5 object-cover rounded mb-1"
      />
      <div className="text-center">
        <h4 className="text-xs text-yellow-400 font-bold truncate w-full">{yodha.name}</h4>
        <Badge className={`text-xs ${getRankColor(yodha.rank)} mt-1`}>{yodha.rank}</Badge>
      </div>
    </div>
  );
};

const ArenaCard = ({ arena, onClick }: { arena: Arena; onClick: () => void }) => (
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
            {arena.rank} ARENA
          </h3>
          <div 
            className={`${getStateColor(arena.state)} text-white px-3 py-1 text-xs rounded-lg`}
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            {arena.state.replace('_', ' ')}
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
            {arena.address.slice(0, 6)}...{arena.address.slice(-4)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Yodhas Display */}
        <div className="lg:col-span-2">
          {arena.yodhaOne && arena.yodhaTwo ? (
            <div className="flex items-center justify-between gap-8">
              {/* Yodha One */}
              <div className="flex flex-col items-center gap-2 w-48">
                <div 
                  className="rounded-xl shadow-lg flex items-center justify-center aspect-square w-40 h-40 overflow-hidden"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%)',
                    border: '2px solid #ff8c00',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                >
                  <img 
                    src={arena.yodhaOne.image} 
                    alt={arena.yodhaOne.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h4 
                  className="text-lg text-orange-400 font-bold text-center mt-2 arcade-glow" 
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  {arena.yodhaOne.name}
                </h4>
              </div>

              {/* VS Section */}
              <div className="text-center">
                <div className="text-3xl text-red-500 mb-2">⚔️</div>
                <div 
                  className="text-base text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  VS
                </div>
              </div>

              {/* Yodha Two */}
              <div className="flex flex-col items-center gap-2 w-48">
                <div 
                  className="rounded-xl shadow-lg flex items-center justify-center aspect-square w-40 h-40 overflow-hidden"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%)',
                    border: '2px solid #ff8c00',
                    backdropFilter: 'blur(10px)',
                    WebkitBackdropFilter: 'blur(10px)'
                  }}
                >
                  <img 
                    src={arena.yodhaTwo.image} 
                    alt={arena.yodhaTwo.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h4 
                  className="text-lg text-orange-400 font-bold text-center mt-2 arcade-glow" 
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  {arena.yodhaTwo.name}
                </h4>
              </div>
            </div>
          ) : (
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
                    AWAITING NOBLE WARRIORS
                  </span>
                </div>
              </div>
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
                INITIALIZE BATTLE
              </button>
            </div>
          )}
        </div>

        {/* Arena Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
                BET AMOUNT
              </div>
              <div 
                className="text-lg text-orange-400 font-bold arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {arena.betAmount}
              </div>
              <div 
                className="text-xs text-orange-400"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                RANN
              </div>
            </div>
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
                ROUND
              </div>
              <div 
                className="text-lg text-white font-bold"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {arena.currentRound}/{arena.maxRounds}
              </div>
              <div 
                className="text-xs text-orange-400"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                PROGRESS
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                INFLUENCE
              </div>
              <div 
                className="text-sm text-green-400 font-bold"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {arena.costToInfluence}
              </div>
              <div 
                className="text-xs text-orange-400"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                RANN
              </div>
            </div>
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
                DEFLUENCE
              </div>
              <div 
                className="text-sm text-red-400 font-bold"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {arena.costToDefluence}
              </div>
              <div 
                className="text-xs text-orange-400"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                RANN
              </div>
            </div>
          </div>

          {/* Betting Info */}
          {(arena.playerOneBets.length > 0 || arena.playerTwoBets.length > 0) && (
            <div 
              className="p-3 rounded"
              style={{
                background: 'rgba(120, 160, 200, 0.1)',
                border: '1px solid #ff8c00'
              }}
            >
              <div 
                className="text-xs text-orange-400 mb-2"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                TOTAL BETS
              </div>
              <div className="flex justify-between text-sm">
                <div>
                  <span 
                    className="text-blue-400"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Y1: 
                  </span>
                  <span 
                    className="text-white"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.playerOneBets.reduce((sum, bet) => sum + bet.amount, 0)} RANN
                  </span>
                </div>
                <div>
                  <span 
                    className="text-purple-400"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Y2: 
                  </span>
                  <span 
                    className="text-white"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.playerTwoBets.reduce((sum, bet) => sum + bet.amount, 0)} RANN
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

export default function KurukshetraPage() {
  const { isConnected } = useAccount();
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [arenas, setArenas] = useState<Arena[]>(mockArenas);
  const [activeRank, setActiveRank] = useState<RankCategory>('UNRANKED');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [selectedYodha, setSelectedYodha] = useState<'ONE' | 'TWO' | null>(null);
  const [yodhaOneNFTId, setYodhaOneNFTId] = useState('');
  const [yodhaTwoNFTId, setYodhaTwoNFTId] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter arenas by rank
  const filteredArenas = arenas.filter(arena => arena.rank === activeRank);

  const handleArenaClick = (arena: Arena) => {
    setSelectedArena(arena);
    setIsModalOpen(true);
  };

  const handleBet = (yodha: 'ONE' | 'TWO') => {
    if (!betAmount || !selectedArena) return;
    
    // Mock betting logic
    console.log(`Betting ${betAmount} RANN on Yodha ${yodha}`);
    setIsModalOpen(false);
    setBetAmount('');
    setSelectedYodha(null);
  };

  const handleInfluence = (yodha: 'ONE' | 'TWO') => {
    if (!selectedArena) return;
    
    // Mock influence logic
    console.log(`Influencing Yodha ${yodha} for ${selectedArena.costToInfluence} RANN`);
  };

  const handleDefluence = (yodha: 'ONE' | 'TWO') => {
    if (!selectedArena) return;
    
    // Mock defluence logic  
    console.log(`Defluencing Yodha ${yodha} for ${selectedArena.costToDefluence} RANN`);
  };

  const handleInitializeArena = async () => {
    if (!yodhaOneNFTId || !yodhaTwoNFTId || !selectedArena) return;
    
    try {
      // Mock initialization logic - replace with actual contract call
      console.log(`Initializing arena ${selectedArena.id} with Yodha One: ${yodhaOneNFTId}, Yodha Two: ${yodhaTwoNFTId}`);
      
      // Mock successful initialization - update arena state
      const updatedArenas = arenas.map(arena => {
        if (arena.id === selectedArena.id) {
          return {
            ...arena,
            state: 'INITIALIZED' as ArenaState,
            yodhaOne: {
              ...mockYodhas[0], // In real app, fetch from contract using yodhaOneNFTId
              id: parseInt(yodhaOneNFTId)
            },
            yodhaTwo: {
              ...mockYodhas[1], // In real app, fetch from contract using yodhaTwoNFTId  
              id: parseInt(yodhaTwoNFTId)
            }
          };
        }
        return arena;
      });
      
      setArenas(updatedArenas);
      setSelectedArena(updatedArenas.find(a => a.id === selectedArena.id) || null);
      
      // Reset form
      setYodhaOneNFTId('');
      setYodhaTwoNFTId('');
      
      // Show success message or keep modal open to show the initialized arena
      // setIsModalOpen(false); // Commented out to show the updated arena state
      
    } catch (error) {
      console.error('Failed to initialize arena:', error);
      // Handle error - show notification to user
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
              {filteredArenas.map((arena) => (
                <ArenaCard 
                  key={arena.id} 
                  arena={arena} 
                  onClick={() => handleArenaClick(arena)}
                />
              ))}
            </div>

            {filteredArenas.length === 0 && (
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

        {/* Arena Detail Modal */}
        {selectedArena && (
          <ArenaModal
            arena={selectedArena}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onBet={handleBet}
            onInfluence={handleInfluence}
            onDefluence={handleDefluence}
            onInitialize={handleInitializeArena}
            betAmount={betAmount}
            setBetAmount={setBetAmount}
            selectedYodha={selectedYodha}
            setSelectedYodha={setSelectedYodha}
            yodhaOneNFTId={yodhaOneNFTId}
            setYodhaOneNFTId={setYodhaOneNFTId}
            yodhaTwoNFTId={yodhaTwoNFTId}
            setYodhaTwoNFTId={setYodhaTwoNFTId}
          />
        )}
      </div>
    </div>
  );
}

// Create Arena Form Component
const CreateArenaForm = () => {
  const [costToInfluence, setCostToInfluence] = useState('');
  const [costToDefluence, setCostToDefluence] = useState('');
  const [betAmount, setBetAmount] = useState('');
  const [rank, setRank] = useState<RankCategory>('UNRANKED');

  const handleCreate = () => {
    // Mock arena creation logic
    console.log('Creating arena:', {
      costToInfluence,
      costToDefluence, 
      betAmount,
      rank
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="create-arena-form">
        <CardHeader>
          <CardTitle className="text-yellow-400 text-center arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
            CREATE NEW ARENA
          </CardTitle>
          <p className="text-center text-gray-400 text-sm mt-2">
            Forge a new battlefield for epic Yodha battles
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 text-sm mb-2 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                INFLUENCE COST (RANN)
              </label>
              <input
                type="number"
                value={costToInfluence}
                onChange={(e) => setCostToInfluence(e.target.value)}
                className="w-full p-3 bg-stone-800 border-2 border-yellow-600 rounded text-white arcade-border transition-all focus:border-yellow-400 focus:shadow-lg"
                placeholder="10"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              />
            </div>
            <div>
              <label className="block text-yellow-300 text-sm mb-2 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                DEFLUENCE COST (RANN)
              </label>
              <input
                type="number"
                value={costToDefluence}
                onChange={(e) => setCostToDefluence(e.target.value)}
                className="w-full p-3 bg-stone-800 border-2 border-yellow-600 rounded text-white arcade-border transition-all focus:border-yellow-400 focus:shadow-lg"
                placeholder="15"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-yellow-300 text-sm mb-2 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                BET AMOUNT (RANN)
              </label>
              <input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full p-3 bg-stone-800 border-2 border-yellow-600 rounded text-white arcade-border transition-all focus:border-yellow-400 focus:shadow-lg"
                placeholder="50"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              />
            </div>
            <div>
              <label className="block text-yellow-300 text-sm mb-2 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                RANK CATEGORY
              </label>
              <select
                value={rank}
                onChange={(e) => setRank(e.target.value as RankCategory)}
                className="w-full p-3 bg-stone-800 border-2 border-yellow-600 rounded text-white arcade-border transition-all focus:border-yellow-400 focus:shadow-lg"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                <option value="UNRANKED">UNRANKED</option>
                <option value="BRONZE">BRONZE</option>
                <option value="SILVER">SILVER</option>
                <option value="GOLD">GOLD</option>
                <option value="PLATINUM">PLATINUM</option>
              </select>
            </div>
          </div>

          <Button 
            onClick={handleCreate}
            className="w-full arcade-button py-4 text-sm"
            disabled={!costToInfluence || !costToDefluence || !betAmount}
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            CREATE ARENA
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

// Arena Detail Modal Component  
const ArenaModal = ({ 
  arena, 
  isOpen, 
  onClose, 
  onBet, 
  onInfluence, 
  onDefluence,
  onInitialize,
  betAmount,
  setBetAmount,
  selectedYodha,
  setSelectedYodha,
  yodhaOneNFTId,
  setYodhaOneNFTId,
  yodhaTwoNFTId,
  setYodhaTwoNFTId
}: {
  arena: Arena;
  isOpen: boolean;
  onClose: () => void;
  onBet: (yodha: 'ONE' | 'TWO') => void;
  onInfluence: (yodha: 'ONE' | 'TWO') => void;
  onDefluence: (yodha: 'ONE' | 'TWO') => void;
  onInitialize: () => void;
  betAmount: string;
  setBetAmount: (amount: string) => void;
  selectedYodha: 'ONE' | 'TWO' | null;
  setSelectedYodha: (yodha: 'ONE' | 'TWO' | null) => void;
  yodhaOneNFTId: string;
  setYodhaOneNFTId: (id: string) => void;
  yodhaTwoNFTId: string;
  setYodhaTwoNFTId: (id: string) => void;
}) => {
  if (!isOpen) return null;

  const totalYodhaOneBets = arena.playerOneBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalYodhaTwoBets = arena.playerTwoBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPot = totalYodhaOneBets + totalYodhaTwoBets;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div 
        className="max-w-7xl w-full max-h-[90vh] overflow-y-auto"
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
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 
              className="text-2xl text-orange-400 arcade-glow" 
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {arena.rank} ARENA
            </h2>
            <button 
              onClick={onClose}
              className="text-orange-400 hover:text-orange-300 text-2xl transition-colors"
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              ×
            </button>
          </div>

          {/* Battle State */}
          <div className="text-center mb-6">
            <div 
              className={`${getStateColor(arena.state)} text-white text-sm px-4 py-2 rounded-lg inline-block`}
              style={{fontFamily: 'Press Start 2P, monospace'}}
            >
              {arena.state.replace('_', ' ')}
            </div>
            {arena.state === 'BATTLE_ONGOING' && (
              <div className="mt-2">
                <div 
                  className="text-orange-400"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  Round {arena.currentRound}/{arena.maxRounds}
                </div>
                <div 
                  className="text-sm text-blue-400 mt-1"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  Phase: {arena.battlePhase.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>

          {/* Arena Initialization Form - Only for EMPTY arenas */}
          {arena.state === 'EMPTY' && (
            <div 
              className="p-6 mb-6"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '2px solid #ff8c00',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                borderRadius: '20px'
              }}
            >
              <h3 
                className="text-orange-400 text-lg mb-6 text-center arcade-glow" 
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                INITIALIZE BATTLE
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label 
                    className="block text-orange-400 text-sm mb-3"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Yodha One NFT ID
                  </label>
                  <input
                    type="number"
                    value={yodhaOneNFTId}
                    onChange={(e) => setYodhaOneNFTId(e.target.value)}
                    className="w-full p-3 rounded text-white"
                    style={{
                      background: 'rgba(120, 160, 200, 0.1)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontFamily: 'Press Start 2P, monospace'
                    }}
                    placeholder="Enter NFT ID for Yodha One"
                    min="1"
                  />
                </div>
                
                <div>
                  <label 
                    className="block text-orange-400 text-sm mb-3"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Yodha Two NFT ID
                  </label>
                  <input
                    type="number"
                    value={yodhaTwoNFTId}
                    onChange={(e) => setYodhaTwoNFTId(e.target.value)}
                    className="w-full p-3 rounded text-white"
                    style={{
                      background: 'rgba(120, 160, 200, 0.1)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      fontFamily: 'Press Start 2P, monospace'
                    }}
                    placeholder="Enter NFT ID for Yodha Two"
                    min="1"
                  />
                </div>
              </div>

              <div className="text-center space-y-4">
                <div 
                  className="text-sm text-orange-400"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  Arena Details: <span className="text-orange-400">{arena.rank}</span> • 
                  Bet Amount: <span className="text-orange-400">{arena.betAmount} RANN</span>
                </div>
                
                <button
                  onClick={onInitialize}
                  className="arcade-button px-8 py-3"
                  disabled={!yodhaOneNFTId || !yodhaTwoNFTId}
                  style={{fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px'
                  }}
                >
                  INITIALIZE ARENA
                </button>
                
                {(!yodhaOneNFTId || !yodhaTwoNFTId) && (
                  <div 
                    className="text-red-400 text-xs"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Please enter both Yodha NFT IDs to initialize the arena
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Yodhas Display */}
          {arena.yodhaOne && arena.yodhaTwo && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Yodha One */}
              <div 
                className="space-y-4 p-4"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                  borderRadius: '20px'
                }}
              >
                <div className="text-center">
                  <h3 
                    className="text-orange-400 mb-2 arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Yodha One
                  </h3>
                  <div 
                    className="w-32 h-40 mx-auto mb-2 overflow-hidden rounded"
                    style={{
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                  >
                    <img 
                      src={arena.yodhaOne.image} 
                      alt={arena.yodhaOne.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 
                    className="text-orange-400 font-bold arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaOne.name}
                  </h4>
                  <div 
                    className={`${getRankColor(arena.yodhaOne.rank)} inline-block px-2 py-1 rounded mt-2`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaOne.rank}
                  </div>
                </div>

                {/* Traits */}
                <div className="space-y-2">
                  <div 
                    className="text-sm text-orange-400 mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    TRAITS
                  </div>
                  <TraitBar label="Strength" value={arena.yodhaOne.strength} />
                  <TraitBar label="Defense" value={arena.yodhaOne.defense} />
                  <TraitBar label="Charisma" value={arena.yodhaOne.charisma} />
                  <TraitBar label="Wit" value={arena.yodhaOne.wit} />
                  <TraitBar label="Personality" value={arena.yodhaOne.personality} />
                </div>

                {/* Action Buttons */}
                {arena.state === 'BATTLE_ONGOING' && arena.battlePhase === 'ROUND_INTERVAL' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => onInfluence('ONE')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      <TrendingUp className="w-4 h-4 mr-2 inline" />
                      Influence ({arena.costToInfluence} RANN)
                    </button>
                    <button
                      onClick={() => onDefluence('ONE')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      <TrendingDown className="w-4 h-4 mr-2 inline" />
                      Defluence ({arena.costToDefluence} RANN)
                    </button>
                  </div>
                )}
              </div>

              {/* Battle Center */}
              <div className="space-y-6">
                {/* VS */}
                <div className="text-center">
                  <div className="text-4xl text-red-500 mb-4">⚔️</div>
                  <div 
                    className="text-xl text-orange-400 arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    VS
                  </div>
                </div>

                {/* Last Moves Display */}
                {arena.lastMoves && arena.state === 'BATTLE_ONGOING' && (
                  <div 
                    className="p-4 text-center"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                      borderRadius: '20px'
                    }}
                  >
                    <div 
                      className="text-sm text-orange-400 mb-2"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Last Round
                    </div>
                    <div className="flex justify-center items-center gap-4 mb-2">
                      <div className="text-center">
                        {getMoveIcon(arena.lastMoves.yodhaOne)}
                        <div 
                          className="text-xs text-orange-400 mt-1"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          {arena.lastMoves.yodhaOne}
                        </div>
                      </div>
                      <span 
                        className="text-orange-400"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        vs
                      </span>
                      <div className="text-center">
                        {getMoveIcon(arena.lastMoves.yodhaTwo)}
                        <div 
                          className="text-xs text-orange-400 mt-1"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          {arena.lastMoves.yodhaTwo}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span 
                          className="text-red-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          DMG: {arena.lastMoves.yodhaTwoDamage}
                        </span>
                        <br />
                        <span 
                          className="text-green-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          REC: {arena.lastMoves.yodhaOneRecovery}
                        </span>
                      </div>
                      <div>
                        <span 
                          className="text-red-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          DMG: {arena.lastMoves.yodhaOneDamage}
                        </span>
                        <br />
                        <span 
                          className="text-green-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          REC: {arena.lastMoves.yodhaTwoRecovery}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Damages */}
                {arena.state === 'BATTLE_ONGOING' && (
                  <div 
                    className="p-4 text-center"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(15px)',
                      WebkitBackdropFilter: 'blur(15px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                      borderRadius: '20px'
                    }}
                  >
                    <div 
                      className="text-sm text-orange-400 mb-2"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Total Damage
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div 
                          className="text-red-400 text-lg font-bold"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          {arena.yodhaOneDamage}
                        </div>
                        <div 
                          className="text-xs text-orange-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          Yodha One
                        </div>
                      </div>
                      <div>
                        <div 
                          className="text-red-400 text-lg font-bold"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          {arena.yodhaTwoDamage}
                        </div>
                        <div 
                          className="text-xs text-orange-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          Yodha Two
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Winner Announcement */}
                {arena.winner && (
                  <div className="arcade-card p-6 text-center">
                    <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <div className="text-xl text-yellow-400 mb-2">WINNER!</div>
                    <div className="text-lg text-white">
                      {arena.winner === 'ONE' ? arena.yodhaOne.name : arena.yodhaTwo.name}
                    </div>
                    <Button className="mt-4 arcade-button">
                      Initialize New Battle
                    </Button>
                  </div>
                )}
              </div>

              {/* Yodha Two */}
              <div 
                className="space-y-4 p-4"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                  borderRadius: '20px'
                }}
              >
                <div className="text-center">
                  <h3 
                    className="text-orange-400 mb-2 arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Yodha Two
                  </h3>
                  <div 
                    className="w-32 h-40 mx-auto mb-2 overflow-hidden rounded"
                    style={{
                      border: '2px solid #ff8c00',
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)'
                    }}
                  >
                    <img 
                      src={arena.yodhaTwo.image} 
                      alt={arena.yodhaTwo.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 
                    className="text-orange-400 font-bold arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaTwo.name}
                  </h4>
                  <div 
                    className={`${getRankColor(arena.yodhaTwo.rank)} inline-block px-2 py-1 rounded mt-2`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaTwo.rank}
                  </div>
                </div>
                
                {/* Traits */}
                <div className="space-y-2">
                  <div 
                    className="text-sm text-orange-400 mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    TRAITS
                  </div>
                  <TraitBar label="Strength" value={arena.yodhaTwo.strength} />
                  <TraitBar label="Defense" value={arena.yodhaTwo.defense} />
                  <TraitBar label="Charisma" value={arena.yodhaTwo.charisma} />
                  <TraitBar label="Wit" value={arena.yodhaTwo.wit} />
                  <TraitBar label="Personality" value={arena.yodhaTwo.personality} />
                </div>

                {/* Action Buttons */}
                {arena.state === 'BATTLE_ONGOING' && arena.battlePhase === 'ROUND_INTERVAL' && (
                  <div className="space-y-2">
                    <button
                      onClick={() => onInfluence('TWO')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      <TrendingUp className="w-4 h-4 mr-2 inline" />
                      Influence ({arena.costToInfluence} RANN)
                    </button>
                    <button
                      onClick={() => onDefluence('TWO')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      <TrendingDown className="w-4 h-4 mr-2 inline" />
                      Defluence ({arena.costToDefluence} RANN)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Betting Interface */}
          {arena.state === 'INITIALIZED' && (
            <div 
              className="p-6 mb-6"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '2px solid #ff8c00',
                backdropFilter: 'blur(15px)',
                WebkitBackdropFilter: 'blur(15px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.2)',
                borderRadius: '20px'
              }}
            >
              <h3 
                className="text-orange-400 text-lg mb-4 text-center arcade-glow" 
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                Place Your Bets
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yodha One Betting */}
                <div className="text-center">
                  <div 
                    className="text-lg text-orange-400 mb-2 arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaOne?.name}
                  </div>
                  <div 
                    className="text-sm text-orange-400 mb-4"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Total Bets: {totalYodhaOneBets} RANN
                  </div>
                  <button
                    onClick={() => setSelectedYodha('ONE')}
                    className={`w-full px-4 py-2 rounded transition-all ${selectedYodha === 'ONE' ? 'bg-yellow-600' : 'arcade-button'}`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Bet on Yodha One
                  </button>
                </div>

                {/* Yodha Two Betting */}
                <div className="text-center">
                  <div 
                    className="text-lg text-orange-400 mb-2 arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {arena.yodhaTwo?.name}
                  </div>
                  <div 
                    className="text-sm text-orange-400 mb-4"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Total Bets: {totalYodhaTwoBets} RANN
                  </div>
                  <button
                    onClick={() => setSelectedYodha('TWO')}
                    className={`w-full px-4 py-2 rounded transition-all ${selectedYodha === 'TWO' ? 'bg-yellow-600' : 'arcade-button'}`}
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Bet on Yodha Two
                  </button>
                </div>
              </div>

              {/* Bet Amount Input */}
              {selectedYodha && (
                <div className="mt-6 max-w-md mx-auto">
                  <label 
                    className="block text-orange-400 text-sm mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    Bet Amount (Minimum: {arena.betAmount} RANN)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="flex-1 p-3 rounded text-white"
                      style={{
                        background: 'rgba(120, 160, 200, 0.1)',
                        border: '2px solid #ff8c00',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        fontFamily: 'Press Start 2P, monospace'
                      }}
                      placeholder={arena.betAmount.toString()}
                      min={arena.betAmount}
                    />
                    <button
                      onClick={() => onBet(selectedYodha)}
                      className="arcade-button px-4 py-3"
                      disabled={!betAmount || parseInt(betAmount) < arena.betAmount}
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      Place Bet
                    </button>
                  </div>
                </div>
              )}

              {/* Total Pot */}
              <div className="text-center mt-6">
                <div 
                  className="text-lg text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  Total Pot: {totalPot} RANN
                </div>
              </div>
            </div>
          )}

          {/* Betting History */}
          {(arena.playerOneBets.length > 0 || arena.playerTwoBets.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Yodha One Bets */}
              <div className="arcade-card p-4">
                <h4 className="text-yellow-400 mb-3">Yodha One Supporters</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {arena.playerOneBets.map((bet, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {bet.address.slice(0, 6)}...{bet.address.slice(-4)}
                      </span>
                      <span className="text-white">{bet.amount} RANN</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Yodha Two Bets */}
              <div className="arcade-card p-4">
                <h4 className="text-yellow-400 mb-3">Yodha Two Supporters</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {arena.playerTwoBets.map((bet, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-400">
                        {bet.address.slice(0, 6)}...{bet.address.slice(-4)}
                      </span>
                      <span className="text-white">{bet.amount} RANN</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
