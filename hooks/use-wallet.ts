import { useState, useEffect, useCallback } from 'react';
import { walletManager, WalletState, WalletConnection } from '@/lib/wallet';

export interface UseWalletReturn {
  // State
  isConnected: boolean;
  walletType: 'metamask' | 'phantom' | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Available wallets
  availableWallets: {
    metamask: boolean;
    phantom: boolean;
  };
  
  // Actions
  connectMetaMask: () => Promise<void>;
  connectPhantom: () => Promise<void>;
  disconnect: () => void;
  autoConnect: () => Promise<void>;
  
  // Utilities
  getShortAddress: (address: string) => string;
  getNetworkName: () => string;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>(walletManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState({
    metamask: false,
    phantom: false,
  });

  // Subscribe to wallet state changes
  useEffect(() => {
    const unsubscribe = walletManager.subscribe(setState);
    
    // Check available wallets on mount
    checkAvailableWallets();
    
    // Listen for network changes and refresh wallet state
    if (typeof window !== 'undefined' && window.ethereum) {
      const handleChainChanged = () => {
        autoConnect(); // Refresh wallet state on network change
      };
      window.ethereum.on('chainChanged', handleChainChanged);
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        unsubscribe();
      };
    }
    return unsubscribe;
  }, []);

  // Check which wallets are available
  const checkAvailableWallets = useCallback(async () => {
    try {
      const wallets = await walletManager.getAvailableWallets();
      setAvailableWallets(wallets);
    } catch (error) {
      console.error('Error checking available wallets:', error);
    }
  }, []);

  // Connect to MetaMask
  const connectMetaMask = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await walletManager.connectMetaMask();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect MetaMask';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Connect to Phantom
  const connectPhantom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await walletManager.connectPhantom();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Phantom';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    walletManager.disconnect();
    setError(null);
  }, []);

  // Auto-connect if previously connected
  const autoConnect = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await walletManager.autoConnect();
    } catch (error) {
      console.error('Auto-connect error:', error);
      // Don't show error for auto-connect failures
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Utility: Get shortened address
  const getShortAddress = useCallback((address: string): string => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, []);

  // Utility: Get network name
  const getNetworkName = useCallback((): string => {
    switch (state.walletType) {
      case 'metamask':
        return 'Ethereum';
      case 'phantom':
        return 'Solana';
      default:
        return 'Unknown';
    }
  }, [state.walletType]);

  return {
    // State
    isConnected: state.isConnected,
    walletType: state.walletType,
    ethereumAddress: state.ethereumAddress,
    solanaAddress: state.solanaAddress,
    isLoading,
    error,
    
    // Available wallets
    availableWallets,
    
    // Actions
    connectMetaMask,
    connectPhantom,
    disconnect,
    autoConnect,
    
    // Utilities
    getShortAddress,
    getNetworkName,
  };
} 