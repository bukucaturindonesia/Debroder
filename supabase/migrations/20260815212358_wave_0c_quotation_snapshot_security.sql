-- Wave 0C: close the anonymous quotation snapshot exposure.
--
-- This is a forward-only corrective migration. It intentionally fails if the
-- historical function is absent rather than silently creating a new API.
-- The current quotation contract is staff/admin permission-only: quotations
-- have no store_id access path and no customer ownership policy.

do $guard$
begin
  if pg_catalog.to_regprocedure('public.build_quotation_snapshot(uuid)') is null then
    raise exception 'Wave 0C precondition failed: public.build_quotation_snapshot(uuid) is missing';
  end if;
end
$guard$;

create or replace function public.build_quotation_snapshot(p_quotation_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  select jsonb_build_object(
    'quotation', to_jsonb(q) - 'latest_version_id' - 'sent_version_id' - 'approved_version_id',
    'items', coalesce((
      select jsonb_agg(
        (to_jsonb(qi) - 'archived_by' - 'archive_reason') ||
        jsonb_build_object(
          'services', coalesce((
            select jsonb_agg(
              to_jsonb(qis) - 'archived_by' - 'archive_reason'
              order by qis.sort_order, qis.created_at
            )
            from public.quotation_item_services qis
            where qis.quotation_item_id = qi.id
              and qis.archived_at is null
          ), '[]'::jsonb)
        )
        order by qi.sort_order, qi.created_at
      )
      from public.quotation_items qi
      where qi.quotation_id = q.id
        and qi.archived_at is null
    ), '[]'::jsonb)
  )
  from public.quotations q
  where q.id = p_quotation_id
    and q.archived_at is null
    and public.has_permission('quotation.read'::text);
$function$;

revoke all on function public.build_quotation_snapshot(uuid) from public;
revoke all on function public.build_quotation_snapshot(uuid) from anon, authenticated, service_role;
grant execute on function public.build_quotation_snapshot(uuid) to authenticated;
