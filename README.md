# NeonFlash - Cross-Chain Flash Loan Platform

A pioneering DeFi solution that enables cross-chain flash loans between Ethereum (Neon EVM) and Solana for arbitrage opportunities. Built by Goodness Mbakara for the Neon EVM bootcamp.

## 🚀 Key Features

- **Cross-Chain Flash Loans**: Borrow from Aave V3 on Neon EVM and execute arbitrage on Solana
- **Atomic Transactions**: All operations happen in a single atomic transaction
- **Multiple Strategies**: Support for Orca Whirlpool, Raydium, and Jupiter arbitrage
- **Real-time Analytics**: Track performance and profit calculations
- **User-Friendly Interface**: Complex DeFi operations made simple

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

### Frontend Tests
```bash
pnpm test
```

### Smart Contract Tests
Smart contract tests are run in the separate smart contract repository:
```bash
cd ../neonflash-contracts
npx hardhat test test/AaveFlashLoan/AaveFlashLoan.js --network neondevnet
```

## 📊 Analytics

The platform provides comprehensive analytics:
- Total transaction volume
- Success rate
- Average profit per transaction
- Best performing strategies
- Risk metrics

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