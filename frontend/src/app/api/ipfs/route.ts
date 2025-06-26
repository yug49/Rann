import { NextRequest, NextResponse } from 'next/server';

const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs.io/ipfs/',
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const cid = searchParams.get('cid');

    if (!cid) {
      return NextResponse.json(
        { error: 'Missing CID parameter' },
        { status: 400 }
      );
    }

    // Validate CID format (basic check)
    if (!/^[a-zA-Z0-9]+$/.test(cid)) {
      return NextResponse.json(
        { error: 'Invalid CID format' },
        { status: 400 }
      );
    }

    // Try multiple gateways
    let lastError: Error | null = null;
    
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      const gateway = IPFS_GATEWAYS[i];
      const url = `${gateway}${cid}`;
      
      try {
        console.log(`Attempting to fetch from gateway ${i + 1}: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json, image/*, */*',
            'User-Agent': 'Mozilla/5.0 (compatible; IPFS-Proxy/1.0)',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Get content type
        const contentType = response.headers.get('content-type') || '';
        
        if (contentType.includes('application/json')) {
          // Return JSON data
          const data = await response.json();
          console.log(`Success with gateway ${i + 1}`);
          return NextResponse.json(data);
        } else if (contentType.startsWith('image/')) {
          // Return image as blob/buffer
          const arrayBuffer = await response.arrayBuffer();
          console.log(`Success with gateway ${i + 1} (image)`);
          return new NextResponse(arrayBuffer, {
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
            },
          });
        } else {
          // Try to parse as JSON anyway
          const text = await response.text();
          try {
            const data = JSON.parse(text);
            console.log(`Success with gateway ${i + 1} (parsed text as JSON)`);
            return NextResponse.json(data);
          } catch {
            // Return as text if not JSON
            console.log(`Success with gateway ${i + 1} (text)`);
            return new NextResponse(text, {
              headers: {
                'Content-Type': contentType || 'text/plain',
                'Cache-Control': 'public, max-age=86400',
              },
            });
          }
        }
        
      } catch (error) {
        console.warn(`Failed to fetch from gateway ${i + 1} (${gateway}):`, error);
        lastError = error as Error;
        
        // Continue to next gateway if not the last one
        if (i < IPFS_GATEWAYS.length - 1) {
          continue;
        }
      }
    }
    
    // If all gateways failed
    throw lastError || new Error('All IPFS gateways failed');
    
  } catch (error) {
    console.error('IPFS proxy error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch from IPFS', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cid } = body;

    if (!cid) {
      return NextResponse.json(
        { error: 'Missing CID in request body' },
        { status: 400 }
      );
    }

    // Validate CID format (basic check)
    if (!/^[a-zA-Z0-9]+$/.test(cid)) {
      return NextResponse.json(
        { error: 'Invalid CID format' },
        { status: 400 }
      );
    }

    // Try multiple gateways
    let lastError: Error | null = null;
    
    for (let i = 0; i < IPFS_GATEWAYS.length; i++) {
      const gateway = IPFS_GATEWAYS[i];
      const url = `${gateway}${cid}`;
      
      try {
        console.log(`POST: Attempting to fetch from gateway ${i + 1}: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(url, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; IPFS-Proxy/1.0)',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Parse as JSON for metadata
        const data = await response.json();
        console.log(`POST: Success with gateway ${i + 1}`);
        return NextResponse.json(data);
        
      } catch (error) {
        console.warn(`POST: Failed to fetch from gateway ${i + 1} (${gateway}):`, error);
        lastError = error as Error;
        
        // Continue to next gateway if not the last one
        if (i < IPFS_GATEWAYS.length - 1) {
          continue;
        }
      }
    }
    
    // If all gateways failed
    throw lastError || new Error('All IPFS gateways failed');
    
  } catch (error) {
    console.error('IPFS proxy POST error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch from IPFS', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
