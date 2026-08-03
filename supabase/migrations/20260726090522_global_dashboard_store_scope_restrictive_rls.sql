-- Targeted correction: permissive SELECT policies are OR-combined by Postgres.
-- Store Admin therefore needs restrictive policies so assigned-store scope
-- cannot be bypassed by a broader module permission policy.

do $$
declare
  policy_row record;
begin
  for policy_row in
    select *
    from (values
      ('orders', 'global dashboard store scope orders',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(id))'),
      ('order_items', 'global dashboard store scope order items',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('order_payments', 'global dashboard store scope order payments',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('refund_cases', 'global dashboard store scope refund cases',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('order_store_assignments', 'global dashboard store scope order assignments',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('job_orders', 'global dashboard store scope job orders',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('fulfillments', 'global dashboard store scope fulfillments',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_order(order_id))'),
      ('inventory_locations', 'global dashboard store scope inventory locations',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_store(store_id))'),
      ('inventory_balances', 'global dashboard store scope inventory balances',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_inventory_location(location_id))'),
      ('stores', 'global dashboard store scope stores',
        '(public.current_actor_role() <> ''store_admin'' or public.can_access_store(id))')
    ) as policies(table_name, policy_name, predicate)
  loop
    if to_regclass(format('public.%I', policy_row.table_name)) is not null then
      execute format(
        'drop policy if exists %I on public.%I',
        policy_row.policy_name,
        policy_row.table_name
      );
      execute format(
        'create policy %I on public.%I as restrictive for select to authenticated using (%s)',
        policy_row.policy_name,
        policy_row.table_name,
        policy_row.predicate
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if to_regclass('public.work_items') is not null then
    drop policy if exists "global dashboard store scope work items" on public.work_items;
    create policy "global dashboard store scope work items"
      on public.work_items as restrictive for select to authenticated
      using (
        public.current_actor_role() <> 'store_admin'
        or exists (
          select 1
          from public.job_orders job_order
          where job_order.id = work_items.job_order_id
            and public.can_access_order(job_order.order_id)
        )
      );
  end if;

  if to_regclass('public.qc_records') is not null then
    drop policy if exists "global dashboard store scope qc records" on public.qc_records;
    create policy "global dashboard store scope qc records"
      on public.qc_records as restrictive for select to authenticated
      using (
        public.current_actor_role() <> 'store_admin'
        or exists (
          select 1
          from public.job_orders job_order
          where job_order.id = qc_records.job_order_id
            and public.can_access_order(job_order.order_id)
        )
      );
  end if;
end
$$;
