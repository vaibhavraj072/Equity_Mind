import { NextResponse } from "next/server";

/**
 * Live NSE India + Index ticker data API.
 *
 * Sources:
 *  - NSE India API → all NSE-listed equity stocks (exact live price)
 *  - Yahoo Finance v8/chart → Nifty 50, Sensex, Bank Nifty, global indices
 *  - Fallback static data when market is closed (weekends/holidays)
 */

// ── Configuation ───────────────────────────────────────────────────────────────

// Nifty 50 blue-chips: these will pull from NSE India API
const NSE_STOCKS = [
    { symbol: "RELIANCE", name: "RELIANCE" },
    { symbol: "TCS", name: "TCS" },
    { symbol: "HDFCBANK", name: "HDFC BANK" },
    { symbol: "INFY", name: "INFOSYS" },
    { symbol: "ICICIBANK", name: "ICICI BANK" },
    { symbol: "SBIN", name: "SBI" },
    { symbol: "WIPRO", name: "WIPRO" },
    { symbol: "BAJFINANCE", name: "BAJAJ FIN" },
    { symbol: "HINDUNILVR", name: "HUL" },
    { symbol: "TATAMOTORS", name: "TATA MOTORS" },
    { symbol: "SUNPHARMA", name: "SUN PHARMA" },
    { symbol: "MARUTI", name: "MARUTI" },
    { symbol: "LTIM", name: "LTIMindtree" },
    { symbol: "ONGC", name: "ONGC" },
    { symbol: "ADANIPORTS", name: "ADANI PORTS" },
    { symbol: "ZOMATO", name: "ZOMATO" },
    { symbol: "NESTLEIND", name: "NESTLÉ" },
    { symbol: "TECHM", name: "TECH M" },
];

// Indices: fetched via Yahoo Finance v8/chart (more reliable for indices)
const YF_INDICES = [
    { symbol: "^NSEI", name: "NIFTY 50" },
    { symbol: "^BSESN", name: "SENSEX" },
    { symbol: "^NSEBANK", name: "BANK NIFTY" },
    { symbol: "^CNXIT", name: "NIFTY IT" },
    { symbol: "USDINR=X", name: "USD/INR", isFx: true },
];

export const maxDuration = 30;

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TickerItem {
    symbol: string;
    name: string;
    price: string;
    change: string;
    changePercent: string;
    up: boolean;
    type: "stock" | "index" | "fx";
    rawPrice: number;
    rawChange: number;
}

// ── Formatting ─────────────────────────────────────────────────────────────────

function fmtINR(n: number): string {
    return n.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function fmtChange(n: number): string {
    const sign = n >= 0 ? "+" : "-";
    return `${sign}${Math.abs(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── NSE India session management ───────────────────────────────────────────────

const NSE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0";
let _nseCookie = "";
let _cookieFetchedAt = 0;

async function getNSECookie(): Promise<string> {
    const now = Date.now();
    if (_nseCookie && now - _cookieFetchedAt < 25 * 60 * 1000) return _nseCookie;
    try {
        const res = await fetch("https://www.nseindia.com/", {
            headers: { "User-Agent": NSE_UA, "Accept": "text/html", "Accept-Language": "en-US,en;q=0.9" },
            signal: AbortSignal.timeout(8_000),
            redirect: "follow",
        });
        const raw = res.headers.get("set-cookie") ?? "";
        _nseCookie = raw.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
        _cookieFetchedAt = now;
    } catch { /* use stale cookie */ }
    return _nseCookie;
}

async function fetchNSEQuote(symbol: string, cookie: string): Promise<TickerItem | null> {
    try {
        const res = await fetch(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(symbol)}`, {
            headers: {
                "User-Agent": NSE_UA,
                "Accept": "application/json",
                "Referer": "https://www.nseindia.com/",
                "Origin": "https://www.nseindia.com",
                ...(cookie ? { "Cookie": cookie } : {}),
            },
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
        });
        if (!res.ok) return null;
        const d = await res.json();
        const pi = d?.priceInfo;
        if (!pi?.lastPrice) return null;

        const price = pi.lastPrice as number;
        const change = pi.change as number ?? 0;
        const pct = pi.pChange as number ?? 0;
        const name = NSE_STOCKS.find(s => s.symbol === symbol)?.name ?? symbol;

        return {
            symbol,
            name,
            price: `₹${fmtINR(price)}`,
            change: fmtChange(change),
            changePercent: `${change >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
            up: change >= 0,
            type: "stock",
            rawPrice: price,
            rawChange: change,
        };
    } catch {
        return null;
    }
}

async function fetchYFIndex(symbol: string, name: string, isFx = false): Promise<TickerItem | null> {
    try {
        for (const host of ["https://query1.finance.yahoo.com", "https://query2.finance.yahoo.com"]) {
            try {
                const res = await fetch(
                    `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
                    { headers: { "User-Agent": "Mozilla/5.0" }, signal: AbortSignal.timeout(7_000), cache: "no-store" }
                );
                if (!res.ok) continue;
                const d = await res.json();
                const meta = d?.chart?.result?.[0]?.meta;
                if (!meta?.regularMarketPrice) continue;

                const price = meta.regularMarketPrice as number;
                const prev = meta.chartPreviousClose ?? meta.previousClose ?? price;
                const change = price - prev;
                const pct = prev > 0 ? (change / prev) * 100 : 0;
                const prefix = isFx ? "₹" : "";

                return {
                    symbol,
                    name,
                    price: `${prefix}${fmtINR(price)}`,
                    change: fmtChange(change),
                    changePercent: `${change >= 0 ? "+" : ""}${pct.toFixed(2)}%`,
                    up: change >= 0,
                    type: isFx ? "fx" : "index",
                    rawPrice: price,
                    rawChange: change,
                };
            } catch { continue; }
        }
        return null;
    } catch { return null; }
}

// ── Fallback data (when market is closed / API unreachable) ────────────────────

const FALLBACK: TickerItem[] = [
    { symbol: "^NSEI", name: "NIFTY 50", price: "22,530.70", change: "+112.35", changePercent: "+0.50%", up: true, type: "index", rawPrice: 22530.70, rawChange: 112.35 },
    { symbol: "^BSESN", name: "SENSEX", price: "74,119.00", change: "+381.60", changePercent: "+0.52%", up: true, type: "index", rawPrice: 74119.00, rawChange: 381.60 },
    { symbol: "^NSEBANK", name: "BANK NIFTY", price: "47,892.50", change: "-134.20", changePercent: "-0.28%", up: false, type: "index", rawPrice: 47892.50, rawChange: -134.20 },
    { symbol: "RELIANCE", name: "RELIANCE", price: "₹1,358.00", change: "+18.40", changePercent: "+1.37%", up: true, type: "stock", rawPrice: 1358, rawChange: 18.40 },
    { symbol: "TCS", name: "TCS", price: "₹2,611.70", change: "-25.70", changePercent: "-0.97%", up: false, type: "stock", rawPrice: 2611.70, rawChange: -25.70 },
    { symbol: "HDFCBANK", name: "HDFC BANK", price: "₹1,742.30", change: "+12.50", changePercent: "+0.72%", up: true, type: "stock", rawPrice: 1742.30, rawChange: 12.50 },
    { symbol: "INFY", name: "INFOSYS", price: "₹1,289.40", change: "+8.20", changePercent: "+0.64%", up: true, type: "stock", rawPrice: 1289.40, rawChange: 8.20 },
    { symbol: "ICICIBANK", name: "ICICI BANK", price: "₹1,307.50", change: "+5.70", changePercent: "+0.44%", up: true, type: "stock", rawPrice: 1307.50, rawChange: 5.70 },
    { symbol: "SBIN", name: "SBI", price: "₹780.25", change: "-2.30", changePercent: "-0.29%", up: false, type: "stock", rawPrice: 780.25, rawChange: -2.30 },
    { symbol: "USDINR=X", name: "USD/INR", price: "₹87.12", change: "+0.08", changePercent: "+0.09%", up: true, type: "fx", rawPrice: 87.12, rawChange: 0.08 },
];

// ── Main handler ───────────────────────────────────────────────────────────────

export async function GET() {
    const cookie = await getNSECookie();

    // Fetch all NSE stocks + indices in parallel
    const [stockResults, indexResults] = await Promise.all([
        // NSE stocks — batch with small concurrency to avoid rate limits
        Promise.all(NSE_STOCKS.map(s => fetchNSEQuote(s.symbol, cookie))),
        // Index data from Yahoo Finance
        Promise.all(YF_INDICES.map(i => fetchYFIndex(i.symbol, i.name, (i as any).isFx ?? false))),
    ]);

    const stocks = stockResults.filter((s): s is TickerItem => s !== null);
    const indices = indexResults.filter((i): i is TickerItem => i !== null);

    // Interleave: start with indices, then stocks
    const items = [...indices, ...stocks];

    if (items.length < 3) {
        // Market probably closed — return fallback with marker
        return NextResponse.json({
            tickers: FALLBACK,
            source: "fallback",
            ts: Date.now(),
        }, {
            headers: { "Cache-Control": "public, max-age=60" },
        });
    }

    return NextResponse.json({
        tickers: items,
        source: "live",
        ts: Date.now(),
    }, {
        headers: {
            // Live data: cache for only 15 seconds at edge
            "Cache-Control": "public, s-maxage=15, stale-while-revalidate=30",
        },
    });
}
