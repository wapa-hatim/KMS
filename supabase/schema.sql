create extension if not exists pgcrypto;

create type public.document_status as enum ('Draft', 'In review', 'Published', 'Archived');
create type public.space_role as enum ('owner', 'editor', 'viewer');

create table public.spaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.space_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 180),
  content text not null default '',
  category text not null default 'Guides',
  department text not null default 'Company-wide',
  owner_name text not null default '',
  read_time integer not null default 5 check (read_time > 0),
  status public.document_status not null default 'Draft',
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.document_versions (
  id bigint generated always as identity primary key,
  document_id uuid not null references public.documents(id) on delete cascade,
  version integer not null,
  title text not null,
  summary text not null,
  content text not null,
  changed_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  space_id uuid not null references public.spaces(id) on delete cascade,
  document_id uuid references public.documents(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  created_at timestamptz not null default now()
);

create index documents_space_updated_idx on public.documents (space_id, updated_at desc);
create index documents_search_idx on public.documents using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(content, ''))
);
create index audit_events_space_created_idx on public.audit_events (space_id, created_at desc);

create function public.is_space_member(target_space uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.space_members where space_id = target_space and user_id = auth.uid()) $$;

create function public.has_space_role(target_space uuid, allowed_roles public.space_role[])
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.space_members where space_id = target_space and user_id = auth.uid() and role = any(allowed_roles)) $$;

create function public.touch_document_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end $$;

create trigger documents_touch_updated_at before update on public.documents
for each row execute function public.touch_document_updated_at();

create function public.record_document_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  next_version integer;
begin
  select coalesce(max(version), 0) + 1 into next_version
  from public.document_versions where document_id = new.id;

  insert into public.document_versions (document_id, version, title, summary, content, changed_by)
  values (new.id, next_version, new.title, new.summary, new.content, coalesce(auth.uid(), new.created_by));

  insert into public.audit_events (space_id, document_id, actor_id, action)
  values (new.space_id, new.id, coalesce(auth.uid(), new.created_by), case when tg_op = 'INSERT' then 'created' else 'updated' end);
  return new;
end $$;

create trigger documents_record_change after insert or update on public.documents
for each row execute function public.record_document_change();

alter table public.spaces enable row level security;
alter table public.space_members enable row level security;
alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.audit_events enable row level security;

create policy "Members can read spaces" on public.spaces for select using (public.is_space_member(id));
create policy "Owners can update spaces" on public.spaces for update using (public.has_space_role(id, array['owner']::public.space_role[]));
create policy "Members can read memberships" on public.space_members for select using (public.is_space_member(space_id));
create policy "Owners can manage memberships" on public.space_members for all using (public.has_space_role(space_id, array['owner']::public.space_role[])) with check (public.has_space_role(space_id, array['owner']::public.space_role[]));
create policy "Members can read documents" on public.documents for select using (
  public.is_space_member(space_id)
  and (status = 'Published' or public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]))
);
create policy "Editors can create documents" on public.documents for insert with check (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]) and created_by = auth.uid());
create policy "Editors can update documents" on public.documents for update using (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[])) with check (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]));
create policy "Owners can delete documents" on public.documents for delete using (public.has_space_role(space_id, array['owner']::public.space_role[]));
create policy "Members can read versions" on public.document_versions for select using (
  exists (
    select 1 from public.documents d
    where d.id = document_id
      and public.is_space_member(d.space_id)
      and (d.status = 'Published' or public.has_space_role(d.space_id, array['owner', 'editor']::public.space_role[]))
  )
);
create policy "Editors can add versions" on public.document_versions for insert with check (changed_by = auth.uid() and exists (select 1 from public.documents d where d.id = document_id and public.has_space_role(d.space_id, array['owner', 'editor']::public.space_role[])));
create policy "Members can read audit events" on public.audit_events for select using (public.is_space_member(space_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.spaces, public.space_members, public.documents to authenticated;
grant select, insert on public.document_versions, public.audit_events to authenticated;
grant usage, select on all sequences in schema public to authenticated;