"use client";

import { useState, useEffect } from "react";
import { Brain, ChevronRight, X } from "lucide-react";
import { ResearchMode } from "@/types";

interface Question {
    id: string;
    question: string;
    type: "text" | "select" | "multiselect";
    options?: string[];
}

interface Props {
    ticker: string;
    mode: ResearchMode;
    userQuery: string;
    onSubmit: (context: Record<string, string>) => void;
    onSkip: () => void;
}

export default function ClarifyDialog({ ticker, mode, userQuery, onSubmit, onSkip }: Props) {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/clarify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ticker, mode, userQuery }),
        })
            .then((r) => r.json())
            .then((data) => {
                setQuestions(data.questions || []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, [ticker, mode, userQuery]);

    const handleSelect = (qId: string, value: string) => {
        setAnswers((prev) => ({ ...prev, [qId]: value }));
    };

    const handleMultiSelect = (qId: string, value: string) => {
        const current = answers[qId] ? answers[qId].split(", ") : [];
        const idx = current.indexOf(value);
        const updated = idx >= 0 ? current.filter((v) => v !== value) : [...current, value];
        setAnswers((prev) => ({ ...prev, [qId]: updated.join(", ") }));
    };

    const handleSubmit = () => {
        onSubmit(answers);
    };

    return (
        <div className="min-h-screen hero-bg flex items-center justify-center p-6">
            <div className="glass-card w-full max-w-lg p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="section-icon w-7 h-7">
                                <Brain className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs text-yellow-400 font-medium uppercase tracking-wider">Deep Mode</span>
                        </div>
                        <h2 className="text-lg font-bold text-white">Sharpen the Analysis</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                            Answer a few questions so we can tailor the deep analysis of{" "}
                            <span className="font-mono font-bold text-yellow-400">{ticker}</span>
                        </p>
                    </div>
                    <button onClick={onSkip} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="loading-shimmer h-16 rounded-xl" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {questions.map((q) => (
                            <div key={q.id}>
                                <p className="text-sm font-medium text-[var(--text-primary)] mb-3">{q.question}</p>
                                {q.type === "text" && (
                                    <input
                                        type="text"
                                        className="search-input text-sm py-2.5"
                                        placeholder="Type your answer..."
                                        value={answers[q.id] || ""}
                                        onChange={(e) => handleSelect(q.id, e.target.value)}
                                    />
                                )}
                                {(q.type === "select" || q.type === "multiselect") && q.options && (
                                    <div className="flex flex-wrap gap-2">
                                        {q.options.map((opt) => {
                                            const selected = q.type === "multiselect"
                                                ? (answers[q.id] || "").split(", ").includes(opt)
                                                : answers[q.id] === opt;
                                            return (
                                                <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => q.type === "multiselect"
                                                        ? handleMultiSelect(q.id, opt)
                                                        : handleSelect(q.id, opt)
                                                    }
                                                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${selected
                                                            ? "border-yellow-400/50 bg-yellow-400/10 text-yellow-400"
                                                            : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--border-bright)]"
                                                        }`}>
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex gap-3 mt-8">
                    <button onClick={handleSubmit} className="btn-primary flex-1" disabled={loading}>
                        Run Deep Analysis
                        <ChevronRight className="w-4 h-4" />
                    </button>
                    <button onClick={onSkip} className="btn-secondary">
                        Skip
                    </button>
                </div>
            </div>
        </div>
    );
}
