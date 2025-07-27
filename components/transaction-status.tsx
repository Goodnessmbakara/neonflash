"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import { TransactionStatus } from "@/lib/flash-loan";
import { useToast } from "@/hooks/use-toast";

interface TransactionStatusProps {
  step: string;
  status: TransactionStatus;
  chain: "neon" | "solana";
}

export function TransactionStatusItem({
  step,
  status,
  chain,
}: TransactionStatusProps) {
  const { toast } = useToast();

  const getStatusIcon = () => {
    switch (status.status) {
      case "pending":
        return <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "success":
        return "bg-green-100 text-green-800 border-green-200";
      case "failed":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const copyHash = async () => {
    if (status.hash) {
      try {
        await navigator.clipboard.writeText(status.hash);
        toast({
          title: "Transaction hash copied!",
          description: "Hash copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Failed to copy hash",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const openExplorer = () => {
    if (status.hash) {
      const url =
        chain === "neon"
          ? `https://neonscan.org/tx/${status.hash}`
          : `https://solscan.io/tx/${status.hash}`;
      window.open(url, "_blank");
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        {getStatusIcon()}
        <div>
          <p className="font-medium capitalize">{step}</p>
          <p className="text-sm text-muted-foreground">
            {status.status === "pending" && "Processing..."}
            {status.status === "success" && "Completed successfully"}
            {status.status === "failed" && status.error}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className={getStatusColor()}>
          {status.status}
        </Badge>

        {status.hash && (
          <div className="flex items-center gap-2">
            <div className="text-xs font-mono text-muted-foreground max-w-24 truncate">
              {status.hash.slice(0, 8)}...
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={copyHash}
                className="h-6 w-6 p-0"
                title="Copy transaction hash"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={openExplorer}
                className="h-6 w-6 p-0"
                title="View on explorer"
              >
                <ExternalLink className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FlashLoanTransactionStatusProps {
  steps: {
    borrow: TransactionStatus;
    arbitrage: TransactionStatus;
    repay: TransactionStatus;
  };
  mainTransactionHash?: string;
  profit?: string;
  isExecuting: boolean;
}

export function FlashLoanTransactionStatus({
  steps,
  mainTransactionHash,
  profit,
  isExecuting,
}: FlashLoanTransactionStatusProps) {
  const { toast } = useToast();

  const copyMainHash = async () => {
    if (mainTransactionHash) {
      try {
        await navigator.clipboard.writeText(mainTransactionHash);
        toast({
          title: "Transaction hash copied!",
          description: "Main transaction hash copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Failed to copy hash",
          description: "Please try again",
          variant: "destructive",
        });
      }
    }
  };

  const allStepsCompleted = Object.values(steps).every(
    (step) => step.status === "success"
  );
  const anyStepFailed = Object.values(steps).some(
    (step) => step.status === "failed"
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Transaction Status
          {isExecuting && <Loader2 className="h-4 w-4 animate-spin" />}
          {allStepsCompleted && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
          {anyStepFailed && <XCircle className="h-4 w-4 text-red-500" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <TransactionStatusItem
            step="Borrow"
            status={steps.borrow}
            chain="neon"
          />
          <TransactionStatusItem
            step="Arbitrage"
            status={steps.arbitrage}
            chain="solana"
          />
          <TransactionStatusItem
            step="Repay"
            status={steps.repay}
            chain="neon"
          />
        </div>

        {/* Transaction Hash - Always visible when available */}
        {mainTransactionHash && (
          <div className="pt-3">
            <div
              className={`rounded-lg p-3 ${
                anyStepFailed
                  ? "bg-red-50 border border-red-200"
                  : "bg-green-50 border border-green-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p
                    className={`font-medium text-sm ${
                      anyStepFailed ? "text-red-900" : "text-green-900"
                    }`}
                  >
                    Transaction Hash
                  </p>
                  <p
                    className={`text-xs font-mono break-all mt-1 ${
                      anyStepFailed ? "text-red-700" : "text-green-700"
                    }`}
                  >
                    {mainTransactionHash}
                  </p>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyMainHash}
                    className={`h-7 w-7 p-0 ${
                      anyStepFailed
                        ? "text-red-600 hover:bg-red-100"
                        : "text-green-600 hover:bg-green-100"
                    }`}
                    title="Copy transaction hash"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      window.open(
                        `https://neonscan.org/tx/${mainTransactionHash}`,
                        "_blank"
                      )
                    }
                    className={`h-7 w-7 p-0 ${
                      anyStepFailed
                        ? "text-red-600 hover:bg-red-100"
                        : "text-green-600 hover:bg-green-100"
                    }`}
                    title="View on Neonscan"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {profit && (
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <span className="font-medium">Profit Generated</span>
              <Badge variant="secondary" className="text-green-600">
                +{profit} USDC
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
