"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const env_1 = require("./env");
// Ensure uploads directory exists
const UPLOADS_DIR = path_1.default.resolve("uploads");
if (!fs_1.default.existsSync(UPLOADS_DIR)) {
    fs_1.default.mkdirSync(UPLOADS_DIR, { recursive: true });
}
// Use disk storage — safe temporary filenames, never trust client filename
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (_req, _file, cb) => {
        // Generate a safe unique name — no client-provided name used for storage
        const uniqueName = `resume_${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
        cb(null, uniqueName);
    },
});
// Accept only PDF files
const fileFilter = (_req, file, cb) => {
    const isPdf = file.mimetype === "application/pdf" ||
        path_1.default.extname(file.originalname).toLowerCase() === ".pdf";
    if (isPdf) {
        cb(null, true);
    }
    else {
        cb(new Error("INVALID_FILE_TYPE"));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    fileFilter,
    limits: {
        fileSize: env_1.ENV.MAX_UPLOAD_SIZE_MB * 1024 * 1024, // bytes
    },
});
