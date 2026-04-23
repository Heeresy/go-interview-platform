/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

// UUIDs from initial_schema.sql
const CATEGORY_IDS = {
    'Общее': '8c3b4d2e-1f5a-4b9c-8e7d-6c5b4a3f2e1d',
    'Go': '1b3e2d1c-5f4a-3b2c-1d0e-9f8e7d6c5b4a',
    'Go Advanced': '4b3e2d1c-5f4a-3b2c-1d0e-9f8e7d6c5b4a',
    'Architecture': '3c4d5e6f-7a8b-9c0d-1e2f-3a4b5c6d7e8f',
    'Algorithms': '2b3a4c5d-6e7f-8a9b-0c1d-2e3f4a5b6c7d',
    'Infrastructure': 'd1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    'Networking': '5d4c3b2a-1f0e-9d8c-7b6a-5e4d3c2b1a0f',
    'Databases': 'f1a2b3c4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'
};

// Map Theory.md headers to our consolidated names
const THEORY_MAP = {
    'Общее': 'Общее',
    'Go': 'Go',
    'Базы Данных (PostgreSQL)': 'Databases',
    'Соседние технологии & Систем дизайн': 'Architecture'
};

const TAG_MAP = {
    'concurrency': 'Go', 'goroutine': 'Go', 'channel': 'Go', 'interface': 'Go',
    'gc': 'Go Advanced', 'garbage collection': 'Go Advanced', 'memory': 'Go Advanced', 'performance': 'Go Advanced', 'benchmarking': 'Go Advanced', 'profiling': 'Go Advanced',
    'architecture': 'Architecture', 'distributed': 'Architecture', 'scalability': 'Architecture', 'microservices': 'Architecture', 'system design': 'Architecture', 'communication': 'Architecture', 'high load': 'Architecture',
    'sql': 'Databases', 'database': 'Databases', 'databases': 'Databases', 'postgres': 'Databases', 'data storage': 'Databases', 'postgresql': 'Databases',
    'redis': 'Infrastructure', 'kafka': 'Infrastructure', 'rabbitmq': 'Infrastructure', 'docker': 'Infrastructure', 'kubernetes': 'Infrastructure', 'infrastructure': 'Infrastructure',
    'networking': 'Networking', 'tcp': 'Networking', 'udp': 'Networking', 'http': 'Networking', 'grpc': 'Networking',
    'algorithms': 'Algorithms', 'data structures': 'Algorithms', 'data structure': 'Algorithms', 'sorting': 'Algorithms', 'binary search': 'Algorithms'
};

function getDifficulty(text, tags = []) {
    const combined = (text + ' ' + tags.join(' ')).toLowerCase();
    if (combined.includes('swisstable') || combined.includes('runtime') || combined.includes('mutex') || combined.includes('atomic')) return 4;
    if (combined.includes('gc') || combined.includes('pprof') || combined.includes('escape analysis')) return 5;
    if (combined.includes('interface') || combined.includes('goroutine') || combined.includes('slice')) return 3;
    return 2;
}

function getCategory(tags = [], defaultCat = 'Go', title = '') {
    for (const tag of tags) {
        const lowerTag = tag.toLowerCase().trim();
        if (TAG_MAP[lowerTag]) return TAG_MAP[lowerTag];
    }
    if (tags.length > 0) console.log(`No match for tags [${tags.join(', ')}] in "${title}"`);
    return defaultCat;
}

function cleanDescription(text) {
    return text.replace(/Ghost GPT.*?\n/g, '').replace(/!\[\].*?\n/g, '').replace(/\[Возможности\].*?\n/g, '').replace(/\[.*?\]\(.*?\)/g, '').trim();
}

function parseTheory(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const sections = content.split(/###\s+/);
    const questions = [];

    for (const section of sections) {
        if (!section.trim()) continue;
        const lines = section.split('\n');
        const categoryHeader = lines[0].trim();
        const bodyLines = lines.slice(1);

        const qIndices = [];
        bodyLines.forEach((line, idx) => {
            if (line.trim() === '?') qIndices.push(idx);
        });

        let lastIdx = 0;
        qIndices.forEach((qIdx) => {
            const questionLines = bodyLines.slice(lastIdx, qIdx).filter(l => l.trim() !== '');
            const rawQ = questionLines[questionLines.length - 1] || 'Unknown Question';

            let nextStart = (qIdx + 1);
            let nextEnd = bodyLines.length;

            const followingQIdx = qIndices.find(idx => idx > qIdx);
            if (followingQIdx) {
                let foundNextQStart = followingQIdx - 1;
                while (foundNextQStart > qIdx && bodyLines[foundNextQStart].trim() === '') foundNextQStart--;
                nextEnd = foundNextQStart;
            }

            const rawA = bodyLines.slice(nextStart, nextEnd).join('\n').trim();
            const categoryName = THEORY_MAP[categoryHeader] || 'Go';

            questions.push({
                title: rawQ.slice(0, 100),
                description: rawQ,
                category_name: categoryName,
                difficulty: getDifficulty(rawQ + ' ' + rawA),
                reference_answer: rawA
            });

            lastIdx = nextEnd;
        });
    }
    return questions;
}

function parseBackendQuestions(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const questions = [];
    const chunks = content.split(/\n---\s*\n/);

    for (const chunk of chunks) {
        if (!chunk.trim()) continue;
        const titleMatch = chunk.match(/^##\s+(.*)/m);
        if (!titleMatch) continue;

        const title = titleMatch[1].trim();
        const mainAnswerMatch = chunk.match(/Ответ\n-----\n([\s\S]*?)(?=Подробный ответ|###|$)/);
        const detailedAnswerMatch = chunk.match(/Подробный ответ\n===============\n([\s\S]*?)(?=###|$)/);
        const tagsMatch = chunk.match(/###\s+Теги\n([\s\S]*?)(?=###|Создано|$)/);

        const tags = tagsMatch ? tagsMatch[1].split('\n').map(t => t.trim()).filter(t => t) : [];
        const resAnswer = (mainAnswerMatch ? mainAnswerMatch[1] : '') + (detailedAnswerMatch ? '\n\n' + detailedAnswerMatch[1] : '');
        const cleanA = cleanDescription(resAnswer);
        const categoryName = getCategory(tags, 'Go', title);

        questions.push({
            title: title.slice(0, 100),
            description: title,
            category_name: categoryName,
            difficulty: getDifficulty(title + ' ' + cleanA, tags),
            reference_answer: cleanA
        });
    }
    return questions;
}

const source1 = path.join(__dirname, '../../Теория.md');
const source2 = path.join(__dirname, '../../golang_backend_questions.md');

let rawQuestions = [];
if (fs.existsSync(source1)) rawQuestions = rawQuestions.concat(parseTheory(source1));
if (fs.existsSync(source2)) rawQuestions = rawQuestions.concat(parseBackendQuestions(source2));

const uniqueQuestions = new Map();
rawQuestions.forEach(q => {
    const key = q.description.toLowerCase().trim();
    if (!uniqueQuestions.has(key)) {
        uniqueQuestions.set(key, q);
    } else {
        const existing = uniqueQuestions.get(key);
        if (q.reference_answer.length > existing.reference_answer.length) {
            uniqueQuestions.set(key, q);
        }
    }
});

const allQuestions = Array.from(uniqueQuestions.values());

let sql = `-- Non-destructive cleanup and import script\n\n`;

// Add a temporary unique constraint to description if it doesn't exist
sql += `-- Ensure the questions table has a unique constraint on description for upserting\n`;
sql += `DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'questions_description_unique') THEN
        ALTER TABLE public.questions ADD CONSTRAINT questions_description_unique UNIQUE (description);
    END IF;
END $$;\n\n`;

sql += `-- Ensure Categories exist\n`;
Object.keys(CATEGORY_IDS).forEach(name => {
    const slug = name.toLowerCase().replace(/[^\wа-яё]+/gi, '-').replace(/^-+|-+$/g, '');
    sql += `INSERT INTO public.categories (name, slug)
VALUES ('${name}', '${slug}')
ON CONFLICT (name) DO NOTHING;\n\n`;
});

sql += `-- Insert or Update Questions using dynamic category lookup\n`;
allQuestions.forEach(q => {
    sql += `INSERT INTO public.questions (category_id, title, description, difficulty, reference_answer, is_official)
SELECT id, $T$${q.title}$T$, $D$${q.description}$D$, ${q.difficulty}, $A$${q.reference_answer}$A$, true
FROM public.categories 
WHERE name = '${q.category_name}'
ON CONFLICT (description) DO UPDATE 
SET category_id = EXCLUDED.category_id,
    title = EXCLUDED.title,
    reference_answer = EXCLUDED.reference_answer,
    difficulty = EXCLUDED.difficulty;\n\n`;
});

const outPath = path.join(__dirname, '../supabase/migrations/import_theory.sql');
fs.writeFileSync(outPath, sql);
console.log(`Generated ${allQuestions.length} questions in ${outPath}`);
