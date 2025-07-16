"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import {
  Wallet,
  Copy,
  ExternalLink,
  LogOut,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
  Link as LinkIcon,
  Shield,
  ArrowRight,
  Info,
  RefreshCw,
  Network,
  Coins,
} from "lucide-react";

const NEON_DEVNET_PARAMS = {
  chainId: "0xeeb2e6e", // 245022926 in hex
  chainName: "Neon Devnet",
  rpcUrls: ["https://devnet.neonevm.org"],
  nativeCurrency: { name: "Neon", symbol: "NEON", decimals: 18 },
  blockExplorerUrls: ["https://neon-devnet.blockscout.com"],
};

interface Balance {
  token: string;
  amount: string;
  usdValue?: string;
  network: "neon" | "solana";
}

export default function WalletStatus() {
  const {
    isConnected,
    walletType,
    ethereumAddress,
    solanaAddress,
    metamaskConnected,
    phantomConnected,
    isDualConnected,
    metamaskAddress,
    phantomAddress,
    disconnect,
    getShortAddress,
    getNetworkName,
  } = useWallet();

  const { toast } = useToast();
  const [balances, setBalances] = useState<Balance[]>([]);
  const [loadingBalances, setLoadingBalances] = useState(false);
  const [chainId, setChainId] = useState<string | null>(null);

  // Get current chain ID
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_chainId" }).then(setChainId);
      const handler = (id: string) => setChainId(id);
      window.ethereum.on("chainChanged", handler);
      return () => window.ethereum.removeListener("chainChanged", handler);
    }
  }, []);

  const isNeonDevnet = chainId === NEON_DEVNET_PARAMS.chainId;

  // Fetch balances
  const fetchBalances = async () => {
    if (!isConnected) return;

    setLoadingBalances(true);
    try {
      const newBalances: Balance[] = [];

      // Fetch NEON balance if MetaMask is connected
      if (metamaskConnected && ethereumAddress) {
        try {
          const provider = new (await import("ethers")).BrowserProvider(
            window.ethereum
          );
          const balance = await provider.getBalance(ethereumAddress);
          const neonBalance = (await import("ethers")).formatEther(balance);
          newBalances.push({
            token: "NEON",
            amount: parseFloat(neonBalance).toFixed(4),
            network: "neon",
          });
        } catch (error) {
          console.error("Error fetching NEON balance:", error);
        }
      }

      // Fetch SOL balance if Phantom is connected
      if (phantomConnected && solanaAddress) {
        try {
          const { Connection, PublicKey } = await import("@solana/web3.js");
          const connection = new Connection(
            "https://api.devnet.solana.com",
            "confirmed"
          );
          const balance = await connection.getBalance(
            new PublicKey(solanaAddress)
          );
          const solBalance = (balance / 1e9).toFixed(4);
          newBalances.push({
            token: "SOL",
            amount: solBalance,
            network: "solana",
          });
        } catch (error) {
          console.error("Error fetching SOL balance:", error);
        }
      }

      // Fetch USDC balance on Neon if available
      if (metamaskConnected && ethereumAddress) {
        try {
          const { ethers } = await import("ethers");
          const provider = new ethers.BrowserProvider(window.ethereum);
          const usdcAddress = "0x146c38c2E36D34Ed88d843E013677cCe72341794";
          const usdcAbi = [
            "function balanceOf(address owner) view returns (uint256)",
          ];
          const usdcContract = new ethers.Contract(
            usdcAddress,
            usdcAbi,
            provider
          );
          const balance = await usdcContract.balanceOf(ethereumAddress);
          const usdcBalance = (parseInt(balance.toString()) / 1e6).toFixed(2);
          if (parseFloat(usdcBalance) > 0) {
            newBalances.push({
              token: "USDC",
              amount: usdcBalance,
              network: "neon",
            });
          }
        } catch (error) {
          console.error("Error fetching USDC balance:", error);
        }
      }

      setBalances(newBalances);
    } catch (error) {
      console.error("Error fetching balances:", error);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Fetch balances on mount and when wallet changes
  useEffect(() => {
    fetchBalances();
  }, [isConnected, ethereumAddress, solanaAddress]);

  // Copy address to clipboard
  const copyAddress = async (address: string, type: "Ethereum" | "Solana") => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: `${type} address copied!`,
        description: `Address copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy address",
        description: "Please try again",
        variant: "destructive",
      });
    }
  };

  // Handle disconnect
  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet disconnected",
      description: "You have been disconnected from your wallet",
    });
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-sm text-muted-foreground mb-2">
              No wallet connected
            </p>
            <p className="text-xs text-muted-foreground">
              Connect your wallet to view status and balances
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Status
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchBalances}
            disabled={loadingBalances}
            className="ml-auto h-6 w-6 p-0"
          >
            <RefreshCw
              className={`h-3 w-3 ${loadingBalances ? "animate-spin" : ""}`}
            />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-sm font-medium">
            {isDualConnected
              ? "Dual Wallet Connected"
              : walletType === "metamask"
              ? "MetaMask Connected"
              : "Phantom Connected"}
          </span>
        </div>

        {/* Wallet Addresses */}
        <div className="space-y-2">
          {ethereumAddress && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  ETH
                </Badge>
                <span className="text-sm font-mono">
                  {getShortAddress(ethereumAddress)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyAddress(ethereumAddress, "Ethereum")}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://neon-devnet.blockscout.com/address/${ethereumAddress}`,
                      "_blank"
                    )
                  }
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {solanaAddress && (
            <div className="flex items-center justify-between p-2 bg-muted rounded-md">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">
                  SOL
                </Badge>
                <span className="text-sm font-mono">
                  {getShortAddress(solanaAddress)}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyAddress(solanaAddress, "Solana")}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    window.open(
                      `https://solscan.io/account/${solanaAddress}?cluster=devnet`,
                      "_blank"
                    )
                  }
                  className="h-6 w-6 p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Network Status */}
        {metamaskConnected && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              <span className="text-sm font-medium">Neon Network</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={isNeonDevnet ? "default" : "destructive"}
                className="text-xs"
              >
                {isNeonDevnet ? "Neon Devnet" : "Wrong Network"}
              </Badge>
              {!isNeonDevnet && (
                <span className="text-xs text-red-600">
                  Switch to Neon Devnet for flash loans
                </span>
              )}
            </div>
          </div>
        )}

        {/* Balances */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4" />
            <span className="text-sm font-medium">Balances</span>
          </div>

          {loadingBalances ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading balances...
            </div>
          ) : balances.length > 0 ? (
            <div className="space-y-1">
              {balances.map((balance, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {balance.token}
                    </Badge>
                    <span className="text-sm font-medium">
                      {balance.amount}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {balance.network}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              No balances found
            </div>
          )}
        </div>

        <Separator />

        {/* Disconnect Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleDisconnect}
          className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Wallet
        </Button>
      </CardContent>
    </Card>
  );
}
