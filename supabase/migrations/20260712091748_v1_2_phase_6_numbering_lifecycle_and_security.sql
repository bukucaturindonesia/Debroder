create or replace function public.create_document_number_rule(p_document_type text,p_prefix text,p_use_year boolean,p_use_month boolean,p_padding integer,p_separator text,p_reset_rule text)
returns public.document_number_rules
language plpgsql security definer set search_path=''
as $$
declare result_row public.document_number_rules; normalized_type text;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat membuat aturan penomoran'; end if;
  normalized_type:=lower(regexp_replace(btrim(coalesce(p_document_type,'')),'[^a-zA-Z0-9_]+','_','g'));
  if normalized_type='' or btrim(coalesce(p_prefix,''))='' then raise exception 'Jenis dokumen dan prefix wajib diisi'; end if;
  if p_padding not between 3 and 8 then raise exception 'Jumlah digit harus antara 3 dan 8'; end if;
  if p_reset_rule not in ('never','yearly','monthly') then raise exception 'Aturan reset tidak valid'; end if;
  insert into public.document_number_rules(document_type,prefix,use_year,use_month,padding,separator,reset_rule,active,updated_by)
  values(normalized_type,btrim(p_prefix),coalesce(p_use_year,true),coalesce(p_use_month,false),p_padding,coalesce(nullif(p_separator,''),'-'),p_reset_rule,true,auth.uid()) returning * into result_row;
  insert into public.document_number_rule_history(document_type,action,new_value,actor_id) values(normalized_type,'created',to_jsonb(result_row),auth.uid());
  return result_row;
end $$;

create or replace function public.update_document_number_rule(p_document_type text,p_prefix text,p_use_year boolean,p_use_month boolean,p_padding integer,p_separator text,p_reset_rule text,p_active boolean)
returns public.document_number_rules
language plpgsql security definer set search_path=''
as $$
declare old_row public.document_number_rules; result_row public.document_number_rules;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat mengubah aturan penomoran'; end if;
  if btrim(coalesce(p_prefix,''))='' then raise exception 'Prefix wajib diisi'; end if;
  if p_padding not between 3 and 8 then raise exception 'Jumlah digit harus antara 3 dan 8'; end if;
  if p_reset_rule not in ('never','yearly','monthly') then raise exception 'Aturan reset tidak valid'; end if;
  select * into old_row from public.document_number_rules where document_type=p_document_type and archived_at is null for update;
  if not found then raise exception 'Aturan aktif tidak ditemukan'; end if;
  update public.document_number_rules set prefix=btrim(p_prefix),use_year=coalesce(p_use_year,true),use_month=coalesce(p_use_month,false),padding=p_padding,separator=coalesce(nullif(p_separator,''),'-'),reset_rule=p_reset_rule,active=coalesce(p_active,true),updated_by=auth.uid(),updated_at=now() where document_type=p_document_type returning * into result_row;
  insert into public.document_number_rule_history(document_type,action,old_value,new_value,actor_id) values(p_document_type,'updated',to_jsonb(old_row),to_jsonb(result_row),auth.uid());
  return result_row;
end $$;

create or replace function public.archive_document_number_rule(p_document_type text,p_reason text default null)
returns public.document_number_rules
language plpgsql security definer set search_path=''
as $$
declare old_row public.document_number_rules; result_row public.document_number_rules;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat mengarsipkan aturan penomoran'; end if;
  if coalesce(btrim(p_reason),'')='' then raise exception 'Alasan arsip wajib diisi'; end if;
  select * into old_row from public.document_number_rules where document_type=p_document_type and archived_at is null for update;
  if not found then raise exception 'Aturan aktif tidak ditemukan'; end if;
  update public.document_number_rules set archived_at=now(),archived_by=auth.uid(),archive_reason=btrim(p_reason),active=false,updated_by=auth.uid(),updated_at=now() where document_type=p_document_type returning * into result_row;
  insert into public.document_number_rule_history(document_type,action,old_value,new_value,reason,actor_id) values(p_document_type,'archived',to_jsonb(old_row),to_jsonb(result_row),btrim(p_reason),auth.uid());
  return result_row;
end $$;

create or replace function public.restore_document_number_rule(p_document_type text)
returns public.document_number_rules
language plpgsql security definer set search_path=''
as $$
declare old_row public.document_number_rules; result_row public.document_number_rules;
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat memulihkan aturan penomoran'; end if;
  select * into old_row from public.document_number_rules where document_type=p_document_type and archived_at is not null for update;
  if not found then raise exception 'Aturan arsip tidak ditemukan'; end if;
  update public.document_number_rules set archived_at=null,archived_by=null,archive_reason=null,active=true,updated_by=auth.uid(),updated_at=now() where document_type=p_document_type returning * into result_row;
  insert into public.document_number_rule_history(document_type,action,old_value,new_value,actor_id) values(p_document_type,'restored',to_jsonb(old_row),to_jsonb(result_row),auth.uid());
  return result_row;
end $$;

create or replace function public.permanently_delete_document_number_rule(p_document_type text)
returns void
language plpgsql security definer set search_path=''
as $$
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Hanya Super Admin yang dapat menghapus permanen'; end if;
  delete from public.document_number_rules rule_row where rule_row.document_type=p_document_type and rule_row.archived_at is not null and not exists(select 1 from public.document_number_issues issue_row where issue_row.document_type=rule_row.document_type);
  if not found then raise exception 'Hanya aturan arsip yang belum pernah digunakan yang dapat dihapus permanen'; end if;
end $$;

create or replace function public.prevent_document_number_issue_mutation()
returns trigger language plpgsql set search_path=''
as $$begin raise exception 'Riwayat nomor dokumen bersifat permanen dan tidak dapat diubah'; end $$;

drop trigger if exists prevent_document_number_issue_update_delete on public.document_number_issues;
create trigger prevent_document_number_issue_update_delete before update or delete on public.document_number_issues for each row execute function public.prevent_document_number_issue_mutation();

alter table public.document_number_rules enable row level security;
alter table public.document_number_sequences enable row level security;
alter table public.document_number_issues enable row level security;
alter table public.document_number_rule_history enable row level security;

drop policy if exists "staff read document number rules" on public.document_number_rules;
create policy "staff read document number rules" on public.document_number_rules for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "staff read document number issues" on public.document_number_issues;
create policy "staff read document number issues" on public.document_number_issues for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "staff read document number rule history" on public.document_number_rule_history;
create policy "staff read document number rule history" on public.document_number_rule_history for select to authenticated using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

revoke all on public.document_number_sequences from anon,authenticated;
revoke insert,update,delete on public.document_number_rules from anon,authenticated;
revoke insert,update,delete on public.document_number_issues from anon,authenticated;
revoke insert,update,delete on public.document_number_rule_history from anon,authenticated;
grant select on public.document_number_rules,public.document_number_issues,public.document_number_rule_history to authenticated;

revoke all on function public.allocate_document_number(text) from public,anon,authenticated;
revoke all on function public.issue_document_number(text,text,uuid,text,jsonb) from public,anon,authenticated;
revoke all on function public.next_quotation_number() from public,anon,authenticated;
revoke all on function public.next_order_number() from public,anon,authenticated;
revoke all on function public.next_payment_number() from public,anon,authenticated;
grant execute on function public.next_quotation_number() to authenticated;
grant execute on function public.next_order_number() to authenticated;
grant execute on function public.next_payment_number() to authenticated;
grant execute on function public.allocate_document_number(text) to service_role;
grant execute on function public.issue_document_number(text,text,uuid,text,jsonb) to service_role;
grant execute on function public.create_document_number_rule(text,text,boolean,boolean,integer,text,text) to authenticated;
grant execute on function public.update_document_number_rule(text,text,boolean,boolean,integer,text,text,boolean) to authenticated;
grant execute on function public.archive_document_number_rule(text,text) to authenticated;
grant execute on function public.restore_document_number_rule(text) to authenticated;
grant execute on function public.permanently_delete_document_number_rule(text) to authenticated;
