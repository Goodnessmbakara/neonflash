import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FlashLoanResult, TransactionStatus } from "@/lib/flash-loan";
import { FlashLoanTransactionStatus } from "@/components/transaction-status";
import { useWallet } from "@/hooks/use-wallet";
import { NeonFlashLogo } from "@/components/ui/logo";
import { AirdropButton } from "@/components/ui/airdrop-button";
import {
  FlashLoanService,
  FlashLoanStrategy,
} from "@/lib/services/flash-loan-service";
import { ContractSetupService } from "@/lib/services/contract-setup";
import { ethers } from "ethers";

export default function FlashLoan() {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("usdc");
  const [sourceChain, setSourceChain] = useState<"neon" | "solana">("neon");
  const [targetChain, setTargetChain] = useState<"neon" | "solana">("solana");
  const [isExecuting, setIsExecuting] = useState(false);
  const [flashLoanResult, setFlashLoanResult] =
    useState<FlashLoanResult | null>(null);
  const [strategies, setStrategies] = useState<FlashLoanStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>("");
  const { toast } = useToast();
  const {
    isConnected,
    walletType,
    ethereumAddress,
    solanaAddress,
    metamaskConnected,
    phantomConnected,
    isDualConnected,
    connectDualWallets,
    metamaskAddress,
    phantomAddress,
  } = useWallet();
  const flashLoanServiceRef = React.useRef<FlashLoanService | null>(null);

  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<
    Array<{
      token: string;
      neonPrice: number;
      solanaPrice: number;
      diffPercent: number;
      direction: "Buy on Neon, Sell on Solana" | "Buy on Solana, Sell on Neon";
    }>
  >([]);
  const [arbitrageLoading, setArbitrageLoading] = useState(false);
  const [arbitrageError, setArbitrageError] = useState<string | null>(null);

  // Remove filteredStrategies - use strategies directly
  // const [filteredStrategies, setFilteredStrategies] = useState<FlashLoanStrategy[]>([]);

  // FIXED: Improved strategy selection logic
  useEffect(() => {
    if (strategies.length > 0 && !selectedStrategy) {
      // Only auto-select if no strategy is currently selected
      const orcaStrategy = strategies.find((s) => s.protocol === "orca");
      const defaultStrategy = orcaStrategy?.id || strategies[0].id;
      setSelectedStrategy(defaultStrategy);
      console.log("Auto-selected strategy:", defaultStrategy);
    } else if (strategies.length === 0 && isConnected) {
      // Add fallback strategies if none loaded
      const fallbackStrategies: FlashLoanStrategy[] = [
        {
          id: "orca-usdc-samo",
          name: "USDC → SAMO → USDC",
          protocol: "orca",
          sourceToken: "USDC",
          targetToken: "SAMO",
          minAmount: BigInt("1000000"), // 1 USDC
          maxAmount: BigInt("100000000000"), // 100,000 USDC
          fee: BigInt("5000"), // 0.5%
          description: "Arbitrage between USDC and SAMO on Orca",
        },
        {
          id: "raydium-usdc-sol",
          name: "USDC → SOL → USDC",
          protocol: "raydium",
          sourceToken: "USDC",
          targetToken: "SOL",
          minAmount: BigInt("1000000"), // 1 USDC
          maxAmount: BigInt("100000000000"), // 100,000 USDC
          fee: BigInt("3000"), // 0.3%
          description: "Arbitrage between USDC and SOL on Raydium",
        },
        {
          id: "jupiter-usdc-jup",
          name: "USDC → JUP → USDC",
          protocol: "jupiter",
          sourceToken: "USDC",
          targetToken: "JUP",
          minAmount: BigInt("1000000"), // 1 USDC
          maxAmount: BigInt("100000000000"), // 100,000 USDC
          fee: BigInt("12000"), // 1.2%
          description: "Arbitrage between USDC and JUP on Jupiter",
        },
      ];

      console.log("Setting fallback strategies:", fallbackStrategies);
      setStrategies(fallbackStrategies);
      setSelectedStrategy("orca-usdc-samo"); // Select Orca strategy by default
    }
  }, [strategies, isConnected]);

  // FIXED: Simplified strategy change effect - only update token when strategy changes
  useEffect(() => {
    if (selectedStrategy && strategies.length > 0) {
      const strategy = strategies.find((s) => s.id === selectedStrategy);
      if (strategy) {
        // Extract the first token from the strategy name (e.g., 'USDC → SAMO → USDC')
        const firstToken = strategy.name.split(" ")[0].toLowerCase();
        setToken(firstToken);
        console.log("Updated token from strategy:", firstToken);
      }
    }
  }, [selectedStrategy, strategies]);

  useEffect(() => {
    async function fetchPricesAndDetectArb() {
      setArbitrageLoading(true);
      setArbitrageError(null);
      try {
        // Fetch from Next.js API route
        const res = await fetch("/api/prices");
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const { data } = await res.json();
        // data: [{ token, neonPrice, solanaPrice }]
        const opportunities = data
          .map((t: any) => {
            const { token, neonPrice, solanaPrice } = t;
            if (!neonPrice || !solanaPrice) return null;
            const diffPercent =
              ((neonPrice - solanaPrice) / ((neonPrice + solanaPrice) / 2)) *
              100;
            let direction: string | null = null;
            if (diffPercent > 0.5) direction = "Buy on Solana, Sell on Neon";
            else if (diffPercent < -0.5)
              direction = "Buy on Neon, Sell on Solana";
            else direction = null;
            if (!direction) return null;
            return {
              token,
              neonPrice,
              solanaPrice,
              diffPercent: Math.abs(diffPercent),
              direction: direction as any,
            };
          })
          .filter(Boolean);
        setArbitrageOpportunities(opportunities);
      } catch (e) {
        setArbitrageError("Failed to fetch price data");
        // Log error for debugging
        console.error("Arbitrage price fetch error:", e);
      } finally {
        setArbitrageLoading(false);
      }
    }
    fetchPricesAndDetectArb();
    // Optionally, poll every 30s
    const interval = setInterval(fetchPricesAndDetectArb, 30000);
    return () => clearInterval(interval);
  }, []);

  // FIXED: Improved service initialization with better error handling
  useEffect(() => {
    async function setupServiceAndFetchStrategies() {
      console.log("Setting up flash loan service...");
      console.log("isConnected:", isConnected);
      console.log(
        "window.ethereum:",
        typeof window !== "undefined" ? !!window.ethereum : false
      );

      if (typeof window === "undefined" || !isConnected) {
        console.log(
          "Not setting up service - window undefined or not connected"
        );
        setStrategies([]);
        setSelectedStrategy("");
        flashLoanServiceRef.current = null;
        return;
      }

      try {
        // Check if ethereum provider is available
        if (!window.ethereum) {
          console.log("No ethereum provider found");
          setStrategies([]);
          setSelectedStrategy("");
          flashLoanServiceRef.current = null;
          return;
        }

        console.log("Creating provider...");
        const provider = new ethers.BrowserProvider(window.ethereum);

        // Check if accounts are connected
        console.log("Checking accounts...");
        const accounts = await provider.send("eth_accounts", []);
        console.log("Accounts:", accounts);

        if (!accounts || accounts.length === 0) {
          console.log("No accounts connected");
          setStrategies([]);
          setSelectedStrategy("");
          flashLoanServiceRef.current = null;
          return;
        }

        console.log("Getting signer...");
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();
        console.log("Signer address:", signerAddress);

        console.log("Creating FlashLoanService...");
        flashLoanServiceRef.current = new FlashLoanService(provider, signer);

        console.log("Fetching strategies...");
        const fetchedStrategies =
          await flashLoanServiceRef.current.getStrategies();
        console.log("Fetched strategies:", fetchedStrategies);

        setStrategies(fetchedStrategies);

        // Set default strategy to first Orca strategy
        if (fetchedStrategies.length > 0) {
          const orcaStrategy = fetchedStrategies.find(
            (s) => s.protocol === "orca"
          );
          setSelectedStrategy(orcaStrategy?.id || fetchedStrategies[0].id);
          console.log(
            "Selected default strategy:",
            orcaStrategy?.id || fetchedStrategies[0].id
          );
        }
      } catch (err) {
        console.error("Error setting up flash loan service:", err);
        console.error(
          "Error details:",
          err instanceof Error ? err.message : "Unknown error"
        );
        setStrategies([]);
        setSelectedStrategy("");
        flashLoanServiceRef.current = null;

        // Show user-friendly error
        toast({
          title: "Service Setup Failed",
          description:
            "Failed to initialize flash loan service. Please refresh and try again.",
          variant: "destructive",
        });
      }
    }

    setupServiceAndFetchStrategies();
  }, [isConnected, toast]);

  const NEON_DEVNET_CHAIN_ID = "0xeeb2e6e"; // 245022926 in hex

  // FIXED: Added debug logging to handleExecute
  const handleExecute = async () => {
    console.log("=== HANDLE EXECUTE START ===");
    console.log("isConnected:", isConnected);
    console.log("amount:", amount);
    console.log("selectedStrategy:", selectedStrategy);
    console.log("strategies:", strategies);
    console.log("flashLoanServiceRef.current:", !!flashLoanServiceRef.current);

    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to execute flash loans",
        variant: "destructive",
      });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }
    if (!selectedStrategy) {
      console.log(
        "No strategy selected. Available strategies:",
        strategies.map((s) => s.id)
      );
      toast({
        title: "No Strategy Selected",
        description: "Please select an arbitrage strategy",
        variant: "destructive",
      });
      return;
    }

    if (!flashLoanServiceRef.current) {
      console.log("Flash loan service not ready");
      toast({
        title: "Service Not Ready",
        description:
          "Flash loan service is not initialized. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    // Enforce correct wallet and network for source chain
    if (sourceChain === "neon") {
      // For cross-chain operations, we need both wallets or just MetaMask, or Phantom with EVM support
      if (
        walletType !== "metamask" &&
        walletType !== "dual" &&
        walletType !== "phantom"
      ) {
        toast({
          title: "Wallet Required",
          description:
            "Please connect MetaMask for Neon EVM operations, or use 'Connect Both Wallets' for cross-chain operations.",
          variant: "destructive",
        });
        return;
      }

      // If using Phantom, check if it has EVM support
      if (walletType === "phantom" && !ethereumAddress) {
        toast({
          title: "Phantom EVM Support Required",
          description:
            "Your Phantom wallet needs EVM support for Neon operations. Try connecting both wallets or use MetaMask.",
          variant: "destructive",
        });
        return;
      }

      if (typeof window !== "undefined" && window.ethereum) {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        if (chainId !== NEON_DEVNET_CHAIN_ID) {
          toast({
            title: "Wrong Network",
            description: "Please switch to Neon Devnet before executing.",
            variant: "destructive",
          });
          return;
        }
      }
    } else if (sourceChain === "solana") {
      // Must use Phantom for Solana
      if (walletType !== "phantom" && walletType !== "dual") {
        toast({
          title: "Wrong Wallet",
          description:
            "Please connect Phantom for Solana operations, or use 'Connect Both Wallets' for cross-chain operations.",
          variant: "destructive",
        });
        return;
      }
    }

    // For cross-chain operations, ensure we have both wallets if needed
    if (sourceChain === "neon" && targetChain === "solana") {
      if (
        !isDualConnected &&
        walletType !== "metamask" &&
        walletType !== "phantom"
      ) {
        toast({
          title: "Wallet Required",
          description:
            "Cross-chain operations require either MetaMask, Phantom with EVM support, or both wallets connected.",
          variant: "destructive",
        });
        return;
      }
    }

    setIsExecuting(true);
    setFlashLoanResult(null);

    try {
      console.log("=== FLASH LOAN PAGE EXECUTION START ===");
      console.log(`[PAGE] Selected Strategy: ${selectedStrategy}`);
      console.log(`[PAGE] Amount: ${amount} USDC`);
      console.log(`[PAGE] Source Chain: ${sourceChain}`);
      console.log(`[PAGE] Target Chain: ${targetChain}`);
      console.log(`[PAGE] Wallet Type: ${walletType}`);
      console.log(`[PAGE] Is Connected: ${isConnected}`);
      console.log(`[PAGE] Ethereum Address: ${ethereumAddress}`);
      console.log(`[PAGE] Solana Address: ${solanaAddress}`);

      // Find the selected strategy object
      const strategy = strategies.find((s) => s.id === selectedStrategy);
      if (!strategy) {
        toast({
          title: "Selected strategy not found",
          description: "Please select a valid strategy.",
          variant: "destructive",
        });
        return;
      }

      // FIXED: Check if strategy is supported
      if (strategy.protocol !== "orca") {
        toast({
          title: "Strategy Not Supported",
          description:
            "This strategy is not yet available. Please select an Orca strategy.",
          variant: "destructive",
        });
        return;
      }

      const amountInWei = ethers.parseUnits(amount, 6); // USDC decimals
      const min = Number(ethers.formatUnits(strategy.minAmount, 6));
      const max = Number(ethers.formatUnits(strategy.maxAmount, 6));

      console.log(`[PAGE] Amount in Wei: ${amountInWei.toString()}`);
      console.log(`[PAGE] Strategy Min Amount: ${min} USDC`);
      console.log(`[PAGE] Strategy Max Amount: ${max} USDC`);

      if (parseFloat(amount) < min || parseFloat(amount) > max) {
        toast({
          title: "Invalid Amount",
          description: `Amount must be between ${min} and ${max} ${token.toUpperCase()}`,
          variant: "destructive",
        });
        return;
      }

      // Setup contract and ensure sufficient balance
      if (typeof window !== "undefined" && window.ethereum) {
        console.log(`[PAGE] Setting up contract with Ethereum provider...`);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contractSetup = new ContractSetupService(provider, signer);

        // Get and log the EVM address being used
        const userEvmAddress = await signer.getAddress();
        console.log(`[PAGE] User EVM Address: ${userEvmAddress}`);
        console.log(`[PAGE] User Solana Address: ${solanaAddress}`);
        console.log(
          `[PAGE] Network Chain ID: ${await provider
            .getNetwork()
            .then((n) => n.chainId)}`
        );

        // Verify USDC contract is accessible
        console.log(`[PAGE] Verifying USDC contract accessibility...`);
        const isUSDCContractAccessible =
          await contractSetup.verifyUSDCContract();
        console.log(
          `[PAGE] USDC Contract Accessible: ${isUSDCContractAccessible}`
        );

        if (!isUSDCContractAccessible) {
          toast({
            title: "USDC Contract Not Accessible",
            description:
              "Unable to access USDC contract on Neon EVM. Please check your network connection.",
            variant: "destructive",
          });
          return;
        }

        // Check if user has sufficient balance for flash loan fee
        console.log(`[PAGE] Checking user balance for flash loan fee...`);
        const hasBalance = await contractSetup.checkUserBalanceForFee(
          userEvmAddress,
          amountInWei
        );
        console.log(`[PAGE] User has sufficient balance: ${hasBalance}`);

        if (!hasBalance) {
          toast({
            title: "Insufficient USDC Balance",
            description:
              "You need USDC tokens on Neon EVM to pay flash loan fees. Use the airdrop button to get test USDC, or ensure you have USDC in your wallet.",
            variant: "destructive",
          });
          return;
        }

        // Ensure contract has sufficient USDC for fees
        console.log(`[PAGE] Ensuring contract has sufficient USDC balance...`);
        toast({
          title: "Setting up contract...",
          description: "Ensuring contract has sufficient USDC balance for fees",
        });

        await contractSetup.ensureContractBalance();
        console.log(`[PAGE] Contract balance setup complete`);
      }

      // Execute flash loan
      console.log(
        `[PAGE] Executing flash loan with strategy: ${strategy.name}`
      );
      toast({
        title: "Executing flash loan...",
        description: `Executing ${strategy.name} with ${amount} USDC`,
      });

      // Pass Phantom wallet provider for Orca strategy
      let result;
      if (
        strategy.protocol === "orca" &&
        typeof window !== "undefined" &&
        window.solana
      ) {
        console.log(`[PAGE] Using Orca strategy with Phantom wallet provider`);
        console.log(`[PAGE] Phantom wallet available: ${!!window.solana}`);
        result = await flashLoanServiceRef.current.executeFlashLoan(
          selectedStrategy,
          amountInWei,
          0.5, // 0.5% slippage tolerance
          window.solana // Pass Phantom wallet provider
        );
      } else {
        console.log(`[PAGE] Using non-Orca strategy or no Phantom wallet`);
        result = await flashLoanServiceRef.current.executeFlashLoan(
          selectedStrategy,
          amountInWei,
          0.5
        );
      }

      console.log(`[PAGE] Flash loan execution result:`, result);
      console.log(`[PAGE] Success: ${result.success}`);
      console.log(`[PAGE] Transaction Hash: ${result.transactionHash}`);
      console.log(
        `[PAGE] Profit: ${
          result.profit ? ethers.formatUnits(result.profit, 6) : "N/A"
        } USDC`
      );
      console.log(`[PAGE] Error: ${result.error || "None"}`);

      setFlashLoanResult({
        ...result,
        profit: result.profit ? result.profit.toString() : undefined, // Convert bigint to string
        steps: {
          borrow: {
            status: result.success ? "success" : "failed",
            hash: result.transactionHash,
            timestamp: Date.now(),
          },
          arbitrage: {
            status: result.success ? "success" : "failed",
            hash: result.transactionHash,
            timestamp: Date.now(),
          },
          repay: {
            status: result.success ? "success" : "failed",
            hash: result.transactionHash,
            timestamp: Date.now(),
          },
        },
      });

      if (result.success) {
        const profitFormatted = ethers.formatUnits(
          result.profit || BigInt(0),
          6
        );
        console.log(
          `[PAGE] Flash loan successful! Profit: ${profitFormatted} USDC`
        );
        toast({
          title: "Flash Loan Executed Successfully! 🎉",
          description: `Generated ${profitFormatted} USDC profit. Transaction: ${result.transactionHash?.substring(
            0,
            10
          )}...`,
        });
      } else {
        console.log(`[PAGE] Flash loan failed: ${result.error}`);
        toast({
          title: "Flash Loan Failed",
          description: result.error || "Failed to execute flash loan",
          variant: "destructive",
        });
      }

      console.log("=== FLASH LOAN PAGE EXECUTION COMPLETE ===");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      console.error("=== FLASH LOAN PAGE EXECUTION FAILED ===");
      console.error("Error details:", error);

      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      });

      setFlashLoanResult({
        success: false,
        error: errorMessage,
        steps: {
          borrow: {
            status: "failed",
            error: errorMessage,
            timestamp: Date.now(),
          },
          arbitrage: {
            status: "failed",
            error: errorMessage,
            timestamp: Date.now(),
          },
          repay: {
            status: "failed",
            error: errorMessage,
            timestamp: Date.now(),
          },
        },
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-3xl">
      <div className="flex flex-col items-center mb-2">
        <NeonFlashLogo className="h-14 w-14 mb-2" />
      </div>
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-bold">Flash Loan</h1>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <div className="flex justify-end mb-2">
        <AirdropButton />
      </div>

      {/* FIXED: Add debug information in development */}
      {process.env.NODE_ENV === "development" && (
        <Card className="mb-4 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <div>Connected: {isConnected ? "Yes" : "No"}</div>
            <div>
              Service Ready: {flashLoanServiceRef.current ? "Yes" : "No"}
            </div>
            <div>Strategies Count: {strategies.length}</div>
            <div>Selected Strategy: {selectedStrategy || "None"}</div>
            <div>Wallet Type: {walletType}</div>
            <div>
              Ethereum Provider:{" "}
              {typeof window !== "undefined" && window.ethereum ? "Yes" : "No"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Connection Status */}
      {!isConnected && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Connect Your Wallets
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  For cross-chain flash loans, you need both MetaMask (Neon EVM)
                  and Phantom (Solana)
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={connectDualWallets} variant="default">
                  Connect Both Wallets
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Status Display */}
      {isConnected && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">MetaMask (Neon EVM)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge
                      variant={metamaskConnected ? "default" : "secondary"}
                    >
                      {metamaskConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {metamaskAddress && (
                    <div className="flex justify-between">
                      <span>Address:</span>
                      <span className="font-mono text-xs">
                        {metamaskAddress.slice(0, 6)}...
                        {metamaskAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Phantom (Solana)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={phantomConnected ? "default" : "secondary"}>
                      {phantomConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {phantomAddress && (
                    <div className="flex justify-between">
                      <span>Address:</span>
                      <span className="font-mono text-xs">
                        {phantomAddress.slice(0, 6)}...
                        {phantomAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {isDualConnected && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">
                    Ready for Cross-Chain Operations
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Flash Loan Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="eth">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sourceChain">Source Chain</Label>
                <Select
                  value={sourceChain}
                  onValueChange={(value: "neon" | "solana") =>
                    setSourceChain(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neon">Neon EVM</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetChain">Target Chain</Label>
                <Select
                  value={targetChain}
                  onValueChange={(value: "neon" | "solana") =>
                    setTargetChain(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neon">Neon EVM</SelectItem>
                    <SelectItem value="solana">Solana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* FIXED: Strategy selector with fallback */}
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select
                value={selectedStrategy}
                onValueChange={(value) => {
                  console.log("Strategy selection changed to:", value);
                  setSelectedStrategy(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strategy..." />
                </SelectTrigger>
                <SelectContent>
                  {strategies.length === 0 ? (
                    <SelectItem value="loading" disabled>
                      Loading strategies...
                    </SelectItem>
                  ) : (
                    strategies.map((s) => {
                      console.log("Rendering strategy option:", s.id, s.name, s.protocol);
                      return (
                        <SelectItem
                          key={s.id}
                          value={s.id}
                          disabled={s.protocol !== "orca"}
                        >
                          {s.name}
                          {s.protocol !== "orca" && " (Coming soon)"}
                        </SelectItem>
                      );
                    })
                  )}
                </SelectContent>
              </Select>
              {/* Debug info for strategy selection */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedStrategy || "None"} | Available: {strategies.length}
                  {strategies.length > 0 && (
                    <div>Strategies: {strategies.map(s => s.id).join(", ")}</div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full"
            >
              {isExecuting ? "Executing..." : "Execute Flash Loan"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            {/* Transaction Status Display */}
            {(isExecuting || flashLoanResult) && (
              <div className="mt-6">
                <FlashLoanTransactionStatus
                  steps={
                    flashLoanResult?.steps || {
                      borrow: { status: "pending", timestamp: Date.now() },
                      arbitrage: { status: "pending", timestamp: Date.now() },
                      repay: { status: "pending", timestamp: Date.now() },
                    }
                  }
                  mainTransactionHash={flashLoanResult?.transactionHash}
                  profit={flashLoanResult?.profit}
                  isExecuting={isExecuting}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arbitrage Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {arbitrageLoading ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <ArrowRight className="h-4 w-4 animate-spin text-blue-500" />
                <div>
                  <p className="font-medium">Loading opportunities...</p>
                </div>
              </div>
            ) : arbitrageError ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm text-muted-foreground">
                    {arbitrageError}
                  </p>
                </div>
              </div>
            ) : arbitrageOpportunities.length === 0 ? (
              <div className="flex items-center gap-2 p-3 border rounded-lg">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="font-medium">No Active Opportunities</p>
                  <p className="text-sm text-muted-foreground">
                    Monitor for price differences between Neon EVM and Solana
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {arbitrageOpportunities.map((op) => (
                  <div
                    key={op.token}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-green-50"
                  >
                    <ArrowRight className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">
                        {op.token}: {op.direction}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Neon: ${op.neonPrice.toFixed(4)} | Solana: $
                        {op.solanaPrice.toFixed(4)} | Diff:{" "}
                        {op.diffPercent.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Strategy Performance Section */}
            <div className="mt-6">
              <h4 className="font-medium mb-4">Strategy Performance</h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">USDC → SAMO → USDC</h3>
                    <p className="text-sm text-muted-foreground">
                      Orca Whirlpool
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">+0.5%</div>
                    <div className="text-sm text-muted-foreground">
                      Avg. profit
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">USDC → SOL → USDC</h3>
                    <p className="text-sm text-muted-foreground">Raydium</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">+0.3%</div>
                    <div className="text-sm text-muted-foreground">
                      Avg. profit
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h3 className="font-semibold">USDC → JUP → USDC</h3>
                    <p className="text-sm text-muted-foreground">Jupiter</p>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">+1.2%</div>
                    <div className="text-sm text-muted-foreground">
                      Avg. profit
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Supported Networks</h4>
              <div className="flex gap-2">
                <Badge variant="outline">Neon EVM</Badge>
                <Badge variant="outline">Solana</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Current Status</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Wallet Connection:</span>
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Connection Type:</span>
                  <Badge variant="outline">
                    {walletType === "dual"
                      ? "Dual Wallet"
                      : walletType === "metamask"
                      ? "MetaMask Only"
                      : walletType === "phantom"
                      ? ethereumAddress
                        ? "Phantom (EVM + Solana)"
                        : "Phantom (Solana Only)"
                      : "None"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>MetaMask:</span>
                  <Badge variant={metamaskConnected ? "default" : "secondary"}>
                    {metamaskConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Phantom:</span>
                  <Badge variant={phantomConnected ? "default" : "secondary"}>
                    {phantomConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                {(isDualConnected ||
                  (walletType === "phantom" && ethereumAddress)) && (
                  <div className="flex justify-between">
                    <span>Cross-Chain Ready:</span>
                    <Badge variant="default" className="bg-green-600">
                      Ready
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">1. Borrow</h4>
              <p className="text-muted-foreground">
                Borrow tokens from Aave on Neon EVM without collateral
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Arbitrage</h4>
              <p className="text-muted-foreground">
                Execute trades across Neon EVM and Solana for profit
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Repay</h4>
              <p className="text-muted-foreground">
                Repay the flash loan with interest and keep the profit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
