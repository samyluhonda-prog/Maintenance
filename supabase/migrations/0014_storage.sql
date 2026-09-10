-- Storage buckets. All buckets are private; access goes through signed URLs
-- generated server-side after an RLS-backed row lookup, plus these
-- storage.objects policies as defense in depth. Every object path is
-- convention-bound to start with the owning org's id: "<org_id>/...".

insert into storage.buckets (id, name, public)
values
  ('equipment-media', 'equipment-media', false),
  ('documents', 'documents', false),
  ('avatars', 'avatars', false),
  ('signatures', 'signatures', false),
  ('request-media', 'request-media', false),
  ('work-order-media', 'work-order-media', false)
on conflict (id) do nothing;

create policy "org members read equipment media"
  on storage.objects for select
  using (bucket_id = 'equipment-media' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "org members with permission upload equipment media"
  on storage.objects for insert
  with check (
    bucket_id = 'equipment-media'
    and app.is_member_of(((storage.foldername(name))[1])::uuid)
    and app.has_permission(((storage.foldername(name))[1])::uuid, 'equipment.edit')
  );
create policy "org members with permission delete equipment media"
  on storage.objects for delete
  using (
    bucket_id = 'equipment-media'
    and app.is_member_of(((storage.foldername(name))[1])::uuid)
    and app.has_permission(((storage.foldername(name))[1])::uuid, 'equipment.edit')
  );

create policy "org members read documents"
  on storage.objects for select
  using (bucket_id = 'documents' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "org members with permission upload documents"
  on storage.objects for insert
  with check (bucket_id = 'documents' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "org members with permission delete documents"
  on storage.objects for delete
  using (bucket_id = 'documents' and app.is_member_of(((storage.foldername(name))[1])::uuid));

create policy "anyone can read their own avatar folder or org-mates"
  on storage.objects for select
  using (bucket_id = 'avatars' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "users upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[2] = auth.uid()::text);

create policy "org members read signatures"
  on storage.objects for select
  using (bucket_id = 'signatures' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "users upload their own signatures"
  on storage.objects for insert
  with check (
    bucket_id = 'signatures'
    and app.is_member_of(((storage.foldername(name))[1])::uuid)
    and (storage.foldername(name))[2] = auth.uid()::text
  );

create policy "org members read request media"
  on storage.objects for select
  using (bucket_id = 'request-media' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "org members upload request media"
  on storage.objects for insert
  with check (bucket_id = 'request-media' and app.is_member_of(((storage.foldername(name))[1])::uuid));

create policy "org members read work order media"
  on storage.objects for select
  using (bucket_id = 'work-order-media' and app.is_member_of(((storage.foldername(name))[1])::uuid));
create policy "org members upload work order media"
  on storage.objects for insert
  with check (bucket_id = 'work-order-media' and app.is_member_of(((storage.foldername(name))[1])::uuid));
