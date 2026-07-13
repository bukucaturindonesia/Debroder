begin;

-- Normalize the checkout variable name idempotently. This also repairs an
-- environment where the prior forward correction was evaluated more than once.
do $normalization$
declare
  function_definition text;
  normalized_definition text;
begin
  select pg_get_functiondef(
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure
  ) into function_definition;

  normalized_definition := replace(
    function_definition,
    'requested_requested_variant_size_id',
    'requested_variant_size_id'
  );

  if position(E'\n  requested_variant_size_id uuid;' in normalized_definition) = 0
     or position('requested_variant_size_id := (item_value->>' in normalized_definition) = 0
     or position('where pvs.id=requested_variant_size_id' in normalized_definition) = 0
  then
    raise exception 'Checkout variable normalization could not prove a safe function definition';
  end if;

  execute normalized_definition;
end
$normalization$;

commit;

-- Recovery: this migration changes function source only and does not mutate
-- commerce data. Re-apply the previous definition while traffic is stopped.
