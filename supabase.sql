-- Zone5Training: corre isto no Supabase → SQL Editor → New query → Run

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  name text,
  role text not null default 'client' check (role in ('admin','client')),
  pt text default '',
  gym text default ''
);
create table user_data (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

create or replace function is_admin() returns boolean
language sql security definer set search_path = public stable as
$$ select exists (select 1 from profiles where id = auth.uid() and role = 'admin') $$;

alter table profiles enable row level security;
alter table user_data enable row level security;

create policy "ver perfil" on profiles for select using (id = auth.uid() or is_admin());
create policy "admin altera perfis" on profiles for update using (is_admin()) with check (is_admin());
create policy "ver dados" on user_data for select using (user_id = auth.uid() or is_admin());
create policy "criar dados" on user_data for insert with check (user_id = auth.uid() or is_admin());
create policy "atualizar dados" on user_data for update using (user_id = auth.uid() or is_admin()) with check (user_id = auth.uid() or is_admin());

-- Fotos (bucket privado; cada pasta = id do utilizador)
insert into storage.buckets (id, name, public) values ('photos','photos',false) on conflict do nothing;
create policy "fotos ver" on storage.objects for select using (bucket_id='photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "fotos criar" on storage.objects for insert with check (bucket_id='photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "fotos atualizar" on storage.objects for update using (bucket_id='photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
create policy "fotos apagar" on storage.objects for delete using (bucket_id='photos' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
