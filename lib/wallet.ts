import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { deriveAddress } from '@solana/web3.js';

export interface WalletState {
  isConnected: boolean;
  walletType: 'metamask' | 'phantom' | 'dual' | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  ethereumProvider: any | null;
  solanaProvider: any | null;
  // New fields for dual wallet support
  metamaskConnected: boolean;
  phantomConnected: boolean;
  metamaskAddress: string | null;
  phantomAddress: string | null;
}

export interface WalletConnection {
  ethereumAddress: string;
  solanaAddress: string;
  walletType: 'metamask' | 'phantom';
}

class WalletManager {
  private state: WalletState = {
    isConnected: false,
    walletType: null,
    ethereumAddress: null,
    solanaAddress: null,
    ethereumProvider: null,
    solanaProvider: null,
    metamaskConnected: false,
    phantomConnected: false,
    metamaskAddress: null,
    phantomAddress: null,
  };

  private listeners: ((state: WalletState) => void)[] = [];

  // Get current state
  getState(): WalletState {
    return { ...this.state };
  }

  // Subscribe to state changes
  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify listeners of state changes
  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  // Update state
  private updateState(updates: Partial<WalletState>) {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // Check if MetaMask is available
  async checkMetaMask(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
  }

  // Check if Phantom is available
  async checkPhantom(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    return typeof window.solana !== 'undefined' && window.solana.isPhantom;
  }

  // Connect only Phantom (original method)
  async connectPhantom(): Promise<WalletConnection> {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom is not installed');
      }
      // Check Solana Devnet
      const SOLANA_DEVNET_CHAIN = "devnet";
      if (window.solana.network !== SOLANA_DEVNET_CHAIN) {
        // Phantom does not support programmatic network switching
        throw new Error('Phantom must be on Solana Devnet to connect. Please switch to Solana Devnet in your Phantom wallet settings.');
      }
      // Connect to Phantom
      const response = await window.solana.connect();
      const solanaAddress = response.publicKey.toString();

      // Derive Ethereum address from Solana address
      const ethereumAddress = await this.deriveEthereumAddressFromSolana(solanaAddress);

      this.updateState({
        isConnected: true,
        walletType: 'phantom',
        ethereumAddress,
        solanaAddress,
        ethereumProvider: null,
        solanaProvider: window.solana,
        metamaskConnected: false,
        phantomConnected: true,
        metamaskAddress: null,
        phantomAddress: solanaAddress,
      });

      // Listen for account changes
      window.solana.on('accountChanged', this.handleAccountChange.bind(this));
      window.solana.on('disconnect', this.handleDisconnect.bind(this));

      return {
        ethereumAddress,
        solanaAddress,
        walletType: 'phantom',
      };
    } catch (error) {
      console.error('Phantom connection error:', error);
      throw error;
    }
  }

  // Connect both MetaMask and Phantom for cross-chain operations
  async connectDualWallets(): Promise<WalletConnection> {
    try {
      console.log('Connecting dual wallets for cross-chain operations...');
      
      // Try to use Phantom with EVM support first
      if (window.solana && window.solana.isPhantom && window.solana.ethereum) {
        console.log('Using Phantom with EVM support for dual operations');
        return await this.connectPhantomWithEVM();
      }
      
      // Fallback to separate MetaMask and Phantom connections
      console.log('Using separate MetaMask and Phantom connections');
      
      // Connect MetaMask first
      const metamaskConnection = await this.connectMetaMask();
      
      // Connect Phantom second
      const phantomConnection = await this.connectPhantom();
      
      // Update state to reflect dual connection
      this.updateState({
        isConnected: true,
        walletType: 'dual',
        ethereumAddress: metamaskConnection.ethereumAddress,
        solanaAddress: phantomConnection.solanaAddress,
        ethereumProvider: this.state.ethereumProvider,
        solanaProvider: this.state.solanaProvider,
        metamaskConnected: true,
        phantomConnected: true,
        metamaskAddress: metamaskConnection.ethereumAddress,
        phantomAddress: phantomConnection.solanaAddress,
      });

      return {
        ethereumAddress: metamaskConnection.ethereumAddress,
        solanaAddress: phantomConnection.solanaAddress,
        walletType: 'dual',
      };
    } catch (error) {
      console.error('Dual wallet connection error:', error);
      throw error;
    }
  }

  // Connect only MetaMask (existing method, updated)
  async connectMetaMask(): Promise<WalletConnection> {
    try {
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error('MetaMask is not installed');
      }
      // Enforce Neon Devnet
      const NEON_DEVNET_CHAIN_ID = "0xeeb2e6e"; // 245022926 in hex
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== NEON_DEVNET_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NEON_DEVNET_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: NEON_DEVNET_CHAIN_ID,
                chainName: 'Neon Devnet',
                rpcUrls: ['https://devnet.neonevm.org'],
                nativeCurrency: { name: 'Neon', symbol: 'NEON', decimals: 18 },
                blockExplorerUrls: ['https://neon-devnet.blockscout.com'],
              }],
            });
          } else {
            throw new Error('Please switch to Neon Devnet to connect.');
          }
        }
        // After switching, re-check the chainId
        const newChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (newChainId !== NEON_DEVNET_CHAIN_ID) {
          throw new Error('Network switch failed or was cancelled.');
        }
      }
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const ethereumAddress = accounts[0];
      
      // Derive Solana address from Ethereum address
      const solanaAddress = await this.deriveSolanaAddressFromEthereum(ethereumAddress);

      // Create provider
      const provider = new ethers.BrowserProvider(window.ethereum);

      this.updateState({
        isConnected: true,
        walletType: 'metamask',
        ethereumAddress,
        solanaAddress,
        ethereumProvider: provider,
        solanaProvider: null,
        metamaskConnected: true,
        phantomConnected: false,
        metamaskAddress: ethereumAddress,
        phantomAddress: null,
      });

      // Listen for account changes
      window.ethereum.on('accountsChanged', this.handleAccountChange.bind(this));
      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));

      return {
        ethereumAddress,
        solanaAddress,
        walletType: 'metamask',
      };
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error;
    }
  }

  // Connect Phantom with EVM support for cross-chain operations
  async connectPhantomWithEVM(): Promise<WalletConnection> {
    try {
      console.log('Connecting Phantom with EVM support...');
      
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom is not installed');
      }

      // Connect to Phantom Solana
      const response = await window.solana.connect();
      const solanaAddress = response.publicKey.toString();

      // Check if Phantom supports EVM
      if (window.solana.ethereum) {
        console.log('Phantom EVM support detected');
        
        // Connect to Phantom's EVM provider
        const evmProvider = window.solana.ethereum;
        
        // Switch to Neon Devnet on Phantom's EVM
        const NEON_DEVNET_CHAIN_ID = "0xeeb2e6e";
        try {
          await evmProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: NEON_DEVNET_CHAIN_ID }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Add Neon Devnet if not present
            await evmProvider.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: NEON_DEVNET_CHAIN_ID,
                chainName: 'Neon Devnet',
                rpcUrls: ['https://devnet.neonevm.org'],
                nativeCurrency: { name: 'Neon', symbol: 'NEON', decimals: 18 },
                blockExplorerUrls: ['https://neon-devnet.blockscout.com'],
              }],
            });
          }
        }

        // Get EVM accounts
        const accounts = await evmProvider.request({
          method: 'eth_requestAccounts',
        });

        if (!accounts || accounts.length === 0) {
          throw new Error('No EVM accounts found in Phantom');
        }

        const ethereumAddress = accounts[0];
        console.log('Phantom EVM address:', ethereumAddress);

        // Create ethers provider for Phantom's EVM
        const provider = new ethers.BrowserProvider(evmProvider);

        this.updateState({
          isConnected: true,
          walletType: 'phantom',
          ethereumAddress,
          solanaAddress,
          ethereumProvider: provider,
          solanaProvider: window.solana,
          metamaskConnected: false,
          phantomConnected: true,
          metamaskAddress: null,
          phantomAddress: solanaAddress,
        });

        // Listen for account changes
        window.solana.on('accountChanged', this.handleAccountChange.bind(this));
        window.solana.on('disconnect', this.handleDisconnect.bind(this));

        return {
          ethereumAddress,
          solanaAddress,
          walletType: 'phantom',
        };
      } else {
        // Fallback to address derivation if EVM not supported
        console.log('Phantom EVM not supported, using address derivation');
        const ethereumAddress = await this.deriveEthereumAddressFromSolana(solanaAddress);

        this.updateState({
          isConnected: true,
          walletType: 'phantom',
          ethereumAddress,
          solanaAddress,
          ethereumProvider: null,
          solanaProvider: window.solana,
          metamaskConnected: false,
          phantomConnected: true,
          metamaskAddress: null,
          phantomAddress: solanaAddress,
        });

        return {
          ethereumAddress,
          solanaAddress,
          walletType: 'phantom',
        };
      }
    } catch (error) {
      console.error('Phantom with EVM connection error:', error);
      throw error;
    }
  }

  // Derive Solana address from Ethereum address
  private async deriveSolanaAddressFromEthereum(ethereumAddress: string): Promise<string> {
    try {
      // Use a deterministic derivation method
      // This is a simplified approach - in production, you might want to use a more sophisticated method
      const message = `Derive Solana address for Ethereum: ${ethereumAddress}`;
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, ethereumAddress],
      });

      // Use the signature to derive a Solana address
      const hash = ethers.keccak256(signature);
      const publicKeyBytes = ethers.getBytes(hash).slice(0, 32);
      
      // Create a Solana public key from the derived bytes
      const publicKey = new PublicKey(publicKeyBytes);
      return publicKey.toString();
    } catch (error) {
      console.error('Error deriving Solana address:', error);
      // Fallback: return a placeholder or throw error
      throw new Error('Failed to derive Solana address');
    }
  }

  // Derive Ethereum address from Solana address
  private async deriveEthereumAddressFromSolana(solanaAddress: string): Promise<string> {
    try {
      // Use a deterministic derivation method
      const message = `Derive Ethereum address for Solana: ${solanaAddress}`;
      const encodedMessage = new TextEncoder().encode(message);
      
      // Sign the message with Phantom
      const signature = await window.solana.signMessage(encodedMessage, 'utf8');
      
      // Use the signature to derive an Ethereum address
      const hash = ethers.keccak256(signature.signature);
      const address = ethers.getAddress(ethers.dataSlice(hash, 12));
      
      return address;
    } catch (error) {
      console.error('Error deriving Ethereum address:', error);
      // Fallback: return a placeholder or throw error
      throw new Error('Failed to derive Ethereum address');
    }
  }

  // Handle account changes
  private async handleAccountChange(accounts: string[]) {
    if (this.state.walletType === 'metamask' && accounts.length > 0) {
      const newEthereumAddress = accounts[0];
      const newSolanaAddress = await this.deriveSolanaAddressFromEthereum(newEthereumAddress);
      
      this.updateState({
        ethereumAddress: newEthereumAddress,
        solanaAddress: newSolanaAddress,
      });
    } else if (this.state.walletType === 'phantom') {
      // Handle Phantom account change
      const newSolanaAddress = window.solana.publicKey?.toString() || null;
      if (newSolanaAddress) {
        const newEthereumAddress = await this.deriveEthereumAddressFromSolana(newSolanaAddress);
        this.updateState({
          ethereumAddress: newEthereumAddress,
          solanaAddress: newSolanaAddress,
        });
      }
    }
  }

  // Handle disconnect
  private handleDisconnect() {
    this.disconnect();
  }

  // Disconnect wallet
  disconnect() {
    // Remove event listeners
    if (window.ethereum) {
      window.ethereum.removeAllListeners();
    }
    if (window.solana) {
      window.solana.removeAllListeners();
    }

    this.updateState({
      isConnected: false,
      walletType: null,
      ethereumAddress: null,
      solanaAddress: null,
      ethereumProvider: null,
      solanaProvider: null,
      metamaskConnected: false,
      phantomConnected: false,
      metamaskAddress: null,
      phantomAddress: null,
    });
  }

  // Check if both wallets are connected for cross-chain operations
  isDualConnected(): boolean {
    return this.state.metamaskConnected && this.state.phantomConnected;
  }

  // Get the appropriate provider for a given chain
  getProviderForChain(chain: 'neon' | 'solana'): any {
    if (chain === 'neon') {
      return this.state.ethereumProvider;
    } else if (chain === 'solana') {
      return this.state.solanaProvider;
    }
    return null;
  }

  // Get the appropriate address for a given chain
  getAddressForChain(chain: 'neon' | 'solana'): string | null {
    if (chain === 'neon') {
      return this.state.metamaskAddress || this.state.ethereumAddress;
    } else if (chain === 'solana') {
      return this.state.phantomAddress || this.state.solanaAddress;
    }
    return null;
  }

  // Get available wallets
  async getAvailableWallets(): Promise<{ metamask: boolean; phantom: boolean }> {
    return {
      metamask: await this.checkMetaMask(),
      phantom: await this.checkPhantom(),
    };
  }

  // Auto-connect if previously connected
  async autoConnect(): Promise<WalletConnection | null> {
    try {
      // Check if MetaMask was previously connected
      if (await this.checkMetaMask() && window.ethereum.selectedAddress) {
        // Check network before connecting
        const NEON_DEVNET_CHAIN_ID = "0xeeb2e6e";
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId === NEON_DEVNET_CHAIN_ID) {
          return await this.connectMetaMask();
        } else {
          console.log('MetaMask not on Neon Devnet, skipping auto-connect');
          return null;
        }
      }

      // Check if Phantom was previously connected
      if (await this.checkPhantom() && window.solana.isConnected) {
        // Check network before connecting
        const SOLANA_DEVNET_CHAIN = "devnet";
        if (window.solana.network === SOLANA_DEVNET_CHAIN) {
          return await this.connectPhantom();
        } else {
          console.log('Phantom not on Solana Devnet, skipping auto-connect');
          return null;
        }
      }

      return null;
    } catch (error) {
      console.error('Auto-connect error:', error);
      return null;
    }
  }
}

// Create singleton instance
export const walletManager = new WalletManager();

// Type declarations for window object
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
  }
} 