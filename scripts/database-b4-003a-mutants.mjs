export const b4003aDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "remove raw delivery lease lifecycle constraint",
    sql: `alter table app_private.meta_webhook_deliveries
      drop constraint meta_webhook_deliveries_lease_shape_valid;`,
  }),
  Object.freeze({
    name: "remove normalized event lease lifecycle constraint",
    sql: `alter table app_private.inbound_events
      drop constraint inbound_events_lease_shape_valid;`,
  }),
  Object.freeze({
    name: "remove raw delivery operational claim index",
    sql: "drop index app_private.meta_webhook_deliveries_object_claim_idx;",
  }),
  Object.freeze({
    name: "remove normalized event operational claim index",
    sql: "drop index app_private.inbound_events_type_claim_idx;",
  }),
  Object.freeze({
    name: "revoke raw delivery claim authority from service role",
    sql: `revoke execute on function api.claim_meta_webhook_delivery(
      text, text, integer, integer
    ) from service_role;`,
  }),
  Object.freeze({
    name: "expose WhatsApp normalization authority to authenticated callers",
    sql: `grant execute on function api.normalize_meta_whatsapp_message(uuid, uuid)
      to authenticated;`,
  }),
  Object.freeze({
    name: "expose raw customer payload through the worker claim boundary",
    find: `  provider_object_type text,\n  attempt_number integer,`,
    replacement: `  provider_object_type text,\n  payload jsonb,\n  attempt_number integer,`,
  }),
  Object.freeze({
    name: "route a WhatsApp delivery without exact WABA ownership",
    find: "        and connection_value.external_account_id = waba_id",
    replacement: "        and connection_value.external_account_id is not null",
  }),
  Object.freeze({
    name: "copy provider sender identity into LLM-visible message content",
    find: `  target_content := provider_message\n    - 'from'\n    - 'id'`,
    replacement: `  target_content := provider_message\n    - 'id'`,
  }),
  Object.freeze({
    name: "downgrade verified owner identity to customer participant",
    find: `  target_participant_role := case\n    when identity_record.principal_type = 'member' then 'member'\n    else 'customer'\n  end;`,
    replacement: "  target_participant_role := 'customer';",
  }),
  Object.freeze({
    name: "use transaction time for WhatsApp message lease expiry",
    find: "  target_now timestamptz := clock_timestamp();",
    replacement: "  target_now timestamptz := transaction_timestamp();",
  }),
  Object.freeze({
    name: "make routed message available before authenticated receipt",
    find: `            'whatsapp.message',
            provider_event_id,
            event_deduplication_key,
            extensions.digest(convert_to(event_payload::text, 'UTF8'), 'sha256'),
            event_payload,
            provider_occurred_at,
            delivery_record.first_received_at,
            delivery_record.signature_verified_at,
            delivery_record.first_received_at,`,
    replacement: `            'whatsapp.message',
            provider_event_id,
            event_deduplication_key,
            extensions.digest(convert_to(event_payload::text, 'UTF8'), 'sha256'),
            event_payload,
            provider_occurred_at,
            delivery_record.first_received_at,
            delivery_record.signature_verified_at,
            delivery_record.first_received_at - interval '1 microsecond',`,
  }),
]);
