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

    // Get the Game Master private key from environment (same as Chaavani)
    const privateKey = process.env.NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ NEXT_PUBLIC_GAME_MASTER_PRIVATE_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'Server configuration error: Missing Game Master private key' },
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

    // Sign with Game Master private key (same as Chaavani activation)
    const gameMasterKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const account = privateKeyToAccount(gameMasterKey as `0x${string}`);
    const signature = await account.signMessage({
      message: { raw: messageHash }
    });

    console.log('✅ Traits signed successfully with Game Master key');
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