import { h, icon, platBadge, segmented, empty, toast, mount, openModal } from '../ui.js';
import { state, upsert } from '../store.js';
import { monthGrid, dayKey, timeStr, parts, fromInputs, fmtDateTime, fmtDay } from '../tz.js';
import { FORMATS, validatePost, hasErrors } from '../rules.js';
import { postDetail, statusPill, targetBadges, thumb, when } from './shared.js';
import { assetOf } from '../rules.js';

let ym = null; let mode = 'month'; let showCanceled = false;
export default function view() {
  const p = parts(Date.now(), state.settings.tz); if (!ym) ym = { y: p.y, m: p.m };
  return { title: 'Calendario', actions: [h('a', { class: 'btn primary', href: '#/studio/new' }, icon('plus', 16), 'Nueva publicación')], render };
}
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
function render() {
  const tz = state.settings.tz; const root = h('div');
  const go = (d) => { ym = { y: ym.y + Math.floor((ym.m - 1 + d) / 12), m: (((ym.m - 1 + d) % 12) + 12) % 12 + 1 }; draw(); };
  const head = h('div', { class: 'cal-head' },
    h('button', { class: 'btn icon', 'aria-label': 'Mes anterior', onclick: () => go(-1) }, icon('left')), h('h2', { style: { minWidth: '150px', textAlign: 'center', textTransform: 'capitalize' } }, `${MONTHS[ym.m - 1]} ${ym.y}`),
    h('button', { class: 'btn icon', 'aria-label': 'Mes siguiente', onclick: () => go(1) }, icon('right')),
    h('button', { class: 'btn', onclick: () => { const n = parts(Date.now(), tz); ym = { y: n.y, m: n.m }; draw(); } }, 'Hoy'), h('span', { class: 'grow' }),
    h('label', { class: 'row small muted' }, h('input', { type: 'checkbox', checked: showCanceled, onchange: (e) => { showCanceled = e.target.checked; draw(); } }), 'Mostrar canceladas'),
    segmented([{ value: 'month', label: 'Mes' }, { value: 'list', label: 'Lista' }], mode, (v) => { mode = v; draw(); }));
  const body = h('div');
  function draw() { mount(root, head, body); head.querySelector('h2').textContent = `${MONTHS[ym.m - 1]} ${ym.y}`; mode === 'month' ? drawMonth() : drawList(); }
  const visible = () => state.posts.filter((p) => p.scheduledAt && (showCanceled || p.status !== 'canceled'));

  function drawMonth() {
    const days = monthGrid(ym.y, ym.m, tz); const todayKey = dayKey(Date.now(), tz); const byDay = {};
    for (const p of visible()) (byDay[dayKey(p.scheduledAt, tz)] ||= []).push(p);
    const grid = h('div', { class: 'cal', role: 'grid' }, ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => h('div', { class: 'dow', role: 'columnheader' }, d)),
      days.map((d) => {
        const ps = (byDay[d.key] || []).sort((a, b) => a.scheduledAt - b.scheduledAt);
        const cell = h('div', { class: `day${d.inMonth ? '' : ' out'}${d.key === todayKey ? ' today' : ''}`, role: 'gridcell',
          ondragover: (e) => { e.preventDefault(); cell.classList.add('drop'); }, ondragleave: () => cell.classList.remove('drop'),
          ondrop: (e) => { e.preventDefault(); cell.classList.remove('drop'); moveTo(e.dataTransfer.getData('text/plain'), d.key); } },
          h('div', { class: 'dn' }, h('span', null, d.d), h('button', { class: 'add', 'aria-label': `Crear publicación el ${d.key}`, onclick: () => (location.hash = `#/studio/new?date=${d.key}`) }, icon('plus', 14))),
          ps.slice(0, 4).map((p) => chip(p)), ps.length > 4 ? h('button', { class: 'btn sm ghost', onclick: () => dayModal(d.key, ps) }, `+${ps.length - 4} más`) : null);
        return cell;
      }));
    mount(body, draftsBox(), grid, legend());
  }
  const chip = (p) => h('button', { class: `pchip ${p.status}`, draggable: p.status === 'scheduled' || p.status === 'draft' ? 'true' : 'false', title: `${p.title} · ${when(p)}`, ondragstart: (e) => e.dataTransfer.setData('text/plain', p.id), onclick: () => postDetail(p) },
    h('span', { class: 'mini' }, [...new Set(p.targets.map((t) => FORMATS[t.format]?.platform))].map((pl) => h('span', { class: `mini-p ${pl}` }))), h('span', { class: 'muted' }, timeStr(p.scheduledAt, tz)), h('span', { class: 't' }, p.title || 'Sin título'));
  const legend = () => h('div', { class: 'row wrap small muted', style: { marginTop: '12px' } }, h('span', null, 'Arrastra una publicación a otro día para reprogramarla (mantiene la hora).'), h('span', { class: 'grow' }), [['scheduled', 'Programada'], ['published', 'Publicada'], ['failed', 'Fallo'], ['draft', 'Borrador']].map(([k, l]) => h('span', { class: 'row', style: { gap: '4px' } }, h('span', { class: `pchip ${k}`, style: { width: '14px', minHeight: '14px', padding: 0 } }), l)));
  function moveTo(id, key) {
    const p = state.posts.find((x) => x.id === id); if (!p || !['scheduled', 'draft'].includes(p.status)) return toast('Solo se pueden mover borradores y programadas', 'err');
    const at = fromInputs(key, timeStr(p.scheduledAt, tz), tz); const moved = { ...p, scheduledAt: at };
    const errs = validatePost(moved, state).filter((i) => i.level === 'error' && !/ya pasó/.test(i.msg)); if (errs.length) return toast(errs[0].msg, 'err');
    upsert('posts', moved); toast(`Movida al ${fmtDay(at, tz)}`, 'ok');
  }
  function dayModal(key, ps) { openModal({ title: key, body: h('div', null, ps.map((p) => h('div', { class: 'list-item', style: { padding: '8px 0', cursor: 'pointer' }, onclick: () => postDetail(p) }, h('b', null, p.title), h('span', { class: 'muted small' }, timeStr(p.scheduledAt, tz)), statusPill(p.status)))) }); }
  // Borradores sin fecha: no caben en el calendario, así que se listan aparte (si no, parecen "perdidos")
  function draftsBox() {
    const ds = state.posts.filter((p) => p.status === 'draft' && !p.scheduledAt);
    if (!ds.length) return null;
    return h('div', { class: 'card', style: { marginBottom: '14px' } }, h('div', { class: 'card-head' }, h('h3', null, `Borradores sin fecha (${ds.length})`), h('span', { class: 'small muted' }, 'Ábrelos, revísalos y programa o elimina')),
      ds.map((p) => h('button', { class: 'list-item', style: { width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer' }, onclick: () => postDetail(p) },
        h('div', { style: { width: '40px', height: '50px', borderRadius: '6px', overflow: 'hidden', flex: 'none' } }, thumb(assetOf(state, p.assetId), '')), h('div', { class: 'grow' }, h('b', null, p.title || 'Sin título'), h('div', { class: 'small muted' }, 'Sin fecha · no se publicará hasta que lo programes')), targetBadges(p), statusPill(p.status))));
  }
  function drawList() {
    const ps = visible().filter((p) => { const k = parts(p.scheduledAt, tz); return k.y === ym.y && k.m === ym.m; }).sort((a, b) => a.scheduledAt - b.scheduledAt);
    mount(body, draftsBox(), ps.length ? h('div', { class: 'card' }, ps.map((p) => h('button', { class: 'list-item', style: { width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer' }, onclick: () => postDetail(p) },
      h('div', { style: { width: '40px', height: '50px', borderRadius: '6px', overflow: 'hidden', flex: 'none' } }, thumb(assetOf(state, p.assetId), '')), h('div', { class: 'grow' }, h('b', null, p.title || 'Sin título'), h('div', { class: 'small muted' }, fmtDateTime(p.scheduledAt, tz))), targetBadges(p), statusPill(p.status)))) : empty('calendar', 'Sin publicaciones este mes', 'Crea una o activa una regla de automatización.'));
  }
  draw(); return root;
}
