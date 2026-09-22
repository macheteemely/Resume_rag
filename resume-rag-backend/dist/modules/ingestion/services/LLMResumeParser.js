"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMResumeParser = void 0;
const env_1 = require("../../../config/env");
class LLMResumeParser {
    /**
     * Parse resume text using a Groq LLM.
     * Only called when USE_LLM_PARSER=true in .env.
     * Output is schema-validated before acceptance.
     */
    async parseResume(rawText) {
        if (!env_1.ENV.USE_LLM_PARSER) {
            throw new Error("LLM_PARSER_DISABLED");
        }
        if (!env_1.ENV.GROQ_API_KEY || env_1.ENV.GROQ_API_KEY === "YOUR_KEY") {
            throw new Error("GROQ_API_KEY is not configured");
        }
        const prompt = `Extract structured information from the following resume text and return ONLY valid JSON matching this schema exactly:
{
  "name": string or null,
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "company": string or null,
  "role": string or null,
  "education": string or null,
  "totalExperience": number or null,
  "relevantExperience": number or null,
  "skills": string[],
  "jobTitles": string[],
  "experienceSummary": string or null
}

Resume text:
${rawText.slice(0, 4000)}`;
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env_1.ENV.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
                model: env_1.ENV.GROQ_MODEL,
                messages: [{ role: "user", content: prompt }],
                temperature: 0,
                max_tokens: 1024,
            }),
        });
        if (!response.ok) {
            throw new Error(`Groq API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content ?? "";
        // Extract JSON from the response (strip markdown code fences if present)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("LLM response did not contain valid JSON");
        }
        let parsed;
        try {
            parsed = JSON.parse(jsonMatch[0]);
        }
        catch {
            throw new Error("Failed to parse LLM JSON response");
        }
        return this.validateAndNormalise(parsed);
    }
    validateAndNormalise(raw) {
        return {
            name: typeof raw.name === "string" ? raw.name : undefined,
            email: typeof raw.email === "string" ? raw.email : undefined,
            phone: typeof raw.phone === "string" ? raw.phone : undefined,
            location: typeof raw.location === "string" ? raw.location : undefined,
            company: typeof raw.company === "string" ? raw.company : undefined,
            role: typeof raw.role === "string" ? raw.role : undefined,
            education: typeof raw.education === "string" ? raw.education : undefined,
            totalExperience: typeof raw.totalExperience === "number" ? raw.totalExperience : undefined,
            relevantExperience: typeof raw.relevantExperience === "number" ? raw.relevantExperience : undefined,
            skills: Array.isArray(raw.skills) ? raw.skills.filter((s) => typeof s === "string") : [],
            jobTitles: Array.isArray(raw.jobTitles) ? raw.jobTitles.filter((t) => typeof t === "string") : [],
            experienceSummary: typeof raw.experienceSummary === "string" ? raw.experienceSummary : undefined,
        };
    }
}
exports.LLMResumeParser = LLMResumeParser;
