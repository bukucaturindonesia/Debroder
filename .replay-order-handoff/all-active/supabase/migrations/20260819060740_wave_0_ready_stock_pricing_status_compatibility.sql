begin;

-- The historical Ready Stock creator writes order_items.pricing_status as
-- "confirmed". Phase 11's canonical constraint intentionally narrowed that
-- column to final|estimated|quotation_required. Keep the canonical check and
-- patch only the authoritative 12-argument creator so a fresh registered
-- checkout emits the canonical final value.
--
-- The function definition is recovered from the database at replay time so
-- this forward migration preserves its complete current body, signature,
-- owner, SECURITY DEFINER setting, search_path, and existing ACL. The exact
-- one-token precondition fails closed if the upstream function has drifted.
do $$
declare
  target_function regprocedure :=
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure;
  function_definition text;
  patched_definition text;
  legacy_literal text := $literal$'confirmed'$literal$;
  canonical_literal text := $literal$'final'$literal$;
begin
  select pg_get_functiondef(target_function)
    into function_definition;

  if function_definition is null then
    raise exception 'Required checkout creator is missing: %', target_function;
  end if;

  if length(function_definition) - length(replace(function_definition, legacy_literal, ''))
     <> length(legacy_literal) then
    raise exception
      'Checkout creator pricing compatibility marker is not exactly one occurrence: %',
      target_function;
  end if;

  patched_definition := replace(function_definition, legacy_literal, canonical_literal);
  if patched_definition = function_definition then
    raise exception 'Checkout creator pricing compatibility patch made no change: %', target_function;
  end if;

  execute patched_definition;
end;
$$;

commit;
