"use client";

import { useState, useEffect, useCallback } from 'react';
import { walletManager, WalletState, WalletConnection } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';

export interface UseWalletReturn {
  // State
  isConnected: boolean;
  walletType: 'metamask' | null;
  ethereumAddress: string | null;
  isLoading: boolean;
  error: string | null;
  
  // MetaMask state
  metamaskConnected: boolean;
  metamaskAddress: string | null;
  
  // Available wallets
  availableWallets: {
    metamask: boolean;
  };
  
  // Actions
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
  autoConnect: () => Promise<void>;
  
  // Utilities
  getShortAddress: (address: string) => string;
  getNetworkName: () => string;
  getProviderForChain: (chain: 'neon') => any;
  getAddressForChain: (chain: 'neon') => string | null;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>(walletManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState({
    metamask: false,
  });
  const { toast } = useToast();

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
      default:
        return 'Unknown';
    }
  }, [state.walletType]);

  return {
    // State
    isConnected: state.isConnected,
    walletType: state.walletType === 'metamask' ? 'metamask' : null,
    ethereumAddress: state.ethereumAddress,
    isLoading,
    error,
    
    // MetaMask state
    metamaskConnected: state.metamaskConnected,
    metamaskAddress: state.metamaskAddress,
    
    // Available wallets
    availableWallets,
    
    // Actions
    connectMetaMask,
    disconnect,
    autoConnect,
    
    // Utilities
    getShortAddress,
    getNetworkName,
    getProviderForChain: walletManager.getProviderForChain,
    getAddressForChain: walletManager.getAddressForChain,
  };
} 