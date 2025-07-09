export const CONFIG = {
  // Network Configuration
  networks: {
    ethereum: {
      mainnet: {
        chainId: 245022934, // Neon Mainnet
        name: 'Neon Mainnet',
        rpcUrl: 'https://neon-proxy-mainnet.solana.p2p.org',
        explorer: 'https://neon.blockscout.com',
        contracts: {
          aavePool: '', // To be deployed
          aaveFlashLoan: '', // To be deployed
          usdc: '', // To be deployed
          addressProvider: '', // To be deployed
        }
      },
      devnet: {
        chainId: 245022926, // Neon Devnet
        name: 'Neon Devnet',
        rpcUrl: 'https://devnet.neonevm.org',
        explorer: 'https://neon-devnet.blockscout.com',
        contracts: {
          aavePool: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
          aaveFlashLoan: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
          usdc: '0x146c38c2E36D34Ed88d843E013677cCe72341794',
          addressProvider: '0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5',
          erc20ForSplFactory: '0xF6b17787154C418d5773Ea22Afc87A95CAA3e957',
          wsol: '0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c'
        }
      }
    },
    solana: {
      mainnet: {
        name: 'Solana Mainnet',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        explorer: 'https://solscan.io',
        programs: {
          whirlpool: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
          raydium: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
          jupiter: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        },
        tokens: {
          usdc: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          samo: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
          sol: 'So11111111111111111111111111111111111111112'
        }
      },
      devnet: {
        name: 'Solana Devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        explorer: 'https://solscan.io/?cluster=devnet',
        programs: {
          whirlpool: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
          raydium: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
          jupiter: 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB',
        },
        tokens: {
          usdc: 'BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k',
          samo: 'Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa',
          sol: 'So11111111111111111111111111111111111111112'
        },
        whirlpoolsConfig: 'FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR'
      }
    }
  },

  // Arbitrage Strategies
  strategies: [
    {
      id: 'usdc-samo-usdc',
      name: 'USDC → SAMO → USDC',
      description: 'Arbitrage using Orca Whirlpool for SAMO token',
      riskLevel: 'Medium',
      expectedProfit: '0.5-2%',
      successRate: '85%',
      protocol: 'Orca Whirlpool',
      parameters: {
        minAmount: 1000, // USDC
        maxAmount: 100000, // USDC
        slippageTolerance: 0.5, // 0.5%
      }
    },
    {
      id: 'usdc-sol-usdc',
      name: 'USDC → SOL → USDC',
      description: 'Arbitrage using Raydium for SOL token',
      riskLevel: 'Low',
      expectedProfit: '0.3-1.5%',
      successRate: '92%',
      protocol: 'Raydium',
      parameters: {
        minAmount: 1000, // USDC
        maxAmount: 100000, // USDC
        slippageTolerance: 0.3, // 0.3%
      }
    },
    {
      id: 'usdc-jup-usdc',
      name: 'USDC → JUP → USDC',
      description: 'Arbitrage using Jupiter for JUP token',
      riskLevel: 'Medium',
      expectedProfit: '0.4-1.8%',
      successRate: '88%',
      protocol: 'Jupiter',
      parameters: {
        minAmount: 1000, // USDC
        maxAmount: 100000, // USDC
        slippageTolerance: 0.4, // 0.4%
      }
    }
  ],

  // Flash Loan Configuration
  flashLoan: {
    feePercentage: 0.09, // 0.09% Aave flash loan fee
    maxAmount: 1000000, // 1M USDC max
    minAmount: 100, // 100 USDC min
    gasLimit: 500000, // Gas limit for flash loan transactions
  },

  // Cross-Chain Configuration
  crossChain: {
    bridge: 'wormhole', // Using Wormhole for cross-chain transfers
    timeout: 300000, // 5 minutes timeout
    retryAttempts: 3,
  },

  // UI Configuration
  ui: {
    refreshInterval: 5000, // 5 seconds for price updates
    maxTransactionHistory: 100,
    defaultSlippage: 0.5, // 0.5%
  },

  // API Endpoints
  api: {
    priceFeeds: {
      coingecko: 'https://api.coingecko.com/api/v3',
      coinmarketcap: 'https://pro-api.coinmarketcap.com/v1',
    },
    ipfs: {
      gateway: 'https://ipfs.io/ipfs/',
      api: 'https://ipfs.infura.io:5001/api/v0',
    }
  }
} as const;

export type NetworkType = 'mainnet' | 'devnet';
export type ChainType = 'ethereum' | 'solana';
export type StrategyId = typeof CONFIG.strategies[number]['id']; 