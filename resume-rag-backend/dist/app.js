"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const requestId_1 = require("./middleware/requestId");
const logger_1 = require("./middleware/logger");
const errorHandler_1 = require("./middleware/errorHandler");
const database_1 = require("./config/database");
const ingestionRoutes_1 = __importDefault(require("./modules/ingestion/routes/ingestionRoutes"));
const retrievalRoutes_1 = __importDefault(require("./modules/retrieval/routes/retrievalRoutes"));
const app = (0, express_1.default)();
// ── Core middleware ────────────────────────────────────────────────────────────
app.use((0, cors_1.default)());
app.use(requestId_1.requestId);
app.use(logger_1.logger);
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "1mb" }));
// ── Phase 1: App health ───────────────────────────────────────────────────────
app.get("/v1/health", (_req, res) => {
    res.status(200).json({
        status: "ok",
        app: "resume-rag-backend",
        version: "1.0.0",
        uptime: parseFloat(process.uptime().toFixed(1)),
    });
});
// ── Phase 2: Database health ──────────────────────────────────────────────────
app.get("/v1/health/db", async (_req, res) => {
    try {
        const start = Date.now();
        const db = (0, database_1.getDb)();
        // Ping the database with a lightweight command
        await db.command({ ping: 1 });
        const latencyMs = Date.now() - start;
        res.status(200).json({
            status: "ok",
            database: "mongodb",
            connected: true,
            latencyMs,
        });
    }
    catch (err) {
        res.status(503).json({
            status: "error",
            database: "mongodb",
            connected: false,
            errorCode: "DB_CONNECTION_FAILED",
        });
    }
});
// ── Ingestion module routes (Phase 3+) ───────────────────────────────────────
app.use("/v1", ingestionRoutes_1.default);
// ── Retrieval module routes ───────────────────────────────────────────────────
app.use("/v1", retrievalRoutes_1.default);
// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler_1.errorHandler);
exports.default = app;
