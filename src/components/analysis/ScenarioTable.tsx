"use client";

import { ScenarioAnalysis } from "@/types";

export default function ScenarioTable({ scenario }: { scenario: ScenarioAnalysis }) {
    const cases = [
        { key: "bull", label: "Bull Case", data: scenario.bull, color: "text-emerald-400", bg: "bg-emerald-500/5 border-emerald-500/20" },
        { key: "base", label: "Base Case", data: scenario.base, color: "text-yellow-400", bg: "bg-yellow-500/5 border-yellow-500/20" },
        { key: "bear", label: "Bear Case", data: scenario.bear, color: "text-red-400", bg: "bg-red-500/5 border-red-500/20" },
    ];

    return (
        <div>
            <div className="grid grid-cols-3 gap-3 mb-4">
                {cases.map(({ key, label, data, color, bg }) => (
                    <div key={key} className={`p-4 rounded-xl border ${bg}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${color}`}>{label}</p>
                        <div className="space-y-2.5">
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Revenue Growth</p>
                                <p className={`text-lg font-bold ${color}`}>
                                    {data.revenueGrowth >= 0 ? "+" : ""}{data.revenueGrowth.toFixed(1)}%
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Margin Change</p>
                                <p className={`text-base font-semibold ${color}`}>
                                    {data.marginExpansion >= 0 ? "+" : ""}{data.marginExpansion.toFixed(1)} bps
                                </p>
                            </div>
                            {data.impliedValue && (
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Implied Value</p>
                                    <p className="text-sm font-semibold text-white">{data.impliedValue}</p>
                                </div>
                            )}
                            {data.probability !== undefined && (
                                <div>
                                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider mb-1">Probability</p>
                                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${key === "bull" ? "bg-emerald-500" : key === "base" ? "bg-yellow-500" : "bg-red-500"
                                                }`}
                                            style={{ width: `${data.probability}%` }}
                                        />
                                    </div>
                                    <p className={`text-xs mt-1 ${color}`}>{data.probability}%</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-xs text-[var(--text-secondary)] italic">{data.keyDriver}</p>
                        </div>
                    </div>
                ))}
            </div>
            {scenario.sensitivityNote && (
                <p className="text-xs text-[var(--text-muted)] italic border-t border-[var(--border)] pt-3">
                    📊 {scenario.sensitivityNote}
                </p>
            )}
        </div>
    );
}
