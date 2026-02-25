/**
 * Yahoo Finance data provider for Indian NSE/BSE stocks.
 *
 * Uses Yahoo Finance's free public JSON API — no API key required.
 * NSE stocks: append ".NS" (e.g., TCS.NS, RELIANCE.NS)
 * BSE stocks: append ".BO" (e.g., TCS.BO)
 *
 * Returns a Partial<FinancialMetrics> merged into the main financial profile.
 */

import { FinancialMetrics } from "@/types";

const YF_BASE = "https://query1.finance.yahoo.com";
const TIMEOUT = 8000; // 8 s timeout

// Map NSE ticker → Yahoo Finance symbol
function toYahooSymbol(ticker: string): string {
    const t = ticker.toUpperCase();
    // Already has exchange suffix
    if (t.includes(".NS") || t.includes(".BO") || t.includes(".")) return t;
    // Known multi-word tickers that need special treatment — handled by fallback
    return `${t}.NS`;
}

interface YFQuoteModule {
    regularMarketPrice?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    marketCap?: number;
    trailingPE?: number;
    forwardPE?: number;
    priceToBook?: number;
    beta?: number;
    dividendYield?: number;
    shortName?: string;
    longName?: string;
    sector?: string;
    industry?: string;
    trailingEps?: number;
    priceToSalesTrailing12Months?: number;
}

interface YFFinancialModule {
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
    revenueGrowth?: { raw: number };
    earningsGrowth?: { raw: number };
    totalDebt?: { raw: number };
    enterpriseToEbitda?: { raw: number };
    ebitda?: { raw: number };
}

async function fetchYahooSummary(symbol: string): Promise<{
    quote: YFQuoteModule;
    financial: YFFinancialModule;
} | null> {
    const modules = "summaryDetail,financialData,defaultKeyStatistics,assetProfile,price";
    const url = `${YF_BASE}/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;

    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
            signal: AbortSignal.timeout(TIMEOUT),
        });

        if (!res.ok) return null;
        const data = await res.json();
        const result = data?.quoteSummary?.result?.[0];
        if (!result) return null;

        const price = result.price ?? {};
        const summary = result.summaryDetail ?? {};
        const keyStats = result.defaultKeyStatistics ?? {};
        const financials = result.financialData ?? {};
        const profile = result.assetProfile ?? {};

        const quote: YFQuoteModule = {
            regularMarketPrice: price.regularMarketPrice?.raw ?? summary.previousClose?.raw,
            fiftyTwoWeekHigh: summary.fiftyTwoWeekHigh?.raw,
            fiftyTwoWeekLow: summary.fiftyTwoWeekLow?.raw,
            marketCap: price.marketCap?.raw ?? summary.marketCap?.raw,
            trailingPE: summary.trailingPE?.raw ?? keyStats.trailingPE?.raw,
            forwardPE: summary.forwardPE?.raw,
            priceToBook: keyStats.priceToBook?.raw,
            beta: summary.beta?.raw,
            dividendYield: summary.dividendYield?.raw,
            shortName: price.shortName,
            longName: price.longName,
            sector: profile.sector,
            industry: profile.industry,
            trailingEps: keyStats.trailingEps?.raw,
            priceToSalesTrailing12Months: summary.priceToSalesTrailing12Months?.raw,
        };

        const financial: YFFinancialModule = {
            totalRevenue: financials.totalRevenue,
            grossProfits: financials.grossProfits,
            operatingCashflow: financials.operatingCashflow,
            freeCashflow: financials.freeCashflow,
            returnOnEquity: financials.returnOnEquity,
            returnOnAssets: financials.returnOnAssets,
            currentRatio: financials.currentRatio,
            debtToEquity: financials.debtToEquity,
            operatingMargins: financials.operatingMargins,
            profitMargins: financials.profitMargins,
            grossMargins: financials.grossMargins,
            revenueGrowth: financials.revenueGrowth,
            earningsGrowth: financials.earningsGrowth,
            totalDebt: financials.totalDebt,
            enterpriseToEbitda: keyStats.enterpriseToEbitda,
            ebitda: financials.ebitda,
        };

        return { quote, financial };
    } catch {
        return null;
    }
}

export async function buildYahooFinanceMetrics(
    ticker: string
): Promise<Partial<FinancialMetrics>> {
    const symbol = toYahooSymbol(ticker);
    console.log(`[yahoo-finance] Fetching ${symbol}...`);

    const data = await fetchYahooSummary(symbol);
    if (!data) {
        // Try .BO (BSE) as fallback if .NS fails
        if (symbol.endsWith(".NS")) {
            const bsoSymbol = symbol.replace(".NS", ".BO");
            console.log(`[yahoo-finance] .NS failed, trying ${bsoSymbol}...`);
            const bsoData = await fetchYahooSummary(bsoSymbol);
            if (!bsoData) {
                console.warn(`[yahoo-finance] No data for ${ticker}`);
                return {};
            }
            return extractMetrics(ticker, bsoData);
        }
        return {};
    }

    return extractMetrics(ticker, data);
}

function extractMetrics(
    ticker: string,
    { quote, financial }: { quote: YFQuoteModule; financial: YFFinancialModule }
): Partial<FinancialMetrics> {
    const rev = financial.totalRevenue?.raw;
    const grossProfit = financial.grossProfits?.raw;
    const grossMarginCalc = rev && grossProfit ? (grossProfit / rev) * 100 : undefined;

    const result: Partial<FinancialMetrics> = {
        ticker: ticker.toUpperCase(),
        companyName: quote.longName || quote.shortName || `${ticker.toUpperCase()} Ltd`,
        sector: quote.sector || undefined,
        industry: quote.industry || undefined,
        currentPrice: quote.regularMarketPrice,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        pbRatio: quote.priceToBook,
        psRatio: quote.priceToSalesTrailing12Months,
        evToEbitda: financial.enterpriseToEbitda?.raw,
        eps: quote.trailingEps,
        beta: quote.beta,
        dividendYield: quote.dividendYield ? quote.dividendYield * 100 : undefined,
        revenue: rev,
        ebitda: financial.ebitda?.raw,
        grossMargin: financial.grossMargins?.raw
            ? financial.grossMargins.raw * 100
            : grossMarginCalc,
        operatingMargin: financial.operatingMargins?.raw
            ? financial.operatingMargins.raw * 100
            : undefined,
        netMargin: financial.profitMargins?.raw
            ? financial.profitMargins.raw * 100
            : undefined,
        revenueGrowthYoY: financial.revenueGrowth?.raw
            ? financial.revenueGrowth.raw * 100
            : undefined,
        roe: financial.returnOnEquity?.raw
            ? financial.returnOnEquity.raw * 100
            : undefined,
        roa: financial.returnOnAssets?.raw
            ? financial.returnOnAssets.raw * 100
            : undefined,
        debtToEquity: financial.debtToEquity?.raw
            ? financial.debtToEquity.raw / 100   // YF returns as %, convert to ratio
            : undefined,
        currentRatio: financial.currentRatio?.raw,
        freeCashFlow: financial.freeCashflow?.raw,
    };

    // Remove undefined values
    return Object.fromEntries(
        Object.entries(result).filter(([, v]) => v !== undefined && v !== null && !isNaN(v as number))
    ) as Partial<FinancialMetrics>;
}
