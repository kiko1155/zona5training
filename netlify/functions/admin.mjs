// Rotas de administração. Todas passam por requireAdmin (sessão + papel 'admin' lido na base de dados).
import { U, H, HJ, json, requireAdmin, profileOf, isUuid } from './lib/auth.mjs';

const rest = (p, o = {}) => fetch(U + '/rest/v1/' + p, { ...o, headers: HJ(o.headers) });
const cleanPlans = (p) => {
  const o = {};
  for (let d = 0; d < 7; d++) {
    const x = p && p[d];
    if (x && typeof x === 'object') {
      const exs = (Array.isArray(x.exs) ? x.exs : []).map((s) => String(s).trim().slice(0, 80)).filter(Boolean).slice(0, 40);
      const name = String(x.name || '').slice(0, 60);
      if (name || exs.length) o[d] = { name, exs };
    }
  }
  return o;
};
// O Supabase recusa apagar um utilizador que ainda tem ficheiros no Storage: apaga primeiro as fotos.
async function purgePhotos(id) {
  for (let i = 0; i < 20; i++) {
    const r = await fetch(`${U}/storage/v1/object/list/photos`, { method: 'POST', headers: HJ(), body: JSON.stringify({ prefix: id + '/', limit: 1000 }) });
    const l = r.ok ? await r.json().catch(() => []) : [];
    if (!Array.isArray(l) || !l.length) return true;
    const d = await fetch(`${U}/storage/v1/object/photos`, { method: 'DELETE', headers: HJ(), body: JSON.stringify({ prefixes: l.map((f) => id + '/' + f.name) }) });
    if (!d.ok) return false;
  }
  return true;
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  const a = await requireAdmin(req);
  if (a.res) return a.res;
  const b = await req.json().catch(() => ({}));

  if (b.action === 'ping') return json({ ok: true, admin: a.profile.username });

  if (b.action === 'create') {
    const username = String(b.username || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!username || String(b.password || '').length < 6) return json({ error: 'Username e password (mín. 6 caracteres)' }, 400);
    const r = await fetch(U + '/auth/v1/admin/users', { method: 'POST', headers: HJ(), body: JSON.stringify({ email: username + '@zone5.example.com', password: b.password, email_confirm: true }) });
    const n = await r.json().catch(() => ({}));
    if (!r.ok) return json({ error: n.msg || n.message || 'Erro ao criar (username já existe?)' }, 400);
    const p = await rest('profiles', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: n.id, username, name: String(b.name || username).slice(0, 60), role: 'client' }) });
    if (!p.ok) { await fetch(`${U}/auth/v1/admin/users/${n.id}`, { method: 'DELETE', headers: H() }); return json({ error: 'Erro ao criar perfil' }, 400); }
    return json({ ok: true, id: n.id });
  }

  if (!isUuid(b.id)) return json({ error: 'Identificador de utilizador inválido' }, 400);
  const target = await profileOf(b.id);
  if (!target) return json({ error: 'Utilizador não encontrado' }, 404);

  if (b.action === 'password') {
    if (String(b.password || '').length < 6) return json({ error: 'Password curta (mín. 6 caracteres)' }, 400);
    const r = await fetch(`${U}/auth/v1/admin/users/${b.id}`, { method: 'PUT', headers: HJ(), body: JSON.stringify({ password: b.password }) });
    const j = await r.json().catch(() => ({}));
    return r.ok ? json({ ok: true }) : json({ error: j.msg || j.message || 'Erro ao mudar a password' }, 400);
  }

  if (b.action === 'delete') {
    if (b.id === a.user.id) return json({ error: 'Não podes apagar a tua própria conta' }, 400);
    if (target.role === 'admin') return json({ error: 'Contas de administrador não podem ser apagadas aqui' }, 400);
    if (!(await purgePhotos(b.id))) return json({ error: 'Não consegui apagar as fotos do utilizador' }, 500);
    const r = await fetch(`${U}/auth/v1/admin/users/${b.id}`, { method: 'DELETE', headers: H() });
    const j = await r.json().catch(() => ({}));
    return r.ok ? json({ ok: true }) : json({ error: j.msg || j.message || 'Erro ao apagar a conta' }, 400);
  }

  if (b.action === 'assign-plan') {
    if (target.role !== 'client') return json({ error: 'Só é possível atribuir planos a clientes' }, 400);
    const plans = cleanPlans(b.plans);
    const g = await rest(`user_data?user_id=eq.${b.id}&select=data`);
    const rows = g.ok ? await g.json().catch(() => []) : [];
    const data = Object.assign({}, rows[0]?.data || {}, { plans });
    const w = await rest('user_data?on_conflict=user_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ user_id: b.id, data, updated_at: new Date().toISOString() }) });
    return w.ok ? json({ ok: true, dias: Object.keys(plans).length }) : json({ error: 'Erro ao guardar o plano' }, 500);
  }
  return json({ error: 'Ação inválida' }, 400);
};
