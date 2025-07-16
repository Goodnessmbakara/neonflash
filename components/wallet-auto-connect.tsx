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
  chainId: "0xeeb2e6e", // 245022926 in hex
  chainName: "Neon Devnet",
  rpcUrls: ["https://devnet.neonevm.org"],
  nativeCurrency: { name: "Neon", symbol: "NEON", decimals: 18 },
  blockExplorerUrls: ["https://neon-devnet.blockscout.com"],
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
    ethereumAddress,
    solanaAddress,
    isLoading,
    error,
    availableWallets,
    metamaskConnected,
    phantomConnected,
    isDualConnected,
    connectMetaMask,
    connectPhantom,
    connectDualWallets,
    disconnect,
    getShortAddress,
    getNetworkName,
  } = useWallet();

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectionMode, setConnectionMode] = useState<
    "single" | "dual" | null
  >(null);
  const chainId = useNetworkStatus();
  const isNeonDevnet = chainId === NEON_DEVNET_PARAMS.chainId;

  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected && availableWallets.metamask && availableWallets.phantom) {
      // If both wallets are available, suggest dual connection
      setConnectionMode("dual");
    }
  }, [isConnected, availableWallets]);

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

  // Handle single wallet connection
  const handleSingleConnect = async (walletType: "metamask" | "phantom") => {
    try {
      if (walletType === "metamask") {
        await connectMetaMask();
      } else {
        await connectPhantom();
      }

      setIsDialogOpen(false);
      toast({
        title: "Wallet connected!",
        description: `Successfully connected to ${
          walletType === "metamask" ? "MetaMask" : "Phantom"
        }`,
      });
    } catch (error) {
      toast({
        title: "Connection failed",
        description:
          error instanceof Error ? error.message : "Failed to connect wallet",
        variant: "destructive",
      });
    }
  };

  // Handle dual wallet connection
  const handleDualConnect = async () => {
    try {
      await connectDualWallets();
      setIsDialogOpen(false);
      toast({
        title: "Dual Wallet Connected!",
        description:
          "Both MetaMask and Phantom are now connected for cross-chain operations.",
      });
    } catch (error) {
      toast({
        title: "Dual connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to connect both wallets",
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
          <span className="text-xs">
            {isDualConnected
              ? "Dual Connected"
              : walletType === "metamask"
              ? "MetaMask"
              : "Phantom"}
          </span>
        </Badge>

        {/* Wallet Address Display */}
        <div className="hidden sm:flex items-center gap-2 text-sm">
          {ethereumAddress && (
            <span className="text-muted-foreground">
              ETH: {getShortAddress(ethereumAddress)}
            </span>
          )}
          {solanaAddress && (
            <span className="text-muted-foreground">
              SOL: {getShortAddress(solanaAddress)}
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
          Connect Wallet
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {/* Connection Mode Selection */}
          {!connectionMode && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">
                Choose your connection mode:
              </div>

              {/* Single Wallet Option */}
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-0 justify-start"
                    onClick={() => setConnectionMode("single")}
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Wallet className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">Single Wallet</p>
                        <p className="text-sm text-muted-foreground">
                          Connect one wallet (MetaMask or Phantom)
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Button>
                </CardContent>
              </Card>

              {/* Dual Wallet Option */}
              {availableWallets.metamask && availableWallets.phantom && (
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors border-2 border-blue-200">
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-0 justify-start"
                      onClick={() => setConnectionMode("dual")}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                          <LinkIcon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">
                            Dual Wallet (Recommended)
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Connect both wallets for cross-chain operations
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Recommended
                        </Badge>
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Single Wallet Selection */}
          {connectionMode === "single" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectionMode(null)}
                  className="h-6 w-6 p-0"
                >
                  ←
                </Button>
                <span className="text-sm font-medium">Choose Wallet</span>
              </div>

              {/* MetaMask Option */}
              {availableWallets.metamask && (
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-0 justify-start"
                      onClick={() => handleSingleConnect("metamask")}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                          <div className="w-6 h-6 text-white flex items-center justify-center">
                            <svg
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="w-6 h-6"
                            >
                              <path d="M21.49 2L13.54 8.27L14.77 4.95L21.49 2Z" />
                              <path d="M2.51 2L10.4 8.33L9.23 5.05L2.51 2Z" />
                              <path d="M18.95 16.82L16.68 20.59L20.23 21.8L21.99 17.04L18.95 16.82Z" />
                              <path d="M2.01 17.04L3.77 21.8L7.32 20.59L5.05 16.82L2.01 17.04Z" />
                              <path d="M7.32 20.59L10.4 18.36L8.23 21.12L7.32 20.59Z" />
                              <path d="M13.6 18.36L16.68 20.59L15.77 21.12L13.6 18.36Z" />
                              <path d="M16.68 20.59L13.6 22.82L15.77 26.58L16.68 20.59Z" />
                              <path d="M10.4 22.82L7.32 20.59L8.23 26.58L10.4 22.82Z" />
                              <path d="M10.4 18.36L13.6 18.36L13.6 22.82L10.4 22.82L10.4 18.36Z" />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">MetaMask</p>
                          <p className="text-sm text-muted-foreground">
                            For Neon EVM operations
                          </p>
                        </div>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Phantom Option */}
              {availableWallets.phantom && (
                <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Button
                      variant="ghost"
                      className="w-full h-auto p-0 justify-start"
                      onClick={() => handleSingleConnect("phantom")}
                      disabled={isLoading}
                    >
                      <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                          <Zap className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-medium">Phantom</p>
                          <p className="text-sm text-muted-foreground">
                            For Solana operations
                          </p>
                        </div>
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ArrowRight className="h-4 w-4" />
                        )}
                      </div>
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Dual Wallet Connection */}
          {connectionMode === "dual" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConnectionMode(null)}
                  className="h-6 w-6 p-0"
                >
                  ←
                </Button>
                <span className="text-sm font-medium">
                  Dual Wallet Connection
                </span>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Cross-Chain Operations</p>
                    <p className="text-xs mt-1">
                      Connecting both wallets enables flash loans across Neon
                      EVM and Solana networks.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleDualConnect}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LinkIcon className="h-4 w-4 mr-2" />
                )}
                Connect Both Wallets
              </Button>
            </div>
          )}

          {/* No wallets available */}
          {!availableWallets.metamask && !availableWallets.phantom && (
            <div className="text-center py-8">
              <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                No compatible wallets found
              </p>
              <p className="text-xs text-muted-foreground">
                Please install MetaMask or Phantom to continue
              </p>
              <div className="flex gap-2 mt-4 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://metamask.io/", "_blank")}
                >
                  Install MetaMask
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open("https://phantom.app/", "_blank")}
                >
                  Install Phantom
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
