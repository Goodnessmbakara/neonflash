import AaveFlashLoanArtifact from './artifacts/AaveFlashLoan.json';
import ERC20ForSplArtifact from './artifacts/ERC20ForSpl.json';

export const CONTRACT_ABIS = {
  AAVE_FLASH_LOAN: AaveFlashLoanArtifact.abi,
  ERC20_FOR_SPL: ERC20ForSplArtifact.abi,
} as const;

export type ContractName = keyof typeof CONTRACT_ABIS;

// Helper function to get ABI by contract name
export function getContractAbi(contractName: ContractName) {
  return CONTRACT_ABIS[contractName];
}

// Type-safe contract interaction helpers
export interface FlashLoanParams {
  token: string;
  amount: bigint;
  instructionData1: string;
  instructionData2: string;
}

export interface TransferSolanaParams {
  to: string; // bytes32
  amount: bigint; // uint64
} 