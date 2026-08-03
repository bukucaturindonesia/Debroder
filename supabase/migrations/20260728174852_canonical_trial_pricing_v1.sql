
begin;
create temporary table canonical_trial_prices(slug text primary key,sku text unique,price integer,create_missing boolean) on commit drop;
insert into canonical_trial_prices values
('cotton-combed-24s','DBR-CC24',45000,false),('3600-soft-tee','DBR-3600',45000,false),('8100-polo','DBR-8100',60000,false),('72y00-youth','DBR-72Y00',37000,false),('pullover-hooded','DBR-PULLOVER',140000,false),('crewneck','DBR-CREWNECK',100000,false),('bomber-jacket','DBR-BOMBER',205000,false),('windbreaker','DBR-WINDBREAKER',185000,false),('zip-hooded','DBR-ZIPHOOD',150000,false),('6089-premium-classic-snapback','DBD-HDWR',30000,false),('jersey-futsal-custom','DBR-JRS-FUTSAL',100000,true),('jersey-sepak-bola-custom','DBR-JRS-FOOTBALL',130000,true);
do $$ begin
 if (select count(*) from canonical_trial_prices t join public.products p on p.slug=t.slug and upper(btrim(p.sku))=t.sku where not t.create_missing)<>10 then raise exception 'canonical trial existing product mapping failed'; end if;
 if (select count(*) from public.product_categories where slug='jersey')<>1 then raise exception 'canonical jersey category mapping failed'; end if;
end $$;
insert into public.products(nama,name,kategori,subcategory,deskripsi,description,slug,sku,product_category_id,product_type,pricing_mode,sales_mode,tier_scope,uses_configurator,base_price,price,harga,price_label,link_url,config_schema,status,status_aktif,stock,admin_notes)
select case when t.slug='jersey-futsal-custom' then 'Jersey Futsal Custom' else 'Jersey Sepak Bola Custom' end,case when t.slug='jersey-futsal-custom' then 'Jersey Futsal Custom' else 'Jersey Sepak Bola Custom' end,'Jersey',case when t.slug='jersey-futsal-custom' then 'Futsal' else 'Sepak Bola' end,'Canonical Jersey trial record.','Canonical Jersey trial record.',t.slug,t.sku,c.id,'configurable_product','custom_quote','custom','none',true,t.price,t.price,t.price,'Harga dasar','/jersey/configurator?product='||t.slug,jsonb_build_object('entry_type','jersey_configurator'),'draft',false,0,'Owner-locked canonical trial record.'
from canonical_trial_prices t cross join public.product_categories c where t.create_missing and c.slug='jersey' and not exists(select 1 from public.products p where p.slug=t.slug or upper(btrim(p.sku))=t.sku);
do $$ begin if (select count(*) from canonical_trial_prices t join public.products p on p.slug=t.slug and upper(btrim(p.sku))=t.sku)<>12 then raise exception 'canonical trial 12-product mapping failed'; end if; end $$;
update public.products p set base_price=t.price,price=t.price,harga=t.price,updated_at=now() from canonical_trial_prices t where p.slug=t.slug and upper(btrim(p.sku))=t.sku;
update public.products set image_url='/products/crewneck/black/front.webp',gambar_url='/products/crewneck/black/front.webp',image_alt='Crewneck hitam DEBRODER',object_fit='contain',object_position='center center',updated_at=now() where slug='crewneck' and upper(btrim(sku))='DBR-CREWNECK';
update public.custom_categories set price_display_mode='final',updated_at=now() where slug='kaos-polos';
update public.custom_services set pricing_type='fixed_per_item',base_price=20000,estimated_min_price=null,estimated_max_price=null,requires_review=false,updated_at=now() where slug='sablon-dtf';
update public.custom_placements p set price_adjustment=0,updated_at=now() from public.custom_categories c where c.id=p.custom_category_id and c.slug='kaos-polos';
update public.custom_print_sizes s set price_adjustment=case s.slug when 'a4' then 20000 when 'a3' then 25000 end,updated_at=now() from public.custom_categories c where c.id=s.custom_category_id and c.slug='kaos-polos' and s.slug in('a4','a3');
update public.services set harga_mulai=case slug when 'sablon-dtf-a4' then 20000 else 25000 end,updated_at=now() where slug in('sablon-dtf-a4','sablon-dtf-a3');
insert into public.services(nama,slug,category_key,deskripsi,detail_body,harga_mulai,urutan,status_aktif) select 'Sablon DTF Meteran','sablon-dtf-meteran','sablon-dtf','Layanan cetak DTF meteran untuk kebutuhan produksi.','Harga canonical trial dihitung per meter.',30000,4,true where not exists(select 1 from public.services where slug='sablon-dtf-meteran');
update public.services set harga_mulai=30000,updated_at=now() where slug='sablon-dtf-meteran';
insert into public.system_audit_log(entity_type,action,actor_role,source,reason,metadata) values('commerce_pricing','canonical_trial_pricing_v1_applied','owner','migration','Owner-authorized locked canonical trial prices.',jsonb_build_object('product_price_count',12,'rls_changed',false,'historical_orders_changed',false));
commit;;
