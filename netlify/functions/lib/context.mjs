// Constrói o contexto real do atleta (plano, cargas, nutrição, hidratação, hábitos, biometria) para o Treinador IA.
const num = (v) => { const x = parseFloat(String(v).replace(',', '.')); return Number.isFinite(x) ? x : 0; };
const rir = (r) => Math.max(0, 10 - r);
const pct = (reps, r) => { const t = reps + rir(r); return t <= 1 ? 1 : 1 / (1 + t / 30); };
const e1 = (w, reps, r) => w / pct(reps, r);
const tgt = (o, reps, r) => Math.round((o * pct(reps, r)) / 2.5) * 2.5;
const DOW = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const wdOf = (s) => new Date(s + 'T12:00:00Z').getUTCDay();
const addDays = (s, n) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const wkStart = (s) => addDays(s, -((wdOf(s) + 6) % 7));
const exName = (s) => { const t = String(s), i = t.indexOf('|'); return (i < 0 ? t : t.slice(0, i)).trim(); };
const r1 = (v) => Math.round(v * 10) / 10;
const sum = (a) => a.reduce((x, y) => x + y, 0);
const avg = (a) => (a.length ? sum(a) / a.length : 0);
const TGT = { kcal: 2800, p: 165, c: 340, f: 80 }, TGR = { kcal: 2300, p: 165, c: 240, f: 75 };
const mealTot = (m) => { const all = Object.values(m || {}).flat(); return { k: sum(all.map((x) => num(x.kcal))), p: sum(all.map((x) => num(x.p))), n: all.length }; };

export function planFor(d, date) {
  const a = (d.adj || {})[date];
  if (a && a.name) return { name: a.name, exs: a.exs || [], adjusted: true, orig: a.orig };
  return (d.plans || {})[wdOf(date)];
}
export function buildContext(d, today, readiness) {
  const L = [], S = d.sessions || [];
  const wk0 = wkStart(today);
  L.push(`Hoje: ${today} (${DOW[wdOf(today)]}).` + (d.profile && d.profile.age ? ` Idade: ${d.profile.age} anos.` : ''));

  L.push('PLANO SEMANAL:');
  for (const dw of [1, 2, 3, 4, 5, 6, 0]) {
    const p = (d.plans || {})[dw];
    L.push(`- ${DOW[dw]}: ${p && (p.name || (p.exs || []).length) ? `${p.name || 'treino'}${(p.exs || []).length ? ' — ' + p.exs.slice(0, 8).map(exName).join('; ') : ''}` : 'descanso/sem plano'}`);
  }
  const tp = planFor(d, today);
  L.push(`Treino de hoje: ${tp && tp.name ? tp.name + (tp.adjusted ? ` (ajustado por prontidão baixa; original: ${tp.orig})` : '') : 'sem plano definido'}.`);
  const done = S.filter((s) => wkStart(s.d) === wk0).sort((a, b) => (a.d < b.d ? -1 : 1));
  L.push(`Sessões feitas esta semana (${done.length}): ${done.map((s) => `${s.d} ${s.plan || ''}`.trim()).join('; ') || 'nenhuma'}.`);

  const recent = [...S].sort((a, b) => (a.d < b.d ? 1 : -1)).slice(0, 10);
  L.push('SESSÕES RECENTES (kg×reps@RPE):');
  for (const s of recent) L.push(`- ${s.d} ${s.plan || 'sessão'} (${s.dur || '?'} min, RPE ${s.rpe}): ` + (s.ex || []).slice(0, 6).map((e) => `${e.n} ` + (e.s || []).slice(0, 6).map((x) => `${x[0]}×${x[1]}@${x[2] || s.rpe}`).join(', ')).join(' | '));
  if (!recent.length) L.push('- (sem sessões registadas)');

  // estatísticas por exercício (últimas 8 semanas)
  const by = {}, since = addDays(today, -56);
  for (const s of S) if (s.d >= since) for (const e of s.ex || []) (by[e.n] = by[e.n] || []).push({ d: s.d, rpe: s.rpe, s: e.s || [] });
  const top = Object.entries(by).sort((a, b) => sum(b[1].map((x) => x.s.length)) - sum(a[1].map((x) => x.s.length))).slice(0, 6);
  L.push('EXERCÍCIOS PRINCIPAIS (8 semanas):');
  for (const [n, es] of top) {
    es.sort((a, b) => (a.d < b.d ? 1 : -1));
    const best = (x) => Math.max(0, ...x.s.map((t) => e1(num(t[0]), num(t[1]), num(t[2]) || x.rpe)));
    const last = es[0], now = Math.max(0, ...es.filter((x) => x.d >= addDays(today, -14)).map(best)), old = Math.max(0, ...es.filter((x) => x.d < addDays(today, -28) && x.d >= addDays(today, -56)).map(best));
    const vol = [0, 1, 2, 3].map((i) => Math.round(sum(es.filter((x) => x.d <= addDays(today, -7 * i) && x.d > addDays(today, -7 * (i + 1))).map((x) => sum(x.s.map((t) => num(t[0]) * num(t[1])))))));
    const top1 = last.s.slice().sort((a, b) => num(b[0]) - num(a[0]))[0] || [0, 0];
    const f4 = es.filter((x) => x.d >= addDays(today, -28)).length;
    L.push(`- ${n}: ${r1(f4 / 4)} sessões/semana; última ${last.d} (melhor série ${top1[0]}×${top1[1]}); e1RM recente ${now ? r1(now) : '—'} kg${old ? ` (há 4+ semanas: ${r1(old)} kg)` : ''}; volume semanal últimas 4 sem. (kg, recente→antigo): ${vol.join(', ')}` + (now ? `; cargas sugeridas @RPE 8: 5 reps ${tgt(now, 5, 8)} kg, 8 reps ${tgt(now, 8, 8)} kg` : ''));
  }
  if (!top.length) L.push('- (sem dados)');

  // nutrição
  const g = d.tg || {}, trainDay = ((d.dtype || {})[today]) ? d.dtype[today] === 'train' : S.some((s) => s.d === today) || !!(tp && (tp.exs || []).length);
  const G = trainDay ? Object.assign({}, TGT, d.targets || {}, g.train || {}) : Object.assign({}, TGR, g.rest || {});
  const days = [...Array(7)].map((_, i) => addDays(today, -i - 1)).filter((x) => mealTot((d.meals || {})[x]).n);
  const t0 = mealTot((d.meals || {})[today]);
  L.push(`NUTRIÇÃO: meta hoje (${trainDay ? 'dia de treino' : 'dia de descanso'}) ${G.kcal} kcal, ${G.p} g proteína. Hoje até agora: ${Math.round(t0.k)} kcal, ${Math.round(t0.p)} g proteína. Média dos últimos 7 dias com registo (${days.length} dias): ${days.length ? Math.round(avg(days.map((x) => mealTot(d.meals[x]).k))) + ' kcal, ' + Math.round(avg(days.map((x) => mealTot(d.meals[x]).p))) + ' g proteína' : 'sem registos'}.`);

  const goal = d.waterGoal || 2500, wd7 = [...Array(7)].map((_, i) => addDays(today, -i - 1));
  L.push(`HIDRATAÇÃO: hoje ${((d.water || {})[today]) || 0}/${goal} ml; meta cumprida em ${wd7.filter((x) => ((d.water || {})[x] || 0) >= goal || (d.waterDone || {})[x]).length}/7 dias.`);
  const hb = d.habits || [];
  if (hb.length) L.push('HÁBITOS (últimos 7 dias): ' + hb.slice(0, 8).map((h) => `${h} ${wd7.filter((x) => ((d.hlog || {})[x] || []).includes(h)).length}/7`).join('; ') + '.');

  const bio = d.bio || {}, b0 = bio[today], bk = Object.keys(bio).filter((k) => k < today).sort().slice(-7).map((k) => bio[k]);
  const bl = (f) => { const v = bk.map((x) => num(x[f])).filter((x) => x > 0); return v.length ? r1(avg(v)) : null; };
  L.push('BIOMETRIA: ' + (b0 ? `hoje HRV ${b0.hrv || '—'} ms, sono ${b0.sleep || '—'} h, FC repouso ${b0.rhr || '—'} bpm${b0.src === 'mock' ? ' (dados simulados)' : ''}` : 'sem dados hoje') + `; médias 7 dias: HRV ${bl('hrv') ?? '—'}, sono ${bl('sleep') ?? '—'}, FC repouso ${bl('rhr') ?? '—'}.` + (readiness && readiness.score != null ? ` Readiness Score hoje: ${readiness.score}/100 (${readiness.level}).` : ''));
  return L.join('\n').slice(0, 9000);
}
