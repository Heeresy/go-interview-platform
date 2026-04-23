const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_PATH = 'f:\\GO platform\\interview-course-main';

const CATEGORIES = {
    '01_data_types': '93e6330a-dd87-4fb3-abb6-1a733b8aca04',
    '02_strings': 'd62034d1-b936-4a40-a816-55f7e087771d',
    '03_slices': '78deda17-723b-4e5b-8805-3498584f40f3',
    '04_map': '98b8e5e3-9106-4bc6-abcc-1ad9e4324817',
    '05_interfaces': 'fab66162-0e65-4c86-9eca-1db168542cae',
    '06_concurrency': '3a17a4b3-2367-4990-b31a-5a8770c93ee8',
    '07_concurrency_patterns': '034a349c-0070-4aec-90bf-a60d43f1b675',
    '08_code_review': 'a0399079-529d-4f7e-b559-79ac65c475de',
    '09_think_about_solution': '12a32dfc-1dd9-42ac-9e77-37dc1439b8d9',
    'stack': '1c85688a-d33b-45dc-91d1-efb34561bba9',
    'two_pointers': 'd14679c5-6cb1-4c2c-a504-4e2d9d8a1cc9',
    'hash_map': '03221890-0fe2-4005-9f31-15969f7e8dc2',
    'math_tricks': 'f3973493-ae39-42e5-bb3e-04ba15fa1269',
    'brute_force': '976ad8ee-808c-4262-bfcb-109db7abd78b'
};

async function migrate() {
    console.log('Starting migration...');

    // 1. Migrate Golang tasks
    const golangPath = path.join(BASE_PATH, 'golang');
    const golangDirs = fs.readdirSync(golangPath).filter(f => fs.statSync(path.join(golangPath, f)).isDirectory());

    for (const categoryDir of golangDirs) {
        const categoryId = CATEGORIES[categoryDir];
        if (!categoryId) {
            console.log(`Skipping unknown category: ${categoryDir}`);
            continue;
        }

        const tasksPath = path.join(golangPath, categoryDir);
        const taskDirs = fs.readdirSync(tasksPath).filter(f => fs.statSync(path.join(tasksPath, f)).isDirectory());

        for (const taskDir of taskDirs) {
            const taskPath = path.join(tasksPath, taskDir);

            const starterCodePath = path.join(taskPath, 'task', 'main.go');
            const solutionPath = path.join(taskPath, 'solution', 'main.go');

            if (!fs.existsSync(starterCodePath)) continue;

            const starterCode = fs.readFileSync(starterCodePath, 'utf8');
            const solution = fs.existsSync(solutionPath) ? fs.readFileSync(solutionPath, 'utf8') : null;

            const title = taskDir.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            let description = `### Задача: ${title}\n\n`;
            if (categoryDir === '08_code_review') {
                description += `Отрефакторите следующий код, исправьте ошибки и улучшите производительность.\n\n`;
            } else if (categoryDir === '06_concurrency' || categoryDir === '07_concurrency_patterns') {
                description += `Разберитесь в коде и исправьте проблемы с конкурентностью.\n\n`;
            } else {
                description += `Проанализируйте код и добейтесь его корректной работы.\n\n`;
            }

            const { data, error } = await supabase.from('tasks').insert({
                title,
                description,
                starter_code: starterCode,
                solution: solution ? '```go\n' + solution + '\n```' : null,
                difficulty: Math.min(parseInt(categoryDir.split('_')[0]) || 3, 5),
                category_id: categoryId,
                is_official: true,
                test_cases: []
            });

            if (error) console.error(`Error inserting ${title}:`, error.message);
            else console.log(`Migrated Go task: ${title}`);
        }
    }

    // 2. Migrate Algorithm tasks
    const algoPath = path.join(BASE_PATH, 'algorithm');
    const algoDirs = fs.readdirSync(algoPath).filter(f => fs.statSync(path.join(algoPath, f)).isDirectory());

    for (const categoryDir of algoDirs) {
        const categoryId = CATEGORIES[categoryDir];
        if (!categoryId) continue;

        const tasksPath = path.join(algoPath, categoryDir);
        const taskDirs = fs.readdirSync(tasksPath).filter(f => fs.statSync(path.join(tasksPath, f)).isDirectory());

        for (const taskDir of taskDirs) {
            const taskPath = path.join(tasksPath, taskDir);
            const starterCodePath = path.join(taskPath, 'task', 'main.go');
            const solutionPath = path.join(taskPath, 'solution', 'main.go');

            if (!fs.existsSync(starterCodePath)) continue;

            const starterCode = fs.readFileSync(starterCodePath, 'utf8');
            const solution = fs.existsSync(solutionPath) ? fs.readFileSync(solutionPath, 'utf8') : null;

            const title = taskDir.replace(/^\d+_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

            const { data, error } = await supabase.from('tasks').insert({
                title,
                description: `Решите алгоритмическую задачу: ${title}.`,
                starter_code: starterCode,
                solution: solution ? '```go\n' + solution + '\n```' : null,
                difficulty: 3,
                category_id: categoryId,
                is_official: true,
                test_cases: []
            });

            if (error) console.error(`Error inserting ${title}:`, error.message);
            else console.log(`Migrated Algo task: ${title}`);
        }
    }

    console.log('Migration completed!');
}

migrate();
