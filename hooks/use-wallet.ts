"use client";

import { useState, useEffect, useCallback } from 'react';
import { walletManager, WalletState, WalletConnection } from '@/lib/wallet';
import { useToast } from '@/hooks/use-toast';

export interface UseWalletReturn {
  // State
  isConnected: boolean;
  walletType: 'metamask' | 'phantom' | 'dual' | null;
  ethereumAddress: string | null;
  solanaAddress: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Dual wallet state
  metamaskConnected: boolean;
  phantomConnected: boolean;
  metamaskAddress: string | null;
  phantomAddress: string | null;
  isDualConnected: boolean;
  
  // Available wallets
  availableWallets: {
    metamask: boolean;
    phantom: boolean;
  };
  
  // Actions
  connectMetaMask: () => Promise<void>;
  connectPhantom: () => Promise<void>;
  connectDualWallets: () => Promise<void>;
  disconnect: () => void;
  autoConnect: () => Promise<void>;
  
  // Utilities
  getShortAddress: (address: string) => string;
  getNetworkName: () => string;
  getProviderForChain: (chain: 'neon' | 'solana') => any;
  getAddressForChain: (chain: 'neon' | 'solana') => string | null;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>(walletManager.getState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState({
    metamask: false,
    phantom: false,
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

  // Connect to Phantom
  const connectPhantom = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Try to use Phantom with EVM support first
      if (window.solana && window.solana.isPhantom && window.solana.ethereum) {
        console.log('Connecting Phantom with EVM support...');
        await walletManager.connectPhantomWithEVM();
        toast({
          title: 'Phantom Connected with EVM Support!',
          description: 'Phantom is now connected for both Solana and Neon EVM operations.',
        });
      } else {
        console.log('Connecting Phantom (Solana only)...');
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error('Phantom is not installed');
      }
      const response = await window.solana.connect();
      const solanaAddress = response.publicKey.toString();
      const ethereumAddress = await walletManager.deriveEthereumAddressFromSolana(solanaAddress);
      walletManager.updateState({
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
      window.solana.on('accountChanged', walletManager.handleAccountChange.bind(walletManager));
      window.solana.on('disconnect', walletManager.handleDisconnect.bind(walletManager));

        toast({
          title: 'Phantom Connected!',
          description: 'Phantom is connected for Solana operations. For Neon EVM operations, you may need to connect MetaMask as well.',
        });
      }

      // After connecting, check if the account exists on Solana Devnet
      try {
        const { Connection, PublicKey } = await import('@solana/web3.js');
        const connection = new Connection('https://api.devnet.solana.com', 'processed');
        const accountInfo = await connection.getAccountInfo(new PublicKey(solanaAddress));
        if (!accountInfo) {
          toast({
            title: 'Warning: Account not found on Devnet',
            description: 'Your Phantom wallet is not on Solana Devnet or the account does not exist on Devnet. You may need to airdrop some SOL to this address on Devnet.',
            variant: 'destructive',
          });
        }
      } catch (devnetCheckError) {
        toast({
          title: 'Devnet Check Failed',
          description: 'Could not verify your account on Solana Devnet. Proceed with caution.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect Phantom';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Connect both wallets for cross-chain operations
  const connectDualWallets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await walletManager.connectDualWallets();
      toast({
        title: 'Dual Wallet Connected!',
        description: 'Both MetaMask and Phantom are now connected for cross-chain operations.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect dual wallets';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

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
    
    // Dual wallet state
    metamaskConnected: state.metamaskConnected,
    phantomConnected: state.phantomConnected,
    metamaskAddress: state.metamaskAddress,
    phantomAddress: state.phantomAddress,
    isDualConnected: walletManager.isDualConnected(),
    
    // Available wallets
    availableWallets,
    
    // Actions
    connectMetaMask,
    connectPhantom,
    connectDualWallets,
    disconnect,
    autoConnect,
    
    // Utilities
    getShortAddress,
    getNetworkName,
    getProviderForChain: walletManager.getProviderForChain,
    getAddressForChain: walletManager.getAddressForChain,
  };
} 