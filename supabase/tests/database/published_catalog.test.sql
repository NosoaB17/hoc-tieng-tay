-- pgTAP: quyền truy cập và đồng bộ catalog công khai. Chạy: supabase test db (local).
-- Dữ liệu mẫu chỉ tồn tại trong transaction và bị rollback; không có seed thật.
begin;
select plan(35);

-- Rỗng theo mặc định (DB vừa reset từ migrations).
select is((select count(*) from editorial.lessons), 0::bigint, 'editorial.lessons is empty after migrations');
select is((select count(*) from public.published_lessons), 0::bigint, 'public.published_lessons is empty after migrations');

-- Cấu trúc
select has_schema('editorial', 'editorial schema exists');
select has_table('public', 'published_lessons', 'public projection table exists');
select ok((select relrowsecurity from pg_class where oid = 'editorial.lessons'::regclass),
  'RLS is enabled on editorial.lessons');
select ok((select relrowsecurity from pg_class where oid = 'public.published_lessons'::regclass),
  'RLS is enabled on public.published_lessons');
select columns_are('public', 'published_lessons',
  array['slug', 'title', 'summary', 'region', 'position'],
  'projection has exactly the public contract columns');
select is_empty(
  $$ select 1 from pg_constraint c
     where c.contype = 'f'
       and (c.conrelid::regclass::text like 'editorial.%' or c.confrelid::regclass::text like 'editorial.%'
         or c.conrelid::regclass::text = 'public.published_lessons'
         or c.confrelid::regclass::text = 'public.published_lessons') $$,
  'no foreign keys link editorial and the projection');
select policies_are('public', 'published_lessons', array['published_lessons_select'],
  'projection has exactly one policy');
select is_empty(
  $$ select 1 from pg_policies
     where schemaname = 'public' and tablename = 'published_lessons'
       and (cmd <> 'SELECT' or roles::text[] <> array['anon', 'authenticated']) $$,
  'projection policy is SELECT-only for anon and authenticated');

-- Grants theo catalog hệ thống
select ok(not has_schema_privilege('anon', 'editorial', 'usage'), 'anon has no usage on editorial');
select ok(not has_schema_privilege('authenticated', 'editorial', 'usage'), 'authenticated has no usage on editorial');
select ok(not has_function_privilege('anon', 'editorial.sync_published_lesson()', 'execute'),
  'anon cannot execute the sync trigger function');
select ok(not has_function_privilege('authenticated', 'editorial.sync_published_lesson()', 'execute'),
  'authenticated cannot execute the sync trigger function');
select is_empty(
  $$ select 1
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join unnest(array['anon', 'authenticated']) as r(role_name)
     cross join unnest(array['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) as p(priv)
     where n.nspname = 'public'
       and c.relkind in ('r', 'p', 'v', 'm', 'f')
       and has_table_privilege(r.role_name, c.oid, p.priv)
       and not (c.relname = 'published_lessons' and p.priv = 'SELECT') $$,
  'anon/authenticated hold only SELECT on public.published_lessons in public');
select is_empty(
  $$ select 1
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     cross join unnest(array['anon', 'authenticated']) as r(role_name)
     where n.nspname = 'editorial'
       and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
       and (has_table_privilege(r.role_name, c.oid, 'SELECT')
         or has_table_privilege(r.role_name, c.oid, 'INSERT')
         or has_table_privilege(r.role_name, c.oid, 'UPDATE')
         or has_table_privilege(r.role_name, c.oid, 'DELETE')) $$,
  'anon/authenticated hold no privileges on any editorial relation');

-- Cổng xuất bản: thiếu nguồn/người duyệt/quyền thì không publish được
select throws_ok(
  $$ insert into editorial.lessons (slug, title, summary, region, status, published_at)
     values ('no-gate', 't', 's', 'r', 'published', now()) $$,
  '23514', null, 'publishing without source/reviewer/rights is rejected');
select throws_ok(
  $$ insert into editorial.lessons (slug, title, summary, region, status, published_at,
                                    source_note, reviewed_by, reviewed_at, rights_cleared)
     values ('no-rights', 't', 's', 'r', 'published', now(), 'src', 'reviewer', now(), false) $$,
  '23514', null, 'publishing without rights clearance is rejected');

-- Dữ liệu mẫu trong transaction
insert into editorial.lessons (slug, title, summary, region, position, status, published_at,
                               source_note, reviewed_by, reviewed_at, rights_cleared, editor_notes)
values
  ('b-published', 'B published', 'sum b', 'Bình Liêu', 2, 'published', now(), 'src b', 'rev b', now(), true, 'private b'),
  ('a-published', 'A published', 'sum a', 'Bình Liêu', 1, 'published', now(), 'src a', 'rev a', now(), true, 'private a'),
  ('c-draft', 'C draft', 'sum c', 'Bình Liêu', 3, 'draft', null, null, null, null, false, 'private draft'),
  ('d-retracted', 'D retracted', 'sum d', 'Bình Liêu', 4, 'retracted', now(), 'src d', 'rev d', now(), true, 'withdrawn');

select is((select count(*) from public.published_lessons), 2::bigint,
  'only published rows are projected; draft and retracted are not');

-- anon
set local role anon;
select results_eq(
  $$ select slug from public.published_lessons order by position, slug $$,
  $$ values ('a-published'::text), ('b-published'::text) $$,
  'anon reads published rows ordered by position, slug');
select throws_ok($$ select * from editorial.lessons $$, '42501', null, 'anon cannot read editorial.lessons');
select throws_ok($$ select editor_notes from public.published_lessons $$, '42703', null,
  'editor_notes is not in the projection');
select throws_ok(
  $$ insert into public.published_lessons (slug, title, summary, region, position) values ('x', 'x', 'x', 'x', 9) $$,
  '42501', null, 'anon cannot insert into the projection');
select throws_ok($$ update public.published_lessons set title = 'x' $$, '42501', null, 'anon cannot update the projection');
select throws_ok($$ delete from public.published_lessons $$, '42501', null, 'anon cannot delete from the projection');
select throws_ok($$ update editorial.lessons set status = 'published' $$, '42501', null, 'anon cannot publish drafts');
reset role;

-- authenticated: không có thêm quyền so với anon
set local role authenticated;
select results_eq(
  $$ select count(*) from public.published_lessons $$,
  $$ values (2::bigint) $$,
  'authenticated reads the same published rows');
select throws_ok($$ select * from editorial.lessons $$, '42501', null, 'authenticated cannot read editorial.lessons');
select throws_ok($$ delete from public.published_lessons $$, '42501', null, 'authenticated cannot delete from the projection');
reset role;

-- Đồng bộ: sửa, đổi slug, rút bài, xoá, truncate
update editorial.lessons set title = 'B retitled' where slug = 'b-published';
select is((select title from public.published_lessons where slug = 'b-published'), 'B retitled',
  'editing a published lesson updates the projection');

update editorial.lessons set slug = 'a-renamed' where slug = 'a-published';
select results_eq(
  $$ select slug from public.published_lessons order by position $$,
  $$ values ('a-renamed'::text), ('b-published'::text) $$,
  'renaming a slug replaces the projected row');

update editorial.lessons set status = 'retracted' where slug = 'a-renamed';
select is((select count(*) from public.published_lessons where slug = 'a-renamed'), 0::bigint,
  'retracting removes the row from the projection');

delete from editorial.lessons where slug = 'b-published';
select is((select count(*) from public.published_lessons), 0::bigint,
  'deleting an editorial row removes it from the projection');

insert into editorial.lessons (slug, title, summary, region, status, published_at,
                               source_note, reviewed_by, reviewed_at, rights_cleared)
values ('e-published', 'E', 'sum e', 'Bình Liêu', 'published', now(), 'src e', 'rev e', now(), true);
select is((select count(*) from public.published_lessons), 1::bigint, 'publishing with the full gate projects the row');
truncate editorial.lessons;
select is((select count(*) from public.published_lessons), 0::bigint, 'truncating editorial clears the projection');

select * from finish();
rollback;
