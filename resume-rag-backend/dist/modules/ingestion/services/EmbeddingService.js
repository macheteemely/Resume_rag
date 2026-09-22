"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbeddingService = void 0;
const mistralai_1 = require("@mistralai/mistralai");
const env_1 = require("../../../config/env");
class EmbeddingService {
    constructor() {
        if (!env_1.ENV.MISTRAL_API_KEY || env_1.ENV.MISTRAL_API_KEY === "YOUR_KEY") {
            throw new Error("MISTRAL_API_KEY is not configured in .env");
        }
        this.client = new mistralai_1.Mistral({ apiKey: env_1.ENV.MISTRAL_API_KEY });
    }
    /**
     * Build the embedding input text from resume fields.
     * Combines the most semantically meaningful parts of the resume.
     */
    buildEmbeddingText(params) {
        const parts = [];
        if (params.name)
            parts.push(params.name);
        if (params.role)
            parts.push(params.role);
        if (params.skills?.length)
            parts.push(params.skills.join(", "));
        if (params.company)
            parts.push(params.company);
        if (params.experienceSummary)
            parts.push(params.experienceSummary);
        if (params.rawText)
            parts.push(params.rawText.slice(0, 2000));
        return parts.join("\n");
    }
    /**
     * Generate an embedding vector for the given text using Mistral.
     * Returns the vector, model name, and dimension.
     */
    async generateEmbedding(text) {
        if (!text || text.trim() === "") {
            throw new Error("EMBEDDING_FAILED: input text is empty");
        }
        let response;
        try {
            response = await this.client.embeddings.create({
                model: env_1.ENV.MISTRAL_EMBED_MODEL,
                inputs: [text],
            });
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            throw new Error(`EMBEDDING_FAILED: ${msg}`);
        }
        const embedding = response.data?.[0]?.embedding;
        if (!Array.isArray(embedding) || embedding.length === 0) {
            throw new Error("EMBEDDING_FAILED: empty embedding returned from Mistral");
        }
        return {
            embedding,
            model: env_1.ENV.MISTRAL_EMBED_MODEL,
            dimension: embedding.length,
        };
    }
}
exports.EmbeddingService = EmbeddingService;
