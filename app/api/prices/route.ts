import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // CoinGecko for EVM/Neon prices
    const ethRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether,ethereum&vs_currencies=usd`,
      { next: { revalidate: 30 } }
    );
    if (!ethRes.ok) throw new Error(`Coingecko error: ${ethRes.status}`);
    const ethPrices = await ethRes.json();

    // Birdeye for Solana prices (Devnet mints)
    const solanaMints = [
      { symbol: "USDC", mint: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU" },
      { symbol: "USDT", mint: "Es9vMFrzaCERbZ6t2kF9Q5qk1Z4qV6Qk5A5k5Qk5Qk5Q" },
      // Add the correct mint for ETH (WETH) on Solana Devnet if needed
    ];
    const mintList = solanaMints.map(t => t.mint).join(",");
    const birdRes = await fetch(
      `https://public-api.birdeye.so/public/price?list=${mintList}`
    );
    if (!birdRes.ok) throw new Error(`Birdeye error: ${birdRes.status}`);
    const birdData = await birdRes.json();

    const result = solanaMints.map((t) => ({
      token: t.symbol,
      neonPrice: ethPrices[t.symbol.toLowerCase() === "usdc" ? "usd-coin" : t.symbol.toLowerCase()]?.usd ?? null,
      solanaPrice: birdData.data[t.mint]?.value ?? null,
    }));

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 