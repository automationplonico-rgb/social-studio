// Piezas compartidas entre vistas.
import { h, icon, platBadge, pill, openModal, toast, confirmDialog, callout, copyText } from '../ui.js';
import { state, upsert, remove } from '../store.js';
import { FORMATS, STATUS, assetOf, accountOf, captionFor } from '../rules.js';
import { fmtDateTime } from '../tz.js';

export const statusPill = (s) => pill(STATUS[s]?.label || s, STATUS[s]?.kind || '');
export const targetBadges = (post) => h('span', { class: 'row', style: { gap: '4px' } }, post.targets.map((t) => { const f = FORMATS[t.format]; return h('span', { title: `${accountOf(state, t.accountId)?.label || '?'} · ${f?.label}` }, platBadge(f?.platform || 'whatsapp')); }));
export function thumb(asset, cls = '') {
  if (!asset) return h('div', { class: cls, style: { background: 'var(--surface-2)' } });
  if (!asset.url) return h('div', { class: cls, style: { background: 'var(--surface-2)' } });
  const fit = { maxWidth: '100%', display: 'block' };   // nunca más ancho que su contenedor
  return asset.kind === 'video' ? h('video', { src: asset.url, muted: true, preload: 'metadata', class: cls, playsinline: true, style: fit }) : h('img', { src: asset.url, alt: asset.alt || asset.name, class: cls, loading: 'lazy', style: fit });
}
export const when = (post) => (post.scheduledAt ? fmtDateTime(post.scheduledAt, state.settings.tz) : 'Sin fecha');

export function retryFailed(post) {
  post.results = (post.results || []).filter((r) => r.ok || r.pending); post.status = 'scheduled'; post.scheduledAt = Date.now() + 90000; upsert('posts', post); toast('Reintento programado en 90 s', 'ok');
}
export function postDetail(post, { onEdit } = {}) {
  const a = assetOf(state, post.assetId);
  const rows = post.targets.map((t) => { const r = (post.results || []).find((x) => x.accountId === t.accountId && x.format === t.format); const acc = accountOf(state, t.accountId);
    return h('div', { class: 'list-item', style: { padding: '8px 0' } }, platBadge(FORMATS[t.format]?.platform), h('div', { class: 'grow' }, h('b', null, acc?.label || 'Cuenta eliminada'), h('div', { class: 'small muted' }, FORMATS[t.format]?.label)),
      r && r.pending ? h('div', { class: 'row' }, pill('Pendiente a mano', 'warn'), h('button', { class: 'btn sm primary', onclick: () => manualModal(post, t) }, 'Hacer ahora')) : r ? (r.ok ? pill(r.manual ? 'Hecho a mano' : r.simulated ? 'OK (simulado)' : 'Publicado', 'ok') : pill('Error', 'err')) : pill(post.status === 'scheduled' ? 'En cola' : '—')); });
  const errs = (post.results || []).filter((r) => !r.ok && r.error);
  const close = openModal({ title: post.title || 'Publicación', size: 'lg', body: h('div', { class: 'grid cols-2', style: { gridTemplateColumns: '180px 1fr' } },
    h('div', { style: { minWidth: 0, width: '180px' } }, thumb(a, '')),
    h('div', { class: 'stack' }, h('div', { class: 'row' }, statusPill(post.status), h('span', { class: 'muted' }, when(post)), post.ruleId ? pill('Automática', 'info') : null),
      post.problem ? callout('warn', h('b', null, 'Revisar: '), post.problem) : null, errs.map((e) => callout('err', h('b', null, 'Error: '), e.error)), h('div', null, rows),
      h('div', null, h('div', { class: 'label' }, 'Texto'), h('p', { class: 'small', style: { whiteSpace: 'pre-wrap' } }, captionFor(post, post.targets[0]?.format) || '(sin texto)')))),
    actions: [
      { label: 'Eliminar', kind: 'danger', close: false, onClick: async () => { if (!(await confirmDialog(post.ruleId ? 'Esta publicación viene de una automatización. Se marcará como cancelada para que no se vuelva a generar.' : '¿Eliminar esta publicación?', 'Eliminar', true))) return false; post.ruleId ? upsert('posts', { ...post, status: 'canceled' }) : remove('posts', post.id); close(); } },
      ...(post.status === 'failed' || post.status === 'partial' ? [{ label: 'Reintentar fallidos', close: false, onClick: () => { retryFailed(post); close(); } }] : []),
      ...(post.status !== 'published' ? [{ label: 'Editar', kind: 'primary', close: false, onClick: () => { close(); onEdit ? onEdit(post) : (location.hash = `#/studio/${post.id}`); } }] : [{ label: 'Duplicar', close: false, onClick: () => { close(); location.hash = `#/studio/new?from=${post.id}`; } }, { label: 'Cerrar', kind: 'primary' }]),
    ] });
}

// ---- estados de WhatsApp: tarea manual asistida (no existe API oficial para publicarlos) ----
export function deriveStatus(post) {
  const rs = post.targets.map((t) => (post.results || []).find((r) => r.accountId === t.accountId && r.format === t.format));
  const bad = rs.filter((r) => r && !r.ok && !r.pending).length, ok = rs.filter((r) => r && r.ok).length, pend = rs.filter((r) => r && r.pending).length;
  return bad ? (ok || pend ? 'partial' : 'failed') : pend ? 'manual' : 'published';
}
export const pendingManual = () => state.posts.flatMap((p) => (p.results || []).filter((r) => r.pending).map((r) => ({ post: p, target: r })));
export function markManualDone(post, t) {
  const p = { ...post, results: post.results.map((r) => (r.accountId === t.accountId && r.format === t.format ? { ...r, ok: true, pending: false, doneAt: Date.now() } : r)) }; p.status = deriveStatus(p); upsert('posts', p); return p;
}
export function manualModal(post, t) {
  const a = assetOf(state, post.assetId); const acc = accountOf(state, t.accountId); const cap = captionFor(post, t.format);
  const dl = async () => { try { const b = await (await fetch(a.url)).blob(); const u = URL.createObjectURL(b); const l = h('a', { href: u, download: `${a.name}.${a.kind === 'video' ? 'mp4' : 'jpg'}` }); document.body.append(l); l.click(); l.remove(); } catch { toast('No se pudo descargar', 'err'); } };
  const share = async () => { try { const b = await (await fetch(a.url)).blob(); const f = new File([b], `${a.name}.${a.kind === 'video' ? 'mp4' : 'jpg'}`, { type: b.type }); if (navigator.canShare && navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: cap }); else toast('Este navegador no puede compartir archivos: usa Descargar', 'err'); } catch (e) { if (e.name !== 'AbortError') toast('No se pudo compartir', 'err'); } };
  const close = openModal({ title: `Publicar estado en ${acc ? acc.label : 'WhatsApp'}`, body: h('div', { class: 'grid', style: { gridTemplateColumns: '150px 1fr', gap: '16px' } }, h('div', { style: { borderRadius: '10px', overflow: 'hidden' } }, thumb(a, '')),
    h('div', { class: 'stack' }, h('ol', { class: 'small', style: { margin: 0, paddingLeft: '18px', lineHeight: 1.8 } }, h('li', null, 'Desde el móvil: pulsa "Compartir" y elige Estado de WhatsApp (o descarga el diseño).'), h('li', null, 'Pega el texto como pie del estado.'), h('li', null, 'Vuelve y pulsa "Ya lo publiqué".')),
      cap ? h('div', { class: 'note small', style: { background: 'var(--surface-2)', padding: '10px', borderRadius: '8px', whiteSpace: 'pre-wrap' } }, cap) : h('div', { class: 'small muted' }, '(sin texto)'),
      h('div', { class: 'row wrap' }, cap ? h('button', { class: 'btn sm', onclick: () => copyText(cap) }, icon('copy', 14), 'Copiar texto') : null, h('button', { class: 'btn sm', onclick: dl }, icon('download', 14), 'Descargar'), navigator.canShare ? h('button', { class: 'btn sm', onclick: share }, icon('send', 14), 'Compartir…') : null))),
    actions: [{ label: 'Cerrar' }, { label: 'Ya lo publiqué', kind: 'primary', onClick: () => { markManualDone(post, t); toast('Marcado como publicado', 'ok'); } }] });
}
