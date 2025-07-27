import { ethers } from 'ethers';

export interface NeonEvmParams {
  result: {
    neonEvmProgramId: string;
    [key: string]: any;
  };
}

export class NeonIntegrationService {
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
  }

  /**
   * Get Neon EVM parameters for PDA calculation
   */
  async getNeonEvmParams(): Promise<NeonEvmParams> {
    try {
      console.log('=== GETTING NEON EVM PARAMETERS ===');
      
      // Call the Neon EVM RPC to get parameters (like reference implementation)
      const response = await fetch('https://devnet.neonevm.org', {
        method: 'POST',
        body: JSON.stringify({
          "method": "neon_getEvmParams",
          "params": [],
          "id": 1,
          "jsonrpc": "2.0"
        }),
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      console.log('Neon EVM params response:', result);
      
      if (result.error) {
        throw new Error(`Neon EVM params error: ${result.error.message}`);
      }
      
      console.log('Neon EVM Program ID:', result.result.neonEvmProgramId);
      
      return result;
    } catch (error) {
      console.error('Error getting Neon EVM parameters:', error);
      throw new Error(`Failed to get Neon EVM parameters: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get contract public key from EVM address using the contract's getNeonAddress method
   */
  async getContractPublicKey(contractAddress: string, flashLoanContract: ethers.Contract): Promise<string> {
    try {
      console.log('Getting contract public key for:', contractAddress);
      
      // Call the contract's getNeonAddress method (like reference implementation)
      const contractPublicKeyInBytes = await flashLoanContract.getNeonAddress(contractAddress);
      const contractPublicKey = ethers.encodeBase58(contractPublicKeyInBytes);
      
      console.log('Contract public key:', contractPublicKey);
      return contractPublicKey;
    } catch (error) {
      console.error('Error getting contract public key:', error);
      throw new Error(`Failed to get contract public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
} 