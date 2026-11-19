-- Catalog công khai. Dữ liệu biên tập ở schema `editorial` (không expose qua Data API).
-- `public.published_lessons` là bảng chiếu (projection) chỉ-đọc cho web, có RLS.
-- Trigger không expose đồng bộ projection trong cùng transaction với thao tác biên tập.
-- Không seed. Không đổi default privileges toàn cục.

create schema editorial;
revoke all on schema editorial from public, anon, authenticated;

create table editorial.lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null check (char_length(btrim(title)) between 1 and 200),
  summary text not null check (char_length(btrim(summary)) between 1 and 1000),
  region text not null check (char_length(btrim(region)) between 1 and 100),
  position integer not null default 0 check (position >= 0),
  status text not null default 'draft'
    check (status in ('draft', 'review', 'published', 'retracted')),
  -- Cổng xuất bản: nguồn, người duyệt và xác nhận quyền sử dụng.
  source_note text,
  reviewed_by text,
  reviewed_at timestamptz,
  rights_cleared boolean not null default false,
  published_at timestamptz,
  editor_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_requires_gate check (
    status <> 'published' or (
      char_length(btrim(coalesce(source_note, ''))) > 0
      and char_length(btrim(coalesce(reviewed_by, ''))) > 0
      and reviewed_at is not null
      and rights_cleared
      and published_at is not null
    )
  )
);

alter table editorial.lessons enable row level security;
revoke all on editorial.lessons from public, anon, authenticated;

-- Projection công khai: chỉ 5 cột của contract, không FK tới editorial.
create table public.published_lessons (
  slug text primary key
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  title text not null,
  summary text not null,
  region text not null,
  position integer not null default 0
);

alter table public.published_lessons enable row level security;
revoke all on public.published_lessons from public, anon, authenticated;
grant select on public.published_lessons to anon, authenticated;

create policy published_lessons_select on public.published_lessons
  for select to anon, authenticated
  using (true);

-- Đồng bộ publish/retract/sửa/xoá vào projection. SECURITY DEFINER (owner bypass RLS)
-- để người vận hành không cần quyền ghi trực tiếp vào bảng công khai; hàm nằm
-- trong schema không expose và không ai ngoài owner được EXECUTE.
create function editorial.sync_published_lesson()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'TRUNCATE' then
    delete from public.published_lessons;
    return null;
  end if;

  if tg_op in ('UPDATE', 'DELETE') and old.status = 'published' then
    delete from public.published_lessons where slug = old.slug;
  end if;

  if tg_op in ('INSERT', 'UPDATE') and new.status = 'published' then
    insert into public.published_lessons (slug, title, summary, region, position)
    values (new.slug, new.title, new.summary, new.region, new.position);
  end if;

  return null;
end;
$$;

revoke all on function editorial.sync_published_lesson() from public, anon, authenticated;

create trigger lessons_sync_published
  after insert or update or delete on editorial.lessons
  for each row execute function editorial.sync_published_lesson();

create trigger lessons_sync_published_truncate
  after truncate on editorial.lessons
  for each statement execute function editorial.sync_published_lesson();
