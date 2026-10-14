// Especificaciones por formato + validación de publicaciones + linter de copy (reglas de marca de Mooveto).
// OJO: los límites de Meta/WhatsApp cambian. Revísalos cada trimestre contra la documentación oficial (ver README).
export const PLATFORMS = {
  whatsapp: { label: 'WhatsApp', formats: ['wa_status'] },
  instagram: { label: 'Instagram', formats: ['ig_story', 'ig_feed', 'ig_reel'] },
  facebook: { label: 'Facebook', formats: ['fb_post', 'fb_story'] },
};
export const FORMATS = {
  wa_status: { platform: 'whatsapp', label: 'Estado de WhatsApp (manual)', short: 'Estado', kinds: ['image', 'video'], vertical: true, maxSec: 30, maxMB: 16, caption: 700, captionShows: true, engine: 'manual' },
  ig_story: { platform: 'instagram', label: 'Historia de Instagram', short: 'Historia', kinds: ['image', 'video'], vertical: true, maxSec: 60, maxMB: 100, caption: 0, captionShows: false },
  ig_feed: { platform: 'instagram', label: 'Publicación de Instagram', short: 'Feed', kinds: ['image', 'video'], ratio: [0.8, 1.91], maxSec: 60, maxMB: 100, caption: 2200, captionShows: true, hashtags: 30 },
  ig_reel: { platform: 'instagram', label: 'Reel de Instagram', short: 'Reel', kinds: ['video'], vertical: true, minSec: 3, maxSec: 90, maxMB: 300, caption: 2200, captionShows: true, hashtags: 30 },
  fb_post: { platform: 'facebook', label: 'Publicación de Facebook', short: 'Publicación', kinds: ['image', 'video'], maxSec: 240 * 60, maxMB: 1000, caption: 63000, captionShows: true },
  fb_story: { platform: 'facebook', label: 'Historia de Facebook', short: 'Historia', kinds: ['image', 'video'], vertical: true, maxSec: 60, maxMB: 100, imageMaxMB: 10, caption: 0, captionShows: false },
};
export const STATUS = {
  draft: { label: 'Borrador', kind: '' }, scheduled: { label: 'Programada', kind: 'brand' }, publishing: { label: 'Publicando', kind: 'info' },
  published: { label: 'Publicada', kind: 'ok' }, manual: { label: 'Falta publicar a mano', kind: 'warn' }, partial: { label: 'Parcial', kind: 'warn' }, failed: { label: 'Falló', kind: 'err' }, canceled: { label: 'Cancelada', kind: '' },
};
export const CATEGORIES = { proof: 'Prueba social', education: 'Consejos', offer: 'Oferta / servicio', behind: 'Detrás de cámaras' };
export const COPY_MODES = { none: 'Sin neuromarketing', light: 'Suave (solo gancho)', full: 'Completo (gancho + prueba + CTA)' };

export const formatLabel = (f) => FORMATS[f]?.label || f;
export const accountOf = (state, id) => state.accounts.find((a) => a.id === id);
export const assetOf = (state, id) => state.assets.find((a) => a.id === id);

// ---------- validación ----------
// Devuelve [{level:'error'|'warn'|'info', target?:'accountId|format', msg}]. 'error' impide programar.
export function validatePost(post, state, now = Date.now()) {
  const out = []; const S = state.settings;
  const add = (level, msg, target) => out.push({ level, msg, target });
  const asset = assetOf(state, post.assetId);
  if (!asset) add('error', 'Elige un diseño de la biblioteca.');
  if (!post.targets.length) add('error', 'Elige al menos un destino.');
  if (post.status === 'scheduled' || post.status === 'draft') {
    if (!post.scheduledAt) add('error', 'Falta la fecha y hora de publicación.');
    else if (post.status === 'scheduled' && post.scheduledAt < now - 60000) add('error', 'La hora programada ya pasó.');
  }
  for (const t of post.targets) {
    const f = FORMATS[t.format]; const acc = accountOf(state, t.accountId); const key = `${t.accountId}|${t.format}`;
    if (!f) { add('error', `Formato desconocido: ${t.format}`, key); continue; }
    const who = `${acc ? acc.label : 'Cuenta eliminada'} · ${f.short}`;
    if (!acc) { add('error', `${who}: la cuenta ya no existe.`, key); continue; }
    if (acc.status !== 'connected') add('error', `${who}: la cuenta está ${acc.status === 'expired' ? 'caducada (reconecta)' : 'desconectada'}.`, key);
    if (acc.expiresAt && acc.expiresAt - now < 7 * 864e5 && acc.status === 'connected') add('warn', `${who}: el acceso caduca en ${Math.max(0, Math.round((acc.expiresAt - now) / 864e5))} días.`, key);
    if (!asset) continue;
    if (!f.kinds.includes(asset.kind)) add('error', `${who}: no admite ${asset.kind === 'video' ? 'vídeo' : 'imagen'}.`, key);
    const r = asset.w && asset.h ? asset.w / asset.h : null;
    if (r) {
      if (f.vertical && Math.abs(r - 9 / 16) > 0.04) add('warn', `${who}: el diseño no es 9:16 (${asset.w}×${asset.h}); se verá con recorte o bandas.`, key);
      if (f.ratio && (r < f.ratio[0] - 0.01 || r > f.ratio[1] + 0.01)) add('error', `${who}: proporción ${r.toFixed(2)} fuera del rango permitido (4:5 a 1.91:1).`, key);
    }
    if (asset.kind === 'video') {
      if (asset.dur && asset.dur > f.maxSec) add('error', `${who}: vídeo de ${Math.round(asset.dur)} s; máximo ${f.maxSec} s.`, key);
      if (asset.dur && f.minSec && asset.dur < f.minSec) add('error', `${who}: vídeo demasiado corto (mín. ${f.minSec} s).`, key);
      if (asset.mime && !/mp4|quicktime/.test(asset.mime)) add('error', `${who}: usa MP4 (H.264) o MOV.`, key);
    }
    const lim = asset.kind === 'image' && f.imageMaxMB ? f.imageMaxMB : f.maxMB; if (asset.size && asset.size / 1048576 > lim) add('error', `${who}: ${(asset.size / 1048576).toFixed(1)} MB supera el límite de ${lim} MB.`, key);
    const cap = captionFor(post, t.format);
    if (f.caption && cap.length > f.caption) add('error', `${who}: el texto supera ${f.caption} caracteres.`, key);
    if (!f.captionShows && cap.trim()) add('info', `${who}: el texto NO se muestra en historias (no hay API para ello). El mensaje debe ir dentro del diseño.`, key);
    if (f.engine === 'manual') add('info', `${who}: WhatsApp no permite publicar estados por API. Te avisaremos a la hora indicada con el diseño y el texto listos; lo publicas tú en 10 segundos.`, key);
  }
  // límites de seguridad por cuenta y día (cuenta lo ya programado)
  const g = S.guard; const others = state.posts.filter((p) => p.id !== post.id && ['scheduled', 'published', 'publishing'].includes(p.status));
  if (post.scheduledAt) for (const t of post.targets) {
    const acc = accountOf(state, t.accountId); if (!acc) continue; const f = FORMATS[t.format];
    const same = others.filter((p) => p.targets.some((x) => x.accountId === t.accountId && FORMATS[x.format]?.platform === f.platform && x.format === t.format) && sameDay(p.scheduledAt, post.scheduledAt, S.tz));
    const cap = t.format === 'wa_status' ? g.waMaxPerDay : t.format === 'ig_story' ? g.igMaxStoriesPerDay : t.format === 'fb_post' ? g.fbMaxPostsPerDay : null;
    if (cap && same.length + 1 > cap) add('warn', `${acc.label} · ${f.short}: ya habría ${same.length + 1} ese día (límite configurado ${cap}).`, `${t.accountId}|${t.format}`);
    if (t.format === 'wa_status') { const near = same.find((p) => Math.abs(p.scheduledAt - post.scheduledAt) < g.waMinGapMin * 60000); if (near) add('warn', `${acc.label}: otro estado a menos de ${g.waMinGapMin} min. Espacia las publicaciones para parecer humano.`, `${t.accountId}|${t.format}`); }
  }
  for (const t of post.targets) { for (const i of lintCopy(captionFor(post, t.format), t.format, S)) if (i.level !== 'info') add(i.level, `${FORMATS[t.format]?.short || ''}: ${i.msg}`, `${t.accountId}|${t.format}`); }
  return dedupe(out);
}
const dedupe = (a) => { const s = new Set(); return a.filter((x) => { const k = x.level + x.msg; if (s.has(k)) return false; s.add(k); return true; }); };
import { dayKey } from './tz.js';
const sameDay = (a, b, tz) => a && b && dayKey(a, tz) === dayKey(b, tz);
export const captionFor = (post, format) => (post.copy?.overrides?.[format] ?? post.copy?.default ?? '');
export const hasErrors = (list) => list.some((x) => x.level === 'error');

// ---------- linter de copy ----------
// Reglas de marca (skill mooveto-post-writer): sin precios exactos, sin guiones largos, ≤3 hashtags, 40–120 palabras en feed.
const EM = /[—–]/;
const PRICE = /(£|€|\$)\s?\d|\d\s?(£|gbp|pounds|euros)\b/i;
const POLITICS = /\b(brexit|tory|tories|labour|reform uk|trump|immigration|immigrants?|election)\b/i;
export function lintCopy(text, format, settings) {
  const L = settings.lint || {}; const out = []; const f = FORMATS[format]; const t = text || '';
  if (!t.trim()) return out;
  if (L.noEmDash !== false && EM.test(t)) out.push({ level: 'warn', msg: 'Contiene guion largo (— o –). Usa coma o punto.', fix: (s) => s.replace(/\s*[—–]\s*/g, ', ') });
  if (L.noPrices !== false && PRICE.test(t)) out.push({ level: 'warn', msg: 'Incluye un precio exacto. La marca no publica precios; invita a pedir presupuesto.' });
  if (POLITICS.test(t)) out.push({ level: 'warn', msg: 'Menciona un tema político/sensible. La marca no lo trata.' });
  const tags = (t.match(/#[\p{L}\d_]+/gu) || []).length; const maxTags = L.maxHashtags ?? 3;
  if (f?.hashtags && tags > maxTags) out.push({ level: 'warn', msg: `${tags} hashtags; máximo ${maxTags} (el stuffing baja el alcance).` });
  const words = t.trim().split(/\s+/).length;
  if (format === 'ig_feed' || format === 'fb_post') { if (words > 140) out.push({ level: 'warn', msg: `${words} palabras; en feed funciona mejor 40–120.` }); if (words < 12) out.push({ level: 'info', msg: 'Muy corto para feed (ideal 40–120 palabras).' }); }
  if (format === 'wa_status' && t.length > 180) out.push({ level: 'info', msg: 'Los estados largos se leen poco: idealmente ≤ 140 caracteres.' });
  if ((t.match(/!/g) || []).length > 2) out.push({ level: 'warn', msg: 'Demasiadas exclamaciones; resta credibilidad.' });
  const letters = t.replace(/[^A-Za-z]/g, ''); if (letters.length > 20 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.4) out.push({ level: 'warn', msg: 'Demasiadas MAYÚSCULAS.' });
  if (/\b(buy now|limited time only|act now|last chance)\b/i.test(t)) out.push({ level: 'warn', msg: 'Urgencia genérica: solo úsala si es real (plazas/fechas concretas).' });
  return out;
}
export const applyFixes = (text, issues) => issues.reduce((s, i) => (i.fix ? i.fix(s) : s), text);

// ---------- compatibilidad de un diseño con cada formato (para la biblioteca) ----------
export function compat(asset) {
  const r = asset.w && asset.h ? asset.w / asset.h : null; const res = {};
  for (const [k, f] of Object.entries(FORMATS)) {
    let ok = f.kinds.includes(asset.kind);
    if (ok && r) { if (f.vertical && Math.abs(r - 9 / 16) > 0.04) ok = 'warn'; if (f.ratio && (r < f.ratio[0] - 0.01 || r > f.ratio[1] + 0.01)) ok = false; }
    if (ok && asset.kind === 'video' && asset.dur && (asset.dur > f.maxSec || (f.minSec && asset.dur < f.minSec))) ok = false;
    res[k] = ok;
  }
  return res;
}
