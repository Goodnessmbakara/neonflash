import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Copy,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2,
  Zap,
} from "lucide-react";
import { NeonFlashLogo } from "@/components/ui/logo";

const mockHistory = [
  {
    id: "1",
    status: "success",
    token: "USDC",
    amount: 1000,
    profit: 12.34,
    date: "2024-06-01T14:23:00Z",
    hash: "0xabc123...7890",
    chain: "Neon EVM",
  },
  {
    id: "2",
    status: "failed",
    token: "ETH",
    amount: 2.5,
    profit: -0.01,
    date: "2024-05-29T09:10:00Z",
    hash: "0xdef456...1234",
    chain: "Solana",
  },
  {
    id: "3",
    status: "pending",
    token: "USDT",
    amount: 500,
    profit: 0,
    date: "2024-05-28T18:45:00Z",
    hash: "0xghi789...5678",
    chain: "Neon EVM",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "success":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <CheckCircle className="inline h-4 w-4 mr-1 text-green-500" />
          Success
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <XCircle className="inline h-4 w-4 mr-1 text-red-500" />
          Failed
        </Badge>
      );
    case "pending":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
          <Loader2 className="inline h-4 w-4 mr-1 animate-spin text-yellow-500" />
          Pending
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

export default function History() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const handleCopy = async (hash: string) => {
    await navigator.clipboard.writeText(hash);
    setCopied(hash);
    setTimeout(() => setCopied(null), 1200);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 space-y-6">
      <div className="flex flex-col items-center mb-2">
        <NeonFlashLogo className="h-14 w-14 mb-2" />
      </div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Transaction History
        </h1>
        <p className="text-muted-foreground">
          View your flash loan transaction history and performance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {mockHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Zap className="h-12 w-12 text-blue-400 mb-4 animate-pulse" />
              <p className="text-lg font-medium mb-1">No transactions yet</p>
              <p className="text-muted-foreground text-sm">
                Your flash loan history will appear here after your first
                transaction.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-muted">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Token</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Profit</th>
                    <th className="py-2 pr-4">Chain</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Tx Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted">
                  {mockHistory.map((tx) => (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="py-2 pr-4">{getStatusBadge(tx.status)}</td>
                      <td className="py-2 pr-4 font-semibold">{tx.token}</td>
                      <td className="py-2 pr-4">{tx.amount}</td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            tx.profit > 0
                              ? "text-green-600 font-medium"
                              : tx.profit < 0
                              ? "text-red-600 font-medium"
                              : "text-muted-foreground"
                          }
                        >
                          {tx.profit > 0 ? "+" : ""}
                          {tx.profit} {tx.token}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline">{tx.chain}</Badge>
                      </td>
                      <td className="py-2 pr-4 text-xs">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-2 pr-4 flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {tx.hash.slice(0, 8)}...{tx.hash.slice(-4)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => handleCopy(tx.hash)}
                          title="Copy hash"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() =>
                            window.open(
                              `https://neonscan.org/tx/${tx.hash}`,
                              "_blank"
                            )
                          }
                          title="View on Explorer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        {copied === tx.hash && (
                          <span className="text-green-600 text-xs ml-1">
                            Copied!
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
