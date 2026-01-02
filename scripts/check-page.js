/**
 * Check page rendering and errors
 */

const { chromium } = require('playwright');

async function checkPage() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const errors = [];
  const console_logs = [];

  page.on('console', msg => {
    console_logs.push({ type: msg.type(), text: msg.text() });
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('Page error:', error.message);
  });

  await page.goto('http://localhost:18080');
  await page.waitForTimeout(10000);

  const messageCount = await page.evaluate(() => {
    const messages = document.querySelectorAll('[class*="bg-gradient-to-br from-blue-100"], [class*="bg-gradient-to-br from-green-100"]');
    return messages.length;
  });

  const hasLoadingText = await page.evaluate(() => {
    return document.body.textContent.includes('Loading data...');
  });

  const hasProcessingText = await page.evaluate(() => {
    return document.body.textContent.includes('Processing...');
  });

  console.log('\n=== Summary ===');
  console.log(`Messages visible: ${messageCount}`);
  console.log(`Has "Loading data...": ${hasLoadingText}`);
  console.log(`Has "Processing...": ${hasProcessingText}`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(err => console.log(`  - ${err}`));
  }

  await page.screenshot({ path: '.playwright-mcp/debug-screenshot.png' });
  console.log('\nScreenshot saved to .playwright-mcp/debug-screenshot.png');

  await browser.close();
}

checkPage().catch(console.error);
