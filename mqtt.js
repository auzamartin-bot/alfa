// Cliente MQTT-over-WebSocket para el servidor (Node). Portado de src/mp.ts.
// Node 22 tiene WebSocket nativo y TextEncoder/Uint8Array.
const enc = new TextEncoder();
const dec = new TextDecoder();

function encVarint(n) { const o = []; do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; o.push(b); } while (n > 0); return o; }
function mqttPacket(type, body) { return new Uint8Array([type, ...encVarint(body.length), ...body]); }
function mqttConnect(id) {
  const cid = Array.from(enc.encode(id));
  const proto = [0, 4, 0x4d, 0x51, 0x54, 0x54, 4, 0x02, 0, 60];
  return mqttPacket(0x10, [...proto, 0, cid.length, ...cid]);
}
function mqttSubscribe(pid, topic) {
  const t = Array.from(enc.encode(topic));
  return mqttPacket(0x82, [(pid >> 8) & 255, pid & 255, 0, t.length, ...t, 0]);
}
function mqttPublish(topic, text) {
  const t = Array.from(enc.encode(topic));
  const p = Array.from(enc.encode(text));
  return mqttPacket(0x30, [(t.length >> 8) & 255, t.length & 255, ...t, ...p]);
}

// abre la conexión y llama onMsg(topic, text) por cada publicación, onReady al conectar
function openMqtt(brokers, onMsg, onReady, onDead) {
  let ws = null;
  let intentos = 0;
  let buf = new Uint8Array(0);
  const conectar = () => {
    try { ws = new WebSocket(brokers[intentos % brokers.length], ['mqtt']); }
    catch (e) { if (onDead) onDead(); return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => ws.send(mqttConnect('olg-server-' + Math.random().toString(36).slice(2, 9)));
    ws.onmessage = (ev) => {
      const add = new Uint8Array(ev.data);
      const joint = new Uint8Array(buf.length + add.length);
      joint.set(buf); joint.set(add, buf.length);
      buf = joint;
      for (;;) {
        if (buf.length < 2) break;
        let mul = 1, rl = 0, i = 1;
        for (; i < 5 && i < buf.length; i++) { rl += (buf[i] & 127) * mul; mul *= 128; if (!(buf[i] & 128)) { i++; break; } }
        if (buf.length < i + rl) break;
        const type = buf[0] & 0xf0;
        const body = buf.slice(i, i + rl);
        buf = buf.slice(i + rl);
        if (type === 0x20) { if (body[1] === 0 && onReady) onReady(ws); }
        else if (type === 0x30) {
          const tl = (body[0] << 8) | body[1];
          onMsg(dec.decode(body.slice(2, 2 + tl)), dec.decode(body.slice(2 + tl)));
        }
      }
    };
    ws.onerror = () => { intentos++; if (intentos < brokers.length) conectar(); else if (onDead) onDead(); };
    ws.onclose = () => { intentos = 0; setTimeout(conectar, 3000); };
  };
  conectar();
  return { send: (pkt) => { try { if (ws && ws.readyState === 1) ws.send(pkt); } catch (e) {} }, close: () => { try { if (ws) ws.close(); } catch (e) {} } };
}

module.exports = { openMqtt, mqttSubscribe, mqttPublish, encVarint };
