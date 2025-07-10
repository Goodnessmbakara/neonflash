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

    const tokens = [
      { id: "usd-coin", symbol: "USDC" },
      { id: "tether", symbol: "USDT" },
      { id: "ethereum", symbol: "ETH" },
    ];

    const result = tokens.map((t) => ({
      token: t.symbol,
      neonPrice: ethPrices[t.id]?.usd ?? null,
      solanaPrice: null, // No devnet price API available
    }));

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("API /api/prices error:", e, e?.stack);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
} 