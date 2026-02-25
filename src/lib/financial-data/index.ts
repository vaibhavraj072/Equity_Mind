import { FinancialMetrics } from "@/types";
import { buildFinnhubMetrics } from "./finnhub";
import { buildAlphaVantageMetrics } from "./alpha-vantage";
import { buildYahooFinanceMetrics } from "./yahoo-finance";

// ─── Indian NSE stocks — curated reference data (updated Feb 2025) ─────────
// Used as base layer; live Yahoo Finance data is merged on top.
const INDIAN_COMPANIES: Record<string, Partial<FinancialMetrics>> = {
    TCS: {
        ticker: "TCS", companyName: "Tata Consultancy Services Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        marketCap: 124_000_000_000, currentPrice: 3350, revenue: 2_408_930_000_000,
        revenueGrowthYoY: 4.5, grossMargin: 37.5, operatingMargin: 24.2, netMargin: 19.2,
        ebitda: 700_000_000_000, ebitdaMargin: 29.1, peRatio: 25.4, pbRatio: 10.5,
        psRatio: 5.2, evToEbitda: 19.8, eps: 127.5,
        roe: 53.8, roa: 28.1, debtToEquity: 0.04, currentRatio: 2.41,
        freeCashFlow: 420_000_000_000, dividendYield: 1.8,
        fiftyTwoWeekHigh: 4592, fiftyTwoWeekLow: 3056, beta: 0.55,
    },
    RELIANCE: {
        ticker: "RELIANCE", companyName: "Reliance Industries Ltd",
        sector: "Conglomerate", industry: "Oil, Gas & Diversified",
        marketCap: 204_000_000_000, currentPrice: 1280, revenue: 9_013_080_000_000,
        revenueGrowthYoY: 7.8, grossMargin: 15.2, operatingMargin: 11.4, netMargin: 7.2,
        ebitda: 1_700_000_000_000, ebitdaMargin: 18.9, peRatio: 27.3, pbRatio: 2.5,
        psRatio: 2.0, evToEbitda: 14.5, eps: 52.4,
        roe: 9.2, roa: 4.1, debtToEquity: 0.88, currentRatio: 0.95,
        freeCashFlow: 620_000_000_000, dividendYield: 0.34,
        fiftyTwoWeekHigh: 1608, fiftyTwoWeekLow: 1115, beta: 0.72,
    },
    INFY: {
        ticker: "INFY", companyName: "Infosys Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        marketCap: 74_000_000_000, currentPrice: 1610, revenue: 1_535_250_000_000,
        revenueGrowthYoY: 1.2, grossMargin: 32.4, operatingMargin: 20.0, netMargin: 16.8,
        ebitda: 384_000_000_000, ebitdaMargin: 25.0, peRatio: 22.3, pbRatio: 7.5,
        psRatio: 4.4, evToEbitda: 17.8, eps: 61.5,
        roe: 31.7, roa: 21.4, debtToEquity: 0.06, currentRatio: 2.53,
        freeCashFlow: 210_000_000_000, dividendYield: 2.1,
        fiftyTwoWeekHigh: 2006, fiftyTwoWeekLow: 1358, beta: 0.60,
    },
    HDFCBANK: {
        ticker: "HDFCBANK", companyName: "HDFC Bank Ltd",
        sector: "Financial Services", industry: "Private Sector Bank",
        marketCap: 117_000_000_000, currentPrice: 1640, revenue: 1_295_000_000_000,
        revenueGrowthYoY: 24.5, grossMargin: 55.0, operatingMargin: 40.2, netMargin: 24.5,
        ebitda: 520_000_000_000, ebitdaMargin: 40.2, peRatio: 17.8, pbRatio: 2.3,
        psRatio: 4.0, eps: 91.0,
        roe: 16.2, roa: 1.9, debtToEquity: 8.5, currentRatio: 0.0,
        dividendYield: 1.1,
        fiftyTwoWeekHigh: 1881, fiftyTwoWeekLow: 1363, beta: 0.91,
    },
    ICICIBANK: {
        ticker: "ICICIBANK", companyName: "ICICI Bank Ltd",
        sector: "Financial Services", industry: "Private Sector Bank",
        marketCap: 102_000_000_000, currentPrice: 1277, revenue: 875_000_000_000,
        revenueGrowthYoY: 16.3, grossMargin: 50.0, operatingMargin: 38.5, netMargin: 28.2,
        peRatio: 17.3, pbRatio: 3.0, eps: 70.8,
        roe: 18.4, roa: 2.2, debtToEquity: 6.8,
        dividendYield: 0.8,
        fiftyTwoWeekHigh: 1362, fiftyTwoWeekLow: 964, beta: 0.88,
    },
    HINDUNILVR: {
        ticker: "HINDUNILVR", companyName: "Hindustan Unilever Ltd",
        sector: "Consumer Staples", industry: "FMCG",
        marketCap: 61_000_000_000, currentPrice: 2340, revenue: 601_440_000_000,
        revenueGrowthYoY: 0.5, grossMargin: 48.6, operatingMargin: 23.1, netMargin: 17.5,
        ebitda: 148_000_000_000, ebitdaMargin: 24.6, peRatio: 48.5, pbRatio: 9.8,
        psRatio: 8.5, evToEbitda: 38.2, eps: 42.5,
        roe: 19.8, roa: 17.1, debtToEquity: 0.0, currentRatio: 0.78,
        dividendYield: 1.8,
        fiftyTwoWeekHigh: 3035, fiftyTwoWeekLow: 2172, beta: 0.43,
    },
    WIPRO: {
        ticker: "WIPRO", companyName: "Wipro Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        marketCap: 31_000_000_000, currentPrice: 290, revenue: 897_970_000_000,
        revenueGrowthYoY: -0.4, grossMargin: 27.0, operatingMargin: 16.0, netMargin: 12.5,
        peRatio: 18.5, pbRatio: 3.2, eps: 22.5,
        roe: 14.8, roa: 10.2, debtToEquity: 0.12, currentRatio: 2.10,
        dividendYield: 0.17,
        fiftyTwoWeekHigh: 570, fiftyTwoWeekLow: 208, beta: 0.55,
    },
    BAJFINANCE: {
        ticker: "BAJFINANCE", companyName: "Bajaj Finance Ltd",
        sector: "Financial Services", industry: "Non-Banking Financial Company",
        marketCap: 47_000_000_000, currentPrice: 7550, revenue: 540_000_000_000,
        revenueGrowthYoY: 28.5, operatingMargin: 45.2, netMargin: 22.5,
        peRatio: 28.5, pbRatio: 4.8, eps: 265.0,
        roe: 18.5, roa: 3.2, debtToEquity: 7.2,
        fiftyTwoWeekHigh: 9000, fiftyTwoWeekLow: 6187, beta: 1.12,
    },
    MARUTI: {
        ticker: "MARUTI", companyName: "Maruti Suzuki India Ltd",
        sector: "Consumer Cyclical", industry: "Automobiles",
        marketCap: 41_000_000_000, currentPrice: 11800, revenue: 1_396_050_000_000,
        revenueGrowthYoY: 19.6, grossMargin: 28.5, operatingMargin: 11.4, netMargin: 8.8,
        ebitda: 182_000_000_000, ebitdaMargin: 13.0, peRatio: 26.5, pbRatio: 5.4,
        eps: 432, roe: 21.4, roa: 14.2, debtToEquity: 0.0, currentRatio: 0.69,
        dividendYield: 0.8,
        fiftyTwoWeekHigh: 13680, fiftyTwoWeekLow: 9737, beta: 0.62,
    },
    SUNPHARMA: {
        ticker: "SUNPHARMA", companyName: "Sun Pharmaceutical Industries Ltd",
        sector: "Healthcare", industry: "Pharmaceuticals",
        marketCap: 47_000_000_000, currentPrice: 1850, revenue: 519_900_000_000,
        revenueGrowthYoY: 10.8, grossMargin: 68.0, operatingMargin: 26.0, netMargin: 19.5,
        peRatio: 38.2, pbRatio: 6.8, eps: 45.8,
        roe: 19.3, roa: 13.5, debtToEquity: 0.05, currentRatio: 2.8,
        dividendYield: 0.7,
        fiftyTwoWeekHigh: 1960, fiftyTwoWeekLow: 1219, beta: 0.52,
    },
    TATAMOTORS: {
        ticker: "TATAMOTORS", companyName: "Tata Motors Ltd",
        sector: "Consumer Cyclical", industry: "Automobiles",
        marketCap: 29_000_000_000, currentPrice: 695, revenue: 4_387_660_000_000,
        revenueGrowthYoY: 26.4, grossMargin: 16.8, operatingMargin: 8.2, netMargin: 5.8,
        peRatio: 7.5, pbRatio: 2.7, eps: 85.5,
        roe: 36.4, roa: 5.0, debtToEquity: 1.85, currentRatio: 0.92,
        fiftyTwoWeekHigh: 1108, fiftyTwoWeekLow: 582, beta: 1.32,
    },
    ONGC: {
        ticker: "ONGC", companyName: "Oil & Natural Gas Corporation Ltd",
        sector: "Energy", industry: "Oil & Gas Exploration",
        marketCap: 22_000_000_000, currentPrice: 238, revenue: 1_713_000_000_000,
        revenueGrowthYoY: 5.2, grossMargin: 42.0, operatingMargin: 24.5, netMargin: 11.2,
        peRatio: 7.5, pbRatio: 0.98, eps: 29.5,
        roe: 13.5, roa: 7.2, debtToEquity: 0.45, currentRatio: 1.05,
        dividendYield: 4.8,
        fiftyTwoWeekHigh: 344, fiftyTwoWeekLow: 200, beta: 0.82,
    },
    ADANIPORTS: {
        ticker: "ADANIPORTS", companyName: "Adani Ports & SEZ Ltd",
        sector: "Industrials", industry: "Ports & Infrastructure",
        marketCap: 24_000_000_000, currentPrice: 1050, revenue: 273_000_000_000,
        revenueGrowthYoY: 24.2, operatingMargin: 52.0, netMargin: 28.5,
        peRatio: 25.5, pbRatio: 4.8, eps: 46.2,
        roe: 22.5, roa: 8.5, debtToEquity: 1.12, currentRatio: 0.88,
        fiftyTwoWeekHigh: 1622, fiftyTwoWeekLow: 905, beta: 1.25,
    },
    LTIM: {
        ticker: "LTIM", companyName: "LTIMindtree Ltd",
        sector: "Technology", industry: "IT Services & Consulting",
        marketCap: 15_000_000_000, currentPrice: 4450, revenue: 371_300_000_000,
        revenueGrowthYoY: 4.8, grossMargin: 30.2, operatingMargin: 18.2, netMargin: 14.5,
        peRatio: 30.5, pbRatio: 8.2, eps: 143.5,
        roe: 28.3, roa: 18.5, debtToEquity: 0.02, currentRatio: 2.2,
        dividendYield: 1.0,
        fiftyTwoWeekHigh: 7790, fiftyTwoWeekLow: 4133, beta: 0.72,
    },
    NESTLEIND: {
        ticker: "NESTLEIND", companyName: "Nestlé India Ltd",
        sector: "Consumer Staples", industry: "Food & Beverages",
        marketCap: 24_000_000_000, currentPrice: 2300, revenue: 244_800_000_000,
        revenueGrowthYoY: 7.5, grossMargin: 52.5, operatingMargin: 24.8, netMargin: 18.2,
        peRatio: 73.5, pbRatio: 97.0, eps: 74.2,
        roe: 132.5, roa: 42.5, debtToEquity: 0.0, currentRatio: 0.78,
        dividendYield: 1.5,
        fiftyTwoWeekHigh: 2778, fiftyTwoWeekLow: 2100, beta: 0.35,
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

// ─── Is this an Indian NSE ticker? ───────────────────────────────────────────
function isIndianTicker(ticker: string): boolean {
    return (
        ticker.toUpperCase() in INDIAN_COMPANIES ||
        // Common patterns: all-caps no dots, 5–10 chars
        /^[A-Z]{2,12}$/.test(ticker.toUpperCase())
    );
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

    // ── Fetch live data in parallel ───────────────────────────────────────────
    const livePromises: Promise<Partial<FinancialMetrics>>[] = [
        // Yahoo Finance for ALL tickers (has both Indian and US stocks)
        buildYahooFinanceMetrics(t),
    ];

    // For US stocks, also try Finnhub + Alpha Vantage
    if (!isIndian) {
        livePromises.push(buildFinnhubMetrics(t));
        livePromises.push(buildAlphaVantageMetrics(t));
    }

    const [yahooData, finnhubData, avData] = await Promise.all(
        livePromises.map(p => p.catch(() => ({} as Partial<FinancialMetrics>)))
    );

    // ── Merge: base (reference) → Yahoo Finance → Finnhub → Alpha Vantage ────
    // Yahoo Finance prices are live and highly accurate
    const hasLiveData = yahooData && Object.keys(yahooData).length > 3;
    const dataSource = hasLiveData ? "live" : "mock";

    const mergedMetrics: Partial<FinancialMetrics> = {
        ...baseMetrics,
        ...(hasLiveData ? yahooData : {}),
        ...(finnhubData ? finnhubData : {}),
        // Alpha Vantage supplements revenue / FCF for US stocks
        ...(avData?.revenue ? { revenue: avData.revenue } : {}),
        ...(avData?.revenueGrowthYoY ? { revenueGrowthYoY: avData.revenueGrowthYoY } : {}),
        ...(avData?.ebitda ? { ebitda: avData.ebitda } : {}),
        ...(avData?.freeCashFlow ? { freeCashFlow: avData.freeCashFlow } : {}),
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
