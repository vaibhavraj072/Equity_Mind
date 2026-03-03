/**
 * Yahoo Finance data provider for Indian NSE/BSE stocks.
 *
 * STRATEGY (as of 2025):
 *   1. v8/finance/chart  → Real-time price, 52W range  (no auth required — always works)
 *   2. Crumb-based v10/quoteSummary → Fundamentals (P/E, margins, D/E, etc.)
 *      If crumb fails, we still have the live price from step 1.
 *   3. .NS first, .BO fallback for BSE-listed stocks
 *
 * Background: Yahoo Finance's v10 quoteSummary requires a "crumb" token since 2023.
 * v8/finance/chart does NOT need a crumb and always returns live OHLCV + 52W data.
 */

import { FinancialMetrics } from "@/types";

const YF_HOSTS = [
    "https://query1.finance.yahoo.com",
    "https://query2.finance.yahoo.com",
];

const CHART_TIMEOUT_MS = 8_000;   // Fast — only OHLCV data
const SUMMARY_TIMEOUT_MS = 15_000;  // Fundamentals — allow more time
const CRUMB_TIMEOUT_MS = 6_000;

// ── Symbol mapping ─────────────────────────────────────────────────────────────

function toNSSymbol(ticker: string): string {
    const t = ticker.toUpperCase();
    if (t.includes(".NS") || t.includes(".BO") || t.includes(".")) return t;
    return `${t}.NS`;
}

// ── Crumb management ───────────────────────────────────────────────────────────
// Yahoo Finance requires a crumb token for v10 API calls.
// We fetch it once and cache it for the request lifetime.

interface CrumbState {
    crumb: string;
    cookie: string;
    fetchedAt: number;
}

let _crumbCache: CrumbState | null = null;
const CRUMB_TTL_MS = 60 * 60 * 1000; // 1 hour

async function getCrumb(): Promise<{ crumb: string; cookie: string } | null> {
    const now = Date.now();
    if (_crumbCache && (now - _crumbCache.fetchedAt) < CRUMB_TTL_MS) {
        return { crumb: _crumbCache.crumb, cookie: _crumbCache.cookie };
    }

    for (const host of YF_HOSTS) {
        try {
            // Step 1: hit any Yahoo Finance page to get the initial cookie
            const cookieRes = await fetch(`${host}/v1/test/getcrumb`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                    "Accept": "text/plain",
                },
                redirect: "follow",
                signal: AbortSignal.timeout(CRUMB_TIMEOUT_MS),
            });

            const cookie = cookieRes.headers.get("set-cookie") ?? "";
            const crumb = (await cookieRes.text()).trim();

            if (crumb && crumb.length > 0 && !crumb.includes("<")) {
                _crumbCache = { crumb, cookie, fetchedAt: now };
                console.log(`[yahoo-finance] ✓ Crumb acquired from ${host}`);
                return { crumb, cookie };
            }
        } catch {
            // Try next host
        }
    }

    console.warn("[yahoo-finance] Could not acquire crumb — v10 fundamentals unavailable");
    return null;
}

// ── v8/finance/chart — real-time price (no auth needed) ───────────────────────

interface ChartMeta {
    symbol?: string;
    currency?: string;
    exchangeName?: string;
    regularMarketPrice?: number;
    chartPreviousClose?: number;
    previousClose?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    marketCap?: number;
    regularMarketDayHigh?: number;
    regularMarketDayLow?: number;
    regularMarketVolume?: number;
}

async function fetchChartPrice(symbol: string): Promise<ChartMeta | null> {
    for (const host of YF_HOSTS) {
        try {
            const url = `${host}/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d&includePrePost=false`;
            const res = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0 (compatible)" },
                signal: AbortSignal.timeout(CHART_TIMEOUT_MS),
                cache: "no-store",
            });
            if (!res.ok) continue;
            const data = await res.json();
            const meta: ChartMeta | undefined = data?.chart?.result?.[0]?.meta;
            if (meta?.regularMarketPrice) {
                console.log(`[yahoo-finance] v8/chart ✓ ${symbol} price=${meta.regularMarketPrice}`);
                return meta;
            }
        } catch {
            // Try other host
        }
    }
    return null;
}

// ── v10 quoteSummary — fundamentals (needs crumb) ─────────────────────────────

const MODULES = "summaryDetail,defaultKeyStatistics,financialData,assetProfile";

interface YFSummaryResult {
    summaryDetail?: {
        trailingPE?: { raw: number };
        forwardPE?: { raw: number };
        fiftyTwoWeekHigh?: { raw: number };
        fiftyTwoWeekLow?: { raw: number };
        dividendYield?: { raw: number };
        beta?: { raw: number };
        priceToSalesTrailing12Months?: { raw: number };
        marketCap?: { raw: number };
    };
    defaultKeyStatistics?: {
        priceToBook?: { raw: number };
        trailingEps?: { raw: number };
        forwardEps?: { raw: number };
        enterpriseToEbitda?: { raw: number };
        enterpriseToRevenue?: { raw: number };
        earningsQuarterlyGrowth?: { raw: number };
        trailingPE?: { raw: number };
    };
    financialData?: {
        totalRevenue?: { raw: number };
        grossProfits?: { raw: number };
        operatingCashflow?: { raw: number };
        freeCashflow?: { raw: number };
        returnOnEquity?: { raw: number };
        returnOnAssets?: { raw: number };
        currentRatio?: { raw: number };
        debtToEquity?: { raw: number };
        operatingMargins?: { raw: number };
        profitMargins?: { raw: number };
        grossMargins?: { raw: number };
        ebitdaMargins?: { raw: number };
        revenueGrowth?: { raw: number };
        earningsGrowth?: { raw: number };
        totalDebt?: { raw: number };
        ebitda?: { raw: number };
        totalCash?: { raw: number };
        quickRatio?: { raw: number };
        targetMeanPrice?: { raw: number };
        longName?: string;
        shortName?: string;
    };
    assetProfile?: {
        sector?: string;
        industry?: string;
        country?: string;
    };
    price?: {
        shortName?: string;
        longName?: string;
    };
}

async function fetchFundamentals(symbol: string): Promise<YFSummaryResult | null> {
    const auth = await getCrumb();
    if (!auth) return null;

    for (const host of YF_HOSTS) {
        try {
            const url = `${host}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${MODULES}&crumb=${encodeURIComponent(auth.crumb)}`;
            const res = await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "application/json",
                    "Accept-Language": "en-US,en;q=0.9",
                    "Referer": "https://finance.yahoo.com/",
                    ...(auth.cookie ? { "Cookie": auth.cookie } : {}),
                },
                signal: AbortSignal.timeout(SUMMARY_TIMEOUT_MS),
                cache: "no-store",
            });

            if (!res.ok) {
                // 401 = crumb expired, clear cache so next call re-fetches
                if (res.status === 401) { _crumbCache = null; }
                continue;
            }

            const data = await res.json();
            const result: YFSummaryResult | undefined = data?.quoteSummary?.result?.[0];
            if (result) {
                console.log(`[yahoo-finance] v10/summary ✓ ${symbol} from ${host}`);
                return result;
            }
        } catch {
            // Try other host
        }
    }
    return null;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function buildYahooFinanceMetrics(
    ticker: string
): Promise<Partial<FinancialMetrics>> {
    const nsSymbol = toNSSymbol(ticker);
    console.log(`[yahoo-finance] Fetching ${nsSymbol}...`);

    // Run chart (price) and fundamentals in parallel — don't block price on fundamentals
    const [chartMeta, fundamentals] = await Promise.all([
        fetchChartPrice(nsSymbol).then(async (data) => {
            if (data) return data;
            // .NS failed → try .BO
            if (nsSymbol.endsWith(".NS")) {
                const bo = nsSymbol.replace(".NS", ".BO");
                console.log(`[yahoo-finance] chart .NS failed, trying ${bo}...`);
                return fetchChartPrice(bo);
            }
            return null;
        }),
        fetchFundamentals(nsSymbol).then(async (data) => {
            if (data) return data;
            if (nsSymbol.endsWith(".NS")) {
                const bo = nsSymbol.replace(".NS", ".BO");
                return fetchFundamentals(bo);
            }
            return null;
        }),
    ]);

    if (!chartMeta && !fundamentals) {
        console.warn(`[yahoo-finance] No data available for ${ticker}`);
        return {};
    }

    return extractMetrics(ticker, chartMeta, fundamentals);
}

// ── Extraction — full precision, no rounding ───────────────────────────────────

function extractMetrics(
    ticker: string,
    chart: ChartMeta | null,
    fund: YFSummaryResult | null
): Partial<FinancialMetrics> {
    const sd = fund?.summaryDetail;
    const ks = fund?.defaultKeyStatistics;
    const fd = fund?.financialData;
    const prof = fund?.assetProfile;

    // ── Price & market data — from live chart (most accurate) ─────────────────
    //    Full precision: never round these
    const currentPrice = chart?.regularMarketPrice;
    const fiftyTwoWeekHigh = chart?.fiftyTwoWeekHigh ?? sd?.fiftyTwoWeekHigh?.raw;
    const fiftyTwoWeekLow = chart?.fiftyTwoWeekLow ?? sd?.fiftyTwoWeekLow?.raw;
    // Market cap from chart when available (live), else from summary
    const marketCap = chart?.marketCap ?? sd?.marketCap?.raw;

    // ── Revenue & gross margin ─────────────────────────────────────────────────
    const revenue = fd?.totalRevenue?.raw;
    const grossProfit = fd?.grossProfits?.raw;
    const grossMarginFromData = fd?.grossMargins?.raw;
    const grossMarginCalc =
        revenue && grossProfit && revenue > 0
            ? (grossProfit / revenue)   // raw decimal e.g. 0.375
            : undefined;
    const grossMarginPct =
        grossMarginFromData != null ? grossMarginFromData * 100
            : grossMarginCalc != null ? grossMarginCalc * 100
                : undefined;

    // ── All margin % values (YF stores as decimals 0‒1) ──────────────────────
    const operatingMarginPct = fd?.operatingMargins?.raw != null ? fd.operatingMargins.raw * 100 : undefined;
    const netMarginPct = fd?.profitMargins?.raw != null ? fd.profitMargins.raw * 100 : undefined;
    const ebitdaMarginPct = fd?.ebitdaMargins?.raw != null ? fd.ebitdaMargins.raw * 100 : undefined;

    // ── FCF & FCF yield ────────────────────────────────────────────────────────
    const freeCashFlow = fd?.freeCashflow?.raw;
    const freeCashFlowYield =
        freeCashFlow != null && marketCap != null && marketCap > 0
            ? (freeCashFlow / marketCap) * 100
            : undefined;

    // ── Debt/Equity ────────────────────────────────────────────────────────────
    // IMPORTANT: Yahoo Finance v10 returns debtToEquity AS A PERCENTAGE (e.g. 88.0 for D/E = 0.88).
    // We must divide by 100 to get the ratio format used in the rest of the app.
    // But v10 sometimes returns it as a raw ratio too — value > 20 is almost certainly the % form.
    const rawDE = fd?.debtToEquity?.raw;
    const debtToEquity = rawDE != null
        ? (rawDE > 20 ? rawDE / 100 : rawDE)  // >20 means it's a % like 88.0 → 0.88
        : undefined;

    // ── Returns (decimal → %) ─────────────────────────────────────────────────
    const roe = fd?.returnOnEquity?.raw != null ? fd.returnOnEquity.raw * 100 : undefined;
    const roa = fd?.returnOnAssets?.raw != null ? fd.returnOnAssets.raw * 100 : undefined;

    // ── Growth (decimal → %) ──────────────────────────────────────────────────
    const revenueGrowthYoY = fd?.revenueGrowth?.raw != null ? fd.revenueGrowth.raw * 100 : undefined;
    const earningsGrowthYoY = fd?.earningsGrowth?.raw != null ? fd.earningsGrowth.raw * 100 : undefined;

    // ── Dividend yield (decimal → %) ──────────────────────────────────────────
    const dividendYield =
        sd?.dividendYield?.raw != null && sd.dividendYield.raw > 0
            ? sd.dividendYield.raw * 100
            : undefined;

    // ── Company name ──────────────────────────────────────────────────────────
    const companyName =
        fund?.price?.longName ??
        fund?.price?.shortName ??
        `${ticker.toUpperCase()} Ltd`;

    const result: Partial<FinancialMetrics> = {
        ticker: ticker.toUpperCase(),
        companyName,
        sector: prof?.sector || undefined,
        industry: prof?.industry || undefined,

        // Live price data — exact, full floating-point precision
        currentPrice,
        fiftyTwoWeekHigh,
        fiftyTwoWeekLow,
        marketCap,

        // Valuation multiples
        peRatio: sd?.trailingPE?.raw ?? ks?.trailingPE?.raw,
        forwardPE: sd?.forwardPE?.raw,
        pbRatio: ks?.priceToBook?.raw,
        psRatio: sd?.priceToSalesTrailing12Months?.raw,
        evToEbitda: ks?.enterpriseToEbitda?.raw,
        eps: ks?.trailingEps?.raw,
        beta: sd?.beta?.raw,

        // Income
        revenue,
        ebitda: fd?.ebitda?.raw,
        grossMargin: grossMarginPct,
        grossProfit,
        operatingMargin: operatingMarginPct,
        netMargin: netMarginPct,
        ebitdaMargin: ebitdaMarginPct,

        // Cash flow
        freeCashFlow,
        freeCashFlowYield,
        operatingCashFlow: fd?.operatingCashflow?.raw,

        // Balance sheet
        debtToEquity,
        currentRatio: fd?.currentRatio?.raw,

        // Growth
        revenueGrowthYoY,
        earningsGrowthYoY,

        // Returns
        roe,
        roa,

        // Income
        dividendYield,

        // Analyst
        analystTargetPrice: fd?.targetMeanPrice?.raw,
    };

    // Strip undefined / null / NaN / Infinity — never let bad values shadow reference data
    return Object.fromEntries(
        Object.entries(result).filter(([, v]) => {
            if (v === undefined || v === null) return false;
            if (typeof v === "number" && (!isFinite(v) || isNaN(v))) return false;
            return true;
        })
    ) as Partial<FinancialMetrics>;
}
