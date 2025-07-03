'use client';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Badge } from '../../components/ui/badge';
import { Modal } from '../../components/ui/modal';
import Image from 'next/image';
import Link from 'next/link';
import './leaderboard-glass.css';

// Types
type RankCategory = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

interface Yodha {
  id: number;
  name: string;
  image: string;
  rank: RankCategory;
  strength: number;
  defence: number;
  charisma: number;
  wit: number;
  luck: number;
  winnings: number;
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  owner: string;
}

// Mock data for leaderboard
const mockYodhas: Yodha[] = [
  {
    id: 1,
    name: "Arjuna the Mighty",
    image: "/lazered.png",
    rank: "GOLD",
    strength: 85,
    defence: 70,
    charisma: 60,
    wit: 75,
    luck: 80,
    winnings: 2500,
    bio: "The greatest archer of his time, known for his unwavering focus and divine weapons.",
    life_history: "Third Pandava brother, student of Dronacharya, winner of Draupadi's swayamvara.",
    adjectives: "Focused, Disciplined, Righteous, Skilled, Devoted",
    knowledge_areas: "Archery, Divine Weapons, Military Strategy, Music, Dance",
    owner: "0x742d35Cc6634C0532925a3b8D"
  },
  {
    id: 2,
    name: "Bhima the Destroyer",
    image: "/lazered.png", 
    rank: "GOLD",
    strength: 95,
    defence: 85,
    charisma: 40,
    wit: 45,
    luck: 70,
    winnings: 2200,
    bio: "The strongest among the Pandavas, known for his incredible physical power and appetite.",
    life_history: "Second Pandava brother, slayer of many demons, master of mace fighting.",
    adjectives: "Powerful, Fierce, Loyal, Hot-tempered, Protective",
    knowledge_areas: "Mace Fighting, Wrestling, Cooking, Demon Slaying",
    owner: "0x742d35Cc6634C0532925a3b8D"
  },
  {
    id: 3,
    name: "Nakula the Swift",
    image: "/lazered.png",
    rank: "SILVER",
    strength: 70,
    defence: 65,
    charisma: 85,
    wit: 70,
    luck: 75,
    winnings: 1800,
    bio: "Known for his beauty and expertise with horses and swordsmanship.",
    life_history: "Twin brother of Sahadeva, master of sword fighting and horse management.",
    adjectives: "Handsome, Swift, Skilled, Gentle, Noble",
    knowledge_areas: "Swordsmanship, Horse Training, Veterinary Skills, Ayurveda",
    owner: "0x832f45Cc6634C0532925a3c9E"
  },
  {
    id: 4,
    name: "Sahadeva the Wise",
    image: "/lazered.png",
    rank: "SILVER", 
    strength: 65,
    defence: 70,
    charisma: 75,
    wit: 90,
    luck: 80,
    winnings: 1600,
    bio: "The wisest among the Pandavas, skilled in astrology and cattle herding.",
    life_history: "Youngest Pandava, twin of Nakula, keeper of cattle, master of astrology.",
    adjectives: "Wise, Humble, Intelligent, Calm, Prophetic",
    knowledge_areas: "Astrology, Cattle Herding, Philosophy, Mathematics, Medicine",
    owner: "0x952g56Dd7745D0643a36b4f0F"
  },
  {
    id: 5,
    name: "Yudhishthira the Just",
    image: "/lazered.png",
    rank: "PLATINUM",
    strength: 60,
    defence: 75,
    charisma: 95,
    wit: 85,
    luck: 90,
    winnings: 3200,
    bio: "The eldest Pandava, known for his righteousness and adherence to dharma.",
    life_history: "King of Indraprastha, never spoke a lie, master of spear fighting and governance.",
    adjectives: "Righteous, Just, Noble, Truthful, Wise",
    knowledge_areas: "Governance, Dharma, Spear Fighting, Diplomacy, Law",
    owner: "0x742d35Cc6634C0532925a3b8D"
  },
  {
    id: 6,
    name: "Karna the Generous",
    image: "/lazered.png",
    rank: "PLATINUM",
    strength: 90,
    defence: 80,
    charisma: 85,
    wit: 70,
    luck: 40,
    winnings: 2800,
    bio: "The son of Surya, known for his generosity and unmatched archery skills.",
    life_history: "Adopted son of charioteer, friend of Duryodhana, rival of Arjuna.",
    adjectives: "Generous, Brave, Loyal, Skilled, Unfortunate",
    knowledge_areas: "Archery, Divine Weapons, Charity, Leadership, Warfare",
    owner: "0xa62h67Ee8856E0754b47c5g1G"
  }
];

// Utility functions
const getRankColor = (rank: RankCategory): string => {
  switch (rank) {
    case 'UNRANKED': return 'bg-gray-600 text-gray-200';
    case 'BRONZE': return 'bg-amber-700 text-amber-200';
    case 'SILVER': return 'bg-gray-400 text-gray-900';
    case 'GOLD': return 'bg-yellow-500 text-yellow-900';
    case 'PLATINUM': return 'bg-purple-600 text-purple-200';
    default: return 'bg-gray-600 text-gray-200';
  }
};

const TraitBar = ({ label, value }: { label: string; value: number }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-yellow-400">{label}</span>
      <span className="text-white">{value}</span>
    </div>
    <div className="w-full bg-stone-700 rounded-full h-2">
      <div 
        className="bg-gradient-to-r from-yellow-600 to-orange-500 h-2 rounded-full transition-all duration-300"
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
);

export default function LeaderboardPage() {
  const { isConnected } = useAccount();
  const [activeRank, setActiveRank] = useState<RankCategory>('PLATINUM');
  const [selectedYodha, setSelectedYodha] = useState<Yodha | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter and sort yodhas by rank and winnings
  const getYodhasByRank = (rank: RankCategory) => {
    return mockYodhas
      .filter(yodha => yodha.rank === rank)
      .sort((a, b) => b.winnings - a.winnings);
  };

  const handleYodhaClick = (yodha: Yodha) => {
    setSelectedYodha(yodha);
    setIsModalOpen(true);
  };

  // Show loading state until component mounts to prevent hydration mismatch
  if (!isMounted) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/Leaderboard.png"
            alt="Leaderboard Background"
            fill
            className="object-cover"
            priority
          />
          {/* Very subtle black overlay to darken background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            }}
          ></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen leaderboard-page">
          <div className="text-center">
            <div 
              className="arcade-card p-8 max-w-md"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              <h1 className="text-2xl text-orange-400 mb-4 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                LEADERBOARD
              </h1>
              <p className="text-gray-300 mb-6">
                Loading Hall of Legends...
              </p>
              <div className="text-orange-400 text-sm">
                ⚡ Initializing...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image */}
        <div className="fixed inset-0 -z-10">
          <Image
            src="/Leaderboard.png"
            alt="Leaderboard Background"
            fill
            className="object-cover"
            priority
          />
          {/* Very subtle black overlay to darken background */}
          <div 
            className="absolute inset-0"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.175)',
              zIndex: 1
            }}
          ></div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center min-h-screen leaderboard-page">
          <div className="text-center">
            <div 
              className="arcade-card p-8 max-w-md"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              <h1 className="text-2xl text-orange-400 mb-4 arcade-glow" style={{fontFamily: 'Press Start 2P, monospace'}}>
                LEADERBOARD
              </h1>
              <p className="text-gray-300 mb-6">
                Connect your wallet to view the Hall of Legends and witness the greatest warriors!
              </p>
              <div className="text-orange-400 text-sm">
                ⚠️ Wallet connection required
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Leaderboard.png"
          alt="Leaderboard Background"
          fill
          className="object-cover"
          priority
        />
        {/* Very subtle black overlay to darken background */}
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
        <div className="absolute top-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-orange-600 to-transparent opacity-30"></div>
        <div className="absolute bottom-1/4 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-30"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 container mx-auto px-6 py-12 leaderboard-page">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-4xl md:text-6xl text-orange-400 mb-6 tracking-widest arcade-glow"
            style={{
              fontFamily: 'Press Start 2P, monospace'
            }}
          >
            HALL OF LEGENDS
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
              className="text-white text-sm md:text-base tracking-wide arcade-glow"
              style={{
                fontFamily: 'Press Start 2P, monospace'
              }}
            >
              WITNESS THE GREATEST WARRIORS AND THEIR TRIUMPHS
            </p>
          </div>
        </div>

        {/* Rank Filter Tabs */}
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
            {(['PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'UNRANKED'] as RankCategory[]).map((rank) => (
              <button
                key={rank}
                onClick={() => setActiveRank(rank)}
                className={`px-4 py-3 text-xs tracking-wide transition-all duration-300 ${
                  activeRank === rank ? 'arcade-button' : 'border-2 border-gray-600 text-gray-300 hover:border-orange-600 hover:text-orange-400'
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

        {/* Leaderboard Content */}
        <div 
          className="arcade-card p-6"
          style={{
            background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
            border: '3px solid #ff8c00',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
            borderRadius: '24px'
          }}
        >
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center gap-4">
              <span className="text-2xl">🏆</span>
              <h2 
                className="text-xl text-orange-400 arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                {activeRank} WARRIORS
              </h2>
              <span className="text-2xl">🏆</span>
            </div>
          </div>

          {/* Yodha List */}
          <div className="space-y-4">
            {getYodhasByRank(activeRank).map((yodha, index) => (
              <div 
                key={yodha.id}
                className="arcade-card p-4 cursor-pointer hover:scale-105 transition-all duration-300"
                onClick={() => handleYodhaClick(yodha)}
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.1), rgba(100, 140, 180, 0.08) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.15) 0%, rgba(100, 140, 180, 0.1) 30%, rgba(120, 160, 200, 0.15) 100%)',
                  border: '2px solid #ff8c00',
                  backdropFilter: 'blur(15px)',
                  WebkitBackdropFilter: 'blur(15px)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 6px rgba(255, 140, 0, 0.2)',
                  borderRadius: '16px'
                }}
              >
                <div className="flex items-center gap-6">
                  {/* Rank Position */}
                  <div className="text-center min-w-12">
                    <div className="text-2xl text-orange-400 font-bold">
                      #{index + 1}
                    </div>
                    {index === 0 && <div className="text-lg">👑</div>}
                    {index === 1 && <div className="text-lg">🥈</div>}
                    {index === 2 && <div className="text-lg">🥉</div>}
                  </div>

                  {/* Yodha Image */}
                  <div className="w-20 h-20 border-2 border-orange-600 rounded-lg overflow-hidden bg-stone-800">
                    <Image 
                      src={yodha.image} 
                      alt={yodha.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Yodha Info */}
                  <div className="flex-1">
                    <div className="mb-2">
                      <h3 className="text-lg text-white font-bold">{yodha.name}</h3>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{yodha.bio}</p>
                    <div className="text-xs text-gray-500">
                      Owner: {yodha.owner.slice(0, 6)}...{yodha.owner.slice(-4)}
                    </div>
                  </div>

                  {/* Winnings */}
                  <div className="text-right">
                    <div className="text-sm text-gray-400">TOTAL WINNINGS</div>
                    <div className="text-2xl text-green-400 font-bold">
                      {yodha.winnings.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">RANN</div>
                  </div>
                </div>
              </div>
            ))}

            {getYodhasByRank(activeRank).length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-500 text-lg mb-2">👻</div>
                <p className="text-gray-400 text-sm">
                  No warriors found in {activeRank} rank
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Yodha Detail Modal */}
        {selectedYodha && (
          <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <div className="max-w-4xl mx-auto leaderboard-page">
              <div className="flex justify-between items-center mb-6">
                <h2 
                  className="text-2xl text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  {selectedYodha.name}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="w-64 h-64 mx-auto mb-6 border-2 border-orange-600 rounded-lg overflow-hidden">
                    <Image 
                      src={selectedYodha.image} 
                      alt={selectedYodha.name}
                      width={256}
                      height={256}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        BIO
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.bio}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        LIFE HISTORY
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.life_history}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        PERSONALITY TRAITS
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.adjectives}
                      </p>
                    </div>

                    <div>
                      <h3 
                        className="text-sm text-orange-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        KNOWLEDGE AREAS
                      </h3>
                      <p 
                        className="text-xs text-gray-300 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.knowledge_areas}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 
                    className="text-lg text-orange-400 mb-6 text-center"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    WARRIOR TRAITS
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    <TraitBar label="STRENGTH" value={selectedYodha.strength} />
                    <TraitBar label="WIT" value={selectedYodha.wit} />
                    <TraitBar label="CHARISMA" value={selectedYodha.charisma} />
                    <TraitBar label="DEFENCE" value={selectedYodha.defence} />
                    <TraitBar label="LUCK" value={selectedYodha.luck} />
                  </div>

                  <div className="border-t border-orange-600 pt-6">
                    <div className="text-center mb-6">
                      <div className="flex justify-center items-center gap-4 mb-4">
                        <Badge className={getRankColor(selectedYodha.rank)}>
                          <span 
                            className="text-xs"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            {selectedYodha.rank}
                          </span>
                        </Badge>
                      </div>

                      <div 
                        className="arcade-card p-4"
                        style={{
                          background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                          border: '2px solid #ff8c00',
                          backdropFilter: 'blur(20px)',
                          WebkitBackdropFilter: 'blur(20px)',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                          borderRadius: '16px'
                        }}
                      >
                        <h4 
                          className="text-sm text-orange-400 mb-2"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          TOTAL WINNINGS
                        </h4>
                        <div className="text-3xl text-green-400 font-bold mb-1">
                          {selectedYodha.winnings.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-400">RANN TOKENS</div>
                      </div>

                      <div className="mt-4 text-xs text-gray-400">
                        <span>Owner: </span>
                        <span className="text-orange-400 font-mono">
                          {selectedYodha.owner}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Link 
            href="/"
            className="inline-block arcade-button px-6 py-3 text-xs tracking-wide"
            style={{
              fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px'
            }}
          >
            GO BACK
          </Link>
        </div>
      </div>
    </div>
  );
}
