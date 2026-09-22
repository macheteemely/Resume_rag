"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeParserService = void 0;
const fs_1 = __importDefault(require("fs"));
// pdf-parse exports named class PDFParse — constructor takes { data: Buffer, ...options }
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require("pdf-parse");
class ResumeParserService {
    /**
     * Extract raw text from a PDF file at the given path.
     * Cleans up the temp file after extraction regardless of success/failure.
     */
    async extractTextFromPdf(filePath) {
        let buffer;
        try {
            buffer = fs_1.default.readFileSync(filePath);
        }
        catch {
            throw new Error("RESUME_EXTRACTION_FAILED");
        }
        finally {
            // Always clean up the temp file
            try {
                fs_1.default.unlinkSync(filePath);
            }
            catch { /* ignore */ }
        }
        // Pass buffer via constructor options — this version extracts directly with getText().
        const parser = new PDFParse({ data: buffer });
        try {
            const textResult = await parser.getText();
            const rawText = (textResult?.text ?? "").trim();
            if (!rawText) {
                throw new Error("RESUME_EXTRACTION_FAILED");
            }
            return rawText;
        }
        finally {
            await parser.destroy();
        }
    }
}
exports.ResumeParserService = ResumeParserService;
