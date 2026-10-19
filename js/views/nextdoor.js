// Nextdoor: cola diaria con todo lo que pide el compositor de Nextdoor (texto, foto, ubicación, encuesta/evento).
// Nextdoor no ofrece API pública para publicar: el panel lo deja listo y tú publicas en ~30 s.
import { h, icon, pill, mount, copyText, callout, empty, toast, openModal, field, select } from '../ui.js';
import { state, setSettings, upsert, uid } from '../store.js';
import * as api from '../api.js';
import { drawCard, cardBlob, parsePost, CARD_STYLES, loadImg, drawSquare } from '../card.js?v=8';
import { lintCopy, CATEGORIES } from '../rules.js';
import { dayKey, fmtDay } from '../tz.js';
import { PROFILES, KINDS, BANK, REPLIES, fillArea, wordCount } from '../nextdoor.js?v=5';
import { thumb } from './shared.js';

let prof = 'mooveto', selId = null; const draft = {};
const nd = () => state.settings.nextdoor || {};
const itemsCfg = () => nd().items || {};
const areasOf = (p) => (nd().areas?.[p]?.length ? nd().areas[p] : PROFILES[p].areas);
const areaSel = () => (nd().area?.[prof] && areasOf(prof).includes(nd().area[prof]) ? nd().area[prof] : areasOf(prof)[0]);
const merged = (it) => ({ ...it, ...(itemsCfg()[it.id] || {}) });
const all = (p) => [...BANK.filter((b) => b.profile === p), ...((nd().custom || []).filter((c) => c.profile === p))].map(merged);
const kindOf = (it) => it.extra?.type || 'post';
const patch = (id, o) => setSettings({ nextdoor: { items: { [id]: o } } });
const today = () => dayKey(Date.now(), state.settings.tz);
const textOf = (it) => draft[it.id] ?? fillArea(it.textEdited ?? it.text, areaSel());

function pickToday(list) {
  const todo = list.filter((i) => i.status !== 'done');
  return todo.find((i) => i.plannedFor === today()) || todo.filter((i) => i.plannedFor).sort((a, b) => a.plannedFor.localeCompare(b.plannedFor))[0] || todo[0] || null;
}
function planWeek() {
  const todo = all(prof).filter((i) => i.status !== 'done'); const o = {};
  todo.slice(0, 7).forEach((i, n) => { const d = new Date(); d.setDate(d.getDate() + n); o[i.id] = { plannedFor: dayKey(d.getTime(), state.settings.tz) }; });
  setSettings({ nextdoor: { items: o } }); toast('Próximos 7 días planificados', 'ok'); repaint();
}
const download = async (a) => { try { const b = await (await fetch(a.url)).blob(); const l = h('a', { href: URL.createObjectURL(b), download: `${a.name}.${a.kind === 'video' ? 'mp4' : 'jpg'}` }); document.body.append(l); l.click(); l.remove(); } catch { toast('No se pudo descargar', 'err'); } };
let repaint = () => {};

export default function view(params) {
  if (params && params[0] === 'keen') prof = 'keen';
  const v = { title: 'Nextdoor', live: false, render: () => render(v), actions: [] };
  repaint = () => v.repaint && v.repaint(); return v;
}

function render() {
  const P = PROFILES[prof]; const list = all(prof); const cur = list.find((i) => i.id === selId) || pickToday(list); if (cur) selId = cur.id;
  const done = list.filter((i) => i.status === 'done').length;
  const tabs = h('div', { class: 'tabs', role: 'tablist' }, Object.entries(PROFILES).map(([k, p]) => h('button', { role: 'tab', 'aria-selected': String(k === prof), onclick: () => { prof = k; selId = null; repaint(); } }, p.label)));
  const head = h('div', { class: 'row wrap', style: { marginBottom: '14px' } },
    callout('info', h('b', null, `Publica desde la página "${P.page}" en Nextdoor. `), 'Nextdoor no deja publicar de forma automática: aquí tienes cada pieza lista para copiar. Un clic por paso y "Ya lo publiqué".'),
  );
  const bar = h('div', { class: 'row wrap', style: { margin: '14px 0' } }, pill(`${done}/${list.length} publicadas`, 'ok'), h('span', { class: 'grow' }), areaChips(), h('button', { class: 'btn sm', onclick: planWeek }, icon('calendar', 14), 'Planificar 7 días'));
  const queue = h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Cola')), list.length ? list.map((i) => queueRow(i, cur)) : empty('list', 'Sin publicaciones', ''));
  return h('div', null, tabs, head, bar, h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(260px, 340px) 1fr', alignItems: 'start' } }, queue, cur ? detail(cur) : empty('check', 'Todo publicado', 'No quedan publicaciones en esta cola.')), repliesCard());
}

function queueRow(i, cur) {
  const isToday = i.plannedFor === today() && i.status !== 'done';
  return h('button', { class: 'list-item', style: { width: '100%', textAlign: 'left', background: cur && cur.id === i.id ? 'var(--surface-2)' : 'transparent', border: 0, cursor: 'pointer' }, onclick: () => { selId = i.id; repaint(); } },
    h('div', { class: 'grow', style: { minWidth: 0 } }, h('b', null, i.title), h('div', { class: 'small muted' }, i.plannedFor ? fmtDay(new Date(i.plannedFor + 'T12:00:00').getTime(), state.settings.tz) : 'Sin fecha')),
    isToday ? pill('Hoy', 'brand') : null, kindOf(i) !== 'post' ? pill(KINDS[kindOf(i)], 'info') : null, i.status === 'done' ? pill('Publicada', 'ok') : null);
}

function areaChips() {
  const list = areasOf(prof);
  return h('div', { class: 'row wrap', style: { gap: '6px' } }, h('span', { class: 'small muted' }, 'Barrio:'),
    list.map((a) => h('button', { class: `btn sm ${a === areaSel() ? 'primary' : ''}`, onclick: () => { setSettings({ nextdoor: { area: { [prof]: a } } }); Object.keys(draft).forEach((k) => delete draft[k]); repaint(); } }, a)),
    h('button', { class: 'btn sm ghost', title: 'Añadir barrio', onclick: () => { const n = (prompt('Nombre del barrio o zona (ej. Mill Hill)') || '').trim(); if (!n) return; setSettings({ nextdoor: { areas: { [prof]: [...new Set([...areasOf(prof), n])] }, area: { [prof]: n } } }); Object.keys(draft).forEach((k) => delete draft[k]); repaint(); } }, icon('plus', 14)),
    areasOf(prof).length > 1 ? h('button', { class: 'btn sm ghost', title: 'Quitar el barrio seleccionado', onclick: () => { setSettings({ nextdoor: { areas: { [prof]: areasOf(prof).filter((a) => a !== areaSel()) } } }); Object.keys(draft).forEach((k) => delete draft[k]); repaint(); } }, icon('trash', 14)) : null);
}

const step = (n, title, ...body) => h('div', { class: 'card card-pad stack sm' }, h('div', { class: 'row' }, pill(String(n), 'brand'), h('b', null, title)), ...body);

function detail(it) {
  const text = textOf(it); const area = areaSel(); const assets = state.assets.filter((a) => !a.archived && a.kind === 'image'); const asset = state.assets.find((a) => a.id === it.assetId);
  const lintBox = h('div', { class: 'small' }); const count = h('span', { class: 'small muted' });
  const paint = (t) => { count.textContent = `${wordCount(t)} palabras · ${t.length} caracteres`; mount(lintBox, [...lintCopy(t, 'nd_post', state.settings), ...(wordCount(t) > 150 ? [{ msg: 'Largo para Nextdoor: lo corto se lee más (ideal 40 a 120 palabras).' }] : [])].map((x) => h('div', { style: { color: 'var(--warn)' } }, x.msg))); };
  const ta = h('textarea', { rows: 10, 'aria-label': 'Texto de la publicación', value: text, oninput: (e) => { draft[it.id] = e.target.value; paint(e.target.value); }, onchange: (e) => { patch(it.id, { textEdited: e.target.value }); } });
  paint(text);
  const steps = [
    step(1, 'Texto', ta, h('div', { class: 'row wrap' }, count, h('span', { class: 'grow' }), it.textEdited != null ? h('button', { class: 'btn sm ghost', onclick: () => { delete draft[it.id]; patch(it.id, { textEdited: null }); repaint(); } }, 'Restaurar original') : null, h('button', { class: 'btn sm primary', onclick: () => copyText(ta.value) }, icon('copy', 14), 'Copiar texto')), lintBox),
    step(2, 'Foto', h('div', { class: 'small muted' }, `Idea: ${it.image}`), h('div', { class: 'small muted' }, 'Nextdoor recorta la foto a cuadrado (1:1) en el feed. Usa "Ajustar a Nextdoor" para que no se corte el texto de tus diseños verticales.'),
      h('div', { class: 'row wrap' }, h('select', { 'aria-label': 'Foto de la biblioteca', onchange: (e) => { patch(it.id, { assetId: e.target.value || null }); repaint(); } }, h('option', { value: '' }, 'Elegir de Diseños…'), assets.map((a) => h('option', { value: a.id, selected: a.id === it.assetId }, a.name))), h('a', { class: 'btn sm', href: '#/library' }, icon('upload', 14), 'Subir foto'), h('button', { class: 'btn sm primary', onclick: () => cardModal(it, text) }, icon('sparkle', 14), 'Generar tarjeta'), asset ? h('button', { class: 'btn sm', onclick: () => squareModal(it, asset) }, icon('image', 14), 'Ajustar a Nextdoor (1:1)') : null, asset ? h('button', { class: 'btn sm', onclick: () => download(asset) }, icon('download', 14), 'Descargar') : null),
      asset ? h('div', { style: { maxWidth: '220px', borderRadius: '10px', overflow: 'hidden' } }, thumb(asset, '')) : null),
    step(3, 'Ubicación', h('div', { class: 'small muted' }, 'Pulsa el pin del compositor y escribe el barrio para llegar a los vecinos de esa zona.'), h('div', { class: 'row' }, pill(area, 'brand'), h('button', { class: 'btn sm', onclick: () => copyText(area) }, icon('copy', 14), 'Copiar barrio'))),
  ];
  if (it.extra && it.extra.type === 'poll') steps.push(step(4, 'Encuesta ("Poll your neighbours")', ...[['Pregunta', it.extra.q], ...it.extra.options.map((o, n) => [`Opción ${n + 1}`, o])].map(([l, v]) => h('div', { class: 'row' }, h('span', { class: 'small muted', style: { minWidth: '70px' } }, l), h('span', { class: 'grow' }, v), h('button', { class: 'btn sm ghost', onclick: () => copyText(v) }, icon('copy', 14))))));
  if (it.extra && it.extra.type === 'event') steps.push(step(4, 'Evento ("Create an event")', ...[['Título', it.extra.title], ['Descripción', it.extra.desc]].map(([l, v]) => h('div', { class: 'row' }, h('span', { class: 'small muted', style: { minWidth: '70px' } }, l), h('span', { class: 'grow' }, v), h('button', { class: 'btn sm ghost', onclick: () => copyText(v) }, icon('copy', 14)))), callout('warn', it.extra.note)));
  const fin = h('div', { class: 'row wrap' }, h('a', { class: 'btn', href: 'https://nextdoor.co.uk/', target: '_blank', rel: 'noopener' }, icon('send', 14), 'Abrir Nextdoor'), h('span', { class: 'grow' }),
    it.status === 'done' ? h('button', { class: 'btn', onclick: () => { patch(it.id, { status: 'todo', doneAt: null }); repaint(); } }, 'Marcar como pendiente') : h('button', { class: 'btn primary', onclick: () => { patch(it.id, { status: 'done', doneAt: Date.now() }); selId = null; toast('Marcada como publicada', 'ok'); repaint(); } }, icon('check', 14), 'Ya lo publiqué'));
  return h('div', { class: 'stack' }, h('div', { class: 'row wrap' }, h('h2', { style: { margin: 0 } }, it.title), pill(CATEGORIES[it.cat] || it.cat), pill(KINDS[kindOf(it)], 'info')), ...steps, fin);
}

// Genera una tarjeta gráfica de marca a partir del texto del post y la guarda en la biblioteca.
function cardModal(it, text) {
  const P = PROFILES[prof]; const auto = parsePost(text); const st = { headline: auto.headline, bullets: auto.bullets.join('\n'), style: 'solid' };
  const canvas = h('canvas', { style: { width: '100%', maxWidth: '380px', borderRadius: '12px', border: '1px solid var(--line)' } });
  const paint = () => drawCard(canvas, { headline: st.headline, bullets: st.bullets.split('\n').map((s) => s.trim()).filter(Boolean), footer: P.sig, brand: P.label, color: P.color, style: st.style });
  const head = h('input', { type: 'text', value: st.headline, oninput: (e) => { st.headline = e.target.value; paint(); } });
  const pts = h('textarea', { rows: 6, value: st.bullets, oninput: (e) => { st.bullets = e.target.value; paint(); } });
  const sty = select(Object.entries(CARD_STYLES).map(([value, label]) => ({ value, label })), st.style, (v) => { st.style = v; paint(); });
  paint();
  openModal({ title: 'Generar tarjeta gráfica', size: 'lg', body: h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(220px, 380px) 1fr', gap: '18px' } }, canvas,
    h('div', { class: 'stack' }, callout('info', 'Es una tarjeta gráfica con tu texto, no una foto. Úsala para consejos, checklists y encuestas. Para trabajos reales, sube fotos reales.'), field('Titular', head), field('Puntos (uno por línea)', pts), field('Estilo', sty))),
    actions: [{ label: 'Cancelar' }, { label: 'Usar esta imagen', kind: 'primary', onClick: async () => {
      try {
        const blob = await cardBlob(canvas); const id = uid('ast'); const a = { id, name: `${P.label} tarjeta ${it.title}`, kind: 'image', mime: 'image/jpeg', size: blob.size, w: 1080, h: 1080, collection: 'Nextdoor', category: it.cat || '', tags: ['nextdoor', 'tarjeta'], copyMode: 'light', caption: '', hookId: null, alt: st.headline, createdAt: Date.now(), usedCount: 0 };
        const remote = await api.putAsset(a, blob); a.url = remote || (await api.assetUrl(a)); upsert('assets', a);
        setSettings({ nextdoor: { items: { [it.id]: { assetId: id } } } }); toast('Tarjeta guardada en Diseños y asignada', 'ok'); repaint();
      } catch (e) { toast(`No se pudo guardar la tarjeta: ${e.message}`, 'err'); return false; }
    } }] });
}

// Adapta una imagen existente (p. ej. un diseño vertical 9:16) a cuadrado 1:1 y la guarda como nueva.
async function squareModal(it, asset) {
  let img; try { img = await loadImg(asset.url); } catch (e) { return toast(e.message, 'err'); }
  const st = { mode: 'fit', pos: 0.5 };
  const canvas = h('canvas', { style: { width: '100%', maxWidth: '380px', borderRadius: '12px', border: '1px solid var(--line)' } });
  const paint = () => drawSquare(canvas, img, st);
  const mode = select([{ value: 'fit', label: 'Entera, con fondo desenfocado (no corta nada)' }, { value: 'crop', label: 'Recortar a cuadrado (la imagen se ve más grande)' }], st.mode, (v) => { st.mode = v; pos.disabled = v === 'fit'; paint(); });
  const pos = h('input', { type: 'range', min: 0, max: 1, step: 0.01, value: 0.5, disabled: true, 'aria-label': 'Posición del recorte', oninput: (e) => { st.pos = +e.target.value; paint(); } });
  paint();
  openModal({ title: 'Ajustar a Nextdoor (1:1)', size: 'lg', body: h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(220px, 380px) 1fr', gap: '18px' } }, canvas,
    h('div', { class: 'stack' }, callout('info', `Original: ${img.naturalWidth}x${img.naturalHeight}. Nextdoor muestra el feed en cuadrado, así que se pierde lo de arriba y abajo en imágenes verticales.`), field('Modo', mode), field('Mover el recorte (solo en modo recortar)', pos))),
    actions: [{ label: 'Cancelar' }, { label: 'Usar esta imagen', kind: 'primary', onClick: async () => {
      try {
        const blob = await cardBlob(canvas); const id = uid('ast'); const a = { ...asset, id, name: `${asset.name} 1x1`, mime: 'image/jpeg', size: blob.size, w: 1080, h: 1080, tags: [...(asset.tags || []), 'nextdoor', '1x1'], createdAt: Date.now(), usedCount: 0, url: undefined, remoteUrl: undefined };
        const remote = await api.putAsset(a, blob); a.url = remote || (await api.assetUrl(a)); upsert('assets', a);
        setSettings({ nextdoor: { items: { [it.id]: { assetId: id } } } }); toast('Imagen 1:1 guardada y asignada', 'ok'); repaint();
      } catch (e) { toast(`No se pudo guardar: ${e.message}`, 'err'); return false; }
    } }] });
}

function repliesCard() {
  const rs = REPLIES[prof];
  return h('div', { class: 'card', style: { marginTop: '16px' } }, h('div', { class: 'card-head' }, h('h2', null, 'Respuestas rápidas a vecinos'), h('span', { class: 'small muted' }, 'Responder rápido a los comentarios mejora la confianza. Sin precios; invita a un mensaje privado.')),
    rs.map((r) => h('div', { class: 'list-item' }, h('div', { class: 'grow' }, h('b', null, r.label), h('div', { class: 'small muted', style: { whiteSpace: 'pre-wrap' } }, r.text)), h('button', { class: 'btn sm', onclick: () => copyText(r.text.replace(' {name}', '')) }, icon('copy', 14), 'Copiar'))));
}
