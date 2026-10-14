// Estudio de creación: diseño -> destinos -> copy (con/sin neuromarketing) -> programación, con vista previa y validación en vivo.
import { h, icon, platBadge, pill, field, segmented, select, callout, toast, mount, openModal, confirmDialog } from '../ui.js';
import { state, upsert, newPost, uid } from '../store.js';
import * as api from '../api.js';
import { PLATFORMS, FORMATS, COPY_MODES, CATEGORIES, validatePost, hasErrors, lintCopy, applyFixes, captionFor, compat, accountOf, assetOf } from '../rules.js';
import { HOOKS, FRAMEWORKS, PRINCIPLES, hookById, fillHook, buildCopy, SLOT_HYPOTHESES } from '../marketing.js';
import { dayKey, timeStr, fromInputs, parts, fmtDateTime } from '../tz.js';
import { thumb } from './shared.js';
import { addFiles } from './library.js';
import { demoTick } from '../engine.js';
import { emit } from '../store.js';

export default function view(params) {
  const [raw = 'new'] = params; const [idPart, qs = ''] = raw.split('?'); const q = new URLSearchParams(qs); const S = state.settings;
  let post;
  if (idPart !== 'new') { const ex = state.posts.find((p) => p.id === idPart); post = ex ? structuredClone(ex) : newPost(); }
  else if (q.get('from')) { const src = state.posts.find((p) => p.id === q.get('from')); post = src ? { ...structuredClone(src), id: uid('post'), status: 'draft', results: [], scheduledAt: null, ruleId: null, slotKey: undefined, problem: undefined, createdAt: Date.now() } : newPost(); }
  else post = newPost();
  if (q.get('asset')) selectAsset(post, q.get('asset'));
  if (q.get('date') && !post.scheduledAt) post.scheduledAt = fromInputs(q.get('date'), '12:30', S.tz);
  return { title: idPart === 'new' ? 'Nueva publicación' : 'Editar publicación', live: false, render: () => render(post) };
}
function selectAsset(post, id) { const a = assetOf(state, id); if (!a) return; post.assetId = id; post.copy.mode = a.copyMode || 'light'; post.copy.hookId = a.hookId || null; post.category = a.category || null; if (!post.title) post.title = a.name; if (a.caption && !post.copy.default) post.copy.default = a.caption; }

function render(post) {
  const S = state.settings; const ctx = { area: 'London', service: 'a move', tags: [] }; let tab = 'base'; let safe = true; let mode = post.status === 'scheduled' ? 'schedule' : post.scheduledAt ? 'schedule' : 'now';
  const root = h('div', { class: 'composer' }); const left = h('div', { class: 'stack lg' }); const right = h('div', { class: 'preview-col' });
  mount(root, left, right);
  const issues = () => validatePost({ ...post, status: mode === 'draft' ? 'draft' : 'scheduled', scheduledAt: mode === 'now' ? Date.now() + 60000 : post.scheduledAt }, state);

  // ---- 1. diseño ----
  const s1 = h('section', { class: 'card step' }); const pickBox = h('div'); const nameLbl = h('span', { class: 'small muted' });
  const drawPick = () => { nameLbl.textContent = post.assetId ? assetOf(state, post.assetId)?.name : 'Elige uno'; mount(pickBox, state.assets.length ? h('div', { class: 'asset-pick' }, state.assets.filter((a) => !a.archived).map((a) => h('button', { class: `mini-a${a.id === post.assetId ? ' on' : ''}`, title: a.name, 'aria-label': a.name, 'aria-pressed': String(a.id === post.assetId), onclick: () => { selectAsset(post, a.id); drawAll(); } }, thumb(a, '')))) : h('p', { class: 'muted' }, 'Todavía no hay diseños.')); };
  mount(s1, h('h2', null, h('span', { class: 'n' }, 1), 'Diseño'), pickBox, h('div', { class: 'row', style: { marginTop: '10px' } }, h('button', { class: 'btn sm', onclick: async () => { const i = h('input', { type: 'file', multiple: true, accept: 'image/*,video/mp4,video/quicktime' }); i.onchange = async () => { await addFiles([...i.files]); const last = state.assets[state.assets.length - 1]; if (last && !post.assetId) selectAsset(post, last.id); drawAll(); }; i.click(); } }, icon('upload', 14), 'Subir nuevo'), nameLbl));

  // ---- 2. destinos ----
  const s2 = h('section', { class: 'card step' }); const tgtBox = h('div', { class: 'stack' });
  const has = (accId, f) => post.targets.some((t) => t.accountId === accId && t.format === f);
  const flip = (accId, f) => { post.targets = has(accId, f) ? post.targets.filter((t) => !(t.accountId === accId && t.format === f)) : [...post.targets, { accountId: accId, format: f }]; if (tab !== 'base' && !post.targets.some((t) => t.format === tab)) tab = 'base'; drawTargets(); drawCopy(); drawRight(); };
  const drawTargets = () => {
    const a = assetOf(state, post.assetId); const c = a ? compat(a) : {};
    mount(tgtBox, state.accounts.length ? Object.entries(PLATFORMS).map(([pl, P]) => { const accs = state.accounts.filter((x) => x.platform === pl); if (!accs.length) return null; return h('div', { class: 'stack sm' }, h('div', { class: 'row' }, platBadge(pl), h('b', null, P.label)), accs.map((acc) => h('div', { class: `target-acc${acc.status !== 'connected' ? ' off' : ''}` }, h('div', { class: 'row wrap' }, h('div', { class: 'grow' }, h('b', null, acc.label), h('span', { class: 'small muted' }, ` ${acc.handle || ''}`)), acc.status !== 'connected' ? pill(acc.status === 'expired' ? 'Caducada' : 'Desconectada', 'err') : null),
      h('div', { class: 'row wrap', style: { marginTop: '8px' } }, P.formats.map((f) => { const bad = c[f] === false; const w = c[f] === 'warn'; return h('button', { class: `chip${has(acc.id, f) ? ' on' : ''}`, 'aria-pressed': String(has(acc.id, f)), disabled: acc.status !== 'connected' || (bad && !has(acc.id, f)), title: bad ? 'Este diseño no es compatible con este formato' : w ? 'El diseño no es 9:16: se recortará' : FORMATS[f].label, onclick: () => flip(acc.id, f) }, has(acc.id, f) ? icon('check', 13) : null, FORMATS[f].short, w ? icon('alert', 13) : null); }))))); })
      : callout('warn', 'No hay cuentas. ', h('a', { href: '#/accounts' }, 'Conecta una primero.')));
  };
  mount(s2, h('h2', null, h('span', { class: 'n' }, 2), 'Destinos'), tgtBox);

  // ---- 3. copy ----
  const s3 = h('section', { class: 'card step' }); const copyBox = h('div', { class: 'stack' });
  const drawCopy = () => {
    const shown = [...new Set(post.targets.map((t) => t.format))]; const showing = shown.filter((f) => FORMATS[f].captionShows); const stories = shown.filter((f) => !FORMATS[f].captionShows);
    const tabs = showing.length > 1 ? ['base', ...showing] : ['base']; if (!tabs.includes(tab)) tab = 'base';
    const cur = tab === 'base' ? post.copy.default : captionFor(post, tab); const f = tab === 'base' ? showing[0] || 'ig_feed' : tab; const lim = FORMATS[f]?.caption || 2200;
    const ta = h('textarea', { rows: 7, 'aria-label': 'Texto de la publicación', placeholder: post.copy.mode === 'none' ? 'Solo tu texto (sin gancho ni prueba social)…' : 'Escribe o pulsa "Generar texto"…', oninput: (e) => { tab === 'base' ? (post.copy.default = e.target.value) : (post.copy.overrides[tab] = e.target.value); drawRight(); drawLint(); }, value: cur }); ta.value = cur;
    const lintBox = h('div', { class: 'stack sm' }); const counter = h('div', { class: 'counter' });
    const drawLint = () => { const t = ta.value; counter.textContent = `${t.length} / ${lim}`; counter.className = `counter${t.length > lim ? ' bad' : ''}`; const li = lintCopy(t, f, S); mount(lintBox, li.length ? [li.map((i) => h('div', { class: `row small`, style: { color: i.level === 'warn' ? 'var(--warn)' : 'var(--muted)' } }, icon(i.level === 'warn' ? 'alert' : 'info', 14), i.msg)), li.some((i) => i.fix) ? h('button', { class: 'btn sm', style: { alignSelf: 'flex-start' }, onclick: () => { ta.value = applyFixes(ta.value, li); ta.dispatchEvent(new Event('input')); } }, 'Corregir automáticamente') : null] : h('div', { class: 'row small', style: { color: 'var(--ok)' } }, icon('check', 14), 'Cumple las reglas de marca')); };
    const hook = hookById(post.copy.hookId);
    mount(copyBox,
      h('div', { class: 'grid cols-2' }, field('Estilo de copy', select(Object.entries(COPY_MODES).map(([value, label]) => ({ value, label })), post.copy.mode, (v) => { post.copy.mode = v; drawCopy(); }), post.copy.mode === 'none' ? 'El diseño ya lleva su mensaje; no se añade gancho ni prueba social.' : null), field('Categoría (mix de contenido)', select([{ value: '', label: 'Sin categoría' }, ...Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))], post.category || '', (v) => (post.category = v || null)))),
      post.copy.mode !== 'none' ? h('div', { class: 'grid cols-2' }, field('Gancho / encabezado', h('button', { class: 'btn', style: { justifyContent: 'flex-start', whiteSpace: 'normal', textAlign: 'left', height: 'auto', padding: '8px 12px' }, onclick: () => hookPicker(post, () => drawCopy()) }, icon('sparkle', 14), hook ? fillHook(hook.text, ctx).slice(0, 70) : 'Elegir gancho (opcional)')),
        h('div', { class: 'grid cols-2' }, field('Zona', h('input', { type: 'text', value: ctx.area, oninput: (e) => (ctx.area = e.target.value) })), field('Servicio', h('input', { type: 'text', value: ctx.service, oninput: (e) => (ctx.service = e.target.value) })))) : null,
      showing.length ? h('div', { class: 'row wrap' }, h('div', { class: 'seg' }, tabs.map((t) => h('button', { 'aria-pressed': String(t === tab), onclick: () => { tab = t; drawCopy(); } }, t === 'base' ? 'Texto base' : FORMATS[t].short + ' (propio)'))), h('span', { class: 'grow' }), h('button', { class: 'btn sm', onclick: () => { const hk = hookById(post.copy.hookId) || (post.copy.mode === 'none' ? null : pickRandom(post.category)); const g = buildCopy({ mode: post.copy.mode, hook: hk, ctx, settings: S, format: f, custom: '' }); if (!post.copy.hookId && hk && post.copy.mode !== 'none') post.copy.hookId = hk.id; ta.value = g.caption; ta.dispatchEvent(new Event('input')); drawCopy(); } }, icon('sparkle', 14), 'Generar texto'))
        : callout('info', 'Los destinos elegidos son historias: el texto no se publica por API. El mensaje debe ir dentro del diseño.'),
      showing.length ? [ta, h('div', { class: 'row' }, lintBox, h('span', { class: 'grow' }), counter)] : null,
      stories.length && showing.length ? callout('info', 'Historias: el texto de arriba no aparece en ellas; irá solo en los destinos con texto.') : null,
      post.copy.mode !== 'none' && hook ? h('p', { class: 'small muted' }, `Principio: ${PRINCIPLES[hook.pr]} · ${FRAMEWORKS[hook.fw]}. ${stories.length ? 'Sugerencia para escribir en el diseño: “' + buildCopy({ mode: 'light', hook, ctx, settings: S, format: 'ig_story' }).overlay + '”' : ''}`) : null);
    drawLint();
  };
  mount(s3, h('h2', null, h('span', { class: 'n' }, 3), 'Texto'), copyBox);

  // ---- 4. programación ----
  const s4 = h('section', { class: 'card step' }); const schedBox = h('div', { class: 'stack' });
  const drawSched = () => {
    const at = post.scheduledAt || Date.now() + 3600e3; const dI = h('input', { type: 'date', value: dayKey(at, S.tz), 'aria-label': 'Fecha', onchange: apply }); const tI = h('input', { type: 'time', value: timeStr(at, S.tz), 'aria-label': 'Hora', onchange: apply });
    function apply() { if (dI.value && tI.value) { post.scheduledAt = fromInputs(dI.value, tI.value, S.tz); drawRight(); drawSched(); } }
    const sugg = suggestSlots(post).map((s) => h('button', { class: `chip${post.scheduledAt === s.at ? ' on' : ''}`, title: s.why, onclick: () => { post.scheduledAt = s.at; mode = 'schedule'; drawSched(); drawRight(); } }, icon('clock', 13), fmtDateTime(s.at, S.tz)));
    mount(schedBox, segmented([{ value: 'now', label: 'Publicar ahora' }, { value: 'schedule', label: 'Programar' }, { value: 'draft', label: 'Borrador' }], mode, (v) => { mode = v; drawSched(); drawRight(); }),
      mode === 'schedule' ? [h('div', { class: 'grid cols-2' }, field(`Fecha (${S.tz})`, dI), field('Hora', tI)), h('div', null, h('div', { class: 'label' }, 'Huecos sugeridos'), h('div', { class: 'slots', style: { marginTop: '6px' } }, sugg), h('p', { class: 'hint small faint', style: { marginTop: '6px' } }, 'Son hipótesis de partida (trayecto, comida, tarde-noche), no datos de tu cuenta. Mide en Meta Business Suite y ajusta.'))] : null,
      mode === 'now' ? h('p', { class: 'small muted' }, 'Se encola para el próximo ciclo del publicador (hasta ~1 minuto).') : null);
  };
  mount(s4, h('h2', null, h('span', { class: 'n' }, 4), 'Cuándo'), schedBox);
  mount(left, h('div', { class: 'card step' }, field('Título interno', h('input', { type: 'text', value: post.title, placeholder: 'Solo para ti, no se publica', oninput: (e) => (post.title = e.target.value) }))), s1, s2, s3, s4);

  // ---- derecha: previews + checklist + acciones ----
  function drawRight() {
    const a = assetOf(state, post.assetId); const iss = issues(); const errs = iss.filter((i) => i.level === 'error'); const fmts = [...new Set(post.targets.map((t) => t.format))]; const show = fmts.length ? fmts : ['wa_status'];
    const phone = (f) => { const F = FORMATS[f]; const vertical = !!F.vertical; const scr = h('div', { class: `screen${vertical ? '' : ' feed'}${safe && vertical ? ' safe' : ''}` }, a ? (a.kind === 'video' ? h('video', { src: a.url, muted: true, controls: true, playsinline: true }) : h('img', { src: a.url, alt: a.alt || a.name })) : h('div', { style: { color: '#888', display: 'grid', placeItems: 'center', height: '100%', fontSize: '12px' } }, 'Sin diseño'), vertical ? [h('div', { class: 'bar' }), h('div', { class: 'safe-t' }), h('div', { class: 'safe-b' })] : null);
      const cap = F.captionShows ? captionFor(post, f) : ''; return h('div', { class: 'phone' }, scr, h('div', { class: 'cap' }, F.short, F.captionShows && cap ? h('div', { class: 'tiny', style: { marginTop: '3px', textAlign: 'left', color: 'var(--text)', maxHeight: '60px', overflow: 'hidden', whiteSpace: 'pre-wrap' } }, cap) : null)); };
    const canGo = !errs.length;
    mount(right, h('div', { class: 'card card-pad stack' }, h('div', { class: 'row' }, h('h2', { class: 'grow' }, 'Vista previa'), show.some((f) => FORMATS[f].vertical) ? h('label', { class: 'row small muted' }, h('input', { type: 'checkbox', checked: safe, onchange: (e) => { safe = e.target.checked; drawRight(); } }), 'Zonas seguras') : null), h('div', { class: 'phones' }, show.map(phone)), safe ? h('p', { class: 'tiny faint' }, 'Rayado = zona tapada por la interfaz (nombre, respuesta). No pongas texto clave ahí.') : null),
      h('div', { class: 'card card-pad stack sm' }, h('div', { class: 'row' }, h('h3', { class: 'grow' }, 'Comprobaciones'), errs.length ? pill(`${errs.length} error${errs.length > 1 ? 'es' : ''}`, 'err') : pill('Listo', 'ok')),
        iss.length ? iss.map((i) => h('div', { class: 'check' }, h('span', { class: `dot ${i.level === 'error' ? 'err' : i.level === 'warn' ? 'warn' : 'info'}`, style: { marginTop: '6px' } }), h('span', null, i.msg))) : h('div', { class: 'small muted' }, 'Sin avisos.')),
      h('div', { class: 'row' }, h('button', { class: 'btn grow', onclick: () => save('draft') }, 'Guardar borrador'), h('button', { class: 'btn primary grow', disabled: mode === 'draft' ? false : !canGo, onclick: () => save(mode) }, icon(mode === 'now' ? 'send' : 'calendar', 16), mode === 'now' ? 'Publicar ahora' : mode === 'draft' ? 'Guardar' : 'Programar')));
  }
  async function save(m) {
    if (m !== 'draft') { const e = validatePost({ ...post, status: 'scheduled', scheduledAt: m === 'now' ? Date.now() + 60000 : post.scheduledAt }, state).find((i) => i.level === 'error'); if (e) return toast(e.msg, 'err'); }
    if (m === 'now' && !(await confirmDialog(`Se publicará ahora en ${post.targets.length} destino(s). ¿Continuar?`, 'Publicar'))) return;
    const p = { ...post, problem: undefined, status: m === 'draft' ? 'draft' : 'scheduled', scheduledAt: m === 'now' ? Date.now() + 2000 : post.scheduledAt };
    if (!p.title) p.title = assetOf(state, p.assetId)?.name || 'Publicación';
    upsert('posts', p);
    if (m === 'now') { if (api.mode() === 'remote') { try { await api.publishNow(p.id); toast('Enviada al publicador', 'ok'); } catch (e) { toast(`No se pudo publicar: ${e.message}`, 'err'); } } else setTimeout(() => { if (demoTick(Date.now() + 5000).length) { emit(); toast('Publicado (simulado)', 'ok'); } }, 2500); }
    else toast(m === 'draft' ? 'Borrador guardado' : 'Programada', 'ok');
    location.hash = '#/calendar';
  }
  const drawAll = () => { drawPick(); drawTargets(); drawCopy(); drawSched(); drawRight(); };
  drawAll(); return root;
}
const pickRandom = (cat) => { const pool = HOOKS.filter((x) => !cat || x.cat === cat); return pool[Math.floor(Math.random() * pool.length)]; };
function hookPicker(post, done) {
  let fw = ''; const list = h('div', { class: 'hookgrid' });
  const draw = () => mount(list, HOOKS.filter((x) => !fw || x.fw === fw).map((k) => h('button', { class: `hook${post.copy.hookId === k.id ? ' on' : ''}`, onclick: () => { post.copy.hookId = k.id; close(); done(); } }, h('div', { class: 'bold small' }, fillHook(k.text, { area: 'London', service: 'a move' })), h('div', { class: 'row tiny muted', style: { marginTop: '3px' } }, pill(FRAMEWORKS[k.fw]), pill(PRINCIPLES[k.pr], 'info')))));
  draw(); const close = openModal({ title: 'Elegir gancho', size: 'lg', body: h('div', { class: 'stack' }, select([{ value: '', label: 'Todos los marcos' }, ...Object.entries(FRAMEWORKS).map(([value, label]) => ({ value, label }))], fw, (v) => { fw = v; draw(); }), list), actions: [{ label: 'Sin gancho', onClick: () => { post.copy.hookId = null; done(); } }, { label: 'Cerrar' }] });
}
function suggestSlots(post) {
  const S = state.settings; const out = []; const now = Date.now();
  for (let i = 0; i < 8 && out.length < 5; i++) { const noon = now + i * 864e5; const key = dayKey(noon, S.tz); const dow = parts(noon, S.tz).dow;
    for (const s of SLOT_HYPOTHESES) { if (!s.dow.includes(dow)) continue; const at = fromInputs(key, s.time, S.tz); if (at < now + 600e3) continue;
      const clash = state.posts.some((p) => p.id !== post.id && p.status === 'scheduled' && Math.abs(p.scheduledAt - at) < S.guard.waMinGapMin * 60000 && p.targets.some((t) => post.targets.some((u) => u.accountId === t.accountId)));
      if (!clash && out.length < 5) out.push({ at, why: s.why }); } }
  return out;
}
