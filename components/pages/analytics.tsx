import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchUserFlashLoans } from "@/lib/services/analytics-service";
import { useWallet } from "@/hooks/use-wallet";
import { getAggregatedMetrics, subscribeToMetrics } from "@/lib/services/metric-service";

// Explicitly type the loan object
interface Loan {
  txHash: string;
  profit: string;
  status: string;
  timestamp: string;
}

export default function Analytics() {
  const { solanaAddress } = useWallet();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [localMetrics, setLocalMetrics] = useState(getAggregatedMetrics());

  useEffect(() => {
    if (solanaAddress) {
      setLoading(true);
      fetchUserFlashLoans(solanaAddress)
        .then((data) => setLoans(data))
        .finally(() => setLoading(false));
    }
  }, [solanaAddress]);

  useEffect(() => {
    setLocalMetrics(getAggregatedMetrics());
    const unsubscribe = subscribeToMetrics(() => {
      setLocalMetrics(getAggregatedMetrics());
    });
    return unsubscribe;
  }, []);

  const totalProfit = loans.reduce((sum, l) => sum + (parseFloat(l.profit) || 0), 0);
  const successCount = loans.filter(l => l.status === "success").length;
  const failCount = loans.filter(l => l.status === "failed").length;
  const totalCount = loans.length;
  const successRate = totalCount ? ((successCount / totalCount) * 100).toFixed(1) : "0";

  return (
    <div className="max-w-4xl mx-auto px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your flash loan performance and arbitrage opportunities.
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">
                  {totalCount} on-chain loans
                </p>
                <div className="text-xs text-muted-foreground">
                  {localMetrics.successfulLoans} successful / {localMetrics.failedLoans} failed 
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{successRate}%</div>
                <p className="text-xs text-muted-foreground">
                  {successCount} successful / {totalCount} total
                </p>
                <div className="text-xs text-muted-foreground">
                  Local: {localMetrics.successfulLoans} successful / {localMetrics.failedLoans} failed
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${localMetrics.totalProfit.toFixed(2)} </div>
                <p className="text-xs text-muted-foreground">
                  Local metrics profit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Strategies
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  USDC-SAMO, USDC-SOL, USDC-JUP
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Local Metrics Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Local Activity</CardTitle>
              <CardDescription>Recent flash loan attempts (local, including failed)</CardDescription>
            </CardHeader>
            <CardContent>
              {localMetrics.recent.length === 0 ? (
                <p className="text-muted-foreground">No recent local activity</p>
              ) : (
                <ul className="space-y-2">
                  {localMetrics.recent.map((m) => (
                    <li key={m.txHash + m.timestamp} className="flex items-center gap-2">
                      <span className={
                        m.status === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Profit: {typeof m.profit === "number" ? m.profit.toFixed(2) : m.profit}
                      </span>
                      <span className="text-xs ml-2">
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs ml-2 font-mono truncate" title={m.txHash}>
                        {m.txHash.slice(0, 8)}...{m.txHash.slice(-4)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-4">
        <Card>
          <CardHeader>
              <CardTitle>Strategy Performance</CardTitle>
              <CardDescription>
                Performance metrics for each arbitrage strategy
              </CardDescription>
          </CardHeader>
          <CardContent>
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
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance History</CardTitle>
              <CardDescription>
                Historical performance data and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="font-semibold mb-2">Recent Local Activity</h3>
              {localMetrics.recent.length === 0 ? (
                <p className="text-muted-foreground">No recent local activity</p>
              ) : (
                <ul className="space-y-2">
                  {localMetrics.recent.map((m) => (
                    <li key={m.txHash + m.timestamp} className="flex items-center gap-2">
                      <span className={
                        m.status === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }>
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        Profit: {typeof m.profit === "number" ? m.profit.toFixed(2) : m.profit}
                      </span>
                      <span className="text-xs ml-2">
                        {new Date(m.timestamp).toLocaleString()}
                      </span>
                      <span className="text-xs ml-2 font-mono truncate" title={m.txHash}>
                        {m.txHash.slice(0, 8)}...{m.txHash.slice(-4)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
