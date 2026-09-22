"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrievalController = void 0;
exports.summarizeCandidate = summarizeCandidate;
const RetrievalValidationService_1 = require("../services/RetrievalValidationService");
const EmbeddingService_1 = require("../../../modules/ingestion/services/EmbeddingService");
const ResumeRepository_1 = require("../repositories/ResumeRepository");
const LLMService_1 = require("../services/LLMService");
const candidateMapper_1 = require("../utils/candidateMapper");
const env_1 = require("../../../config/env");
const SearchService_1 = require("../services/SearchService");
const mongodb_1 = require("mongodb");
const validationService = new RetrievalValidationService_1.RetrievalValidationService();
const embeddingService = new EmbeddingService_1.EmbeddingService();
const resumeRepository = new ResumeRepository_1.ResumeRepository();
const llmService = new LLMService_1.LLMService();
const searchService = new SearchService_1.SearchService();
const MAX_QUERY_LENGTH = 1000;
const MAX_TOP_K = 50;
const MAX_RERANK_TOP_N = 20;
function validateQuery(value) {
    if (typeof value !== "string" || value.trim() === "")
        return { error: "Search query is required" };
    const query = value.trim();
    if (query.length > MAX_QUERY_LENGTH) {
        return { error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` };
    }
    return query;
}
function parseBasicSearchRequest(body) {
    const query = validateQuery(body.query);
    if (typeof query !== "string")
        return query;
    if (body.topK !== undefined &&
        (typeof body.topK !== "number" || !Number.isInteger(body.topK) || body.topK < 1)) {
        return { error: "topK must be a positive integer" };
    }
    const filters = body.filters;
    if (filters !== undefined && (!filters || typeof filters !== "object" || Array.isArray(filters))) {
        return { error: "filters must be an object" };
    }
    const minYearsExperience = filters?.minYearsExperience;
    if (minYearsExperience !== undefined &&
        (typeof minYearsExperience !== "number" || !Number.isFinite(minYearsExperience) || minYearsExperience < 0)) {
        return { error: "minYearsExperience must be a non-negative number" };
    }
    return {
        query,
        topK: Math.min(body.topK ?? env_1.ENV.RETRIEVAL_DEFAULT_TOP_K, MAX_TOP_K),
        minYearsExperience: minYearsExperience,
    };
}
function parseSearchRequest(body) {
    if (typeof body.query !== "string" || body.query.trim() === "") {
        return { error: "Search query is required" };
    }
    const query = body.query.trim();
    if (query.length > MAX_QUERY_LENGTH)
        return { error: `Search query must be ${MAX_QUERY_LENGTH} characters or fewer` };
    const filters = (body.filters ?? {});
    if (typeof body.filters !== "undefined" && (!body.filters || typeof body.filters !== "object" || Array.isArray(body.filters))) {
        return { error: "filters must be an object" };
    }
    if (filters.minYearsExperience !== undefined &&
        (typeof filters.minYearsExperience !== "number" || !Number.isFinite(filters.minYearsExperience) || filters.minYearsExperience < 0)) {
        return { error: "minYearsExperience must be a non-negative number" };
    }
    if (filters.skills !== undefined &&
        (!Array.isArray(filters.skills) || filters.skills.some((skill) => typeof skill !== "string"))) {
        return { error: "skills must be an array of strings" };
    }
    if (filters.location !== undefined && typeof filters.location !== "string") {
        return { error: "location must be a string" };
    }
    const rawOptions = (body.options ?? {});
    if (typeof body.options !== "undefined" && (!body.options || typeof body.options !== "object" || Array.isArray(body.options))) {
        return { error: "options must be an object" };
    }
    const numericOptions = ["bm25TopK", "vectorTopK", "rerankTopN", "finalTopK"];
    for (const name of numericOptions) {
        const value = rawOptions[name];
        if (value !== undefined && (typeof value !== "number" || !Number.isInteger(value) || value < 1)) {
            return { error: `${name} must be a positive integer` };
        }
    }
    if (rawOptions.summaryStyle !== undefined && rawOptions.summaryStyle !== "short" && rawOptions.summaryStyle !== "detailed") {
        return { error: "summaryStyle must be short or detailed" };
    }
    if (rawOptions.summarize !== undefined && typeof rawOptions.summarize !== "boolean") {
        return { error: "summarize must be a boolean" };
    }
    return {
        query,
        filters: {
            minYearsExperience: filters.minYearsExperience,
            skills: filters.skills,
            location: filters.location,
        },
        options: {
            bm25TopK: Math.min(rawOptions.bm25TopK ?? env_1.ENV.RETRIEVAL_DEFAULT_TOP_K, MAX_TOP_K),
            vectorTopK: Math.min(rawOptions.vectorTopK ?? env_1.ENV.RETRIEVAL_DEFAULT_TOP_K, MAX_TOP_K),
            rerankTopN: Math.min(rawOptions.rerankTopN ?? env_1.ENV.RERANK_DEFAULT_TOP_N, MAX_RERANK_TOP_N),
            finalTopK: Math.min(rawOptions.finalTopK ?? 5, MAX_TOP_K),
            summarize: rawOptions.summarize,
            summaryStyle: rawOptions.summaryStyle,
        },
    };
}
exports.retrievalController = {
    // Retrieval Phase 1 — readiness check
    async checkReadiness(_req, res, next) {
        try {
            const result = await validationService.checkReadiness();
            if (!result.ready) {
                res.status(503).json(result);
                return;
            }
            res.status(200).json(result);
        }
        catch (err) {
            next(err);
        }
    },
    async getCandidateById(req, res, next) {
        try {
            const { id } = req.params;
            if (typeof id !== "string" || !mongodb_1.ObjectId.isValid(id)) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "A valid candidate id is required",
                });
                return;
            }
            const doc = await resumeRepository.findById(id);
            if (!doc) {
                res.status(404).json({
                    success: false,
                    errorCode: "CANDIDATE_NOT_FOUND",
                    message: "Candidate was not found",
                });
                return;
            }
            res.status(200).json({
                resumeId: doc._id.toString(),
                resumeAvailable: Boolean(doc.pdfData && doc.pdfData.length > 0),
                name: doc.name ?? null,
                email: doc.email ?? null,
                phone: doc.phone ?? null,
                location: doc.location ?? null,
                company: doc.company ?? null,
                role: doc.role ?? null,
                education: doc.education ?? null,
                totalExperience: doc.totalExperience ?? null,
                relevantExperience: doc.relevantExperience ?? null,
                skills: doc.skills ?? [],
                jobTitles: doc.jobTitles ?? [],
                summary: doc.experienceSummary ?? doc.rawText?.slice(0, 500) ?? null,
            });
        }
        catch (err) {
            next(err);
        }
    },
    async getCandidateResume(req, res, next) {
        try {
            const { id } = req.params;
            if (typeof id !== "string" || !mongodb_1.ObjectId.isValid(id)) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "A valid candidate id is required",
                });
                return;
            }
            const doc = await resumeRepository.findById(id);
            if (!doc) {
                res.status(404).json({
                    success: false,
                    errorCode: "CANDIDATE_NOT_FOUND",
                    message: "Candidate was not found",
                });
                return;
            }
            if (!doc.pdfData || doc.pdfData.length === 0) {
                res.status(404).json({
                    success: false,
                    errorCode: "RESUME_UNAVAILABLE",
                    message: "The original resume is currently unavailable.",
                });
                return;
            }
            res.type("application/pdf");
            res.setHeader("Content-Disposition", "inline");
            res.send(doc.pdfData);
        }
        catch (err) {
            next(err);
        }
    },
    // Retrieval Phase 3 — shared query embedding
    async embedQuery(req, res, next) {
        try {
            const { input, model } = req.body;
            const validatedInput = validateQuery(input);
            if (typeof validatedInput !== "string") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: validatedInput.error === "Search query is required"
                        ? "input is required and must be a non-empty string"
                        : validatedInput.error,
                });
                return;
            }
            const result = await embeddingService.generateEmbedding(validatedInput);
            res.status(200).json({
                embedding: result.embedding,
                model: model ?? result.model,
                dimension: result.dimension,
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Retrieval Phase 5 — BM25 search
    async bm25Search(req, res, next) {
        try {
            const { query, topK, filters } = req.body;
            const parsed = parseBasicSearchRequest(req.body);
            if ("error" in parsed) {
                res.status(400).json({
                    success: false,
                    errorCode: parsed.error === "Search query is required" ? "INVALID_SEARCH_QUERY" : "INVALID_INPUT",
                    message: parsed.error,
                });
                return;
            }
            const docs = await resumeRepository.bm25Search(parsed.query, parsed.topK, parsed.minYearsExperience);
            const results = docs.map((doc) => {
                const candidate = (0, candidateMapper_1.mapToCandidate)(doc, "bm25");
                return {
                    resumeId: candidate.resumeId,
                    name: candidate.name,
                    role: candidate.role,
                    company: candidate.company,
                    totalExperience: candidate.totalExperience,
                    score: doc.bm25Score ?? 0,
                    matchedSkills: candidate.skills ?? [],
                };
            });
            res.status(200).json({ mode: "bm25", query: parsed.query, count: results.length, results });
        }
        catch (err) {
            next(err);
        }
    },
    // Retrieval Phase 6 — Vector search
    async vectorSearch(req, res, next) {
        try {
            const { query, topK, filters } = req.body;
            const parsed = parseBasicSearchRequest(req.body);
            if ("error" in parsed) {
                res.status(400).json({
                    success: false,
                    errorCode: parsed.error === "Search query is required" ? "INVALID_SEARCH_QUERY" : "INVALID_INPUT",
                    message: parsed.error,
                });
                return;
            }
            const k = parsed.topK;
            const minExp = parsed.minYearsExperience;
            const embeddingResult = await embeddingService.generateEmbedding(parsed.query);
            const docs = await resumeRepository.vectorSearch(embeddingResult.embedding, k, minExp);
            const results = docs.map((doc) => {
                const candidate = (0, candidateMapper_1.mapToCandidate)(doc, "vector");
                return {
                    resumeId: candidate.resumeId,
                    name: candidate.name,
                    role: candidate.role,
                    company: candidate.company,
                    totalExperience: candidate.totalExperience,
                    vectorScore: doc.vectorScore ?? 0,
                };
            });
            res.status(200).json({ mode: "vector", query: parsed.query, count: results.length, results });
        }
        catch (err) {
            next(err);
        }
    },
    // Retrieval Phase 8 — Hybrid search (parallel BM25 + vector, no merge yet)
    async hybridSearch(req, res, next) {
        try {
            const { query, topK, filters } = req.body;
            const parsed = parseBasicSearchRequest(req.body);
            if ("error" in parsed) {
                res.status(400).json({
                    success: false,
                    errorCode: parsed.error === "Search query is required" ? "INVALID_SEARCH_QUERY" : "INVALID_INPUT",
                    message: parsed.error,
                });
                return;
            }
            const k = parsed.topK;
            const searchFilters = { minYearsExperience: parsed.minYearsExperience };
            const bm25Start = Date.now();
            const embeddingStart = Date.now();
            const [bm25Docs, embeddingResult] = await Promise.all([
                resumeRepository.bm25Search(parsed.query, k, searchFilters.minYearsExperience),
                embeddingService.generateEmbedding(parsed.query),
            ]);
            const bm25Ms = Date.now() - bm25Start;
            const embeddingMs = Date.now() - embeddingStart;
            const vectorStart = Date.now();
            const vectorDocs = await resumeRepository.vectorSearch(embeddingResult.embedding, k, searchFilters.minYearsExperience);
            const vectorMs = Date.now() - vectorStart;
            const bm25Results = bm25Docs.map((doc) => ({
                resumeId: doc._id.toString(),
                name: doc.name,
                role: doc.role,
                score: doc.bm25Score ?? 0,
            }));
            const vectorResults = vectorDocs.map((doc) => ({
                resumeId: doc._id.toString(),
                name: doc.name,
                role: doc.role,
                score: doc.vectorScore ?? 0,
            }));
            res.status(200).json({
                mode: "hybrid-debug",
                query: parsed.query,
                bm25: bm25Results,
                vector: vectorResults,
                timings: { bm25Ms, embeddingMs, vectorMs },
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Retrieval Phases 13-16 — final synchronous search pipeline
    async search(req, res, next) {
        try {
            const parsed = parseSearchRequest((req.body ?? {}));
            if ("error" in parsed) {
                res.status(400).json({
                    success: false,
                    errorCode: parsed.error === "Search query is required" ? "INVALID_SEARCH_QUERY" : "INVALID_INPUT",
                    message: parsed.error,
                });
                return;
            }
            const result = await searchService.endToEndSearch(parsed.query, parsed.filters, parsed.options);
            res.locals.retrievalTimings = result.timings;
            res.locals.retrievalWarnings = result.warnings;
            res.locals.retrievalFallbacks = {
                bm25Fallback: result.bm25Fallback === true,
                vectorFallback: result.vectorFallback === true,
            };
            res.status(200).json(result);
        }
        catch (err) {
            if (err instanceof Error && err.name === "SEARCH_UNAVAILABLE") {
                res.locals.retrievalWarnings = ["SEARCH_UNAVAILABLE"];
                res.status(503).json({
                    success: false,
                    errorCode: "SEARCH_UNAVAILABLE",
                    message: "No retrieval strategy is currently available",
                });
                return;
            }
            next(err);
        }
    },
    // Retrieval Phase 11 — LLM re-ranking
    async rerankCandidates(req, res, next) {
        try {
            const { query, candidates, topK } = req.body;
            const validatedQuery = validateQuery(query);
            if (typeof validatedQuery !== "string") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_SEARCH_QUERY",
                    message: validatedQuery.error,
                });
                return;
            }
            if (!Array.isArray(candidates) || candidates.length === 0) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "candidates must be a non-empty array",
                });
                return;
            }
            // Validate all candidate IDs are present
            const invalidCandidates = candidates.filter((c) => !c.resumeId || !mongodb_1.ObjectId.isValid(c.resumeId));
            if (invalidCandidates.length > 0) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "All candidates must have a resumeId",
                });
                return;
            }
            if (topK !== undefined && (!Number.isInteger(topK) || topK < 1)) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "topK must be a positive integer",
                });
                return;
            }
            const k = Math.min(topK ?? env_1.ENV.RERANK_DEFAULT_TOP_N, MAX_RERANK_TOP_N);
            // Map input candidates to SearchCandidate shape
            const searchCandidates = candidates.map((c) => ({
                resumeId: c.resumeId,
                snippet: c.snippet,
                sources: [],
            }));
            const ranked = await llmService.rerankCandidates(validatedQuery, searchCandidates, k);
            res.status(200).json({
                results: ranked.map((r) => ({
                    resumeId: r.resumeId,
                    rank: r.rank,
                    relevanceScore: r.relevanceScore,
                    reason: r.reason,
                })),
                model: env_1.ENV.GROQ_MODEL,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message.startsWith("LLM_RERANK_INVALID_OUTPUT")) {
                res.status(502).json({
                    success: false,
                    errorCode: "LLM_RERANK_FAILED",
                    message: "LLM re-ranking returned invalid output",
                });
                return;
            }
            next(err);
        }
    },
};
// ── Phase 12 — Candidate summarization ────────────────────────────────────────
// Appended as a standalone export to avoid controller object mutation issues
async function summarizeCandidate(req, res, next) {
    try {
        const { query, candidate, style, maxTokens } = req.body;
        const validatedQuery = validateQuery(query);
        if (typeof validatedQuery !== "string") {
            res.status(400).json({
                success: false,
                errorCode: "INVALID_SEARCH_QUERY",
                message: validatedQuery.error,
            });
            return;
        }
        if (!candidate?.resumeId || !mongodb_1.ObjectId.isValid(candidate.resumeId)) {
            res.status(400).json({
                success: false,
                errorCode: "INVALID_INPUT",
                message: "candidate with resumeId is required",
            });
            return;
        }
        if (style !== undefined && style !== "short" && style !== "detailed") {
            res.status(400).json({
                success: false,
                errorCode: "INVALID_INPUT",
                message: "style must be short or detailed",
            });
            return;
        }
        if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1)) {
            res.status(400).json({
                success: false,
                errorCode: "INVALID_INPUT",
                message: "maxTokens must be a positive integer",
            });
            return;
        }
        const summaryStyle = style ?? "short";
        const tokens = Math.min(maxTokens ?? 150, 500);
        const searchCandidate = {
            resumeId: candidate.resumeId,
            snippet: candidate.snippet,
            sources: [],
        };
        const summary = await llmService.summarizeCandidateFit(validatedQuery, searchCandidate, { style: summaryStyle, maxTokens: tokens });
        res.status(200).json({
            resumeId: candidate.resumeId,
            summary,
        });
    }
    catch (err) {
        next(err);
    }
}
