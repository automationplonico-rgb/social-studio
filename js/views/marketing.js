import { h, icon, pill, field, select, mount, copyText, callout } from '../ui.js';
import { state, setSettings } from '../store.js';
import { HOOKS, FRAMEWORKS, PRINCIPLES, SERVICES, fillHook, buildCopy, contentMix, waLink, utmLink, SLOT_HYPOTHESES } from '../marketing.js';
import { CATEGORIES, lintCopy } from '../rules.js';

let tab = 'hooks'; let hf = { fw: '', pr: '' };
export default function view() { return { title: 'Marketing', render }; }
function render() {
  const root = h('div'); const body = h('div');
  const tabs = [['hooks', 'Banco de ganchos'], ['lab', 'Laboratorio de copy'], ['mix', 'Mix y frecuencia'], ['links', 'Enlaces y UTM'], ['rules', 'Reglas de marca']];
  const draw = () => { mount(root, h('div', { class: 'tabs', role: 'tablist' }, tabs.map(([k, l]) => h('button', { role: 'tab', 'aria-selected': String(k === tab), onclick: () => { tab = k; draw(); } }, l))), body); mount(body, ({ hooks, lab, mix, links, rules })[tab]()); };
  draw(); return root;
}
function hooks() {
  const ctx = { area: 'London', service: 'a move' };
  const list = HOOKS.filter((k) => (!hf.fw || k.fw === hf.fw) && (!hf.pr || k.pr === hf.pr));
  const box = h('div');
  const f = h('div', { class: 'row wrap', style: { marginBottom: '14px' } }, select([{ value: '', label: 'Todos los marcos' }, ...Object.entries(FRAMEWORKS).map(([value, label]) => ({ value, label }))], hf.fw, (v) => { hf.fw = v; mount(box.parentNode, hooks()); }), select([{ value: '', label: 'Todos los principios' }, ...Object.entries(PRINCIPLES).map(([value, label]) => ({ value, label }))], hf.pr, (v) => { hf.pr = v; mount(box.parentNode, hooks()); }), h('span', { class: 'grow' }), h('span', { class: 'small muted' }, `${list.length} ganchos`));
  mount(box, h('div', { class: 'grid cols-2' }, list.map((k) => h('div', { class: 'card card-pad stack sm' }, h('div', { class: 'bold' }, fillHook(k.text, ctx)), h('div', { class: 'row wrap' }, pill(FRAMEWORKS[k.fw]), pill(PRINCIPLES[k.pr], 'info'), pill(CATEGORIES[k.cat], 'brand')), h('div', { class: 'row' }, h('button', { class: 'btn sm', onclick: () => copyText(fillHook(k.text, ctx)) }, icon('copy', 13), 'Copiar'))))));
  return h('div', null, callout('info', h('b', null, 'Neuromarketing sin trucos: '), 'cada gancho usa un principio real (prueba social, aversión a la pérdida, especificidad…). Sin precios, sin urgencia falsa y sin promesas que no puedas cumplir: en servicios locales la confianza convierte más que el susto.'), h('div', { style: { height: '14px' } }), f, box);
}
function lab() {
  const S = state.settings; const st = { mode: 'full', fw: 'mistake', area: 'London', service: SERVICES[0], format: 'ig_feed', custom: '', tags: 'removals, london', cat: '' };
  const out = h('div', { class: 'stack' });
  const run = () => {
    const pool = HOOKS.filter((k) => k.fw === st.fw); const ctx = { area: st.area, service: st.service, tags: st.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    mount(out, pool.slice(0, 3).map((k) => { const r = buildCopy({ mode: st.mode, hook: k, ctx, settings: S, format: st.format, custom: st.custom }); const li = lintCopy(r.caption, st.format, S);
      return h('div', { class: 'card card-pad stack sm' }, h('div', { style: { whiteSpace: 'pre-wrap' } }, r.caption || '(vacío en modo sin neuromarketing: escribe tu texto base)'), r.notes.map((n) => h('div', { class: 'small muted' }, n)), li.map((i) => h('div', { class: 'small', style: { color: 'var(--warn)' } }, i.msg)), h('div', { class: 'row' }, pill(PRINCIPLES[k.pr], 'info'), pill(`${r.caption.length} car.`), h('span', { class: 'grow' }), h('button', { class: 'btn sm', onclick: () => copyText(r.caption) }, icon('copy', 13), 'Copiar'))); }));
  };
  const inp = (key, label, type = 'text') => field(label, h('input', { type, value: st[key], oninput: (e) => { st[key] = e.target.value; run(); } }));
  const sel = (key, label, opts) => field(label, select(opts, st[key], (v) => { st[key] = v; run(); }));
  run();
  return h('div', { class: 'grid', style: { gridTemplateColumns: '340px 1fr' } }, h('div', { class: 'card card-pad stack' }, sel('mode', 'Estilo', [{ value: 'none', label: 'Sin neuromarketing' }, { value: 'light', label: 'Suave' }, { value: 'full', label: 'Completo' }]), sel('fw', 'Marco', Object.entries(FRAMEWORKS).map(([value, label]) => ({ value, label }))), sel('format', 'Formato', [{ value: 'wa_status', label: 'Estado de WhatsApp' }, { value: 'ig_feed', label: 'Instagram feed' }, { value: 'fb_post', label: 'Facebook' }, { value: 'ig_story', label: 'Historia' }]), inp('area', 'Zona'), sel('service', 'Servicio', SERVICES.map((v) => ({ value: v, label: v }))), inp('custom', 'Texto base (opcional)'), inp('tags', 'Hashtags (máx. 3 se usan)'), h('p', { class: 'small muted' }, 'Genera variantes con plantillas verificadas, no con IA: son predecibles y cumplen tus reglas. Edítalas siempre antes de publicar.')), out);
}
function mix() {
  const S = state.settings; const m = contentMix(state); const target = S.mix; const tot = Object.values(target).reduce((a, b) => a + b, 0);
  return h('div', { class: 'grid cols-2' }, h('div', { class: 'card card-pad stack' }, h('h2', null, 'Mix objetivo'), h('p', { class: 'small muted' }, 'Reparto ideal de tu contenido. La suma debe ser 100.'),
    Object.entries(CATEGORIES).map(([k, l]) => field(`${l}: ${target[k]}%`, h('input', { type: 'range', min: 0, max: 100, step: 5, value: target[k], oninput: (e) => { e.target.previousSibling.textContent = `${l}: ${e.target.value}%`; }, onchange: (e) => setSettings({ mix: { [k]: +e.target.value } }) }))), tot !== 100 ? callout('warn', `Suma ${tot}%, debería ser 100%.`) : null),
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Real vs objetivo (±30 días)'), m.n ? h('div', { class: 'bars' }, Object.entries(CATEGORIES).map(([k, l]) => { const diff = m.pct[k] - target[k]; return h('div', { class: 'bar-row' }, h('span', null, l), h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: `${m.pct[k]}%` } }), h('div', { class: 'bar-target', style: { left: `${target[k]}%` } })), h('span', { style: { color: Math.abs(diff) > 15 ? 'var(--warn)' : 'var(--muted)' } }, `${m.pct[k]}%`)); })) : h('p', { class: 'muted' }, 'Aún no hay publicaciones clasificadas.'), m.n ? h('p', { class: 'small muted' }, `Basado en ${m.n} publicaciones con categoría.`) : null),
    h('div', { class: 'card card-pad stack', style: { gridColumn: '1 / -1' } }, h('h2', null, 'Frecuencia y ventanas de prueba'), h('p', { class: 'small muted' }, 'Hipótesis de partida para un negocio de mudanzas en UK. No son datos de tu cuenta: pruébalas 3-4 semanas y quédate con lo que funcione.'),
      SLOT_HYPOTHESES.map((s) => h('div', { class: 'row small' }, pill(s.time, 'brand'), h('span', null, `${s.dow.map((d) => 'LMXJVSD'[d - 1]).join(' ')} · ${s.why}`))),
      h('ul', { class: 'small muted', style: { margin: '8px 0 0', paddingLeft: '18px' } }, h('li', null, 'Estados de WhatsApp: 1 a 3 al día por número es el techo razonable; más y la gente silencia tu estado.'), h('li', null, 'Historias de Instagram: 3 a 5 al día se ven como una secuencia; una sola suelta rinde peor.'), h('li', null, 'Feed y Facebook: 3 a 4 por semana con calidad. La constancia pesa más que el volumen.'))));
}
function links() {
  const S = state.settings; const st = { phone: S.brand.phone || '', msg: 'Hi Mooveto, I would like a quote for a move on ', base: S.brand.site || '', source: 'instagram', medium: 'social', campaign: 'organic-stories', content: '' };
  const wa = h('div', { class: 'mono', style: { wordBreak: 'break-all' } }); const ut = h('div', { class: 'mono', style: { wordBreak: 'break-all' } });
  const run = () => { wa.textContent = st.phone ? waLink(st.phone, st.msg) : 'Escribe el número con prefijo de país'; ut.textContent = utmLink(st.base, st) || 'URL no válida'; };
  const inp = (k, l) => field(l, h('input', { type: 'text', value: st[k], oninput: (e) => { st[k] = e.target.value; run(); } })); run();
  return h('div', { class: 'grid cols-2' }, h('div', { class: 'card card-pad stack' }, h('h2', null, 'Enlace de WhatsApp con mensaje'), inp('phone', 'Número (con prefijo, ej. 447…)'), inp('msg', 'Mensaje inicial'), wa, h('button', { class: 'btn sm', style: { alignSelf: 'flex-start' }, onclick: () => copyText(wa.textContent) }, icon('copy', 13), 'Copiar')),
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Enlace con UTM'), inp('base', 'URL'), h('div', { class: 'grid cols-2' }, inp('source', 'Fuente'), inp('medium', 'Medio')), h('div', { class: 'grid cols-2' }, inp('campaign', 'Campaña'), inp('content', 'Contenido (diseño)')), ut, h('button', { class: 'btn sm', style: { alignSelf: 'flex-start' }, onclick: () => copyText(ut.textContent) }, icon('copy', 13), 'Copiar'), h('p', { class: 'small muted' }, 'Los enlaces en historias no se pueden añadir por API: úsalos en la bio, el feed o pégalos en el chat.')));
}
function rules() {
  const L = state.settings.lint;
  const row = (k, l, d) => h('div', { class: 'row' }, h('div', { class: 'grow' }, h('b', null, l), h('div', { class: 'small muted' }, d)), h('input', { type: 'checkbox', checked: L[k] !== false, 'aria-label': l, onchange: (e) => setSettings({ lint: { [k]: e.target.checked } }) }));
  return h('div', { class: 'card card-pad stack', style: { maxWidth: '720px' } }, h('h2', null, 'Reglas de marca (linter de copy)'), h('p', { class: 'small muted' }, 'Se comprueban mientras escribes y bloquean nada, pero avisan. Vienen de la guía de voz de Mooveto.'), row('noEmDash', 'Sin guiones largos', 'Evita — y – en los textos.'), row('noPrices', 'Sin precios exactos', 'Invita a pedir presupuesto en lugar de publicar tarifas.'),
    field(`Máximo de hashtags: ${L.maxHashtags}`, h('input', { type: 'range', min: 0, max: 10, value: L.maxHashtags, oninput: (e) => (e.target.previousSibling.textContent = `Máximo de hashtags: ${e.target.value}`), onchange: (e) => setSettings({ lint: { maxHashtags: +e.target.value } }) })), h('p', { class: 'small muted' }, 'Siempre activas: sin política, sin competidores, inglés británico, 40-120 palabras en feed, tono cercano y concreto.'));
}
