import { UserMemoryProfile, FinancialMetrics, ResearchMode } from "@/types";

export function getSystemPrompt(mode: ResearchMode, profile: UserMemoryProfile): string {
    const kpiStr = profile.preferredKPIs.join(", ");
    const sectorsStr = profile.sectorsOfInterest.join(", ");
    const personalization = `
User Profile:
- Risk Tolerance: ${profile.riskTolerance}
- Preferred KPIs: ${kpiStr}
- Sectors of Interest: ${sectorsStr}
- Investment Horizon: ${profile.investmentHorizon}
- Geographic Focus: ${profile.geographicFocus.join(", ")}
`.trim();

    if (mode === "quick") {
        return `You are EquityMind AI, a senior equity research analyst. Your task is to produce a QUICK MODE analysis — a rapid, structured financial snapshot.

${personalization}

QUICK MODE RULES:
1. Prioritize the user's preferred KPIs: ${kpiStr}
2. Be concise but precise — no filler text
3. Lead with numbers and specific evidence
4. Flag any obvious red flags or standout positives
5. End with a 1-sentence investment takeaway

Structure your response as a valid JSON object matching the InvestmentMemo schema exactly.
Motto: Explain. Compare. Justify.`;
    }

    return `You are EquityMind AI, a senior equity research analyst with 20+ years at a top-tier investment bank.

${personalization}

DEEP MODE RULES:
1. Perform comprehensive fundamental analysis
2. Build a rigorous bull thesis AND bear thesis with supporting evidence
3. Compare against 2-3 industry peers using specific metrics
4. Run scenario analysis (bull/base/bear) with explicit assumptions
5. Detect and flag contradictions between management commentary and reported results
6. Highlight risks the user's risk tolerance profile should be most concerned about
7. Every major conclusion must cite specific numbers
8. Assign a confidence score based on data completeness and source reliability

Structure your response as a valid JSON object matching the InvestmentMemo schema exactly.
Philosophy: Explain every assumption. Compare to peers. Justify every conclusion.`;
}

export function getFinancialContextPrompt(
    metrics: FinancialMetrics,
    peerMetrics?: Partial<FinancialMetrics>[],
    dataSource: "live" | "mock" = "mock"
): string {
    const formatNum = (n?: number, prefix = "", suffix = "") =>
        n != null ? `${prefix}${n.toLocaleString()}${suffix}` : "N/A";

    const metricsStr = `
COMPANY: ${metrics.companyName} (${metrics.ticker})
Sector: ${metrics.sector} | Industry: ${metrics.industry}
Data Source: ${dataSource === "live" ? "Live API" : "Reference Data (mock)"}

--- VALUATION ---
Current Price: ${formatNum(metrics.currentPrice, "$")}
Market Cap: ${metrics.marketCap ? `$${(metrics.marketCap / 1e9).toFixed(1)}B` : "N/A"}
P/E Ratio: ${formatNum(metrics.peRatio, "", "x")}
P/B Ratio: ${formatNum(metrics.pbRatio, "", "x")}
P/S Ratio: ${formatNum(metrics.psRatio, "", "x")}
EV/EBITDA: ${formatNum(metrics.evToEbitda, "", "x")}
EPS: ${formatNum(metrics.eps, "$")}
52-Week High: ${formatNum(metrics.fiftyTwoWeekHigh, "$")}
52-Week Low: ${formatNum(metrics.fiftyTwoWeekLow, "$")}
Beta: ${formatNum(metrics.beta)}

--- PROFITABILITY ---
Revenue: ${metrics.revenue ? `$${(metrics.revenue / 1e9).toFixed(1)}B` : "N/A"}
Revenue Growth YoY: ${formatNum(metrics.revenueGrowthYoY, "", "%")}
Gross Margin: ${formatNum(metrics.grossMargin, "", "%")}
Operating Margin: ${formatNum(metrics.operatingMargin, "", "%")}
Net Margin: ${formatNum(metrics.netMargin, "", "%")}
EBITDA: ${metrics.ebitda ? `$${(metrics.ebitda / 1e9).toFixed(1)}B` : "N/A"}

--- RETURNS & EFFICIENCY ---
ROE: ${formatNum(metrics.roe, "", "%")}
ROA: ${formatNum(metrics.roa, "", "%")}
Free Cash Flow: ${metrics.freeCashFlow ? `$${(metrics.freeCashFlow / 1e9).toFixed(1)}B` : "N/A"}
FCF Yield: ${formatNum(metrics.freeCashFlowYield, "", "%")}
Dividend Yield: ${formatNum(metrics.dividendYield, "", "%")}

--- BALANCE SHEET ---
Debt/Equity: ${formatNum(metrics.debtToEquity, "", "x")}
Current Ratio: ${formatNum(metrics.currentRatio, "", "x")}
`.trim();

    let peerStr = "";
    if (peerMetrics && peerMetrics.length > 0) {
        peerStr = "\n\n--- PEER DATA ---\n";
        for (const peer of peerMetrics) {
            peerStr += `${peer.ticker} (${peer.companyName}): P/E=${formatNum(peer.peRatio, "", "x")}, Rev Growth=${formatNum(peer.revenueGrowthYoY, "", "%")}, EBITDA Margin=${formatNum(peer.ebitdaMargin, "", "%")}, ROE=${formatNum(peer.roe, "", "%")}, D/E=${formatNum(peer.debtToEquity, "", "x")}\n`;
        }
    }

    return metricsStr + peerStr;
}

export function getMemoSchema(): string {
    return `
Return ONLY a JSON object with this exact structure (no markdown, no extra text):
{
  "id": "<uuid>",
  "ticker": "<TICKER>",
  "companyName": "<Full Company Name>",
  "analysisDate": "<ISO date>",
  "mode": "quick" | "deep",
  "userQuery": "<original user query>",
  "overallSentiment": "bullish" | "bearish" | "neutral",
  "businessOverview": {
    "summary": "<2-3 sentence business description>",
    "coreProducts": ["<product1>", "<product2>"],
    "competitiveAdvantages": ["<moat1>", "<moat2>"],
    "managementHighlights": "<optional string>"
  },
  "financialPerformance": {
    "summary": "<2-3 sentence financial summary>",
    "highlights": ["<positive highlight 1>", "<positive highlight 2>"],
    "concerns": ["<concern 1>"],
    "metrics": { /* subset of FinancialMetrics — key numbers only */ }
  },
  "peerComparison": [
    { "ticker": "PEER1", "companyName": "...", "peRatio": 0, "revenueGrowthYoY": 0, "grossMargin": 0, "roe": 0, "debtToEquity": 0, "marketCap": 0 }
  ],
  "bullThesis": {
    "points": ["<bull point 1>", "<bull point 2>", "<bull point 3>"],
    "keyMetrics": ["<metric that supports bull case>"],
    "catalysts": ["<upcoming catalyst>"]
  },
  "bearThesis": {
    "points": ["<bear point 1>", "<bear point 2>"],
    "keyMetrics": ["<metric that supports bear case>"],
    "catalysts": ["<risk that could accelerate bear case>"]
  },
  "keyRisks": [
    { "risk": "<risk description>", "severity": "high" | "medium" | "low", "mitigation": "<optional>" }
  ],
  "scenarioAnalysis": {
    "bull": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target or range>", "keyDriver": "<what drives bull case>", "probability": 30 },
    "base": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target or range>", "keyDriver": "<consensus expectation>", "probability": 50 },
    "bear": { "revenueGrowth": 0, "marginExpansion": 0, "impliedValue": "<price target or range>", "keyDriver": "<what drives bear case>", "probability": 20 },
    "sensitivityNote": "<note on key variables>"
  },
  "valuationInsight": {
    "summary": "<valuation commentary>",
    "methodology": "<DCF / Comps / etc.>",
    "fairValueRange": "<$X - $Y>",
    "currentPriceVsFairValue": "undervalued" | "fairly valued" | "overvalued",
    "note": "<optional caveat>"
  },
  "confidenceScore": {
    "overall": 0,
    "dataCompleteness": 0,
    "sourceReliability": 0,
    "contradictionPenalty": 0,
    "label": "Low" | "Medium" | "High" | "Very High",
    "explanation": "<why this score>"
  },
  "discrepancies": [
    { "category": "earnings" | "guidance" | "growth" | "risk" | "other", "claim": "<what mgmt said>", "evidence": "<what data shows>", "severity": "high" | "medium" | "low" }
  ],
  "assumptions": ["<assumption 1>", "<assumption 2>"],
  "dataSourcesUsed": ["Finnhub", "Alpha Vantage", "Public Filings"],
  "nextStepsRecommended": ["<follow-up analysis suggestion>"]
}`;
}

export function getClarifyPrompt(ticker: string, mode: ResearchMode, userQuery: string): string {
    return `You are EquityMind AI. A user wants a ${mode.toUpperCase()} MODE analysis of ${ticker}.

User Query: "${userQuery}"

Generate 2-3 targeted clarifying questions to sharpen the analysis. Focus on:
- Time horizon (short/medium/long-term)
- Specific metrics they care about most
- Peer companies to include in comparison
- Specific risks or scenarios to stress-test

Return ONLY a JSON array of question objects:
[
  {
    "id": "q1",
    "question": "<question text>",
    "type": "select",
    "options": ["<option1>", "<option2>", "<option3>"]
  }
]
Types can be: "text", "select", "multiselect"`;
}
