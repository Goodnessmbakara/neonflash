// Environment configuration matching reference implementation
export const ENVIRONMENT_CONFIG = {
  // Neon EVM Configuration
  NEON: {
    RPC_URL: process.env.NEXT_PUBLIC_NEON_RPC_URL || 'https://devnet.neonevm.org',
    CHAIN_ID: 245022926,
    EXPLORER: 'https://devnet.neonscan.org',
  },
  
  // Solana Configuration
  SOLANA: {
    RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com',
    EXPLORER: 'https://explorer.solana.com/?cluster=devnet',
  },
  
  // Contract Addresses (matching reference implementation)
  CONTRACTS: {
    AAVE_FLASH_LOAN: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
    AAVE_POOL: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
    USDC: '0x146c38c2E36D34Ed88d843E013677cCe72341794',
    ADDRESS_PROVIDER: '0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5',
    CALL_SOLANA: '0xFF00000000000000000000000000000000000006',
  },
  
  // Token Mints (matching reference implementation)
  TOKENS: {
    USDC_MINT: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k', // devUSDC
    SAMO_MINT: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa', // devSAMO
    SOL_MINT: 'So11111111111111111111111111111111111111112',
    JUP_MINT: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  },
  
  // Orca Configuration (matching reference implementation)
  ORCA: {
    WHIRLPOOL_PROGRAM: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    WHIRLPOOLS_CONFIG: 'FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR',
    TICK_SPACING: 64,
  },
  
  // Flash Loan Configuration (matching reference implementation)
  FLASH_LOAN: {
    DEFAULT_AMOUNT: '10', // 10 USDC like reference
    MIN_AMOUNT: '10',
    MAX_AMOUNT: '10000',
    GAS_LIMIT: 5000000,
    SLIPPAGE_TOLERANCE: 0.5, // 0.5%
  },
  
  // Development flags (matching reference implementation)
  DEVELOPMENT: {
    BYPASS_USDC_CHECK: process.env.NODE_ENV === 'development',
    TEST_MODE: process.env.NODE_ENV === 'development',
  }
} as const;

// Validation function to ensure all required config is present
export function validateEnvironment(): boolean {
  const required = [
    ENVIRONMENT_CONFIG.NEON.RPC_URL,
    ENVIRONMENT_CONFIG.SOLANA.RPC_URL,
    ENVIRONMENT_CONFIG.CONTRACTS.AAVE_FLASH_LOAN,
    ENVIRONMENT_CONFIG.CONTRACTS.USDC,
  ];
  
  const missing = required.filter(value => !value);
  if (missing.length > 0) {
    console.error('Missing required environment configuration:', missing);
    return false;
  }
  
  return true;
} 