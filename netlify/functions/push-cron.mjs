// Corre todos os minutos (função agendada). Envia Web Push para lembretes de água, hábitos e suplementos.
// Lê o estado guardado na base de dados: assim que algo é marcado como concluído, deixa de ser enviado.
import webpush from 'web-push';
import { U, S, H, HJ } from './lib/auth.mjs';
import { dueFor, localParts } from './lib/due.mjs';

export const config = { schedule: '* * * * *' };

const get = async (p) => { const r = await fetch(U + '/rest/v1/' + p, { headers: H() }); const j = await r.json().catch(() => []); return Array.isArray(j) ? j : []; };

export default async () => {
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  if (!U || !S || !pub || !priv) { console.log('push-cron: faltam SUPABASE_URL / SUPABASE_SERVICE_KEY / VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY'); return; }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@zone5.example.com', pub, priv);

  const subs = await get('push_subs?select=*');
  if (!subs.length) return;
  const ids = [...new Set(subs.map((s) => s.user_id))];
  const rows = await get(`user_data?user_id=in.(${ids.join(',')})&select=user_id,data`);
  let sent = 0;

  for (const uid of ids) {
    const data = rows.find((r) => r.user_id === uid)?.data;
    if (!data) continue;
    const mine = subs.filter((s) => s.user_id === uid);
    const { date, hm } = localParts(mine[mine.length - 1].tz || 'Europe/Lisbon');
    for (const it of dueFor(data, date, hm)) {
      // deduplicação atómica: só envia se a inserção for nova
      const ins = await fetch(U + '/rest/v1/push_log?on_conflict=user_id,k', { method: 'POST', headers: HJ({ Prefer: 'resolution=ignore-duplicates,return=representation' }), body: JSON.stringify({ user_id: uid, k: it.k }) });
      const row = ins.ok ? await ins.json().catch(() => []) : [];
      if (!Array.isArray(row) || !row.length) continue;
      const payload = JSON.stringify({ title: it.title, body: it.body, tag: it.tag, url: '/' });
      for (const s of mine) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 1800, urgency: 'high' }); sent++; }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) await fetch(`${U}/rest/v1/push_subs?id=eq.${s.id}`, { method: 'DELETE', headers: H() }); else console.log('push erro', e.statusCode || e.message); }
      }
    }
  }
  if (new Date().getUTCMinutes() === 0) await fetch(`${U}/rest/v1/push_log?created_at=lt.${encodeURIComponent(new Date(Date.now() - 2 * 864e5).toISOString())}`, { method: 'DELETE', headers: H() });
  if (sent) console.log('push-cron: enviados', sent);
};
