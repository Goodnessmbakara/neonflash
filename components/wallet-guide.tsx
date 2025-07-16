"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Wallet,
  Zap,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  ExternalLink,
  Shield,
  Network,
} from "lucide-react";

interface WalletGuideProps {
  onConnect?: () => void;
}

export default function WalletGuide({ onConnect }: WalletGuideProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          Wallet Connection Guide
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Cross-Chain Flash Loans</p>
              <p className="text-xs mt-1">
                NeonFlash requires wallet connections for cross-chain operations
                between Neon EVM and Solana.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Connection Options:</h4>

          {/* Option 1: Dual Wallet */}
          <div className="p-3 border border-blue-200 rounded-md bg-blue-50/50">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <LinkIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h5 className="font-medium text-sm">
                    Dual Wallet (Recommended)
                  </h5>
                  <Badge variant="secondary" className="text-xs">
                    Best Experience
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  Connect both MetaMask and Phantom for seamless cross-chain
                  operations.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Full cross-chain functionality</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Automatic network switching</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Best arbitrage opportunities</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Option 2: Single Wallet */}
          <div className="p-3 border border-gray-200 rounded-md">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wallet className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h5 className="font-medium text-sm mb-1">Single Wallet</h5>
                <p className="text-xs text-muted-foreground mb-2">
                  Connect either MetaMask or Phantom for basic operations.
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>MetaMask: Neon EVM operations</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-600" />
                    <span>Phantom: Solana operations</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-yellow-600" />
                    <span>Limited cross-chain functionality</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Network Requirements:</h4>

          <div className="grid gap-2">
            {/* Neon Network */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
                <Zap className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Neon Devnet</span>
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  MetaMask must be on Neon Devnet for flash loan operations
                </p>
              </div>
            </div>

            {/* Solana Network */}
            <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
              <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center">
                <Network className="w-3 h-3 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Solana Devnet</span>
                  <Badge variant="outline" className="text-xs">
                    Required
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Phantom must be on Solana Devnet for arbitrage operations
                </p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="font-medium text-sm">Security Notes:</h4>

          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-green-600 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">
                  Only connect to trusted applications
                </p>
                <p>
                  NeonFlash is a development application for testing purposes
                  only.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">Use test wallets only</p>
                <p>
                  Never use wallets with real funds for development testing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {onConnect && (
          <>
            <Separator />
            <Button onClick={onConnect} className="w-full">
              <Wallet className="h-4 w-4 mr-2" />
              Connect Wallet Now
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </>
        )}

        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            Need help? Check out our{" "}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() =>
                window.open("https://docs.neonflash.com", "_blank")
              }
            >
              documentation
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
