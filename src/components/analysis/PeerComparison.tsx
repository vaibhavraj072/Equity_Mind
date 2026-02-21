"use client";

import { FinancialMetrics, PeerComparison as PeerType } from "@/types";

function MetricCell({ value, format = "default", compareValue }: {
    value?: number;
    format?: "percent" | "multiple" | "currency" | "default";
    compareValue?: number;
}) {
    if (value == null) return <span className="text-[var(--text-muted)]">—</span>;
    let display = value.toFixed(1);
    if (format === "percent") display = `${value.toFixed(1)}%`;
    if (format === "multiple") display = `${value.toFixed(1)}x`;
    if (format === "currency") display = `$${(value / 1e9).toFixed(1)}B`;

    let color = "text-[var(--text-primary)]";
    if (compareValue != null) {
        color = value > compareValue ? "text-emerald-400" : value < compareValue ? "text-red-400" : "text-[var(--text-primary)]";
    }

    return <span className={`font-mono font-semibold text-sm ${color}`}>{display}</span>;
}

export default function PeerComparison({
    target, targetName, targetTicker, peers,
}: {
    target: Partial<FinancialMetrics>;
    targetName: string;
    targetTicker: string;
    peers: PeerType[];
}) {
    const columns: Array<{ label: string; key: keyof PeerType & keyof FinancialMetrics; format: "percent" | "multiple" | "currency" | "default" }> = [
        { label: "P/E", key: "peRatio", format: "multiple" },
        { label: "Rev Growth", key: "revenueGrowthYoY", format: "percent" },
        { label: "Gross Margin", key: "grossMargin", format: "percent" },
        { label: "ROE", key: "roe", format: "percent" },
        { label: "D/E", key: "debtToEquity", format: "multiple" },
        { label: "Mkt Cap", key: "marketCap", format: "currency" },
    ];

    const allRows = [
        { ticker: targetTicker, companyName: targetName, ...target, isTarget: true },
        ...peers.map((p) => ({ ...p, isTarget: false })),
    ];

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-[var(--border)]">
                        <th className="text-left py-2 pr-4 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider w-40">Company</th>
                        {columns.map((c) => (
                            <th key={c.key} className="text-right py-2 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                                {c.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {allRows.map((row, i) => (
                        <tr
                            key={row.ticker}
                            className={`border-b border-[var(--border)]/50 transition-colors hover:bg-white/1 ${row.isTarget ? "bg-yellow-400/3" : ""
                                }`}>
                            <td className="py-3 pr-4">
                                <div className="flex items-center gap-2">
                                    <span className={`font-mono font-bold text-sm ${row.isTarget ? "text-yellow-400" : "text-white"}`}>
                                        {row.ticker}
                                    </span>
                                    {row.isTarget && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">TARGET</span>
                                    )}
                                </div>
                                <div className="text-xs text-[var(--text-muted)] truncate max-w-[140px]">{row.companyName}</div>
                            </td>
                            {columns.map((col) => (
                                <td key={col.key} className="py-3 px-3 text-right">
                                    <MetricCell
                                        value={row[col.key] as number | undefined}
                                        format={col.format}
                                        compareValue={
                                            !row.isTarget
                                                ? (allRows[0][col.key] as number | undefined)
                                                : undefined
                                        }
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            <p className="text-xs text-[var(--text-muted)] mt-3">
                ↑ Green = above target · ↓ Red = below target. Peer metrics based on available data.
            </p>
        </div>
    );
}
