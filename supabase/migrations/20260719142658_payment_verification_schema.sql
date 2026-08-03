create table if not exists public.payment_method_settings (
  id uuid primary key default gen_random_uuid(),
  method_code text not null unique,
  method_type text not null,
  display_name text not null,
  bank_name text,
  account_number text,
  account_holder text,
  qris_image_url text,
  instructions text not null default '',
  expires_in_hours integer not null default 24,
  sort_order integer not null default 100,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_method_settings_code_check
    check (method_code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  constraint payment_method_settings_type_check
    check (method_type in ('bank_transfer','qris','ewallet')),
  constraint payment_method_settings_name_check
    check (btrim(display_name) <> ''),
  constraint payment_method_settings_expiry_check
    check (expires_in_hours between 1 and 720),
  constraint payment_method_settings_qris_url_check
    check (
      qris_image_url is null
      or qris_image_url ~ '^https://'
      or qris_image_url ~ '^/'
    )
);

create index if not exists payment_method_settings_active_idx
  on public.payment_method_settings(is_active, sort_order, display_name)
  where archived_at is null;

drop trigger if exists set_payment_method_settings_updated_at
  on public.payment_method_settings;
create trigger set_payment_method_settings_updated_at
before update on public.payment_method_settings
for each row execute function public.set_updated_at();

alter table public.payment_method_settings enable row level security;
revoke all on public.payment_method_settings from public, anon, authenticated;
grant all on public.payment_method_settings to service_role;

alter table public.order_payments
  add column if not exists reported_amount bigint,
  add column if not exists sender_name text,
  add column if not exists destination_payment_method_id uuid
    references public.payment_method_settings(id) on delete restrict,
  add column if not exists review_outcome text not null default 'pending',
  add column if not exists check_funds_received boolean,
  add column if not exists check_destination_account boolean,
  add column if not exists check_amount boolean,
  add column if not exists check_transaction_time boolean,
  add column if not exists check_reference_unique boolean,
  add column if not exists verified_amount bigint,
  add column if not exists verified_destination_account text,
  add column if not exists verified_transaction_at timestamptz,
  add column if not exists verified_reference text,
  add column if not exists settlement_classification text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.order_payments
set reported_amount=amount
where reported_amount is null;

alter table public.order_payments
  drop constraint if exists order_payments_review_outcome_check;
alter table public.order_payments
  add constraint order_payments_review_outcome_check check (
    review_outcome in (
      'pending','verified','funds_not_found','correction_requested','rejected'
    )
  );
alter table public.order_payments
  drop constraint if exists order_payments_verified_amount_check;
alter table public.order_payments
  add constraint order_payments_verified_amount_check
    check (verified_amount is null or verified_amount > 0);
alter table public.order_payments
  drop constraint if exists order_payments_settlement_classification_check;
alter table public.order_payments
  add constraint order_payments_settlement_classification_check check (
    settlement_classification is null
    or settlement_classification in (
      'partial','exact','overpayment','under_reported','over_reported'
    )
  );

create unique index if not exists order_payments_verified_reference_unique_idx
  on public.order_payments(lower(btrim(verified_reference)))
  where status='verified'
    and archived_at is null
    and verified_reference is not null
    and btrim(verified_reference) <> '';;
