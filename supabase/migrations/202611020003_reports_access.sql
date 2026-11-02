drop policy if exists "Members can read audit events" on public.audit_events;
drop policy if exists "Members can read visible document activity" on public.audit_events;

create policy "Owners and editors can read audit events" on public.audit_events
for select using (
  public.has_space_role(space_id, array['owner', 'editor']::public.space_role[])
);
