const { ethers } = require('ethers');

// Configuration
const NEON_RPC_URL = 'https://devnet.neonevm.org';
const PRIVATE_KEY = '2693ccf4c05f117c8c4a0524b4c34c043c56f43337655b4c0607c1f38f55081e';

// Contract addresses
const FLASH_LOAN_CONTRACT = '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0';
const USDC_CONTRACT = '0x146c38c2E36D34Ed88d843E013677cCe72341794';

// Contract ABIs (minimal)
const FLASH_LOAN_ABI = [
  'function flashLoanSimple(address token, uint256 amount, bytes memory instructionData1, bytes memory instructionData2) public',
  'function lastLoan() external view returns (uint256)',
  'function lastLoanFee() external view returns (uint256)'
];

const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function approve(address spender, uint256 amount) external returns (bool)'
];

async function testFlashLoan() {
  try {
    console.log('=== FLASH LOAN TESTING SCRIPT ===');
    
    // Set development mode
    process.env.BYPASS_USDC_CHECK = 'true';
    process.env.NODE_ENV = 'development';
    
    // Create provider and signer
    const provider = new ethers.JsonRpcProvider(NEON_RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    
    console.log(`Wallet Address: ${address}`);
    
    // Check balances
    const neonBalance = await provider.getBalance(address);
    const usdcContract = new ethers.Contract(USDC_CONTRACT, USDC_ABI, signer);
    const usdcBalance = await usdcContract.balanceOf(address);
    
    console.log(`NEON Balance: ${ethers.formatUnits(neonBalance, 18)} NEON`);
    console.log(`USDC Balance: ${ethers.formatUnits(usdcBalance, 6)} USDC`);
    
    if (neonBalance < ethers.parseEther('0.01')) {
      console.error('❌ Insufficient NEON for gas');
      return;
    }
    
    // Create flash loan contract instance
    const flashLoanContract = new ethers.Contract(FLASH_LOAN_CONTRACT, FLASH_LOAN_ABI, signer);
    
    // Test parameters
    const testAmount = ethers.parseUnits('100', 6); // 100 USDC
    const instructionData1 = '0x'; // Empty for testing
    const instructionData2 = '0x'; // Empty for testing
    
    console.log(`\n🔄 Testing flash loan with ${ethers.formatUnits(testAmount, 6)} USDC...`);
    console.log('Note: This is a test without actual arbitrage instructions');
    
    // Execute flash loan
    const tx = await flashLoanContract.flashLoanSimple(
      USDC_CONTRACT,
      testAmount,
      instructionData1,
      instructionData2,
      {
        gasLimit: 5000000
      }
    );
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check results
    const lastLoan = await flashLoanContract.lastLoan();
    const lastLoanFee = await flashLoanContract.lastLoanFee();
    
    console.log(`\n📊 Flash Loan Results:`);
    console.log(`Last loan amount: ${ethers.formatUnits(lastLoan, 6)} USDC`);
    console.log(`Last loan fee: ${ethers.formatUnits(lastLoanFee, 6)} USDC`);
    
    if (lastLoan > 0) {
      console.log('\n🎉 Flash loan test successful!');
      console.log('The contract executed successfully, even without USDC balance.');
      console.log('This confirms the flash loan mechanism works.');
    } else {
      console.log('\n⚠️ Flash loan executed but no loan data recorded.');
      console.log('This might be expected for test transactions.');
    }
    
  } catch (error) {
    console.error('❌ Flash loan test failed:', error);
    
    if (error.message.includes('execution reverted')) {
      console.log('\n💡 The flash loan reverted. This could be due to:');
      console.log('1. Empty instruction data (expected for testing)');
      console.log('2. Contract state issues');
      console.log('3. Missing arbitrage opportunities');
    }
  }
}

// Run the test
testFlashLoan(); 