import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { CONFIG } from '@/lib/config';

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt === maxRetries) {
        throw error;
      }
      // Check if it's a rate limit error
      if (error.message?.includes('rate limit') || error.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      // For other errors, don't retry
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export async function POST(req: NextRequest) {
  try {
    const { address, chain } = await req.json();
    if (!address || !chain) {
      return NextResponse.json({ error: 'Missing address or chain' }, { status: 400 });
    }

    if (chain === 'neon') {
      // Neon Faucet API with retry logic and balance check
      const rpcUrl = CONFIG.networks.ethereum.devnet.rpcUrl;
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      let before = null;
      let after = null;
      try {
        before = (await provider.getBalance(address)).toString();
      } catch (e) {
        console.error('Error fetching NEON balance before airdrop:', e);
      }
      try {
        await retryWithBackoff(async () => {
          const newLocal = 'https://api.neonfaucet.org/request_neon';
          console.log('Neon faucet request:', {
            url: newLocal,
            body: { wallet: address, amount: 100 },
          });
          const faucetRes = await fetch('https://api.neonfaucet.org/request_neon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: address, amount: 100 }),
          });
          console.log('Neon faucet response status:', faucetRes.status);
          console.log('Neon faucet response headers:', Object.fromEntries(faucetRes.headers.entries()));
          const text = await faucetRes.text();
          console.log('Neon faucet response body:', text);
          if (!faucetRes.ok) {
            console.error('Neon faucet error response:', text);
            if (faucetRes.status === 429) {
              throw new Error('rate limit');
            }
            throw new Error(`Neon faucet error: ${faucetRes.status} ${text}`);
          }
          // Treat 200/empty as success
          return true;
        });
        // Wait a moment for the balance to update
        await new Promise(res => setTimeout(res, 2000));
        after = (await provider.getBalance(address)).toString();
        return NextResponse.json({ success: true, before, after });
      } catch (error: any) {
        console.error('Neon faucet failed after retries:', error);
        // Try to get after balance even on error
        try {
          after = (await provider.getBalance(address)).toString();
        } catch (e) {
          console.error('Error fetching NEON balance after airdrop:', e);
        }
        return NextResponse.json({ 
          error: error.message || 'Neon faucet error after retries',
          before,
          after
        }, { status: 500 });
      }
    }

    if (chain === 'neon-usdc') {
      // USDC airdrop for Neon EVM
      try {
        const rpcUrl = CONFIG.networks.ethereum.devnet.rpcUrl;
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Create a signer (this would need to be a funded account in production)
        // For now, we'll use a simple approach
        const usdcContractAddress = '0x146c38c2E36D34Ed88d843E013677cCe72341794';
        
        // Note: In a real implementation, you'd need a funded account to mint USDC
        // For now, we'll return a message indicating the user needs to get USDC elsewhere
        return NextResponse.json({ 
          success: false, 
          message: 'USDC airdrop not available. Please get USDC from a DEX or faucet.',
          usdcContractAddress 
        });
      } catch (error: any) {
        console.error('USDC airdrop error:', error);
        return NextResponse.json({ 
          error: error.message || 'USDC airdrop failed' 
        }, { status: 500 });
      }
    }

    if (chain === 'solana') {
      // Solana devnet airdrop
      const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      const pubkey = new PublicKey(address);
      const sig = await connection.requestAirdrop(pubkey, 1_000_000_000); // 1 SOL
      return NextResponse.json({ success: true, tx: sig });
    }

    return NextResponse.json({ error: 'Invalid chain' }, { status: 400 });
  } catch (e: any) {
    console.error('Airdrop API error:', e);
    return NextResponse.json({ error: e.message || 'Airdrop failed' }, { status: 500 });
  }
} 