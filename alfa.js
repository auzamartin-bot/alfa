// ALFA — anfitrión dedicado de Old Legends
try { require('http').createServer(function(req, res) { res.writeHead(200); res.end('alfa'); }).listen(process.env.PORT || 3000); } catch (e) {}

async function main() {
  const { chromium } = require('playwright');
  const base = 'https://makeplay.ai/p/884bffdtkt/';
  let url = base + '?alfa=1';
  try {
    const r = await fetch(base);
    const h = await r.text();
    const m = h.match(/v\/(\d+)\/index\.html/);
    if (m) url = base + 'v/' + m[1] + '/index.html?alfa=1';
  } catch (e) { console.log('[alfa] sin version, uso la raiz'); }
  console.log('[alfa] abriendo', url);
  const navegador = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-dev-shm-usage', '--mute-audio'] });
  const p = await navegador.newPage();
  p.on('console', function(m) { console.log('[juego]', m.text()); });
  p.on('pageerror', function(e) { console.log('[error]', e.message); });
  await p.goto(url, { waitUntil: 'load', timeout: 90000 });
  console.log('[alfa] ALFA EN LINEA');
  setInterval(function() { console.log('[alfa] vivo'); }, 60000);
}
setInterval(async function() {
    try {
      const est = await p.evaluate('String(window.__gpReady) + "|" + (window.__debug ? window.__debug.state : "sin-debug")');
      console.log('[alfa] estado:', est);
    } catch (e) { console.log('[alfa] eval fallo:', e.message.slice(0, 80)); }
  }, 20000);
main().catch(function(e) { console.error('[alfa] fatal:', e.message); process.exit(1); });
