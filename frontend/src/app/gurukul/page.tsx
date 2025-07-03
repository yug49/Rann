"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import Link from 'next/link';
import { nearWalletService } from '../../services/nearWallet';
import { nearAIService } from '../../services/nearAI';
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
  tokenId: number;
  name: string;
  traits: YodhaTraits;
  image: string;
  totalWinnings: number;
  rank: string;
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
  const [selectedYodha, setSelectedYodha] = useState<UserYodha | null>(null);
  
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
  const [ipfsCid, setIpfsCid] = useState<string | null>(null);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Contract interaction state
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isContractLoading, isSuccess: isContractSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  // Function to update traits on the contract
  const updateTraitsOnContract = async (traits: YodhaTraits) => {
    if (!selectedTokenId) {
      console.error('No token ID selected');
      return;
    }

    try {
      console.log('🔐 Signing traits for contract update...');
      
      // Convert traits to contract format (multiply by 100)
      const contractTraits = {
        strength: Math.floor(traits.strength * 100),
        wit: Math.floor(traits.wit * 100),
        charisma: Math.floor(traits.charisma * 100),
        defence: Math.floor(traits.defence * 100),
        luck: Math.floor(traits.luck * 100)
      };
      
      console.log('📊 Contract traits (x100):', contractTraits);
      
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
        throw new Error(`Failed to sign traits: ${signResponse.statusText}`);
      }

      const { signature } = await signResponse.json();
      
      console.log('✅ Traits signed successfully');
      console.log('📝 Signature:', signature);
      
      // Get current chain ID from wagmi
      const currentChainId = chainId || 31337; // Use wagmi's chainId or default to localhost
      const contractAddress = chainsToTSender[currentChainId as keyof typeof chainsToTSender]?.Gurukul;
      
      if (!contractAddress) {
        throw new Error(`Contract address not found for chain ID: ${currentChainId}`);
      }
      
      console.log('📋 Calling updateTraits on contract:', contractAddress);
      
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
      
    } catch (error) {
      console.error('❌ Contract update failed:', error);
      setAiResponse(prev => `${prev}\n\n⚠️ Contract update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Monitor contract transaction status
  useEffect(() => {
    if (isContractSuccess) {
      console.log('✅ Contract traits updated successfully!');
      setAiResponse(prev => `${prev}\n\n🎉 Traits successfully updated on blockchain!`);
      setTrainingCompleted(true);
    }
  }, [isContractSuccess]);

  useEffect(() => {
    if (isContractLoading) {
      console.log('⏳ Contract transaction pending...');
      setAiResponse(prev => `${prev}\n\n⏳ Updating traits on blockchain...`);
    }
  }, [isContractLoading]);
  
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

  // Get current traits for selected NFT
  const { data: traitsData, refetch: refetchTraits } = useReadContract({
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

  // Process user's NFTs
  useEffect(() => {
    if (userTokenIds && Array.isArray(userTokenIds) && userTokenIds.length > 0) {
      const tokenIds = userTokenIds.map(id => Number(id));
      
      // Set first token as selected if none selected
      if (!selectedTokenId && tokenIds.length > 0) {
        setSelectedTokenId(tokenIds[0]);
      }
      
      const yodhaObjects: UserYodha[] = tokenIds.map(id => ({
        tokenId: Number(id),
        name: `Yodha #${id}`,
        image: "/lazered.png",
        traits: { strength: 0, wit: 0, charisma: 0, defence: 0, luck: 0 },
        totalWinnings: 0,
        rank: 'unranked'
      }));
      
      setUserYodhas(yodhaObjects);
    }
  }, [userTokenIds, selectedTokenId]);

  // Process traits data
  useEffect(() => {
    if (traitsData && selectedTokenId) {
      const traits = traitsData as { strength: bigint; wit: bigint; charisma: bigint; defence: bigint; luck: bigint };
      const processedTraits = {
        strength: Number(traits.strength) / 100,
        wit: Number(traits.wit) / 100,
        charisma: Number(traits.charisma) / 100,
        defence: Number(traits.defence) / 100,
        luck: Number(traits.luck) / 100
      };
      setCurrentTraits(processedTraits);
      
      // Update selected yodha traits
      if (selectedYodha) {
        setSelectedYodha({
          ...selectedYodha,
          traits: processedTraits
        });
      }

      // Update the traits in userYodhas array
      setUserYodhas(prevYodhas => 
        prevYodhas.map(yodha => 
          yodha.tokenId === selectedTokenId 
            ? { ...yodha, traits: processedTraits }
            : yodha
        )
      );
    } else {
      setCurrentTraits(null);
    }
  }, [traitsData, selectedTokenId, selectedYodha]);

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
      setIpfsCid(ipfsCidData);
      loadQuestionsFromIPFS(ipfsCidData);
    }
  }, [ipfsCidData]);

  // Load local questions on mount as fallback
  useEffect(() => {
    // Only load local questions if we don't have any questions and aren't already loading
    if (questions.length === 0 && !isLoadingQuestions && !ipfsCid) {
      loadLocalQuestions();
    }
  }, [questions.length, isLoadingQuestions, ipfsCid]);

  // Load questions from IPFS
  const loadQuestionsFromIPFS = async (cid: string) => {
    setIsLoadingQuestions(true);
    try {
      console.log('Loading questions from IPFS CID:', cid);
      // For now, use fetch directly since ipfsService.getFromIPFS might not exist
      const response = await fetch(`https://ipfs.io/ipfs/${cid}`);
      const questionsData = await response.json();
      
      if (questionsData && questionsData.questions) {
        setQuestions(questionsData.questions);
        console.log('Questions loaded from IPFS:', questionsData.questions);
      } else {
        // Fallback to local questions if IPFS fails
        await loadLocalQuestions();
      }
    } catch (error) {
      console.error('Failed to load questions from IPFS:', error);
      // Fallback to local questions
      await loadLocalQuestions();
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Load local questions as fallback
  const loadLocalQuestions = async () => {
    try {
      const response = await fetch('/questions.json');
      const data = await response.json();
      setQuestions(data.questions || []);
      console.log('Local questions loaded:', data.questions);
    } catch (error) {
      console.error('Failed to load local questions:', error);
    }
  };

  // Handle warrior selection
  const handleWarriorSelect = (tokenId: number) => {
    setSelectedTokenId(tokenId);
    const yodha = userYodhas.find(y => y.tokenId === tokenId);
    if (yodha) {
      setSelectedYodha(yodha);
    }
    
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

  // Handle answer submission
  const handleSubmitAnswers = async () => {
    if (!selectedTokenId || !areAllQuestionsAnswered()) return;
    
    setIsSubmitting(true);
    try {
      // Store current traits before training
      if (currentTraits) {
        setBeforeTraits(currentTraits);
      }
      
      // Submit answers to smart contract
      const answers = userAnswers[selectedTokenId] || [];
      const selectedOptions = assignedQuestionIds.map(qId => {
        const answer = answers.find(a => a.questionId === qId);
        return answer ? answer.selectedOptionId : 0;
      });
      
      writeGurukul({
        address: gurukulContract as `0x${string}`,
        abi: GurukulAbi,
        functionName: 'answerAllotedQuestions',
        args: [BigInt(selectedTokenId), selectedOptions.map(opt => BigInt(opt))],
      });
      
      // Send to AI for analysis
      await sendAnswersToAI();
      
    } catch (error) {
      console.error('Failed to submit answers:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send answers to AI for analysis
  const sendAnswersToAI = async () => {
    if (!selectedTokenId || !isNearConnected) {
      throw new Error('NEAR wallet not connected');
    }

    try {
      const answers = userAnswers[selectedTokenId] || [];
      
      // Build moral choices with full question and answer data
      const moralChoices = assignedQuestionIds.map(questionId => {
        const question = questions.find(q => q.id === questionId);
        const answer = answers.find(a => a.questionId === questionId);
        
        if (!question || !answer) return null;
        
        const selectedOption = question.options.find(opt => opt.id === answer.selectedOptionId);
        
        return {
          questionId: questionId,
          question: question.question,
          selectedAnswer: selectedOption?.text || '',
          optionId: answer.selectedOptionId,
          options: question.options.map(opt => ({
            id: opt.id,
            text: opt.text
          }))
        };
      }).filter((choice): choice is NonNullable<typeof choice> => choice !== null && choice !== undefined);

      console.log('🎯 Preparing NEAR AI trait update...');

      // Create JSON file with questions asked, options available and selected option
      const validMoralChoices = moralChoices.filter((choice): choice is NonNullable<typeof choice> => choice !== null && choice !== undefined);
      const questionsData = {
        tokenId: selectedTokenId.toString(),
        questionsAsked: validMoralChoices.map(choice => ({
          questionId: choice.questionId,
          questionText: choice.question,
          optionsAvailable: choice.options,
          selectedOption: {
            id: choice.optionId,
            text: choice.selectedAnswer
          }
        })),
        currentTraits: currentTraits || { strength: 50, wit: 50, charisma: 50, defence: 50, luck: 50 },
        instructions: "Analyze the moral choices and update the warrior traits based on psychological patterns. Return updated trait values between 25-75 in JSON format."
      };

      console.log('📝 Questions data for NEAR AI:', questionsData);

      // Ensure NEAR wallet is connected before making AI call
      if (!nearWalletService.isConnected()) {
        console.log("Connecting to NEAR wallet...");
        await connectNearWallet();
      }

      // Create the prompt with the questions data - using the exact same method as Chaavani
      const prompt = `Analyze these moral choices and update the warrior traits accordingly. Here is the data: ${JSON.stringify(questionsData, null, 2)}

Please analyze each moral choice and its psychological implications, then update the traits (strength, wit, charisma, defence, luck) based on the warrior's decisions.

Return the response in this exact JSON format:
{
  "traits": {
    "strength": [number 25-75],
    "wit": [number 25-75], 
    "charisma": [number 25-75],
    "defence": [number 25-75],
    "luck": [number 25-75]
  },
  "analysis": "Brief explanation of the trait changes based on moral choices"
}`;
      
      // Call NEAR AI service with the prompt - exactly like in Chaavani
      console.log("Sending prompt to NEAR AI personality updater:", prompt);
      const response = await nearAIService.generateCharacterAttributes(prompt);
      
      // Log the response to console as requested
      console.log("NEAR AI Personality Updater Response:", response);
      
      // Extract and parse the JSON from the AI response - same parsing logic as Chaavani
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
        
        if (parsedResponse.traits) {
          // Store the before traits for comparison
          setBeforeTraits(currentTraits);
          
          // Calculate trait changes
          if (currentTraits) {
            const changes = {
              strength: parsedResponse.traits.strength - currentTraits.strength,
              wit: parsedResponse.traits.wit - currentTraits.wit,
              charisma: parsedResponse.traits.charisma - currentTraits.charisma,
              defence: parsedResponse.traits.defence - currentTraits.defence,
              luck: parsedResponse.traits.luck - currentTraits.luck
            };
            setTraitChanges(changes);
          }
          
          // Update current traits
          setCurrentTraits(parsedResponse.traits);
          
          // Set AI response
          const aiMessage = `✅ NEAR AI successfully analyzed your moral choices!\n\nAnalysis: ${parsedResponse.analysis || 'Traits updated based on your decisions'}\nAuthenticated via: ${nearAccountId}`;
          setAiResponse(aiMessage);
          
          // Now call the contract to update traits
          await updateTraitsOnContract(parsedResponse.traits);
        } else {
          throw new Error('No traits found in NEAR AI response');
        }
        
      } catch (parseError) {
        console.warn("Could not parse JSON from NEAR AI response, using fallback:", parseError);
        
        // Fallback: generate local analysis as before
        console.log('🚀 NEAR AI parsing failed, using intelligent local analysis...');
        const validMoralChoices = moralChoices.filter((choice): choice is NonNullable<typeof choice> => Boolean(choice));
        const localTraits = generateIntelligentLocalAnalysis(validMoralChoices, currentTraits || { strength: 50, wit: 50, charisma: 50, defence: 50, luck: 50 });
        
        // Store the before traits for comparison
        setBeforeTraits(currentTraits);
        
        // Calculate trait changes
        if (currentTraits) {
          const changes = {
            strength: localTraits.strength - currentTraits.strength,
            wit: localTraits.wit - currentTraits.wit,
            charisma: localTraits.charisma - currentTraits.charisma,
            defence: localTraits.defence - currentTraits.defence,
            luck: localTraits.luck - currentTraits.luck
          };
          setTraitChanges(changes);
        }
        
        // Update current traits
        setCurrentTraits(localTraits);
        
        // Set AI response
        setAiResponse(`🧠 Local intelligent analysis completed (NEAR AI fallback)\n\nYour moral choices have been analyzed using advanced psychological patterns.\nAuthenticated via: ${nearAccountId}`);
        
        // Call contract with local traits
        await updateTraitsOnContract(localTraits);
      }
      
      setTrainingCompleted(true);
      
    } catch (error) {
      console.error('❌ AI analysis failed:', error);
      
      // Fallback to local analysis
      console.log('🚀 NEAR AI failed completely, using intelligent local analysis...');
      const localTraits = generateIntelligentLocalAnalysis(
        assignedQuestionIds.map(questionId => {
          const question = questions.find(q => q.id === questionId);
          const answer = (userAnswers[selectedTokenId] || []).find(a => a.questionId === questionId);
          const selectedOption = question?.options.find(opt => opt.id === answer?.selectedOptionId);
          
          return {
            questionId: questionId,
            question: question?.question || '',
            selectedAnswer: selectedOption?.text || '',
            optionId: answer?.selectedOptionId || 0
          };
        }).filter(choice => choice.question && choice.selectedAnswer),
        currentTraits || { strength: 50, wit: 50, charisma: 50, defence: 50, luck: 50 }
      );
      
      // Store the before traits for comparison
      setBeforeTraits(currentTraits);
      
      // Calculate trait changes
      if (currentTraits) {
        const changes = {
          strength: localTraits.strength - (currentTraits.strength || 50),
          wit: localTraits.wit - (currentTraits.wit || 50),
          charisma: localTraits.charisma - (currentTraits.charisma || 50),
          defence: localTraits.defence - (currentTraits.defence || 50),
          luck: localTraits.luck - (currentTraits.luck || 50)
        };
        setTraitChanges(changes);
      }
      
      // Update current traits
      setCurrentTraits(localTraits);
      
      // Set AI response with error info
      setAiResponse(`🔧 Local analysis completed (NEAR AI unavailable)\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}\nFallback analysis used advanced psychological patterns.`);
      
      // Try to call contract with local traits if available
      if (localTraits) {
        try {
          await updateTraitsOnContract(localTraits);
        } catch (contractError) {
          console.error('❌ Contract update failed:', contractError);
        }
      }
      
      setTrainingCompleted(true);
    }
  };

  // Local analysis function for fallback
  const generateIntelligentLocalAnalysis = (moralChoices: { questionId: number; question: string; selectedAnswer: string; optionId: number; }[], currentTraits: { strength: number; wit: number; charisma: number; defence: number; luck: number; }) => {
    console.log('🧠 Performing intelligent psychological analysis...');
    
    // Initialize metrics for psychological analysis
    const metrics = {
      justice: 0,
      courage: 0,
      wisdom: 0,
      compassion: 0,
      loyalty: 0,
      selfPreservation: 0,
      altruism: 0
    };
    
    // Analyze each moral choice
    moralChoices.forEach((choice) => {
      const questionText = choice.question.toLowerCase();
      const answerText = choice.selectedAnswer.toLowerCase();
      
      // Pattern matching for psychological traits
      if (questionText.includes('betrayal') || questionText.includes('loyalty')) {
        if (answerText.includes('loyal') || answerText.includes('trust')) {
          metrics.loyalty += 2;
          metrics.courage += 1;
        } else if (answerText.includes('betray') || answerText.includes('abandon')) {
          metrics.selfPreservation += 2;
          metrics.wisdom += 1;
        }
      }
      
      if (questionText.includes('help') || questionText.includes('sacrifice')) {
        if (answerText.includes('help') || answerText.includes('sacrifice')) {
          metrics.compassion += 2;
          metrics.altruism += 1;
        } else if (answerText.includes('yourself') || answerText.includes('own')) {
          metrics.selfPreservation += 2;
        }
      }
      
      if (questionText.includes('fight') || questionText.includes('battle')) {
        if (answerText.includes('fight') || answerText.includes('attack')) {
          metrics.courage += 2;
          metrics.justice += 1;
        } else if (answerText.includes('avoid') || answerText.includes('escape')) {
          metrics.wisdom += 2;
          metrics.selfPreservation += 1;
        }
      }
      
      if (questionText.includes('truth') || questionText.includes('lie')) {
        if (answerText.includes('truth') || answerText.includes('honest')) {
          metrics.justice += 2;
          metrics.courage += 1;
        } else if (answerText.includes('lie') || answerText.includes('deceive')) {
          metrics.wisdom += 1;
          metrics.selfPreservation += 1;
        }
      }
      
      // Add base wisdom for thoughtful choices
      metrics.wisdom += 1;
    });
    
    // Calculate trait modifications
    const strengthModifier = Math.floor((metrics.courage + metrics.justice) / 2) - 2;
    const witModifier = metrics.wisdom - 2;
    const charismaModifier = metrics.altruism + metrics.compassion - 2;
    const defenceModifier = metrics.loyalty + metrics.selfPreservation - 2;
    const luckModifier = Math.floor((metrics.courage + metrics.wisdom) / 3) - 1;
    
    // Apply modifications to current traits (with realistic ranges)
    const traitChanges = {
      strength: Math.min(75, Math.max(25, currentTraits.strength + strengthModifier)),
      wit: Math.min(75, Math.max(25, currentTraits.wit + witModifier)),
      charisma: Math.min(75, Math.max(25, currentTraits.charisma + charismaModifier)),
      defence: Math.min(75, Math.max(25, currentTraits.defence + defenceModifier)),
      luck: Math.min(75, Math.max(25, currentTraits.luck + luckModifier))
    };
    
    console.log(`🎯 Current traits: ${JSON.stringify(currentTraits)}`);
    console.log(`🔄 Trait modifiers: STR:${strengthModifier}, WIT:${witModifier}, CHA:${charismaModifier}, DEF:${defenceModifier}, LUK:${luckModifier}`);
    console.log(`🎯 Final traits: ${JSON.stringify(traitChanges)}`);
    console.log('✅ Local analysis successful!');
    
    return traitChanges;
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

  // Get trait improvement hint
  const getTraitImprovementHint = (questionId: number): string => {
    const hints = {
      0: "This choice may affect your Charisma and Strength",
      1: "This decision could influence your Wit and Charisma", 
      2: "Your response might impact your Strength and Defence",
      3: "This choice may enhance your Wit and Charisma",
      4: "Your decision could affect your Luck and Wit"
    };
    return hints[questionId as keyof typeof hints] || "This choice will shape your warrior's destiny";
  };

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
      <div className="flex items-center gap-3 mb-3">
        <Image
          src={yodha.image}
          alt={yodha.name}
          width={48}
          height={48}
          className="rounded-lg border-2 border-orange-600"
        />
        <div>
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
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-red-400">STR:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.strength / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-blue-400">WIT:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.wit / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-purple-400">CHA:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.charisma / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-400">DEF:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.defence / 100)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-yellow-400">LUK:</span>
          <span className="text-white">{formatTraitValue(yodha.traits.luck / 100)}</span>
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
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {userYodhas.map((yodha) => (
                      <div
                        key={yodha.tokenId}
                        onClick={() => handleWarriorSelect(yodha.tokenId)}
                        className={`cursor-pointer p-4 border-2 rounded-lg transition-all duration-300 ${
                          selectedTokenId === yodha.tokenId
                            ? 'border-orange-400 bg-orange-900/20'
                            : 'border-gray-600 hover:border-orange-600'
                        }`}
                      >
                        <YodhaCard yodha={yodha} onClick={() => handleWarriorSelect(yodha.tokenId)} isSelected={selectedTokenId === yodha.tokenId} />
                      </div>
                    ))}
                  </div>
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

                {userYodhas.length === 0 ? (
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
              ) : isLoadingQuestions || questions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300 text-sm" style={{fontFamily: 'Press Start 2P, monospace'}}>
                    LOADING QUESTIONS... PLEASE WAIT.
                  </p>
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
                            className="text-sm text-orange-400 mb-2 leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                            {index + 1}. {question.question}
                  </h4>
                          
                          {/* Trait Improvement Hint */}
                          <div className="bg-blue-900/20 border border-blue-400 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-blue-400 text-xs" style={{fontFamily: 'Press Start 2P, monospace'}}>
                                💡 TRAIT DEVELOPMENT
                              </span>
                            </div>
                            <p 
                              className="text-blue-200 text-xs leading-relaxed"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                              {getTraitImprovementHint(question.id)}
                            </p>
                </div>
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
                        {formatTraitValue(currentTraits.strength)}
                        {traitChanges && (
                          <span className={`text-xs ml-2 ${traitChanges.strength > 0 ? 'text-green-400' : traitChanges.strength < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                            ({traitChanges.strength > 0 ? '+' : ''}{traitChanges.strength})
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
                            ({traitChanges.wit > 0 ? '+' : ''}{traitChanges.wit})
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
                            ({traitChanges.charisma > 0 ? '+' : ''}{traitChanges.charisma})
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
                            ({traitChanges.defence > 0 ? '+' : ''}{traitChanges.defence})
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
                            ({traitChanges.luck > 0 ? '+' : ''}{traitChanges.luck})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {aiResponse && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
                  <h3 
                    className="text-lg text-purple-400 mb-4 text-center"
                    style={{fontFamily: 'Press Start 2P, monospace'}}
                  >
                    🤖 AI WISDOM MASTER ANALYSIS
                  </h3>
                  <div className="text-sm text-purple-200 leading-relaxed">
                    <p style={{fontFamily: 'Press Start 2P, monospace', fontSize: '10px', lineHeight: '1.6'}}>
                      {aiResponse}
                    </p>
                  </div>
                  
                  {traitChanges && (
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                      <h4 className="text-lg font-bold text-purple-800 mb-4">🔮 TRAIT MODIFICATIONS</h4>
                      <div className="grid grid-cols-5 gap-4">
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Strength</div>
                          <div className={`text-lg font-bold ${
                            traitChanges.strength > 0 ? 'text-green-600' : 
                            traitChanges.strength < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {traitChanges.strength > 0 ? '+' : ''}{formatTraitValue(traitChanges.strength)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Wit</div>
                          <div className={`text-lg font-bold ${
                            traitChanges.wit > 0 ? 'text-green-600' : 
                            traitChanges.wit < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {traitChanges.wit > 0 ? '+' : ''}{formatTraitValue(traitChanges.wit)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Charisma</div>
                          <div className={`text-lg font-bold ${
                            traitChanges.charisma > 0 ? 'text-green-600' : 
                            traitChanges.charisma < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {traitChanges.charisma > 0 ? '+' : ''}{formatTraitValue(traitChanges.charisma)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Defence</div>
                          <div className={`text-lg font-bold ${
                            traitChanges.defence > 0 ? 'text-green-600' : 
                            traitChanges.defence < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {traitChanges.defence > 0 ? '+' : ''}{formatTraitValue(traitChanges.defence)}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Luck</div>
                          <div className={`text-lg font-bold ${
                            traitChanges.luck > 0 ? 'text-green-600' : 
                            traitChanges.luck < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
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
