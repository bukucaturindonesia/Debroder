create table if not exists public.document_number_rule_history (
  id uuid primary key default gen_random_uuid(),
  document_type text not null,
  action text not null check (action in ('created','updated','archived','restored')),
  old_value jsonb,
  new_value jsonb,
  reason text,
  actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists document_number_rule_history_type_idx on public.document_number_rule_history(document_type,created_at desc);
create index if not exists document_number_rule_history_actor_idx on public.document_number_rule_history(actor_id,created_at desc);

alter table public.document_number_rules
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references auth.users(id) on delete set null,
  add column if not exists archive_reason text;

insert into public.document_number_sequences(document_type,period_key,last_value)
select 'quotation',to_char(timezone('Asia/Makassar',now()),'YYYY'),
       coalesce(max((regexp_match(quotation_number,'([0-9]+)$'))[1]::bigint),0)
from public.quotations
where quotation_number ~ '^QTN-DEB-[0-9]{4}-[0-9]+$'
on conflict(document_type,period_key)
do update set last_value=greatest(public.document_number_sequences.last_value,excluded.last_value),updated_at=now();

insert into public.document_number_sequences(document_type,period_key,last_value)
select 'order',to_char(timezone('Asia/Makassar',now()),'YYYY'),
       coalesce(max((regexp_match(order_number,'([0-9]+)$'))[1]::bigint),0)
from public.orders
where order_number ~ '^ORD-DEB-[0-9]{4}-[0-9]+$'
on conflict(document_type,period_key)
do update set last_value=greatest(public.document_number_sequences.last_value,excluded.last_value),updated_at=now();

insert into public.document_number_sequences(document_type,period_key,last_value)
select 'payment',to_char(timezone('Asia/Makassar',now()),'YYYY'),
       coalesce(max((regexp_match(payment_number,'([0-9]+)$'))[1]::bigint),0)
from public.order_payments
where payment_number ~ '^PAY-DEB-[0-9]{4}-[0-9]+$'
on conflict(document_type,period_key)
do update set last_value=greatest(public.document_number_sequences.last_value,excluded.last_value),updated_at=now();
