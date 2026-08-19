-- DEBRODER v1.2 Phase 11 — fulfillment schema, timestamps, revisions, and deletion audit.

alter table public.fulfillments
  add column if not exists idempotency_key text,
  add column if not exists packing_at timestamptz,
  add column if not exists ready_at timestamptz,
  add column if not exists problem_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text;

alter table public.fulfillment_status_history
  add column if not exists reason text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create unique index if not exists fulfillments_idempotency_unique
  on public.fulfillments(idempotency_key)
  where idempotency_key is not null;
create index if not exists fulfillments_status_method_idx on public.fulfillments(status,method,created_at desc);
create index if not exists fulfillments_archive_idx on public.fulfillments(archived_at,created_at desc);
create index if not exists fulfillment_items_work_item_idx on public.fulfillment_items(work_item_id,created_at);
create index if not exists fulfillment_history_idx on public.fulfillment_status_history(fulfillment_id,changed_at desc);

create table if not exists public.fulfillment_revisions (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null references public.fulfillments(id) on delete restrict,
  revision_number integer not null,
  reason text not null check (btrim(reason) <> ''),
  previous_snapshot jsonb not null,
  new_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(fulfillment_id,revision_number)
);
create index if not exists fulfillment_revisions_idx on public.fulfillment_revisions(fulfillment_id,revision_number desc);

create table if not exists public.fulfillment_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  fulfillment_id uuid not null,
  fulfillment_number text,
  order_id uuid not null,
  snapshot jsonb not null,
  deleted_by uuid references auth.users(id) on delete set null,
  deleted_at timestamptz not null default now(),
  reason text not null default 'Hapus permanen dari Gudang Arsip'
);
create index if not exists fulfillment_deletion_audit_order_idx on public.fulfillment_deletion_audit(order_id,deleted_at desc);

do $$
declare row_value public.fulfillments; number_value text; document_type_value text;
begin
  for row_value in select * from public.fulfillments where fulfillment_number is null loop
    document_type_value:=case when row_value.method='pickup' then 'pickup_handover' else 'delivery' end;
    number_value:=public.issue_document_number(
      document_type_value,'fulfillment',row_value.id,
      'fulfillment-number:'||row_value.id::text,
      jsonb_build_object('order_id',row_value.order_id,'method',row_value.method)
    );
    update public.fulfillments set fulfillment_number=number_value where id=row_value.id;
  end loop;
end $$;

alter table public.fulfillments alter column fulfillment_number set not null;
