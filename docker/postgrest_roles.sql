-- Roles required by PostgREST for local development.
-- Runs as postgres superuser during container first-start (alphabetically after schema + seed).

-- anon: role PostgREST switches to for requests with no / anonymous JWT
create role anon nologin;

-- authenticator: role PostgREST connects as, then switches to the JWT role (anon or authenticated)
create role authenticator noinherit login password 'authenticator';
grant anon           to authenticator;

-- authenticated: role PostgREST switches to for requests carrying a valid GoTrue JWT
create role authenticated nologin;
grant authenticated  to authenticator;

-- Schema access
grant usage on schema public to anon, authenticated;

-- Reference tables: readable by everyone
grant select on public.categories to anon, authenticated;
grant select on public.problems   to anon, authenticated;

-- Profiles: authenticated users read their own row (INSERT is handled by the trigger,
-- which runs as the postgres superuser via security definer — no direct INSERT grant needed)
grant select on public.profiles to authenticated;

-- Progress: authenticated users can read, mark done (insert) and unmark (delete)
-- No UPDATE grant — the toggle is delete + insert, not an in-place update
grant select, insert, delete on public.user_progress to authenticated;

-- AI-generated exercises: authenticated users manage their own rows
grant select, insert, delete on public.generated_exercises to authenticated;

-- User solutions (editor code): authenticated users manage their own rows
grant select, insert, update, delete on public.user_solutions to authenticated;

-- ensure_profile(): called before any user insert to lazily create missing profile rows
grant execute on function public.ensure_profile() to authenticated;
