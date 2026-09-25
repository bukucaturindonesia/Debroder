begin;

-- Security-definer functions use an empty search_path. pgcrypto is installed
-- in the extensions schema on Supabase, so qualify digest explicitly.
do $correction$
declare
  function_definition text;
  corrected_definition text;
begin
  select pg_get_functiondef(
    'public.verify_public_order_whatsapp(uuid,text)'::regprocedure
  ) into function_definition;

  corrected_definition := replace(
    function_definition,
    'encode(digest(',
    'encode(extensions.digest('
  );

  if position('encode(extensions.digest(' in corrected_definition) = 0 then
    raise exception 'WhatsApp digest schema correction target was not found';
  end if;

  execute corrected_definition;
end
$correction$;

commit;

-- Recovery: re-apply the previous function definition while checkout traffic
-- is stopped. No order, token, or audit data is changed here.
