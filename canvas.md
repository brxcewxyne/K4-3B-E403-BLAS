# CP1 — Problem Discovery & Slice

## 1. Track + đề

**Track E — Open Lane**

**Đề:** AI20k LAB Workflow Guide Agent

Agent tổng hợp các file Markdown, guide, yêu cầu bài tập và checkpoint trong chương trình AI20k thành một workflow có cấu trúc, đồng thời cho phép học viên hỏi về yêu cầu và nhận hướng dẫn cho bước tiếp theo dựa trên tài liệu chính thức.

---

## 2. Job Executor

Học viên bắt đầu thực hiện một bài lab trong khóa học AI Thực Chiến.

Trong repository của bài lab có nhiều file `README.md` và Markdown nằm ở các thư mục khác nhau. Học viên cần đọc và đối chiếu các tài liệu để xác định:

- mục tiêu của bài lab;
- yêu cầu chuẩn bị;
- trình tự thực hiện;
- kết quả cần đạt;
- điều kiện để chuyển sang bước tiếp theo.

---

## 3. Pain

Nội dung hướng dẫn của bài lab bị phân tán giữa nhiều file Markdown; một số phần trùng lặp, chưa được sắp xếp theo đúng trình tự hoặc có thông tin chưa thống nhất.

Học viên phải mở từng file để kiểm tra, khó xác định:

- đâu là yêu cầu bắt buộc;
- đâu là phần gợi ý;
- bước nào cần thực hiện trước;
- khi nào đã làm đủ để chuyển sang bước tiếp theo.

Việc này gây mất thời gian, dễ bỏ sót yêu cầu hoặc thực hiện sai flow ban đầu của bài lab.

Khi có thắc mắc, học viên cũng khó xác định câu trả lời nằm trong file nào và câu trả lời đó có đúng với tài liệu gốc hay không.

---

## 4. Evidence ban đầu

Khảo sát **7 học viên** trong chương trình AI20k:

| # | Nội dung cần xác nhận | Có | Không | Tỷ lệ Có | Ý nghĩa |
|---|---|---:|---:|---:|---|
| 1 | Khó xác định bắt đầu từ đâu và trình tự làm Lab | 7 | 0 | 100% | Pain point rất rõ |
| 2 | Khó xác định công việc cần làm ở từng bước | 7 | 0 | 100% | Pain point rất rõ |
| 3 | Không chắc đã làm đúng/đủ để sang bước tiếp theo | 6 | 1 | 85.7% | Pain point phổ biến |
| 4 | Tổng hợp Markdown + đưa ra trình tự sẽ giúp Lab dễ hơn | 5 | 2 | 71.4% | Có tín hiệu tích cực cho solution |
| 5 | Tiêu chí hoàn thành rõ ràng giúp tự kiểm tra tiến độ | 6 | 1 | 85.7% | Feature có giá trị khá rõ |
| 6 | Cần hỗ trợ từ AI >4 lần mỗi Lab | 7 | 0 | 100% | Có nhu cầu hỗ trợ cao trong quá trình làm Lab |
| 7 | Sẵn sàng dùng thử MVP | 5 | 2 | 71.4% | Có initial adoption signal |

### Evidence chính

- **7/7 học viên (100%)** gặp khó khăn trong việc xác định bắt đầu từ đâu và trình tự thực hiện Lab.
- **7/7 học viên (100%)** gặp khó khăn trong việc xác định công việc cần làm ở từng bước.
- **6/7 học viên (85.7%)** không chắc mình đã hoàn thành đúng/đủ để chuyển sang bước tiếp theo.
- **5/7 học viên (71.4%)** sẵn sàng dùng thử MVP.

---

## 5. Lát cắt

**Một học viên đang thực hiện Lab cần xác định các bước cụ thể để hoàn thành bài; AI tổng hợp và trả lời dựa trên các file Markdown được cung cấp, chỉ đưa ra hướng dẫn khi truy xuất được nguồn tương ứng, và kết quả trả về phải kèm tên file cùng trích đoạn nguồn cụ thể.**

---

## 6. Automation + Willing Users

### AI tự làm đến đâu

AI được phép:

- nhận GitHub repository public hoặc file ZIP của bài Lab;
- tìm và đọc các file `.md`, `.mdx`;
- phân loại nội dung thành:
  - mục tiêu;
  - yêu cầu chuẩn bị;
  - các bước thực hiện;
  - kết quả cần đạt;
  - gợi ý;
  - lỗi thường gặp;
- loại bỏ nội dung trùng lặp;
- sắp xếp lại nội dung theo workflow;
- sinh một file `LAB_GUIDE.md` duy nhất;
- ghi rõ nguồn của từng nội dung;
- sử dụng tài liệu đã tổng hợp để trả lời câu hỏi tự nhiên của học viên.

Ví dụ:

- “Tôi cần bắt đầu từ đâu?”
- “Sau bước này làm gì?”
- “Lệnh chạy project là gì?”
- “Tôi cần hoàn thành gì trước checkpoint tiếp theo?”

### AI không được phép

AI **không**:

- tự chạy code;
- sửa repository;
- tự thêm requirement không tồn tại trong tài liệu;
- tự chọn một đáp án khi các tài liệu đang mâu thuẫn;
- suy đoán khi không có căn cứ.

Nếu không tìm thấy thông tin trong tài liệu của bài Lab, AI phải thông báo **chưa đủ thông tin** thay vì tự tạo câu trả lời.

### Lý do

Mục tiêu của sản phẩm là giúp học viên **hiểu đúng tài liệu và thực hiện đúng flow**, không thay học viên làm bài hoặc tạo thêm nội dung ngoài yêu cầu ban đầu.

Do sai requirement có thể khiến học viên làm sai hoặc bỏ sót bài, agent chỉ được tự động hóa việc **tổng hợp, sắp xếp và truy xuất thông tin có căn cứ**.

### Willing Users


- **Nguyễn Ngọc Linh** — 02469
- **Nguyễn Khánh Linh** — 02409
- **Đặng Văn Thái Anh** — 02407

Ba học viên trên đã đồng ý tham gia dùng thử MVP và cung cấp feedback cho quá trình validation.
---

## 7. Phân công

| Thành viên | Vai trò | Công việc |
|---|---|---|
| **Đinh Tuấn Long** | AI Engineer | Vibe code prototype, xây agent workflow, xử lý retrieval và interaction |
| **Trần Quốc Sáng** | AI Engineer | Vibe code prototype, tích hợp LLM, parsing Markdown và Q&A |
| **Lê Duy Bảo** | Business Analyst | Khảo sát học viên, xác định pain point, thu thập evidence và validation |
| **Phùng Thành An** | BA / Requirement Translation | Chuyển problem và kết quả khảo sát thành requirement, workflow và yêu cầu chức năng cho team AI |