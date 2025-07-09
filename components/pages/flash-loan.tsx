import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Zap, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function FlashLoan() {
  const [amount, setAmount] = useState("");
  const [token, setToken] = useState("usdc");
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();

  const handleExecute = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      // TODO: Implement actual flash loan execution
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate execution

      toast({
        title: "Flash Loan Executed",
        description: `Successfully executed flash loan for ${amount} ${token.toUpperCase()}`,
      });
    } catch (error) {
      toast({
        title: "Execution Failed",
        description: "Failed to execute flash loan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Zap className="h-8 w-8 text-blue-500" />
        <h1 className="text-3xl font-bold">Flash Loan</h1>
        <Badge variant="secondary">Beta</Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Flash Loan Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Token</Label>
              <Select value={token} onValueChange={setToken}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="eth">ETH</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              onClick={handleExecute}
              disabled={isExecuting}
              className="w-full"
            >
              {isExecuting ? "Executing..." : "Execute Flash Loan"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Arbitrage Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <div>
                <p className="font-medium">No Active Opportunities</p>
                <p className="text-sm text-muted-foreground">
                  Monitor for price differences between Neon EVM and Solana
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Supported Networks</h4>
              <div className="flex gap-2">
                <Badge variant="outline">Neon EVM</Badge>
                <Badge variant="outline">Solana</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-medium">Current Status</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Neon EVM Connection:</span>
                  <Badge variant="secondary">Disconnected</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Solana Connection:</span>
                  <Badge variant="secondary">Disconnected</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">1. Borrow</h4>
              <p className="text-muted-foreground">
                Borrow tokens from Aave on Neon EVM without collateral
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">2. Arbitrage</h4>
              <p className="text-muted-foreground">
                Execute trades across Neon EVM and Solana for profit
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">3. Repay</h4>
              <p className="text-muted-foreground">
                Repay the flash loan with interest and keep the profit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
