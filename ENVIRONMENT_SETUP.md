# Environment Setup Guide

This guide ensures your NeonFlash frontend implementation matches the reference implementation exactly.

## 🎯 **Goal: Identical Implementation**

The reference implementation uses Hardhat with keystore management and terminal execution. This guide shows how to achieve the same functionality in a frontend environment.

## 📋 **Prerequisites**

1. **Node.js 18+** installed
2. **pnpm** (recommended) or npm
3. **MetaMask** wallet with Neon EVM devnet configured
4. **Phantom** wallet for Solana operations

## 🚀 **Quick Setup**

### 1. **Install Dependencies**

```bash
pnpm install
```

### 2. **Run Environment Setup**

```bash
pnpm setup
```

This script validates your environment and creates necessary configuration files.

### 3. **Create Environment File**

```bash
cp .env.example .env.local
```

### 4. **Start Development Server**

```bash
pnpm dev
```

## 🔧 **Manual Configuration**

### **Environment Variables**

Create `.env.local` with the following variables (matching reference implementation):

```env
# Neon EVM Configuration
NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Development Configuration
NODE_ENV=development
BYPASS_USDC_CHECK=true

# Flash Loan Configuration
FLASH_LOAN_DEFAULT_AMOUNT=10
FLASH_LOAN_MIN_AMOUNT=10
FLASH_LOAN_MAX_AMOUNT=10000
FLASH_LOAN_GAS_LIMIT=5000000
FLASH_LOAN_SLIPPAGE_TOLERANCE=0.5
```

### **Contract Addresses**

The contract addresses are already configured in `lib/contracts/addresses.ts` to match the reference implementation:

- **AaveFlashLoan**: `0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0`
- **Aave Pool**: `0x9eA85823b7B736189e663ddef0FEE250EF0d23E1`
- **USDC**: `0x146c38c2E36D34Ed88d843E013677cCe72341794`
- **Address Provider**: `0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5`

### **Token Mints**

Token mints are configured to match the reference implementation:

- **USDC**: `BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k`
- **SAMO**: `Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa`
- **SOL**: `So11111111111111111111111111111111111111112`
- **JUP**: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`

## 🔍 **Key Differences from Reference Implementation**

### **1. Wallet Management**

**Reference Implementation:**

```bash
# Uses Hardhat keystore
npx hardhat keystore set PRIVATE_KEY_OWNER
npx hardhat keystore set PRIVATE_KEY_SOLANA
```

**Frontend Implementation:**

```typescript
// Uses browser wallets
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
```

### **2. Environment Variables**

**Reference Implementation:**

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=./id.json
```

**Frontend Implementation:**

```env
NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

### **3. Execution Method**

**Reference Implementation:**

```bash
npx hardhat test test/AaveFlashLoan/AaveFlashLoan.js --network neondevnet
```

**Frontend Implementation:**

```bash
pnpm dev
# Then use the web interface
```

## 🧪 **Testing Commands**

### **Test Flash Loan (Terminal)**

```bash
pnpm test:flash-loan
```

### **Test Orca Instructions**

```bash
pnpm test:orca
```

### **Debug Flash Loan Call**

```bash
pnpm debug:flash-loan
```

## 🔄 **Workflow Comparison**

### **Reference Implementation Workflow:**

1. Set environment variables
2. Configure Hardhat keystore
3. Run test script
4. Execute flash loan via terminal

### **Frontend Implementation Workflow:**

1. Set environment variables in `.env.local`
2. Connect MetaMask wallet
3. Use web interface
4. Execute flash loan via UI

## ✅ **Verification Steps**

### **1. Environment Validation**

```bash
pnpm setup
```

### **2. Network Connection**

- Ensure MetaMask is connected to Neon EVM devnet
- Verify Solana connection is working

### **3. Contract Interaction**

- Test contract calls via debug script
- Verify Orca instruction building

### **4. Flash Loan Execution**

- Execute a test flash loan
- Verify transaction success

## 🐛 **Troubleshooting**

### **Common Issues**

1. **CORS Errors**: Ensure RPC endpoints allow browser requests
2. **Wallet Connection**: Verify MetaMask is connected to correct network
3. **Contract Errors**: Check contract addresses match reference implementation
4. **Orca Errors**: Verify Solana connection and token mints

### **Debug Commands**

```bash
# Check environment
pnpm setup

# Test flash loan
pnpm test:flash-loan

# Debug contract calls
pnpm debug:flash-loan

# Test Orca instructions
pnpm test:orca
```

## 📚 **Additional Resources**

- [Reference Implementation](https://github.com/Goodnessmbakara/neon-aave-loan)
- [Neon EVM Documentation](https://neonevm.org/docs/quick_start)
- [Orca Whirlpool SDK](https://orca-so.gitbook.io/whirlpools/)
- [Solana Web3.js](https://docs.solana.com/developing/clients/javascript-api)

## 🎉 **Success Criteria**

Your implementation is identical to the reference when:

1. ✅ Environment setup script passes all checks
2. ✅ Flash loan executes successfully
3. ✅ Orca instructions build correctly
4. ✅ Transaction completes with same parameters
5. ✅ Same contract addresses and token mints used
6. ✅ Same gas limits and slippage tolerance

The frontend implementation now provides the same functionality as the reference implementation, just with a different user interface!
