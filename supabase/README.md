# Supabase (local, catalog công khai)

Stack local dùng cổng 563xx (`supabase/config.toml`), tách khỏi project khác. Chưa link hosted project.

## Mô hình dữ liệu

- `editorial.lessons`: dữ liệu biên tập, không expose qua Data API, RLS bật và không có policy.
- `public.published_lessons`: projection công khai (`slug`, `title`, `summary`, `region`, `position`), RLS, chỉ policy `SELECT` cho `anon`/`authenticated`.
- Trigger `editorial.sync_published_lesson` đồng bộ projection trong cùng transaction với thao tác biên tập. Không ai ghi trực tiếp vào projection.

## Vận hành an toàn

- Chỉ thao tác trên `editorial.lessons` bằng SQL của người vận hành (service role / owner), không dùng key trên trình duyệt.
- Xuất bản = đặt `status = 'published'` cùng `source_note`, `reviewed_by`, `reviewed_at`, `rights_cleared = true`, `published_at`. Thiếu một trong các trường này thì constraint `published_requires_gate` từ chối.
- Rút bài = đặt `status = 'retracted'` (hoặc xoá hàng); projection bị xoá hàng ngay trong cùng transaction.
- Không seed; catalog rỗng cho đến khi có nội dung đã duyệt. Dữ liệu thử chỉ đặt trong transaction rồi rollback (xem `tests/`).
- Không chạy `supabase db push`/`link` tới project hosted từ đây khi chưa được duyệt; migration hosted tách riêng khỏi CI.

## Kiểm thử local

```
supabase start
supabase db reset
supabase test db
```

## Rollback

`rollbacks/*.down.sql` chỉ xoá object của migration (không CASCADE). Nó xoá dữ liệu biên tập: sao lưu `editorial.lessons` trước. Reverting code web không khôi phục nội dung đã rút.
