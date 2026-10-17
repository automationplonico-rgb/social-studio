import { h, icon, pill, empty, openModal, confirmDialog, toast, field, select, mount, debounce } from '../ui.js';
import { state, upsert, remove, uid, emit } from '../store.js';
import * as api from '../api.js';
import { CATEGORIES, COPY_MODES, FORMATS, compat } from '../rules.js';
import { HOOKS, FRAMEWORKS, fillHook } from '../marketing.js';
import { thumb } from './shared.js';

let filter = { q: '', collection: '', kind: '', category: '' }; const selected = new Set();
export default function view() {
  return { title: 'Diseños', actions: [h('button', { class: 'btn primary', onclick: () => pickFiles() }, icon('upload', 16), 'Subir diseños')], render };
}
function pickFiles() { const i = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,video/quicktime' }); i.onchange = () => addFiles([...i.files]); i.click(); }

// ---- ingesta: lee dimensiones/duración, convierte imágenes a JPEG (Instagram solo acepta JPEG) y limita el lado largo ----
async function readImage(file) {
  const bmp = await createImageBitmap(file); const max = 1920; const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * k), hh = Math.round(bmp.height * k); const c = document.createElement('canvas'); c.width = w; c.height = hh;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, hh); g.drawImage(bmp, 0, 0, w, hh);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92)); return { blob, w, h: hh };
}
function readVideo(file) { return new Promise((res, rej) => { const v = document.createElement('video'); v.preload = 'metadata'; v.onloadedmetadata = () => { res({ w: v.videoWidth, h: v.videoHeight, dur: v.duration }); URL.revokeObjectURL(v.src); }; v.onerror = () => rej(new Error('No se pudo leer el vídeo')); v.src = URL.createObjectURL(file); }); }
export async function addFiles(files) {
  let ok = 0;
  for (const f of files) {
    try {
      const id = uid('ast'); const isVid = f.type.startsWith('video/'); if (!isVid && !f.type.startsWith('image/')) { toast(`${f.name}: formato no admitido`, 'err'); continue; }
      let blob = f, meta;
      if (isVid) { meta = await readVideo(f); if (!/mp4|quicktime/.test(f.type)) toast(`${f.name}: no es MP4/MOV; las plataformas lo rechazarán. Conviértelo antes.`, 'err'); }
      else { const r = await readImage(f); blob = r.blob; meta = { w: r.w, h: r.h }; }
      const a = { id, name: f.name.replace(/\.[^.]+$/, ''), kind: isVid ? 'video' : 'image', mime: blob.type, size: blob.size, ...meta, collection: '', category: '', tags: [], copyMode: 'light', caption: '', hookId: null, alt: '', createdAt: Date.now(), usedCount: 0 };
      const remoteUrl = await api.putAsset(a, blob); if (remoteUrl) a.url = remoteUrl; else a.url = await api.assetUrl(a);
      upsert('assets', a); ok++;
    } catch (e) { toast(`${f.name}: ${e.message}`, 'err'); }
  }
  if (ok) toast(`${ok} diseño(s) añadidos. Asígnales colección y categoría para que las reglas puedan usarlos.`, 'ok');
}

function render() {
  const cols = [...new Set(state.assets.map((a) => a.collection).filter(Boolean))].sort();
  const list = state.assets.filter((a) => !a.archived && (!filter.q || (a.name + ' ' + a.tags.join(' ')).toLowerCase().includes(filter.q.toLowerCase())) && (!filter.collection || a.collection === filter.collection) && (!filter.kind || a.kind === filter.kind) && (!filter.category || a.category === filter.category));
  const untagged = state.assets.filter((a) => !a.category || !a.collection).length;
  const grid = h('div', { class: 'assets' }, list.map((a) => card(a)));
  const dz = h('div', { class: 'drop', tabindex: '0', role: 'button', 'aria-label': 'Subir diseños', onclick: pickFiles, onkeydown: (e) => { if (e.key === 'Enter') pickFiles(); },
    ondragover: (e) => { e.preventDefault(); dz.classList.add('over'); }, ondragleave: () => dz.classList.remove('over'), ondrop: (e) => { e.preventDefault(); dz.classList.remove('over'); addFiles([...e.dataTransfer.files]); } },
    icon('upload', 24), h('div', { class: 'bold' }, 'Arrastra aquí imágenes o vídeos'), h('div', { class: 'small' }, 'Las imágenes se convierten a JPEG (requisito de Instagram). Vídeos: MP4 H.264 o MOV.'));
  const search = h('input', { type: 'search', placeholder: 'Buscar por nombre o etiqueta', value: filter.q, 'aria-label': 'Buscar', oninput: debounce((e) => { filter.q = e.target.value; repaint(); }, 200), style: { maxWidth: '260px' } });
  const bar = selected.size ? h('div', { class: 'card card-pad row wrap' }, h('b', null, `${selected.size} seleccionados`), h('span', { class: 'grow' }),
    h('button', { class: 'btn sm', onclick: () => bulk() }, 'Asignar colección / categoría'), h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmDialog(`¿Eliminar ${selected.size} diseños? Las publicaciones ya programadas que los usan quedarán sin imagen.`, 'Eliminar', true)) { [...selected].forEach((id) => remove('assets', id)); selected.clear(); } } }, 'Eliminar'), h('button', { class: 'btn sm ghost', onclick: () => { selected.clear(); repaint(); } }, 'Limpiar'))
    : h('div', { class: 'row wrap' }, search, select([{ value: '', label: 'Todas las colecciones' }, ...cols.map((c) => ({ value: c, label: c }))], filter.collection, (v) => { filter.collection = v; repaint(); }), select([{ value: '', label: 'Todas las categorías' }, ...Object.entries(CATEGORIES).map(([v, label]) => ({ value: v, label }))], filter.category, (v) => { filter.category = v; repaint(); }), select([{ value: '', label: 'Imagen y vídeo' }, { value: 'image', label: 'Imágenes' }, { value: 'video', label: 'Vídeos' }], filter.kind, (v) => { filter.kind = v; repaint(); }), h('span', { class: 'grow' }), untagged ? pill(`${untagged} sin clasificar`, 'warn') : null);
  const root = h('div', { class: 'stack lg' }, !state.assets.length ? empty('image', 'Aún no hay diseños', 'Sube tus diseños: cada uno guarda su propio modo de copy (con o sin neuromarketing) y su gancho.', h('button', { class: 'btn primary', onclick: pickFiles }, 'Subir diseños')) : null, dz, bar, list.length ? grid : state.assets.length ? empty('image', 'Nada con esos filtros', 'Prueba a quitar algún filtro.') : null);
  function repaint() { mount(root.parentNode || root, render()); }
  return root;
}
function card(a) {
  const c = compat(a); const verticalOk = c.wa_status === true && c.ig_story === true;
  const el = h('div', { class: `asset${selected.has(a.id) ? ' sel' : ''}`, tabindex: '0', role: 'button', 'aria-label': `Editar ${a.name}`, onclick: (e) => { if (e.target.closest('.tick')) return; edit(a); }, onkeydown: (e) => { if (e.key === 'Enter') edit(a); } },
    h('label', { class: 'tick', onclick: (e) => e.stopPropagation() }, h('input', { type: 'checkbox', checked: selected.has(a.id), 'aria-label': `Seleccionar ${a.name}`, onchange: (e) => { e.target.checked ? selected.add(a.id) : selected.delete(a.id); el.classList.toggle('sel', e.target.checked); emit(); } })),
    h('div', { class: 'thumb' }, thumb(a, '')), a.kind === 'video' ? h('span', { class: 'badge pill info' }, icon('film', 12), `${Math.round(a.dur || 0)} s`) : null,
    h('div', { class: 'meta' }, h('b', null, a.name), h('div', { class: 'row small muted', style: { gap: '6px', marginTop: '3px', flexWrap: 'wrap' } }, a.category ? pill(CATEGORIES[a.category]) : pill('sin categoría', 'warn'), verticalOk ? pill('9:16', 'ok') : c.ig_feed === true ? pill('feed', 'ok') : null, a.copyMode === 'none' ? pill('sin copy') : null, a.driveId ? pill('Drive', 'info') : null)));
  return el;
}
function bulk() {
  const col = h('input', { type: 'text', list: 'cols', placeholder: 'p. ej. Reseñas' }); const dl = h('datalist', { id: 'cols' }, [...new Set(state.assets.map((a) => a.collection).filter(Boolean))].map((c) => h('option', { value: c })));
  let cat = ''; const sel = select([{ value: '', label: '(no cambiar)' }, ...Object.entries(CATEGORIES).map(([v, label]) => ({ value: v, label }))], '', (v) => (cat = v));
  openModal({ title: `Clasificar ${selected.size} diseños`, body: h('div', { class: 'stack' }, field('Colección', col, 'Las reglas de automatización eligen diseños por colección.'), dl, field('Categoría (para el mix de contenido)', sel)), actions: [{ label: 'Cancelar' }, { label: 'Aplicar', kind: 'primary', onClick: () => { for (const id of selected) { const a = state.assets.find((x) => x.id === id); upsert('assets', { ...a, collection: col.value.trim() || a.collection, category: cat || a.category }); } selected.clear(); } }] });
}
function edit(a) {
  const d = { ...a, tags: [...a.tags] }; const c = compat(a);
  const hookSel = h('select', { onchange: (e) => (d.hookId = e.target.value || null) }, h('option', { value: '' }, 'Automático (rota según categoría)'), HOOKS.map((k) => h('option', { value: k.id, selected: k.id === d.hookId }, `[${FRAMEWORKS[k.fw]}] ${fillHook(k.text, {})}`.slice(0, 110))));
  const cap = h('textarea', { rows: 3, placeholder: 'Texto base opcional (se combina con el gancho según el modo)', oninput: (e) => (d.caption = e.target.value) }, d.caption);
  const modeHelp = h('p', { class: 'hint small muted' });
  const setHelp = () => (modeHelp.textContent = { none: 'El diseño ya lleva su mensaje: se publica solo con tu texto base, sin gancho ni prueba social añadidos.', light: 'Se antepone un gancho (titular) a tu texto y se añade una llamada a la acción.', full: 'Gancho + línea de prueba social (reseñas, seguro…) + llamada a la acción. Úsalo en diseños sin texto propio.' }[d.copyMode]);
  const modeSel = select(Object.entries(COPY_MODES).map(([value, label]) => ({ value, label })), d.copyMode, (v) => { d.copyMode = v; setHelp(); }); setHelp();
  const body = h('div', { class: 'grid', style: { gridTemplateColumns: '200px 1fr', gap: '20px' } },
    h('div', { class: 'stack' }, h('div', { style: { borderRadius: '10px', overflow: 'hidden' } }, thumb(a, '')), h('div', { class: 'small muted' }, `${a.w}×${a.h}${a.kind === 'video' ? ` · ${Math.round(a.dur)} s` : ''} · ${(a.size / 1048576).toFixed(1)} MB`),
      h('div', { class: 'stack sm' }, Object.entries(FORMATS).map(([k, f]) => h('div', { class: 'row small' }, h('span', { class: `dot ${c[k] === true ? 'ok' : c[k] === 'warn' ? 'warn' : 'err'}` }), f.label)))),
    h('div', { class: 'stack' }, field('Nombre', h('input', { type: 'text', value: d.name, oninput: (e) => (d.name = e.target.value) })),
      h('div', { class: 'grid cols-2' }, field('Colección', h('input', { type: 'text', value: d.collection, placeholder: 'Reseñas, Consejos…', oninput: (e) => (d.collection = e.target.value) })), field('Categoría', select([{ value: '', label: 'Sin categoría' }, ...Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))], d.category, (v) => (d.category = v)))),
      field('Modo de copy de este diseño', modeSel, null), modeHelp, field('Gancho / encabezado fijo', hookSel), field('Texto base', cap),
      field('Etiquetas (separadas por coma)', h('input', { type: 'text', value: d.tags.join(', '), oninput: (e) => (d.tags = e.target.value.split(',').map((x) => x.trim()).filter(Boolean)) })),
      field('Texto alternativo (accesibilidad)', h('input', { type: 'text', value: d.alt, oninput: (e) => (d.alt = e.target.value) })),
      h('div', { class: 'small muted' }, `Usado ${a.usedCount || 0} veces.`), a.driveId ? h('a', { class: 'small', href: `https://drive.google.com/file/d/${a.driveId}/view`, target: '_blank', rel: 'noopener' }, 'Abrir original en Drive') : null));
  openModal({ title: 'Editar diseño', size: 'lg', body, actions: [{ label: 'Eliminar', kind: 'danger', close: false, onClick: async (close) => { if (await confirmDialog('¿Eliminar este diseño?', 'Eliminar', true)) { remove('assets', a.id); close(); } } }, { label: 'Crear publicación', close: false, onClick: (close) => { upsert('assets', d); close(); location.hash = `#/studio/new?asset=${a.id}`; } }, { label: 'Guardar', kind: 'primary', onClick: () => upsert('assets', d) }] });
}
