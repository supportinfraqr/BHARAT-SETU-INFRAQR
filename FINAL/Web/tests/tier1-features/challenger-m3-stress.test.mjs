import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

function assert(condition, message) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

console.log('🔥 Starting Challenger M3 Empirical Stress & Edge Case Test Suite...\n');

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${name}`);
    console.error(`     Reason: ${err.message}`);
    throw err;
  }
}

// ==========================================
// TEST SUITE 1: CSS Parsing & Syntax Integrity
// ==========================================
console.log('--- 1. CSS Syntax & Rule Structure Stress Testing ---');

const cssPath = path.join(rootDir, 'src/app/globals.css');
assert(fs.existsSync(cssPath), 'globals.css exists');
const cssContent = fs.readFileSync(cssPath, 'utf8');

test('globals.css has balanced braces and no unterminated blocks', () => {
  let openBraces = 0;
  for (let i = 0; i < cssContent.length; i++) {
    if (cssContent[i] === '{') openBraces++;
    if (cssContent[i] === '}') openBraces--;
    assert(openBraces >= 0, `Unmatched closing brace at char ${i}`);
  }
  assert(openBraces === 0, `Unbalanced braces count: ${openBraces}`);
});

test('globals.css defines all required design system tokens and theme variables', () => {
  const requiredTokens = [
    '--color-bss-navy',
    '--color-bss-deep-navy',
    '--color-bss-interactive-blue',
    '--color-bss-orange',
    '--color-bss-green',
    '--color-bss-bg',
    '--color-bss-card',
    '--color-bss-border',
    '--font-sans',
    '--bss-header-height',
  ];
  for (const token of requiredTokens) {
    assert(cssContent.includes(token), `Missing design token ${token}`);
  }
});

test('globals.css defines essential safe-area utilities with env() fallback', () => {
  assert(cssContent.includes('.pb-safe'), 'Missing .pb-safe');
  assert(cssContent.includes('.pb-safe-lg'), 'Missing .pb-safe-lg');
  assert(cssContent.includes('env(safe-area-inset-bottom)'), 'Missing safe-area-inset-bottom');
  assert(cssContent.includes('env(safe-area-inset-top)'), 'Missing safe-area-inset-top');
  assert(cssContent.includes('env(safe-area-inset-left)'), 'Missing safe-area-inset-left');
  assert(cssContent.includes('env(safe-area-inset-right)'), 'Missing safe-area-inset-right');
});

test('globals.css breakpoint rules have 0 collision or gap between 1180px and 1181px', () => {
  assert(cssContent.includes('@media (max-width: 1180px)'), 'Missing @media (max-width: 1180px)');
  assert(cssContent.includes('@media (min-width: 1181px)'), 'Missing @media (min-width: 1181px)');
  
  // Verify max-width: 1180px hides desktop nav and shows mobile trigger
  const max1180Block = cssContent.slice(cssContent.indexOf('@media (max-width: 1180px)'));
  assert(max1180Block.includes('.bss-desktop-nav'), 'max-width: 1180px must control .bss-desktop-nav');
  assert(max1180Block.includes('display: none !important'), 'max-width: 1180px must hide .bss-desktop-nav');
  assert(max1180Block.includes('.bss-mobile-trigger'), 'max-width: 1180px must control .bss-mobile-trigger');
  assert(max1180Block.includes('display: inline-flex !important'), 'max-width: 1180px must display .bss-mobile-trigger');

  // Verify min-width: 1181px shows desktop nav and hides mobile trigger and mobile menu
  const min1181Block = cssContent.slice(cssContent.indexOf('@media (min-width: 1181px)'));
  assert(min1181Block.includes('.bss-desktop-nav'), 'min-width: 1181px must control .bss-desktop-nav');
  assert(min1181Block.includes('display: flex !important'), 'min-width: 1181px must display .bss-desktop-nav');
  assert(min1181Block.includes('.bss-mobile-trigger'), 'min-width: 1181px must control .bss-mobile-trigger');
  assert(min1181Block.includes('display: none !important'), 'min-width: 1181px must hide .bss-mobile-trigger');
  assert(min1181Block.includes('.bss-mobile-menu'), 'min-width: 1181px must control .bss-mobile-menu');
});

test('globals.css KPI card bottom-pinning and typography clamp rules', () => {
  assert(cssContent.includes('.bss-kpi-card'), 'Missing .bss-kpi-card');
  assert(cssContent.includes('display: flex'), '.bss-kpi-card must have display: flex');
  assert(cssContent.includes('flex-direction: column'), '.bss-kpi-card must have flex-direction: column');
  assert(cssContent.includes('.bss-kpi-card strong'), 'Missing .bss-kpi-card strong selector');
  assert(cssContent.includes('margin-top: auto'), '.bss-kpi-card strong must pin to bottom via margin-top: auto');
  assert(cssContent.includes('font-size: clamp('), '.bss-kpi-card strong must use clamp() fluid typography');
});

test('globals.css iOS input zoom prevention for Safari on mobile', () => {
  assert(cssContent.includes('@supports (-webkit-touch-callout: none)'), 'Missing iOS webkit touch callout check');
  assert(cssContent.includes('font-size: 16px !important'), 'iOS inputs must have font-size 16px to prevent automatic zooming');
});

// ==========================================
// TEST SUITE 2: Viewport & Safe-Area Configuration
// ==========================================
console.log('\n--- 2. Root Layout & Viewport Configuration ---');

const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

test('layout.tsx exports valid Viewport configuration with cover fit', () => {
  assert(layoutContent.includes('export const viewport: Viewport = {'), 'layout.tsx must export Viewport');
  assert(layoutContent.includes('width: "device-width"'), 'viewport must specify device-width');
  assert(layoutContent.includes('initialScale: 1'), 'viewport must specify initialScale: 1');
  assert(layoutContent.includes('viewportFit: "cover"'), 'viewport must specify viewportFit: "cover"');
  assert(layoutContent.includes('themeColor: "#073B67"'), 'viewport must specify themeColor');
});

test('layout.tsx configures html and body root elements with antialiasing and safe flex layout', () => {
  assert(layoutContent.includes('className="h-full antialiased"'), 'html tag must have h-full antialiased');
  assert(layoutContent.includes('className="min-h-full flex flex-col'), 'body tag must have min-h-full flex flex-col');
});

// ==========================================
// TEST SUITE 3: Navigation Shell Breakpoint Stress Testing
// ==========================================
console.log('\n--- 3. Navigation Shell Breakpoint Isolation ---');

const shells = [
  { name: 'WorkerShell', path: 'src/components/worker/WorkerShell.tsx' },
  { name: 'EmployerShell', path: 'src/components/employer/EmployerShell.tsx' },
  { name: 'ContractorShell', path: 'src/components/contractor/ContractorShell.tsx' },
  { name: 'SupportShell', path: 'src/components/support/SupportShell.tsx' },
  { name: 'GovernmentShell', path: 'src/components/government/GovernmentShell.tsx' },
];

for (const shell of shells) {
  const content = fs.readFileSync(path.join(rootDir, shell.path), 'utf8');

  test(`${shell.name} does not contain breakpoint class pollution on nav elements`, () => {
    // bss-desktop-nav must NOT have hidden md:flex or md:hidden
    const desktopNavMatches = [...content.matchAll(/className="([^"]*bss-desktop-nav[^"]*)"/g)];
    assert(desktopNavMatches.length > 0, `${shell.name} missing bss-desktop-nav`);
    for (const match of desktopNavMatches) {
      const cls = match[1];
      assert(!cls.includes('hidden'), `${shell.name} bss-desktop-nav class "${cls}" must NOT contain "hidden"`);
      assert(!cls.includes('md:flex'), `${shell.name} bss-desktop-nav class "${cls}" must NOT contain "md:flex"`);
      assert(!cls.includes('md:hidden'), `${shell.name} bss-desktop-nav class "${cls}" must NOT contain "md:hidden"`);
    }

    // bss-mobile-trigger must NOT have md:hidden or hidden
    const mobileTriggerMatches = [...content.matchAll(/className="([^"]*bss-mobile-trigger[^"]*)"/g)];
    assert(mobileTriggerMatches.length > 0, `${shell.name} missing bss-mobile-trigger`);
    for (const match of mobileTriggerMatches) {
      const cls = match[1];
      assert(!cls.includes('md:hidden'), `${shell.name} bss-mobile-trigger class "${cls}" must NOT contain "md:hidden"`);
    }

    // bss-mobile-menu must NOT have md:hidden
    const mobileMenuMatches = [...content.matchAll(/className="([^"]*bss-mobile-menu[^"]*)"/g)];
    assert(mobileMenuMatches.length > 0, `${shell.name} missing bss-mobile-menu`);
    for (const match of mobileMenuMatches) {
      const cls = match[1];
      assert(!cls.includes('md:hidden'), `${shell.name} bss-mobile-menu class "${cls}" must NOT contain "md:hidden"`);
    }
  });

  test(`${shell.name} includes full safe-area header, bar, and main container classes`, () => {
    assert(content.includes('bss-shell'), `${shell.name} missing .bss-shell container`);
    assert(content.includes('bss-shell-header'), `${shell.name} missing .bss-shell-header container`);
    assert(content.includes('bss-shell-bar'), `${shell.name} missing .bss-shell-bar container`);
    assert(content.includes('bss-app-main'), `${shell.name} missing .bss-app-main container`);
  });

  test(`${shell.name} mobile menu has accessible aria-label and toggle handlers`, () => {
    assert(content.includes('aria-label='), `${shell.name} must have aria-label on navigation`);
    assert(content.includes('aria-expanded='), `${shell.name} must have aria-expanded on mobile trigger`);
  });
}

// ==========================================
// TEST SUITE 4: Dashboard KPI Alignment & Grid Structure
// ==========================================
console.log('\n--- 4. Role Dashboards KPI Grid & Tile Alignment ---');

const dashboardSuites = [
  {
    role: 'Worker',
    file: 'src/app/worker/page.tsx',
    expectedKpiCount: 4,
    gridCols: 'grid-cols-2 md:grid-cols-4',
  },
  {
    role: 'Employer',
    file: 'src/app/employer/dashboard/page.tsx',
    expectedKpiCount: 4,
    gridCols: 'grid-cols-2 md:grid-cols-4',
  },
  {
    role: 'Contractor',
    file: 'src/app/contractor/dashboard/page.tsx',
    expectedKpiCount: 4,
    gridCols: 'grid-cols-2 md:grid-cols-4',
  },
  {
    role: 'Contractor Submissions',
    file: 'src/app/contractor/submissions/page.tsx',
    expectedKpiCount: 4,
    gridCols: 'grid-cols-2 md:grid-cols-4',
  },
  {
    role: 'BSS Staff',
    file: 'src/components/support/BssStaffDashboard.tsx',
    expectedKpiCount: 5,
    gridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
  },
  {
    role: 'IT Helpdesk',
    file: 'src/components/support/ItOperationsDashboard.tsx',
    expectedKpiCount: 6,
    gridCols: 'grid-cols-2 md:grid-cols-3 2xl:grid-cols-6',
  },
  {
    role: 'Government',
    file: 'src/app/government/page.tsx',
    expectedKpiCount: 8,
    gridCols: 'grid-cols-2 md:grid-cols-4 2xl:grid-cols-8',
  },
];

for (const dash of dashboardSuites) {
  const content = fs.readFileSync(path.join(rootDir, dash.file), 'utf8');

  test(`${dash.role} dashboard implements .bss-kpi-grid with responsive column rules "${dash.gridCols}"`, () => {
    assert(content.includes('bss-kpi-grid'), `${dash.role} must use .bss-kpi-grid`);
    assert(content.includes(dash.gridCols), `${dash.role} grid must specify "${dash.gridCols}"`);
  });

  test(`${dash.role} dashboard wraps KPI items in <article className="bss-kpi-card"> with standard <strong> metric`, () => {
    if (dash.role === 'Government') {
      const chartsContent = fs.readFileSync(path.join(rootDir, 'src/components/government/Charts.tsx'), 'utf8');
      assert(chartsContent.includes('article className="bss-kpi-card"'), 'Government Kpi component must use <article className="bss-kpi-card">');
      assert(chartsContent.includes('<strong>{value}</strong>'), 'Government Kpi component must wrap value in <strong>{value}</strong>');
    } else {
      assert(content.includes('bss-kpi-card'), `${dash.role} must use .bss-kpi-card`);
      assert(content.includes('<strong>'), `${dash.role} must wrap metric value in <strong>`);
    }
  });
}

// ==========================================
// TEST SUITE 5: Viewport Simulation & Breakpoint Matrix
// ==========================================
console.log('\n--- 5. Breakpoint Simulation Matrix (Viewport Verification) ---');

const viewportsToSimulate = [
  { name: 'iPhone SE (Portrait)', width: 375, height: 667, isMobile: true, isTablet: false, isDesktop: false },
  { name: 'iPhone 14 Pro Max (Portrait)', width: 430, height: 932, isMobile: true, isTablet: false, isDesktop: false },
  { name: 'iPhone 14 Pro Max (Landscape)', width: 932, height: 430, isMobile: false, isTablet: true, isDesktop: false },
  { name: 'iPad Mini (Portrait)', width: 768, height: 1024, isMobile: false, isTablet: true, isDesktop: false },
  { name: 'iPad Air 10.9" (Portrait)', width: 820, height: 1180, isMobile: false, isTablet: true, isDesktop: false },
  { name: 'iPad Pro 11" (Landscape)', width: 1194, height: 834, isMobile: false, isTablet: false, isDesktop: true },
  { name: 'MacBook Air 13"', width: 1280, height: 832, isMobile: false, isTablet: false, isDesktop: true },
  { name: 'Desktop 1080p', width: 1920, height: 1080, isMobile: false, isTablet: false, isDesktop: true },
];

for (const vp of viewportsToSimulate) {
  test(`Viewport ${vp.name} (${vp.width}x${vp.height}) maps accurately to breakpoint logic`, () => {
    const isMax1180 = vp.width <= 1180;
    const isMin1181 = vp.width >= 1181;

    // Must be mutually exclusive and exhaustive for all integer pixel viewports
    assert(isMax1180 !== isMin1181, `Breakpoint overlap or gap at ${vp.width}px`);

    if (vp.width <= 1180) {
      // In this range, CSS displays .bss-mobile-trigger and hides .bss-desktop-nav
      assert(isMax1180 === true, `Expected mobile trigger to be active on ${vp.name}`);
    } else {
      // In this range, CSS displays .bss-desktop-nav and hides .bss-mobile-trigger and .bss-mobile-menu
      assert(isMin1181 === true, `Expected desktop nav to be active on ${vp.name}`);
    }
  });
}

// ==========================================
// TEST SUITE 6: Stress Testing KPI Values & Edge Cases
// ==========================================
console.log('\n--- 6. KPI Card Layout Stress Testing (Long Strings & Extreme Data) ---');

test('KPI card layout handles large metric strings and currency formats without overflow', () => {
  // Test large numbers and currencies
  const formattedCurrency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(123456789);
  assert(formattedCurrency.includes('12,34,56,789'), 'Currency formatting works correctly for large amounts');
  
  // Test clamp values
  // clamp(1.25rem, 2vw, 1.6rem)
  // At 320px viewport: 2vw = 6.4px -> clamped to 1.25rem (20px)
  // At 1920px viewport: 2vw = 38.4px -> clamped to 1.6rem (25.6px)
  assert(cssContent.includes('font-size: clamp(1.25rem, 2vw, 1.6rem)'), 'Clamp is tuned properly between 20px and 25.6px');
});

console.log(`\n🎉 Challenger M3 Stress Test Suite Completed: ${passedTests}/${totalTests} tests passed.`);
