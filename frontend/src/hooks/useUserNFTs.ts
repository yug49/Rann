import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { chainsToTSender, yodhaNFTAbi } from '../constants';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface UserYodha {
  id: number;
  tokenId: number;
  name: string;
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  traits: YodhaTraits;
  image: string;
  rank: 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum';
  totalWinnings: number;
}

// Simple metadata cache to avoid repeated IPFS requests
const metadataCache = new Map<string, any>();

// Helper function to convert IPFS URI to fallback image URL
const convertIpfsToProxyUrl = (ipfsUrl: string) => {
  if (ipfsUrl.startsWith('ipfs://')) {
    // Extract the IPFS hash from the URL
    const hash = ipfsUrl.replace('ipfs://', '');
    // Try to use a public IPFS gateway that works with CORS
    // If this fails, the image will fallback to the broken image handler in the browser
    return `https://ipfs.io/ipfs/${hash}`;
  }
  return ipfsUrl;
};

// Helper function to fetch metadata from IPFS with fallback gateways and mock data
const fetchMetadataFromIPFS = async (tokenURI: string) => {
  if (!tokenURI.startsWith('ipfs://')) {
    console.log('Not an IPFS URL:', tokenURI);
    return null;
  }

  // Check cache first
  if (metadataCache.has(tokenURI)) {
    console.log('📦 Using cached metadata for:', tokenURI);
    return metadataCache.get(tokenURI);
  }

  const cid = tokenURI.replace('ipfs://', '');
  
  // Use gateways that don't have aggressive bot protection
  const gateways = [
    'https://ipfs.io/ipfs/',
    'https://dweb.link/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ];

  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const httpUrl = `${gateway}${cid}`;
    
    try {
      console.log(`🌐 Attempt ${i + 1}: Fetching metadata from gateway ${gateway.split('/')[2]}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(httpUrl, {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      console.log(`✅ Success with gateway ${i + 1}:`, metadata);
      // Cache the metadata
      metadataCache.set(tokenURI, metadata);
      return metadata;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`❌ Gateway ${i + 1} failed:`, errorMessage);
      
      // If this is the last gateway, fall back to mock data
      if (i === gateways.length - 1) {
        console.log('🔄 All IPFS gateways failed, using fallback metadata');
        // Extract token ID from the CID for more realistic fallback
        const tokenId = cid.slice(-3); // Use last 3 chars as token ID
        const fallbackMetadata = {
          name: `Yodha Warrior #${tokenId}`,
          description: "A legendary warrior from the Rann battlefield. This metadata is a fallback due to IPFS gateway issues.",
          image: `ipfs://${cid}`, // Use the actual IPFS hash from the contract
          attributes: [
            { trait_type: "Strength", value: Math.floor(Math.random() * 100) },
            { trait_type: "Agility", value: Math.floor(Math.random() * 100) },
            { trait_type: "Intelligence", value: Math.floor(Math.random() * 100) },
            { trait_type: "Endurance", value: Math.floor(Math.random() * 100) },
            { trait_type: "Luck", value: Math.floor(Math.random() * 100) },
          ]
        };
        // Cache the fallback metadata too
        metadataCache.set(tokenURI, fallbackMetadata);
        return fallbackMetadata;
      }
      // Otherwise, continue to the next gateway
    }
  }
  
  return null;
};

// Helper function to convert ranking enum to string
const rankingToString = (ranking: number): 'unranked' | 'bronze' | 'silver' | 'gold' | 'platinum' => {
  switch (ranking) {
    case 0: return 'unranked';
    case 1: return 'bronze';
    case 2: return 'silver';
    case 3: return 'gold';
    case 4: return 'platinum';
    default: return 'unranked';
  }
};

export const useUserNFTs = (isActive: boolean = false, chainId: number = 545) => {
  const { address: connectedAddress } = useAccount();

  const [userNFTs, setUserNFTs] = useState<UserYodha[]>([]);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);
  const loadingRef = useRef(false);
  const lastTokenIdsRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastParamsRef = useRef<string>('');

  // Memoize the key parameters to prevent unnecessary re-renders
  const stableParams = useMemo(() => {
    const key = `${chainId}-${connectedAddress}-${isActive}`;
    return { chainId, connectedAddress, isActive, key };
  }, [chainId, connectedAddress, isActive]);

  // Prevent re-renders when parameters haven't actually changed
  const hasParamsChanged = stableParams.key !== lastParamsRef.current;

  // Debug logging (only when params change)
  if (hasParamsChanged) {
    console.log('useUserNFTs - chainId:', chainId, 'isActive:', isActive, 'connectedAddress:', connectedAddress);
    lastParamsRef.current = stableParams.key;
  }

  // Get contract address for the current chain
  const contractAddress = chainsToTSender[chainId]?.yodhaNFT;
  if (hasParamsChanged) {
    console.log('useUserNFTs - contractAddress for chain', chainId, ':', contractAddress);
  }

  // Read user's NFT token IDs
  const { data: userTokenIds, isError: tokenIdsError, isLoading: tokenIdsLoading } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: yodhaNFTAbi,
    functionName: 'getNFTsOfAOwner',
    args: connectedAddress ? [connectedAddress] : undefined,
    query: {
      enabled: !!connectedAddress && isActive && !!contractAddress,
    },
  });

  // Function to load detailed NFT data
  const loadNFTDetails = useCallback(async (tokenIds: bigint[]) => {
    if (loadingRef.current) {
      console.log('🔄 Already loading NFTs, skipping duplicate call');
      return;
    }

    if (!tokenIds || tokenIds.length === 0) {
      setUserNFTs([]);
      return;
    }

    const tokenIdsString = tokenIds.map(id => id.toString()).join(',');
    if (lastTokenIdsRef.current === tokenIdsString) {
      console.log('🔄 Same token IDs as last load, skipping');
      return;
    }

    loadingRef.current = true;
    lastTokenIdsRef.current = tokenIdsString;
    setIsLoadingNFTs(true);

    if (!contractAddress) {
      console.error(`Contract address not found for chain ${chainId}`);
      setUserNFTs([]);
      loadingRef.current = false;
      return;
    }

    setIsLoadingNFTs(true);

    try {
      // For each token ID, we need to fetch multiple pieces of data
      const nftPromises = tokenIds.map(async (tokenId: bigint, index: number) => {
        try {
          // Create parallel requests for all the data we need
          const [tokenURIResponse, traitsResponse, rankingResponse, winningsResponse] = await Promise.allSettled([
            // Get token URI
            fetch('/api/contract/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractAddress: contractAddress,
                abi: yodhaNFTAbi,
                functionName: 'tokenURI',
                args: [tokenId.toString()], // Convert BigInt to string
                chainId: chainId
              })
            }).then(async res => {
              const data = await res.json();
              if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
              }
              return data;
            }),
            
            // Get traits
            fetch('/api/contract/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractAddress: contractAddress,
                abi: yodhaNFTAbi,
                functionName: 'getTraits',
                args: [tokenId.toString()], // Convert BigInt to string
                chainId: chainId
              })
            }).then(async res => {
              const data = await res.json();
              if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
              }
              return data;
            }),
            
            // Get ranking
            fetch('/api/contract/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractAddress: contractAddress,
                abi: yodhaNFTAbi,
                functionName: 'getRanking',
                args: [tokenId.toString()], // Convert BigInt to string
                chainId: chainId
              })
            }).then(async res => {
              const data = await res.json();
              if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
              }
              return data;
            }),
            
            // Get winnings
            fetch('/api/contract/read', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contractAddress: contractAddress,
                abi: yodhaNFTAbi,
                functionName: 'getWinnings',
                args: [tokenId.toString()], // Convert BigInt to string
                chainId: chainId
              })
            }).then(async res => {
              const data = await res.json();
              if (!res.ok || data.error) {
                throw new Error(data.error || `HTTP ${res.status}`);
              }
              return data;
            })
          ]);

          // Extract results (handling potential failures)
          const tokenURI = tokenURIResponse.status === 'fulfilled' ? tokenURIResponse.value : null;
          const contractTraits = traitsResponse.status === 'fulfilled' ? traitsResponse.value : null;
          const ranking = rankingResponse.status === 'fulfilled' ? rankingResponse.value : 0;
          const winnings = winningsResponse.status === 'fulfilled' ? winningsResponse.value : '0';

          // Log the responses for debugging
          console.log(`📄 Token ${tokenId} contract data loaded`);

          // Check for errors in responses
          if (tokenURIResponse.status === 'rejected') {
            console.error(`Failed to get tokenURI for ${tokenId}:`, tokenURIResponse.reason);
          }
          if (traitsResponse.status === 'rejected') {
            console.error(`Failed to get traits for ${tokenId}:`, traitsResponse.reason);
          }
          if (rankingResponse.status === 'rejected') {
            console.error(`Failed to get ranking for ${tokenId}:`, rankingResponse.reason);
          }
          if (winningsResponse.status === 'rejected') {
            console.error(`Failed to get winnings for ${tokenId}:`, winningsResponse.reason);
          }

          // Fetch metadata from IPFS if we have a tokenURI
          let metadata = null;
          if (tokenURI) {
            console.log(`Fetching metadata for token ${tokenId} from:`, tokenURI);
            metadata = await fetchMetadataFromIPFS(tokenURI);
            console.log(`Metadata for token ${tokenId}:`, metadata);
          } else {
            console.warn(`No tokenURI found for token ${tokenId}`);
          }

          // Parse traits from contract (convert from uint16 with 2 decimal precision)
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

          // Convert winnings from wei to ether
          const totalWinnings = Number(winnings) / 1e18;

          // Build the UserYodha object
          return {
            id: index + 1,
            tokenId: Number(tokenId),
            name: metadata?.name || `Warrior #${tokenId}`,
            bio: metadata?.bio || 'Ancient warrior with unknown history',
            life_history: metadata?.life_history || 'History lost to time...',
            adjectives: Array.isArray(metadata?.personality) 
              ? metadata.personality.join(', ') 
              : metadata?.adjectives || 'Mysterious, Powerful',
            knowledge_areas: Array.isArray(metadata?.knowledge_areas)
              ? metadata.knowledge_areas.join(', ')
              : metadata?.knowledge_areas || 'Combat, Strategy',
            traits,
            image: metadata?.image ? convertIpfsToProxyUrl(metadata.image) : '/lazered.png',
            rank: rankingToString(ranking),
            totalWinnings
          } as UserYodha;

        } catch (error) {
          console.error(`Error loading details for NFT ${tokenId}:`, error);
          
          // Return a basic object even if there's an error
          return {
            id: index + 1,
            tokenId: Number(tokenId),
            name: `Warrior #${tokenId}`,
            bio: 'Error loading data',
            life_history: 'Unable to retrieve history',
            adjectives: 'Unknown',
            knowledge_areas: 'Unknown',
            traits: {
              strength: 50.0,
              wit: 50.0,
              charisma: 50.0,
              defence: 50.0,
              luck: 50.0
            },
            image: '/lazered.png',
            rank: 'unranked' as const,
            totalWinnings: 0.0
          } as UserYodha;
        }
      });

      const nftResults = await Promise.all(nftPromises);
      console.log('Loaded detailed NFT data:', nftResults);
      setUserNFTs(nftResults);

    } catch (error) {
      console.error('Error loading NFT details:', error);
      setUserNFTs([]);
    } finally {
      setIsLoadingNFTs(false);
      loadingRef.current = false;
    }
  }, [contractAddress, chainId]);

  // Load NFT details when token IDs change
  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Skip if parameters haven't changed
    if (!hasParamsChanged && userNFTs.length > 0) {
      return;
    }

    // Debounce the loading to prevent rapid successive calls
    timeoutRef.current = setTimeout(() => {
      if (userTokenIds && Array.isArray(userTokenIds) && userTokenIds.length > 0) {
        loadNFTDetails(userTokenIds as bigint[]);
      } else if (!tokenIdsLoading && !tokenIdsError) {
        setUserNFTs([]);
        setIsLoadingNFTs(false);
      }
    }, 300); // 300ms debounce

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [userTokenIds, tokenIdsLoading, tokenIdsError, hasParamsChanged]);

  return {
    userNFTs,
    isLoadingNFTs: isLoadingNFTs || tokenIdsLoading,
    hasError: tokenIdsError,
    refetch: () => {
      if (userTokenIds) {
        loadNFTDetails(userTokenIds as bigint[]);
      }
    }
  };
};
