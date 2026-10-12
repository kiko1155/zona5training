// Middleware partilhado: validação de ambiente, sessão e permissões de admin.
export const U = process.env.SUPABASE_URL;
export const S = process.env.SUPABASE_SERVICE_KEY;
export const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
export const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));
export const missingEnv = () => (!U || !S ? json({ error: 'Configuração em falta no Netlify: SUPABASE_URL e/ou SUPABASE_SERVICE_KEY' }, 500) : null);
// Chaves novas do Supabase (sb_secret_...) vão só em "apikey"; chaves legacy (JWT) também em Authorization.
export const H = () => (S.startsWith('sb_') ? { apikey: S } : { apikey: S, Authorization: 'Bearer ' + S });
export const HJ = (extra) => ({ ...H(), 'Content-Type': 'application/json', ...(extra || {}) });

export async function getUser(req) {
  const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!t) return null;
  const r = await fetch(U + '/auth/v1/user', { headers: { apikey: S, Authorization: 'Bearer ' + t } });
  return r.ok ? r.json() : null;
}
export async function profileOf(id) {
  const r = await fetch(`${U}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,role,username,name`, { headers: H() });
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j[0] || null : null;
}
// Devolve { user } ou { res } (resposta de erro pronta a devolver).
export async function requireUser(req) {
  const e = missingEnv();
  if (e) return { res: e };
  const user = await getUser(req);
  return user ? { user } : { res: json({ error: 'Sessão inválida ou expirada. Volta a entrar.' }, 401) };
}
export async function requireAdmin(req) {
  const a = await requireUser(req);
  if (a.res) return a;
  const profile = await profileOf(a.user.id);
  if (!profile || profile.role !== 'admin') return { res: json({ error: 'Sem permissão: requer conta de administrador.' }, 403) };
  return { user: a.user, profile };
}
