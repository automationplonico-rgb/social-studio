import { h, icon, pill, empty, callout } from '../ui.js';
import { state, setSettings, attention, emit } from '../store.js';
import { seedDemo } from '../demo.js';
import * as api from '../api.js';
import { contentMix } from '../marketing.js';
import { CATEGORIES } from '../rules.js';
import { dayKey, fromInputs, rel } from '../tz.js';
import { statusPill, targetBadges, thumb, when, postDetail, retryFailed, pendingManual, manualModal } from './shared.js';
import { statusPillFor } from './shared.js';
import { assetOf } from '../rules.js';

export default function view() {
  return { title: 'Resumen', actions: [h('a', { class: 'btn primary', href: '#/studio/new' }, icon('plus', 16), 'Nueva publicación')], render };
}
function render() {
  const now = Date.now(); const S = state.settings; const P = state.posts;
  const next7 = P.filter((p) => p.status === 'scheduled' && p.scheduledAt >= now && p.scheduledAt < now + 7 * 864e5);
  const pub30 = P.filter((p) => p.status === 'published' && p.scheduledAt > now - 30 * 864e5);
  const att = attention();
  const connected = state.accounts.filter((a) => a.status === 'connected').length;
  const steps = [
    { done: connected > 0, label: 'Conecta tus cuentas', hint: 'WhatsApp (1 o 2 números), Instagram y Facebook', href: '#/accounts' },
    { done: state.assets.length > 0, label: 'Sube tus diseños', hint: 'Arrastra imágenes o vídeos a la biblioteca', href: '#/library' },
    { done: P.length > 0 || state.rules.length > 0, label: 'Crea tu primera publicación o regla', hint: 'Manual en "Crear" o automática en "Automatizar"', href: '#/studio/new' },
    { done: api.mode() === 'remote', label: 'Conecta n8n para publicar de verdad', hint: 'Sin esto el panel solo simula', href: '#/settings' },
  ];
  const onboarding = !S.onboardingDismissed && !steps.every((s) => s.done)
    ? h('div', { class: 'card card-pad stack', style: { marginBottom: '16px' } },
      h('div', { class: 'row' }, h('h2', { class: 'grow' }, 'Puesta en marcha'), h('button', { class: 'btn ghost sm', onclick: () => setSettings({ onboardingDismissed: true }) }, 'Ocultar')),
      h('div', { class: 'grid cols-4' }, steps.map((s, i) => h('a', { href: s.href, class: 'card card-pad', style: { textDecoration: 'none', color: 'inherit', boxShadow: 'none', borderColor: s.done ? 'var(--ok)' : 'var(--line)' } },
        h('div', { class: 'row' }, h('span', { class: `pill ${s.done ? 'ok' : ''}` }, s.done ? icon('check', 12) : i + 1), h('b', null, s.label)), h('p', { class: 'small muted', style: { marginTop: '6px' } }, s.hint)))),
      !state.assets.length && api.mode() === 'demo' ? h('div', null, h('button', { class: 'btn', onclick: async (e) => { e.target.disabled = true; await seedDemo(); } }, icon('sparkle', 16), 'Cargar datos de ejemplo')) : null)
    : null;

  const kpi = (v, l, kind) => h('div', { class: 'card kpi' }, h('div', { class: 'v', style: kind === 'err' && v ? { color: 'var(--err)' } : {} }, v), h('div', { class: 'l' }, l));
  // atención
  const items = [];
  for (const p of att.failed) items.push({ k: 'err', t: `Falló: ${p.title || 'publicación'} (${when(p)})`, d: (p.results.find((r) => !r.ok) || {}).error || 'Revisa los detalles', a: [h('button', { class: 'btn sm', onclick: () => retryFailed(p) }, 'Reintentar'), h('button', { class: 'btn sm ghost', onclick: () => postDetail(p) }, 'Ver')] });
  for (const { post: p, target } of pendingManual().filter((x) => x.post.scheduledAt <= now + 3600e3).slice(0, 5)) items.push({ k: 'warn', t: `Estado de WhatsApp por publicar: ${p.title || 'diseño'} (${when(p)})`, d: 'WhatsApp no permite publicarlo solo: tienes el diseño y el texto listos.', a: [h('button', { class: 'btn sm primary', onclick: () => manualModal(p, target) }, 'Hacer ahora')] });
  for (const a of att.accounts) items.push({ k: a.status === 'connected' ? 'warn' : 'err', t: a.status === 'connected' ? `${a.label}: el acceso caduca pronto` : `${a.label}: ${a.status === 'expired' ? 'acceso caducado' : 'desconectada'}`, d: a.status === 'connected' ? `Caduca ${rel(a.expiresAt)}. Reconecta antes para no perder publicaciones.` : 'No se publicará nada en esta cuenta hasta reconectar.', a: [h('a', { class: 'btn sm', href: '#/accounts' }, 'Ir a cuentas')] });
  for (const p of P.filter((x) => x.problem && x.status === 'draft')) items.push({ k: 'warn', t: `Borrador automático por revisar: ${p.title}`, d: p.problem, a: [h('a', { class: 'btn sm', href: `#/studio/${p.id}` }, 'Revisar')] });
  const toApprove = P.filter((p) => p.ruleId && p.approved !== true && p.status === 'scheduled' && p.scheduledAt > now);
  if (toApprove.length) items.push({ k: 'warn', t: `${toApprove.length} publicaciones automáticas esperan tu aprobación`, d: 'No saldrán hasta que las apruebes (ábrelas en el calendario y pulsa Aprobar).', a: [h('a', { class: 'btn sm primary', href: '#/calendar' }, 'Revisar')] });
  const gaps = []; for (let i = 0; i < 7; i++) { const k = dayKey(now + i * 864e5, S.tz); if (!P.some((p) => p.status === 'scheduled' && p.scheduledAt && dayKey(p.scheduledAt, S.tz) === k)) gaps.push(k); }
  if (connected && gaps.length >= 3) items.push({ k: 'warn', t: `${gaps.length} de los próximos 7 días no tienen nada programado`, d: 'La constancia pesa más que el volumen. Rellena la cola o activa una regla.', a: [h('a', { class: 'btn sm', href: '#/automation' }, 'Automatizar')] });
  const mix = contentMix(state);
  return h('div', { class: 'stack lg' }, onboarding,
    h('div', { class: 'grid cols-4' }, kpi(next7.length, 'Programadas · próximos 7 días'), kpi(pub30.length, 'Publicadas · últimos 30 días'), kpi(att.failed.length, 'Con fallos', 'err'), kpi(`${connected}/${state.accounts.length}`, 'Cuentas conectadas')),
    h('div', { class: 'grid', style: { gridTemplateColumns: 'minmax(0,3fr) minmax(0,2fr)' } },
      h('div', { class: 'stack lg' },
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Requiere atención'), items.length ? pill(items.length, 'err') : null),
          items.length ? items.map((it) => h('div', { class: 'list-item' }, h('span', { class: `dot ${it.k}` }), h('div', { class: 'grow' }, h('b', null, it.t), h('div', { class: 'small muted' }, it.d)), h('div', { class: 'row' }, it.a))) : h('div', { class: 'card-pad' }, callout('ok', 'Todo en orden: cuentas conectadas, sin fallos y cola cubierta.'))),
        h('div', { class: 'card' }, h('div', { class: 'card-head' }, h('h2', null, 'Próximas publicaciones'), h('a', { class: 'btn sm ghost', href: '#/calendar' }, 'Ver calendario')),
          next7.length ? next7.sort((a, b) => a.scheduledAt - b.scheduledAt).slice(0, 6).map((p) => h('button', { class: 'list-item', style: { width: '100%', background: 'none', border: 0, borderBottom: '1px solid var(--line)', textAlign: 'left', cursor: 'pointer' }, onclick: () => postDetail(p) },
            h('div', { style: { width: '40px', height: '50px', borderRadius: '6px', overflow: 'hidden', flex: 'none' } }, thumb(assetOf(state, p.assetId), '')), h('div', { class: 'grow' }, h('b', null, p.title || 'Sin título'), h('div', { class: 'small muted' }, `${when(p)} · ${rel(p.scheduledAt)}`)), targetBadges(p), statusPillFor(p))) : empty('calendar', 'Nada programado', 'Crea una publicación o activa una regla para llenar la cola.', h('a', { class: 'btn primary', href: '#/studio/new' }, 'Crear publicación')))),
      h('div', { class: 'card card-pad stack' }, h('h2', null, 'Mix de contenido (±30 días)'), h('p', { class: 'small muted' }, 'Línea negra = objetivo. Un feed solo de ofertas cansa; solo de consejos no vende.'),
        mix.n ? h('div', { class: 'bars' }, Object.entries(CATEGORIES).map(([k, l]) => h('div', { class: 'bar-row' }, h('span', null, l), h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: { width: `${mix.pct[k]}%` } }), h('div', { class: 'bar-target', style: { left: `${S.mix[k]}%` } })), h('span', { class: 'muted' }, `${mix.pct[k]}% / ${S.mix[k]}%`)))) : h('p', { class: 'muted' }, 'Sin datos todavía.'),
        h('p', { class: 'small muted' }, 'Mide el efecto real en Meta Business Suite: este panel publica pero no lee alcance ni clics.'))));
}
