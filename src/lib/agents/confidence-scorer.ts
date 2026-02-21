import { ConfidenceScore, Discrepancy, FinancialMetrics } from "@/types";

export function calculateConfidenceScore(
    metrics: FinancialMetrics,
    discrepancies: Discrepancy[],
    dataSource: "live" | "mock"
): ConfidenceScore {
    // Data completeness: count how many key fields are present
    const keyFields: (keyof FinancialMetrics)[] = [
        "revenue", "revenueGrowthYoY", "grossMargin", "operatingMargin", "netMargin",
        "ebitda", "peRatio", "roe", "freeCashFlow", "debtToEquity", "currentRatio",
    ];
    const presentFields = keyFields.filter((f) => metrics[f] != null).length;
    const dataCompleteness = Math.round((presentFields / keyFields.length) * 100);

    // Source reliability
    const sourceReliability = dataSource === "live" ? 85 : 65;

    // Contradiction penalty
    const highDiscrepancies = discrepancies.filter((d) => d.severity === "high").length;
    const mediumDiscrepancies = discrepancies.filter((d) => d.severity === "medium").length;
    const contradictionPenalty = highDiscrepancies * 15 + mediumDiscrepancies * 5;

    // Overall score
    const overall = Math.max(
        0,
        Math.min(
            100,
            Math.round(dataCompleteness * 0.4 + sourceReliability * 0.4 - contradictionPenalty)
        )
    );

    let label: ConfidenceScore["label"];
    if (overall >= 80) label = "Very High";
    else if (overall >= 65) label = "High";
    else if (overall >= 45) label = "Medium";
    else label = "Low";

    const explanationParts: string[] = [];
    explanationParts.push(`Data completeness: ${dataCompleteness}%`);
    explanationParts.push(`Source reliability: ${dataSource === "live" ? "Live API" : "Reference data"}`);
    if (contradictionPenalty > 0) {
        explanationParts.push(`Discrepancy penalty: -${contradictionPenalty}pts`);
    }

    return {
        overall,
        dataCompleteness,
        sourceReliability,
        contradictionPenalty,
        label,
        explanation: explanationParts.join(" | "),
    };
}
