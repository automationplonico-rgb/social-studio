// Shell: navegación por hash, banners de estado, interruptor global de pausa y bucles de fondo.
import { h, icon, mount, toggle, toast, debounce } from './ui.js';
import { state, load, subscribe, setSettings, applyTheme, attention, emit } from './store.js';
import * as api from './api.js';
import { demoTick } from './engine.js';

const ROUTES = {
  '': { label: 'Resumen', icon: 'home', mod: () => import('./views/overview.js') },
  calendar: { label: 'Calendario', icon: 'calendar', mod: () => import('./views/calendar.js') },
  nextdoor: { label: 'Nextdoor', icon: 'home', mod: () => import('./views/nextdoor.js?v=8') },
  studio: { label: 'Crear', icon: 'pen', mod: () => import('./views/composer.js'), hidden: false },
  library: { label: 'Diseños', icon: 'image', mod: () => import('./views/library.js') },
  automation: { label: 'Automatizar', icon: 'zap', mod: () => import('./views/automation.js'), opt: true },
  marketing: { label: 'Marketing', icon: 'megaphone', mod: () => import('./views/marketing.js'), opt: true },
  accounts: { label: 'Cuentas', icon: 'plug', mod: () => import('./views/accounts.js') },
  settings: { label: 'Ajustes', icon: 'sliders', mod: () => import('./views/settings.js'), opt: true },
};
const $ = (id) => document.getElementById(id);
let current = null, token = 0;

function parseHash() { const [path, ...rest] = (location.hash.replace(/^#\/?/, '') || '').split('/'); return { name: ROUTES[path] ? path : '', params: rest }; }

function drawNav(active) {
  const att = attention(); const nAcc = att.accounts.length, nFail = att.failed.length;
  mount(document.querySelector('.sidebar'),
    h('div', { class: 'brand' }, h('div', { class: 'brand-mark', 'aria-hidden': 'true' }, 'M'), h('div', null, h('b', null, state.settings.brand.name || 'Mooveto'), h('small', null, 'Social Studio'))),
    h('nav', { class: 'nav' }, Object.entries(ROUTES).map(([k, r]) => h('a', { href: `#/${k}`, class: r.opt ? 'opt' : '', 'aria-current': k === active ? 'page' : null },
      icon(r.icon, 18), h('span', { class: 'lbl' }, r.label),
      k === 'accounts' && nAcc ? h('span', { class: 'count alert', 'aria-label': `${nAcc} cuentas con problemas` }, nAcc) : null,
      k === 'calendar' && nFail ? h('span', { class: 'count alert', 'aria-label': `${nFail} publicaciones con fallos` }, nFail) : null))),
    h('div', { class: 'sidebar-foot' }, api.mode() === 'demo' ? 'Modo demo (datos locales)' : 'Conectado a n8n'));
}
function drawBanners() {
  const b = [];
  if (state.error) b.push(h('div', { class: 'banner err', role: 'alert' }, icon('alert', 16), `No se pudo cargar los datos: ${state.error}`, h('button', { class: 'btn sm', onclick: () => load() }, 'Reintentar')));
  if (api.mode() === 'demo') b.push(h('div', { class: 'banner' }, icon('info', 16), 'Modo demo: nada se publica de verdad. Las publicaciones se simulan mientras esta pestaña está abierta. Conecta tu n8n en Ajustes para automatizar de verdad.', h('a', { class: 'btn sm', href: '#/settings' }, 'Conectar n8n')));
  if (state.settings.paused) b.push(h('div', { class: 'banner err', role: 'status' }, icon('pause', 16), 'Publicación automática PAUSADA: no saldrá nada hasta que la reanudes.', h('button', { class: 'btn sm', onclick: () => setSettings({ paused: false }) }, 'Reanudar')));
  mount($('banners'), b);
}

async function route() {
  const my = ++token; const { name, params } = parseHash(); const r = ROUTES[name];
  if (current?.destroy) current.destroy(); current = null; drawNav(name);
  const mod = await r.mod(); if (my !== token) return;
  const v = mod.default(params); current = v; document.title = `${v.title} · Mooveto Social Studio`;
  $('title').textContent = v.title; mount($('actions'), pauseSwitch(), v.actions || []);
  const paint = () => mount($('view'), v.render()); paint(); $('view').focus({ preventScroll: true }); window.scrollTo(0, 0);
  v.repaint = paint;
}
const pauseSwitch = () => h('label', { class: 'row small', title: 'Detiene todas las publicaciones automáticas' }, h('span', { class: 'muted' }, state.settings.paused ? 'Pausado' : 'Auto-publicar'), toggle(!state.settings.paused, (on) => setSettings({ paused: !on }), 'Publicación automática'));

const onState = debounce(() => {
  drawNav(parseHash().name); drawBanners();
  if (current && current.live !== false && !document.querySelector('.modal-bg')) { const y = window.scrollY; current.repaint?.(); window.scrollTo(0, y); }
  const act = $('actions'); if (act && act.firstChild) act.replaceChild(pauseSwitch(), act.firstChild);
}, 60);

(async function boot() {
  applyTheme(); await load(); applyTheme(); drawBanners();
  subscribe(onState); window.addEventListener('hashchange', route); await route();
  if (api.mode() === 'demo') setInterval(() => { if (demoTick().length) { emit(); toast('Se publicó una entrada (simulado)', 'ok'); } }, 20000);
  else setInterval(() => load(), 60000);   // el estado real lo cambia n8n: refresca cada minuto
})();
