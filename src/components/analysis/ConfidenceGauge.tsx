"use client";

import { ConfidenceScore } from "@/types";

export default function ConfidenceGauge({ score }: { score: ConfidenceScore }) {
    const { overall, label } = score;

    const color = overall >= 75 ? "#34d399" : overall >= 50 ? "#e8b400" : "#f87171";
    const trackColor = overall >= 75 ? "rgba(52,211,153,0.15)" : overall >= 50 ? "rgba(232,180,0,0.15)" : "rgba(248,113,113,0.15)";

    // SVG arc parameters
    const size = 100;
    const radius = 38;
    const cx = size / 2;
    const cy = size / 2;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * 0.75; // 270-degree arc
    const fillLength = arcLength * (overall / 100);
    const dashOffset = circumference * 0.125; // start at 225 degrees (bottom-left)

    return (
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="relative" style={{ width: 90, height: 90 }}>
                <svg width="90" height="90" viewBox="0 0 100 100">
                    {/* Background track */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={trackColor}
                        strokeWidth="8"
                        strokeDasharray={`${arcLength} ${circumference - arcLength}`}
                        strokeDashoffset={-dashOffset}
                        strokeLinecap="round"
                        transform="rotate(135 50 50)"
                    />
                    {/* Filled arc */}
                    <circle
                        cx={cx} cy={cy} r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeDasharray={`${fillLength} ${circumference - fillLength}`}
                        strokeDashoffset={-dashOffset}
                        strokeLinecap="round"
                        transform="rotate(135 50 50)"
                        style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                </svg>
                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-white">{overall}</span>
                    <span className="text-[9px] text-[var(--text-muted)] uppercase">Score</span>
                </div>
            </div>
            <span className="text-xs font-semibold" style={{ color }}>
                {label} Confidence
            </span>
            <div className="flex gap-3 text-[10px] text-[var(--text-muted)] mt-0.5">
                <span>Data: {score.dataCompleteness}%</span>
                <span>Source: {score.sourceReliability}%</span>
            </div>
        </div>
    );
}
