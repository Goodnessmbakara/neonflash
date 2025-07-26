"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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
} from "lucide-react";

const NEON_DEVNET_PARAMS = {
  chainId: "0xe9ac0ce", // 245022926 in hex (correct Neon Devnet)
  chainName: "Neon EVM DevNet",
  rpcUrls: ["https://devnet.neonevm.org"],
  nativeCurrency: { name: "Neon", symbol: "NEON", decimals: 18 },
  blockExplorerUrls: ["https://devnet.neonscan.org"],
};

function useNetworkStatus() {
  const [chainId, setChainId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.request({ method: "eth_chainId" }).then(setChainId);
      const handler = (id: string) => setChainId(id);
      window.ethereum.on("chainChanged", handler);
      return () => window.ethereum.removeListener("chainChanged", handler);
    }
  }, []);
  return chainId;
}

export default function WalletAutoConnect() {
  const {
    isConnected,
    walletType,
    isLoading,
    error,
    metamaskConnected,
    metamaskAddress,
    connectMetaMask,
    disconnect,
    getShortAddress,
  } = useWallet();

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Copy address to clipboard
  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      toast({
        title: `Address copied!`,
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

  // Handle MetaMask wallet connection
  const handleMetaMaskConnect = async () => {
    try {
      await connectMetaMask();
      setIsDialogOpen(false);
      toast({
        title: "MetaMask Connected!",
        description: `Successfully connected to MetaMask`,
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error ? error.message : "Failed to connect MetaMask",
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

  // If connected, show wallet info
  if (isConnected) {
    return (
      <div className="flex items-center gap-2">
        {/* Connection Status Badge */}
        <Badge variant="outline" className="flex items-center gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-xs">MetaMask</span>
        </Badge>

        {/* Wallet Address Display */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          {metamaskAddress && (
            <span className="text-muted-foreground">
              {getShortAddress(metamaskAddress)}
            </span>
          )}
        </div>

        {/* Disconnect Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  // If not connected, show connect dialog
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Wallet className="h-4 w-4" />
          Connect MetaMask
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect MetaMask</DialogTitle>
        </DialogHeader>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <Button
              onClick={handleMetaMaskConnect}
              disabled={metamaskConnected || isLoading}
              className="w-full"
            >
              {metamaskConnected ? "MetaMask Connected" : "Connect MetaMask"}
            </Button>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
