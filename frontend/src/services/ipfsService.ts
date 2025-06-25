export interface IPFSUploadResult {
  imageCid: string;
  imageUrl: string;
  metadataCid: string;
  metadataUrl: string;
  metadata: any;
  size: number;
}

export interface YodhaFormData {
  name: string;
  bio: string;
  life_history: string;
  adjectives: string;
  knowledge_areas: string;
  image: File;
}

export class IPFSService {
  async uploadYodhaNFT(formData: YodhaFormData): Promise<IPFSUploadResult> {
    console.log('Uploading Yodha NFT to IPFS via Pinata SDK:', formData.image.name, `(${(formData.image.size / 1024 / 1024).toFixed(2)} MB)`);

    // Validate file before upload
    const validation = IPFSService.validateImageFile(formData.image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    try {
      // Create FormData and send to our API route
      const uploadFormData = new FormData();
      uploadFormData.append('file', formData.image);
      uploadFormData.append('name', formData.name);
      uploadFormData.append('bio', formData.bio);
      uploadFormData.append('life_history', formData.life_history);
      uploadFormData.append('adjectives', formData.adjectives);
      uploadFormData.append('knowledge_areas', formData.knowledge_areas);

      const response = await fetch('/api/files', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Upload failed: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Upload failed: ' + (result.error || 'Unknown error'));
      }

      console.log('=== YODHA NFT UPLOAD SUCCESS ===');
      console.log('Image CID:', result.imageCid);
      console.log('Image URL:', result.imageUrl);
      console.log('Metadata CID:', result.metadataCid);
      console.log('Metadata URL:', result.metadataUrl);
      console.log('Generated Metadata:', result.metadata);
      console.log('================================');

      return {
        imageCid: result.imageCid,
        imageUrl: result.imageUrl,
        metadataCid: result.metadataCid,
        metadataUrl: result.metadataUrl,
        metadata: result.metadata,
        size: result.size
      };

    } catch (error) {
      console.error('Error uploading Yodha NFT to IPFS:', error);
      throw new Error(`IPFS upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Legacy method for backward compatibility
  async uploadImageToPinata(file: File): Promise<{ cid: string; url: string; size: number }> {
    const formData: YodhaFormData = {
      name: "Legacy Upload",
      bio: "Image uploaded without metadata",
      life_history: "N/A",
      adjectives: "N/A", 
      knowledge_areas: "N/A",
      image: file
    };
    
    const result = await this.uploadYodhaNFT(formData);
    return {
      cid: result.imageCid,
      url: result.imageUrl,
      size: result.size
    };
  }

  // Helper method to get gateway URL from CID
  static getGatewayUrl(cid: string): string {
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }

  // Helper method to validate image file
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.'
      };
    }

    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File too large. Please upload an image smaller than 10MB.'
      };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const ipfsService = new IPFSService();
