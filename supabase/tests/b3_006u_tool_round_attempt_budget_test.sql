begin;

create extension if not exists pgtap with schema extensions;
set search_path = extensions, pg_catalog;
select extensions.plan(9);

select extensions.is(
  app_private.next_agent_tool_round_attempt_budget(8, 8, 1, 64), 16,
  'first successful tool round grants a fresh provider attempt allowance'
);
select extensions.is(
  app_private.next_agent_tool_round_attempt_budget(16, 8, 2, 64), 24,
  'a second tool round preserves monotonic attempt numbering'
);
select extensions.is(
  app_private.next_agent_tool_round_attempt_budget(2048, 32, 64, 64), 2080,
  'the last permitted tool round stays within the bounded audit budget'
);
select extensions.throws_ok(
  $$select app_private.next_agent_tool_round_attempt_budget(8, 8, 0, 64)$$,
  '22023', 'agent tool-round attempt budget is invalid',
  'no allowance is granted before a completed tool round'
);
select extensions.throws_ok(
  $$select app_private.next_agent_tool_round_attempt_budget(8, 8, 65, 64)$$,
  '22023', 'agent tool-round attempt budget is invalid',
  'a tool round beyond policy cannot extend the budget'
);
select extensions.throws_ok(
  $$select app_private.next_agent_tool_round_attempt_budget(16, 8, 1, 64)$$,
  '22023', 'agent tool-round attempt budget is invalid',
  'a repeated transition cannot grant the same round twice'
);
select extensions.has_trigger(
  'app_private', 'agent_jobs', 'agent_job_replenish_after_tools',
  'job allowance is renewed only after a terminal tool round'
);
select extensions.has_trigger(
  'app_private', 'agent_runs', 'agent_run_replenish_after_tools',
  'run allowance is renewed alongside the durable continuation'
);
select extensions.ok(
  not has_function_privilege(
    'service_role',
    'app_private.next_agent_tool_round_attempt_budget(integer,integer,integer,integer)',
    'EXECUTE'
  ),
  'client-facing service role cannot call the private budget function directly'
);

select * from extensions.finish();
rollback;
