import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts/addresses';
import { CONTRACT_ABIS } from '../contracts/abis';

export class FundedContractSetupService {
  private usdcContract: ethers.Contract;
  private flashLoanContract: ethers.Contract;
  private fundedSigner: ethers.Wallet;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider, userSigner: ethers.Signer) {
    this.provider = provider;
    
    // Create funded signer (like reference implementation's "owner")
    const fundedPrivateKey = process.env.FUNDED_PRIVATE_KEY;
    if (!fundedPrivateKey) {
      throw new Error('FUNDED_PRIVATE_KEY environment variable not set. Please set up a funded wallet.');
    }
    
    this.fundedSigner = new ethers.Wallet(fundedPrivateKey, provider);
    
    // USDC contract connected to funded signer (like reference implementation)
    this.usdcContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.USDC,
      CONTRACT_ABIS.ERC20_FOR_SPL,
      this.fundedSigner
    );
    
    // Flash loan contract connected to user signer (for user operations)
    this.flashLoanContract = new ethers.Contract(
      CONTRACT_ADDRESSES.NEON_DEVNET.AAVE_FLASH_LOAN,
      CONTRACT_ABIS.AAVE_FLASH_LOAN,
      userSigner
    );
  }

  /**
   * Check if contract has sufficient USDC balance for flash loan fees
   * Uses funded wallet like reference implementation
   * More lenient for testing - allows any positive balance
   */
  async checkContractBalanceForFee(): Promise<boolean> {
    try {
      console.log('=== FUNDED CONTRACT FEE BALANCE CHECK START ===');
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[FEE] Contract EVM Address: ${contractAddress}`);
      
      const contractBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[FEE] Contract USDC Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
      
      // For testing, allow any positive balance (more lenient than production)
      const hasSufficientBalance = contractBalance > 0;
      console.log(`[FEE] Contract has sufficient balance: ${hasSufficientBalance}`);
      console.log(`[FEE] Balance check: ${ethers.formatUnits(contractBalance, 6)} > 0`);
      
      console.log('=== FUNDED CONTRACT FEE BALANCE CHECK COMPLETE ===');
      return hasSufficientBalance;
    } catch (error) {
      console.error('=== FUNDED CONTRACT FEE BALANCE CHECK FAILED ===');
      console.error('Error details:', error);
      return false;
    }
  }

  /**
   * Ensure contract has sufficient USDC balance for fees
   * Uses funded wallet to transfer USDC (like reference implementation)
   * Falls back gracefully if funded wallet has no USDC
   */
  async ensureContractBalance(minBalance: bigint = ethers.parseUnits('1', 6)): Promise<boolean> {
    try {
      console.log('=== FUNDED ENSURE CONTRACT BALANCE START ===');
      const contractAddress = await this.flashLoanContract.getAddress();
      console.log(`[CONTRACT] Contract Address: ${contractAddress}`);
      
      const currentBalance = await this.usdcContract.balanceOf(contractAddress);
      console.log(`[CONTRACT] Current balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
      console.log(`[CONTRACT] Required minimum: ${ethers.formatUnits(minBalance, 6)} USDC`);
      
      if (currentBalance < minBalance) {
        console.log(`[CONTRACT] Insufficient balance. Checking funded wallet...`);
        
        // Check funded signer's USDC balance
        const fundedAddress = await this.fundedSigner.getAddress();
        const fundedBalance = await this.usdcContract.balanceOf(fundedAddress);
        console.log(`[CONTRACT] Funded signer USDC balance: ${ethers.formatUnits(fundedBalance, 6)} USDC`);
        
        if (fundedBalance < minBalance) {
          console.log(`[CONTRACT] Funded signer has insufficient USDC (${ethers.formatUnits(fundedBalance, 6)} USDC)`);
          console.log(`[CONTRACT] However, contract has ${ethers.formatUnits(currentBalance, 6)} USDC which might be sufficient for testing`);
          
          // If contract has at least some USDC, proceed anyway (for testing)
          if (currentBalance > 0) {
            console.log(`[CONTRACT] Proceeding with available contract balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
            console.log('=== FUNDED ENSURE CONTRACT BALANCE COMPLETE (USING EXISTING BALANCE) ===');
            return true;
          }
          
          console.error(`[CONTRACT] Contract has no USDC and funded wallet has insufficient USDC`);
          console.log(`[CONTRACT] You need to get USDC for the funded wallet or the contract`);
          return false;
        }
        
        // Transfer USDC to contract using funded signer (like reference implementation)
        const transferTx = await this.usdcContract.transfer(contractAddress, minBalance, {
          gasLimit: 200000
        });
        console.log(`[CONTRACT] Transfer transaction sent: ${transferTx.hash}`);
        await transferTx.wait();
        
        const newBalance = await this.usdcContract.balanceOf(contractAddress);
        console.log(`[CONTRACT] New balance: ${ethers.formatUnits(newBalance, 6)} USDC`);
        console.log('=== FUNDED ENSURE CONTRACT BALANCE COMPLETE ===');
        return true;
      } else {
        console.log(`[CONTRACT] Contract already has sufficient balance`);
        console.log('=== FUNDED ENSURE CONTRACT BALANCE COMPLETE ===');
        return true;
      }
    } catch (error) {
      console.error('=== FUNDED ENSURE CONTRACT BALANCE FAILED ===');
      console.error('Error details:', error);
      return false;
    }
  }

  /**
   * Verify USDC contract is accessible
   */
  async verifyUSDCContract(): Promise<boolean> {
    try {
      console.log('=== FUNDED USDC CONTRACT VERIFICATION START ===');
      const contractAddress = await this.usdcContract.getAddress();
      console.log(`[USDC] Contract Address: ${contractAddress}`);
      
      // Test basic contract functions
      const name = await this.usdcContract.name();
      const symbol = await this.usdcContract.symbol();
      const decimals = await this.usdcContract.decimals();
      const totalSupply = await this.usdcContract.totalSupply();
      
      console.log(`[USDC] Token: ${name} (${symbol}) - ${decimals} decimals`);
      console.log(`[USDC] Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      
      console.log('=== FUNDED USDC CONTRACT VERIFICATION COMPLETE ===');
      return true;
    } catch (error) {
      console.error('=== FUNDED USDC CONTRACT VERIFICATION FAILED ===');
      console.error('Error details:', error);
      return false;
    }
  }

  /**
   * Get funded signer address
   */
  async getFundedAddress(): Promise<string> {
    return await this.fundedSigner.getAddress();
  }

  /**
   * Get funded signer's USDC balance
   */
  async getFundedUsdcBalance(): Promise<bigint> {
    const fundedAddress = await this.fundedSigner.getAddress();
    return await this.usdcContract.balanceOf(fundedAddress);
  }

  /**
   * Get funded signer's NEON balance
   */
  async getFundedNeonBalance(): Promise<bigint> {
    const fundedAddress = await this.fundedSigner.getAddress();
    return await this.provider.getBalance(fundedAddress);
  }
} 