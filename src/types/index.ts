// ============================================================
// Core Types for EquityMind AI
// ============================================================

export type ResearchMode = "quick" | "deep";

export type RiskTolerance = "conservative" | "moderate" | "aggressive";

export type InvestmentHorizon = "short" | "medium" | "long";

export type Sentiment = "bullish" | "bearish" | "neutral";

// ---- Financial Metrics ----
export interface FinancialMetrics {
    ticker: string;
    companyName: string;
    sector: string;
    industry: string;
    marketCap?: number;
    revenue?: number;
    revenueGrowthYoY?: number;
    grossMargin?: number;
    operatingMargin?: number;
    netMargin?: number;
    ebitda?: number;
    ebitdaMargin?: number;
    eps?: number;
    peRatio?: number;
    pbRatio?: number;
    psRatio?: number;
    evToEbitda?: number;
    roe?: number;
    roa?: number;
    debtToEquity?: number;
    currentRatio?: number;
    freeCashFlow?: number;
    freeCashFlowYield?: number;
    dividendYield?: number;
    fiftyTwoWeekHigh?: number;
    fiftyTwoWeekLow?: number;
    currentPrice?: number;
    beta?: number;
    dataTimestamp?: string;
}

// ---- Peer Comparison ----
export interface PeerComparison {
    ticker: string;
    companyName: string;
    peRatio?: number;
    evToEbitda?: number;
    revenueGrowthYoY?: number;
    grossMargin?: number;
    roe?: number;
    debtToEquity?: number;
    marketCap?: number;
}

// ---- Scenario Analysis ----
export interface ScenarioCase {
    revenueGrowth: number;
    marginExpansion: number;
    impliedValue?: string;
    keyDriver: string;
    probability?: number;
}

export interface ScenarioAnalysis {
    bull: ScenarioCase;
    base: ScenarioCase;
    bear: ScenarioCase;
    sensitivityNote?: string;
}

// ---- Contradiction Detection ----
export interface Discrepancy {
    category: "earnings" | "guidance" | "growth" | "risk" | "other";
    claim: string;
    evidence: string;
    severity: "low" | "medium" | "high";
}

// ---- Confidence Scoring ----
export interface ConfidenceScore {
    overall: number; // 0-100
    dataCompleteness: number; // 0-100
    sourceReliability: number; // 0-100
    contradictionPenalty: number; // 0-100 (penalty subtracted)
    label: "Low" | "Medium" | "High" | "Very High";
    explanation: string;
}

// ---- Investment Memo ----
export interface BusinessOverview {
    summary: string;
    coreProducts: string[];
    competitiveAdvantages: string[];
    managementHighlights?: string;
}

export interface FinancialPerformance {
    summary: string;
    highlights: string[];
    concerns: string[];
    metrics: Partial<FinancialMetrics>;
}

export interface Thesis {
    points: string[];
    keyMetrics: string[];
    catalysts?: string[];
}

export interface KeyRisk {
    risk: string;
    severity: "low" | "medium" | "high";
    mitigation?: string;
}

export interface ValuationInsight {
    summary: string;
    methodology: string;
    fairValueRange?: string;
    currentPriceVsFairValue?: string;
    note?: string;
}

export interface InvestmentMemo {
    id: string;
    ticker: string;
    companyName: string;
    analysisDate: string;
    mode: ResearchMode;
    userQuery: string;
    overallSentiment: Sentiment;

    // 9 Sections
    businessOverview: BusinessOverview;
    financialPerformance: FinancialPerformance;
    peerComparison?: PeerComparison[];
    bullThesis: Thesis;
    bearThesis: Thesis;
    keyRisks: KeyRisk[];
    scenarioAnalysis?: ScenarioAnalysis;
    valuationInsight?: ValuationInsight;
    confidenceScore: ConfidenceScore;

    // Meta
    discrepancies?: Discrepancy[];
    assumptions?: string[];
    dataSourcesUsed?: string[];
    nextStepsRecommended?: string[];
}

// ---- User Memory Profile ----
export interface UserMemoryProfile {
    riskTolerance: RiskTolerance;
    preferredKPIs: string[];
    sectorsOfInterest: string[];
    geographicFocus: string[];
    investmentHorizon: InvestmentHorizon;
    lastUpdated: string;
}

// ---- History ----
export interface AnalysisHistoryItem {
    id: string;
    ticker: string;
    companyName: string;
    mode: ResearchMode;
    analysisDate: string;
    overallSentiment: Sentiment;
    confidenceScore: number;
}

// ---- API DTOs ----
export interface AnalyzeRequest {
    ticker: string;
    mode: ResearchMode;
    userQuery: string;
    peerTickers?: string[];
    context?: Record<string, string>;
}

export interface ClarifyRequest {
    ticker: string;
    mode: ResearchMode;
    userQuery: string;
}

export interface ClarifyResponse {
    questions: Array<{
        id: string;
        question: string;
        type: "text" | "select" | "multiselect";
        options?: string[];
    }>;
}
