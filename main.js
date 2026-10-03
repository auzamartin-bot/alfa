const { app, BrowserWindow, BrowserView } = require('electron');
const URL_JUEGO = 'https://makeplay.ai/p/884bffdtkt/v/443/index.html?launcher=1';   // ← pegá tu URL pública y dejá ?launcher=1 al final
const RECORTE = 24;   // ← px de la franja inferior (etiqueta) que quedan fuera de la ventana; ajustá 18-30

app.whenReady().then(() => {
  // splash: tu imagen con la frase y la barra en ciclo
  const splash = new BrowserWindow({ width: 1024, height: 576, frame: false, resizable: false, alwaysOnTop: true });
  splash.loadFile('splash.html');

  // ventana contenedora (vacía) + vista del juego más ALTA que la ventana:
  // los últimos RECORTE px (la etiqueta fija de la plataforma) quedan fuera de la pantalla
  const juego = new BrowserWindow({ width: 1280, height: 800, show: false, autoHideMenuBar: true, backgroundColor: '#000', title: 'Old Legends+Online!!' });
  const vista = new BrowserView({ webPreferences: { backgroundThrottling: false } });
  juego.setBrowserView(vista);

  const encajar = () => {
    const [w, h] = juego.getContentSize();
    vista.setBounds({ x: 0, y: 0, width: w, height: h + RECORTE });
  };
  encajar();
  juego.on('resize', encajar);
  juego.on('maximize', encajar);
  juego.on('unmaximize', encajar);
  juego.on('enter-full-screen', encajar);
  juego.on('leave-full-screen', encajar);

  vista.webContents.loadURL(URL_JUEGO);

  const t0 = Date.now();
  let cerrado = false;
  const mostrar = () => {
    if (cerrado) return; cerrado = true;
    try { splash.close(); } catch (e) {}
    juego.show(); juego.maximize();
    setTimeout(encajar, 100);   // por si maximize llega después
  };

  const sonda = setInterval(async () => {
    let listo = false;
    for (const f of vista.webContents.mainFrame.framesInSubtree) {   // el juego vive en un marco interno
      try {
        const ok = await f.executeJavaScript('!!window.__gpPlayable');
        if (ok) listo = true;
      } catch (e) {}
    }
    if (listo) splash.webContents.executeJavaScript('setPct(100)').catch(() => {});
    // mínimo 2,5 s de splash; si algo falla, a los 45 s abre el juego igual
    if ((listo && Date.now() - t0 > 2500) || Date.now() - t0 > 45000) {
      clearInterval(sonda);
      setTimeout(mostrar, 1700);   // deja terminar el ciclo de la barra
    }
  }, 250);

  juego.on('closed', () => app.quit());
});

app.on('window-all-closed', () => app.quit());
