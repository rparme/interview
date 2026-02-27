alter table public.user_solutions
  add column explanation_transcript text    not null default '',
  add column explanation_review     jsonb;
