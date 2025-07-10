"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2,
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

export default function WalletConnect() {
  const {
    isConnected,
    walletType,
    ethereumAddress,
    solanaAddress,
    isLoading,
    error,
    availableWallets,
    connectMetaMask,
    connectPhantom,
    disconnect,
    getShortAddress,
    getNetworkName,
  } = useWallet();

  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const chainId = useNetworkStatus();
  const isNeonDevnet = chainId === NEON_DEVNET_PARAMS.chainId;

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

  // Handle wallet connection
  const handleConnect = async (walletType: "metamask" | "phantom") => {
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="hidden sm:inline">
                {walletType === "metamask" ? "MetaMask" : "Phantom"}
              </span>
              <span className="text-xs text-muted-foreground">
                {getShortAddress(
                  walletType === "metamask" ? ethereumAddress! : solanaAddress!
                )}
              </span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                {walletType === "metamask" ? (
                  <div className="w-5 h-5 text-white flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5"
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
                ) : (
                  <Zap className="w-5 h-5 text-white" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {walletType === "metamask" ? "MetaMask" : "Phantom"} Wallet
                </p>
                <p className="text-xs text-muted-foreground">
                  Connected to {getNetworkName()}
                </p>
              </div>
            </div>

            <Separator className="my-3" />

            {/* Ethereum Address */}
            {ethereumAddress && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Ethereum Address
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    ETH
                  </Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm font-mono flex-1">
                    {getShortAddress(ethereumAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(ethereumAddress, "Ethereum")}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Solana Address */}
            {solanaAddress && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Solana Address
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    SOL
                  </Badge>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm font-mono flex-1">
                    {getShortAddress(solanaAddress)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyAddress(solanaAddress, "Solana")}
                    className="h-6 w-6 p-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Network Status and Switch Button for MetaMask */}
            {walletType === "metamask" && (
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Network
                  </span>
                  <Badge
                    variant={isNeonDevnet ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {isNeonDevnet
                      ? "Neon Devnet"
                      : chainId
                      ? `Chain: ${chainId}`
                      : "Unknown"}
                  </Badge>
                </div>
                {!isNeonDevnet && (
                  <div className="flex flex-col gap-2 mt-2">
                    <span className="text-xs text-red-500">
                      Not on Neon Devnet
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          await window.ethereum.request({
                            method: "wallet_switchEthereumChain",
                            params: [{ chainId: NEON_DEVNET_PARAMS.chainId }],
                          });
                        } catch (switchError: any) {
                          if (switchError.code === 4902) {
                            await window.ethereum.request({
                              method: "wallet_addEthereumChain",
                              params: [NEON_DEVNET_PARAMS],
                            });
                          }
                        }
                      }}
                    >
                      Switch to Neon Devnet
                    </Button>
                  </div>
                )}
              </div>
            )}

            <Separator className="my-3" />

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(
                    "https://etherscan.io/address/" + ethereumAddress,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Etherscan
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() =>
                  window.open(
                    "https://solscan.io/account/" + solanaAddress,
                    "_blank"
                  )
                }
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Solscan
              </Button>
            </div>

            <Separator className="my-3" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Disconnect
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // If not connected, show connect button
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

          {/* MetaMask Option */}
          {availableWallets.metamask && (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardContent className="p-4">
                <Button
                  variant="ghost"
                  className="w-full h-auto p-0 justify-start"
                  onClick={() => handleConnect("metamask")}
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
                        Connect with MetaMask wallet
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
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
                  onClick={() => handleConnect("phantom")}
                  disabled={isLoading}
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <Zap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium">Phantom</p>
                      <p className="text-sm text-muted-foreground">
                        Connect with Phantom wallet
                      </p>
                    </div>
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </Button>
              </CardContent>
            </Card>
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
