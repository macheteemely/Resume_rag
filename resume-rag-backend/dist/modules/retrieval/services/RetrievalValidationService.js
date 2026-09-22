"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetrievalValidationService = void 0;
const database_1 = require("../../../config/database");
const env_1 = require("../../../config/env");
class RetrievalValidationService {
    async checkReadiness() {
        const db = (0, database_1.getDb)();
        const collection = db.collection("resumes");
        // Total resumes in collection
        const resumeCount = await collection.countDocuments();
        if (resumeCount === 0) {
            return {
                ready: false,
                collection: "resumes",
                reason: "No ingested resumes are available",
            };
        }
        // Resumes that have a non-empty embedding array
        const resumesWithEmbedding = await collection.countDocuments({
            embedding: { $exists: true, $not: { $size: 0 } },
        });
        if (resumesWithEmbedding === 0) {
            return {
                ready: false,
                collection: "resumes",
                resumeCount,
                reason: "No ingested resume embeddings are available",
            };
        }
        // Verify embedding dimension from a sample document
        const sample = await collection.findOne({ embedding: { $exists: true, $not: { $size: 0 } } }, { projection: { embeddingModel: 1, embeddingDimension: 1, embedding: 1 } });
        const storedDimension = sample?.embeddingDimension ??
            (Array.isArray(sample?.embedding) ? sample.embedding.length : 0);
        if (storedDimension !== env_1.ENV.EMBEDDING_DIMENSION) {
            return {
                ready: false,
                collection: "resumes",
                resumeCount,
                resumesWithEmbedding,
                reason: `Embedding dimension mismatch: stored=${storedDimension}, configured=${env_1.ENV.EMBEDDING_DIMENSION}`,
            };
        }
        return {
            ready: true,
            collection: "resumes",
            resumeCount,
            resumesWithEmbedding,
            embeddingModel: sample?.embeddingModel ?? env_1.ENV.MISTRAL_EMBED_MODEL,
            embeddingDimension: storedDimension,
        };
    }
}
exports.RetrievalValidationService = RetrievalValidationService;
