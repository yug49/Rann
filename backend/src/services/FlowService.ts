/**
 * Flow Service
 * 
 * Handles interactions with Flow blockchain for smart contract operations
 * including NFT minting, battle registration, and token management
 * 
 * @author Rann Team
 */

import { config, send, decode, script, transaction, arg, args, proposer, payer, authorizations, limit, ref, resolveResult } from '@onflow/fcl';
import * as t from '@onflow/types';
import type { 
  FlowService as IFlowService,
  FlowTransaction,
  FlowAccount,
  FlowEvent,
  NFTMetadata,
  FlowServiceConfig
} from '../types/index.js';

export class FlowService implements IFlowService {
  private serviceConfig: FlowServiceConfig;
  private isInitialized = false;

  constructor() {
    this.serviceConfig = this.getServiceConfig();
  }

  /**
   * Initialize Flow service
   */
  public async initialize(): Promise<void> {
    try {
      // Configure Flow FCL
      config({
        'accessNode.api': this.serviceConfig.accessNodeUrl,
        'discovery.wallet': this.serviceConfig.walletDiscoveryUrl,
        'app.detail.title': 'Rann Gaming Platform',
        'app.detail.icon': 'https://rann.game/icon.png',
        'service.OpenID.scopes': 'email'
      });

      // Test connection
      await this.testConnection();

      this.isInitialized = true;
      console.log('✅ Flow blockchain service initialized');
    } catch (error) {
      console.error('❌ Flow service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test Flow connection
   */
  private async testConnection(): Promise<void> {
    try {
      const latestBlock = await send([
        script`
          access(all) fun main(): UInt64 {
            return getCurrentBlock().height
          }
        `
      ]).then(decode);

      console.log(`✅ Connected to Flow network, latest block: ${latestBlock}`);
    } catch (error) {
      console.error('❌ Flow connection test failed:', error);
      throw error;
    }
  }

  /**
   * Check service health
   */
  public async isHealthy(): Promise<boolean> {
    try {
      await send([
        script`
          pub fun main(): UInt64 {
            return getCurrentBlock().height
          }
        `
      ]).then(decode);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get account information
   */
  public async getAccount(address: string): Promise<FlowAccount> {
    try {
      const account = await send([
        script`
          import FlowToken from 0x7e60df042a9c0868
          
          pub fun main(address: Address): {String: AnyStruct} {
            let account = getAccount(address)
            let flowBalance = account.getCapability(/public/flowTokenBalance)
              .borrow<&FlowToken.Vault{FlowToken.Balance}>()?.balance ?? 0.0
            
            return {
              "address": address.toString(),
              "balance": flowBalance,
              "storageUsed": account.storageUsed,
              "storageCapacity": account.storageCapacity,
              "keys": account.keys.length
            }
          }
        `,
        args([arg(address, t.Address)])
      ]).then(decode);

      return {
        address: account.address,
        balance: parseFloat(account.balance),
        storageUsed: parseInt(account.storageUsed),
        storageCapacity: parseInt(account.storageCapacity),
        keys: parseInt(account.keys)
      };
    } catch (error) {
      console.error('❌ Failed to get Flow account:', error);
      throw error;
    }
  }

  /**
   * Mint Yodha NFT
   */
  public async mintYodhaNFT(
    recipient: string,
    metadata: NFTMetadata
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import YodhaNFT from ${this.serviceConfig.contracts.YodhaNFT}
          import NonFungibleToken from ${this.serviceConfig.contracts.NonFungibleToken}
          import MetadataViews from ${this.serviceConfig.contracts.MetadataViews}
          
          transaction(
            recipient: Address,
            name: String,
            description: String,
            thumbnail: String,
            rarity: String,
            traits: {String: String}
          ) {
            let minter: &YodhaNFT.NFTMinter
            
            prepare(signer: AuthAccount) {
              self.minter = signer.borrow<&YodhaNFT.NFTMinter>(from: YodhaNFT.MinterStoragePath)
                ?? panic("Could not borrow a reference to the NFT minter")
            }
            
            execute {
              let metadata = YodhaNFT.Metadata(
                name: name,
                description: description,
                thumbnail: thumbnail,
                rarity: rarity,
                traits: traits
              )
              
              self.minter.mintNFT(
                recipient: recipient,
                metadata: metadata
              )
            }
          }
        `,
        args([
          arg(recipient, t.Address),
          arg(metadata.name, t.String),
          arg(metadata.description, t.String),
          arg(metadata.image, t.String),
          arg(metadata.rarity || 'common', t.String),
          arg(metadata.attributes || {}, t.Dictionary({ key: t.String, value: t.String }))
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      const transaction = await this.waitForTransaction(txId);
      
      return {
        id: txId,
        status: transaction.status,
        statusCode: transaction.statusCode,
        errorMessage: transaction.errorMessage,
        events: transaction.events || []
      };
    } catch (error) {
      console.error('❌ Failed to mint Yodha NFT:', error);
      throw error;
    }
  }

  /**
   * Get Yodha NFTs owned by address
   */
  public async getYodhaNFTs(address: string): Promise<any[]> {
    try {
      const nfts = await send([
        script`
          import YodhaNFT from ${this.serviceConfig.contracts.YodhaNFT}
          import MetadataViews from ${this.serviceConfig.contracts.MetadataViews}
          
          pub fun main(address: Address): [AnyStruct] {
            let account = getAccount(address)
            let collectionRef = account.getCapability(YodhaNFT.CollectionPublicPath)
              .borrow<&{YodhaNFT.YodhaCollectionPublic}>()
              ?? panic("Could not borrow capability from public collection")
            
            let nfts: [AnyStruct] = []
            let ids = collectionRef.getIDs()
            
            for id in ids {
              let nft = collectionRef.borrowYodha(id: id)
              if nft != nil {
                let metadata = nft!.getMetadata()
                nfts.append({
                  "id": id,
                  "name": metadata.name,
                  "description": metadata.description,
                  "thumbnail": metadata.thumbnail,
                  "rarity": metadata.rarity,
                  "traits": metadata.traits
                })
              }
            }
            
            return nfts
          }
        `,
        args([arg(address, t.Address)])
      ]).then(decode);

      return nfts || [];
    } catch (error) {
      console.error('❌ Failed to get Yodha NFTs:', error);
      return [];
    }
  }

  /**
   * Register battle on blockchain
   */
  public async registerBattle(
    battleId: string,
    attacker: string,
    defender: string,
    battleType: string
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import Kurukshetra from ${this.serviceConfig.contracts.Kurukshetra}
          
          transaction(
            battleId: String,
            attacker: Address,
            defender: Address,
            battleType: String
          ) {
            let battleManagerRef: &Kurukshetra.BattleManager
            
            prepare(signer: AuthAccount) {
              self.battleManagerRef = signer.borrow<&Kurukshetra.BattleManager>(from: Kurukshetra.BattleManagerStoragePath)
                ?? panic("Could not borrow battle manager reference")
            }
            
            execute {
              self.battleManagerRef.registerBattle(
                id: battleId,
                attacker: attacker,
                defender: defender,
                battleType: battleType
              )
            }
          }
        `,
        args([
          arg(battleId, t.String),
          arg(attacker, t.Address),
          arg(defender, t.Address),
          arg(battleType, t.String)
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      return await this.waitForTransaction(txId);
    } catch (error) {
      console.error('❌ Failed to register battle:', error);
      throw error;
    }
  }

  /**
   * Complete battle and record results
   */
  public async completeBattle(
    battleId: string,
    winner: string,
    results: Record<string, any>
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import Kurukshetra from ${this.serviceConfig.contracts.Kurukshetra}
          
          transaction(
            battleId: String,
            winner: Address,
            results: {String: String}
          ) {
            let battleManagerRef: &Kurukshetra.BattleManager
            
            prepare(signer: AuthAccount) {
              self.battleManagerRef = signer.borrow<&Kurukshetra.BattleManager>(from: Kurukshetra.BattleManagerStoragePath)
                ?? panic("Could not borrow battle manager reference")
            }
            
            execute {
              self.battleManagerRef.completeBattle(
                id: battleId,
                winner: winner,
                results: results
              )
            }
          }
        `,
        args([
          arg(battleId, t.String),
          arg(winner, t.Address),
          arg(results, t.Dictionary({ key: t.String, value: t.String }))
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      return await this.waitForTransaction(txId);
    } catch (error) {
      console.error('❌ Failed to complete battle:', error);
      throw error;
    }
  }

  /**
   * Start training session
   */
  public async startTraining(
    tokenId: string,
    trainingType: string,
    duration: number
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import Gurukul from ${this.serviceConfig.contracts.Gurukul}
          
          transaction(
            tokenId: UInt64,
            trainingType: String,
            duration: UInt64
          ) {
            let gurukulRef: &Gurukul.TrainingCenter
            
            prepare(signer: AuthAccount) {
              self.gurukulRef = signer.borrow<&Gurukul.TrainingCenter>(from: Gurukul.TrainingCenterStoragePath)
                ?? panic("Could not borrow training center reference")
            }
            
            execute {
              self.gurukulRef.startTraining(
                tokenId: tokenId,
                trainingType: trainingType,
                duration: duration
              )
            }
          }
        `,
        args([
          arg(tokenId, t.UInt64),
          arg(trainingType, t.String),
          arg(duration, t.UInt64)
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      return await this.waitForTransaction(txId);
    } catch (error) {
      console.error('❌ Failed to start training:', error);
      throw error;
    }
  }

  /**
   * Complete training session
   */
  public async completeTraining(
    tokenId: string,
    rewards: Record<string, any>
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import Gurukul from ${this.serviceConfig.contracts.Gurukul}
          
          transaction(
            tokenId: UInt64,
            rewards: {String: String}
          ) {
            let gurukulRef: &Gurukul.TrainingCenter
            
            prepare(signer: AuthAccount) {
              self.gurukulRef = signer.borrow<&Gurukul.TrainingCenter>(from: Gurukul.TrainingCenterStoragePath)
                ?? panic("Could not borrow training center reference")
            }
            
            execute {
              self.gurukulRef.completeTraining(
                tokenId: tokenId,
                rewards: rewards
              )
            }
          }
        `,
        args([
          arg(tokenId, t.UInt64),
          arg(rewards, t.Dictionary({ key: t.String, value: t.String }))
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      return await this.waitForTransaction(txId);
    } catch (error) {
      console.error('❌ Failed to complete training:', error);
      throw error;
    }
  }

  /**
   * Transfer RANN tokens
   */
  public async transferTokens(
    recipient: string,
    amount: number
  ): Promise<FlowTransaction> {
    try {
      const txId = await send([
        transaction`
          import RannToken from ${this.serviceConfig.contracts.RannToken}
          import FungibleToken from ${this.serviceConfig.contracts.FungibleToken}
          
          transaction(recipient: Address, amount: UFix64) {
            let tokenAdmin: &RannToken.Administrator
            
            prepare(signer: AuthAccount) {
              self.tokenAdmin = signer.borrow<&RannToken.Administrator>(from: RannToken.AdminStoragePath)
                ?? panic("Could not borrow token admin reference")
            }
            
            execute {
              self.tokenAdmin.mintTokens(amount: amount)
              // Additional logic to transfer to recipient
            }
          }
        `,
        args([
          arg(recipient, t.Address),
          arg(amount.toFixed(8), t.UFix64)
        ]),
        proposer(this.serviceConfig.serviceAccount),
        payer(this.serviceConfig.serviceAccount),
        authorizations([this.serviceConfig.serviceAccount]),
        limit(1000)
      ]);

      return await this.waitForTransaction(txId);
    } catch (error) {
      console.error('❌ Failed to transfer tokens:', error);
      throw error;
    }
  }

  /**
   * Get events for a transaction
   */
  public async getTransactionEvents(txId: string): Promise<FlowEvent[]> {
    try {
      const transaction = await send([
        script`
          pub fun main(txId: String): [AnyStruct] {
            return []
          }
        `,
        args([arg(txId, t.String)])
      ]).then(decode);

      // This would need proper implementation based on Flow's event system
      return [];
    } catch (error) {
      console.error('❌ Failed to get transaction events:', error);
      return [];
    }
  }

  /**
   * Wait for transaction to be sealed
   */
  private async waitForTransaction(txId: string): Promise<FlowTransaction> {
    try {
      const transaction = await resolveResult(txId);
      
      return {
        id: txId,
        status: transaction.status,
        statusCode: transaction.statusCode,
        errorMessage: transaction.errorMessage,
        events: transaction.events || []
      };
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  }

  /**
   * Get service configuration
   */
  private getServiceConfig(): FlowServiceConfig {
    return {
      accessNodeUrl: process.env.FLOW_ACCESS_NODE_URL || 'https://rest-testnet.onflow.org',
      walletDiscoveryUrl: process.env.FLOW_WALLET_DISCOVERY_URL || 'https://fcl-discovery.onflow.org/testnet/authn',
      serviceAccount: process.env.FLOW_SERVICE_ACCOUNT || '0x01',
      contracts: {
        RannToken: process.env.FLOW_RANN_TOKEN_CONTRACT || '0x01',
        YodhaNFT: process.env.FLOW_YODHA_NFT_CONTRACT || '0x01',
        Kurukshetra: process.env.FLOW_KURUKSHETRA_CONTRACT || '0x01',
        Gurukul: process.env.FLOW_GURUKUL_CONTRACT || '0x01',
        Bazaar: process.env.FLOW_BAZAAR_CONTRACT || '0x01',
        NonFungibleToken: process.env.FLOW_NFT_CONTRACT || '0x631e88ae7f1d7c20',
        FungibleToken: process.env.FLOW_FT_CONTRACT || '0x9a0766d93b6608b7',
        MetadataViews: process.env.FLOW_METADATA_CONTRACT || '0x631e88ae7f1d7c20'
      }
    };
  }

  /**
   * Cleanup resources
   */
  public async disconnect(): Promise<void> {
    try {
      this.isInitialized = false;
      console.log('✅ Flow service disconnected');
    } catch (error) {
      console.error('❌ Flow service disconnect error:', error);
    }
  }
}
