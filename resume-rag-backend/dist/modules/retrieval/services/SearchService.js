"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchService = void 0;
const ResumeRepository_1 = require("../repositories/ResumeRepository");
const EmbeddingService_1 = require("../../../modules/ingestion/services/EmbeddingService");
const LLMService_1 = require("./LLMService");
const candidateMapper_1 = require("../utils/candidateMapper");
const env_1 = require("../../../config/env");
const deduplicate_1 = require("../utils/deduplicate");
class SearchService {
    constructor(repository = new ResumeRepository_1.ResumeRepository(), embeddingService = new EmbeddingService_1.EmbeddingService(), llmService = new LLMService_1.LLMService()) {
        this.repository = repository;
        this.embeddingService = embeddingService;
        this.llmService = llmService;
    }
    /**
     * BM25 lexical search over resume text and metadata.
     * Returns normalised SearchCandidates with bm25Score populated.
     */
    async bm25Search(query, filters, topK = env_1.ENV.RETRIEVAL_DEFAULT_TOP_K) {
        const docs = await this.repository.bm25Search(query, Math.min(topK, 50), filters.minYearsExperience);
        return docs.map((doc) => (0, candidateMapper_1.mapToCandidate)(doc, "bm25"));
    }
    /**
     * Vector semantic search using query embedding vs stored resume embeddings.
     * Returns normalised SearchCandidates with vectorScore populated.
     */
    async vectorSearch(query, filters, topK = env_1.ENV.RETRIEVAL_DEFAULT_TOP_K) {
        const embeddingStart = Date.now();
        const embeddingResult = await this.embeddingService.generateEmbedding(query);
        const embeddingMs = Date.now() - embeddingStart;
        const docs = await this.repository.vectorSearch(embeddingResult.embedding, Math.min(topK, 50), filters.minYearsExperience);
        const candidates = docs.map((doc) => (0, candidateMapper_1.mapToCandidate)(doc, "vector"));
        return { candidates, embeddingMs };
    }
    async endToEndSearch(query, filters, options = {}) {
        const startedAt = Date.now();
        const warnings = [];
        const timings = {
            embeddingMs: 0,
            bm25Ms: 0,
            vectorMs: 0,
            rerankMs: 0,
            summarizeMs: 0,
            totalMs: 0,
        };
        const bm25TopK = Math.min(options.bm25TopK ?? env_1.ENV.RETRIEVAL_DEFAULT_TOP_K, 50);
        const vectorTopK = Math.min(options.vectorTopK ?? env_1.ENV.RETRIEVAL_DEFAULT_TOP_K, 50);
        const rerankTopN = Math.min(options.rerankTopN ?? env_1.ENV.RERANK_DEFAULT_TOP_N, 20);
        const finalTopK = Math.min(options.finalTopK ?? 5, 50);
        const vectorStartedAt = Date.now();
        const [bm25Result, vectorResult] = await Promise.all([
            (async () => {
                const startedAt = Date.now();
                try {
                    const candidates = await this.bm25Search(query, filters, bm25TopK);
                    return { candidates, bm25Ms: Date.now() - startedAt };
                }
                catch {
                    return { candidates: [], bm25Ms: Date.now() - startedAt, failed: true };
                }
            })(),
            this.vectorSearch(query, filters, vectorTopK)
                .then((result) => ({ ...result }))
                .catch(() => ({ candidates: [], embeddingMs: 0, failed: true })),
        ]);
        timings.bm25Ms = bm25Result.bm25Ms;
        timings.vectorMs = Date.now() - vectorStartedAt - vectorResult.embeddingMs;
        timings.embeddingMs = vectorResult.embeddingMs;
        const bm25Failed = "failed" in bm25Result && bm25Result.failed;
        const vectorFailed = "failed" in vectorResult && vectorResult.failed;
        if (bm25Failed)
            warnings.push("BM25_FAILED");
        if (vectorFailed)
            warnings.push("VECTOR_FAILED");
        if (bm25Failed && vectorFailed) {
            const error = new Error("SEARCH_UNAVAILABLE");
            error.name = "SEARCH_UNAVAILABLE";
            throw error;
        }
        const pool = (0, deduplicate_1.deduplicateCandidates)(bm25Result.candidates, vectorResult.candidates);
        const rerankCandidates = (0, deduplicate_1.selectTopCandidates)(pool, rerankTopN);
        let ranked;
        const rerankStartedAt = Date.now();
        try {
            ranked = await this.llmService.rerankCandidates(query, rerankCandidates, rerankTopN);
            if (ranked.length === 0 && rerankCandidates.length > 0)
                throw new Error("empty rerank result");
        }
        catch {
            warnings.push("LLM_RERANK_FAILED");
            ranked = rerankCandidates.map((candidate, index) => ({ ...candidate, rank: index + 1 }));
        }
        timings.rerankMs = Date.now() - rerankStartedAt;
        ranked = ranked.slice(0, finalTopK).map((candidate, index) => ({
            ...candidate,
            rank: index + 1,
        }));
        if (options.summarize) {
            const summarizeStartedAt = Date.now();
            ranked = await Promise.all(ranked.map(async (candidate) => {
                try {
                    const summary = await this.llmService.summarizeCandidateFit(query, candidate, {
                        style: options.summaryStyle ?? "short",
                        maxTokens: options.summaryStyle === "detailed" ? 300 : 150,
                    });
                    return { ...candidate, summary };
                }
                catch {
                    warnings.push("SUMMARIZATION_FAILED");
                    return candidate;
                }
            }));
            timings.summarizeMs = Date.now() - summarizeStartedAt;
        }
        timings.totalMs = Date.now() - startedAt;
        return {
            query,
            results: ranked,
            degraded: warnings.length > 0,
            warnings,
            bm25Fallback: bm25Failed,
            vectorFallback: vectorFailed,
            timings,
        };
    }
}
exports.SearchService = SearchService;
