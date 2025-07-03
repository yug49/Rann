"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId, useReadContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import '../home-glass.css';
import { chainsToTSender, yodhaNFTAbi, BazaarAbi, rannTokenAbi } from '../../constants';
import { useUserNFTs } from '../../hooks/useUserNFTs';
import Link from 'next/link';

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
  const [marketListings, setMarketListings] = useState<YodhaListing[]>([]);
  const [userListings, setUserListings] = useState<YodhaListing[]>([]);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [isChangingPrice, setIsChangingPrice] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { address } = useAccount();
  const chainId = useChainId();
  
  // Contract addresses
  const bazaarContract = chainsToTSender[chainId]?.Bazaar;
  const yodhaNFTContract = chainsToTSender[chainId]?.yodhaNFT;
  const rannTokenContract = chainsToTSender[chainId]?.rannToken;

  // Contract write hooks
  const { writeContract: writeBazaar, data: bazaarHash, isPending: isBazaarPending } = useWriteContract();
  const { writeContract: writeYodhaNFT, data: yodhaHash, isPending: isYodhaPending } = useWriteContract();
  const { writeContract: writeRannToken, data: rannHash, isPending: isRannPending } = useWriteContract();

  // Transaction receipt hooks
  const { isSuccess: isBazaarSuccess } = useWaitForTransactionReceipt({ hash: bazaarHash });
  const { isSuccess: isYodhaSuccess } = useWaitForTransactionReceipt({ hash: yodhaHash });
  const { isSuccess: isRannSuccess } = useWaitForTransactionReceipt({ hash: rannHash });

  // Get token IDs on sale from Bazaar contract
  const { data: tokenIdsOnSale, refetch: refetchTokenIds } = useReadContract({
    address: bazaarContract as `0x${string}`,
    abi: BazaarAbi,
    functionName: 'getYodhaIdsOnSale',
    query: {
      enabled: !!bazaarContract,
    },
  });

  // Get user's RANN token balance
  const { data: userRannBalance } = useReadContract({
    address: rannTokenContract as `0x${string}`,
    abi: rannTokenAbi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && !!rannTokenContract,
    },
  });
  
  // Get user's NFTs for manage section
  const { userNFTs, isLoadingNFTs } = useUserNFTs(!!address, chainId);

  // Force refresh function
  const refreshData = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    // Refetch the token IDs which will trigger market listings refresh
    if (refetchTokenIds) {
      refetchTokenIds();
    }
  }, [refetchTokenIds]);

  // Refresh userNFTs when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0) {
      // Force re-render by triggering a state change that affects the dependency
      // This will cause the tokenIdsOnSale to be re-fetched, which will trigger market listings refresh
      console.log('Refreshing data...', refreshKey);
      // Small delay to ensure transaction is fully processed on blockchain
      setTimeout(() => {
        if (refetchTokenIds) {
          refetchTokenIds();
        }
      }, 500);
    }
  }, [refreshKey, refetchTokenIds]);

  // Auto-refresh when transactions complete successfully
  useEffect(() => {
    if (isBazaarSuccess) {
      // Small delay to ensure blockchain state has updated
      setTimeout(() => {
        refreshData();
      }, 3000);
    }
  }, [isBazaarSuccess, refreshData]);

  useEffect(() => {
    if (isYodhaSuccess) {
      // Small delay to ensure blockchain state has updated
      setTimeout(() => {
        refreshData();
      }, 3000);
    }
  }, [isYodhaSuccess, refreshData]);

  useEffect(() => {
    if (isRannSuccess) {
      // Small delay to ensure blockchain state has updated
      setTimeout(() => {
        refreshData();
      }, 3000);
    }
  }, [isRannSuccess, refreshData]);

  // Fetch market listings when tokenIdsOnSale changes
  useEffect(() => {
    const fetchMarketListings = async () => {
      if (!tokenIdsOnSale || !Array.isArray(tokenIdsOnSale) || tokenIdsOnSale.length === 0) {
        setMarketListings([]);
        return;
      }

      setIsLoadingMarket(true);
      try {
        const listings = await Promise.all(
          tokenIdsOnSale.map(async (tokenId: bigint, index: number) => {
            try {
              // Get price and owner from Bazaar contract
              const [priceResponse, ownerResponse, tokenURIResponse, traitsResponse, rankingResponse, winningsResponse] = 
                await Promise.allSettled([
                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: bazaarContract,
                      abi: BazaarAbi,
                      functionName: 'getYodhaPrice',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json()),
                  
                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: bazaarContract,
                      abi: BazaarAbi,
                      functionName: 'getYodhaOwner',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json()),

                  // Get NFT metadata
                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: yodhaNFTContract,
                      abi: yodhaNFTAbi,
                      functionName: 'tokenURI',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json()),

                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: yodhaNFTContract,
                      abi: yodhaNFTAbi,
                      functionName: 'getTraits',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json()),

                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: yodhaNFTContract,
                      abi: yodhaNFTAbi,
                      functionName: 'getRanking',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json()),

                  fetch('/api/contract/read', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contractAddress: yodhaNFTContract,
                      abi: yodhaNFTAbi,
                      functionName: 'getWinnings',
                      args: [tokenId.toString()],
                      chainId: chainId
                    })
                  }).then(res => res.json())
                ]);

              const price = priceResponse.status === 'fulfilled' ? priceResponse.value : '0';
              const owner = ownerResponse.status === 'fulfilled' ? ownerResponse.value : '';
              const tokenURI = tokenURIResponse.status === 'fulfilled' ? tokenURIResponse.value : '';
              const contractTraits = traitsResponse.status === 'fulfilled' ? traitsResponse.value : null;
              const ranking = rankingResponse.status === 'fulfilled' ? rankingResponse.value : 0;
              const winnings = winningsResponse.status === 'fulfilled' ? winningsResponse.value : '0';

              console.log(`Token ${tokenId} data:`, { price, owner, tokenURI, contractTraits, ranking, winnings });

              // Fetch metadata from IPFS (using the same logic as useUserNFTs)
              let metadata = { 
                name: `Warrior #${tokenId}`, 
                image: '/lazered.png',
                bio: 'Warrior available for purchase',
                life_history: 'A legendary fighter seeking a new master',
                personality: ['Powerful', 'Skilled'],
                knowledge_areas: ['Combat', 'Strategy']
              };
              
              if (tokenURI && tokenURI.startsWith('ipfs://')) {
                try {
                  const cid = tokenURI.replace('ipfs://', '');
                  const gateways = [
                    'https://ipfs.io/ipfs/',
                    'https://dweb.link/ipfs/',
                    'https://cloudflare-ipfs.com/ipfs/',
                  ];
                  
                  for (const gateway of gateways) {
                    try {
                      const response = await fetch(`${gateway}${cid}`, {
                        headers: { 'Accept': 'application/json' },
                        signal: AbortSignal.timeout(8000)
                      });
                      
                      if (response.ok) {
                        const ipfsMetadata = await response.json();
                        console.log(`Token ${tokenId} IPFS metadata:`, ipfsMetadata);
                        metadata = {
                          name: ipfsMetadata.name || `Warrior #${tokenId}`,
                          image: ipfsMetadata.image ? 
                            (ipfsMetadata.image.startsWith('ipfs://') ? 
                              `https://ipfs.io/ipfs/${ipfsMetadata.image.replace('ipfs://', '')}` : 
                              ipfsMetadata.image) : '/lazered.png',
                          bio: ipfsMetadata.bio || ipfsMetadata.description || 'Warrior available for purchase',
                          life_history: ipfsMetadata.life_history || 'A legendary fighter seeking a new master',
                          personality: Array.isArray(ipfsMetadata.personality) ? ipfsMetadata.personality : 
                                     (ipfsMetadata.adjectives ? ipfsMetadata.adjectives.split(', ') : ['Powerful', 'Skilled']),
                          knowledge_areas: Array.isArray(ipfsMetadata.knowledge_areas) ? ipfsMetadata.knowledge_areas :
                                         (ipfsMetadata.knowledge_areas ? ipfsMetadata.knowledge_areas.split(', ') : ['Combat', 'Strategy'])
                        };
                        break;
                      }
                    } catch (error) {
                      console.warn(`Gateway ${gateway} failed:`, error);
                      continue;
                    }
                  }
                } catch (error) {
                  console.error(`Error fetching IPFS metadata for token ${tokenId}:`, error);
                }
              }
              
              // Parse traits
              let traits: YodhaTraits = {
                strength: 50.0,
                wit: 50.0,
                charisma: 50.0,
                defence: 50.0,
                luck: 50.0
              };

              if (contractTraits) {
                traits = {
                  strength: Number(contractTraits.strength) / 100,
                  wit: Number(contractTraits.wit) / 100,
                  charisma: Number(contractTraits.charisma) / 100,
                  defence: Number(contractTraits.defence) / 100,
                  luck: Number(contractTraits.luck) / 100
                };
              }

              const rankingToString = (rank: number): 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum' => {
                switch (rank) {
                  case 0: return 'unranked';
                  case 1: return 'bronze';
                  case 2: return 'silver';
                  case 3: return 'gold';
                  case 4: return 'platinum';
                  default: return 'unranked';
                }
              };

              const finalListing = {
                id: index + 1,
                tokenId: Number(tokenId),
                name: metadata.name,
                bio: metadata.bio,
                life_history: metadata.life_history,
                adjectives: Array.isArray(metadata.personality) ? metadata.personality.join(', ') : 
                           (typeof metadata.personality === 'string' ? metadata.personality : 'Powerful, Skilled'),
                knowledge_areas: Array.isArray(metadata.knowledge_areas) ? metadata.knowledge_areas.join(', ') :
                               (typeof metadata.knowledge_areas === 'string' ? metadata.knowledge_areas : 'Combat, Strategy'),
                traits,
                price: Number(formatEther(BigInt(price))),
                seller: `${owner.slice(0, 6)}...${owner.slice(-4)}`,
                image: metadata.image,
                isOwner: address?.toLowerCase() === owner.toLowerCase(),
                rank: rankingToString(ranking),
                totalWinnings: Number(winnings) / 1e18
              } as YodhaListing;

              console.log(`Final listing for token ${tokenId}:`, finalListing);
              return finalListing;

            } catch (error) {
              console.error(`Error fetching listing for token ${tokenId}:`, error);
              return null;
            }
          })
        );

        setMarketListings(listings.filter(listing => listing !== null) as YodhaListing[]);
      } catch (error) {
        console.error('Error fetching market listings:', error);
        setMarketListings([]);
      } finally {
        setIsLoadingMarket(false);
      }
    };

    fetchMarketListings();
  }, [tokenIdsOnSale, address, bazaarContract, yodhaNFTContract, chainId, refreshKey]);

  // Update user listings when user NFTs change
  useEffect(() => {
    if (!address || !tokenIdsOnSale) {
      setUserListings([]);
      return;
    }

    const userTokenIdsOnSale = Array.isArray(tokenIdsOnSale) ? tokenIdsOnSale.map(id => Number(id)) : [];
    const userOwnedListings = marketListings.filter(listing => 
      listing.isOwner && userTokenIdsOnSale.includes(listing.tokenId)
    );
    
    setUserListings(userOwnedListings);
  }, [marketListings, address, tokenIdsOnSale]);

  const handleCreateListing = async () => {
    if (!newListingTokenId || !newListingPrice || !address) return;
    
    setIsListing(true);
    try {
      // First approve the Bazaar contract to transfer the NFT
      await writeYodhaNFT({
        address: yodhaNFTContract as `0x${string}`,
        abi: yodhaNFTAbi,
        functionName: 'approve',
        args: [bazaarContract, BigInt(newListingTokenId)]
      });

      // Wait for approval, then list the NFT
      // Note: In a production app, you'd want to wait for the approval transaction to complete
      // before calling putYourYodhaForSale
      setTimeout(async () => {
        await writeBazaar({
          address: bazaarContract as `0x${string}`,
          abi: BazaarAbi,
          functionName: 'putYourYodhaForSale',
          args: [BigInt(newListingTokenId), parseEther(newListingPrice)]
        });
      }, 2000);

    } catch (error) {
      console.error('Error creating listing:', error);
    } finally {
      setIsListing(false);
      setNewListingTokenId('');
      setNewListingPrice('');
    }
  };

  const handleBuyYodha = async (listing: YodhaListing) => {
    if (!address) return;

    try {
      // First approve RANN tokens for the purchase
      await writeRannToken({
        address: rannTokenContract as `0x${string}`,
        abi: rannTokenAbi,
        functionName: 'approve',
        args: [bazaarContract, parseEther(listing.price.toString())]
      });

      // Wait for approval, then buy the NFT
      setTimeout(async () => {
        await writeBazaar({
          address: bazaarContract as `0x${string}`,
          abi: BazaarAbi,
          functionName: 'buyYodha',
          args: [BigInt(listing.tokenId)]
        });
      }, 2000);

    } catch (error) {
      console.error('Error buying Yodha:', error);
    }
    
    setSelectedYodha(null);
  };

  const handleRemoveListing = async (listing: YodhaListing) => {
    if (!address) return;

    try {
      await writeBazaar({
        address: bazaarContract as `0x${string}`,
        abi: BazaarAbi,
        functionName: 'retrieveYodhaOnSale',
        args: [BigInt(listing.tokenId)]
      });
    } catch (error) {
      console.error('Error removing listing:', error);
    }
    
    setSelectedYodha(null);
  };

  const handleChangePrice = async (listing: YodhaListing) => {
    if (!address || !newPrice) return;

    setIsChangingPrice(true);
    try {
      await writeBazaar({
        address: bazaarContract as `0x${string}`,
        abi: BazaarAbi,
        functionName: 'changePriceOfYodhaAlreadyOnSale',
        args: [BigInt(listing.tokenId), parseEther(newPrice)]
      });
    } catch (error) {
      console.error('Error changing price:', error);
    } finally {
      setIsChangingPrice(false);
      setNewPrice('');
      setSelectedYodha(null);
    }
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
              {isLoadingMarket ? (
                // Loading state
                Array.from({ length: 6 }).map((_, index) => (
                  <div 
                    key={index}
                    className="arcade-card p-6 animate-pulse"
                    style={{
                      background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                      border: '3px solid #ff8c00',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                      borderRadius: '24px'
                    }}
                  >
                    <div className="w-full h-64 mb-4 bg-gray-600 rounded-lg"></div>
                    <div className="h-4 bg-gray-600 rounded mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded"></div>
                      <div className="h-3 bg-gray-700 rounded"></div>
                    </div>
                  </div>
                ))
              ) : marketListings.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <span 
                    className="text-gray-500 text-sm"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    NO WARRIORS FOR SALE
                  </span>
                </div>
              ) : (
                marketListings.map((listing) => (
                  <YodhaCard 
                    key={listing.id} 
                    listing={listing} 
                    onClick={() => setSelectedYodha(listing)}
                  />
                ))
              )}
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
                      SELECT YOUR NFT
                    </label>
                    <select
                      value={newListingTokenId}
                      onChange={(e) => setNewListingTokenId(e.target.value)}
                      disabled={isLoadingNFTs}
                      className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-orange-600 focus:outline-none transition-colors"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      <option value="">
                        {isLoadingNFTs ? 'Loading warriors...' : 'Select a warrior...'}
                      </option>
                      {!isLoadingNFTs && userNFTs
                        .filter((nft) => {
                          // Filter out NFTs that are already listed for sale
                          const tokenIdsOnSaleArray = Array.isArray(tokenIdsOnSale) ? tokenIdsOnSale.map(id => Number(id)) : [];
                          return !tokenIdsOnSaleArray.includes(nft.tokenId);
                        })
                        .map((nft) => (
                          <option key={nft.tokenId} value={nft.tokenId}>
                            #{nft.tokenId} - {nft.name}
                          </option>
                        ))}
                    </select>
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

                  <div className="text-xs text-gray-400" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    YOUR RANN BALANCE: {userRannBalance ? formatEther(userRannBalance as bigint) : '0'} RANN
                  </div>

                  <button
                    onClick={handleCreateListing}
                    disabled={!newListingTokenId || !newListingPrice || isListing || isBazaarPending || isYodhaPending}
                    className={`w-full arcade-button py-4 text-xs tracking-wide ${
                      (!newListingTokenId || !newListingPrice || isListing || isBazaarPending || isYodhaPending) ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    {isListing || isBazaarPending || isYodhaPending ? 'LISTING...' : 'LIST FOR SALE'}
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
                <div className="text-center mb-6">
                  <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                    <span className="text-2xl">📋</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    YOUR LISTINGS
                  </h2>
                </div>

                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userListings.length === 0 ? (
                    <div className="text-center py-8">
                      <span 
                        className="text-gray-500 text-xs"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        NO ACTIVE LISTINGS
                      </span>
                    </div>
                  ) : (
                    userListings.map((listing) => (
                      <div 
                        key={listing.id}
                        className="border border-gray-600 p-4 rounded-lg bg-gray-800/50 cursor-pointer hover:border-orange-600 transition-all"
                        onClick={() => setSelectedYodha(listing)}
                      >
                        <div className="flex items-center space-x-4">
                          <Image 
                            src={listing.image} 
                            alt={listing.name}
                            width={60}
                            height={60}
                            className="rounded-lg border border-orange-600"
                          />
                          <div className="flex-1">
                            <h3 
                              className="text-orange-400 text-xs mb-1"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              {listing.name}
                            </h3>
                            <p 
                              className="text-yellow-400 text-xs"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              {listing.price} RANN
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
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
                        disabled={isBazaarPending || isRannPending}
                        className={`w-full arcade-button py-4 text-sm tracking-wide ${
                          (isBazaarPending || isRannPending) ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        style={{
                          fontFamily: 'Press Start 2P, monospace',
                          borderRadius: '12px'
                        }}
                      >
                        {isBazaarPending || isRannPending ? 'BUYING...' : 'BUY WARRIOR'}
                      </button>
                    )}
                    
                    {selectedYodha.isOwner && (
                      <div className="space-y-4">
                        <div>
                          <label 
                            className="block text-orange-400 text-xs mb-2 tracking-wide"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            CHANGE PRICE (RANN)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newPrice}
                            onChange={(e) => setNewPrice(e.target.value)}
                            placeholder="Enter new price..."
                            className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-orange-600 focus:outline-none transition-colors mb-4"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          />
                          <button
                            onClick={() => handleChangePrice(selectedYodha)}
                            disabled={!newPrice || isChangingPrice || isBazaarPending}
                            className={`w-full arcade-button py-3 text-xs tracking-wide mb-4 ${
                              (!newPrice || isChangingPrice || isBazaarPending) ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            style={{
                              fontFamily: 'Press Start 2P, monospace',
                              borderRadius: '12px'
                            }}
                          >
                            {isChangingPrice || isBazaarPending ? 'UPDATING...' : 'UPDATE PRICE'}
                          </button>
                        </div>
                        
                        <button
                          onClick={() => handleRemoveListing(selectedYodha)}
                          disabled={isBazaarPending}
                          className={`w-full bg-red-800 hover:bg-red-700 border-2 border-red-600 text-red-300 py-4 text-sm tracking-wide transition-colors ${
                            isBazaarPending ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          style={{
                            fontFamily: 'Press Start 2P, monospace',
                            borderRadius: '12px'
                          }}
                        >
                          {isBazaarPending ? 'REMOVING...' : 'REMOVE LISTING'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
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