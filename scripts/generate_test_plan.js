const fs = require('fs');
const path = require('path');

// Configuration
const PROJECT_ROOT = path.resolve(__dirname, '..');
const VIEWS_DIR = path.join(PROJECT_ROOT, 'views');
const API_DIR = path.join(PROJECT_ROOT, 'api');
const ROUTES_DIR = path.join(PROJECT_ROOT, 'routes');
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'generated_test_plan.csv');

// Test Plan Storage
const testPlan = [];

// Helper to add test case
function addTestCase(module, type, description, steps, expected) {
    testPlan.push({
        id: `${type === 'Frontend' ? 'FE' : 'BE'}-${testPlan.length + 100}`,
        module,
        type,
        description,
        steps: `"${steps}"`, // Quote for CSV
        expected: `"${expected}"`, // Quote for CSV
        status: 'Pending'
    });
}

// --- 1. View Analysis (Frontend) ---
function analyzeViews(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            analyzeViews(fullPath);
        } else if (file.endsWith('.njk')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const relativePath = path.relative(VIEWS_DIR, fullPath);
            const pageName = file.replace('.njk', '');
            const moduleName = relativePath.includes('admin') ? 'Admin Panel' : 'User Panel';

            // 1. Basic Page Load Test
            addTestCase(
                moduleName,
                'Frontend',
                `Verify ${pageName} page loads`,
                `1. Navigate to the route rendering ${relativePath}`,
                `Page should load without 404 or 500 errors`
            );

            // 2. Form Analysis
            if (content.includes('<form')) {
                const forms = content.match(/<form[\s\S]*?>/g) || [];
                forms.forEach((formTag, index) => {
                    let action = formTag.match(/action="([^"]+)"/);
                    action = action ? action[1] : 'current URL';
                    
                    addTestCase(
                        moduleName,
                        'Frontend',
                        `Verify Form Submission on ${pageName} (Form #${index + 1})`,
                        `1. Open ${pageName}\n2. Fill out form targeting ${action}\n3. Submit`,
                        `Form should submit to ${action} successfully`
                    );
                });
            }

            // 3. Modal Analysis
            if (content.includes('class="modal"')) {
                addTestCase(
                    moduleName,
                    'Frontend',
                    `Verify Modal Interaction on ${pageName}`,
                    `1. Open ${pageName}\n2. Trigger modal open\n3. Perform action inside modal`,
                    `Modal should open/close and handle actions`
                );
            }
            
            // 4. Button Analysis (Keywords)
            if (content.includes('btn-danger') || content.includes('Delete')) {
                addTestCase(
                    moduleName,
                    'Frontend',
                    `Verify Delete Functionality on ${pageName}`,
                    `1. Open ${pageName}\n2. Click Delete button/link\n3. Confirm dialog`,
                    `Item should be deleted`
                );
            }
        }
    });
}

// --- 2. Route/API Analysis (Backend) ---
function analyzeRoutes(dir) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            analyzeRoutes(fullPath);
        } else if (file.endsWith('.js')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            
            // Regex to find Express routes: router.get('/path', ...), app.post('/path', ...)
            const routeRegex = /(router|app)\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
            let match;

            while ((match = routeRegex.exec(content)) !== null) {
                const method = match[2].toUpperCase();
                const routePath = match[3];
                const cleanFileName = file.replace('.js', '');
                
                // Infer description
                let desc = `${method} request to ${routePath}`;
                let module = 'API';

                if (routePath.includes('login')) { desc = 'User Login'; module = 'Auth'; }
                else if (routePath.includes('register')) { desc = 'User Registration'; module = 'Auth'; }
                else if (method === 'GET') desc = `Fetch data from ${routePath}`;
                else if (method === 'POST') desc = `Create resource at ${routePath}`;
                else if (method === 'PUT') desc = `Update resource at ${routePath}`;
                else if (method === 'DELETE') desc = `Delete resource at ${routePath}`;

                addTestCase(
                    module,
                    'Backend',
                    `API: ${desc} (${cleanFileName})`,
                    `Send ${method} request to ${routePath}`,
                    `Return appropriate status code (200/201/204)`
                );
            }
        }
    });
}

// --- Execution ---
console.log('🔍 Scanning codebase for test cases...');

console.log(`📂 Analyzing Views in: ${VIEWS_DIR}`);
analyzeViews(VIEWS_DIR);

console.log(`📂 Analyzing APIs in: ${API_DIR}`);
analyzeRoutes(API_DIR);

console.log(`📂 Analyzing Routes in: ${ROUTES_DIR}`);
analyzeRoutes(ROUTES_DIR);

// --- Output ---
const csvHeader = 'ID,Module,Type,Description,Steps,Expected Result,Status\n';
const csvContent = testPlan.map(t => 
    `${t.id},${t.module},${t.type},"${t.description}",${t.steps},${t.expected},${t.status}`
).join('\n');

fs.writeFileSync(OUTPUT_FILE, csvHeader + csvContent);

console.log(`\n✅ Generated ${testPlan.length} test cases.`);
console.log(`📄 Saved to: ${OUTPUT_FILE}`);
