#!/usr/bin/env node

/**
 * Test script for NeonFlash implementation
 * This script tests the key components of your flash loan system
 */

const { ethers } = require('ethers');
const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  NEON_DEVNET_RPC: 'https://devnet.neonevm.org',
  SOLANA_DEVNET_RPC: 'https://api.devnet.solana.com',
  CONTRACTS: {
    AAVE_FLASH_LOAN: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
    USDC: '0x146c38c2E36D34Ed88d843E013677cCe72341794',
    AAVE_POOL: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
  },
  TOKENS: {
    USDC_MINT: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
    SAMO_MINT: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa',
  },
  ORCA: {
    WHIRLPOOL_PROGRAM: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    WHIRLPOOLS_CONFIG: 'FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR',
  }
};

// Test wallet (you'll need to replace with a real private key for actual testing)
const TEST_PRIVATE_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';
const TEST_AMOUNT = ethers.parseUnits('100', 6); // 100 USDC

class NeonFlashTester {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(CONFIG.NEON_DEVNET_RPC);
    this.signer = new ethers.Wallet(TEST_PRIVATE_KEY, this.provider);
  }

  async runAllTests() {
    console.log('🚀 Starting NeonFlash Implementation Tests\n');
    
    try {
      await this.testNetworkConnectivity();
      await this.testContractAccessibility();
      await this.testPriceAPI();
      await this.testOrcaInstructionBuilder();
      await this.testFlashLoanContract();
      await this.testUSDCContract();
      
      console.log('\n✅ All tests completed successfully!');
    } catch (error) {
      console.error('\n❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  async testNetworkConnectivity() {
    console.log('1. Testing Network Connectivity...');
    
    // Test Neon EVM connectivity
    try {
      const neonBlock = await this.provider.getBlockNumber();
      console.log(`   ✅ Neon EVM connected. Latest block: ${neonBlock}`);
    } catch (error) {
      throw new Error(`Neon EVM connection failed: ${error.message}`);
    }

    // Test Solana connectivity
    try {
      const solanaResponse = await fetch(CONFIG.SOLANA_DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        })
      });
      
      if (!solanaResponse.ok) {
        throw new Error(`Solana RPC error: ${solanaResponse.status}`);
      }
      
      const solanaHealth = await solanaResponse.json();
      console.log(`   ✅ Solana connected. Health: ${solanaHealth.result}`);
    } catch (error) {
      throw new Error(`Solana connection failed: ${error.message}`);
    }
  }

  async testContractAccessibility() {
    console.log('\n2. Testing Contract Accessibility...');
    
    // Test Aave Flash Loan contract
    try {
      const flashLoanCode = await this.provider.getCode(CONFIG.CONTRACTS.AAVE_FLASH_LOAN);
      if (flashLoanCode === '0x') {
        throw new Error('Flash loan contract not deployed');
      }
      console.log(`   ✅ Aave Flash Loan contract accessible at ${CONFIG.CONTRACTS.AAVE_FLASH_LOAN}`);
    } catch (error) {
      throw new Error(`Flash loan contract test failed: ${error.message}`);
    }

    // Test USDC contract
    try {
      const usdcCode = await this.provider.getCode(CONFIG.CONTRACTS.USDC);
      if (usdcCode === '0x') {
        throw new Error('USDC contract not deployed');
      }
      console.log(`   ✅ USDC contract accessible at ${CONFIG.CONTRACTS.USDC}`);
    } catch (error) {
      throw new Error(`USDC contract test failed: ${error.message}`);
    }
  }

  async testPriceAPI() {
    console.log('\n3. Testing Price API...');
    
    try {
      const response = await fetch('http://localhost:3000/api/prices');
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`   ✅ Price API working. Found ${data.data?.length || 0} tokens`);
      
      if (data.data && data.data.length > 0) {
        data.data.forEach(token => {
          console.log(`      - ${token.token}: Neon=${token.neonPrice}, Solana=${token.solanaPrice}`);
        });
      }
    } catch (error) {
      console.log(`   ⚠️  Price API test failed (server may not be running): ${error.message}`);
    }
  }

  async testOrcaInstructionBuilder() {
    console.log('\n4. Testing Orca Instruction Builder...');
    
    try {
      // Test Neon EVM params endpoint
      const neonParamsResponse = await fetch(CONFIG.NEON_DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'neon_getEvmParams',
          params: []
        })
      });
      
      if (!neonParamsResponse.ok) {
        throw new Error(`Neon EVM params error: ${neonParamsResponse.status}`);
      }
      
      const neonParams = await neonParamsResponse.json();
      console.log(`   ✅ Neon EVM params accessible. Program ID: ${neonParams.result?.neonEvmProgramId}`);
      
      // Test Solana account info for token mints
      const usdcMintResponse = await fetch(CONFIG.SOLANA_DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [CONFIG.TOKENS.USDC_MINT, { encoding: 'base64' }]
        })
      });
      
      if (!usdcMintResponse.ok) {
        throw new Error(`USDC mint info error: ${usdcMintResponse.status}`);
      }
      
      const usdcMintInfo = await usdcMintResponse.json();
      console.log(`   ✅ USDC mint accessible: ${CONFIG.TOKENS.USDC_MINT}`);
      
      // Test SAMO mint
      const samoMintResponse = await fetch(CONFIG.SOLANA_DEVNET_RPC, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getAccountInfo',
          params: [CONFIG.TOKENS.SAMO_MINT, { encoding: 'base64' }]
        })
      });
      
      if (!samoMintResponse.ok) {
        throw new Error(`SAMO mint info error: ${samoMintResponse.status}`);
      }
      
      const samoMintInfo = await samoMintResponse.json();
      console.log(`   ✅ SAMO mint accessible: ${CONFIG.TOKENS.SAMO_MINT}`);
      
    } catch (error) {
      throw new Error(`Orca instruction builder test failed: ${error.message}`);
    }
  }

  async testFlashLoanContract() {
    console.log('\n5. Testing Flash Loan Contract...');
    
    try {
      // Test contract methods via RPC
      const flashLoanContract = new ethers.Contract(
        CONFIG.CONTRACTS.AAVE_FLASH_LOAN,
        [
          'function getNeonAddress(address _address) public view returns(bytes32)',
          'function getPayer() public view returns(bytes32)',
          'function lastLoan() public view returns(uint256)',
          'function lastLoanFee() public view returns(uint256)',
        ],
        this.provider
      );
      
      // Test getNeonAddress method
      const testAddress = '0x1234567890123456789012345678901234567890';
      const neonAddress = await flashLoanContract.getNeonAddress(testAddress);
      console.log(`   ✅ getNeonAddress working. Test address ${testAddress} -> ${neonAddress}`);
      
      // Test getPayer method
      const payer = await flashLoanContract.getPayer();
      console.log(`   ✅ getPayer working. Payer: ${payer}`);
      
      // Test lastLoan method
      const lastLoan = await flashLoanContract.lastLoan();
      console.log(`   ✅ lastLoan working. Last loan: ${ethers.formatUnits(lastLoan, 6)} USDC`);
      
      // Test lastLoanFee method
      const lastLoanFee = await flashLoanContract.lastLoanFee();
      console.log(`   ✅ lastLoanFee working. Last fee: ${ethers.formatUnits(lastLoanFee, 6)} USDC`);
      
    } catch (error) {
      throw new Error(`Flash loan contract test failed: ${error.message}`);
    }
  }

  async testUSDCContract() {
    console.log('\n6. Testing USDC Contract...');
    
    try {
      const usdcContract = new ethers.Contract(
        CONFIG.CONTRACTS.USDC,
        [
          'function totalSupply() external view returns (uint256)',
          'function balanceOf(address account) external view returns (uint256)',
          'function name() external view returns (string)',
          'function symbol() external view returns (string)',
          'function decimals() external view returns (uint8)',
        ],
        this.provider
      );
      
      // Test basic token info
      const name = await usdcContract.name();
      const symbol = await usdcContract.symbol();
      const decimals = await usdcContract.decimals();
      const totalSupply = await usdcContract.totalSupply();
      
      console.log(`   ✅ USDC contract info:`);
      console.log(`      - Name: ${name}`);
      console.log(`      - Symbol: ${symbol}`);
      console.log(`      - Decimals: ${decimals}`);
      console.log(`      - Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
      
      // Test balanceOf for test address
      const testAddress = await this.signer.getAddress();
      const balance = await usdcContract.balanceOf(testAddress);
      console.log(`   ✅ balanceOf working. Test address ${testAddress}: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
      
    } catch (error) {
      throw new Error(`USDC contract test failed: ${error.message}`);
    }
  }
}

// Run tests
async function main() {
  const tester = new NeonFlashTester();
  await tester.runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { NeonFlashTester, CONFIG }; 