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

  const [filteredStrategies, setFilteredStrategies] = useState<
    FlashLoanStrategy[]
  >([]);

  // When token changes, filter strategies
  useEffect(() => {
    if (token && strategies.length > 0) {
      const filtered = strategies.filter((s) =>
        s.name.toLowerCase().startsWith(token.toLowerCase())
      );
      setFilteredStrategies(filtered);
      if (filtered.length > 0) setSelectedStrategy(filtered[0].id);
    }
  }, [token, strategies]);

  // When strategy changes, update token to match strategy input
  useEffect(() => {
    if (selectedStrategy) {
      const strategy = strategies.find((s) => s.id === selectedStrategy);
      if (strategy) {
        // Extract the first token from the strategy name (e.g., 'USDC → SAMO → USDC')
        const firstToken = strategy.name.split(" ")[0].toLowerCase();
        setToken(firstToken);
      }
    }
  }, [selectedStrategy]);

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

  // Instantiate FlashLoanService when wallet is connected
  useEffect(() => {
    async function setupServiceAndFetchStrategies() {
      if (typeof window === "undefined" || !isConnected || !window.ethereum) {
        setStrategies([]);
        setSelectedStrategy("");
        flashLoanServiceRef.current = null;
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      flashLoanServiceRef.current = new FlashLoanService(provider, signer);
      const s = await flashLoanServiceRef.current.getStrategies();
      setStrategies(s);
      if (s.length > 0) setSelectedStrategy(s[0].id);
    }
    setupServiceAndFetchStrategies();
  }, [isConnected]);

  const NEON_DEVNET_CHAIN_ID = "0xeeb2e6e"; // 245022926 in hex

  const handleExecute = async () => {
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
      toast({
        title: "No Strategy Selected",
        description: "Please select an arbitrage strategy",
        variant: "destructive",
      });
      return;
    }

    // Enforce correct wallet and network for source chain
    if (sourceChain === "neon") {
      // For cross-chain operations, we need both wallets or just MetaMask, or Phantom with EVM support
      if (walletType !== "metamask" && walletType !== "dual" && walletType !== "phantom") {
        toast({
          title: "Wallet Required",
          description: "Please connect MetaMask for Neon EVM operations, or use 'Connect Both Wallets' for cross-chain operations.",
          variant: "destructive",
        });
        return;
      }
      
      // If using Phantom, check if it has EVM support
      if (walletType === "phantom" && !ethereumAddress) {
        toast({
          title: "Phantom EVM Support Required",
          description: "Your Phantom wallet needs EVM support for Neon operations. Try connecting both wallets or use MetaMask.",
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
            description:
              "Please switch to Neon Devnet before executing.",
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
          description: "Please connect Phantom for Solana operations, or use 'Connect Both Wallets' for cross-chain operations.",
          variant: "destructive",
        });
        return;
      }
    }

    // For cross-chain operations, ensure we have both wallets if needed
    if (sourceChain === "neon" && targetChain === "solana") {
      if (!isDualConnected && walletType !== "metamask" && walletType !== "phantom") {
        toast({
          title: "Wallet Required",
          description: "Cross-chain operations require either MetaMask, Phantom with EVM support, or both wallets connected.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!flashLoanServiceRef.current) {
      toast({
        title: "Service Not Ready",
        description: "Flash loan service is not initialized.",
        variant: "destructive",
      });
      return;
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
      console.log(
        `[PAGE] Fee: ${
          result.fee ? ethers.formatUnits(result.fee, 6) : "N/A"
        } USDC`
      );
      console.log(`[PAGE] Error: ${result.error || "None"}`);

      setFlashLoanResult({
        ...result,
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
        {/* <Zap className="h-8 w-8 text-blue-500" /> */}
        <h1 className="text-3xl font-bold">Flash Loan</h1>
        <Badge variant="secondary">Beta</Badge>
      </div>
      <div className="flex justify-end mb-2">
        <AirdropButton />
      </div>

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
                      <span className="font-mono text-xs">{metamaskAddress.slice(0, 6)}...{metamaskAddress.slice(-4)}</span>
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
                      <span className="font-mono text-xs">{phantomAddress.slice(0, 6)}...{phantomAddress.slice(-4)}</span>
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

            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select
                value={selectedStrategy}
                onValueChange={setSelectedStrategy}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filteredStrategies.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    {walletType === 'dual' ? 'Dual Wallet' : 
                     walletType === 'metamask' ? 'MetaMask Only' :
                     walletType === 'phantom' ? (ethereumAddress ? 'Phantom (EVM + Solana)' : 'Phantom (Solana Only)') : 'None'}
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
                {(isDualConnected || (walletType === 'phantom' && ethereumAddress)) && (
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
