const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const dayjs = require('dayjs');

puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.goto('https://www.logammulia.com/id', { waitUntil: 'networkidle2', timeout: 0 });
  await page.waitForSelector('input[name="_token"]');

  const token = await page.$eval('input[name="_token"]', el => el.value);
  console.log('✅ Token ditemukan:', token);

  // WIB (UTC+7) → aman di server UTC
  const transitionDate = dayjs().add(7, 'hour').format('YYYY-MM-DD');
  const url = `https://www.logammulia.com/data-base-price/gold_eai/sell?_token=${token}&transition=1&transition_date=${transitionDate}`;
  console.log('🔗 URL API:', url);

  await new Promise(resolve => setTimeout(resolve, 10000)); // delay aman

  const resultText = await page.evaluate(async (_url) => {
    const res = await fetch(_url, {
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      }
    });
    return await res.text();
  }, url);

  try {
    const json = JSON.parse(resultText);
    const filename = `data/gold-${transitionDate}.json`;
    fs.writeFileSync(filename, JSON.stringify(json, null, 2));
    console.log(`💾 Disimpan ke ${filename}`);
  } catch (e) {
    console.error('❌ Gagal parse:', e.message);
    console.log('📄 Cuplikan isi:', resultText.slice(0, 300));
  }

  await browser.close();
})();
