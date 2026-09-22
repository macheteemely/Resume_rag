"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeIngestionService = void 0;
const ResumeParserService_1 = require("./ResumeParserService");
const AlgorithmResumeParser_1 = require("./AlgorithmResumeParser");
const LLMResumeParser_1 = require("./LLMResumeParser");
const EmbeddingService_1 = require("./EmbeddingService");
const ResumeIngestionRepository_1 = require("../repositories/ResumeIngestionRepository");
const textCleaner_1 = require("../utils/textCleaner");
const env_1 = require("../../../config/env");
const errorHandler_1 = require("../../../middleware/errorHandler");
const fs_1 = __importDefault(require("fs"));
class ResumeIngestionService {
    constructor() {
        this.parserService = new ResumeParserService_1.ResumeParserService();
        this.algorithmParser = new AlgorithmResumeParser_1.AlgorithmResumeParser();
        this.llmParser = new LLMResumeParser_1.LLMResumeParser();
        this.embeddingService = new EmbeddingService_1.EmbeddingService();
        this.repository = new ResumeIngestionRepository_1.ResumeIngestionRepository();
    }
    async ingestResume(file) {
        const totalStart = Date.now();
        const pdfData = fs_1.default.readFileSync(file.path);
        // ── Step 1: Extract text from PDF ────────────────────────────────────────
        const extractStart = Date.now();
        let rawText;
        try {
            rawText = await this.parserService.extractTextFromPdf(file.path);
        }
        catch {
            throw errorHandler_1.Errors.RESUME_EXTRACTION_FAILED();
        }
        const extractMs = Date.now() - extractStart;
        // ── Step 2: Clean text ────────────────────────────────────────────────────
        const cleanStart = Date.now();
        const cleanedText = (0, textCleaner_1.cleanText)(rawText);
        const cleanMs = Date.now() - cleanStart;
        if (!cleanedText.trim()) {
            throw errorHandler_1.Errors.RESUME_EXTRACTION_FAILED();
        }
        // ── Step 3: Parse resume (algorithm or LLM) ───────────────────────────────
        const parseStart = Date.now();
        let resume;
        try {
            if (env_1.ENV.USE_LLM_PARSER) {
                resume = await this.llmParser.parseResume(cleanedText);
            }
            else {
                resume = this.algorithmParser.parseResume(cleanedText);
            }
        }
        catch {
            throw errorHandler_1.Errors.RESUME_PARSE_FAILED();
        }
        const parseMs = Date.now() - parseStart;
        // ── Step 4: Generate Mistral embedding ────────────────────────────────────
        const embeddingStart = Date.now();
        let embeddingResult;
        try {
            const embeddingText = this.embeddingService.buildEmbeddingText({
                name: resume.name,
                role: resume.role,
                skills: resume.skills,
                company: resume.company,
                experienceSummary: resume.experienceSummary,
                rawText: cleanedText,
            });
            embeddingResult = await this.embeddingService.generateEmbedding(embeddingText);
        }
        catch {
            throw errorHandler_1.Errors.EMBEDDING_FAILED();
        }
        const embeddingMs = Date.now() - embeddingStart;
        // ── Step 5: Store in MongoDB ──────────────────────────────────────────────
        const mongoStart = Date.now();
        const now = new Date();
        let resumeId;
        try {
            resumeId = await this.repository.insertResume({
                fileName: file.originalname,
                pdfData,
                rawText: cleanedText,
                name: resume.name,
                email: resume.email ?? null,
                phone: resume.phone ?? null,
                location: resume.location ?? null,
                company: resume.company ?? null,
                role: resume.role ?? null,
                education: resume.education ?? null,
                totalExperience: resume.totalExperience ?? null,
                relevantExperience: resume.relevantExperience ?? null,
                skills: resume.skills ?? [],
                jobTitles: resume.jobTitles ?? [],
                experienceSummary: resume.experienceSummary ?? null,
                embedding: embeddingResult.embedding,
                embeddingModel: embeddingResult.model,
                embeddingDimension: embeddingResult.dimension,
                createdAt: now,
                updatedAt: now,
            });
        }
        catch {
            throw errorHandler_1.Errors.INGESTION_FAILED();
        }
        const mongoInsertMs = Date.now() - mongoStart;
        const totalMs = Date.now() - totalStart;
        return {
            resumeId,
            name: resume.name,
            role: resume.role,
            company: resume.company,
            totalExperience: resume.totalExperience,
            skillsCount: resume.skills?.length ?? 0,
            embeddingModel: embeddingResult.model,
            embeddingDimension: embeddingResult.dimension,
            timings: {
                extractMs,
                cleanMs,
                parseMs,
                embeddingMs,
                mongoInsertMs,
                totalMs,
            },
        };
    }
}
exports.ResumeIngestionService = ResumeIngestionService;
