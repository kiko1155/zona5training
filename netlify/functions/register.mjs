// Registo público de utilizadores comuns. A conta é sempre role 'client'.
// Desliga o registo definindo ALLOW_REGISTRATION=false no Netlify.
const U = process.env.SUPABASE_URL, S = process.env.SUPABASE_SERVICE_KEY;
const H = { apikey: S, Authorization: 'Bearer ' + S, 'Content-Type': 'application/json' };
const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
const RESERVED = ['admin', 'administrador', 'administrator', 'root', 'zone5', 'suporte'];
export default async (req) => {
  if (req.method !== 'POST') return J({ error: 'Método inválido' }, 405);
  if (process.env.ALLOW_REGISTRATION === 'false') return J({ error: 'Registo desativado. Contacta o teu PT.' }, 403);
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || '').toLowerCase();
  const password = String(b.password || '');
  if (!/^[a-z0-9_.-]{3,30}$/.test(username) || RESERVED.includes(username)) return J({ error: 'Username inválido (3–30 caracteres: letras, números, _ . -)' }, 400);
  if (password.length < 8 || password.length > 72) return J({ error: 'A password deve ter entre 8 e 72 caracteres' }, 400);
  const r = await fetch(U + '/auth/v1/admin/users', { method: 'POST', headers: H, body: JSON.stringify({ email: username + '@zone5.example.com', password, email_confirm: true }) });
  const n = await r.json();
  if (!r.ok) return J({ error: 'Esse username já existe' }, 400);
  const name = String(b.name || username).slice(0, 60);
  const p = await fetch(U + '/rest/v1/profiles', { method: 'POST', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ id: n.id, username, name, role: 'client' }) });
  if (!p.ok) { await fetch(`${U}/auth/v1/admin/users/${n.id}`, { method: 'DELETE', headers: H }); return J({ error: 'Erro ao criar perfil' }, 400); }
  return J({ ok: true });
};
