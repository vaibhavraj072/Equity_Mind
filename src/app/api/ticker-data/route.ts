import { NextResponse } from "next/server";

// Indian + Global indices via Yahoo Finance (server-side, no API key needed)
const INDICES = [
    // Indian Indices
    { symbol: "^NSEI", name: "NIFTY 50", region: "IN" },
    { symbol: "^BSESN", name: "SENSEX", region: "IN" },
    { symbol: "^NSEBANK", name: "BANK NIFTY", region: "IN" },
    { symbol: "^CNXIT", name: "NIFTY IT", region: "IN" },
    { symbol: "^CNXAUTO", name: "NIFTY AUTO", region: "IN" },
    { symbol: "^CNXPHARMA", name: "NIFTY PHARMA", region: "IN" },
    { symbol: "^CNXFMCG", name: "NIFTY FMCG", region: "IN" },
    { symbol: "^CNXMIDCAP", name: "NIFTY MIDCAP 100", region: "IN" },
    { symbol: "^CNXSMALLCAP", name: "NIFTY SMALLCAP", region: "IN" },
    { symbol: "^NSMIDCP100", name: "MIDCAP SELECT", region: "IN" },
    // Indian Blue Chips on NSE
    { symbol: "RELIANCE.NS", name: "RELIANCE", region: "IN" },
    { symbol: "TCS.NS", name: "TCS", region: "IN" },
    { symbol: "HDFCBANK.NS", name: "HDFC BANK", region: "IN" },
    { symbol: "INFY.NS", name: "INFOSYS", region: "IN" },
    { symbol: "ICICIBANK.NS", name: "ICICI BANK", region: "IN" },
    { symbol: "WIPRO.NS", name: "WIPRO", region: "IN" },
    { symbol: "SBIN.NS", name: "SBI", region: "IN" },
    { symbol: "BAJFINANCE.NS", name: "BAJAJ FIN", region: "IN" },
    // Currencies (INR)
    { symbol: "USDINR=X", name: "USD/INR", region: "FX" },
    { symbol: "GBPINR=X", name: "GBP/INR", region: "FX" },
];

const YAHOO_URL = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${INDICES.map(i => encodeURIComponent(i.symbol)).join(",")
    }&lang=en-US&region=IN&corsDomain=finance.yahoo.com`;

export interface TickerItem {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    up: boolean;
    region: string;
}

// Fallback static data when market is closed or fetch fails
const FALLBACK: TickerItem[] = [
    { symbol: "NIFTY 50", name: "NIFTY 50", price: "22,147.00", change: "+112.35", changePercent: "+0.51%", up: true, region: "IN" },
    { symbol: "SENSEX", name: "SENSEX", price: "73,018.00", change: "+381.60", changePercent: "+0.52%", up: true, region: "IN" },
    { symbol: "BANK NIFTY", name: "BANK NIFTY", price: "47,340.00", change: "-234.20", changePercent: "-0.49%", up: false, region: "IN" },
    { symbol: "NIFTY IT", name: "NIFTY IT", price: "37,825.00", change: "+523.10", changePercent: "+1.40%", up: true, region: "IN" },
    { symbol: "NIFTY AUTO", name: "NIFTY AUTO", price: "21,450.00", change: "+98.40", changePercent: "+0.46%", up: true, region: "IN" },
    { symbol: "RELIANCE", name: "RELIANCE", price: "₹2,879.45", change: "+34.20", changePercent: "+1.20%", up: true, region: "IN" },
    { symbol: "TCS", name: "TCS", price: "₹4,012.30", change: "-18.70", changePercent: "-0.46%", up: false, region: "IN" },
    { symbol: "HDFC BANK", name: "HDFC BANK", price: "₹1,653.20", change: "+12.50", changePercent: "+0.76%", up: true, region: "IN" },
    { symbol: "INFOSYS", name: "INFOSYS", price: "₹1,876.55", change: "+29.80", changePercent: "+1.61%", up: true, region: "IN" },
    { symbol: "USD/INR", name: "USD/INR", price: "₹83.42", change: "+0.12", changePercent: "+0.14%", up: true, region: "FX" },
];

function fmt(n: number, decimals = 2): string {
    if (n >= 1000) return n.toLocaleString("en-IN", { maximumFractionDigits: decimals });
    return n.toFixed(decimals);
}

export async function GET() {
    try {
        const res = await fetch(YAHOO_URL, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            next: { revalidate: 30 }, // cache 30 seconds
        });

        if (!res.ok) throw new Error(`Yahoo Finance responded ${res.status}`);

        const data = await res.json();
        const quotes = data?.quoteResponse?.result ?? [];

        if (!quotes.length) throw new Error("Empty response");

        const items: TickerItem[] = quotes.map((q: any) => {
            const meta = INDICES.find(i => i.symbol === q.symbol);
            const price = q.regularMarketPrice ?? 0;
            const change = q.regularMarketChange ?? 0;
            const changePct = q.regularMarketChangePercent ?? 0;
            const isInr = ["IN", "FX"].includes(meta?.region ?? "");
            const priceStr = isInr && meta?.region === "IN" ? `₹${fmt(price)}` : fmt(price);
            const changeStr = `${change >= 0 ? "+" : ""}${fmt(Math.abs(change))}`;
            const changePctStr = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;

            return {
                symbol: q.symbol,
                name: meta?.name ?? q.shortName ?? q.symbol,
                price: priceStr,
                change: changeStr,
                changePercent: changePctStr,
                up: change >= 0,
                region: meta?.region ?? "GL",
            };
        });

        return NextResponse.json({ tickers: items, source: "live", ts: Date.now() });
    } catch (err) {
        console.error("[ticker-data] fallback:", err);
        return NextResponse.json({ tickers: FALLBACK, source: "fallback", ts: Date.now() });
    }
}
