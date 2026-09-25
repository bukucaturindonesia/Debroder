-- DEBRODER v1.2 Phase 11 — timestamp trigger, audit trigger, RLS, and read policies.

create or replace function public.set_fulfillment_updated_at()
returns trigger language plpgsql set search_path='' as $$begin new.updated_at=now(); return new; end $$;
drop trigger if exists set_fulfillment_updated_at on public.fulfillments;
create trigger set_fulfillment_updated_at before update on public.fulfillments
for each row execute function public.set_fulfillment_updated_at();

drop trigger if exists audit_fulfillments_changes on public.fulfillments;
create trigger audit_fulfillments_changes after insert or update or delete on public.fulfillments
for each row execute function public.audit_row_change();

alter table public.fulfillments enable row level security;
alter table public.fulfillment_items enable row level security;
alter table public.fulfillment_files enable row level security;
alter table public.fulfillment_status_history enable row level security;
alter table public.fulfillment_revisions enable row level security;
alter table public.fulfillment_deletion_audit enable row level security;

do $$
declare table_name_value text;
begin
  foreach table_name_value in array array[
    'fulfillments','fulfillment_items','fulfillment_files','fulfillment_status_history','fulfillment_revisions','fulfillment_deletion_audit'
  ] loop
    execute format('drop policy if exists "staff read %s" on public.%I',table_name_value,table_name_value);
    execute format('drop policy if exists "production staff read %s" on public.%I',table_name_value,table_name_value);
    execute format(
      'create policy "production staff read %s" on public.%I for select to authenticated using(public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''admin'']))',
      table_name_value,table_name_value
    );
  end loop;
end $$;
