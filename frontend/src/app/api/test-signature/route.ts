import { NextRequest, NextResponse } from 'next/server';
import { keccak256, encodePacked } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface TestSignatureRequest {
  tokenId: string;
  traits: {
    strength: number;
    wit: number;
    charisma: number;
    defence: number;
    luck: number;
  };
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Starting signature test...');
    
    const body: TestSignatureRequest = await request.json();
    const { tokenId, traits } = body;
    
    if (!tokenId) {
      return NextResponse.json({ error: 'Token ID is required' }, { status: 400 });
    }

    // Get NEAR AI private key from environment
    const nearPrivateKey = process.env.NEAR_AI_PRIVATE_KEY;
    if (!nearPrivateKey) {
      return NextResponse.json({ error: 'NEAR_AI_PRIVATE_KEY not configured' }, { status: 500 });
    }

    console.log(`🎯 Testing signature for Token ID: ${tokenId}`);
    console.log(`📊 Traits: ${JSON.stringify(traits)}`);

    // Create account from private key
    const formattedKey = nearPrivateKey.startsWith('0x') ? nearPrivateKey : `0x${nearPrivateKey}`;
    const account = privateKeyToAccount(formattedKey as `0x${string}`);
    
    console.log(`🔐 NEAR AI Signer Address: ${account.address}`);

    // Generate the packed data hash (matching Gurukul.sol format)
    const packedData = encodePacked(
      ['uint256', 'uint8', 'uint8', 'uint8', 'uint8', 'uint8'],
      [
        BigInt(tokenId),
        traits.strength,
        traits.wit,
        traits.charisma,
        traits.defence,
        traits.luck
      ]
    );

    console.log(`📦 Packed Data: ${packedData}`);

    // Create message hash
    const messageHash = keccak256(packedData);
    console.log(`🔗 Message Hash: ${messageHash}`);

    // Sign the message hash (this will automatically add the Ethereum signed message prefix)
    const signature = await account.signMessage({ 
      message: { raw: messageHash }
    });

    console.log(`✍️ Generated Signature: ${signature}`);

    // Extract v, r, s components for verification
    const r = signature.slice(0, 66);
    const s = '0x' + signature.slice(66, 130);
    const v = parseInt(signature.slice(130, 132), 16);

    console.log(`🔧 Signature Components:`);
    console.log(`   r: ${r}`);
    console.log(`   s: ${s}`);
    console.log(`   v: ${v}`);

    // Return comprehensive test data
    return NextResponse.json({
      success: true,
      test: {
        tokenId,
        traits,
        signerAddress: account.address,
        packedData,
        messageHash,
        signature,
        components: { r, s, v },
        contractExpectedFormat: {
          messageHash,
          signature,
          expectedSigner: account.address
        },
        verification: {
          step1: "Contract will keccak256(abi.encodePacked(tokenId, strength, wit, charisma, defence, luck))",
          step2: "Contract will use MessageHashUtils.toEthSignedMessageHash(messageHash)",
          step3: "Contract will ECDSA.recover(ethSignedMessageHash, signature)",
          step4: `Should recover to: ${account.address}`,
          note: "Our viem signMessage automatically adds the Ethereum signed message prefix"
        }
      }
    });

  } catch (error) {
    console.error('❌ Signature test failed:', error);
    return NextResponse.json({ 
      error: 'Signature test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 