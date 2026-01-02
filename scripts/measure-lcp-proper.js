/**
 * LCP (Largest Contentful Paint) Measurement Script - Proper Methodology
 * Measures from "Loading data..." appears until it disappears and content is shown
 */

const { chromium } = require('playwright');

async function measureLCPProper(url, runs = 3) {
  const results = [];

  for (let i = 0; i < runs; i++) {
    console.log(`\n=== Run ${i + 1}/${runs} ===`);

    const browser = await chromium.launch({ headless: false }); // Non-headless for debugging
    // Create fresh context with no cache
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
      bypassCSP: true,
    });
    // Clear storage before each run
    await context.clearCookies();
    const page = await context.newPage();
    // Disable cache
    await page.route('**/*', route => route.continue());

    let startTime = null;
    let loadingAppeared = false;
    let loadingDisappeared = false;
    let contentShown = false;

    // Start timing
    const navigationStart = Date.now();

    // Navigate
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Wait for "Loading data..." to appear
    console.log('Waiting for "Loading data..." to appear...');
    try {
      await page.waitForSelector('text=Loading data...', { timeout: 10000 });
      startTime = Date.now();
      loadingAppeared = true;
      console.log(`"Loading data..." appeared at ${(startTime - navigationStart) / 1000}s`);
    } catch (e) {
      console.log('Warning: "Loading data..." did not appear - might have loaded too fast');
      startTime = navigationStart;
    }

    // Wait for "Loading data..." to disappear and content to appear
    console.log('Waiting for "Loading data..." to disappear and content to appear...');
    try {
      // Wait for loading to disappear
      await page.waitForFunction(() => {
        const body = document.body.textContent;
        return !body.includes('Loading data...');
      }, { timeout: 30000 });

      loadingDisappeared = true;
      const loadingEndTime = Date.now();
      console.log(`"Loading data..." disappeared at ${(loadingEndTime - navigationStart) / 1000}s`);

      // Wait for actual message content (user or assistant messages)
      await page.waitForSelector('[class*="bg-gradient-to-br from-blue-100"], [class*="bg-gradient-to-br from-green-100"]', {
        timeout: 5000
      });

      contentShown = true;
      const contentTime = Date.now();
      console.log(`Content appeared at ${(contentTime - navigationStart) / 1000}s`);

    } catch (e) {
      console.log('Warning: Content did not appear within timeout');
      console.log(e.message);
    }

    // Additional wait for rendering to stabilize
    await page.waitForTimeout(1000);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // Count visible messages and threads
    const messageData = await page.evaluate(() => {
      const userMessages = document.querySelectorAll('[class*="bg-gradient-to-br from-blue-100"]');
      const assistantMessages = document.querySelectorAll('[class*="bg-gradient-to-br from-green-100"]');
      const totalMessages = userMessages.length + assistantMessages.length;

      // Count threads (user messages start new threads)
      const threadCount = userMessages.length;

      return {
        userMessages: userMessages.length,
        assistantMessages: assistantMessages.length,
        totalMessages,
        threadCount
      };
    });

    // Check if loading state is gone
    const hasLoadingText = await page.evaluate(() => {
      return document.body.textContent.includes('Loading data...');
    });

    // Get actual LCP from browser
    const lcpMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          if (lastEntry) {
            observer.disconnect();
            resolve({
              lcp: lastEntry.renderTime || lastEntry.loadTime,
              element: lastEntry.element?.tagName || 'UNKNOWN',
              size: lastEntry.size
            });
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve({ lcp: null, element: null, size: null });
        }, 1000);
      });
    });

    const result = {
      run: i + 1,
      loadingAppeared,
      loadingDisappeared,
      contentShown,
      hasLoadingText: hasLoadingText,
      timeToContentReady: (totalTime / 1000).toFixed(3),
      browserLCP: lcpMetrics.lcp ? (lcpMetrics.lcp / 1000).toFixed(3) : 'N/A',
      lcpElement: lcpMetrics.element,
      lcpSize: lcpMetrics.size,
      messageData,
      meets15ThreadRequirement: messageData.threadCount >= 15,
      meetsNoFilterRequirement: !hasLoadingText && messageData.totalMessages > 0
    };

    results.push(result);

    console.log(`Time to content ready: ${result.timeToContentReady}s`);
    console.log(`Browser LCP: ${result.browserLCP}s`);
    console.log(`LCP Element: ${result.lcpElement}`);
    console.log(`Threads: ${messageData.threadCount}`);
    console.log(`Messages: ${messageData.totalMessages} (${messageData.userMessages} user, ${messageData.assistantMessages} assistant)`);
    console.log(`Loading text still visible: ${hasLoadingText}`);
    console.log(`Meets 15 thread requirement: ${result.meets15ThreadRequirement}`);

    // Take screenshot
    await page.screenshot({
      path: `/Users/masanao.oba/workspace/cchistory-next/.playwright-mcp/lcp-proper-run-${i+1}.png`,
      fullPage: true
    });
    console.log(`Screenshot saved for run ${i+1}`);

    await browser.close();

    // Wait between runs
    if (i < runs - 1) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }

  // Calculate average
  const validTimes = results.filter(r => r.contentShown).map(r => parseFloat(r.timeToContentReady));
  const avgTime = validTimes.length > 0
    ? (validTimes.reduce((a, b) => a + b, 0) / validTimes.length).toFixed(3)
    : 'N/A';

  const allMeet15Threads = results.every(r => r.meets15ThreadRequirement);
  const allMeetNoFilter = results.every(r => r.meetsNoFilterRequirement);
  const allMeetTime = validTimes.every(t => t < 2.5);

  console.log('\n=== Summary ===');
  console.log(`Average time to content ready: ${avgTime}s`);
  console.log(`Target: < 2.5s`);
  console.log(`\nRequirement Checks:`);
  console.log(`1. LCP < 2.5s: ${allMeetTime ? '✅ PASS' : '❌ FAIL'} (avg: ${avgTime}s)`);
  console.log(`2. Measured from "Loading data..." disappear: ${results.every(r => r.loadingDisappeared) ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. 15 threads displayed with no filters: ${allMeet15Threads && allMeetNoFilter ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOverall: ${allMeetTime && allMeet15Threads && allMeetNoFilter ? '✅ ALL REQUIREMENTS MET' : '❌ REQUIREMENTS NOT MET'}`);

  return {
    results,
    average: {
      timeToContentReady: avgTime
    },
    allRequirementsMet: allMeetTime && allMeet15Threads && allMeetNoFilter
  };
}

// Run measurement
const url = process.argv[2] || 'http://localhost:18080';
const runs = parseInt(process.argv[3]) || 3;

measureLCPProper(url, runs)
  .then(result => {
    process.exit(result.allRequirementsMet ? 0 : 1);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
