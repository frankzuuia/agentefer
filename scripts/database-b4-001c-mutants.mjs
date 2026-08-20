export const b4001cDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "restore broad authenticated WhatsApp profile reads",
    sql: "grant select on app_private.meta_whatsapp_connection_profiles to authenticated;",
  }),
  Object.freeze({
    name: "remove one API-required authenticated WhatsApp profile column",
    sql: `revoke select (display_phone_number)
      on app_private.meta_whatsapp_connection_profiles from authenticated;`,
  }),
  Object.freeze({
    name: "expose the internal WhatsApp profile creation timestamp",
    sql: `grant select (created_at)
      on app_private.meta_whatsapp_connection_profiles to authenticated;`,
  }),
  Object.freeze({
    name: "expose the internal WhatsApp profile update timestamp",
    sql: `grant select (updated_at)
      on app_private.meta_whatsapp_connection_profiles to authenticated;`,
  }),
]);
