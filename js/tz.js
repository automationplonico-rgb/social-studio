// Zonas horarias sin librerías: todo se guarda en UTC (ms) y se muestra/edita en la zona de la marca (Europe/London).
const DOW = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const fmtCache = new Map();
function fmt(tz) {
  if (!fmtCache.has(tz)) fmtCache.set(tz, new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }));
  return fmtCache.get(tz);
}
export function parts(ms, tz) {
  const o = {};
  for (const p of fmt(tz).formatToParts(ms)) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, h: +o.hour, mi: +o.minute, dow: DOW[o.weekday] };
}
// Hora de pared en `tz` -> instante UTC (ms). Tres pasadas bastan, incluso en el cambio de hora.
export function zonedToUtc(y, m, d, h, mi, tz) {
  const target = Date.UTC(y, m - 1, d, h, mi);
  let guess = target;
  for (let i = 0; i < 3; i++) {
    const p = parts(guess, tz);
    guess += target - Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
  }
  return guess;
}
const pad = (n) => String(n).padStart(2, '0');
export const dayKey = (ms, tz) => { const p = parts(ms, tz); return `${p.y}-${pad(p.m)}-${pad(p.d)}`; };
export const timeStr = (ms, tz) => { const p = parts(ms, tz); return `${pad(p.h)}:${pad(p.mi)}`; };
export function fromInputs(dateStr, time, tz) {
  const [y, m, d] = dateStr.split('-').map(Number); const [h, mi] = time.split(':').map(Number);
  return zonedToUtc(y, m, d, h, mi, tz);
}
export function fmtDateTime(ms, tz, opts = {}) {
  return new Intl.DateTimeFormat('es-ES', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', ...opts }).format(ms);
}
export const fmtDay = (ms, tz) => new Intl.DateTimeFormat('es-ES', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' }).format(ms);
export function rel(ms, now = Date.now()) {
  const d = ms - now, min = Math.round(Math.abs(d) / 60000);
  if (min < 1) return 'ahora';
  const txt = min < 60 ? `${min} min` : min < 60 * 36 ? `${Math.round(min / 60)} h` : `${Math.round(min / 1440)} d`;
  return d > 0 ? `en ${txt}` : `hace ${txt}`;
}
// Rejilla de 6 semanas (lunes primero) del mes y, en la zona de la marca.
export function monthGrid(y, m, tz) {
  const first = zonedToUtc(y, m, 1, 12, 0, tz);
  const dow = parts(first, tz).dow;
  const start = first - (dow - 1) * 86400000;
  return Array.from({ length: 42 }, (_, i) => { const ms = start + i * 86400000; const p = parts(ms, tz); return { key: dayKey(ms, tz), d: p.d, inMonth: p.m === m, noon: ms }; });
}
export const TZS = ['Europe/London', 'Europe/Madrid', 'America/Bogota', 'America/Mexico_City', 'UTC'];
