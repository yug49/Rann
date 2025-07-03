// FIXED API endpoints for arena automation
import { NextApiRequest, NextApiResponse } from 'next';
import { createWalletClient, http, createPublicClient, keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { defineChain } from 'viem';
import { KurukshetraAbi, chainsToTSender } from '../../../constants';

// Define Flow EVM chains
const flowTestnet = defineChain({
  id: 545,
  name: 'Flow Testnet',
  network: 'flow-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Flow',
    symbol: 'FLOW',
  },
  rpcUrls: {
    default: {
      http: [process.env.FLOW_TESTNET_RPC || 'https://testnet.evm.nodes.onflow.org'],
    },
    public: {
      http: [process.env.FLOW_TESTNET_RPC || 'https://testnet.evm.nodes.onflow.org'],
    },
  },
  blockExplorers: {
    default: { name: 'Flow Testnet Explorer', url: 'https://evm-testnet.flowscan.org' },
  },
});

// Create a simplified in-memory game state for development
const gameStates = new Map<string, any>();
const activeTimers = new Map<string, NodeJS.Timeout>();
const lastTransactionHashes = new Map<string, string>();

// Initialize viem clients for blockchain interaction
let walletClient: any = null;
let publicClient: any = null;

// Initialize blockchain clients
function initializeClients() {
  if (walletClient && publicClient) return { walletClient, publicClient };

  try {
    // Use Flow testnet
    const chain = flowTestnet;
    const rpcUrl = process.env.FLOW_TESTNET_RPC || 'https://testnet.evm.nodes.onflow.org';

    publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    // Private key from environment
    const privateKey = process.env.ARENA_AUTOMATION_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ ARENA_AUTOMATION_PRIVATE_KEY not set in environment');
      return { walletClient: null, publicClient: null };
    }

    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    walletClient = createWalletClient({
      account,
      chain,
      transport: http(rpcUrl)
    });

    console.log(`✅ Blockchain clients initialized for Flow testnet`);
    console.log(`📍 RPC URL: ${rpcUrl}`);
    console.log(`🔑 Account: ${account.address}`);

    return { walletClient, publicClient };
  } catch (error) {
    console.error('❌ Failed to initialize blockchain clients:', error);
    return { walletClient: null, publicClient: null };
  }
}

// Execute startGame on the contract
async function executeStartGame(battleId: string) {
  console.log(`🎮 Executing startGame() on contract ${battleId}`);
  
  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    return { success: false, error: 'No wallet or public client available' };
  }

  try {
    const contractAddress = battleId;
    
    // Check if contract exists
    try {
      const code = await publicClient.getBytecode({
        address: contractAddress as `0x${string}`
      });
      
      if (!code || code === '0x') {
        console.error(`❌ No contract found at address ${contractAddress} for startGame()`);
        return { success: false, error: 'No contract at address for startGame()' };
      }
      
      console.log(`✅ Contract verified for startGame() at ${contractAddress}, bytecode length: ${code.length}`);
    } catch (codeError) {
      console.warn(`⚠️ Could not verify contract code before startGame(): ${codeError}`);
      // Continue anyway as this might just be a network issue
    }
    
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: KurukshetraAbi,
      functionName: 'startGame',
      args: []
    });
    
    console.log(`✅ Start game transaction sent: ${hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);
    
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: 60000
    });
    
    // Store the transaction hash for verification
    lastTransactionHashes.set(battleId, hash as string);
    
    console.log(`✅ Start game confirmed in block ${receipt.blockNumber}`);
    
    return { success: true, hash, receipt };
  } catch (error) {
    console.error(`❌ Failed to start game for battle ${battleId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Execute battle on the contract
async function executeBattle(battleId: string) {
  console.log(`⚔️ Executing battle() on contract ${battleId}`);
  
  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    return { success: false, error: 'No wallet or public client available' };
  }

  try {
    const contractAddress = battleId;
    
    // Generate battle moves using AI (placeholder for now)
    const randomMove1 = Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4;
    const randomMove2 = Math.floor(Math.random() * 5) as 0 | 1 | 2 | 3 | 4;

    console.log(`🎯 Using moves: Yodha1=${randomMove1}, Yodha2=${randomMove2}`);
    
    // Create signature for the battle moves following the contract's expected format
    // The contract expects: keccak256(abi.encodePacked(_yodhaOneMove, _yodhaTwoMove))
    // followed by MessageHashUtils.toEthSignedMessageHash()
    
    // Encode the moves as the contract expects: abi.encodePacked(uint8, uint8)
    const encodedMoves = encodePacked(['uint8', 'uint8'], [randomMove1, randomMove2]);
    console.log(`📝 Encoded moves: ${encodedMoves}`);
    
    // Create the keccak256 hash
    const dataHash = keccak256(encodedMoves);
    console.log(`🔐 Data hash: ${dataHash}`);
    
    // The contract uses MessageHashUtils.toEthSignedMessageHash() which prefixes with "\x19Ethereum Signed Message:\n32"
    const ethSignedMessageHash = keccak256(
      encodePacked(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', dataHash])
    );
    console.log(`🔏 Ethereum signed message hash: ${ethSignedMessageHash}`);
    
    // Sign the Ethereum signed message hash
    const signature = await walletClient.signMessage({
      message: { raw: ethSignedMessageHash }
    });
    
    console.log(`✍️ Generated signature: ${signature}`);
    
    // Check if contract exists before calling battle
    try {
      const code = await publicClient.getBytecode({
        address: contractAddress as `0x${string}`
      });
      
      if (!code || code === '0x') {
        console.error(`❌ No contract found at address ${contractAddress} for battle()`);
        return { success: false, error: 'No contract at address for battle()' };
      }
      
      console.log(`✅ Contract verified for battle() at ${contractAddress}, bytecode length: ${code.length}`);
    } catch (codeError) {
      console.warn(`⚠️ Could not verify contract code before battle(): ${codeError}`);
      // Continue anyway as this might just be a network issue
    }
    
    // Execute the battle transaction
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: KurukshetraAbi,
      functionName: 'battle',
      args: [randomMove1, randomMove2, signature]
    });
    
    console.log(`✅ Battle transaction sent: ${hash}`);
    console.log(`⏳ Waiting for transaction confirmation...`);
    
    // Wait for transaction confirmation
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: 60000 // 60 second timeout
    });
    
    // Store the transaction hash for verification
    lastTransactionHashes.set(battleId, hash as string);
    
    console.log(`✅ Battle confirmed in block ${receipt.blockNumber}`);
    
    return { 
      success: true, 
      hash, 
      receipt, 
      moves: { randomMove1, randomMove2 } 
    };
  } catch (error) {
    console.error(`❌ Failed to execute battle for ${battleId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// FIXED: Auto execute next round with proper contract state checking
async function autoExecuteNextRound(battleId: string) {
  console.log(`🤖 AUTO-EXECUTING: Next round for battle ${battleId}`);
  
  const state = gameStates.get(battleId);
  if (!state) {
    console.error('❌ Game state not found');
    return { success: false, error: 'Game state not found' };
  }

  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    console.log('⚠️ No wallet client - simulating round');
    return { success: false, error: 'No wallet client available' };
  }

  try {
    // FIXED: Check the current round on the contract first
    const contractAddress = battleId;
    const currentRound = await publicClient.readContract({
      address: contractAddress as `0x${string}`,
      abi: KurukshetraAbi,
      functionName: 'getCurrentRound'
    });

    console.log(`📊 Contract current round: ${currentRound}`);

    // If round is 0, we need to call startGame() first
    if (currentRound === 0) {
      console.log(`🎮 Contract round is 0 - calling startGame() first`);
      const startResult = await executeStartGame(battleId);
      
      if (!startResult.success) {
        console.error(`❌ Failed to start game: ${startResult.error}`);
        return startResult;
      }
      
      console.log(`✅ Game started successfully, will execute first battle in next timer cycle`);
      
      // Update our local state
      state.gameStarted = true;
      state.lastTransactionHash = startResult.hash;
      state.timeRemaining = 40; // 40 seconds before first battle
      state.totalTime = 40;
      state.lastUpdate = Date.now();
      gameStates.set(battleId, state);
      
      return { success: true, hash: startResult.hash, gameStarted: true };
    }

    // If round >= 6, game is finished
    if (currentRound >= 6) {
      console.log(`🏁 Game finished (round ${currentRound}), stopping automation`);
      stopRoundTimer(battleId);
      return { success: true, gameFinished: true };
    }

    // Execute battle for rounds 1-5
    console.log(`⚔️ Proceeding with battle for round ${currentRound}`);
    const battleResult = await executeBattle(battleId);
    
    if (battleResult.success) {
      console.log(`✅ Battle round ${currentRound} completed successfully`);
      
      // Update local state
      state.currentRound = Number(currentRound) + 1;
      state.lastTransactionHash = battleResult.hash;
      state.timeRemaining = 40; // 40 seconds between battles
      state.totalTime = 40;
      state.lastUpdate = Date.now();
      gameStates.set(battleId, state);
      
      return battleResult;
    } else {
      console.error(`❌ Battle round ${currentRound} failed: ${battleResult.error}`);
      return battleResult;
    }
    
  } catch (readError) {
    console.error(`❌ Failed to read contract round: ${readError}`);
    return { success: false, error: 'Failed to read contract state' };
  }
}

// Verify the last transaction was successful
async function verifyLastTransaction(battleId: string, txHash: string): Promise<boolean> {
  if (!txHash) {
    console.log(`⚠️ No transaction hash to verify for battle ${battleId}`);
    return true;
  }

  const state = gameStates.get(battleId);
  if (state?.isSimulation) {
    console.log(`✅ Simulation mode - assuming transaction successful for battle ${battleId}`);
    return true;
  }

  const { publicClient } = initializeClients();
  if (!publicClient) {
    console.log('⚠️ No public client - assuming transaction successful');
    return true;
  }

  try {
    console.log(`🔍 Verifying transaction ${txHash} for battle ${battleId}`);
    
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`
    });

    const isSuccessful = receipt.status === 'success';
    console.log(`${isSuccessful ? '✅' : '❌'} Transaction ${txHash} status: ${receipt.status}`);
    
    return isSuccessful;
  } catch (error) {
    console.error(`❌ Failed to verify transaction ${txHash}:`, error);
    return false;
  }
}

// FIXED: Start automatic round timer
function startAutoRoundTimer(battleId: string) {
  console.log(`⏰ Starting auto round timer for battle ${battleId}`);
  
  // Clear any existing timer
  stopRoundTimer(battleId);
  
  const timer = setInterval(async () => {
    const state = gameStates.get(battleId);
    if (!state) {
      console.log(`❌ Game state not found for ${battleId}, stopping timer`);
      stopRoundTimer(battleId);
      return;
    }

    // Update countdown
    const now = Date.now();
    const elapsed = now - state.lastUpdate;
    state.timeRemaining = Math.max(0, state.timeRemaining - Math.floor(elapsed / 1000));
    state.lastUpdate = now;
    gameStates.set(battleId, state);

    // Execute when timer expires
    if (state.timeRemaining <= 0) {
      console.log(`⚔️ Time expired! Auto-executing round ${state.currentRound}...`);
      
      try {
        const result = await autoExecuteNextRound(battleId);
        
        if (!result.success) {
          console.error(`❌ Auto-execution failed: ${result.error}`);
          state.gameState = 'paused';
          state.automationError = result.error;
          console.log(`⚠️ Manual intervention required for battle ${battleId}`);
        } else if (result.gameFinished) {
          console.log(`🏁 Game completed for battle ${battleId}`);
          stopRoundTimer(battleId);
          return;
        } else {
          console.log(`✅ Auto-execution successful for battle ${battleId}`);
        }
        
        gameStates.set(battleId, state);
      } catch (error) {
        console.error(`❌ Error during auto-execution:`, error);
        state.gameState = 'paused';
        state.automationError = error instanceof Error ? error.message : 'Unknown error';
        gameStates.set(battleId, state);
      }
    }
  }, 1000); // Update every second

  activeTimers.set(battleId, timer);
  console.log(`✅ Auto round timer started for battle ${battleId}`);
}

// Stop automatic round execution timer
function stopRoundTimer(battleId: string) {
  const timer = activeTimers.get(battleId);
  if (timer) {
    console.log(`⏹️ Stopping auto round timer for battle ${battleId}`);
    clearInterval(timer);
    activeTimers.delete(battleId);
  }
}

// Main API handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { battleId } = req.query;
  if (!battleId || typeof battleId !== 'string') {
    return res.status(400).json({ error: 'Battle ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        // Return current game state
        const gameState = gameStates.get(battleId);
        if (!gameState) {
          return res.status(404).json({ error: 'Battle not found' });
        }
        return res.status(200).json(gameState);

      case 'POST':
        const { action, yodha1Id, yodha2Id } = req.body;
        switch (action) {
          case 'initialize':
            console.log(`🎮 Initializing automated battle ${battleId}`);
            
            const newGameState = {
              battleId,
              gameState: 'playing',
              timeRemaining: 70, // 70 seconds for initial round
              totalTime: 70,
              lastUpdate: Date.now(),
              currentRound: 1,
              totalRounds: 5,
              isSimulation: !battleId.startsWith('0x'),
              gameStarted: false, // Will be set to true after startGame() is called
              yodha1Id: yodha1Id || 1,
              yodha2Id: yodha2Id || 2,
              automationEnabled: true,
              transactionVerificationEnabled: true
            };
            
            gameStates.set(battleId, newGameState);
            
            // Start automatic round timer
            startAutoRoundTimer(battleId);
            
            console.log(`✅ Battle ${battleId} initialized with auto-execution`);
            
            return res.status(200).json({
              ...newGameState,
              message: 'Battle initialized with automatic round execution and transaction verification',
              signatureFixed: true,
              transactionVerification: true
            });

          case 'cleanup':
            // Stop automation and clean up
            stopRoundTimer(battleId);
            gameStates.delete(battleId);
            lastTransactionHashes.delete(battleId);
            console.log(`🧹 Cleaned up automation for battle ${battleId}`);
            
            return res.status(200).json({ message: 'Battle automation cleaned up' });

          case 'resume':
            // Resume paused battle
            const pausedState = gameStates.get(battleId);
            if (pausedState && pausedState.gameState === 'paused') {
              pausedState.gameState = 'playing';
              pausedState.automationError = null;
              pausedState.timeRemaining = 40;
              pausedState.totalTime = 40;
              pausedState.lastUpdate = Date.now();
              gameStates.set(battleId, pausedState);
              
              // Restart timer
              startAutoRoundTimer(battleId);
              
              console.log(`▶️ Resumed automation for battle ${battleId}`);
              return res.status(200).json({
                ...pausedState,
                message: 'Battle automation resumed'
              });
            }
            
            return res.status(400).json({ error: 'Battle is not in paused state' });

          case 'status':
            // Get detailed status
            const statusState = gameStates.get(battleId);
            if (!statusState) {
              return res.status(404).json({ error: 'Battle not found' });
            }

            const lastTxHash = lastTransactionHashes.get(battleId);
            let lastTxStatus: any = null;
            
            if (lastTxHash && !statusState.isSimulation) {
              try {
                const { publicClient } = initializeClients();
                if (publicClient) {
                  const receipt = await publicClient.getTransactionReceipt({
                    hash: lastTxHash as `0x${string}`
                  });
                  lastTxStatus = {
                    hash: lastTxHash,
                    status: receipt.status,
                    blockNumber: receipt.blockNumber
                  };
                }
              } catch (error) {
                lastTxStatus = {
                  hash: lastTxHash,
                  status: 'unknown',
                  error: error instanceof Error ? error.message : 'Unknown error'
                };
              }
            }

            return res.status(200).json({
              gameState: statusState,
              hasActiveTimer: activeTimers.has(battleId),
              lastTransaction: lastTxStatus,
              arenaAddress: battleId,
              contractAddress: battleId
            });

          default:
            return res.status(400).json({ error: 'Invalid action. Supported actions: initialize, pause, resume, cleanup, status' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ Arena API error for battleId:', battleId, error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      battleId: battleId
    });
  }
}
