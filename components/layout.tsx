import React from "react";
import Header from "./header";
import Footer from "./footer";
import WalletProvider from "./wallet-provider";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <WalletProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </WalletProvider>
  );
}
