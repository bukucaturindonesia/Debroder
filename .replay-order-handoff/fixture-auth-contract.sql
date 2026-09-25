begin;

update auth.users
set
  confirmation_sent_at = coalesce(confirmation_sent_at, email_confirmed_at, now()),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'account_type', 'customer',
    'signup_channel', 'debroder_public_v1',
    'terms_accepted_at', now()::text
  ),
  raw_user_meta_data = raw_user_meta_data || jsonb_build_object(
    'account_type', 'customer',
    'terms_accepted_at', now()::text
  )
where lower(email) in (
  'debroder.e2e.customer.a@example.com',
  'debroder.e2e.customer.b@example.com'
);

delete from public.quotations
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

delete from public.customer_profiles as cp
using auth.users as u
where cp.id = u.id
  and lower(u.email) in (
    'debroder.e2e.customer.a@example.com',
    'debroder.e2e.customer.b@example.com'
  );

commit;
