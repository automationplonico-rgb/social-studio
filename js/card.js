// Tarjetas gráficas de marca (1080x1080) generadas en el navegador con canvas: sin claves, sin coste, sin servidor.
// Pensadas para checklists, consejos y encuestas cuando no hay foto. No sustituyen a las fotos reales de tu trabajo.
export const CARD_STYLES = { solid: 'Color de marca', light: 'Claro', dark: 'Oscuro' };

const PALETTE = {
  solid: (c) => ({ bg: c, fg: '#ffffff', muted: 'rgba(255,255,255,.82)', accent: '#ffffff', chipBg: 'rgba(255,255,255,.18)' }),
  light: (c) => ({ bg: '#f6f8fc', fg: '#0e1526', muted: '#4a5468', accent: c, chipBg: 'rgba(0,0,0,.06)' }),
  dark: (c) => ({ bg: '#0e1526', fg: '#ffffff', muted: '#b8c1d6', accent: c, chipBg: 'rgba(255,255,255,.1)' }),
};

// De un texto de post saca titular y puntos: líneas con "•", "-" o "1." son los puntos.
export function parsePost(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const bullet = /^([•\-•]|\d+[.)])\s*/;
  const bullets = lines.filter((l) => bullet.test(l)).map((l) => l.replace(bullet, '')).slice(0, 5);
  const headline = (lines.find((l) => !bullet.test(l)) || '').replace(/[\u{1F300}-\u{1FAFF}☀-➿]/gu, '').trim();
  return { headline: headline.length > 90 ? `${headline.slice(0, 87)}…` : headline, bullets };
}

function wrap(ctx, text, maxW) {
  const out = []; let line = '';
  for (const w of text.split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line); return out;
}

export function drawCard(canvas, { headline, bullets = [], footer = '', brand = 'Mooveto', color = '#1f5bff', style = 'solid', size = 1080 }) {
  canvas.width = canvas.height = size; const ctx = canvas.getContext('2d'); const p = PALETTE[style](color); const k = size / 1080; const pad = 90 * k;
  const font = (w, px) => { ctx.font = `${w} ${px * k}px Inter, "Segoe UI", Arial, sans-serif`; };
  ctx.fillStyle = p.bg; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = p.chipBg; ctx.beginPath(); ctx.arc(size - 120 * k, 120 * k, 260 * k, 0, Math.PI * 2); ctx.fill();   // forma decorativa
  // marca
  font(800, 40); ctx.fillStyle = p.fg; ctx.textBaseline = 'alphabetic'; ctx.fillText(brand, pad, pad + 30 * k);
  ctx.fillStyle = p.accent; ctx.fillRect(pad, pad + 52 * k, 70 * k, 8 * k);
  // titular y puntos: se reduce la escala hasta que todo cabe encima del pie
  const limit = size - 150 * k - 30 * k; const bw = size - pad * 2 - 70 * k; const hw = size - pad * 2; const top = pad + 190 * k;
  const fit = (sc) => {
    font(800, 76 * sc); const hl = wrap(ctx, headline || '', hw).slice(0, 4); font(600, 46 * sc);
    const bl = bullets.slice(0, 5).map((b) => wrap(ctx, b, bw).slice(0, 2));
    const end = top + hl.length * 92 * sc * k + 20 * k + bl.reduce((n, ls) => n + ls.length * 60 * sc * k + 14 * k, 0);
    return { sc, hl, bl, end };
  };
  let L = fit(1); for (const sc of [0.9, 0.8, 0.7, 0.62, 0.55]) { if (L.end <= limit) break; L = fit(sc); }
  let y = top; font(800, 76 * L.sc); ctx.fillStyle = p.fg;
  for (const l of L.hl) { ctx.fillText(l, pad, y); y += 92 * L.sc * k; }
  y += 20 * k; font(600, 46 * L.sc);
  for (const ls of L.bl) {
    ctx.fillStyle = p.accent; ctx.beginPath(); ctx.arc(pad + 14 * k, y - 14 * L.sc * k, 12 * L.sc * k, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = p.fg;
    for (const l of ls) { ctx.fillText(l, pad + 56 * k, y); y += 60 * L.sc * k; } y += 14 * k;
  }
  // pie
  ctx.fillStyle = p.chipBg; ctx.fillRect(0, size - 150 * k, size, 150 * k);
  font(600, 38); ctx.fillStyle = p.muted; ctx.textBaseline = 'middle';
  const fl = wrap(ctx, footer, size - pad * 2).slice(0, 2); fl.forEach((l, i) => ctx.fillText(l, pad, size - 75 * k + (i - (fl.length - 1) / 2) * 46 * k));
  return canvas;
}
export const cardBlob = (canvas) => new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.92));
