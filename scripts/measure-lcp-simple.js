const { chromium } = require('playwright');

async function measureLCP(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let lcpValue = 0;

  // Listen for LCP
  await context.exposeBinding('reportLCP', (source, lcp) => {
    lcpValue = lcp;
  });

  await page.addInitScript(() => {
    // LCP observer
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      window.reportLCP(lastEntry.renderTime || lastEntry.loadTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });

  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  const endTime = Date.now();

  await browser.close();

  return {
    lcp: lcpValue,
    pageLoad: endTime - startTime
  };
}

async function main() {
  const url = process.argv[2] || 'http://localhost:18080';

  console.log('=== Warm-up Run ===');
  await measureLCP(url);

  console.log('\n=== Measurement Runs (Warmed Cache) ===');
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    console.log(`\nRun ${i}/3...`);
    const result = await measureLCP(url);
    console.log(`  LCP: ${(result.lcp / 1000).toFixed(3)}s`);
    console.log(`  Page load: ${(result.pageLoad / 1000).toFixed(3)}s`);
    runs.push(result);
  }

  const avgLCP = runs.reduce((sum, r) => sum + r.lcp, 0) / runs.length;
  const avgPageLoad = runs.reduce((sum, r) => sum + r.pageLoad, 0) / runs.length;

  console.log('\n=== Summary ===');
  console.log(`Average LCP: ${(avgLCP / 1000).toFixed(3)}s`);
  console.log(`Average Page Load: ${(avgPageLoad / 1000).toFixed(3)}s`);
  console.log(`Target: LCP < 2.5s`);
  console.log(`Status: ${avgLCP < 2500 ? '✅ PASS' : '❌ FAIL'}`);
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
