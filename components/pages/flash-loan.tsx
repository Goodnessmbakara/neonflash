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

  // FIXED: Add wallet connection state tracking
  const [walletError, setWalletError] = useState<string | null>(null);

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

  // FIXED: Improved function to check wallet readiness with better Phantom EVM detection
  const isWalletReady = () => {
    if (typeof window === "undefined") return false;
    
    // Check if we have the required providers
    const hasEthereum = !!window.ethereum;
    const hasSolana = !!window.solana;
    
    // For MetaMask operations (Neon to Solana)
    if (sourceChain === "neon" && targetChain === "solana") {
      return hasEthereum && metamaskConnected;
    }
    
    // For Phantom EVM operations (Solana to Neon)
    if (sourceChain === "solana" && targetChain === "neon") {
      return hasSolana && phantomConnected && ethereumAddress;
    }
    
    // For same-chain operations
    if (sourceChain === "neon" && targetChain === "neon") {
      return hasEthereum && (metamaskConnected || (phantomConnected && ethereumAddress));
    }
    
    if (sourceChain === "solana" && targetChain === "solana") {
      return hasSolana && phantomConnected;
    }
    
    return false;
  };

  // FIXED: Better provider detection logic
  const getValidEthereumProvider = async () => {
    setWalletError(null);
    
    try {
      if (typeof window === "undefined") {
        throw new Error("Not in browser environment");
      }

      let provider = null;

      // Determine which provider to use based on operation type
      if (sourceChain === "neon" && targetChain === "solana") {
        // Use MetaMask for Neon-to-Solana
        if (!window.ethereum) {
          throw new Error("MetaMask not found. Please install MetaMask extension.");
        }
        
        if (!metamaskConnected) {
          throw new Error("MetaMask not connected. Please connect MetaMask first.");
        }
        
        provider = window.ethereum;
        
      } else if (sourceChain === "solana" && targetChain === "neon") {
        // Use Phantom EVM for Solana-to-Neon
        if (!window.solana) {
          throw new Error("Phantom wallet not found. Please install Phantom extension.");
        }
        
        if (!phantomConnected) {
          throw new Error("Phantom not connected. Please connect Phantom first.");
        }
        
        if (!ethereumAddress) {
          throw new Error("Phantom EVM address not available. Please ensure Phantom supports Ethereum operations.");
        }
        
        // FIXED: For Phantom, prefer the Ethereum provider if available
        provider = window.solana.ethereum || window.ethereum;
        
        if (!provider) {
          throw new Error("Ethereum provider not available through Phantom.");
        }
        
      } else {
        // Fallback logic for other combinations
        if (phantomConnected && window.solana && ethereumAddress) {
          provider = window.solana.ethereum || window.ethereum;
          if (!provider) {
            throw new Error("Phantom Ethereum provider not available.");
          }
        } else if (metamaskConnected && window.ethereum) {
          provider = window.ethereum;
        } else {
          throw new Error("No suitable wallet provider found for this operation.");
        }
      }

      if (!provider) {
        throw new Error("Failed to obtain wallet provider.");
      }

      console.log("Successfully obtained wallet provider for operation:", sourceChain, "→", targetChain);
      return provider;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown wallet error";
      console.error("Wallet provider error:", errorMessage);
      setWalletError(errorMessage);
      throw error;
    }
  };

  // FIXED: Add a function to check if Phantom has Ethereum support
  const checkPhantomEthereumSupport = () => {
    if (typeof window === "undefined" || !window.solana) return false;
    
    // Check if Phantom has Ethereum provider
    const hasEthProvider = !!(window.solana.ethereum || window.ethereum);
    const hasEthAddress = !!ethereumAddress;
    
    console.log("Phantom Ethereum support check:");
    console.log("- Has Ethereum provider:", hasEthProvider);
    console.log("- Has Ethereum address:", hasEthAddress);
    console.log("- Phantom connected:", phantomConnected);
    
    return hasEthProvider && hasEthAddress && phantomConnected;
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
        throw new Error("Failed to connect to blockchain network. Please check your wallet connection.");
      }

      console.log("Requesting signer...");
      console.log("Operation type:", sourceChain, "→", targetChain);
      console.log("Phantom connected:", phantomConnected);
      console.log("MetaMask connected:", metamaskConnected);
      console.log("Ethereum address (Phantom):", ethereumAddress);
      
      let signer;
      
      if (sourceChain === "neon" && targetChain === "solana") {
        // MetaMask signer
        console.log("Creating MetaMask signer...");
        
        try {
          const accounts = await ethereumProvider.request({ 
            method: 'eth_requestAccounts' 
          });
          console.log("MetaMask accounts requested:", accounts);
          
          if (!accounts || accounts.length === 0) {
            throw new Error("No accounts returned from MetaMask");
          }
        } catch (err) {
          console.error("eth_requestAccounts failed:", err);
          throw new Error("Failed to connect to MetaMask. Please approve the connection request.");
        }
        
        signer = await provider.getSigner();
        
      } else if (sourceChain === "solana" && targetChain === "neon") {
        // FIXED: Phantom EVM signer - avoid eth_requestAccounts since Phantom is already connected
        console.log("Creating Phantom EVM signer...");
        console.log("Phantom already connected, skipping eth_requestAccounts");
        
        // FIXED: Don't call eth_requestAccounts for Phantom since it's already connected
        // Just get the signer directly
        try {
          signer = await provider.getSigner();
        } catch (err) {
          console.error("Failed to get Phantom signer:", err);
          
          // If direct signer fails, try to check if accounts are available
          try {
            const accounts = await ethereumProvider.request({ method: 'eth_accounts' });
            console.log("Available Phantom accounts:", accounts);
            
            if (!accounts || accounts.length === 0) {
              throw new Error("No Ethereum accounts available in Phantom. Please enable Ethereum support in Phantom settings.");
            }
            
            // Try again after confirming accounts exist
            signer = await provider.getSigner();
          } catch (secondErr) {
            console.error("Secondary attempt failed:", secondErr);
            throw new Error("Failed to access Phantom's Ethereum functionality. Please ensure Phantom supports Ethereum and try refreshing the page.");
          }
        }
        
        // Verify the address matches our expected Phantom address
        const signerAddress = await signer.getAddress();
        console.log("Phantom EVM signer address:", signerAddress);
        console.log("Expected Phantom address:", ethereumAddress);
        
        if (ethereumAddress && signerAddress.toLowerCase() !== ethereumAddress.toLowerCase()) {
          console.warn("Address mismatch between signer and expected Phantom address");
          console.warn("Using signer address:", signerAddress);
        }
        
      } else {
        // Generic signer creation for other combinations
        console.log("Creating generic signer...");
        
        // FIXED: Check if this is a Phantom provider and handle accordingly
        const isPhantomProvider = phantomConnected && window.solana && ethereumAddress;
        
        if (isPhantomProvider) {
          console.log("Using Phantom provider for generic signer");
          // For Phantom, don't request accounts - just get signer
          signer = await provider.getSigner();
        } else if (metamaskConnected) {
          console.log("Using MetaMask provider for generic signer");
          try {
            await ethereumProvider.request({ method: 'eth_requestAccounts' });
            signer = await provider.getSigner();
          } catch (err) {
            console.error("Account request failed:", err);
            throw new Error("Failed to connect wallet accounts");
          }
        } else {
          throw new Error("No suitable wallet found for this operation");
        }
      }

      // Verify signer
      const signerAddress = await signer.getAddress();
      console.log("Final signer address:", signerAddress);
      
      if (!signerAddress) {
        throw new Error("Failed to get signer address");
      }

      return signer;
      
    } catch (error) {
      console.error("Signer creation failed:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("user rejected")) {
          throw new Error("Transaction was rejected by user. Please approve the wallet connection.");
        } else if (error.message.includes("coalesce")) {
          throw new Error("Wallet connection error. Please refresh the page and reconnect your wallet.");
        }
        // Pass through our custom error messages
        throw error;
      }
      
      throw new Error("Failed to create wallet signer. Please check your wallet connection and try again.");
    }
  };

  // FIXED: New function to get Ethereum provider (Phantom first, then MetaMask)
  const getEthereumProvider = () => {
    // Prefer Phantom's Ethereum provider if available
    if (phantomConnected && window.solana && ethereumAddress) {
      return window.solana.ethereum || window.ethereum;
    }
    
    // Fallback to MetaMask
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
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals: 1 * 10^6)
          maxAmount: BigInt("10000000"), // 10 USDC (6 decimals: 10 * 10^6)
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
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals)
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
          estimatedProfit: 1.2, // 1.2%
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals)
          maxAmount: BigInt("10000000"), // 10 USDC (6 decimals)
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
      console.log("ethereumAddress:", ethereumAddress);
      console.log("metamaskConnected:", metamaskConnected);
      console.log("phantomConnected:", phantomConnected);
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
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals: 1 * 10^6)
          maxAmount: BigInt("10000000"), // 10 USDC (6 decimals: 10 * 10^6)
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
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals)
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
          minAmount: BigInt("1000000"), // 1 USDC (6 decimals)
          maxAmount: BigInt("10000000"), // 10 USDC (6 decimals)
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
      if (phantomConnected && window.solana && ethereumAddress) {
        console.log("Using Phantom's Ethereum provider");
        // Phantom supports both Solana and Ethereum
        ethereumProvider = window.solana.ethereum || window.ethereum;
      } else if (metamaskConnected && window.ethereum) {
        console.log("Using MetaMask's Ethereum provider");
        ethereumProvider = window.ethereum;
      } else {
        console.log("No EVM provider available - using fallback strategies only");
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
        if (phantomConnected && ethereumAddress) {
          console.log("Using Phantom-derived Ethereum address:", ethereumAddress);
          // Don't pass the address to getSigner, let ethers handle it
          signer = await provider.getSigner();
          
          // Verify the signer address matches our derived address
          const signerAddress = await signer.getAddress();
          console.log("Signer address from provider:", signerAddress);
          console.log("Expected address from Phantom:", ethereumAddress);
          
          if (signerAddress.toLowerCase() !== ethereumAddress.toLowerCase()) {
            console.warn("Address mismatch between signer and Phantom derivation");
            // Continue anyway, use what the provider gives us
          }
        } else {
          // For MetaMask, request account access
          try {
            await ethereumProvider.request({ method: 'eth_requestAccounts' });
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
          
          if (!selectedStrategy || !fetchedStrategies.find(s => s.id === selectedStrategy)) {
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
  }, [isConnected, walletType, ethereumAddress, metamaskConnected, phantomConnected, toast]);

  // FIXED: Better handleExecute with improved error handling for Phantom
  const handleExecute = async () => {
    console.log("=== HANDLE EXECUTE START ===");
    console.log("isConnected:", isConnected);
    console.log("amount:", amount);
    console.log("selectedStrategy:", selectedStrategy);
    console.log("sourceChain:", sourceChain);
    console.log("targetChain:", targetChain);
    console.log("metamaskConnected:", metamaskConnected);
    console.log("phantomConnected:", phantomConnected);
    console.log("ethereumAddress:", ethereumAddress);
    console.log("Phantom EVM support:", checkPhantomEthereumSupport());

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

    // FIXED: Special check for Phantom EVM operations
    if (sourceChain === "solana" && targetChain === "neon") {
      if (!checkPhantomEthereumSupport()) {
        toast({
          title: "Phantom EVM Support Required",
          description: "This operation requires Phantom wallet with Ethereum support. Please ensure Phantom is updated and EVM features are enabled.",
          variant: "destructive",
        });
        return;
      }
    }

    // Check if wallet is ready for this operation
    if (!isWalletReady()) {
      let requiredWallet = "";
      if (sourceChain === "neon" && targetChain === "solana") {
        requiredWallet = "MetaMask for Neon EVM operations";
      } else if (sourceChain === "solana" && targetChain === "neon") {
        requiredWallet = "Phantom with EVM support for Solana-to-EVM operations";
      } else {
        requiredWallet = "appropriate wallet for this operation";
      }

      toast({
        title: "Wallet Not Ready",
        description: `Please connect ${requiredWallet}`,
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

    setIsExecuting(true);
    setFlashLoanResult(null);

    try {
      console.log("=== FLASH LOAN EXECUTION START ===");
      
      // Get and validate Ethereum provider
      console.log("Getting Ethereum provider...");
      const ethereumProvider = await getValidEthereumProvider();
      
      // Create signer with improved error handling
      console.log("Creating signer...");
      const signer = await createSigner(ethereumProvider);
      
      // Setup flash loan service if not ready
      if (!flashLoanServiceRef.current) {
        console.log("Setting up flash loan service...");
        const provider = new ethers.BrowserProvider(ethereumProvider);
        flashLoanServiceRef.current = new FlashLoanService(provider, signer);
        console.log("Flash loan service created successfully");
      }

      // Network validation
      if (sourceChain === "neon") {
        try {
          const chainId = await ethereumProvider.request({
            method: "eth_chainId",
          });
          console.log("Current chain ID:", chainId);
          console.log("Expected chain ID:", NETWORK_CONFIG.NEON_DEVNET.chainId);
          
          if (chainId !== NETWORK_CONFIG.NEON_DEVNET.chainId) {
            toast({
              title: "Wrong Network",
              description: "Please switch to Neon Devnet before executing.",
              variant: "destructive",
            });
            return;
          }
        } catch (error) {
          toast({
            title: "Network Check Failed",
            description: "Unable to verify network. Please check your wallet connection.",
            variant: "destructive",
          });
          return;
        }
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
          description: "This strategy is not yet available. Please select an Orca strategy.",
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
      const provider = new ethers.BrowserProvider(ethereumProvider);
      const contractSetup = new ContractSetupService(provider, signer);

      const userEvmAddress = await signer.getAddress();
      console.log("User EVM Address:", userEvmAddress);

      // Verify USDC contract
      const isUSDCContractAccessible = await contractSetup.verifyUSDCContract();
      if (!isUSDCContractAccessible) {
        toast({
          title: "USDC Contract Not Accessible",
          description: "Unable to access USDC contract on Neon EVM. Please check your network connection.",
          variant: "destructive",
        });
        return;
      }

      // Check user balance
      const hasBalance = await contractSetup.checkUserBalanceForFee(userEvmAddress, amountInWei);
      if (!hasBalance) {
        toast({
          title: "Insufficient USDC Balance",
          description: "You need USDC tokens on Neon EVM to pay flash loan fees. Use the airdrop button to get test USDC.",
          variant: "destructive",
        });
        return;
      }

      // Ensure contract balance
      toast({
        title: "Setting up contract...",
        description: "Ensuring contract has sufficient USDC balance for fees",
      });

      await contractSetup.ensureContractBalance();

      // Execute flash loan
      console.log("Executing flash loan...");
      toast({
        title: "Executing flash loan...",
        description: `Executing ${strategy.name} with ${amount} USDC`,
      });

      let result;
      if (strategy.protocol === "orca" && typeof window !== "undefined" && window.solana) {
        console.log("Using Orca strategy with Phantom wallet provider");
        result = await flashLoanServiceRef.current.executeFlashLoan(
          selectedStrategy,
          amountInWei,
          0.5,
          window.solana
        );
      } else {
        result = await flashLoanServiceRef.current.executeFlashLoan(
          selectedStrategy,
          amountInWei,
          0.5
        );
      }

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
        const profitFormatted = ethers.formatUnits(result.profit || BigInt(0), 6);
        toast({
          title: "Flash Loan Executed Successfully! 🎉",
          description: `Generated ${profitFormatted} USDC profit. Transaction: ${result.transactionHash?.substring(0, 10)}...`,
        });
      } else {
        toast({
          title: "Flash Loan Failed",
          description: result.error || "Failed to execute flash loan",
          variant: "destructive",
        });
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
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
            <div>Service Ready: {flashLoanServiceRef.current ? "Yes" : "No"}</div>
            <div>Strategies Count: {strategies.length}</div>
            <div>Selected Strategy: {selectedStrategy || "None"}</div>
            <div>Wallet Type: {walletType}</div>
            <div>Phantom EVM Support: {checkPhantomEthereumSupport() ? "Yes" : "No"}</div>
            <div>Ethereum Provider: {typeof window !== "undefined" && window.ethereum ? "Yes" : "No"}</div>
            <div>Solana Provider: {typeof window !== "undefined" && window.solana ? "Yes" : "No"}</div>
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
                <h3 className="text-sm font-semibold text-red-800">Wallet Error</h3>
                <p className="text-sm text-red-700">{walletError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* FIXED: Add specific warning for Phantom EVM operations */}
      {sourceChain === "solana" && targetChain === "neon" && phantomConnected && !checkPhantomEthereumSupport() && (
        <Card className="mb-4 border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-orange-800">
                  Phantom EVM Support Required
                </h3>
                <p className="text-sm text-orange-700 mb-4">
                  Solana → Neon operations require Phantom wallet with Ethereum Virtual Machine support. 
                  Please ensure you have the latest version of Phantom and EVM features are enabled.
                </p>
              </div>
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
                  {sourceChain === "neon" && targetChain === "solana" && "For Neon → Solana operations, connect MetaMask"}
                  {sourceChain === "solana" && targetChain === "neon" && "For Solana → Neon operations, connect Phantom with EVM support"}
                  {sourceChain === targetChain && "Connect the appropriate wallet for this operation"}
                </p>
              </div>
              <div className="flex gap-2 justify-center">
                <Button onClick={connectDualWallets} variant="default">
                  Connect Wallets
                </Button>
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
                  {sourceChain === "neon" && targetChain === "solana" && "This operation requires MetaMask to be connected"}
                  {sourceChain === "solana" && targetChain === "neon" && "This operation requires Phantom with EVM support"}
                  {sourceChain === targetChain && "Please ensure the appropriate wallet is properly connected"}
                </p>
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
                <h4 className="font-medium mb-2">Phantom (Solana + EVM)</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={phantomConnected ? "default" : "secondary"}>
                      {phantomConnected ? "Connected" : "Disconnected"}
                    </Badge>
                  </div>
                  {phantomAddress && (
                    <div className="flex justify-between">
                      <span>Solana:</span>
                      <span className="font-mono text-xs">
                        {phantomAddress.slice(0, 6)}...
                        {phantomAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                  {ethereumAddress && (
                    <div className="flex justify-between">
                      <span>EVM:</span>
                      <span className="font-mono text-xs">
                        {ethereumAddress.slice(0, 6)}...
                        {ethereumAddress.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {(isDualConnected || (phantomConnected && ethereumAddress)) && (
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

            {/* FIXED: Show operation type and requirements */}
            <div className="p-3 bg-blue-500 border border-blue-200 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="font-medium">Operation:</span>
                  <span>{sourceChain} → {targetChain}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Wallet Ready:</span>
                  <Badge variant={isWalletReady() ? "default" : "destructive"}>
                    {isWalletReady() ? "✓ Ready" : "Setup Required"}
                  </Badge>
                </div>
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
                  Selected: {selectedStrategy || "None"} | Available: {strategies.length}
                  {strategies.length > 0 && (
                    <div>Strategies: {strategies.map(s => s.id).join(", ")}</div>
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={handleExecute}
              disabled={isExecuting || !isWalletReady()}
              className="w-full"
            >
              {isExecuting ? "Executing..." : 
               !isWalletReady() ? "Wallet Setup Required" :
               "Execute Flash Loan"}
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