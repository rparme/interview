-- Add done/completed flag to generated exercises
alter table public.generated_exercises
  add column is_done boolean not null default false;

-- Allow authenticated users to update their own generated exercises (needed for is_done toggle)
create policy "gen_exercises_update_own" on public.generated_exercises
  for update using (auth.uid() = user_id);
