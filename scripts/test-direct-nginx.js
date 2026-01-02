/**
 * Test bypassing Next.js dev server - direct nginx access
 */

const { chromium } = require('playwright');

async function testDirectNginx() {
  console.log('=== Testing Direct Nginx Access (Port 18080) ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate directly to nginx (bypassing Next.js dev server)
  console.log('Navigating to http://localhost:18080/');
  await page.goto('http://localhost:18080/', { waitUntil: 'domcontentloaded' });

  const test1Start = Date.now();
  const test1Result = await page.evaluate(async () => {
    const start = performance.now();
    try {
      const response = await fetch('/api/conversations?limit=15&offset=0&group_by_thread=true&sort_order=desc&show_related_threads=false');
      const data = await response.json();
      const end = performance.now();
      return {
        success: true,
        duration: end - start,
        status: response.status,
        dataSize: JSON.stringify(data).length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });
  const test1End = Date.now();

  console.log(`\nResult: ${JSON.stringify(test1Result, null, 2)}`);
  console.log(`External timing: ${test1End - test1Start}ms\n`);

  await browser.close();
}

testDirectNginx().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
