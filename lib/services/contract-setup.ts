import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { CONTRACT_ABIS } from '../contracts/abis';

export class ContractSetupService {
  private usdcContract: ethers.Contract;
  private flashLoanContract: ethers.Contract;

  constructor(provider: ethers.Provider, signer: ethers.Signer) {
    this.usdcContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
      CONTRACT_ABIS.ERC20_FOR_SPL,
      signer
    );
    
    this.flashLoanContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.AAVE_FLASH_LOAN,
      CONTRACT_ABIS.AAVE_FLASH_LOAN,
      signer
    );
  }

  /**
   * Ensure the flash loan contract has sufficient USDC for fees
   * This is required before executing flash loans
   */
  async ensureContractBalance(minBalance: bigint = ethers.parseUnits('1000000', 6)): Promise<boolean> {
    try {
      const contractAddress = await this.flashLoanContract.getAddress();
      const currentBalance = await this.usdcContract.balanceOf(contractAddress);
      
      console.log(`Contract USDC balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
      
      if (currentBalance < minBalance) {
        console.log(`Contract balance insufficient. Transferring ${ethers.formatUnits(minBalance - currentBalance, 6)} USDC...`);
        
        // Transfer USDC to contract
        const tx = await this.usdcContract.transfer(contractAddress, minBalance - currentBalance);
        await tx.wait();
        
        console.log('USDC transferred to contract successfully');
        return true;
      }
      
      console.log('Contract has sufficient USDC balance');
      return true;
    } catch (error) {
      console.error('Error ensuring contract balance:', error);
      throw error;
    }
  }

  /**
   * Get contract's current USDC balance
   */
  async getContractBalance(): Promise<bigint> {
    const contractAddress = await this.flashLoanContract.getAddress();
    return await this.usdcContract.balanceOf(contractAddress);
  }

  /**
   * Get user's USDC balance
   */
  async getUserBalance(userAddress: string): Promise<bigint> {
    return await this.usdcContract.balanceOf(userAddress);
  }

  /**
   * Check if user has sufficient balance for flash loan fee
   */
  async checkUserBalanceForFee(userAddress: string, flashLoanAmount: bigint): Promise<boolean> {
    // Log the Ethereum address being checked
    console.log("[DEBUG] Checking USDC balance for EVM address:", userAddress);
    const userBalance = await this.getUserBalance(userAddress);
    console.log("[DEBUG] USDC balance for", userAddress, "is", userBalance.toString());
    const feeAmount = (flashLoanAmount * BigInt(5)) / BigInt(10000); // 0.05% fee
    const requiredBalance = feeAmount + BigInt(1000000); // Fee + 1 USDC buffer
    
    return userBalance >= requiredBalance;
  }

  /**
   * Get flash loan fee amount for a given loan amount
   */
  getFlashLoanFee(amount: bigint): bigint {
    return (amount * BigInt(5)) / BigInt(10000); // 0.05% = 5 basis points
  }
} 