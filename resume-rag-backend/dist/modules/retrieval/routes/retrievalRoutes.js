"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const retrievalController_1 = require("../controllers/retrievalController");
const router = (0, express_1.Router)();
// Retrieval Phase 1 — readiness check
router.get("/search/readiness", retrievalController_1.retrievalController.checkReadiness);
// Retrieval Phase 3 — shared query embedding
router.post("/embeddings", retrievalController_1.retrievalController.embedQuery);
// Retrieval Phase 5 — BM25 search
router.post("/search/bm25", retrievalController_1.retrievalController.bm25Search);
// Retrieval Phase 6 — Vector search
router.post("/search/vector", retrievalController_1.retrievalController.vectorSearch);
// Retrieval Phase 8 — Hybrid search
router.post("/search/hybrid", retrievalController_1.retrievalController.hybridSearch);
// Retrieval Phase 11 — LLM re-ranking
router.post("/search/rerank", retrievalController_1.retrievalController.rerankCandidates);
// Retrieval Phase 12 — Candidate summarization
router.post("/search/summarize", retrievalController_1.summarizeCandidate);
// Retrieval Phases 13-16 — final end-to-end search
router.post("/search", retrievalController_1.retrievalController.search);
// Full candidate detail lookup for profile modal and recruiter drill-down
router.get("/candidate/:id", retrievalController_1.retrievalController.getCandidateById);
router.get("/candidate/:id/resume", retrievalController_1.retrievalController.getCandidateResume);
exports.default = router;
