create table if not exists public.payment_number_sequences (
  year integer primary key,
  last_number integer not null default 0,
  updated_at timestamptz not null default now()
);

create or replace function public.next_payment_number()
returns text
language plpgsql
security definer
set search_path=public
as $$
declare y integer := extract(year from now())::integer; n integer;
begin
  insert into public.payment_number_sequences(year,last_number)
  values(y,1)
  on conflict(year) do update set last_number=payment_number_sequences.last_number+1, updated_at=now()
  returning last_number into n;
  return format('PAY-DEB-%s-%s', y, lpad(n::text,4,'0'));
end;
$$;

create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default public.next_payment_number(),
  order_id uuid not null references public.orders(id) on delete cascade,
  amount bigint not null check(amount > 0),
  paid_at timestamptz not null,
  method text not null check(method in ('bank_transfer','cash','qris','ewallet','other')),
  channel_name text,
  reference_number text,
  status text not null default 'pending' check(status in ('draft','pending','verified','rejected','refunded')),
  customer_notes text,
  admin_notes text,
  proof_bucket text,
  proof_path text,
  proof_file_name text,
  proof_mime_type text,
  proof_size_bytes bigint,
  submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejection_reason text,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_payments_order_id_idx on public.order_payments(order_id);
create index if not exists order_payments_status_idx on public.order_payments(status);
create index if not exists order_payments_archived_at_idx on public.order_payments(archived_at);

alter table public.orders
  add column if not exists payment_total_verified bigint not null default 0,
  add column if not exists payment_balance bigint not null default 0,
  add column if not exists payment_percentage numeric(5,2) not null default 0,
  add column if not exists payment_requirement_met boolean not null default false;

update public.orders
set payment_balance = greatest(total_amount::bigint,0),
    payment_percentage = 0,
    payment_requirement_met = false
where payment_total_verified = 0;

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=public
as $$
declare o public.orders; total_verified bigint;
begin
  select coalesce(sum(amount),0)::bigint into total_verified
  from public.order_payments
  where order_id=p_order_id and status='verified' and archived_at is null;

  update public.orders
  set payment_total_verified=total_verified,
      payment_balance=greatest(total_amount::bigint-total_verified,0),
      payment_percentage=case when total_amount>0 then least(100, round((total_verified::numeric/total_amount::numeric)*100,2)) else 0 end,
      payment_requirement_met=(total_verified>=total_amount),
      payment_status=case
        when total_verified<=0 then 'belum_bayar'
        when total_verified<total_amount then 'terverifikasi'
        else 'terverifikasi'
      end,
      updated_at=now()
  where id=p_order_id
  returning * into o;
  return o;
end;
$$;

create or replace function public.create_order_payment(
  p_order_id uuid,
  p_amount bigint,
  p_paid_at timestamptz,
  p_method text,
  p_channel_name text default null,
  p_reference_number text default null,
  p_customer_notes text default null,
  p_admin_notes text default null,
  p_proof_bucket text default null,
  p_proof_path text default null,
  p_proof_file_name text default null,
  p_proof_mime_type text default null,
  p_proof_size_bytes bigint default null
)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
  if p_method not in ('bank_transfer','cash','qris','ewallet','other') then raise exception 'Invalid payment method'; end if;
  if not exists(select 1 from public.orders where id=p_order_id and archived_at is null) then raise exception 'Active order not found'; end if;

  insert into public.order_payments(order_id,amount,paid_at,method,channel_name,reference_number,status,customer_notes,admin_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,created_by,updated_by)
  values(p_order_id,p_amount,p_paid_at,p_method,nullif(btrim(coalesce(p_channel_name,'')),''),nullif(btrim(coalesce(p_reference_number,'')),''),'pending',nullif(btrim(coalesce(p_customer_notes,'')),''),nullif(btrim(coalesce(p_admin_notes,'')),''),p_proof_bucket,p_proof_path,p_proof_file_name,p_proof_mime_type,p_proof_size_bytes,now(),auth.uid(),auth.uid())
  returning * into r;

  update public.orders set payment_status='menunggu_verifikasi', payment_submitted_at=now(), updated_at=now() where id=p_order_id;
  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by)
  values(p_order_id,null,'baru','Pembayaran '||r.payment_number||' menunggu verifikasi',auth.uid());
  return r;
end;
$$;

create or replace function public.update_order_payment_draft(
  p_payment_id uuid,
  p_amount bigint,
  p_paid_at timestamptz,
  p_method text,
  p_channel_name text default null,
  p_reference_number text default null,
  p_customer_notes text default null,
  p_admin_notes text default null
)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  update public.order_payments
  set amount=p_amount, paid_at=p_paid_at, method=p_method,
      channel_name=nullif(btrim(coalesce(p_channel_name,'')),''),
      reference_number=nullif(btrim(coalesce(p_reference_number,'')),''),
      customer_notes=nullif(btrim(coalesce(p_customer_notes,'')),''),
      admin_notes=nullif(btrim(coalesce(p_admin_notes,'')),''),
      updated_by=auth.uid(), updated_at=now()
  where id=p_payment_id and status in ('draft','pending') and archived_at is null
  returning * into r;
  if not found then raise exception 'Only draft or pending payment can be edited'; end if;
  return r;
end;
$$;

create or replace function public.verify_order_payment(p_payment_id uuid, p_admin_notes text default null)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['superadmin','super_admin','owner','admin']) then raise exception 'Not authorized to verify'; end if;
  update public.order_payments
  set status='verified', admin_notes=coalesce(nullif(btrim(coalesce(p_admin_notes,'')),''),admin_notes), verified_at=now(), verified_by=auth.uid(), updated_by=auth.uid(), updated_at=now()
  where id=p_payment_id and status='pending' and archived_at is null
  returning * into r;
  if not found then raise exception 'Pending payment not found'; end if;
  perform public.refresh_order_payment_summary(r.order_id);
  return r;
end;
$$;

create or replace function public.reject_order_payment(p_payment_id uuid, p_reason text)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['superadmin','super_admin','owner','admin']) then raise exception 'Not authorized to reject'; end if;
  if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Rejection reason is required'; end if;
  update public.order_payments
  set status='rejected', rejection_reason=btrim(p_reason), rejected_at=now(), rejected_by=auth.uid(), updated_by=auth.uid(), updated_at=now()
  where id=p_payment_id and status='pending' and archived_at is null
  returning * into r;
  if not found then raise exception 'Pending payment not found'; end if;
  perform public.refresh_order_payment_summary(r.order_id);
  return r;
end;
$$;

create or replace function public.archive_order_payment(p_payment_id uuid, p_reason text default null)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  update public.order_payments set archived_at=now(), archived_by=auth.uid(), archive_reason=nullif(btrim(coalesce(p_reason,'')),''), updated_by=auth.uid(), updated_at=now()
  where id=p_payment_id and archived_at is null returning * into r;
  if not found then raise exception 'Payment not found or already archived'; end if;
  perform public.refresh_order_payment_summary(r.order_id);
  return r;
end;
$$;

create or replace function public.restore_order_payment(p_payment_id uuid)
returns public.order_payments
language plpgsql
security definer
set search_path=public
as $$
declare r public.order_payments;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  update public.order_payments set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
  where id=p_payment_id and archived_at is not null returning * into r;
  if not found then raise exception 'Archived payment not found'; end if;
  perform public.refresh_order_payment_summary(r.order_id);
  return r;
end;
$$;

create or replace function public.permanently_delete_order_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare oid uuid;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin can permanently delete payment'; end if;
  select order_id into oid from public.order_payments where id=p_payment_id and archived_at is not null;
  if oid is null then raise exception 'Payment must be archived first'; end if;
  delete from public.order_payments where id=p_payment_id;
  perform public.refresh_order_payment_summary(oid);
end;
$$;

alter table public.order_payments enable row level security;
drop policy if exists "Staff read order payments" on public.order_payments;
create policy "Staff read order payments" on public.order_payments for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

grant select on public.order_payments to authenticated;
grant execute on function public.create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint) to authenticated;
grant execute on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text) to authenticated;
grant execute on function public.verify_order_payment(uuid,text) to authenticated;
grant execute on function public.reject_order_payment(uuid,text) to authenticated;
grant execute on function public.archive_order_payment(uuid,text) to authenticated;
grant execute on function public.restore_order_payment(uuid) to authenticated;
grant execute on function public.permanently_delete_order_payment(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "Staff read payment proofs" on storage.objects;
create policy "Staff read payment proofs" on storage.objects for select to authenticated using(bucket_id='payment-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "Staff upload payment proofs" on storage.objects;
create policy "Staff upload payment proofs" on storage.objects for insert to authenticated with check(bucket_id='payment-proofs' and owner=auth.uid() and public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "Super Admin delete payment proofs" on storage.objects;
create policy "Super Admin delete payment proofs" on storage.objects for delete to authenticated using(bucket_id='payment-proofs' and public.has_staff_role(array['superadmin','super_admin']));;
