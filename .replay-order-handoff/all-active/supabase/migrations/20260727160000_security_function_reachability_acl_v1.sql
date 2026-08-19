-- DEBRODER Security Function Reachability ACL V1
-- Targeted additive ACL correction only.
--
-- Mandatory scope:
--   1. Remove PUBLIC/anon/authenticated EXECUTE from next_* numbering wrappers.
--   2. Preserve service_role EXECUTE on those wrappers.
--   3. Remove PUBLIC/anon EXECUTE from an explicit allowlisted set of admin RPCs.
--   4. Preserve authenticated/service_role EXECUTE on those admin RPCs.
--
-- Explicitly out of scope:
--   - No function body replacement or redesign.
--   - No numbering-rule, sequence, registry, order, payment, or trial-record mutation.
--   - No historical migration modification.
--   - No wildcard function revocation.
--   - No grant change for intentional public token endpoints or RLS helpers.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create temporary table security_function_reachability_acl_v1_snapshot (
  snapshot_key text primary key,
  snapshot_value jsonb not null
) on commit drop;

create temporary table security_function_reachability_acl_v1_admin_functions (
  signature text primary key
) on commit drop;

insert into security_function_reachability_acl_v1_admin_functions(signature)
values
  ('public.create_document_number_rule(text,text,boolean,boolean,integer,text,text)'),
  ('public.update_document_number_rule(text,text,boolean,boolean,integer,text,text,boolean)'),
  ('public.archive_document_number_rule(text,text)'),
  ('public.restore_document_number_rule(text)'),
  ('public.permanently_delete_order(uuid)'),
  ('public.create_order_payment(uuid,bigint,timestamp with time zone,text,text,text,text,text,text,text,text,text,bigint)'),
  ('public.update_order_payment_draft(uuid,bigint,timestamp with time zone,text,text,text,text,text)'),
  ('public.archive_order_payment(uuid,text)'),
  ('public.restore_order_payment(uuid)'),
  ('public.permanently_delete_order_payment(uuid)'),
  ('public.archive_payment_adjustment(uuid,text)'),
  ('public.restore_payment_adjustment(uuid)'),
  ('public.permanently_delete_payment_adjustment(uuid)'),
  ('public.create_payment_submission_link(uuid,timestamp with time zone,integer)'),
  ('public.revoke_payment_submission_link(uuid,text)'),
  ('public.archive_payment_submission_link(uuid,text)'),
  ('public.restore_payment_submission_link(uuid)'),
  ('public.permanently_delete_payment_submission_link(uuid)'),
  ('public.update_role_permission(text,text,boolean)'),
  ('public.transition_quotation_status(uuid,text,text)'),
  ('public.create_quotation_revision(uuid,text)'),
  ('public.refresh_quotation_totals(uuid)'),
  ('public.convert_quotation_to_order(uuid)'),
  ('public.permanently_delete_quotation(uuid)'),
  ('public.permanently_delete_quotation_item(uuid)'),
  ('public.permanently_delete_quotation_item_service(uuid)'),
  ('public.create_qc_record(uuid,integer,jsonb,text)'),
  ('public.begin_qc_record(uuid,text)'),
  ('public.update_qc_record_draft(uuid,integer,jsonb,text)'),
  ('public.update_qc_record_draft(uuid,integer,jsonb,text,text)'),
  ('public.archive_qc_record(uuid,text)'),
  ('public.restore_qc_record(uuid)'),
  ('public.register_qc_file(uuid,text,text,text,bigint)'),
  ('public.create_qc_checklist_template(text,text,text,integer)'),
  ('public.update_qc_checklist_template(uuid,text,text,integer,boolean)'),
  ('public.archive_qc_checklist_template(uuid,text)'),
  ('public.restore_qc_checklist_template(uuid)'),
  ('public.permanently_delete_qc_checklist_template(uuid)');

-- Fail closed unless the database still matches the approved reachability audit.
do $preflight$
declare
  pgcrypto_schema text;
  next_order_oid regprocedure;
  next_payment_oid regprocedure;
  next_quotation_oid regprocedure;
  function_oid regprocedure;
  function_row record;
  function_hash text;
  active_order_rule_count integer;
begin
  select n.nspname
  into pgcrypto_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'SECURITY ACL V1: pgcrypto extension is not installed';
  end if;

  if pg_catalog.to_regprocedure(
    pg_catalog.format('%I.digest(text,text)', pgcrypto_schema)
  ) is null then
    raise exception 'SECURITY ACL V1: pgcrypto digest(text,text) is unavailable';
  end if;

  next_order_oid := pg_catalog.to_regprocedure('public.next_order_number()');
  next_payment_oid := pg_catalog.to_regprocedure('public.next_payment_number()');
  next_quotation_oid := pg_catalog.to_regprocedure('public.next_quotation_number()');

  if next_order_oid is null then
    raise exception 'SECURITY ACL V1: public.next_order_number() is missing';
  end if;
  if next_payment_oid is null then
    raise exception 'SECURITY ACL V1: public.next_payment_number() is missing';
  end if;
  if next_quotation_oid is null then
    raise exception 'SECURITY ACL V1: public.next_quotation_number() is missing';
  end if;

  if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = next_order_oid::oid) then
    raise exception 'SECURITY ACL V1: public.next_order_number() is not SECURITY DEFINER';
  end if;
  if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = next_payment_oid::oid) then
    raise exception 'SECURITY ACL V1: public.next_payment_number() is not SECURITY DEFINER';
  end if;
  if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = next_quotation_oid::oid) then
    raise exception 'SECURITY ACL V1: public.next_quotation_number() is not SECURITY DEFINER';
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
    pgcrypto_schema
  ) using next_order_oid::oid into function_hash;
  if function_hash <> '2a1ea111ef18f14e2fdeb72cf597e79425e48b0d143804b56a2af9d4b8e53e17' then
    raise exception 'SECURITY ACL V1: next_order_number definition drift: %', function_hash;
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
    pgcrypto_schema
  ) using next_payment_oid::oid into function_hash;
  if function_hash <> '494a35d8215e4facf45a2fa86aeb9b621e75f3af9f424b5f97c31fbe58b5d56c' then
    raise exception 'SECURITY ACL V1: next_payment_number definition drift: %', function_hash;
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
    pgcrypto_schema
  ) using next_quotation_oid::oid into function_hash;
  if function_hash <> 'a605c27d6e1a16eebb32b376f915323edda4514f6273f6d15e08a19240366b5c' then
    raise exception 'SECURITY ACL V1: next_quotation_number definition drift: %', function_hash;
  end if;

  -- The replay prefix has intentionally different trusted-role grants:
  -- Phase 6 may grant authenticated, Phase 5B revokes it for payment, and
  -- the baseline may grant service_role for quotation numbering.  The
  -- security invariant before this migration is that neither PUBLIC nor
  -- anon can execute these SECURITY DEFINER wrappers.  The final postflight
  -- below establishes the single service_role-only contract.
  if pg_catalog.has_function_privilege('public', next_order_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_order_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: unexpected next_order_number baseline ACL';
  end if;

  if pg_catalog.has_function_privilege('public', next_payment_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_payment_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: unexpected next_payment_number baseline ACL';
  end if;

  if pg_catalog.has_function_privilege('public', next_quotation_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_quotation_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: unexpected next_quotation_number baseline ACL';
  end if;

  select count(*)
  into active_order_rule_count
  from public.document_number_rules r
  where r.document_type = 'order'
    and r.active
    and r.archived_at is null;

  if active_order_rule_count <> 1 then
    raise exception 'SECURITY ACL V1: expected exactly one active order numbering rule';
  end if;

  if not exists (
    select 1
    from public.document_number_rules r
    where r.document_type = 'order'
      and r.prefix = 'ORD-DEB'
      and r.use_year = true
      and r.use_month = false
      and r.padding = 4
      and r.separator = '-'
      and r.reset_rule = 'yearly'
      and r.active = true
      and r.archived_at is null
  ) then
    raise exception 'SECURITY ACL V1: canonical active order numbering rule changed';
  end if;

  -- These functions are an explicit identity allowlist, not an ACL
  -- precondition. Earlier phases may already have removed anon and/or
  -- service_role execution from individual functions. The migration owns
  -- the final ACL and the postflight below proves it after the cleanup.
  for function_row in
    select signature
    from security_function_reachability_acl_v1_admin_functions
    order by signature
  loop
    function_oid := pg_catalog.to_regprocedure(function_row.signature);

    if function_oid is null then
      -- Some allowlisted signatures are retired historical RPCs. Their
      -- absence is the secure fresh-install state; never fabricate them.
      continue;
    end if;

    if not (select p.prosecdef from pg_catalog.pg_proc p where p.oid = function_oid::oid) then
      raise exception 'SECURITY ACL V1: expected SECURITY DEFINER admin function: %', function_row.signature;
    end if;
  end loop;

  if pg_catalog.to_regprocedure('public.get_public_mockup_review(text)') is null
     or pg_catalog.to_regprocedure('public.submit_mockup_part_decision(text,uuid,text,text)') is null then
    raise exception 'SECURITY ACL V1: intentional public mockup token endpoint is missing';
  end if;

  if not pg_catalog.has_function_privilege(
       'anon',
       pg_catalog.to_regprocedure('public.get_public_mockup_review(text)'),
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       pg_catalog.to_regprocedure('public.submit_mockup_part_decision(text,uuid,text,text)'),
       'EXECUTE'
     ) then
    raise exception 'SECURITY ACL V1: intentional public mockup token endpoint is not anon-callable';
  end if;
end
$preflight$;

-- Record exact pre-change state inside this transaction.
insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'function_definitions',
  pg_catalog.jsonb_object_agg(p.proname, pg_catalog.pg_get_functiondef(p.oid))
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('next_order_number','next_payment_number','next_quotation_number');

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'numbering_rules',
  coalesce(
    pg_catalog.jsonb_agg(to_jsonb(r) order by r.document_type),
    '[]'::jsonb
  )
from public.document_number_rules r;

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'numbering_sequences',
  coalesce(
    pg_catalog.jsonb_agg(to_jsonb(s) order by s.document_type, s.period_key),
    '[]'::jsonb
  )
from public.document_number_sequences s;

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'numbering_registry_counts',
  pg_catalog.jsonb_build_object(
    'total', count(*)::bigint,
    'by_type', coalesce(
      (
        select pg_catalog.jsonb_object_agg(x.document_type, x.row_count)
        from (
          select i.document_type, count(*)::bigint as row_count
          from public.document_number_issues i
          group by i.document_type
          order by i.document_type
        ) x
      ),
      '{}'::jsonb
    )
  )
from public.document_number_issues;

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'historical_order_numbers',
  pg_catalog.jsonb_build_object(
    'count', count(*)::bigint,
    'checksum', pg_catalog.md5(
      coalesce(
        pg_catalog.string_agg(
          o.id::text || ':' || coalesce(o.order_number,''),
          '|' order by o.id::text
        ),
        ''
      )
    )
  )
from public.orders o;

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'attached_triggers',
  pg_catalog.jsonb_build_object(
    'count', count(*)::bigint,
    'checksum', pg_catalog.md5(
      coalesce(
        pg_catalog.string_agg(
          n.nspname || '.' || c.relname || ':' || t.tgname || ':' || t.tgfoid::text,
          '|' order by n.nspname, c.relname, t.tgname
        ),
        ''
      )
    )
  )
from pg_catalog.pg_trigger t
join pg_catalog.pg_class c on c.oid = t.tgrelid
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where not t.tgisinternal;

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'intentional_public_token_acl',
  pg_catalog.jsonb_object_agg(
    requested.signature,
    pg_catalog.jsonb_build_object(
      'public', pg_catalog.has_function_privilege('public', requested.function_oid, 'EXECUTE'),
      'anon', pg_catalog.has_function_privilege('anon', requested.function_oid, 'EXECUTE'),
      'authenticated', pg_catalog.has_function_privilege('authenticated', requested.function_oid, 'EXECUTE'),
      'service_role', pg_catalog.has_function_privilege('service_role', requested.function_oid, 'EXECUTE')
    )
  )
from (
  values
    (
      'public.get_public_mockup_review(text)',
      pg_catalog.to_regprocedure('public.get_public_mockup_review(text)')
    ),
    (
      'public.submit_mockup_part_decision(text,uuid,text,text)',
      pg_catalog.to_regprocedure('public.submit_mockup_part_decision(text,uuid,text,text)')
    )
) as requested(signature, function_oid);

insert into security_function_reachability_acl_v1_snapshot(snapshot_key, snapshot_value)
select
  'admin_acl',
  pg_catalog.jsonb_object_agg(
    f.signature,
    pg_catalog.jsonb_build_object(
      'public', pg_catalog.has_function_privilege('public', pg_catalog.to_regprocedure(f.signature), 'EXECUTE'),
      'anon', pg_catalog.has_function_privilege('anon', pg_catalog.to_regprocedure(f.signature), 'EXECUTE'),
      'authenticated', pg_catalog.has_function_privilege('authenticated', pg_catalog.to_regprocedure(f.signature), 'EXECUTE'),
      'service_role', pg_catalog.has_function_privilege('service_role', pg_catalog.to_regprocedure(f.signature), 'EXECUTE')
    )
  )
from security_function_reachability_acl_v1_admin_functions f;

-- Mandatory critical correction: wrappers remain available only to service_role.
revoke execute
on function public.next_order_number()
from public, anon, authenticated;

grant execute
on function public.next_order_number()
to service_role;

revoke execute
on function public.next_payment_number()
from public, anon, authenticated;

grant execute
on function public.next_payment_number()
to service_role;

revoke execute
on function public.next_quotation_number()
from public, anon, authenticated;

grant execute
on function public.next_quotation_number()
to service_role;

-- Targeted admin cleanup. The signatures are explicitly enumerated above.
do $admin_acl_cleanup$
declare
  function_row record;
  function_oid regprocedure;
  function_identity text;
begin
  for function_row in
    select signature
    from security_function_reachability_acl_v1_admin_functions
    order by signature
  loop
    function_oid := pg_catalog.to_regprocedure(function_row.signature);

    if function_oid is null then
      continue;
    end if;

    select pg_catalog.format(
      '%I.%I(%s)',
      n.nspname,
      p.proname,
      pg_catalog.pg_get_function_identity_arguments(p.oid)
    )
    into function_identity
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where p.oid = function_oid::oid;

    execute pg_catalog.format(
      'revoke execute on function %s from public, anon',
      function_identity
    );

    execute pg_catalog.format(
      'grant execute on function %s to authenticated, service_role',
      function_identity
    );
  end loop;
end
$admin_acl_cleanup$;

-- Transaction-local postflight proves ACL-only behavior and data invariance.
do $postflight$
declare
  next_order_oid regprocedure := pg_catalog.to_regprocedure('public.next_order_number()');
  next_payment_oid regprocedure := pg_catalog.to_regprocedure('public.next_payment_number()');
  next_quotation_oid regprocedure := pg_catalog.to_regprocedure('public.next_quotation_number()');
  function_row record;
  function_oid regprocedure;
  expected_snapshot jsonb;
  actual_snapshot jsonb;
begin
  if pg_catalog.has_function_privilege('public', next_order_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_order_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', next_order_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', next_order_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: next_order_number ACL postflight failed';
  end if;

  if pg_catalog.has_function_privilege('public', next_payment_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_payment_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', next_payment_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', next_payment_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: next_payment_number ACL postflight failed';
  end if;

  if pg_catalog.has_function_privilege('public', next_quotation_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('anon', next_quotation_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', next_quotation_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', next_quotation_oid, 'EXECUTE') then
    raise exception 'SECURITY ACL V1: next_quotation_number ACL postflight failed';
  end if;

  for function_row in
    select signature
    from security_function_reachability_acl_v1_admin_functions
    order by signature
  loop
    function_oid := pg_catalog.to_regprocedure(function_row.signature);

    if function_oid is null then
      continue;
    end if;

    if pg_catalog.has_function_privilege('public', function_oid, 'EXECUTE')
       or pg_catalog.has_function_privilege('anon', function_oid, 'EXECUTE')
       or not pg_catalog.has_function_privilege('authenticated', function_oid, 'EXECUTE')
       or not pg_catalog.has_function_privilege('service_role', function_oid, 'EXECUTE') then
      raise exception 'SECURITY ACL V1: admin ACL postflight failed: %', function_row.signature;
    end if;
  end loop;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'function_definitions';

  select pg_catalog.jsonb_object_agg(p.proname, pg_catalog.pg_get_functiondef(p.oid))
  into actual_snapshot
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('next_order_number','next_payment_number','next_quotation_number');

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: numbering function definitions changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'numbering_rules';

  select coalesce(
    pg_catalog.jsonb_agg(to_jsonb(r) order by r.document_type),
    '[]'::jsonb
  )
  into actual_snapshot
  from public.document_number_rules r;

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: numbering rules changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'numbering_sequences';

  select coalesce(
    pg_catalog.jsonb_agg(to_jsonb(s) order by s.document_type, s.period_key),
    '[]'::jsonb
  )
  into actual_snapshot
  from public.document_number_sequences s;

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: numbering sequence values changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'numbering_registry_counts';

  select pg_catalog.jsonb_build_object(
    'total', count(*)::bigint,
    'by_type', coalesce(
      (
        select pg_catalog.jsonb_object_agg(x.document_type, x.row_count)
        from (
          select i.document_type, count(*)::bigint as row_count
          from public.document_number_issues i
          group by i.document_type
          order by i.document_type
        ) x
      ),
      '{}'::jsonb
    )
  )
  into actual_snapshot
  from public.document_number_issues;

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: numbering registry counts changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'historical_order_numbers';

  select pg_catalog.jsonb_build_object(
    'count', count(*)::bigint,
    'checksum', pg_catalog.md5(
      coalesce(
        pg_catalog.string_agg(
          o.id::text || ':' || coalesce(o.order_number,''),
          '|' order by o.id::text
        ),
        ''
      )
    )
  )
  into actual_snapshot
  from public.orders o;

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: historical order numbers changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'attached_triggers';

  select pg_catalog.jsonb_build_object(
    'count', count(*)::bigint,
    'checksum', pg_catalog.md5(
      coalesce(
        pg_catalog.string_agg(
          n.nspname || '.' || c.relname || ':' || t.tgname || ':' || t.tgfoid::text,
          '|' order by n.nspname, c.relname, t.tgname
        ),
        ''
      )
    )
  )
  into actual_snapshot
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class c on c.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where not t.tgisinternal;

  if actual_snapshot is distinct from expected_snapshot then
    raise exception 'SECURITY ACL V1: attached trigger set changed';
  end if;

  select snapshot_value
  into expected_snapshot
  from security_function_reachability_acl_v1_snapshot
  where snapshot_key = 'intentional_public_token_acl';

  select pg_catalog.jsonb_object_agg(
    requested.signature,
    pg_catalog.jsonb_build_object(
      'public', pg_catalog.has_function_privilege('public', requested.function_oid, 'EXECUTE'),
      'anon', pg_catalog.has_function_privilege('anon', requested.function_oid, 'EXECUTE'),
      'authenticated', pg_catalog.has_function_privilege('authenticated', requested.function_oid, 'EXECUTE'),
      'service_role', pg_catalog.has_function_privilege('service_role', requested.function_oid, 'EXECUTE')
    )
  )
  into actual_snapshot
  from (
    values
      (
        'public.get_public_mockup_review(text)',
        pg_catalog.to_regprocedure('public.get_public_mockup_review(text)')
      ),
      (
        'public.submit_mockup_part_decision(text,uuid,text,text)',
        pg_catalog.to_regprocedure('public.submit_mockup_part_decision(text,uuid,text,text)')
      )
  ) as requested(signature, function_oid);

  if actual_snapshot is distinct from expected_snapshot
     or not pg_catalog.has_function_privilege(
       'anon',
       pg_catalog.to_regprocedure('public.get_public_mockup_review(text)'),
       'EXECUTE'
     )
     or not pg_catalog.has_function_privilege(
       'anon',
       pg_catalog.to_regprocedure('public.submit_mockup_part_decision(text,uuid,text,text)'),
       'EXECUTE'
     ) then
    raise exception 'SECURITY ACL V1: intentional public mockup token ACL changed';
  end if;
end
$postflight$;

commit;
