import { ethers } from 'ethers';
import * as web3 from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { Decimal } from 'decimal.js';
import { ORCA_CONFIG } from '../config/orca-config';
import { ENVIRONMENT_CONFIG } from '../config/environment';

export interface OrcaSwapInstruction {
  instructions: web3.TransactionInstruction[];
  signers: web3.Signer[];
}

export interface OrcaSwapParams {
  amountIn: string; // Amount in USDC (6 decimals)
  tokenInMint: string; // USDC mint address
  tokenOutMint: string; // SAMO mint address
  contractAddress: string; // Flash loan contract address
  userAddress: string; // User's wallet address
}

export class OrcaInstructionBuilder {
  private neonEvmProgramId: string;
  private contractPublicKey: string;

  constructor() {
    this.neonEvmProgramId = '';
    this.contractPublicKey = '';
  }

  /**
   * Set the Neon EVM program ID and contract public key
   */
  setParams(neonEvmProgramId: string, contractPublicKey: string) {
    this.neonEvmProgramId = neonEvmProgramId;
    this.contractPublicKey = contractPublicKey;
  }

  /**
   * Build Orca swap instructions exactly like the reference implementation
   */
  async buildOrcaSwapInstructions(params: OrcaSwapParams): Promise<OrcaSwapInstruction[]> {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        throw new Error('Orca instruction building is only available in browser environment');
      }

      console.log('=== BUILDING ORCA SWAP INSTRUCTIONS (REFERENCE IMPLEMENTATION) ===');
      console.log('Amount In:', params.amountIn, 'USDC');
      console.log('Token In Mint:', params.tokenInMint);
      console.log('Token Out Mint:', params.tokenOutMint);
      console.log('Contract Address:', params.contractAddress);

      const amountIn = new Decimal(params.amountIn);

      // Create provider with proper Solana connection (matching reference implementation)
      const connection = new web3.Connection(ENVIRONMENT_CONFIG.SOLANA.RPC_URL, 'confirmed');
      
      // Create a dummy wallet for instruction building only
      // Note: This is NOT the same as reference implementation
      // Reference implementation uses real private keys for direct Solana execution
      // Frontend implementation builds instructions for Neon EVM contract execution
      const dummyKeypair = web3.Keypair.generate();
      const wallet = {
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
      
      // Dynamic imports to prevent build-time issues
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

      const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

      const ctx = WhirlpoolContext.withProvider(provider, ORCA_WHIRLPOOL_PROGRAM_ID);
      const client = buildWhirlpoolClient(ctx);
      
      const TokenA = {mint: new web3.PublicKey(ENVIRONMENT_CONFIG.TOKENS.USDC_MINT), decimals: 6}; // devUSDC
      const TokenB = {mint: new web3.PublicKey(ENVIRONMENT_CONFIG.TOKENS.SAMO_MINT), decimals: 9}; // devSAMO
      const tickSpacing = ENVIRONMENT_CONFIG.ORCA.TICK_SPACING;

      const whirlpool_pubkey = PDAUtil.getWhirlpool(
          ORCA_WHIRLPOOL_PROGRAM_ID,
          new web3.PublicKey(ENVIRONMENT_CONFIG.ORCA.WHIRLPOOLS_CONFIG),
          TokenB.mint,
          TokenA.mint,
          tickSpacing
      ).publicKey;
      const whirlpool = await client.getPool(whirlpool_pubkey);
      
      const ataContractTokenA = await getAssociatedTokenAddress(
          TokenA.mint,
          new web3.PublicKey(this.contractPublicKey),
          true
      );

      const ataContractTokenB = await getAssociatedTokenAddress(
          TokenB.mint,
          new web3.PublicKey(this.contractPublicKey),
          true
      );

      const contractPDAdevUSDC = ORCA_CONFIG.utils.calculatePdaAccount(
          'ContractData',
          ORCA_CONFIG.DATA.EVM.ADDRESSES.devUSDC, // USDC.target from reference
          this.contractPublicKey, // AaveFlashLoan.target from reference
          new web3.PublicKey(this.neonEvmProgramId) // neon_getEvmParams.result.neonEvmProgramId from reference
      )[0];
      console.log(contractPDAdevUSDC.toBase58(), 'contractPDAdevUSDC');

      const quote1 = await swapQuoteByInputToken(
          whirlpool,
          TokenA.mint,
          DecimalUtil.toBN(amountIn, TokenA.decimals),
          Percentage.fromFraction(0, 1000), // 0 slippage
          ctx.program.programId,
          ctx.fetcher,
          IGNORE_CACHE
      );

      let swaps = [];
      swaps[0] = WhirlpoolIx.swapIx(
          ctx.program,
          SwapUtils.getSwapParamsFromQuote(
              quote1,
              ctx,
              whirlpool,
              ataContractTokenA,
              ataContractTokenB,
              new web3.PublicKey(this.contractPublicKey)
          )
      );

      const quote2 = await swapQuoteByInputToken(
          whirlpool,
          TokenB.mint,
          DecimalUtil.toBN(new Decimal(DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString()), TokenB.decimals),
          Percentage.fromFraction(5, 1000), // Acceptable slippage (5/1000 = 0.5%)
          ctx.program.programId,
          ctx.fetcher,
          IGNORE_CACHE
      );

      swaps[1] = WhirlpoolIx.swapIx(
          ctx.program,
          SwapUtils.getSwapParamsFromQuote(
              quote2,
              ctx,
              whirlpool,
              ataContractTokenB,
              contractPDAdevUSDC,
              new web3.PublicKey(this.contractPublicKey)
          )
      );

      console.log('=== ORCA SWAP INSTRUCTIONS BUILT SUCCESSFULLY ===');
      console.log('Note: Instructions built for Neon EVM contract execution, not direct Solana execution');
      console.log('This differs from reference implementation which executes directly on Solana');
      return swaps;

    } catch (error) {
      console.error('Error building Orca swap instructions:', error);
      throw new Error(`Failed to build Orca swap instructions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Prepare instruction for Neon EVM (using reference implementation's utils)
   */
  prepareInstruction(instruction: web3.TransactionInstruction): string {
    return ORCA_CONFIG.utils.prepareInstruction(instruction);
  }
} 