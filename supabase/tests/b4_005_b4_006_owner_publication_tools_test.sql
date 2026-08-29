begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(26);

create function pg_temp.throws_sqlstate(
  statement text,
  expected_sqlstate text,
  description text
)
returns text
language plpgsql
security invoker
set search_path = extensions, pg_catalog
as $$
declare
  actual_sqlstate text;
begin
  execute statement;
  return extensions.fail(description || ' (the statement did not fail)');
exception
  when others then
    get stacked diagnostics actual_sqlstate = returned_sqlstate;
    return extensions.is(actual_sqlstate, expected_sqlstate, description);
end;
$$;

grant execute on function pg_temp.throws_sqlstate(text, text, text)
  to anon, authenticated, service_role;

select extensions.has_table(
  'app_private', 'social_publication_dispatch_states',
  'durable Facebook dispatch state exists'
);
select extensions.has_table(
  'app_private', 'social_rate_limit_observations',
  'append-only Meta rate observation ledger exists'
);
select extensions.has_table(
  'app_private', 'publication_batch_subscriptions',
  'durable terminal summary subscription exists'
);
select extensions.has_column(
  'app_private', 'publication_jobs', 'retry_of_job_id',
  'publication retry lineage is explicit'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'social_publication_dispatch_states', 'social_rate_limit_observations',
        'publication_batch_subscriptions'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  3,
  'RLS is enabled and forced on all new durable tables'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'social_publication_dispatch_states', 'social_rate_limit_observations',
        'publication_batch_subscriptions'
      )
  ),
  3,
  'every new durable table has an admin tenant policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'social_rate_limit_observations', 'publication_batch_subscriptions',
        'facebook_catalog_admin'
      )
      and relation.relkind = 'v'
  ),
  3,
  'three bounded admin API views exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'social_rate_limit_observations', 'publication_batch_subscriptions',
        'facebook_catalog_admin'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  3,
  'admin views preserve caller RLS and use a security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'record_social_rate_limit_observation', 'claim_facebook_publication_job',
        'recover_expired_facebook_publication_jobs', 'transition_publication_batch_pause',
        'retry_publication_job', 'get_publication_batch_status',
        'subscribe_publication_batch', 'reconcile_publication_batch_notifications',
        'claim_publication_batch_notification', 'reconcile_due_publication_batches',
        'complete_publication_batch_notification', 'fail_publication_batch_notification',
        'prepare_customer_assistant_tools', 'execute_whatsapp_tool_call'
      )
  ),
  14,
  'all durable publication and native tool service RPCs exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'app_private'
      and procedure.proname in (
        'facebook_dispatch_policy_for_agent', 'catalog_recent_for_owner_agent',
        'catalog_set_offer_status_for_owner_agent', 'publication_publish_for_owner_agent',
        'publication_enqueue_catalog_for_owner_agent', 'publication_status_for_owner_agent',
        'publication_retry_for_owner_agent', 'publication_batch_state_for_owner_agent',
        'ensure_customer_assistant_publication_tools'
      )
  ),
  9,
  'all private owner publication handlers exist'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'record_social_rate_limit_observation', 'claim_facebook_publication_job',
        'recover_expired_facebook_publication_jobs', 'transition_publication_batch_pause',
        'retry_publication_job', 'get_publication_batch_status',
        'subscribe_publication_batch', 'reconcile_publication_batch_notifications',
        'claim_publication_batch_notification', 'reconcile_due_publication_batches',
        'complete_publication_batch_notification', 'fail_publication_batch_notification',
        'prepare_customer_assistant_tools', 'execute_whatsapp_tool_call'
      )
      and grantee = 'service_role'
      and privilege_type = 'EXECUTE'
  ),
  14,
  'service role receives every worker publication RPC'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'api'
      and routine_name in (
        'record_social_rate_limit_observation', 'claim_facebook_publication_job',
        'recover_expired_facebook_publication_jobs', 'transition_publication_batch_pause',
        'retry_publication_job', 'get_publication_batch_status',
        'subscribe_publication_batch', 'reconcile_publication_batch_notifications',
        'claim_publication_batch_notification', 'reconcile_due_publication_batches',
        'complete_publication_batch_notification', 'fail_publication_batch_notification',
        'prepare_customer_assistant_tools', 'execute_whatsapp_tool_call'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'browser roles cannot operate worker publication RPCs'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.routine_privileges
    where specific_schema = 'app_private'
      and routine_name in (
        'facebook_dispatch_policy_for_agent', 'catalog_recent_for_owner_agent',
        'catalog_set_offer_status_for_owner_agent', 'publication_publish_for_owner_agent',
        'publication_enqueue_catalog_for_owner_agent', 'publication_status_for_owner_agent',
        'publication_retry_for_owner_agent', 'publication_batch_state_for_owner_agent',
        'ensure_customer_assistant_publication_tools'
      )
      and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
      and privilege_type = 'EXECUTE'
  ),
  0,
  'private handlers cannot bypass the atomic WhatsApp executor'
);

select extensions.is(
  (
    select count(*)::integer
    from information_schema.role_table_grants
    where table_schema in ('app_private', 'api')
      and table_name in (
        'social_publication_dispatch_states', 'social_rate_limit_observations',
        'publication_batch_subscriptions', 'facebook_catalog_admin'
      )
      and grantee in ('PUBLIC', 'anon')
  ),
  0,
  'public and anon have no publication orchestration relation privileges'
);

select extensions.ok(
  2 = (
    select count(*)
    from pg_catalog.pg_trigger
    where tgrelid = 'app_private.social_rate_limit_observations'::regclass
      and tgname in (
        'social_rate_limit_observations_reject_update',
        'social_rate_limit_observations_reject_delete'
      )
      and not tgisinternal
  ),
  'rate observations reject update and delete rewrites'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'app_private.publication_jobs'::regclass
      and conname = 'publication_jobs_retry_of_fk'
      and contype = 'f'
  ),
  'retry lineage has a tenant-scoped foreign key'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.claim_publication_batch_notification(text,integer,uuid)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'api.claim_publication_batch_notification(text,integer,uuid)',
    'EXECUTE'
  ),
  'only the worker can lease a terminal summary'
);

select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.execute_whatsapp_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated',
    'api.execute_whatsapp_tool_call(uuid,uuid,uuid,text,uuid,text,text,text,text,integer,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ),
  'only the worker can execute a leased native tool call'
);

set local role postgres;

insert into auth.users (id)
values ('b4060000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values (
  'b4061000-0000-4000-8000-000000000001',
  'B4 Publication Tools Alpha',
  'b4060000-0000-4000-8000-000000000001'
);

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values (
  'b4061100-0000-4000-8000-000000000001',
  'b4061000-0000-4000-8000-000000000001',
  'b4060000-0000-4000-8000-000000000001',
  'owner', 'active', statement_timestamp()
);

set constraints all immediate;

create temporary table pg_temp.b406_policy (
  policy_version_id uuid not null
) on commit drop;

insert into pg_temp.b406_policy
select app_private.ensure_customer_assistant_publication_tools(
  'b4061000-0000-4000-8000-000000000001'
);

select extensions.ok(
  (select policy_version_id is not null from pg_temp.b406_policy),
  'owner publication tool bootstrap returns a policy version'
);

select extensions.is(
  app_private.ensure_customer_assistant_publication_tools(
    'b4061000-0000-4000-8000-000000000001'
  ),
  (select policy_version_id from pg_temp.b406_policy),
  'owner publication tool bootstrap is idempotent'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.tool_contracts
    where organization_id = 'b4061000-0000-4000-8000-000000000001'
      and tool_name in (
        'catalog_resolve_recent', 'catalog_set_offer_status', 'publication_publish',
        'publication_enqueue_catalog', 'publication_get_status', 'publication_retry',
        'publication_set_batch_state'
      )
      and status = 'active'
  ),
  7,
  'exactly seven owner publication tools are active'
);

select extensions.is(
  (
    select count(*)::integer
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = 'b4061000-0000-4000-8000-000000000001'
      and policy_tool.policy_version_id = (select policy_version_id from pg_temp.b406_policy)
      and contract_value.tool_name in (
        'catalog_resolve_recent', 'catalog_set_offer_status', 'publication_publish',
        'publication_enqueue_catalog', 'publication_get_status', 'publication_retry',
        'publication_set_batch_state'
      )
      and policy_tool.allowed_actor_kinds = array['member']::text[]
      and policy_tool.required_membership_roles = array['owner', 'admin']::text[]
      and policy_tool.allowed_channels = array['whatsapp']::text[]
  ),
  7,
  'all publication mutations are restricted to WhatsApp owners and admins'
);

select extensions.is(
  (
    select jsonb_object_agg(version_value.effect_class, effect_count order by version_value.effect_class)
    from (
      select version_value.effect_class, count(*)::integer as effect_count
      from app_private.agent_policy_tools as policy_tool
      join app_private.tool_contract_versions as version_value
        on version_value.organization_id = policy_tool.organization_id
       and version_value.id = policy_tool.tool_contract_version_id
      join app_private.tool_contracts as contract_value
        on contract_value.organization_id = policy_tool.organization_id
       and contract_value.id = policy_tool.tool_contract_id
      where policy_tool.organization_id = 'b4061000-0000-4000-8000-000000000001'
        and policy_tool.policy_version_id = (select policy_version_id from pg_temp.b406_policy)
        and contract_value.tool_name in (
          'catalog_resolve_recent', 'catalog_set_offer_status', 'publication_publish',
          'publication_enqueue_catalog', 'publication_get_status', 'publication_retry',
          'publication_set_batch_state'
        )
      group by version_value.effect_class
    ) as version_value
  ),
  '{"external_effect": 3, "internal_mutation": 2, "read_only": 2}'::jsonb,
  'tool effect classes distinguish reads, mutations and external Meta effects'
);

select extensions.ok(
  not exists (
    select 1
    from app_private.agent_policy_tools as policy_tool
    join app_private.tool_contracts as contract_value
      on contract_value.organization_id = policy_tool.organization_id
     and contract_value.id = policy_tool.tool_contract_id
    where policy_tool.organization_id = 'b4061000-0000-4000-8000-000000000001'
      and policy_tool.policy_version_id = (select policy_version_id from pg_temp.b406_policy)
      and contract_value.tool_name in (
        'catalog_set_offer_status', 'publication_publish', 'publication_enqueue_catalog',
        'publication_retry', 'publication_set_batch_state'
      )
      and 'contact' = any(policy_tool.allowed_actor_kinds)
  ),
  'customer contacts cannot receive owner mutation tools'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'app_private'
      and indexname = 'publication_jobs_expired_publication_worker_idx'
  ),
  'expired publication job recovery has a bounded claim index'
);

select extensions.ok(
  exists (
    select 1
    from pg_catalog.pg_indexes
    where schemaname = 'app_private'
      and indexname = 'publication_batch_subscriptions_claim_idx'
  ),
  'terminal notification claims have a bounded worker index'
);

select * from extensions.finish();

rollback;
