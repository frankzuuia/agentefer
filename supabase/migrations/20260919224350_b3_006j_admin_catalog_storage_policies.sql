begin;

-- =============================================================================
-- Storage policies so authenticated owner/admin/operator members can upload
-- and update image objects directly into the private bucket from the admin
-- catalog modal. The object_path MUST begin with the user's organization_id,
-- matching the canonical format enforced later by
-- media_asset_objects_path_valid (orgId/assetId/rendition/sha256.ext).
--
-- service_role bypasses RLS by default, so the worker that transcodes the
-- analysis_webp rendition does not need this policy.
-- =============================================================================

create policy agentefer_catalog_private_member_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'agentefer-catalog-private'
  and exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id::text = split_part(storage.objects.name, '/'::text, 1)
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (array['owner', 'admin', 'operator'])
  )
);

create policy agentefer_catalog_private_member_update
on storage.objects
for update
to authenticated
using (
  bucket_id = 'agentefer-catalog-private'
  and exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id::text = split_part(storage.objects.name, '/'::text, 1)
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (array['owner', 'admin', 'operator'])
  )
)
with check (
  bucket_id = 'agentefer-catalog-private'
  and exists (
    select 1
    from app_private.organization_memberships as membership
    where membership.organization_id::text = split_part(storage.objects.name, '/'::text, 1)
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
      and membership.role = any (array['owner', 'admin', 'operator'])
  )
);

notify pgrst, 'reload schema';

commit;
