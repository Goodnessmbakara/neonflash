import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    // Coingecko ids
    const tokens = [
      { id: "usd-coin", symbol: "USDC" },
      { id: "tether", symbol: "USDT" },
      { id: "ethereum", symbol: "ETH" },
    ];
    // Fetch prices for Ethereum (proxy for Neon EVM)
    const ethRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=usd-coin,tether,ethereum&vs_currencies=usd`,
      { next: { revalidate: 30 } }
    );
    if (!ethRes.ok) throw new Error(`Coingecko error: ${ethRes.status}`);
    const ethPrices = await ethRes.json();
    // Fetch prices for Solana
    const solRes = await fetch(
      `https://price.jup.ag/v4/price?ids=USDC,USDT,ETH`,
      { next: { revalidate: 30 } }
    );
    if (!solRes.ok) throw new Error(`Jupiter error: ${solRes.status}`);
    const solData = await solRes.json();
    const solPrices = solData.data;
    // Merge results
    const result = tokens.map((t) => ({
      token: t.symbol,
      neonPrice: ethPrices[t.id]?.usd ?? null,
      solanaPrice: solPrices[t.symbol]?.price ?? null,
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