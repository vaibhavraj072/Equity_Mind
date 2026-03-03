import { v4 as uuidv4 } from "uuid";

import {
  InvestmentMemo,
  UserMemoryProfile,
  FinancialMetrics,
} from "@/types";

import { callWithFallback } from "./llm-client";
import {
  getSystemPrompt,
  getFinancialContextPrompt,
  getMemoSchema,
} from "./prompts";

import { calculateConfidenceScore } from "./confidence-scorer";

/* -------------------------------------------------------------------------- */
/*                               JSON PARSER                                  */
/* -------------------------------------------------------------------------- */

function parseMemoJson(
  raw: string,
  fallbackTicker: string,
  query: string
): InvestmentMemo {
  try {
    // Strip any residual markdown fences (shouldn't appear with responseMimeType=json,
    // but kept as a safety net)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      ...parsed,
      id: parsed.id || uuidv4(),
      analysisDate: parsed.analysisDate || new Date().toISOString(),
      ticker: parsed.ticker || fallbackTicker,
      userQuery: parsed.userQuery || query,
    };
  } catch (e: any) {
    throw new Error(`LLM returned invalid JSON: ${e?.message ?? e}`);
  }
}

/* -------------------------------------------------------------------------- */
/*                           EXACT-FIGURE DATA BLOCK                          */
/* -------------------------------------------------------------------------- */

/**
 * Formats every available metric as a labelled, exact-value line.
 * This block is injected verbatim into the prompt so the LLM cannot
 * guess, estimate, or substitute different numbers.
 */
function buildExactDataBlock(
  metrics: FinancialMetrics,
  dataSource: "live" | "mock"
): string {
  const r = (v?: number, decimals = 4) =>
    v != null && isFinite(v) ? v.toFixed(decimals) : "N/A";
  const pct = (v?: number) => (v != null && isFinite(v) ? `${v.toFixed(4)}%` : "N/A");
  const cr = (v?: number) => {
    if (v == null || !isFinite(v)) return "N/A";
    if (Math.abs(v) >= 1e12) return `₹${(v / 1e12).toFixed(4)} L.Cr (${v})`;
    return `₹${(v / 1e7).toFixed(4)} Cr (${v})`;
  };

  return `
╔══════════════════════════════════════════════════════════╗
║  VERIFIED DATA BLOCK — USE THESE EXACT FIGURES ONLY     ║
║  Source: ${dataSource === "live" ? "Yahoo Finance Live API (real-time)" : "Reference Data (updated Q3 2024)"}
╚══════════════════════════════════════════════════════════╝

COMPANY IDENTIFICATION
  Ticker        : ${metrics.ticker}
  Company Name  : ${metrics.companyName}
  Exchange      : NSE / BSE (India)
  Sector        : ${metrics.sector ?? "N/A"}
  Industry      : ${metrics.industry ?? "N/A"}
  Data Timestamp: ${metrics.dataTimestamp ?? new Date().toISOString()}

PRICE & MARKET DATA (₹)
  Current Market Price (CMP)  : ₹${r(metrics.currentPrice, 2)}
  52-Week High               : ₹${r(metrics.fiftyTwoWeekHigh, 2)}
  52-Week Low                : ₹${r(metrics.fiftyTwoWeekLow, 2)}
  Market Capitalisation       : ${cr(metrics.marketCap)}
  Beta (market sensitivity)  : ${r(metrics.beta, 4)}
  Analyst Target Price        : ${metrics.analystTargetPrice ? `₹${r(metrics.analystTargetPrice, 2)}` : "N/A"}

VALUATION MULTIPLES
  Trailing P/E   : ${r(metrics.peRatio, 4)}x
  Forward P/E    : ${r(metrics.forwardPE, 4)}x
  Price-to-Book  : ${r(metrics.pbRatio, 4)}x
  Price-to-Sales : ${r(metrics.psRatio, 4)}x
  EV/EBITDA      : ${r(metrics.evToEbitda, 4)}x
  EPS (TTM)      : ₹${r(metrics.eps, 4)}

INCOME STATEMENT (₹, exact raw values)
  Revenue (TTM)          : ${cr(metrics.revenue)}
  Revenue Growth YoY     : ${pct(metrics.revenueGrowthYoY)}
  Earnings Growth YoY    : ${pct(metrics.earningsGrowthYoY)}
  Gross Profit           : ${cr(metrics.grossProfit)}
  EBITDA                 : ${cr(metrics.ebitda)}

MARGIN ANALYSIS (%)
  Gross Margin    : ${pct(metrics.grossMargin)}
  Operating Margin: ${pct(metrics.operatingMargin)}
  Net Margin      : ${pct(metrics.netMargin)}
  EBITDA Margin   : ${pct(metrics.ebitdaMargin)}

CASH FLOW (₹)
  Free Cash Flow       : ${cr(metrics.freeCashFlow)}
  FCF Yield            : ${pct(metrics.freeCashFlowYield)}
  Operating Cash Flow  : ${cr(metrics.operatingCashFlow)}

RETURNS & BALANCE SHEET
  Return on Equity (ROE)   : ${pct(metrics.roe)}
  Return on Assets (ROA)   : ${pct(metrics.roa)}
  Debt-to-Equity Ratio     : ${r(metrics.debtToEquity, 4)}x
  Current Ratio            : ${r(metrics.currentRatio, 4)}x
  Dividend Yield           : ${pct(metrics.dividendYield)}

⚠ PRECISION MANDATE:
  - You MUST use the EXACT numeric values listed above.
  - Do NOT round, approximate, or alter any figure.
  - If a field shows "N/A", state it is unavailable — do NOT invent a value.
  - All ₹ monetary values are in Indian Rupees at full precision.
`.trim();
}

/* -------------------------------------------------------------------------- */
/*                                DEEP MODE                                   */
/* -------------------------------------------------------------------------- */

export async function runDeepMode(
  ticker: string,
  userQuery: string,
  metrics: FinancialMetrics,
  peerMetrics: Partial<FinancialMetrics>[],
  profile: UserMemoryProfile,
  dataSource: "live" | "mock",
  context?: Record<string, string>
): Promise<InvestmentMemo> {
  const systemPrompt = getSystemPrompt("deep", profile);
  const financialContext = getFinancialContextPrompt(metrics, peerMetrics, dataSource);
  const schema = getMemoSchema();
  const exactDataBlock = buildExactDataBlock(metrics, dataSource);

  const contextStr =
    context && Object.keys(context).length > 0
      ? `\nUser Clarifications:\n${Object.entries(context)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join("\n")}`
      : "";

  const userMessage = `
DEEP MODE FINANCIAL ANALYSIS — ${ticker}
------------------------------------------

INVESTOR PROFILE:
- Risk Tolerance: ${profile.riskTolerance}
- Preferred KPIs: ${profile.preferredKPIs.join(", ")}
- Investment Horizon: ${profile.investmentHorizon}
- Sectors of Interest: ${profile.sectorsOfInterest.join(", ")}
- Geographic Focus: ${profile.geographicFocus.join(", ")}

USER QUERY:
${userQuery}
${contextStr}

${exactDataBlock}

SUPPLEMENTAL FINANCIAL CONTEXT (formatted, same source data):
${financialContext}

PEER DATA (use as comparison only — do not override primary metrics above):
${peerMetrics.length > 0
      ? peerMetrics.map(p =>
        `${p.ticker}: P/E=${p.peRatio?.toFixed(2) ?? "N/A"}x, RevGrowth=${p.revenueGrowthYoY?.toFixed(2) ?? "N/A"}%, ROE=${p.roe?.toFixed(2) ?? "N/A"}%, D/E=${p.debtToEquity?.toFixed(4) ?? "N/A"}x, MCap=₹${p.marketCap ? (p.marketCap / 1e7).toFixed(1) + " Cr" : "N/A"}`
      ).join("\n")
      : "No peer data available."
    }

ANALYSIS INSTRUCTIONS:
1. Use ONLY the numeric values from the VERIFIED DATA BLOCK above.
2. Every conclusion MUST cite a specific number from the data block.
3. Do NOT fabricate, round, or approximate any figure.
4. If data is marked N/A, explicitly note the limitation.
5. All monetary values are in Indian Rupees (₹). Quote them exactly as provided.
6. Sentiment must be derived from data — not opinion.
7. Return ONLY valid JSON matching the schema below. No commentary outside JSON.

${schema}
`.trim();

  console.log(`[deep-mode] Starting analysis for ${ticker} (dataSource: ${dataSource})`);
  const startMs = Date.now();

  let memo: InvestmentMemo | null = null;

  /* ─── Try LLM ─────────────────────────────────────────────────────────── */

  try {
    const raw = await callWithFallback("deep", {
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.1,   // Low temperature = factual, consistent numbers
      max_tokens: 8192,  // Enough room for the full memo JSON
    });

    memo = parseMemoJson(raw, ticker, userQuery);
    console.log(`[deep-mode] LLM analysis done in ${((Date.now() - startMs) / 1000).toFixed(1)}s`);
  } catch (err: any) {
    console.warn(`[deep-mode] LLM failed (${err?.message ?? err}). Using deterministic fallback.`);
  }

  /* ─── Deterministic fallback if LLM failed ───────────────────────────── */

  if (!memo) {
    memo = buildDeterministicMemo(ticker, userQuery, metrics, peerMetrics, dataSource);
  }

  /* ─── Always recalculate confidence with live data ───────────────────── */

  memo.confidenceScore = calculateConfidenceScore(
    metrics,
    memo.discrepancies ?? [],
    dataSource
  );

  memo.mode = "deep";

  /* ─── Auto-fill peer comparison if LLM skipped it ───────────────────── */

  if (!memo.peerComparison || memo.peerComparison.length === 0) {
    memo.peerComparison = peerMetrics.slice(0, 3).map((p) => ({
      ticker: p.ticker ?? "N/A",
      companyName: p.companyName ?? "Peer",
      peRatio: p.peRatio,
      evToEbitda: p.evToEbitda,
      revenueGrowthYoY: p.revenueGrowthYoY,
      grossMargin: p.grossMargin,
      roe: p.roe,
      debtToEquity: p.debtToEquity,
      marketCap: p.marketCap,
    }));
  }

  return memo;
}

/* -------------------------------------------------------------------------- */
/*                        DETERMINISTIC FALLBACK MEMO                         */
/* -------------------------------------------------------------------------- */

function buildDeterministicMemo(
  ticker: string,
  userQuery: string,
  metrics: FinancialMetrics,
  peerMetrics: Partial<FinancialMetrics>[],
  dataSource: "live" | "mock"
): InvestmentMemo {
  const cmp = metrics.currentPrice;
  const hi = metrics.fiftyTwoWeekHigh;
  const lo = metrics.fiftyTwoWeekLow;
  const pe = metrics.peRatio;
  const d2e = metrics.debtToEquity;
  const rev = metrics.revenueGrowthYoY;
  const roe = metrics.roe;
  const fcf = metrics.freeCashFlow;

  // Sentiment: score from key signals
  let sigScore = 0;
  if (rev != null) sigScore += rev > 10 ? 1 : rev < 0 ? -1 : 0;
  if (roe != null) sigScore += roe > 15 ? 1 : roe < 8 ? -1 : 0;
  if (d2e != null) sigScore += d2e < 1 ? 1 : d2e > 2 ? -1 : 0;
  if (fcf != null) sigScore += fcf > 0 ? 1 : -1;
  if (pe != null) sigScore += pe < 20 ? 1 : pe > 50 ? -1 : 0;

  const sentiment: "bullish" | "bearish" | "neutral" =
    sigScore >= 2 ? "bullish" : sigScore <= -2 ? "bearish" : "neutral";

  const crFmt = (v?: number) => {
    if (v == null) return "N/A";
    if (Math.abs(v) >= 1e12) return `₹${(v / 1e12).toFixed(2)} L.Cr`;
    return `₹${(v / 1e7).toFixed(2)} Cr`;
  };
  const pctFmt = (v?: number) => v != null ? `${v.toFixed(2)}%` : "N/A";
  const x = (v?: number) => v != null ? `${v.toFixed(2)}x` : "N/A";

  return {
    id: uuidv4(),
    ticker,
    companyName: metrics.companyName || ticker,
    analysisDate: new Date().toISOString(),
    mode: "deep",
    userQuery,
    overallSentiment: sentiment,

    businessOverview: {
      summary: `${metrics.companyName || ticker} is listed on NSE/BSE and operates in the ${metrics.sector ?? "Unknown"} / ${metrics.industry ?? "Unknown"} space. CMP ₹${cmp?.toFixed(2) ?? "N/A"}, Market Cap ${crFmt(metrics.marketCap)}, Revenue ${crFmt(metrics.revenue)} (${pctFmt(rev)} YoY growth).`,
      coreProducts: [metrics.sector ?? "Diversified", metrics.industry ?? "N/A"],
      competitiveAdvantages: [
        metrics.grossMargin && metrics.grossMargin > 40
          ? `High gross margin (${pctFmt(metrics.grossMargin)}) indicating pricing power`
          : `Operating margin ${pctFmt(metrics.operatingMargin)}`,
        roe && roe > 15
          ? `ROE of ${pctFmt(roe)} — above-average capital efficiency`
          : "Established market presence",
      ],
      managementHighlights: "",
    },

    financialPerformance: {
      summary: `Revenue ${crFmt(metrics.revenue)} (${pctFmt(rev)} YoY). EBITDA ${crFmt(metrics.ebitda)}, Net Margin ${pctFmt(metrics.netMargin)}. FCF ${crFmt(fcf)}.`,
      highlights: [
        ...(rev && rev > 8 ? [`Revenue growing at ${pctFmt(rev)} YoY`] : []),
        ...(roe && roe > 15 ? [`ROE of ${pctFmt(roe)} — healthy return on equity`] : []),
        ...(fcf && fcf > 0 ? [`Positive FCF of ${crFmt(fcf)}`] : []),
        ...(metrics.operatingMargin && metrics.operatingMargin > 15 ? [`Strong operating margin ${pctFmt(metrics.operatingMargin)}`] : []),
      ],
      concerns: [
        ...(d2e && d2e > 1.5 ? [`Elevated leverage: D/E ${x(d2e)}`] : []),
        ...(rev && rev < 0 ? [`Revenue declining at ${pctFmt(rev)} YoY`] : []),
        ...(pe && pe > 50 ? [`Premium valuation: P/E ${x(pe)}`] : []),
        ...(fcf && fcf < 0 ? [`Negative FCF ${crFmt(fcf)} — external financing dependency`] : []),
      ],
      metrics,
    },

    peerComparison: peerMetrics.slice(0, 3).map((p) => ({
      ticker: p.ticker ?? "N/A",
      companyName: p.companyName ?? "Peer",
      peRatio: p.peRatio,
      evToEbitda: p.evToEbitda,
      revenueGrowthYoY: p.revenueGrowthYoY,
      grossMargin: p.grossMargin,
      roe: p.roe,
      debtToEquity: p.debtToEquity,
      marketCap: p.marketCap,
    })),

    bullThesis: {
      points: [
        rev && rev > 0 ? `Revenue growth ${pctFmt(rev)} YoY — positive momentum` : "Stable revenue base",
        roe && roe > 15 ? `ROE ${pctFmt(roe)} — above Nifty 50 median` : "Capital generation capacity",
        cmp && hi ? `Trading ${(((hi - cmp) / hi) * 100).toFixed(1)}% below 52W high ₹${hi?.toFixed(2)} — potential recovery` : "Valuation consolidation phase",
      ],
      keyMetrics: [`P/E ${x(pe)}`, `ROE ${pctFmt(roe)}`, `Rev Growth ${pctFmt(rev)}`],
      catalysts: ["Q-results beat", "Sector re-rating on NSE/BSE", "Margin expansion"],
    },

    bearThesis: {
      points: [
        d2e && d2e > 1 ? `Debt/Equity ${x(d2e)} — interest-rate sensitive` : "Manageable leverage",
        pe && pe > 40 ? `Premium P/E ${x(pe)} — execution risk in slowdown` : "Valuation is reasonable",
        "Exposure to macro/regulatory headwinds in Indian market",
      ],
      keyMetrics: [`D/E ${x(d2e)}`, `Net Margin ${pctFmt(metrics.netMargin)}`],
      catalysts: ["Revenue miss", "Rising cost of capital", "Competitive pressure"],
    },

    keyRisks: [
      ...(d2e && d2e > 2 ? [{ risk: `High leverage D/E ${x(d2e)} — rate-sensitive`, severity: "high" as const }] : []),
      ...(rev && rev < 0 ? [{ risk: `Revenue declining ${pctFmt(rev)} YoY — demand headwind`, severity: "high" as const }] : []),
      ...(pe && pe > 50 ? [{ risk: `Elevated P/E ${x(pe)} — valuation risk on miss`, severity: "medium" as const }] : []),
      { risk: "Macro slowdown impact on Indian equities (RBI policy, INR/USD)", severity: "medium" as const },
    ].slice(0, 4),

    scenarioAnalysis: {
      bull: {
        revenueGrowth: Math.round((rev ?? 5) * 1.5),
        marginExpansion: 2,
        impliedValue: `N/A — run full DCF`,
        keyDriver: `Faster revenue growth + margin expansion from ${pctFmt(metrics.netMargin)} → ${((metrics.netMargin ?? 10) + 2).toFixed(1)}%`,
        probability: 30,
      },
      base: {
        revenueGrowth: Math.round(rev ?? 5),
        marginExpansion: 0,
        impliedValue: `N/A — run full DCF`,
        keyDriver: `Sustained current trajectory at CMP ₹${cmp?.toFixed(2) ?? "N/A"}`,
        probability: 50,
      },
      bear: {
        revenueGrowth: Math.max(Math.round((rev ?? 5) * 0.3), -5),
        marginExpansion: -2,
        impliedValue: `N/A — run full DCF`,
        keyDriver: "Macro headwinds reducing top-line growth + margin compression",
        probability: 20,
      },
      sensitivityNote: `Key drivers: Revenue growth (currently ${pctFmt(rev)}), Net margin (${pctFmt(metrics.netMargin)}), D/E (${x(d2e)}).`,
    },

    valuationInsight: {
      summary: pe == null
        ? `CMP ₹${cmp?.toFixed(2) ?? "N/A"} with 52W range ₹${lo?.toFixed(2) ?? "N/A"}–₹${hi?.toFixed(2) ?? "N/A"}. Insufficient data for multiple-based valuation.`
        : pe < 15
          ? `P/E ${x(pe)} is below Nifty 50 average (~22x) — potential undervaluation. CMP ₹${cmp?.toFixed(2) ?? "N/A"}.`
          : pe <= 35
            ? `P/E ${x(pe)} is within a reasonable band vs NSE peers. CMP ₹${cmp?.toFixed(2) ?? "N/A"} appears fairly valued.`
            : `Elevated P/E ${x(pe)} requires above-average growth to justify. EV/EBITDA ${x(metrics.evToEbitda)}.`,
      methodology: "NSE/BSE peer comparables (P/E, EV/EBITDA, P/B)",
      fairValueRange: "N/A — run Deep Mode with LLM for DCF target price (₹)",
      currentPriceVsFairValue:
        pe == null ? "fairly valued" : pe < 15 ? "undervalued" : pe > 35 ? "overvalued" : "fairly valued",
      note: "Deterministic fallback used — LLM was unavailable. Reload for LLM-driven analysis.",
    },

    confidenceScore: {
      overall: 60,
      dataCompleteness: 60,
      sourceReliability: dataSource === "live" ? 80 : 55,
      contradictionPenalty: 0,
      label: "Medium",
      explanation: "Generated using rule-based fallback due to LLM unavailability.",
    },

    discrepancies: [],
    assumptions: [
      "All figures sourced from verified data block — no LLM-estimated numbers.",
      "Comparisons reference Nifty 50 / NSE sectoral averages.",
    ],
    dataSourcesUsed: [
      dataSource === "live"
        ? "Yahoo Finance Live API (NSE/BSE real-time)"
        : "Reference Financial Data (NSE/BSE Q3 2024)",
    ],
    nextStepsRecommended: [
      "Re-run Deep Mode for LLM-driven qualitative analysis and DCF valuation.",
      `Review latest quarterly results (Q results / earnings) for ${ticker} on NSE`,
      `Monitor SEBI filings and institutional holding changes for ${ticker}`,
    ],
  };
}