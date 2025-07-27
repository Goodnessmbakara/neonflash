const { ethers } = require('ethers');
const { OrcaInstructionBuilder } = require('../lib/services/orca-instruction-builder');

async function testOrcaInstructions() {
  try {
    console.log('=== TESTING ORCA INSTRUCTION BUILDING ===');
    
    // Test parameters
    const params = {
      amountIn: '100', // 100 USDC
      tokenInMint: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k', // devUSDC
      tokenOutMint: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa', // devSAMO
      contractAddress: '11111111111111111111111111111111', // Placeholder
      userAddress: '0x40a2Aa83271dd2F86e7C50C05b60bf3873bA4461'
    };
    
    console.log('Test parameters:', params);
    
    // Create Orca builder
    const orcaBuilder = new OrcaInstructionBuilder('NeonVMFwwsqd2TqVLjJNFJfz4wKVNQv5qgrJ9bw4M3');
    
    // Build instructions
    console.log('Building Orca swap instructions...');
    const instructions = await orcaBuilder.buildOrcaSwapInstructions(params);
    
    console.log('Instructions built successfully!');
    console.log('Number of instruction sets:', instructions.length);
    
    // Test instruction preparation
    if (instructions.length >= 2) {
      const instruction1 = orcaBuilder.prepareInstruction(instructions[0].instructions[0]);
      const instruction2 = orcaBuilder.prepareInstruction(instructions[1].instructions[0]);
      
      console.log('Instruction 1 prepared:', instruction1.substring(0, 50) + '...');
      console.log('Instruction 2 prepared:', instruction2.substring(0, 50) + '...');
      
      console.log('✅ Orca instruction building test PASSED');
    } else {
      console.log('❌ Expected 2 instruction sets, got:', instructions.length);
    }
    
  } catch (error) {
    console.error('❌ Orca instruction building test FAILED:', error);
  }
}

// Run the test
testOrcaInstructions(); 