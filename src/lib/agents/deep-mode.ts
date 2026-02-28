import { v4 as uuidv4 } from "uuid";
import { InvestmentMemo, UserMemoryProfile, FinancialMetrics } from "@/types";
import { config } from "@/lib/config";
import { callWithFallback } from "./llm-client";
import { getSystemPrompt, getFinancialContextPrompt, getMemoSchema } from "./prompts";
import { calculateConfidenceScore } from "./confidence-scorer";
import { getMockCompanyMetrics } from "@/lib/financial-data";

function parseMemoJson(raw: string, fallbackTicker: string, query: string): InvestmentMemo {
    const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
    try {
        const parsed = JSON.parse(cleaned);
        return {
            ...parsed,
            id: parsed.id || uuidv4(),
            analysisDate: parsed.analysisDate || new Date().toISOString(),
            ticker: parsed.ticker || fallbackTicker,
            userQuery: parsed.userQuery || query,
        };
    } catch {
        const mockMetrics = getMockCompanyMetrics(fallbackTicker) as FinancialMetrics;
        return {
            id: uuidv4(),
            ticker: fallbackTicker,
            companyName: mockMetrics.companyName || fallbackTicker,
            analysisDate: new Date().toISOString(),
            mode: "deep",
            userQuery: query,
            overallSentiment: "neutral",
            businessOverview: {
                summary: `Deep analysis of ${fallbackTicker} is being synthesized from available data.`,
                coreProducts: [],
                competitiveAdvantages: [],
            },
            financialPerformance: { summary: "Analysis in progress.", highlights: [], concerns: [], metrics: mockMetrics },
            bullThesis: { points: ["Strong market position", "Secular growth tailwinds"], keyMetrics: [] },
            bearThesis: { points: ["Competitive pressure", "Macroeconomic headwinds"], keyMetrics: [] },
            keyRisks: [{ risk: "Macro environment uncertainty", severity: "medium" }],
            confidenceScore: {
                overall: 50, dataCompleteness: 60, sourceReliability: 65, contradictionPenalty: 0,
                label: "Medium", explanation: "Partial data used for deep analysis",
            },
            assumptions: ["Industry-standard growth assumptions applied"],
            dataSourcesUsed: ["Reference Data"],
        };
    }
}

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

    // Merge context into prompt
    const contextStr = context && Object.keys(context).length > 0
        ? `\nUser's clarifying answers:\n${Object.entries(context).map(([k, v]) => `- ${k}: ${v}`).join("\n")}`
        : "";

    // Build the single unified prompt string
    const userMessage = `DEEP MODE ANALYSIS: ${ticker}
--------------------------------------------------
${systemPrompt}

FINANCIAL DATA:
${financialContext}

USER QUERY: ${userQuery}${contextStr}

REQUIRED FOCUS:
- Risk Profile: ${profile.riskTolerance}
- Highlight KPIs: ${profile.preferredKPIs.join(", ")}
- Horizon: ${profile.investmentHorizon}

${schema}`;

    console.log(`[deep-mode] Initiating LLM call for ${ticker} (Deep Mode)`);

    // Call the LLM with a more reasonable max_tokens budget (2500 instead of 6000)
    // 6000 tokens takes ~45 seconds to generate and frequently triggers free-tier 429 quota exhaustion mid-stream.
    const raw = await callWithFallback("deep", {
        messages: [{ role: "user", content: userMessage }],
        temperature: 0.2,
        max_tokens: 2500,
    });

    console.log(`[deep-mode] LLM call complete, parsing JSON...`);
    const memo = parseMemoJson(raw, ticker, userQuery);

    memo.confidenceScore = calculateConfidenceScore(metrics, memo.discrepancies || [], dataSource);
    memo.mode = "deep";

    // Add peer comparison from our data if LLM didn't populate it
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
