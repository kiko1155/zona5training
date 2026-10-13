// Lógica pura de "o que deve ser notificado agora" (usada pelo cron e testável sem rede).
export const mins = (s) => { const m = /^(\d{1,2}):(\d{2})$/.exec(s || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
export function localParts(tz, now = new Date()) {
  let f;
  try { f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  catch { f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Lisbon', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); }
  const p = Object.fromEntries(f.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hm: (+p.hour) * 60 + (+p.minute) };
}
export function slots(from, to, ev) {
  const a = mins(from), b = mins(to), e = Number(ev);
  if (a == null || b == null || !(e >= 1)) return [];
  const out = []; for (let m = a; m <= b; m += e * 60) out.push(m); return out;
}
export const waterState = (d, date) => {
  const goal = d.waterGoal || 2500, tot = (d.water || {})[date] || 0;
  return { goal, tot, done: tot >= goal || !!(d.waterDone || {})[date] };
};
// window: minutos de tolerância após a hora marcada (o cron pode atrasar-se); a deduplicação garante 1 envio.
export function dueFor(d, date, hm, window = 2) {
  const out = [], hit = (m) => hm >= m && hm - m <= window;
  const wr = Object.assign({ on: true, from: '07:00', to: '21:00', ev: 1 }, d.wrem || {});
  const w = waterState(d, date);
  if (wr.on && !w.done) for (const m of slots(wr.from, wr.to, wr.ev)) if (hit(m)) out.push({ k: `w|${date}|${m}`, title: 'Hora de beber água 💧', body: `Já bebeste ${w.tot} de ${w.goal} ml hoje.`, tag: `z5-w-${date}-${m}` });
  for (const h of d.habits || []) {
    const r = (d.hrem || {})[h];
    if (!r || ((d.hlog || {})[date] || []).includes(h)) continue;
    for (const m of slots(r.from || '07:00', r.to || '21:00', r.ev)) if (hit(m)) out.push({ k: `h|${date}|${h}|${m}`, title: 'Hábito pendente', body: h, tag: `z5-h-${date}-${h}-${m}` });
  }
  for (const s of d.supps || []) {
    const m = mins(s.tm);
    if (m != null && hit(m) && !((d.slog || {})[date] || []).includes(s.n)) out.push({ k: `s|${date}|${s.n}|${m}`, title: 'Suplemento: ' + s.n, body: `${s.d || 'Hora da toma'} · ${s.tm}`, tag: `z5-s-${date}-${s.n}-${m}` });
  }
  return out;
}
