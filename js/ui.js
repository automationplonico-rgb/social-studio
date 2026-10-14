// Helpers de UI. Todo el DOM se construye con nodos (nunca innerHTML) para que un pie de foto con HTML no pueda inyectar nada.
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked' || k === 'disabled' || k === 'selected' || k === 'multiple' || k === 'hidden') el[k] = !!v;
    else el.setAttribute(k, v === true ? '' : v);
  }
  append(el, kids);
  return el;
}
function append(el, kids) {
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; el.append(k.nodeType ? k : document.createTextNode(String(k))); }
}
export const clear = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
export const mount = (el, ...kids) => { clear(el); append(el, kids); return el; };

const NS = 'http://www.w3.org/2000/svg';
const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  calendar: 'M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  zap: 'M13 2 3 14h9l-1 8 10-12h-9z',
  plug: 'M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4',
  megaphone: 'M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
  plus: 'M12 5v14M5 12h14', check: 'M20 6 9 17l-5-5', x: 'M18 6 6 18M6 6l12 12',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 16v-4M12 8h.01',
  left: 'M15 18l-6-6 6-6', right: 'M9 18l6-6-6-6',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  trash: 'M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14', upload: 'M12 16V4M7 9l5-5 5 5M4 20h16',
  copy: 'M9 9h11v11H9zM5 15H4V4h11v1', play: 'M7 4l13 8-13 8z', pause: 'M7 4v16M17 4v16',
  shield: 'M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  refresh: 'M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M21 4v5h-5M3 20v-5h5',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 9h4M4 15h4M16 9h4M16 15h4', download: 'M12 4v12M7 11l5 5 5-5M4 20h16',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z', list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z', moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  whatsapp: 'M3 21l1.6-5A8.5 8.5 0 1 1 8 19.4zM9 9c0 3 3 6 6 6l1-2-2-1-1 .8c-1-.4-2-1.4-2.4-2.4L11 9.5 10 7.5z',
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h.01',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v8h4v-8h3l1-4h-4V8.5c0-.3.2-.5.5-.5z',
};
export function icon(name, size = 18, extra = {}) {
  const s = document.createElementNS(NS, 'svg');
  for (const [k, v] of Object.entries({ viewBox: '0 0 24 24', width: size, height: size, fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', ...extra })) s.setAttribute(k, v);
  const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONS[name] || ICONS.info); s.append(p);
  return s;
}
export const platBadge = (platform, lg) => h('span', { class: `plat ${platform}${lg ? ' lg' : ''}`, title: platform }, icon(platform, lg ? 22 : 15));

// ---------- modal ----------
export function openModal({ title, body, actions = [], size = '', onClose }) {
  const prev = document.activeElement;
  const close = (v) => { bg.remove(); document.removeEventListener('keydown', onKey, true); prev && prev.focus && prev.focus(); onClose && onClose(v); };
  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key === 'Tab') { const f = [...modal.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])')].filter((x) => !x.disabled && x.offsetParent !== null); if (!f.length) return; const a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); } }
  };
  const foot = actions.length ? h('div', { class: 'modal-foot' }, actions.map((a) => h('button', { class: `btn ${a.kind || ''}`, onclick: async () => { if (a.onClick) { const r = await a.onClick(close); if (r === false) return; } if (a.close !== false) close(a.value); } }, a.label))) : null;
  const modal = h('div', { class: `modal ${size}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    h('div', { class: 'modal-head' }, h('h2', null, title), h('button', { class: 'btn ghost icon sm', 'aria-label': 'Cerrar', onclick: () => close() }, icon('x'))),
    h('div', { class: 'modal-body' }, body), foot);
  const bg = h('div', { class: 'modal-bg', onmousedown: (e) => { if (e.target === bg) close(); } }, modal);
  document.body.append(bg); document.addEventListener('keydown', onKey, true);
  setTimeout(() => (modal.querySelector('input,textarea,select') || modal.querySelector('.btn.primary') || modal).focus?.(), 30);
  return close;
}
export const confirmDialog = (message, okLabel = 'Confirmar', danger = false) => new Promise((res) => {
  openModal({ title: 'Confirmar', body: h('p', null, message), onClose: (v) => res(v === true), actions: [{ label: 'Cancelar' }, { label: okLabel, kind: danger ? 'danger' : 'primary', value: true }] });
});
export function toast(msg, kind = '') {
  let box = document.getElementById('toasts'); if (!box) { box = h('div', { id: 'toasts', role: 'status', 'aria-live': 'polite' }); document.body.append(box); }
  const t = h('div', { class: `toast ${kind}` }, msg); box.append(t); setTimeout(() => t.remove(), kind === 'err' ? 6500 : 3200);
}
// ---------- piezas de formulario ----------
export const field = (label, control, hint) => h('div', { class: 'field' }, h('label', null, label), control, hint ? h('div', { class: 'hint' }, hint) : null);
export const toggle = (checked, onChange, label) => { const i = h('input', { type: 'checkbox', checked, role: 'switch', 'aria-label': label || 'Activar', onchange: (e) => onChange(e.target.checked) }); return h('label', { class: 'switch' }, i, h('span')); };
export function segmented(options, value, onChange) {
  const wrap = h('div', { class: 'seg', role: 'group' });
  const draw = (v) => mount(wrap, options.map((o) => h('button', { type: 'button', 'aria-pressed': String(o.value === v), onclick: () => { draw(o.value); onChange(o.value); } }, o.label)));
  draw(value); return wrap;
}
export const select = (options, value, onChange, attrs = {}) => h('select', { ...attrs, onchange: (e) => onChange(e.target.value) }, options.map((o) => h('option', { value: o.value, selected: o.value === value }, o.label)));
export const pill = (text, kind = '') => h('span', { class: `pill ${kind}` }, text);
export const callout = (kind, ...kids) => h('div', { class: `callout ${kind}` }, icon(kind === 'ok' ? 'check' : kind === 'info' ? 'info' : 'alert', 16, { style: 'margin-top:2px' }), h('div', null, kids));
export function empty(ic, title, text, action) { return h('div', { class: 'empty' }, icon(ic, 34), h('h3', null, title), h('p', null, text), action ? h('div', { style: { marginTop: '14px' } }, action) : null); }
export const debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
export function download(name, text, type = 'application/json') { const a = h('a', { href: URL.createObjectURL(new Blob([text], { type })), download: name }); document.body.append(a); a.click(); a.remove(); }
export const copyText = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copiado', 'ok'); } catch { toast('No se pudo copiar', 'err'); } };
