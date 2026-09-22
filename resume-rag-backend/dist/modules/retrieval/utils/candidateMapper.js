"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapToCandidate = mapToCandidate;
/**
 * Map a stored MongoDB resume document to a normalised SearchCandidate.
 * Preserves BM25 or vector scores when present on the document.
 */
function mapToCandidate(doc, source) {
    return {
        resumeId: doc._id.toString(),
        name: doc.name ?? undefined,
        role: doc.role ?? undefined,
        company: doc.company ?? undefined,
        skills: doc.skills ?? [],
        totalExperience: doc.totalExperience ?? undefined,
        snippet: buildSnippet(doc),
        bm25Score: doc.bm25Score,
        vectorScore: doc.vectorScore,
        sources: [source],
    };
}
/**
 * Build a concise text snippet for LLM re-ranking.
 * Combines the most semantically useful fields — avoids sending full rawText.
 */
function buildSnippet(doc) {
    const parts = [];
    if (doc.name)
        parts.push(doc.name);
    if (doc.role)
        parts.push(doc.role);
    if (doc.company)
        parts.push(`at ${doc.company}`);
    if (doc.totalExperience)
        parts.push(`${doc.totalExperience} years experience`);
    if (doc.skills?.length)
        parts.push(`Skills: ${doc.skills.slice(0, 10).join(", ")}`);
    if (doc.experienceSummary)
        parts.push(doc.experienceSummary.slice(0, 200));
    return parts.join(" | ");
}
