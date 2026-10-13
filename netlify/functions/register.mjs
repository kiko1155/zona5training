// Registo público de utilizadores comuns (sempre role 'client'). ALLOW_REGISTRATION=false desliga.
import { U, HJ, H, json, missingEnv } from './lib/auth.mjs';
const RESERVED = ['admin', 'administrador', 'administrator', 'root', 'zone5', 'suporte'];
export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Método inválido' }, 405);
  const e = missingEnv(); if (e) return e;
  if (process.env.ALLOW_REGISTRATION === 'false') return json({ error: 'Registo desativado. Contacta o teu PT.' }, 403);
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || '').toLowerCase(), password = String(b.password || '');
  if (!/^[a-z0-9_.-]{3,30}$/.test(username) || RESERVED.includes(username)) return json({ error: 'Username inválido (3–30 caracteres: letras, números, _ . -)' }, 400);
  if (password.length < 8 || password.length > 72) return json({ error: 'A password deve ter entre 8 e 72 caracteres' }, 400);
  const r = await fetch(U + '/auth/v1/admin/users', { method: 'POST', headers: HJ(), body: JSON.stringify({ email: username + '@zone5.example.com', password, email_confirm: true }) });
  const n = await r.json().catch(() => ({}));
  if (!r.ok) return json({ error: 'Esse username já existe' }, 400);
  const p = await fetch(U + '/rest/v1/profiles', { method: 'POST', headers: HJ({ Prefer: 'return=minimal' }), body: JSON.stringify({ id: n.id, username, name: String(b.name || username).slice(0, 60), role: 'client' }) });
  if (!p.ok) { await fetch(`${U}/auth/v1/admin/users/${n.id}`, { method: 'DELETE', headers: H() }); return json({ error: 'Erro ao criar perfil' }, 400); }
  return json({ ok: true });
};
