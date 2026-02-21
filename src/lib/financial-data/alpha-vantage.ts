import { config } from "@/lib/config";

const AV_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE = config.alphaVantage.baseUrl;

async function avFetch(params: Record<string, string>) {
    if (!AV_KEY) return null;
    try {
        const searchParams = new URLSearchParams({ ...params, apikey: AV_KEY });
        const res = await fetch(`${BASE}?${searchParams}`, { next: { revalidate: 3600 } });
        if (!res.ok) return null;
        const data = await res.json();
        // AV returns "Information" key on rate limit
        if (data?.Information) return null;
        return data;
    } catch {
        return null;
    }
}

export async function getIncomeStatement(ticker: string) {
    return avFetch({ function: "INCOME_STATEMENT", symbol: ticker });
}

export async function getBalanceSheet(ticker: string) {
    return avFetch({ function: "BALANCE_SHEET", symbol: ticker });
}

export async function getCashFlow(ticker: string) {
    return avFetch({ function: "CASH_FLOW", symbol: ticker });
}

export async function getEarningsHistory(ticker: string) {
    return avFetch({ function: "EARNINGS", symbol: ticker });
}

export interface FundamentalSummary {
    revenue?: number;
    revenueGrowthYoY?: number;
    grossProfit?: number;
    operatingIncome?: number;
    netIncome?: number;
    ebitda?: number;
    totalDebt?: number;
    cashAndEquivalents?: number;
    freeCashFlow?: number;
    totalAssets?: number;
    totalEquity?: number;
    epsHistory?: Array<{ quarter: string; reported: number; estimated?: number; surprise?: number }>;
}

export async function buildAlphaVantageMetrics(ticker: string): Promise<FundamentalSummary> {
    const [income, cashflow, earnings] = await Promise.all([
        getIncomeStatement(ticker),
        getCashFlow(ticker),
        getEarningsHistory(ticker),
    ]);

    const result: FundamentalSummary = {};

    // Income statement — latest annual
    if (income?.annualReports && income.annualReports.length >= 2) {
        const latest = income.annualReports[0];
        const prior = income.annualReports[1];
        result.revenue = Number(latest.totalRevenue) || undefined;
        result.grossProfit = Number(latest.grossProfit) || undefined;
        result.operatingIncome = Number(latest.operatingIncome) || undefined;
        result.netIncome = Number(latest.netIncome) || undefined;
        result.ebitda = Number(latest.ebitda) || undefined;

        const prevRevenue = Number(prior.totalRevenue);
        if (result.revenue && prevRevenue) {
            result.revenueGrowthYoY = ((result.revenue - prevRevenue) / prevRevenue) * 100;
        }
    }

    // Cash flow — latest annual
    if (cashflow?.annualReports?.length > 0) {
        const cf = cashflow.annualReports[0];
        const capex = Number(cf.capitalExpenditures) || 0;
        const ocf = Number(cf.operatingCashflow) || 0;
        result.freeCashFlow = ocf - Math.abs(capex);
    }

    // Earnings history (quarterly)
    if (earnings?.quarterlyEarnings?.length > 0) {
        result.epsHistory = earnings.quarterlyEarnings.slice(0, 8).map((e: Record<string, string>) => ({
            quarter: e.fiscalDateEnding,
            reported: Number(e.reportedEPS),
            estimated: Number(e.estimatedEPS),
            surprise: Number(e.surprisePercentage),
        }));
    }

    return result;
}
