create or replace function public.upsert_payment_method_setting(
  p_setting_id uuid,
  p_method_code text,
  p_method_type text,
  p_display_name text,
  p_bank_name text,
  p_account_number text,
  p_account_holder text,
  p_qris_image_url text,
  p_instructions text,
  p_expires_in_hours integer,
  p_sort_order integer,
  p_is_active boolean
)
returns public.payment_method_settings
language plpgsql
security definer
set search_path=''
as $$
declare
  result_setting public.payment_method_settings;
  normalized_code text:=lower(btrim(coalesce(p_method_code,'')));
  normalized_type text:=lower(btrim(coalesce(p_method_type,'')));
begin
  if not public.has_permission('payment.verify') then
    raise exception 'Not authorized to manage payment settings';
  end if;
  if normalized_code !~ '^[a-z0-9][a-z0-9_-]{1,49}$' then
    raise exception 'Kode metode pembayaran tidak valid';
  end if;
  if normalized_type not in ('bank_transfer','qris','ewallet') then
    raise exception 'Jenis metode pembayaran tidak valid';
  end if;
  if coalesce(btrim(p_display_name),'')='' then
    raise exception 'Nama metode pembayaran wajib diisi';
  end if;
  if p_expires_in_hours is null or p_expires_in_hours not between 1 and 720 then
    raise exception 'Masa berlaku pembayaran tidak valid';
  end if;
  if p_is_active and normalized_type='bank_transfer' and (
    coalesce(btrim(p_bank_name),'')=''
    or coalesce(btrim(p_account_number),'')=''
    or coalesce(btrim(p_account_holder),'')=''
  ) then
    raise exception 'Rekening bank aktif wajib memiliki bank, nomor rekening, dan nama pemilik';
  end if;
  if p_is_active and normalized_type='qris'
     and coalesce(btrim(p_qris_image_url),'')='' then
    raise exception 'Metode QRIS aktif wajib memiliki gambar QRIS';
  end if;
  if p_is_active and normalized_type='ewallet' and (
    coalesce(btrim(p_account_number),'')=''
    or coalesce(btrim(p_account_holder),'')=''
  ) then
    raise exception 'Dompet digital aktif wajib memiliki nomor tujuan dan nama pemilik';
  end if;
  if coalesce(btrim(p_qris_image_url),'')<>''
     and btrim(p_qris_image_url) !~ '^https://'
     and btrim(p_qris_image_url) !~ '^/' then
    raise exception 'URL gambar QRIS harus HTTPS atau path internal';
  end if;

  if p_setting_id is null then
    insert into public.payment_method_settings(
      method_code,method_type,display_name,bank_name,account_number,
      account_holder,qris_image_url,instructions,expires_in_hours,sort_order,
      is_active,created_by,updated_by
    ) values (
      normalized_code,normalized_type,btrim(p_display_name),
      nullif(btrim(coalesce(p_bank_name,'')),''),
      nullif(btrim(coalesce(p_account_number,'')),''),
      nullif(btrim(coalesce(p_account_holder,'')),''),
      nullif(btrim(coalesce(p_qris_image_url,'')),''),
      btrim(coalesce(p_instructions,'')),p_expires_in_hours,
      coalesce(p_sort_order,100),p_is_active,auth.uid(),auth.uid()
    )
    returning * into result_setting;
  else
    update public.payment_method_settings set
      method_code=normalized_code,
      method_type=normalized_type,
      display_name=btrim(p_display_name),
      bank_name=nullif(btrim(coalesce(p_bank_name,'')),''),
      account_number=nullif(btrim(coalesce(p_account_number,'')),''),
      account_holder=nullif(btrim(coalesce(p_account_holder,'')),''),
      qris_image_url=nullif(btrim(coalesce(p_qris_image_url,'')),''),
      instructions=btrim(coalesce(p_instructions,'')),
      expires_in_hours=p_expires_in_hours,
      sort_order=coalesce(p_sort_order,100),
      is_active=p_is_active,
      updated_by=auth.uid(),
      updated_at=now()
    where id=p_setting_id and archived_at is null
    returning * into result_setting;
    if not found then raise exception 'Pengaturan pembayaran tidak ditemukan'; end if;
  end if;

  insert into public.system_audit_log(
    entity_type,entity_id,action,actor_id,actor_role,source,new_value
  ) values (
    'payment_method_setting',result_setting.id,'payment_method_setting_saved',
    auth.uid(),public.current_actor_role(),'payment_verification',
    jsonb_build_object(
      'method_code',result_setting.method_code,
      'method_type',result_setting.method_type,
      'is_active',result_setting.is_active,
      'sort_order',result_setting.sort_order
    )
  );
  return result_setting;
end;
$$;;
