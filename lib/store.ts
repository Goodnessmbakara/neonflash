import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CONFIG, NetworkType, ChainType, StrategyId } from './config';

export interface WalletState {
  ethereum: {
    address: string | null;
    isConnected: boolean;
    chainId: number | null;
  };
  solana: {
    address: string | null;
    isConnected: boolean;
    cluster: string | null;
  };
}

export interface Transaction {
  id: string;
  timestamp: number;
  status: 'pending' | 'success' | 'failed';
  type: 'flash_loan' | 'arbitrage';
  amount: number;
  strategy: StrategyId;
  profit?: number;
  gasUsed?: number;
  txHash?: string;
  error?: string;
  steps: {
    flashLoan: { status: 'pending' | 'success' | 'failed'; hash?: string };
    arbitrage: { status: 'pending' | 'success' | 'failed'; hash?: string };
    repayment: { status: 'pending' | 'success' | 'failed'; hash?: string };
  };
}

export interface UserPreferences {
  network: NetworkType;
  slippageTolerance: number;
  gasLimit: number;
  autoExecute: boolean;
  notifications: boolean;
}

export interface Analytics {
  totalTransactions: number;
  successfulTransactions: number;
  totalProfit: number;
  averageProfit: number;
  bestStrategy: StrategyId | null;
  totalVolume: number;
}

interface NeonFlashStore {
  // Wallet State
  wallets: WalletState;
  connectEthereum: (address: string, chainId: number) => void;
  disconnectEthereum: () => void;
  connectSolana: (address: string, cluster: string) => void;
  disconnectSolana: () => void;

  // Network State
  currentNetwork: NetworkType;
  setNetwork: (network: NetworkType) => void;

  // Transaction State
  transactions: Transaction[];
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  clearTransactions: () => void;

  // User Preferences
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  // Analytics
  analytics: Analytics;
  updateAnalytics: (updates: Partial<Analytics>) => void;

  // UI State
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;

  // Flash Loan State
  flashLoanAmount: number;
  setFlashLoanAmount: (amount: number) => void;
  selectedStrategy: StrategyId | null;
  setSelectedStrategy: (strategy: StrategyId | null) => void;
  availableLiquidity: number;
  setAvailableLiquidity: (liquidity: number) => void;
}

const initialPreferences: UserPreferences = {
  network: 'devnet',
  slippageTolerance: CONFIG.ui.defaultSlippage,
  gasLimit: CONFIG.flashLoan.gasLimit,
  autoExecute: false,
  notifications: true,
};

const initialAnalytics: Analytics = {
  totalTransactions: 0,
  successfulTransactions: 0,
  totalProfit: 0,
  averageProfit: 0,
  bestStrategy: null,
  totalVolume: 0,
};

export const useNeonFlashStore = create<NeonFlashStore>()(
  persist(
    (set, get) => ({
      // Initial State
      wallets: {
        ethereum: { address: null, isConnected: false, chainId: null },
        solana: { address: null, isConnected: false, cluster: null },
      },
      currentNetwork: 'devnet',
      transactions: [],
      preferences: initialPreferences,
      analytics: initialAnalytics,
      isLoading: false,
      error: null,
      flashLoanAmount: 0,
      selectedStrategy: null,
      availableLiquidity: 0,

      // Wallet Actions
      connectEthereum: (address: string, chainId: number) =>
        set((state) => ({
          wallets: {
            ...state.wallets,
            ethereum: { address, isConnected: true, chainId },
          },
        })),

      disconnectEthereum: () =>
        set((state) => ({
          wallets: {
            ...state.wallets,
            ethereum: { address: null, isConnected: false, chainId: null },
          },
        })),

      connectSolana: (address: string, cluster: string) =>
        set((state) => ({
          wallets: {
            ...state.wallets,
            solana: { address, isConnected: true, cluster },
          },
        })),

      disconnectSolana: () =>
        set((state) => ({
          wallets: {
            ...state.wallets,
            solana: { address: null, isConnected: false, cluster: null },
          },
        })),

      // Network Actions
      setNetwork: (network: NetworkType) =>
        set({ currentNetwork: network }),

      // Transaction Actions
      addTransaction: (transaction: Transaction) =>
        set((state) => ({
          transactions: [transaction, ...state.transactions].slice(
            0,
            CONFIG.ui.maxTransactionHistory
          ),
        })),

      updateTransaction: (id: string, updates: Partial<Transaction>) =>
        set((state) => ({
          transactions: state.transactions.map((tx) =>
            tx.id === id ? { ...tx, ...updates } : tx
          ),
        })),

      clearTransactions: () => set({ transactions: [] }),

      // Preferences Actions
      updatePreferences: (updates: Partial<UserPreferences>) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      // Analytics Actions
      updateAnalytics: (updates: Partial<Analytics>) =>
        set((state) => ({
          analytics: { ...state.analytics, ...updates },
        })),

      // UI Actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),

      // Flash Loan Actions
      setFlashLoanAmount: (amount: number) => set({ flashLoanAmount: amount }),
      setSelectedStrategy: (strategy: StrategyId | null) =>
        set({ selectedStrategy: strategy }),
      setAvailableLiquidity: (liquidity: number) =>
        set({ availableLiquidity: liquidity }),
    }),
    {
      name: 'neonflash-storage',
      partialize: (state) => ({
        transactions: state.transactions,
        preferences: state.preferences,
        analytics: state.analytics,
      }),
    }
  )
); 