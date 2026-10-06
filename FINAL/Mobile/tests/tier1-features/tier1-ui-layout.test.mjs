import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTrue, assertIncludes } from '../helpers/assertions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export async function run() {
  console.log('🧪 Running Tier 1 UI/UX & Responsive Layout Tests...');

  // 1. Check globals.css primitives and breakpoint rules
  const globalsCssPath = path.join(rootDir, 'src/app/globals.css');
  assertTrue(fs.existsSync(globalsCssPath), 'globals.css must exist');
  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

  assertIncludes(globalsCss, '.bss-kpi-grid', 'globals.css must define .bss-kpi-grid');
  assertIncludes(globalsCss, '.bss-kpi-card', 'globals.css must define .bss-kpi-card');
  assertIncludes(globalsCss, '.bss-kpi-icon', 'globals.css must define .bss-kpi-icon');
  assertIncludes(globalsCss, 'margin-top: auto', 'globals.css must bottom-pin strong in .bss-kpi-card');
  assertIncludes(globalsCss, 'viewport-fit=cover', 'globals.css must support iOS safe-area viewportFit: cover');
  assertIncludes(globalsCss, '.pb-safe', 'globals.css must define .pb-safe');
  assertIncludes(globalsCss, '.pb-safe-lg', 'globals.css must define .pb-safe-lg');
  assertIncludes(globalsCss, '@media (max-width: 1180px)', 'globals.css must define tablet/mobile navigation breakpoint');
  assertIncludes(globalsCss, '@media (min-width: 1181px)', 'globals.css must define desktop navigation breakpoint');

  // 2. Check layout shells for breakpoint conflict resolution
  const shellFiles = [
    'src/components/worker/WorkerShell.tsx',
    'src/components/employer/EmployerShell.tsx',
    'src/components/contractor/ContractorShell.tsx',
    'src/components/support/SupportShell.tsx',
    'src/components/government/GovernmentShell.tsx',
  ];

  for (const relPath of shellFiles) {
    const filePath = path.join(rootDir, relPath);
    assertTrue(fs.existsSync(filePath), `${relPath} must exist`);
    const content = fs.readFileSync(filePath, 'utf8');

    assertIncludes(content, 'bss-desktop-nav', `${relPath} must use .bss-desktop-nav`);
    assertIncludes(content, 'bss-mobile-trigger', `${relPath} must use .bss-mobile-trigger`);
    assertIncludes(content, 'bss-mobile-menu', `${relPath} must use .bss-mobile-menu`);

    // Ensure conflicting md:hidden / hidden md:flex are NOT attached to navigation elements
    const desktopNavMatch = content.match(/className="[^"]*bss-desktop-nav[^"]*"/);
    assertTrue(Boolean(desktopNavMatch), `${relPath} must have className with bss-desktop-nav`);
    assertTrue(!desktopNavMatch[0].includes('md:flex'), `${relPath} bss-desktop-nav must not have md:flex`);
    assertTrue(!desktopNavMatch[0].includes('hidden'), `${relPath} bss-desktop-nav must not have hidden`);

    const mobileTriggerMatch = content.match(/className="[^"]*bss-mobile-trigger[^"]*"/);
    assertTrue(Boolean(mobileTriggerMatch), `${relPath} must have className with bss-mobile-trigger`);
    assertTrue(!mobileTriggerMatch[0].includes('md:hidden'), `${relPath} bss-mobile-trigger must not have md:hidden`);

    const mobileMenuMatch = content.match(/className="[^"]*bss-mobile-menu[^"]*"/);
    assertTrue(Boolean(mobileMenuMatch), `${relPath} must have className with bss-mobile-menu`);
    assertTrue(!mobileMenuMatch[0].includes('md:hidden'), `${relPath} bss-mobile-menu must not have md:hidden`);
  }

  // 3. Check 6 Dashboards for uniform bss-kpi-card & bss-kpi-grid layout
  const dashboards = [
    { file: 'src/app/worker/page.tsx', role: 'Worker' },
    { file: 'src/app/employer/dashboard/page.tsx', role: 'Employer' },
    { file: 'src/app/contractor/dashboard/page.tsx', role: 'Contractor' },
    { file: 'src/components/support/BssStaffDashboard.tsx', role: 'BSS Staff' },
    { file: 'src/components/support/ItOperationsDashboard.tsx', role: 'IT Helpdesk' },
    { file: 'src/app/government/page.tsx', role: 'Government' },
  ];

  for (const { file, role } of dashboards) {
    const filePath = path.join(rootDir, file);
    assertTrue(fs.existsSync(filePath), `${file} (${role}) must exist`);
    const content = fs.readFileSync(filePath, 'utf8');

    assertIncludes(content, 'bss-kpi-grid', `${file} (${role}) must use .bss-kpi-grid`);
    if (role === 'Government') {
      const chartsPath = path.join(rootDir, 'src/components/government/Charts.tsx');
      const chartsContent = fs.readFileSync(chartsPath, 'utf8');
      assertIncludes(chartsContent, 'bss-kpi-card', `Charts.tsx must use .bss-kpi-card for Government KPIs`);
    } else {
      assertIncludes(content, 'bss-kpi-card', `${file} (${role}) must use .bss-kpi-card`);
    }
  }

  // 4. Check Root Layout viewport config
  const rootLayoutPath = path.join(rootDir, 'src/app/layout.tsx');
  const rootLayoutContent = fs.readFileSync(rootLayoutPath, 'utf8');
  assertIncludes(rootLayoutContent, 'viewportFit: "cover"', 'Root layout must configure viewportFit: "cover"');

  console.log('✅ All UI/UX & Responsive Layout tests passed successfully.');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('❌ Test failed:', err);
    process.exit(1);
  });
}
