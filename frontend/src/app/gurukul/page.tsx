"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import Link from 'next/link';
import { nearWalletService } from '../../services/nearWallet';
import { yodhaNFTAbi, GurukulAbi, chainsToTSender } from '../../constants';
import Image from 'next/image';
import '../home-glass.css';

interface YodhaTraits {
  strength: number;
  wit: number;
  charisma: number;
  defence: number;
  luck: number;
}

interface MCQOption {
  id: number;
  text: string;
}

interface MCQuestion {
  id: number;
  question: string;
  options: MCQOption[];
}

interface QuestionAnswer {
  questionId: number;
  selectedOptionId: number;
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

export default function GurukulPage() {
  // Wagmi hooks
  const { address, isConnected: isWagmiConnected } = useAccount();
  const { writeContract: writeYodhaNFT, data: approvalHash } = useWriteContract();
  const { writeContract: writeGurukul, data: gurukulHash } = useWriteContract();
  const { isSuccess: isApprovalSuccess } = useWaitForTransactionReceipt({ hash: approvalHash });
  const { isSuccess: isGurukulSuccess } = useWaitForTransactionReceipt({ hash: gurukulHash });
  const chainId = useChainId();
  
  // Contract addresses
  const yodhaNFTContract = chainId ? chainsToTSender[chainId]?.yodhaNFT : undefined;
  const gurukulContract = chainId ? chainsToTSender[chainId]?.Gurukul : undefined;
  
  // NEAR wallet states
  const [isNearConnected, setIsNearConnected] = useState(false);
  const [nearAccountId, setNearAccountId] = useState<string | null>(null);
  
  // Approval and Gurukul entry states
  const [isApproved, setIsApproved] = useState(false);
  const [hasEnteredGurukul, setHasEnteredGurukul] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  
  // Warrior selection and management states
  const [userYodhas, setUserYodhas] = useState<UserYodha[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  
  // Training states
  const [questions, setQuestions] = useState<MCQuestion[]>([]);
  const [assignedQuestionIds, setAssignedQuestionIds] = useState<number[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [tokenId: number]: QuestionAnswer[] }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [trainingCompleted, setTrainingCompleted] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentTraits, setCurrentTraits] = useState<YodhaTraits | null>(null);
  const [traitChanges, setTraitChanges] = useState<{
    strength: number;
    wit: number;
    charisma: number;
    defence: number;
    luck: number;
  } | null>(null);
  const [beforeTraits, setBeforeTraits] = useState<YodhaTraits | null>(null);

  // IPFS and question loading states
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isLoadingNFTs, setIsLoadingNFTs] = useState(false);

  // Helper function to convert IPFS URI to fallback image URL
  const convertIpfsToProxyUrl = (ipfsUrl: string) => {
    if (ipfsUrl.startsWith('ipfs://')) {
      const hash = ipfsUrl.replace('ipfs://', '');
      return `https://ipfs.io/ipfs/${hash}`;
    }
    return ipfsUrl;
  };

  // Helper function to fetch metadata from IPFS
  const fetchMetadataFromIPFS = async (tokenURI: string, tokenId: string) => {
    if (!tokenURI.startsWith('ipfs://')) {
      console.log('Not an IPFS URL:', tokenURI);
      return null;
    }

    const cid = tokenURI.replace('ipfs://', '');
    
    const gateways = [
      { url: 'https://ipfs.io/ipfs/', name: 'ipfs.io', timeout: 10000 },
      { url: 'https://dweb.link/ipfs/', name: 'dweb.link', timeout: 12000 },
      { url: 'https://cloudflare-ipfs.com/ipfs/', name: 'cloudflare', timeout: 10000 },
      { url: 'https://gateway.pinata.cloud/ipfs/', name: 'pinata', timeout: 15000 },
    ];

    for (let i = 0; i < gateways.length; i++) {
      const gateway = gateways[i];
      const httpUrl = `${gateway.url}${cid}`;
      
      try {
        console.log(`🌐 Token ${tokenId}: Fetching from ${gateway.name}`);
        
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
        console.log(`✅ Token ${tokenId}: Success with ${gateway.name}`, metadata);
        
        if (!metadata || typeof metadata !== 'object' || (!metadata.name && !metadata.title)) {
          throw new Error('Invalid metadata structure');
        }
        
        return metadata;
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.warn(`❌ Token ${tokenId}: Gateway ${gateway.name} failed:`, errorMessage);
        
        if (i < gateways.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between gateway attempts
        }
      }
    }
    
    console.log(`❌ Token ${tokenId}: All IPFS gateways failed`);
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

  // Contract interaction state - improved error handling
  const { writeContract, data: hash, error: contractError } = useWriteContract();
  const { 
    isLoading: isContractLoading, 
    isSuccess: isContractSuccess, 
    isError: isContractError,
    error: transactionError
  } = useWaitForTransactionReceipt({
    hash,
  });

  // Function to update traits on the contract
  const updateTraitsOnContract = async (traits: YodhaTraits) => {
    if (!selectedTokenId) {
      console.error('No token ID selected');
      setAiResponse(prev => `${prev}\n\n❌ No token ID selected for contract update`);
      return;
    }

    if (!gurukulContract) {
      console.error('Gurukul contract not available');
      setAiResponse(prev => `${prev}\n\n❌ Gurukul contract not available`);
      return;
    }

    try {
      console.log('🔐 Starting contract trait update process...');
      console.log('📋 Selected Token ID:', selectedTokenId);
      console.log('📋 Gurukul Contract:', gurukulContract);
      console.log('📋 Chain ID:', chainId);
      
      // Convert traits to contract format (multiply by 100)
      const contractTraits = {
        strength: Math.floor(traits.strength * 100),
        wit: Math.floor(traits.wit * 100),
        charisma: Math.floor(traits.charisma * 100),
        defence: Math.floor(traits.defence * 100),
        luck: Math.floor(traits.luck * 100)
      };
      
      console.log('📊 Contract traits (x100):', contractTraits);
      
      // Validate trait values are within acceptable range
      const maxTraitValue = 10000;
      const traitKeys = Object.keys(contractTraits) as (keyof typeof contractTraits)[];
      for (const key of traitKeys) {
        if (contractTraits[key] > maxTraitValue) {
          throw new Error(`Trait ${key} value ${contractTraits[key]} exceeds maximum allowed value of ${maxTraitValue}`);
        }
      }
      
      setAiResponse(prev => `${prev}\n\n🔐 Signing traits for blockchain update...`);
      
      // Call server-side API to sign the traits
      const signResponse = await fetch('/api/sign-traits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tokenId: selectedTokenId,
          traits: contractTraits
        }),
      });

      if (!signResponse.ok) {
        const errorText = await signResponse.text();
        throw new Error(`Failed to sign traits: ${signResponse.status} ${signResponse.statusText} - ${errorText}`);
      }

      const signResult = await signResponse.json();
      const { signature } = signResult;
      
      if (!signature) {
        throw new Error('No signature received from signing service');
      }
      
      console.log('✅ Traits signed successfully');
      console.log('📝 Signature:', signature);
      
      setAiResponse(prev => `${prev}\n\n📝 Traits signed successfully, sending to blockchain...`);
      
      // Get current chain ID from wagmi
      const currentChainId = chainId || 31337;
      const contractAddress = chainsToTSender[currentChainId as keyof typeof chainsToTSender]?.Gurukul;
      
      if (!contractAddress) {
        throw new Error(`Contract address not found for chain ID: ${currentChainId}`);
      }
      
      console.log('📋 Calling updateTraits on contract:', contractAddress);
      console.log('📋 Function args:', [
        selectedTokenId,
        contractTraits.strength,
        contractTraits.wit,
        contractTraits.charisma,
        contractTraits.defence,
        contractTraits.luck,
        signature
      ]);
      
      // Call the contract
      writeContract({
        address: contractAddress as `0x${string}`,
        abi: GurukulAbi,
        functionName: 'updateTraits',
        args: [
          BigInt(selectedTokenId),
          contractTraits.strength,
          contractTraits.wit,
          contractTraits.charisma,
          contractTraits.defence,
          contractTraits.luck,
          signature as `0x${string}`
        ],
      });
      
      console.log('✅ Contract writeContract called successfully');
      
    } catch (error) {
      console.error('❌ Contract update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setAiResponse(prev => `${prev}\n\n❌ Contract update failed: ${errorMessage}`);
      setIsSubmitting(false);
    }
  };

  
  // Check NEAR wallet connection status
  const checkNearWalletConnection = useCallback(() => {
    const connected = nearWalletService.isConnected();
    const accountId = nearWalletService.getAccountId();
    setIsNearConnected(connected);
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
  }, [checkNearWalletConnection]);

  // Get user's NFTs
  const { data: userTokenIds } = useReadContract({
    address: yodhaNFTContract as `0x${string}`,
    abi: yodhaNFTAbi,
    functionName: 'getNFTsOfAOwner',
    args: [address],
    query: {
      enabled: !!address && !!yodhaNFTContract,
    }
  });

  // Check if NFT is approved for Gurukul
  const { data: approvedAddress, refetch: refetchApproval } = useReadContract({
    address: yodhaNFTContract as `0x${string}`,
    abi: yodhaNFTAbi,
    functionName: 'getApproved',
    args: [selectedTokenId || 0],
    query: {
      enabled: !!selectedTokenId && !!yodhaNFTContract,
    }
  });

  // Check if user has entered Gurukul
  const { data: assignedQuestions, refetch: refetchAssignedQuestions } = useReadContract({
    address: gurukulContract as `0x${string}`,
    abi: GurukulAbi,
    functionName: 'getTokenIdToQuestions',
    args: [selectedTokenId || 0],
    query: {
      enabled: !!selectedTokenId && !!gurukulContract,
    }
  });

  // Get current traits for selected NFT (not used directly but needed for contract interaction)
  const { refetch: refetchTraits } = useReadContract({
    address: yodhaNFTContract as `0x${string}`,
    abi: yodhaNFTAbi,
    functionName: 'getTraits',
    args: [selectedTokenId || 0],
    query: {
      enabled: !!selectedTokenId && !!yodhaNFTContract,
    }
  });

  // Get IPFS CID for questions
  const { data: ipfsCidData } = useReadContract({
    address: gurukulContract as `0x${string}`,
    abi: GurukulAbi,
    functionName: 'getIpfsCID',
    args: [],
    query: {
      enabled: !!gurukulContract,
    }
  });

  // Monitor contract transaction status (after contract read hooks)
  useEffect(() => {
    if (isContractSuccess) {
      console.log('✅ Contract traits updated successfully!');
      setAiResponse(prev => `${prev}\n\n🎉 Traits successfully updated on blockchain!`);
      setIsSubmitting(false);
      setTrainingCompleted(true);
      
      // Refresh traits data to show updated values
      if (selectedTokenId) {
        refetchTraits();
      }
    }
  }, [isContractSuccess, selectedTokenId, refetchTraits]);

  useEffect(() => {
    if (isContractLoading) {
      console.log('⏳ Contract transaction pending...');
      setAiResponse(prev => `${prev}\n\n⏳ Updating traits on blockchain...`);
    }
  }, [isContractLoading]);

  // Handle contract call errors
  useEffect(() => {
    if (contractError) {
      console.error('❌ Contract call error:', contractError);
      setAiResponse(prev => `${prev}\n\n❌ Contract call failed: ${contractError.message}`);
      setIsSubmitting(false);
    }
  }, [contractError]);

  // Handle transaction errors
  useEffect(() => {
    if (isContractError && transactionError) {
      console.error('❌ Transaction error:', transactionError);
      setAiResponse(prev => `${prev}\n\n❌ Transaction failed: ${transactionError.message}`);
      setIsSubmitting(false);
    }
  }, [isContractError, transactionError]);

  // Process user's NFTs - comprehensive metadata loading like Chaavani
  useEffect(() => {
    if (userTokenIds && Array.isArray(userTokenIds) && userTokenIds.length > 0) {
      const tokenIds = userTokenIds.map(id => Number(id));
      
      const loadNFTDetails = async () => {
        setIsLoadingNFTs(true);
        const activatedYodhas: UserYodha[] = [];
        
        try {
          for (let index = 0; index < tokenIds.length; index++) {
            const tokenId = tokenIds[index];
            
            try {
              console.log(`🔄 Processing NFT ${index + 1}/${tokenIds.length}: Token ID ${tokenId}`);
              
              // Get contract data for this token
              const [tokenURIResponse, traitsResponse, rankingResponse, winningsResponse] = await Promise.allSettled([
                // Get token URI
                fetch('/api/contract/read', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contractAddress: yodhaNFTContract,
                    abi: yodhaNFTAbi,
                    functionName: 'tokenURI',
                    args: [tokenId.toString()],
                    chainId: chainId || 545
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
                    contractAddress: yodhaNFTContract,
                    abi: yodhaNFTAbi,
                    functionName: 'getTraits',
                    args: [tokenId.toString()],
                    chainId: chainId || 545
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
                    contractAddress: yodhaNFTContract,
                    abi: yodhaNFTAbi,
                    functionName: 'getRanking',
                    args: [tokenId.toString()],
                    chainId: chainId || 545
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
                    contractAddress: yodhaNFTContract,
                    abi: yodhaNFTAbi,
                    functionName: 'getWinnings',
                    args: [tokenId.toString()],
                    chainId: chainId || 545
                  })
                }).then(async res => {
                  const data = await res.json();
                  if (!res.ok || data.error) {
                    throw new Error(data.error || `HTTP ${res.status}`);
                  }
                  return data;
                })
              ]);

              // Extract results
              const tokenURI = tokenURIResponse.status === 'fulfilled' ? tokenURIResponse.value : null;
              const contractTraits = traitsResponse.status === 'fulfilled' ? traitsResponse.value : null;
              const ranking = rankingResponse.status === 'fulfilled' ? rankingResponse.value : 0;
              const winnings = winningsResponse.status === 'fulfilled' ? winningsResponse.value : '0';

              // Parse traits from contract (convert from uint16 with 2 decimal precision)
              let traits: YodhaTraits | null = null;
              
              if (contractTraits) {
                traits = {
                  strength: Number(contractTraits.strength) / 100,
                  wit: Number(contractTraits.wit) / 100,
                  charisma: Number(contractTraits.charisma) / 100,
                  defence: Number(contractTraits.defence) / 100,
                  luck: Number(contractTraits.luck) / 100
                };
              }

              // Check if the NFT is activated (has traits assigned)
              const isActivated = traits && (traits.strength > 0 || traits.wit > 0 || traits.charisma > 0 || traits.defence > 0 || traits.luck > 0);
              
              if (!isActivated) {
                console.log(`⚠️ Token ${tokenId} is not activated (no traits assigned)`);
                continue; // Skip unactivated NFTs
              }

              // Fetch metadata from IPFS if we have a tokenURI
              let metadata = null;
              if (tokenURI) {
                console.log(`🔍 Fetching metadata for token ${tokenId} from:`, tokenURI);
                metadata = await fetchMetadataFromIPFS(tokenURI, tokenId.toString());
              }

              // Convert winnings from wei to ether
              const totalWinnings = Number(winnings) / 1e18;

              // Create UserYodha with real metadata or fallbacks
              const userYodha: UserYodha = {
                id: index + 1,
                tokenId: Number(tokenId),
                name: metadata?.name || metadata?.title || `Yodha #${tokenId}`,
                bio: metadata?.bio || 'Brave warrior trained in the arts of combat',
                life_history: metadata?.life_history || 'A legendary fighter with unknown origins',
                adjectives: Array.isArray(metadata?.personality) 
                  ? metadata.personality.join(', ') 
                  : metadata?.adjectives || 'Determined, courageous',
                knowledge_areas: Array.isArray(metadata?.knowledge_areas)
                  ? metadata.knowledge_areas.join(', ')
                  : metadata?.knowledge_areas || 'Combat, strategy',
                traits: traits || {
                  strength: 0,
                  wit: 0,
                  charisma: 0,
                  defence: 0,
                  luck: 0
                },
                image: metadata?.image ? convertIpfsToProxyUrl(metadata.image) : '/lazered.png',
                rank: rankingToString(ranking),
                totalWinnings: totalWinnings
              };
              
              activatedYodhas.push(userYodha);
              
            } catch (error) {
              console.warn(`Failed to process token ${tokenId}:`, error);
            }
          }
          
          setUserYodhas(activatedYodhas);
          
          // Set first activated token as selected if none selected
          if (!selectedTokenId && activatedYodhas.length > 0) {
            setSelectedTokenId(activatedYodhas[0].tokenId);
          }
          
        } catch (error) {
          console.error('Failed to load NFT details:', error);
        } finally {
          setIsLoadingNFTs(false);
        }
      };
      
      loadNFTDetails();
    }
  }, [userTokenIds, selectedTokenId, yodhaNFTContract, chainId]);

  // Update current traits based on selected token
  useEffect(() => {
    if (selectedTokenId && userYodhas.length > 0) {
      const selectedYodha = userYodhas.find(yodha => yodha.tokenId === selectedTokenId);
      if (selectedYodha) {
        setCurrentTraits(selectedYodha.traits);
      }
    } else {
      setCurrentTraits(null);
    }
  }, [selectedTokenId, userYodhas]);

  // Update assigned questions state when assignedQuestions data changes
  useEffect(() => {
    if (assignedQuestions && Array.isArray(assignedQuestions) && assignedQuestions.length > 0) {
      console.log('Raw assigned questions:', assignedQuestions);
      
      // Remove duplicates first
      const uniqueIds = [...new Set(assignedQuestions.map(id => Number(id)))];
      console.log('Unique question IDs:', uniqueIds);
      
      // If we have fewer than 5 questions due to duplicates, fill with other available questions
      if (uniqueIds.length < 5 && questions.length > 0) {
        const availableQuestionIds = questions.map(q => q.id);
        const missingCount = 5 - uniqueIds.length;
        
        // Find questions that aren't already assigned
        const unassignedIds = availableQuestionIds.filter(id => !uniqueIds.includes(id));
        
        // Add random unassigned questions to reach 5 total
        const additionalIds = unassignedIds.slice(0, missingCount);
        const finalQuestionIds = [...uniqueIds, ...additionalIds];
        
        console.log('Final question IDs (with replacements):', finalQuestionIds);
        setAssignedQuestionIds(finalQuestionIds);
      } else {
        // If we have 5 or more unique questions, just use the first 5
        const finalQuestionIds = uniqueIds.slice(0, 5);
        console.log('Final question IDs (trimmed to 5):', finalQuestionIds);
        setAssignedQuestionIds(finalQuestionIds);
      }
      
      setHasEnteredGurukul(true);
    } else {
      setAssignedQuestionIds([]);
      setHasEnteredGurukul(false);
    }
  }, [assignedQuestions, questions]);

  // Update approval status
  useEffect(() => {
    if (approvedAddress && gurukulContract) {
      const addressStr = approvedAddress as string;
      setIsApproved(addressStr.toLowerCase() === gurukulContract.toLowerCase());
    } else {
      setIsApproved(false);
    }
  }, [approvedAddress, gurukulContract]);

  // Process IPFS CID and load questions
  useEffect(() => {
    if (ipfsCidData && typeof ipfsCidData === 'string') {
      loadQuestionsFromIPFS(ipfsCidData);
    }
  }, [ipfsCidData]);

  // Load questions from IPFS only - no fallback, strict contract compliance
  const loadQuestionsFromIPFS = async (cid: string) => {
    setIsLoadingQuestions(true);
    setQuestions([]); // Clear existing questions
    
    try {
      console.log('📡 Loading questions from contract IPFS CID:', cid);
      
      // Try multiple IPFS gateways for reliability
      const gateways = [
        'https://ipfs.io/ipfs/',
        'https://dweb.link/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://gateway.pinata.cloud/ipfs/'
      ];
      
      let questionsData = null;
      let lastError = null;
      
      for (const gateway of gateways) {
        try {
          console.log(`🔍 Attempting to load from gateway: ${gateway}${cid}`);
          
          const response = await fetch(`${gateway}${cid}`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            },
            // Add timeout to prevent hanging
            signal: AbortSignal.timeout(30000) // 30 second timeout
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.questions && Array.isArray(data.questions)) {
              questionsData = data;
              console.log(`✅ Successfully loaded ${data.questions.length} questions from ${gateway}`);
              break;
            } else {
              console.warn(`⚠️ Invalid question data format from ${gateway}`);
            }
          } else {
            console.warn(`⚠️ HTTP ${response.status} from ${gateway}`);
          }
        } catch (error) {
          lastError = error;
          console.warn(`❌ Failed to load from ${gateway}:`, error);
        }
      }
      
      if (questionsData && questionsData.questions) {
        // Validate question format
        const validQuestions = questionsData.questions.filter((q: MCQuestion) => 
          q && 
          typeof q.id === 'number' &&
          typeof q.question === 'string' &&
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          q.options.every((opt: MCQOption) => opt && typeof opt.id === 'number' && typeof opt.text === 'string')
        );
        
        if (validQuestions.length > 0) {
          setQuestions(validQuestions);
          console.log(`✅ Successfully loaded ${validQuestions.length} valid questions from contract IPFS`);
        } else {
          console.error('❌ No valid questions found in IPFS data');
          setQuestions([]);
        }
      } else {
        console.error('❌ Failed to load questions from all IPFS gateways');
        console.error('Last error:', lastError);
        // Don't set any fallback questions - let the user know there's an issue
        setQuestions([]);
      }
    } catch (error) {
      console.error('❌ Critical error loading questions from contract IPFS:', error);
      // Don't use fallback - show error state instead
      setQuestions([]);
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Handle warrior selection
  const handleWarriorSelect = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    
    // Reset states when selecting new warrior
    setIsApproved(false);
    setHasEnteredGurukul(false);
    setAssignedQuestionIds([]);
    setUserAnswers({});
    setTrainingCompleted(false);
    setAiResponse(null);
    setTraitChanges(null);
    setBeforeTraits(null);
  };

  // Handle NFT approval for Gurukul
  const handleApproveNFT = async () => {
    if (!selectedTokenId || !yodhaNFTContract || !gurukulContract) return;
    
    setIsApproving(true);
    try {
      writeYodhaNFT({
        address: yodhaNFTContract as `0x${string}`,
        abi: yodhaNFTAbi,
        functionName: 'approve',
        args: [gurukulContract, BigInt(selectedTokenId)],
      });
    } catch (error) {
      console.error('Failed to approve NFT:', error);
      setIsApproving(false);
    }
  };

  // Handle entering Gurukul
  const handleEnterGurukul = async () => {
    if (!selectedTokenId || !gurukulContract) return;
    
    try {
      writeGurukul({
        address: gurukulContract as `0x${string}`,
        abi: GurukulAbi,
        functionName: 'enterGurukul',
        args: [BigInt(selectedTokenId)],
      });
    } catch (error) {
      console.error('Failed to enter Gurukul:', error);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (tokenId: number, questionId: number, optionId: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [tokenId]: [
        ...(prev[tokenId] || []).filter(answer => answer.questionId !== questionId),
        { questionId, selectedOptionId: optionId }
      ]
    }));
  };

  // Check if all questions are answered
  const areAllQuestionsAnswered = () => {
    if (!selectedTokenId || assignedQuestionIds.length === 0) return false;
    const answers = userAnswers[selectedTokenId] || [];
    return assignedQuestionIds.every(qId => answers.some(answer => answer.questionId === qId));
  };

  // Handle answer submission - Contract-driven flow only
  const handleSubmitAnswers = async () => {
    if (!selectedTokenId || !gurukulContract) {
      console.error('Missing required data for training submission');
      return;
    }

    // Validate contract state before submission
    if (!assignedQuestionIds || assignedQuestionIds.length === 0) {
      console.error('No questions assigned by contract - cannot submit');
      setAiResponse('❌ No questions assigned by contract. Please enter Gurukul first.');
      return;
    }

    if (!questions || questions.length === 0) {
      console.error('Questions not loaded from contract IPFS - cannot submit');
      setAiResponse('❌ Questions not loaded from contract IPFS. Please wait for questions to load.');
      return;
    }

    if (!currentTraits) {
      console.error('Current traits not loaded from contract - cannot submit');
      setAiResponse('❌ Current traits not loaded from contract. Please ensure your NFT data is loaded.');
      return;
    }

    if (!areAllQuestionsAnswered()) {
      console.error('Not all contract-assigned questions answered');
      setAiResponse('❌ Please answer all contract-assigned questions before submitting.');
      return;
    }

    setIsSubmitting(true);
    setAiResponse('🔄 Submitting answers to contract and preparing AI analysis...');

    try {
      // Store current traits before training
      if (currentTraits) {
        setBeforeTraits(currentTraits);
      }
      
      // Submit answers to smart contract first
      const answers = userAnswers[selectedTokenId] || [];
      const selectedOptions = assignedQuestionIds.map(qId => {
        const answer = answers.find(a => a.questionId === qId);
        return answer ? answer.selectedOptionId : 0;
      });

      console.log('📝 Submitting answers to contract for token:', selectedTokenId);
      console.log('📋 Selected options:', selectedOptions);
      
      writeGurukul({
        address: gurukulContract as `0x${string}`,
        abi: GurukulAbi,
        functionName: 'answerAllotedQuestions',
        args: [BigInt(selectedTokenId), selectedOptions.map(opt => BigInt(opt))],
      });
      
      // Send to AI for analysis after contract submission
      await sendAnswersToAI();
      
    } catch (error) {
      console.error('❌ Training submission failed:', error);
      setAiResponse(`❌ Training submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsSubmitting(false);
    }
  };

  // Send answers to AI for analysis - Contract-driven analysis only
  const sendAnswersToAI = async () => {
    if (!selectedTokenId || !isNearConnected) {
      throw new Error('NEAR wallet not connected');
    }

    // Validate that we have contract-assigned questions
    if (!assignedQuestionIds || assignedQuestionIds.length === 0) {
      throw new Error('No questions assigned by contract - please enter Gurukul first');
    }

    // Validate that we have questions loaded from contract IPFS
    if (!questions || questions.length === 0) {
      throw new Error('Questions not loaded from contract IPFS - cannot proceed');
    }

    // Validate that we have current traits from contract
    if (!currentTraits) {
      throw new Error('Current traits not loaded from contract - cannot proceed');
    }

    try {
      const answers = userAnswers[selectedTokenId] || [];
      
      // Build moral choices with full question and answer data - only from contract-assigned questions
      const moralChoices = assignedQuestionIds.map(questionId => {
        const question = questions.find(q => q.id === questionId);
        const answer = answers.find(a => a.questionId === questionId);
        
        if (!question || !answer) return null;
        
        const selectedOption = question.options.find(opt => opt.id === answer.selectedOptionId);
        
        return {
          questionId: questionId,
          question: question.question,
          selectedAnswer: selectedOption?.text || '',
          optionId: answer.selectedOptionId
        };
      }).filter((choice): choice is NonNullable<typeof choice> => choice !== null && choice !== undefined);

      // Ensure we have all required questions answered
      if (moralChoices.length !== assignedQuestionIds.length) {
        throw new Error('Not all contract-assigned questions have been answered');
      }

      console.log('🎯 Preparing Gurukul psychological analysis with contract data...');

      // Ensure NEAR wallet is connected before making AI call
      if (!nearWalletService.isConnected()) {
        console.log("Connecting to NEAR wallet...");
        await connectNearWallet();
      }

      // Get NEAR wallet auth data
      const auth = await nearWalletService.login();
      
      // Create a serializable version of auth for sending to API
      const authForApi = {
        signature: auth.signature,
        accountId: auth.accountId,
        publicKey: auth.publicKey,
        message: auth.message,
        nonce: auth.nonce.toString('base64'), // Convert Buffer to base64 string
        recipient: auth.recipient,
        callbackUrl: auth.callbackUrl
      };
      
      // Prepare request payload - using only contract-sourced data
      const requestPayload = {
        auth: authForApi,
        tokenId: selectedTokenId,
        currentTraits: currentTraits, // Only contract-sourced traits
        answers: moralChoices // Only contract-assigned questions and answers
      };

      console.log('📝 Sending request to Gurukul analysis API with contract data...');
      
      // Call our Gurukul analysis API - this MUST return AI-generated trait values
      const response = await fetch('/api/gurukul-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`AI Analysis API call failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ AI Gurukul analysis successful:', result);
        
        // Store the before traits for comparison
        setBeforeTraits(currentTraits);
        
        // Set trait changes from AI analysis
        setTraitChanges(result.traitChanges);
        
        // Update current traits with AI-generated values
        setCurrentTraits(result.newTraits);
        
        // Set AI response with analysis
        const aiMessage = `✅ Gurukul Master has analyzed your moral choices!\n\n${result.analysis}\n\nSource: ${result.source === 'near-ai' ? 'NEAR AI Personality Updater' : 'Advanced Local Analysis'}\nAuthenticated via: ${nearAccountId}`;
        setAiResponse(aiMessage);
        
        // Now call the contract to update traits with AI-generated values
        await updateTraitsOnContract(result.newTraits);
        
        // Note: setTrainingCompleted(true) is now handled in the contract success useEffect
      } else {
        throw new Error('AI Analysis failed - no success response from API');
      }
      
    } catch (error) {
      console.error('❌ Gurukul analysis failed:', error);
      
      // NO FALLBACK - We require AI analysis for trait updates
      setAiResponse(`❌ Gurukul training failed: ${error instanceof Error ? error.message : 'Unknown error'}\n\nOnly AI-generated trait values are accepted. Please try again when the AI service is available.`);
      
      setTrainingCompleted(false);
      setIsSubmitting(false);
      
      // Re-throw to prevent any fallback processing
      throw error;
    }
  };

  // Handle approval success
  useEffect(() => {
    if (isApprovalSuccess) {
      setIsApproving(false);
      refetchApproval();
    }
  }, [isApprovalSuccess, refetchApproval]);

  // Handle Gurukul entry success
  useEffect(() => {
    if (isGurukulSuccess) {
      refetchAssignedQuestions();
      refetchTraits();
    }
  }, [isGurukulSuccess, refetchAssignedQuestions, refetchTraits]);

  // Format trait value with color
  const formatTraitValue = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  // Yodha Card Component
  const YodhaCard = ({ yodha, onClick, isSelected }: { yodha: UserYodha; onClick: () => void; isSelected: boolean }) => (
    <div 
      className={`arcade-card p-4 cursor-pointer transform hover:scale-105 transition-all duration-300 ${
        isSelected ? 'ring-2 ring-orange-500' : ''
      }`}
      onClick={onClick}
      style={{
        background: isSelected 
          ? 'radial-gradient(circle at top left, rgba(255, 140, 0, 0.2), rgba(255, 140, 0, 0.1) 50%), linear-gradient(135deg, rgba(255, 140, 0, 0.3) 0%, rgba(255, 140, 0, 0.2) 30%, rgba(255, 140, 0, 0.3) 100%)'
          : 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
        border: `2px solid ${isSelected ? '#ff8c00' : '#4a90e2'}`,
        borderRadius: '16px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: isSelected 
          ? '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.4)'
          : '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(74, 144, 226, 0.3)'
      }}
    >
      <div className="mb-3 text-center">
        <h3 
          className="text-sm font-bold text-white"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          {yodha.name}
        </h3>
        <p 
          className="text-xs text-gray-300"
          style={{fontFamily: 'Press Start 2P, monospace'}}
        >
          #{yodha.tokenId}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-red-400">STR:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.strength)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-400">WIT:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.wit)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-400">CHA:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.charisma)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-400">DEF:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.defence)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-yellow-400">LUK:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.luck)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Gurukul.png"
          alt="Gurukul Background"
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
            GURUKUL
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
              ANCIENT ACADEMY OF WARRIOR WISDOM
            </p>
          </div>
        </div>

        {!hasEnteredGurukul ? (
          // Entry Section
          <div className="max-w-6xl mx-auto">            
            {/* Warrior Selection Section */}
            {userYodhas.length > 0 && (
              <div className="mb-8">
                <div 
                  className="arcade-card p-6"
                  style={{
                    background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                    border: '3px solid #ff8c00',
                    borderRadius: '24px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                  }}
                >
                  <h2 
                    className="text-2xl text-orange-400 text-center mb-6 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    SELECT YOUR WARRIOR
                  </h2>
                  
                  {isLoadingNFTs ? (
                    <div className="text-center py-8">
                      <p 
                        className="text-gray-300 text-sm"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        LOADING WARRIORS... PLEASE WAIT.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {userYodhas.map((yodha) => (
                        <YodhaCard 
                          key={yodha.tokenId}
                          yodha={yodha} 
                          onClick={() => handleWarriorSelect(yodha.tokenId)} 
                          isSelected={selectedTokenId === yodha.tokenId} 
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Prepare for Training Card */}
              <div 
                className="arcade-card p-8 text-center"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                }}
              >
                <div className="mb-8">
                  <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                    <span className="text-3xl">🏛️</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    PREPARE FOR TRAINING
                  </h2>
                  
                  {/* Blockchain Wallet Status */}
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-400" style={{fontFamily: 'Press Start 2P, monospace'}}>BLOCKCHAIN WALLET</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isWagmiConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className={`text-xs ${isWagmiConnected ? 'text-green-400' : 'text-red-400'}`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                          {isWagmiConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                      </div>
                    </div>
                    {address && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-300" style={{fontFamily: 'Press Start 2P, monospace'}}>
                          {`${address.slice(0, 6)}...${address.slice(-4)}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* NFT Status */}
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-400" style={{fontFamily: 'Press Start 2P, monospace'}}>YODHA NFTs</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${userYodhas.length > 0 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span className={`text-xs ${userYodhas.length > 0 ? 'text-green-400' : 'text-red-400'}`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                          {userYodhas.length > 0 ? `${userYodhas.length} FOUND` : 'NONE FOUND'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {userTokenIds && Array.isArray(userTokenIds) && userTokenIds.length > 0 && userYodhas.length === 0 ? (
                  <div className="space-y-6">
                    <div className="bg-orange-900/20 border border-orange-400 rounded-lg p-4 mb-4">
                      <p 
                        className="text-orange-400 text-xs leading-relaxed mb-2"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        ⚠️ NO ACTIVATED YODHAS FOUND
                      </p>
                      <p 
                        className="text-gray-300 text-xs leading-relaxed"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        Your Yodha NFTs need to be activated (have traits assigned) to enter the Gurukul.
                        Please visit Chaavani to activate your NFTs first.
                      </p>
                    </div>
                    <Link
                      href="/chaavani"
                      className="inline-block arcade-button px-8 py-4 text-xs tracking-wide"
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      ACTIVATE YODHAS
                    </Link>
                  </div>
                ) : userYodhas.length === 0 ? (
                  <div className="space-y-6">
                    <p 
                      className="text-gray-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      YOU NEED TO OWN A YODHA NFT TO ENTER THE GURUKUL
                    </p>
                    <Link
                      href="/"
                      className="inline-block arcade-button px-8 py-4 text-xs tracking-wide"
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      GET YODHA NFT
                    </Link>
                  </div>
                ) : !selectedTokenId ? (
                  <div className="space-y-6">
                    <p 
                      className="text-gray-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      SELECT A WARRIOR FROM ABOVE
                    </p>
                  </div>
                ) : !isApproved ? (
                  <div className="space-y-6">
                    <p 
                      className="text-gray-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      APPROVE YOUR NFT FOR GURUKUL TRAINING
                    </p>
                    <button
                      onClick={handleApproveNFT}
                      disabled={isApproving}
                      className={`arcade-button px-8 py-4 text-xs tracking-wide ${
                        isApproving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      {isApproving ? 'APPROVING...' : 'APPROVE NFT'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p 
                      className="text-gray-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      YOUR NFT IS APPROVED. READY TO ENTER GURUKUL
                    </p>
                    <button
                      onClick={handleEnterGurukul}
                      className="arcade-button px-8 py-4 text-xs tracking-wide"
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      ENTER GURUKUL
                    </button>
                  </div>
                )}
              </div>

              {/* NEAR AI Wallet Connection Card */}
              <div 
                className="arcade-card p-8 text-center"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                }}
              >
                <div className="mb-8">
                  <div className="weapon-container w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6">
                    <span className="text-3xl">🧠</span>
                  </div>
                  <h2 
                    className="text-2xl text-orange-400 mb-4 tracking-wider arcade-glow"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    AI ASSISTANCE
                  </h2>
                  
                  {/* Dual Wallet Info */}
                  <div className="bg-blue-900 border border-blue-600 rounded-lg p-3 mb-4">
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
                  <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-between">
                      <span 
                        className="text-xs text-yellow-400"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        NEAR AI WALLET
                      </span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isNearConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                        <span 
                          className={`text-xs ${isNearConnected ? 'text-green-400' : 'text-red-400'}`}
                          style={{fontFamily: 'Press Start 2P, monospace'}}
                        >
                          {isNearConnected ? 'CONNECTED' : 'DISCONNECTED'}
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
                  </div>
                </div>

                {!isNearConnected ? (
                  <div className="space-y-6">
                    <p 
                      className="text-gray-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      CONNECT NEAR WALLET FOR AI-POWERED TRAIT ANALYSIS
                    </p>
                    <div className="mb-2">
                      <span 
                        className="text-xs text-blue-300"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        SEPARATE FROM FLOW WALLET
                      </span>
                    </div>
                    <button
                      onClick={connectNearWallet}
                      className="arcade-button px-8 py-4 text-xs tracking-wide"
                      style={{
                        fontFamily: 'Press Start 2P, monospace',
                        borderRadius: '12px'
                      }}
                    >
                      CONNECT NEAR WALLET
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p 
                      className="text-green-300 text-xs leading-relaxed"
                      style={{fontFamily: 'Press Start 2P, monospace'}}
                    >
                      NEAR AI READY FOR MORAL ANALYSIS
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span 
                        className="text-xs text-green-400"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        AI ASSISTANCE ENABLED
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : !trainingCompleted ? (
          // Training Questions Section
          <div className="max-w-4xl mx-auto">
            <div 
              className="arcade-card p-8"
                style={{
                  background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                  border: '3px solid #ff8c00',
                  borderRadius: '24px',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
                }}
              >
              <h2 
                className="text-2xl text-orange-400 text-center mb-8 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                TRAINING QUESTIONS
              </h2>

              {assignedQuestionIds.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-sm" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    NO QUESTIONS ASSIGNED YET. PLEASE ENTER THE GURUKUL FIRST.
                  </p>
                  </div>
              ) : isLoadingQuestions ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-sm" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    LOADING QUESTIONS FROM IPFS... PLEASE WAIT.
                  </p>
                </div>
              ) : questions.length === 0 ? (
                <div className="text-center py-8">
                  <div className="bg-red-900/20 border border-red-400 rounded-lg p-4 mb-4">
                    <p className="text-red-400 text-sm mb-2" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      ⚠️ QUESTIONS UNAVAILABLE
                    </p>
                    <p className="text-gray-300 text-xs leading-relaxed" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      Unable to load questions from IPFS. The Gurukul master&apos;s teachings are currently inaccessible.
                      Please check your connection and try again later.
                    </p>
                  </div>
                </div>
              ) : assignedQuestionIds.length < 5 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-sm" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    PREPARING 5 TRAINING QUESTIONS... ASSIGNED: {assignedQuestionIds.length}/5
                  </p>
                </div>
              ) : questions.filter(q => assignedQuestionIds.includes(q.id)).length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-sm" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    NO MATCHING QUESTIONS FOUND. ASSIGNED IDS: [{assignedQuestionIds.join(', ')}]
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {questions
                    .filter(q => {
                      // Ensure both values are numbers for comparison
                      const questionId = Number(q.id);
                      return assignedQuestionIds.some(aid => Number(aid) === questionId);
                    })
                    // Remove any potential duplicates that might slip through
                    .filter((question, index, array) => {
                      return array.findIndex(q => q.id === question.id) === index;
                    })
                    .map((question, index) => (
                      <div key={`question-${question.id}-${index}`} className="border-b border-gray-600 pb-6 last:border-b-0">
                        <div className="mb-4">
                          <h4 
                            className="text-sm text-orange-400 mb-4 leading-relaxed"
                            style={{fontFamily: 'Press Start 2P, monospace'}}
                          >
                            {index + 1}. {question.question}
                          </h4>
                        </div>
                      
                      <div className="grid grid-cols-1 gap-3">
                        {question.options.map((option) => (
                          <label 
                            key={`option-${question.id}-${option.id}`}
                            className={`cursor-pointer p-3 border-2 transition-all duration-300 rounded-lg ${
                                selectedTokenId && userAnswers[selectedTokenId]?.find(qa => qa.questionId === question.id)?.selectedOptionId === option.id
                                ? 'border-orange-400 bg-orange-900/20'
                                : 'border-gray-600 hover:border-orange-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`question-${question.id}`}
                              value={option.id}
                                checked={selectedTokenId ? userAnswers[selectedTokenId]?.find(qa => qa.questionId === question.id)?.selectedOptionId === option.id : false}
                                onChange={() => selectedTokenId && handleAnswerSelect(selectedTokenId, question.id, option.id)}
                              className="sr-only"
                            />
                            <span 
                              className={`text-xs leading-relaxed ${
                                  selectedTokenId && userAnswers[selectedTokenId]?.find(qa => qa.questionId === question.id)?.selectedOptionId === option.id ? 'text-orange-300' : 'text-gray-300'
                              }`}
                              style={{fontFamily: 'Press Start 2P, monospace'}}
                            >
                                {String.fromCharCode(65 + option.id)}. {option.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress indicator */}
              <div className="mt-6 bg-gray-800 border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-yellow-400" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    TRAINING PROGRESS (5 QUESTIONS REQUIRED)
                  </span>
                  <span className="text-xs text-yellow-400" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    {selectedTokenId ? (userAnswers[selectedTokenId]?.length || 0) : 0} / 5
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-400 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: selectedTokenId 
                        ? `${((userAnswers[selectedTokenId]?.length || 0) / 5) * 100}%`
                        : '0%'
                    }}
                  ></div>
                </div>
                {assignedQuestionIds.length !== 5 && (
                  <div className="mt-2">
                    <span className="text-xs text-red-400" style={{fontFamily: 'Press Start 2P, monospace'}}>
                      WARNING: Only {assignedQuestionIds.length} questions available. Need 5 total.
                    </span>
                  </div>
                )}
              </div>

              {areAllQuestionsAnswered() && (
                <div className="text-center mt-8">
                  <button
                    onClick={handleSubmitAnswers}
                    disabled={isSubmitting}
                    className={`arcade-button px-8 py-4 text-xs tracking-wide ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    style={{fontFamily: 'Press Start 2P, monospace', borderRadius: '12px'}}
                  >
                    {isSubmitting ? 'SUBMITTING...' : 'COMPLETE TRAINING'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Training Completed Section
          <div className="max-w-4xl mx-auto">
            <div 
              className="arcade-card p-8 text-center"
              style={{
                background: 'radial-gradient(circle at top left, rgba(120, 160, 200, 0.15), rgba(100, 140, 180, 0.1) 50%), linear-gradient(135deg, rgba(120, 160, 200, 0.2) 0%, rgba(100, 140, 180, 0.15) 30%, rgba(120, 160, 200, 0.2) 100%)',
                border: '3px solid #ff8c00',
                borderRadius: '24px',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 0 8px rgba(255, 140, 0, 0.3)'
              }}
            >
                <h2 
                className="text-3xl text-orange-400 mb-6 tracking-wider arcade-glow"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                TRAINING COMPLETE! 🎉
                </h2>
              
                <p 
                className="text-gray-300 text-sm mb-6 leading-relaxed"
                  style={{fontFamily: 'Press Start 2P, monospace'}}
                >
                YOUR WARRIOR HAS COMPLETED THIS TRAINING SESSION
                </p>

              {/* Current Traits Before Training */}
              {beforeTraits && (
                <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <h3 
                    className="text-lg text-yellow-400 text-center mb-4 tracking-wider"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    BEFORE TRAITS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-red-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        STRENGTH
                  </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(beforeTraits.strength)}
                </div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        WIT
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(beforeTraits.wit)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        CHARISMA
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(beforeTraits.charisma)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        DEFENCE
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(beforeTraits.defence)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        LUCK
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(beforeTraits.luck)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Traits After Training */}
              {currentTraits && (
                <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <h3 
                    className="text-lg text-yellow-400 text-center mb-4 tracking-wider"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    UPDATED TRAITS
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="text-center">
                      <div className="text-red-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        STRENGTH
                    </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(currentTraits.strength)}                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.strength > 0 ? 'text-green-400' : traitChanges.strength < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.strength > 0 ? '+' : ''}{formatTraitValue(traitChanges.strength)})
                          </span>
                        )}
                </div>
              </div>
                    <div className="text-center">
                      <div className="text-blue-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        WIT
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(currentTraits.wit)}
                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.wit > 0 ? 'text-green-400' : traitChanges.wit < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.wit > 0 ? '+' : ''}{formatTraitValue(traitChanges.wit)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-purple-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        CHARISMA
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(currentTraits.charisma)}
                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.charisma > 0 ? 'text-green-400' : traitChanges.charisma < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.charisma > 0 ? '+' : ''}{formatTraitValue(traitChanges.charisma)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-green-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        DEFENCE
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(currentTraits.defence)}
                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.defence > 0 ? 'text-green-400' : traitChanges.defence < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.defence > 0 ? '+' : ''}{formatTraitValue(traitChanges.defence)})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        LUCK
                      </div>
                      <div className="text-white text-lg" style={{fontFamily: 'Press Start 2P, monospace'}}>
                        {formatTraitValue(currentTraits.luck)}
                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.luck > 0 ? 'text-green-400' : traitChanges.luck < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.luck > 0 ? '+' : ''}{formatTraitValue(traitChanges.luck)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {aiResponse && (
                <div className="mb-6 p-4 bg-gray-800 border border-gray-600 rounded-lg">
                  <h3 
                    className="text-lg text-yellow-400 text-center mb-4 tracking-wider"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    🤖 AI WISDOM MASTER ANALYSIS
                  </h3>
                  <div className="text-xs text-gray-300 leading-relaxed mb-4 text-center">
                    <p style={{fontFamily: 'Press Start 2P, monospace', lineHeight: '1.6'}}>
                      THE GURUKUL MASTER HAS ANALYZED YOUR MORAL CHOICES AND SHAPED YOUR WARRIOR DESTINY. YOUR DECISIONS HAVE FORGED NEW PATHS IN STRENGTH, WISDOM, AND CHARACTER. EACH CHOICE ECHOES THROUGH TIME, TRANSFORMING YOUR WARRIOR ESSENCE.
                    </p>
                  </div>
                  
                  {traitChanges && (
                    <div className="mt-4 p-4 bg-gray-700 border border-gray-500 rounded-lg">
                      <h4 
                        className="text-lg text-yellow-400 text-center mb-4 tracking-wider"
                        style={{fontFamily: 'Press Start 2P, monospace'}}
                      >
                        🔮 TRAIT MODIFICATIONS
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-red-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                            STRENGTH
                          </div>
                          <div className={`text-lg ${
                            traitChanges.strength > 0 ? 'text-green-400' : 
                            traitChanges.strength < 0 ? 'text-red-400' : 'text-gray-400'
                          }`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                            {traitChanges.strength > 0 ? '+' : ''}{formatTraitValue(traitChanges.strength)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-blue-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                            WIT
                          </div>
                          <div className={`text-lg ${
                            traitChanges.wit > 0 ? 'text-green-400' : 
                            traitChanges.wit < 0 ? 'text-red-400' : 'text-gray-400'
                          }`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                            {traitChanges.wit > 0 ? '+' : ''}{formatTraitValue(traitChanges.wit)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-purple-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                            CHARISMA
                          </div>
                          <div className={`text-lg ${
                            traitChanges.charisma > 0 ? 'text-green-400' : 
                            traitChanges.charisma < 0 ? 'text-red-400' : 'text-gray-400'
                          }`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                            {traitChanges.charisma > 0 ? '+' : ''}{formatTraitValue(traitChanges.charisma)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-green-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                            DEFENCE
                          </div>
                          <div className={`text-lg ${
                            traitChanges.defence > 0 ? 'text-green-400' : 
                            traitChanges.defence < 0 ? 'text-red-400' : 'text-gray-400'
                          }`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                            {traitChanges.defence > 0 ? '+' : ''}{formatTraitValue(traitChanges.defence)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-yellow-400 text-xs mb-1" style={{fontFamily: 'Press Start 2P, monospace'}}>
                            LUCK
                          </div>
                          <div className={`text-lg ${
                            traitChanges.luck > 0 ? 'text-green-400' : 
                            traitChanges.luck < 0 ? 'text-red-400' : 'text-gray-400'
                          }`} style={{fontFamily: 'Press Start 2P, monospace'}}>
                            {traitChanges.luck > 0 ? '+' : ''}{formatTraitValue(traitChanges.luck)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className="space-y-4">
                <button
                  onClick={() => {
                    setTrainingCompleted(false);
                    setUserAnswers({});
                    setAiResponse(null);
                    refetchAssignedQuestions();
                  }}
                  className="arcade-button px-8 py-4 text-xs tracking-wide mr-4"
                  style={{
                    fontFamily: 'Press Start 2P, monospace',
                    borderRadius: '12px'
                  }}
                >
                  TRAIN AGAIN
                </button>
                
                <Link href="/">
                  <button 
                    className="arcade-button py-3 px-8 text-sm"
                    style={{
                      fontFamily: 'Press Start 2P, monospace',
                      borderRadius: '12px'
                    }}
                  >
                    RETURN TO HOME
                  </button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Back to Home (only if not in training) */}
        {!hasEnteredGurukul && (
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
        )}
      </div>
    </div>
  );
}