"use client";

import { Thesis } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function ThesisCards({ bull, bear }: { bull: Thesis; bear: Thesis }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Bull Thesis */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Bull Thesis</h3>
                </div>
                <ul className="space-y-2.5 mb-4">
                    {bull.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                            <span className="text-emerald-400 text-base leading-none flex-shrink-0 mt-0.5">▲</span>
                            {point}
                        </li>
                    ))}
                </ul>
                {bull.keyMetrics.length > 0 && (
                    <div className="border-t border-emerald-500/15 pt-3 mt-3">
                        <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider mb-2">Support Metrics</p>
                        <div className="flex flex-wrap gap-1.5">
                            {bull.keyMetrics.map((m, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded bg-emerald-500/10 text-emerald-400/80 border border-emerald-500/15">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {bull.catalysts && bull.catalysts.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[10px] font-semibold text-emerald-400/70 uppercase tracking-wider mb-2">Catalysts</p>
                        <ul className="space-y-1">
                            {bull.catalysts.map((c, i) => (
                                <li key={i} className="text-xs text-emerald-400/70 flex items-start gap-1.5">
                                    <span className="flex-shrink-0">→</span> {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Bear Thesis */}
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center">
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                    </div>
                    <h3 className="text-sm font-bold text-red-400 uppercase tracking-wider">Bear Thesis</h3>
                </div>
                <ul className="space-y-2.5 mb-4">
                    {bear.points.map((point, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                            <span className="text-red-400 text-base leading-none flex-shrink-0 mt-0.5">▼</span>
                            {point}
                        </li>
                    ))}
                </ul>
                {bear.keyMetrics.length > 0 && (
                    <div className="border-t border-red-500/15 pt-3 mt-3">
                        <p className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider mb-2">Warning Signs</p>
                        <div className="flex flex-wrap gap-1.5">
                            {bear.keyMetrics.map((m, i) => (
                                <span key={i} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-400/80 border border-red-500/15">
                                    {m}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                {bear.catalysts && bear.catalysts.length > 0 && (
                    <div className="mt-3">
                        <p className="text-[10px] font-semibold text-red-400/70 uppercase tracking-wider mb-2">Risk Accelerants</p>
                        <ul className="space-y-1">
                            {bear.catalysts.map((c, i) => (
                                <li key={i} className="text-xs text-red-400/70 flex items-start gap-1.5">
                                    <span className="flex-shrink-0">→</span> {c}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
