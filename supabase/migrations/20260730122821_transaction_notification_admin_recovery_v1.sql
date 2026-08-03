begin;

-- Break the job_orders -> work_items -> job_orders RLS recursion while
-- retaining the canonical operator assignment boundary.
create or replace function public.operator_can_access_job_order(
  p_job_order_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.work_items work_item
    where work_item.job_order_id = p_job_order_id
      and work_item.assigned_to = auth.uid()
  );
$function$;

revoke all on function public.operator_can_access_job_order(uuid)
from public, anon;
grant execute on function public.operator_can_access_job_order(uuid)
to authenticated;

drop policy if exists "phase13 production job order read"
on public.job_orders;

create policy "phase13 production job order read"
on public.job_orders
for select
to authenticated
using (
  public.has_permission('production.view')
  and (
    public.current_actor_role() <> 'operator'
    or public.operator_can_access_job_order(id)
  )
);

-- Patch only the three live functions whose generic record is read after a
-- tier lookup can legitimately return no row. pg_get_functiondef preserves
-- every unrelated production rule while the guards below fail closed if the
-- expected canonical body is absent.
do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure
  )
  into function_definition;

  if position('tier_row record;' in function_definition) = 0
     or position('select ppt.unit_price, ppt.quote_required into tier_row' in function_definition) = 0
     or position('coalesce(tier_row.unit_price::bigint,' in function_definition) = 0 then
    raise exception 'Canonical Ready Stock checkout pricing body tidak cocok';
  end if;

  function_definition := replace(
    function_definition,
    'tier_row record;',
    E'tier_unit_price bigint;\n  tier_quote_required boolean;'
  );
  function_definition := regexp_replace(
    function_definition,
    'select ppt\.unit_price,\s*ppt\.quote_required into tier_row',
    E'tier_unit_price := null;\n    tier_quote_required := false;\n    select ppt.unit_price, ppt.quote_required into tier_unit_price, tier_quote_required'
  );
  function_definition := replace(
    function_definition,
    'if found and tier_row.quote_required then',
    'if coalesce(tier_quote_required, false) then'
  );
  function_definition := replace(
    function_definition,
    'coalesce(tier_row.unit_price::bigint,',
    'coalesce(tier_unit_price,'
  );

  if position('tier_row.' in function_definition) > 0
     or position('tier_unit_price bigint;' in function_definition) = 0
     or position('tier_quote_required boolean;' in function_definition) = 0 then
    raise exception 'Ready Stock checkout pricing normalization tidak lengkap';
  end if;

  execute function_definition;
end;
$migration$;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.create_public_custom_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb)'::regprocedure
  )
  into function_definition;

  if position('tier_row record;' in function_definition) = 0
     or position('select ppt.unit_price,ppt.quote_required into tier_row' in function_definition) = 0
     or position('coalesce(tier_row.unit_price::bigint,' in function_definition) = 0 then
    raise exception 'Canonical Custom checkout pricing body tidak cocok';
  end if;

  function_definition := replace(
    function_definition,
    'tier_row record;',
    E'tier_unit_price bigint;\n  tier_quote_required boolean;'
  );
  function_definition := regexp_replace(
    function_definition,
    'select ppt\.unit_price,\s*ppt\.quote_required into tier_row',
    E'tier_unit_price := null;\n    tier_quote_required := false;\n    select ppt.unit_price,ppt.quote_required into tier_unit_price,tier_quote_required'
  );
  function_definition := replace(
    function_definition,
    'if found and tier_row.quote_required then',
    'if coalesce(tier_quote_required, false) then'
  );
  function_definition := replace(
    function_definition,
    'coalesce(tier_row.unit_price::bigint,',
    'coalesce(tier_unit_price,'
  );

  if position('tier_row.' in function_definition) > 0
     or position('tier_unit_price bigint;' in function_definition) = 0
     or position('tier_quote_required boolean;' in function_definition) = 0 then
    raise exception 'Custom checkout pricing normalization tidak lengkap';
  end if;

  execute function_definition;
end;
$migration$;

do $migration$
declare
  function_definition text;
begin
  select pg_get_functiondef(
    'public.finalize_public_ready_stock_pricing_v1()'::regprocedure
  )
  into function_definition;

  if position('tier_row record;' in function_definition) = 0
     or position('into tier_row' in function_definition) = 0
     or position('if tier_row.quote_required then' in function_definition) = 0 then
    raise exception 'Canonical Ready Stock pricing finalizer body tidak cocok';
  end if;

  function_definition := replace(
    function_definition,
    'tier_row record;',
    'tier_row public.product_price_tiers%rowtype;'
  );
  function_definition := regexp_replace(
    function_definition,
    'select\s+ppt\.id,\s*ppt\.min_quantity,\s*ppt\.max_quantity,\s*ppt\.unit_price,\s*ppt\.quote_required\s+into tier_row',
    E'tier_row := null;\n\n      select ppt.*\n      into tier_row'
  );
  function_definition := replace(
    function_definition,
    'if tier_row.quote_required then',
    'if coalesce(tier_row.quote_required, false) then'
  );

  if position('tier_row record;' in function_definition) > 0
     or position('tier_row public.product_price_tiers%rowtype;' in function_definition) = 0
     or position('select ppt.*' in function_definition) = 0
     or position('if coalesce(tier_row.quote_required, false) then' in function_definition) = 0 then
    raise exception 'Ready Stock pricing finalizer normalization tidak lengkap';
  end if;

  execute function_definition;
end;
$migration$;

commit;

;
