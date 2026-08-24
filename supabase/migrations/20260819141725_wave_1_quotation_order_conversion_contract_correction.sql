begin;

-- The preceding migration is already applied to staging and is intentionally
-- not rewritten.  Correct the two values against the current active order
-- contract: customer_id is the DEBRODER customer authority (not auth.users),
-- and a converted custom quote is locked rather than an unsupported status.
do $migration$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'public.convert_quotation_to_order(uuid,uuid,text,text,text,text,text,text,uuid,text,text,bigint,bigint,text,text)'::regprocedure
  ) into function_definition;

  corrected_definition := replace(
    function_definition,
    $old$    quotation_row.customer_id,
    p_customer_id,$old$,
    $new$    null,
    p_customer_id,$new$
  );
  corrected_definition := replace(
    corrected_definition,
    $old$    'approved',
    version_row.version_number,$old$,
    $new$    'locked',
    version_row.version_number,$new$
  );

  if corrected_definition = function_definition then
    raise exception 'Quotation conversion correction did not match the applied function body';
  end if;

  execute corrected_definition;
end
$migration$;

commit;


