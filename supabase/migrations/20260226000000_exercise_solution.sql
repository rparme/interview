alter table public.generated_exercises
  add column solution_code text not null default '',
  add column solution_explanation text not null default '';
