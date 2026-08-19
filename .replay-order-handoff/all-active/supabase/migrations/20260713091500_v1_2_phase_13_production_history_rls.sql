begin;

-- Phase 13 follow-up: expose production history/dependency read models to the
-- new Production Admin and assigned Operator roles without modifying any
-- Phase 1-12 policy.

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_revisions' and policyname='phase13 production work revision read') then
    create policy "phase13 production work revision read" on public.work_item_revisions
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.id=work_item_revisions.work_item_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_assignment_history' and policyname='phase13 production assignment history read') then
    create policy "phase13 production assignment history read" on public.work_item_assignment_history
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.id=work_item_assignment_history.work_item_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_dependencies' and policyname='phase13 production dependency read') then
    create policy "phase13 production dependency read" on public.work_item_dependencies
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.id=work_item_dependencies.work_item_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_dependency_history' and policyname='phase13 production dependency history read') then
    create policy "phase13 production dependency history read" on public.work_item_dependency_history
      for select to authenticated using (
        public.has_permission('production.view') and exists(
          select 1 from public.work_items work_item
          where work_item.id=work_item_dependency_history.work_item_id
            and (public.current_actor_role()<>'operator' or work_item.assigned_to=auth.uid())
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_order_revisions' and policyname='phase13 production job revision read') then
    create policy "phase13 production job revision read" on public.job_order_revisions
      for select to authenticated using (
        public.has_permission('production.view') and (
          public.current_actor_role()<>'operator' or exists(
            select 1 from public.work_items work_item
            where work_item.job_order_id=job_order_revisions.job_order_id
              and work_item.assigned_to=auth.uid()
          )
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='job_order_deletion_audit' and policyname='phase13 production job deletion audit read') then
    create policy "phase13 production job deletion audit read" on public.job_order_deletion_audit
      for select to authenticated using (
        public.has_permission('production.view') and public.current_actor_role()<>'operator'
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='work_item_deletion_audit' and policyname='phase13 production work deletion audit read') then
    create policy "phase13 production work deletion audit read" on public.work_item_deletion_audit
      for select to authenticated using (
        public.has_permission('production.view') and public.current_actor_role()<>'operator'
      );
  end if;
end
$$;

commit;

-- Rollback note: remove only the seven policies prefixed with "phase13
-- production" in this migration. No data, history, trigger, or prior policy is
-- modified.
