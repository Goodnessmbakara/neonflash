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
        
        // USDC contract address
        const usdcContractAddress = '0x146c38c2E36D34Ed88d843E013677cCe72341794';
        
        // USDC contract ABI for mint function
        const usdcAbi = [
          'function mint(address to, uint256 amount) external',
          'function balanceOf(address account) external view returns (uint256)',
          'function totalSupply() external view returns (uint256)',
          'function name() external view returns (string)',
          'function symbol() external view returns (string)'
        ];
        
        const usdcContract = new ethers.Contract(usdcContractAddress, usdcAbi, provider);
        
        // Check current balance
        const beforeBalance = await usdcContract.balanceOf(address);
        console.log(`USDC balance before airdrop: ${ethers.formatUnits(beforeBalance, 6)} USDC`);
        
        // For testing, we'll try to mint some USDC
        const airdropAmount = ethers.parseUnits('1000', 6); // 1000 USDC
        
        // Try to find a funded account to mint from
        // Note: In production, you'd have a proper funded account
        const testPrivateKey = process.env.TEST_PRIVATE_KEY;
        
        if (!testPrivateKey) {
          console.log('No test private key available. Providing guidance instead.');
          return NextResponse.json({ 
            success: false, 
            message: 'USDC airdrop requires a funded account. Please get USDC from a DEX or use the minting script.',
            guidance: [
              '1. Run: node scripts/mint-usdc.js (requires PRIVATE_KEY env var)',
              '2. Visit https://neonfaucet.org/ for NEON tokens',
              '3. Use a DEX like Orca or Raydium to swap NEON for USDC',
              '4. Minimum required: ~10 USDC for flash loan fees'
            ],
            usdcContractAddress,
            requiredAmount: '10 USDC for testing'
          });
        }
        
        try {
          // Create signer with test private key
          const signer = new ethers.Wallet(testPrivateKey, provider);
          const signerAddress = await signer.getAddress();
          console.log(`Using signer address: ${signerAddress}`);
          
          // Check signer balance
          const signerBalance = await provider.getBalance(signerAddress);
          console.log(`Signer NEON balance: ${ethers.formatUnits(signerBalance, 18)} NEON`);
          
          if (signerBalance < ethers.parseEther('0.01')) {
            throw new Error('Insufficient NEON balance for gas');
          }
          
          // Create contract instance with signer
          const usdcContractWithSigner = usdcContract.connect(signer) as any;
          
          // Mint USDC
          console.log(`Minting ${ethers.formatUnits(airdropAmount, 6)} USDC to ${address}...`);
          const tx = await usdcContractWithSigner.mint(address, airdropAmount, {
            gasLimit: 200000
          });
          
          console.log(`Transaction sent: ${tx.hash}`);
          const receipt = await tx.wait();
          console.log(`Transaction confirmed: ${receipt.blockNumber}`);
          
          // Check new balance
          const afterBalance = await usdcContract.balanceOf(address);
          console.log(`USDC balance after airdrop: ${ethers.formatUnits(afterBalance, 6)} USDC`);
          
          return NextResponse.json({ 
            success: true, 
            message: `Successfully minted ${ethers.formatUnits(airdropAmount, 6)} USDC to your wallet!`,
            transactionHash: tx.hash,
            beforeBalance: ethers.formatUnits(beforeBalance, 6),
            afterBalance: ethers.formatUnits(afterBalance, 6),
            mintedAmount: ethers.formatUnits(airdropAmount, 6)
          });
          
        } catch (mintError: any) {
          console.error('USDC minting failed:', mintError);
          return NextResponse.json({ 
            success: false, 
            message: 'USDC minting failed. Please use the minting script or get USDC from a DEX.',
            error: mintError.message,
            guidance: [
              '1. Run: node scripts/mint-usdc.js (requires PRIVATE_KEY env var)',
              '2. Visit https://neonfaucet.org/ for NEON tokens',
              '3. Use a DEX like Orca or Raydium to swap NEON for USDC'
            ]
          });
        }
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