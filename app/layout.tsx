import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "NeonFlash - Cross-Chain Flash Loan Platform",
  description:
    "Execute cross-chain flash loans between Ethereum and Solana for arbitrage opportunities. Built by Goodness Mbakara for the Neon EVM bootcamp.",
  keywords:
    "DeFi, Flash Loans, Cross-Chain, Ethereum, Solana, Arbitrage, Neon EVM",
  authors: [{ name: "Goodness Mbakara" }],
  creator: "Goodness Mbakara",
  openGraph: {
    title: "NeonFlash - Cross-Chain Flash Loan Platform",
    description:
      "Execute cross-chain flash loans between Ethereum and Solana for arbitrage opportunities.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeonFlash - Cross-Chain Flash Loan Platform",
    description:
      "Execute cross-chain flash loans between Ethereum and Solana for arbitrage opportunities.",
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon.png",
        type: "image/png",
        sizes: "32x32",
      },
    ],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
