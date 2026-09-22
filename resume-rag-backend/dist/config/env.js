"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENV = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ENV = {
    PORT: parseInt(process.env.PORT ?? "3000", 10),
    NODE_ENV: process.env.NODE_ENV ?? "development",
    MONGODB_URI: process.env.MONGODB_URI ?? "",
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME ?? "resume_rag",
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY ?? "",
    MISTRAL_EMBED_MODEL: process.env.MISTRAL_EMBED_MODEL ?? "mistral-embed",
    EMBEDDING_DIMENSION: parseInt(process.env.EMBEDDING_DIMENSION ?? "1024", 10),
    USE_LLM_PARSER: process.env.USE_LLM_PARSER === "true",
    GROQ_API_KEY: process.env.GROQ_API_KEY ?? "",
    GROQ_MODEL: process.env.GROQ_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
    MAX_UPLOAD_SIZE_MB: parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? "5", 10),
    RETRIEVAL_DEFAULT_TOP_K: parseInt(process.env.RETRIEVAL_DEFAULT_TOP_K ?? "20", 10),
    RERANK_DEFAULT_TOP_N: parseInt(process.env.RERANK_DEFAULT_TOP_N ?? "10", 10),
    SEARCH_P95_TARGET_MS: parseInt(process.env.SEARCH_P95_TARGET_MS ?? "5000", 10),
};
