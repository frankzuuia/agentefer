export const b4007DatabaseMutants = Object.freeze([
  Object.freeze({
    name: "allow organization admins to start Facebook OAuth",
    find: "      and membership.role = 'owner'",
    replacement: "      and membership.role in ('owner', 'admin')",
  }),
  Object.freeze({
    name: "allow a claimed Facebook OAuth state to be replayed",
    find: "    or session_record.status <> 'initiated'\n    or session_record.expires_at <= statement_timestamp() then",
    replacement: "    or false\n    or session_record.expires_at <= statement_timestamp() then",
  }),
  Object.freeze({
    name: "store Page access tokens inside browser-safe candidates",
    find: "      page_candidates = target_page_candidates,",
    replacement: "      page_candidates = token_bundle,",
  }),
  Object.freeze({
    name: "retain the temporary OAuth token bundle after Page selection",
    find: "  delete from vault.secrets where id = bundle_secret_id;",
    replacement: "  perform bundle_secret_id;",
  }),
  Object.freeze({
    name: "remove the typed Page credential reference",
    find: "    'facebook-page-credential://' || page_credential_id::text,",
    replacement: "    'facebook-page-token://' || page_credential_id::text,",
  }),
  Object.freeze({
    name: "remove the rate-aware publication spacing",
    find: "        'minimum_spacing_seconds', 3600,",
    replacement: "        'minimum_spacing_seconds', 0,",
  }),
  Object.freeze({
    name: "remove forced RLS from Facebook OAuth sessions",
    find: "alter table app_private.facebook_page_oauth_sessions force row level security;",
    replacement:
      "alter table app_private.facebook_page_oauth_sessions no force row level security;",
  }),
]);
