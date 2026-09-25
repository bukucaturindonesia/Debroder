require('@next/env').loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');

const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const checks = [
  ['variants', client.from('product_variants').select('id,product_id,name,slug,hex_code,status,variant_name,color_name,color_hex,sku,price_adjustment,is_active,sort_order').eq('product_id', '77777777-7777-4777-8777-777777777777')],
  ['sizes', client.from('product_variant_sizes').select('id,variant_id,size_name,sku,stock,stock_quantity,size_id,status,price_adjustment,is_active,sort_order').eq('variant_id', '88888888-8888-4888-8888-888888888888')],
  ['images', client.from('product_variant_images').select('id,variant_id,image_url,image_role,alt_text,is_cover,sort_order').eq('variant_id', '88888888-8888-4888-8888-888888888888')],
  ['guides', client.from('product_size_guides').select('id,product_id,product_category_id,product_subcategory_id,title,description,rows,notes,is_active,sort_order').eq('product_id', '77777777-7777-4777-8777-777777777777')],
  ['inventory_rpc', client.rpc('public_ready_stock_availability_v1', { p_variant_size_ids: ['bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'] })],
  ['contact', client.from('contact_settings').select('whatsapp_link,whatsapp_utama').eq('status_aktif', true).limit(1).maybeSingle()]
];

Promise.all(checks).then((results) => {
  console.log(JSON.stringify(Object.fromEntries(results.map(([name, result]) => [name, {
    rows: result.data?.length ?? (result.data ? 1 : 0),
    error: result.error ? { code: result.error.code, message: result.error.message } : null
  }])), null, 2));
  process.exitCode = results.some(([, result]) => result.error) ? 1 : 0;
}).catch((error) => {
  console.log(error.message);
  process.exitCode = 1;
});
