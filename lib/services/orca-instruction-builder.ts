import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { Connection, PublicKey, TransactionInstruction } from '@solana/web3.js';
import { WhirlpoolContext, buildWhirlpoolClient, ORCA_WHIRLPOOL_PROGRAM_ID, PDAUtil, swapQuoteByInputToken, IGNORE_CACHE, WhirlpoolIx, SwapUtils } from '@orca-so/whirlpools-sdk';
import { DecimalUtil, Percentage } from '@orca-so/common-sdk';
import { Decimal } from 'decimal.js';

export interface OrcaSwapParams {
  amountIn: bigint;
  contractNeonAddress: string; // Contract's Neon address (not user's)
  flashLoanContract: ethers.Contract; // Flash loan contract instance
  usdcContract: ethers.Contract; // USDC contract instance
}

export interface OrcaSwapInstructions {
  instructionData1: string;
  instructionData2: string;
  estimatedProfit: bigint;
}

export class OrcaInstructionBuilder {
  private static readonly ORCA_WHIRLPOOL_PROGRAM_ID = CONTRACT_ADDRESSES.SOLANA_DEVNET.ORCA_WHIRLPOOL_PROGRAM;
  private static readonly WHIRLPOOLS_CONFIG = CONTRACT_ADDRESSES.SOLANA_DEVNET.WHIRLPOOLS_CONFIG;
  private static readonly TICK_SPACING = 64;
  private static readonly SOLANA_RPC = 'https://api.devnet.solana.com';

  /**
   * Build Orca Whirlpool swap instructions matching the reference implementation
   * This builds instructions for the CONTRACT to execute, not the user
   */
  static async buildOrcaSwapInstructions(
    params: OrcaSwapParams
  ): Promise<OrcaSwapInstructions> {
    try {
      // Connect to Solana Devnet
      const connection = new Connection(this.SOLANA_RPC, 'processed');
      
      // Get Neon EVM params for PDA calculation
      const neon_getEvmParamsRequest = await fetch("https://devnet.neonevm.org", {
        method: 'POST',
        body: JSON.stringify({"method":"neon_getEvmParams","params":[],"id":1,"jsonrpc":"2.0"}),
        headers: { 'Content-Type': 'application/json' }
      });
      const neon_getEvmParams = await neon_getEvmParamsRequest.json();

      // Whirlpool context (we don't need user wallet for instruction building)
      const ctx = WhirlpoolContext.withProvider({
        connection,
        wallet: {
          publicKey: new PublicKey(params.contractNeonAddress),
          signTransaction: async () => { throw new Error('Not needed for instruction building'); },
          signAllTransactions: async () => { throw new Error('Not needed for instruction building'); },
        },
      }, new PublicKey(this.ORCA_WHIRLPOOL_PROGRAM_ID));
      const client = buildWhirlpoolClient(ctx);

      // Token mints (same as reference)
      const TokenA = { mint: new PublicKey(CONTRACT_ADDRESSES.SOLANA_DEVNET.USDC_MINT), decimals: 6 }; // devUSDC
      const TokenB = { mint: new PublicKey(CONTRACT_ADDRESSES.SOLANA_DEVNET.SAMO_MINT), decimals: 9 }; // devSAMO
      const tickSpacing = this.TICK_SPACING;

      // Whirlpool address (same as reference)
      const whirlpool_pubkey = PDAUtil.getWhirlpool(
        new PublicKey(this.ORCA_WHIRLPOOL_PROGRAM_ID),
        new PublicKey(this.WHIRLPOOLS_CONFIG),
        TokenB.mint,
        TokenA.mint,
        tickSpacing
      ).publicKey;
      const whirlpool = await client.getPool(whirlpool_pubkey);

      // Associated token accounts for CONTRACT (not user)
      const ataContractTokenA = await this.getAssociatedTokenAddress(
        TokenA.mint,
        new PublicKey(params.contractNeonAddress),
        true
      );
      const ataContractTokenB = await this.getAssociatedTokenAddress(
        TokenB.mint,
        new PublicKey(params.contractNeonAddress),
        true
      );

      // Contract PDA for USDC (same as reference)
      const contractPDAdevUSDC = this.calculatePdaAccount(
        'ContractData',
        await params.usdcContract.getAddress(),
        await params.flashLoanContract.getAddress(),
        new PublicKey(neon_getEvmParams.result.neonEvmProgramId)
      )[0];
      console.log('Contract PDA for USDC:', contractPDAdevUSDC.toString());

      // Convert amount to Decimal (same as reference)
      const amountInDecimal = new Decimal(params.amountIn.toString()).div(new Decimal(10 ** TokenA.decimals));

      // 1. USDC -> SAMO swap (same as reference)
      const quote1 = await swapQuoteByInputToken(
        whirlpool,
        TokenA.mint,
        DecimalUtil.toBN(amountInDecimal, TokenA.decimals),
        Percentage.fromFraction(0, 1000), // 0 slippage
        ctx.program.programId,
        ctx.fetcher,
        IGNORE_CACHE
      );

      console.log("estimatedAmountIn:", DecimalUtil.fromBN(quote1.estimatedAmountIn, TokenA.decimals).toString(), "TokenA");
      console.log("estimatedAmountOut:", DecimalUtil.fromBN(quote1.estimatedAmountOut, TokenB.decimals).toString(), "TokenB");

      const swap1 = WhirlpoolIx.swapIx(
        ctx.program,
        SwapUtils.getSwapParamsFromQuote(
          quote1,
          ctx,
          whirlpool,
          ataContractTokenA,
          ataContractTokenB,
          new PublicKey(params.contractNeonAddress)
        )
      );

      // 2. SAMO -> USDC swap (same as reference)
      const quote2 = await swapQuoteByInputToken(
        whirlpool,
        TokenB.mint,
        quote1.estimatedAmountOut,
        Percentage.fromFraction(5, 1000), // 5% slippage
        ctx.program.programId,
        ctx.fetcher,
        IGNORE_CACHE
      );

      console.log("estimatedAmountIn:", DecimalUtil.fromBN(quote2.estimatedAmountIn, TokenB.decimals).toString(), "TokenB");
      console.log("estimatedAmountOut:", DecimalUtil.fromBN(quote2.estimatedAmountOut, TokenA.decimals).toString(), "TokenA");

      const swap2 = WhirlpoolIx.swapIx(
        ctx.program,
        SwapUtils.getSwapParamsFromQuote(
          quote2,
          ctx,
          whirlpool,
          ataContractTokenB,
          contractPDAdevUSDC,
          new PublicKey(params.contractNeonAddress)
        )
      );

      // Prepare instructions using the same encoding as reference
      const instructionData1 = this.prepareInstruction(swap1);
      const instructionData2 = this.prepareInstruction(swap2);

      // Estimate profit
      const estimatedProfit = quote2.estimatedAmountOut.sub(DecimalUtil.toBN(amountInDecimal, TokenA.decimals));

      return {
        instructionData1,
        instructionData2,
        estimatedProfit: BigInt(estimatedProfit.toString()),
      };
    } catch (error) {
      console.error('Error building Orca instructions:', error);
      throw error;
    }
  }

  /**
   * Prepare instruction using the same encoding as reference implementation
   */
  private static prepareInstruction(instruction: TransactionInstruction): string {
    // Encode program ID as bytes32
    const programIdBytes = this.publicKeyToBytes32(instruction.programId.toBase58());
    
    // Encode accounts with metadata
    const accountsBytes = this.prepareInstructionAccounts(instruction);
    
    // Encode instruction data
    const dataBytes = this.prepareInstructionData(instruction);
    
    return programIdBytes + accountsBytes.substring(2) + dataBytes.substring(2);
  }

  /**
   * Encode public key as bytes32 (same as reference)
   */
  private static publicKeyToBytes32(pubkey: string): string {
    return ethers.zeroPadValue(ethers.toBeHex(ethers.decodeBase58(pubkey)), 32);
  }

  /**
   * Prepare instruction accounts (same as reference)
   */
  private static prepareInstructionAccounts(instruction: TransactionInstruction): string {
    let encodeKeys = '';
    for (let i = 0; i < instruction.keys.length; i++) {
      const key = instruction.keys[i];
      encodeKeys += this.publicKeyToBytes32(key.pubkey.toString()).substring(2);
      encodeKeys += ethers.solidityPacked(["bool"], [key.isSigner]).substring(2);
      encodeKeys += ethers.solidityPacked(["bool"], [key.isWritable]).substring(2);
    }
    return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.keys.length), 8).substring(2) + encodeKeys;
  }

  /**
   * Prepare instruction data (same as reference)
   */
  private static prepareInstructionData(instruction: TransactionInstruction): string {
    const packedInstructionData = ethers.solidityPacked(["bytes"], [instruction.data]).substring(2);
    return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.data.length), 8).substring(2) + packedInstructionData;
  }

  /**
   * Calculate PDA account (same as reference)
   */
  private static calculatePdaAccount(prefix: string, tokenEvmAddress: string, salt: string, neonEvmProgram: PublicKey): [PublicKey, number] {
    const neonContractAddressBytes = Buffer.from(this.isValidHex(tokenEvmAddress) ? tokenEvmAddress.replace(/^0x/i, '') : tokenEvmAddress, 'hex');
    const seed = [
      new Uint8Array([0x03]),
      new Uint8Array(Buffer.from(prefix, 'utf-8')),
      new Uint8Array(neonContractAddressBytes),
      Buffer.from(Buffer.concat([Buffer.alloc(12), Buffer.from(this.isValidHex(salt) ? salt.substring(2) : salt, 'hex')]), 'hex')
    ];
    return PublicKey.findProgramAddressSync(seed, neonEvmProgram);
  }

  /**
   * Validate hex string (same as reference)
   */
  private static isValidHex(hex: string): boolean {
    const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
    if (!isHexStrict) {
      throw new Error(`Given value "${hex}" is not a valid hex string.`);
    }
    return isHexStrict;
  }

  /**
   * Get associated token address (ATA)
   */
  private static async getAssociatedTokenAddress(mint: PublicKey, owner: PublicKey, allowOwnerOffCurve: boolean = true): Promise<PublicKey> {
    const { getAssociatedTokenAddress } = await import('@solana/spl-token');
    return getAssociatedTokenAddress(mint, owner, allowOwnerOffCurve);
  }
} 