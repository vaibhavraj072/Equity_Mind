import { FinancialMetrics } from "@/types";
import { buildFinnhubMetrics } from "./finnhub";
import { buildAlphaVantageMetrics } from "./alpha-vantage";
import { buildYahooFinanceMetrics } from "./yahoo-finance";
import { buildNSEMetrics } from "./nse-india";

// ─── Indian NSE stocks — structural reference data only ────────────────────
// IMPORTANT: currentPrice, marketCap, peRatio, eps, 52W range are NOT stored here.
// These change every second and must always come from Yahoo Finance live data.
// Only slow-moving fundamentals (margins, ratios, sector data) are kept here.
const INDIAN_COMPANIES: Record<string, Partial<FinancialMetrics>> = {
    TCS: {
        ticker: "TCS", companyName: "Tata Consultancy Services Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        revenue: 2_408_930_000_000,
        revenueGrowthYoY: 4.5, grossMargin: 37.5, operatingMargin: 24.2, netMargin: 19.2,
        ebitda: 700_000_000_000, ebitdaMargin: 29.1,
        pbRatio: 10.5, psRatio: 5.2, evToEbitda: 19.8,
        roe: 53.8, roa: 28.1, debtToEquity: 0.04, currentRatio: 2.41,
        freeCashFlow: 420_000_000_000, dividendYield: 1.8, beta: 0.55,
    },
    RELIANCE: {
        ticker: "RELIANCE", companyName: "Reliance Industries Ltd",
        sector: "Conglomerate", industry: "Oil, Gas & Diversified",
        revenue: 9_013_080_000_000,
        revenueGrowthYoY: 7.8, grossMargin: 15.2, operatingMargin: 11.4, netMargin: 7.2,
        ebitda: 1_700_000_000_000, ebitdaMargin: 18.9,
        pbRatio: 2.5, psRatio: 2.0, evToEbitda: 14.5,
        roe: 9.2, roa: 4.1, debtToEquity: 0.88, currentRatio: 0.95,
        freeCashFlow: 620_000_000_000, dividendYield: 0.34, beta: 0.72,
    },
    INFY: {
        ticker: "INFY", companyName: "Infosys Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        revenue: 1_535_250_000_000,
        revenueGrowthYoY: 1.2, grossMargin: 32.4, operatingMargin: 20.0, netMargin: 16.8,
        ebitda: 384_000_000_000, ebitdaMargin: 25.0,
        pbRatio: 7.5, psRatio: 4.4, evToEbitda: 17.8,
        roe: 31.7, roa: 21.4, debtToEquity: 0.06, currentRatio: 2.53,
        freeCashFlow: 210_000_000_000, dividendYield: 2.1, beta: 0.60,
    },
    HDFCBANK: {
        ticker: "HDFCBANK", companyName: "HDFC Bank Ltd",
        sector: "Financial Services", industry: "Private Sector Bank",
        revenue: 1_295_000_000_000,
        revenueGrowthYoY: 24.5, grossMargin: 55.0, operatingMargin: 40.2, netMargin: 24.5,
        ebitda: 520_000_000_000, ebitdaMargin: 40.2,
        pbRatio: 2.3, psRatio: 4.0,
        roe: 16.2, roa: 1.9, debtToEquity: 8.5,
        dividendYield: 1.1, beta: 0.91,
    },
    ICICIBANK: {
        ticker: "ICICIBANK", companyName: "ICICI Bank Ltd",
        sector: "Financial Services", industry: "Private Sector Bank",
        revenue: 875_000_000_000,
        revenueGrowthYoY: 16.3, grossMargin: 50.0, operatingMargin: 38.5, netMargin: 28.2,
        pbRatio: 3.0,
        roe: 18.4, roa: 2.2, debtToEquity: 6.8,
        dividendYield: 0.8, beta: 0.88,
    },
    HINDUNILVR: {
        ticker: "HINDUNILVR", companyName: "Hindustan Unilever Ltd",
        sector: "Consumer Staples", industry: "FMCG",
        revenue: 601_440_000_000,
        revenueGrowthYoY: 0.5, grossMargin: 48.6, operatingMargin: 23.1, netMargin: 17.5,
        ebitda: 148_000_000_000, ebitdaMargin: 24.6,
        pbRatio: 9.8, psRatio: 8.5, evToEbitda: 38.2,
        roe: 19.8, roa: 17.1, debtToEquity: 0.0, currentRatio: 0.78,
        dividendYield: 1.8, beta: 0.43,
    },
    WIPRO: {
        ticker: "WIPRO", companyName: "Wipro Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        revenue: 897_970_000_000,
        revenueGrowthYoY: -0.4, grossMargin: 27.0, operatingMargin: 16.0, netMargin: 12.5,
        pbRatio: 3.2,
        roe: 14.8, roa: 10.2, debtToEquity: 0.12, currentRatio: 2.10,
        dividendYield: 0.17, beta: 0.55,
    },
    BAJFINANCE: {
        ticker: "BAJFINANCE", companyName: "Bajaj Finance Ltd",
        sector: "Financial Services", industry: "Non-Banking Financial Company",
        revenue: 540_000_000_000,
        revenueGrowthYoY: 28.5, operatingMargin: 45.2, netMargin: 22.5,
        pbRatio: 4.8,
        roe: 18.5, roa: 3.2, debtToEquity: 7.2, beta: 1.12,
    },
    MARUTI: {
        ticker: "MARUTI", companyName: "Maruti Suzuki India Ltd",
        sector: "Consumer Cyclical", industry: "Automobiles",
        revenue: 1_396_050_000_000,
        revenueGrowthYoY: 19.6, grossMargin: 28.5, operatingMargin: 11.4, netMargin: 8.8,
        ebitda: 182_000_000_000, ebitdaMargin: 13.0,
        pbRatio: 5.4,
        roe: 21.4, roa: 14.2, debtToEquity: 0.0, currentRatio: 0.69,
        dividendYield: 0.8, beta: 0.62,
    },
    SUNPHARMA: {
        ticker: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Ltd",
        sector: "Healthcare", industry: "Pharmaceuticals",
        revenue: 519_900_000_000,
        revenueGrowthYoY: 10.8, grossMargin: 68.0, operatingMargin: 26.0, netMargin: 19.5,
        pbRatio: 6.8,
        roe: 19.3, roa: 13.5, debtToEquity: 0.05, currentRatio: 2.8,
        dividendYield: 0.7, beta: 0.52,
    },
    TATAMOTORS: {
        ticker: "TATAMOTORS", companyName: "Tata Motors Ltd",
        sector: "Consumer Cyclical", industry: "Automobiles",
        revenue: 4_387_660_000_000,
        revenueGrowthYoY: 26.4, grossMargin: 16.8, operatingMargin: 8.2, netMargin: 5.8,
        pbRatio: 2.7,
        roe: 36.4, roa: 5.0, debtToEquity: 1.85, currentRatio: 0.92, beta: 1.32,
    },
    ONGC: {
        ticker: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd",
        sector: "Energy", industry: "Oil & Gas Exploration",
        revenue: 1_713_000_000_000,
        revenueGrowthYoY: 5.2, grossMargin: 42.0, operatingMargin: 24.5, netMargin: 11.2,
        pbRatio: 0.98,
        roe: 13.5, roa: 7.2, debtToEquity: 0.45, currentRatio: 1.05,
        dividendYield: 4.8, beta: 0.82,
    },
    ADANIPORTS: {
        ticker: "ADANIPORTS", companyName: "Adani Ports & SEZ Ltd",
        sector: "Industrials", industry: "Ports & Infrastructure",
        revenue: 273_000_000_000,
        revenueGrowthYoY: 24.2, operatingMargin: 52.0, netMargin: 28.5,
        pbRatio: 4.8,
        roe: 22.5, roa: 8.5, debtToEquity: 1.12, currentRatio: 0.88, beta: 1.25,
    },
    LTIM: {
        ticker: "LTIM", companyName: "LTIMindtree Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        revenue: 371_300_000_000,
        revenueGrowthYoY: 4.8, grossMargin: 30.2, operatingMargin: 18.2, netMargin: 14.5,
        evToEbitda: 0.0, pbRatio: 8.2,
        roe: 28.3, roa: 18.5, debtToEquity: 0.02, currentRatio: 2.2,
        dividendYield: 1.0, beta: 0.72,
    },
    NESTLEIND: {
        ticker: "NESTLEIND", companyName: "Nestlé India Ltd",
        sector: "Consumer Staples", industry: "Food & Beverages",
        revenue: 244_800_000_000,
        revenueGrowthYoY: 7.5, grossMargin: 52.5, operatingMargin: 24.8, netMargin: 18.2,
        pbRatio: 97.0,
        roe: 132.5, roa: 42.5, debtToEquity: 0.0, currentRatio: 0.78,
        dividendYield: 1.5, beta: 0.35,
    },
};

// ─── US/Global stocks  ────────────────────────────────────────────────────────
const US_COMPANIES: Record<string, Partial<FinancialMetrics>> = {
    AAPL: {
        ticker: "AAPL", companyName: "Apple Inc.", sector: "Technology", industry: "Consumer Electronics",
        marketCap: 3_200_000_000_000, currentPrice: 225.50, revenue: 383_285_000_000, revenueGrowthYoY: 2.8,
        grossMargin: 44.1, operatingMargin: 29.8, netMargin: 25.3, ebitda: 130_000_000_000, ebitdaMargin: 33.9,
        peRatio: 32.5, pbRatio: 48.2, psRatio: 8.3, evToEbitda: 25.1, eps: 6.42,
        roe: 147.9, roa: 28.3, debtToEquity: 2.4, currentRatio: 0.94,
        freeCashFlow: 111_000_000_000, freeCashFlowYield: 3.4, dividendYield: 0.44,
        fiftyTwoWeekHigh: 260.10, fiftyTwoWeekLow: 164.08, beta: 1.24,
    },
    MSFT: {
        ticker: "MSFT", companyName: "Microsoft Corporation", sector: "Technology", industry: "Software",
        marketCap: 3_050_000_000_000, currentPrice: 410.20, revenue: 245_122_000_000, revenueGrowthYoY: 15.7,
        grossMargin: 69.8, operatingMargin: 44.7, netMargin: 35.9, ebitda: 130_500_000_000, ebitdaMargin: 53.2,
        peRatio: 38.4, pbRatio: 13.1, psRatio: 12.4, evToEbitda: 26.5, eps: 11.80,
        roe: 34.8, roa: 19.3, debtToEquity: 0.72, currentRatio: 1.31,
        freeCashFlow: 74_100_000_000, freeCashFlowYield: 2.4, dividendYield: 0.65,
        fiftyTwoWeekHigh: 468.35, fiftyTwoWeekLow: 310.56, beta: 0.90,
    },
    GOOGL: {
        ticker: "GOOGL", companyName: "Alphabet Inc.", sector: "Technology", industry: "Internet Content",
        marketCap: 2_200_000_000_000, currentPrice: 178.50, revenue: 307_394_000_000, revenueGrowthYoY: 15.1,
        grossMargin: 56.6, operatingMargin: 27.4, netMargin: 23.7, ebitda: 100_000_000_000, ebitdaMargin: 32.5,
        peRatio: 24.8, pbRatio: 6.8, psRatio: 7.2, evToEbitda: 18.9, eps: 7.31,
        roe: 29.4, roa: 17.2, debtToEquity: 0.10, currentRatio: 2.10,
        freeCashFlow: 72_800_000_000, freeCashFlowYield: 3.3,
        fiftyTwoWeekHigh: 207.05, fiftyTwoWeekLow: 120.21, beta: 1.06,
    },
    AMZN: {
        ticker: "AMZN", companyName: "Amazon.com Inc.", sector: "Consumer Cyclical", industry: "Internet Retail",
        marketCap: 2_100_000_000_000, currentPrice: 205.00, revenue: 637_959_000_000, revenueGrowthYoY: 12.1,
        grossMargin: 47.0, operatingMargin: 10.8, netMargin: 8.0, ebitda: 120_000_000_000, ebitdaMargin: 18.8,
        peRatio: 44.2, pbRatio: 9.5, psRatio: 3.3, evToEbitda: 20.1, eps: 4.60,
        roe: 20.8, roa: 8.5, debtToEquity: 1.45, currentRatio: 1.05,
        freeCashFlow: 38_200_000_000, freeCashFlowYield: 1.8,
        fiftyTwoWeekHigh: 242.52, fiftyTwoWeekLow: 118.35, beta: 1.19,
    },
    NVDA: {
        ticker: "NVDA", companyName: "NVIDIA Corporation", sector: "Technology", industry: "Semiconductors",
        marketCap: 3_400_000_000_000, currentPrice: 138.85, revenue: 130_497_000_000, revenueGrowthYoY: 122.4,
        grossMargin: 74.6, operatingMargin: 62.1, netMargin: 55.0, ebitda: 88_540_000_000, ebitdaMargin: 67.8,
        peRatio: 58.7, pbRatio: 55.0, psRatio: 26.0, evToEbitda: 45.2, eps: 2.48,
        roe: 113.8, roa: 55.1, debtToEquity: 0.41, currentRatio: 4.20,
        freeCashFlow: 60_850_000_000, freeCashFlowYield: 1.8,
        fiftyTwoWeekHigh: 153.13, fiftyTwoWeekLow: 47.32, beta: 1.66,
    },
    META: {
        ticker: "META", companyName: "Meta Platforms Inc.", sector: "Technology", industry: "Social Media",
        marketCap: 1_500_000_000_000, currentPrice: 590.00, revenue: 164_501_000_000, revenueGrowthYoY: 21.9,
        grossMargin: 81.5, operatingMargin: 41.8, netMargin: 36.3, ebitda: 82_000_000_000, ebitdaMargin: 49.8,
        peRatio: 28.9, pbRatio: 9.3, psRatio: 9.1, evToEbitda: 21.5, eps: 21.62,
        roe: 36.8, roa: 22.9, debtToEquity: 0.18, currentRatio: 2.68,
        freeCashFlow: 53_000_000_000, freeCashFlowYield: 3.5,
        fiftyTwoWeekHigh: 638.40, fiftyTwoWeekLow: 304.79, beta: 1.22,
    },
    TSLA: {
        ticker: "TSLA", companyName: "Tesla Inc.", sector: "Consumer Cyclical", industry: "Auto Manufacturers",
        marketCap: 1_200_000_000_000, currentPrice: 380.00, revenue: 97_690_000_000, revenueGrowthYoY: 1.1,
        grossMargin: 17.9, operatingMargin: 7.2, netMargin: 5.8, ebitda: 12_100_000_000, ebitdaMargin: 12.4,
        peRatio: 125.0, pbRatio: 18.5, psRatio: 12.3, evToEbitda: 105.0, eps: 2.04,
        roe: 15.0, roa: 7.4, debtToEquity: 0.17, currentRatio: 1.84,
        freeCashFlow: 3_630_000_000, freeCashFlowYield: 0.3,
        fiftyTwoWeekHigh: 488.54, fiftyTwoWeekLow: 138.80, beta: 2.29,
    },
    JNJ: {
        ticker: "JNJ", companyName: "Johnson & Johnson", sector: "Healthcare", industry: "Drug Manufacturers",
        marketCap: 380_000_000_000, currentPrice: 158.00, revenue: 88_821_000_000, revenueGrowthYoY: 6.5,
        grossMargin: 68.8, operatingMargin: 19.7, netMargin: 16.8, ebitda: 27_400_000_000, ebitdaMargin: 30.8,
        peRatio: 15.2, pbRatio: 5.1, psRatio: 4.3, evToEbitda: 13.5, eps: 10.40,
        roe: 33.4, roa: 11.3, debtToEquity: 0.54, currentRatio: 1.13,
        freeCashFlow: 18_500_000_000, freeCashFlowYield: 4.9, dividendYield: 3.1,
        fiftyTwoWeekHigh: 175.97, fiftyTwoWeekLow: 143.13, beta: 0.57,
    },
};

// ─── Nifty 50 peers mapping ───────────────────────────────────────────────────
const DEFAULT_PEERS: Record<string, string[]> = {
    // Indian IT
    TCS: ["INFY", "WIPRO", "LTIM"],
    INFY: ["TCS", "WIPRO", "LTIM"],
    WIPRO: ["TCS", "INFY", "LTIM"],
    LTIM: ["TCS", "INFY", "WIPRO"],
    // Indian Banks
    HDFCBANK: ["ICICIBANK", "KOTAKBANK", "AXISBANK"],
    ICICIBANK: ["HDFCBANK", "KOTAKBANK", "AXISBANK"],
    // Consumer
    HINDUNILVR: ["NESTLEIND", "DABUR", "MARICO"],
    NESTLEIND: ["HINDUNILVR", "BRITANNIA", "DABUR"],
    // Auto
    MARUTI: ["TATAMOTORS", "MAHINDRA", "BAJAJ-AUTO"],
    TATAMOTORS: ["MARUTI", "MAHINDRA", "BAJAJ-AUTO"],
    // US Tech
    AAPL: ["MSFT", "GOOGL", "META"],
    MSFT: ["AAPL", "GOOGL", "AMZN"],
    GOOGL: ["META", "MSFT", "AMZN"],
    NVDA: ["AMD", "INTC", "AVGO"],
    TSLA: ["GM", "F", "RIVN"],
    JNJ: ["PFE", "ABBV", "MRK"],
    META: ["GOOGL", "SNAP", "PINS"],
};

// ─── Is this an Indian NSE/BSE ticker? ───────────────────────────────────────
// A ticker is treated as Indian if:
//   - It is in our INDIAN_COMPANIES reference map, OR
//   - It explicitly ends with .NS or .BO (user passed Yahoo-format symbol), OR
//   - It is NOT in the US_COMPANIES list and NOT a known short US ticker (1-4 chars)
//
// For completely unknown tickers, we TRY NSE first and fall back to US if NSE returns nothing.
// This means ZOMATO, PAYTM, NYKAA, etc. all work correctly.
function isIndianTicker(ticker: string): boolean {
    const t = ticker.toUpperCase();
    if (t in INDIAN_COMPANIES) return true;
    if (t.endsWith(".NS") || t.endsWith(".BO")) return true;
    if (t in US_COMPANIES) return false;
    // Known NSE market caps / index names that are long (> 4 chars and not US)
    // Heuristic: NSE symbols are typically 5-15 chars. Short 1-4 char symbols are US.
    // But some Indian tickers are short (e.g. ITC, LT, M&M) — so we use a flexible rule:
    // If it contains numbers or is >12 chars, very likely Indian.
    // Otherwise default to Indian unless it's a very common US pattern.
    const US_SHORT_PATTERN = /^[A-Z]{1,4}$/.test(t);
    // Common short US-only tickers that could be confused with Indian ones
    const KNOWN_US_SHORT = new Set(["GM", "GE", "F", "MS", "WMT", "IBM", "JPM", "PFE", "BAC", "HD", "MA", "V", "AMD", "DIS", "NKE", "BA", "CAT", "MMM", "AXP"]);
    if (KNOWN_US_SHORT.has(t)) return false;
    // Default: assume Indian for undiscovered tickers
    return true;
}


function getBaseMetrics(ticker: string): Partial<FinancialMetrics> {
    const t = ticker.toUpperCase();
    if (INDIAN_COMPANIES[t]) return INDIAN_COMPANIES[t];
    if (US_COMPANIES[t]) return US_COMPANIES[t];
    // Generic fallback — no fake numbers
    return { ticker: t, companyName: `${t} Ltd`, sector: "Unknown", industry: "Unknown" };
}

export async function getFinancialProfile(ticker: string): Promise<{
    metrics: FinancialMetrics;
    defaultPeers: string[];
    dataSource: "live" | "mock";
}> {
    const t = ticker.toUpperCase();
    const baseMetrics = getBaseMetrics(t);
    const isIndian = isIndianTicker(t) && !(t in US_COMPANIES);

    // ── Fetch live data ─────────────────────────────────────────────────
    // For Indian stocks:
    //   1. NSE India API (primary)  — exact live price, P/E, 52W range from official NSE
    //   2. Yahoo Finance v8+v10    — fundamentals (margins, D/E, ROE, FCF, revenue)
    //
    // For US stocks:
    //   1. Yahoo Finance            — primary
    //   2. Finnhub + Alpha Vantage  — supplementary
    let nseData: Partial<FinancialMetrics> = {};
    let yahooData: Partial<FinancialMetrics> = {};
    let finnhubData: Partial<FinancialMetrics> = {};
    let avData: Partial<FinancialMetrics> = {};

    if (isIndian) {
        // Run NSE and Yahoo Finance in parallel
        [nseData, yahooData] = await Promise.all([
            buildNSEMetrics(t).catch(() => ({} as Partial<FinancialMetrics>)),
            buildYahooFinanceMetrics(t).catch(() => ({} as Partial<FinancialMetrics>)),
        ]);
    } else {
        [yahooData, finnhubData, avData] = await Promise.all([
            buildYahooFinanceMetrics(t).catch(() => ({} as Partial<FinancialMetrics>)),
            buildFinnhubMetrics(t).catch(() => ({} as Partial<FinancialMetrics>)),
            buildAlphaVantageMetrics(t).catch(() => ({} as Partial<FinancialMetrics>)),
        ]);
    }

    // ── Live data validity check ──────────────────────────────────────────────
    const hasNSEData = isIndian && Object.keys(nseData).length >= 1;
    const hasYahooData = Object.keys(yahooData).length >= 1;
    const hasLiveData = hasNSEData || hasYahooData;
    const dataSource = hasLiveData ? "live" : "mock";

    // ── Merge strategy ───────────────────────────────────────────────────────
    // Indian stock priority:
    //   base (margins/ratios only) → Yahoo Finance (fundamentals) → NSE India (WINS on all price/P/E)
    //
    // NSE India always wins for: currentPrice, peRatio, fiftyTwoWeekHigh/Low
    // Yahoo Finance fills: revenue, margins, D/E, ROE, FCF, marketCap
    // Reference data fills: pbRatio, dividendYield, sector when live is missing
    const mergedMetrics: Partial<FinancialMetrics> = isIndian ? {
        ...baseMetrics,                // structural / slow-moving fundamentals
        ...(hasYahooData ? yahooData : {}),  // Yahoo Finance: revenue, margins, market cap
        ...(hasNSEData ? nseData : {}),  // NSE India ALWAYS wins on top (live price, P/E)
    } : {
        ...baseMetrics,
        ...(hasYahooData ? yahooData : {}),
        ...(finnhubData ?? {}),
        // Alpha Vantage: only fill in missing revenue / FCF / EBITDA
        ...(avData?.revenue && !yahooData?.revenue ? { revenue: avData.revenue } : {}),
        ...(avData?.revenueGrowthYoY && !yahooData?.revenueGrowthYoY ? { revenueGrowthYoY: avData.revenueGrowthYoY } : {}),
        ...(avData?.ebitda && !yahooData?.ebitda ? { ebitda: avData.ebitda } : {}),
        ...(avData?.freeCashFlow && !yahooData?.freeCashFlow ? { freeCashFlow: avData.freeCashFlow } : {}),
    };

    const metrics: FinancialMetrics = {
        ticker: mergedMetrics.ticker ?? t,
        companyName: mergedMetrics.companyName ?? `${t} Ltd`,
        sector: mergedMetrics.sector ?? "Unknown",
        industry: mergedMetrics.industry ?? "Unknown",
        ...mergedMetrics,
        dataTimestamp: new Date().toISOString(),
    };

    return {
        metrics,
        defaultPeers: DEFAULT_PEERS[t] ?? [],
        dataSource,
    };
}

export { getBaseMetrics as getMockCompanyMetrics };
