-- Zone5Training v3 — corre no Supabase → SQL Editor (pode ser executado mais do que uma vez)

-- 1) Subscrições de notificações push + registo de envios (só acessíveis pelas funções do servidor)
create table if not exists push_subs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  tz text default 'Europe/Lisbon',
  created_at timestamptz default now()
);
create table if not exists push_log (
  user_id uuid not null references auth.users on delete cascade,
  k text not null,
  created_at timestamptz default now(),
  primary key (user_id, k)
);
alter table push_subs enable row level security;
alter table push_log enable row level security;
-- (sem políticas de propósito: nem os clientes nem a chave anon conseguem ler estas tabelas)

-- 2) Permissões completas de admin sobre os dados dos utilizadores
drop policy if exists "admin apaga dados" on user_data;
create policy "admin apaga dados" on user_data for delete using (is_admin());
drop policy if exists "admin apaga perfis" on profiles;
create policy "admin apaga perfis" on profiles for delete using (is_admin());

-- 3) Diagnóstico: devem aparecer o teu admin (role = admin) e os clientes
select username, role from profiles order by role, username;
