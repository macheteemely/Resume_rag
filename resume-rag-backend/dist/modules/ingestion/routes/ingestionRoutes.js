"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const ingestionController_1 = require("../controllers/ingestionController");
const multerConfig_1 = require("../../../config/multerConfig");
const router = (0, express_1.Router)();
// Reusable multer middleware with error handling
function multerUpload(req, res, next) {
    multerConfig_1.upload.single("file")(req, res, (err) => {
        if (err instanceof multer_1.default.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                res.status(413).json({
                    success: false,
                    errorCode: "FILE_TOO_LARGE",
                    message: `Resume exceeds maximum upload size of ${process.env.MAX_UPLOAD_SIZE_MB ?? 5}MB`,
                });
                return;
            }
            res.status(400).json({
                success: false,
                errorCode: "UPLOAD_ERROR",
                message: err.message,
            });
            return;
        }
        if (err instanceof Error && err.message === "INVALID_FILE_TYPE") {
            res.status(415).json({
                success: false,
                errorCode: "INVALID_FILE_TYPE",
                message: "Only PDF files are allowed",
            });
            return;
        }
        if (err) {
            return next(err);
        }
        next();
    });
}
// Phase 3 — module readiness check
router.get("/resume/health", ingestionController_1.ingestionController.moduleHealth);
// Phase 4 — PDF upload
router.post("/resume/upload", multerUpload, ingestionController_1.ingestionController.uploadResume);
// Phase 5 — PDF text extraction
router.post("/resume/extract", multerUpload, ingestionController_1.ingestionController.extractResume);
// Phase 6 — Text cleaning (JSON body, no file upload)
router.post("/resume/clean", ingestionController_1.ingestionController.cleanResume);
// Phase 8 — Skills detection
router.post("/resume/skills", ingestionController_1.ingestionController.detectSkillsFromText);
// Phase 9 — Algorithm resume parser
router.post("/resume/parse", ingestionController_1.ingestionController.parseResume);
// Phase 10 — Optional LLM parser
router.post("/resume/llm-parse", ingestionController_1.ingestionController.llmParseResume);
// Phase 11 — Mistral embedding
router.post("/resume/embed", ingestionController_1.ingestionController.embedResume);
// Phase 12 — MongoDB resume storage
router.post("/resume/store", ingestionController_1.ingestionController.storeResume);
// Phase 13 — Full end-to-end ingestion
router.post("/resume/ingest", multerUpload, ingestionController_1.ingestionController.ingestResume);
exports.default = router;
