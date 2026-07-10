-- DEBRODER CMS draft/publish workflow foundation.
-- Review manually before running. Do not execute directly in production without backup.

create or replace function public.is_cms_content_public(
  p_status text,
  p_publish_at timestamptz
)
returns boolean
language sql
stable
as $$
  select
    p_status = 'published'
    or (
      p_status = 'scheduled'
      and p_publish_at is not null
      and p_publish_at <= now()
    );
$$;

create table if not exists public.cms_content_revisions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null,
  content_id uuid not null,
  action text,
  status text not null default 'draft',
  data jsonb not null default '{}'::jsonb,
  before_data jsonb,
  after_data jsonb,
  publish_at timestamptz,
  published_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.cms_content_revisions
  add column if not exists action text;

update public.cms_content_revisions
set action = case status
  when 'published' then 'published'
  when 'scheduled' then 'scheduled'
  when 'archived' then 'archived'
  else 'draft_saved'
end
where action is null;

alter table public.cms_content_revisions
  alter column action set not null;

alter table public.cms_content_revisions
  drop constraint if exists cms_content_revisions_status_check;

alter table public.cms_content_revisions
  add constraint cms_content_revisions_status_check check (
    status in ('draft', 'scheduled', 'published', 'archived')
  );

alter table public.cms_content_revisions
  drop constraint if exists cms_content_revisions_action_check;

alter table public.cms_content_revisions
  add constraint cms_content_revisions_action_check check (
    action in (
      'draft_saved',
      'published',
      'scheduled',
      'schedule_cancelled',
      'archived',
      'restored'
    )
  );

alter table public.cms_content_revisions
  drop constraint if exists cms_content_revisions_scheduled_publish_at_check;

alter table public.cms_content_revisions
  add constraint cms_content_revisions_scheduled_publish_at_check check (
    status <> 'scheduled' or publish_at is not null
  );

create index if not exists cms_content_revisions_latest_idx
  on public.cms_content_revisions (
    content_type,
    content_id,
    created_at desc,
    id desc
  );

create index if not exists cms_content_revisions_due_schedule_idx
  on public.cms_content_revisions (
    content_type,
    status,
    action,
    publish_at
  );

do $$
declare
  table_name text;
  cms_tables text[] := array[
    'hero_banners',
    'instagram_banners',
    'page_heroes',
    'stores',
    'testimonials',
    'contact_settings',
    'order_steps',
    'trust_about_content',
    'product_filters',
    'homepage_sections',
    'homepage_section_items',
    'landing_sections',
    'cms_banners'
  ];
begin
  foreach table_name in array cms_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise notice 'Skipping missing CMS table: %', table_name;
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists status text not null default ''draft''',
      table_name
    );
    execute format(
      'alter table public.%I add column if not exists publish_at timestamptz',
      table_name
    );
    execute format(
      'alter table public.%I add column if not exists published_at timestamptz',
      table_name
    );
    execute format(
      'alter table public.%I add column if not exists archived_at timestamptz',
      table_name
    );
    execute format(
      'alter table public.%I add column if not exists updated_by uuid references auth.users(id) on delete set null',
      table_name
    );

    execute format(
      'alter table public.%I drop constraint if exists %I',
      table_name,
      table_name || '_cms_status_check'
    );
    execute format(
      'alter table public.%I add constraint %I check (status in (''draft'', ''scheduled'', ''published'', ''archived''))',
      table_name,
      table_name || '_cms_status_check'
    );

    execute format(
      'alter table public.%I drop constraint if exists %I',
      table_name,
      table_name || '_cms_scheduled_publish_at_check'
    );
    execute format(
      'alter table public.%I add constraint %I check (status <> ''scheduled'' or publish_at is not null)',
      table_name,
      table_name || '_cms_scheduled_publish_at_check'
    );

    execute format(
      'create index if not exists %I on public.%I (status, publish_at)',
      table_name || '_cms_status_publish_idx',
      table_name
    );
  end loop;
end $$;

-- Preserve existing public content when introducing workflow fields.
do $$
declare
  mapping record;
begin
  for mapping in
    select * from (values
      ('hero_banners', 'status_aktif'),
      ('instagram_banners', 'status_aktif'),
      ('page_heroes', 'status_aktif'),
      ('stores', 'status_aktif'),
      ('testimonials', 'status_aktif'),
      ('contact_settings', 'status_aktif'),
      ('order_steps', 'status_aktif'),
      ('trust_about_content', 'status_aktif'),
      ('product_filters', 'status_aktif'),
      ('homepage_sections', 'is_active'),
      ('homepage_section_items', 'is_active'),
      ('landing_sections', 'is_visible'),
      ('cms_banners', 'is_active')
    ) as cms_map(table_name, active_column)
  loop
    if to_regclass(format('public.%I', mapping.table_name)) is null then
      continue;
    end if;

    execute format(
      'update public.%I
       set status = case when %I then ''published'' else ''draft'' end,
           published_at = case
             when %I then coalesce(published_at, updated_at, created_at, now())
             else published_at
           end
       where status = ''draft'' and published_at is null',
      mapping.table_name,
      mapping.active_column,
      mapping.active_column
    );
  end loop;
end $$;

-- Revisions are private. Public scheduled rendering uses the restricted RPC below.
alter table public.cms_content_revisions enable row level security;

revoke all on table public.cms_content_revisions from anon;
revoke all on table public.cms_content_revisions from authenticated;
grant select, insert, update, delete on table public.cms_content_revisions to authenticated;

drop policy if exists "Public can read due CMS revisions" on public.cms_content_revisions;
drop policy if exists "Superadmin can manage CMS revisions" on public.cms_content_revisions;

create policy "Superadmin can manage CMS revisions"
on public.cms_content_revisions for all
to authenticated
using (public.is_superadmin())
with check (public.is_superadmin());

create or replace function public.get_due_cms_revisions(
  p_content_type text
)
returns table (
  content_id uuid,
  data jsonb,
  publish_at timestamptz,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if p_content_type is null or not (
    p_content_type = any(array[
      'hero_banners',
      'instagram_banners',
      'page_heroes',
      'stores',
      'testimonials',
      'contact_settings',
      'order_steps',
      'trust_about_content',
      'product_filters',
      'homepage_sections',
      'homepage_section_items',
      'landing_sections',
      'cms_banners'
    ])
  ) then
    return;
  end if;

  return query
  select
    latest.content_id,
    latest.data,
    latest.publish_at,
    latest.created_at
  from (
    select distinct on (revision.content_id)
      revision.content_id,
      revision.action,
      revision.status,
      coalesce(revision.after_data, revision.data) as data,
      revision.publish_at,
      revision.created_at,
      revision.id
    from public.cms_content_revisions revision
    where revision.content_type = p_content_type
    order by revision.content_id, revision.created_at desc, revision.id desc
  ) latest
  where latest.action = 'scheduled'
    and latest.status = 'scheduled'
    and latest.publish_at is not null
    and latest.publish_at <= now()
    and case
      when p_content_type in (
        'hero_banners',
        'instagram_banners',
        'page_heroes',
        'stores',
        'testimonials',
        'contact_settings',
        'order_steps',
        'trust_about_content',
        'product_filters'
      ) then coalesce((latest.data ->> 'status_aktif')::boolean, true)
      when p_content_type in (
        'homepage_sections',
        'homepage_section_items',
        'cms_banners'
      ) then coalesce((latest.data ->> 'is_active')::boolean, true)
      else true
    end;
end;
$$;

revoke all on function public.get_due_cms_revisions(text) from public;
grant execute on function public.get_due_cms_revisions(text) to anon, authenticated;

create or replace function public.apply_cms_workflow_action(
  p_content_type text,
  p_content_id uuid,
  p_action text,
  p_data jsonb default '{}'::jsonb,
  p_publish_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_allowed_tables constant text[] := array[
    'hero_banners',
    'instagram_banners',
    'page_heroes',
    'stores',
    'testimonials',
    'contact_settings',
    'order_steps',
    'trust_about_content',
    'product_filters',
    'homepage_sections',
    'homepage_section_items',
    'landing_sections',
    'cms_banners'
  ];
  v_allowed_actions constant text[] := array[
    'draft_saved',
    'published',
    'scheduled',
    'schedule_cancelled',
    'archived',
    'restored'
  ];
  v_now timestamptz := now();
  v_user_id uuid := auth.uid();
  v_current jsonb;
  v_current_status text;
  v_payload jsonb := coalesce(p_data, '{}'::jsonb) - array[
    'id',
    'created_at',
    'updated_at',
    'updated_by',
    'status',
    'publish_at',
    'published_at',
    'archived_at'
  ];
  v_latest_revision public.cms_content_revisions%rowtype;
  v_revision_data jsonb;
  v_after jsonb;
  v_update_data jsonb;
  v_set_clause text;
  v_revision public.cms_content_revisions%rowtype;
begin
  if not public.is_superadmin() then
    raise exception 'Hanya superadmin yang dapat menjalankan workflow CMS.'
      using errcode = '42501';
  end if;

  if p_content_type is null or not (p_content_type = any(v_allowed_tables)) then
    raise exception 'Tabel CMS tidak didukung: %', coalesce(p_content_type, '<null>')
      using errcode = '22023';
  end if;

  if p_action is null or not (p_action = any(v_allowed_actions)) then
    raise exception 'Action CMS tidak didukung: %', coalesce(p_action, '<null>')
      using errcode = '22023';
  end if;

  execute format(
    'select to_jsonb(target) from public.%I target where target.id = $1',
    p_content_type
  )
  into v_current
  using p_content_id;

  if v_current is null then
    raise exception 'Konten CMS tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_current_status := coalesce(v_current ->> 'status', 'draft');

  select revision.*
  into v_latest_revision
  from public.cms_content_revisions revision
  where revision.content_type = p_content_type
    and revision.content_id = p_content_id
  order by revision.created_at desc, revision.id desc
  limit 1;

  case p_action
    when 'draft_saved' then
      v_revision_data := v_payload;

      if v_current_status = 'published' then
        v_after := v_current || v_payload || jsonb_build_object(
          'status', 'draft',
          'publish_at', null,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      else
        v_update_data := v_payload || jsonb_build_object(
          'status', 'draft',
          'publish_at', null,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      end if;

    when 'published' then
      if v_payload = '{}'::jsonb
        and v_latest_revision.id is not null
        and v_latest_revision.action in (
          'draft_saved',
          'scheduled',
          'schedule_cancelled',
          'restored'
        ) then
        v_payload := coalesce(v_latest_revision.data, '{}'::jsonb);
      end if;

      if v_payload = '{}'::jsonb then
        v_payload := v_current - array[
          'id',
          'created_at',
          'updated_at',
          'updated_by',
          'status',
          'publish_at',
          'published_at',
          'archived_at'
        ];
      end if;

      v_revision_data := v_payload;
      v_update_data := v_payload || jsonb_build_object(
        'status', 'published',
        'publish_at', null,
        'published_at', v_now,
        'archived_at', null,
        'updated_by', v_user_id,
        'updated_at', v_now
      );

    when 'scheduled' then
      if p_publish_at is null or p_publish_at <= v_now then
        raise exception 'Jadwal publish harus berada di masa depan.'
          using errcode = '22023';
      end if;

      v_revision_data := v_payload;

      if v_current_status = 'published' then
        v_after := v_current || v_payload || jsonb_build_object(
          'status', 'scheduled',
          'publish_at', p_publish_at,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      else
        v_update_data := v_payload || jsonb_build_object(
          'status', 'scheduled',
          'publish_at', p_publish_at,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      end if;

    when 'schedule_cancelled' then
      if v_latest_revision.id is not null
        and v_latest_revision.action = 'scheduled' then
        v_revision_data := coalesce(v_latest_revision.data, '{}'::jsonb);
      else
        v_revision_data := v_current - array[
          'id',
          'created_at',
          'updated_at',
          'updated_by',
          'status',
          'publish_at',
          'published_at',
          'archived_at'
        ];
      end if;

      if v_current_status = 'published' then
        v_after := v_current || v_revision_data || jsonb_build_object(
          'status', 'draft',
          'publish_at', null,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      else
        v_update_data := jsonb_build_object(
          'status', 'draft',
          'publish_at', null,
          'archived_at', null,
          'updated_by', v_user_id,
          'updated_at', v_now
        );
      end if;

    when 'archived' then
      v_revision_data := v_current - array[
        'id',
        'created_at',
        'updated_at',
        'updated_by',
        'status',
        'publish_at',
        'published_at',
        'archived_at'
      ];
      v_update_data := jsonb_build_object(
        'status', 'archived',
        'publish_at', null,
        'archived_at', v_now,
        'updated_by', v_user_id,
        'updated_at', v_now
      );

    when 'restored' then
      v_revision_data := v_current - array[
        'id',
        'created_at',
        'updated_at',
        'updated_by',
        'status',
        'publish_at',
        'published_at',
        'archived_at'
      ];
      v_update_data := jsonb_build_object(
        'status', 'draft',
        'publish_at', null,
        'archived_at', null,
        'updated_by', v_user_id,
        'updated_at', v_now
      );
  end case;

  if v_update_data is not null then
    select string_agg(
      format('%I = source.%I', column_info.column_name, column_info.column_name),
      ', ' order by column_info.ordinal_position
    )
    into v_set_clause
    from information_schema.columns column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = p_content_type
      and v_update_data ? column_info.column_name
      and column_info.column_name not in ('id', 'created_at');

    if v_set_clause is null then
      raise exception 'Tidak ada field CMS valid untuk diperbarui.'
        using errcode = '22023';
    end if;

    execute format(
      'update public.%I as target
       set %s
       from jsonb_populate_record(null::public.%I, $1) as source
       where target.id = $2
       returning to_jsonb(target)',
      p_content_type,
      v_set_clause,
      p_content_type
    )
    into v_after
    using v_update_data, p_content_id;
  end if;

  insert into public.cms_content_revisions (
    content_type,
    content_id,
    action,
    status,
    data,
    before_data,
    after_data,
    publish_at,
    published_at,
    archived_at,
    updated_by,
    updated_at
  )
  values (
    p_content_type,
    p_content_id,
    p_action,
    case p_action
      when 'published' then 'published'
      when 'scheduled' then 'scheduled'
      when 'archived' then 'archived'
      else 'draft'
    end,
    coalesce(v_revision_data, '{}'::jsonb),
    v_current,
    v_after,
    case when p_action = 'scheduled' then p_publish_at else null end,
    case
      when p_action = 'published' then v_now
      else nullif(v_after ->> 'published_at', '')::timestamptz
    end,
    case when p_action = 'archived' then v_now else null end,
    v_user_id,
    v_now
  )
  returning * into v_revision;

  return jsonb_build_object(
    'row', v_after,
    'revision', to_jsonb(v_revision)
  );
end;
$$;

revoke all on function public.apply_cms_workflow_action(
  text,
  uuid,
  text,
  jsonb,
  timestamptz
) from public;

grant execute on function public.apply_cms_workflow_action(
  text,
  uuid,
  text,
  jsonb,
  timestamptz
) to authenticated;

-- Public CMS policies. Existing superadmin policies remain unchanged.
drop policy if exists "Public can read active hero banners" on public.hero_banners;
create policy "Public can read active hero banners"
on public.hero_banners for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active instagram banners" on public.instagram_banners;
create policy "Public can read active instagram banners"
on public.instagram_banners for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active page heroes" on public.page_heroes;
create policy "Public can read active page heroes"
on public.page_heroes for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active stores" on public.stores;
create policy "Public can read active stores"
on public.stores for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active testimonials" on public.testimonials;
create policy "Public can read active testimonials"
on public.testimonials for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active contact settings" on public.contact_settings;
create policy "Public can read active contact settings"
on public.contact_settings for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active order steps" on public.order_steps;
create policy "Public can read active order steps"
on public.order_steps for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active trust about content" on public.trust_about_content;
create policy "Public can read active trust about content"
on public.trust_about_content for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active product filters" on public.product_filters;
create policy "Public can read active product filters"
on public.product_filters for select
to anon, authenticated
using (status_aktif = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active homepage sections" on public.homepage_sections;
create policy "Public can read active homepage sections"
on public.homepage_sections for select
to anon, authenticated
using (is_active = true and public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read plain category section setting" on public.homepage_sections;
create policy "Public can read plain category section setting"
on public.homepage_sections for select
to anon, authenticated
using (
  slug = 'pakaian-polos-berdasarkan-kategori'
  and public.is_cms_content_public(status, publish_at)
);

drop policy if exists "Public can read active homepage section items" on public.homepage_section_items;
create policy "Public can read active homepage section items"
on public.homepage_section_items for select
to anon, authenticated
using (
  is_active = true
  and public.is_cms_content_public(status, publish_at)
  and exists (
    select 1
    from public.homepage_sections section
    where section.id = section_id
      and section.is_active = true
      and public.is_cms_content_public(section.status, section.publish_at)
  )
);

drop policy if exists "Public can read landing section settings" on public.landing_sections;
create policy "Public can read landing section settings"
on public.landing_sections for select
to anon, authenticated
using (public.is_cms_content_public(status, publish_at));

drop policy if exists "Public can read active CMS banners" on public.cms_banners;
create policy "Public can read active CMS banners"
on public.cms_banners for select
to anon, authenticated
using (is_active = true and public.is_cms_content_public(status, publish_at));
