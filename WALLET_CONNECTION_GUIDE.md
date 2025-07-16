# NeonFlash Wallet Connection Guide

## Overview

NeonFlash is a cross-chain DeFi application that enables flash loans and arbitrage between Neon EVM and Solana networks. To use the application, you need to connect your wallet(s) properly.

## Wallet Connection Options

### 1. Dual Wallet Connection (Recommended)

**Best for:** Full cross-chain functionality and optimal arbitrage opportunities

**Requirements:**
- MetaMask wallet (for Neon EVM operations)
- Phantom wallet (for Solana operations)

**Benefits:**
- ✅ Full cross-chain flash loan functionality
- ✅ Automatic network switching
- ✅ Best arbitrage opportunities
- ✅ Seamless user experience

**How to connect:**
1. Click "Connect Wallet" in the header
2. Select "Dual Wallet (Recommended)"
3. Click "Connect Both Wallets"
4. Approve connections in both MetaMask and Phantom

### 2. Single Wallet Connection

**Best for:** Basic operations or testing

**Options:**
- **MetaMask only:** Neon EVM operations (flash loans on Neon)
- **Phantom only:** Solana operations (arbitrage on Solana)

**Limitations:**
- ⚠️ Limited cross-chain functionality
- ⚠️ Cannot execute full arbitrage strategies
- ⚠️ Manual network switching required

## Network Requirements

### Neon Devnet
- **Chain ID:** `0xeeb2e6e` (245022926)
- **RPC URL:** `https://devnet.neonevm.org`
- **Block Explorer:** `https://neon-devnet.blockscout.com`
- **Native Token:** NEON (18 decimals)

**Required for:** Flash loan operations on Neon EVM

### Solana Devnet
- **Network:** Devnet
- **RPC URL:** `https://api.devnet.solana.com`
- **Block Explorer:** `https://solscan.io/?cluster=devnet`
- **Native Token:** SOL (9 decimals)

**Required for:** Arbitrage operations on Solana

## Step-by-Step Connection Guide

### Prerequisites
1. Install MetaMask browser extension
2. Install Phantom browser extension
3. Create test wallets (never use real funds for development)

### MetaMask Setup
1. Open MetaMask
2. Switch to Neon Devnet:
   - Click network dropdown
   - Select "Add Network"
   - Enter Neon Devnet details:
     - Network Name: Neon Devnet
     - RPC URL: https://devnet.neonevm.org
     - Chain ID: 245022926
     - Currency Symbol: NEON
     - Block Explorer: https://neon-devnet.blockscout.com

### Phantom Setup
1. Open Phantom
2. Switch to Devnet:
   - Click settings (gear icon)
   - Select "Change Network"
   - Choose "Devnet"

### Connecting Wallets
1. **Visit NeonFlash Dashboard**
2. **Click "Connect Wallet"** in the header
3. **Choose connection mode:**
   - For best experience: Select "Dual Wallet (Recommended)"
   - For basic testing: Select "Single Wallet" then choose MetaMask or Phantom
4. **Approve connections** in your wallet(s)
5. **Verify connection** - you should see wallet status in the dashboard

## Wallet Status Dashboard

Once connected, the dashboard shows:

### Connection Status
- ✅ Green dot: Connected
- 🔴 Red dot: Disconnected
- 🟡 Yellow dot: Wrong network

### Wallet Information
- **Addresses:** Both Ethereum and Solana addresses
- **Balances:** NEON, SOL, and USDC balances
- **Network Status:** Current network for each wallet
- **Quick Actions:** Copy addresses, view on block explorer

### Balance Display
- **NEON Balance:** Native token for Neon EVM
- **SOL Balance:** Native token for Solana
- **USDC Balance:** Stablecoin for flash loans (if available)

## Troubleshooting

### Common Issues

#### "MetaMask not installed"
**Solution:** Install MetaMask browser extension from [metamask.io](https://metamask.io)

#### "Phantom not installed"
**Solution:** Install Phantom browser extension from [phantom.app](https://phantom.app)

#### "Wrong network" error
**Solution:** 
- MetaMask: Switch to Neon Devnet
- Phantom: Switch to Solana Devnet

#### "Connection failed"
**Solution:**
1. Refresh the page
2. Clear browser cache
3. Try connecting one wallet at a time
4. Check if wallet extensions are enabled

#### "No balances found"
**Solution:**
1. Use the airdrop feature to get test tokens
2. Ensure you're on the correct network
3. Check if the wallet has any tokens

### Network Switching

#### MetaMask to Neon Devnet
```javascript
// Add network automatically
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0xeeb2e6e',
    chainName: 'Neon Devnet',
    rpcUrls: ['https://devnet.neonevm.org'],
    nativeCurrency: { name: 'Neon', symbol: 'NEON', decimals: 18 },
    blockExplorerUrls: ['https://neon-devnet.blockscout.com']
  }]
});
```

#### Phantom to Solana Devnet
1. Open Phantom
2. Click settings (gear icon)
3. Select "Change Network"
4. Choose "Devnet"

## Security Best Practices

### ⚠️ Important Security Notes

1. **Use Test Wallets Only**
   - Never use wallets with real funds for development testing
   - Create separate test wallets for NeonFlash

2. **Verify Network Settings**
   - Always verify you're on the correct devnet
   - Double-check RPC URLs and chain IDs

3. **Review Transactions**
   - Always review transaction details before signing
   - Understand what each transaction does

4. **Keep Extensions Updated**
   - Regularly update MetaMask and Phantom
   - Use official extension sources only

### Test Token Sources

#### Neon Devnet
- **NEON:** Use Neon faucet (built into app)
- **USDC:** Get from DEX or faucet

#### Solana Devnet
- **SOL:** Use Solana faucet (built into app)
- **USDC:** Get from Orca or other DEX

## Advanced Features

### Phantom EVM Support
Some versions of Phantom support EVM operations directly:
- Enables single-wallet cross-chain operations
- Automatic address derivation
- Simplified connection flow

### Address Derivation
NeonFlash automatically derives addresses:
- **Ethereum → Solana:** Deterministic derivation
- **Solana → Ethereum:** Deterministic derivation
- **Cross-chain compatibility:** Seamless operations

### Auto-Connection
- Wallets automatically reconnect on page refresh
- Network status monitoring
- Automatic balance updates

## Support

### Getting Help
1. **Check this guide** for common solutions
2. **Review network requirements** above
3. **Try the troubleshooting steps** listed
4. **Check console logs** for detailed error messages

### Useful Links
- [Neon Documentation](https://docs.neon.org)
- [Solana Documentation](https://docs.solana.com)
- [MetaMask Documentation](https://docs.metamask.io)
- [Phantom Documentation](https://help.phantom.app)

### Development Notes
- This is a development application for testing purposes
- All operations are on devnet networks
- No real funds are involved
- Use only for educational and testing purposes

---

**Remember:** Always use test wallets and devnet networks for development testing. Never use real funds or mainnet networks for testing purposes. 