# Funded Wallet Setup Guide

This guide shows you how to set up a funded wallet like the reference implementation uses, so your flash loan implementation works correctly.

## 🎯 Why This is Needed

The reference implementation works because it uses a **funded wallet** that has USDC tokens. Your current implementation fails because your wallet has 0 USDC.

## 📋 Step-by-Step Setup

### 1. Create a New Wallet (or Use Existing)

```bash
# Option A: Create new wallet using ethers
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"
```

### 2. Get NEON Tokens for Gas

Visit the Neon Faucet: https://neonfaucet.org/
- Enter your wallet address
- Request NEON tokens (you need at least 0.01 NEON for gas)

### 3. Get USDC Tokens

You have several options:

#### Option A: Use the Airdrop API
```bash
curl -X POST http://localhost:3002/api/airdrop \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS","chain":"neon-usdc"}'
```

#### Option B: Use the Minting Script
```bash
export PRIVATE_KEY=your_private_key_here
node scripts/mint-usdc.js
```

#### Option C: Use the Setup Script
```bash
export FUNDED_PRIVATE_KEY=your_private_key_here
node scripts/setup-funded-wallet.js
```

### 4. Set Environment Variable

```bash
export FUNDED_PRIVATE_KEY=your_private_key_here
```

Or add to your `.env` file:
```
FUNDED_PRIVATE_KEY=your_private_key_here
```

### 5. Test the Setup

```bash
# Check funded wallet balances
node scripts/setup-funded-wallet.js
```

## 🔧 How It Works

1. **Funded Wallet**: Has NEON (for gas) and USDC (for transfers)
2. **User Wallet**: Your MetaMask wallet (only needs NEON for gas)
3. **Contract Setup**: Funded wallet transfers USDC to flash loan contract
4. **Flash Loan**: User executes flash loan, contract pays fees from its USDC

## 📊 Expected Balances

- **Funded Wallet**: 
  - NEON: ≥ 0.01 (for gas)
  - USDC: ≥ 1.0 (for contract transfers)
- **User Wallet**: 
  - NEON: ≥ 0.01 (for gas)
  - USDC: 0 (not needed)

## 🚀 Quick Start

1. **Set up funded wallet**:
   ```bash
   export FUNDED_PRIVATE_KEY=your_private_key_with_neon_and_usdc
   ```

2. **Start your app**:
   ```bash
   npm run dev
   ```

3. **Test flash loan**: The funded wallet will automatically transfer USDC to the contract when needed.

## 🔍 Verification

Check that your setup works:

```bash
# Check funded wallet
node scripts/setup-funded-wallet.js

# Check balances
node -e "
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider('https://devnet.neonevm.org');
const wallet = new ethers.Wallet(process.env.FUNDED_PRIVATE_KEY, provider);
const usdcContract = new ethers.Contract('0x146c38c2E36D34Ed88d843E013677cCe72341794', 
  ['function balanceOf(address) view returns (uint256)'], provider);
  
Promise.all([
  provider.getBalance(wallet.address),
  usdcContract.balanceOf(wallet.address)
]).then(([neon, usdc]) => {
  console.log('NEON:', ethers.formatEther(neon));
  console.log('USDC:', ethers.formatUnits(usdc, 6));
});
"
```

## ✅ Success Indicators

- ✅ Funded wallet has NEON balance > 0.01
- ✅ Funded wallet has USDC balance > 1.0
- ✅ Flash loan executes without "insufficient balance" errors
- ✅ Contract receives USDC for fees automatically

## 🆘 Troubleshooting

**"FUNDED_PRIVATE_KEY not set"**
- Set the environment variable: `export FUNDED_PRIVATE_KEY=your_key`

**"Insufficient NEON balance"**
- Get NEON from: https://neonfaucet.org/

**"Insufficient USDC balance"**
- Use the airdrop API or minting script to get USDC

**"execution reverted"**
- Check that the funded wallet has both NEON and USDC
- Verify the private key is correct 