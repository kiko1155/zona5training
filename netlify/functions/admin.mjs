// Gestão de clientes (só admin): criar, mudar password, apagar.
const U = process.env.SUPABASE_URL, S = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: S, Authorization: 'Bearer ' + S, 'Content-Type': 'application/json' };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
async function caller(req) {
  const t = (req.headers.get('authorization') || '').replace('Bearer ', '');
  const r = await fetch(U + '/auth/v1/user', { headers: { apikey: S, Authorization: 'Bearer ' + t } });
  return r.ok ? r.json() : null;
}
async function isAdmin(id) {
  const r = await fetch(`${U}/rest/v1/profiles?id=eq.${id}&select=role`, { headers: H });
  const j = await r.json();
  return j[0]?.role === 'admin';
}
export default async (req) => {
  if (req.method !== 'POST') return J({ error: 'Método inválido' }, 405);
  const u = await caller(req);
  if (!u || !(await isAdmin(u.id))) return J({ error: 'Sem permissão' }, 403);
  const b = await req.json();
  if (b.action === 'create') {
    const username = String(b.username || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '');
    if (!username || String(b.password || '').length < 6) return J({ error: 'Username e password (mín. 6 caracteres)' }, 400);
    const r = await fetch(U + '/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email: username + '@zone5.example.com', password: b.password, email_confirm: true }) });
    const n = await r.json();
    if (!r.ok) return J({ error: n.msg || n.message || 'Erro ao criar (username já existe?)' }, 400);
    const p = await fetch(U + '/rest/v1/profiles', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ id: n.id, username, name: b.name || username, role: 'client' }) });
    if (!p.ok) { await fetch(`${U}/auth/v1/admin/users/${n.id}`, { method: 'DELETE', headers: H }); return J({ error: 'Erro ao criar perfil' }, 400); }
    return J({ ok: true });
  }
  if (b.action === 'password') {
    if (String(b.password || '').length < 6) return J({ error: 'Password curta' }, 400);
    const r = await fetch(`${U}/auth/v1/admin/users/${b.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ password: b.password }) });
    return r.ok ? J({ ok: true }) : J({ error: 'Erro ao mudar password' }, 400);
  }
  if (b.action === 'delete') {
    if (b.id === u.id) return J({ error: 'Não podes apagar a tua conta' }, 400);
    const r = await fetch(`${U}/auth/v1/admin/users/${b.id}`, { method: 'DELETE', headers: H });
    return r.ok ? J({ ok: true }) : J({ error: 'Erro ao apagar' }, 400);
  }
  return J({ error: 'Ação inválida' }, 400);
};
