-- Auth schema bootstrap.
-- Runs before schema.sql (which references auth.users) and before GoTrue starts.
--
-- auth.users is created here with the exact columns from GoTrue's initial migration
-- so that GoTrue's own "CREATE TABLE IF NOT EXISTS auth.users" is a no-op and its
-- subsequent ALTER TABLE / CREATE INDEX statements succeed cleanly.
--
-- In production this entire schema is owned and managed by Supabase's GoTrue service.

create schema if not exists auth;

create table if not exists auth.users (
  instance_id          uuid,
  id                   uuid        not null primary key,
  aud                  varchar(255),
  role                 varchar(255),
  email                varchar(255),
  encrypted_password   varchar(255),
  confirmed_at         timestamptz,
  invited_at           timestamptz,
  confirmation_token   varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token       varchar(255),
  recovery_sent_at     timestamptz,
  email_change_token   varchar(255),
  email_change         varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at      timestamptz,
  raw_app_meta_data    jsonb,
  raw_user_meta_data   jsonb,
  is_super_admin       boolean,
  created_at           timestamptz,
  updated_at           timestamptz
);
-- Indexes are intentionally NOT created here — GoTrue's first migration creates them.
-- Creating them here would cause a duplicate-index error in GoTrue's migration.

-- auth.uid() — reads the authenticated user's UUID from the JWT claims that
-- PostgREST injects into the session. Returns null outside a request context
-- (e.g. during seeding, which runs as the postgres superuser bypassing RLS).
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb->>'sub',
    null
  )::uuid;
$$;
