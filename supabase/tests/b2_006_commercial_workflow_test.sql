begin;

create extension if not exists pgtap with schema extensions;

select extensions.plan(97);

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

-- Physical production contract.
select extensions.has_table('app_private', 'commercial_commands', 'commercial command ledger exists');
select extensions.has_table('app_private', 'contact_methods', 'encrypted contact methods table exists');
select extensions.has_table('app_private', 'pending_requests', 'pending requests table exists');
select extensions.has_table('app_private', 'leads', 'leads table exists');
select extensions.has_table('app_private', 'lead_interests', 'lead interests table exists');
select extensions.has_table('app_private', 'opportunities', 'opportunities table exists');
select extensions.has_table('app_private', 'conversation_assignments', 'conversation assignments table exists');
select extensions.has_table('app_private', 'handoffs', 'handoffs table exists');
select extensions.has_table('app_private', 'orders', 'orders table exists');
select extensions.has_table('app_private', 'order_lines', 'order lines table exists');
select extensions.has_table('app_private', 'order_reservation_links', 'order reservation links table exists');
select extensions.has_table('app_private', 'sales', 'sales table exists');
select extensions.has_table('app_private', 'sale_lines', 'sale lines table exists');
select extensions.has_table('app_private', 'commercial_events', 'commercial event ledger exists');

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'commercial_commands', 'contact_methods', 'pending_requests', 'leads',
        'lead_interests', 'opportunities', 'conversation_assignments', 'handoffs',
        'orders', 'order_lines', 'order_reservation_links', 'sales', 'sale_lines',
        'commercial_events'
      )
      and relation.relkind = 'v'
  ),
  14,
  'all fourteen B2-006 API views exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'api'
      and procedure.proname in (
        'register_contact_method', 'create_pending_request', 'resolve_pending_request',
        'record_commercial_notification', 'create_lead', 'create_opportunity',
        'create_handoff', 'transition_handoff', 'create_order',
        'link_order_reservation', 'transition_order', 'record_sale',
        'reconcile_sale_inventory'
      )
  ),
  13,
  'all thirteen B2-006 tool RPCs exist'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'app_private'
      and relation.relname in (
        'commercial_commands', 'contact_methods', 'pending_requests', 'leads',
        'lead_interests', 'opportunities', 'conversation_assignments', 'handoffs',
        'orders', 'order_lines', 'order_reservation_links', 'sales', 'sale_lines',
        'commercial_events'
      )
      and relation.relrowsecurity
      and relation.relforcerowsecurity
  ),
  14,
  'RLS is enabled and forced on every B2-006 table'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_policies
    where schemaname = 'app_private'
      and tablename in (
        'commercial_commands', 'contact_methods', 'pending_requests', 'leads',
        'lead_interests', 'opportunities', 'conversation_assignments', 'handoffs',
        'orders', 'order_lines', 'order_reservation_links', 'sales', 'sale_lines',
        'commercial_events'
      )
  ),
  14,
  'every B2-006 table has one tenant read policy'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'api'
      and relation.relname in (
        'commercial_commands', 'contact_methods', 'pending_requests', 'leads',
        'lead_interests', 'opportunities', 'conversation_assignments', 'handoffs',
        'orders', 'order_lines', 'order_reservation_links', 'sales', 'sale_lines',
        'commercial_events'
      )
      and coalesce(relation.reloptions, array[]::text[])
        @> array['security_invoker=true', 'security_barrier=true']::text[]
  ),
  14,
  'all B2-006 views preserve caller RLS and security barrier'
);

select extensions.is(
  (
    select count(*)::integer
    from pg_catalog.pg_constraint as foreign_key
    where foreign_key.contype = 'f'
      and foreign_key.conrelid in (
        'app_private.commercial_commands'::regclass,
        'app_private.contact_methods'::regclass,
        'app_private.pending_requests'::regclass,
        'app_private.leads'::regclass,
        'app_private.lead_interests'::regclass,
        'app_private.opportunities'::regclass,
        'app_private.conversation_assignments'::regclass,
        'app_private.handoffs'::regclass,
        'app_private.orders'::regclass,
        'app_private.order_lines'::regclass,
        'app_private.order_reservation_links'::regclass,
        'app_private.sales'::regclass,
        'app_private.sale_lines'::regclass,
        'app_private.commercial_events'::regclass
      )
      and not exists (
        select 1
        from pg_catalog.pg_index as index_value
        where index_value.indrelid = foreign_key.conrelid
          and index_value.indisvalid
          and index_value.indisready
          and (string_to_array(index_value.indkey::text, ' ')::smallint[])
            [1:cardinality(foreign_key.conkey)] = foreign_key.conkey
      )
  ),
  0,
  'every B2-006 foreign key column is indexed'
);

select extensions.ok(
  not has_table_privilege('anon', 'api.orders', 'SELECT')
    and not has_function_privilege(
      'anon',
      'api.record_sale(uuid,text,text,text,text,jsonb,uuid,uuid,uuid,uuid,text,uuid,timestamptz)',
      'EXECUTE'
    ),
  'anonymous commercial access remains disabled before the public catalog block'
);
select extensions.ok(
  has_table_privilege('authenticated', 'app_private.orders', 'SELECT')
    and not has_table_privilege('authenticated', 'app_private.orders', 'INSERT')
    and not has_table_privilege('authenticated', 'app_private.orders', 'UPDATE')
    and not has_table_privilege('authenticated', 'app_private.orders', 'DELETE'),
  'authenticated receives read-only order access through tenant RLS'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'app_private.contact_methods', 'value_ciphertext', 'SELECT')
    and not has_column_privilege('authenticated', 'app_private.contact_methods', 'value_fingerprint', 'SELECT')
    and has_column_privilege('authenticated', 'app_private.contact_methods', 'display_hint', 'SELECT'),
  'authenticated users cannot read contact ciphertext or fingerprints'
);
select extensions.ok(
  not has_column_privilege('authenticated', 'app_private.commercial_commands', 'request_payload', 'SELECT')
    and not has_column_privilege('authenticated', 'app_private.commercial_commands', 'request_fingerprint', 'SELECT'),
  'authenticated audit views do not expose command payloads or fingerprints'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.record_sale(uuid,text,text,text,text,jsonb,uuid,uuid,uuid,uuid,text,uuid,timestamptz)',
    'EXECUTE'
  )
    and not has_function_privilege(
      'authenticated',
      'api.record_sale(uuid,text,text,text,text,jsonb,uuid,uuid,uuid,uuid,text,uuid,timestamptz)',
      'EXECUTE'
    ),
  'commercial mutations remain backend-only tool contracts'
);
select extensions.ok(
  has_function_privilege(
    'service_role',
    'api.apply_inventory_movement(uuid,text,text,text,jsonb,text,text,uuid,timestamptz)',
    'EXECUTE'
  ),
  'B2-006 permissions preserve the certified inventory API'
);
select extensions.ok(
  has_function_privilege(
    'authenticated',
    'api.resolve_price_quote(uuid,uuid,uuid,numeric,timestamptz)',
    'EXECUTE'
  ),
  'B2-006 permissions preserve the certified quote resolver'
);

-- Transactional real-schema fixtures. Every row is rolled back.
set local role postgres;

insert into auth.users (id)
values
  ('61000000-0000-4000-8000-000000000001'),
  ('61000000-0000-4000-8000-000000000002'),
  ('61000000-0000-4000-8000-000000000003'),
  ('61000000-0000-4000-8000-000000000004'),
  ('62000000-0000-4000-8000-000000000001');

insert into app_private.organizations (id, name, created_by_user_id)
values
  ('61000000-0000-4000-8000-000000000010', 'B2-006 Organization A', '61000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000010', 'B2-006 Organization B', '62000000-0000-4000-8000-000000000001');

insert into app_private.organization_memberships (
  id, organization_id, user_id, role, status, joined_at
)
values
  ('61000000-0000-4000-8000-000000000011', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000001', 'owner', 'active', now()),
  ('61000000-0000-4000-8000-000000000012', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000002', 'operator', 'active', now()),
  ('61000000-0000-4000-8000-000000000013', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000003', 'viewer', 'active', now()),
  ('61000000-0000-4000-8000-000000000014', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000004', 'operator', 'suspended', now()),
  ('62000000-0000-4000-8000-000000000011', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000001', 'owner', 'active', now());

set constraints all immediate;

insert into app_private.channel_connections (
  id, organization_id, provider, channel, external_app_id, external_account_id,
  external_sender_id, display_name, api_version, credential_reference,
  webhook_secret_reference, status, connected_at, last_verified_at, created_by_user_id
)
values
  (
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000010',
    'meta', 'whatsapp', 'b2-006-app-a', 'b2-006-account-a', 'b2-006-sender-a',
    'B2-006 WhatsApp A', 'v24.0', 'secret-ref://b2-006/token-a',
    'secret-ref://b2-006/webhook-a', 'active', now(), now(),
    '61000000-0000-4000-8000-000000000001'
  ),
  (
    '62000000-0000-4000-8000-000000000020', '62000000-0000-4000-8000-000000000010',
    'meta', 'messenger', 'b2-006-app-b', 'b2-006-account-b', 'b2-006-sender-b',
    'B2-006 Messenger B', 'v24.0', 'secret-ref://b2-006/token-b',
    'secret-ref://b2-006/webhook-b', 'active', now(), now(),
    '62000000-0000-4000-8000-000000000001'
  );

insert into app_private.contacts (id, organization_id, display_name)
values
  ('61000000-0000-4000-8000-000000000030', '61000000-0000-4000-8000-000000000010', 'Customer A'),
  ('62000000-0000-4000-8000-000000000030', '62000000-0000-4000-8000-000000000010', 'Customer B');

insert into app_private.channel_identities (
  id, organization_id, channel_connection_id, external_subject_id,
  principal_type, contact_id, trust_level, display_name
)
values
  (
    '61000000-0000-4000-8000-000000000040', '61000000-0000-4000-8000-000000000010',
    '61000000-0000-4000-8000-000000000020', 'b2-006-customer-a', 'contact',
    '61000000-0000-4000-8000-000000000030', 'provider_observed', 'Customer A'
  ),
  (
    '62000000-0000-4000-8000-000000000040', '62000000-0000-4000-8000-000000000010',
    '62000000-0000-4000-8000-000000000020', 'b2-006-customer-b', 'contact',
    '62000000-0000-4000-8000-000000000030', 'provider_observed', 'Customer B'
  );

set constraints all deferred;

insert into app_private.conversations (
  id, organization_id, channel_connection_id, primary_channel_identity_id,
  origin_kind, origin_external_id, origin_context
)
values
  (
    '61000000-0000-4000-8000-000000000050', '61000000-0000-4000-8000-000000000010',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000040',
    'post', 'b2-006-post-a', '{"source":"qa"}'
  ),
  (
    '62000000-0000-4000-8000-000000000050', '62000000-0000-4000-8000-000000000010',
    '62000000-0000-4000-8000-000000000020', '62000000-0000-4000-8000-000000000040',
    'post', 'b2-006-post-b', '{"source":"qa"}'
  );

insert into app_private.conversation_participants (
  id, organization_id, channel_connection_id, conversation_id,
  participant_kind, participant_role, channel_identity_id
)
values
  (
    '61000000-0000-4000-8000-000000000060', '61000000-0000-4000-8000-000000000010',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    'identity', 'customer', '61000000-0000-4000-8000-000000000040'
  ),
  (
    '62000000-0000-4000-8000-000000000060', '62000000-0000-4000-8000-000000000010',
    '62000000-0000-4000-8000-000000000020', '62000000-0000-4000-8000-000000000050',
    'identity', 'customer', '62000000-0000-4000-8000-000000000040'
  );

set constraints all immediate;

insert into app_private.catalog_categories (id, organization_id, code, name, status)
values
  ('61000000-0000-4000-8000-000000000100', '61000000-0000-4000-8000-000000000010', 'sellable', 'Sellable', 'active'),
  ('62000000-0000-4000-8000-000000000100', '62000000-0000-4000-8000-000000000010', 'sellable', 'Sellable', 'active');

insert into app_private.catalog_units (
  id, organization_id, code, name_singular, name_plural, quantity_kind, decimal_scale
)
values
  ('61000000-0000-4000-8000-000000000110', '61000000-0000-4000-8000-000000000010', 'piece', 'piece', 'pieces', 'count', 0),
  ('62000000-0000-4000-8000-000000000110', '62000000-0000-4000-8000-000000000010', 'piece', 'piece', 'pieces', 'count', 0);

insert into app_private.products (id, organization_id, category_id, name, status)
values
  ('61000000-0000-4000-8000-000000000150', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000100', 'Priced product', 'active'),
  ('61000000-0000-4000-8000-000000000151', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000100', 'Quote product', 'active'),
  ('62000000-0000-4000-8000-000000000150', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000100', 'Private product', 'active');

insert into app_private.product_variants (id, organization_id, product_id, name, status)
values
  ('61000000-0000-4000-8000-000000000160', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000150', 'Priced variant', 'draft'),
  ('61000000-0000-4000-8000-000000000161', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000151', 'Quote variant', 'draft'),
  ('62000000-0000-4000-8000-000000000160', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000150', 'Private variant', 'draft');

insert into app_private.variant_skus (id, organization_id, variant_id, sku, status)
values
  ('61000000-0000-4000-8000-000000000170', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000160', 'AF-PRICED', 'current'),
  ('61000000-0000-4000-8000-000000000171', '61000000-0000-4000-8000-000000000010', '61000000-0000-4000-8000-000000000161', 'AF-QUOTE', 'current'),
  ('62000000-0000-4000-8000-000000000170', '62000000-0000-4000-8000-000000000010', '62000000-0000-4000-8000-000000000160', 'B-PRIVATE', 'current');

update app_private.product_variants
set status = 'active'
where id in (
  '61000000-0000-4000-8000-000000000160',
  '61000000-0000-4000-8000-000000000161',
  '62000000-0000-4000-8000-000000000160'
);

insert into app_private.catalog_evidence (
  id, organization_id, evidence_kind, content, created_by_user_id
)
values
  ('61000000-0000-4000-8000-000000000180', '61000000-0000-4000-8000-000000000010', 'owner_confirmation', '{"instruction":"commercial QA price"}', '61000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000180', '62000000-0000-4000-8000-000000000010', 'owner_confirmation', '{"instruction":"private QA price"}', '62000000-0000-4000-8000-000000000001');

insert into app_private.price_books (
  id, organization_id, code, name, currency_code, status, is_default, created_by_user_id
)
values
  ('61000000-0000-4000-8000-000000000200', '61000000-0000-4000-8000-000000000010', 'retail', 'Retail', 'MXN', 'active', true, '61000000-0000-4000-8000-000000000001'),
  ('62000000-0000-4000-8000-000000000200', '62000000-0000-4000-8000-000000000010', 'retail', 'Retail', 'MXN', 'active', true, '62000000-0000-4000-8000-000000000001');

insert into app_private.price_tiers (
  id, organization_id, price_book_id, variant_id, unit_id, quantity_min,
  quantity_max, pricing_status, calculation_method, price_amount, valid_from,
  valid_until, evidence_id, created_by_user_id
)
values
  (
    '61000000-0000-4000-8000-000000000300', '61000000-0000-4000-8000-000000000010',
    '61000000-0000-4000-8000-000000000200', '61000000-0000-4000-8000-000000000160',
    '61000000-0000-4000-8000-000000000110', 1, null, 'priced', 'per_unit', 1700,
    '2026-01-01 00:00:00+00', '2030-01-01 00:00:00+00',
    '61000000-0000-4000-8000-000000000180', '61000000-0000-4000-8000-000000000001'
  ),
  (
    '61000000-0000-4000-8000-000000000301', '61000000-0000-4000-8000-000000000010',
    '61000000-0000-4000-8000-000000000200', '61000000-0000-4000-8000-000000000161',
    '61000000-0000-4000-8000-000000000110', 1, null, 'on_request', null, null,
    '2026-01-01 00:00:00+00', '2030-01-01 00:00:00+00',
    '61000000-0000-4000-8000-000000000180', '61000000-0000-4000-8000-000000000001'
  );

insert into app_private.inventory_items (
  id, organization_id, variant_id, inventory_unit_id, created_by_user_id
)
values (
  '61000000-0000-4000-8000-000000000400',
  '61000000-0000-4000-8000-000000000010',
  '61000000-0000-4000-8000-000000000160',
  '61000000-0000-4000-8000-000000000110',
  '61000000-0000-4000-8000-000000000001'
);
insert into app_private.inventory_locations (
  id, organization_id, code, name, created_by_user_id
)
values (
  '61000000-0000-4000-8000-000000000410',
  '61000000-0000-4000-8000-000000000010',
  'commercial_qa', 'Commercial QA',
  '61000000-0000-4000-8000-000000000001'
);

set local role service_role;

-- Contact methods are encrypted before persistence and idempotent.
select extensions.lives_ok(
  $$select * from api.register_contact_method(
    '61000000-0000-4000-8000-000000000010', 'contact-method-a',
    '61000000-0000-4000-8000-000000000030', 'whatsapp',
    decode(repeat('ab', 48), 'hex'), decode(repeat('cd', 32), 'hex'),
    '*** 1234', 'kms://agentefer/contact-v1', 'order_followup', 'catalog_checkout',
    '2026-08-11 12:00:00+00', '61000000-0000-4000-8000-000000000001'
  )$$,
  'encrypted consented contact method is registered'
);
select extensions.ok(
  (select replayed from api.register_contact_method(
    '61000000-0000-4000-8000-000000000010', 'contact-method-a',
    '61000000-0000-4000-8000-000000000030', 'whatsapp',
    decode(repeat('ab', 48), 'hex'), decode(repeat('cd', 32), 'hex'),
    '*** 1234', 'kms://agentefer/contact-v1', 'order_followup', 'catalog_checkout',
    '2026-08-11 12:00:00+00', '61000000-0000-4000-8000-000000000001'
  )),
  'same contact method command replays'
);
select extensions.is(
  (select count(*)::integer from app_private.contact_methods),
  1,
  'contact method replay creates one encrypted row'
);
select pg_temp.throws_sqlstate(
  $$select * from api.register_contact_method(
    '61000000-0000-4000-8000-000000000010', 'contact-method-a',
    '61000000-0000-4000-8000-000000000030', 'email',
    decode(repeat('ef', 48), 'hex'), decode(repeat('01', 32), 'hex'),
    'f***@example.invalid', 'kms://agentefer/contact-v1', 'order_followup',
    'catalog_checkout', '2026-08-11 12:00:00+00',
    '61000000-0000-4000-8000-000000000001'
  )$$,
  '23505',
  'idempotency key cannot be reused for another contact method request'
);

-- Pending information survives ambiguity, resolution and delivery as separate facts.
select extensions.lives_ok(
  $$select * from api.create_pending_request(
    '61000000-0000-4000-8000-000000000010', 'pending-price-a',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    '61000000-0000-4000-8000-000000000030', 'missing_price',
    '["price"]', '{"customer_question":"price for four"}', null,
    '61000000-0000-4000-8000-000000000161', '61000000-0000-4000-8000-000000000110',
    4, '2027-01-01 00:00:00+00',
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'offer without price creates an identified pending request'
);
select extensions.ok(
  (select replayed from api.create_pending_request(
    '61000000-0000-4000-8000-000000000010', 'pending-price-a',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    '61000000-0000-4000-8000-000000000030', 'missing_price',
    '["price"]', '{"customer_question":"price for four"}', null,
    '61000000-0000-4000-8000-000000000161', '61000000-0000-4000-8000-000000000110',
    4, '2027-01-01 00:00:00+00',
    '61000000-0000-4000-8000-000000000002'
  )),
  'same pending request command replays'
);
select extensions.is(
  (select count(*)::integer from app_private.pending_requests),
  1,
  'pending request replay does not duplicate work'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_pending_request(
    '61000000-0000-4000-8000-000000000010', 'pending-price-a',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    '61000000-0000-4000-8000-000000000030', 'missing_stock',
    '["stock"]', '{}', null, '61000000-0000-4000-8000-000000000160',
    '61000000-0000-4000-8000-000000000110', 1,
    '2027-01-01 00:00:00+00', '61000000-0000-4000-8000-000000000002'
  )$$,
  '23505',
  'pending idempotency conflict leaves the first request intact'
);
select extensions.lives_ok(
  $$select * from api.resolve_pending_request(
    '61000000-0000-4000-8000-000000000010',
    (select result_id from app_private.commercial_commands where idempotency_key = 'pending-price-a'),
    'resolve-price-a', 'resolve', 'owner_answer', 'Four pieces cost 6000 MXN.',
    6000, 'MXN', '61000000-0000-4000-8000-000000000001', statement_timestamp()
  )$$,
  'owner answer resolves the exact pending request'
);
select extensions.is(
  (select status || ':' || response_delivery_status from app_private.pending_requests),
  'resolved:pending',
  'resolution does not falsely claim message delivery'
);
select pg_temp.throws_sqlstate(
  $$select * from api.resolve_pending_request(
    '61000000-0000-4000-8000-000000000010',
    (select result_id from app_private.commercial_commands where idempotency_key = 'pending-price-a'),
    'resolve-price-again', 'resolve', 'owner_answer', 'Changed answer',
    6100, 'MXN', '61000000-0000-4000-8000-000000000001', statement_timestamp()
  )$$,
  '23514',
  'closed pending request cannot be resolved twice'
);

set local role postgres;
insert into app_private.outbox_events (
  id, organization_id, channel_connection_id, conversation_id, operation,
  idempotency_key, payload, policy_status, policy_basis, policy_evaluated_at,
  status, attempt_count, completed_at
)
values (
  '61000000-0000-4000-8000-000000000070', '61000000-0000-4000-8000-000000000010',
  '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
  'commercial.pending_response', decode(repeat('70', 32), 'hex'), '{"qa":true}',
  'allowed', 'customer_service_window', now(), 'succeeded', 1, now()
);
set local role service_role;

select extensions.lives_ok(
  $$select * from api.record_commercial_notification(
    '61000000-0000-4000-8000-000000000010', 'pending_request',
    (select result_id from app_private.commercial_commands where idempotency_key = 'pending-price-a'),
    'pending-delivery-a', '61000000-0000-4000-8000-000000000070',
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'outbox evidence records successful pending response delivery'
);
select extensions.is(
  (select response_delivery_status from app_private.pending_requests),
  'succeeded',
  'pending response is delivered only after outbox success'
);

-- Leads keep both identified and unresolved customer interests.
select extensions.lives_ok(
  $$select * from api.create_lead(
    '61000000-0000-4000-8000-000000000010', 'lead-alpha',
    '61000000-0000-4000-8000-000000000030', 'whatsapp',
    'Customer wants one known product and another unidentified option.',
    '[
      {"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","quantity":4,"summary":"Four priced units","context":{"source":"conversation"}},
      {"summary":"Also asks for a larger unidentified model","context":{"requires_clarification":true}}
    ]',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'lead captures multiple interests without fabricating catalog identity'
);
select extensions.is(
  (select count(*)::integer from app_private.lead_interests),
  2,
  'lead preserves both customer interests'
);
select extensions.is(
  (select count(*)::integer from app_private.lead_interests where variant_id is null),
  1,
  'unidentified interest remains explicitly unresolved'
);
select extensions.ok(
  (select replayed from api.create_lead(
    '61000000-0000-4000-8000-000000000010', 'lead-alpha',
    '61000000-0000-4000-8000-000000000030', 'whatsapp',
    'Customer wants one known product and another unidentified option.',
    '[
      {"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","quantity":4,"summary":"Four priced units","context":{"source":"conversation"}},
      {"summary":"Also asks for a larger unidentified model","context":{"requires_clarification":true}}
    ]',
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    '61000000-0000-4000-8000-000000000002'
  )),
  'lead creation replays without duplicate interests'
);

-- Assignment and handoff remain distinct and atomic.
select extensions.lives_ok(
  $$select * from api.create_opportunity(
    '61000000-0000-4000-8000-000000000010', 'opportunity-a',
    (select result_id from app_private.commercial_commands where idempotency_key = 'lead-alpha'),
    'human_handoff', 'qualified', 'Qualified customer opportunity', 'agent',
    null, 'fer-sales-agent', 6800, 'MXN', '61000000-0000-4000-8000-000000000002'
  )$$,
  'qualified lead opens an opportunity assigned to the agent'
);
select extensions.is(
  (select assignee_kind || ':' || agent_key from app_private.conversation_assignments where ended_at is null),
  'agent:fer-sales-agent',
  'initial active assignment belongs to the configured agent'
);
select extensions.lives_ok(
  $$select * from api.create_handoff(
    '61000000-0000-4000-8000-000000000010', 'handoff-to-fer',
    (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
    'member', 'Customer is ready for Fer to close.', '{"requested_quantity":4}',
    '61000000-0000-4000-8000-000000000001', null,
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'handoff request to active owner is created'
);
select extensions.is(
  (select status from app_private.handoffs),
  'pending',
  'handoff request remains pending until acceptance'
);
select extensions.is(
  (select assignee_kind from app_private.conversation_assignments where ended_at is null),
  'agent',
  'pending handoff does not change responsibility'
);
select pg_temp.throws_sqlstate(
  $$select * from api.transition_handoff(
    '61000000-0000-4000-8000-000000000010',
    (select result_id from app_private.commercial_commands where idempotency_key = 'handoff-to-fer'),
    'accept-handoff-wrong-member', 'accept', 'Another operator cannot accept for Fer.',
    '61000000-0000-4000-8000-000000000002', statement_timestamp()
  )$$,
  '42501',
  'only the targeted member can accept a member handoff'
);
select extensions.lives_ok(
  $$select * from api.transition_handoff(
    '61000000-0000-4000-8000-000000000010',
    (select result_id from app_private.commercial_commands where idempotency_key = 'handoff-to-fer'),
    'accept-handoff-fer', 'accept', 'Fer accepted the qualified lead.',
    '61000000-0000-4000-8000-000000000001', statement_timestamp()
  )$$,
  'accepting handoff switches responsibility atomically'
);
select extensions.is(
  (select count(*)::integer from app_private.conversation_assignments where ended_at is null),
  1,
  'exactly one active assignment exists after handoff acceptance'
);
select extensions.is(
  (select member_user_id from app_private.conversation_assignments where ended_at is null),
  '61000000-0000-4000-8000-000000000001'::uuid,
  'accepted handoff assigns the opportunity to Fer'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_handoff(
    '61000000-0000-4000-8000-000000000010', 'handoff-same-owner',
    (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
    'member', 'Redundant assignment must fail.', '{}',
    '61000000-0000-4000-8000-000000000001', null,
    '61000000-0000-4000-8000-000000000001'
  )$$,
  '23514',
  'handoff cannot target the already active assignee'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_handoff(
    '61000000-0000-4000-8000-000000000010', 'handoff-suspended',
    (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
    'member', 'Suspended operator must fail.', '{}',
    '61000000-0000-4000-8000-000000000004', null,
    '61000000-0000-4000-8000-000000000001'
  )$$,
  '42501',
  'suspended member cannot receive handoff'
);

-- Checkout creates an order snapshot, never a sale or payment claim.
select extensions.lives_ok(
  $$select * from api.create_order(
    '61000000-0000-4000-8000-000000000010', 'order-priced-a',
    '61000000-0000-4000-8000-000000000030', 'catalog_checkout', 'human_handoff',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","price_tier_id":"61000000-0000-4000-8000-000000000300","quantity":4}]',
    '2026-08-11 12:00:00+00',
    (select result_id from app_private.commercial_commands where idempotency_key = 'contact-method-a'),
    (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    'Customer selected four units.', '61000000-0000-4000-8000-000000000002'
  )$$,
  'priced checkout creates an order request'
);
select extensions.is(
  (select status || ':' || total_amount::text from app_private.orders where creation_command_id = (
    select id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
  )),
  'pending_confirmation:6800',
  'order stores exact server-resolved per-unit total'
);
select extensions.is(
  (select count(*)::integer from app_private.sales),
  0,
  'checkout does not fabricate a sale'
);
select extensions.ok(
  (select replayed from api.create_order(
    '61000000-0000-4000-8000-000000000010', 'order-priced-a',
    '61000000-0000-4000-8000-000000000030', 'catalog_checkout', 'human_handoff',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","price_tier_id":"61000000-0000-4000-8000-000000000300","quantity":4}]',
    '2026-08-11 12:00:00+00',
    (select result_id from app_private.commercial_commands where idempotency_key = 'contact-method-a'),
    (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    'Customer selected four units.', '61000000-0000-4000-8000-000000000002'
  )),
  'repeated checkout returns the existing order'
);
select extensions.is(
  (select count(*)::integer from app_private.order_lines),
  1,
  'checkout replay does not duplicate lines'
);
select extensions.lives_ok(
  $$select * from api.create_order(
    '61000000-0000-4000-8000-000000000010', 'order-quote-a',
    '61000000-0000-4000-8000-000000000030', 'whatsapp', 'agent_close',
    '[{"variant_id":"61000000-0000-4000-8000-000000000161","unit_id":"61000000-0000-4000-8000-000000000110","price_tier_id":"61000000-0000-4000-8000-000000000301","quantity":2}]',
    '2026-08-11 12:00:00+00', null, null,
    '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
    null, '61000000-0000-4000-8000-000000000002'
  )$$,
  'on-request offer creates an order without invented price'
);
select extensions.ok(
  exists (
    select 1 from app_private.orders
    where creation_command_id = (
      select id from app_private.commercial_commands where idempotency_key = 'order-quote-a'
    ) and status = 'pending_quote' and total_amount is null and currency_code = 'MXN'
  ),
  'on-request order remains pending_quote with null amounts'
);
select extensions.lives_ok(
  $$select * from api.create_order(
    '61000000-0000-4000-8000-000000000010', 'order-web-notification',
    '61000000-0000-4000-8000-000000000030', 'catalog_web', 'human_handoff',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","price_tier_id":"61000000-0000-4000-8000-000000000300","quantity":1}]',
    '2026-08-11 12:00:00+00', null, null, null, null,
    'Web order must notify Fer on an independent channel.',
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'web checkout creates an order without fabricating an origin channel'
);

set local role postgres;
insert into app_private.outbox_events (
  id, organization_id, channel_connection_id, operation, idempotency_key,
  payload, policy_status, policy_basis, policy_evaluated_at,
  status, attempt_count, completed_at
)
values (
  '61000000-0000-4000-8000-000000000071', '61000000-0000-4000-8000-000000000010',
  '61000000-0000-4000-8000-000000000020', 'commercial.owner_notification',
  decode(repeat('71', 32), 'hex'), '{"qa":true}', 'allowed',
  'owner_operational_notification', now(), 'succeeded', 1, now()
);
set local role service_role;

select extensions.lives_ok(
  $$select * from api.record_commercial_notification(
    '61000000-0000-4000-8000-000000000010', 'order',
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-web-notification'),
    'order-web-notified', '61000000-0000-4000-8000-000000000071',
    '61000000-0000-4000-8000-000000000002'
  )$$,
  'web order notification can use Fer channel independently from order origin'
);
select extensions.is(
  (
    select notification_channel_connection_id
    from app_private.orders
    where id = (
      select result_id from app_private.commercial_commands
      where idempotency_key = 'order-web-notification'
    )
  ),
  '61000000-0000-4000-8000-000000000020'::uuid,
  'order records the actual notification channel without changing its origin'
);
select pg_temp.throws_sqlstate(
  $$select * from api.create_order(
    '61000000-0000-4000-8000-000000000010', 'order-cross-tenant',
    '62000000-0000-4000-8000-000000000030', 'catalog_checkout', 'agent_close',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","price_tier_id":"61000000-0000-4000-8000-000000000300","quantity":1}]',
    '2026-08-11 12:00:00+00'
  )$$,
  '23514',
  'order rejects contact from another organization'
);

select extensions.lives_ok(
  $$select * from api.transition_order(
    '61000000-0000-4000-8000-000000000010',
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    'confirm-order-a', 'confirm', 'Customer confirmed the exact order.',
    '61000000-0000-4000-8000-000000000002', statement_timestamp()
  )$$,
  'fully quoted order can be explicitly confirmed'
);

-- Partial sales, exact quote enforcement, oversell protection and partial reversals.
select extensions.lives_ok(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'sale-a-1', 'sale', 'human_close', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select id from app_private.order_lines where order_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 2, 'unit_amount', 1700, 'line_total_amount', 3400,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    null, null, null, 'First partial close.',
    '61000000-0000-4000-8000-000000000001', statement_timestamp()
  )$$,
  'first partial sale is recorded against exact order snapshot'
);
select extensions.is(
  (select status from app_private.orders where id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
  )),
  'partially_fulfilled',
  'partial sale does not mark whole order fulfilled'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'sale-wrong-price', 'sale', 'human_close', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select id from app_private.order_lines where order_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 1, 'unit_amount', 1800, 'line_total_amount', 1800,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')
  )$$,
  '23514',
  'sale cannot rewrite immutable order price'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'sale-duplicate-line', 'sale', 'human_close', 'MXN',
    jsonb_build_array(
      jsonb_build_object(
        'order_line_id', (select id from app_private.order_lines where order_id = (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')),
        'variant_id', '61000000-0000-4000-8000-000000000160', 'unit_id', '61000000-0000-4000-8000-000000000110',
        'quantity', 1, 'unit_amount', 1700, 'line_total_amount', 1700, 'inventory_effect_status', 'pending'
      ),
      jsonb_build_object(
        'order_line_id', (select id from app_private.order_lines where order_id = (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')),
        'variant_id', '61000000-0000-4000-8000-000000000160', 'unit_id', '61000000-0000-4000-8000-000000000110',
        'quantity', 1, 'unit_amount', 1700, 'line_total_amount', 1700, 'inventory_effect_status', 'pending'
      )
    ),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')
  )$$,
  '23514',
  'one request cannot duplicate an order line to bypass remaining quantity'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'sale-oversell', 'sale', 'human_close', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select id from app_private.order_lines where order_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 3, 'unit_amount', 1700, 'line_total_amount', 5100,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')
  )$$,
  '23514',
  'sale cannot exceed remaining order quantity'
);
select extensions.lives_ok(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'sale-a-2', 'sale', 'human_close', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select id from app_private.order_lines where order_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 2, 'unit_amount', 1700, 'line_total_amount', 3400,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a')
  )$$,
  'remaining quantity can be sold exactly once'
);
select extensions.is(
  (select status from app_private.orders where id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
  )),
  'fulfilled',
  'complete net quantity fulfills the order'
);
select extensions.lives_ok(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'reversal-a-1', 'reversal', 'correction', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select order_line_id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'reverses_sale_line_id', (select id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 1, 'unit_amount', 1700, 'line_total_amount', 1700,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    null, null, (select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1')
  )$$,
  'first partial reversal preserves original sale'
);
select extensions.is(
  (select status from app_private.orders where id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
  )),
  'partially_fulfilled',
  'partial reversal reopens fulfilled order to its net state'
);
select extensions.lives_ok(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'reversal-a-2', 'reversal', 'correction', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select order_line_id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'reverses_sale_line_id', (select id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 1, 'unit_amount', 1700, 'line_total_amount', 1700,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    null, null, (select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1')
  )$$,
  'second partial reversal is allowed while unreversed quantity remains'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'reversal-a-over', 'reversal', 'correction', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select order_line_id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'reverses_sale_line_id', (select id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 1, 'unit_amount', 1700, 'line_total_amount', 1700,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    null, null, (select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1')
  )$$,
  '23514',
  'cumulative reversals cannot exceed original sale line quantity'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'reversal-wrong-price', 'reversal', 'correction', 'MXN',
    jsonb_build_array(jsonb_build_object(
      'order_line_id', (select order_line_id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-2'
      )),
      'reverses_sale_line_id', (select id from app_private.sale_lines where sale_id = (
        select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-2'
      )),
      'variant_id', '61000000-0000-4000-8000-000000000160',
      'unit_id', '61000000-0000-4000-8000-000000000110',
      'quantity', 1, 'unit_amount', 1600, 'line_total_amount', 1600,
      'inventory_effect_status', 'pending'
    )),
    (select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'),
    null, null, (select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-2')
  )$$,
  '23514',
  'reversal cannot rewrite original unit amount'
);
select extensions.is(
  (select count(*)::integer from app_private.sales where sale_kind = 'sale'),
  2,
  'failed corrections never modify or duplicate original sales'
);

select extensions.lives_ok(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'external-sale-a', 'sale', 'walk_in', 'MXN',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","quantity":1,"unit_amount":1700,"line_total_amount":1700,"inventory_effect_status":"pending"}]',
    null, '61000000-0000-4000-8000-000000000030', null, null,
    'Physical movement requires reconciliation.', '61000000-0000-4000-8000-000000000001'
  )$$,
  'external sale can remain explicitly pending inventory reconciliation'
);
select extensions.is(
  (select inventory_effect_status from app_private.sale_lines where sale_id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
  )),
  'pending',
  'external sale never claims stock was applied without an inventory operation'
);
select pg_temp.throws_sqlstate(
  $$select * from api.record_sale(
    '61000000-0000-4000-8000-000000000010', 'fake-applied-sale', 'sale', 'walk_in', 'MXN',
    '[{"variant_id":"61000000-0000-4000-8000-000000000160","unit_id":"61000000-0000-4000-8000-000000000110","quantity":1,"unit_amount":1700,"line_total_amount":1700,"inventory_effect_status":"applied","inventory_operation_id":"61000000-0000-4000-8000-000000009999"}]'
  )$$,
  '23514',
  'applied inventory effect requires a real B2-005 operation'
);

select * from api.apply_inventory_movement(
  '61000000-0000-4000-8000-000000000010', 'commercial-qa-receipt',
  'receipt', 'stock used by commercial reconciliation QA',
  '[{"inventory_item_id":"61000000-0000-4000-8000-000000000400","location_id":"61000000-0000-4000-8000-000000000410","effect":"delta","quantity":1}]',
  'qa_fixture', 'commercial-reconciliation',
  '61000000-0000-4000-8000-000000000001', '2026-08-11 12:30:00+00'
);
select * from api.apply_inventory_movement(
  '61000000-0000-4000-8000-000000000010', 'commercial-qa-sale-effect',
  'sale', 'physical effect for external sale reconciliation',
  '[{"inventory_item_id":"61000000-0000-4000-8000-000000000400","location_id":"61000000-0000-4000-8000-000000000410","effect":"delta","quantity":-1}]',
  'sale_line',
  (select id::text from app_private.sale_lines where sale_id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
  )),
  '61000000-0000-4000-8000-000000000001', '2026-08-11 12:45:00+00'
);
select pg_temp.throws_sqlstate(
  $$select * from api.reconcile_sale_inventory(
    '61000000-0000-4000-8000-000000000010',
    (select id from app_private.sale_lines where sale_id = (
      select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
    )),
    'reconcile-wrong-direction',
    (select operation.id
      from app_private.inventory_operations as operation
      join app_private.inventory_commands as command_value
        on command_value.organization_id = operation.organization_id
        and command_value.id = operation.command_id
      where command_value.idempotency_key = extensions.digest(
        'commercial-qa-receipt', 'sha256'
      )),
    'receipt cannot reconcile a sale',
    '61000000-0000-4000-8000-000000000001', '2026-08-11 12:50:00+00'
  )$$,
  '23514',
  'real inventory operation with wrong direction cannot reconcile sale'
);
select extensions.lives_ok(
  $$select * from api.reconcile_sale_inventory(
    '61000000-0000-4000-8000-000000000010',
    (select id from app_private.sale_lines where sale_id = (
      select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
    )),
    'reconcile-external-sale-a',
    (select operation.id
      from app_private.inventory_operations as operation
      join app_private.inventory_commands as command_value
        on command_value.organization_id = operation.organization_id
        and command_value.id = operation.command_id
      where command_value.idempotency_key = extensions.digest(
        'commercial-qa-sale-effect', 'sha256'
      )),
    'physical stock movement verified',
    '61000000-0000-4000-8000-000000000001', '2026-08-11 13:00:00+00'
  )$$,
  'pending sale inventory can be reconciled with one exact physical operation'
);
select extensions.is(
  (select inventory_effect_status from app_private.sale_lines where sale_id = (
    select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
  )),
  'applied',
  'successful reconciliation changes only operational inventory status'
);
select extensions.ok(
  (select replayed from api.reconcile_sale_inventory(
    '61000000-0000-4000-8000-000000000010',
    (select id from app_private.sale_lines where sale_id = (
      select result_id from app_private.commercial_commands where idempotency_key = 'external-sale-a'
    )),
    'reconcile-external-sale-a',
    (select operation.id
      from app_private.inventory_operations as operation
      join app_private.inventory_commands as command_value
        on command_value.organization_id = operation.organization_id
        and command_value.id = operation.command_id
      where command_value.idempotency_key = extensions.digest(
        'commercial-qa-sale-effect', 'sha256'
      )),
    'physical stock movement verified',
    '61000000-0000-4000-8000-000000000001', '2026-08-11 13:00:00+00'
  )),
  'inventory reconciliation command replays without a second effect'
);

-- History, RLS and isolation survive privileged and tenant-bound access.
set local role postgres;
select pg_temp.throws_sqlstate(
  $$insert into app_private.conversation_assignments (
      organization_id, opportunity_id, channel_connection_id, conversation_id,
      assignee_kind, member_user_id, reason
    ) values (
      '61000000-0000-4000-8000-000000000010',
      (select result_id from app_private.commercial_commands where idempotency_key = 'opportunity-a'),
      '61000000-0000-4000-8000-000000000020', '61000000-0000-4000-8000-000000000050',
      'member', '61000000-0000-4000-8000-000000000002', 'duplicate owner race'
    )$$,
  '23505',
  'database permits only one active responsibility assignment'
);
select pg_temp.throws_sqlstate(
  $$update app_private.orders
    set total_amount = 1
    where id = (
      select result_id from app_private.commercial_commands where idempotency_key = 'order-priced-a'
    )$$,
  '23514',
  'order commercial snapshot cannot be rewritten'
);
select pg_temp.throws_sqlstate(
  $$insert into app_private.sale_lines (
      organization_id, sale_id, line_number, order_line_id, reverses_sale_line_id,
      variant_id, unit_id, quantity, unit_amount, line_total_amount,
      product_name_snapshot, variant_name_snapshot, sku_snapshot, unit_code_snapshot,
      inventory_effect_status
    )
    select organization_id,
      (select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-2'),
      99, order_line_id, id, variant_id, unit_id, 1, unit_amount, unit_amount,
      product_name_snapshot, variant_name_snapshot, sku_snapshot, unit_code_snapshot,
      'pending'
    from app_private.sale_lines
    where sale_id = (
      select result_id from app_private.commercial_commands where idempotency_key = 'sale-a-1'
    )$$,
  '23514',
  'ordinary sale cannot receive a line that claims to reverse history'
);
select pg_temp.throws_sqlstate(
  $$update app_private.sales
    set total_amount = total_amount + 1
    where sale_kind = 'sale'$$,
  '23514',
  'sale headers remain append-only even for privileged maintenance'
);
select pg_temp.throws_sqlstate(
  $$update app_private.sale_lines set quantity = 999 where organization_id = '61000000-0000-4000-8000-000000000010'$$,
  '23514',
  'sale lines remain append-only even for privileged maintenance'
);
select pg_temp.throws_sqlstate(
  $$delete from app_private.commercial_events where organization_id = '61000000-0000-4000-8000-000000000010'$$,
  '23514',
  'commercial events remain append-only'
);
select extensions.is(
  (
    select count(*)::integer from app_private.sale_lines
    where organization_id = '61000000-0000-4000-8000-000000000010' and quantity = 999
  ),
  0,
  'rejected history mutation persists no tampering'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '61000000-0000-4000-8000-000000000003', true);
select extensions.ok(
  exists (
    select 1 from api.orders
    where organization_id = '61000000-0000-4000-8000-000000000010'
  ),
  'viewer can read own organization commercial projections'
);
select extensions.is(
  (
    select count(*)::integer from api.orders
    where organization_id = '62000000-0000-4000-8000-000000000010'
  ),
  0,
  'RLS does not leak another organization orders'
);
select extensions.is(
  (
    select count(*)::integer from api.contact_methods
    where organization_id = '62000000-0000-4000-8000-000000000010'
  ),
  0,
  'RLS does not leak another organization contact metadata'
);

select * from extensions.finish();

rollback;
