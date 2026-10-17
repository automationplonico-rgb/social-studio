// Estado único en memoria + persistencia vía api.js. Las vistas se suscriben y se repintan.
import * as api from './api.js';
import { toast } from './ui.js';

export const uid = (p) => `${p}_${crypto.randomUUID().slice(0, 8)}`;
export const DEFAULT_SETTINGS = () => ({
  brand: { name: 'Mooveto', color: '#1f5bff', site: 'https://mooveto.co.uk', phone: '', proof: ['Rated 4.9 out of 5', 'Fully insured', 'Verified drivers', '24/7 support'] },
  tz: 'Europe/London', paused: false, theme: 'auto',
  guard: { waMaxPerDay: 3, waMinGapMin: 45, jitterMin: 12, quietFrom: '22:00', quietTo: '07:00', igMaxStoriesPerDay: 6, fbMaxPostsPerDay: 3 },
  lint: { noEmDash: true, noPrices: true, maxHashtags: 3 },
  mix: { proof: 30, education: 30, offer: 20, behind: 20 },
  onboardingDismissed: false,
  drive: { folderId: '', folderName: '', enabled: true },
});
export const state = { accounts: [], assets: [], posts: [], rules: [], settings: DEFAULT_SETTINGS(), driveSync: null, ready: false, error: null };
const subs = new Set();
export const subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
export const emit = () => subs.forEach((f) => { try { f(state); } catch (e) { console.error(e); } });

const merge = (d, s) => { for (const k in s) d[k] = s[k] && typeof s[k] === 'object' && !Array.isArray(s[k]) && d[k] && typeof d[k] === 'object' ? merge({ ...d[k] }, s[k]) : s[k]; return d; };
export async function load() {
  try {
    const d = await api.loadAll();
    state.accounts = d.accounts; state.assets = d.assets; state.posts = d.posts; state.rules = d.rules;
    state.settings = merge(DEFAULT_SETTINGS(), d.settings || {}); state.driveSync = d.driveSync || null; state.error = null;
    await hydrateUrls();
  } catch (e) { state.error = e.message; }
  state.ready = true; emit();
}
export async function hydrateUrls() { await Promise.all(state.assets.filter((a) => !a.url).map(async (a) => { a.url = await api.assetUrl(a); })); }

const fail = (what) => (e) => { console.error(e); toast(`${what}: ${e.message}`, 'err'); };
export function upsert(coll, doc) {
  const arr = state[coll]; const i = arr.findIndex((x) => x.id === doc.id); doc.updatedAt = Date.now();
  if (i >= 0) arr[i] = doc; else arr.push(doc);
  emit(); api.upsert(coll, doc, state).catch(fail('No se pudo guardar')); return doc;
}
export function remove(coll, id) {
  state[coll] = state[coll].filter((x) => x.id !== id); emit(); api.remove(coll, id, state).catch(fail('No se pudo eliminar'));
}
export function setSettings(patch) {
  state.settings = merge({ ...state.settings }, patch); applyTheme(); emit(); api.saveSettings(state.settings, state).catch(fail('No se pudo guardar'));
}
export function applyTheme() {
  const s = state.settings; const r = document.documentElement;
  r.style.setProperty('--brand', s.brand.color || '#1f5bff');
  const L = luminance(s.brand.color || '#1f5bff'); r.style.setProperty('--brand-ink', L > 0.55 ? '#0e1526' : '#ffffff');
  if (s.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', s.theme);
}
function luminance(hex) { const n = parseInt(hex.replace('#', ''), 16); const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }

export const newPost = (over = {}) => ({ id: uid('post'), title: '', assetId: null, targets: [], copy: { mode: 'light', hookId: null, default: '', overrides: {} }, scheduledAt: null, status: 'draft', results: [], category: null, ruleId: null, createdAt: Date.now(), ...over });
export const attention = () => ({
  failed: state.posts.filter((p) => p.status === 'failed' || p.status === 'partial'),
  accounts: state.accounts.filter((a) => a.status !== 'connected' || (a.expiresAt && a.expiresAt - Date.now() < 7 * 864e5)),
});
