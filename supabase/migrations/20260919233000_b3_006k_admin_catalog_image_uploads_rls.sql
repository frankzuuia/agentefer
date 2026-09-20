begin;

-- =============================================================================
-- Enable row level security on the admin catalog image upload leases table.
-- Defense-in-depth that matches the existing app_private.* pattern: every other
-- durable lease / queue table in this schema (media_ingest_requests,
-- catalog_storefront_jobs) ships with enable + force RLS so that even a future
-- accidental grant cannot leak cross-tenant rows. Direct SELECT/INSERT/UPDATE/
-- DELETE privileges remain revoked from public, anon, authenticated, and
-- service_role; access continues to flow exclusively through the
-- security definer RPCs in api.prepare_admin_catalog_image_upload,
-- api.claim_admin_catalog_image_upload,
-- api.complete_admin_catalog_image_upload,
-- api.fail_admin_catalog_image_upload, and
-- api.get_admin_catalog_image_upload_status, each of which filters by
-- organization_id before touching the table.
-- =============================================================================

alter table app_private.admin_catalog_image_uploads enable row level security;
alter table app_private.admin_catalog_image_uploads force row level security;

comment on table app_private.admin_catalog_image_uploads is
  'Durable tenant-scoped leases for admin-driven catalog image uploads; binary data stays in Storage and never persists here. RLS enforced; all access flows through scoped RPCs.';

notify pgrst, 'reload schema';

commit;
