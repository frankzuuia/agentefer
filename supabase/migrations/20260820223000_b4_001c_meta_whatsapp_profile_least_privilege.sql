begin;

revoke select on app_private.meta_whatsapp_connection_profiles
  from authenticated;

grant select (
  channel_connection_id,
  organization_id,
  display_phone_number,
  verified_name,
  quality_rating,
  name_status,
  token_type,
  granted_scopes,
  token_expires_at,
  data_access_expires_at,
  subscribed_at,
  last_validated_at
) on app_private.meta_whatsapp_connection_profiles
  to authenticated;

comment on table app_private.meta_whatsapp_connection_profiles is
  'Non-secret Meta-validated WhatsApp connection facts; authenticated access is restricted to API-view columns';

notify pgrst, 'reload schema';

commit;
