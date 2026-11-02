create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (user_id, email, full_name)
select id, lower(email), coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (user_id) do update
set email = excluded.email, full_name = excluded.full_name, updated_at = now();

create index profiles_email_idx on public.profiles (lower(email));
create index space_members_user_idx on public.space_members (user_id, space_id);

create function public.sync_profile_from_auth_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, full_name)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (user_id) do update
  set email = excluded.email, full_name = excluded.full_name, updated_at = now();
  return new;
end $$;

create trigger auth_user_sync_profile
after insert or update of email, raw_user_meta_data on auth.users
for each row execute function public.sync_profile_from_auth_user();

create function public.can_view_workspace_profile(target_user uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.space_members current_member
    join public.space_members target_member using (space_id)
    where current_member.user_id = auth.uid()
      and target_member.user_id = target_user
  )
$$;

alter table public.spaces
  add column require_review boolean not null default true,
  add column review_interval_days integer not null default 180 check (review_interval_days between 30 and 730);

create table public.space_invitations (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.spaces(id) on delete cascade,
  invited_email text not null,
  role public.space_role not null check (role in ('editor', 'viewer')),
  token_hash text not null unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);

create index space_invitations_space_created_idx on public.space_invitations (space_id, created_at desc);
create index space_invitations_email_idx on public.space_invitations (lower(invited_email));

create function public.protect_last_space_owner()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  owner_count integer;
begin
  if tg_op = 'DELETE' then
    if old.role = 'owner' then
      select count(*) into owner_count
      from public.space_members
      where space_id = old.space_id and role = 'owner';
      if owner_count <= 1 then
        raise exception 'A workspace must keep at least one owner';
      end if;
    end if;
    return old;
  end if;

  if old.role = 'owner' and new.role <> 'owner' then
    select count(*) into owner_count
    from public.space_members
    where space_id = old.space_id and role = 'owner';
    if owner_count <= 1 then
      raise exception 'A workspace must keep at least one owner';
    end if;
  end if;
  return new;
end $$;

create trigger space_members_protect_last_owner
before update of role or delete on public.space_members
for each row execute function public.protect_last_space_owner();

create function public.create_space_invitation(target_space uuid, target_email text, target_role public.space_role)
returns text language plpgsql security definer set search_path = public, extensions
as $$
declare
  raw_token text;
begin
  if auth.uid() is null or not public.has_space_role(target_space, array['owner']::public.space_role[]) then
    raise exception 'Only workspace owners can invite members';
  end if;
  if target_role not in ('editor', 'viewer') then
    raise exception 'Invitations can only grant editor or reader access';
  end if;
  if target_email is null or length(trim(target_email)) < 5 or position('@' in trim(target_email)) < 2 then
    raise exception 'Enter a valid email address';
  end if;
  if exists (
    select 1 from public.space_members member
    join public.profiles profile on profile.user_id = member.user_id
    where member.space_id = target_space and lower(profile.email) = lower(trim(target_email))
  ) then
    raise exception 'This person is already a workspace member';
  end if;

  delete from public.space_invitations
  where space_id = target_space and lower(invited_email) = lower(trim(target_email)) and accepted_at is null;

  raw_token := encode(gen_random_bytes(32), 'hex');
  insert into public.space_invitations (space_id, invited_email, role, token_hash, invited_by)
  values (target_space, lower(trim(target_email)), target_role, encode(digest(raw_token, 'sha256'), 'hex'), auth.uid());
  return raw_token;
end $$;

create function public.accept_space_invitation(invitation_token text)
returns uuid language plpgsql security definer set search_path = public, extensions
as $$
declare
  invitation public.space_invitations%rowtype;
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null or current_email = '' then
    raise exception 'Sign in with the invited email address';
  end if;

  select * into invitation
  from public.space_invitations
  where token_hash = encode(digest(invitation_token, 'sha256'), 'hex')
    and lower(invited_email) = current_email
  for update;

  if not found then
    raise exception 'Invitation is invalid or belongs to a different email address';
  end if;
  if invitation.accepted_at is not null then
    if exists (select 1 from public.space_members where space_id = invitation.space_id and user_id = auth.uid()) then
      return invitation.space_id;
    end if;
    raise exception 'This invitation has already been used';
  end if;
  if invitation.expires_at <= now() then
    raise exception 'This invitation has expired';
  end if;

  insert into public.space_members (space_id, user_id, role)
  values (invitation.space_id, auth.uid(), invitation.role)
  on conflict (space_id, user_id) do nothing;

  update public.space_invitations set accepted_at = now() where id = invitation.id;
  return invitation.space_id;
end $$;

alter table public.profiles enable row level security;
alter table public.space_invitations enable row level security;

create policy "Members can view profiles in their spaces" on public.profiles
for select using (public.can_view_workspace_profile(user_id));
create policy "Owners can view invitations" on public.space_invitations
for select using (public.has_space_role(space_id, array['owner']::public.space_role[]));
create policy "Owners can revoke invitations" on public.space_invitations
for delete using (public.has_space_role(space_id, array['owner']::public.space_role[]));

drop policy if exists "Members can read audit events" on public.audit_events;
create policy "Members can read visible document activity" on public.audit_events
for select using (
  public.has_space_role(space_id, array['owner', 'editor']::public.space_role[])
  or exists (
    select 1 from public.documents d
    where d.id = document_id and d.space_id = audit_events.space_id and d.status = 'Published'
  )
);

grant select on public.profiles, public.space_invitations to authenticated;
grant delete on public.space_invitations to authenticated;
revoke all on function public.can_view_workspace_profile(uuid) from public, anon;
revoke all on function public.create_space_invitation(uuid, text, public.space_role) from public, anon;
revoke all on function public.accept_space_invitation(text) from public, anon;
grant execute on function public.can_view_workspace_profile(uuid) to authenticated;
grant execute on function public.create_space_invitation(uuid, text, public.space_role) to authenticated;
grant execute on function public.accept_space_invitation(text) to authenticated;