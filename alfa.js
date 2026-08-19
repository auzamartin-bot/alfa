const { chromium } = require('playwright');
const URL_BASE = process.env.OL_URL || 'https://makeplay.ai/p/884bffdtkt/';
async function urlJuegoActual() {
  try {
    const r = await fetch(URL_BASE);
    const h = await r.text();
    const m = h.match(/v\/(\d+)\/index\.html/);
    if (m) return URL_BASE + 'v/' + m[1] + '/index.html?alfa=1';
  } catch (e) { console.log('[alfa] no pude leer la versión:', e.message); }
  return URL_BASE + (URL_BASE.indexOf('?') >= 0 ? '&alfa=1' : '?alfa=1');
}
async function lanzar() {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-unsafe-swiftshader', '--use-gl=angle', '--disable-dev-shm-usage',
      '--mute-audio', '--no-sandbox',
      '--disable-gpu', '--disable-gpu-compositing', '--disable-accelerated-2d-canvas',
      '--disable-canvas-aa', '--disable-2d-canvas-clip-utils',
    ],
  });
  const context = await browser.newContext({ viewport: { width: 640, height: 400 } });
  await context.addInitScript(() => { try { localStorage.setItem('olg-alfa', '1'); } catch (e) {} });
  const page = await context.newPage();
  page.on('console', (m) => console.log('[juego]', m.text()));
  page.on('pageerror', (e) => console.log('[error página]', e.message));
  const url = await urlJuegoActual();
  console.log('[alfa] abriendo', url);
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  await page.waitForFunction(() => window.__gpReady === true, undefined, { timeout: 90000 }).catch(() => {});
  await page.waitForFunction(() => window.__debug && window.__debug.state === 'play', undefined, { timeout: 90000 });
  console.log('[alfa] MUNDO EN LÍNEA');
  await new Promise((_, rej) => {
    page.on('crash', () => rej(new Error('página colgada')));
    page.on('close', () => rej(new Error('página cerrada')));
    page.on('framenavigated', () => rej(new Error('navegación inesperada')));
    setTimeout(() => rej(new Error('reinicio programado de memoria')), 4 * 60 * 60 * 1000);
  });
}
(async () => {
  for (;;) {
    try { await lanzar(); } catch (e) {
      console.log('[alfa] reinicio en 5 s:', e && e.message ? e.message : e);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
})();
