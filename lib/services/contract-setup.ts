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
      console.log('=== CONTRACT BALANCE SETUP START ===');
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[CONTRACT] Flash Loan Contract Address: ${contractAddress}`);
      console.log(`[CONTRACT] USDC Contract Address: ${await this.usdcContract.getAddress()}`);
      console.log(`[CONTRACT] Minimum Required Balance: ${ethers.formatUnits(minBalance, 6)} USDC`);
      
      const currentBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[CONTRACT] Current Contract USDC Balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
      
      if (currentBalance < minBalance) {
        const transferAmount = minBalance - currentBalance;
        console.log(`[CONTRACT] Contract balance insufficient. Transferring ${ethers.formatUnits(transferAmount, 6)} USDC...`);
        
        // Transfer USDC to contract
        const tx = await this.usdcContract.transfer(contractAddress, transferAmount);
        console.log(`[CONTRACT] Transfer transaction hash: ${tx.hash}`);
        console.log(`[CONTRACT] Waiting for transaction confirmation...`);
        
        await tx.wait();
        
        const newBalance = await this.usdcContract.balanceOf(contractAddress);
        console.log(`[CONTRACT] New contract balance: ${ethers.formatUnits(newBalance, 6)} USDC`);
        console.log('=== CONTRACT BALANCE SETUP COMPLETE ===');
        return true;
      }
      
      console.log(`[CONTRACT] Contract has sufficient USDC balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
      console.log('=== CONTRACT BALANCE SETUP COMPLETE ===');
      return true;
    } catch (error) {
      console.error('=== CONTRACT BALANCE SETUP FAILED ===');
      console.error('Error details:', error);
      throw error;
    }
  }

  /**
   * Verify USDC contract is accessible
   */
  async verifyUSDCContract(): Promise<boolean> {
    try {
      console.log('=== USDC CONTRACT VERIFICATION START ===');
      const contractAddress = await this.usdcContract.getAddress();
      console.log(`[USDC] Contract Address: ${contractAddress}`);
      
      // Test basic contract call first
      console.log(`[USDC] Testing basic contract call...`);
      const code = await this.usdcContract.runner?.provider?.getCode(contractAddress);
      console.log(`[USDC] Contract code length: ${code?.length || 0}`);
      
      if (!code || code === '0x') {
        console.error(`[USDC] No contract code found at address ${contractAddress}`);
        return false;
      }
      
      // Try to get total supply to verify contract is working
      console.log(`[USDC] Calling totalSupply()...`);
      const totalSupply = await this.usdcContract.totalSupply();
      console.log(`[USDC] Total Supply: ${ethers.formatUnits(totalSupply, 6)} USDC`);
      
      // Try to get name and symbol
      console.log(`[USDC] Calling name()...`);
      const name = await this.usdcContract.name();
      console.log(`[USDC] Token Name: ${name}`);
      
      console.log(`[USDC] Calling symbol()...`);
      const symbol = await this.usdcContract.symbol();
      console.log(`[USDC] Token Symbol: ${symbol}`);
      
      console.log('=== USDC CONTRACT VERIFICATION COMPLETE ===');
      return true;
    } catch (error) {
      console.error('=== USDC CONTRACT VERIFICATION FAILED ===');
      console.error('Error details:', error);
      
      // Log more specific error information
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      return false;
    }
  }

  /**
   * Get contract's current USDC balance
   */
  async getContractBalance(): Promise<bigint> {
    const contractAddress = await this.flashLoanContract.getAddress();
    const balance = await this.usdcContract.balanceOf(contractAddress);
    console.log(`[CONTRACT] Contract balance: ${ethers.formatUnits(balance, 6)} USDC`);
    return balance;
  }

  /**
   * Get user's USDC balance
   */
  async getUserBalance(userAddress: string): Promise<bigint> {
    try {
      console.log('=== USER BALANCE CHECK START ===');
      console.log(`[USER] Address: ${userAddress}`);
      console.log(`[USER] USDC Contract Address: ${await this.usdcContract.getAddress()}`);
      
      // Check if the address is valid
      if (!userAddress || userAddress === '0x0000000000000000000000000000000000000000') {
        console.log(`[USER] Invalid address provided: ${userAddress}`);
        return BigInt(0);
      }

      console.log(`[USER] Calling balanceOf(${userAddress})...`);
      const balance = await this.usdcContract.balanceOf(userAddress);
      console.log(`[USER] Raw balance result: ${balance.toString()}`);
      console.log(`[USER] Formatted balance: ${ethers.formatUnits(balance, 6)} USDC`);
      console.log('=== USER BALANCE CHECK COMPLETE ===');
      return balance;
    } catch (error) {
      console.error('=== USER BALANCE CHECK FAILED ===');
      console.error('Error details:', error);
      
      // If the error is about empty data, it likely means the user has no USDC
      if (error instanceof Error && error.message.includes('could not decode result data')) {
        console.log(`[USER] User likely has no USDC tokens on Neon EVM (empty data response)`);
        return BigInt(0);
      }
      
      throw error;
    }
  }

  /**
   * Check if user has sufficient balance for flash loan fee
   */
  async checkUserBalanceForFee(userAddress: string, flashLoanAmount: bigint): Promise<boolean> {
    try {
      console.log('=== USER FEE BALANCE CHECK START ===');
      console.log(`[FEE] User EVM Address: ${userAddress}`);
      console.log(`[FEE] Flash Loan Amount: ${ethers.formatUnits(flashLoanAmount, 6)} USDC`);
      
    const userBalance = await this.getUserBalance(userAddress);
      console.log(`[FEE] User USDC Balance: ${ethers.formatUnits(userBalance, 6)} USDC`);
      
    const feeAmount = (flashLoanAmount * BigInt(5)) / BigInt(10000); // 0.05% fee
    const requiredBalance = feeAmount + BigInt(1000000); // Fee + 1 USDC buffer
    
      console.log(`[FEE] Flash Loan Fee (0.05%): ${ethers.formatUnits(feeAmount, 6)} USDC`);
      console.log(`[FEE] Required Balance (Fee + 1 USDC buffer): ${ethers.formatUnits(requiredBalance, 6)} USDC`);
      
      const hasSufficientBalance = userBalance >= requiredBalance;
      console.log(`[FEE] Has sufficient balance: ${hasSufficientBalance}`);
      console.log(`[FEE] Balance comparison: ${ethers.formatUnits(userBalance, 6)} >= ${ethers.formatUnits(requiredBalance, 6)}`);
      
      console.log('=== USER FEE BALANCE CHECK COMPLETE ===');
      return hasSufficientBalance;
    } catch (error) {
      console.error('=== USER FEE BALANCE CHECK FAILED ===');
      console.error('Error details:', error);
      // If we can't check the balance, assume insufficient
      return false;
    }
  }

  /**
   * Get flash loan fee amount for a given loan amount
   */
  getFlashLoanFee(amount: bigint): bigint {
    return (amount * BigInt(5)) / BigInt(10000); // 0.05% = 5 basis points
  }
} 