// Motor de reglas: convierte automatizaciones en publicaciones concretas y editables (la cola), y simula el publicador en modo demo.
import { state, uid, newPost } from './store.js';
import { FORMATS, compat, validatePost, hasErrors } from './rules.js';
import { buildCopy, hookById, HOOKS } from './marketing.js';
import { dayKey, fromInputs, parts } from './tz.js';

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

// Desplaza la hora fuera del horario de silencio y aplica jitter determinista (mismo slot -> mismo resultado).
export function jittered(baseMs, slotKey, S) {
  const j = S.guard.jitterMin; let ms = baseMs;
  if (j > 0) ms += ((hash(slotKey) % (2 * j + 1)) - j) * 60000;
  const p = parts(ms, S.tz); const cur = p.h * 60 + p.mi; const from = mins(S.guard.quietFrom), to = mins(S.guard.quietTo);
  const quiet = from > to ? cur >= from || cur < to : cur >= from && cur < to;
  if (quiet) { const add = ((to - cur + 1440) % 1440) + (hash(slotKey) % 15); ms += add * 60000; }
  return ms;
}

export function pickAsset(rule, st, taken, now) {
  const fmts = rule.targets.map((t) => t.format);
  const recent = (rule.skipRecentDays ?? 14) * 864e5;
  const used = new Map(); for (const p of st.posts) if (p.assetId && ['scheduled', 'published', 'publishing'].includes(p.status) && p.scheduledAt) used.set(p.assetId, Math.max(used.get(p.assetId) || 0, p.scheduledAt));
  let pool = st.assets.filter((a) => !a.archived && (!rule.collection || a.collection === rule.collection) && (!rule.category || a.category === rule.category) && fmts.every((f) => compat(a)[f] === true)); // las reglas no recortan diseños: exige formato exacto
  const fresh = pool.filter((a) => !taken.has(a.id) && !(used.has(a.id) && Math.abs(now - used.get(a.id)) < recent));
  pool = fresh.length ? fresh : null; if (!pool) return null;
  pool.sort((a, b) => (used.get(a.id) || 0) - (used.get(b.id) || 0) || a.createdAt - b.createdAt);
  return pool[0];
}

function copyFor(rule, asset, targets, slotKey, S) {
  const mode = rule.copyMode === 'asset' || !rule.copyMode ? asset.copyMode || 'light' : rule.copyMode;
  const hook = asset.hookId ? hookById(asset.hookId) : (() => { const pool = HOOKS.filter((h) => !asset.category || h.cat === asset.category); return pool[hash(slotKey) % pool.length]; })();
  const ctx = { area: rule.area || 'London', service: rule.service || 'a move' };
  const showing = targets.map((t) => t.format).filter((f) => FORMATS[f].captionShows);
  const main = showing.find((f) => f !== 'wa_status') || showing[0];
  const out = { mode, hookId: mode === 'none' ? null : hook?.id || null, default: '', overrides: {} };
  if (mode === 'none') { out.default = asset.caption || ''; return out; }
  const custom = asset.caption || '';
  if (main) out.default = buildCopy({ mode, hook, ctx, settings: S, format: main, custom }).caption;
  if (targets.some((t) => t.format === 'wa_status') && main && main !== 'wa_status') out.overrides.wa_status = buildCopy({ mode, hook, ctx, settings: S, format: 'wa_status', custom }).caption;
  return out;
}

// Slots (fechas) que generaría una regla en los próximos `days` días. Sirve para la vista previa y para materializar.
export function slotsFor(rule, S, now = Date.now(), days = rule.horizonDays || 14) {
  const out = [];
  for (let i = 0; i < days; i++) {
    const noon = now + i * 864e5; const key = dayKey(noon, S.tz); const dow = parts(noon, S.tz).dow;
    if (!rule.days.includes(dow)) continue;
    for (const t of rule.times) { const slotKey = `${rule.id}|${key}|${t}`; const base = fromInputs(key, t, S.tz); const at = jittered(base, slotKey, S); if (at > now + 5 * 60000) out.push({ slotKey, at, key, time: t }); }
  }
  return out;
}

export function materialize(rule, st = state, now = Date.now()) {
  const created = [], warnings = []; const taken = new Set();
  if (!rule.targets.length) return { created, warnings: ['La regla no tiene destinos.'] };
  for (const s of slotsFor(rule, st.settings, now)) {
    if (st.posts.some((p) => p.slotKey === s.slotKey)) continue;
    const asset = pickAsset(rule, st, taken, now);
    if (!asset) { warnings.push(`Sin diseño disponible para ${s.key} ${s.time} (revisa el pool o "no repetir en N días").`); continue; }
    taken.add(asset.id);
    const post = newPost({ title: asset.name, assetId: asset.id, targets: rule.targets.map((t) => ({ ...t })), copy: copyFor(rule, asset, rule.targets, s.slotKey, st.settings), scheduledAt: s.at, status: 'scheduled', category: asset.category || null, ruleId: rule.id, slotKey: s.slotKey });
    const issues = validatePost(post, { ...st, posts: [...st.posts, ...created] }, now);
    if (hasErrors(issues)) { post.status = 'draft'; post.problem = issues.find((i) => i.level === 'error').msg; warnings.push(`${s.key} ${s.time}: queda en borrador (${post.problem})`); }
    created.push(post);
  }
  return { created, warnings };
}

// Publicador SIMULADO (solo demo, y solo mientras la pestaña está abierta). La publicación real la hace n8n.
export function demoTick(now = Date.now()) {
  if (state.settings.paused) return [];
  const done = [];
  for (const p of state.posts) {
    if (p.status !== 'scheduled' || !p.scheduledAt || p.scheduledAt > now) continue;
    p.results = p.targets.map((t) => { const prev = (p.results || []).find((r) => (r.ok || r.pending) && r.accountId === t.accountId && r.format === t.format); if (prev) return prev; const acc = state.accounts.find((a) => a.id === t.accountId); if (t.format === 'wa_status') return { accountId: t.accountId, format: t.format, ok: false, pending: true, manual: true, at: now }; const ok = !!acc && acc.status === 'connected'; return { accountId: t.accountId, format: t.format, ok, at: now, simulated: true, ref: ok ? `sim_${uid('x')}` : null, error: ok ? null : 'Cuenta no conectada' }; });
    const bad = p.results.filter((r) => !r.ok && !r.pending).length, good = p.results.filter((r) => r.ok).length, pend = p.results.filter((r) => r.pending).length;
    p.status = bad ? (good || pend ? 'partial' : 'failed') : pend ? 'manual' : 'published';
    const a = state.assets.find((x) => x.id === p.assetId); if (a) { a.usedCount = (a.usedCount || 0) + 1; a.lastUsedAt = now; }
    done.push(p);
  }
  return done;
}
