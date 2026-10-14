import { h, icon, pill, platBadge, openModal, confirmDialog, toast, callout, field, mount } from '../ui.js';
import { state, upsert, remove, uid, load } from '../store.js';
import * as api from '../api.js';
import { rel } from '../tz.js';

export default function view() { return { title: 'Cuentas', render }; }

const STATUS = { connected: ['Conectada', 'ok'], pending: ['Esperando escaneo', 'info'], expired: ['Acceso caducado', 'err'], disconnected: ['Desconectada', 'err'] };
function accRow(a) {
  const [txt, kind] = STATUS[a.status] || ['?', ''];
  return h('div', { class: 'list-item' }, platBadge(a.platform, true), h('div', { class: 'grow' }, h('b', null, a.label), h('div', { class: 'small muted' }, `${a.handle || ''}${a.simulated ? ' · demo' : ''}`),
    a.expiresAt ? h('div', { class: 'tiny', style: { color: a.expiresAt - Date.now() < 7 * 864e5 ? 'var(--warn)' : 'var(--faint)' } }, `Acceso ${a.expiresAt < Date.now() ? 'caducó' : 'caduca'} ${rel(a.expiresAt)}`) : null),
    pill(txt, kind), a.status !== 'connected' && a.platform !== 'whatsapp' ? h('button', { class: 'btn sm', onclick: () => connect(a.platform) }, 'Reconectar') : null,
    h('button', { class: 'btn sm ghost danger', onclick: async () => { if (await confirmDialog(`¿Desconectar "${a.label}"? Las publicaciones programadas hacia esta cuenta fallarán.`, 'Desconectar', true)) { if (api.mode() === 'remote') { try { await api.accountDisconnect(a.id); } catch (e) { toast(e.message, 'err'); return; } await load(); } else remove('accounts', a.id); } } }, 'Quitar'));
}
function render() {
  const by = (p) => state.accounts.filter((a) => a.platform === p); const remote = api.mode() === 'remote';
  return h('div', { class: 'stack lg' },
    !remote ? callout('warn', h('b', null, 'Modo demo: '), 'las conexiones son simuladas. Para conectar de verdad, configura tu n8n en ', h('a', { href: '#/settings' }, 'Ajustes'), '.') : null,
    section('whatsapp', 'WhatsApp (estados asistidos)', 'Hasta dos números. Sin conexión: no se enlaza ninguna sesión.', by('whatsapp'), h('button', { class: 'btn primary', onclick: addWa }, icon('plus', 16), 'Añadir número'),
      callout('info', h('b', null, 'Cómo funciona: '), 'WhatsApp no ofrece API oficial para publicar estados y los métodos no oficiales pueden suspender el número, así que Studio NO publica en WhatsApp por su cuenta. A la hora programada te avisa por correo con el diseño y el texto listos: pulsas "Compartir", eliges Estado y marcas "Ya lo publiqué". Es lo único 100% seguro para tu número.')),
    section('instagram', 'Instagram', 'Cuenta Business o Creator vinculada a una página de Facebook.', by('instagram'), h('button', { class: 'btn primary', onclick: () => connect('meta') }, icon('plus', 16), 'Conectar con Meta (Instagram + Facebook)'),
      callout('info', 'Por API se publican fotos y vídeos como historia, feed y Reel. No se pueden añadir stickers, enlaces ni música a las historias: esos elementos deben ir dentro del diseño.')),
    section('facebook', 'Facebook (páginas)', 'Páginas que administras.', by('facebook'), null,
      callout('info', h('b', null, 'Meta: '), 'mientras tu app de Meta esté en modo Desarrollo y las cuentas pertenezcan a administradores/probadores de la app, no necesitas pasar la revisión de la app. Los tokens de página derivados de un token de larga duración no caducan, pero se invalidan si cambias la contraseña o quitas permisos.')));
}
const section = (pl, title, sub, accs, btn, note) => h('div', { class: 'card' }, h('div', { class: 'card-head' }, platBadge(pl, true), h('div', { class: 'grow' }, h('h2', null, title), h('div', { class: 'small muted' }, sub)), btn),
  accs.length ? accs.map(accRow) : h('div', { class: 'card-pad muted' }, 'Sin cuentas conectadas.'), note ? h('div', { class: 'card-pad', style: { borderTop: '1px solid var(--line)' } }, note) : null);

function connect(kind) { return meta(api.mode() === 'remote'); }
function addWa() {
  const label = h('input', { type: 'text', value: state.accounts.filter((a) => a.platform === 'whatsapp').length ? 'WhatsApp 2' : 'WhatsApp 1', 'aria-label': 'Nombre' }); const num = h('input', { type: 'text', placeholder: '+44 7…', 'aria-label': 'Número' });
  if (state.accounts.filter((a) => a.platform === 'whatsapp').length >= 2) return toast('Ya tienes dos números. Quita uno para añadir otro.', 'err');
  openModal({ title: 'Añadir número de WhatsApp', body: h('div', { class: 'stack' }, field('Nombre interno', label), field('Número (opcional, solo para identificarlo)', num)), actions: [{ label: 'Cancelar' }, { label: 'Añadir', kind: 'primary', onClick: () => { upsert('accounts', { id: uid('acc'), platform: 'whatsapp', label: label.value.trim() || 'WhatsApp', handle: num.value.trim(), status: 'connected', engine: 'manual' }); } }] });
}
function meta(remote) {
  if (!remote) return openModal({ title: 'Conectar con Meta (demo)', body: callout('warn', 'En modo demo se añaden cuentas de ejemplo. En remoto se abre el inicio de sesión de Meta.'), actions: [{ label: 'Cancelar' }, { label: 'Simular conexión', kind: 'primary', onClick: () => { const have = (p) => state.accounts.some((a) => a.platform === p); if (!have('instagram')) upsert('accounts', { id: uid('acc'), platform: 'instagram', label: 'Instagram', handle: '@mooveto', status: 'connected', simulated: true, expiresAt: Date.now() + 58 * 864e5 }); if (!have('facebook')) upsert('accounts', { id: uid('acc'), platform: 'facebook', label: 'Facebook Page', handle: 'Mooveto', status: 'connected', simulated: true, expiresAt: Date.now() + 58 * 864e5 }); } }] });
  api.connectStart('meta').then((r) => { if (r.authUrl) { window.open(r.authUrl, '_blank', 'noopener'); toast('Completa el inicio de sesión en la pestaña nueva y vuelve aquí', 'ok'); const t = setInterval(async () => { await load(); }, 5000); setTimeout(() => clearInterval(t), 120000); } else toast('El servidor no devolvió la URL de Meta', 'err'); }).catch((e) => toast(e.message, 'err'));
}
