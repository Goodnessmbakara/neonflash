const { ethers } = require('ethers');

// Configuration - same as reference implementation
const NEON_RPC_URL = 'https://devnet.neonevm.org';
const USDC_CONTRACT_ADDRESS = '0x146c38c2E36D34Ed88d843E013677cCe72341794';
const AAVE_FLASH_LOAN_ADDRESS = '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0';

// USDC Contract ABI (minimal for transfer)
const USDC_ABI = [
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function mint(address to, uint256 amount) external',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
];

// AaveFlashLoan Contract ABI (minimal)
const FLASH_LOAN_ABI = [
  'function getAddress() external view returns (address)',
  'function lastLoan() external view returns (uint256)',
  'function lastLoanFee() external view returns (uint256)'
];

async function setupFundedWallet() {
  try {
    console.log('=== SETTING UP FUNDED WALLET (Reference Implementation Style) ===');
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(NEON_RPC_URL);
    console.log('Provider created');
    
    // Check if we have a private key (you'll need to provide one with NEON tokens)
    const privateKey = process.env.FUNDED_PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ No funded private key provided. Please set FUNDED_PRIVATE_KEY environment variable.');
      console.log('\nTo set up a funded wallet:');
      console.log('1. Create a new wallet or use an existing one');
      console.log('2. Get NEON tokens from: https://neonfaucet.org/');
      console.log('3. Export the private key');
      console.log('4. Set it as: export FUNDED_PRIVATE_KEY=your_private_key_here');
      console.log('5. Make sure the wallet has NEON tokens for gas');
      return;
    }
    
    // Create funded signer (like reference implementation's "owner")
    const fundedSigner = new ethers.Wallet(privateKey, provider);
    const fundedAddress = await fundedSigner.getAddress();
    console.log(`Funded Signer Address: ${fundedAddress}`);
    
    // Check funded signer balance
    const neonBalance = await provider.getBalance(fundedAddress);
    console.log(`Funded Signer NEON Balance: ${ethers.formatUnits(neonBalance, 18)} NEON`);
    
    if (neonBalance < ethers.parseEther('0.01')) {
      console.error('❌ Insufficient NEON balance for gas. Need at least 0.01 NEON');
      console.log('Get NEON tokens from: https://neonfaucet.org/');
      return;
    }
    
    // Create USDC contract instance with funded signer
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, fundedSigner);
    console.log('USDC contract instance created with funded signer');
    
    // Check current USDC balance of funded signer
    const fundedUsdcBalance = await usdcContract.balanceOf(fundedAddress);
    console.log(`Funded Signer USDC Balance: ${ethers.formatUnits(fundedUsdcBalance, 6)} USDC`);
    
    // Check contract info
    const name = await usdcContract.name();
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    console.log(`Token: ${name} (${symbol}) - ${decimals} decimals`);
    
    // Create flash loan contract instance
    const flashLoanContract = new ethers.Contract(AAVE_FLASH_LOAN_ADDRESS, FLASH_LOAN_ABI, fundedSigner);
    const contractAddress = await flashLoanContract.getAddress();
    console.log(`Flash Loan Contract Address: ${contractAddress}`);
    
    // Check contract's current USDC balance
    const contractBalance = await usdcContract.balanceOf(contractAddress);
    console.log(`Contract USDC Balance: ${ethers.formatUnits(contractBalance, 6)} USDC`);
    
    // If funded signer has USDC, transfer some to contract (like reference implementation)
    if (fundedUsdcBalance > 0) {
      const transferAmount = ethers.parseUnits('1', 6); // 1 USDC
      console.log(`\n🔄 Transferring ${ethers.formatUnits(transferAmount, 6)} USDC to contract...`);
      
      const tx = await usdcContract.transfer(contractAddress, transferAmount, {
        gasLimit: 200000
      });
      
      console.log(`Transaction sent: ${tx.hash}`);
      console.log('Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log(`✅ Transfer confirmed! Block: ${receipt.blockNumber}`);
      
      // Check new contract balance
      const newContractBalance = await usdcContract.balanceOf(contractAddress);
      console.log(`New Contract USDC Balance: ${ethers.formatUnits(newContractBalance, 6)} USDC`);
      
      console.log('\n🎉 Contract now has USDC for flash loan fees!');
    } else {
      console.log('\n⚠️  Funded signer has no USDC. You need to get USDC first.');
      console.log('Options:');
      console.log('1. Use the airdrop API: POST /api/airdrop with chain="neon-usdc"');
      console.log('2. Use the minting script: node scripts/mint-usdc.js');
      console.log('3. Get USDC from a DEX like Orca or Raydium');
    }
    
    // Save the funded wallet info for your implementation
    console.log('\n📋 For your implementation, use this funded wallet:');
    console.log(`Funded Address: ${fundedAddress}`);
    console.log(`Private Key: ${privateKey}`);
    console.log('\nYou can set this as an environment variable:');
    console.log(`export FUNDED_PRIVATE_KEY=${privateKey}`);
    
  } catch (error) {
    console.error('❌ Error setting up funded wallet:', error);
    
    if (error.message.includes('execution reverted')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. The signer might not have USDC tokens');
      console.log('2. Try getting USDC first using the airdrop or minting script');
      console.log('3. Check if the contract has access control');
    }
  }
}

// Run the script
setupFundedWallet(); 