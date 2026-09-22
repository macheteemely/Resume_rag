"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanText = cleanText;
/**
 * Clean and normalise raw resume text extracted from a PDF.
 *
 * Rules:
 * - Normalise Windows/Mac line endings to \n
 * - Remove control characters (except \n and \t)
 * - Collapse multiple spaces / tabs on a single line to one space
 * - Trim leading/trailing whitespace per line
 * - Collapse 3+ consecutive blank lines down to one blank line
 * - Preserve meaningful symbols: C#, C++, .NET, email addresses, URLs
 * - Remove PDF artefacts like "-- N of M --" page markers
 */
function cleanText(rawText) {
    let text = rawText;
    // 1. Normalise line endings
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    // 2. Remove PDF page-marker artefacts e.g. "-- 1 of 2 --"
    text = text.replace(/^--\s*\d+\s*of\s*\d+\s*--$/gm, "");
    // 3. Remove non-printable control characters except \n and \t
    // eslint-disable-next-line no-control-regex
    text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
    // 4. Collapse multiple spaces/tabs within a line to a single space
    //    Split line-by-line so we don't touch newlines
    text = text
        .split("\n")
        .map((line) => line.replace(/[ \t]+/g, " ").trim())
        .join("\n");
    // 5. Collapse 3+ consecutive blank lines to a single blank line
    text = text.replace(/\n{3,}/g, "\n\n");
    // 6. Final trim
    return text.trim();
}
