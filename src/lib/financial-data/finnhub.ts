import { FinancialMetrics } from "@/types";
import { config } from "@/lib/config";

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const BASE = config.finnhub.baseUrl;

async function finnhubFetch(path: string) {
    if (!FINNHUB_KEY) return null;
    try {
        const res = await fetch(`${BASE}${path}&token=${FINNHUB_KEY}`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        return res.json();
    } catch {
        return null;
    }
}

export async function getCompanyProfile(ticker: string) {
    return finnhubFetch(`/stock/profile2?symbol=${ticker}`);
}

export async function getQuote(ticker: string) {
    return finnhubFetch(`/quote?symbol=${ticker}`);
}

export async function getBasicFinancials(ticker: string) {
    return finnhubFetch(`/stock/metric?symbol=${ticker}&metric=all`);
}

export async function getEarningsCalendar(ticker: string) {
    const today = new Date().toISOString().split("T")[0];
    const future = new Date(Date.now() + 90 * 86400000).toISOString().split("T")[0];
    return finnhubFetch(`/calendar/earnings?from=${today}&to=${future}&symbol=${ticker}`);
}

export async function getCompanyNews(ticker: string) {
    const from = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const to = new Date().toISOString().split("T")[0];
    return finnhubFetch(`/company-news?symbol=${ticker}&from=${from}&to=${to}`);
}

export async function buildFinnhubMetrics(ticker: string): Promise<Partial<FinancialMetrics>> {
    const [profile, quote, metrics] = await Promise.all([
        getCompanyProfile(ticker),
        getQuote(ticker),
        getBasicFinancials(ticker),
    ]);

    if (!profile && !quote && !metrics) return {};

    const m = metrics?.metric ?? {};
    const currentPrice = quote?.c;

    return {
        ticker: ticker.toUpperCase(),
        companyName: profile?.name,
        sector: profile?.finnhubIndustry,
        industry: profile?.finnhubIndustry,
        marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1e6 : undefined,
        currentPrice,
        peRatio: m["peInclExtraTTM"],
        pbRatio: m["pbQuarterly"],
        eps: m["epsInclExtraItemsTTM"],
        fiftyTwoWeekHigh: m["52WeekHigh"],
        fiftyTwoWeekLow: m["52WeekLow"],
        beta: m["beta"],
        roe: m["roeTTM"],
        roa: m["roaTTM"],
        grossMargin: m["grossMarginTTM"],
        operatingMargin: m["operatingMarginTTM"],
        netMargin: m["netMarginTTM"],
        revenueGrowthYoY: m["revenueGrowthTTMYoy"],
        debtToEquity: m["totalDebt/totalEquityQuarterly"],
        currentRatio: m["currentRatioQuarterly"],
        dividendYield: m["dividendYieldIndicatedAnnual"],
        dataTimestamp: new Date().toISOString(),
    };
}
