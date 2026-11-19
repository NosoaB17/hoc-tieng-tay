-- Rollback thủ công cho 20261119085130_published_catalog.sql (CLI không tự chạy).
-- Chỉ xoá object do migration này tạo; không dùng CASCADE nên sẽ báo lỗi nếu có
-- object khác phụ thuộc hoặc schema `editorial` chứa thứ khác.
-- Xoá editorial.lessons và public.published_lessons là mất dữ liệu: sao lưu trước.
begin;
drop trigger if exists lessons_sync_published_truncate on editorial.lessons;
drop trigger if exists lessons_sync_published on editorial.lessons;
drop function if exists editorial.sync_published_lesson();
drop table if exists public.published_lessons;
drop table if exists editorial.lessons;
drop schema if exists editorial;
commit;
