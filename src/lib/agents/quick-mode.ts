import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { InvestmentMemo, UserMemoryProfile, FinancialMetrics } from "@/types";
import { config } from "@/lib/config";
import { getSystemPrompt, getFinancialContextPrompt, getMemoSchema } from "./prompts";
import { calculateConfidenceScore } from "./confidence-scorer";
import { getMockCompanyMetrics } from "@/lib/financial-data";

const client = new OpenAI({
    baseURL: config.openRouter.baseUrl,
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": config.openRouter.siteUrl,
        "X-Title": config.openRouter.siteName,
    },
});

function parseMemoJson(raw: string, fallbackTicker: string, query: string): InvestmentMemo {
    // Strip markdown code fences if present
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
        // Return minimal fallback memo if JSON parsing fails
        const mockMetrics = getMockCompanyMetrics(fallbackTicker) as FinancialMetrics;
        return createFallbackMemo(fallbackTicker, query, mockMetrics);
    }
}

function createFallbackMemo(ticker: string, query: string, metrics: FinancialMetrics): InvestmentMemo {
    return {
        id: uuidv4(),
        ticker,
        companyName: metrics.companyName || ticker,
        analysisDate: new Date().toISOString(),
        mode: "quick",
        userQuery: query,
        overallSentiment: "neutral",
        businessOverview: {
            summary: `${metrics.companyName || ticker} is a company in the ${metrics.sector || "unknown"} sector.`,
            coreProducts: [],
            competitiveAdvantages: [],
        },
        financialPerformance: {
            summary: "Financial data analysis in progress.",
            highlights: [],
            concerns: [],
            metrics,
        },
        bullThesis: { points: ["Solid market position", "Revenue growth potential"], keyMetrics: [] },
        bearThesis: { points: ["Market competition risks", "Valuation concerns"], keyMetrics: [] },
        keyRisks: [{ risk: "Market competition", severity: "medium" }],
        confidenceScore: {
            overall: 45, dataCompleteness: 50, sourceReliability: 65, contradictionPenalty: 0,
            label: "Medium", explanation: "Partial data available",
        },
        assumptions: ["Based on available data"],
        dataSourcesUsed: ["Reference Data"],
    };
}

export async function runQuickMode(
    ticker: string,
    userQuery: string,
    metrics: FinancialMetrics,
    profile: UserMemoryProfile,
    dataSource: "live" | "mock"
): Promise<InvestmentMemo> {
    const systemPrompt = getSystemPrompt("quick", profile);
    const financialContext = getFinancialContextPrompt(metrics, [], dataSource);
    const schema = getMemoSchema();

    const userMessage = `Analyze ${ticker} in QUICK MODE.
  
Financial Data:
${financialContext}

User Query: ${userQuery}

${schema}`;

    const completion = await client.chat.completions.create({
        model: config.models.quick,
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 3000,
    });

    const raw = completion.choices[0]?.message?.content || "";
    const memo = parseMemoJson(raw, ticker, userQuery);

    // Recalculate confidence with our own scorer
    memo.confidenceScore = calculateConfidenceScore(metrics, memo.discrepancies || [], dataSource);
    memo.mode = "quick";

    return memo;
}
