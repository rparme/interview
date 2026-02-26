-- ── Subscription status ───────────────────────────────────────────────────────

alter table public.profiles
  add column is_subscribed boolean not null default false;

-- Mark seed account as always subscribed (production Supabase where user exists).
-- No-op on a fresh local DB — user doesn't exist yet, so the sub-select returns NULL.
update public.profiles
set is_subscribed = true
where id = (select id from auth.users where email = 'romaric.parmentier@gmail.com');

-- Re-create ensure_profile() so that on lazy profile creation in local dev the seed
-- account is automatically granted is_subscribed = true.
-- For all other users: inserts with false (default), no update on conflict.
-- For the seed user: inserts with true, and upgrades existing rows if still false.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  _is_seed boolean;
begin
  select (email = 'romaric.parmentier@gmail.com')
  into _is_seed
  from auth.users
  where id = auth.uid();

  insert into public.profiles (id, is_subscribed)
  values (auth.uid(), coalesce(_is_seed, false))
  on conflict (id) do update
    set is_subscribed = true
    where excluded.is_subscribed = true;
end;
$$;
