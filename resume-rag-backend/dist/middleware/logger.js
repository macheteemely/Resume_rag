"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = logger;
// Structured request logger
// Emits the spec-required log format on every response finish.
// Secrets, full embedding vectors, and raw PDF bodies are never logged.
function logger(req, res, next) {
    const start = Date.now();
    const reqId = req.requestId ?? "-";
    res.on("finish", () => {
        const totalMs = Date.now() - start;
        // Base log entry
        const entry = {
            requestId: reqId,
            method: req.method,
            endpoint: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: totalMs,
            totalMs,
        };
        // Attach file name if present (multipart upload)
        if (req.file?.originalname) {
            entry.fileName = req.file.originalname;
        }
        // Attach ingestion timings if the ingest endpoint attached them
        const timings = res.locals.ingestionTimings;
        if (timings) {
            entry.extractMs = timings.extractMs;
            entry.cleanMs = timings.cleanMs;
            entry.parseMs = timings.parseMs;
            entry.embeddingMs = timings.embeddingMs;
            entry.mongoInsertMs = timings.mongoInsertMs;
        }
        const retrievalTimings = res.locals.retrievalTimings;
        const retrievalWarnings = res.locals.retrievalWarnings;
        const retrievalFallbacks = res.locals.retrievalFallbacks;
        if (retrievalTimings)
            entry.componentTimings = retrievalTimings;
        if (retrievalWarnings?.length)
            entry.retrievalWarnings = retrievalWarnings;
        if (retrievalFallbacks)
            entry.retrievalFallbacks = retrievalFallbacks;
        console.log(JSON.stringify(entry));
    });
    next();
}
