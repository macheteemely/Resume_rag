"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILLS = void 0;
exports.detectSkills = detectSkills;
/**
 * Master skills dictionary used for deterministic skill detection.
 * Entries are matched case-insensitively against resume text.
 * Order matters — longer/more-specific entries should come first
 * to avoid partial matches shadowing them.
 */
exports.SKILLS = [
    // Testing & QA
    "MCP (Model Context Protocol)",
    "Selenium WebDriver",
    "REST Assured",
    "API Testing",
    "DeepEval",
    "Playwright",
    "Cypress",
    "TestNG",
    "JUnit",
    "Cucumber",
    "Postman",
    "JMeter",
    "Appium",
    // AI / ML / GenAI
    "Langchain",
    "Langgraph",
    "RAG",
    "GenAI",
    "OpenAI",
    "Hugging Face",
    // Languages
    "Core Java",
    "Java",
    "Python",
    "C#",
    "C++",
    "TypeScript",
    "JavaScript",
    "Kotlin",
    "Swift",
    // Web / Frameworks
    "Node.js",
    "Express",
    "React",
    "Angular",
    "Vue",
    "Spring Boot",
    "Django",
    "FastAPI",
    ".NET",
    // Databases
    "MongoDB",
    "PostgreSQL",
    "MySQL",
    "Redis",
    "Elasticsearch",
    "SQL",
    // Cloud / DevOps
    "Azure DevOps",
    "AWS Lambda",
    "AWS",
    "Azure",
    "GCP",
    "Docker",
    "Kubernetes",
    "Jenkins",
    "GitHub Actions",
    "GitHub",
    "Terraform",
    // Digital Marketing (broad coverage)
    "Search Engine Optimization (SEO)",
    "Social Media Strategy (SMO)",
    "Meta Ads Campaigns",
    "Google Ads",
    "Google Analytics",
    "SEMrush",
    "Ahrefs",
    "Google Search Console",
    "WordPress",
    "Copywriting",
    "Lead Generation",
    "Team Leadership",
    "SEO",
    "SMO",
    // Other
    "Agile",
    "Scrum",
    "JIRA",
    "Confluence",
    "HTML",
    "CSS",
];
/**
 * Detect skills present in the given text.
 * Uses case-insensitive matching with boundary checks to avoid false positives.
 * Returns deduplicated list preserving the canonical casing from the dictionary.
 */
function detectSkills(text) {
    const found = [];
    const lowerText = text.toLowerCase();
    for (const skill of exports.SKILLS) {
        const lowerSkill = skill.toLowerCase();
        let idx = 0;
        let matched = false;
        while ((idx = lowerText.indexOf(lowerSkill, idx)) !== -1) {
            const before = idx > 0 ? lowerText[idx - 1] : " ";
            const after = idx + lowerSkill.length < lowerText.length
                ? lowerText[idx + lowerSkill.length]
                : " ";
            // Valid boundary chars: whitespace, punctuation, start/end of string
            const isBoundaryChar = (c) => /[\s,.()\-\/\|:;"'!?\n\t]/.test(c);
            if (isBoundaryChar(before) && isBoundaryChar(after)) {
                matched = true;
                break;
            }
            idx += lowerSkill.length;
        }
        if (matched && !found.includes(skill)) {
            found.push(skill);
        }
    }
    return found;
}
