create or replace function public.create_payment_submission_link(p_order_id uuid,p_expires_at timestamptz,p_max_uses integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare raw_token text; hashed text; link_row public.payment_submission_links;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
 if p_expires_at<=now() then raise exception 'Expiry must be in the future'; end if;
 if p_max_uses<1 or p_max_uses>20 then raise exception 'Invalid max uses'; end if;
 perform 1 from public.orders where id=p_order_id and archived_at is null;
 if not found then raise exception 'Active order not found'; end if;
 raw_token:=encode(gen_random_bytes(32),'hex'); hashed:=encode(digest(raw_token,'sha256'),'hex');
 insert into public.payment_submission_links(order_id,token_hash,expires_at,max_uses,created_by)
 values(p_order_id,hashed,p_expires_at,p_max_uses,auth.uid()) returning * into link_row;
 return jsonb_build_object('id',link_row.id,'token',raw_token,'expires_at',link_row.expires_at,'max_uses',link_row.max_uses);
end $$;
create or replace function public.revoke_payment_submission_link(p_link_id uuid,p_reason text default null)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set revoked_at=now(),revoked_by=auth.uid(),revoke_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now()
 where id=p_link_id and revoked_at is null returning * into link_row;
 if not found then raise exception 'Active link not found'; end if; return link_row;
end $$;
create or replace function public.archive_payment_submission_link(p_link_id uuid,p_reason text default null)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now()
 where id=p_link_id and archived_at is null returning * into link_row;
 if not found then raise exception 'Link not found'; end if; return link_row;
end $$;
create or replace function public.restore_payment_submission_link(p_link_id uuid)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set archived_at=null,archived_by=null,archive_reason=null,updated_at=now()
 where id=p_link_id and archived_at is not null returning * into link_row;
 if not found then raise exception 'Archived link not found'; end if; return link_row;
end $$;
create or replace function public.permanently_delete_payment_submission_link(p_link_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 delete from public.payment_submission_links where id=p_link_id and archived_at is not null;
 if not found then raise exception 'Link must be archived'; end if;
end $$;
grant execute on function public.create_payment_submission_link(uuid,timestamptz,integer),public.revoke_payment_submission_link(uuid,text),public.archive_payment_submission_link(uuid,text),public.restore_payment_submission_link(uuid),public.permanently_delete_payment_submission_link(uuid) to authenticated;;
