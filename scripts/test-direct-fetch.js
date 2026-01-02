/**
 * Test direct fetch performance
 * Compare fetching from different origins
 */

const { chromium } = require('playwright');

async function testDirectFetch() {
  console.log('=== Testing Direct Fetch Performance ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test 1: Navigate to a blank page and fetch from there
  console.log('\n[Test 1] Fetch from about:blank');
  await page.goto('about:blank');

  const test1Start = Date.now();
  const test1Result = await page.evaluate(async () => {
    const start = performance.now();
    try {
      const response = await fetch('http://localhost:18080/api/conversations?limit=15&offset=0&group_by_thread=true&sort_order=desc&show_related_threads=false');
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

  console.log(`Result: ${JSON.stringify(test1Result, null, 2)}`);
  console.log(`External timing: ${test1End - test1Start}ms\n`);

  // Test 2: Navigate to the app and fetch from there
  console.log('\n[Test 2] Fetch from http://localhost:18080/');
  await page.goto('http://localhost:18080/', { waitUntil: 'domcontentloaded' });

  const test2Start = Date.now();
  const test2Result = await page.evaluate(async () => {
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
  const test2End = Date.now();

  console.log(`Result: ${JSON.stringify(test2Result, null, 2)}`);
  console.log(`External timing: ${test2End - test2Start}ms\n`);

  await browser.close();
}

testDirectFetch().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
