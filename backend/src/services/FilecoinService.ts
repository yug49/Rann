/**
 * Filecoin Service
 * 
 * Handles decentralized storage operations with IPFS/Filecoin
 * 
 * @author Rann Team
 */

// import { create as createIPFS } from 'ipfs-http-client';
import { Web3Storage } from 'web3.storage';
import lighthouse from '@lighthouse-web3/sdk';
import FormData from 'form-data';
import type { 
  FilecoinService as IFilecoinService,
  StorageMetadata,
  StorageResult 
} from '../types';

export class FilecoinService implements IFilecoinService {
  private ipfsClient: any;
  private web3Storage?: Web3Storage;
  private lighthouseApiKey?: string;
  private isInitialized = false;

  constructor() {
    // Will be initialized in initialize method
  }

  /**
   * Initialize storage connections
   */
  public async initialize(): Promise<void> {
    try {
      // Initialize IPFS client - temporarily disabled due to package issues
      // this.ipfsClient = createIPFS({
      //   host: process.env.IPFS_HOST || 'localhost',
      //   port: parseInt(process.env.IPFS_PORT || '5001', 10),
      //   protocol: process.env.IPFS_PROTOCOL || 'http'
      // });

      // Initialize Web3.Storage if API key is provided
      if (process.env.WEB3_STORAGE_TOKEN) {
        this.web3Storage = new Web3Storage({ 
          token: process.env.WEB3_STORAGE_TOKEN 
        });
      }

      // Set Lighthouse API key if provided
      if (process.env.LIGHTHOUSE_API_KEY) {
        this.lighthouseApiKey = process.env.LIGHTHOUSE_API_KEY;
      }

      // Test IPFS connection
      await this.testIPFSConnection();

      this.isInitialized = true;
      console.log('✅ Filecoin/IPFS service initialized');
    } catch (error) {
      console.error('❌ Filecoin service initialization failed:', error);
      throw error;
    }
  }

  /**
   * Test IPFS connection
   */
  private async testIPFSConnection(): Promise<void> {
    try {
      // await this.ipfsClient.version();
      console.log('🔄 IPFS connection temporarily disabled');
    } catch (error) {
      console.warn('⚠️ IPFS node connection failed, will use Web3.Storage as fallback');
    }
  }

  /**
   * Check service health
   */
  public async isHealthy(): Promise<boolean> {
    try {
      // Temporarily disable IPFS health check
      // if (this.ipfsClient) {
      //   await this.ipfsClient.version();
      //   return true;
      // }
      return this.web3Storage !== undefined || this.lighthouseApiKey !== undefined;
    } catch {
      return false;
    }
  }

  /**
   * Store data to IPFS/Filecoin
   */
  public async storeData(
    data: string | Buffer | Uint8Array,
    metadata?: StorageMetadata
  ): Promise<StorageResult> {
    try {
      const timestamp = new Date();
      
      // Try IPFS first (temporarily disabled)
      // if (this.ipfsClient) {
      //   try {
      //     const result = await this.ipfsClient.add(data, {
      //       pin: true,
      //       cidVersion: 1
      //     });

      //     return {
      //       hash: result.cid.toString(),
      //       url: `https://ipfs.io/ipfs/${result.cid.toString()}`,
      //       size: result.size,
      //       timestamp,
      //       provider: 'ipfs',
      //       metadata
      //     };
      //   } catch (ipfsError) {
      //     console.warn('IPFS storage failed, trying Web3.Storage:', ipfsError);
      //   }
      // }

      // Fallback to Web3.Storage
      if (this.web3Storage) {
        const file = new File([data], metadata?.filename || 'data', {
          type: metadata?.contentType || 'application/octet-stream'
        });

        const cid = await this.web3Storage.put([file]);

        return {
          hash: cid,
          url: `https://${cid}.ipfs.dweb.link/${file.name}`,
          size: file.size,
          timestamp,
          provider: 'web3storage',
          metadata
        };
      }

      // Fallback to Lighthouse if available
      if (this.lighthouseApiKey) {
        const formData = new FormData();
        formData.append('file', data, metadata?.filename || 'data');

        const response = await lighthouse.upload(
          formData,
          this.lighthouseApiKey
        );

        return {
          hash: response.data.Hash,
          url: `https://gateway.lighthouse.storage/ipfs/${response.data.Hash}`,
          size: response.data.Size,
          timestamp,
          provider: 'lighthouse',
          metadata
        };
      }

      throw new Error('No storage providers available');
    } catch (error) {
      console.error('❌ Storage operation failed:', error);
      throw error;
    }
  }

  /**
   * Store JSON data
   */
  public async storeJSON(
    data: Record<string, unknown>,
    metadata?: StorageMetadata
  ): Promise<StorageResult> {
    const jsonString = JSON.stringify(data, null, 2);
    const buffer = Buffer.from(jsonString, 'utf-8');
    
    return this.storeData(buffer, {
      ...metadata,
      contentType: 'application/json',
      filename: metadata?.filename || 'data.json'
    });
  }

  /**
   * Store file from buffer
   */
  public async storeFile(
    buffer: Buffer,
    filename: string,
    contentType?: string
  ): Promise<StorageResult> {
    return this.storeData(buffer, {
      filename,
      contentType: contentType || this.getContentType(filename)
    });
  }

  /**
   * Retrieve data from IPFS
   */
  public async retrieveData(hash: string): Promise<Buffer> {
    try {
      // IPFS retrieval temporarily disabled
      // if (this.ipfsClient) {
      //   const chunks: Uint8Array[] = [];
        
      //   for await (const chunk of this.ipfsClient.cat(hash)) {
      //     chunks.push(chunk);
      //   }
        
      //   return Buffer.concat(chunks);
      // }

      // Fallback to HTTP gateway
      const response = await fetch(`https://ipfs.io/ipfs/${hash}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('❌ Data retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Retrieve JSON data
   */
  public async retrieveJSON(hash: string): Promise<Record<string, unknown>> {
    const buffer = await this.retrieveData(hash);
    const jsonString = buffer.toString('utf-8');
    return JSON.parse(jsonString);
  }

  /**
   * Pin data to ensure persistence
   */
  public async pinData(hash: string): Promise<void> {
    try {
      // IPFS pinning temporarily disabled
      // if (this.ipfsClient) {
      //   await this.ipfsClient.pin.add(hash);
      //   console.log(`📌 Pinned ${hash} to IPFS`);
      // } else {
      //   console.warn('⚠️ Cannot pin data: IPFS client not available');
      // }
      console.log(`📌 Pin operation for ${hash} (IPFS temporarily disabled)`);
    } catch (error) {
      console.error('❌ Pin operation failed:', error);
      throw error;
    }
  }

  /**
   * Unpin data
   */
  public async unpinData(hash: string): Promise<void> {
    try {
      // IPFS unpinning temporarily disabled
      // if (this.ipfsClient) {
      //   await this.ipfsClient.pin.rm(hash);
      //   console.log(`📌 Unpinned ${hash} from IPFS`);
      // }
      console.log(`📌 Unpin operation for ${hash} (IPFS temporarily disabled)`);
    } catch (error) {
      console.error('❌ Unpin operation failed:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalStored: number;
    pinnedItems: number;
    repoSize: number;
  }> {
    try {
      // IPFS stats temporarily disabled
      // if (this.ipfsClient) {
      //   const [pins, stats] = await Promise.all([
      //     this.ipfsClient.pin.ls(),
      //     this.ipfsClient.stats.repo()
      //   ]);

      //   const pinnedItems = Array.isArray(pins) ? pins.length : 0;

      //   return {
      //     totalStored: stats.numObjects || 0,
      //     pinnedItems,
      //     repoSize: stats.repoSize || 0
      //   };
      // }

      return {
        totalStored: 0,
        pinnedItems: 0,
        repoSize: 0
      };
    } catch (error) {
      console.error('❌ Failed to get storage stats:', error);
      return {
        totalStored: 0,
        pinnedItems: 0,
        repoSize: 0
      };
    }
  }

  /**
   * Generate IPFS URL for hash
   */
  public getIPFSUrl(hash: string, gateway = 'https://ipfs.io'): string {
    return `${gateway}/ipfs/${hash}`;
  }

  /**
   * Generate multiple gateway URLs for redundancy
   */
  public getGatewayUrls(hash: string): string[] {
    const gateways = [
      'https://ipfs.io',
      'https://cloudflare-ipfs.com',
      'https://gateway.pinata.cloud',
      'https://dweb.link'
    ];

    return gateways.map(gateway => `${gateway}/ipfs/${hash}`);
  }

  /**
   * Get content type from filename
   */
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'mp4': 'video/mp4',
      'mp3': 'audio/mpeg',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  /**
   * Cleanup resources
   */
  public async disconnect(): Promise<void> {
    try {
      // IPFS client cleanup temporarily disabled
      // if (this.ipfsClient) {
      //   // IPFS client doesn't need explicit disconnection
      //   this.ipfsClient = null;
      // }
      
      this.isInitialized = false;
      console.log('✅ Filecoin service disconnected');
    } catch (error) {
      console.error('❌ Filecoin service disconnect error:', error);
    }
  }
}
