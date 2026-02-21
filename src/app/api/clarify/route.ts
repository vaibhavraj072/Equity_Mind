import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { ClarifyRequest } from "@/types";
import { config } from "@/lib/config";
import { getClarifyPrompt } from "@/lib/agents/prompts";

const client = new OpenAI({
    baseURL: config.openRouter.baseUrl,
    apiKey: process.env.OPENROUTER_API_KEY || "",
    defaultHeaders: {
        "HTTP-Referer": config.openRouter.siteUrl,
        "X-Title": config.openRouter.siteName,
    },
});

export async function POST(req: NextRequest) {
    try {
        const body: ClarifyRequest = await req.json();
        const { ticker, mode, userQuery } = body;

        const prompt = getClarifyPrompt(ticker, mode, userQuery);

        const completion = await client.chat.completions.create({
            model: config.models.fallback,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.4,
            max_tokens: 800,
        });

        const raw = completion.choices[0]?.message?.content || "[]";
        const cleaned = raw.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

        try {
            const questions = JSON.parse(cleaned);
            return NextResponse.json({ questions });
        } catch {
            // Return default clarifying questions
            return NextResponse.json({
                questions: [
                    {
                        id: "q1",
                        question: "What is your investment time horizon for this analysis?",
                        type: "select",
                        options: ["Short-term (< 1 year)", "Medium-term (1-3 years)", "Long-term (3+ years)"],
                    },
                    {
                        id: "q2",
                        question: "Which metrics matter most to you?",
                        type: "multiselect",
                        options: ["Revenue Growth", "EBITDA Margins", "Free Cash Flow", "ROE", "P/E Ratio", "Dividend Yield"],
                    },
                    {
                        id: "q3",
                        question: "Are there specific risks you want us to stress-test?",
                        type: "select",
                        options: ["Interest rate sensitivity", "Competitive disruption", "Regulatory risk", "Macro slowdown", "No specific risk"],
                    },
                ],
            });
        }
    } catch (error) {
        return NextResponse.json({ error: "Failed to generate clarifying questions" }, { status: 500 });
    }
}
