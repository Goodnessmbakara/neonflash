import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES, NETWORK_CONFIG } from '../contracts/addresses';
import { CONTRACT_ABIS, FlashLoanParams } from '../contracts/abis';
import { OrcaInstructionBuilder, OrcaSwapParams } from './orca-instruction-builder';

export interface FlashLoanStrategy {
  id: string;
  name: string;
  description: string;
  tokenIn: string;
  tokenOut: string;
  protocol: 'orca' | 'raydium' | 'jupiter';
  riskLevel: 'low' | 'medium' | 'high';
  estimatedProfit: number;
  minAmount: bigint;
  maxAmount: bigint;
}

export interface FlashLoanResult {
  success: boolean;
  transactionHash?: string;
  profit?: bigint;
  fee?: bigint;
  error?: string;
}

export class FlashLoanService {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private flashLoanContract: ethers.Contract;
  private usdcContract: ethers.Contract;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize contracts
    this.flashLoanContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.AAVE_FLASH_LOAN,
      CONTRACT_ABIS.AAVE_FLASH_LOAN,
      this.signer
    );
    
    this.usdcContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
      CONTRACT_ABIS.ERC20_FOR_SPL,
      this.signer
    );
  }

  /**
   * Get available flash loan strategies
   */
  async getStrategies(): Promise<FlashLoanStrategy[]> {
    return [
      {
        id: 'usdc-samo-usdc',
        name: 'USDC → SAMO → USDC',
        description: 'Arbitrage between USDC and SAMO using Orca Whirlpool',
        tokenIn: CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
        tokenOut: CONTRACT_ADDRESSES.SOLANA_DEVNET.SAMO_MINT,
        protocol: 'orca',
        riskLevel: 'medium',
        estimatedProfit: 0.5, // 0.5%
        minAmount: ethers.parseUnits('100', 6), // 100 USDC
        maxAmount: ethers.parseUnits('10000', 6), // 10,000 USDC
      },
      {
        id: 'usdc-sol-usdc',
        name: 'USDC → SOL → USDC',
        description: 'Arbitrage between USDC and SOL using Raydium',
        tokenIn: CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
        tokenOut: CONTRACT_ADDRESSES.SOLANA_DEVNET.SOL_MINT,
        protocol: 'raydium',
        riskLevel: 'low',
        estimatedProfit: 0.3, // 0.3%
        minAmount: ethers.parseUnits('100', 6),
        maxAmount: ethers.parseUnits('50000', 6), // 50,000 USDC
      },
      {
        id: 'usdc-jup-usdc',
        name: 'USDC → JUP → USDC',
        description: 'Arbitrage between USDC and JUP using Jupiter',
        tokenIn: CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
        tokenOut: CONTRACT_ADDRESSES.SOLANA_DEVNET.JUP_MINT,
        protocol: 'jupiter',
        riskLevel: 'high',
        estimatedProfit: 1.2, // 1.2%
        minAmount: ethers.parseUnits('100', 6),
        maxAmount: ethers.parseUnits('5000', 6), // 5,000 USDC
      },
    ];
  }

  /**
   * Execute a flash loan with the specified strategy
   * Accepts solanaProvider for real Solana instruction building (Phantom wallet)
   */
  async executeFlashLoan(
    strategyId: string,
    amount: bigint,
    slippageTolerance: number = 0.5,
    solanaProvider?: any // Phantom wallet
  ): Promise<FlashLoanResult> {
    try {
      console.log('=== FLASH LOAN EXECUTION START ===');
      console.log(`[STEP 1] Strategy ID: ${strategyId}`);
      console.log(`[STEP 1] Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`[STEP 1] Slippage Tolerance: ${slippageTolerance}%`);
      
      // Get user's wallet address for balance checking
      const userAddress = await this.signer.getAddress();
      console.log(`[STEP 1] User Wallet Address (EVM): ${userAddress}`);
      
      // Check USDC balance before execution
      console.log(`[STEP 1] Checking USDC balance for address: ${userAddress}`);
      const balance = await this.checkBalance(userAddress);
      console.log(`[STEP 1] USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
      
      // Calculate required fee
      const fee = await this.getFlashLoanFee();
      const feeAmount = (amount * fee) / BigInt(10000);
      console.log(`[STEP 1] Flash Loan Fee: ${ethers.formatUnits(feeAmount, 6)} USDC (${fee} basis points)`);
      
      if (balance < feeAmount) {
        console.log(`[STEP 1] INSUFFICIENT BALANCE: Need ${ethers.formatUnits(feeAmount, 6)} USDC for fee, have ${ethers.formatUnits(balance, 6)} USDC`);
        throw new Error(`Insufficient USDC balance. Need ${ethers.formatUnits(feeAmount, 6)} USDC for flash loan fee, but have ${ethers.formatUnits(balance, 6)} USDC`);
      }
      console.log(`[STEP 1] SUFFICIENT BALANCE: Proceeding with flash loan`);
      
      const strategies = await this.getStrategies();
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      
      console.log(`[STEP 2] Selected Strategy: ${strategy.name}`);
      console.log(`[STEP 2] Protocol: ${strategy.protocol}`);
      console.log(`[STEP 2] Token In: ${strategy.tokenIn}`);
      console.log(`[STEP 2] Token Out: ${strategy.tokenOut}`);
      console.log(`[STEP 2] Risk Level: ${strategy.riskLevel}`);
      console.log(`[STEP 2] Estimated Profit: ${strategy.estimatedProfit}%`);
      
      if (amount < strategy.minAmount || amount > strategy.maxAmount) {
        throw new Error(`Amount must be between ${ethers.formatUnits(strategy.minAmount, 6)} and ${ethers.formatUnits(strategy.maxAmount, 6)} USDC`);
      }
      
      console.log(`[STEP 3] Amount validation passed: ${ethers.formatUnits(amount, 6)} USDC is within range`);
      
      // Prepare instruction data using centralized method
      const { instructionData1, instructionData2 } = await this.prepareInstructions(
        strategy,
        amount,
        slippageTolerance,
        solanaProvider
      );
      
      // Execute flash loan
      console.log(`[STEP 5] Executing flash loan contract call...`);
      console.log(`[STEP 5] Flash Loan Contract Address: ${await this.flashLoanContract.getAddress()}`);
      console.log(`[STEP 5] USDC Contract Address: ${await this.usdcContract.getAddress()}`);
      console.log(`[STEP 5] Gas Limit: 5000000`);
      
      const tx = await this.flashLoanContract.flashLoanSimple(
        strategy.tokenIn,
        amount,
        instructionData1,
        instructionData2,
        {
          gasLimit: 5000000,
        }
      );
      
      console.log(`[STEP 5] Transaction sent! Hash: ${tx.hash}`);
      console.log(`[STEP 5] Waiting for transaction confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`[STEP 5] Transaction confirmed! Block: ${receipt.blockNumber}`);
      console.log(`[STEP 5] Gas used: ${receipt.gasUsed.toString()}`);
      console.log(`[STEP 5] Effective gas price: ${ethers.formatUnits(receipt.gasPrice || 0, 'gwei')} gwei`);
      
      console.log(`[STEP 6] Retrieving flash loan results...`);
      const lastLoan = await this.flashLoanContract.lastLoan();
      const lastLoanFee = await this.flashLoanContract.lastLoanFee();
      
      console.log(`[STEP 6] Last loan amount: ${ethers.formatUnits(lastLoan, 6)} USDC`);
      console.log(`[STEP 6] Last loan fee: ${ethers.formatUnits(lastLoanFee, 6)} USDC`);
      
      const profit = lastLoan - amount - lastLoanFee;
      console.log(`[STEP 6] Calculated profit: ${ethers.formatUnits(profit, 6)} USDC`);
      
      console.log('=== FLASH LOAN EXECUTION COMPLETE ===');
      
      return {
        success: true,
        transactionHash: receipt.hash,
        profit: profit,
        fee: lastLoanFee,
      };
    } catch (error) {
      console.error('=== FLASH LOAN EXECUTION FAILED ===');
      console.error('Error details:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Prepare Solana instructions for the arbitrage strategy
   */
  public async prepareInstructions(
    strategy: FlashLoanStrategy,
    amount: bigint,
    slippageTolerance: number,
    solanaProvider?: any
  ): Promise<{ instructionData1: string; instructionData2: string }> {
    // This is a simplified version - in practice, you'd need to:
    // 1. Get current prices from DEXs
    // 2. Calculate optimal swap amounts
    // 3. Build Solana instructions for the specific protocol
    // 4. Encode them properly for the ICallSolana precompile

    switch (strategy.protocol) {
      case 'orca':
        return this.prepareOrcaInstructions(amount, slippageTolerance, solanaProvider);
      case 'raydium':
        return this.prepareRaydiumInstructions(amount, slippageTolerance);
      case 'jupiter':
        return this.prepareJupiterInstructions(amount, slippageTolerance);
      default:
        throw new Error(`Unsupported protocol: ${strategy.protocol}`);
    }
  }

  /**
   * Prepare Orca instructions using the corrected implementation
   */
  private async prepareOrcaInstructions(amount: bigint, slippageTolerance: number, solanaProvider: any) {
    try {
      // Get contract's Neon address
      const contractNeonAddress = await this.flashLoanContract.getNeonAddress(
        await this.flashLoanContract.getAddress()
      );
      const contractNeonAddressString = ethers.encodeBase58(contractNeonAddress);
      
      console.log('[DEBUG] Contract Neon address:', contractNeonAddressString);
      
      // Build Orca swap instructions with contract parameters (not user wallet)
      const orcaParams = {
        amountIn: amount,
        contractNeonAddress: contractNeonAddressString,
        flashLoanContract: this.flashLoanContract,
        usdcContract: this.usdcContract,
      };
      
      const orcaInstructions = await OrcaInstructionBuilder.buildOrcaSwapInstructions(orcaParams);
      
      return {
        instructionData1: orcaInstructions.instructionData1,
        instructionData2: orcaInstructions.instructionData2,
      };
    } catch (error) {
      console.error('Error preparing Orca instructions:', error);
      throw error;
    }
  }

  private prepareRaydiumInstructions(amount: bigint, slippageTolerance: number) {
    // Simplified Raydium instruction preparation
    return {
      instructionData1: '0x', // Placeholder for actual instruction data
      instructionData2: '0x', // Placeholder for actual instruction data
    };
  }

  private prepareJupiterInstructions(amount: bigint, slippageTolerance: number) {
    // Simplified Jupiter instruction preparation
    return {
      instructionData1: '0x', // Placeholder for actual instruction data
      instructionData2: '0x', // Placeholder for actual instruction data
    };
  }

  /**
   * Get flash loan fee from Aave
   */
  async getFlashLoanFee(): Promise<bigint> {
    // Aave V3 flash loan fee is 0.05%
    return BigInt(5); // 0.05% = 5 basis points
  }

  /**
   * Estimate profit for a given strategy and amount
   */
  async estimateProfit(strategyId: string, amount: bigint): Promise<bigint> {
    const strategies = await this.getStrategies();
    const strategy = strategies.find(s => s.id === strategyId);
    
    if (!strategy) {
      throw new Error(`Strategy ${strategyId} not found`);
    }

    const fee = await this.getFlashLoanFee();
    const feeAmount = (amount * fee) / BigInt(10000); // 0.05%
    const estimatedProfitPercent = BigInt(Math.floor(strategy.estimatedProfit * 100));
    const estimatedProfit = (amount * estimatedProfitPercent) / BigInt(10000);

    return estimatedProfit - feeAmount;
  }

  /**
   * Check if user has sufficient balance for flash loan fee
   */
  async checkBalance(userAddress: string): Promise<bigint> {
    console.log(`[BALANCE CHECK] Checking USDC balance for address: ${userAddress}`);
    console.log(`[BALANCE CHECK] USDC Contract Address: ${await this.usdcContract.getAddress()}`);
    
    try {
      const balance = await this.usdcContract.balanceOf(userAddress);
      console.log(`[BALANCE CHECK] Raw balance result: ${balance.toString()}`);
      console.log(`[BALANCE CHECK] Formatted balance: ${ethers.formatUnits(balance, 6)} USDC`);
      return balance;
    } catch (error) {
      console.error(`[BALANCE CHECK] Error checking balance for ${userAddress}:`, error);
      throw error;
    }
  }
} 