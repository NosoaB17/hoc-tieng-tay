# Học tiếng Tày — Astro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây nền website Học tiếng Tày hoàn chỉnh về điều hướng và chuẩn bị một luồng tự học để kiểm thử trước khi có tư liệu địa phương.

**Architecture:** Dùng starter Astro tối giản và Content Collections để kiểm tra nội dung lúc build. Các tương tác bài học chạy trong trình duyệt; bản thử nội bộ và nội dung công khai tách riêng.

**Tech Stack:** Astro, TypeScript, CSS, Web APIs.

**Spec:** `docs/superpowers/specs/2026-11-19-hoc-tieng-tay-design.md`

## Global Constraints

- Máy tính và điện thoại ngang nhau; không thiết kế theo một kích thước duy nhất.
- Không cần tài khoản, backend, React hay LMS cho bản đầu.
- Không bịa tiếng Tày, dùng giọng giả hoặc đưa bản thu chưa được phép vào repo.
- Chỉ mở bài thật khi nguồn, người duyệt và quyền sử dụng đã được xác minh.

## Review Focus

- Chưa có bài được duyệt: trang công khai chỉ hiện khung và nguồn.
- URL dưới GitHub Pages project path: điều hướng và tài nguyên không mất tiền tố đường dẫn.
- Trình duyệt từ chối lưu cục bộ: vẫn học được và biết tiến độ không được lưu.
- Audio không tải được hoặc micro bị từ chối: có lối tiếp tục; không ghi nhận đã nghe.
- Bài trả lời sai: vào hàng ôn đúng một lần và còn đó sau khi tải lại.

### Task 1 — Nền web và nguồn

**Files:** `package.json`, `astro.config.mjs`, `src/layouts/SiteLayout.astro`, `src/pages/index.astro`, `src/pages/lo-trinh.astro`, `src/pages/tu-lieu.astro`, `src/content.config.ts`.

**Produces:** Trang chủ, lộ trình, danh mục nguồn và schema kiểm tra trạng thái duyệt, vùng và quyền sử dụng.

- [ ] Khởi tạo Astro tĩnh trong thư mục riêng; không sửa repo gia phả.
- [ ] Dựng UI và trang nội dung; không hiện bộ lọc vùng khi chỉ có một bộ bài.
- [ ] Chạy `npm run build` và kiểm tra trang dưới tiền tố dự kiến của GitHub Pages; không link tới bài chưa duyệt. Kiểm tra thao tác bàn phím ở chiều rộng 375px và 1280px.

### Task 2 — Luồng luyện tập nội bộ

**Files:** `src/components/LessonPractice.astro`, `src/lib/progress.ts`, `tests/progress.test.ts`.

**Produces:** Lưu chỗ dừng, ôn câu khó, phản hồi nghe hiểu và một cách luyện nói không phụ thuộc micro.

- [ ] Thêm test thất bại cho ba hành vi: trả lời sai hai lần chỉ có một mục cần ôn; đọc bản chép không đánh dấu hoàn thành nghe; storage ném lỗi vẫn giữ bài đang làm trong phiên hiện tại.
- [ ] Chạy test để xác nhận thất bại vì chưa có logic tương ứng.
- [ ] Thêm tương tác nghe–hiểu–nói–ôn; dùng dữ liệu kiểm thử nội bộ có nhãn minh họa, không phát hành như bài Tày.
- [ ] Chạy `npm test` và `npm run build`; trong trình duyệt thử câu sai, tải lại, audio lỗi và từ chối micro. Xác nhận không gửi bản ghi lên mạng.

### Task 3 — Mở bộ bài Bình Liêu (chờ tư liệu)

**Files:** `src/content/lessons/`, `src/pages/hoc/[id].astro`.

- [ ] Chỉ thêm nội dung sau khi đã đọc nguồn địa phương, có người nói Bình Liêu duyệt và đã kiểm tra quyền phát.
- [ ] Kiểm tra lộ trình từ mở bài đến ôn; dùng một bản thu khác cùng ý trong bài cuối nếu đã được duyệt.
- [ ] Xin duyệt riêng trước khi tạo repo public hoặc phát hành website.
