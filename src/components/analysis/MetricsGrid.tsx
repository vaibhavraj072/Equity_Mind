"use client";

import { FinancialMetrics } from "@/types";

interface MetricItem {
    label: string;
    value?: number;
    format: "currency" | "percent" | "multiple" | "billions";
    highlight?: boolean;
}

function formatValue(value: number, format: MetricItem["format"]): string {
    switch (format) {
        case "currency": return `$${value.toFixed(2)}`;
        case "percent": return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
        case "multiple": return `${value.toFixed(1)}x`;
        case "billions": return `$${(value / 1e9).toFixed(1)}B`;
        default: return value.toFixed(2);
    }
}

export default function MetricsGrid({ metrics }: { metrics: Partial<FinancialMetrics> }) {
    const items: MetricItem[] = [
        { label: "Current Price", value: metrics.currentPrice, format: "currency", highlight: true },
        { label: "Market Cap", value: metrics.marketCap, format: "billions", highlight: true },
        { label: "Revenue", value: metrics.revenue, format: "billions" },
        { label: "Rev Growth YoY", value: metrics.revenueGrowthYoY, format: "percent", highlight: true },
        { label: "Gross Margin", value: metrics.grossMargin, format: "percent" },
        { label: "EBITDA Margin", value: metrics.ebitdaMargin, format: "percent" },
        { label: "Net Margin", value: metrics.netMargin, format: "percent" },
        { label: "Free Cash Flow", value: metrics.freeCashFlow, format: "billions", highlight: true },
        { label: "P/E Ratio", value: metrics.peRatio, format: "multiple" },
        { label: "EV/EBITDA", value: metrics.evToEbitda, format: "multiple" },
        { label: "ROE", value: metrics.roe, format: "percent", highlight: true },
        { label: "Debt/Equity", value: metrics.debtToEquity, format: "multiple" },
    ];

    const available = items.filter((item) => item.value != null);

    if (available.length === 0) {
        return <p className="text-sm text-[var(--text-muted)] italic">No financial metrics available.</p>;
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {available.map((item) => (
                <div key={item.label} className={`metric-card ${item.highlight ? "border-yellow-400/15" : ""}`}
                    style={item.highlight ? { borderColor: "rgba(232,180,0,0.12)" } : {}}>
                    <span className="metric-label">{item.label}</span>
                    <span className={`metric-value text-lg ${item.format === "percent" && item.value != null
                            ? item.value >= 0 ? "text-emerald-400" : "text-red-400"
                            : "text-white"
                        }`}>
                        {item.value != null ? formatValue(item.value, item.format) : "—"}
                    </span>
                </div>
            ))}
        </div>
    );
}
