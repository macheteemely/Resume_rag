"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deduplicateCandidates = deduplicateCandidates;
exports.selectTopCandidates = selectTopCandidates;
/**
 * Merge BM25 and vector candidate lists into one deduplicated pool.
 *
 * Rules:
 * - Deduplication key: resumeId
 * - If a candidate appears in both lists, merge scores and sources
 * - Source provenance is preserved on every candidate
 * - Input order is maintained (BM25 first, then vector-only additions)
 */
function deduplicateCandidates(bm25Candidates, vectorCandidates) {
    const map = new Map();
    // Add all BM25 candidates first
    for (const candidate of bm25Candidates) {
        map.set(candidate.resumeId, { ...candidate, sources: ["bm25"] });
    }
    // Merge vector candidates — if already exists from BM25, combine scores + sources
    for (const candidate of vectorCandidates) {
        const existing = map.get(candidate.resumeId);
        if (existing) {
            map.set(candidate.resumeId, {
                ...existing,
                vectorScore: candidate.vectorScore,
                sources: existing.sources.includes("vector")
                    ? existing.sources
                    : [...existing.sources, "vector"],
                // Use the richer snippet if available
                snippet: existing.snippet ?? candidate.snippet,
            });
        }
        else {
            map.set(candidate.resumeId, { ...candidate, sources: ["vector"] });
        }
    }
    return Array.from(map.values());
}
/**
 * Select the top N candidates from a merged pool.
 * Priority order: appeared in both sources > bm25 only > vector only.
 * Within same source group, sort by vectorScore (more reliable) then bm25Score.
 */
function selectTopCandidates(candidates, topN) {
    return candidates
        .sort((a, b) => {
        // Both sources wins over single source
        const aCount = a.sources.length;
        const bCount = b.sources.length;
        if (bCount !== aCount)
            return bCount - aCount;
        // Within same group, sort by vectorScore then bm25Score
        const aScore = a.vectorScore ?? a.bm25Score ?? 0;
        const bScore = b.vectorScore ?? b.bm25Score ?? 0;
        return bScore - aScore;
    })
        .slice(0, topN);
}
