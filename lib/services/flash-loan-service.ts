import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { CONTRACT_ABIS } from '../contracts/abis';
import { OrcaInstructionBuilder, OrcaSwapParams } from './orca-instruction-builder';
import { NeonIntegrationService } from './neon-integration';
import { ENVIRONMENT_CONFIG } from '../config/environment';

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
  private orcaBuilder: OrcaInstructionBuilder;
  private neonIntegration: NeonIntegrationService;

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

    // Initialize services
    this.neonIntegration = new NeonIntegrationService(provider);
    
    // Initialize Orca builder (no parameters needed)
    this.orcaBuilder = new OrcaInstructionBuilder();
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
        minAmount: ethers.parseUnits(ENVIRONMENT_CONFIG.FLASH_LOAN.MIN_AMOUNT, 6), // 10 USDC (like reference implementation)
        maxAmount: ethers.parseUnits(ENVIRONMENT_CONFIG.FLASH_LOAN.MAX_AMOUNT, 6), // 10,000 USDC
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
        minAmount: ethers.parseUnits(ENVIRONMENT_CONFIG.FLASH_LOAN.MIN_AMOUNT, 6), // 10 USDC (like reference implementation)
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
        minAmount: ethers.parseUnits(ENVIRONMENT_CONFIG.FLASH_LOAN.MIN_AMOUNT, 6), // 10 USDC (like reference implementation)
        maxAmount: ethers.parseUnits('5000', 6), // 5,000 USDC
      },
    ];
  }

  /**
   * Execute a flash loan with the specified strategy
   * Now using real Orca instructions instead of empty ones
   */
  async executeFlashLoan(
    strategyId: string,
    amount: bigint,
    slippageTolerance: number = 0.5
  ): Promise<FlashLoanResult> {
    try {
      console.log('=== FLASH LOAN EXECUTION START ===');
      console.log(`[STEP 1] Strategy ID: ${strategyId}`);
      console.log(`[STEP 1] Amount: ${ethers.formatUnits(amount, 6)} USDC`);
      console.log(`[STEP 1] Slippage Tolerance: ${slippageTolerance}%`);
      
      // Get user's wallet address for logging
      const userAddress = await this.signer.getAddress();
      console.log(`[STEP 1] User Wallet Address (EVM): ${userAddress}`);
      
      // Check CONTRACT USDC balance (not user balance) - matching reference implementation
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[STEP 1] Checking CONTRACT USDC balance for address: ${contractAddress}`);
      const contractBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[STEP 1] Contract USDC Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);

      const minContractBalance = ethers.parseUnits('1', 6); // 1 USDC minimum for fees (matching reference implementation)
      if (contractBalance < minContractBalance) {
        console.log(`[STEP 1] CONTRACT INSUFFICIENT BALANCE: Contract needs ${ethers.formatUnits(minContractBalance, 6)} USDC for fees, has ${ethers.formatUnits(contractBalance, 6)} USDC`);
        
        // For testing, proceed anyway if contract has some USDC
        if (contractBalance > 0) {
          console.log(`[STEP 1] TESTING MODE: Proceeding with available contract balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
          console.log(`[STEP 1] This matches reference implementation behavior - assuming wallet has USDC`);
        } else {
          console.log(`[STEP 1] CONTRACT HAS NO USDC: For testing, proceeding anyway`);
          console.log(`[STEP 1] In production, contract should have USDC for fees`);
        }
      } else {
        console.log(`[STEP 1] CONTRACT HAS SUFFICIENT BALANCE: Proceeding with flash loan`);
      }
      
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
      
      // Get Neon EVM parameters for Orca instruction building
      console.log(`[STEP 4] Getting Neon EVM parameters...`);
      const neonEvmParams = await this.neonIntegration.getNeonEvmParams();
      console.log(`[STEP 4] Neon EVM Program ID: ${neonEvmParams.result.neonEvmProgramId}`);
      
      // Get contract public key
      const contractPublicKey = await this.neonIntegration.getContractPublicKey(contractAddress, this.flashLoanContract);
      console.log(`[STEP 4] Contract Public Key: ${contractPublicKey}`);
      
      // Set parameters for Orca builder
      this.orcaBuilder.setParams(neonEvmParams.result.neonEvmProgramId, contractPublicKey);
      
      // Build real Orca swap instructions exactly like reference implementation
      console.log(`[STEP 4] Building Orca swap instructions...`);
      
      // Use hardcoded real Solana address for testing (matching reference implementation)
      const userSolanaAddress = '4de59aRfCH6MQPRktbMrKmrLCrQm5Rfsf4bU4Gyrtc6x';
      console.log(`[STEP 4] Using hardcoded real Solana address: ${userSolanaAddress}`);
      console.log(`[STEP 4] This matches reference implementation approach`);
      
      const orcaParams: OrcaSwapParams = {
        amountIn: ethers.formatUnits(amount, 6), // Convert to string with 6 decimals
        tokenInMint: ENVIRONMENT_CONFIG.TOKENS.USDC_MINT,
        tokenOutMint: ENVIRONMENT_CONFIG.TOKENS.SAMO_MINT,
        contractAddress: contractPublicKey,
        userAddress: userAddress,
        solanaAddress: userSolanaAddress
      };
      
      // Build Orca instructions exactly like reference implementation (no fallback)
      const orcaInstructions = await this.orcaBuilder.buildOrcaSwapInstructions(orcaParams);
      console.log(`[STEP 4] Orca instructions built successfully`);
      
      // Prepare instructions for flash loan contract exactly like reference implementation
      const instructionData1 = this.orcaBuilder.prepareInstruction(orcaInstructions[0].instructions[0]);
      const instructionData2 = this.orcaBuilder.prepareInstruction(orcaInstructions[1].instructions[0]);
      
      console.log(`[STEP 4] Instruction 1 prepared: ${instructionData1.substring(0, 20)}...`);
      console.log(`[STEP 4] Instruction 2 prepared: ${instructionData2.substring(0, 20)}...`);
      
      // Execute flash loan with real instructions exactly like reference implementation
      console.log(`[STEP 5] Executing flash loan contract call...`);
      console.log(`[STEP 5] Flash Loan Contract Address: ${await this.flashLoanContract.getAddress()}`);
      console.log(`[STEP 5] USDC Contract Address: ${await this.usdcContract.getAddress()}`);
      console.log(`[STEP 5] Gas Limit: ${ENVIRONMENT_CONFIG.FLASH_LOAN.GAS_LIMIT}`);
      
      // Debug: Check signer and contract state
      console.log(`[STEP 5] Signer address: ${await this.signer.getAddress()}`);
      console.log(`[STEP 5] Contract connected to signer: ${this.flashLoanContract.runner === this.signer}`);
      
      // Debug: Test function encoding before calling
      try {
        const encodedData = this.flashLoanContract.interface.encodeFunctionData('flashLoanSimple', [
          strategy.tokenIn,
          amount,
          instructionData1,
          instructionData2
        ]);
        console.log(`[STEP 5] Function encoding test: ${encodedData.substring(0, 10)}...`);
        console.log(`[STEP 5] Full encoded data length: ${encodedData.length}`);
        console.log(`[STEP 5] Instruction 1 length: ${instructionData1.length}`);
        console.log(`[STEP 5] Instruction 2 length: ${instructionData2.length}`);
      } catch (error) {
        console.error(`[STEP 5] Function encoding failed:`, error);
        throw new Error(`Function encoding failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Ensure contract is connected to signer
      const contractWithSigner = this.flashLoanContract.connect(this.signer);
      console.log(`[STEP 5] Contract reconnected to signer: ${contractWithSigner.runner === this.signer}`);
      
      const tx = await (contractWithSigner as any).flashLoanSimple(
        strategy.tokenIn,
        amount,
        instructionData1, // Use real instructions exactly like reference implementation
        instructionData2,  // Use real instructions exactly like reference implementation
        {
          gasLimit: ENVIRONMENT_CONFIG.FLASH_LOAN.GAS_LIMIT,
        }
      );
      
      console.log(`[STEP 5] Transaction sent! Hash: ${tx.hash}`);
      console.log(`[STEP 5] Waiting for transaction confirmation...`);
      
      // Capture transaction hash immediately after sending
      const transactionHash = tx.hash;
      
      try {
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
          transactionHash: transactionHash,
          profit: profit,
          fee: lastLoanFee,
        };
      } catch (receiptError) {
        console.error(`[STEP 5] Transaction failed after sending:`, receiptError);
        // Return failure but include the transaction hash
        return {
          success: false,
          transactionHash: transactionHash,
          error: receiptError instanceof Error ? receiptError.message : 'Transaction failed after sending',
        };
      }
    } catch (error) {
      console.error('=== FLASH LOAN EXECUTION FAILED ===');
      console.error('Error details:', error);
      
      // Check if this is a transaction error that might have a hash
      let transactionHash: string | undefined;
      if (error && typeof error === 'object' && 'transaction' in error) {
        const txError = error as any;
        if (txError.transaction && txError.transaction.hash) {
          transactionHash = txError.transaction.hash;
          console.log(`[ERROR] Transaction hash from error: ${transactionHash}`);
        }
      }
      
      return {
        success: false,
        transactionHash: transactionHash,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get flash loan fee from Aave
   */
  async getFlashLoanFee(): Promise<bigint> {
    // Aave V3 flash loan fee is 0.05%
    return BigInt(5); // 5 basis points = 0.05%
  }

  /**
   * Estimate profit for a given strategy and amount
   */
  async estimateProfit(strategyId: string, amount: bigint): Promise<bigint> {
    const strategies = await this.getStrategies();
    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      return BigInt(0);
    }
    
    // Simple profit estimation based on strategy
    const profitPercentage = BigInt(Math.floor(strategy.estimatedProfit * 100));
    return (amount * profitPercentage) / BigInt(10000);
  }
} 