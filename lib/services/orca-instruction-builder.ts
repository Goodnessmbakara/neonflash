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

    // Dynamic imports to avoid SSR issues
    const web3 = (await import('@solana/web3.js')).default;
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    const { AnchorProvider } = await import('@coral-xyz/anchor');
    const { 
      WhirlpoolContext, 
      buildWhirlpoolClient, 
      ORCA_WHIRLPOOL_PROGRAM_ID, 
      PDAUtil, 
      swapQuoteByInputToken, 
      IGNORE_CACHE, 
      WhirlpoolIx, 
      SwapUtils 
    } = await import('@orca-so/whirlpools-sdk');
    const { DecimalUtil, Percentage } = await import('@orca-so/common-sdk');
    const { Decimal } = await import('decimal.js');

    // Build-time check
    if (typeof window === 'undefined') {
      throw new Error('Orca instruction building must be done client-side');
    }

    // Create connection and provider exactly like reference implementation
    const connection = new web3.Connection(ENVIRONMENT_CONFIG.SOLANA.RPC_URL, 'confirmed');
    
    // Use real Solana address for instruction building (matching reference implementation)
    let wallet;
    if (params.solanaAddress) {
      console.log('Using real Solana address for instruction building:', params.solanaAddress);
      const realPublicKey = new web3.PublicKey(params.solanaAddress);
      wallet = {
        publicKey: realPublicKey,
        signTransaction: async (tx: any) => {
          // For instruction building only - actual signing happens in Neon EVM contract
          console.log('Instruction building: Using real public key for transaction structure');
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          // For instruction building only - actual signing happens in Neon EVM contract
          console.log('Instruction building: Using real public key for transaction structure');
          return txs;
        }
      };
    } else {
      console.log('Using dummy keypair for instruction building (fallback)');
      const dummyKeypair = web3.Keypair.generate();
      wallet = {
        publicKey: dummyKeypair.publicKey,
        signTransaction: async (tx: any) => {
          // This is only for instruction building, not actual signing
          tx.sign(dummyKeypair);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          // This is only for instruction building, not actual signing
          txs.forEach(tx => tx.sign(dummyKeypair));
          return txs;
        }
      };
    }

    // Create provider exactly like reference implementation
    const provider = new AnchorProvider(connection, wallet, {});
    const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
    const client = buildWhirlpoolClient(ctx);

    // Token configuration exactly like reference implementation
    const TokenA = { mint: new web3.PublicKey(params.tokenInMint), decimals: 6 }; // devUSDC
    const TokenB = { mint: new web3.PublicKey(params.tokenOutMint), decimals: 9 }; // devSAMO
    const tickSpacing = 64;

    // Get whirlpool pubkey exactly like reference implementation
    const whirlpool_pubkey = PDAUtil.getWhirlpool(
      ORCA_WHIRLPOOL_PROGRAM_ID,
      new web3.PublicKey(ENVIRONMENT_CONFIG.ORCA.WHIRLPOOLS_CONFIG),
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
    console.log('Attempting to fetch whirlpool from Solana...');
    const whirlpool = await client.getPool(whirlpool_pubkey);
    console.log('Whirlpool fetched successfully');

    // Get associated token addresses exactly like reference implementation
    const ataContractTokenA = await getAssociatedTokenAddress(
      TokenA.mint,
      new web3.PublicKey(params.contractAddress),
      true
    );

    const ataContractTokenB = await getAssociatedTokenAddress(
      TokenB.mint,
      new web3.PublicKey(params.contractAddress),
      true
    );

    // Calculate PDA exactly like reference implementation
    const contractPDAdevUSDC = (await this.calculatePdaAccount(
      'ContractData',
      params.tokenInMint,
      params.contractAddress,
      new web3.PublicKey(this.neonEvmProgramId)
    ))[0];
    console.log('Contract PDA devUSDC:', contractPDAdevUSDC.toBase58());

    // Convert amount to Decimal exactly like reference implementation
    const amountIn = new Decimal(params.amountIn);

    // First swap: USDC -> SAMO (exactly like reference implementation)
    console.log('Building first swap: USDC -> SAMO');
    const quote1 = await swapQuoteByInputToken(
      whirlpool,
      TokenA.mint,
      DecimalUtil.toBN(amountIn, TokenA.decimals),
      Percentage.fromFraction(0, 1000), // 0 slippage
      ctx.program.programId,
      ctx.fetcher,
      IGNORE_CACHE
    );

    console.log("First swap - estimatedAmountIn:", DecimalUtil.fromBN(quote1.estimatedAmountIn, TokenA.decimals).toString(), "TokenA");
    console.log("First swap - estimatedAmountOut:", DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString(), "TokenB");
    console.log("First swap - otherAmountThreshold:", DecimalUtil.fromBN(quote1.otherAmountThreshold, TokenB.decimals).toString(), "TokenB");

    const swaps = [];
    swaps[0] = WhirlpoolIx.swapIx(
      ctx.program,
      SwapUtils.getSwapParamsFromQuote(
        quote1,
        ctx,
        whirlpool,
        ataContractTokenA,
        ataContractTokenB,
        new web3.PublicKey(params.contractAddress)
      )
    );

    // Second swap: SAMO -> USDC (exactly like reference implementation)
    console.log('Building second swap: SAMO -> USDC');
    const quote2 = await swapQuoteByInputToken(
      whirlpool,
      TokenB.mint,
      DecimalUtil.toBN(new Decimal(DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString()), TokenB.decimals),
      Percentage.fromFraction(5, 1000), // 5% slippage (5/1000 = 0.5%)
      ctx.program.programId,
      ctx.fetcher,
      IGNORE_CACHE
    );

    console.log("Second swap - estimatedAmountIn:", DecimalUtil.fromBN(quote2.estimatedAmountIn, TokenB.decimals).toString(), "TokenB");
    console.log("Second swap - estimatedAmountOut:", DecimalUtil.fromBN(quote2.estimatedAmountOut, TokenA.decimals).toString(), "TokenA");
    console.log("Second swap - otherAmountThreshold:", DecimalUtil.fromBN(quote2.otherAmountThreshold, TokenA.decimals).toString(), "TokenA");

    swaps[1] = WhirlpoolIx.swapIx(
      ctx.program,
      SwapUtils.getSwapParamsFromQuote(
        quote2,
        ctx,
        whirlpool,
        ataContractTokenB,
        contractPDAdevUSDC,
        new web3.PublicKey(params.contractAddress)
      )
    );

    console.log('Orca swap instructions built successfully (matching reference implementation)');
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
    const web3 = (await import('@solana/web3.js')).default;
    const seeds = [
      Buffer.from(prefix),
      Buffer.from(tokenEvmAddress.slice(2), 'hex'), // Remove '0x' prefix
      Buffer.from(contractAddress.slice(2), 'hex'), // Remove '0x' prefix
    ];
    
    return web3.PublicKey.findProgramAddressSync(seeds, neonEvmProgram);
  }
} 