const { ethers } = require('ethers');

// Configuration
const NEON_RPC_URL = 'https://devnet.neonevm.org';
const USDC_CONTRACT_ADDRESS = '0x146c38c2E36D34Ed88d843E013677cCe72341794';
const TARGET_ADDRESS = '0x40a2aa83271dd2f86e7c50c05b60bf3873ba4461';

// USDC Contract ABI
const USDC_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)',
  'function totalSupply() external view returns (uint256)'
];

async function getUSDC() {
  try {
    console.log('=== USDC ACQUISITION GUIDE ===');
    console.log(`Target Address: ${TARGET_ADDRESS}`);
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(NEON_RPC_URL);
    
    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, provider);
    
    // Check current USDC balance
    const currentBalance = await usdcContract.balanceOf(TARGET_ADDRESS);
    console.log(`\n📊 Current USDC Balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
    
    // Check contract info
    const name = await usdcContract.name();
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    const totalSupply = await usdcContract.totalSupply();
    console.log(`\n🏦 Token Info:`);
    console.log(`   Name: ${name}`);
    console.log(`   Symbol: ${symbol}`);
    console.log(`   Decimals: ${decimals}`);
    console.log(`   Total Supply: ${ethers.formatUnits(totalSupply, 6)} USDC`);
    
    // Check NEON balance
    const neonBalance = await provider.getBalance(TARGET_ADDRESS);
    console.log(`\n⛽ NEON Balance: ${ethers.formatUnits(neonBalance, 18)} NEON`);
    
    if (currentBalance > 0) {
      console.log('\n✅ You already have USDC! You can test flash loans now.');
      return;
    }
    
    console.log('\n❌ No USDC found. Here are your options to get USDC:');
    console.log('\n🔧 OPTION 1: Manual DEX Swap (Recommended)');
    console.log('1. Visit https://neonfaucet.org/ to get more NEON if needed');
    console.log('2. Use a DEX like Orca or Raydium on Solana Devnet');
    console.log('3. Swap some NEON for USDC');
    console.log('4. Transfer USDC to your Neon EVM address');
    
    console.log('\n🔧 OPTION 2: Contact Contract Owner');
    console.log('1. The USDC contract has minting restrictions');
    console.log('2. Contact the contract deployer for minting permissions');
    console.log('3. Or request USDC tokens directly from them');
    
    console.log('\n🔧 OPTION 3: Use Alternative Testing');
    console.log('1. Test with mock USDC balance (modify contract temporarily)');
    console.log('2. Use a different token that you can mint');
    console.log('3. Test the flash loan logic without real USDC');
    
    console.log('\n🔧 OPTION 4: Check Reference Implementation');
    console.log('1. Look at how the reference POC handles USDC distribution');
    console.log('2. They might have a different approach or faucet');
    console.log('3. Check their documentation for USDC acquisition');
    
    console.log('\n💡 Minimum Required: ~10 USDC for flash loan testing');
    console.log('💡 Flash loan fee: ~0.09% of borrowed amount');
    
    // Try to find any accounts with USDC
    console.log('\n🔍 Checking for accounts with USDC...');
    const testAddresses = [
      '0x0000000000000000000000000000000000000001',
      '0x0000000000000000000000000000000000000002',
      '0x0000000000000000000000000000000000000003',
      '0x0000000000000000000000000000000000000004',
      '0x0000000000000000000000000000000000000005'
    ];
    
    for (const addr of testAddresses) {
      try {
        const balance = await usdcContract.balanceOf(addr);
        if (balance > 0) {
          console.log(`Found USDC at ${addr}: ${ethers.formatUnits(balance, 6)} USDC`);
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
getUSDC(); 