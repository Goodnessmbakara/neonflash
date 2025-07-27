import { ENVIRONMENT_CONFIG } from '../config/environment';

export interface OrcaSwapParams {
  amountIn: string; // Amount in USDC (6 decimals)
  tokenInMint: string; // USDC mint address
  tokenOutMint: string; // SAMO mint address
  contractAddress: string; // Flash loan contract address
  userAddress: string; // User's wallet address
  solanaAddress?: string; // Optional: User's Solana address derived from MetaMask
}

export class OrcaInstructionBuilder {
  private neonEvmProgramId: string = '';
  private contractPublicKey: string = '';

  setParams(neonEvmProgramId: string, contractPublicKey: string) {
    this.neonEvmProgramId = neonEvmProgramId;
    this.contractPublicKey = contractPublicKey;
  }

  async buildOrcaSwapInstructions(params: OrcaSwapParams): Promise<any[]> {
    console.log('=== BUILDING ORCA SWAP INSTRUCTIONS (REFERENCE IMPLEMENTATION) ===');
    console.log('Amount In:', params.amountIn, 'USDC');
    console.log('Token In Mint:', params.tokenInMint);
    console.log('Token Out Mint:', params.tokenOutMint);
    console.log('Contract Address:', params.contractAddress);
    console.log('User Address:', params.userAddress);
    console.log('Solana Address:', params.solanaAddress);

    // Build-time check
    if (typeof window === 'undefined') {
      throw new Error('Orca instruction building must be done client-side');
    }

    // Check for Solana private key (like reference implementation's ANCHOR_WALLET)
    const solanaPrivateKey = process.env.NEXT_PUBLIC_SOLANA_PRIVATE_KEY;
    if (!solanaPrivateKey) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable is required for Orca instruction building. Please add your Solana private key to .env.local');
    }

    console.log('Using Solana private key from environment (like reference implementation)');

    // Import Solana SDKs (these are now properly configured in next.config.mjs)
    const web3 = await import('@solana/web3.js');
    const splToken = await import('@solana/spl-token');
    const anchor = await import('@coral-xyz/anchor');
    const whirlpools = await import('@orca-so/whirlpools-sdk');
    const commonSdk = await import('@orca-so/common-sdk');
    const decimal = await import('decimal.js');

    // Create connection exactly like reference implementation
    const connection = new web3.default.Connection(ENVIRONMENT_CONFIG.SOLANA.RPC_URL, 'confirmed');
    
    // Create real wallet from private key (like reference implementation)
    let wallet;
    try {
      // Parse private key (support both base58 and hex formats)
      let privateKeyBytes: Uint8Array;
      if (solanaPrivateKey.startsWith('[') || solanaPrivateKey.includes(',')) {
        // Array format: [1,2,3,...]
        privateKeyBytes = new Uint8Array(JSON.parse(solanaPrivateKey));
      } else if (solanaPrivateKey.length === 88) {
        // Base58 format - use Buffer directly
        privateKeyBytes = new Uint8Array(Buffer.from(solanaPrivateKey, 'base64'));
      } else if (solanaPrivateKey.startsWith('0x')) {
        // Hex format
        privateKeyBytes = new Uint8Array(Buffer.from(solanaPrivateKey.slice(2), 'hex'));
      } else {
        // Assume hex without 0x
        privateKeyBytes = new Uint8Array(Buffer.from(solanaPrivateKey, 'hex'));
      }

      const keypair = web3.Keypair.fromSecretKey(privateKeyBytes);
      console.log('Created real Solana keypair from private key:', keypair.publicKey.toBase58());

      wallet = {
        publicKey: keypair.publicKey,
        signTransaction: async (tx: any) => {
          // For instruction building only - actual signing happens in Neon EVM contract
          console.log('Instruction building: Using real keypair for transaction structure');
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          // For instruction building only - actual signing happens in Neon EVM contract
          console.log('Instruction building: Using real keypair for transaction structure');
          return txs;
        }
      };
    } catch (error) {
      console.error('Failed to create Solana keypair from private key:', error);
      throw new Error(`Invalid Solana private key format. Please check your NEXT_PUBLIC_SOLANA_PRIVATE_KEY environment variable. Error: ${error}`);
    }

    // Create provider exactly like reference implementation
    const provider = new anchor.AnchorProvider(connection, wallet, {});
    const ctx = whirlpools.WhirlpoolContext.withProvider(provider, whirlpools.ORCA_WHIRLPOOL_PROGRAM_ID);
    const client = whirlpools.buildWhirlpoolClient(ctx);

    // Token configuration exactly like reference implementation
    const TokenA = { mint: new web3.default.PublicKey(params.tokenInMint), decimals: 6 }; // devUSDC
    const TokenB = { mint: new web3.default.PublicKey(params.tokenOutMint), decimals: 9 }; // devSAMO
    const tickSpacing = 64;

    // Get whirlpool pubkey exactly like reference implementation
    const whirlpool_pubkey = whirlpools.PDAUtil.getWhirlpool(
      whirlpools.ORCA_WHIRLPOOL_PROGRAM_ID,
      new web3.default.PublicKey(ENVIRONMENT_CONFIG.ORCA.WHIRLPOOLS_CONFIG),
      TokenB.mint,
      TokenA.mint,
      tickSpacing
    ).publicKey;

    console.log('Whirlpool pubkey:', whirlpool_pubkey.toBase58());
    console.log('Whirlpools config:', ENVIRONMENT_CONFIG.ORCA.WHIRLPOOLS_CONFIG);
    console.log('Token A (USDC):', TokenA.mint.toBase58());
    console.log('Token B (SAMO):', TokenB.mint.toBase58());
    console.log('Tick spacing:', tickSpacing);

    // Get whirlpool exactly like reference implementation (no fallback)
    console.log('Attempting to fetch whirlpool from Solana with real wallet...');
    const whirlpool = await client.getPool(whirlpool_pubkey);
    console.log('Whirlpool fetched successfully with real wallet');

    // Get associated token addresses exactly like reference implementation
    const ataContractTokenA = await splToken.getAssociatedTokenAddress(
      TokenA.mint,
      new web3.default.PublicKey(params.contractAddress),
      true
    );

    const ataContractTokenB = await splToken.getAssociatedTokenAddress(
      TokenB.mint,
      new web3.default.PublicKey(params.contractAddress),
      true
    );

    // Calculate PDA exactly like reference implementation
    const contractPDAdevUSDC = (await this.calculatePdaAccount(
      'ContractData',
      params.tokenInMint,
      params.contractAddress,
      new web3.default.PublicKey(this.neonEvmProgramId)
    ))[0];
    console.log('Contract PDA devUSDC:', contractPDAdevUSDC.toBase58());

    // Convert amount to Decimal exactly like reference implementation
    const amountIn = new decimal.Decimal(params.amountIn);

    // First swap: USDC -> SAMO (exactly like reference implementation)
    console.log('Building first swap: USDC -> SAMO');
    const quote1 = await whirlpools.swapQuoteByInputToken(
      whirlpool,
      TokenA.mint,
      commonSdk.DecimalUtil.toBN(amountIn, TokenA.decimals),
      commonSdk.Percentage.fromFraction(0, 1000), // 0 slippage
      ctx.program.programId,
      ctx.fetcher,
      whirlpools.IGNORE_CACHE
    );

    console.log("First swap - estimatedAmountIn:", commonSdk.DecimalUtil.fromBN(quote1.estimatedAmountIn, TokenA.decimals).toString(), "TokenA");
    console.log("First swap - estimatedAmountOut:", commonSdk.DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString(), "TokenB");
    console.log("First swap - otherAmountThreshold:", commonSdk.DecimalUtil.fromBN(quote1.otherAmountThreshold, TokenB.decimals).toString(), "TokenB");

    const swaps = [];
    swaps[0] = whirlpools.WhirlpoolIx.swapIx(
      ctx.program,
      whirlpools.SwapUtils.getSwapParamsFromQuote(
        quote1,
        ctx,
        whirlpool,
        ataContractTokenA,
        ataContractTokenB,
        new web3.default.PublicKey(params.contractAddress)
      )
    );

    // Second swap: SAMO -> USDC (exactly like reference implementation)
    console.log('Building second swap: SAMO -> USDC');
    const quote2 = await whirlpools.swapQuoteByInputToken(
      whirlpool,
      TokenB.mint,
      commonSdk.DecimalUtil.toBN(new decimal.Decimal(commonSdk.DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString()), TokenB.decimals),
      commonSdk.Percentage.fromFraction(5, 1000), // 5% slippage (5/1000 = 0.5%)
      ctx.program.programId,
      ctx.fetcher,
      whirlpools.IGNORE_CACHE
    );

    console.log("Second swap - estimatedAmountIn:", commonSdk.DecimalUtil.fromBN(quote2.estimatedAmountIn, TokenB.decimals).toString(), "TokenB");
    console.log("Second swap - estimatedAmountOut:", commonSdk.DecimalUtil.fromBN(quote2.estimatedAmountOut, TokenA.decimals).toString(), "TokenA");
    console.log("Second swap - otherAmountThreshold:", commonSdk.DecimalUtil.fromBN(quote2.otherAmountThreshold, TokenA.decimals).toString(), "TokenA");

    swaps[1] = whirlpools.WhirlpoolIx.swapIx(
      ctx.program,
      whirlpools.SwapUtils.getSwapParamsFromQuote(
        quote2,
        ctx,
        whirlpool,
        ataContractTokenB,
        contractPDAdevUSDC,
        new web3.default.PublicKey(params.contractAddress)
      )
    );

    console.log('Orca swap instructions built successfully with real Solana wallet (matching reference implementation)');
    return swaps;
  }

  prepareInstruction(instruction: any): string {
    // This method should serialize the instruction exactly like the reference implementation
    // For now, return a placeholder that matches the reference implementation format
    console.log('Preparing instruction for flash loan contract...');
    
    // The reference implementation uses config.utils.prepareInstruction
    // We need to implement the same serialization logic here
    return '0x' + Buffer.from(instruction.data).toString('hex');
  }

  private async calculatePdaAccount(
    prefix: string,
    tokenEvmAddress: string,
    contractAddress: string,
    neonEvmProgram: any
  ): Promise<[any, number]> {
    // This should match the reference implementation's calculatePdaAccount function
    // For now, return a placeholder
    const web3 = await import('@solana/web3.js');
    const seeds = [
      Buffer.from(prefix),
      Buffer.from(tokenEvmAddress.slice(2), 'hex'), // Remove '0x' prefix
      Buffer.from(contractAddress.slice(2), 'hex'), // Remove '0x' prefix
    ];
    
    return web3.default.PublicKey.findProgramAddressSync(seeds, neonEvmProgram);
  }
} 