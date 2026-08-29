export const b3002aDatabaseMutants = Object.freeze([
  Object.freeze({
    name: "expose member identity linking to authenticated clients",
    sql: `grant execute on function api.link_whatsapp_member_identity(
      uuid, text, uuid, uuid, uuid, text, text
    ) to authenticated;`,
  }),
  Object.freeze({
    name: "expose the private WhatsApp actor resolver to service role",
    sql: `grant execute on function app_private.resolve_whatsapp_agent_actor(
      uuid, uuid, uuid
    ) to service_role;`,
  }),
  Object.freeze({
    name: "allow contacts on bindings that require membership roles",
    find: `    cardinality(required_membership_roles) = 0
    or (
      allowed_actor_kinds <@ array['member']::text[]
      and allowed_actor_kinds @> array['member']::text[]
    )`,
    replacement: "    cardinality(required_membership_roles) >= 0",
  }),
  Object.freeze({
    name: "remove tenant scope from WhatsApp actor resolution",
    find: `  where conversation_value.organization_id = target_organization_id
    and conversation_value.channel_connection_id = target_channel_connection_id
    and conversation_value.id = target_conversation_id
    and conversation_value.status = 'open'`,
    replacement: `  where conversation_value.organization_id is not null
    and conversation_value.channel_connection_id = target_channel_connection_id
    and conversation_value.id = target_conversation_id
    and conversation_value.status = 'open'`,
  }),
  Object.freeze({
    name: "treat a suspended WhatsApp member as active",
    find: `        and identity_value.verified_at is not null
        and membership.status = 'active'
        and membership.role in ('owner', 'admin', 'operator')`,
    replacement: `        and identity_value.verified_at is not null
        and membership.status is not null
        and membership.role in ('owner', 'admin', 'operator')`,
  }),
  Object.freeze({
    name: "downgrade a resolved member claim to contact",
    find: `      candidate_message.actor_kind,
      candidate_message.actor_user_id,
      candidate_message.actor_channel_identity_id,
      100,`,
    replacement: `      'contact',
      null,
      candidate_message.actor_channel_identity_id,
      100,`,
  }),
  Object.freeze({
    name: "mark verified member input as untrusted external input",
    find: `      case
        when candidate_message.actor_kind = 'member' then 'trusted_member'
        else 'untrusted_external'
      end,`,
    replacement: `      case
        when candidate_message.actor_kind = 'member' then 'untrusted_external'
        else 'untrusted_external'
      end,`,
  }),
  Object.freeze({
    name: "leave the old contact conversation open during linking",
    find: `  update app_private.conversations
  set status = 'closed',
      closed_at = greatest(target_now, opened_at),
      updated_at = greatest(target_now, updated_at)
  where organization_id = target_organization_id
    and channel_connection_id = source_identity.channel_connection_id
    and primary_channel_identity_id = source_identity.id
    and status = 'open';`,
    replacement: "  perform source_identity.id;",
  }),
  Object.freeze({
    name: "disable identity-link idempotent replay",
    find: `  target_command_id := command_claim.claimed_command_id;

  if command_claim.was_replayed then
    select * into existing_command`,
    replacement: `  target_command_id := command_claim.claimed_command_id;

  if false then
    select * into existing_command`,
  }),
  Object.freeze({
    name: "leak the provider phone subject into identity-link audit metadata",
    find: `      'member_user_id', target_member_user_id,
      'channel_connection_id', source_identity.channel_connection_id`,
    replacement: `      'member_user_id', target_member_user_id,
      'channel_connection_id', source_identity.channel_connection_id,
      'external_subject_id', source_identity.external_subject_id`,
  }),
]);
