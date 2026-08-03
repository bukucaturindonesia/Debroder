create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path=public as $$
declare row_id uuid; raw_id text; action_name text; old_json jsonb; new_json jsonb; key_metadata jsonb:='{}'::jsonb; begin
 if tg_op='INSERT' then new_json:=to_jsonb(new); raw_id:=new_json->>'id'; action_name='created';
 elsif tg_op='UPDATE' then old_json:=to_jsonb(old); new_json:=to_jsonb(new); raw_id:=coalesce(new_json->>'id',old_json->>'id');
  if new_json->>'archived_at' is not null and old_json->>'archived_at' is null then action_name='archived';
  elsif new_json->>'archived_at' is null and old_json->>'archived_at' is not null then action_name='restored'; else action_name='updated'; end if;
 else old_json:=to_jsonb(old); raw_id:=old_json->>'id'; action_name='deleted'; end if;
 begin row_id:=raw_id::uuid; exception when others then row_id:=null; end;
 if row_id is null then key_metadata:=jsonb_build_object('record_key',coalesce(raw_id,new_json->>'document_type',old_json->>'document_type',new_json->>'permission_key',old_json->>'permission_key')); end if;
 insert into public.system_audit_log(entity_type,entity_id,action,old_value,new_value,actor_id,actor_role,source,metadata)
 values(tg_table_name,row_id,action_name,old_json,new_json,auth.uid(),public.current_actor_role(),'trigger',key_metadata);
 if tg_op='DELETE' then return old; end if; return new; end $$;;
