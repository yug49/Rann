import { readContract } from '@wagmi/core';
import { chainsToTSender, yodhaNFTAbi } from '../constants';
import rainbowKitConfig from '../rainbowKitConfig';

export interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

export interface YodhaMetadata {
  name: string;
  description?: string;
  image: string;
  bio?: string;
  life_history?: string;
  adjectives?: string;
  knowledge_areas?: string;
  attributes?: Array<{
    trait_type: string;
    value: number;
  }>;
}

export interface YodhaDetails {
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
  owner: string;
  tokenURI: string;
}

// Simple metadata cache to avoid repeated IPFS requests
const metadataCache = new Map<string, YodhaMetadata>();

// Helper function to convert IPFS URI to HTTP URL
const convertIpfsToHttpUrl = (ipfsUrl: string): string => {
  if (ipfsUrl.startsWith('ipfs://')) {
    const hash = ipfsUrl.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }
  return ipfsUrl;
};

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to fetch metadata from IPFS with multiple gateway fallbacks
const fetchMetadataFromIPFS = async (tokenURI: string, tokenId: number): Promise<YodhaMetadata> => {
  if (!tokenURI.startsWith('ipfs://')) {
    throw new Error('Not an IPFS URL');
  }

  // Check cache first
  if (metadataCache.has(tokenURI)) {
    return metadataCache.get(tokenURI)!;
  }

  const cid = tokenURI.replace('ipfs://', '');
  
  // Use multiple gateways with different characteristics
  const gateways = [
    { url: 'https://ipfs.io/ipfs/', name: 'ipfs.io', timeout: 10000 },
    { url: 'https://dweb.link/ipfs/', name: 'dweb.link', timeout: 12000 },
    { url: 'https://cloudflare-ipfs.com/ipfs/', name: 'cloudflare', timeout: 10000 },
    { url: 'https://gateway.pinata.cloud/ipfs/', name: 'pinata', timeout: 15000 },
  ];

  // Add a small delay to prevent overwhelming the gateways
  await delay(Math.random() * 500 + 100);

  for (let i = 0; i < gateways.length; i++) {
    const gateway = gateways[i];
    const httpUrl = `${gateway.url}${cid}`;
    
    try {
      console.log(`🌐 Yodha ${tokenId}: Fetching metadata from ${gateway.name}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), gateway.timeout);
      
      const response = await fetch(httpUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
      }
      
      const metadata = await response.json();
      console.log(`✅ Yodha ${tokenId}: Metadata fetched successfully`);
      
      // Validate metadata structure
      if (!metadata || typeof metadata !== 'object') {
        throw new Error('Invalid metadata structure');
      }
      
      // Ensure required fields exist
      const processedMetadata: YodhaMetadata = {
        name: metadata.name || `Yodha Warrior #${tokenId}`,
        description: metadata.description || '',
        image: metadata.image ? convertIpfsToHttpUrl(metadata.image) : '',
        bio: metadata.bio || '',
        life_history: metadata.life_history || '',
        adjectives: metadata.adjectives || '',
        knowledge_areas: metadata.knowledge_areas || '',
        attributes: metadata.attributes || []
      };
      
      // Cache the metadata
      metadataCache.set(tokenURI, processedMetadata);
      return processedMetadata;
      
    } catch (error) {
      console.warn(`❌ Yodha ${tokenId}: Gateway ${gateway.name} failed:`, error);
      
      if (i < gateways.length - 1) {
        await delay(500);
      }
    }
  }
  
  // Fallback metadata if all gateways fail
  console.log(`🔄 Yodha ${tokenId}: All IPFS gateways failed, using fallback`);
  const fallbackMetadata: YodhaMetadata = {
    name: `Yodha Warrior #${tokenId}`,
    description: "A legendary warrior from the Rann battlefield",
    image: "/lazered.png", // Fallback image
    bio: "Ancient warrior whose full history is being retrieved...",
    life_history: "Born in the age of digital warfare...",
    adjectives: "Brave, Mysterious, Resilient",
    knowledge_areas: "Combat, Strategy, Digital Warfare",
    attributes: [
      { trait_type: "Strength", value: Math.floor(Math.random() * 50) + 50 },
      { trait_type: "Wit", value: Math.floor(Math.random() * 50) + 50 },
      { trait_type: "Charisma", value: Math.floor(Math.random() * 50) + 50 },
      { trait_type: "Defence", value: Math.floor(Math.random() * 50) + 50 },
      { trait_type: "Luck", value: Math.floor(Math.random() * 50) + 50 },
    ]
  };
  
  metadataCache.set(tokenURI, fallbackMetadata);
  return fallbackMetadata;
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

export const yodhaNFTService = {
  /**
   * Fetch complete Yodha details including metadata from IPFS
   */
  async getYodhaDetails(tokenId: number): Promise<YodhaDetails> {
    try {
      // Fetch basic contract data including traits from contract
      const [tokenURI, ranking, winnings, owner, contractTraits] = await Promise.all([
        readContract(rainbowKitConfig, {
          address: chainsToTSender[545].yodhaNFT as `0x${string}`,
          abi: yodhaNFTAbi,
          functionName: 'tokenURI',
          args: [BigInt(tokenId)],
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: chainsToTSender[545].yodhaNFT as `0x${string}`,
          abi: yodhaNFTAbi,
          functionName: 'getRanking',
          args: [BigInt(tokenId)],
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: chainsToTSender[545].yodhaNFT as `0x${string}`,
          abi: yodhaNFTAbi,
          functionName: 'getWinnings',
          args: [BigInt(tokenId)],
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: chainsToTSender[545].yodhaNFT as `0x${string}`,
          abi: yodhaNFTAbi,
          functionName: 'ownerOf',
          args: [BigInt(tokenId)],
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: chainsToTSender[545].yodhaNFT as `0x${string}`,
          abi: yodhaNFTAbi,
          functionName: 'getTraits',
          args: [BigInt(tokenId)],
          chainId: 545,
        })
      ]);

      // Fetch metadata from IPFS
      const metadata = await fetchMetadataFromIPFS(tokenURI as string, tokenId);
      
      // Use traits from contract instead of metadata, divide by 100 for display
      const traits: YodhaTraits = {
        strength: Number((contractTraits as { strength: bigint }).strength ?? BigInt(5000)) / 100,
        wit: Number((contractTraits as { wit: bigint }).wit ?? BigInt(5000)) / 100,
        charisma: Number((contractTraits as { charisma: bigint }).charisma ?? BigInt(5000)) / 100,
        defence: Number((contractTraits as { defence: bigint }).defence ?? BigInt(5000)) / 100,
        luck: Number((contractTraits as { luck: bigint }).luck ?? BigInt(5000)) / 100
      };

      // Construct complete Yodha details
      const yodhaDetails: YodhaDetails = {
        id: tokenId,
        tokenId: tokenId,
        name: metadata.name,
        bio: metadata.bio || '',
        life_history: metadata.life_history || '',
        adjectives: metadata.adjectives || '',
        knowledge_areas: metadata.knowledge_areas || '',
        traits: traits,
        image: metadata.image,
        rank: rankingToString(Number(ranking)),
        totalWinnings: Number(winnings),
        owner: owner as string,
        tokenURI: tokenURI as string
      };

      return yodhaDetails;
    } catch (error) {
      console.error(`Error fetching Yodha ${tokenId} details:`, error);
      throw error;
    }
  },

  /**
   * Fetch multiple Yodha details in batch
   */
  async getBatchYodhaDetails(tokenIds: number[]): Promise<YodhaDetails[]> {
    const results: YodhaDetails[] = [];
    
    // Process in smaller batches to avoid overwhelming IPFS gateways
    const batchSize = 3;
    for (let i = 0; i < tokenIds.length; i += batchSize) {
      const batch = tokenIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (tokenId) => {
        try {
          return await this.getYodhaDetails(tokenId);
        } catch (error) {
          console.error(`Failed to fetch Yodha ${tokenId}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(result => result !== null) as YodhaDetails[]);
      
      // Add delay between batches
      if (i + batchSize < tokenIds.length) {
        await delay(1000);
      }
    }

    return results;
  },

  /**
   * Clear the metadata cache
   */
  clearCache(): void {
    metadataCache.clear();
    console.log('🗑️ Yodha metadata cache cleared');
  }
};
