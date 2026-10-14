// Banco de ganchos, generador de copy y utilidades de marketing. Inglés británico (se publica en UK), sin guiones largos, sin precios.
export const PRINCIPLES = {
  loss: 'Aversión a la pérdida', proof: 'Prueba social', authority: 'Autoridad', curiosity: 'Curiosidad / bucle abierto', specific: 'Especificidad',
  reciprocity: 'Reciprocidad', effort: 'Reducir fricción', pratfall: 'Honestidad (efecto pratfall)', local: 'Cercanía local',
};
export const FRAMEWORKS = { checklist: 'Checklist', mistake: 'Error a evitar', beforeafter: 'Antes y después', behind: 'Detrás de cámaras', myth: 'Mito vs realidad', proof: 'Prueba / reseña', local: 'Local / zona', season: 'Temporada (solo si es real)' };
// category enlaza con el mix de contenido
export const HOOKS = [
  { id: 'h01', fw: 'mistake', pr: 'loss', cat: 'education', text: 'The #1 mistake people make when booking a removal in {area}.' },
  { id: 'h02', fw: 'mistake', pr: 'loss', cat: 'education', text: 'Booking a man and van without checking this? You could be uninsured.' },
  { id: 'h03', fw: 'mistake', pr: 'curiosity', cat: 'education', text: 'Three things your removal quote should always include. Number 2 gets missed a lot.' },
  { id: 'h04', fw: 'checklist', pr: 'effort', cat: 'education', text: 'Moving day checklist: print it, stick it on the fridge, relax.' },
  { id: 'h05', fw: 'checklist', pr: 'effort', cat: 'education', text: 'What to pack first (and last) when moving {service}.' },
  { id: 'h06', fw: 'checklist', pr: 'reciprocity', cat: 'education', text: 'Free tip: label boxes by room AND by priority. Your future self will thank you.' },
  { id: 'h07', fw: 'myth', pr: 'authority', cat: 'education', text: 'Myth: the cheapest quote is the best deal. Here is what usually gets left out.' },
  { id: 'h08', fw: 'myth', pr: 'authority', cat: 'education', text: 'Myth: you need to be home all day on moving day. You do not.' },
  { id: 'h09', fw: 'proof', pr: 'proof', cat: 'proof', text: 'Rated 4.9 out of 5 by customers across {area}. Here is what they keep saying.' },
  { id: 'h10', fw: 'proof', pr: 'proof', cat: 'proof', text: '"Careful, on time and fully insured." Another happy move in {area}.' },
  { id: 'h11', fw: 'proof', pr: 'specific', cat: 'proof', text: 'Today: a 2 bed flat in {area}, loaded, driven and unloaded with zero scratches.' },
  { id: 'h12', fw: 'beforeafter', pr: 'effort', cat: 'proof', text: 'Before: a flat full of boxes. After: everything in place by dinner.' },
  { id: 'h13', fw: 'beforeafter', pr: 'specific', cat: 'proof', text: 'Stairs, tight corners, no parking. Still done in one trip. Watch how.' },
  { id: 'h14', fw: 'behind', pr: 'authority', cat: 'behind', text: 'How we wrap a sofa so it arrives looking brand new.' },
  { id: 'h15', fw: 'behind', pr: 'curiosity', cat: 'behind', text: 'Ever wondered how a driver plans a day of back to back moves? Quick look.' },
  { id: 'h16', fw: 'behind', pr: 'pratfall', cat: 'behind', text: 'We are not the biggest firm. We are the one that turns up when we say we will.' },
  { id: 'h17', fw: 'behind', pr: 'authority', cat: 'behind', text: 'Meet the team: verified drivers who treat your things like their own.' },
  { id: 'h18', fw: 'local', pr: 'local', cat: 'offer', text: 'Moving around {area} this month? We have slots open.' },
  { id: 'h19', fw: 'local', pr: 'local', cat: 'offer', text: '{area} movers: need a van this week? Message us your date.' },
  { id: 'h20', fw: 'local', pr: 'effort', cat: 'offer', text: 'Need {service}? Send us a few details and we reply with a clear quote.' },
  { id: 'h21', fw: 'season', pr: 'loss', cat: 'offer', text: 'Weekend slots go first. If you are moving at the end of the month, book early.' },
  { id: 'h22', fw: 'season', pr: 'effort', cat: 'offer', text: 'Student move out dates are close. Sort your van before everyone else does.' },
  { id: 'h23', fw: 'proof', pr: 'authority', cat: 'proof', text: 'Fully insured. Verified drivers. 24/7 support. Because moving is stressful enough.' },
  { id: 'h24', fw: 'mistake', pr: 'specific', cat: 'education', text: 'Do not forget to measure the doorway before the sofa goes on the van.' },
];
export const SERVICES = ['man and van', 'house removals', 'furniture delivery', 'student moves', 'flat moves', 'packing help'];
export const hookById = (id) => HOOKS.find((h) => h.id === id);
export const fillHook = (text, ctx) => text.replaceAll('{area}', ctx.area || 'London').replaceAll('{service}', ctx.service || 'a move');

// ---------- generador ----------
// mode: none | light | full. Devuelve { caption, overlay, notes[] } adaptado al formato.
export function buildCopy({ mode, hook, ctx = {}, settings, format, custom = '' }) {
  const B = settings.brand; const cta = ctx.cta || defaultCta(format, B);
  const hookText = hook ? fillHook(hook.text, ctx) : '';
  const proof = (B.proof || []).slice(0, 2).join('. ');
  const notes = []; let caption = '';
  const isStory = format === 'ig_story' || format === 'fb_story';
  if (mode === 'none') caption = custom;
  else if (mode === 'light') caption = [hookText, custom, cta].filter(Boolean).join('\n\n');
  else caption = [hookText, custom || bodyFor(hook, ctx), proof ? proof + '.' : '', cta].filter(Boolean).join('\n\n');
  if (format === 'wa_status') caption = shorten(caption, 260);
  if (isStory) { notes.push('En historias el texto no se publica por API: grábalo en el diseño. Aquí tienes el texto sugerido para el diseño.'); }
  if (format === 'ig_feed' || format === 'fb_post') { const tags = (ctx.tags || []).slice(0, settings.lint?.maxHashtags ?? 3).map((t) => '#' + t.replace(/^#/, '')); if (tags.length) caption += '\n\n' + tags.join(' '); }
  return { caption: caption.trim(), overlay: shorten(hookText, 70), notes };
}
function defaultCta(format, B) {
  if (format === 'wa_status') return 'Message us for a quote.';
  if (format === 'ig_story' || format === 'fb_story') return 'Get a quote: link in bio.';
  const site = (B.site || '').replace(/^https?:\/\//, '');
  return site ? `Get your quote at ${site} or message us.` : 'Message us for a quote.';
}
function bodyFor(hook, ctx) {
  const by = { checklist: 'Save this for moving day.', mistake: 'A small check now saves a big headache later.', myth: 'Ask any quote what is included before you say yes.', beforeafter: 'Same day, no fuss.', behind: 'Small details, big difference.', proof: 'Real moves, real customers.', local: 'We cover your area every day.', season: 'Dates fill up.' };
  return by[hook?.fw] || '';
}
const shorten = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

// ---------- mix de contenido ----------
export function contentMix(state, days = 30, now = Date.now()) {
  const since = now - days * 864e5; const counts = { proof: 0, education: 0, offer: 0, behind: 0 }; let n = 0;
  for (const p of state.posts) {
    if (!['published', 'scheduled'].includes(p.status) || !p.scheduledAt || p.scheduledAt < since || p.scheduledAt > now + days * 864e5) continue;
    const a = state.assets.find((x) => x.id === p.assetId); const c = p.category || a?.category; if (counts[c] == null) continue; counts[c]++; n++;
  }
  return { counts, n, pct: Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, n ? Math.round((v / n) * 100) : 0])) };
}
// ---------- enlaces ----------
export const waLink = (phone, text) => `https://wa.me/${String(phone).replace(/\D/g, '')}${text ? '?text=' + encodeURIComponent(text) : ''}`;
export function utmLink(base, { source, medium, campaign, content }) {
  try { const u = new URL(base); const set = (k, v) => v && u.searchParams.set(k, String(v).toLowerCase().replace(/\s+/g, '-')); set('utm_source', source); set('utm_medium', medium); set('utm_campaign', campaign); set('utm_content', content); return u.toString(); } catch { return ''; }
}
// Ventanas de publicación sugeridas: HIPÓTESIS para empezar a probar (no son datos de la cuenta). Se sustituyen por datos reales al medir.
export const SLOT_HYPOTHESES = [
  { dow: [1, 2, 3, 4, 5], time: '07:45', why: 'Trayecto de la mañana: gente planificando en el móvil.' },
  { dow: [1, 2, 3, 4, 5], time: '12:30', why: 'Pausa de comida.' },
  { dow: [1, 2, 3, 4, 5, 7], time: '19:30', why: 'Tarde-noche: es cuando se decide y se pide presupuesto.' },
  { dow: [6, 7], time: '10:30', why: 'Fin de semana: la gente piensa en la mudanza de la semana siguiente.' },
];
