"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeRepository = void 0;
const mongodb_1 = require("mongodb");
const database_1 = require("../../../config/database");
class ResumeRepository {
    get collection() {
        return (0, database_1.getDb)().collection("resumes");
    }
    /**
     * Find a single resume by its string ObjectId.
     * Used for verifying ingestion and candidate detail lookup.
     */
    async findById(id) {
        const doc = await this.collection.findOne({ _id: new mongodb_1.ObjectId(id) });
        return doc;
    }
    /**
     * BM25 full-text search using MongoDB Atlas Search.
     * Searches across rawText, skills, jobTitles, experienceSummary, role, company.
     */
    async bm25Search(query, topK, minYearsExperience) {
        const pipeline = [
            {
                $search: {
                    index: "resume_search",
                    text: {
                        query,
                        path: ["rawText", "skills", "jobTitles", "experienceSummary", "role", "company"],
                        fuzzy: { maxEdits: 1 },
                    },
                },
            },
            {
                $addFields: {
                    bm25Score: { $meta: "searchScore" },
                },
            },
        ];
        // Apply experience filter if provided
        if (minYearsExperience !== undefined && minYearsExperience > 0) {
            pipeline.push({
                $match: {
                    totalExperience: { $gte: minYearsExperience },
                },
            });
        }
        pipeline.push({ $limit: topK });
        const docs = await this.collection.aggregate(pipeline).toArray();
        return docs;
    }
    /**
     * Vector search using MongoDB Atlas Vector Search.
     * Compares query embedding against stored resume embeddings with cosine similarity.
     */
    async vectorSearch(queryEmbedding, topK, minYearsExperience) {
        const pipeline = [
            {
                $vectorSearch: {
                    index: "resume_vector_index",
                    path: "embedding",
                    queryVector: queryEmbedding,
                    numCandidates: topK * 10,
                    limit: topK,
                },
            },
            {
                $addFields: {
                    vectorScore: { $meta: "vectorSearchScore" },
                },
            },
        ];
        if (minYearsExperience !== undefined && minYearsExperience > 0) {
            pipeline.push({
                $match: {
                    totalExperience: { $gte: minYearsExperience },
                },
            });
        }
        const docs = await this.collection.aggregate(pipeline).toArray();
        return docs;
    }
    /**
     * Fetch minimal candidate snippets for LLM re-ranking.
     * Avoids sending full rawText to the LLM.
     */
    async fetchCandidateSnippets(resumeIds) {
        const objectIds = resumeIds.map((id) => new mongodb_1.ObjectId(id));
        const docs = await this.collection
            .find({ _id: { $in: objectIds } }, {
            projection: {
                name: 1,
                role: 1,
                company: 1,
                skills: 1,
                totalExperience: 1,
                experienceSummary: 1,
                jobTitles: 1,
            },
        })
            .toArray();
        return docs;
    }
}
exports.ResumeRepository = ResumeRepository;
