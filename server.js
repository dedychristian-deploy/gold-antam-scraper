const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/api/gold-proxy', (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const filePath = path.join(__dirname, 'data', `gold-${today}.json`);

    if (!fs.existsSync(filePath)) {
      console.warn('📁 File tidak ditemukan:', filePath);
      return res.status(404).json({ error: 'File tidak ditemukan' });
    }

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    if (!Array.isArray(raw) || raw.length === 0) {
      console.warn('📭 Data kosong atau tidak valid');
      return res.status(500).json({ error: 'Data kosong atau format salah' });
    }

    const lastItem = raw[raw.length - 1] || [];
    const updated = new Date(lastItem[0] || Date.now()).toISOString();

    const history = raw.slice(-30).map(([ts, price]) => ({
      date: new Date(ts).toISOString().split('T')[0],
      sell: price,
    }));

    res.json({
      updated,
      hargaemas: {
        sell: lastItem[1] || 0,
        buy: 0
      },
      history
    });

  } catch (err) {
    console.error('❌ Gagal load data:', err.message);
    res.status(500).json({ error: 'Gagal baca file data emas' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server jalan di http://localhost:${PORT}`);
});
