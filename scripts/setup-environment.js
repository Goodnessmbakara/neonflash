#!/usr/bin/env node

/**
 * Environment Setup Script
 * Validates and sets up the environment configuration for NeonFlash
 * This matches the reference implementation's setup process
 */

const fs = require('fs');
const path = require('path');

// Environment configuration (matching reference implementation)
const REQUIRED_ENV_VARS = {
  NEXT_PUBLIC_NEON_RPC_URL: 'https://devnet.neonevm.org',
  NEXT_PUBLIC_SOLANA_RPC_URL: 'https://api.devnet.solana.com',
};

const REQUIRED_CONTRACTS = {
  AAVE_FLASH_LOAN: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
  AAVE_POOL: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
  USDC: '0x146c38c2E36D34Ed88d843E013677cCe72341794',
  ADDRESS_PROVIDER: '0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5',
};

const REQUIRED_TOKENS = {
  USDC_MINT: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
  SAMO_MINT: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa',
  SOL_MINT: 'So11111111111111111111111111111111111111112',
  JUP_MINT: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  const missing = [];
  for (const [key, defaultValue] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(key);
      console.log(`⚠️  Missing: ${key} (will use default: ${defaultValue})`);
    } else {
      console.log(`✅ Found: ${key} = ${process.env[key]}`);
    }
  }
  
  return missing.length === 0;
}

function checkContractAddresses() {
  console.log('\n🔍 Checking contract addresses...');
  
  const addressesFile = path.join(__dirname, '../lib/contracts/addresses.ts');
  if (!fs.existsSync(addressesFile)) {
    console.error('❌ Contract addresses file not found:', addressesFile);
    return false;
  }
  
  const content = fs.readFileSync(addressesFile, 'utf8');
  
  for (const [contract, address] of Object.entries(REQUIRED_CONTRACTS)) {
    if (content.includes(address)) {
      console.log(`✅ Found: ${contract} = ${address}`);
    } else {
      console.error(`❌ Missing: ${contract} = ${address}`);
      return false;
    }
  }
  
  return true;
}

function checkTokenMints() {
  console.log('\n🔍 Checking token mints...');
  
  const addressesFile = path.join(__dirname, '../lib/contracts/addresses.ts');
  const content = fs.readFileSync(addressesFile, 'utf8');
  
  for (const [token, mint] of Object.entries(REQUIRED_TOKENS)) {
    if (content.includes(mint)) {
      console.log(`✅ Found: ${token} = ${mint}`);
    } else {
      console.error(`❌ Missing: ${token} = ${mint}`);
      return false;
    }
  }
  
  return true;
}

function checkDependencies() {
  console.log('\n🔍 Checking dependencies...');
  
  const packageJson = path.join(__dirname, '../package.json');
  if (!fs.existsSync(packageJson)) {
    console.error('❌ package.json not found');
    return false;
  }
  
  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  const requiredDeps = [
    '@solana/web3.js',
    '@coral-xyz/anchor',
    '@orca-so/whirlpools-sdk',
    '@orca-so/common-sdk',
    '@solana/spl-token',
    'ethers'
  ];
  
  for (const dep of requiredDeps) {
    if (pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]) {
      console.log(`✅ Found: ${dep}`);
    } else {
      console.error(`❌ Missing: ${dep}`);
      return false;
    }
  }
  
  return true;
}

function createEnvExample() {
  console.log('\n📝 Creating .env.example...');
  
  const envExample = `# Neon EVM Configuration
NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Development Configuration
NODE_ENV=development
BYPASS_USDC_CHECK=true

# Optional: Custom RPC endpoints
# NEXT_PUBLIC_NEON_RPC_URL=https://your-neon-rpc.com
# NEXT_PUBLIC_SOLANA_RPC_URL=https://your-solana-rpc.com
`;
  
  const envExamplePath = path.join(__dirname, '../.env.example');
  fs.writeFileSync(envExamplePath, envExample);
  console.log('✅ Created .env.example');
}

function main() {
  console.log('🚀 NeonFlash Environment Setup\n');
  console.log('This script validates your environment configuration');
  console.log('to ensure it matches the reference implementation.\n');
  
  let allChecksPassed = true;
  
  // Check environment variables
  if (!checkEnvironmentVariables()) {
    allChecksPassed = false;
  }
  
  // Check contract addresses
  if (!checkContractAddresses()) {
    allChecksPassed = false;
  }
  
  // Check token mints
  if (!checkTokenMints()) {
    allChecksPassed = false;
  }
  
  // Check dependencies
  if (!checkDependencies()) {
    allChecksPassed = false;
  }
  
  // Create .env.example
  createEnvExample();
  
  console.log('\n' + '='.repeat(50));
  
  if (allChecksPassed) {
    console.log('🎉 All checks passed! Your environment is ready.');
    console.log('\nNext steps:');
    console.log('1. Copy .env.example to .env.local');
    console.log('2. Customize any settings if needed');
    console.log('3. Run: npm run dev');
    console.log('\nYour frontend should now work identically to the reference implementation!');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    console.log('\nCommon fixes:');
    console.log('1. Install missing dependencies: npm install');
    console.log('2. Update contract addresses in lib/contracts/addresses.ts');
    console.log('3. Set environment variables in .env.local');
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkContractAddresses,
  checkTokenMints,
  checkDependencies,
  createEnvExample
}; 