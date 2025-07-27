"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gift } from "lucide-react";

export function AirdropButton({ className = "" }: { className?: string }) {
  const { isConnected, walletType, ethereumAddress } = useWallet();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAirdrop = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Connect your wallet to receive test gas",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      let address = "";
      let chain = "";
      if (walletType === "metamask" && ethereumAddress) {
        address = ethereumAddress;
        chain = "neon";
      } else {
        throw new Error("Unsupported wallet or missing address");
      }
      const res = await fetch("/api/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, chain }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Airdrop failed");
      }
      toast({
        title: "Airdrop Successful!",
        description: `Test ${
          chain === "neon" ? "NEON" : "SOL"
        } sent to your wallet.`,
      });
    } catch (e: any) {
      toast({
        title: "Airdrop Failed",
        description: e.message || "Could not airdrop test gas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUSDCAirdrop = async () => {
    if (!isConnected || !ethereumAddress) {
      toast({
        title: "Wallet Not Connected",
        description: "Connect your MetaMask wallet to receive USDC",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: ethereumAddress, chain: "neon-usdc" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "USDC airdrop failed");
      }
      toast({
        title: "USDC Airdrop Successful!",
        description: "USDC tokens sent to your Neon EVM wallet.",
      });
    } catch (e: any) {
      toast({
        title: "USDC Airdrop Failed",
        description:
          e.message ||
          "Could not airdrop USDC. You may need to get USDC from a DEX.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={handleAirdrop}
        disabled={loading}
        variant="outline"
        className={className}
        title="Airdrop test NEON (Neon EVM) or SOL (Solana) to your wallet"
      >
        {loading ? (
          <Loader2 className="animate-spin h-4 w-4 mr-2" />
        ) : (
          <Gift className="h-4 w-4 mr-2" />
        )}
        Airdrop Gas
      </Button>
      {isConnected && ethereumAddress && (
        <Button
          onClick={handleUSDCAirdrop}
          disabled={loading}
          variant="outline"
          className={className}
          title="Get USDC tokens for flash loan fees"
        >
          {loading ? (
            <Loader2 className="animate-spin h-4 w-4 mr-2" />
          ) : (
            <Gift className="h-4 w-4 mr-2" />
          )}
          Get USDC
        </Button>
      )}
    </div>
  );
}
