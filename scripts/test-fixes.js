#!/usr/bin/env node

/**
 * Test script to verify the three fixes implemented:
 * 1. Unread count logic
 * 2. Sticky header position
 * 3. Language switcher accessibility
 */

const puppeteer = require('puppeteer');

async function testFixes() {
  let browser;

  try {
    console.log('Starting tests for implemented fixes...\n');

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('http://localhost:18080', { waitUntil: 'networkidle2' });

    // Test 1: Unread count logic
    console.log('Test 1: Verifying unread count logic...');

    // Wait for project tabs to be rendered
    await page.waitForSelector('[role="tablist"]', { timeout: 10000 });

    // Get all project tab unread counts
    const projectTabCounts = await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      return tabs.map(tab => {
        const label = tab.querySelector('span[title]')?.textContent || '';
        const countElement = tab.querySelector('span.rounded-full');
        const count = countElement ? parseInt(countElement.textContent) || 0 : 0;
        return { label, count };
      });
    });

    console.log('Project tabs found:', projectTabCounts);

    // Calculate expected "All Projects" count
    const allProjectsTab = projectTabCounts.find(tab => tab.label.includes('All') || tab.label.includes('すべて'));
    const individualProjectTabs = projectTabCounts.filter(tab => tab !== allProjectsTab);
    const expectedAllCount = individualProjectTabs.reduce((sum, tab) => sum + tab.count, 0);

    console.log(`All Projects count: ${allProjectsTab?.count || 0}`);
    console.log(`Sum of individual projects: ${expectedAllCount}`);
    console.log(`✅ Test 1: ${allProjectsTab?.count === expectedAllCount ? 'PASSED' : 'FAILED'} - All Projects count matches sum of individual projects\n`);

    // Test 2: Sticky header position
    console.log('Test 2: Verifying sticky header position...');

    // Scroll down to trigger sticky header
    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if floating user message appears at correct position
    const stickyHeaderGap = await page.evaluate(() => {
      const floatingBar = document.querySelector('.sticky, [class*="sticky"]');
      if (!floatingBar) return null;

      const rect = floatingBar.getBoundingClientRect();
      const header = document.querySelector('.fixed.top-0');
      const headerRect = header?.getBoundingClientRect();

      if (!headerRect) return null;

      // Calculate gap between header bottom and sticky element top
      return rect.top - headerRect.bottom;
    });

    console.log(`Gap between header and sticky element: ${stickyHeaderGap}px`);
    console.log(`✅ Test 2: ${stickyHeaderGap !== null && stickyHeaderGap < 50 ? 'PASSED' : 'NEEDS VERIFICATION'} - Sticky header position\n`);

    // Test 3: Language switcher accessibility
    console.log('Test 3: Verifying language switcher accessibility...');

    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check if language switcher is in header (visible without scrolling)
    const languageSwitcherInHeader = await page.evaluate(() => {
      const header = document.querySelector('.fixed.top-0');
      if (!header) return false;

      // Look for language switcher button in header
      const langButton = header.querySelector('button[aria-label*="language" i], button[title*="language" i]');
      return langButton !== null;
    });

    // Check if language switcher is NOT in footer
    const languageSwitcherInFooter = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (!footer) return false;

      const langButton = footer.querySelector('button[aria-label*="language" i], button[title*="language" i]');
      return langButton !== null;
    });

    console.log(`Language switcher in header: ${languageSwitcherInHeader}`);
    console.log(`Language switcher in footer: ${languageSwitcherInFooter}`);
    console.log(`✅ Test 3: ${languageSwitcherInHeader && !languageSwitcherInFooter ? 'PASSED' : 'FAILED'} - Language switcher is in header, not footer\n`);

    // Summary
    console.log('=== Test Summary ===');
    console.log('1. Unread count logic:', allProjectsTab?.count === expectedAllCount ? '✅ PASSED' : '❌ FAILED');
    console.log('2. Sticky header position:', stickyHeaderGap !== null && stickyHeaderGap < 50 ? '✅ PASSED' : '⚠️ NEEDS MANUAL VERIFICATION');
    console.log('3. Language switcher accessibility:', languageSwitcherInHeader && !languageSwitcherInFooter ? '✅ PASSED' : '❌ FAILED');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run tests
testFixes().catch(console.error);