// Subscrições Web Push do dispositivo do utilizador autenticado.
import { U, HJ, json, requireUser } from './lib/auth.mjs';
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  const a = await requireUser(req);
  if (a.res) return a.res;
  const b = await req.json().catch(() => ({}));
  if (b.action === 'key') {
    const k = process.env.VAPID_PUBLIC_KEY;
    return k ? json({ key: k }) : json({ error: 'Falta VAPID_PUBLIC_KEY no Netlify' }, 500);
  }
  if (b.action === 'subscribe') {
    const s = b.sub || {}, ek = s.keys || {};
    if (!/^https:\/\//.test(s.endpoint || '') || !ek.p256dh || !ek.auth) return json({ error: 'Subscrição inválida' }, 400);
    const tz = typeof b.tz === 'string' && b.tz.length < 60 ? b.tz : 'Europe/Lisbon';
    const r = await fetch(U + '/rest/v1/push_subs?on_conflict=endpoint', { method: 'POST', headers: HJ({ Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify({ user_id: a.user.id, endpoint: s.endpoint, p256dh: ek.p256dh, auth: ek.auth, tz }) });
    return r.ok ? json({ ok: true }) : json({ error: 'Erro a guardar a subscrição (corriste o supabase-v3.sql?)' }, 500);
  }
  if (b.action === 'unsubscribe') {
    if (!b.endpoint) return json({ ok: true });
    await fetch(`${U}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(b.endpoint)}&user_id=eq.${a.user.id}`, { method: 'DELETE', headers: HJ() });
    return json({ ok: true });
  }
  return json({ error: 'Ação inválida' }, 400);
};
