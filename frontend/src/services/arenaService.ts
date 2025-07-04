import { writeContract, readContract } from '@wagmi/core';
import { KurukshetraAbi, rannTokenAbi, chainsToTSender } from '../constants';
import rainbowKitConfig from '../rainbowKitConfig';
import { yodhaNFTService, type YodhaDetails } from './yodhaNFTService';

// Utility functions for 18-decimal precision conversion
const WEI_DECIMALS = 18;
const WEI_MULTIPLIER = BigInt(10 ** WEI_DECIMALS);

/**
 * Convert from contract value (wei) to human-readable format
 * @param weiValue - Value in wei (1e18 precision)
 * @returns Human-readable number
 */
const fromWei = (weiValue: bigint | number | string): number => {
  const bigintValue = typeof weiValue === 'bigint' ? weiValue : BigInt(weiValue.toString());
  return Number(bigintValue) / Number(WEI_MULTIPLIER);
};

/**
 * Convert from human-readable format to contract value (wei)
 * @param humanValue - Human-readable number
 * @returns BigInt value in wei (1e18 precision)
 */
const toWei = (humanValue: number | string): bigint => {
  const numValue = typeof humanValue === 'string' ? parseFloat(humanValue) : humanValue;
  return BigInt(Math.floor(numValue * Number(WEI_MULTIPLIER)));
};

// Utility functions for decimal conversion
// const formatFromWei = (value: bigint | number | string): string => {
//   const numberValue = fromWei(value);
//   return numberValue.toLocaleString('fullwide', { useGrouping: false });
// };

// const formatToWei = (value: number | string): string => {
//   const bigintValue = toWei(value);
//   return bigintValue.toString();
// };

export interface ArenaDetails {
  yodhaOneNFTId: number;
  yodhaTwoNFTId: number;
  yodhaOneDetails?: YodhaDetails;
  yodhaTwoDetails?: YodhaDetails;
  currentRound: number;
  isInitialized: boolean;
  isBattleOngoing: boolean;
  isBettingPeriod: boolean;
  gameInitializedAt: number;
  lastRoundEndedAt: number;
  minBettingPeriod: number;
  damageOnYodhaOne: number;
  damageOnYodhaTwo: number;
  betAmount: number;
  costToInfluence: number;
  costToDefluence: number;
  costToInfluenceYodhaOne: number;
  costToInfluenceYodhaTwo: number;
  costToDefluenceYodhaOne: number;
  costToDefluenceYodhaTwo: number;
  playerOneBetAddresses: string[];
  playerTwoBetAddresses: string[];
}

export const arenaService = {
  /**
   * Approve RANN tokens for an arena contract
   * @param arenaAddress - The arena contract address
   * @param amount - Amount to approve in wei
   */
  async approveRannTokens(arenaAddress: string, amount: bigint): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: chainsToTSender[545].rannToken as `0x${string}`,
        abi: rannTokenAbi,
        functionName: 'approve',
        args: [arenaAddress as `0x${string}`, amount],
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error approving RANN tokens:', error);
      throw error;
    }
  },

  /**
   * Check RANN token allowance for an arena contract
   * @param userAddress - User's wallet address
   * @param arenaAddress - The arena contract address
   */
  async getRannAllowance(userAddress: string, arenaAddress: string): Promise<bigint> {
    try {
      const allowance = await readContract(rainbowKitConfig, {
        address: chainsToTSender[545].rannToken as `0x${string}`,
        abi: rannTokenAbi,
        functionName: 'allowance',
        args: [userAddress as `0x${string}`, arenaAddress as `0x${string}`],
        chainId: 545,
      });

      return allowance as bigint;
    } catch (error) {
      console.error('Error checking RANN allowance:', error);
      throw error;
    }
  },

  /**
   * Check user's RANN token balance
   * @param userAddress - User's wallet address
   */
  async getRannBalance(userAddress: string): Promise<bigint> {
    try {
      const balance = await readContract(rainbowKitConfig, {
        address: chainsToTSender[545].rannToken as `0x${string}`,
        abi: rannTokenAbi,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`],
        chainId: 545,
      });

      return balance as bigint;
    } catch (error) {
      console.error('Error checking RANN balance:', error);
      throw error;
    }
  },

  /**
   * Initialize a game in a specific arena
   */
  async initializeGame(
    arenaAddress: string,
    yodhaOneNFTId: number,
    yodhaTwoNFTId: number
  ): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'initializeGame',
        args: [BigInt(yodhaOneNFTId), BigInt(yodhaTwoNFTId)],
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error initializing game:', error);
      throw error;
    }
  },

  /**
   * Get arena details with Yodha metadata
   */
  async getArenaDetails(arenaAddress: string): Promise<ArenaDetails> {
    try {
      const [
        yodhaOneNFTId,
        yodhaTwoNFTId,
        currentRound,
        isInitialized,
        // isBattleOngoing, // Removed - using new isBattleOngoing function instead
        gameInitializedAt,
        lastRoundEndedAt,
        damageOnYodhaOne,
        damageOnYodhaTwo,
        betAmount,
        costToInfluence,
        costToDefluence,
        costToInfluenceYodhaOne,
        costToInfluenceYodhaTwo,
        costToDefluenceYodhaOne,
        costToDefluenceYodhaTwo,
        playerOneBetAddresses,
        playerTwoBetAddresses,
        minBettingPeriod
      ] = await Promise.all([
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getYodhaOneNFTId',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getYodhaTwoNFTId',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCurrentRound',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getInitializationStatus',
          chainId: 545,
        }),
        // Removed getBattleStatus - using new isBattleOngoing function instead
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getGameInitializedAt',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getLastRoundEndedAt',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getDamageOnYodhaOne',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getDamageOnYodhaTwo',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getBetAmount',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToInfluence',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToDefluence',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToInfluenceYodhaOne',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToInfluenceYodhaTwo',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToDefluenceYodhaOne',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getCostToDefluenceYodhaTwo',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getPlayerOneBetAddresses',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getPlayerTwoBetAddresses',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getMinYodhaBettingPeriod',
          chainId: 545,
        })
      ]);

      const calculatedBettingPeriod = this.isBettingPeriodOver(
        Number(gameInitializedAt), 
        Number(minBettingPeriod)
      );

      // Check if battle is ongoing using the specific contract checks
      const battleOngoing = await this.isBattleOngoing(arenaAddress);

      const arenaDetails: ArenaDetails = {
        yodhaOneNFTId: Number(yodhaOneNFTId),
        yodhaTwoNFTId: Number(yodhaTwoNFTId),
        currentRound: Number(currentRound),
        isInitialized: Boolean(isInitialized),
        isBattleOngoing: battleOngoing,
        isBettingPeriod: Boolean(isInitialized) && !calculatedBettingPeriod && Number(currentRound) === 0,
        gameInitializedAt: Number(gameInitializedAt),
        lastRoundEndedAt: Number(lastRoundEndedAt),
        minBettingPeriod: Number(minBettingPeriod),
        damageOnYodhaOne: Number(damageOnYodhaOne),
        damageOnYodhaTwo: Number(damageOnYodhaTwo),
        betAmount: fromWei(betAmount as bigint),
        costToInfluence: fromWei(costToInfluence as bigint),
        costToDefluence: fromWei(costToDefluence as bigint),
        costToInfluenceYodhaOne: fromWei(costToInfluenceYodhaOne as bigint),
        costToInfluenceYodhaTwo: fromWei(costToInfluenceYodhaTwo as bigint),
        costToDefluenceYodhaOne: fromWei(costToDefluenceYodhaOne as bigint),
        costToDefluenceYodhaTwo: fromWei(costToDefluenceYodhaTwo as bigint),
        playerOneBetAddresses: playerOneBetAddresses as string[],
        playerTwoBetAddresses: playerTwoBetAddresses as string[]
      };

      // Fetch Yodha details if arena is initialized and has valid NFT IDs
      if (arenaDetails.isInitialized && arenaDetails.yodhaOneNFTId > 0 && arenaDetails.yodhaTwoNFTId > 0) {
        try {
          console.log(`Fetching Yodha details for arena ${arenaAddress}...`);
          const [yodhaOneDetails, yodhaTwoDetails] = await Promise.all([
            yodhaNFTService.getYodhaDetails(arenaDetails.yodhaOneNFTId),
            yodhaNFTService.getYodhaDetails(arenaDetails.yodhaTwoNFTId)
          ]);
          
          arenaDetails.yodhaOneDetails = yodhaOneDetails;
          arenaDetails.yodhaTwoDetails = yodhaTwoDetails;
          console.log(`✅ Yodha details fetched for arena ${arenaAddress}`);
        } catch (error) {
          console.warn(`Failed to fetch Yodha details for arena ${arenaAddress}:`, error);
          // Continue without Yodha details - they can be fetched later
        }
      }

      return arenaDetails;
    } catch (error) {
      console.error(`Error fetching arena details for ${arenaAddress}:`, error);
      throw error;
    }
  },

  /**
   * Bet on Yodha One
   */
  async betOnYodhaOne(arenaAddress: string, multiplier: number): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'betOnYodhaOne',
        args: [BigInt(multiplier)],
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error betting on Yodha One:', error);
      throw error;
    }
  },

  /**
   * Bet on Yodha Two
   */
  async betOnYodhaTwo(arenaAddress: string, multiplier: number): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'betOnYodhaTwo',
        args: [BigInt(multiplier)],
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error betting on Yodha Two:', error);
      throw error;
    }
  },

  /**
   * Start the game
   */
  async startGame(arenaAddress: string): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'startGame',
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error starting game:', error);
      throw error;
    }
  },

  /**
   * Influence Yodha One
   */
  async influenceYodhaOne(arenaAddress: string): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'influenceYodhaOne',
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error influencing Yodha One:', error);
      throw error;
    }
  },

  /**
   * Influence Yodha Two
   */
  async influenceYodhaTwo(arenaAddress: string): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'influenceYodhaTwo',
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error influencing Yodha Two:', error);
      throw error;
    }
  },

  /**
   * Defluence Yodha One
   */
  async defluenceYodhaOne(arenaAddress: string): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'defluenceYodhaOne',
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error defluencing Yodha One:', error);
      throw error;
    }
  },

  /**
   * Defluence Yodha Two
   */
  async defluenceYodhaTwo(arenaAddress: string): Promise<string> {
    try {
      const hash = await writeContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'defluenceYodhaTwo',
        chainId: 545,
      });

      return hash;
    } catch (error) {
      console.error('Error defluencing Yodha Two:', error);
      throw error;
    }
  },

  /**
   * Bet on Yodha One
   * @param arenaAddress - The arena contract address
   * @param betAmountInTokens - The bet amount in human-readable format (e.g., 6 for 6 RANN)
   */
  async betOnYodhaOneWithAmount(arenaAddress: string, betAmountInTokens: number): Promise<string> {
    try {
      // Get arena details to find the base bet amount
      const arenaDetails = await this.getArenaDetails(arenaAddress);
      const baseBetAmount = arenaDetails.betAmount; // This is already converted from wei
      
      // Calculate multiplier - must be a whole number multiple of base bet amount
      const multiplier = Math.round(betAmountInTokens / baseBetAmount);
      
      // Validate that the amount is a valid multiple
      if (multiplier < 1 || Math.abs(multiplier * baseBetAmount - betAmountInTokens) > 0.001) {
        throw new Error(`Bet amount must be a multiple of ${baseBetAmount} RANN. Valid amounts: ${baseBetAmount}, ${baseBetAmount * 2}, ${baseBetAmount * 3}, etc.`);
      }
      
      return await this.betOnYodhaOne(arenaAddress, multiplier);
    } catch (error) {
      console.error('Error betting on Yodha One with amount:', error);
      throw error;
    }
  },

  /**
   * Bet on Yodha Two
   * @param arenaAddress - The arena contract address
   * @param betAmountInTokens - The bet amount in human-readable format (e.g., 6 for 6 RANN)
   */
  async betOnYodhaTwoWithAmount(arenaAddress: string, betAmountInTokens: number): Promise<string> {
    try {
      // Get arena details to find the base bet amount
      const arenaDetails = await this.getArenaDetails(arenaAddress);
      const baseBetAmount = arenaDetails.betAmount; // This is already converted from wei
      
      // Calculate multiplier - must be a whole number multiple of base bet amount
      const multiplier = Math.round(betAmountInTokens / baseBetAmount);
      
      // Validate that the amount is a valid multiple
      if (multiplier < 1 || Math.abs(multiplier * baseBetAmount - betAmountInTokens) > 0.001) {
        throw new Error(`Bet amount must be a multiple of ${baseBetAmount} RANN. Valid amounts: ${baseBetAmount}, ${baseBetAmount * 2}, ${baseBetAmount * 3}, etc.`);
      }
      
      return await this.betOnYodhaTwo(arenaAddress, multiplier);
    } catch (error) {
      console.error('Error betting on Yodha Two with amount:', error);
      throw error;
    }
  },

  /**
   * Check if the betting period is currently ongoing
   * @param arenaAddress - The arena contract address
   */
  async getIsBettingPeriodGoingOn(arenaAddress: string): Promise<boolean> {
    try {
      const isBettingPeriod = await readContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'getIsBettingPeriodGoingOn',
        chainId: 545,
      });

      return Boolean(isBettingPeriod);
    } catch (error) {
      console.error('Error checking betting period status:', error);
      throw error;
    }
  },

  /**
   * Get the minimum betting period duration
   * @param arenaAddress - The arena contract address
   */
  async getMinYodhaBettingPeriod(arenaAddress: string): Promise<number> {
    try {
      const minBettingPeriod = await readContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'getMinYodhaBettingPeriod',
        chainId: 545,
      });

      return Number(minBettingPeriod);
    } catch (error) {
      console.error('Error getting min betting period:', error);
      throw error;
    }
  },

  /**
   * Calculate if betting period is over based on time
   * @param gameInitializedAt - Unix timestamp when game was initialized
   * @param minBettingPeriod - Minimum betting period in seconds
   */
  isBettingPeriodOver(gameInitializedAt: number, minBettingPeriod: number): boolean {
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    const bettingEndTime = gameInitializedAt + minBettingPeriod;
    return currentTime >= bettingEndTime;
  },

  /**
   * Check if battle is ongoing based on initialization status and betting period
   * @param arenaAddress - The arena contract address
   * @returns Promise<boolean> - True if battle is ongoing
   */
  async isBattleOngoing(arenaAddress: string): Promise<boolean> {
    try {
      const [initializationStatus, isBettingPeriodGoingOn] = await Promise.all([
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getInitializationStatus',
          chainId: 545,
        }),
        readContract(rainbowKitConfig, {
          address: arenaAddress as `0x${string}`,
          abi: KurukshetraAbi,
          functionName: 'getIsBettingPeriodGoingOn',
          chainId: 545,
        })
      ]);

      // Battle is ongoing if:
      // 1. Arena is initialized (getInitializationStatus() returns true)
      // 2. Betting period is not going on (getIsBettingPeriodGoingOn() returns false)
      return Boolean(initializationStatus) && !Boolean(isBettingPeriodGoingOn);
    } catch (error) {
      console.error('Error checking if battle is ongoing:', error);
      return false;
    }
  },

  /**
   * Get current round number for an arena
   */
  async getCurrentRound(arenaAddress: string): Promise<number> {
    try {
      const result = await readContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'getCurrentRound',
        chainId: 545,
      });
      return Number(result);
    } catch (error) {
      console.error('Error reading current round:', error);
      return 0;
    }
  },

  /**
   * Get damage on Yodha One
   */
  async getDamageOnYodhaOne(arenaAddress: string): Promise<number> {
    try {
      const result = await readContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'getDamageOnYodhaOne',
        chainId: 545,
      });
      return Number(result);
    } catch (error) {
      console.error('Error reading damage on Yodha One:', error);
      return 0;
    }
  },

  /**
   * Get damage on Yodha Two
   */
  async getDamageOnYodhaTwo(arenaAddress: string): Promise<number> {
    try {
      const result = await readContract(rainbowKitConfig, {
        address: arenaAddress as `0x${string}`,
        abi: KurukshetraAbi,
        functionName: 'getDamageOnYodhaTwo',
        chainId: 545,
      });
      return Number(result);
    } catch (error) {
      console.error('Error reading damage on Yodha Two:', error);
      return 0;
    }
  },

  // ...existing code...
};

/**
 * Calculate valid betting amounts for an arena
 * @param baseBetAmount - The base betting amount from the arena
 * @param maxMultiplier - Maximum multiplier to calculate (default: 10)
 * @returns Array of valid betting amounts
 */
export const getValidBettingAmounts = (baseBetAmount: number, maxMultiplier: number = 10): number[] => {
  const amounts: number[] = [];
  for (let i = 1; i <= maxMultiplier; i++) {
    amounts.push(baseBetAmount * i);
  }
  return amounts;
};

/**
 * Check if a betting amount is valid (multiple of base amount)
 * @param amount - The amount to check
 * @param baseBetAmount - The base betting amount
 * @returns boolean indicating if amount is valid
 */
export const isValidBettingAmount = (amount: number, baseBetAmount: number): boolean => {
  if (amount <= 0 || baseBetAmount <= 0) return false;
  return Math.abs(amount % baseBetAmount) < 0.001; // Allow small floating point errors
};

/**
 * Get the closest valid betting amount
 * @param amount - The desired amount
 * @param baseBetAmount - The base betting amount
 * @returns The closest valid betting amount
 */
export const getClosestValidBettingAmount = (amount: number, baseBetAmount: number): number => {
  if (amount <= 0) return baseBetAmount;
  const multiplier = Math.round(amount / baseBetAmount);
  return Math.max(1, multiplier) * baseBetAmount;
};

// Export utility functions for use in other components
export { fromWei, toWei };
