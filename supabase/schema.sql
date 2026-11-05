-- Run once in your Supabase project's SQL editor.
-- Each signed-in user has a private workspace containing reports and cabinet profiles.
create table if not exists public.report_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  reports jsonb not null default '[]'::jsonb check (jsonb_typeof(reports) = 'array'),
  profiles jsonb not null default '{}'::jsonb check (jsonb_typeof(profiles) = 'object'),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.report_workspaces enable row level security;
revoke all on public.report_workspaces from anon;
revoke all on public.report_workspaces from authenticated;
grant select, insert, update on public.report_workspaces to authenticated;
drop policy if exists "Read own workspace" on public.report_workspaces;
create policy "Read own workspace" on public.report_workspaces for select to authenticated
  using ((select auth.uid()) = owner_id);
drop policy if exists "Insert own workspace" on public.report_workspaces;
create policy "Insert own workspace" on public.report_workspaces for insert to authenticated
  with check ((select auth.uid()) = owner_id);
drop policy if exists "Update own workspace" on public.report_workspaces;
create policy "Update own workspace" on public.report_workspaces for update to authenticated
  using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create or replace function public.update_report_workspace_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.owner_id = old.owner_id;
  new.revision = old.revision + 1;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists report_workspace_revision on public.report_workspaces;
create trigger report_workspace_revision before update on public.report_workspaces
  for each row execute function public.update_report_workspace_revision();
