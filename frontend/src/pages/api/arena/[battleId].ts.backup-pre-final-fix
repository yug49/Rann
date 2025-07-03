// Arena Automation API - Simple flow implementation
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
function initializeClients() {
  try {
    const chain = flowTestnet;
    const rpcUrl = process.env.FLOW_TESTNET_RPC || 'https://testnet.evm.nodes.onflow.org';

    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    const gameMasterPrivateKey = process.env.NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY;
    console.log(`🔑 Checking private key: ${gameMasterPrivateKey ? 'Found' : 'NOT FOUND'}`);
    
    if (!gameMasterPrivateKey) {
      console.error('❌ NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY not found in environment');
      return { walletClient: null, publicClient };
    }

    const formattedKey = gameMasterPrivateKey.startsWith('0x') 
      ? gameMasterPrivateKey as `0x${string}`
      : `0x${gameMasterPrivateKey}` as `0x${string}`;
    
    console.log(`🔑 Using private key format: ${formattedKey.substring(0, 6)}...`);

    const gameMasterAccount = privateKeyToAccount(formattedKey);
    console.log(`👤 Game master account: ${gameMasterAccount.address}`);

    const walletClient = createWalletClient({
      account: gameMasterAccount,
      chain,
      transport: http(rpcUrl),
    });

    console.log('✅ Blockchain clients initialized successfully for Flow');
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

// Simple automation function - follows predictable flow
async function executeNextAction(battleId: string) {
  console.log(`🤖 EXECUTING: Next action for battle ${battleId}`);
  
  const state = gameStates.get(battleId);
  if (!state) {
    console.error('❌ Game state not found');
    return { success: false, error: 'Game state not found' };
  }

  const { walletClient, publicClient } = initializeClients();
  if (!walletClient || !publicClient) {
    console.error('❌ No wallet client available');
    return { success: false, error: 'No wallet client available' };
  }

  try {
    // Simple flow based on phase
    const phase = state.phase || 'startGame'; // startGame, battle, finished
    
    if (phase === 'startGame') {
      console.log(`🎮 Phase: Starting game`);
      const result = await executeStartGame(battleId);
      
      if (result.success) {
        // Move to battle phase
        state.phase = 'battle';
        state.currentRound = 1;
        state.lastTransactionHash = result.hash;
        state.timeRemaining = 40; // 40 seconds for next battle
        state.totalTime = 40;
        state.lastUpdate = Date.now();
        gameStates.set(battleId, state);
        
        console.log(`✅ Game started! Next battle in 40 seconds`);
        return { success: true, hash: result.hash, phase: 'startGame' };
      } else {
        console.error(`❌ Failed to start game: ${result.error}`);
        return result;
      }
      
    } else if (phase === 'battle') {
      const round = state.currentRound || 1;
      
      if (round > 5) {
        console.log(`🏁 Game finished after 5 rounds`);
        state.phase = 'finished';
        gameStates.set(battleId, state);
        stopRoundTimer(battleId);
        return { success: true, phase: 'finished' };
      }
      
      console.log(`⚔️ Phase: Battle round ${round}`);
      const move1 = Math.floor(Math.random() * 5);
      const move2 = Math.floor(Math.random() * 5);
      
      const result = await executeBattle(battleId, move1, move2);
      
      if (result.success) {
        // Move to next round
        state.currentRound = round + 1;
        state.lastTransactionHash = result.hash;
        state.timeRemaining = 40; // 40 seconds for next battle
        state.totalTime = 40;
        state.lastUpdate = Date.now();
        gameStates.set(battleId, state);
        
        console.log(`✅ Battle round ${round} completed! Next battle in 40 seconds`);
        return { success: true, hash: result.hash, phase: 'battle', round };
      } else {
        console.error(`❌ Battle failed: ${result.error}`);
        return result;
      }
      
    } else {
      console.log(`🏁 Game already finished`);
      return { success: true, phase: 'finished' };
    }

  } catch (error) {
    console.error(`❌ Failed to execute action: ${error}`);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Timer management
function startRoundTimer(battleId: string) {
  // Clear any existing timer
  stopRoundTimer(battleId);
  
  console.log(`⏰ Starting timer for battle ${battleId}`);
  
  const timer = setInterval(async () => {
    const state = gameStates.get(battleId);
    if (!state) {
      console.log(`⏹️ No game state found for ${battleId}, stopping timer`);
      stopRoundTimer(battleId);
      return;
    }
    
    if (state.phase === 'finished') {
      console.log(`🏁 Game finished for ${battleId}, stopping timer`);
      stopRoundTimer(battleId);
      return;
    }
    
    // Update countdown
    const elapsed = Date.now() - state.lastUpdate;
    state.timeRemaining = Math.max(0, state.totalTime - Math.floor(elapsed / 1000));
    
    if (state.timeRemaining <= 0) {
      console.log(`⚔️ Time expired! Executing next action...`);
      
      const result = await executeNextAction(battleId);
      
      if (result.success) {
        console.log(`✅ Action completed: ${result.phase}`);
      } else {
        console.error(`❌ Action failed: ${result.error}`);
        // Don't stop timer, keep retrying
      }
    }
  }, 1000); // Update every second
  
  activeTimers.set(battleId, timer);
}

function stopRoundTimer(battleId: string) {
  const timer = activeTimers.get(battleId);
  if (timer) {
    console.log(`⏹️ Stopping timer for battle ${battleId}`);
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
              phase: 'startGame', // startGame -> battle -> finished
              timeRemaining: 70, // 70 seconds before startGame
              totalTime: 70,
              lastUpdate: Date.now(),
              currentRound: 0, // Will become 1 after startGame
              totalRounds: 5,
              isSimulation: !battleId.startsWith('0x'),
              yodha1Id,
              yodha2Id,
              automationEnabled: true
            };
            
            gameStates.set(battleId, newGameState);
            
            // Start timer with 70 seconds for startGame
            startRoundTimer(battleId);
            
            console.log(`✅ Battle ${battleId} initialized - startGame() in 70 seconds`);
            
            return res.status(200).json({
              ...newGameState,
              message: 'Battle initialized - startGame() in 70 seconds, then battles every 40 seconds',
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
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      battleId: battleId
    });
  }
}
