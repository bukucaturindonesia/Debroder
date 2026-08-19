create table if not exists public.document_number_rules (
  document_type text primary key,
  prefix text not null check (btrim(prefix) <> ''),
  use_year boolean not null default true,
  use_month boolean not null default false,
  padding integer not null default 4 check (padding between 3 and 8),
  separator text not null default '-',
  reset_rule text not null default 'yearly' check (reset_rule in ('never','yearly','monthly')),
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.document_number_sequences (
  document_type text not null references public.document_number_rules(document_type) on delete restrict,
  period_key text not null,
  last_value bigint not null default 0 check (last_value >= 0),
  updated_at timestamptz not null default now(),
  primary key(document_type,period_key)
);

create table if not exists public.document_number_issues (
  id uuid primary key default gen_random_uuid(),
  document_type text not null references public.document_number_rules(document_type) on delete restrict,
  entity_type text not null,
  entity_id uuid not null,
  issued_number text not null unique,
  period_key text not null,
  sequence_value bigint not null check (sequence_value > 0),
  issued_by uuid references auth.users(id) on delete set null,
  issued_at timestamptz not null default now(),
  idempotency_key text unique,
  metadata jsonb not null default '{}'::jsonb,
  unique(document_type, entity_type, entity_id)
);
create index if not exists document_number_issues_entity_idx on public.document_number_issues(entity_type,entity_id);
create index if not exists document_number_issues_issued_at_idx on public.document_number_issues(issued_at desc);

insert into public.document_number_rules(document_type,prefix,use_year,use_month,padding,separator,reset_rule)
values
 ('quotation','QTN-DEB',true,false,4,'-','yearly'),
 ('quotation_version','QTV-DEB',true,false,4,'-','yearly'),
 ('order','ORD-DEB',true,false,4,'-','yearly'),
 ('payment','PAY-DEB',true,false,4,'-','yearly'),
 ('payment_receipt','RCP-DEB',true,false,4,'-','yearly'),
 ('job_order','JO-DEB',true,false,4,'-','yearly'),
 ('work_item','WI-DEB',true,false,5,'-','yearly'),
 ('qc','QC-DEB',true,false,4,'-','yearly'),
 ('delivery','DLV-DEB',true,false,4,'-','yearly'),
 ('pickup_handover','PUP-DEB',true,false,4,'-','yearly')
on conflict(document_type) do nothing;

create or replace function public.issue_document_number(
  p_document_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_idempotency_key text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  r public.document_number_rules;
  period_value text;
  seq bigint;
  result text;
  existing text;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized';
  end if;

  select issued_number into existing
  from public.document_number_issues
  where document_type=p_document_type and entity_type=p_entity_type and entity_id=p_entity_id;
  if found then return existing; end if;

  if nullif(btrim(coalesce(p_idempotency_key,'')),'') is not null then
    select issued_number into existing
    from public.document_number_issues
    where idempotency_key=p_idempotency_key;
    if found then return existing; end if;
  end if;

  select * into r from public.document_number_rules
  where document_type=p_document_type and active
  for share;
  if not found then raise exception 'Document numbering rule not found'; end if;

  period_value := case
    when r.reset_rule='monthly' then to_char(current_date,'YYYYMM')
    when r.reset_rule='yearly' then to_char(current_date,'YYYY')
    else 'ALL'
  end;

  insert into public.document_number_sequences(document_type,period_key,last_value)
  values(p_document_type,period_value,1)
  on conflict(document_type,period_key)
  do update set last_value=public.document_number_sequences.last_value+1,updated_at=now()
  returning last_value into seq;

  result := r.prefix
    || case when r.use_year then r.separator||to_char(current_date,'YYYY') else '' end
    || case when r.use_month then r.separator||to_char(current_date,'MM') else '' end
    || r.separator||lpad(seq::text,r.padding,'0');

  insert into public.document_number_issues(
    document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata
  ) values(
    p_document_type,p_entity_type,p_entity_id,result,period_value,seq,auth.uid(),
    nullif(btrim(coalesce(p_idempotency_key,'')),''),coalesce(p_metadata,'{}'::jsonb)
  );

  return result;
end $$;

create or replace function public.update_document_number_rule(
  p_document_type text,
  p_prefix text,
  p_use_year boolean,
  p_use_month boolean,
  p_padding integer,
  p_separator text,
  p_reset_rule text,
  p_active boolean
)
returns public.document_number_rules
language plpgsql
security definer
set search_path=public
as $$
declare out_row public.document_number_rules;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
  if btrim(coalesce(p_prefix,''))='' then raise exception 'Prefix required'; end if;
  if p_padding<3 or p_padding>8 then raise exception 'Invalid padding'; end if;
  if p_reset_rule not in ('never','yearly','monthly') then raise exception 'Invalid reset rule'; end if;

  update public.document_number_rules
  set prefix=btrim(p_prefix),use_year=p_use_year,use_month=p_use_month,padding=p_padding,
      separator=coalesce(p_separator,'-'),reset_rule=p_reset_rule,active=p_active,
      updated_by=auth.uid(),updated_at=now()
  where document_type=p_document_type
  returning * into out_row;
  if not found then raise exception 'Rule not found'; end if;
  return out_row;
end $$;

alter table public.document_number_rules enable row level security;
alter table public.document_number_sequences enable row level security;
alter table public.document_number_issues enable row level security;

drop policy if exists "staff read document number rules" on public.document_number_rules;
create policy "staff read document number rules" on public.document_number_rules
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

drop policy if exists "staff read document number issues" on public.document_number_issues;
create policy "staff read document number issues" on public.document_number_issues
for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

grant select on public.document_number_rules,public.document_number_issues to authenticated;
grant execute on function public.issue_document_number(text,text,uuid,text,jsonb) to authenticated;
grant execute on function public.update_document_number_rule(text,text,boolean,boolean,integer,text,text,boolean) to authenticated;
