begin;

-- The initial P0 function used a local variable with the same name as the
-- stock_reservations.variant_size_id column. PostgreSQL compiles PL/pgSQL
-- statements lazily, so the collision only appeared during the transactional
-- checkout smoke test. Preserve the applied migration and correct only the
-- function source in this forward migration.
do $correction$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure
  ) into function_definition;

  corrected_definition := replace(function_definition, 'variant_size_id uuid;', 'requested_variant_size_id uuid;');
  corrected_definition := replace(corrected_definition, 'variant_size_id := (item_value->>', 'requested_variant_size_id := (item_value->>');
  corrected_definition := replace(corrected_definition, 'where pvs.id=variant_size_id', 'where pvs.id=requested_variant_size_id');

  if corrected_definition = function_definition
     or position(E'\n  variant_size_id uuid;' in corrected_definition) > 0
     or position('where pvs.id=variant_size_id' in corrected_definition) > 0
  then
    raise exception 'Checkout function correction target was not found';
  end if;

  execute corrected_definition;
end
$correction$;

commit;

-- Recovery: re-apply the prior function definition only while checkout
-- traffic is stopped. No table or customer data is changed by this correction.
