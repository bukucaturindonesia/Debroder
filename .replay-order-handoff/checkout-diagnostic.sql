create temporary table diag_checkout_error(message text);
do $$
begin
  begin
    perform public.create_public_checkout_order(
      'wave0diagcheckout00000000000001',
      repeat('a',64),
      repeat('b',64),
      'DEBRODER E2E Customer A',
      '+6281333333333',
      'debroder.e2e.customer.a@example.com',
      'pickup',
      '',
      '11111111-1111-4111-8111-111111111111'::uuid,
      'bank_transfer',
      'diagnostic transaction rolled back',
      jsonb_build_array(jsonb_build_object('variant_size_id','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','quantity',1,'note','','services',jsonb_build_array())),
      '{}'::jsonb
    );
    insert into diag_checkout_error values ('NO_ERROR');
  exception when others then
    insert into diag_checkout_error values (sqlstate || ': ' || sqlerrm);
  end;
end
$$;
select * from diag_checkout_error;
