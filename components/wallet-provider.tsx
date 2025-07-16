"use client";

import React, { useEffect } from "react";
import { useWallet } from "@/hooks/use-wallet";

interface WalletProviderProps {
  children: React.ReactNode;
}

export default function WalletProvider({ children }: WalletProviderProps) {
  const { autoConnect } = useWallet();

  // Auto-connect on mount
  useEffect(() => {
    autoConnect();
  }, [autoConnect]);

  // This component doesn't render anything, it just handles wallet auto-connection
  return <>{children}</>;
}
