import * as web3 from '@solana/web3.js';
import { ethers } from 'ethers';

// Configuration matching the reference implementation exactly
export const ORCA_CONFIG = {
  SOLANA_NODE: 'https://api.devnet.solana.com',
  SOLANA_NODE_MAINNET: 'https://api.mainnet-beta.solana.com/',
  DATA: {
    EVM: {
      ADDRESSES: {
        MemeLaunchpad: {
          MemeLaunchpadTest: '',
          BondingCurve: '0x0Fc6Ec7F9F06bd733913C1Fcd10BFc959a1F88DC'
        },
        ERC20ForSplFactory: '0xF6b17787154C418d5773Ea22Afc87A95CAA3e957',
        AAVE: {
          AaveFlashLoanTest: '0x90cF15326EE0Ecd1849685F28Ac70BEcA10248E0',
          AAVE_POOL: '0x9eA85823b7B736189e663ddef0FEE250EF0d23E1',
          ADDRESS_PROVIDER: '0x3792F5eD078EEbE34419627E91D648e8Ac3C56e5'
        },
        WSOL: '0xc7Fc9b46e479c5Cb42f6C458D1881e55E6B7986c',
        devUSDC: '0x146c38c2E36D34Ed88d843E013677cCe72341794'
      }
    },
    SVM: {
      ADDRESSES: {
        WHIRLPOOLS_CONFIG: "FcrweFY1G9HJAHG5inkGB6pKg1HZ6x9UC2WioAfWrGkR",
        devSAMO: "Jd4M8bfJG3sAkd82RsGWyEXoaBXQP7njFzBwEaCTuDa",
        devUSDC: "BRjpCHtyQLNCo8gqRUr8jtdAj5AjPYQaoqbvcZiHok1k"
      }
    }
  },
  utils: {
    publicKeyToBytes32: function(pubkey: string): string {
      return ethers.zeroPadValue(ethers.toBeHex(ethers.decodeBase58(pubkey)), 32);
    },
    addressToBytes32: function(address: string): string {
      return ethers.zeroPadValue(ethers.toBeHex(address), 32);
    },
    calculateContractAccount: function (contractEvmAddress: string, neonEvmProgram: web3.PublicKey) {
      const neonContractAddressBytes = Buffer.from(this.isValidHex(contractEvmAddress) ? contractEvmAddress.replace(/^0x/i, '') : contractEvmAddress, 'hex');
      const seed = [
        new Uint8Array([0x03]),
        new Uint8Array(neonContractAddressBytes)
      ];
    
      return web3.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
    },
    calculatePdaAccount: function (prefix: string, tokenEvmAddress: string, salt: string, neonEvmProgram: web3.PublicKey) {
      const neonContractAddressBytes = Buffer.from(this.isValidHex(tokenEvmAddress) ? tokenEvmAddress.replace(/^0x/i, '') : tokenEvmAddress, 'hex');
      const seed = [
        new Uint8Array([0x03]),
        new Uint8Array(Buffer.from(prefix, 'utf-8')),
        new Uint8Array(neonContractAddressBytes),
        Buffer.from(Buffer.concat([Buffer.alloc(12), Buffer.from(this.isValidHex(salt) ? salt.substring(2) : salt, 'hex')]), 'hex')
      ];
    
      return web3.PublicKey.findProgramAddressSync(seed, neonEvmProgram);
    },
    isValidHex: function(hex: string): boolean {
      const isHexStrict = /^(0x)?[0-9a-f]*$/i.test(hex.toString());
      if (!isHexStrict) {
        throw new Error(`Given value "${hex}" is not a valid hex string.`);
      } else {
        return isHexStrict;
      }
    },
    toFixed: function(num: number, fixed: number): string {
      let re = new RegExp('^-?\\d+(?:\\.\\d{0,' + (fixed || -1) + '})?');
      return num.toString().match(re)![0];
    },
    asyncTimeout: async function(timeout: number): Promise<void> {
      return new Promise((resolve) => {
        setTimeout(() => resolve(), timeout);
      });
    },
    prepareInstructionAccounts: function(instruction: web3.TransactionInstruction, overwriteAccounts?: any[]): string {
      let encodeKeys = '';
      for (let i = 0, len = instruction.keys.length; i < len; ++i) {
        if (typeof(overwriteAccounts) != "undefined" && Object.hasOwn(overwriteAccounts, i)) {
          console.log(this.publicKeyToBytes32(overwriteAccounts[i].key), 'publicKey');
          encodeKeys+= ethers.solidityPacked(["bytes32"], [this.publicKeyToBytes32(overwriteAccounts[i].key)]).substring(2);
          encodeKeys+= ethers.solidityPacked(["bool"], [overwriteAccounts[i].isSigner]).substring(2);
          encodeKeys+= ethers.solidityPacked(["bool"], [overwriteAccounts[i].isWritable]).substring(2);
        } else {
          console.log(this.publicKeyToBytes32(instruction.keys[i].pubkey.toString()), 'publicKey');
          encodeKeys+= ethers.solidityPacked(["bytes32"], [this.publicKeyToBytes32(instruction.keys[i].pubkey.toString())]).substring(2);
          encodeKeys+= ethers.solidityPacked(["bool"], [instruction.keys[i].isSigner]).substring(2);
          encodeKeys+= ethers.solidityPacked(["bool"], [instruction.keys[i].isWritable]).substring(2);
        }
      }

      return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.keys.length), 8).substring(2) + encodeKeys;
    },
    prepareInstructionData: function(instruction: web3.TransactionInstruction): string {
      const packedInstructionData = ethers.solidityPacked( 
        ["bytes"],
        [instruction.data]
      ).substring(2);
      console.log(packedInstructionData, 'packedInstructionData');

      return '0x' + ethers.zeroPadBytes(ethers.toBeHex(instruction.data.length), 8).substring(2) + packedInstructionData;
    },
    prepareInstruction: function(instruction: web3.TransactionInstruction): string {
      const programIdBytes32 = this.publicKeyToBytes32(instruction.programId.toBase58());
      const accountsBytes = this.prepareInstructionAccounts(instruction);
      const dataBytes = this.prepareInstructionData(instruction);
      
      return programIdBytes32 + accountsBytes.substring(2) + dataBytes.substring(2);
    }
  }
}; 