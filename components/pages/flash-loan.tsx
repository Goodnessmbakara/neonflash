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
import { NETWORK_CONFIG } from "@/lib/contracts/addresses";
import { SimpleContractSetupService } from "../../lib/services/simple-contract-setup";
import { ENVIRONMENT_CONFIG } from "@/lib/config/environment";

export default function FlashLoan() {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);
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
    metamaskConnected,
    connectMetaMask,
    metamaskAddress,
  } = useWallet();
  const flashLoanServiceRef = React.useRef<FlashLoanService | null>(null);

  // FIXED: Add wallet connection state tracking
  const [walletError, setWalletError] = useState<string | null>(null);

  // Function to check network status
  const checkNetworkStatus = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setNetworkStatus({ chainId: null, networkName: null, isCorrect: false });
      return;
    }

    try {
      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const isCorrect =
        chainId === `0x${ENVIRONMENT_CONFIG.NEON.CHAIN_ID.toString(16)}`; // Neon Devnet chain ID
      const networkName = isCorrect
        ? "Neon EVM DevNet"
        : chainId === "0xaa36a7"
        ? "Sepolia"
        : chainId === "0x1"
        ? "Ethereum Mainnet"
        : `Chain ${parseInt(chainId, 16)}`;

      setNetworkStatus({ chainId, networkName, isCorrect });
    } catch (error) {
      console.error("Failed to check network status:", error);
      setNetworkStatus({ chainId: null, networkName: null, isCorrect: false });
    }
  };

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
  const [networkStatus, setNetworkStatus] = useState<{
    chainId: string | null;
    networkName: string | null;
    isCorrect: boolean;
  }>({ chainId: null, networkName: null, isCorrect: false });
  const [activeProvider, setActiveProvider] = useState<string | null>(null);

  // SIMPLIFIED: Use only MetaMask for now
  const isWalletReady = () => {
    if (typeof window === "undefined") return false;

    // Only MetaMask is supported for now
    return metamaskConnected && window.ethereum;
  };

  // SIMPLIFIED: Use only MetaMask provider
  const getValidEthereumProvider = async () => {
    setWalletError(null);

    try {
      if (typeof window === "undefined") {
        throw new Error("Not in browser environment");
      }

      // Only use MetaMask
      if (!window.ethereum) {
        throw new Error(
          "MetaMask not found. Please install MetaMask extension."
        );
      }

      if (!metamaskConnected) {
        throw new Error(
          "MetaMask not connected. Please connect MetaMask first."
        );
      }

      console.log("Using MetaMask provider");
      return window.ethereum;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown wallet error";
      console.error("Wallet provider error:", errorMessage);
      setWalletError(errorMessage);
      throw error;
    }
  };

  // FIXED: Improved signer creation with better Phantom handling
  const createSigner = async (ethereumProvider: any) => {
    try {
      console.log("Creating ethers provider...");
      const provider = new ethers.BrowserProvider(ethereumProvider);

      // Test provider connection
      try {
        const network = await provider.getNetwork();
        console.log("Provider network:", network.chainId.toString());
      } catch (err) {
        console.error("Provider network check failed:", err);
        throw new Error(
          "Failed to connect to blockchain network. Please check your wallet connection."
        );
      }

      console.log("Requesting signer...");
      console.log("MetaMask connected:", metamaskConnected);
      console.log("MetaMask address:", metamaskAddress);

      // MetaMask signer
      console.log("Creating MetaMask signer...");

      try {
        const accounts = await ethereumProvider.request({
          method: "eth_requestAccounts",
        });
        console.log("MetaMask accounts requested:", accounts);

        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts returned from MetaMask");
        }
      } catch (err) {
        console.error("eth_requestAccounts failed:", err);
        throw new Error(
          "Failed to connect to MetaMask. Please approve the connection request."
        );
      }

      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      console.log("MetaMask signer address:", signerAddress);
      console.log("Expected MetaMask address:", metamaskAddress);

      if (
        metamaskAddress &&
        signerAddress.toLowerCase() !== metamaskAddress.toLowerCase()
      ) {
        console.warn(
          "Address mismatch between signer and expected MetaMask address"
        );
        console.warn("Using signer address:", signerAddress);
      }

      console.log("Final signer address:", signerAddress);
      return signer;
    } catch (error) {
      console.error("Signer creation failed:", error);
      throw error;
    }
  };

  // FIXED: New function to get Ethereum provider (Phantom first, then MetaMask)
  const getEthereumProvider = () => {
    // Only use MetaMask
    if (metamaskConnected && window.ethereum) {
      return window.ethereum;
    }
    return null;
  };

  // FIXED: Improved strategy selection logic
  useEffect(() => {
    if (strategies.length > 0 && !selectedStrategy) {
      // Only auto-select if no strategy is currently selected
      const orcaStrategy = strategies.find((s) => s.protocol === "orca");
      const defaultStrategy = orcaStrategy?.id || strategies[0].id;
      setSelectedStrategy(defaultStrategy);
      console.log("Auto-selected strategy:", defaultStrategy);
    } else if (strategies.length === 0 && isConnected) {
      // Add fallback strategies matching the service interface
      const fallbackStrategies: FlashLoanStrategy[] = [
        {
          id: "usdc-samo-usdc",
          name: "USDC → SAMO → USDC",
          description: "Arbitrage between USDC and SAMO using Orca Whirlpool",
          tokenIn: "USDC",
          tokenOut: "SAMO",
          protocol: "orca",
          riskLevel: "medium",
          estimatedProfit: 0.5, // 0.5%
          minAmount: BigInt("10000000"), // 10 USDC (6 decimals: 10 * 10^6) - like reference implementation
          maxAmount: BigInt("10000000000"), // 10,000 USDC (6 decimals: 10000 * 10^6)
        },
        {
          id: "usdc-sol-usdc",
          name: "USDC → SOL → USDC",
          description: "Arbitrage between USDC and SOL using Raydium",
          tokenIn: "USDC",
          tokenOut: "SOL",
          protocol: "raydium",
          riskLevel: "low",
          estimatedProfit: 0.3, // 0.3%
          minAmount: BigInt("10000000"), // 10 USDC (6 decimals) - like reference implementation
          maxAmount: BigInt("50000000000"), // 50,000 USDC (6 decimals)
        },
        {
          id: "usdc-jup-usdc",
          name: "USDC → JUP → USDC",
          description: "Arbitrage between USDC and JUP using Jupiter",
          tokenIn: "USDC",
          tokenOut: "JUP",
          protocol: "jupiter",
          riskLevel: "high",
          estimatedProfit: 1.2, // 1.2%
          minAmount: BigInt("10000000"), // 10 USDC (6 decimals) - like reference implementation
          maxAmount: BigInt("5000000000"), // 5,000 USDC (6 decimals)
        },
      ];

      console.log("Setting fallback strategies:", fallbackStrategies);
      setStrategies(fallbackStrategies);
      setSelectedStrategy("usdc-samo-usdc"); // Select Orca strategy by default
    }
  }, [strategies, isConnected]);

  // FIXED: Simplified strategy change effect - only update token when strategy changes
  useEffect(() => {
    if (selectedStrategy && strategies.length > 0) {
      const strategy = strategies.find((s) => s.id === selectedStrategy);
      if (strategy) {
        // FIXED: Extract the first token from the strategy name (e.g., 'USDC → SAMO → USDC')
        const firstToken = strategy.name.split(" ")[0].toLowerCase(); // Fixed: was split("")[0]
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

  // FIXED: Removed selectedStrategy from dependency array and improved Phantom EVM handling
  useEffect(() => {
    async function setupServiceAndFetchStrategies() {
      console.log("Setting up flash loan service...");
      console.log("isConnected:", isConnected);
      console.log("walletType:", walletType);
      console.log("metamaskAddress:", metamaskAddress);
      console.log("metamaskConnected:", metamaskConnected);
      console.log(
        "window.ethereum:",
        typeof window !== "undefined" ? !!window.ethereum : false
      );
      console.log(
        "window.solana:",
        typeof window !== "undefined" ? !!window.solana : false
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

      // Always set fallback strategies first
      const fallbackStrategies: FlashLoanStrategy[] = [
        {
          id: "usdc-samo-usdc",
          name: "USDC → SAMO → USDC",
          description: "Arbitrage between USDC and SAMO using Orca Whirlpool",
          tokenIn: "USDC",
          tokenOut: "SAMO",
          protocol: "orca",
          riskLevel: "medium",
          estimatedProfit: 0.5,
          minAmount: BigInt("10000000"), // 10 USDC (6 decimals: 1 * 10^6)
          maxAmount: BigInt("10000000000"), // 10 USDC (6 decimals: 10 * 10^6)
        },
        {
          id: "usdc-sol-usdc",
          name: "USDC → SOL → USDC",
          description: "Arbitrage between USDC and SOL using Raydium",
          tokenIn: "USDC",
          tokenOut: "SOL",
          protocol: "raydium",
          riskLevel: "low",
          estimatedProfit: 0.3,
          minAmount: BigInt("10000000"), // 1 USDC (6 decimals)
          maxAmount: BigInt("10000000"), // 10 USDC (6 decimals)
        },
        {
          id: "usdc-jup-usdc",
          name: "USDC → JUP → USDC",
          description: "Arbitrage between USDC and JUP using Jupiter",
          tokenIn: "USDC",
          tokenOut: "JUP",
          protocol: "jupiter",
          riskLevel: "high",
          estimatedProfit: 1.2,
          minAmount: BigInt("10000000"), // 100 USDC (6 decimals)
          maxAmount: BigInt("5000000000"), // 5,000 USDC (6 decimals)
        },
      ];

      // FIXED: Only set strategies if they haven't been set yet
      if (strategies.length === 0) {
        setStrategies(fallbackStrategies);
        if (!selectedStrategy) {
          setSelectedStrategy("usdc-samo-usdc");
        }
      }

      // FIXED: Use Phantom's Ethereum provider if available, otherwise skip EVM setup
      let ethereumProvider = null;

      // First check if Phantom has EVM support and is connected
      if (metamaskConnected && window.ethereum) {
        console.log("Using MetaMask's Ethereum provider");
        ethereumProvider = window.ethereum;
      } else {
        console.log(
          "No EVM provider available - using fallback strategies only"
        );
        flashLoanServiceRef.current = null;
        return;
      }

      if (!ethereumProvider) {
        console.log("No ethereum provider found - using fallback strategies");
        flashLoanServiceRef.current = null;
        return;
      }

      try {
        console.log("Creating provider with available Ethereum provider...");
        const provider = new ethers.BrowserProvider(ethereumProvider);

        // FIXED: For Phantom, don't pass the address to getSigner - let it derive it
        let signer;
        if (metamaskAddress) {
          console.log(
            "Using MetaMask-derived Ethereum address:",
            metamaskAddress
          );
          // Don't pass the address to getSigner, let ethers handle it
          signer = await provider.getSigner();

          // Verify the signer address matches our derived address
          const signerAddress = await signer.getAddress();
          console.log("Signer address from provider:", signerAddress);
          console.log("Expected address from MetaMask:", metamaskAddress);

          if (signerAddress.toLowerCase() !== metamaskAddress.toLowerCase()) {
            console.warn(
              "Address mismatch between signer and MetaMask derivation"
            );
            // Continue anyway, use what the provider gives us
          }
        } else {
          // For MetaMask, request account access
          try {
            await ethereumProvider.request({ method: "eth_requestAccounts" });
            signer = await provider.getSigner();
          } catch (error) {
            console.log("User denied account access");
            flashLoanServiceRef.current = null;
            return;
          }
        }

        const signerAddress = await signer.getAddress();
        console.log("Final signer address:", signerAddress);

        // Verify we can get the network
        const network = await provider.getNetwork();
        console.log("Network:", network.chainId.toString());

        console.log("Creating FlashLoanService...");
        flashLoanServiceRef.current = new FlashLoanService(provider, signer);

        console.log("Fetching strategies...");
        const fetchedStrategies =
          await flashLoanServiceRef.current.getStrategies();
        console.log("Fetched strategies:", fetchedStrategies);

        // Use fetched strategies if available, otherwise keep fallback
        if (fetchedStrategies && fetchedStrategies.length > 0) {
          setStrategies(fetchedStrategies);

          // Set default strategy to first Orca strategy
          const orcaStrategy = fetchedStrategies.find(
            (s) => s.protocol === "orca"
          );
          const defaultStrategyId = orcaStrategy?.id || fetchedStrategies[0].id;

          if (
            !selectedStrategy ||
            !fetchedStrategies.find((s) => s.id === selectedStrategy)
          ) {
            setSelectedStrategy(defaultStrategyId);
            console.log("Selected default strategy:", defaultStrategyId);
          }
        }
      } catch (err) {
        console.error("Error setting up flash loan service:", err);
        console.error(
          "Error details:",
          err instanceof Error ? err.message : "Unknown error"
        );

        // Keep fallback strategies on error
        flashLoanServiceRef.current = null;

        // Show user-friendly error
        toast({
          title: "Service Setup Failed",
          description:
            "Using fallback strategies. For full functionality, ensure your wallet supports Ethereum operations.",
          variant: "destructive",
        });
      }
    }

    setupServiceAndFetchStrategies();
  }, [isConnected, walletType, metamaskAddress, metamaskConnected, toast]);

  // Check network status when wallet connects
  useEffect(() => {
    if (isConnected && metamaskAddress) {
      checkNetworkStatus();
    } else {
      setNetworkStatus({ chainId: null, networkName: null, isCorrect: false });
    }
  }, [isConnected, metamaskAddress]);

  // Listen for network changes
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      const handleChainChanged = () => {
        checkNetworkStatus();
      };

      window.ethereum.on("chainChanged", handleChainChanged);
      return () => {
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      };
    }
  }, []);

  // FIXED: Better handleExecute with improved error handling for Phantom
  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      setFlashLoanResult(null);

      // Validate token selection
      if (token !== "usdc") {
        toast({
          title: "Unsupported Token",
          description:
            "Currently only USDC is supported for flash loans. Please select USDC.",
          variant: "destructive",
        });
        return;
      }

      // Validate amount
      if (!amount || parseFloat(amount) <= 0) {
        toast({
          title: "Invalid Amount",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }

      console.log("=== HANDLE EXECUTE START ===");
      console.log("isConnected:", isConnected);
      console.log("amount:", amount);
      console.log("selectedStrategy:", selectedStrategy);
      console.log("sourceChain:", sourceChain);
      console.log("targetChain:", targetChain);
      console.log("metamaskConnected:", metamaskConnected);
      console.log("metamaskAddress:", metamaskAddress);

      // Clear previous errors
      setWalletError(null);

      // Basic validation
      if (!isConnected) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your wallet to execute flash loans",
          variant: "destructive",
        });
        return;
      }

      // Check if wallet is ready for this operation
      if (!isWalletReady()) {
        toast({
          title: "Wallet Not Ready",
          description: "Please connect MetaMask to execute flash loans",
          variant: "destructive",
        });
        return;
      }

      // Strategy validation
      const strategy = strategies.find((s) => s.id === selectedStrategy);
      if (!strategy) {
        toast({
          title: "Strategy Not Found",
          description: "Please select a valid strategy.",
          variant: "destructive",
        });
        return;
      }

      if (strategy.protocol !== "orca") {
        toast({
          title: "Strategy Not Supported",
          description:
            "This strategy is not yet available. Please select an Orca strategy.",
          variant: "destructive",
        });
        return;
      }

      // Amount validation
      const amountInWei = ethers.parseUnits(amount, 6);
      const min = Number(ethers.formatUnits(strategy.minAmount, 6));
      const max = Number(ethers.formatUnits(strategy.maxAmount, 6));

      if (parseFloat(amount) < min || parseFloat(amount) > max) {
        toast({
          title: "Invalid Amount",
          description: `Amount must be between ${min} and ${max} ${token.toUpperCase()}`,
          variant: "destructive",
        });
        return;
      }

      // Contract setup and balance checks
      console.log("Setting up contract...");

      // Get and validate Ethereum provider
      console.log("Getting Ethereum provider...");
      console.log("MetaMask connected:", metamaskConnected);
      console.log("Window.ethereum available:", !!window.ethereum);

      const ethereumProvider = await getValidEthereumProvider();
      console.log("Selected provider: MetaMask");

      // Track which provider is being used
      setActiveProvider("MetaMask");

      // Create signer with improved error handling
      console.log("Creating signer...");
      const signer = await createSigner(ethereumProvider);

      // Network validation - ensure user is on Neon Devnet
      console.log("Validating network...");
      try {
        const chainId = await ethereumProvider.request({
          method: "eth_chainId",
        });
        console.log("Current chain ID:", chainId);
        const expectedChainId = "0xe9ac0ce"; // Neon Devnet chain ID (245022926)

        if (chainId !== expectedChainId) {
          // Try to switch to Neon Devnet
          try {
            console.log("Attempting to switch to Neon EVM DevNet...");
            await ethereumProvider.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: expectedChainId }],
            });
            console.log("Successfully switched to Neon EVM DevNet");
          } catch (switchError: any) {
            // If the network doesn't exist, add it
            if (switchError.code === 4902) {
              try {
                await ethereumProvider.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: expectedChainId,
                      chainName: "Neon EVM DevNet",
                      rpcUrls: ["https://devnet.neonevm.org"],
                      nativeCurrency: {
                        name: "NEON",
                        symbol: "NEON",
                        decimals: 18,
                      },
                      blockExplorerUrls: ["https://devnet.neonscan.org"],
                    },
                  ],
                });
                console.log(
                  "Successfully added and switched to Neon EVM DevNet"
                );
              } catch (addError) {
                console.error("Failed to add Neon EVM DevNet:", addError);
                toast({
                  title: "Network Switch Failed",
                  description:
                    "Please manually switch to Neon EVM DevNet in your wallet before executing flash loans.",
                  variant: "destructive",
                });
                return;
              }
            } else {
              console.error(
                "Failed to switch to Neon EVM DevNet:",
                switchError
              );
              toast({
                title: "Network Switch Failed",
                description:
                  "Please manually switch to Neon EVM DevNet in your wallet before executing flash loans.",
                variant: "destructive",
              });
              return;
            }
          }
        }
        console.log("Network validation passed - user is on Neon EVM DevNet");

        // Test basic provider functionality
        console.log("Testing provider functionality...");
        const blockNumber = await ethereumProvider.request({
          method: "eth_blockNumber",
        });
        console.log("Latest block number:", blockNumber);
      } catch (error) {
        console.error("Network validation failed:", error);
        toast({
          title: "Network Check Failed",
          description:
            "Unable to verify network. Please ensure you're connected to Neon Devnet.",
          variant: "destructive",
        });
        return;
      }

      // Setup flash loan service if not ready
      if (!flashLoanServiceRef.current) {
        console.log("Setting up flash loan service...");
        const provider = new ethers.BrowserProvider(ethereumProvider);
        flashLoanServiceRef.current = new FlashLoanService(provider, signer);
        console.log("Flash loan service created successfully");
      }

      const provider = new ethers.BrowserProvider(ethereumProvider);

      // Use simple contract setup service (user's wallet as "owner" like reference implementation)
      const contractSetup = new SimpleContractSetupService(provider, signer);
      console.log("Simple contract setup service created successfully");

      const userEvmAddress = await signer.getAddress();
      console.log("User EVM Address:", userEvmAddress);

      // Verify USDC contract
      const isUSDCContractAccessible = await contractSetup.verifyUSDCContract();
      if (!isUSDCContractAccessible) {
        toast({
          title: "USDC Contract Not Accessible",
          description:
            "Unable to access USDC contract on Neon EVM. Please check your network connection.",
          variant: "destructive",
        });
        return;
      }

      // Check contract balance for fees (using user's wallet like reference implementation)
      const hasContractBalance =
        await contractSetup.checkContractBalanceForFee();
      if (!hasContractBalance) {
        toast({
          title: "Setting up contract...",
          description: "Ensuring contract has USDC for flash loan fees",
        });

        // Ensure contract has USDC for fees using user's wallet
        const setupSuccess = await contractSetup.ensureContractBalance();
        if (!setupSuccess) {
          toast({
            title: "Contract Setup Failed",
            description:
              "Unable to ensure contract has USDC for fees. Please get USDC for your wallet.",
            variant: "destructive",
          });
          return;
        }
      }

      // Execute flash loan
      console.log("Executing flash loan...");
      toast({
        title: "Executing flash loan...",
        description: `Executing ${strategy.name} with ${amount} USDC`,
      });

      // Execute flash loan with simplified approach (no Solana provider dependency)
      const result = await flashLoanServiceRef.current.executeFlashLoan(
        selectedStrategy,
        amountInWei,
        0.5
      );

      // Handle results
      setFlashLoanResult({
        ...result,
        profit: result.profit ? result.profit.toString() : undefined,
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
        toast({
          title: "Flash Loan Executed Successfully! 🎉",
          description: `Generated ${profitFormatted} USDC profit. Transaction: ${result.transactionHash?.substring(
            0,
            10
          )}...`,
        });
      } else {
        toast({
          title: "Flash Loan Failed",
          description: result.error || "Failed to execute flash loan",
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Flash loan execution failed:", error);

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
            <div>
              Solana Provider:{" "}
              {typeof window !== "undefined" && window.solana ? "Yes" : "No"}
            </div>
          </CardContent>
        </Card>
      )}

      {/* FIXED: Add wallet error display */}
      {walletError && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <div>
                <h3 className="text-sm font-semibold text-red-800">
                  Wallet Error
                </h3>
                <p className="text-sm text-red-700">{walletError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FIXED: Show operation requirements */}
      {isConnected && !isWalletReady() && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-orange-800">
                  Additional Setup Required
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  {!metamaskConnected &&
                    "Please connect MetaMask to execute flash loans."}
                  {metamaskConnected &&
                    !window.ethereum &&
                    "MetaMask connected but provider not available. Please refresh the page."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Network Warning */}
      {isConnected && !networkStatus.isCorrect && networkStatus.networkName && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-red-800">
                  Wrong Network Detected
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  You're currently connected to {networkStatus.networkName}.
                  Please switch to Neon EVM DevNet to execute flash loans.
                </p>
                <Button
                  onClick={checkNetworkStatus}
                  variant="outline"
                  size="sm"
                  className="text-red-700 border-red-300 hover:bg-red-100"
                >
                  Switch to Neon EVM DevNet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wallet Status Display */}
      {isClient && isConnected && (
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 gap-4">
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
            </div>
            {metamaskConnected && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-green-800">
                    Ready for Flash Loan Operations
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
                  <SelectItem value="usdt" disabled>
                    USDT (Coming Soon)
                  </SelectItem>
                  <SelectItem value="eth" disabled>
                    ETH (Coming Soon)
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Currently only USDC is supported for flash loans. USDT and ETH
                support coming soon.
              </p>
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

            {/* FIXED: Show operation type and requirements */}
            {isClient && (
              <div className="p-3 bg-blue-500 border border-blue-200 rounded-lg">
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">Operation:</span>
                    <span>
                      {sourceChain} → {targetChain}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Wallet Ready:</span>
                    <Badge
                      variant={isWalletReady() ? "default" : "destructive"}
                    >
                      {isWalletReady() ? "✓ Ready" : "Setup Required"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Network:</span>
                    <Badge
                      variant={
                        networkStatus.isCorrect ? "default" : "destructive"
                      }
                      className="text-xs"
                    >
                      {networkStatus.networkName || "Checking..."}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Provider:</span>
                    <Badge variant="outline" className="text-xs">
                      {metamaskConnected ? "MetaMask" : "None"}
                    </Badge>
                  </div>
                </div>
              </div>
            )}

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
                    strategies.map((s) => (
                      <SelectItem
                        key={s.id}
                        value={s.id}
                        disabled={s.protocol !== "orca"}
                      >
                        {s.name}
                        {s.protocol !== "orca" && " (Coming soon)"}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {/* Debug info for strategy selection */}
              {process.env.NODE_ENV === "development" && (
                <div className="text-xs text-muted-foreground">
                  Selected: {selectedStrategy || "None"} | Available:{" "}
                  {strategies.length}
                  {strategies.length > 0 && (
                    <div>
                      Strategies: {strategies.map((s) => s.id).join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleExecute}
              disabled={isExecuting || !isWalletReady()}
              className="w-full"
            >
              {isExecuting
                ? "Executing..."
                : !isWalletReady()
                ? "Wallet Setup Required"
                : "Execute Flash Loan"}
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
                    {metamaskConnected ? "MetaMask" : "None"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>MetaMask:</span>
                  <Badge variant={metamaskConnected ? "default" : "secondary"}>
                    {metamaskConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                {metamaskConnected && (
                  <div className="flex justify-between">
                    <span>Flash Loan Ready:</span>
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
