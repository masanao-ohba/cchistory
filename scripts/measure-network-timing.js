/**
 * Network timing measurement with Playwright
 * Captures detailed timing for each API request
 */

const { chromium } = require('playwright');

async function measureNetworkTiming(url) {
  console.log('=== Network Timing Measurement ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const requests = [];
  const responses = [];

  // Capture request timing
  page.on('request', request => {
    const timing = {
      url: request.url(),
      method: request.method(),
      startTime: Date.now(),
    };
    requests.push(timing);
  });

  // Capture response timing
  page.on('response', async response => {
    const timing = {
      url: response.url(),
      status: response.status(),
      endTime: Date.now(),
      headers: response.headers(),
    };
    responses.push(timing);

    // Log API requests specifically
    if (response.url().includes('/api/')) {
      const request = requests.find(r => r.url === response.url());
      if (request) {
        const duration = timing.endTime - request.startTime;
        const contentLength = timing.headers['content-length'] || 'unknown';
        console.log(`[API] ${request.method} ${response.url().split('?')[0]}`);
        console.log(`  Status: ${timing.status}`);
        console.log(`  Duration: ${duration}ms`);
        console.log(`  Content-Length: ${contentLength} bytes`);
        console.log(`  Content-Encoding: ${timing.headers['content-encoding'] || 'none'}`);
      }
    }
  });

  // Navigate
  console.log(`Navigating to ${url}...\n`);
  const navStart = Date.now();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  const navEnd = Date.now();

  console.log(`\nPage load completed in ${navEnd - navStart}ms`);

  // Wait a bit for any delayed requests
  await page.waitForTimeout(2000);

  // Get performance timing from browser
  const performanceData = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');

    return {
      navigation: {
        domContentLoadedEventEnd: navigation.domContentLoadedEventEnd,
        loadEventEnd: navigation.loadEventEnd,
        responseEnd: navigation.responseEnd,
      },
      apiResources: resources
        .filter(r => r.name.includes('/api/'))
        .map(r => ({
          name: r.name.split('?')[0],
          duration: r.duration,
          transferSize: r.transferSize,
          encodedBodySize: r.encodedBodySize,
          decodedBodySize: r.decodedBodySize,
          startTime: r.startTime,
          responseEnd: r.responseEnd,
        })),
    };
  });

  console.log('\n=== Browser Performance API ===');
  console.log('Navigation timing:');
  console.log(`  DOM Content Loaded: ${performanceData.navigation.domContentLoadedEventEnd.toFixed(0)}ms`);
  console.log(`  Load Event: ${performanceData.navigation.loadEventEnd.toFixed(0)}ms`);

  console.log('\nAPI Resource timing:');
  performanceData.apiResources.forEach(resource => {
    console.log(`\n${resource.name}`);
    console.log(`  Duration: ${resource.duration.toFixed(0)}ms`);
    console.log(`  Transfer Size: ${resource.transferSize} bytes (wire)`);
    console.log(`  Encoded Size: ${resource.encodedBodySize} bytes (compressed)`);
    console.log(`  Decoded Size: ${resource.decodedBodySize} bytes (uncompressed)`);
    console.log(`  Start: ${resource.startTime.toFixed(0)}ms`);
    console.log(`  End: ${resource.responseEnd.toFixed(0)}ms`);
  });

  await page.screenshot({
    path: '/Users/masanao.oba/workspace/cchistory-next/.playwright-mcp/network-timing.png',
    fullPage: true
  });
  console.log('\nScreenshot saved');

  await browser.close();
}

// Run measurement
const url = process.argv[2] || 'http://localhost:18080';
measureNetworkTiming(url).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
