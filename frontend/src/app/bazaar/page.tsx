"use client";

import { useState } from 'react';
import Image from 'next/image';
import '../home-glass.css';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface YodhaListing {
  id: number;
  tokenId: number;
  name: string;
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  traits: YodhaTraits;
  price: number;
  seller: string;
  image: string;
  isOwner: boolean;
  rank: 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';
  totalWinnings: number;
}

export default function BazaarPage() {
  const [activeTab, setActiveTab] = useState<'manage' | 'market'>('market');
  const [newListingTokenId, setNewListingTokenId] = useState('');
  const [newListingPrice, setNewListingPrice] = useState('');
  const [selectedYodha, setSelectedYodha] = useState<YodhaListing | null>(null);
  const [isListing, setIsListing] = useState(false);

  // Mock data for marketplace listings
  const marketListings: YodhaListing[] = [
    {
      id: 1,
      tokenId: 101,
      name: "Arjuna the Strategist",
      bio: "A legendary warrior with unmatched archery skills and strategic mind",
      life_history: "Born in the ancient kingdom of Hastinapura, trained by the greatest masters of warfare and divine knowledge",
      adjectives: "Visionary, Ambitious, Perfectionistic, Risk-taking, Intellectually curious",
      knowledge_areas: "Military strategy, Archery mastery, Divine weapons, Leadership, Ancient wisdom",
      traits: { strength: 85.67, wit: 92.34, charisma: 78.12, defence: 88.45, luck: 76.89 },
      price: 2.5,
      seller: "0x742d...35A2",
      image: "/lazered.png",
      isOwner: false,
      rank: 'gold',
      totalWinnings: 15.7
    },
    {
      id: 2,
      tokenId: 102,
      name: "Bhima the Destroyer",
      bio: "A mighty warrior with incredible physical strength and fierce determination",
      life_history: "Second of the Pandava brothers, known for his immense strength and loyalty to his family",
      adjectives: "Powerful, Determined, Loyal, Aggressive, Protective",
      knowledge_areas: "Physical combat, Mace warfare, Endurance training, Battle tactics, Brotherhood",
      traits: { strength: 98.23, wit: 65.78, charisma: 82.45, defence: 94.12, luck: 71.56 },
      price: 3.2,
      seller: "0x8A3b...7F91",
      image: "/lazered.png",
      isOwner: false,
      rank: 'platinum',
      totalWinnings: 28.4
    },
    {
      id: 3,
      tokenId: 103,
      name: "Nakula the Swift",
      bio: "A skilled swordsman known for his speed and expertise with horses",
      life_history: "Twin brother of Sahadeva, master of sword fighting and horse management",
      adjectives: "Swift, Elegant, Skilled, Graceful, Knowledgeable",
      knowledge_areas: "Swordsmanship, Horse training, Speed combat, Veterinary science, Twin coordination",
      traits: { strength: 78.91, wit: 84.33, charisma: 89.67, defence: 81.24, luck: 87.45 },
      price: 1.8,
      seller: "0x1C4F...9D82",
      image: "/lazered.png",
      isOwner: false,
      rank: 'silver',
      totalWinnings: 8.9
    }
  ];

  // Mock data for user's own listings
  const userListings: YodhaListing[] = [
    {
      id: 4,
      tokenId: 201,
      name: "Sahadeva the Wise",
      bio: "The youngest Pandava, known for his wisdom and knowledge of astronomy",
      life_history: "Master of astrology and mathematics, advisor to his brothers in matters of strategy",
      adjectives: "Wise, Analytical, Patient, Observant, Scholarly",
      knowledge_areas: "Astronomy, Mathematics, Astrology, Strategic planning, Ancient texts",
      traits: { strength: 72.45, wit: 96.78, charisma: 85.23, defence: 79.67, luck: 91.34 },
      price: 2.1,
      seller: "You",
      image: "/lazered.png",
      isOwner: true,
      rank: 'bronze',
      totalWinnings: 4.2
    }
  ];

  const handleCreateListing = async () => {
    if (!newListingTokenId || !newListingPrice) return;
    
    setIsListing(true);
    // Simulate listing creation
    setTimeout(() => {
      setIsListing(false);
      setNewListingTokenId('');
      setNewListingPrice('');
      // In real app, would refresh listings
    }, 2000);
  };

  const handleBuyYodha = async (listing: YodhaListing) => {
    // Simulate purchase
    console.log(`Buying ${listing.name} for ${listing.price} RANN`);
    setSelectedYodha(null);
  };

  const handleRemoveListing = async (listing: YodhaListing) => {
    // Simulate removing listing
    console.log(`Removing listing for ${listing.name}`);
    setSelectedYodha(null);
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'unranked': return 'text-gray-500';
      case 'bronze': return 'text-orange-600';
      case 'silver': return 'text-gray-300';
      case 'gold': return 'text-yellow-400';
      case 'platinum': return 'text-blue-300';
      default: return 'text-gray-500';
    }
  };

  const getRankBgColor = (rank: string) => {
    switch (rank) {
      case 'unranked': return 'bg-gray-700';
      case 'bronze': return 'bg-orange-900';
      case 'silver': return 'bg-gray-600';
      case 'gold': return 'bg-yellow-900';
      case 'platinum': return 'bg-blue-900';
      default: return 'bg-gray-700';
    }
  };

  const TraitBar = ({ label, value }: { label: string; value: number }) => (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span 
          className="text-xs text-orange-400"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {label}
        </span>
        <span 
          className="text-xs text-orange-300"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {value.toFixed(2)}
        </span>
      </div>
      <div className="w-full bg-gray-800 border border-gray-600 h-3">
        <div 
          className="h-full bg-orange-500 transition-all duration-500"
          style={{ width: `${value}%` }}
        ></div>
      </div>
    </div>
  );

  const YodhaCard = ({ listing, onClick }: { listing: YodhaListing; onClick: () => void }) => (
    <div 
      className="arcade-card p-6 cursor-pointer transform hover:scale-105 transition-all duration-300"
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
      <div className="w-full h-64 mb-4 border-2 border-orange-600 rounded-lg overflow-hidden relative">
        <Image 
          src={listing.image} 
          alt={listing.name}
          width={300}
          height={256}
          className="w-full h-full object-cover"
        />
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs ${getRankBgColor(listing.rank)} ${getRankColor(listing.rank)} border border-current`}>
          <span style={{fontFamily: 'Press Start 2P, monospace'}}>
            {listing.rank.toUpperCase()}
          </span>
        </div>
      </div>
      
      <div className="text-center mb-4">
        <h3 
          className="text-lg text-orange-400 mb-4 arcade-glow"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {listing.name}
        </h3>
      </div>

      <div className="space-y-2 mb-4">
        <TraitBar label="STR" value={listing.traits.strength} />
        <TraitBar label="WIT" value={listing.traits.wit} />
        <TraitBar label="CHA" value={listing.traits.charisma} />
        <TraitBar label="DEF" value={listing.traits.defence} />
        <TraitBar label="LCK" value={listing.traits.luck} />
      </div>

      <div className="border-t border-orange-600 pt-4">
        <div className="flex justify-between items-center">
          <span 
            className="text-lg text-yellow-400 arcade-glow"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            {listing.price} RANN
          </span>
          <span 
            className="text-xs text-gray-400"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            #{listing.tokenId}
          </span>
        </div>
        {!listing.isOwner && (
          <p 
            className="text-xs text-gray-500 mt-2"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            BY: {listing.seller}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Bazaar.png"
          alt="Bazaar Background"
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
            BAZAAR
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
              LEGENDARY WARRIOR MARKETPLACE
            </p>
          </div>
        </div>

        {/* Section Navigation */}
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
            <button
              onClick={() => setActiveTab('market')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeTab === 'market' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeTab === 'market' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              BROWSE MARKET
            </button>
            <button
              onClick={() => setActiveTab('manage')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeTab === 'manage' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeTab === 'manage' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              MANAGE LISTINGS
            </button>
          </div>
        </div>

        {activeTab === 'market' ? (
          // Market Tab
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8">
              <h2 
                className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                AVAILABLE WARRIORS
              </h2>
              <p 
                className="text-orange-300 text-xs"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                CLICK ON ANY WARRIOR TO VIEW DETAILS
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {marketListings.map((listing) => (
                <YodhaCard 
                  key={listing.id} 
                  listing={listing} 
                  onClick={() => setSelectedYodha(listing)}
                />
              ))}
            </div>
          </div>
        ) : (
          // Manage Tab
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Create New Listing */}
              <div 
                className="arcade-card p-8"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                  borderRadius: '24px'
                }}
              >
                <div className="text-center mb-6">
                  <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">🏪</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    LIST WARRIOR
                  </h2>
                </div>

                <div className="space-y-6">
                  <div>
                    <label 
                      className="block text-orange-400 text-xs mb-2 tracking-wide"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      NFT TOKEN ID
                    </label>
                    <input
                      type="number"
                      value={newListingTokenId}
                      onChange={(e) => setNewListingTokenId(e.target.value)}
                      placeholder="Enter token ID..."
                      className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-orange-600 focus:outline-none transition-colors"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-orange-400 text-xs mb-2 tracking-wide"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      PRICE (RANN)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newListingPrice}
                      onChange={(e) => setNewListingPrice(e.target.value)}
                      placeholder="Enter price in RANN..."
                      className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-orange-600 focus:outline-none transition-colors"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    />
                  </div>

                  <button
                    onClick={handleCreateListing}
                    disabled={!newListingTokenId || !newListingPrice || isListing}
                    className={`w-full arcade-button py-4 text-xs tracking-wide ${
                      (!newListingTokenId || !newListingPrice || isListing) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    {isListing ? 'LISTING WARRIOR...' : 'CREATE LISTING'}
                  </button>
                </div>
              </div>

              {/* Current Listings */}
              <div 
                className="arcade-card p-8"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                  borderRadius: '24px'
                }}
              >
                <h2 
                  className="text-2xl text-orange-400 text-center mb-6 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  YOUR LISTINGS
                </h2>

                <div className="space-y-6">
                  {userListings.length > 0 ? (
                    userListings.map((listing) => (
                      <div 
                        key={listing.id} 
                        className="border border-orange-600 p-4 cursor-pointer hover:border-orange-500 transition-colors"
                        onClick={() => setSelectedYodha(listing)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 border border-orange-600 rounded overflow-hidden">
                            <Image 
                              src={listing.image} 
                              alt={listing.name}
                              width={48}
                              height={48}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <h3 
                              className="text-sm text-orange-400 mb-1"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              {listing.name}
                            </h3>
                            <p 
                              className="text-xs text-orange-300"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              #{listing.tokenId}
                            </p>
                          </div>
                          <div className="text-right">
                            <p 
                              className="text-lg text-yellow-400 arcade-glow"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              {listing.price} RANN
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center">
                      <p 
                        className="text-gray-400 text-xs leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        NO ACTIVE LISTINGS
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Yodha Detail Modal */}
        {selectedYodha && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div 
              className="arcade-card p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                borderRadius: '24px'
              }}
            >
              <div className="flex justify-between items-start mb-6">
                <h2 
                  className="text-2xl text-orange-400 arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  {selectedYodha.name}
                </h2>
                <button 
                  onClick={() => setSelectedYodha(null)}
                  className="text-red-400 hover:text-red-300 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="w-48 h-48 mx-auto mb-6 border-2 border-orange-600 rounded-lg overflow-hidden">
                    <Image 
                      src={selectedYodha.image} 
                      alt={selectedYodha.name}
                      width={192}
                      height={192}
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
                    <TraitBar label="STRENGTH" value={selectedYodha.traits.strength} />
                    <TraitBar label="WIT" value={selectedYodha.traits.wit} />
                    <TraitBar label="CHARISMA" value={selectedYodha.traits.charisma} />
                    <TraitBar label="DEFENCE" value={selectedYodha.traits.defence} />
                    <TraitBar label="LUCK" value={selectedYodha.traits.luck} />
                  </div>

                  <div className="border-t border-orange-600 pt-6">
                    <div className="text-center mb-6">
                      <p 
                        className="text-3xl text-yellow-400 mb-2 arcade-glow"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        {selectedYodha.price} RANN
                      </p>
                      
                      <div className="flex justify-center items-center gap-4 mb-4">
                        <div className={`px-3 py-1 rounded ${getRankBgColor(selectedYodha.rank)} ${getRankColor(selectedYodha.rank)} border border-current`}>
                          <span 
                            className="text-xs"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            RANK: {selectedYodha.rank.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <p 
                        className="text-sm text-green-400 mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        TOTAL WINNINGS: {selectedYodha.totalWinnings} RANN
                      </p>
                      
                      <p 
                        className="text-xs text-gray-400"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        TOKEN ID: #{selectedYodha.tokenId}
                      </p>
                      <p 
                        className="text-xs text-gray-500 mt-1"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        SELLER: {selectedYodha.seller}
                      </p>
                    </div>

                    {!selectedYodha.isOwner && (
                      <button
                        onClick={() => handleBuyYodha(selectedYodha)}
                        className="w-full arcade-button py-4 text-sm tracking-wide"
                        style={{
                          fontFamily: 'Press Start 2P, monospace',
                          borderRadius: '12px'
                        }}
                      >
                        BUY WARRIOR
                      </button>
                    )}
                    
                    {selectedYodha.isOwner && (
                      <button
                        onClick={() => handleRemoveListing(selectedYodha)}
                        className="w-full bg-red-800 hover:bg-red-700 border-2 border-red-600 text-red-300 py-4 text-sm tracking-wide transition-colors"
                        style={{
                          fontFamily: 'Press Start 2P, monospace',
                          borderRadius: '12px'
                        }}
                      >
                        REMOVE LISTING
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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
