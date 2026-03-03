import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/* -------------------------------------------------------------------------- */
/*                              TYPE DEFINITIONS                               */
/* -------------------------------------------------------------------------- */

export interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}

/* -------------------------------------------------------------------------- */
/*                            GEMINI CLIENT SETUP                              */
/* -------------------------------------------------------------------------- */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? "");

/* -------------------------------------------------------------------------- */
/*                             SAFETY SETTINGS                                 */
/* -------------------------------------------------------------------------- */

const SAFETY_SETTINGS = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
    },
];

/* -------------------------------------------------------------------------- */
/*                              MODEL FALLBACK LISTS                           */
/* -------------------------------------------------------------------------- */

/** Quick mode: prefer the fastest model; fall back to stable flash. */
const QUICK_MODELS = [
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
];

/** Deep mode: prefer best reasoning model; fall back gracefully. */
const DEEP_MODELS = [
    "gemini-2.5-pro-exp-03-25",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
];

/* -------------------------------------------------------------------------- */
/*                              PER-MODE TIMEOUTS                              */
/* -------------------------------------------------------------------------- */

/**
 * Per-model call budget (ms).
 * Deep mode: 155 s per attempt — leaves ~25 s for data fetching + post-processing
 * within the 180 s route budget.
 * Quick mode: 25 s per attempt.
 */
const QUICK_TIMEOUT_MS = 25_000;
const DEEP_TIMEOUT_MS = 155_000;

/* -------------------------------------------------------------------------- */
/*                              ERROR CLASSIFIERS                              */
/* -------------------------------------------------------------------------- */

function isModelUnavailable(err: any): boolean {
    const msg: string = err?.message ?? String(err);
    return (
        msg.includes("404") ||
        msg.includes("not found") ||
        msg.includes("model not found") ||
        msg.includes("unavailable") ||
        msg.includes("FAILED_PRECONDITION")
    );
}

function isRateLimit(err: any): boolean {
    const msg: string = err?.message ?? String(err);
    return (
        msg.includes("429") ||
        msg.includes("quota") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("rate limit")
    );
}

/* -------------------------------------------------------------------------- */
/*                           MAIN LLM CLIENT EXPORT                           */
/* -------------------------------------------------------------------------- */

export async function callWithFallback(
    mode: "quick" | "deep",
    params: { messages: Message[]; temperature?: number; max_tokens?: number }
): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY in environment variables.");
    }

    const modelList = mode === "quick" ? QUICK_MODELS : DEEP_MODELS;
    const timeoutMs = mode === "quick" ? QUICK_TIMEOUT_MS : DEEP_TIMEOUT_MS;

    // Deep mode: more tokens to fit the full JSON memo; lower temperature for factual fidelity
    const maxTokens = params.max_tokens ?? (mode === "deep" ? 8192 : 2048);
    const temperature = params.temperature ?? (mode === "deep" ? 0.1 : 0.2);

    const systemPart =
        params.messages.find((m) => m.role === "system")?.content ?? "";
    const userPart =
        params.messages.find((m) => m.role === "user")?.content ?? "";

    const prompt = systemPart
        ? `${systemPart}\n\n---\n\n${userPart}`
        : userPart;

    for (const modelName of modelList) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            console.log(`[gemini] Trying ${modelName} (timeout: ${timeoutMs / 1000}s)`);

            const model = genAI.getGenerativeModel({
                model: modelName,
                safetySettings: SAFETY_SETTINGS,
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    // Force JSON output format for deep mode to avoid markdown wrapping
                    ...(mode === "deep" ? { responseMimeType: "application/json" } : {}),
                },
            });

            // Race the model call against the per-model abort controller
            const result = await Promise.race([
                model.generateContent(prompt),
                new Promise<never>((_, reject) =>
                    controller.signal.addEventListener("abort", () =>
                        reject(new Error(`[gemini] ${modelName} timed out after ${timeoutMs / 1000}s`))
                    )
                ),
            ]);

            clearTimeout(timer);

            const text = result?.response?.text?.();

            if (!text || text.trim().length === 0) {
                console.warn(
                    `[gemini] ${modelName} returned empty response — trying next model`
                );
                continue;
            }

            console.log(`[gemini] ✓ Success on ${modelName} (${text.length} chars)`);
            return text;

        } catch (err: any) {
            clearTimeout(timer);

            // Timeout — try the next (faster) model
            if (err?.message?.includes("timed out")) {
                console.warn(`[gemini] ${modelName} timed out — trying next model`);
                continue;
            }

            if (isModelUnavailable(err)) {
                console.warn(`[gemini] ${modelName} unavailable — skipping`);
                continue;
            }

            if (isRateLimit(err)) {
                console.warn(`[gemini] ${modelName} rate-limited — trying next model`);
                continue;
            }

            console.error(
                `[gemini] Fatal error on ${modelName}:`,
                err?.message || err
            );
            throw err;
        }
    }

    throw new Error("All Gemini models unavailable or rate-limited.");
}