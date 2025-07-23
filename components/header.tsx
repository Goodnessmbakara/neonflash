"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  Home,
  CreditCard,
  History,
  BarChart3,
  Settings,
  Menu,
  X,
} from "lucide-react";
import WalletAutoConnect from "@/components/wallet-auto-connect";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigation = [
    { name: "Home", href: "/", icon: Home },
    { name: "Flash Loan", href: "/flash-loan", icon: CreditCard },
    { name: "History", href: "/history", icon: History },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <header className="w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40">
      <div className="container flex h-16 items-center justify-between gap-4 mx-auto px-4">
          {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <img
            src="/neonflash-logo.svg"
            alt="NeonFlash Logo"
            width={40}
            height={40}
            className="drop-shadow-neon"
            style={{ filter: "drop-shadow(0 0 8px #19FB9B)" }}
          />
          <span className="text-xl font-bold tracking-tight">NeonFlash</span>
          <Badge variant="secondary" className="ml-2">
            <Zap className="w-3 h-3 mr-1" />
            Beta
          </Badge>
          </Link>

          {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-1">
            {navigation.map((item) => {
            const isActive = pathname === item.href;
              return (
              <Button
                  key={item.name}
                variant={isActive ? "default" : "ghost"}
                size="sm"
                asChild
              >
                <Link href={item.href} className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </Button>
            );
            })}
          </nav>

        {/* Desktop Wallet Connect */}
        <div className="hidden md:flex items-center gap-4">
          <WalletAutoConnect />
              </div>

        {/* Mobile Menu Button */}
              <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
            </Button>
        </div>

      {/* Mobile Menu */}
        {isMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="container py-4 space-y-2">
              {navigation.map((item) => {
              const isActive = pathname === item.href;
                return (
                <Button
                    key={item.name}
                  variant={isActive ? "default" : "ghost"}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href} className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                </Button>
              );
              })}
            <div className="pt-2">
              <WalletAutoConnect />
            </div>
          </div>
          </div>
        )}
    </header>
  );
}
