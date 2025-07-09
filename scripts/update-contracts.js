#!/usr/bin/env node

/**
 * Contract Artifacts Management Script
 * 
 * This script helps manage contract artifacts for the frontend.
 * It can copy ABIs and addresses from the smart contract repository
 * to the frontend's lib/contracts directory.
 * 
 * Usage:
 *   node scripts/update-contracts.js --copy-abi AaveFlashLoan
 *   node scripts/update-contracts.js --copy-all
 *   node scripts/update-contracts.js --update-addresses
 */

const fs = require('fs');
const path = require('path');

const CONTRACTS_SOURCE_DIR = '../neonflash-contracts'; // Adjust path as needed
const FRONTEND_CONTRACTS_DIR = './lib/contracts';

const CONTRACTS = [
  'AaveFlashLoan',
  'ERC20ForSpl',
  'IERC20ForSpl',
  'ICallSolana',
];

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

function copyAbi(contractName) {
  const sourcePath = path.join(CONTRACTS_SOURCE_DIR, 'artifacts', `${contractName}.json`);
  const targetPath = path.join(FRONTEND_CONTRACTS_DIR, 'artifacts', `${contractName}.json`);
  
  if (!fs.existsSync(sourcePath)) {
    console.error(`❌ Contract artifact not found: ${sourcePath}`);
    console.log(`Make sure the smart contract repository is available at: ${CONTRACTS_SOURCE_DIR}`);
    return false;
  }
  
  try {
    ensureDirectoryExists(path.dirname(targetPath));
    fs.copyFileSync(sourcePath, targetPath);
    console.log(`✅ Copied ABI for ${contractName}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to copy ABI for ${contractName}:`, error.message);
    return false;
  }
}

function copyAllAbis() {
  console.log('📋 Copying all contract ABIs...');
  let successCount = 0;
  
  CONTRACTS.forEach(contractName => {
    if (copyAbi(contractName)) {
      successCount++;
    }
  });
  
  console.log(`\n📊 Summary: ${successCount}/${CONTRACTS.length} ABIs copied successfully`);
}

function updateAddresses() {
  console.log('🏗️  Updating contract addresses...');
  
  // This would typically read from deployment files or environment variables
  // For now, we'll create a template with the current addresses
  
  const addressesTemplate = `export const CONTRACT_ADDRESSES = {
  // Neon EVM Devnet
  NEON_DEVNET: {
    AAVE_FLASH_LOAN: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
    AAVE_POOL: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
    USDC: '0x146c38c2E36D34Ed88d843E013677cCe72341794',
    ADDRESS_PROVIDER: '0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5',
    // Neon EVM Precompiles
    CALL_SOLANA: '0xFF00000000000000000000000000000000000006',
  },
  // Solana Devnet
  SOLANA_DEVNET: {
    ORCA_WHIRLPOOL_PROGRAM: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    RAYDIUM_PROGRAM: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    JUPITER_PROGRAM: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
    // Token mints
    USDC_MINT: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
    SAMO_MINT: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    SOL_MINT: 'So11111111111111111111111111111111111111112',
    JUP_MINT: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  },
} as const;

export const NETWORK_CONFIG = {
  NEON_DEVNET: {
    chainId: 245022926,
    name: 'Neon EVM Devnet',
    rpcUrl: 'https://devnet.neonevm.org',
    explorer: 'https://neon-devnet.blockscout.com',
    currency: {
      name: 'NEON',
      symbol: 'NEON',
      decimals: 18,
    },
  },
  SOLANA_DEVNET: {
    name: 'Solana Devnet',
    rpcUrl: 'https://api.devnet.solana.com',
    explorer: 'https://explorer.solana.com/?cluster=devnet',
  },
} as const;

export type NetworkType = keyof typeof NETWORK_CONFIG;
export type ContractAddresses = typeof CONTRACT_ADDRESSES;
`;
  
  try {
    fs.writeFileSync(
      path.join(FRONTEND_CONTRACTS_DIR, 'addresses.ts'),
      addressesTemplate
    );
    console.log('✅ Updated contract addresses');
  } catch (error) {
    console.error('❌ Failed to update addresses:', error.message);
  }
}

function showHelp() {
  console.log(`
🔧 Contract Artifacts Management Script

Usage:
  node scripts/update-contracts.js [options]

Options:
  --copy-abi <contract>    Copy ABI for specific contract
  --copy-all              Copy ABIs for all contracts
  --update-addresses      Update contract addresses
  --help                  Show this help message

Examples:
  node scripts/update-contracts.js --copy-abi AaveFlashLoan
  node scripts/update-contracts.js --copy-all
  node scripts/update-contracts.js --update-addresses

Available contracts:
  ${CONTRACTS.join(', ')}
`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }
  
  if (args.includes('--copy-all')) {
    copyAllAbis();
  }
  
  if (args.includes('--update-addresses')) {
    updateAddresses();
  }
  
  const copyAbiIndex = args.indexOf('--copy-abi');
  if (copyAbiIndex !== -1 && args[copyAbiIndex + 1]) {
    const contractName = args[copyAbiIndex + 1];
    if (CONTRACTS.includes(contractName)) {
      copyAbi(contractName);
    } else {
      console.error(`❌ Unknown contract: ${contractName}`);
      console.log(`Available contracts: ${CONTRACTS.join(', ')}`);
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  copyAbi,
  copyAllAbis,
  updateAddresses,
  CONTRACTS,
}; 