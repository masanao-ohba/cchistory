#!/usr/bin/env node

/**
 * Test script to verify UI/UX fixes
 * Checks that all RAI criteria are met
 */

const puppeteer = require('puppeteer');

async function testUIFixes() {
  console.log('🔍 Testing UI/UX fixes...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the application
    console.log('📱 Loading application...');
    await page.goto('http://localhost:18080', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for initial load
    await page.waitForSelector('.min-h-screen', { timeout: 10000 });

    // Test 1: Check search input padding (should be pl-10 for icon spacing)
    console.log('\n✅ Test 1: Search input padding');
    const searchInputClass = await page.$eval('input[placeholder*="Search"]',
      el => el.className
    );
    if (searchInputClass.includes('pl-10')) {
      console.log('   ✓ Search input has correct padding (pl-10)');
    } else {
      console.log('   ✗ Search input padding incorrect:', searchInputClass);
    }

    // Test 2: Check language switcher is in footer
    console.log('\n✅ Test 2: Language switcher location');
    const footerHasLangSwitcher = await page.evaluate(() => {
      const footer = document.querySelector('footer');
      if (!footer) return false;
      const langButton = footer.querySelector('button[aria-label="Change language"]');
      return !!langButton;
    });

    const headerHasLangSwitcher = await page.evaluate(() => {
      const header = document.querySelector('.fixed.top-0');
      if (!header) return false;
      const langButton = header.querySelector('button[aria-label="Change language"]');
      return !!langButton;
    });

    if (footerHasLangSwitcher && !headerHasLangSwitcher) {
      console.log('   ✓ Language switcher is in footer only');
    } else {
      console.log('   ✗ Language switcher location incorrect');
      console.log('     Footer has it:', footerHasLangSwitcher);
      console.log('     Header has it:', headerHasLangSwitcher);
    }

    // Test 3: Check initial unread count (should be 0 or small number, not 999+)
    console.log('\n✅ Test 3: Initial unread count');
    const unreadBadges = await page.evaluate(() => {
      const badges = Array.from(document.querySelectorAll('span')).filter(el => {
        return el.textContent === '999+';
      });
      return badges.length;
    });

    if (unreadBadges === 0) {
      console.log('   ✓ No "999+" badges found (correct initial state)');
    } else {
      console.log('   ✗ Found', unreadBadges, '"999+" badges on initial load');
    }

    // Test 4: Check floating message bar position
    console.log('\n✅ Test 4: Floating message bar offset');
    await page.evaluate(() => {
      window.scrollTo(0, 500);
    });
    await page.waitForTimeout(500);

    const floatingBarTop = await page.evaluate(() => {
      const bar = document.querySelector('.fixed.left-0.right-0.z-40');
      if (bar) {
        return window.getComputedStyle(bar).top;
      }
      return null;
    });

    if (floatingBarTop) {
      console.log('   ✓ Floating bar top position:', floatingBarTop);
      // Should be around the height of the fixed header
      const topValue = parseInt(floatingBarTop);
      if (topValue > 0 && topValue < 200) {
        console.log('   ✓ Position looks reasonable');
      }
    } else {
      console.log('   ℹ️ No floating bar visible (may not have tall content)');
    }

    console.log('\n✨ UI/UX tests completed!');

  } catch (error) {
    console.error('❌ Error during testing:', error.message);
  } finally {
    await browser.close();
  }
}

// Run the tests
testUIFixes().catch(console.error);