const { ethers } = require('ethers');

// Configuration
const NEON_RPC_URL = 'https://devnet.neonevm.org';
const USDC_CONTRACT_ADDRESS = '0x146c38c2E36D34Ed88d843E013677cCe72341794';
const TARGET_ADDRESS = '0x40a2aa83271dd2f86e7c50c05b60bf3873ba4461';
const MINT_AMOUNT = ethers.parseUnits('1000', 6); // 1000 USDC

// USDC Contract ABI (minimal for minting)
const USDC_ABI = [
  'function mint(address to, uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function name() external view returns (string)',
  'function symbol() external view returns (string)',
  'function decimals() external view returns (uint8)'
];

async function mintUSDC() {
  try {
    console.log('=== USDC MINTING SCRIPT ===');
    console.log(`Target Address: ${TARGET_ADDRESS}`);
    console.log(`Mint Amount: ${ethers.formatUnits(MINT_AMOUNT, 6)} USDC`);
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(NEON_RPC_URL);
    console.log('Provider created');
    
    // Check if we have a private key (you'll need to provide one)
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      console.error('❌ No private key provided. Please set PRIVATE_KEY environment variable.');
      console.log('To get a private key:');
      console.log('1. Create a new wallet or use an existing one');
      console.log('2. Export the private key');
      console.log('3. Set it as: export PRIVATE_KEY=your_private_key_here');
      console.log('4. Make sure the wallet has NEON tokens for gas');
      return;
    }
    
    // Create signer
    const signer = new ethers.Wallet(privateKey, provider);
    const signerAddress = await signer.getAddress();
    console.log(`Signer Address: ${signerAddress}`);
    
    // Check signer balance
    const signerBalance = await provider.getBalance(signerAddress);
    console.log(`Signer NEON Balance: ${ethers.formatUnits(signerBalance, 18)} NEON`);
    
    if (signerBalance < ethers.parseEther('0.01')) {
      console.error('❌ Insufficient NEON balance for gas. Need at least 0.01 NEON');
      return;
    }
    
    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_CONTRACT_ADDRESS, USDC_ABI, signer);
    console.log('USDC contract instance created');
    
    // Check current USDC balance
    const currentBalance = await usdcContract.balanceOf(TARGET_ADDRESS);
    console.log(`Current USDC Balance: ${ethers.formatUnits(currentBalance, 6)} USDC`);
    
    // Check contract info
    const name = await usdcContract.name();
    const symbol = await usdcContract.symbol();
    const decimals = await usdcContract.decimals();
    console.log(`Token: ${name} (${symbol}) - ${decimals} decimals`);
    
    // Mint USDC
    console.log('\n🔄 Minting USDC...');
    const tx = await usdcContract.mint(TARGET_ADDRESS, MINT_AMOUNT, {
      gasLimit: 200000
    });
    
    console.log(`Transaction sent: ${tx.hash}`);
    console.log('Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed! Block: ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    // Check new balance
    const newBalance = await usdcContract.balanceOf(TARGET_ADDRESS);
    console.log(`New USDC Balance: ${ethers.formatUnits(newBalance, 6)} USDC`);
    
    console.log('\n🎉 USDC minting successful!');
    console.log(`You can now test flash loans with ${ethers.formatUnits(newBalance, 6)} USDC`);
    
  } catch (error) {
    console.error('❌ Error minting USDC:', error);
    
    if (error.message.includes('execution reverted')) {
      console.log('\n💡 Possible solutions:');
      console.log('1. The signer might not have minting permissions');
      console.log('2. Try using a different account that has minting rights');
      console.log('3. Check if the contract has access control');
      console.log('4. Contact the contract owner for minting permissions');
    }
  }
}

// Run the script
mintUSDC(); 