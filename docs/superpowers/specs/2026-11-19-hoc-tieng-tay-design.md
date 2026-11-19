# Học tiếng Tày — Thiết kế

Website tự học dành cho người lớn chưa nghe hiểu hoặc đã nghe quen nhưng ít nói. Trang chính là **Học tiếng Tày**, dùng tốt trên cả máy tính và điện thoại; không ưu tiên một loại màn hình. Bình Liêu là bộ bài đầu tiên khi đủ tư liệu, không phải tên hoặc phạm vi của toàn website. Chỉ hiện lựa chọn vùng khi có nhiều bộ bài đã duyệt.

## Trải nghiệm

- **Học:** đi theo lộ trình hoặc bỏ qua phần đã biết; nghe, hiểu, thử đáp, rồi nghe một giọng khác khi có bản thu phù hợp.
- **Ôn:** nghe lại câu trả lời sai hoặc câu được đánh dấu khó; phân biệt kết quả nghe hiểu và việc đã thử nói.
- **Tra cứu:** tìm mục từ đã duyệt, mở lại câu trong ngữ cảnh bài học.
- **Tiến độ:** lưu trên trình duyệt, có thể xóa. Không cần tài khoản; không tải giọng người học lên máy chủ. Micro không bắt buộc.

## Phương án

Chọn **Astro tĩnh**: lấy cấu trúc từ starter chính thức và dùng Content Collections để kiểm tra dữ liệu bài trước khi build. Một LMS có thể tiết kiệm công nếu cần tài khoản, lớp học và quản lý học viên, nhưng những tính năng đó chưa cần. Vite React phù hợp với app chạy chủ yếu phía trình duyệt, nhưng phải bổ sung cấu trúc nội dung và route. Không cần React khi các tương tác ban đầu làm được bằng nền tảng web.

## Tư liệu và phát hành

*Học tiếng Tày Bình Liêu* là nguồn chính dự kiến, chưa có bản đọc hoặc audio xác minh. Tài liệu Tày vùng khác chỉ dùng đối chiếu. Nội dung học phải có nguồn, vùng, ngữ cảnh, người duyệt và quyền sử dụng. Khi chưa đủ tư liệu, chỉ hiện khung chương trình và danh mục nguồn; không giả câu hay audio, không gọi đó là khóa luyện nghe–nói. Repo mã nguồn tách khỏi repo gia phả; không đưa bản thu chưa được phép vào repo.
