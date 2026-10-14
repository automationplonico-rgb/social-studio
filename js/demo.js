// Datos de ejemplo (solo para explorar el panel). Diseños generados en canvas; cuentas SIMULADAS.
import { state, uid, upsert, emit } from './store.js';
import * as api from './api.js';
import { dayKey, fromInputs } from './tz.js';

function drawDesign(w, h, { top, title, sub, c1, c2 }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, w, h); grad.addColorStop(0, c1); grad.addColorStop(1, c2); g.fillStyle = grad; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.beginPath(); g.arc(w * 0.85, h * 0.18, w * 0.38, 0, 7); g.fill(); g.beginPath(); g.arc(w * 0.1, h * 0.9, w * 0.3, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.font = `700 ${w * 0.038}px Inter, sans-serif`; g.fillText(top.toUpperCase(), w * 0.08, h * 0.28);
  g.font = `800 ${w * 0.105}px Inter, sans-serif`; wrap(g, title, w * 0.08, h * 0.37, w * 0.84, w * 0.12);
  g.font = `500 ${w * 0.04}px Inter, sans-serif`; g.globalAlpha = 0.9; wrap(g, sub, w * 0.08, h * 0.74, w * 0.84, w * 0.055); g.globalAlpha = 1;
  g.font = `600 ${w * 0.03}px Inter, sans-serif`; g.globalAlpha = 0.6; g.fillText('Sample design (demo)', w * 0.08, h * 0.95);
  return new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9));
}
function wrap(g, text, x, y, maxW, lh) { let line = ''; for (const wd of text.split(' ')) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = wd; } else line = t; } g.fillText(line, x, y); }

const SAMPLES = [
  { name: 'Reseña 4.9 (story)', w: 1080, h: 1920, category: 'proof', collection: 'Reseñas', top: 'Customers say', title: 'Careful, on time, fully insured', sub: 'Rated 4.9 out of 5 across London', c1: '#1f5bff', c2: '#0b1f6b', copyMode: 'light' },
  { name: 'Checklist mudanza (story)', w: 1080, h: 1920, category: 'education', collection: 'Consejos', top: 'Moving day', title: 'The checklist you will actually use', sub: 'Save it for later', c1: '#0e7490', c2: '#0b2a4a', copyMode: 'full' },
  { name: 'Slots libres (story)', w: 1080, h: 1920, category: 'offer', collection: 'Ofertas', top: 'This week', title: 'Man and van slots open', sub: 'Message us your date', c1: '#7c3aed', c2: '#1e1b4b', copyMode: 'light' },
  { name: 'Equipo (story)', w: 1080, h: 1920, category: 'behind', collection: 'Equipo', top: 'Behind the scenes', title: 'How we wrap a sofa', sub: 'Small details, big difference', c1: '#047857', c2: '#052e2b', copyMode: 'none', caption: 'Wrapped, strapped, loaded. Zero scratches.' },
  { name: 'Antes y después (feed)', w: 1080, h: 1350, category: 'proof', collection: 'Reseñas', top: 'Before / after', title: 'Boxes everywhere to home by dinner', sub: '2 bed flat, one trip', c1: '#b45309', c2: '#451a03', copyMode: 'full' },
  { name: 'Error nº1 (feed)', w: 1080, h: 1350, category: 'education', collection: 'Consejos', top: 'Avoid this', title: 'The #1 mistake when booking removals', sub: 'Check the insurance first', c1: '#be123c', c2: '#4c0519', copyMode: 'full' },
];

export async function seedDemo() {
  const S = state.settings; const now = Date.now();
  state.accounts = [
    { id: 'acc_wa1', platform: 'whatsapp', label: 'WhatsApp Ventas', handle: '+44 7000 000001', status: 'connected', simulated: true, engine: 'manual' },
    { id: 'acc_wa2', platform: 'whatsapp', label: 'WhatsApp Soporte', handle: '+44 7000 000002', status: 'connected', simulated: true, engine: 'manual' },
    { id: 'acc_ig', platform: 'instagram', label: 'Instagram', handle: '@mooveto', status: 'connected', simulated: true, expiresAt: now + 52 * 864e5 },
    { id: 'acc_fb', platform: 'facebook', label: 'Facebook Page', handle: 'Mooveto', status: 'connected', simulated: true, expiresAt: now + 4 * 864e5 },
  ];
  state.assets = []; state.posts = []; state.rules = [];
  for (const s of SAMPLES) {
    const blob = await drawDesign(s.w, s.h, s); const a = { id: uid('ast'), name: s.name, kind: 'image', mime: 'image/jpeg', w: s.w, h: s.h, size: blob.size, collection: s.collection, category: s.category, tags: ['demo'], copyMode: s.copyMode, caption: s.caption || '', hookId: null, alt: s.title, createdAt: now - Math.random() * 864e5 * 20, usedCount: 0 };
    const ru = await api.putAsset(a, blob); a.url = ru || (await api.assetUrl(a)); state.assets.push(a);
  }
  const st = state.assets.filter((a) => a.h === 1920).map((a) => a.id); const feed = state.assets.filter((a) => a.h === 1350).map((a) => a.id);
  const day = (off, t) => fromInputs(dayKey(now + off * 864e5, S.tz), t, S.tz);
  const mk = (title, assetId, targets, at, status, extra = {}) => state.posts.push({ id: uid('post'), title, assetId, targets, copy: { mode: 'light', hookId: null, default: 'Rated 4.9 out of 5 across London.\n\nMessage us for a quote.', overrides: {} }, scheduledAt: at, status, results: [], category: state.assets.find((a) => a.id === assetId)?.category, createdAt: now, ...extra });
  const T = (f, acc) => ({ accountId: acc, format: f });
  mk('Reseña 4.9', st[0], [T('wa_status', 'acc_wa1'), T('ig_story', 'acc_ig'), T('fb_story', 'acc_fb')], day(-3, '12:30'), 'published', { results: [{ accountId: 'acc_wa1', format: 'wa_status', ok: true, simulated: true }, { accountId: 'acc_ig', format: 'ig_story', ok: true, simulated: true }, { accountId: 'acc_fb', format: 'fb_story', ok: true, simulated: true }] });
  mk('Error nº1', feed[1], [T('ig_feed', 'acc_ig'), T('fb_post', 'acc_fb')], day(-1, '19:30'), 'failed', { results: [{ accountId: 'acc_ig', format: 'ig_feed', ok: false, error: 'Token caducado (OAuthException 190)', simulated: true }, { accountId: 'acc_fb', format: 'fb_post', ok: true, simulated: true }] });
  mk('Checklist', st[1], [T('wa_status', 'acc_wa1'), T('wa_status', 'acc_wa2')], day(0, '23:00') > now ? day(0, '23:00') : now + 3600e3, 'scheduled');
  mk('Slots libres', st[2], [T('ig_story', 'acc_ig')], day(1, '07:45'), 'scheduled');
  mk('Antes y después', feed[0], [T('ig_feed', 'acc_ig'), T('fb_post', 'acc_fb')], day(2, '19:30'), 'scheduled');
  state.rules = [{ id: uid('rule'), name: 'Estados diarios (Ventas)', enabled: true, collection: '', category: '', targets: [T('wa_status', 'acc_wa1')], days: [1, 2, 3, 4, 5], times: ['12:30', '19:30'], jitter: true, skipRecentDays: 3, copyMode: 'asset', horizonDays: 14, area: 'London', service: 'a move', createdAt: now }];
  state.settings.onboardingDismissed = true; state.settings.brand.phone = '+44 7000 000001';
  for (const c of ['accounts', 'assets', 'posts', 'rules']) for (const d of state[c]) upsert(c, d);
  emit();
}
