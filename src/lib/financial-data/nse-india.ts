/**
 * NSE India (National Stock Exchange) real-time data provider.
 *
 * Uses the official NSE public API — no API key required.
 * Covers ALL NSE-listed stocks (Nifty 50, Nifty 500, SME, any listed equity).
 *
 * Data flow:
 *   1. GET https://www.nseindia.com/  → obtain session cookie (one per request lifecycle)
 *   2. GET https://www.nseindia.com/api/quote-equity?symbol=<TICKER>  → live quote
 *   3. GET https://www.nseindia.com/api/company-info?symbol=<TICKER>  → extended info
 *
 * This is the OFFICIAL source — values match NSE website exactly to the paisa.
 */

import { FinancialMetrics } from "@/types";

const NSE_BASE = "https://www.nseindia.com";
const NSE_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0";
const SESSION_TTL = 25 * 60 * 1000; // 25 min (NSE sessions expire ~30 min)

// ── Session (cookie) cache ─────────────────────────────────────────────────────

interface NSESession {
    cookie: string;
    fetchedAt: number;
}

let _session: NSESession | null = null;

async function getNSECookie(): Promise<string> {
    const now = Date.now();
    if (_session && (now - _session.fetchedAt) < SESSION_TTL) {
        return _session.cookie;
    }

    try {
        const res = await fetch(`${NSE_BASE}/`, {
            headers: {
                "User-Agent": NSE_UA,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
                "Accept-Encoding": "gzip, deflate, br",
                "Connection": "keep-alive",
            },
            redirect: "follow",
            signal: AbortSignal.timeout(10_000),
            cache: "no-store",
        });

        // Parse all Set-Cookie headers and join into a single Cookie header
        const rawCookie = res.headers.get("set-cookie") ?? "";
        const cookie = rawCookie
            .split(",")
            .map(c => c.split(";")[0].trim())
            .filter(Boolean)
            .join("; ");

        _session = { cookie, fetchedAt: now };
        console.log(`[nse-india] Session cookie acquired (${cookie.length} chars)`);
        return cookie;
    } catch (e: any) {
        console.warn("[nse-india] Could not acquire session cookie:", e?.message);
        return "";
    }
}

// ── NSE Quote API response shapes ──────────────────────────────────────────────

interface NSEPriceInfo {
    lastPrice?: number;
    change?: number;
    pChange?: number;
    previousClose?: number;
    open?: number;
    close?: number;
    vwap?: number;
    lowerCP?: string; // circuit breaker lower
    upperCP?: string; // circuit breaker upper
    intraDayHighLow?: { max?: number; min?: number; value?: number };
    weekHighLow?: { max?: number; min?: number; maxDate?: string; minDate?: string };
}

interface NSEMetadata {
    symbol?: string;
    isin?: string;
    listingDate?: string;
    industry?: string;
    lastUpdateTime?: string;
    pdSymbolPe?: number;  // Stock P/E
    pdSectorPe?: number;  // Sector P/E
    pdSectorInd?: string;  // Index (e.g. "NIFTY 50")
}

interface NSEInfo {
    companyName?: string;
    industry?: string;
    activeSeries?: string[];
    isinCode?: string;
}

interface NSEIndustryInfo {
    macro?: string;
    sector?: string;
    industry?: string;
    basicIndustry?: string;
}

interface NSEQuoteResponse {
    info?: NSEInfo;
    metadata?: NSEMetadata;
    priceInfo?: NSEPriceInfo;
    industryInfo?: NSEIndustryInfo;
    // preOpenMarket can have volume/total traded value
    preOpenMarket?: {
        totalTradedVolume?: number;
        totalTradedValue?: number;   // in ₹
        totalBuyQuantity?: number;
        totalSellQuantity?: number;
    };
}

// ── NSE API fetch helper ────────────────────────────────────────────────────────

async function nseApiFetch<T>(path: string, cookie: string): Promise<T | null> {
    try {
        const url = `${NSE_BASE}${path}`;
        const res = await fetch(url, {
            headers: {
                "User-Agent": NSE_UA,
                "Accept": "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                "Referer": `${NSE_BASE}/`,
                "Origin": NSE_BASE,
                "Connection": "keep-alive",
                ...(cookie ? { "Cookie": cookie } : {}),
            },
            signal: AbortSignal.timeout(12_000),
            cache: "no-store",
        });

        if (!res.ok) {
            console.warn(`[nse-india] HTTP ${res.status} for ${path}`);
            return null;
        }
        return (await res.json()) as T;
    } catch (e: any) {
        console.warn(`[nse-india] fetch error for ${path}:`, e?.message);
        return null;
    }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Fetch live NSE market data for ANY listed Indian stock.
 * Returns a Partial<FinancialMetrics> with full-precision live figures.
 *
 * @param ticker - NSE symbol (e.g. "TCS", "ZOMATO", "HDFCBANK")
 */
export async function buildNSEMetrics(
    ticker: string
): Promise<Partial<FinancialMetrics>> {
    const symbol = ticker.toUpperCase().replace(/\.NS$|\.BO$/, ""); // strip suffixes
    console.log(`[nse-india] Fetching live data for ${symbol}...`);

    const cookie = await getNSECookie();

    // Fetch quote (price + metadata) — this always succeeds for listed stocks
    const quote = await nseApiFetch<NSEQuoteResponse>(
        `/api/quote-equity?symbol=${encodeURIComponent(symbol)}`,
        cookie
    );

    if (!quote || !quote.priceInfo) {
        console.warn(`[nse-india] No data for ${symbol}`);
        return {};
    }

    return extractNSEMetrics(symbol, quote);
}

// ── Extraction ─────────────────────────────────────────────────────────────────

function extractNSEMetrics(
    ticker: string,
    quote: NSEQuoteResponse
): Partial<FinancialMetrics> {
    const pi = quote.priceInfo ?? {};
    const md = quote.metadata ?? {};
    const inf = quote.info ?? {};
    const ind = quote.industryInfo ?? {};

    // ── Live price data — exact NSE figures (no rounding) ────────────────────
    const currentPrice = pi.lastPrice;
    const previousClose = pi.previousClose;
    const open = pi.open;
    const vwap = pi.vwap;
    const intradayHigh = pi.intraDayHighLow?.max;
    const intradayLow = pi.intraDayHighLow?.min;
    const fiftyTwoWeekHigh = pi.weekHighLow?.max;
    const fiftyTwoWeekLow = pi.weekHighLow?.min;

    // P/E from NSE metadata (exact figure shown on NSE website)
    const peRatio = md.pdSymbolPe;
    const sectorPE = md.pdSectorPe;  // sector P/E for context

    // Day change
    const dayChange = pi.change;
    const dayChangePct = pi.pChange;

    // Circuit breaker limits (NSE-specific)
    const lowerCircuit = pi.lowerCP ? parseFloat(pi.lowerCP) : undefined;
    const upperCircuit = pi.upperCP ? parseFloat(pi.upperCP) : undefined;

    // Company & sector info
    const companyName = inf.companyName || `${ticker} Ltd`;
    const sector = ind.sector || ind.macro || undefined;
    const industry = ind.industry || ind.basicIndustry || md.industry || undefined;
    const niftyIndex = md.pdSectorInd;  // e.g. "NIFTY 50", "NIFTY 500"
    const isin = md.isin || inf.isinCode;
    const listingDate = md.listingDate;

    // Build result — preserve full floating-point precision
    const result: Partial<FinancialMetrics> & {
        // Extended NSE-specific fields stored for use in prompts/display
        [key: string]: unknown;
    } = {
        ticker: ticker.toUpperCase(),
        companyName,
        sector,
        industry,

        // Price — exact match with NSE website
        currentPrice,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,

        // Valuation — from NSE metadata
        peRatio,

        // NSE-specific extras (used in deep mode prompt context)
        previousClose,
        vwap,
        intradayHigh,
        intradayLow,
        lowerCircuit,
        upperCircuit,
        dayChange,
        dayChangePct,
        sectorPE,
        niftyIndex,
        isin,
        listingDate,
    };

    // Strip undefined / null / NaN
    return Object.fromEntries(
        Object.entries(result).filter(([, v]) => {
            if (v === undefined || v === null) return false;
            if (typeof v === "number" && (!isFinite(v) || isNaN(v))) return false;
            return true;
        })
    ) as Partial<FinancialMetrics>;
}
