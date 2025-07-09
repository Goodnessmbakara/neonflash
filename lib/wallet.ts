import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import { deriveAddress } from '@solana/web3.js';

export interface WalletState {
  isConnected: boolean;
  walletType: 'metamask' | 'phantom' | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  ethereumProvider: any | null;
  solanaProvider: any | null;
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

  // Connect MetaMask
  async connectMetaMask(): Promise<WalletConnection> {
    try {
      if (!window.ethereum || !window.ethereum.isMetaMask) {
        throw new Error('MetaMask is not installed');
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

  // Connect Phantom
  async connectPhantom(): Promise<WalletConnection> {
    try {
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom is not installed');
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
    this.updateState({
      isConnected: false,
      walletType: null,
      ethereumAddress: null,
      solanaAddress: null,
      ethereumProvider: null,
      solanaProvider: null,
    });
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
        return await this.connectMetaMask();
      }

      // Check if Phantom was previously connected
      if (await this.checkPhantom() && window.solana.isConnected) {
        return await this.connectPhantom();
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