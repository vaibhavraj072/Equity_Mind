"use client";

import { InvestmentMemo } from "@/types";
import { useState } from "react";
import MetricsGrid from "./MetricsGrid";
import ThesisCards from "./ThesisCards";
import ScenarioTable from "./ScenarioTable";
import PeerComparison from "./PeerComparison";
import ConfidenceGauge from "./ConfidenceGauge";
import {
    TrendingUp, AlertTriangle, BarChart2, Users, Target,
    Activity, Info, ChevronDown, ChevronUp, Shield
} from "lucide-react";
import { formatPercent } from "@/lib/utils";

function Section({ title, icon, children, defaultOpen = true }: {
    title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="glass-card overflow-hidden">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-5 hover:bg-white/1 transition-colors">
                <div className="flex items-center gap-3">
                    <div className="section-icon">{icon}</div>
                    <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
            </button>
            {open && <div className="px-5 pb-5">{children}</div>}
        </div>
    );
}

export default function MemoDisplay({ memo }: { memo: InvestmentMemo }) {
    const sentimentColor = memo.overallSentiment === "bullish" ? "text-emerald-400" :
        memo.overallSentiment === "bearish" ? "text-red-400" : "text-yellow-400";
    const sentimentBg = memo.overallSentiment === "bullish" ? "bg-emerald-400/10 border-emerald-400/20" :
        memo.overallSentiment === "bearish" ? "bg-red-400/10 border-red-400/20" : "bg-yellow-400/10 border-yellow-400/20";

    return (
        <div className="max-w-5xl mx-auto px-6 py-8">
            {/* Summary Banner */}
            <div className="glass-card p-6 mb-6">
                <div className="flex items-start gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <h1 className="text-2xl font-bold text-white">{memo.companyName}</h1>
                            <span className={`text-sm px-3 py-1 rounded-full border font-semibold ${sentimentBg} ${sentimentColor}`}>
                                ▲ {memo.overallSentiment.charAt(0).toUpperCase() + memo.overallSentiment.slice(1)}
                            </span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl mb-4">
                            {memo.businessOverview.summary}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {memo.businessOverview.competitiveAdvantages.slice(0, 4).map((adv, i) => (
                                <span key={i} className="tag text-xs">{adv}</span>
                            ))}
                        </div>
                    </div>
                    <ConfidenceGauge score={memo.confidenceScore} />
                </div>

                {/* Discrepancy Alert */}
                {memo.discrepancies && memo.discrepancies.length > 0 && (
                    <div className="mt-4 p-3 rounded-lg border border-yellow-400/30 bg-yellow-400/5 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-semibold text-yellow-400 mb-1">
                                ⚠ {memo.discrepancies.length} Discrepanc{memo.discrepancies.length === 1 ? "y" : "ies"} Detected
                            </p>
                            {memo.discrepancies.map((d, i) => (
                                <p key={i} className="text-xs text-[var(--text-secondary)]">
                                    <span className="font-medium text-yellow-400/80">{d.category}:</span> {d.claim} — but data shows: {d.evidence}
                                </p>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {/* Financial Metrics */}
                <Section title="Financial Performance" icon={<BarChart2 className="w-4 h-4" />}>
                    <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                        {memo.financialPerformance.summary}
                    </p>
                    <MetricsGrid metrics={memo.financialPerformance.metrics} />
                    <div className="grid grid-cols-2 gap-4 mt-5">
                        <div>
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Highlights</p>
                            <ul className="space-y-1.5">
                                {memo.financialPerformance.highlights.map((h, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="text-emerald-400 flex-shrink-0 mt-0.5">▲</span> {h}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Concerns</p>
                            <ul className="space-y-1.5">
                                {memo.financialPerformance.concerns.map((c, i) => (
                                    <li key={i} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                        <span className="text-red-400 flex-shrink-0 mt-0.5">▼</span> {c}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </Section>

                {/* Bull vs Bear */}
                <Section title="Investment Thesis" icon={<TrendingUp className="w-4 h-4" />}>
                    <ThesisCards bull={memo.bullThesis} bear={memo.bearThesis} />
                </Section>

                {/* Peer Comparison */}
                {memo.peerComparison && memo.peerComparison.length > 0 && (
                    <Section title="Peer Comparison" icon={<Users className="w-4 h-4" />}>
                        <PeerComparison
                            target={memo.financialPerformance.metrics}
                            targetName={memo.companyName}
                            targetTicker={memo.ticker}
                            peers={memo.peerComparison}
                        />
                    </Section>
                )}

                {/* Scenario Analysis */}
                {memo.scenarioAnalysis && (
                    <Section title="Scenario Analysis" icon={<Activity className="w-4 h-4" />}>
                        <ScenarioTable scenario={memo.scenarioAnalysis} />
                    </Section>
                )}

                {/* Key Risks */}
                <Section title="Key Risks" icon={<Shield className="w-4 h-4" />}>
                    <div className="space-y-3">
                        {memo.keyRisks.map((risk, i) => (
                            <div key={i} className={`p-3 rounded-lg border ${risk.severity === "high" ? "border-red-500/30 bg-red-500/5" :
                                    risk.severity === "medium" ? "border-yellow-500/30 bg-yellow-500/5" :
                                        "border-emerald-500/30 bg-emerald-500/5"
                                }`}>
                                <div className="flex items-start gap-2">
                                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded mt-0.5 flex-shrink-0 ${risk.severity === "high" ? "bg-red-500/20 text-red-400" :
                                            risk.severity === "medium" ? "bg-yellow-500/20 text-yellow-400" :
                                                "bg-emerald-500/20 text-emerald-400"
                                        }`}>{risk.severity}</span>
                                    <div>
                                        <p className="text-sm text-[var(--text-primary)]">{risk.risk}</p>
                                        {risk.mitigation && (
                                            <p className="text-xs text-[var(--text-muted)] mt-1">Mitigation: {risk.mitigation}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* Valuation */}
                {memo.valuationInsight && (
                    <Section title="Valuation Insight" icon={<Target className="w-4 h-4" />}>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                            {memo.valuationInsight.summary}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="metric-card">
                                <span className="metric-label">Methodology</span>
                                <span className="text-base font-semibold text-white">{memo.valuationInsight.methodology}</span>
                            </div>
                            {memo.valuationInsight.fairValueRange && (
                                <div className="metric-card">
                                    <span className="metric-label">Fair Value Range</span>
                                    <span className="text-base font-semibold text-yellow-400">{memo.valuationInsight.fairValueRange}</span>
                                </div>
                            )}
                            {memo.valuationInsight.currentPriceVsFairValue && (
                                <div className="metric-card">
                                    <span className="metric-label">Assessment</span>
                                    <span className={`text-base font-semibold capitalize ${memo.valuationInsight.currentPriceVsFairValue === "undervalued" ? "text-emerald-400" :
                                            memo.valuationInsight.currentPriceVsFairValue === "overvalued" ? "text-red-400" :
                                                "text-yellow-400"
                                        }`}>{memo.valuationInsight.currentPriceVsFairValue}</span>
                                </div>
                            )}
                        </div>
                        {memo.valuationInsight.note && (
                            <p className="text-xs text-[var(--text-muted)] mt-4 italic">{memo.valuationInsight.note}</p>
                        )}
                    </Section>
                )}

                {/* Assumptions & Sources */}
                {(memo.assumptions?.length || memo.dataSourcesUsed?.length || memo.nextStepsRecommended?.length) ? (
                    <Section title="Methodology & Next Steps" icon={<Info className="w-4 h-4" />} defaultOpen={false}>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            {memo.assumptions?.length ? (
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Assumptions</p>
                                    <ul className="space-y-2">
                                        {memo.assumptions.map((a, i) => (
                                            <li key={i} className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                                                <span className="text-yellow-400/60 flex-shrink-0">•</span> {a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                            {memo.dataSourcesUsed?.length ? (
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Data Sources</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {memo.dataSourcesUsed.map((s, i) => <span key={i} className="tag text-xs">{s}</span>)}
                                    </div>
                                </div>
                            ) : null}
                            {memo.nextStepsRecommended?.length ? (
                                <div>
                                    <p className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">Next Steps</p>
                                    <ul className="space-y-2">
                                        {memo.nextStepsRecommended.map((n, i) => (
                                            <li key={i} className="text-xs text-[var(--text-muted)] flex items-start gap-2">
                                                <span className="text-emerald-400/60 flex-shrink-0">→</span> {n}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    </Section>
                ) : null}
            </div>

            <p className="text-center text-xs text-[var(--text-muted)] mt-8">
                Analysis generated {new Date(memo.analysisDate).toLocaleString()} · EquityMind AI · Not financial advice
            </p>
        </div>
    );
}
