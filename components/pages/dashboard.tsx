"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, DollarSign, Activity } from "lucide-react";
import Link from "next/link";
import { AirdropButton } from "@/components/ui/airdrop-button";
import WalletStatus from "@/components/wallet-status";
import WalletGuide from "@/components/wallet-guide";
import { useWallet } from "@/hooks/use-wallet";

export default function Dashboard() {
  const { isConnected } = useWallet();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">NeonFlash Dashboard</h1>
        <Button asChild>
          <Link href="/flash-loan">
            Start Flash Loan
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Successful Loans
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">+0% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Opportunities
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No active opportunities
            </p>
          </CardContent>
        </Card>
      </div>

      {isConnected ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <AirdropButton className="w-full justify-start" />
              <Button asChild className="w-full justify-start">
                <Link href="/flash-loan">Execute Flash Loan</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link href="/analytics">View Analytics</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="w-full justify-start"
              >
                <Link href="/history">Transaction History</Link>
              </Button>
            </CardContent>
          </Card>

          <WalletStatus />

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No recent activity</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <WalletGuide />
          <WalletStatus />
        </div>
      )}
    </div>
  );
}
