import fs from 'node:fs';
import path from 'node:path';

const rootDir = '/home/omeena/Zoho WorkDrive/My Folders/SynUbuntu/projects/Antigravity/BSS_Gravity';
const errors = [];
let checksRun = 0;

function check(name, pass, msg) {
  checksRun++;
  if (!pass) {
    errors.push(`[FAIL] ${name}: ${msg}`);
  } else {
    console.log(`[PASS] ${name}`);
  }
}

// 1. globals.css
const cssPath = path.join(rootDir, 'src/app/globals.css');
const css = fs.readFileSync(cssPath, 'utf8');

check('globals.css defines .bss-kpi-grid', css.includes('.bss-kpi-grid'), 'Missing .bss-kpi-grid');
check('globals.css defines .bss-kpi-card', css.includes('.bss-kpi-card'), 'Missing .bss-kpi-card');
check('globals.css defines .bss-kpi-icon', css.includes('.bss-kpi-icon'), 'Missing .bss-kpi-icon');
check('globals.css bottom-pins strong in .bss-kpi-card', css.includes('margin-top: auto'), 'Missing margin-top: auto');
check('globals.css media query max-width 1180px', css.includes('@media (max-width: 1180px)'), 'Missing max-width 1180px');
check('globals.css media query min-width 1181px', css.includes('@media (min-width: 1181px)'), 'Missing min-width 1181px');
check('globals.css safe-area inset top', css.includes('env(safe-area-inset-top)'), 'Missing env(safe-area-inset-top)');
check('globals.css safe-area inset bottom', css.includes('env(safe-area-inset-bottom)'), 'Missing env(safe-area-inset-bottom)');
check('globals.css defines .pb-safe', css.includes('.pb-safe'), 'Missing .pb-safe');
check('globals.css defines .pb-safe-lg', css.includes('.pb-safe-lg'), 'Missing .pb-safe-lg');

// 2. Shells
const shells = [
  'src/components/worker/WorkerShell.tsx',
  'src/components/employer/EmployerShell.tsx',
  'src/components/contractor/ContractorShell.tsx',
  'src/components/support/SupportShell.tsx',
  'src/components/government/GovernmentShell.tsx',
];

for (const relPath of shells) {
  const filePath = path.join(rootDir, relPath);
  const content = fs.readFileSync(filePath, 'utf8');
  check(`${relPath} has bss-desktop-nav`, content.includes('bss-desktop-nav'), 'Missing bss-desktop-nav');
  check(`${relPath} has bss-mobile-trigger`, content.includes('bss-mobile-trigger'), 'Missing bss-mobile-trigger');
  check(`${relPath} has bss-mobile-menu`, content.includes('bss-mobile-menu'), 'Missing bss-mobile-menu');

  // Verify conflicting classes are removed
  const desktopMatch = content.match(/className="[^"]*bss-desktop-nav[^"]*"/);
  check(`${relPath} desktop nav without hidden/md:flex conflict`, desktopMatch && !desktopMatch[0].includes('hidden') && !desktopMatch[0].includes('md:flex'), `Conflict found in ${desktopMatch ? desktopMatch[0] : 'none'}`);

  const mobileTriggerMatch = content.match(/className="[^"]*bss-mobile-trigger[^"]*"/);
  check(`${relPath} mobile trigger without md:hidden conflict`, mobileTriggerMatch && !mobileTriggerMatch[0].includes('md:hidden'), `Conflict found in ${mobileTriggerMatch ? mobileTriggerMatch[0] : 'none'}`);

  const mobileMenuMatch = content.match(/className="[^"]*bss-mobile-menu[^"]*"/);
  check(`${relPath} mobile menu without md:hidden conflict`, mobileMenuMatch && !mobileMenuMatch[0].includes('md:hidden'), `Conflict found in ${mobileMenuMatch ? mobileMenuMatch[0] : 'none'}`);
}

// 3. Dashboards
const dashboards = [
  { path: 'src/app/worker/page.tsx', name: 'Worker' },
  { path: 'src/app/employer/dashboard/page.tsx', name: 'Employer' },
  { path: 'src/app/contractor/dashboard/page.tsx', name: 'Contractor' },
  { path: 'src/app/contractor/submissions/page.tsx', name: 'Contractor Submissions' },
  { path: 'src/components/support/BssStaffDashboard.tsx', name: 'BSS Staff' },
  { path: 'src/components/support/ItOperationsDashboard.tsx', name: 'IT Helpdesk' },
  { path: 'src/app/government/page.tsx', name: 'Government' },
];

for (const d of dashboards) {
  const filePath = path.join(rootDir, d.path);
  const content = fs.readFileSync(filePath, 'utf8');
  check(`${d.name} dashboard has .bss-kpi-grid`, content.includes('bss-kpi-grid'), `Missing .bss-kpi-grid in ${d.path}`);
  if (d.name === 'Government') {
    const chartsPath = path.join(rootDir, 'src/components/government/Charts.tsx');
    const chartsContent = fs.readFileSync(chartsPath, 'utf8');
    check('Government Charts.tsx has .bss-kpi-card', chartsContent.includes('bss-kpi-card'), 'Missing .bss-kpi-card in Charts.tsx');
  } else {
    check(`${d.name} dashboard has .bss-kpi-card`, content.includes('bss-kpi-card'), `Missing .bss-kpi-card in ${d.path}`);
  }
}

// 4. layout.tsx
const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');
check('layout.tsx has viewportFit: "cover"', layoutContent.includes('viewportFit: "cover"'), 'Missing viewportFit: cover');

console.log(`\n========================================`);
console.log(`Summary: ${checksRun - errors.length} / ${checksRun} checks passed.`);
if (errors.length > 0) {
  console.error(`FAILED CHECKS:\n${errors.join('\n')}`);
  process.exit(1);
} else {
  console.log(`ALL FORENSIC AUDIT CHECKS PASSED.`);
}
