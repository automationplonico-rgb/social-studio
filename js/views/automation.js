import { h, icon, pill, empty, openModal, confirmDialog, toast, field, select, toggle, callout, mount } from '../ui.js';
import { state, upsert, remove, uid } from '../store.js';
import { COPY_MODES, CATEGORIES, FORMATS, PLATFORMS, accountOf, compat } from '../rules.js';
import { slotsFor, materialize, pickAsset } from '../engine.js';
import { fmtDateTime } from '../tz.js';

const DOWS = [[1, 'L'], [2, 'M'], [3, 'X'], [4, 'J'], [5, 'V'], [6, 'S'], [7, 'D']];
export default function view() { return { title: 'Automatizar', actions: [h('button', { class: 'btn primary', onclick: () => editor() }, icon('plus', 16), 'Nueva regla')], render }; }

function render() {
  const S = state.settings; const g = S.guard;
  return h('div', { class: 'stack lg' },
    callout('info', h('b', null, 'Cómo funciona: '), 'una regla elige diseños de tu biblioteca y crea publicaciones reales en el calendario (siguiente 14 días). Tú las ves, las editas o las cancelas; el publicador solo sube lo que está en la cola. Pulsa "Generar cola" cuando quieras renovar el horizonte.'),
    state.rules.length ? h('div', { class: 'grid cols-2' }, state.rules.map(ruleCard)) : empty('zap', 'Aún no hay reglas', 'Ejemplo: "Lunes a viernes, 12:30 y 19:30, un diseño de la colección Reseñas al estado de WhatsApp Ventas".', h('button', { class: 'btn primary', onclick: () => editor() }, 'Crear la primera regla')),
    h('div', { class: 'card card-pad stack' }, h('div', { class: 'row' }, icon('shield', 18), h('h2', null, 'Límites de seguridad activos')), h('p', { class: 'small muted' }, 'Se aplican a reglas y a publicaciones manuales. Se cambian en Ajustes.'),
      h('div', { class: 'row wrap' }, pill(`Estados WhatsApp: máx. ${g.waMaxPerDay}/día por número`), pill(`Separación mínima ${g.waMinGapMin} min`), pill(`Variación aleatoria ±${g.jitterMin} min`), pill(`Silencio ${g.quietFrom}–${g.quietTo}`), pill(`Historias IG: máx. ${g.igMaxStoriesPerDay}/día`), pill(`Facebook: máx. ${g.fbMaxPostsPerDay}/día`))));
}
function ruleCard(r) {
  const queued = state.posts.filter((p) => p.ruleId === r.id && p.status === 'scheduled').length;
  const pool = state.assets.filter((a) => !a.archived && (!r.collection || a.collection === r.collection) && (!r.category || a.category === r.category) && r.targets.every((t) => compat(a)[t.format] === true)).length;
  const sl = slotsFor(r, state.settings).length;
  return h('div', { class: 'card rule-card stack', style: { opacity: r.enabled ? 1 : 0.65 } },
    h('div', { class: 'row' }, h('h3', { class: 'grow' }, r.name), toggle(r.enabled, (v) => upsert('rules', { ...r, enabled: v }), `Activar ${r.name}`)),
    h('div', { class: 'row wrap' }, r.targets.map((t) => pill(`${accountOf(state, t.accountId)?.label || '?'} · ${FORMATS[t.format].short}`, accountOf(state, t.accountId) ? '' : 'err'))),
    h('div', { class: 'small muted' }, `${DOWS.filter(([d]) => r.days.includes(d)).map(([, l]) => l).join(' ')} · ${r.times.join(', ')} · pool: ${r.collection || 'todas las colecciones'}${r.category ? ' / ' + CATEGORIES[r.category] : ''}`),
    h('div', { class: 'row small' }, pill(`${pool} diseños en el pool`, pool < 4 ? 'warn' : 'ok'), pill(`${queued} en cola`), pill(`${sl} huecos nuevos`)),
    pool < Math.max(4, r.times.length * r.days.length) ? h('div', { class: 'small', style: { color: 'var(--warn)' } }, `Pool corto: con ${pool} diseños se repetirá contenido cada pocos días. Sube más diseños o baja la frecuencia.`) : null,
    h('div', { class: 'row' }, h('button', { class: 'btn sm primary', disabled: !r.enabled, onclick: () => generate(r) }, icon('refresh', 14), 'Generar cola'), h('button', { class: 'btn sm', onclick: () => editor(r) }, 'Editar'), h('span', { class: 'grow' }),
      h('button', { class: 'btn sm danger', onclick: async () => { if (await confirmDialog(`¿Eliminar la regla "${r.name}"? Las publicaciones ya creadas se conservan.`, 'Eliminar', true)) remove('rules', r.id); } }, 'Eliminar')));
}
function generate(r) {
  const { created, warnings } = materialize(r); for (const p of created) upsert('posts', p);
  const drafts = created.filter((p) => p.status === 'draft').length;
  openModal({ title: `Cola de "${r.name}"`, body: h('div', { class: 'stack' }, h('p', null, h('b', null, `${created.length - drafts} programadas`), drafts ? `, ${drafts} en borrador por revisar` : '', '.'), created.length ? h('div', { class: 'small muted' }, created.slice(0, 8).map((p) => h('div', null, `${fmtDateTime(p.scheduledAt, state.settings.tz)} · ${p.title}`)), created.length > 8 ? `… y ${created.length - 8} más` : null) : h('p', { class: 'muted' }, 'No había huecos nuevos que cubrir.'), warnings.map((w) => callout('warn', w))), actions: [{ label: 'Ver calendario', kind: 'primary', onClick: () => (location.hash = '#/calendar') }] });
}
function editor(rule) {
  const d = rule ? structuredClone(rule) : { id: uid('rule'), name: '', enabled: true, collection: '', category: '', targets: [], days: [1, 2, 3, 4, 5], times: ['12:30'], skipRecentDays: 14, copyMode: 'asset', horizonDays: 14, area: 'London', service: 'a move', createdAt: Date.now() };
  const cols = [...new Set(state.assets.map((a) => a.collection).filter(Boolean))];
  const box = h('div', { class: 'stack' }); const prev = h('div');
  const has = (a, f) => d.targets.some((t) => t.accountId === a && t.format === f);
  const draw = () => {
    const tl = h('div', { class: 'row wrap' }, d.times.map((t, i) => h('span', { class: 'chip on' }, h('input', { type: 'time', value: t, style: { width: '110px', minHeight: '28px', border: 0, background: 'transparent' }, onchange: (e) => { d.times[i] = e.target.value; d.times.sort(); draw(); } }), h('button', { class: 'btn ghost icon sm', 'aria-label': 'Quitar hora', onclick: () => { d.times.splice(i, 1); draw(); } }, icon('x', 12)))), h('button', { class: 'btn sm', onclick: () => { d.times.push('18:00'); draw(); } }, icon('plus', 13), 'Hora'));
    mount(box, field('Nombre', h('input', { type: 'text', value: d.name, placeholder: 'Estados diarios (Ventas)', oninput: (e) => (d.name = e.target.value) })),
      field('Destinos', h('div', { class: 'stack sm' }, state.accounts.map((a) => h('div', { class: 'row wrap' }, h('b', { style: { minWidth: '150px' } }, a.label), PLATFORMS[a.platform].formats.map((f) => h('button', { class: `chip${has(a.id, f) ? ' on' : ''}`, 'aria-pressed': String(has(a.id, f)), onclick: () => { d.targets = has(a.id, f) ? d.targets.filter((t) => !(t.accountId === a.id && t.format === f)) : [...d.targets, { accountId: a.id, format: f }]; draw(); } }, FORMATS[f].short)))))),
      h('div', { class: 'grid cols-2' }, field('Pool: colección', select([{ value: '', label: 'Todas' }, ...cols.map((c) => ({ value: c, label: c }))], d.collection, (v) => { d.collection = v; draw(); })), field('Pool: categoría', select([{ value: '', label: 'Todas' }, ...Object.entries(CATEGORIES).map(([value, label]) => ({ value, label }))], d.category, (v) => { d.category = v; draw(); }))),
      field('Días', h('div', { class: 'row wrap' }, DOWS.map(([n, l]) => h('button', { class: `chip${d.days.includes(n) ? ' on' : ''}`, 'aria-pressed': String(d.days.includes(n)), onclick: () => { d.days = d.days.includes(n) ? d.days.filter((x) => x !== n) : [...d.days, n]; draw(); } }, l)))),
      field('Horas (hora de Londres; se añade variación aleatoria y se respeta el horario de silencio)', tl),
      h('div', { class: 'grid cols-2' }, field('No repetir un diseño durante (días)', h('input', { type: 'number', min: 0, max: 90, value: d.skipRecentDays, oninput: (e) => (d.skipRecentDays = +e.target.value) })), field('Estilo de copy', select([{ value: 'asset', label: 'El que tenga cada diseño' }, ...Object.entries(COPY_MODES).map(([value, label]) => ({ value, label }))], d.copyMode, (v) => (d.copyMode = v)))),
      h('div', { class: 'grid cols-2' }, field('Zona para los ganchos', h('input', { type: 'text', value: d.area, oninput: (e) => (d.area = e.target.value) })), field('Servicio', h('input', { type: 'text', value: d.service, oninput: (e) => (d.service = e.target.value) }))));
    const sl = slotsFor(d, state.settings); const taken = new Set();
    mount(prev, h('div', { class: 'label' }, 'Vista previa de los próximos huecos'), sl.length ? h('div', { class: 'small muted', style: { marginTop: '4px' } }, sl.slice(0, 6).map((s) => { const a = pickAsset(d, state, taken, Date.now()); if (a) taken.add(a.id); return h('div', null, `${fmtDateTime(s.at, state.settings.tz)} → ${a ? a.name : '⚠ sin diseño disponible'}`); }), sl.length > 6 ? `… ${sl.length - 6} más` : null) : h('div', { class: 'small muted' }, 'Sin huecos en el horizonte. Revisa días y horas.'));
  };
  draw();
  openModal({ title: rule ? 'Editar regla' : 'Nueva regla', size: 'lg', body: h('div', { class: 'stack' }, box, prev), actions: [{ label: 'Cancelar' }, { label: 'Guardar', kind: 'primary', onClick: () => { if (!d.name.trim()) { toast('Ponle un nombre', 'err'); return false; } if (!d.targets.length) { toast('Elige al menos un destino', 'err'); return false; } if (!d.days.length || !d.times.length) { toast('Elige días y horas', 'err'); return false; } upsert('rules', d); toast('Regla guardada. Pulsa "Generar cola" para crear las publicaciones.', 'ok'); } }] });
}
