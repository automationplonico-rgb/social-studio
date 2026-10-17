import { h, icon, field, select, callout, toast, confirmDialog, download, mount } from '../ui.js';
import { state, setSettings, load } from '../store.js';
import * as api from '../api.js';
import { TZS, fmtDateTime } from '../tz.js';
const driveIdFrom = (v) => { const m = String(v || '').match(/folders\/([A-Za-z0-9_-]{10,})/) || String(v || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) || String(v || '').trim().match(/^([A-Za-z0-9_-]{15,})$/); return m ? m[1] : ''; };

export default function view() { return { title: 'Ajustes', live: false, render }; }
function render() {
  const S = state.settings; const B = S.brand; const G = S.guard;
  const num = (k, l, min, max) => field(l, h('input', { type: 'number', min, max, value: G[k], onchange: (e) => setSettings({ guard: { [k]: +e.target.value } }) }));
  const cfg = api.getCfg(); const base = h('input', { type: 'url', value: cfg.base, placeholder: 'https://n8n.alchimedia.co.uk/webhook/social-studio' }); const key = h('input', { type: 'password', value: cfg.key, autocomplete: 'off' }); const res = h('div');
  return h('div', { class: 'stack lg', style: { maxWidth: '860px' } },
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Marca'), h('div', { class: 'grid cols-2' }, field('Nombre', h('input', { type: 'text', value: B.name, onchange: (e) => setSettings({ brand: { name: e.target.value } }) })), field('Sitio web', h('input', { type: 'url', value: B.site, onchange: (e) => setSettings({ brand: { site: e.target.value } }) }))),
      h('div', { class: 'grid cols-2' }, field('Teléfono / WhatsApp de contacto', h('input', { type: 'text', value: B.phone, placeholder: '447…', onchange: (e) => setSettings({ brand: { phone: e.target.value } }) })), field('Color de marca', h('div', { class: 'row' }, h('input', { type: 'color', value: B.color, 'aria-label': 'Color de marca', oninput: (e) => setSettings({ brand: { color: e.target.value } }) }), h('span', { class: 'small muted' }, 'Cambia el color de toda la interfaz.')))),
      field('Pruebas de confianza (una por línea; se usan en el copy "Completo")', h('textarea', { rows: 4, onchange: (e) => setSettings({ brand: { proof: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) } }) }, B.proof.join('\n')), 'Solo afirma lo que puedas demostrar: reseñas reales, seguros vigentes, conductores verificados.')),
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Zona horaria y apariencia'), h('div', { class: 'grid cols-2' }, field('Zona horaria de publicación', select(TZS.map((v) => ({ value: v, label: v })), S.tz, (v) => setSettings({ tz: v }))), field('Tema', select([{ value: 'auto', label: 'Automático (sistema)' }, { value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }], S.theme, (v) => setSettings({ theme: v }))))),
    h('div', { class: 'card card-pad stack' }, h('div', { class: 'row' }, icon('shield', 18), h('h2', null, 'Límites de seguridad')), h('p', { class: 'small muted' }, 'Protegen tus cuentas (sobre todo WhatsApp) de parecer un bot. Valores prudentes por defecto: no los subas sin motivo.'),
      h('div', { class: 'grid cols-3' }, num('waMaxPerDay', 'Estados WhatsApp por día y número', 1, 10), num('waMinGapMin', 'Separación mínima entre estados (min)', 5, 360), num('jitterMin', 'Variación aleatoria de hora (± min)', 0, 60), num('igMaxStoriesPerDay', 'Historias Instagram por día', 1, 20), num('fbMaxPostsPerDay', 'Publicaciones Facebook por día', 1, 10)),
      h('div', { class: 'grid cols-2' }, field('Silencio desde', h('input', { type: 'time', value: G.quietFrom, onchange: (e) => setSettings({ guard: { quietFrom: e.target.value } }) })), field('Silencio hasta', h('input', { type: 'time', value: G.quietTo, onchange: (e) => setSettings({ guard: { quietTo: e.target.value } }) })))),
    driveCard(S),
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Conexión con n8n'), h('p', { class: 'small muted' }, 'Sin esto el panel funciona en modo demo (nada se publica). La URL y la clave se guardan solo en este navegador.'),
      field('URL del webhook', base), field('Clave del panel (X-Studio-Key)', key), res,
      h('div', { class: 'row' }, h('button', { class: 'btn', onclick: async () => { api.setCfg(base.value, key.value); try { const r = await api.health(); mount(res, callout('ok', `Conectado. ${r.version ? 'Versión ' + r.version : ''}`)); } catch (e) { mount(res, callout('err', `No se pudo conectar: ${e.message}`)); } } }, 'Probar conexión'),
        h('button', { class: 'btn primary', onclick: async () => { api.setCfg(base.value, key.value); await load(); toast(api.mode() === 'remote' ? 'Conectado a n8n' : 'Modo demo', 'ok'); location.reload(); } }, 'Guardar y recargar'))),
    h('div', { class: 'card card-pad stack' }, h('h2', null, 'Datos'), h('div', { class: 'row wrap' }, h('button', { class: 'btn', onclick: () => download(`social-studio-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ accounts: state.accounts, assets: state.assets.map(({ url, ...a }) => a), posts: state.posts, rules: state.rules, settings: state.settings }, null, 2)) }, icon('download', 14), 'Exportar copia (sin archivos)'),
      api.mode() === 'demo' ? h('button', { class: 'btn danger', onclick: async () => { if (await confirmDialog('Se borrarán los datos y diseños de este navegador.', 'Borrar todo', true)) { api.wipeLocal(); location.reload(); } } }, 'Borrar datos demo') : null)));
}

function driveCard(S) {
  const D = S.drive || {}; const sync = state.driveSync; const inp = h('input', { type: 'text', value: D.folderId || '', placeholder: 'https://drive.google.com/drive/folders/…' });
  const res = h('div');
  return h('div', { class: 'card card-pad stack' }, h('h2', null, 'Carpeta de Google Drive'),
    h('p', { class: 'small muted' }, 'Los diseños de esta carpeta (y de sus subcarpetas directas) se copian solos a la biblioteca cada 5 minutos. Solo se IMPORTA: Studio nunca borra, mueve ni publica nada de tu Drive, y lo que ya importó no se repite (se compara por contenido).'),
    field('Carpeta (enlace o ID)', inp, D.folderName ? `Actual: ${D.folderName}` : null), res,
    h('label', { class: 'row' }, h('input', { type: 'checkbox', checked: D.enabled !== false, onchange: (e) => setSettings({ drive: { enabled: e.target.checked } }) }), 'Sincronizar automáticamente'),
    sync ? h('div', { class: 'small muted' }, `Última sincronización: ${fmtDateTime(sync.at, S.tz)} · ${sync.found} archivos vistos · ${sync.queued} nuevos importados o en cola · ${sync.known} ya conocidos · ${sync.dupMd5} repetidos por contenido · ${sync.type} no son imagen/vídeo`) : h('div', { class: 'small muted' }, 'Aún no se ha sincronizado (necesita la credencial de Google Drive en n8n).'),
    h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => { const id = driveIdFrom(inp.value); if (!id) { mount(res, callout('err', 'No reconozco ese enlace. Pega la URL de la carpeta (…/folders/XXXX).')); return; } setSettings({ drive: { folderId: id, folderName: '' } }); mount(res, callout('ok', 'Carpeta guardada. La próxima sincronización (≤5 min) la usará.')); } }, 'Guardar carpeta')));
}
