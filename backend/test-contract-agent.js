#!/usr/bin/env node

/**
 * Test Contract → Agent Interaction (Signature Testing)
 * 
 * This script tests:
 * - Contract event listening and response
 * - Agent signature verification from contract calls
 * - Webhook simulation for contract events
 * - Automated agent responses to contract state changes
 */

const { ethers } = require('ethers');
const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:3001';

class ContractAgentTester {
  constructor() {
    this.wallet = null;
    this.contractWallet = null;
    this.authToken = null;
    this.testResults = [];
    this.webhookServer = null;
  }

  async initialize() {
    console.log('🔧 Initializing Contract-Agent Tester...\n');
    
    // Create test wallets
    this.wallet = ethers.Wallet.createRandom(); // Agent wallet
    this.contractWallet = ethers.Wallet.createRandom(); // Contract/System wallet
    
    console.log(`👤 Agent wallet: ${this.wallet.address}`);
    console.log(`📜 Contract wallet: ${this.contractWallet.address}\n`);
    
    // Authenticate the agent
    await this.authenticateAgent();
  }

  async authenticateAgent() {
    console.log('🔐 Authenticating agent...');
    
    try {
      // Get challenge
      const challengeResponse = await axios.post(`${BASE_URL}/api/auth/challenge`, {
        address: this.wallet.address
      });
      
      const { message, nonce } = challengeResponse.data.data;
      const signature = await this.wallet.signMessage(message);
      
      // Verify and get token
      const verifyResponse = await axios.post(`${BASE_URL}/api/auth/verify`, {
        address: this.wallet.address,
        signature: signature,
        message: message,
        nonce: nonce
      });
      
      if (verifyResponse.data.success) {
        this.authToken = verifyResponse.data.data.token;
        console.log(`✅ Agent authenticated successfully\n`);
      } else {
        throw new Error('Authentication failed');
      }
      
    } catch (error) {
      console.error(`❌ Agent authentication failed: ${error.message}\n`);
      throw error;
    }
  }

  // Simulate contract event that triggers agent response
  async simulateContractEvent(eventType, eventData) {
    console.log(`📜 [${new Date().toLocaleTimeString()}] Contract Event: ${eventType}`);
    
    try {
      // Create a contract-signed message for the event
      const eventMessage = JSON.stringify({
        event: eventType,
        data: eventData,
        timestamp: Date.now(),
        blockNumber: Math.floor(Math.random() * 1000000),
        contractAddress: this.contractWallet.address
      });
      
      // Contract signs the event data
      const contractSignature = await this.contractWallet.signMessage(eventMessage);
      
      console.log(`   📝 Event Data: ${JSON.stringify(eventData)}`);
      console.log(`   🔏 Contract Signature: ${contractSignature.substring(0, 20)}...`);
      
      // Send event to agent for processing
      const response = await this.processContractEvent(eventType, eventData, eventMessage, contractSignature);
      
      return response;
      
    } catch (error) {
      console.error(`   ❌ Contract event simulation failed: ${error.message}`);
      throw error;
    }
  }

  // Agent processes contract event and responds
  async processContractEvent(eventType, eventData, originalMessage, contractSignature) {
    console.log(`🤖 Agent processing contract event...`);
    
    try {
      // 1. Verify contract signature
      const recoveredAddress = ethers.verifyMessage(originalMessage, contractSignature);
      
      if (recoveredAddress.toLowerCase() !== this.contractWallet.address.toLowerCase()) {
        throw new Error('Invalid contract signature');
      }
      
      console.log(`   ✅ Contract signature verified`);
      
      // 2. Process event based on type
      let agentResponse;
      
      switch (eventType) {
        case 'NFTMinted':
          agentResponse = await this.handleNFTMinted(eventData);
          break;
        case 'BattleCompleted':
          agentResponse = await this.handleBattleCompleted(eventData);
          break;
        case 'TrainingFinished':
          agentResponse = await this.handleTrainingFinished(eventData);
          break;
        case 'TokenTransfer':
          agentResponse = await this.handleTokenTransfer(eventData);
          break;
        default:
          agentResponse = await this.handleGenericEvent(eventData);
      }
      
      // 3. Agent signs the response
      const responseMessage = JSON.stringify({
        originalEvent: eventType,
        agentResponse: agentResponse,
        timestamp: Date.now(),
        agentAddress: this.wallet.address
      });
      
      const agentSignature = await this.wallet.signMessage(responseMessage);
      
      console.log(`   🔏 Agent Response Signature: ${agentSignature.substring(0, 20)}...`);
      console.log(`   📤 Agent Response: ${JSON.stringify(agentResponse)}\n`);
      
      return {
        success: true,
        response: agentResponse,
        signature: agentSignature,
        message: responseMessage
      };
      
    } catch (error) {
      console.error(`   ❌ Agent event processing failed: ${error.message}\n`);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Event handlers for different contract events
  async handleNFTMinted(eventData) {
    console.log(`   🎨 Processing NFT Mint Event...`);
    
    // Simulate agent actions for NFT minting
    const actions = [
      'Updated metadata cache',
      'Triggered trait analysis',
      'Sent notification to owner',
      'Updated leaderboard',
      'Scheduled initial training'
    ];
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      eventProcessed: 'NFTMinted',
      tokenId: eventData.tokenId,
      actionsPerformed: actions,
      status: 'completed',
      nextActions: ['trait_verification', 'owner_notification']
    };
  }

  async handleBattleCompleted(eventData) {
    console.log(`   ⚔️ Processing Battle Completion Event...`);
    
    // Simulate processing battle results
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      eventProcessed: 'BattleCompleted',
      battleId: eventData.battleId,
      winner: eventData.winner,
      actionsPerformed: [
        'Updated battle stats',
        'Calculated XP rewards',
        'Processed rankings',
        'Sent battle report'
      ],
      rewardsDistributed: {
        winner: { xp: 100, tokens: 50 },
        loser: { xp: 25, tokens: 10 }
      }
    };
  }

  async handleTrainingFinished(eventData) {
    console.log(`   🎓 Processing Training Completion Event...`);
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    return {
      eventProcessed: 'TrainingFinished',
      sessionId: eventData.sessionId,
      tokenId: eventData.tokenId,
      actionsPerformed: [
        'Applied stat improvements',
        'Updated NFT metadata',
        'Calculated training rewards',
        'Unlocked new abilities'
      ],
      improvements: {
        strength: '+5',
        agility: '+3',
        intelligence: '+7'
      }
    };
  }

  async handleTokenTransfer(eventData) {
    console.log(`   💰 Processing Token Transfer Event...`);
    
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      eventProcessed: 'TokenTransfer',
      transactionId: eventData.transactionId,
      amount: eventData.amount,
      actionsPerformed: [
        'Verified transfer',
        'Updated balances',
        'Triggered tax calculations',
        'Sent confirmation'
      ],
      balanceUpdates: {
        from: eventData.from,
        to: eventData.to,
        verified: true
      }
    };
  }

  async handleGenericEvent(eventData) {
    console.log(`   📋 Processing Generic Event...`);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      eventProcessed: 'Generic',
      data: eventData,
      actionsPerformed: ['Event logged', 'Notification sent'],
      status: 'acknowledged'
    };
  }

  // Test signature verification endpoint
  async testSignatureVerification() {
    console.log('🔍 Testing Contract-Agent Signature Verification...');
    
    try {
      // Create a test transaction that contract would send to agent
      const transactionData = {
        type: 'reward_distribution',
        recipients: [this.wallet.address],
        amounts: [100],
        timestamp: Date.now()
      };
      
      const message = JSON.stringify(transactionData);
      const contractSignature = await this.contractWallet.signMessage(message);
      
      // Agent verifies and processes the transaction
      console.log(`   📜 Contract Transaction: ${message}`);
      console.log(`   🔏 Contract Signature: ${contractSignature.substring(0, 20)}...`);
      
      // Verify signature
      const recoveredAddress = ethers.verifyMessage(message, contractSignature);
      
      if (recoveredAddress.toLowerCase() === this.contractWallet.address.toLowerCase()) {
        console.log(`   ✅ Signature verification successful`);
        
        // Agent creates response transaction
        const agentResponse = {
          acknowledges: transactionData,
          agentAddress: this.wallet.address,
          status: 'accepted',
          timestamp: Date.now()
        };
        
        const responseMessage = JSON.stringify(agentResponse);
        const agentSignature = await this.wallet.signMessage(responseMessage);
        
        console.log(`   📤 Agent Response: ${responseMessage}`);
        console.log(`   🔏 Agent Signature: ${agentSignature.substring(0, 20)}...`);
        
        this.testResults.push({ test: 'Contract-Agent Signature Verification', status: 'PASSED' });
        return true;
        
      } else {
        throw new Error('Signature verification failed');
      }
      
    } catch (error) {
      console.error(`   ❌ Signature verification test failed: ${error.message}`);
      this.testResults.push({ test: 'Contract-Agent Signature Verification', status: 'FAILED', error: error.message });
      return false;
    }
  }

  async runContractEventSimulation() {
    console.log('🎭 Running Contract Event Simulation...\n');
    
    const events = [
      {
        type: 'NFTMinted',
        data: { tokenId: '123', owner: this.wallet.address, rarity: 'rare' }
      },
      {
        type: 'BattleCompleted',
        data: { battleId: 'battle_456', winner: this.wallet.address, loser: this.contractWallet.address }
      },
      {
        type: 'TrainingFinished',
        data: { sessionId: 'training_789', tokenId: '123', trainingType: 'strength' }
      },
      {
        type: 'TokenTransfer',
        data: { transactionId: 'tx_101112', from: this.contractWallet.address, to: this.wallet.address, amount: 500 }
      }
    ];
    
    let successCount = 0;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      try {
        console.log(`📋 Test ${i + 1}/${events.length}: ${event.type}`);
        const result = await this.simulateContractEvent(event.type, event.data);
        
        if (result.success) {
          successCount++;
          console.log(`   ✅ Event processed successfully\n`);
        } else {
          console.log(`   ❌ Event processing failed: ${result.error}\n`);
        }
        
        // Wait between events
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`   ❌ Event simulation failed: ${error.message}\n`);
      }
    }
    
    const testName = 'Contract Event Simulation';
    if (successCount === events.length) {
      this.testResults.push({ test: testName, status: 'PASSED', details: `${successCount}/${events.length} events processed` });
    } else {
      this.testResults.push({ test: testName, status: 'PARTIAL', details: `${successCount}/${events.length} events processed` });
    }
    
    return successCount === events.length;
  }

  async runAllTests() {
    console.log('🚀 Starting Contract → Agent Interaction Tests\n');
    console.log('=' .repeat(60));
    
    await this.initialize();
    
    const tests = [
      () => this.testSignatureVerification(),
      () => this.runContractEventSimulation()
    ];
    
    for (const test of tests) {
      await test();
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    this.printResults();
  }

  printResults() {
    console.log('=' .repeat(60));
    console.log('📊 CONTRACT → AGENT TEST RESULTS:');
    console.log('=' .repeat(60));
    
    this.testResults.forEach((result, index) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
      console.log(`${icon} ${index + 1}. ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   Details: ${result.details}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    const passed = this.testResults.filter(r => r.status === 'PASSED').length;
    const total = this.testResults.length;
    
    console.log('\n' + '=' .repeat(60));
    console.log(`🎯 Tests Passed: ${passed}/${total}`);
    console.log('=' .repeat(60));
  }
}

// Run the tests
if (require.main === module) {
  const tester = new ContractAgentTester();
  tester.runAllTests().catch(console.error);
}

module.exports = ContractAgentTester;
