/**
 * Test script to debug loading state issue
 */

const { chromium } = require('playwright');

async function testLoadingState(url) {
  console.log('=== Testing Loading State ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    console.log(`[Browser Console] ${text}`);
    consoleLogs.push(text);
  });

  // Navigate
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait and check loading state every second
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);

    const state = await page.evaluate(() => {
      // Check for loading texts that are VISIBLE in viewport
      const isElementVisible = (element) => {
        if (!element) return false;
        const rect = element.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth) &&
          rect.width > 0 &&
          rect.height > 0
        );
      };

      const loadingTexts = [];
      const allElements = document.querySelectorAll('*');
      const bodyText = document.body.textContent || '';

      for (const el of allElements) {
        const text = el.textContent || '';
        if (text.includes('Loading data...') && isElementVisible(el)) {
          loadingTexts.push('Loading data... (visible)');
          break;
        }
      }

      // Find all elements containing "Loading data..."
      if (!loadingTexts.includes('Loading data... (visible)')) {
        for (const el of allElements) {
          const text = el.textContent || '';
          if (text === 'Loading data...' || (text.includes('Loading data...') && el.children.length === 0)) {
            // This is a leaf element containing the text
            const rect = el.getBoundingClientRect();
            const visible = rect.top >= 0 && rect.left >= 0 &&
                           rect.bottom <= window.innerHeight &&
                           rect.right <= window.innerWidth &&
                           rect.width > 0 && rect.height > 0;
            if (!visible) {
              loadingTexts.push('Loading data... (in DOM but not visible)');
            }
            break;
          }
        }
      }

      if (bodyText.includes('Loading token usage...')) loadingTexts.push('Loading token usage...');
      if (bodyText.includes('Loading statistics...')) loadingTexts.push('Loading statistics...');
      if (bodyText.includes('Loading...') && !bodyText.includes('Loading data...') && !bodyText.includes('Loading token')) {
        loadingTexts.push('Loading... (generic)');
      }

      const messages = document.querySelectorAll('[class*="bg-gradient-to-br from-blue-100"], [class*="bg-gradient-to-br from-green-100"]').length;
      return { loadingTexts, messages, second: performance.now() / 1000 };
    });

    const hasLoading = state.loadingTexts.length > 0;
    console.log(`[${i+1}s] Loading texts: [${state.loadingTexts.join(', ')}], Messages: ${state.messages}, Time: ${state.second.toFixed(2)}s`);

    if (!hasLoading && state.messages > 0) {
      console.log('\n✅ SUCCESS: All loading texts disappeared and messages visible!');
      break;
    }
  }

  // Final check
  await page.waitForTimeout(2000);
  const finalState = await page.evaluate(() => {
    const bodyText = document.body.textContent || '';
    const loadingTexts = [];
    if (bodyText.includes('Loading data...')) loadingTexts.push('Loading data...');
    if (bodyText.includes('Loading token usage...')) loadingTexts.push('Loading token usage...');
    if (bodyText.includes('Loading statistics...')) loadingTexts.push('Loading statistics...');
    if (bodyText.includes('Loading...')) loadingTexts.push('Loading...');
    return {
      loadingTexts,
      messageCount: document.querySelectorAll('[class*="bg-gradient-to-br from-blue-100"], [class*="bg-gradient-to-br from-green-100"]').length
    };
  });

  console.log('\n=== Final State ===');
  console.log(`Loading texts remaining: [${finalState.loadingTexts.join(', ')}]`);
  console.log(`Messages count: ${finalState.messageCount}`);
  console.log(`\nRelevant console logs:`);
  consoleLogs.filter(log => log.includes('Loading state') || log.includes('isPending')).forEach(log => console.log(`  ${log}`));

  await page.screenshot({ path: '/Users/masanao.oba/workspace/cchistory-next/.playwright-mcp/debug-loading-state.png', fullPage: true });
  console.log('\nScreenshot saved to .playwright-mcp/debug-loading-state.png');

  await browser.close();
}

// Run test
const url = process.argv[2] || 'http://localhost:18080';
testLoadingState(url).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
