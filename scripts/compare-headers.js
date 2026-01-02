/**
 * Compare request headers between Playwright and curl
 */

const { chromium } = require('playwright');

async function captureHeaders(url) {
  console.log('=== Capturing Playwright Request Headers ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('request', request => {
    if (request.url().includes('/api/conversations')) {
      console.log('[Playwright Headers]');
      console.log(`URL: ${request.url()}`);
      console.log('Headers:');
      const headers = request.headers();
      for (const [key, value] of Object.entries(headers)) {
        console.log(`  ${key}: ${value}`);
      }
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(15000); // Wait for requests to complete

  await browser.close();
}

const url = process.argv[2] || 'http://localhost:18080';
captureHeaders(url).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
