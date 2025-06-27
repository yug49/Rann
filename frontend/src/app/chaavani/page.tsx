"use client";

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import '../home-glass.css';
import { nearAIService } from '../../services/nearAI';
import { nearWalletService } from '../../services/nearWallet';
import { ipfsService } from '../../services/ipfsService';
import { chainsToTSender, yodhaNFTAbi } from '../../constants';
import { useUserNFTs } from '../../hooks/useUserNFTs';

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

const ChaavaniPage = memo(function ChaavaniPage() {
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    life_history: '',
    adjectives: '',
    knowledge_areas: '',
    image: null as File | null
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedYodha, setSelectedYodha] = useState<UserYodha | null>(null);
  const [activeSection, setActiveSection] = useState<'create' | 'manage' | 'ai'>('create');
  const [nearWalletConnected, setNearWalletConnected] = useState(false);
  const [nearAccountId, setNearAccountId] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);

  // Image cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 80,
    x: 10,
    y: 10
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Wagmi hooks for contract interaction
  const { address: connectedAddress } = useAccount();
  const chainId = useChainId();
  
  // Memoize the debug logging to prevent excessive console output
  useMemo(() => {
    console.log('Chaavani - chainId detected:', chainId, 'connectedAddress:', connectedAddress);
  }, [chainId, connectedAddress]);
  
  const { writeContract, data: hash } = useWriteContract();
  const { isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Custom hook to manage user NFTs
  const { userNFTs, isLoadingNFTs, hasError: tokenIdsError, clearCache, debugState } = useUserNFTs(activeSection === 'manage', chainId);

  // Check NEAR wallet connection status
  const checkNearWalletConnection = useCallback(() => {
    const connected = nearWalletService.isConnected();
    const accountId = nearWalletService.getAccountId();
    setNearWalletConnected(connected);
    setNearAccountId(accountId);
  }, []);

  // Connect to NEAR wallet
  const connectNearWallet = useCallback(async () => {
    try {
      await nearWalletService.connectWallet();
      checkNearWalletConnection();
    } catch (error) {
      console.error("Failed to connect NEAR wallet:", error);
    }
  }, [checkNearWalletConnection]);

  // Check wallet connection on component mount
  useEffect(() => {
    checkNearWalletConnection();
  }, []);

  // Handle transaction confirmation and display success message
  useEffect(() => {
    if (isConfirmed && hash) {
      console.log('🎉 NFT MINTED SUCCESSFULLY!');
      console.log('Transaction Hash:', hash);
      console.log('Metadata CID:', ipfsCid);
      console.log('View your NFT metadata at:', `https://ipfs.io/ipfs/${ipfsCid}`);
      
      // TODO: Add UI success notification here
      // For now, we'll log to console as requested
      alert(`🎉 NFT Minted Successfully!\n\nTransaction Hash: ${hash}\nMetadata CID: ${ipfsCid}\n\nCheck the console for more details.`);
    }
  }, [isConfirmed, hash, ipfsCid]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create a FileReader to read the image
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
          // Check if the image is square (1:1 aspect ratio)
          if (img.width === img.height) {
            // Image is square, proceed with upload
            setFormData(prev => ({ ...prev, image: file }));
            setImagePreview(event.target?.result as string);
            console.log(`✅ Image uploaded: ${img.width}x${img.height} (Square)`);
          } else {
            // Image is not square, show cropper
            console.log(`📐 Image needs cropping: ${img.width}x${img.height} - Opening cropper`);
            setCropImageSrc(event.target?.result as string);
            
            // Set initial crop to be a square in the center (using percentage)
            const cropSizePercent = 80; // 80% of the smaller dimension
            setCrop({
              unit: '%',
              width: cropSizePercent,
              height: cropSizePercent,
              x: (100 - cropSizePercent) / 2,
              y: (100 - cropSizePercent) / 2
            });
            
            setShowCropper(true);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const generatePersonality = async () => {
    if (!aiPrompt.trim()) {
      return;
    }

    setIsGenerating(true);
    
    try {
      // Ensure NEAR wallet is connected before making AI call
      if (!nearWalletService.isConnected()) {
        console.log("Connecting to NEAR wallet...");
        await connectNearWallet();
      }
      
      // Call NEAR AI service with the user's prompt
      console.log("Sending prompt to NEAR AI:", aiPrompt);
      const response = await nearAIService.generateCharacterAttributes(aiPrompt);
      
      // Log the response to console as requested
      console.log("NEAR AI Agent Response:", response);
      
      // Extract and parse the JSON from the AI response
      try {
        // Extract JSON from the response (it's wrapped in markdown code blocks)
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
        let jsonString = jsonMatch ? jsonMatch[1] : response;
        
        // If no JSON blocks found, try to find JSON object directly
        if (!jsonMatch) {
          const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
          jsonString = jsonObjectMatch ? jsonObjectMatch[0] : response;
        }
        
        const parsedResponse = JSON.parse(jsonString);
        
        // Map the AI response to form fields
        const name = parsedResponse.name || 'AI Generated Warrior';
        const bio = parsedResponse.bio || 'Generated by NEAR AI';
        
        // Handle life_history (could be string or object)
        let lifeHistory = '';
        if (typeof parsedResponse.life_history === 'string') {
          lifeHistory = parsedResponse.life_history;
        } else if (typeof parsedResponse.life_history === 'object') {
          // Convert object to readable string
          lifeHistory = Object.entries(parsedResponse.life_history)
            .map(([key, value]) => `${key}: ${value}`)
            .join('. ');
        } else {
          lifeHistory = 'Generated by NEAR AI';
        }
        
        // Handle adjectives/personality traits array - check multiple possible field names
        const adjectives = Array.isArray(parsedResponse.adjectives) 
          ? parsedResponse.adjectives.join(', ')
          : Array.isArray(parsedResponse.personality_traits)
          ? parsedResponse.personality_traits.join(', ')
          : Array.isArray(parsedResponse.personality)
          ? parsedResponse.personality.join(', ')
          : 'Brave, Skilled, Strategic';
        
        // Handle knowledge_areas array
        const knowledgeAreas = Array.isArray(parsedResponse.knowledge_areas)
          ? parsedResponse.knowledge_areas.join(', ')
          : 'Combat, Strategy, Leadership';
        
        setFormData({
          name,
          bio,
          life_history: lifeHistory,
          adjectives,
          knowledge_areas: knowledgeAreas,
          image: formData.image
        });
        
      } catch (parseError) {
        console.warn("Could not parse JSON from AI response, using fallback:", parseError);
        
        // Fallback: use the raw response
        setFormData({
          name: 'AI Generated Warrior',
          bio: response.length > 200 ? response.substring(0, 200) + '...' : response,
          life_history: 'Generated by NEAR AI based on your character prompt',
          adjectives: 'Unique, AI-crafted, Powerful',
          knowledge_areas: 'Specialized abilities based on your description',
          image: formData.image
        });
      }
      
    } catch (error) {
      console.error("Error generating personality with NEAR AI:", error);
      
      // Fallback to show error message
      setFormData({
        name: 'Error - Try Again',
        bio: `Failed to generate character with NEAR AI: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life_history: 'Error occurred during generation',
        adjectives: 'Error',
        knowledge_areas: 'Error',
        image: formData.image
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Mint Yodha NFT function - uploads image and creates JSON metadata on IPFS
  const handleMintYodhaNFT = async () => {
    if (!formData.image || !formData.name || !formData.bio || !formData.life_history || !formData.adjectives || !formData.knowledge_areas) {
      console.error('All form fields must be filled before minting');
      return;
    }

    setIsMinting(true);
    console.log('Starting Yodha NFT minting process...');

    try {
      // Upload image and create JSON metadata on IPFS
      console.log('Uploading warrior data to IPFS...');
      const uploadResult = await ipfsService.uploadYodhaNFT({
        name: formData.name,
        bio: formData.bio,
        life_history: formData.life_history,
        adjectives: formData.adjectives,
        knowledge_areas: formData.knowledge_areas,
        image: formData.image
      });
      
      // Store the metadata CID for future use (this will be used for NFT minting)
      setIpfsCid(uploadResult.metadataCid);
      
      console.log('=== YODHA NFT UPLOAD COMPLETE ===');
      console.log('Image CID:', uploadResult.imageCid);
      console.log('Metadata CID:', uploadResult.metadataCid);
      console.log('Image URL:', uploadResult.imageUrl);
      console.log('Metadata URL:', uploadResult.metadataUrl);
      console.log('Generated Metadata:', uploadResult.metadata);
      console.log('===================================');

      // Step 2: Mint NFT on blockchain using the metadata CID
      const tokenURI = `ipfs://${uploadResult.metadataCid}`;
      console.log('Minting NFT with tokenURI:', tokenURI);
      
      writeContract({
        address: chainsToTSender[545].yodhaNFT as `0x${string}`,
        abi: yodhaNFTAbi,
        functionName: 'mintNft',
        args: [tokenURI],
      });

      console.log('NFT minting transaction initiated...');
      
    } catch (error) {
      console.error('Failed to upload Yodha NFT to IPFS:', error);
      // TODO: Add user-friendly error message
    } finally {
      setIsMinting(false);
    }
  };

  const isFormComplete = formData.name && formData.bio && formData.life_history && 
                        formData.adjectives && formData.knowledge_areas && formData.image;

  const getPromotionRequirement = (rank: string): number => {
    switch (rank) {
      case 'unranked': return 1; // 1 ETH for Bronze
      case 'bronze': return 3; // 3 ETH total for Silver (1 + 2)
      case 'silver': return 6; // 6 ETH total for Gold (1 + 2 + 3)
      case 'gold': return 10; // 10 ETH total for Platinum (1 + 2 + 3 + 4)
      default: return 0;
    }
  };

  const canPromote = (yodha: UserYodha): boolean => {
    if (yodha.rank === 'platinum') return false;
    const requirement = getPromotionRequirement(yodha.rank);
    return yodha.totalWinnings >= requirement;
  };

  const getNextRank = (currentRank: string): string => {
    switch (currentRank) {
      case 'unranked': return 'bronze';
      case 'bronze': return 'silver';
      case 'silver': return 'gold';
      case 'gold': return 'platinum';
      default: return currentRank;
    }
  };

  const handlePromoteYodha = async (yodha: UserYodha) => {
    // TODO: Implement actual promotion logic with smart contract
    console.log(`Promoting ${yodha.name} from ${yodha.rank} to ${getNextRank(yodha.rank)}`);
    setSelectedYodha(null);
  };

  const handleActivateYodha = async (yodha: UserYodha) => {
    try {
      console.log(`Activating ${yodha.name}...`);
      
      // Create JSON similar to traitsGenerator.json
      const yodhaData = {
        name: yodha.name,
        bio: yodha.bio,
        life_history: yodha.life_history,
        adjectives: yodha.adjectives,
        knowledge_areas: yodha.knowledge_areas
      };

      console.log("Sending yodha data to NEAR AI traits generator:", yodhaData);

      // Call the backend API to generate traits
      const response = await fetch('/api/activate-yodha', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          yodhaData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate yodha');
      }

      const result = await response.json();
      
      if (result.success) {
        // Log the AI response to console as requested
        console.log("NEAR AI Traits Generator Response:", result.response);
        
        // You can add additional logic here to parse and apply the traits
        // For now, we're just logging the response as requested
        alert(`Yodha ${yodha.name} activation initiated! Check console for AI response.`);
      } else {
        throw new Error('Failed to get valid response from AI');
      }

    } catch (error) {
      console.error('Error activating yodha:', error);
      alert(`Failed to activate ${yodha.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Helper function to check if a Yodha is inactive (all traits are zero)
  const isYodhaInactive = (traits: YodhaTraits) => {
    return traits.strength === 0 && 
           traits.wit === 0 && 
           traits.charisma === 0 && 
           traits.defence === 0 && 
           traits.luck === 0;
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

  // Global cache for successfully loaded image URLs
  const imageUrlCache = useRef<Map<string, string>>(new Map());

  // Custom image component with fallback
  const YodhaImage = memo(({ src, alt, className }: { src: string; alt: string; className: string }) => {
    const [imageSrc, setImageSrc] = useState(() => {
      // Check if we have a cached working URL for this image
      return imageUrlCache.current.get(src) || src;
    });
    const [hasError, setHasError] = useState(false);
    const [useRegularImg, setUseRegularImg] = useState(false);
    const [gatewayIndex, setGatewayIndex] = useState(0);

    // IPFS gateways to try in order
    const ipfsGateways = [
      'https://ipfs.io/ipfs/',
      'https://gateway.pinata.cloud/ipfs/',
      'https://cloudflare-ipfs.com/ipfs/',
      'https://dweb.link/ipfs/'
    ];

    const getIpfsHash = (url: string) => {
      if (url.includes('ipfs://')) {
        return url.replace('ipfs://', '');
      }
      const match = url.match(/\/ipfs\/([^/?]+)/);
      return match ? match[1] : null;
    };

    const tryNextGateway = useCallback(() => {
      const hash = getIpfsHash(src);
      if (hash && gatewayIndex < ipfsGateways.length - 1) {
        const nextIndex = gatewayIndex + 1;
        const nextUrl = `${ipfsGateways[nextIndex]}${hash}`;
        console.log(`🔄 Trying next IPFS gateway: ${nextUrl}`);
        setImageSrc(nextUrl);
        setGatewayIndex(nextIndex);
        setHasError(false);
        return true;
      }
      return false;
    }, [src, gatewayIndex, ipfsGateways]);

    useEffect(() => {
      // Check if we have a cached working URL for this image
      const cachedUrl = imageUrlCache.current.get(src);
      if (cachedUrl && cachedUrl !== src) {
        console.log(`🖼️ YodhaImage: Using cached URL for ${src}: ${cachedUrl}`);
        setImageSrc(cachedUrl);
        setHasError(false);
        setGatewayIndex(0);
      } else {
        console.log(`🖼️ YodhaImage: Setting image src to: ${src}`);
        setImageSrc(src);
        setHasError(false);
        setGatewayIndex(0);
      }
      
      // Use regular img tag for IPFS URLs to avoid Next.js restrictions
      setUseRegularImg(src.includes('ipfs.io') || src.includes('dweb.link') || src.includes('cloudflare-ipfs.com') || src.includes('gateway.pinata.cloud') || src.includes('ipfs://'));
    }, [src]);

    const handleError = useCallback(() => {
      if (!hasError) {
        // Try next IPFS gateway first
        if (tryNextGateway()) {
          return;
        }
        
        // All gateways failed, use fallback
        console.log(`🖼️ All IPFS gateways failed for: ${src}, falling back to lazered.png`);
        setImageSrc('/lazered.png');
        setHasError(true);
        setUseRegularImg(false); // Use Next.js Image for local fallback
      }
    }, [imageSrc, hasError, tryNextGateway, src]);

    const handleLoad = useCallback(() => {
      // Cache the successful URL for future use
      if (imageSrc !== src && !hasError) {
        console.log(`🖼️ Caching successful URL for ${src}: ${imageSrc}`);
        imageUrlCache.current.set(src, imageSrc);
      }
    }, [src, imageSrc, hasError]);

    if (useRegularImg) {
      return (
        <img 
          src={imageSrc}
          alt={alt}
          className={className}
          onError={handleError}
          onLoad={handleLoad}
          style={{ objectFit: 'cover' }}
        />
      );
    }

    return (
      <Image 
        src={imageSrc}
        alt={alt}
        width={300}
        height={256}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
      />
    );
  });

  const TraitBar = memo(({ label, value }: { label: string; value: number }) => (
    <div className="mb-3">
      <div className="flex justify-between mb-1">
        <span 
          className={`text-xs ${value === 0 ? 'text-red-400' : 'text-orange-400'}`}
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {label}
        </span>
        <span 
          className={`text-xs ${value === 0 ? 'text-red-300' : 'text-orange-300'}`}
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {value.toFixed(1)} {value === 0 && '(INACTIVE)'}
        </span>
      </div>
      <div className={`w-full bg-gray-800 h-2 border ${value === 0 ? 'border-red-600' : 'border-orange-600'}`}>
        <div 
          className={`h-full transition-all duration-500 ${value === 0 ? 'bg-red-500' : 'bg-orange-500'}`}
          style={{ width: `${Math.max(value, 2)}%` }} /* Show at least 2% width for zero values for visibility */
        ></div>
      </div>
    </div>
  ));

  const YodhaCard = memo(({ yodha, onClick }: { yodha: UserYodha; onClick: () => void }) => {
    const isInactive = isYodhaInactive(yodha.traits);
    
    return (
      <div 
        className={`arcade-card p-6 cursor-pointer transform hover:scale-105 transition-all duration-300 ${isInactive ? 'opacity-75' : ''}`}
        onClick={onClick}
        style={{
          background: isInactive 
            ? 'radial-gradient(circle at top left, rgba(60, 60, 60, 0.15), rgba(50, 50, 50, 0.1) 50%), linear-gradient(135deg, rgba(80, 80, 80, 0.2) 0%, rgba(60, 60, 60, 0.15) 30%, rgba(80, 80, 80, 0.2) 100%)'
            : 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
          border: `3px solid ${isInactive ? '#666666' : '#ff8c00'}`,
          borderRadius: '24px',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: isInactive 
            ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(102, 102, 102, 0.3)'
            : '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
        }}
      >
      <div className="w-full h-64 mb-4 border-2 border-orange-600 rounded-2xl overflow-hidden relative">
        <YodhaImage 
          src={yodha.image} 
          alt={yodha.name}
          className="w-full h-full object-cover"
        />
        {/* Rank Badge */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded-xl text-xs ${getRankBgColor(yodha.rank)} ${getRankColor(yodha.rank)} border border-current`}>
          <span style={{fontFamily: 'Press Start 2P, monospace'}}>
            {yodha.rank.toUpperCase()}
          </span>
        </div>
        {/* Inactive Badge */}
        {isYodhaInactive(yodha.traits) && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded-xl text-xs bg-red-900 text-red-400 border border-red-500">
            <span style={{fontFamily: 'Press Start 2P, monospace'}}>
              INACTIVE
            </span>
          </div>
        )}
      </div>
      
      <div className="text-center mb-4">
        <h3 
          className="text-lg text-orange-400 mb-4 arcade-glow"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {yodha.name}
        </h3>
      </div>

      <div className="space-y-2 mb-4">
        <TraitBar label="STR" value={yodha.traits.strength} />
        <TraitBar label="WIT" value={yodha.traits.wit} />
        <TraitBar label="CHA" value={yodha.traits.charisma} />
        <TraitBar label="DEF" value={yodha.traits.defence} />
        <TraitBar label="LCK" value={yodha.traits.luck} />
      </div>

      <div className="border-t border-orange-600 pt-4">
        <div className="flex justify-between items-center">
          <span 
            className="text-sm text-green-400"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            {yodha.totalWinnings} RANN
          </span>
          <span 
            className="text-xs text-gray-400"
            style={{fontFamily: 'Press Start 2P, monospace'}}
          >
            #{yodha.tokenId}
          </span>
        </div>
      </div>
    </div>
    );
  });

  // Function to convert cropped area to a File object
  const getCroppedImg = useCallback((image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('No 2d context'));
        return;
      }

      // Get the scale ratios between displayed image and natural image
      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      // Calculate the actual crop dimensions in natural image coordinates
      const pixelCrop = {
        x: crop.x * scaleX,
        y: crop.y * scaleY,
        width: crop.width * scaleX,
        height: crop.height * scaleY,
      };

      // Set canvas size to crop size (use the original crop size for better quality)
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      console.log('Crop info:', {
        displayedSize: { width: image.width, height: image.height },
        naturalSize: { width: image.naturalWidth, height: image.naturalHeight },
        scaleX, scaleY,
        originalCrop: crop,
        pixelCrop
      });

      // Draw the cropped image
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
      );

      // Convert canvas to blob then to File
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
          resolve(file);
        } else {
          reject(new Error('Canvas to blob conversion failed'));
        }
      }, 'image/jpeg', 0.9);
    });
  }, []);

  // Handle crop completion
  const handleCropComplete = useCallback(async () => {
    if (completedCrop && imgRef.current && cropImageSrc) {
      try {
        console.log('Starting crop with:', completedCrop);
        const croppedFile = await getCroppedImg(imgRef.current, completedCrop);
        
        // Set the cropped image as the form data
        setFormData(prev => ({ ...prev, image: croppedFile }));
        setImagePreview(URL.createObjectURL(croppedFile));
        
        // Close cropper
        setShowCropper(false);
        setCropImageSrc(null);
        
        console.log(`✅ Image cropped and uploaded: ${completedCrop.width}x${completedCrop.height} (Square)`);
      } catch (error) {
        console.error('Error cropping image:', error);
        alert('Failed to crop image. Please try again.');
      }
    } else {
      console.log('Missing crop data:', { completedCrop, imgRef: imgRef.current, cropImageSrc });
    }
  }, [completedCrop, cropImageSrc, getCroppedImg]);

  // Handle crop cancel
  const handleCropCancel = useCallback(() => {
    setShowCropper(false);
    setCropImageSrc(null);
    setCompletedCrop(null);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Chaavani.png"
          alt="Chaavani Background"
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
            CHAAVANI
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
              FORGE YOUR LEGENDARY YODHA WARRIOR
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
              onClick={() => setActiveSection('create')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeSection === 'create' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeSection === 'create' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              CREATE YODHA
            </button>
            <button
              onClick={() => setActiveSection('manage')}
              className={`px-6 py-3 text-xs tracking-wide transition-all duration-300 ${
                activeSection === 'manage' 
                  ? 'arcade-button' 
                  : 'border-2 border-gray-600 text-gray-300 hover:border-yellow-600 hover:text-yellow-400'
              }`}
              style={{
                fontFamily: 'Press Start 2P, monospace',
                borderRadius: '12px',
                background: activeSection === 'manage' ? undefined : 'rgba(0, 0, 0, 0.3)'
              }}
            >
              MANAGE YODHAS
            </button>
          </div>
        </div>

        {activeSection === 'create' && (
          <>
            {/* AI Toggle Switch */}
            <div className="flex justify-center mb-12">
              <div 
                className="p-4 flex items-center gap-4"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)',
                  borderRadius: '20px'
                }}
              >
                <span 
                  className="text-orange-400 text-sm tracking-wide arcade-glow"
                  style={{
                    fontFamily: 'Press Start 2P, monospace'
                  }}
                >
                  AI ASSISTANCE
                </span>
                <button
                  onClick={() => setAiEnabled(!aiEnabled)}
                  className={`relative inline-flex items-center w-16 h-8 rounded-full transition-colors duration-300 focus:outline-none ${
                    aiEnabled 
                      ? 'bg-yellow-600' 
                      : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block w-6 h-6 transform bg-white rounded-full transition-transform duration-300 ${
                      aiEnabled ? 'translate-x-9' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span 
                  className={`text-sm tracking-wide ${aiEnabled ? 'text-orange-400 arcade-glow' : 'text-gray-400'}`}
                  style={{
                    fontFamily: 'Press Start 2P, monospace'
                  }}
                >
                  {aiEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Panel - AI Input (conditional) */}
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
              {aiEnabled ? (
                // AI Section
                <div>
                  <div className="mb-6">
                    <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
                      <span className="text-2xl">🤖</span>
                    </div>
                    <h2 
                      className="text-2xl text-orange-400 text-center mb-4 tracking-wider arcade-glow"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      AI FORGE
                    </h2>
                    <p 
                      className="text-gray-300 text-xs text-center leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      DESCRIBE YOUR IDEAL WARRIOR
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Dual Wallet Info */}
                    <div className="bg-blue-900 border border-blue-600 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-red-400">Note: </span>
                        <span 
                          className="text-xs text-blue-300"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          DUAL WALLET SETUP
                        </span>
                      </div>
                      <p 
                        className="text-xs text-blue-200 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        <u>FLOW</u>: Connect wallet through the connect wallet in the header
                      </p>
                      <p 
                        className="text-xs text-blue-200 leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        <u>NEAR</u>: Connect Meteor wallet through the button below
                      </p>
                    </div>

                    {/* NEAR Wallet Connection Status */}
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-xs text-yellow-400"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          NEAR AI WALLET
                        </span>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${nearWalletConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                          <span 
                            className={`text-xs ${nearWalletConnected ? 'text-green-400' : 'text-red-400'}`}
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            {nearWalletConnected ? 'CONNECTED' : 'DISCONNECTED'}
                          </span>
                        </div>
                      </div>
                      {nearAccountId && (
                        <div className="mt-2">
                          <span 
                            className="text-xs text-gray-300"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            {nearAccountId}
                          </span>
                        </div>
                      )}
                      {!nearWalletConnected && (
                        <>
                          <div className="mt-2 mb-2">
                            <span 
                              className="text-xs text-blue-300"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              SEPARATE FROM FLOW WALLET
                            </span>
                          </div>
                          <button
                            onClick={connectNearWallet}
                            className="w-full mt-2 py-2 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            CONNECT NEAR WALLET (Meteor Wallet)
                          </button>
                        </>
                      )}
                    </div>

                    <div>
                      <label 
                        className="block text-yellow-400 text-xs mb-2 tracking-wide"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        CHARACTER PROMPT
                      </label>
                      <textarea
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        placeholder="Describe the type of warrior you want to create..."
                        className="w-full h-32 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      />
                      {/* <iframe 
                        src="https://app.near.ai/embed/samkitsoni.near/attributes-generator/latest?theme=dark" 
                        sandbox="allow-scripts allow-popups allow-same-origin allow-forms"
                        style={{border: 'none', height: '100svh'}}>
                      </iframe> */}
                    </div>

                    <button
                      onClick={generatePersonality}
                      disabled={!aiPrompt.trim() || isGenerating || !nearWalletConnected}
                      className={`w-full arcade-button py-4 text-xs tracking-wide ${
                        (!aiPrompt.trim() || isGenerating || !nearWalletConnected) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      {isGenerating ? 'GENERATING ATTRIBUTES...' : 
                       !nearWalletConnected ? 'CONNECT NEAR WALLET FOR AI' : 
                       'GENERATE WITH NEAR AI'}
                    </button>
                  </div>
                </div>
              ) : (
                // AI Disabled - Instructions
                <div className="text-center py-12">
                  <div className="weapon-container w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-6">
                    <span className="text-2xl">⚒️</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-6 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    MANUAL FORGE MODE
                  </h2>
                  <p 
                    className="text-gray-300 text-xs leading-relaxed mb-4"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CRAFT YOUR WARRIOR MANUALLY
                  </p>
                  <p 
                    className="text-gray-400 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    USE THE FORM TO DEFINE ALL ATTRIBUTES
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel - Form */}
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
              <div className="mb-6">
                <h3 
                  className="text-xl text-orange-400 text-center mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  WARRIOR ATTRIBUTES
                </h3>
              </div>

              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    NAME
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter warrior name..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Bio */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    BIO
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Brief description of the warrior..."
                    className="w-full h-20 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Life History */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    LIFE HISTORY
                  </label>
                  <textarea
                    value={formData.life_history}
                    onChange={(e) => handleInputChange('life_history', e.target.value)}
                    placeholder="Warrior's background and history..."
                    className="w-full h-24 bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs resize-none focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Adjectives */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    PERSONALITY TRAITS
                  </label>
                  <input
                    type="text"
                    value={formData.adjectives}
                    onChange={(e) => handleInputChange('adjectives', e.target.value)}
                    placeholder="Visionary, Ambitious, Perfectionistic..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Knowledge Areas */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    KNOWLEDGE AREAS
                  </label>
                  <input
                    type="text"
                    value={formData.knowledge_areas}
                    onChange={(e) => handleInputChange('knowledge_areas', e.target.value)}
                    placeholder="Military strategy, Divine weapons..."
                    className="w-full bg-gray-900 border-2 border-gray-600 text-gray-300 p-3 text-xs focus:border-yellow-600 focus:outline-none transition-colors rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label 
                    className="block text-yellow-400 text-xs mb-2 tracking-wide"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    WARRIOR IMAGE
                  </label>
                  <div className="border-2 border-dashed border-gray-600 p-4 text-center hover:border-yellow-600 transition-colors relative rounded-2xl">
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-20 h-20 mx-auto rounded-2xl object-cover border-2 border-yellow-600"
                        />
                        <p 
                          className="text-green-400 text-xs"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          IMAGE UPLOADED
                        </p>
                        <button
                          onClick={() => {setImagePreview(null); setFormData(prev => ({...prev, image: null}))}}
                          className="text-red-400 text-xs hover:text-red-300 transition-colors"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          REMOVE IMAGE
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2 cursor-pointer">
                        <div className="text-2xl">📷</div>
                        <p 
                          className="text-gray-400 text-xs"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          CLICK TO UPLOAD IMAGE
                        </p>
                      </div>
                    )}
                    {!imagePreview && (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                {/* Mint Button */}
                <div className="pt-4">
                  <button
                    onClick={handleMintYodhaNFT}
                    disabled={!isFormComplete || isMinting}
                    className={`w-full arcade-button py-4 text-xs tracking-wide ${
                      !isFormComplete || isMinting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    {isMinting ? 'UPLOADING TO IPFS...' : (!isFormComplete ? 'COMPLETE ALL FIELDS' : 'MINT YODHA NFT')}
                  </button>
                  
                  {/* Display CID if NFT data uploaded */}
                  {ipfsCid && (
                    <div className="mt-4 p-3 bg-green-900/30 border border-green-500 rounded-lg">
                      <p className="text-green-400 text-xs mb-2" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        YODHA NFT METADATA UPLOADED TO IPFS
                      </p>
                      <p className="text-green-300 text-xs break-all mb-1">
                        METADATA CID: {ipfsCid}
                      </p>
                      <p className="text-yellow-300 text-xs mb-2" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        ✅ IMAGE + JSON METADATA STORED ON IPFS
                      </p>
                      <a 
                        href={`https://${process.env.NEXT_PUBLIC_GATEWAY_URL || 'gateway.pinata.cloud'}/ipfs/${ipfsCid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 text-xs underline block mt-2"
                      >
                        View Metadata JSON on IPFS Gateway
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
        )}

        {activeSection === 'manage' && (
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <h2 
                className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                YOUR YODHA WARRIORS
              </h2>
              <p 
                className="text-gray-300 text-sm"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                MANAGE AND PROMOTE YOUR LEGENDARY FIGHTERS
              </p>
              
              {/* Debug tools (only show in development) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 flex gap-2 justify-center">
                  <button
                    onClick={() => {
                      clearCache();
                      alert('IPFS metadata cache cleared! Refresh will reload all NFT data.');
                    }}
                    className="px-4 py-2 bg-purple-600 border border-purple-400 text-purple-200 text-xs rounded-lg hover:bg-purple-700 transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    🗑️ CLEAR CACHE
                  </button>
                  <button
                    onClick={() => {
                      debugState();
                      alert('Check console for debug info!');
                    }}
                    className="px-4 py-2 bg-blue-600 border border-blue-400 text-blue-200 text-xs rounded-lg hover:bg-blue-700 transition-colors"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    🐛 DEBUG STATE
                  </button>
                </div>
              )}
              
              {!connectedAddress && (
                <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg">
                  <p 
                    className="text-red-300 text-xs"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CONNECT YOUR WALLET TO VIEW YOUR NFTS
                  </p>
                </div>
              )}
              {connectedAddress && !chainsToTSender[chainId] && (
                <div className="mt-4 p-4 bg-yellow-900/50 border border-yellow-500 rounded-lg">
                  <p 
                    className="text-yellow-300 text-xs"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CONTRACTS NOT DEPLOYED ON CHAIN {chainId}. PLEASE SWITCH TO FLOW TESTNET (CHAIN 545)
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {isLoadingNFTs ? (
                <div className="col-span-full text-center py-12">
                  <div className="loading-spinner mx-auto mb-4"></div>
                  <p 
                    className="text-yellow-400 text-sm animate-pulse mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    LOADING YOUR WARRIORS...
                  </p>
                  <p 
                    className="text-gray-400 text-xs"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    FETCHING DATA FROM BLOCKCHAIN & IPFS...
                  </p>
                  <p 
                    className="text-blue-400 text-xs mt-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    THIS MAY TAKE A MOMENT FOR MULTIPLE NFTS
                  </p>
                </div>
              ) : tokenIdsError ? (
                <div className="col-span-full text-center py-12">
                  <p 
                    className="text-red-400 text-sm"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    ERROR LOADING NFTS. CHECK NETWORK CONNECTION.
                  </p>
                </div>
              ) : userNFTs.length > 0 ? (
                userNFTs.map((yodha) => (
                  <YodhaCard 
                    key={yodha.id} 
                    yodha={yodha} 
                    onClick={() => setSelectedYodha(yodha)} 
                  />
                ))
              ) : connectedAddress ? (
                <div className="col-span-full text-center py-12">
                  <p 
                    className="text-gray-400 text-sm"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    NO YODHAS FOUND. CREATE YOUR FIRST WARRIOR!
                  </p>
                  <button
                    onClick={() => setActiveSection('create')}
                    className="mt-4 px-6 py-3 arcade-button text-xs tracking-wide"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    CREATE YODHA
                  </button>
                </div>
              ) : (
                <div className="col-span-full text-center py-12">
                  <p 
                    className="text-gray-400 text-sm"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    CONNECT WALLET TO VIEW YOUR NFTS
                  </p>
                </div>
              )}
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
                  <div className="w-48 h-48 mx-auto mb-6 border-2 border-orange-600 rounded-2xl overflow-hidden">
                    <YodhaImage 
                      src={selectedYodha.image} 
                      alt={selectedYodha.name}
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
                      <div className="flex justify-center items-center gap-4 mb-4">
                        <div className={`px-3 py-1 rounded-xl ${getRankBgColor(selectedYodha.rank)} ${getRankColor(selectedYodha.rank)} border border-current`}>
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
                        className="text-xs text-gray-400 mb-4"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        TOKEN ID: #{selectedYodha.tokenId}
                      </p>

                      {/* Show inactive status if Yodha is inactive */}
                      {isYodhaInactive(selectedYodha.traits) && (
                        <div className="mb-6">
                          <div className="bg-red-900 border-2 border-red-500 rounded-xl p-3 mb-4">
                            <p 
                              className="text-red-400 text-xs text-center"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              ⚠️ YODHA IS INACTIVE
                            </p>
                            <p 
                              className="text-red-300 text-xs text-center mt-2"
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                              ACTIVATE FIRST TO USE IN BATTLES
                            </p>
                          </div>
                          
                          <button
                            className="w-full arcade-button py-4 text-sm tracking-wide bg-green-600 hover:bg-green-700 border-green-500"
                            style={{
                              fontFamily: 'Press Start 2P, monospace',
                              borderRadius: '12px'
                            }}
                            onClick={() => handleActivateYodha(selectedYodha)}
                          >
                            🌟 ACTIVATE YODHA
                          </button>
                        </div>
                      )}

                      {/* Only show promotion info for active Yodhas */}
                      {!isYodhaInactive(selectedYodha.traits) && selectedYodha.rank !== 'platinum' && (
                        <p 
                          className="text-xs text-yellow-400 mb-4"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          NEXT RANK: {getNextRank(selectedYodha.rank).toUpperCase()} 
                          (REQUIRES {getPromotionRequirement(selectedYodha.rank)} RANN)
                        </p>
                      )}
                    </div>

                    {!isYodhaInactive(selectedYodha.traits) && selectedYodha.rank !== 'platinum' ? (
                      <button
                        onClick={() => handlePromoteYodha(selectedYodha)}
                        disabled={!canPromote(selectedYodha)}
                        className={`w-full py-4 text-sm tracking-wide transition-colors ${
                          canPromote(selectedYodha)
                            ? 'arcade-button'
                            : 'bg-gray-800 border-2 border-gray-600 text-gray-500 opacity-50 cursor-not-allowed'
                        }`}
                        style={{
                          fontFamily: 'Press Start 2P, monospace',
                          borderRadius: '12px'
                        }}
                      >
                        {canPromote(selectedYodha) ? 'PROMOTE WARRIOR' : 'INSUFFICIENT WINNINGS'}
                      </button>
                    ) : !isYodhaInactive(selectedYodha.traits) && selectedYodha.rank === 'platinum' ? (
                      <div className="text-center">
                        <p 
                          className="text-blue-300 text-sm py-4"
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          MAXIMUM RANK ACHIEVED!
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'ai' && (
          <div className="max-w-4xl mx-auto">
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
              <div className="text-center mb-8">
                <h2 
                  className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  AI FORGE ASSISTANT
                </h2>
                <p 
                  className="text-purple-200 text-sm"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  GET STRATEGIC ADVICE FOR YOUR WARRIORS
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <label 
                    className="block text-purple-300 text-xs mb-2"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    ASK THE AI FORGE MASTER:
                  </label>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="What attributes should I prioritize for my next Yodha? How can I optimize my current warriors?"
                    className="w-full p-4 bg-black/50 border-2 border-purple-600 text-purple-100 text-sm rounded-2xl"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                    rows={4}
                  />
                </div>

                <button
                  onClick={() => console.log('AI assistance requested:', aiPrompt)}
                  className="w-full arcade-button py-4 text-sm tracking-wide"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  CONSULT FORGE MASTER
                </button>

                <div 
                  className="p-4 border-2 border-purple-600 rounded-2xl"
                  style={{
                    background: 'rgba(128, 0, 128, 0.1)'
                  }}
                >
                  <h3 
                    className="text-purple-300 text-xs mb-3"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    FORGE MASTER&apos;S WISDOM:
                  </h3>
                  <p 
                    className="text-purple-200 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    {aiPrompt ? 
                      "The AI Forge Master will provide strategic guidance on warrior creation, attribute optimization, and battle preparation strategies. Ask specific questions about your Yodha development!" :
                      "Enter your question above to receive ancient wisdom from the AI Forge Master..."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Image Cropper Modal */}
        {showCropper && cropImageSrc && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border-2 border-orange-600 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
              <h3 
                className="text-orange-400 text-lg mb-4 text-center"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                CROP YOUR IMAGE TO SQUARE
              </h3>
              
              <p 
                className="text-gray-400 text-xs mb-6 text-center"
                style={{fontFamily: 'Press Start 2P, monospace'}}
              >
                DRAG THE CORNERS TO ADJUST THE CROP AREA
              </p>

              <div className="flex justify-center mb-6">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1} // Force 1:1 aspect ratio
                  className="max-w-full max-h-96"
                >
                  <img
                    ref={imgRef}
                    src={cropImageSrc}
                    alt="Crop preview"
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                    onLoad={(e) => {
                      const { naturalWidth, naturalHeight } = e.currentTarget;
                      const { width: displayWidth, height: displayHeight } = e.currentTarget;
                      
                      // Calculate crop in percentage terms for the displayed image
                      const minDimension = Math.min(naturalWidth, naturalHeight);
                      const cropSizeNatural = Math.min(minDimension, Math.min(naturalWidth, naturalHeight) * 0.8);
                      
                      // Convert to percentage of displayed image
                      const cropSizePercent = (cropSizeNatural / Math.max(naturalWidth, naturalHeight)) * 100;
                      
                      const newCrop = {
                        unit: '%' as const,
                        width: cropSizePercent,
                        height: cropSizePercent,
                        x: (100 - cropSizePercent) / 2,
                        y: (100 - cropSizePercent) / 2,
                      };
                      
                      console.log('Setting initial crop:', newCrop);
                      setCrop(newCrop);
                    }}
                  />
                </ReactCrop>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleCropCancel}
                  className="arcade-button px-6 py-3 text-xs bg-red-600 hover:bg-red-700 border-red-500"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  CANCEL
                </button>
                <button
                  onClick={handleCropComplete}
                  disabled={!completedCrop}
                  className={`arcade-button px-6 py-3 text-xs ${
                    completedCrop 
                      ? 'bg-green-600 hover:bg-green-700 border-green-500' 
                      : 'bg-gray-600 border-gray-500 opacity-50 cursor-not-allowed'
                  }`}
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                  CROP & USE
                </button>
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
});

export default ChaavaniPage;