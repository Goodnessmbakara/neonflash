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
      const strategies = await this.getStrategies();
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) {
        throw new Error(`Strategy ${strategyId} not found`);
      }
      if (amount < strategy.minAmount || amount > strategy.maxAmount) {
        throw new Error(`Amount must be between ${ethers.formatUnits(strategy.minAmount, 6)} and ${ethers.formatUnits(strategy.maxAmount, 6)} USDC`);
      }
      // Prepare instruction data based on protocol
      let instructionData1 = '0x';
      let instructionData2 = '0x';
      if (strategy.protocol === 'orca') {
        // Use real Orca instruction builder with Phantom wallet
        const orcaInstructions = await this.prepareOrcaInstructions(amount, slippageTolerance, solanaProvider);
        instructionData1 = orcaInstructions.instructionData1;
        instructionData2 = orcaInstructions.instructionData2;
      } else if (strategy.protocol === 'raydium') {
        const { instructionData1: i1, instructionData2: i2 } = await this.prepareRaydiumInstructions(amount, slippageTolerance);
        instructionData1 = i1;
        instructionData2 = i2;
      } else if (strategy.protocol === 'jupiter') {
        const { instructionData1: i1, instructionData2: i2 } = await this.prepareJupiterInstructions(amount, slippageTolerance);
        instructionData1 = i1;
        instructionData2 = i2;
      } else {
        throw new Error(`Unsupported protocol: ${strategy.protocol}`);
      }
      // Execute flash loan
      const tx = await this.flashLoanContract.flashLoanSimple(
        strategy.tokenIn,
        amount,
        instructionData1,
        instructionData2,
        {
          gasLimit: 5000000,
        }
      );
      const receipt = await tx.wait();
      const lastLoan = await this.flashLoanContract.lastLoan();
      const lastLoanFee = await this.flashLoanContract.lastLoanFee();
      return {
        success: true,
        transactionHash: receipt.hash,
        profit: lastLoan - amount - lastLoanFee,
        fee: lastLoanFee,
      };
    } catch (error) {
      console.error('Flash loan execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Prepare Solana instructions for the arbitrage strategy
   */
  private async prepareInstructions(
    strategy: FlashLoanStrategy,
    amount: bigint,
    slippageTolerance: number
  ): Promise<{ instructionData1: string; instructionData2: string }> {
    // This is a simplified version - in practice, you'd need to:
    // 1. Get current prices from DEXs
    // 2. Calculate optimal swap amounts
    // 3. Build Solana instructions for the specific protocol
    // 4. Encode them properly for the ICallSolana precompile

    switch (strategy.protocol) {
      case 'orca':
        return this.prepareOrcaInstructions(amount, slippageTolerance);
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
    return await this.usdcContract.balanceOf(userAddress);
  }
} 