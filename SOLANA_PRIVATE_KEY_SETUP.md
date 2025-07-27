# Solana Private Key Setup for Orca Instruction Building

## 🔑 **Your Solana Private Key**

Your Solana private key has been configured:

```
496UVbsby1W2ND8CJYaSxDoQVEaCWHZeoBqyKsgytkVG4EaQRNnDpjz83ccL8Zn4dBqjTCgM4B7eqvkCAiXHuuRn
```

## 📝 **Environment Setup**

Create a `.env.local` file in your project root with the following content:

```env
# Solana Private Key for Orca Instruction Building
# This is required for the Orca SDK to work properly (like reference implementation)
NEXT_PUBLIC_SOLANA_PRIVATE_KEY=496UVbsby1W2ND8CJYaSxDoQVEaCWHZeoBqyKsgytkVG4EaQRNnDpjz83ccL8Zn4dBqjTCgM4B7eqvkCAiXHuuRn

# Neon EVM Configuration
NEXT_PUBLIC_NEON_RPC_URL=https://devnet.neonevm.org
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Contract Addresses (matching reference implementation)
NEXT_PUBLIC_AAVE_FLASH_LOAN=0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0
NEXT_PUBLIC_AAVE_POOL=0x9eA85823b7B736189e663ddef0FEE250EF0d23E1
NEXT_PUBLIC_USDC=0x146c38c2E36D34Ed88d843E013677cCe72341794
NEXT_PUBLIC_ADDRESS_PROVIDER=0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5
```

## 🔧 **What This Fixes**

1. **AdaptiveFeeTier Error**: The Orca SDK now has a real Solana wallet to access accounts
2. **Instruction Building**: Real private key enables proper Orca instruction creation
3. **Reference Implementation Match**: Now uses the same approach as the working reference

## 🚀 **Next Steps**

1. Create the `.env.local` file with your private key
2. Restart your development server: `pnpm dev`
3. Try executing a flash loan - it should now work!

## ⚠️ **Security Note**

- This private key is for **devnet testing only**
- Never use mainnet private keys in frontend applications
- The key is only used for instruction building, not actual signing
- Actual transaction signing happens in the Neon EVM contract
