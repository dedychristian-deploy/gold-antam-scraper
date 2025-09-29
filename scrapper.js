const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
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

  // WIB (UTC+7)
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

    // pastikan folder data ada
    const outDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // baca data lama dari gold-latest.json
    const latestFile = path.join(outDir, 'gold-latest.json');
    let existing = [];
    if (fs.existsSync(latestFile)) {
      try {
        existing = JSON.parse(fs.readFileSync(latestFile, 'utf-8'));
      } catch (e) {
        console.warn("⚠️ Gagal baca gold-latest.json:", e.message);
      }
    }

    // gabung data lama + baru
    const combined = [...existing, ...json];

    // buang duplikat berdasarkan YYYY-MM-DD + harga
    const seen = new Set();
    const filtered = combined.filter(([ts, price]) => {
      const key = `${dayjs(ts).format('YYYY-MM-DD')}-${price}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // urutkan berdasarkan timestamp
    filtered.sort((a, b) => a[0] - b[0]);

    // simpan arsip harian
    const filename = path.join(outDir, `gold-${transitionDate}.json`);
    fs.writeFileSync(filename, JSON.stringify(filtered, null, 2));

    // simpan versi latest
    fs.writeFileSync(latestFile, JSON.stringify(filtered, null, 2));

    console.log(`💾 Disimpan ke ${filename} dan gold-latest.json (total ${filtered.length} data)`);
  } catch (e) {
    console.error('❌ Gagal parse:', e.message);
    console.log('📄 Cuplikan isi:', resultText.slice(0, 300));
  }

  await browser.close();
})();
