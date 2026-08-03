create or replace function public.create_document_number_rule(p_document_type text,p_prefix text,p_use_year boolean,p_use_month boolean,p_padding integer,p_separator text,p_reset_rule text)
returns public.document_number_rules language plpgsql security definer set search_path=public as $$
declare r public.document_number_rules; begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 if btrim(coalesce(p_document_type,''))='' or btrim(coalesce(p_prefix,''))='' then raise exception 'Document type and prefix required'; end if;
 if p_padding<3 or p_padding>8 or p_reset_rule not in ('never','yearly','monthly') then raise exception 'Invalid numbering rule'; end if;
 insert into public.document_number_rules(document_type,prefix,use_year,use_month,padding,separator,reset_rule,active,updated_by)
 values(lower(regexp_replace(btrim(p_document_type),'[^a-zA-Z0-9_]+','_','g')),btrim(p_prefix),coalesce(p_use_year,true),coalesce(p_use_month,false),p_padding,coalesce(nullif(p_separator,''),'-'),p_reset_rule,true,auth.uid()) returning * into r;
 return r; end $$;

create or replace function public.update_document_number_rule(p_document_type text,p_prefix text,p_use_year boolean,p_use_month boolean,p_padding integer,p_separator text,p_reset_rule text,p_active boolean)
returns public.document_number_rules language plpgsql security definer set search_path=public as $$
declare out_row public.document_number_rules; begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 if btrim(coalesce(p_prefix,''))='' then raise exception 'Prefix required'; end if;
 if p_padding<3 or p_padding>8 then raise exception 'Invalid padding'; end if;
 if p_reset_rule not in ('never','yearly','monthly') then raise exception 'Invalid reset rule'; end if;
 update public.document_number_rules set prefix=btrim(p_prefix),use_year=p_use_year,use_month=p_use_month,padding=p_padding,separator=coalesce(p_separator,'-'),reset_rule=p_reset_rule,active=p_active,updated_by=auth.uid(),updated_at=now()
 where document_type=p_document_type and archived_at is null returning * into out_row;
 if not found then raise exception 'Active rule not found'; end if; return out_row; end $$;

grant execute on function public.create_document_number_rule(text,text,boolean,boolean,integer,text,text) to authenticated;;
