create table public.collections (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  parent_id uuid,
  name text not null check (char_length(trim(name)) between 1 and 80),
  description text not null default '',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  unique (space_id, id),
  foreign key (space_id, parent_id) references public.collections(space_id, id) on delete restrict
);

create unique index collections_space_name_idx on public.collections (space_id, lower(name));

alter table public.documents
  add column collection_id uuid,
  add column owner_id uuid references auth.users(id) on delete set null,
  add column tags text[] not null default '{}',
  add column content_format text not null default 'markdown' check (content_format in ('markdown', 'html')),
  add column template_key text not null default 'blank',
  add unique (space_id, id),
  add constraint documents_collection_space_fk
    foreign key (space_id, collection_id) references public.collections(space_id, id) on delete set null (collection_id);

insert into public.collections (space_id, name, created_by)
select distinct d.space_id, coalesce(nullif(trim(d.category), ''), 'General'), d.created_by
from public.documents d
on conflict (space_id, lower(name)) do nothing;

update public.documents d
set collection_id = c.id
from public.collections c
where c.space_id = d.space_id and lower(c.name) = lower(coalesce(nullif(trim(d.category), ''), 'General'));

update public.documents d set owner_id = d.created_by where owner_id is null;

create index collections_space_parent_idx on public.collections (space_id, parent_id) where archived_at is null;
create index documents_space_collection_updated_idx on public.documents (space_id, collection_id, updated_at desc);
create index documents_tags_idx on public.documents using gin (tags);

create policy "Members can read active collections" on public.collections
for select using (public.is_space_member(space_id) and archived_at is null);
create policy "Editors can create collections" on public.collections
for insert with check (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]) and created_by = auth.uid());
create policy "Editors can update collections" on public.collections
for update using (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]))
with check (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]));
create policy "Owners can delete collections" on public.collections
for delete using (public.has_space_role(space_id, array['owner']::public.space_role[]));

alter table public.document_versions
  add column collection_id uuid,
  add column owner_id uuid,
  add column tags text[] not null default '{}',
  add column content_format text not null default 'markdown',
  add column status public.document_status not null default 'Draft';

update public.document_versions v
set collection_id = d.collection_id,
    owner_id = d.owner_id,
    tags = d.tags,
    content_format = d.content_format,
    status = d.status
from public.documents d
where d.id = v.document_id;

create or replace function public.record_document_change()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  next_version integer;
begin
  select coalesce(max(version), 0) + 1 into next_version
  from public.document_versions where document_id = new.id;

  insert into public.document_versions (
    document_id, version, title, summary, content, changed_by,
    collection_id, owner_id, tags, content_format, status
  ) values (
    new.id, next_version, new.title, new.summary, new.content, coalesce(auth.uid(), new.created_by),
    new.collection_id, new.owner_id, new.tags, new.content_format, new.status
  );

  insert into public.audit_events (space_id, document_id, actor_id, action)
  values (new.space_id, new.id, coalesce(auth.uid(), new.created_by), case when tg_op = 'INSERT' then 'created' else 'updated' end);
  return new;
end $$;

create function public.refresh_document_review_due()
returns trigger language plpgsql set search_path = public
as $$
declare
  workspace public.spaces%rowtype;
begin
  select * into workspace from public.spaces where id = new.space_id;
  if workspace.require_review and new.status <> 'Archived' then
    new.review_due_at := coalesce(new.review_due_at, new.updated_at) + make_interval(days => workspace.review_interval_days);
  else
    new.review_due_at := null;
  end if;
  return new;
end $$;

create trigger documents_set_review_due before insert or update on public.documents
for each row execute function public.refresh_document_review_due();

create table public.document_attachments (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  document_id uuid not null,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  byte_size bigint not null check (byte_size > 0 and byte_size <= 52428800),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (space_id, document_id) references public.documents(space_id, id) on delete cascade
);

create index document_attachments_document_idx on public.document_attachments (space_id, document_id, created_at desc);
alter table public.document_attachments enable row level security;

create policy "Members can read permitted attachments" on public.document_attachments
for select using (
  public.is_space_member(space_id)
  and exists (
    select 1 from public.documents d
    where d.id = document_id and d.space_id = space_id
      and (d.status = 'Published' or public.has_space_role(d.space_id, array['owner', 'editor']::public.space_role[]))
  )
);
create policy "Editors can add attachments" on public.document_attachments
for insert with check (
  uploaded_by = auth.uid()
  and public.has_space_role(space_id, array['owner', 'editor']::public.space_role[])
  and exists (select 1 from public.documents d where d.id = document_attachments.document_id and d.space_id = document_attachments.space_id)
);
create policy "Editors can remove attachments" on public.document_attachments
for delete using (public.has_space_role(space_id, array['owner', 'editor']::public.space_role[]));

grant select, insert, update, delete on public.collections to authenticated;
grant select, insert, delete on public.document_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kms-documents', 'kms-documents', false, 52428800,
  array['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain', 'text/markdown', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'video/mp4']
)
on conflict (id) do update set public = false, file_size_limit = 52428800;

create policy "Members can download permitted KMS files" on storage.objects
for select to authenticated using (
  bucket_id = 'kms-documents'
  and public.is_space_member(((storage.foldername(name))[1])::uuid)
  and exists (
    select 1 from public.documents d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.space_id = ((storage.foldername(name))[1])::uuid
      and (d.status = 'Published' or public.has_space_role(d.space_id, array['owner', 'editor']::public.space_role[]))
  )
);
create policy "Editors can upload KMS files" on storage.objects
for insert to authenticated with check (
  bucket_id = 'kms-documents'
  and public.has_space_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor']::public.space_role[])
  and exists (
    select 1 from public.documents d
    where d.id = ((storage.foldername(name))[2])::uuid
      and d.space_id = ((storage.foldername(name))[1])::uuid
  )
);
create policy "Editors can delete KMS files" on storage.objects
for delete to authenticated using (
  bucket_id = 'kms-documents'
  and public.has_space_role(((storage.foldername(name))[1])::uuid, array['owner', 'editor']::public.space_role[])
);

create function public.search_workspace_documents(
  target_space uuid,
  search_text text default '',
  target_collection uuid default null,
  target_tags text[] default '{}',
  page_size integer default 25,
  page_offset integer default 0
)
returns table (
  id uuid, title text, summary text, content text, category text, department text,
  owner_name text, read_time integer, status public.document_status,
  updated_at timestamptz, collection_id uuid, tags text[], owner_id uuid, total_count bigint
)
language sql stable security invoker set search_path = public
as $$
  with matched as (
    select d.*, p.full_name as profile_name,
      count(*) over() as matched_count
    from public.documents d
    left join public.profiles p on p.user_id = d.owner_id
    where d.space_id = target_space
      and public.is_space_member(target_space)
      and (target_collection is null or d.collection_id = target_collection)
      and (coalesce(cardinality(target_tags), 0) = 0 or d.tags && target_tags)
      and (
        coalesce(trim(search_text), '') = ''
        or to_tsvector('english', coalesce(d.title, '') || ' ' || coalesce(d.summary, '') || ' ' || coalesce(d.content, '') || ' ' || coalesce(array_to_string(d.tags, ' '), ''))
          @@ websearch_to_tsquery('english', search_text)
      )
      and (d.status = 'Published' or public.has_space_role(target_space, array['owner', 'editor']::public.space_role[]))
  )
  select matched.id, matched.title, matched.summary, matched.content, matched.category, matched.department,
    coalesce(matched.profile_name, matched.owner_name), matched.read_time, matched.status, matched.updated_at,
    matched.collection_id, matched.tags, matched.owner_id, matched.matched_count
  from matched
  order by matched.updated_at desc
  limit least(greatest(page_size, 1), 100)
  offset greatest(page_offset, 0)
$$;

revoke all on function public.search_workspace_documents(uuid, text, uuid, text[], integer, integer) from public, anon;
grant execute on function public.search_workspace_documents(uuid, text, uuid, text[], integer, integer) to authenticated;