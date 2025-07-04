// Arena Automation API - Clean implementation with proper startGame() handling
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

// Game state management
const gameStates = new Map<string, any>();
const activeTimers = new Map<string, NodeJS.Timeout>();
const lastTransactionHashes = new Map<string, string>();

// Initialize viem clients
let walletClient: any = null;
let publicClient: any = null;

function initializeClients() {
  if (walletClient && publicClient) return { walletClient, publicClient };

  try {
    const chain = flowTestnet;
    const rpcUrl = process.env.FLOW_TESTNET_RPC || 'https://testnet.evm.nodes.onflow.org';

    publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    if (process.env.PRIVATE_KEY) {
      const account = privateKeyToAccount(process.env.PRIVATE_KEY as `0x${string}`);
      walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      });
    }

    return { walletClient, publicClient };
  } catch (error) {
    console.error('Failed to initialize clients:', error);
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
    
    lastTransactionHashes.set(battleId, hash as string);
    console.log(`✅ Start game confirmed in block ${receipt.blockNumber}`);
    
    return { success: true, hash, receipt };
  } catch (error) {
    console.error(`❌ Failed to start game for battle ${battleId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Execute battle on the contract
async function executeBattle(battleId: string, move1: number, move2: number) {
  console.log(`⚔️ Executing battle() on contract ${battleId} with moves: ${move1} vs ${move2}`);
  
  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    return { success: false, error: 'No wallet or public client available' };
  }

  try {
    const contractAddress = battleId;
    
    // Create signature for the battle moves
    const encodedMoves = encodePacked(['uint8', 'uint8'], [move1 as any, move2 as any]);
    const dataHash = keccak256(encodedMoves);
    const ethSignedMessageHash = keccak256(
      encodePacked(['string', 'bytes32'], ['\x19Ethereum Signed Message:\n32', dataHash])
    );
    
    const signature = await walletClient.signMessage({
      message: { raw: ethSignedMessageHash }
    });
    
    console.log(`✍️ Generated signature for moves: ${move1}, ${move2}`);
    
    const hash = await walletClient.writeContract({
      address: contractAddress as `0x${string}`,
      abi: KurukshetraAbi,
      functionName: 'battle',
      args: [move1, move2, signature]
    });
    
    console.log(`✅ Battle transaction sent: ${hash}`);
    
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: hash as `0x${string}`,
      timeout: 60000
    });
    
    lastTransactionHashes.set(battleId, hash as string);
    console.log(`✅ Battle confirmed in block ${receipt.blockNumber}`);
    
    return { success: true, hash, receipt };
  } catch (error) {
    console.error(`❌ Failed to execute battle for ${battleId}:`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Main automation function - FIXED with proper contract reading
async function autoExecuteNextRound(battleId: string) {
  console.log(`🤖 AUTO-EXECUTING: Next round for battle ${battleId}`);
  
  const state = gameStates.get(battleId);
  if (!state) {
    console.error('❌ Game state not found');
    return { success: false, error: 'Game state not found' };
  }

  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    console.log('⚠️ No wallet client - skipping round');
    return { success: false, error: 'No wallet client available' };
  }

  try {
    // CRITICAL FIX: Read current round from contract first
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
      
      console.log(`✅ Game started successfully! Next round will be a battle`);
      return { success: true, hash: startResult.hash, gameStarted: true };
    }

    // If round >= 6, game is finished
    if (currentRound >= 6) {
      console.log(`🏁 Game finished (round ${currentRound}), stopping automation`);
      stopRoundTimer(battleId);
      return { success: true, gameFinished: true };
    }

    // Execute battle for current round
    console.log(`⚔️ Proceeding with battle for round ${currentRound}`);
    const move1 = Math.floor(Math.random() * 5);
    const move2 = Math.floor(Math.random() * 5);
    
    const battleResult = await executeBattle(battleId, move1, move2);
    
    if (battleResult.success) {
      console.log(`✅ Battle round ${currentRound} completed successfully`);
      
      // Update local state
      state.currentRound = currentRound + 1;
      state.lastTransactionHash = battleResult.hash;
      state.lastUpdate = Date.now();
      gameStates.set(battleId, state);
      
      return { success: true, hash: battleResult.hash, round: currentRound };
    } else {
      console.error(`❌ Battle failed: ${battleResult.error}`);
      return battleResult;
    }

  } catch (readError) {
    console.error(`❌ Failed to read contract state: ${readError}`);
    return { success: false, error: 'Failed to read contract state' };
  }
}

// Timer management
function startRoundTimer(battleId: string, intervalMs: number = 40000) {
  // Clear any existing timer
  stopRoundTimer(battleId);
  
  console.log(`⏰ Starting round timer for battle ${battleId} (${intervalMs}ms intervals)`);
  
  const timer = setInterval(async () => {
    const state = gameStates.get(battleId);
    if (!state) {
      console.log(`⏹️ No game state found for ${battleId}, stopping timer`);
      stopRoundTimer(battleId);
      return;
    }
    
    // Update countdown
    const elapsed = Date.now() - state.lastUpdate;
    state.timeRemaining = Math.max(0, state.totalTime - Math.floor(elapsed / 1000));
    
    if (state.timeRemaining <= 0) {
      console.log(`⚔️ Time expired! Auto-executing next round...`);
      
      const result = await autoExecuteNextRound(battleId);
      
      if (result.success) {
        if (result.gameFinished) {
          console.log(`🏁 Game completed for ${battleId}`);
          stopRoundTimer(battleId);
          return;
        }
        
        // Reset timer for next round
        state.timeRemaining = 40;
        state.totalTime = 40;
        state.lastUpdate = Date.now();
        gameStates.set(battleId, state);
        
        console.log(`⏰ Next round timer set for 40 seconds`);
      } else {
        console.error(`❌ Auto-execution failed: ${result.error}`);
        console.log(`⚠️ Manual intervention required for battle ${battleId}`);
        // Don't stop timer, keep retrying
      }
    }
  }, 1000); // Update every second
  
  activeTimers.set(battleId, timer);
}

function stopRoundTimer(battleId: string) {
  const timer = activeTimers.get(battleId);
  if (timer) {
    console.log(`⏹️ Stopping round timer for battle ${battleId}`);
    clearInterval(timer);
    activeTimers.delete(battleId);
  }
}

// API Handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { battleId } = req.query;
  if (!battleId || typeof battleId !== 'string') {
    return res.status(400).json({ error: 'Battle ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
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
              timeRemaining: 70,
              totalTime: 70,
              lastUpdate: Date.now(),
              currentRound: 1,
              totalRounds: 5,
              isSimulation: !battleId.startsWith('0x'),
              yodha1Id,
              yodha2Id,
              automationEnabled: true,
              transactionVerificationEnabled: true
            };
            
            gameStates.set(battleId, newGameState);
            
            // Start timer with 70 seconds initially
            startRoundTimer(battleId, 1000);
            
            console.log(`✅ Battle ${battleId} initialized with automation`);
            
            return res.status(200).json({
              ...newGameState,
              message: 'Battle initialized with automatic execution',
              arenaAddress: battleId,
              contractAddress: battleId
            });

          case 'cleanup':
            stopRoundTimer(battleId);
            gameStates.delete(battleId);
            lastTransactionHashes.delete(battleId);
            
            console.log(`🧹 Cleaned up automation for battle ${battleId}`);
            return res.status(200).json({ message: 'Battle automation cleaned up' });

          case 'resume':
            const pausedState = gameStates.get(battleId);
            if (pausedState) {
              pausedState.gameState = 'playing';
              startRoundTimer(battleId);
              gameStates.set(battleId, pausedState);
              return res.status(200).json({ message: 'Battle resumed' });
            }
            return res.status(404).json({ error: 'Battle not found' });

          default:
            return res.status(400).json({ error: 'Invalid action. Use "initialize", "cleanup", or "resume"' });
        }

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error('❌ Arena automation error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      battleId: battleId
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      battleId: battleId
    });
  }
}
