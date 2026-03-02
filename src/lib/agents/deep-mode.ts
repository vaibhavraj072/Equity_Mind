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
    const cleaned = raw
      .replace(/^```(?:json)?/m, "")
      .replace(/```$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned);

    return {
      ...parsed,
      id: parsed.id || uuidv4(),
      analysisDate: parsed.analysisDate || new Date().toISOString(),
      ticker: parsed.ticker || fallbackTicker,
      userQuery: parsed.userQuery || query,
    };
  } catch {
    throw new Error("LLM returned invalid JSON.");
  }
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
  const financialContext = getFinancialContextPrompt(
    metrics,
    peerMetrics,
    dataSource
  );
  const schema = getMemoSchema();

  const contextStr =
    context && Object.keys(context).length > 0
      ? `\nUser Clarifications:\n${Object.entries(context)
          .map(([k, v]) => `- ${k}: ${v}`)
          .join("\n")}`
      : "";

  const userMessage = `
DEEP MODE FINANCIAL ANALYSIS — ${ticker}
------------------------------------------

${systemPrompt}

FINANCIAL DATA:
${financialContext}

USER QUERY:
${userQuery}

INVESTOR PROFILE:
- Risk Tolerance: ${profile.riskTolerance}
- Preferred KPIs: ${profile.preferredKPIs.join(", ")}
- Investment Horizon: ${profile.investmentHorizon}

${contextStr}

IMPORTANT:
- Use ONLY provided financial data.
- Do NOT fabricate numbers.
- If data missing, explicitly mention limitation.
- Return strictly valid JSON.

${schema}
`;

  console.log(`[deep-mode] Starting analysis for ${ticker}`);

  let memo: InvestmentMemo | null = null;

  /* ----------------------------- TRY LLM FIRST ----------------------------- */

  try {
    const raw = await callWithFallback("deep", {
      messages: [{ role: "user", content: userMessage }],
      temperature: 0.2,
      max_tokens: 2000,
    });

    memo = parseMemoJson(raw, ticker, userQuery);
    console.log("[deep-mode] LLM analysis successful.");
  } catch (err: any) {
    console.warn("[deep-mode] LLM failed. Using deterministic fallback.");
  }

  /* --------------------------- FALLBACK ANALYSIS --------------------------- */

  if (!memo) {
    memo = {
      id: uuidv4(),
      ticker,
      companyName: metrics.companyName || ticker,
      analysisDate: new Date().toISOString(),
      mode: "deep",
      userQuery,
      overallSentiment:
        metrics.revenueGrowthYoY && metrics.revenueGrowthYoY > 10
          ? "bullish"
          : "neutral",

      businessOverview: {
        summary: `${metrics.companyName || ticker} operates in ${
          metrics.sector || "its industry"
        }.`,
        coreProducts: [],
        competitiveAdvantages: [],
        managementHighlights: "",
      },

      financialPerformance: {
        summary: "Analysis derived from available financial metrics.",
        highlights: [],
        concerns: [],
        metrics,
      },

      peerComparison: [],

      bullThesis: {
        points: [
          metrics.revenueGrowthYoY && metrics.revenueGrowthYoY > 8
            ? "Strong revenue growth momentum"
            : "Stable revenue performance",
          metrics.roe && metrics.roe > 15
            ? "Healthy return on equity"
            : "Moderate capital efficiency",
        ],
        keyMetrics: [],
        catalysts: [],
      },

      bearThesis: {
        points: [
          metrics.debtToEquity && metrics.debtToEquity > 1
            ? "Elevated leverage risk"
            : "Manageable debt levels",
          "Exposure to macroeconomic volatility",
        ],
        keyMetrics: [],
        catalysts: [],
      },

      keyRisks: [
        {
          risk: "Macroeconomic slowdown impact",
          severity: "medium",
          mitigation: "",
        },
      ],

      scenarioAnalysis: {
        bull: {
          revenueGrowth: metrics.revenueGrowthYoY || 0,
          marginExpansion: 2,
          impliedValue: "N/A",
          keyDriver: "Sustained growth",
          probability: 30,
        },
        base: {
          revenueGrowth: metrics.revenueGrowthYoY || 0,
          marginExpansion: 0,
          impliedValue: "N/A",
          keyDriver: "Stable execution",
          probability: 50,
        },
        bear: {
          revenueGrowth: 2,
          marginExpansion: -2,
          impliedValue: "N/A",
          keyDriver: "Demand slowdown",
          probability: 20,
        },
        sensitivityNote: "Revenue growth and margin are primary drivers.",
      },

      valuationInsight: {
        summary: "Valuation derived from available market multiples.",
        methodology: "Relative valuation (Comps)",
        fairValueRange: "N/A",
        currentPriceVsFairValue: "fairly valued",
        note: "",
      },

      confidenceScore: {
        overall: 70,
        dataCompleteness: 70,
        sourceReliability: dataSource === "live" ? 85 : 60,
        contradictionPenalty: 0,
        label: "Medium",
        explanation:
          "Generated using deterministic fallback due to LLM unavailability.",
      },

      discrepancies: [],
      assumptions: [
        "Analysis based solely on provided financial metrics.",
      ],
      dataSourcesUsed: [
        dataSource === "live" ? "Live Financial APIs" : "Mock Data",
      ],
      nextStepsRecommended: [
        "Re-run Deep Mode when LLM quota is available for richer qualitative analysis.",
      ],
    };
  }

  /* --------------------------- CONFIDENCE SCORE ---------------------------- */

  memo.confidenceScore = calculateConfidenceScore(
    metrics,
    memo.discrepancies || [],
    dataSource
  );

  memo.mode = "deep";

  /* --------------------------- PEER AUTO-FILL ------------------------------ */

  if (!memo.peerComparison || memo.peerComparison.length === 0) {
    memo.peerComparison = peerMetrics.slice(0, 3).map((p) => ({
      ticker: p.ticker || "N/A",
      companyName: p.companyName || "Peer",
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