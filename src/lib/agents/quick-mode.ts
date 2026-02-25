/**
 * QUICK MODE — Pure algorithmic analysis. No LLM API call. <1 second.
 *
 * Derives the full InvestmentMemo directly from financial metrics using
 * rule-based signal scoring. This guarantees:
 *   ✓ Sub-second response (no network call)
 *   ✓ Zero rate-limit risk
 *   ✓ Consistent, reproducible output
 *   ✓ Data-driven conclusions with cited numbers
 *
 * Deep Mode uses the LLM for nuanced reasoning. Quick Mode is pure speed.
 */

import { v4 as uuidv4 } from "uuid";
import { InvestmentMemo, UserMemoryProfile, FinancialMetrics } from "@/types";
import { calculateConfidenceScore } from "./confidence-scorer";
// No external imports needed — quick mode is fully algorithmic

// ── Helper utilities ──────────────────────────────────────────────────────────
const pct = (n?: number) => n != null ? `${n.toFixed(1)}%` : "N/A";
const px = (n?: number) => n != null ? `${n.toFixed(1)}x` : "N/A";
const usd = (n?: number) => n != null ? `$${n.toFixed(2)}` : "N/A";
const bil = (n?: number) => n != null ? `$${(n / 1e9).toFixed(1)}B` : "N/A";

// ── Signal scoring — returns -1 (bearish), 0 (neutral), +1 (bullish) ─────────
function score(value: number | undefined, low: number, high: number): -1 | 0 | 1 {
    if (value == null) return 0;
    if (value >= high) return 1;
    if (value <= low) return -1;
    return 0;
}

interface Signal { label: string; value: string; score: -1 | 0 | 1 }

function buildSignals(m: FinancialMetrics): Signal[] {
    return [
        { label: `Revenue growth ${pct(m.revenueGrowthYoY)} YoY`, value: pct(m.revenueGrowthYoY), score: score(m.revenueGrowthYoY, 5, 20) },
        { label: `Gross margin ${pct(m.grossMargin)}`, value: pct(m.grossMargin), score: score(m.grossMargin, 20, 50) },
        { label: `Operating margin ${pct(m.operatingMargin)}`, value: pct(m.operatingMargin), score: score(m.operatingMargin, 5, 20) },
        { label: `Net margin ${pct(m.netMargin)}`, value: pct(m.netMargin), score: score(m.netMargin, 3, 15) },
        { label: `ROE ${pct(m.roe)}`, value: pct(m.roe), score: score(m.roe, 8, 20) },
        { label: `Free cash flow ${bil(m.freeCashFlow)}`, value: bil(m.freeCashFlow), score: m.freeCashFlow != null ? (m.freeCashFlow > 0 ? 1 : -1) : 0 },
        { label: `P/E ratio ${px(m.peRatio)}`, value: px(m.peRatio), score: score(m.peRatio, 0, 35) === 1 ? -1 : score(m.peRatio, 5, 35) },
        { label: `Debt/Equity ${px(m.debtToEquity)}`, value: px(m.debtToEquity), score: score(m.debtToEquity, 0, 1) === 1 ? 1 : score(m.debtToEquity, 0, 2) },
        { label: `Current ratio ${px(m.currentRatio)}`, value: px(m.currentRatio), score: score(m.currentRatio, 1.0, 2.0) },
        { label: `EV/EBITDA ${px(m.evToEbitda)}`, value: px(m.evToEbitda), score: score(m.evToEbitda, 0, 20) === 1 ? -1 : score(m.evToEbitda, 5, 20) },
    ];
}

function deriveOverallSentiment(signals: Signal[]): "bullish" | "bearish" | "neutral" {
    const total = signals.reduce((acc, s) => acc + s.score, 0);
    if (total >= 3) return "bullish";
    if (total <= -3) return "bearish";
    return "neutral";
}

// ── Build bull thesis points from positive signals ────────────────────────────
function buildBullPoints(m: FinancialMetrics, signals: Signal[]): string[] {
    const pts: string[] = [];
    const positive = signals.filter(s => s.score === 1).map(s => s.label);
    pts.push(...positive.slice(0, 3));

    if (m.dividendYield && m.dividendYield > 1)
        pts.push(`Dividend yield of ${pct(m.dividendYield)} provides income cushion`);
    if (m.freeCashFlowYield && m.freeCashFlowYield > 3)
        pts.push(`Strong FCF yield of ${pct(m.freeCashFlowYield)} indicates cash generation`);
    if (m.currentPrice && m.fiftyTwoWeekLow && m.currentPrice < m.fiftyTwoWeekHigh! * 0.85)
        pts.push(`Trades ${((1 - m.currentPrice / m.fiftyTwoWeekHigh!) * 100).toFixed(0)}% below 52-week high — potential mean-reversion`);

    return pts.length ? pts : ["Requires deeper analysis — run Deep Mode for full thesis"];
}

// ── Build bear thesis points from negative signals ────────────────────────────
function buildBearPoints(m: FinancialMetrics, signals: Signal[]): string[] {
    const pts: string[] = [];
    const negative = signals.filter(s => s.score === -1).map(s => s.label);
    pts.push(...negative.slice(0, 3));

    if (m.beta && m.beta > 1.5)
        pts.push(`Beta of ${m.beta.toFixed(2)} indicates high market sensitivity`);
    if (m.debtToEquity && m.debtToEquity > 1.5)
        pts.push(`Elevated D/E of ${px(m.debtToEquity)} raises refinancing risk`);

    return pts.length ? pts : ["Valuation appears reasonable relative to sector"];
}

// ── Key risks ─────────────────────────────────────────────────────────────────
function buildKeyRisks(m: FinancialMetrics): Array<{ risk: string; severity: "high" | "medium" | "low"; mitigation?: string }> {
    const risks: Array<{ risk: string; severity: "high" | "medium" | "low"; mitigation?: string }> = [];

    if (m.debtToEquity && m.debtToEquity > 2)
        risks.push({ risk: `High leverage (D/E: ${px(m.debtToEquity)}) — interest rate sensitive`, severity: "high" });
    if (m.revenueGrowthYoY != null && m.revenueGrowthYoY < 0)
        risks.push({ risk: `Revenue declining ${pct(m.revenueGrowthYoY)} YoY — demand headwinds`, severity: "high" });
    if (m.peRatio && m.peRatio > 50)
        risks.push({ risk: `Elevated valuation (P/E: ${px(m.peRatio)}) leaves little room for misses`, severity: "medium" });
    if (m.freeCashFlow != null && m.freeCashFlow < 0)
        risks.push({ risk: `Negative free cash flow — depends on external financing`, severity: "medium" });
    if (m.beta && m.beta > 1.5)
        risks.push({ risk: `High beta (${m.beta.toFixed(2)}) — volatile in market downturns`, severity: "medium" });
    if (m.currentRatio && m.currentRatio < 1)
        risks.push({ risk: `Low current ratio (${px(m.currentRatio)}) — near-term liquidity risk`, severity: "high" });

    if (!risks.length)
        risks.push({ risk: "No immediate red flags — standard sector and macro risks apply", severity: "low" });

    return risks.slice(0, 3);
}

// ── Valuation insight ─────────────────────────────────────────────────────────
function buildValuationInsight(m: FinancialMetrics): InvestmentMemo["valuationInsight"] {
    const pe = m.peRatio;
    let summary = "";
    let valued: "undervalued" | "fairly valued" | "overvalued" = "fairly valued";

    if (pe == null) {
        summary = `Limited valuation data available. Current price ${usd(m.currentPrice)}, 52W range ${usd(m.fiftyTwoWeekLow)}–${usd(m.fiftyTwoWeekHigh)}.`;
    } else if (pe < 12) {
        summary = `P/E of ${px(pe)} is below typical market multiples, suggesting potential undervaluation relative to peers.`;
        valued = "undervalued";
    } else if (pe <= 30) {
        summary = `P/E of ${px(pe)} is within a reasonable range. Current price ${usd(m.currentPrice)} appears fairly valued vs fundamentals.`;
        valued = "fairly valued";
    } else {
        summary = `Elevated P/E of ${px(pe)} implies premium valuation — requires above-average growth to justify. Check EV/EBITDA (${px(m.evToEbitda)}) for confirmation.`;
        valued = "overvalued";
    }

    return {
        summary,
        methodology: "Comparable multiples (P/E, EV/EBITDA, P/S)",
        fairValueRange: "N/A — run Deep Mode for price target",
        currentPriceVsFairValue: valued,
        note: "Quick scan uses trailing multiples only. Enable Deep Mode for DCF-based fair value.",
    };
}

// ── Business overview ─────────────────────────────────────────────────────────
function buildBusinessOverview(m: FinancialMetrics, query: string): InvestmentMemo["businessOverview"] {
    const rev = m.revenue ? `Revenue ${bil(m.revenue)} ` : "";
    const mcap = m.marketCap ? `with ${bil(m.marketCap)} market cap. ` : ". ";
    const growth = m.revenueGrowthYoY != null ? `Revenue grew ${pct(m.revenueGrowthYoY)} YoY. ` : "";
    const margin = m.netMargin != null ? `Net margin stands at ${pct(m.netMargin)}.` : "";

    return {
        summary: `${m.companyName} operates in the ${m.sector}/${m.industry} space. ${rev}${mcap}${growth}${margin}`,
        coreProducts: [m.sector || "Diversified", m.industry || "N/A"],
        competitiveAdvantages: [
            m.grossMargin && m.grossMargin > 40 ? `High gross margin (${pct(m.grossMargin)}) indicates pricing power` : `Operating in ${m.industry || "competitive"} sector`,
            m.roe && m.roe > 15 ? `Strong ROE of ${pct(m.roe)} suggests efficient capital allocation` : "Established market position",
        ],
        managementHighlights: query || undefined,
    };
}

// ── Scenario analysis (simple, number-based) ──────────────────────────────────
function buildScenarioAnalysis(m: FinancialMetrics): InvestmentMemo["scenarioAnalysis"] {
    const baseGrowth = m.revenueGrowthYoY ?? 5;
    return {
        bull: {
            revenueGrowth: Math.round(baseGrowth * 1.5),
            marginExpansion: 2,
            impliedValue: "N/A — run Deep Mode",
            keyDriver: "Faster-than-expected revenue growth + margin expansion",
            probability: 30,
        },
        base: {
            revenueGrowth: Math.round(baseGrowth),
            marginExpansion: 0,
            impliedValue: "N/A — run Deep Mode",
            keyDriver: "Sustained current growth trajectory",
            probability: 50,
        },
        bear: {
            revenueGrowth: Math.round(baseGrowth * 0.3),
            marginExpansion: -2,
            impliedValue: "N/A — run Deep Mode",
            keyDriver: "Macro headwinds or increased competition",
            probability: 20,
        },
        sensitivityNote: "Scenario assumes current cost structure and no major M&A.",
    };
}

// ── Financial performance summary ─────────────────────────────────────────────
function buildFinancialPerformance(
    m: FinancialMetrics,
    signals: Signal[],
): InvestmentMemo["financialPerformance"] {
    const highlights = signals.filter(s => s.score === 1).map(s => s.label);
    const concerns = signals.filter(s => s.score === -1).map(s => s.label);

    const rev = m.revenue ? `Revenue ${bil(m.revenue)} ` : "";
    const growth = m.revenueGrowthYoY != null ? `(${pct(m.revenueGrowthYoY)} YoY growth), ` : "";
    const ebitda = m.ebitda ? `EBITDA ${bil(m.ebitda)}, ` : "";
    const margin = m.netMargin != null ? `net margin ${pct(m.netMargin)}.` : "";
    const fcf = m.freeCashFlow != null ? ` FCF: ${bil(m.freeCashFlow)}.` : "";

    return {
        summary: `${rev}${growth}${ebitda}${margin}${fcf}`,
        highlights: highlights.slice(0, 4),
        concerns: concerns.slice(0, 3),
        metrics: m as unknown as Record<string, unknown>,
    };
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────────────
export async function runQuickMode(
    ticker: string,
    userQuery: string,
    metrics: FinancialMetrics,
    profile: UserMemoryProfile,
    dataSource: "live" | "mock"
): Promise<InvestmentMemo> {
    // ── 1. Build all signals from raw numbers ─────────────────────────────────
    const signals = buildSignals(metrics);
    const sentiment = deriveOverallSentiment(signals);
    const bullPts = buildBullPoints(metrics, signals);
    const bearPts = buildBearPoints(metrics, signals);
    const risks = buildKeyRisks(metrics);

    // ── 2. Assemble the full InvestmentMemo ───────────────────────────────────
    const memo: InvestmentMemo = {
        id: uuidv4(),
        ticker: ticker.toUpperCase(),
        companyName: metrics.companyName || ticker,
        analysisDate: new Date().toISOString(),
        mode: "quick",
        userQuery,
        overallSentiment: sentiment,

        businessOverview: buildBusinessOverview(metrics, userQuery),
        financialPerformance: buildFinancialPerformance(metrics, signals),

        peerComparison: [],   // Deep Mode handles peer comparison

        bullThesis: {
            points: bullPts,
            keyMetrics: signals.filter(s => s.score === 1).slice(0, 2).map(s => s.label),
            catalysts: ["Earnings beat next quarter", "Sector re-rating", "Margin expansion"],
        },
        bearThesis: {
            points: bearPts,
            keyMetrics: signals.filter(s => s.score === -1).slice(0, 2).map(s => s.label),
            catalysts: ["Revenue miss", "Rising interest rates", "Competitive pressure"],
        },

        keyRisks: risks,
        scenarioAnalysis: buildScenarioAnalysis(metrics),
        valuationInsight: buildValuationInsight(metrics),

        confidenceScore: calculateConfidenceScore(metrics, [], dataSource),

        discrepancies: [],
        assumptions: [
            "Based on latest available financial data",
            "Uses trailing twelve months (TTM) figures",
            "Run Deep Mode for forward-looking analysis and peer benchmarking",
        ],
        dataSourcesUsed: dataSource === "live"
            ? ["Finnhub", "Alpha Vantage", "Live Market Data"]
            : ["Reference Financial Data"],
        nextStepsRecommended: [
            "Run Deep Mode for comprehensive DCF valuation and peer comparison",
            `Review latest earnings call for ${ticker}`,
            `Check sector trends for ${metrics.sector || "the sector"}`,
        ],
    };

    return memo;
}
