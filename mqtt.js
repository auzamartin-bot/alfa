// ============================================================
//  OLD LEGENDS — Servidor anfitrión liviano (Fase 2)
//  Reemplaza al Chromium ALFA para el rol de "siempre encendido":
//  presencia permanente + ping + retransmisión. Las criaturas las
//  hospedan los jugadores (elección por menor id); los dados van por el bus.
//  Corre en Node, sin navegador: liviano y robusto.
// ============================================================
const { openMqtt, mqttSubscribe, mqttPublish } = require('./mqtt.js');

const SALA = 'olonline';
const BUS = 'olg/room/' + SALA + '/bus';
const BROKERS = [
  'wss://oldlegends.mexicocentral.cloudapp.azure.com:8083/mqtt',
  'wss://broker.emqx.io:8084/mqtt',
];
const MI_ID = process.env.SERVER_ID || 'alfa-000';

const estado = { ws: null, jugadores: {}, inicio: Date.now() };

function pub(obj) {
  obj.from = obj.from || MI_ID;
  if (estado.ws) estado.ws.send(mqttPublish(BUS, JSON.stringify(obj)));
}

function alMensaje(topic, text) {
  let m;
  try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || m.from === MI_ID) return;
  if (!m.k && m.x !== undefined) {
    const j = estado.jugadores[m.from] || (estado.jugadores[m.from] = {});
    Object.assign(j, m);
    j.lastSeen = Date.now();
    return;
  }
  switch (m.k) {
    case 'hola':
      if (!estado.jugadores[m.from]) {
        estado.jugadores[m.from] = { lastSeen: Date.now() };
        console.log('[sala] entró', m.from, '· en sala:', Object.keys(estado.jugadores).length);
      } else estado.jugadores[m.from].lastSeen = Date.now();
      break;
    case 'ping':
      if (m.to === MI_ID) pub({ k: 'pong', t: m.t, to: m.from });
      break;
  }
}

function main() {
  console.log('[server] Old Legends — anfitrión liviano');
  console.log('[server] conectando a', BROKERS[0]);
  openMqtt(BROKERS, alMensaje, (ws) => {
    estado.ws = ws;
    ws.send(mqttSubscribe(1, BUS));
    console.log('[server] EN LÍNEA como', MI_ID, '· escuchando', BUS);
    pub({ k: 'hola' });
  }, () => { console.log('[server] sin conexión; reintento solo'); });

  setInterval(() => pub({ k: 'hola' }), 5000);
  setInterval(() => {
    const ahora = Date.now();
    for (const id of Object.keys(estado.jugadores)) {
      if (ahora - (estado.jugadores[id].lastSeen || 0) > 20000) { delete estado.jugadores[id]; console.log('[sala] salió', id); }
    }
  }, 8000);
  setInterval(() => {
    const up = Math.round((Date.now() - estado.inicio) / 60000);
    console.log('[server] vivo ·', Object.keys(estado.jugadores).length, 'en sala ·', up, ' min activo');
  }, 60000);
}

main();
