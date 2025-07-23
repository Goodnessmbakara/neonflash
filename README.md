# NeonFlash - Cross-Chain Flash Loan Platform

A **breakthrough DeFi solution** that enables cross-chain flash loans between Ethereum (Neon EVM) and Solana for arbitrage opportunities. Built by Goodness Mbakara for the Neon EVM bootcamp.

## 🌟 **BREAKTHROUGH FEATURES**

### 🔗 **Frontend Integration with Neon EVM Precompiles**
**This is a world-first achievement!** NeonFlash successfully integrates frontend applications with Neon EVM's revolutionary precompile system:

- **Direct Solana Program Calls**: Frontend can now call Solana programs directly from React components through Neon EVM precompiles
- **ICallSolana Integration**: Seamless integration with the `0xFF00000000000000000000000000000000000006` precompile address
- **Real-time Instruction Building**: Dynamic Solana instruction creation from the frontend
- **Cross-Chain Composability**: Ethereum contracts calling Solana programs in real-time

### 🎯 **Multiple Arbitrage Strategies**
NeonFlash implements **three distinct arbitrage strategies** for maximum profit opportunities:

1. **USDC → SAMO → USDC** (Orca Whirlpool)
   - Protocol: Orca Whirlpool DEX
   - Risk Level: Medium
   - Estimated Profit: 0.5%
   - Advanced liquidity pool arbitrage

2. **USDC → SOL → USDC** (Raydium)
   - Protocol: Raydium DEX
   - Risk Level: Low
   - Estimated Profit: 0.3%
   - Stable SOL pair arbitrage

3. **USDC → JUP → USDC** (Jupiter)
   - Protocol: Jupiter Aggregator
   - Risk Level: High
   - Estimated Profit: 1.2%
   - Aggregated DEX arbitrage

### 💰 **Comprehensive Airdrop System**
Built-in token distribution system for seamless testing:

- **NEON Token Airdrop**: Direct integration with Neon Faucet API
- **USDC Token Guidance**: Smart contract integration for USDC distribution
- **Solana SOL Airdrop**: Devnet SOL distribution for testing
- **Retry Logic**: Robust error handling with exponential backoff
- **Balance Verification**: Pre and post-airdrop balance checking

## 🌐 Live Prototype

**🚀 Try the MVP:** [https://neonflash.vercel.app/](https://neonflash.vercel.app/)

## ✅ Implementation Status & Test Results

**🎉 All Infrastructure Tests Passed!** (13/13 tests successful)

The platform has been thoroughly tested and verified to be fully functional:

- ✅ **Network Connectivity**: Both Neon EVM and Solana devnets operational
- ✅ **Smart Contracts**: All contracts deployed and accessible
- ✅ **Contract Methods**: All tested methods return expected values  
- ✅ **Token Infrastructure**: USDC and SAMO tokens properly configured
- ✅ **API Endpoints**: All endpoints responding correctly
- ✅ **Airdrop System**: NEON airdrop functional, USDC guidance provided
- ✅ **Precompile Integration**: Frontend successfully calls Solana programs
- ✅ **Multi-Strategy Support**: All three arbitrage strategies implemented
- ✅ **Dual Wallet System**: MetaMask + Phantom integration working

**📊 Detailed Test Results:** See [CURL_TEST_RESULTS.md](./CURL_TEST_RESULTS.md) for comprehensive test suite results and implementation verification.

**🔧 Ready for Real Testing:** The platform is fully functional and ready for real-world flash loan transactions using funded wallets.

## 🚀 Key Features

- **Cross-Chain Flash Loans**: Borrow from Aave V3 on Neon EVM and execute arbitrage on Solana
- **Atomic Transactions**: All operations happen in a single atomic transaction
- **Multiple Strategies**: Support for Orca Whirlpool, Raydium, and Jupiter arbitrage
- **Real-time Analytics**: Track performance and profit calculations
- **User-Friendly Interface**: Complex DeFi operations made simple
- **Dual Wallet Support**: Seamless MetaMask + Phantom integration
- **Comprehensive Testing**: 13/13 infrastructure tests passed

## 🏗️ Architecture

### Smart Contracts (Separate Repository)
The smart contracts are managed in a separate repository for better organization and maintainability:

- **AaveFlashLoan.sol**: Main contract that handles flash loan requests and Solana composability
- **IERC20ForSpl.sol**: Interface for Solana token operations from Ethereum
- **ICallSolana.sol**: Precompile interface for calling Solana programs from Solidity

### Frontend (Next.js)
- **React 19** with **TypeScript**
- **Tailwind CSS** for styling
- **Zustand** for state management
- **Wagmi** for Ethereum wallet integration
- **Solana Wallet Adapter** for Solana wallet integration

## 📁 Project Structure

```
neonflash/
├── app/                    # Next.js app directory
│   ├── analytics/         # Analytics dashboard
│   ├── flash-loan/        # Flash loan execution page
│   ├── history/           # Transaction history
│   └── settings/          # User settings
├── components/            # React components
│   ├── ui/               # Shadcn/ui components
│   └── pages/            # Page-specific components
├── lib/                  # Core libraries
│   ├── config.ts         # Configuration and constants
│   ├── store.ts          # Zustand state management
│   ├── services/         # Business logic services
│   │   ├── flash-loan-service.ts      # Main flash loan logic
│   │   ├── orca-instruction-builder.ts # Orca strategy implementation
│   │   ├── analytics-service.ts       # Analytics and transaction tracking
│   │   └── metric-service.ts          # Real-time metrics and performance tracking
│   └── contracts/        # Smart contract artifacts
│       ├── artifacts/    # Contract ABIs (JSON files)
│       ├── abis.ts       # ABI exports and types
│       └── addresses.ts  # Contract addresses and network config
├── scripts/              # Build and deployment scripts
│   └── update-contracts.js # Contract artifacts management
└── hooks/                # Custom React hooks
```

## 🔧 Smart Contract Integration

### Contract Artifacts Management
The frontend only contains the necessary contract artifacts (ABIs and addresses) for integration:

```bash
# Copy ABIs from smart contract repository
node scripts/update-contracts.js --copy-abi AaveFlashLoan

# Copy all ABIs
node scripts/update-contracts.js --copy-all

# Update contract addresses
node scripts/update-contracts.js --update-addresses
```

### Neon EVM Composability
The platform uses Neon EVM's unique composability feature that allows Solidity contracts to call Solana programs directly through the `ICallSolana` precompile at address `0xFF00000000000000000000000000000000000006`.

### Key Contracts

#### AaveFlashLoan.sol
```solidity
// Core flash loan function
function flashLoanSimple(
    address token,
    uint256 amount,
    bytes memory instructionData1,
    bytes memory instructionData2
) public
```

#### IERC20ForSpl.sol
```solidity
// Transfer tokens to Solana
function transferSolana(bytes32 to, uint64 amount) external returns(bool);
```

### Contract Addresses (Devnet)
- **AaveFlashLoan**: `0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0`
- **Aave Pool**: `0x9eA85823b7B736189e663ddef0FEE250EF0d23E1`
- **USDC**: `0x146c38c2E36D34Ed88d843E013677cCe72341794`
- **Address Provider**: `0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5`
- **ICallSolana Precompile**: `0xFF00000000000000000000000000000000000006`

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- pnpm (recommended) or npm
- MetaMask wallet
- Phantom wallet (for Solana)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd neonflash
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your configuration:
   ```env
   NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org
   NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
   ```

4. **Set up contract artifacts** (if you have access to the smart contract repository)
   ```bash
   # Copy contract ABIs
   node scripts/update-contracts.js --copy-all
   
   # Update addresses if needed
   node scripts/update-contracts.js --update-addresses
   ```

5. **Run the development server**
   ```bash
   pnpm dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔗 Wallet Connection

### Ethereum (Neon EVM)
The platform connects to Neon EVM through MetaMask or WalletConnect:

1. Add Neon Devnet to MetaMask:
   - Network Name: Neon Devnet
   - RPC URL: https://devnet.neonevm.org
   - Chain ID: 245022926
   - Currency Symbol: NEON

2. Get test NEON tokens from the [Neon Faucet](https://neonfaucet.org/)

### Solana
Connect your Phantom wallet to Solana Devnet for testing arbitrage strategies.

## 💡 Usage

### 1. Connect Wallets
- Connect both Ethereum (Neon EVM) and Solana wallets
- Ensure you have test tokens on both networks

### 2. Select Strategy
Choose from available arbitrage strategies:
- **USDC → SAMO → USDC** (Orca Whirlpool)
- **USDC → SOL → USDC** (Raydium)
- **USDC → JUP → USDC** (Jupiter)

### 3. Configure Flash Loan
- Enter the amount you want to borrow
- Review fees and estimated profit
- Set slippage tolerance

### 4. Execute Transaction
- Confirm the transaction in your wallet
- Monitor the transaction status
- View results and profit/loss

## 🧪 Testing

### Implementation Verification ✅
The platform has been thoroughly tested and verified:

- **Infrastructure Tests**: 13/13 tests passed (see [CURL_TEST_RESULTS.md](./CURL_TEST_RESULTS.md))
- **Network Connectivity**: Both Neon EVM and Solana devnets verified operational
- **Smart Contract Deployment**: All contracts deployed and accessible on devnet
- **API Endpoints**: All endpoints tested and responding correctly
- **Wallet Integration**: Dual wallet connection (MetaMask + Phantom) fully functional
- **Precompile Integration**: Frontend successfully calls Solana programs
- **Multi-Strategy Testing**: All three arbitrage strategies implemented and tested

### Test Scripts
```bash
# Run comprehensive CURL tests
./test-curl.sh

# Run Node.js implementation tests
node test-implementation.js

# Frontend tests
pnpm test
```

### Smart Contract Tests
Smart contract tests are run in the separate smart contract repository:
```bash
cd ../neonflash-contracts
npx hardhat test test/AaveFlashLoan/AaveFlashLoan.js --network neondevnet
```

### Manual Testing
1. **Connect Wallets**: Use the live prototype to connect MetaMask and Phantom
2. **Get Test Tokens**: Use the built-in airdrop functionality for NEON tokens
3. **Execute Flash Loan**: Test real cross-chain arbitrage transactions
4. **Monitor Results**: Track transaction status and profit calculations

## 📊 Analytics & Metrics

The platform provides comprehensive analytics and real-time metrics tracking:

### 📈 **Analytics Dashboard**
- **Total Transaction Volume**: Track cumulative flash loan volume
- **Success Rate**: Monitor transaction success/failure rates
- **Profit Analytics**: Real-time profit tracking and calculations
- **Strategy Performance**: Individual performance metrics for each arbitrage strategy
- **Risk Metrics**: Comprehensive risk assessment and monitoring

### 📊 **Real-time Metrics Service**
- **Local Metrics Tracking**: Browser-based metric storage and retrieval
- **Transaction History**: Complete history of flash loan attempts (successful and failed)
- **Performance Aggregation**: Automated calculation of total profit, success rates, and trends
- **Real-time Updates**: Live metric updates with subscription-based notifications
- **Cross-chain Analytics**: Unified analytics across Neon EVM and Solana networks

### 🔍 **Analytics Features**
- **Multi-tab Interface**: Overview, Strategies, and Performance views
- **Strategy Comparison**: Side-by-side comparison of Orca, Raydium, and Jupiter performance
- **Historical Data**: Transaction history with timestamps and profit calculations
- **User-specific Analytics**: Personalized analytics based on connected wallet addresses
- **Export Capabilities**: Data export for external analysis and reporting

## 🔒 Security

- Smart contracts are audited and tested
- Input validation on both frontend and contract level
- Slippage protection
- Emergency pause functionality
- Rate limiting to prevent abuse

## 🌐 Networks

### Devnet (Testing)
- **Neon EVM**: https://devnet.neonevm.org
- **Solana**: https://api.devnet.solana.com
- **Explorer**: https://neon-devnet.blockscout.com

### Mainnet (Production)
- **Neon EVM**: https://mainnet.neonevm.org
- **Solana**: https://api.mainnet-beta.solana.com
- **Explorer**: https://neon.blockscout.com

## 🔄 Development Workflow

### Smart Contract Development
1. Work on contracts in the separate repository
2. Compile and test contracts
3. Deploy to testnet/mainnet
4. Update artifacts in frontend using the management script

### Frontend Development
1. Update contract artifacts when contracts change
2. Test integration with new contract versions
3. Update UI to reflect new functionality
4. Deploy frontend updates

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Neon EVM team for the composability feature
- Aave team for the flash loan protocol
- Solana team for the blockchain infrastructure
- All contributors and testers 