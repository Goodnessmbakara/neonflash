"use client";

import { useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";

export function WalletAutoConnect() {
  const { autoConnect } = useWallet();

  useEffect(() => {
    // Auto-connect on mount
    autoConnect();
  }, [autoConnect]);

  // This component doesn't render anything
  return null;
}
