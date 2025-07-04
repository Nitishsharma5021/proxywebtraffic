const puppeteer = require('puppeteer');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { exec } = require('child_process');

// ==== CONFIG ====
const torProxy = 'socks5://127.0.0.1:9050';
const targetUrls = [
  'https://your-site.com',
];
const countries = ['us', 'de', 'in', 'gb', 'fr', 'ca', 'nl'];
const userCount = 1000;

// ==== UTILITIES ====
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Rotate Tor IP using Tor control port (9051)
const rotateIP = () => {
  exec(`(echo authenticate \\"\\") | nc 127.0.0.1 9050 && echo "signal NEWNYM" | nc 127.0.0.1 9051`);
};

// Simulate human actions: scroll, wait, click
async function simulateHuman(page) {
  const actions = [
    async () => { await page.mouse.move(200, 200); await sleep(1000); },
    async () => { await page.evaluate(() => window.scrollBy(0, window.innerHeight / 3)); await sleep(2000); },
    async () => { await page.evaluate(() => window.scrollBy(0, window.innerHeight)); await sleep(3000); },
    async () => {
      const links = await page.$$('a');
      if (links.length > 0) {
        const link = links[Math.floor(Math.random() * links.length)];
        await link.hover();
        await sleep(500);
        await link.click();
        await sleep(4000);
      }
    }
  ];

  for (const action of actions) {
    await action();
  }
}

// Visit the website like a real user
const visitWebsite = async (url, visitNo, countryCode) => {
  const agent = new SocksProxyAgent(torProxy);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      `--proxy-server=${torProxy}`
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  );

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

    console.log(`[✓] Visiting ${url} as user #${visitNo} from ${countryCode.toUpperCase()}`);

    await simulateHuman(page); // Perform human-like interaction

    console.log(`[✓] User #${visitNo} finished simulation`);
  } catch (err) {
    console.error(`[✗] Error with user #${visitNo}:`, err.message);
  }

  await browser.close();
};

// === MAIN FUNCTION ===
(async () => {
  for (let i = 0; i < userCount; i++) {
    const url = targetUrls[i % targetUrls.length];
    const country = countries[i % countries.length];

    rotateIP(); // Change IP before each user

    await sleep(3000); // Delay to avoid flooding

    visitWebsite(url, i + 1, country); // Launch async (not waiting to simulate concurrency)
  }
})();
