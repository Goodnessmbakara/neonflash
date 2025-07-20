import { ethers, EventLog } from "ethers";
import AaveFlashLoanABI from "@/lib/contracts/artifacts/AaveFlashLoan.json";
import { CONTRACT_ADDRESSES } from "@/lib/contracts/addresses";

// Replace with your actual event name and argument structure
export async function fetchUserFlashLoans(userAddress: string) {
  if (!window.ethereum) return [];
  const provider = new ethers.BrowserProvider(window.ethereum);
  // If AaveFlashLoanABI is an object with an 'abi' property, use .abi, else use as is
  const abi = Array.isArray(AaveFlashLoanABI) ? AaveFlashLoanABI : (AaveFlashLoanABI.abi || AaveFlashLoanABI);
  const contract = new ethers.Contract(
    CONTRACT_ADDRESSES.NEON_DEVNET.AAVE_FLASH_LOAN,
    abi,
    provider
  );
  // Adjust the event name and filter as per your contract
  const events = await contract.queryFilter(
    contract.filters.FlashLoanExecuted(userAddress)
  );
  // Optionally, fetch block timestamps for each event
  return Promise.all(events.map(async (e) => {
    const block = await provider.getBlock(e.blockNumber);
    // Type guard for EventLog
    let profit, status;
    if ("args" in e && e.args) {
      profit = e.args.profit?.toString();
      status = e.args.success ? "success" : "failed";
    } else {
      profit = undefined;
      status = "unknown";
    }
    return {
      txHash: e.transactionHash,
      profit,
      status,
      timestamp: block?.timestamp ? new Date(block.timestamp * 1000).toLocaleString() : "N/A"
    };
  }));
}
