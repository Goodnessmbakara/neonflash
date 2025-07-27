const { ethers } = require('ethers');

// Configuration
const NEON_RPC_URL = 'https://devnet.neonevm.org';
const AAVE_FLASH_LOAN_ADDRESS = '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0';
const USDC_ADDRESS = '0x146c38c2E36D34Ed88d843E013677cCe72341794';

// ABI for flashLoanSimple function
const FLASH_LOAN_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "internalType": "bytes",
        "name": "instructionData1",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "instructionData2",
        "type": "bytes"
      }
    ],
    "name": "flashLoanSimple",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];

async function debugFlashLoanCall() {
  try {
    console.log('=== DEBUGGING FLASH LOAN CALL ===');
    
    // Create provider
    const provider = new ethers.JsonRpcProvider(NEON_RPC_URL);
    console.log('Provider created');
    
    // Create contract instance
    const flashLoanContract = new ethers.Contract(AAVE_FLASH_LOAN_ADDRESS, FLASH_LOAN_ABI, provider);
    console.log('Flash loan contract instance created');
    
    // Test parameters
    const token = USDC_ADDRESS;
    const amount = ethers.parseUnits('100', 6); // 100 USDC
    const instructionData1 = "0x";
    const instructionData2 = "0x";
    
    console.log('Test parameters:');
    console.log(`- Token: ${token}`);
    console.log(`- Amount: ${ethers.formatUnits(amount, 6)} USDC`);
    console.log(`- Instruction Data 1: ${instructionData1}`);
    console.log(`- Instruction Data 2: ${instructionData2}`);
    
    // Test function encoding
    console.log('\nTesting function encoding...');
    try {
      const encodedData = flashLoanContract.interface.encodeFunctionData('flashLoanSimple', [
        token,
        amount,
        instructionData1,
        instructionData2
      ]);
      console.log(`✅ Function encoding successful:`);
      console.log(`- Encoded data: ${encodedData}`);
      console.log(`- Data length: ${encodedData.length} characters`);
    } catch (error) {
      console.error(`❌ Function encoding failed:`, error.message);
    }
    
    // Test contract call (read-only)
    console.log('\nTesting contract call (read-only)...');
    try {
      const lastLoan = await flashLoanContract.lastLoan();
      console.log(`✅ Contract call successful:`);
      console.log(`- Last loan: ${ethers.formatUnits(lastLoan, 6)} USDC`);
    } catch (error) {
      console.error(`❌ Contract call failed:`, error.message);
    }
    
    // Test contract address
    console.log('\nTesting contract address...');
    try {
      const code = await provider.getCode(AAVE_FLASH_LOAN_ADDRESS);
      console.log(`✅ Contract address valid:`);
      console.log(`- Has code: ${code !== '0x'}`);
      console.log(`- Code length: ${code.length} characters`);
    } catch (error) {
      console.error(`❌ Contract address check failed:`, error.message);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Run the debug
debugFlashLoanCall(); 