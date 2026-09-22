"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
const env_1 = require("../../../config/env");
class LLMService {
    constructor() {
        this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
    }
    get headers() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${env_1.ENV.GROQ_API_KEY}`,
        };
    }
    /**
     * Re-rank candidates using Groq LLM.
     * Input candidate IDs are validated — LLM cannot invent new ones.
     * Returns only candidates present in the input list.
     */
    async rerankCandidates(query, candidates, topK = env_1.ENV.RERANK_DEFAULT_TOP_N) {
        if (candidates.length === 0)
            return [];
        const validIds = new Set(candidates.map((c) => c.resumeId));
        // Build concise candidate list for the prompt — avoid sending full rawText
        const candidateList = candidates
            .map((c, i) => `[${i + 1}] ID: ${c.resumeId}
Name: ${c.name ?? "Unknown"}
Role: ${c.role ?? "N/A"}
Company: ${c.company ?? "N/A"}
Experience: ${c.totalExperience ?? "N/A"} years
Skills: ${(c.skills ?? []).slice(0, 10).join(", ")}
Summary: ${c.snippet ?? "N/A"}`)
            .join("\n\n");
        const prompt = `You are a recruiter assistant. Re-rank the following candidates based on relevance to the job query.

Job Query: "${query}"

Candidates:
${candidateList}

Return ONLY a valid JSON array — no markdown, no explanation. Each element must have:
- resumeId (string, must be one of the provided IDs)
- rank (number, starting from 1)
- relevanceScore (number between 0 and 1)
- reason (string, one sentence max)

Return at most ${Math.min(topK, candidates.length)} candidates ordered by rank.`;
        const response = await fetch(this.apiUrl, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                model: env_1.ENV.GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
                max_tokens: 1024,
            }),
        });
        if (!response.ok) {
            throw new Error(`GROQ_API_ERROR: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? "";
        // Extract JSON array from response (strip markdown fences if present)
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("LLM_RERANK_INVALID_OUTPUT: no JSON array found");
        }
        let rawRanked;
        try {
            rawRanked = JSON.parse(jsonMatch[0]);
        }
        catch {
            throw new Error("LLM_RERANK_INVALID_OUTPUT: failed to parse JSON");
        }
        // Validate — only allow IDs that were in the input
        const ranked = [];
        for (const item of rawRanked) {
            if (!item.resumeId || !validIds.has(item.resumeId))
                continue;
            const original = candidates.find((c) => c.resumeId === item.resumeId);
            if (!original)
                continue;
            ranked.push({
                ...original,
                rank: typeof item.rank === "number" ? item.rank : ranked.length + 1,
                relevanceScore: typeof item.relevanceScore === "number"
                    ? Math.min(1, Math.max(0, item.relevanceScore))
                    : undefined,
                reason: typeof item.reason === "string" ? item.reason : undefined,
            });
        }
        // Sort by rank ascending and limit to topK
        return ranked
            .sort((a, b) => a.rank - b.rank)
            .slice(0, Math.min(topK, candidates.length));
    }
    /**
     * Generate a fit summary for a single candidate against the query.
     * Grounded only in supplied candidate data — no hallucination.
     */
    async summarizeCandidateFit(query, candidate, options = {
        style: "short",
        maxTokens: 150,
    }) {
        const styleInstruction = options.style === "short"
            ? "Write 1-2 sentences."
            : "Write 3-5 sentences with specific skill mentions.";
        const prompt = `You are a recruiter assistant. Summarize how well this candidate fits the job query.
Use ONLY the information provided. Do not add information not in the candidate data.
${styleInstruction}

Job Query: "${query}"

Candidate:
Name: ${candidate.name ?? "Unknown"}
Role: ${candidate.role ?? "N/A"}
Company: ${candidate.company ?? "N/A"}
Experience: ${candidate.totalExperience ?? "N/A"} years
Skills: ${(candidate.skills ?? []).join(", ")}
Summary: ${candidate.snippet ?? "N/A"}

Fit Summary:`;
        const response = await fetch(this.apiUrl, {
            method: "POST",
            headers: this.headers,
            body: JSON.stringify({
                model: env_1.ENV.GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.3,
                max_tokens: options.maxTokens,
            }),
        });
        if (!response.ok) {
            throw new Error(`GROQ_API_ERROR: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        return (data.choices?.[0]?.message?.content ?? "").trim();
    }
}
exports.LLMService = LLMService;
