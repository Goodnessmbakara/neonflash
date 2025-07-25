export const CONTRACT_ADDRESSES = {
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
    // Token mints - Updated to match test file
    USDC_MINT: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k', // devUSDC
    SAMO_MINT: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa', // devSAMO
    SOL_MINT: 'So11111111111111111111111111111111111111112',
    JUP_MINT: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    // Whirlpools config
    WHIRLPOOLS_CONFIG: 'FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR',
  },
} as const;

export const NETWORK_CONFIG = {
  NEON_DEVNET: {
    chainId: 245022926,
    name: 'Neon EVM DevNet',
    rpcUrl: 'https://devnet.neonevm.org',
    explorer: 'https://devnet.neonscan.org',
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