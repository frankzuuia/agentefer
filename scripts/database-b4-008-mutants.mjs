export const b4008DatabaseMutants = Object.freeze([
  Object.freeze({
    name: "allow non-owners to configure persistent Facebook access",
    find: "  previous_configuration_id text;\nbegin\n  perform app_private.assert_facebook_oauth_owner(\n    target_organization_id,\n    target_actor_user_id\n  );",
    replacement: "  previous_configuration_id text;\nbegin\n  perform target_actor_user_id;",
  }),
  Object.freeze({
    name: "allow a non-decimal Facebook Business Login configuration identifier",
    find: "    or translate(target_configuration_id, '0123456789', '') <> ''",
    replacement: "    or false",
  }),
  Object.freeze({
    name: "discard the immutable configuration snapshot when OAuth starts",
    find: "    application_record.facebook_business_login_configuration_id,\n    statement_timestamp() + interval '10 minutes'",
    replacement: "    null,\n    statement_timestamp() + interval '10 minutes'",
  }),
  Object.freeze({
    name: "reject the official business integration system-user token class",
    find: "    or not (token_bundle ?& array['token_type', 'access_token', 'page_ids'])\n    or token_bundle ->> 'token_type' <> 'business_integration_system_user'",
    replacement:
      "    or not (token_bundle ?& array['token_type', 'access_token', 'page_ids'])\n    or token_bundle ->> 'token_type' <> 'legacy_user'",
  }),
  Object.freeze({
    name: "remove legacy Page CREATE_CONTENT publication evidence",
    find: "    'CREATE_CONTENT',\n    'MANAGE',",
    replacement: "    'MANAGE',",
  }),
  Object.freeze({
    name: "retain the ephemeral business token bundle after activation",
    find: "  delete from vault.secrets where id = bundle_secret_id;",
    replacement: "  perform bundle_secret_id;",
  }),
  Object.freeze({
    name: "expose the backend-only configuration RPC to authenticated clients",
    find: "grant execute on function api.configure_facebook_business_login(\n  uuid, uuid, text, uuid, text, text\n) to service_role;",
    replacement:
      "grant execute on function api.configure_facebook_business_login(\n  uuid, uuid, text, uuid, text, text\n) to service_role, authenticated;",
  }),
]);
