begin;

grant select (facebook_business_login_configuration_id)
on app_private.meta_applications
to authenticated;

comment on column app_private.meta_applications.facebook_business_login_configuration_id is
  'Non-secret Meta Facebook Login for Business configuration identifier projected through owner-scoped RLS';

commit;
