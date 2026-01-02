/**
 * LCP (Largest Contentful Paint) Measurement Script
 * Measures page load performance using Playwright
 */

const { chromium } = require('playwright');

async function measureLCP(url, runs = 3) {
  const results = [];

  for (let i = 0; i < runs; i++) {
    console.log(`\n=== Run ${i + 1}/${runs} ===`);

    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Navigate and wait for load
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for messages to appear (check for actual content)
    try {
      await page.waitForSelector('[class*="bg-gradient-to-br from-blue-100"]', { timeout: 15000 });
    } catch (e) {
      console.log('Warning: Messages selector not found within timeout');
    }

    // Additional wait for markdown processing to complete
    await page.waitForTimeout(2000);

    // Get performance metrics
    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Get LCP
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];

          if (lastEntry) {
            observer.disconnect();

            const paint = performance.getEntriesByType('paint');
            const fcp = paint.find(e => e.name === 'first-contentful-paint');

            resolve({
              lcp: lastEntry.renderTime || lastEntry.loadTime,
              fcp: fcp ? fcp.startTime : null,
              url: lastEntry.url,
              element: lastEntry.element?.tagName || lastEntry.element?.nodeName || 'UNKNOWN',
              size: lastEntry.size
            });
          }
        });

        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          const paint = performance.getEntriesByType('paint');
          const fcp = paint.find(e => e.name === 'first-contentful-paint');

          resolve({
            lcp: null,
            fcp: fcp ? fcp.startTime : null,
            url: null,
            element: null,
            error: 'Timeout waiting for LCP'
          });
        }, 30000);
      });
    });

    // Count visible messages
    const messageCount = await page.evaluate(() => {
      const messages = document.querySelectorAll('[class*="bg-gradient-to-br from-blue-100"], [class*="bg-gradient-to-br from-green-100"]');
      return messages.length;
    });

    // Check if data is displayed
    const hasData = await page.evaluate(() => {
      const loadingText = document.body.textContent;
      return !loadingText.includes('Loading data...') && !loadingText.includes('No conversations');
    });

    results.push({
      run: i + 1,
      lcp: metrics.lcp ? (metrics.lcp / 1000).toFixed(3) : 'N/A',
      fcp: metrics.fcp ? (metrics.fcp / 1000).toFixed(3) : 'N/A',
      messageCount,
      hasData,
      lcpElement: metrics.element,
      lcpUrl: metrics.url,
      error: metrics.error
    });

    console.log(`LCP: ${results[i].lcp}s`);
    console.log(`FCP: ${results[i].fcp}s`);
    console.log(`LCP Element: ${metrics.element}`);
    console.log(`LCP Size: ${metrics.size} bytes`);
    console.log(`LCP URL: ${metrics.url || 'N/A'}`);
    console.log(`Messages: ${messageCount}`);
    console.log(`Data loaded: ${hasData}`);

    // Take screenshot for debugging
    if (i === 0) {
      await page.screenshot({ path: `/Users/masanao.oba/workspace/cchistory-next/.playwright-mcp/lcp-run-${i+1}.png`, fullPage: true });
      console.log(`Screenshot saved for run ${i+1}`);
    }

    await browser.close();

    // Wait between runs
    if (i < runs - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Calculate average
  const validLCPs = results.filter(r => r.lcp !== 'N/A').map(r => parseFloat(r.lcp));
  const validFCPs = results.filter(r => r.fcp !== 'N/A').map(r => parseFloat(r.fcp));

  const avgLCP = validLCPs.length > 0
    ? (validLCPs.reduce((a, b) => a + b, 0) / validLCPs.length).toFixed(3)
    : 'N/A';
  const avgFCP = validFCPs.length > 0
    ? (validFCPs.reduce((a, b) => a + b, 0) / validFCPs.length).toFixed(3)
    : 'N/A';

  console.log('\n=== Summary ===');
  console.log(`Average LCP: ${avgLCP}s`);
  console.log(`Average FCP: ${avgFCP}s`);
  console.log(`Target: LCP < 2.5s`);
  console.log(`Status: ${parseFloat(avgLCP) < 2.5 ? '✅ PASS' : '❌ FAIL'}`);

  return {
    results,
    average: {
      lcp: avgLCP,
      fcp: avgFCP
    },
    pass: parseFloat(avgLCP) < 2.5
  };
}

// Run measurement
const url = process.argv[2] || 'http://localhost:18080';
const runs = parseInt(process.argv[3]) || 3;

measureLCP(url, runs)
  .then(result => {
    process.exit(result.pass ? 0 : 1);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
