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
   * Check if contract has sufficient USDC balance for flash loan fees
   * Updated to match reference implementation - checks contract, not user
   */
  async checkContractBalanceForFee(): Promise<boolean> {
    try {
      console.log('=== CONTRACT FEE BALANCE CHECK START ===');
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[FEE] Contract EVM Address: ${contractAddress}`);
      
      const contractBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[FEE] Contract USDC Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
      
      // Contract needs at least 1 USDC for fees (matching reference implementation)
      const minContractBalance = ethers.parseUnits('1', 6); // 1 USDC minimum
      console.log(`[FEE] Minimum contract balance needed: ${ethers.formatUnits(minContractBalance, 6)} USDC`);
      
      const hasSufficientBalance = contractBalance >= minContractBalance;
      console.log(`[FEE] Contract has sufficient balance: ${hasSufficientBalance}`);
      console.log(`[FEE] Balance comparison: ${ethers.formatUnits(contractBalance, 6)} >= ${ethers.formatUnits(minContractBalance, 6)}`);
      
      console.log('=== CONTRACT FEE BALANCE CHECK COMPLETE ===');
      return hasSufficientBalance;
    } catch (error) {
      console.error('=== CONTRACT FEE BALANCE CHECK FAILED ===');
      console.error('Error details:', error);
      // If we can't check the balance, assume insufficient
      return false;
    }
  }

  /**
   * Ensure contract has sufficient USDC balance for fees
   * Updated to match reference implementation
   */
  async ensureContractBalance(minBalance: bigint = ethers.parseUnits('1', 6)): Promise<boolean> {
    try {
      console.log('=== ENSURE CONTRACT BALANCE START ===');
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[CONTRACT] Contract Address: ${contractAddress}`);
      
      const currentBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[CONTRACT] Current balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
      console.log(`[CONTRACT] Required minimum: ${ethers.formatUnits(minBalance, 6)} USDC`);
      
      if (currentBalance < minBalance) {
        console.log(`[CONTRACT] Insufficient balance. Transferring ${ethers.formatUnits(minBalance, 6)} USDC to contract...`);
        
        // Transfer USDC to contract (matching reference implementation)
        const transferTx = await this.usdcContract.transfer(contractAddress, minBalance);
        console.log(`[CONTRACT] Transfer transaction sent: ${transferTx.hash}`);
        await transferTx.wait();
        
        const newBalance = await this.usdcContract.balanceOf(contractAddress);
        console.log(`[CONTRACT] New balance: ${ethers.formatUnits(newBalance, 6)} USDC`);
        console.log('=== ENSURE CONTRACT BALANCE COMPLETE ===');
        return true;
      } else {
        console.log(`[CONTRACT] Contract already has sufficient balance`);
        console.log('=== ENSURE CONTRACT BALANCE COMPLETE ===');
        return true;
      }
    } catch (error) {
      console.error('=== ENSURE CONTRACT BALANCE FAILED ===');
      console.error('Error details:', error);
      return false;
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
   * Get flash loan fee amount for a given loan amount
   */
  getFlashLoanFee(amount: bigint): bigint {
    return (amount * BigInt(5)) / BigInt(10000); // 0.05% = 5 basis points
  }
} 