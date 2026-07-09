-- Ganti GANTI_DENGAN_EMAIL_ADMIN dengan email admin yang sudah dibuat di Supabase Authentication.
-- Jalankan file ini setelah schema.sql selesai dijalankan dan user admin sudah dibuat.

insert into public.profiles (id, email, role)
select id, email, 'superadmin'
from auth.users
where email = 'fahmisalam2795@gmail.com'
on conflict (id)
do update set role = 'superadmin';
