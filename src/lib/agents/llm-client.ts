/**
 * LLM client using the official Google Generative AI SDK.
 *
 * Free-tier limits per model (gemini-2.0-flash, gemini-1.5-flash, gemini-1.5-flash-8b):
 *   15 RPM  |  1,500 RPD  |  1M TPM
 *
 * Retry strategy:
 *   - On ANY 429 / quota error: wait 65 s (full 60 s window + buffer) then retry ONCE.
 *   - If still failing: try the next model in the list.
 *   - 404 / model-not-found: skip immediately (no retry).
 */

import {
    GoogleGenerativeAI,
    GoogleGenerativeAIResponseError,
    HarmBlockThreshold,
    HarmCategory,
} from "@google/generative-ai";

const RETRY_WAIT_MS = 65_000;   // 65 s — full 60 s quota window + 5 s buffer

const SAFETY_SETTINGS = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Models ordered from best to most-available
const QUICK_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
];

const DEEP_MODELS = [
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
];

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Error classification ──────────────────────────────────────────────────────
function isRateLimit(err: unknown): boolean {
    const msg = String(err instanceof Error ? err.message : err).toLowerCase();
    // Gemini SDK throws "Resource has been exhausted" or contains 429
    return (
        msg.includes("429") ||
        msg.includes("resource has been exhausted") ||
        msg.includes("quota") ||
        msg.includes("rate limit") ||
        msg.includes("too many requests")
    );
}

function isModelUnavailable(err: unknown): boolean {
    const msg = String(err instanceof Error ? err.message : err).toLowerCase();
    return (
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("not a valid model") ||
        msg.includes("invalid model") ||
        msg.includes("no endpoints")
    );
}

export type Message = { role: "system" | "user" | "assistant"; content: string };

// ── callWithFallback ──────────────────────────────────────────────────────────
export async function callWithFallback(
    mode: "quick" | "deep",
    params: { messages: Message[]; temperature?: number; max_tokens?: number }
): Promise<string> {
    const modelList = mode === "quick" ? QUICK_MODELS : DEEP_MODELS;

    // Gemini accepts a single text prompt — merge system + user messages
    const systemPart = params.messages.find((m) => m.role === "system")?.content ?? "";
    const userPart = params.messages.find((m) => m.role === "user")?.content ?? "";
    const prompt = systemPart ? `${systemPart}\n\n---\n\n${userPart}` : userPart;

    for (const modelName of modelList) {
        // ── Attempt 1 ──────────────────────────────────────────────────────
        try {
            console.log(`[gemini] ${modelName} — attempt 1`);
            const result = await genAI
                .getGenerativeModel({ model: modelName, safetySettings: SAFETY_SETTINGS, generationConfig: { temperature: params.temperature ?? 0.2, maxOutputTokens: params.max_tokens ?? 1500 } })
                .generateContent(prompt);
            const text = result.response.text();
            console.log(`[gemini] ✓ ${modelName}`);
            return text;

        } catch (e1) {
            if (isModelUnavailable(e1)) {
                console.warn(`[gemini] ✗ ${modelName} not available — skipping`);
                continue; // next model, no retry
            }
            if (!isRateLimit(e1)) {
                // Fatal: bad API key, safety block, malformed request, etc.
                console.error(`[gemini] Fatal on ${modelName}: ${e1 instanceof Error ? e1.message : e1}`);
                throw e1;
            }
            // Rate limited — wait for the quota window to expire
            console.warn(`[gemini] 429 on ${modelName} — waiting ${RETRY_WAIT_MS / 1000}s for quota reset...`);
            await sleep(RETRY_WAIT_MS);
        }

        // ── Attempt 2 (after 65 s wait) ────────────────────────────────────
        try {
            console.log(`[gemini] ${modelName} — attempt 2 (after quota reset)`);
            const result = await genAI
                .getGenerativeModel({ model: modelName, safetySettings: SAFETY_SETTINGS, generationConfig: { temperature: params.temperature ?? 0.2, maxOutputTokens: params.max_tokens ?? 1500 } })
                .generateContent(prompt);
            const text = result.response.text();
            console.log(`[gemini] ✓ ${modelName} (attempt 2)`);
            return text;

        } catch (e2) {
            if (isModelUnavailable(e2)) {
                console.warn(`[gemini] ✗ ${modelName} not available — skipping`);
                continue;
            }
            const msg2 = e2 instanceof Error ? e2.message : String(e2);
            console.warn(`[gemini] ✗ ${modelName} still failing after retry (${msg2}) — trying next model`);
            // fall through to next model
        }
    }

    throw new Error(
        "[gemini] All Gemini models rate-limited. " +
        "Free tier = 15 req/min · 1,500 req/day. " +
        "Consider enabling billing at https://console.cloud.google.com/billing to lift limits."
    );
}
