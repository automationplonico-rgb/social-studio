// Capa de datos: modo DEMO (navegador: localStorage + IndexedDB) o REMOTO (webhook de n8n). Mismo contrato en ambos. Ver API.md.
const STATE_KEY = 'mvt-social-studio-v1';
const CFG_KEY = 'mvt-social-studio-api';
const safe = (fn, dflt) => { try { return fn(); } catch { return dflt; } };
let cfg = safe(() => JSON.parse(localStorage.getItem(CFG_KEY)) || { base: '', key: '' }, { base: '', key: '' });
export const getCfg = () => ({ ...cfg });
export const mode = () => (cfg.base ? 'remote' : 'demo');
export function setCfg(base, key) { cfg = { base: (base || '').trim(), key: (key || '').trim() }; safe(() => localStorage.setItem(CFG_KEY, JSON.stringify(cfg))); }

async function call(action, payload = {}) {
  const r = await fetch(cfg.base, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Key': cfg.key }, body: JSON.stringify({ action, ...payload }) });
  let j = null; try { j = await r.json(); } catch { /* respuesta no JSON */ }
  if (!r.ok || !j || j.ok === false) throw new Error((j && j.error) || `Error ${r.status} del servidor`);
  return j;
}

// ---------- estado ----------
let memo = null; // copia en memoria del estado demo
const readLocal = () => safe(() => JSON.parse(localStorage.getItem(STATE_KEY)), null);
let saveT = null;
function persistLocal(state) {
  clearTimeout(saveT);
  saveT = setTimeout(() => safe(() => localStorage.setItem(STATE_KEY, JSON.stringify({ accounts: state.accounts, assets: state.assets.map(({ url, ...a }) => a), posts: state.posts, rules: state.rules, settings: state.settings }))), 150);
}
export async function loadAll() {
  if (mode() === 'remote') { const j = await call('load_all'); return { accounts: j.accounts || [], assets: j.assets || [], posts: j.posts || [], rules: j.rules || [], settings: j.settings || null, driveSync: j.driveSync || null }; }
  return readLocal() || { accounts: [], assets: [], posts: [], rules: [], settings: null };
}
export async function upsert(coll, doc, state) {
  if (mode() === 'remote') return call('upsert', { collection: coll, doc: coll === 'assets' ? { ...doc, url: doc.remoteUrl || doc.url } : doc });
  persistLocal(state);
}
export async function remove(coll, id, state) {
  if (mode() === 'remote') return call('delete', { collection: coll, id });
  if (coll === 'assets') deleteBlob(id); persistLocal(state);
}
export async function saveSettings(settings, state) { if (mode() === 'remote') return call('upsert', { collection: 'settings', doc: { id: 'main', ...settings } }); persistLocal(state); }
export const wipeLocal = () => safe(() => { localStorage.removeItem(STATE_KEY); indexedDB.deleteDatabase('mvt-ss-blobs'); });

// ---------- archivos ----------
let dbp;
const db = () => (dbp ||= new Promise((res, rej) => { const r = indexedDB.open('mvt-ss-blobs', 1); r.onupgradeneeded = () => r.result.createObjectStore('b'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }));
const idb = async (mode_, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction('b', mode_); const out = fn(t.objectStore('b')); t.oncomplete = () => res(out.result); t.onerror = () => rej(t.error); }); };
const deleteBlob = (id) => idb('readwrite', (s) => s.delete(id)).catch(() => {});
const urlCache = new Map();
export async function putAsset(asset, blob) {
  if (mode() === 'remote') {
    const fd = new FormData(); fd.append('action', 'upload_asset'); fd.append('meta', JSON.stringify({ id: asset.id, name: asset.name, mime: blob.type })); fd.append('file', blob, asset.name);
    const r = await fetch(cfg.base, { method: 'POST', headers: { 'X-Studio-Key': cfg.key }, body: fd }); const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) throw new Error((j && j.error) || 'No se pudo subir el archivo'); return j.url;
  }
  await idb('readwrite', (s) => s.put(blob, asset.id)); urlCache.set(asset.id, URL.createObjectURL(blob)); return null;
}
export async function assetUrl(asset) {
  if (asset.url) return asset.url;
  if (urlCache.has(asset.id)) return urlCache.get(asset.id);
  const b = await idb('readonly', (s) => s.get(asset.id)).catch(() => null);
  if (!b) return null; const u = URL.createObjectURL(b); urlCache.set(asset.id, u); return u;
}
export const getBlob = (id) => idb('readonly', (s) => s.get(id)).catch(() => null);

// ---------- cuentas / publicación (solo remoto; en demo se simula en la vista) ----------
export const connectStart = (platform, label) => call('account_connect_start', { platform, label });   // -> { authUrl } (Meta)
export const accountDisconnect = (accountId) => call('account_disconnect', { accountId });
export const accountsRefresh = () => call('accounts_list');
export const publishNow = (postId) => call('publish_now', { postId });
export const health = () => call('health');
