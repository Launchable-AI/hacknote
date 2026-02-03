const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// Demo data to seed
const demoData = {
  workspaces: [
    { id: 'ws-1', name: 'PERSONAL', icon: '\u2B21', createdAt: Date.now() - 86400000 * 14 },
    { id: 'ws-2', name: 'WORK', icon: '\u2B21', createdAt: Date.now() - 86400000 * 7 }
  ],
  pages: [
    {
      id: 'page-1',
      workspaceId: 'ws-1',
      title: 'Project Ideas',
      type: 'notes',
      icon: '\u270E',
      content: '<h1>Project Ideas for 2026</h1><p>A collection of ideas to explore this year.</p><h2>AI Tools</h2><ul><li>Personal assistant with local LLM</li><li>Code review automation</li><li>Document summarizer</li></ul><h2>Hardware</h2><ul><li>Custom mechanical keyboard</li><li>Home automation hub</li><li>Raspberry Pi cluster</li></ul><blockquote>The best way to predict the future is to invent it.</blockquote>',
      todos: [],
      cards: [],
      createdAt: Date.now() - 86400000 * 7,
      updatedAt: Date.now()
    },
    {
      id: 'page-2',
      workspaceId: 'ws-1',
      title: 'Weekly Tasks',
      type: 'todo',
      icon: '\u2611',
      content: '',
      todos: [
        { id: 't1', text: 'Review pull requests', completed: true },
        { id: 't2', text: 'Update documentation', completed: true },
        { id: 't3', text: 'Fix authentication bug', completed: false },
        { id: 't4', text: 'Deploy to staging', completed: false },
        { id: 't5', text: 'Write unit tests', completed: false },
        { id: 't6', text: 'Team sync meeting', completed: true }
      ],
      cards: [],
      createdAt: Date.now() - 86400000 * 3,
      updatedAt: Date.now()
    },
    {
      id: 'page-3',
      workspaceId: 'ws-2',
      title: 'Sprint Board',
      type: 'board',
      icon: '\u25A6',
      content: '',
      todos: [],
      cards: [
        { id: 'c1', title: 'User authentication', description: 'Implement OAuth2 login flow', status: 'done', priority: 'high', createdAt: Date.now() - 86400000 * 5 },
        { id: 'c2', title: 'Database migrations', description: 'Set up Prisma schema', status: 'done', priority: 'high', createdAt: Date.now() - 86400000 * 4 },
        { id: 'c3', title: 'API rate limiting', description: 'Add Redis-based rate limiter', status: 'review', priority: 'medium', createdAt: Date.now() - 86400000 * 3 },
        { id: 'c4', title: 'Dashboard UI', description: 'Build analytics dashboard with charts', status: 'in-progress', priority: 'high', createdAt: Date.now() - 86400000 * 2 },
        { id: 'c5', title: 'Email notifications', description: 'SendGrid integration for alerts', status: 'in-progress', priority: 'medium', createdAt: Date.now() - 86400000 },
        { id: 'c6', title: 'Mobile responsive', description: 'Fix layout on small screens', status: 'backlog', priority: 'low', createdAt: Date.now() },
        { id: 'c7', title: 'Export to PDF', description: 'Generate PDF reports', status: 'backlog', priority: 'low', createdAt: Date.now() },
        { id: 'c8', title: 'Dark mode toggle', description: 'Add theme switcher', status: 'backlog', priority: 'critical', createdAt: Date.now() }
      ],
      createdAt: Date.now() - 86400000 * 5,
      updatedAt: Date.now()
    },
    {
      id: 'page-4',
      workspaceId: 'ws-2',
      title: 'Architecture',
      type: 'notes',
      icon: '\u270E',
      content: '<h1>System Architecture</h1><h2>Tech Stack</h2><ul><li><strong>Frontend:</strong> React + TypeScript</li><li><strong>Backend:</strong> Node.js + Express</li><li><strong>Database:</strong> PostgreSQL + Redis</li><li><strong>Deployment:</strong> Docker + Kubernetes</li></ul><h2>Key Decisions</h2><p>We chose a <code>microservices</code> approach to enable independent scaling of components.</p><pre><code>┌─────────┐     ┌─────────┐     ┌─────────┐\n│ Gateway │────▶│ Auth    │────▶│ Users   │\n└─────────┘     └─────────┘     └─────────┘\n     │\n     ▼\n┌─────────┐\n│ API     │\n└─────────┘</code></pre>',
      todos: [],
      cards: [],
      createdAt: Date.now() - 86400000 * 10,
      updatedAt: Date.now()
    }
  ],
  settings: {
    theme: 'cyber',
    accentColor: '#00ff9d',
    glowEnabled: true
  }
};

async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function recordDemo() {
  const outputDir = path.join(__dirname, '..', 'demo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clean up any existing video files
  const existingFiles = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  existingFiles.forEach(f => fs.unlinkSync(path.join(outputDir, f)));


  console.log('[DEMO] Launching browser...');
  const browser = await chromium.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1280, height: 720 }
    }
  });

  const page = await context.newPage();

  // Seed the database via API before navigating
  console.log('[DEMO] Seeding database...');

  // First, seed data directly via HTTP before opening the page
  const http = require('http');
  await new Promise((resolve, reject) => {
    const postData = JSON.stringify(demoData);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/data',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      res.on('end', resolve);
      res.resume();
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  // Now navigate to the app with data already in place (no reload needed)
  await page.goto('http://localhost:3000');
  await wait(2500);

  console.log('[DEMO] Starting walkthrough...');

  // === SCENE 1: Welcome screen ===
  await wait(2000);

  // === SCENE 2: Click on Project Ideas (notes) ===
  console.log('[DEMO] Opening notes page...');
  await page.click('[data-id="page-1"]');
  await wait(2500);

  // Scroll through notes
  await page.evaluate(() => {
    const editor = document.getElementById('notesContent');
    if (editor) editor.scrollTop = editor.scrollHeight / 2;
  });
  await wait(1500);

  // === SCENE 3: Switch to Todo page ===
  console.log('[DEMO] Opening todo page...');
  await page.click('[data-id="page-2"]');
  await wait(2000);

  // Toggle a todo item
  const todoCheckbox = await page.$('.todo-checkbox');
  if (todoCheckbox) {
    await todoCheckbox.click();
    await wait(1000);
  }

  // Show filters
  await page.click('[data-filter="active"]');
  await wait(1200);
  await page.click('[data-filter="completed"]');
  await wait(1200);
  await page.click('[data-filter="all"]');
  await wait(1000);

  // === SCENE 4: Switch to Work workspace ===
  console.log('[DEMO] Switching workspace...');
  await page.click('[data-id="ws-2"]');
  await wait(1500);

  // === SCENE 5: Open Kanban board ===
  console.log('[DEMO] Opening kanban board...');
  await page.click('[data-id="page-3"]');
  await wait(2500);

  // Click on a card to show modal
  const card = await page.$('.board-card');
  if (card) {
    await card.click();
    await wait(2000);
    // Close modal
    await page.click('[data-close="cardModal"]');
    await wait(1000);
  }

  // === SCENE 6: Open Architecture notes ===
  console.log('[DEMO] Opening architecture notes...');
  await page.click('[data-id="page-4"]');
  await wait(2500);

  // === SCENE 7: Show settings/themes ===
  console.log('[DEMO] Opening settings...');
  await page.click('#settingsBtn');
  await wait(1500);

  // Switch to light theme
  await page.click('[data-theme="professional"]');
  await wait(2000);

  // Switch to dark theme
  await page.click('[data-theme="professional-dark"]');
  await wait(2000);

  // Back to cyberpunk
  await page.click('[data-theme="cyber"]');
  await wait(1500);

  // Change accent color
  await page.click('[data-color="#00ffff"]');
  await wait(1500);
  await page.click('[data-color="#ff00ff"]');
  await wait(1500);
  await page.click('[data-color="#00ff9d"]');
  await wait(1000);

  // Close settings
  await page.click('[data-close="settingsModal"]');
  await wait(1500);

  // === SCENE 8: Back to welcome ===
  console.log('[DEMO] Returning to welcome...');
  await page.click('.logo');
  await wait(2500);

  // Wrap up
  console.log('[DEMO] Recording complete, saving video...');
  await context.close();
  await browser.close();

  // Find the recorded video
  const files = fs.readdirSync(outputDir);
  const videoFile = files.find(f => f.endsWith('.webm'));
  if (videoFile) {
    const oldPath = path.join(outputDir, videoFile);
    const newPath = path.join(outputDir, 'hacknote-demo.webm');
    fs.renameSync(oldPath, newPath);
    console.log(`[DEMO] Video saved to: ${newPath}`);
  }

  console.log('[DEMO] Done!');
}

recordDemo().catch(err => {
  console.error('[DEMO] Error:', err);
  process.exit(1);
});
