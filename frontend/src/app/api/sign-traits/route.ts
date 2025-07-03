import { NextRequest, NextResponse } from 'next/server';
import { encodePacked, keccak256 } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

interface SignTraitsRequest {
  tokenId: number;
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
    const body: SignTraitsRequest = await request.json();
    const { tokenId, traits } = body;

    console.log('🔐 Server-side trait signing requested for token:', tokenId);
    console.log('📊 Traits to sign:', traits);

    // Validate input
    if (!tokenId || !traits) {
      return NextResponse.json(
        { error: 'Missing tokenId or traits' },
        { status: 400 }
      );
    }

    // Get the NEAR AI private key from environment
    const privateKey = process.env.NEAR_AI_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ NEAR_AI_PRIVATE_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing private key' },
        { status: 500 }
      );
    }

    // Create the message to sign (same as contract expects)
    const messageHash = keccak256(
      encodePacked(
        ['uint256', 'uint16', 'uint16', 'uint16', 'uint16', 'uint16'],
        [
          BigInt(tokenId),
          traits.strength,
          traits.wit,
          traits.charisma,
          traits.defence,
          traits.luck
        ]
      )
    );

    console.log('📝 Message hash created:', messageHash);

    // Sign with NEAR AI private key (add 0x prefix)
    const account = privateKeyToAccount(`0x${privateKey}`);
    const signature = await account.signMessage({
      message: { raw: messageHash }
    });

    console.log('✅ Traits signed successfully on server');
    console.log('📝 Signature generated:', signature);

    return NextResponse.json({
      signature,
      messageHash
    });

  } catch (error) {
    console.error('❌ Error signing traits:', error);
    return NextResponse.json(
      { error: `Failed to sign traits: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
} 