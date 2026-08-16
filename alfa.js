// ALFA — anfitrión dedicado de Old Legends (navegador headless)
const { chromium } = require('playwright');
const URL_BASE = process.env.OL_URL || 'https://makeplay.ai/p/884bffdtkt/';

async function urlJuegoActual() {
  try {
    const r = await fetch(URL_BASE);
    const h = await r.text();
    const m = h.match(/v\/(\d+)\/index\.html/);
    if (m) return URL_BASE + 'v/' + m[1] + '/index.html?alfa=1';
  } catch (e) { console.log('[alfa] versión no leída:', e.message); }
  return URL_BASE + '?alfa=1';
}

async function main() {
  const url = await urlJuegoActual();
  console.log('[alfa] abriendo', url);
  const navegador = await chromium.launch({ args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-dev-shm-usage', '--mute-audio'] });
  const contexto = await navegador.newContext({ viewport: { width: 640, height: 400 } });
  await contexto.addInitScript(function() { try { localStorage.setItem('olg-alfa', '1'); } catch (e) {} });
  const p = await contexto.newPage();
  p.on('console', function(m) { console.log('[juego]', m.text()); });
  p.on('pageerror', function(e) { console.log('[error]', e.message); });
  await p.goto(url, { waitUntil: 'load', timeout: 90000 });
  console.log('[alfa] ALFA EN LINEA');
  setInterval(function() { console.log('[alfa] vivo', new Date().toISOString()); }, 60000);
}
main().catch(function(e) { console.error('[alfa] fatal:', e.message); process.exit(1); });
