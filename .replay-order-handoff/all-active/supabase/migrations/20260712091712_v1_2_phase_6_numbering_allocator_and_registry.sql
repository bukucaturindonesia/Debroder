create or replace function public.allocate_document_number(p_document_type text)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare
  rule_row public.document_number_rules;
  business_now timestamp:=timezone('Asia/Makassar',now());
  period_value text;
  next_value bigint;
  result text;
begin
  select * into rule_row from public.document_number_rules
  where document_type=p_document_type and active and archived_at is null
  for share;
  if not found then raise exception 'Aturan penomoran dokumen tidak ditemukan atau tidak aktif'; end if;
  period_value:=case when rule_row.reset_rule='monthly' then to_char(business_now,'YYYYMM') when rule_row.reset_rule='yearly' then to_char(business_now,'YYYY') else 'ALL' end;
  insert into public.document_number_sequences(document_type,period_key,last_value)
  values(p_document_type,period_value,1)
  on conflict(document_type,period_key)
  do update set last_value=public.document_number_sequences.last_value+1,updated_at=now()
  returning last_value into next_value;
  result:=rule_row.prefix
    ||case when rule_row.use_year then rule_row.separator||to_char(business_now,'YYYY') else '' end
    ||case when rule_row.use_month then rule_row.separator||to_char(business_now,'MM') else '' end
    ||rule_row.separator||lpad(next_value::text,rule_row.padding,'0');
  return result;
end $$;

create or replace function public.issue_document_number(p_document_type text,p_entity_type text,p_entity_id uuid,p_idempotency_key text default null,p_metadata jsonb default '{}'::jsonb)
returns text
language plpgsql
security definer
set search_path=''
as $$
declare existing_number text; issued_number_value text; period_value text; sequence_value_value bigint;
begin
  if auth.uid() is not null and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Tidak berwenang menerbitkan nomor dokumen'; end if;
  if coalesce(btrim(p_entity_type),'')='' or p_entity_id is null then raise exception 'Referensi entitas dokumen wajib diisi'; end if;
  select issued_number into existing_number from public.document_number_issues where document_type=p_document_type and entity_type=p_entity_type and entity_id=p_entity_id;
  if found then return existing_number; end if;
  if nullif(btrim(coalesce(p_idempotency_key,'')),'') is not null then
    select issued_number into existing_number from public.document_number_issues where idempotency_key=btrim(p_idempotency_key);
    if found then return existing_number; end if;
  end if;
  issued_number_value:=public.allocate_document_number(p_document_type);
  period_value:=case when issued_number_value~'[0-9]{6}-[0-9]+$' then substring(issued_number_value from '([0-9]{6})-[0-9]+$') when issued_number_value~'[0-9]{4}-[0-9]+$' then substring(issued_number_value from '([0-9]{4})-[0-9]+$') else 'ALL' end;
  sequence_value_value:=(regexp_match(issued_number_value,'([0-9]+)$'))[1]::bigint;
  insert into public.document_number_issues(document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata)
  values(p_document_type,btrim(p_entity_type),p_entity_id,issued_number_value,period_value,sequence_value_value,auth.uid(),nullif(btrim(coalesce(p_idempotency_key,'')),''),coalesce(p_metadata,'{}'::jsonb));
  return issued_number_value;
end $$;

create or replace function public.register_existing_document_number()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare document_type_value text:=tg_argv[0]; number_column text:=tg_argv[1]; number_value text; period_value text; sequence_value_value bigint;
begin
  number_value:=to_jsonb(new)->>number_column;
  if coalesce(number_value,'')='' then return new; end if;
  if exists(select 1 from public.document_number_issues where document_type=document_type_value and entity_type=tg_table_name and entity_id=new.id) then return new; end if;
  period_value:=case when number_value~'[0-9]{6}-[0-9]+$' then substring(number_value from '([0-9]{6})-[0-9]+$') when number_value~'[0-9]{4}-[0-9]+$' then substring(number_value from '([0-9]{4})-[0-9]+$') else 'ALL' end;
  sequence_value_value:=coalesce((regexp_match(number_value,'([0-9]+)$'))[1]::bigint,1);
  insert into public.document_number_issues(document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata)
  values(document_type_value,tg_table_name,new.id,number_value,period_value,sequence_value_value,auth.uid(),'registered:'||tg_table_name||':'||new.id::text,jsonb_build_object('source','entity_insert_trigger'))
  on conflict do nothing;
  return new;
end $$;

create or replace function public.next_quotation_number() returns text language sql security definer set search_path='' as $$select public.allocate_document_number('quotation')$$;
create or replace function public.next_order_number() returns text language sql security definer set search_path='' as $$select public.allocate_document_number('order')$$;
create or replace function public.next_payment_number() returns text language sql security definer set search_path='' as $$select public.allocate_document_number('payment')$$;

drop trigger if exists register_quotation_document_number on public.quotations;
create trigger register_quotation_document_number after insert on public.quotations for each row execute function public.register_existing_document_number('quotation','quotation_number');
drop trigger if exists register_order_document_number on public.orders;
create trigger register_order_document_number after insert on public.orders for each row execute function public.register_existing_document_number('order','order_number');
drop trigger if exists register_payment_document_number on public.order_payments;
create trigger register_payment_document_number after insert on public.order_payments for each row execute function public.register_existing_document_number('payment','payment_number');

insert into public.document_number_issues(document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata)
select 'quotation','quotations',q.id,q.quotation_number,coalesce(substring(q.quotation_number from '([0-9]{4,6})-[0-9]+$'),'ALL'),coalesce((regexp_match(q.quotation_number,'([0-9]+)$'))[1]::bigint,1),q.created_by,'registered:quotations:'||q.id::text,jsonb_build_object('source','phase6_backfill') from public.quotations q where coalesce(q.quotation_number,'')<>'' on conflict do nothing;
insert into public.document_number_issues(document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata)
select 'order','orders',o.id,o.order_number,coalesce(substring(o.order_number from '([0-9]{4,6})-[0-9]+$'),'ALL'),coalesce((regexp_match(o.order_number,'([0-9]+)$'))[1]::bigint,1),o.created_by,'registered:orders:'||o.id::text,jsonb_build_object('source','phase6_backfill') from public.orders o where coalesce(o.order_number,'')<>'' on conflict do nothing;
insert into public.document_number_issues(document_type,entity_type,entity_id,issued_number,period_key,sequence_value,issued_by,idempotency_key,metadata)
select 'payment','order_payments',p.id,p.payment_number,coalesce(substring(p.payment_number from '([0-9]{4,6})-[0-9]+$'),'ALL'),coalesce((regexp_match(p.payment_number,'([0-9]+)$'))[1]::bigint,1),p.created_by,'registered:order_payments:'||p.id::text,jsonb_build_object('source','phase6_backfill') from public.order_payments p where coalesce(p.payment_number,'')<>'' on conflict do nothing;
