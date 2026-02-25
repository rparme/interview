-- ── AI-generated exercises (per user, per category) ──────────────────────────

create table public.generated_exercises (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  category_id  text        not null references public.categories(id) on delete cascade,
  title        text        not null,
  description  text        not null,
  examples     jsonb       not null default '[]',
  constraints  jsonb       not null default '[]',
  starter_code text        not null default '',
  unit_tests   text        not null default '',
  difficulty   text        not null default 'Medium'
                           check (difficulty in ('Easy', 'Medium', 'Hard')),
  created_at   timestamptz not null default now()
);

alter table public.generated_exercises enable row level security;

create policy "gen_exercises_select_own" on public.generated_exercises
  for select using (auth.uid() = user_id);
create policy "gen_exercises_insert_own" on public.generated_exercises
  for insert with check (auth.uid() = user_id);
create policy "gen_exercises_delete_own" on public.generated_exercises
  for delete using (auth.uid() = user_id);

-- ── User solutions (code written in the editor) ───────────────────────────────

create table public.user_solutions (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles(id) on delete cascade,
  -- exactly one of the two exercise references must be set:
  lc                    integer     references public.problems(lc) on delete cascade,
  generated_exercise_id uuid        references public.generated_exercises(id) on delete cascade,
  code                  text        not null default '',
  updated_at            timestamptz not null default now(),

  constraint exactly_one_exercise check (
    (lc is not null)::int + (generated_exercise_id is not null)::int = 1
  ),
  unique (user_id, lc),
  unique (user_id, generated_exercise_id)
);

alter table public.user_solutions enable row level security;

create policy "solutions_select_own" on public.user_solutions
  for select using (auth.uid() = user_id);
create policy "solutions_insert_own" on public.user_solutions
  for insert with check (auth.uid() = user_id);
create policy "solutions_update_own" on public.user_solutions
  for update using (auth.uid() = user_id);
create policy "solutions_delete_own" on public.user_solutions
  for delete using (auth.uid() = user_id);

-- ── Ensure profile exists (called from the frontend before any user insert) ────
-- In local dev the on_auth_user_created trigger can miss if the DB was recreated
-- after the user first signed in. This function is idempotent: safe to call every time.
create or replace function public.ensure_profile()
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (auth.uid())
  on conflict (id) do nothing;
end;
$$;
