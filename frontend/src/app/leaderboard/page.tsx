'use client';

import { useState, useEffect } from 'react';
import { useAccount, useChainId } from 'wagmi';
import Image from 'next/image';
import './leaderboard-glass.css';
import { useLeaderboard, type RankCategory, type LeaderboardYodha } from '../../hooks/useLeaderboard';
import { formatEther } from 'viem';

// Enhanced interface that combines leaderboard data with basic additional fields
interface EnhancedYodha extends LeaderboardYodha {
  id: number; // For backward compatibility
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  isDetailed?: boolean; // Flag to indicate if we have detailed data
}

// Remove duplicate type definition since we're importing it
// type RankCategory = 'UNRANKED' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';

export default function LeaderboardPage() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [activeRank, setActiveRank] = useState<RankCategory>('PLATINUM');
  const [isMounted, setIsMounted] = useState(false);
  const [enhancedYodhas, setEnhancedYodhas] = useState<{[key: string]: EnhancedYodha[]}>({
    UNRANKED: [],
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: []
  });

  // Fetch real leaderboard data from contract
  const { leaderboardData, isLoading, error } = useLeaderboard();

  // Prevent hydration mismatch by waiting for client-side mount
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Simplify leaderboard data - just use direct data from contract
  useEffect(() => {
    if (!leaderboardData || isLoading) return;

    // Copy the leaderboard data and convert to enhanced format for consistency
    const enhanced: {[key: string]: EnhancedYodha[]} = {
      UNRANKED: [],
      BRONZE: [],
      SILVER: [],
      GOLD: [],
      PLATINUM: []
    };

    // Process each rank category
    (Object.keys(leaderboardData) as RankCategory[]).forEach(rank => {
      enhanced[rank] = leaderboardData[rank].map(yodha => ({
        ...yodha,
        id: yodha.tokenId, // For backward compatibility
        bio: yodha.bio || 'A powerful warrior in the realm of Rann',
        life_history: 'The warrior\'s history is shrouded in mystery...',
        adjectives: 'Brave, Skilled, Strategic',
        knowledge_areas: 'Combat, Strategy, Leadership',
        isDetailed: false
      } as EnhancedYodha));
    });

    setEnhancedYodhas(enhanced);
  }, [leaderboardData, isLoading]);

  // Filter and sort yodhas by rank and winnings - only real NFTs, top 15 per rank
  const getYodhasByRank = (rank: RankCategory) => {
    const yodhas = enhancedYodhas[rank] || [];
    // Filter out any NFTs with zero winnings (likely mock data) and limit to top 15
    return yodhas
      .filter(yodha => yodha.winnings > BigInt(0)) // Only show NFTs with actual winnings
      .slice(0, 15); // Limit to top 15
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

  // Show loading state while fetching data
  if (isLoading) {
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
                LOADING...
              </h1>
              <p className="text-gray-300 mb-6">
                Fetching warrior data from the blockchain...
              </p>
              <div className="text-orange-400 text-sm animate-pulse">
                Scanning the battlefield...
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if something went wrong
  if (error) {
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
                ERROR
              </h1>
              <p className="text-gray-300 mb-6">
                Failed to load leaderboard data. Please try again later.
              </p>
              <div className="text-red-400 text-sm">
                {error}
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
              TOP 15 WARRIORS BY RANK AND WINNINGS
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
                key={yodha.tokenId}
                className="arcade-card p-4"
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
                      alt={`NFT #${yodha.tokenId}`}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Owner Info */}
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 mb-1">NFT #{yodha.tokenId}</div>
                    <div className="text-sm text-gray-300">
                      Owner: {yodha.owner.slice(0, 8)}...{yodha.owner.slice(-6)}
                    </div>
                  </div>

                  {/* Winnings */}
                  <div className="text-right">
                    <div className="text-sm text-gray-400">TOTAL WINNINGS</div>
                    <div className="text-2xl text-green-400 font-bold">
                      {parseFloat(formatEther(yodha.winnings)).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400">RANN</div>
                  </div>
                </div>
              </div>
            ))}

            {getYodhasByRank(activeRank).length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-sm">
                  No warriors with winnings found in {activeRank} rank
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <a 
            href="/"
            className="inline-block arcade-button px-6 py-3 text-xs tracking-wide"
            style={{
              fontFamily: 'Press Start 2P, monospace',
              borderRadius: '12px'
            }}
          >
            GO BACK
          </a>
        </div>
      </div>
    </div>
  );
}
