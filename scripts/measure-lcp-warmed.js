/**
 * Measure LCP with cache warming
 * First run warms the cache, second run measures with warm cache
 */

const { chromium } = require('playwright');

async function measureLCP(url, runNumber, warmCache = false) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let lcpValue = 0;
  let fcpValue = 0;

  // Listen for LCP
  await context.exposeBinding('reportLCP', (source, lcp) => {
    lcpValue = lcp;
  });

  // Listen for FCP
  await context.exposeBinding('reportFCP', (source, fcp) => {
    fcpValue = fcp;
  });

  await page.addInitScript(() => {
    // FCP observer
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          window.reportFCP(entry.startTime);
        }
      }
    }).observe({ type: 'paint', buffered: true });

    // LCP observer
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      window.reportLCP(lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

  // Wait for loading to finish
  await page.waitForFunction(() => {
    const loadingTexts = document.querySelectorAll('*');
    for (const el of loadingTexts) {
      if (el.textContent && el.textContent.includes('Loading data...')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          return false; // Still loading
        }
      }
    }
    return true; // Loading complete
  }, { timeout: 30000 });

  await browser.close();

  return {
    lcp: lcpValue,
    fcp: fcpValue,
  };
}

async function main() {
  const url = process.argv[2] || 'http://localhost:18080';

  console.log('=== Cache Warming Run ===');
  const warmRun = await measureLCP(url, 0, true);
  console.log(`Warm-up LCP: ${(warmRun.lcp / 1000).toFixed(3)}s`);
  console.log(`Warm-up FCP: ${(warmRun.fcp / 1000).toFixed(3)}s\n`);

  console.log('=== Measurement Runs (Warmed Cache) ===');
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\n=== Run ${i}/3 ===`);
    const result = await measureLCP(url, i);
    console.log(`LCP: ${(result.lcp / 1000).toFixed(3)}s`);
    console.log(`FCP: ${(result.fcp / 1000).toFixed(3)}s`);
    runs.push(result);
  }

  const avgLCP = runs.reduce((sum, r) => sum + r.lcp, 0) / runs.length;
  const avgFCP = runs.reduce((sum, r) => sum + r.fcp, 0) / runs.length;

  console.log('\n=== Summary ===');
  console.log(`Average LCP: ${(avgLCP / 1000).toFixed(3)}s`);
  console.log(`Average FCP: ${(avgFCP / 1000).toFixed(3)}s`);
  console.log(`Target: LCP < 2.5s`);
  console.log(`Status: ${avgLCP < 2500 ? '✅ PASS' : '❌ FAIL'}`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
