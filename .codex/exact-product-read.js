require('@next/env').loadEnvConfig(process.cwd());
const fs = require('node:fs');
const { createClient } = require('@supabase/supabase-js');

const source = fs.readFileSync('lib/supabase/products.ts', 'utf8');
const tick = String.fromCharCode(96);
const start = source.indexOf(`const PRODUCT_SELECT = ${tick}`) + `const PRODUCT_SELECT = ${tick}`.length;
const end = source.indexOf(`${tick};`, start);
const select = source.slice(start, end);
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

client
  .from('products')
  .select(select)
  .eq('slug', 'debroder-e2e-ready-stock')
  .eq('status', 'active')
  .maybeSingle()
  .then(({ data, error }) => {
    console.log(JSON.stringify({
      found: Boolean(data),
      error: error ? { code: error.code, message: error.message, details: error.details, hint: error.hint } : null
    }, null, 2));
    process.exitCode = error ? 1 : 0;
  })
  .catch((error) => {
    console.log(error.message);
    process.exitCode = 1;
  });
