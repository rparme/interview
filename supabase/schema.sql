-- ── Reference data (public, no auth required) ───────────────────────────────

create table public.categories (
  id     text primary key,
  name   text not null,
  lines  text[] not null,
  color  text not null
);

create table public.problems (
  lc           integer primary key,
  category_id  text    not null references public.categories(id),
  title        text    not null,
  difficulty   text    not null check (difficulty in ('Easy','Medium','Hard')),
  url          text    not null,
  how_to       text[]  not null,
  when_to      text[]  not null
);

-- ── User data ────────────────────────────────────────────────────────────────

-- One profile row per authenticated user.
-- Referenced by user_progress so all app FKs stay within the public schema,
-- avoiding direct dependencies on GoTrue's internal auth.users schema.
-- Rows are created automatically by the trigger below — never inserted manually.
create table public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.user_progress (
  user_id uuid        not null references public.profiles(id) on delete cascade,
  lc      integer     not null references public.problems(lc)  on delete cascade,
  done_at timestamptz not null default now(),
  primary key (user_id, lc)
);

-- ── Row-level security ────────────────────────────────────────────────────────

alter table public.categories    enable row level security;
alter table public.problems      enable row level security;
alter table public.profiles      enable row level security;
alter table public.user_progress enable row level security;

-- Reference tables: anyone (including anonymous) can read
create policy "categories_read_all" on public.categories    for select using (true);
create policy "problems_read_all"   on public.problems      for select using (true);

-- Profiles: each user can only read their own row
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

-- Progress: each user can only read and manage their own rows
create policy "progress_select_own" on public.user_progress
  for select using (auth.uid() = user_id);
create policy "progress_insert_own" on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy "progress_delete_own" on public.user_progress
  for delete using (auth.uid() = user_id);

-- ── Auto-create profile on signup ─────────────────────────────────────────────

-- Runs as the function owner (postgres superuser) so it can INSERT into profiles
-- regardless of RLS, and fires synchronously in GoTrue's signup transaction.
-- By the time the client receives the access token, the profile row is committed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
