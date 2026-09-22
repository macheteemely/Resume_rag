"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ingestionController = void 0;
const fs_1 = __importDefault(require("fs"));
const ResumeParserService_1 = require("../services/ResumeParserService");
const textCleaner_1 = require("../utils/textCleaner");
const skills_1 = require("../../../config/skills");
const AlgorithmResumeParser_1 = require("../services/AlgorithmResumeParser");
const LLMResumeParser_1 = require("../services/LLMResumeParser");
const EmbeddingService_1 = require("../services/EmbeddingService");
const ResumeIngestionRepository_1 = require("../repositories/ResumeIngestionRepository");
const ResumeIngestionService_1 = require("../services/ResumeIngestionService");
const env_1 = require("../../../config/env");
const parserService = new ResumeParserService_1.ResumeParserService();
const algorithmParser = new AlgorithmResumeParser_1.AlgorithmResumeParser();
const llmParser = new LLMResumeParser_1.LLMResumeParser();
const embeddingService = new EmbeddingService_1.EmbeddingService();
const repository = new ResumeIngestionRepository_1.ResumeIngestionRepository();
const ingestionService = new ResumeIngestionService_1.ResumeIngestionService();
exports.ingestionController = {
    // Phase 3 — module health
    moduleHealth(_req, res) {
        res.status(200).json({
            status: "ok",
            module: "resume-ingestion",
        });
    },
    // Phase 4 — PDF upload only (validation check)
    uploadResume(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    errorCode: "FILE_REQUIRED",
                    message: "Resume PDF is required",
                });
                return;
            }
            fs_1.default.unlink(req.file.path, () => { });
            res.status(200).json({
                success: true,
                message: "Resume uploaded successfully",
                file: {
                    originalName: req.file.originalname,
                    mimeType: req.file.mimetype,
                    size: req.file.size,
                },
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Phase 5 — PDF text extraction
    async extractResume(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    errorCode: "FILE_REQUIRED",
                    message: "Resume PDF is required",
                });
                return;
            }
            const rawText = await parserService.extractTextFromPdf(req.file.path);
            res.status(200).json({
                success: true,
                rawText,
                characters: rawText.length,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "RESUME_EXTRACTION_FAILED";
            if (message === "RESUME_EXTRACTION_FAILED") {
                res.status(422).json({
                    success: false,
                    errorCode: "RESUME_EXTRACTION_FAILED",
                    message: "Resume extraction failed",
                });
                return;
            }
            next(err);
        }
    },
    // Phase 6 — Text cleaning
    cleanResume(req, res, next) {
        try {
            const { rawText } = req.body;
            if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "rawText is required and must be a non-empty string",
                });
                return;
            }
            const cleanedText = (0, textCleaner_1.cleanText)(rawText);
            res.status(200).json({
                success: true,
                cleanText: cleanedText,
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Phase 8 — Skills detection
    detectSkillsFromText(req, res, next) {
        try {
            const { rawText } = req.body;
            if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "rawText is required and must be a non-empty string",
                });
                return;
            }
            const skills = (0, skills_1.detectSkills)(rawText);
            res.status(200).json({
                success: true,
                skills,
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Phase 9 — Algorithm resume parser
    parseResume(req, res, next) {
        try {
            const { rawText } = req.body;
            if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "rawText is required and must be a non-empty string",
                });
                return;
            }
            const resume = algorithmParser.parseResume(rawText);
            res.status(200).json({
                success: true,
                resume,
            });
        }
        catch (err) {
            next(err);
        }
    },
    // Phase 10 — Optional LLM parser
    async llmParseResume(req, res, next) {
        try {
            if (!env_1.ENV.USE_LLM_PARSER) {
                res.status(200).json({
                    success: false,
                    errorCode: "LLM_PARSER_DISABLED",
                    message: "LLM resume parser is disabled. Set USE_LLM_PARSER=true in .env to enable.",
                });
                return;
            }
            const { rawText } = req.body;
            if (!rawText || typeof rawText !== "string" || rawText.trim() === "") {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "rawText is required and must be a non-empty string",
                });
                return;
            }
            const resume = await llmParser.parseResume(rawText);
            res.status(200).json({
                success: true,
                parser: "llm",
                model: env_1.ENV.GROQ_MODEL,
                resume,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message === "LLM_PARSER_DISABLED") {
                res.status(200).json({
                    success: false,
                    errorCode: "LLM_PARSER_DISABLED",
                    message: "LLM resume parser is disabled",
                });
                return;
            }
            next(err);
        }
    },
    // Phase 11 — Mistral embedding
    async embedResume(req, res, next) {
        try {
            const body = req.body;
            if (!body.rawText && !body.name && !body.role) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "At least one of rawText, name, or role is required",
                });
                return;
            }
            const embeddingText = embeddingService.buildEmbeddingText(body);
            const result = await embeddingService.generateEmbedding(embeddingText);
            res.status(200).json({
                success: true,
                model: result.model,
                dimension: result.dimension,
                embedding: result.embedding.slice(0, 3),
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "";
            if (message.startsWith("EMBEDDING_FAILED")) {
                res.status(502).json({
                    success: false,
                    errorCode: "EMBEDDING_FAILED",
                    message: "Mistral embedding failed",
                });
                return;
            }
            next(err);
        }
    },
    // Phase 12 — MongoDB resume storage
    async storeResume(req, res, next) {
        try {
            const body = req.body;
            if (!body.fileName || !body.resume || !body.rawText || !Array.isArray(body.embedding)) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "fileName, resume, rawText, and embedding are required",
                });
                return;
            }
            if (body.embedding.length === 0) {
                res.status(400).json({
                    success: false,
                    errorCode: "INVALID_INPUT",
                    message: "embedding must be a non-empty array",
                });
                return;
            }
            const now = new Date();
            const doc = {
                fileName: body.fileName,
                rawText: body.rawText,
                name: body.resume.name,
                email: body.resume.email ?? null,
                phone: body.resume.phone ?? null,
                location: body.resume.location ?? null,
                company: body.resume.company ?? null,
                role: body.resume.role ?? null,
                education: body.resume.education ?? null,
                totalExperience: body.resume.totalExperience ?? null,
                relevantExperience: body.resume.relevantExperience ?? null,
                skills: body.resume.skills ?? [],
                jobTitles: body.resume.jobTitles ?? [],
                experienceSummary: body.resume.experienceSummary ?? null,
                embedding: body.embedding,
                embeddingModel: env_1.ENV.MISTRAL_EMBED_MODEL,
                embeddingDimension: body.embedding.length,
                createdAt: now,
                updatedAt: now,
            };
            const resumeId = await repository.insertResume(doc);
            res.status(200).json({
                success: true,
                message: "Resume stored successfully",
                resumeId,
            });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : "";
            res.status(500).json({
                success: false,
                errorCode: "INGESTION_FAILED",
                message: message || "Resume ingestion failed",
            });
        }
    },
    // Phase 13 — Full end-to-end ingestion
    async ingestResume(req, res, next) {
        try {
            if (!req.file) {
                res.status(400).json({
                    success: false,
                    errorCode: "FILE_REQUIRED",
                    message: "Resume PDF is required",
                });
                return;
            }
            const result = await ingestionService.ingestResume(req.file);
            // Attach timings to res.locals so the logger middleware can include them
            res.locals.ingestionTimings = result.timings;
            res.status(200).json({
                success: true,
                message: "Resume ingestion completed",
                resumeId: result.resumeId,
                data: {
                    name: result.name,
                    role: result.role,
                    company: result.company,
                    totalExperience: result.totalExperience ?? null,
                    skillsCount: result.skillsCount,
                    embeddingModel: result.embeddingModel,
                    embeddingDimension: result.embeddingDimension,
                },
                timings: result.timings,
            });
        }
        catch (err) {
            next(err);
        }
    },
};
