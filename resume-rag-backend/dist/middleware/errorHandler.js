"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Errors = exports.AppError = void 0;
exports.errorHandler = errorHandler;
// ── AppError ──────────────────────────────────────────────────────────────────
class AppError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }
}
exports.AppError = AppError;
// ── Spec-defined error factories ──────────────────────────────────────────────
exports.Errors = {
    FILE_REQUIRED: () => new AppError("Resume PDF is required", 400, "FILE_REQUIRED"),
    INVALID_FILE_TYPE: () => new AppError("Only PDF files are allowed", 415, "INVALID_FILE_TYPE"),
    FILE_TOO_LARGE: (maxMb) => new AppError(`Resume exceeds maximum upload size of ${maxMb}MB`, 413, "FILE_TOO_LARGE"),
    RESUME_EXTRACTION_FAILED: () => new AppError("Resume extraction failed", 422, "RESUME_EXTRACTION_FAILED"),
    RESUME_PARSE_FAILED: () => new AppError("Resume parsing failed", 422, "RESUME_PARSE_FAILED"),
    EMBEDDING_FAILED: () => new AppError("Mistral embedding failed", 502, "EMBEDDING_FAILED"),
    INGESTION_FAILED: () => new AppError("Resume ingestion failed", 500, "INGESTION_FAILED"),
};
// ── Global error handler middleware ───────────────────────────────────────────
function errorHandler(err, req, res, _next) {
    const reqId = req.requestId ?? "-";
    let statusCode = 500;
    let errorCode = "INTERNAL_SERVER_ERROR";
    let message = "An unexpected error occurred";
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        errorCode = err.errorCode;
        message = err.message;
    }
    else if (err instanceof Error) {
        message = err.message;
        if (err.type === "entity.too.large") {
            statusCode = 413;
            errorCode = "PAYLOAD_TOO_LARGE";
            message = "Request payload exceeds the maximum allowed size";
        }
    }
    // Do not leak stack traces or internal messages in production
    if (process.env.NODE_ENV === "development") {
        console.error(JSON.stringify({
            requestId: reqId,
            errorCode,
            message: err.message,
            stack: err.stack,
        }));
    }
    else {
        console.error(JSON.stringify({ requestId: reqId, errorCode, message }));
    }
    res.status(statusCode).json({
        success: false,
        requestId: reqId,
        errorCode,
        message,
    });
}
