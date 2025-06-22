'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
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
const TraitBar = ({ label, value, max = 100, color = "bg-yellow-400" }: {
  label: string;
  value: number;
  max?: number;
  color?: string;
}) => (
  <div className="mb-2">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-yellow-300">{label}</span>
      <span className="text-white">{value}/{max}</span>
    </div>
    <div className="w-full bg-gray-700 rounded-full h-2">
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
  <Card 
    className="arena-list-card cursor-pointer w-full"
    onClick={onClick}
  >
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-xl text-yellow-400 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
            {arena.rank} ARENA
          </h3>
          <Badge className={`${getStateColor(arena.state)} text-white px-3 py-1`}>
            {arena.state.replace('_', ' ')}
          </Badge>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">Address</div>
          <div className="text-yellow-400 text-sm font-mono">
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
                <div className="yodha-image-container arcade-border rounded-xl shadow-lg bg-stone-800 flex items-center justify-center aspect-square w-40 h-40 overflow-hidden">
                  <img 
                    src={arena.yodhaOne.image} 
                    alt={arena.yodhaOne.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h4 className="text-lg text-white font-bold text-center mt-2">{arena.yodhaOne.name}</h4>
              </div>

              {/* VS Section */}
              <div className="text-center">
                <div className="text-3xl text-red-500 mb-2">⚔️</div>
                <div className="text-base text-yellow-400 arcade-glow">VS</div>
              </div>

              {/* Yodha Two */}
              <div className="flex flex-col items-center gap-2 w-48">
                <div className="yodha-image-container arcade-border rounded-xl shadow-lg bg-stone-800 flex items-center justify-center aspect-square w-40 h-40 overflow-hidden">
                  <img 
                    src={arena.yodhaTwo.image} 
                    alt={arena.yodhaTwo.name}
                    className="object-cover w-full h-full"
                  />
                </div>
                <h4 className="text-lg text-white font-bold text-center mt-2">{arena.yodhaTwo.name}</h4>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-full h-24 border-2 border-dashed border-gray-600 rounded flex items-center justify-center mb-4">
                <div className="text-center">
                  <Crown className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                  <span className="text-gray-400">Awaiting Noble Warriors</span>
                </div>
              </div>
              <Button 
                className="arcade-button text-xs px-4 py-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick();
                }}
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                INITIALIZE BATTLE
              </Button>
            </div>
          )}
        </div>

        {/* Arena Stats */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 arena-stat-box rounded">
              <div className="text-xs text-gray-400 mb-1">BET AMOUNT</div>
              <div className="text-lg text-yellow-400 font-bold">{arena.betAmount}</div>
              <div className="text-xs text-gray-400">RANN</div>
            </div>
            <div className="text-center p-3 arena-stat-box rounded">
              <div className="text-xs text-gray-400 mb-1">ROUND</div>
              <div className="text-lg text-white font-bold">{arena.currentRound}/{arena.maxRounds}</div>
              <div className="text-xs text-gray-400">PROGRESS</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 arena-stat-box rounded">
              <div className="text-xs text-gray-400 mb-1">INFLUENCE</div>
              <div className="text-sm text-green-400 font-bold">{arena.costToInfluence}</div>
              <div className="text-xs text-gray-400">RANN</div>
            </div>
            <div className="text-center p-3 arena-stat-box rounded">
              <div className="text-xs text-gray-400 mb-1">DEFLUENCE</div>
              <div className="text-sm text-red-400 font-bold">{arena.costToDefluence}</div>
              <div className="text-xs text-gray-400">RANN</div>
            </div>
          </div>

          {/* Betting Info */}
          {(arena.playerOneBets.length > 0 || arena.playerTwoBets.length > 0) && (
            <div className="p-3 arena-stat-box rounded">
              <div className="text-xs text-gray-400 mb-2">TOTAL BETS</div>
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-blue-400">Y1: </span>
                  <span className="text-white">
                    {arena.playerOneBets.reduce((sum, bet) => sum + bet.amount, 0)} RANN
                  </span>
                </div>
                <div>
                  <span className="text-purple-400">Y2: </span>
                  <span className="text-white">
                    {arena.playerTwoBets.reduce((sum, bet) => sum + bet.amount, 0)} RANN
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
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

  if (!isConnected) {
    return (
      <div className="min-h-screen battlefield-bg flex items-center justify-center">
        <div className="text-center">
          <div className="arcade-card p-8 max-w-md">
            <h1 className="text-2xl text-yellow-400 mb-4 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
              KURUKSHETRA
            </h1>
            <p className="text-gray-300 mb-6">
              Connect your wallet to enter the legendary battlefield and witness epic Yodha battles!
            </p>
            <div className="text-yellow-400 text-sm">
              ⚠️ Wallet connection required
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen battlefield-bg p-6">
      <div className="container mx-auto max-w-7xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl text-yellow-400 mb-4 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
            KURUKSHETRA
          </h1>
          <p className="text-gray-300 text-lg">
            The Ultimate Battlefield Where Legends Clash
          </p>
        </header>

        <Tabs defaultValue="active" className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-md grid-cols-2 arcade-tabs p-2 py-8">
              <TabsTrigger value="active" className="arcade-tab-trigger text-yellow-400 text-xs">
                ACTIVE ARENAS
              </TabsTrigger>
              <TabsTrigger value="create" className="arcade-tab-trigger text-yellow-400 text-xs">
                CREATE ARENA
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="space-y-6 tab-content-enter">
            {/* Rank Filter Tabs */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rank-filter-container rounded-lg p-2 shadow-lg">
                {(['UNRANKED', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'] as RankCategory[]).map((rank) => (
                  <button
                    key={rank}
                    onClick={() => setActiveRank(rank)}
                    className={`px-4 py-3 text-xs rounded-md transition-all duration-300 rank-button rank-${rank.toLowerCase()} ${
                      activeRank === rank ? 'active' : ''
                    }`}
                  >
                    {rank}
                  </button>
                ))}
              </div>
            </div>

            {/* Arena List */}
            <div className="space-y-4">
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
                <div className="text-gray-400 text-lg mb-4">No arenas found for {activeRank} rank</div>
                <p className="text-gray-500">Check other ranks or create a new arena</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-6 tab-content-enter">
            <CreateArenaForm />
          </TabsContent>
        </Tabs>

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
      <div className="bg-stone-900 arcade-border rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-yellow-400 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
              {arena.rank} ARENA
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* Battle State */}
          <div className="text-center mb-6">
            <Badge className={`${getStateColor(arena.state)} text-white text-sm px-4 py-2`}>
              {arena.state.replace('_', ' ')}
            </Badge>
            {arena.state === 'BATTLE_ONGOING' && (
              <div className="mt-2">
                <div className="text-yellow-400">Round {arena.currentRound}/{arena.maxRounds}</div>
                <div className="text-sm text-blue-400 mt-1">
                  Phase: {arena.battlePhase.replace('_', ' ')}
                </div>
              </div>
            )}
          </div>

          {/* Arena Initialization Form - Only for EMPTY arenas */}
          {arena.state === 'EMPTY' && (
            <div className="arcade-card p-6 mb-6">
              <h3 className="text-yellow-400 text-lg mb-6 text-center" style={{fontFamily: 'Press Start 2P, monospace'}}>
                INITIALIZE BATTLE
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-yellow-300 text-sm mb-3">
                    Yodha One NFT ID
                  </label>
                  <input
                    type="number"
                    value={yodhaOneNFTId}
                    onChange={(e) => setYodhaOneNFTId(e.target.value)}
                    className="w-full p-3 bg-stone-800 border border-yellow-600 rounded text-white"
                    placeholder="Enter NFT ID for Yodha One"
                    min="1"
                  />
                </div>
                
                <div>
                  <label className="block text-yellow-300 text-sm mb-3">
                    Yodha Two NFT ID
                  </label>
                  <input
                    type="number"
                    value={yodhaTwoNFTId}
                    onChange={(e) => setYodhaTwoNFTId(e.target.value)}
                    className="w-full p-3 bg-stone-800 border border-yellow-600 rounded text-white"
                    placeholder="Enter NFT ID for Yodha Two"
                    min="1"
                  />
                </div>
              </div>

              <div className="text-center space-y-4">
                <div className="text-sm text-gray-400">
                  Arena Details: <span className="text-yellow-400">{arena.rank}</span> • 
                  Bet Amount: <span className="text-yellow-400">{arena.betAmount} RANN</span>
                </div>
                
                <Button 
                  onClick={onInitialize}
                  className="arcade-button px-8 py-3"
                  disabled={!yodhaOneNFTId || !yodhaTwoNFTId}
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  <Sword className="w-4 h-4 mr-2" />
                  INITIALIZE ARENA
                </Button>
                
                {(!yodhaOneNFTId || !yodhaTwoNFTId) && (
                  <div className="text-red-400 text-xs">
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
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-yellow-400 mb-2">Yodha One</h3>
                  <img 
                    src={arena.yodhaOne.image} 
                    alt={arena.yodhaOne.name}
                    className="w-32 h-40 object-cover rounded mx-auto mb-2 arcade-border"
                  />
                  <h4 className="text-white font-bold">{arena.yodhaOne.name}</h4>
                  <Badge className={getRankColor(arena.yodhaOne.rank)}>{arena.yodhaOne.rank}</Badge>
                </div>
                
                {/* Health Bar */}
                {arena.state === 'BATTLE_ONGOING' && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Health</div>
                    <Progress 
                      value={Math.max(0, 100 - (arena.yodhaOneDamage / 2))} 
                      className="w-full h-3"
                    />
                    <div className="text-sm text-red-400 text-center">
                      {arena.yodhaOneDamage} Damage Taken
                    </div>
                  </div>
                )}

                {/* Traits */}
                <div className="space-y-2">
                  <TraitBar label="Strength" value={arena.yodhaOne.strength} />
                  <TraitBar label="Defense" value={arena.yodhaOne.defense} />
                  <TraitBar label="Charisma" value={arena.yodhaOne.charisma} />
                  <TraitBar label="Wit" value={arena.yodhaOne.wit} />
                  <TraitBar label="Personality" value={arena.yodhaOne.personality} />
                </div>

                {/* Action Buttons */}
                {arena.state === 'BATTLE_ONGOING' && arena.battlePhase === 'ROUND_INTERVAL' && (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => onInfluence('ONE')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Influence ({arena.costToInfluence} RANN)
                    </Button>
                    <Button 
                      onClick={() => onDefluence('ONE')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Defluence ({arena.costToDefluence} RANN)
                    </Button>
                  </div>
                )}
              </div>

              {/* Battle Center */}
              <div className="space-y-6">
                {/* VS */}
                <div className="text-center">
                  <div className="text-4xl text-red-500 mb-4">⚔️</div>
                  <div className="text-xl text-yellow-400 arcade-glow">VS</div>
                </div>

                {/* Last Moves Display */}
                {arena.lastMoves && arena.state === 'BATTLE_ONGOING' && (
                  <div className="arcade-card p-4 text-center">
                    <div className="text-sm text-yellow-400 mb-2">Last Round</div>
                    <div className="flex justify-center items-center gap-4 mb-2">
                      <div className="text-center">
                        {getMoveIcon(arena.lastMoves.yodhaOne)}
                        <div className="text-xs text-gray-400 mt-1">{arena.lastMoves.yodhaOne}</div>
                      </div>
                      <span className="text-gray-400">vs</span>
                      <div className="text-center">
                        {getMoveIcon(arena.lastMoves.yodhaTwo)}
                        <div className="text-xs text-gray-400 mt-1">{arena.lastMoves.yodhaTwo}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-red-400">DMG: {arena.lastMoves.yodhaTwoDamage}</span>
                        <br />
                        <span className="text-green-400">REC: {arena.lastMoves.yodhaOneRecovery}</span>
                      </div>
                      <div>
                        <span className="text-red-400">DMG: {arena.lastMoves.yodhaOneDamage}</span>
                        <br />
                        <span className="text-green-400">REC: {arena.lastMoves.yodhaTwoRecovery}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Total Damages */}
                {arena.state === 'BATTLE_ONGOING' && (
                  <div className="arcade-card p-4 text-center">
                    <div className="text-sm text-yellow-400 mb-2">Total Damage</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-red-400 text-lg font-bold">{arena.yodhaOneDamage}</div>
                        <div className="text-xs text-gray-400">Yodha One</div>
                      </div>
                      <div>
                        <div className="text-red-400 text-lg font-bold">{arena.yodhaTwoDamage}</div>
                        <div className="text-xs text-gray-400">Yodha Two</div>
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
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="text-yellow-400 mb-2">Yodha Two</h3>
                  <img 
                    src={arena.yodhaTwo.image} 
                    alt={arena.yodhaTwo.name}
                    className="w-32 h-40 object-cover rounded mx-auto mb-2 arcade-border"
                  />
                  <h4 className="text-white font-bold">{arena.yodhaTwo.name}</h4>
                  <Badge className={getRankColor(arena.yodhaTwo.rank)}>{arena.yodhaTwo.rank}</Badge>
                </div>
                
                {/* Health Bar */}
                {arena.state === 'BATTLE_ONGOING' && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-400">Health</div>
                    <Progress 
                      value={Math.max(0, 100 - (arena.yodhaTwoDamage / 2))} 
                      className="w-full h-3"
                    />
                    <div className="text-sm text-red-400 text-center">
                      {arena.yodhaTwoDamage} Damage Taken
                    </div>
                  </div>
                )}

                {/* Traits */}
                <div className="space-y-2">
                  <TraitBar label="Strength" value={arena.yodhaTwo.strength} />
                  <TraitBar label="Defense" value={arena.yodhaTwo.defense} />
                  <TraitBar label="Charisma" value={arena.yodhaTwo.charisma} />
                  <TraitBar label="Wit" value={arena.yodhaTwo.wit} />
                  <TraitBar label="Personality" value={arena.yodhaTwo.personality} />
                </div>

                {/* Action Buttons */}
                {arena.state === 'BATTLE_ONGOING' && arena.battlePhase === 'ROUND_INTERVAL' && (
                  <div className="space-y-2">
                    <Button 
                      onClick={() => onInfluence('TWO')}
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                    >
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Influence ({arena.costToInfluence} RANN)
                    </Button>
                    <Button 
                      onClick={() => onDefluence('TWO')}
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                    >
                      <TrendingDown className="w-4 h-4 mr-2" />
                      Defluence ({arena.costToDefluence} RANN)
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Betting Interface */}
          {arena.state === 'INITIALIZED' && (
            <div className="arcade-card p-6 mb-6">
              <h3 className="text-yellow-400 text-lg mb-4 text-center">Place Your Bets</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Yodha One Betting */}
                <div className="text-center">
                  <div className="text-lg text-white mb-2">{arena.yodhaOne?.name}</div>
                  <div className="text-sm text-gray-400 mb-4">
                    Total Bets: {totalYodhaOneBets} RANN
                  </div>
                  <Button
                    onClick={() => setSelectedYodha('ONE')}
                    className={`w-full ${selectedYodha === 'ONE' ? 'bg-yellow-600' : 'arcade-button'}`}
                  >
                    Bet on Yodha One
                  </Button>
                </div>

                {/* Yodha Two Betting */}
                <div className="text-center">
                  <div className="text-lg text-white mb-2">{arena.yodhaTwo?.name}</div>
                  <div className="text-sm text-gray-400 mb-4">
                    Total Bets: {totalYodhaTwoBets} RANN
                  </div>
                  <Button
                    onClick={() => setSelectedYodha('TWO')}
                    className={`w-full ${selectedYodha === 'TWO' ? 'bg-yellow-600' : 'arcade-button'}`}
                  >
                    Bet on Yodha Two
                  </Button>
                </div>
              </div>

              {/* Bet Amount Input */}
              {selectedYodha && (
                <div className="mt-6 max-w-md mx-auto">
                  <label className="block text-yellow-300 text-sm mb-2">
                    Bet Amount (Minimum: {arena.betAmount} RANN)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      className="flex-1 p-3 bg-stone-800 border border-yellow-600 rounded text-white"
                      placeholder={arena.betAmount.toString()}
                      min={arena.betAmount}
                    />
                    <Button 
                      onClick={() => onBet(selectedYodha)}
                      className="arcade-button"
                      disabled={!betAmount || parseInt(betAmount) < arena.betAmount}
                    >
                      Place Bet
                    </Button>
                  </div>
                </div>
              )}

              {/* Total Pot */}
              <div className="text-center mt-6">
                <div className="text-lg text-yellow-400">
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
