import { FinancialMetrics } from "@/types";
import { buildFinnhubMetrics } from "./finnhub";
import { buildAlphaVantageMetrics } from "./alpha-vantage";

// ---- Mock data for when APIs are unavailable ----
const MOCK_COMPANIES: Record<string, Partial<FinancialMetrics>> = {
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
        freeCashFlow: 72_800_000_000, freeCashFlowYield: 3.3, dividendYield: 0.0,
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

const DEFAULT_PEERS: Record<string, string[]> = {
    AAPL: ["MSFT", "GOOGL", "META"],
    MSFT: ["AAPL", "GOOGL", "AMZN"],
    GOOGL: ["META", "MSFT", "AMZN"],
    NVDA: ["AMD", "INTC", "AVGO"],
    TSLA: ["GM", "F", "RIVN"],
    JNJ: ["PFE", "ABBV", "MRK"],
    META: ["GOOGL", "SNAP", "PINS"],
};

function getMockMetrics(ticker: string): Partial<FinancialMetrics> {
    const t = ticker.toUpperCase();
    if (MOCK_COMPANIES[t]) return MOCK_COMPANIES[t];
    // Generic fallback for unknown tickers
    return {
        ticker: t,
        companyName: `${t} Corporation`,
        sector: "Unknown",
        industry: "Unknown",
        marketCap: 10_000_000_000,
        currentPrice: 100.0,
        peRatio: 20.0,
        revenueGrowthYoY: 8.0,
        grossMargin: 40.0,
        netMargin: 10.0,
        roe: 15.0,
        debtToEquity: 0.5,
    };
}

export async function getFinancialProfile(ticker: string): Promise<{
    metrics: FinancialMetrics;
    defaultPeers: string[];
    dataSource: "live" | "mock";
}> {
    const [finnhubData, avData] = await Promise.all([
        buildFinnhubMetrics(ticker),
        buildAlphaVantageMetrics(ticker),
    ]);

    const hasLiveData = Object.keys(finnhubData).length > 3;

    let baseMetrics: Partial<FinancialMetrics>;
    if (hasLiveData) {
        baseMetrics = {
            ...getMockMetrics(ticker),
            ...finnhubData,
            revenue: avData.revenue ?? undefined,
            revenueGrowthYoY: avData.revenueGrowthYoY ?? finnhubData.revenueGrowthYoY,
            ebitda: avData.ebitda ?? undefined,
            freeCashFlow: avData.freeCashFlow ?? undefined,
        };
    } else {
        baseMetrics = getMockMetrics(ticker);
    }

    const metrics: FinancialMetrics = {
        ticker: baseMetrics.ticker ?? ticker.toUpperCase(),
        companyName: baseMetrics.companyName ?? `${ticker.toUpperCase()} Corp`,
        sector: baseMetrics.sector ?? "Unknown",
        industry: baseMetrics.industry ?? "Unknown",
        ...baseMetrics,
        dataTimestamp: new Date().toISOString(),
    };

    return {
        metrics,
        defaultPeers: DEFAULT_PEERS[ticker.toUpperCase()] ?? [],
        dataSource: hasLiveData ? "live" : "mock",
    };
}

export { getMockMetrics as getMockCompanyMetrics };
