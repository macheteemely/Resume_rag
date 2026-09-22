"use strict";
/**
 * Reusable deterministic regex utilities for resume parsing.
 * No API endpoint — consumed internally by AlgorithmResumeParser.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.JOB_TITLE_KEYWORDS = exports.EDUCATION_REGEX = exports.NAME_REGEX = exports.EXPERIENCE_REGEX = exports.PHONE_REGEX = exports.EMAIL_REGEX = void 0;
exports.extractEmail = extractEmail;
exports.extractPhone = extractPhone;
exports.extractExperience = extractExperience;
exports.extractEducation = extractEducation;
exports.extractName = extractName;
// ── Contact ───────────────────────────────────────────────────────────────────
exports.EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
// Matches Indian mobile numbers: +91-XXXXXXXXXX, 91XXXXXXXXXX, 0XXXXXXXXXX, XXXXXXXXXX
exports.PHONE_REGEX = /(\+91[\-\s]?)?[0]?(91)?[789]\d{9}/;
// ── Experience ────────────────────────────────────────────────────────────────
// Matches "13+ years", "13 years", "13.5 years", "5 yrs"
exports.EXPERIENCE_REGEX = /(\d+(\.\d+)?)\+?\s*(years?|yrs?)\s*(of\s+experience)?/i;
// ── Name heuristic ────────────────────────────────────────────────────────────
// Two or three capitalised words on a line — likely a person's name
exports.NAME_REGEX = /^([A-Z][a-zA-Z'-]+(?:\s[A-Z][a-zA-Z'-]+){1,3})$/m;
// ── Education ─────────────────────────────────────────────────────────────────
exports.EDUCATION_REGEX = /\b(B\.?Tech|B\.?E|B\.?Sc|M\.?Tech|M\.?Sc|MBA|MCA|BCA|Ph\.?D|Bachelor|Master|Diploma)\b[^\n]*/i;
// ── Job title keywords ────────────────────────────────────────────────────────
exports.JOB_TITLE_KEYWORDS = [
    "Engineer",
    "Developer",
    "Architect",
    "Manager",
    "Lead",
    "Analyst",
    "Designer",
    "Consultant",
    "Specialist",
    "Director",
    "Executive",
    "Trainer",
    "Intern",
];
// ── Helper functions ──────────────────────────────────────────────────────────
/**
 * Extract the first email address found in text.
 */
function extractEmail(text) {
    const match = text.match(exports.EMAIL_REGEX);
    return match ? match[0] : null;
}
/**
 * Extract the first phone number found in text.
 */
function extractPhone(text) {
    const match = text.match(exports.PHONE_REGEX);
    return match ? match[0] : null;
}
/**
 * Extract total years of experience as a number.
 * e.g. "13+ years of experience" → 13
 */
function extractExperience(text) {
    const match = text.match(exports.EXPERIENCE_REGEX);
    if (!match)
        return null;
    const value = parseFloat(match[1]);
    return isNaN(value) ? null : Math.floor(value);
}
/**
 * Extract education qualification from text.
 */
function extractEducation(text) {
    const match = text.match(exports.EDUCATION_REGEX);
    return match ? match[0].trim() : null;
}
/**
 * Attempt to extract candidate name — returns the first line that looks
 * like a proper name (2–4 capitalised words, no digits or special chars).
 */
function extractName(text) {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    for (const line of lines.slice(0, 10)) {
        // Skip lines with digits, emails, URLs, or too many words
        if (/\d|@|http|www|:/.test(line))
            continue;
        const words = line.split(/\s+/);
        if (words.length < 2 || words.length > 5)
            continue;
        // All words should start with a capital letter
        if (words.every((w) => /^[A-Z]/.test(w))) {
            return line;
        }
    }
    return null;
}
