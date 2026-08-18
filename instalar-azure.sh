#!/bin/bash
set -e
cd ~
echo "== 1/4 · Node.js =="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
mkdir -p alfa-server && cd alfa-server
echo "== 2/4 · archivos =="
cat > package.json << 'PKG'
{ "name": "oldlegends-alfa", "version": "1.0.0", "scripts": { "start": "node alfa.js" }, "dependencies": { "playwright": "^1.44.0" } }
PKG
cat > alfa.js << 'JS'
const { chromium } = require('playwright');
const BASE = process.env.OL_URL || 'https://makeplay.ai/p/884bffdtkt/';
async function urlActual() {
  try {
    const r = await fetch(BASE);
    const h = await r.text();
    const m = h.match(/v\/(\d+)\/index\.html/);
    if (m) return BASE + 'v/' + m[1] + '/index.html?alfa=1';
  } catch (e) {}
  return BASE + '?alfa=1';
}
async function lanzar() {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-dev-shm-usage', '--mute-audio'] });
  const c = await browser.newContext({ viewport: { width: 640, height: 400 } });
  await c.addInitScript(() => { try { localStorage.setItem('olg-alfa', '1'); } catch (e) {} });
  const page = await c.newPage();
  page.on('pageerror', (e) => console.log('[error página]', e.message));
  const url = await urlActual();
  console.log('[alfa] abriendo', url);
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__gpReady === true, null, { timeout: 90000 }).catch(() => {});
  await page.waitForFunction(() => window.__debug && window.__debug.state === 'play', null, { timeout: 90000 }).catch(() => {});
  console.log('[alfa] MUNDO EN LÍNEA');
  await new Promise((_, rej) => { page.on('crash', () => rej(new Error('colgada'))); page.on('close', () => rej(new Error('cerrada'))); });
}
(async () => { for (;;) { try { await lanzar(); } catch (e) { console.log('[alfa] reinicio en 5 s:', e.message); await new Promise((r) => setTimeout(r, 5000)); } } })();
JS
echo "== 3/4 · playwright + chromium (tarda unos minutos) =="
npm install --no-fund --no-audit
npx playwright install --with-deps chromium
echo "== 4/4 · servicio 24/7 =="
cat > alfa.service << 'SRV'
[Unit]
Description=Old Legends ALFA
After=network-online.target
[Service]
Type=simple
WorkingDirectory=%HOME%/alfa-server
ExecStart=/usr/bin/node alfa.js
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
SRV
sed -i "s|%HOME%|$HOME|g" alfa.service
sudo cp alfa.service /etc/systemd/system/alfa.service
sudo systemctl daemon-reload
sudo systemctl enable --now alfa
echo "ALFA corriendo 24/7. Ver el registro: journalctl -u alfa -f"
