"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgorithmResumeParser = void 0;
const skills_1 = require("../../../config/skills");
const regex_1 = require("../utils/regex");
class AlgorithmResumeParser {
    parseResume(rawText) {
        const lines = rawText
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
        return {
            name: this.parseName(lines, rawText),
            email: (0, regex_1.extractEmail)(rawText) ?? undefined,
            phone: (0, regex_1.extractPhone)(rawText) ?? undefined,
            location: this.parseLocation(lines),
            company: this.parseCompany(lines, rawText),
            role: this.parseRole(lines, rawText),
            education: (0, regex_1.extractEducation)(rawText) ?? undefined,
            totalExperience: (0, regex_1.extractExperience)(rawText) ?? undefined,
            relevantExperience: undefined,
            skills: (0, skills_1.detectSkills)(rawText),
            jobTitles: this.parseJobTitles(lines, rawText),
            experienceSummary: this.parseExperienceSummary(rawText),
        };
    }
    // ── Private helpers ──────────────────────────────────────────────────────────
    parseName(lines, rawText) {
        const fromRegex = (0, regex_1.extractName)(rawText);
        if (fromRegex)
            return fromRegex;
        for (const line of lines.slice(0, 10)) {
            if (/\d|@|http|www|:|\||\//.test(line))
                continue;
            const words = line.split(/\s+/);
            if (words.length >= 2 && words.length <= 5 && words.every((w) => /^[A-Z]/.test(w))) {
                return line;
            }
        }
        return undefined;
    }
    parseRole(lines, rawText) {
        // Look for a standalone title line — has job title keyword, no date, near the top
        for (const line of lines.slice(0, 20)) {
            if (line.length < 5 || line.length > 150)
                continue;
            if (/\d{4}/.test(line))
                continue; // skip date-containing lines
            const hasKeyword = regex_1.JOB_TITLE_KEYWORDS.some((kw) => line.toLowerCase().includes(kw.toLowerCase()));
            if (hasKeyword)
                return line;
        }
        return undefined;
    }
    parseCompany(lines, rawText) {
        // Find PROFESSIONAL EXPERIENCE section, then grab company lines
        // Company lines look like: "Company Name | Month YYYY – Month YYYY/Present"
        const expIdx = rawText.toUpperCase().indexOf("PROFESSIONAL EXPERIENCE");
        const searchLines = expIdx > -1
            ? rawText.slice(expIdx).split("\n").map((l) => l.trim()).filter(Boolean)
            : lines;
        for (const line of searchLines.slice(0, 30)) {
            // Must contain a pipe AND a year/date range
            if (!line.includes("|"))
                continue;
            if (!/\d{4}|present/i.test(line))
                continue;
            // Must NOT be a section header (all caps lines)
            if (line === line.toUpperCase() && line.length > 5)
                continue;
            const parts = line.split("|");
            if (parts.length >= 2) {
                const companyPart = parts[0].replace(/^\d+\.\s*/, "").trim();
                // Skip if the "company" looks like a job title keyword line
                const looksLikeTitle = regex_1.JOB_TITLE_KEYWORDS.some((kw) => companyPart.toLowerCase() === kw.toLowerCase());
                if (companyPart.length > 2 && !looksLikeTitle)
                    return companyPart;
            }
        }
        return undefined;
    }
    parseLocation(lines) {
        for (const line of lines.slice(0, 20)) {
            if (/address|location|native|working|city|state/i.test(line)) {
                const colonIdx = line.indexOf(":");
                if (colonIdx > -1) {
                    const val = line.slice(colonIdx + 1).trim();
                    if (val)
                        return val;
                }
            }
        }
        return undefined;
    }
    parseJobTitles(lines, rawText) {
        const titles = [];
        const expIdx = rawText.toUpperCase().indexOf("PROFESSIONAL EXPERIENCE");
        if (expIdx === -1)
            return titles;
        const afterExp = rawText.slice(expIdx + "PROFESSIONAL EXPERIENCE".length);
        const nextSection = afterExp.match(/\n[A-Z][A-Z &\/]{4,}\n/);
        const expBlock = nextSection
            ? afterExp.slice(0, nextSection.index)
            : afterExp.slice(0, 1500);
        const expLines = expBlock.split("\n").map((l) => l.trim()).filter(Boolean);
        for (const line of expLines) {
            if (line.length < 3 || line.length > 80)
                continue;
            // Skip lines with dates or pipe (those are "Company | Date" lines)
            if (/\d{4}/.test(line))
                continue;
            if (line.includes("|"))
                continue;
            // Skip full sentences (contain period mid-line or are clearly sentences)
            if (/\.$/.test(line))
                continue;
            if (line === line.toUpperCase() && line.length > 5)
                continue;
            const hasKeyword = regex_1.JOB_TITLE_KEYWORDS.some((kw) => line.toLowerCase().includes(kw.toLowerCase()));
            // Cap at 6 words to avoid pulling in bullet-point sentences
            const wordCount = line.split(/\s+/).length;
            if (hasKeyword && wordCount <= 6 && !titles.includes(line)) {
                titles.push(line);
            }
        }
        return titles.slice(0, 5);
    }
    parseExperienceSummary(rawText) {
        const summaryStart = rawText.toUpperCase().indexOf("PROFESSIONAL SUMMARY");
        if (summaryStart === -1)
            return undefined;
        const afterSummary = rawText.slice(summaryStart + "PROFESSIONAL SUMMARY".length);
        // Stop at the next ALL-CAPS section header
        const nextSectionMatch = afterSummary.match(/\n[A-Z][A-Z\s]{3,}\n/);
        const summaryText = nextSectionMatch
            ? afterSummary.slice(0, nextSectionMatch.index)
            : afterSummary.slice(0, 500);
        const cleaned = summaryText.replace(/\n+/g, " ").trim();
        return cleaned.length > 10 ? cleaned.slice(0, 300) : undefined;
    }
}
exports.AlgorithmResumeParser = AlgorithmResumeParser;
