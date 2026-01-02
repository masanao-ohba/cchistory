/**
 * Chrome DevTools Protocol timing measurement
 * Gets detailed timing breakdown for each request
 */

const { chromium } = require('playwright');

async function measureCDPTiming(url) {
  console.log('=== CDP Network Timing Measurement ===\n');

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Enable CDP session
  const client = await context.newCDPSession(page);
  await client.send('Network.enable');

  const requestMap = new Map();

  // Capture request will be sent (has timing info)
  client.on('Network.requestWillBeSent', params => {
    if (params.request.url.includes('/api/')) {
      requestMap.set(params.requestId, {
        url: params.request.url,
        method: params.request.method,
        timestamp: params.timestamp,
        wallTime: params.wallTime,
      });
      console.log(`[Request] ${params.request.method} ${params.request.url.split('?')[0]}`);
      console.log(`  Timestamp: ${params.timestamp}`);
      console.log(`  Wall Time: ${new Date(params.wallTime * 1000).toISOString()}`);
    }
  });

  // Capture response received
  client.on('Network.responseReceived', params => {
    const request = requestMap.get(params.requestId);
    if (request && params.response.url.includes('/api/')) {
      const timing = params.response.timing;
      if (timing) {
        console.log(`\n[Response] ${params.response.url.split('?')[0]}`);
        console.log(`  Status: ${params.response.status}`);
        console.log(`  Timestamp: ${params.timestamp}`);
        console.log(`  Duration: ${((params.timestamp - request.timestamp) * 1000).toFixed(0)}ms`);

        console.log('\n  Timing breakdown:');
        console.log(`    DNS lookup: ${timing.dnsEnd >= 0 ? (timing.dnsEnd - timing.dnsStart).toFixed(1) : 'N/A'}ms`);
        console.log(`    TCP connect: ${timing.connectEnd >= 0 ? (timing.connectEnd - timing.connectStart).toFixed(1) : 'N/A'}ms`);
        console.log(`    SSL: ${timing.sslEnd >= 0 ? (timing.sslEnd - timing.sslStart).toFixed(1) : 'N/A'}ms`);
        console.log(`    Request sent: ${timing.sendEnd >= 0 ? (timing.sendEnd - timing.sendStart).toFixed(1) : 'N/A'}ms`);
        console.log(`    Waiting (TTFB): ${timing.receiveHeadersEnd >= 0 ? (timing.receiveHeadersEnd - timing.sendEnd).toFixed(1) : 'N/A'}ms`);
        console.log(`    Content download: ${timing.receiveHeadersEnd >= 0 ? ((params.timestamp - request.timestamp) * 1000 - timing.receiveHeadersEnd).toFixed(1) : 'N/A'}ms`);

        console.log(`\n  Encoded data length: ${params.response.encodedDataLength} bytes`);
      }
    }
  });

  // Capture loading finished
  client.on('Network.loadingFinished', params => {
    const request = requestMap.get(params.requestId);
    if (request) {
      console.log(`\n[Finished] ${request.url.split('?')[0]}`);
      console.log(`  Encoded data: ${params.encodedDataLength} bytes`);
      console.log(`  Timestamp: ${params.timestamp}`);
    }
  });

  // Navigate
  console.log(`Navigating to ${url}...\n`);
  const navStart = Date.now();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  const navEnd = Date.now();

  console.log(`\n\nPage load completed in ${navEnd - navStart}ms`);

  // Wait for any delayed requests
  await page.waitForTimeout(2000);

  await page.screenshot({
    path: '/Users/masanao.oba/workspace/cchistory-next/.playwright-mcp/cdp-timing.png',
    fullPage: true
  });

  await browser.close();
}

// Run measurement
const url = process.argv[2] || 'http://localhost:18080';
measureCDPTiming(url).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
