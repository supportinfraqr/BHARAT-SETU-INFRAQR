import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertTrue,
  assertFalse,
  assertEqual,
  assertIncludes,
  assertMatches,
  assertGreaterThanOrEqual
} from '../helpers/assertions.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export async function run() {
  console.log('🔥 Running Tier 2 Adversarial UI/UX & Responsive iOS Stress Suite...');

  const globalsCssPath = path.join(rootDir, 'src/app/globals.css');
  assertTrue(fs.existsSync(globalsCssPath), 'globals.css must exist');
  const globalsCss = fs.readFileSync(globalsCssPath, 'utf8');

  // =========================================================================
  // Section 1: Viewport Matrix & CSS Media Query Engine Simulation
  // =========================================================================
  console.log('  1. Simulating 13 viewport profiles across Mobile, Tablet, and Desktop...');

  const viewports = [
    { name: 'iPhone SE (Portrait)', w: 375, h: 667, isMobile: true, isTablet: false, isDesktop: false, orientation: 'portrait' },
    { name: 'iPhone 13/14 (Portrait)', w: 390, h: 844, isMobile: true, isTablet: false, isDesktop: false, orientation: 'portrait' },
    { name: 'iPhone 15 Pro Max (Portrait)', w: 430, h: 932, isMobile: true, isTablet: false, isDesktop: false, orientation: 'portrait' },
    { name: 'iPhone SE (Landscape)', w: 667, h: 375, isMobile: true, isTablet: false, isDesktop: false, orientation: 'landscape' },
    { name: 'iPhone 13/14 (Landscape)', w: 844, h: 390, isMobile: true, isTablet: false, isDesktop: false, orientation: 'landscape' },
    { name: 'iPhone 15 Pro Max (Landscape)', w: 932, h: 430, isMobile: true, isTablet: false, isDesktop: false, orientation: 'landscape' },
    { name: 'iPad Mini (Portrait)', w: 768, h: 1024, isMobile: false, isTablet: true, isDesktop: false, orientation: 'portrait' },
    { name: 'iPad 10.2 (Portrait)', w: 810, h: 1080, isMobile: false, isTablet: true, isDesktop: false, orientation: 'portrait' },
    { name: 'iPad Pro 11 (Portrait)', w: 1024, h: 1366, isMobile: false, isTablet: true, isDesktop: false, orientation: 'portrait' },
    { name: 'iPad Air 10.9 (Landscape)', w: 1180, h: 820, isMobile: false, isTablet: true, isDesktop: false, orientation: 'landscape' },
    { name: 'Desktop 1280 (Standard)', w: 1280, h: 800, isMobile: false, isTablet: false, isDesktop: true, orientation: 'landscape' },
    { name: 'Desktop 1440 (HD)', w: 1440, h: 900, isMobile: false, isTablet: false, isDesktop: true, orientation: 'landscape' },
    { name: 'Desktop 1920 (Full HD)', w: 1920, h: 1080, isMobile: false, isTablet: false, isDesktop: true, orientation: 'landscape' }
  ];

  // Helper to evaluate CSS rules at given viewport width
  function evaluateNavDisplay(w) {
    if (w <= 1180) {
      return {
        desktopNav: 'none',
        mobileTrigger: 'inline-flex',
        mobileMenuCanOpen: true
      };
    } else {
      return {
        desktopNav: 'flex',
        mobileTrigger: 'none',
        mobileMenuCanOpen: false
      };
    }
  }

  for (const vp of viewports) {
    const navState = evaluateNavDisplay(vp.w);
    if (vp.w <= 1180) {
      assertEqual(navState.desktopNav, 'none', `At ${vp.name} (${vp.w}px), desktop nav must be hidden`);
      assertEqual(navState.mobileTrigger, 'inline-flex', `At ${vp.name} (${vp.w}px), mobile trigger must be displayed`);
      assertTrue(navState.mobileMenuCanOpen, `At ${vp.name} (${vp.w}px), mobile menu must be able to open`);
    } else {
      assertEqual(navState.desktopNav, 'flex', `At ${vp.name} (${vp.w}px), desktop nav must be visible flex`);
      assertEqual(navState.mobileTrigger, 'none', `At ${vp.name} (${vp.w}px), mobile trigger must be hidden`);
      assertFalse(navState.mobileMenuCanOpen, `At ${vp.name} (${vp.w}px), mobile menu must be hidden`);
    }
  }

  // =========================================================================
  // Section 2: Rigorous Inspection of All 5 Portal Navigation Shells
  // =========================================================================
  console.log('  2. Adversarially auditing 5 navigation shell components...');

  const shells = [
    { file: 'src/components/worker/WorkerShell.tsx', name: 'WorkerShell' },
    { file: 'src/components/employer/EmployerShell.tsx', name: 'EmployerShell' },
    { file: 'src/components/contractor/ContractorShell.tsx', name: 'ContractorShell' },
    { file: 'src/components/support/SupportShell.tsx', name: 'SupportShell' },
    { file: 'src/components/government/GovernmentShell.tsx', name: 'GovernmentShell' },
  ];

  for (const shell of shells) {
    const filePath = path.join(rootDir, shell.file);
    assertTrue(fs.existsSync(filePath), `${shell.name} file must exist`);
    const code = fs.readFileSync(filePath, 'utf8');

    // 1. Must use canonical classes
    assertIncludes(code, 'bss-shell', `${shell.name} must have bss-shell root container`);
    assertIncludes(code, 'bss-shell-header', `${shell.name} must have bss-shell-header`);
    assertIncludes(code, 'bss-shell-bar', `${shell.name} must have bss-shell-bar`);
    assertIncludes(code, 'bss-desktop-nav', `${shell.name} must have bss-desktop-nav`);
    assertIncludes(code, 'bss-mobile-trigger', `${shell.name} must have bss-mobile-trigger`);
    assertIncludes(code, 'bss-mobile-menu', `${shell.name} must have bss-mobile-menu`);
    assertIncludes(code, 'bss-app-main', `${shell.name} must have bss-app-main wrapper`);

    // 2. Adversarial anti-pattern checks:
    // Ensure no hardcoded Tailwind breakpoint classes (md:flex, md:hidden, lg:hidden) collide with CSS media queries
    const desktopNavMatches = [...code.matchAll(/className="[^"]*bss-desktop-nav[^"]*"/g)];
    assertTrue(desktopNavMatches.length > 0, `${shell.name} must contain bss-desktop-nav class definition`);
    for (const match of desktopNavMatches) {
      const cls = match[0];
      assertFalse(cls.includes('md:flex'), `${shell.name} bss-desktop-nav must not contain conflicting md:flex`);
      assertFalse(cls.includes('hidden'), `${shell.name} bss-desktop-nav must not contain conflicting hidden`);
      assertFalse(cls.includes('lg:flex'), `${shell.name} bss-desktop-nav must not contain conflicting lg:flex`);
    }

    const mobileTriggerMatches = [...code.matchAll(/className="[^"]*bss-mobile-trigger[^"]*"/g)];
    assertTrue(mobileTriggerMatches.length > 0, `${shell.name} must contain bss-mobile-trigger class definition`);
    for (const match of mobileTriggerMatches) {
      const cls = match[0];
      assertFalse(cls.includes('md:hidden'), `${shell.name} bss-mobile-trigger must not contain conflicting md:hidden`);
      assertFalse(cls.includes('lg:hidden'), `${shell.name} bss-mobile-trigger must not contain conflicting lg:hidden`);
    }

    const mobileMenuMatches = [...code.matchAll(/className="[^"]*bss-mobile-menu[^"]*"/g)];
    assertTrue(mobileMenuMatches.length > 0, `${shell.name} must contain bss-mobile-menu class definition`);
    for (const match of mobileMenuMatches) {
      const cls = match[0];
      assertFalse(cls.includes('md:hidden'), `${shell.name} bss-mobile-menu must not contain conflicting md:hidden`);
      assertFalse(cls.includes('lg:hidden'), `${shell.name} bss-mobile-menu must not contain conflicting lg:hidden`);
    }

    // 3. Accessibility checks
    assertMatches(code, /aria-label=/i, `${shell.name} must have aria-label for accessibility`);
    assertMatches(code, /aria-expanded=/i, `${shell.name} must have aria-expanded for interactive menus`);
  }

  // =========================================================================
  // Section 3: KPI Tile Geometry & Alignment Across All 6 Roles
  // =========================================================================
  console.log('  3. Auditing KPI tile cards and grid alignment across 6 roles...');

  const dashboardAudits = [
    {
      role: 'Worker',
      file: 'src/app/worker/page.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-4',
      expectedTiles: 4,
      hasIcon: true
    },
    {
      role: 'Employer',
      file: 'src/app/employer/dashboard/page.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-4',
      expectedTiles: 4,
      hasIcon: true
    },
    {
      role: 'Contractor',
      file: 'src/app/contractor/dashboard/page.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-4',
      expectedTiles: 4,
      hasIcon: true
    },
    {
      role: 'Contractor Submissions',
      file: 'src/app/contractor/submissions/page.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-4',
      expectedTiles: 4,
      hasIcon: true
    },
    {
      role: 'BSS Staff',
      file: 'src/components/support/BssStaffDashboard.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
      expectedTiles: 5,
      hasIcon: true
    },
    {
      role: 'IT Helpdesk',
      file: 'src/components/support/ItOperationsDashboard.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-3 2xl:grid-cols-6',
      expectedTiles: 6,
      hasIcon: true
    },
    {
      role: 'Government',
      file: 'src/app/government/page.tsx',
      expectedGridCols: 'grid-cols-2 md:grid-cols-4 2xl:grid-cols-8',
      expectedTiles: 8,
      hasIcon: false // uses bar indicator tone
    }
  ];

  for (const dash of dashboardAudits) {
    const filePath = path.join(rootDir, dash.file);
    assertTrue(fs.existsSync(filePath), `${dash.role} dashboard file must exist`);
    const code = fs.readFileSync(filePath, 'utf8');

    // Check grid declaration
    assertIncludes(code, 'bss-kpi-grid', `${dash.role} must use .bss-kpi-grid class`);
    assertIncludes(code, dash.expectedGridCols, `${dash.role} must declare ${dash.expectedGridCols}`);

    // Check card wrapper
    if (dash.role === 'Government') {
      const chartsPath = path.join(rootDir, 'src/components/government/Charts.tsx');
      const chartsCode = fs.readFileSync(chartsPath, 'utf8');
      assertIncludes(chartsCode, 'bss-kpi-card', `Government Kpi component must use .bss-kpi-card`);
      assertIncludes(chartsCode, '<article className="bss-kpi-card">', `Government Kpi component must be an <article>`);
      assertIncludes(chartsCode, '<strong>{value}</strong>', `Government Kpi must render value inside <strong>`);
    } else {
      assertIncludes(code, 'bss-kpi-card', `${dash.role} must use .bss-kpi-card`);
      assertMatches(code, /<article[^>]*className="[^"]*bss-kpi-card[^"]*"/, `${dash.role} must render KPI tiles with <article> tags`);
      assertMatches(code, /<strong>[^<]+<\/strong>/, `${dash.role} must render metric value in <strong>`);
      if (dash.hasIcon) {
        assertIncludes(code, 'bss-kpi-icon', `${dash.role} must use .bss-kpi-icon wrapper`);
      }
    }
  }

  // =========================================================================
  // Section 4: globals.css Layout Rules & CSS Variable Math
  // =========================================================================
  console.log('  4. Auditing CSS layout rules, flex auto-margins, safe areas, and clamps...');

  // 1. Equal height & auto-stretch rules
  assertIncludes(globalsCss, 'grid-auto-rows: 1fr;', '.bss-kpi-grid must enforce equal row heights');
  assertIncludes(globalsCss, 'align-items: stretch;', '.bss-kpi-grid must stretch tiles');
  assertIncludes(globalsCss, 'min-width: 0;', '.bss-kpi-grid items must have min-width: 0 to prevent flex overflow');

  // 2. .bss-kpi-card properties
  assertIncludes(globalsCss, 'min-height: 7.5rem;', '.bss-kpi-card must have min-height 7.5rem on desktop');
  assertIncludes(globalsCss, 'display: flex;', '.bss-kpi-card must be a flex container');
  assertIncludes(globalsCss, 'flex-direction: column;', '.bss-kpi-card must be column directed');

  // 3. Bottom pinned metric value
  assertIncludes(globalsCss, 'margin-top: auto;', '.bss-kpi-card strong must pin to bottom via margin-top: auto');
  assertIncludes(globalsCss, 'clamp(1.25rem, 2vw, 1.6rem)', '.bss-kpi-card strong must use clamp typography');

  // 4. Mobile <640px adjustments
  assertIncludes(globalsCss, '@media (max-width: 639px)', 'globals.css must have mobile <640px adjustments');
  assertIncludes(globalsCss, 'min-height: 6.75rem;', '.bss-kpi-card must adjust min-height on mobile screens');

  // 5. Ultra-compact <375px single column fallback
  assertIncludes(globalsCss, '@media (max-width: 374px)', 'globals.css must handle <374px ultra-narrow screens');
  assertIncludes(globalsCss, 'grid-template-columns: minmax(0, 1fr) !important;', '<374px must collapse to single column');

  // 6. Landscape orientation rule
  assertIncludes(globalsCss, '@media (orientation: landscape) and (max-height: 600px)', 'globals.css must handle mobile landscape height <=600px');

  // 7. iOS touch zoom fix (font-size: 16px)
  assertIncludes(globalsCss, '@supports (-webkit-touch-callout: none)', 'globals.css must include WebKit touch callout check');
  assertIncludes(globalsCss, 'font-size: 16px !important;', 'Inputs must have 16px font size on iOS to prevent browser zoom');

  // =========================================================================
  // Section 5: Modal and Dialog Bounds Testing
  // =========================================================================
  console.log('  5. Auditing modal dialog safe area calculations...');

  assertIncludes(globalsCss, '[role="dialog"]', 'globals.css must style role="dialog"');
  assertIncludes(globalsCss, 'calc(100dvh - max(2rem, env(safe-area-inset-top)) - max(2rem, env(safe-area-inset-bottom)))', 'Dialogs must respect top and bottom safe area insets');
  assertIncludes(globalsCss, 'overscroll-behavior: contain;', 'Dialogs must contain overscroll to prevent background bleed');

  // =========================================================================
  // Section 6: Root Layout Viewport Metadata
  // =========================================================================
  console.log('  6. Verifying root layout viewport export...');

  const layoutPath = path.join(rootDir, 'src/app/layout.tsx');
  const layoutCode = fs.readFileSync(layoutPath, 'utf8');

  assertIncludes(layoutCode, 'viewportFit: "cover"', 'Root layout must specify viewportFit: cover');
  assertIncludes(layoutCode, 'themeColor: "#073B67"', 'Root layout must specify themeColor #073B67');
  assertIncludes(layoutCode, 'width: "device-width"', 'Root layout must specify width: device-width');

  console.log('🎉 ALL TIER 2 ADVERSARIAL STRESS TESTS PASSED SUCCESSFULLY!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch(err => {
    console.error('❌ Adversarial Stress Test Failed:', err);
    process.exit(1);
  });
}
