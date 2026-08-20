export const b4001bDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "remove forced RLS from WhatsApp connection profiles",
    sql: "alter table app_private.meta_whatsapp_connection_profiles no force row level security;",
  }),
  Object.freeze({
    name: "remove WhatsApp connection tenant policy",
    sql: "drop policy meta_whatsapp_connection_profiles_admin_select on app_private.meta_whatsapp_connection_profiles;",
  }),
  Object.freeze({
    name: "remove WhatsApp operational connection integrity trigger",
    sql: "drop trigger meta_whatsapp_connection_profiles_validate_connection on app_private.meta_whatsapp_connection_profiles;",
  }),
  Object.freeze({
    name: "remove WhatsApp tenant reassignment guard",
    sql: "drop trigger meta_whatsapp_connection_profiles_prevent_reassignment on app_private.meta_whatsapp_connection_profiles;",
  }),
  Object.freeze({
    name: "revoke the audited WhatsApp registrar from service role",
    sql: `revoke execute on function api.register_meta_whatsapp_connection(
      uuid, uuid, text, text, text, text, text, text, text, text[],
      timestamptz, timestamptz, text, uuid, text, text
    ) from service_role;`,
  }),
  Object.freeze({
    name: "expose the token-bearing WhatsApp registrar to authenticated callers",
    sql: `grant execute on function api.register_meta_whatsapp_connection(
      uuid, uuid, text, text, text, text, text, text, text, text[],
      timestamptz, timestamptz, text, uuid, text, text
    ) to authenticated;`,
  }),
]);
