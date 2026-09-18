## §7. Kiểm thử

- Chiều chất lượng + định nghĩa kiểm chứng được:
  - **Độ đầy đủ khi tổng hợp tài liệu**: workflow phải lấy đủ mục tiêu, prerequisites, bước thực hiện, expected output và success criteria từ các file Markdown đã cung cấp. Kiểm bằng `extraction_completeness`, `answer_completeness`; đạt khi mỗi chỉ số ≥90%.
  - **Đúng thứ tự và đúng trạng thái học viên**: các milestone phải được sắp xếp đúng quan hệ trước-sau; khi học viên báo tiến độ, agent chỉ chuyển bước nếu đủ evidence theo success criteria. Kiểm bằng `step_order_accuracy`, `step_status_accuracy`, `false_completion_rate`; đạt khi order/status ≥90% và `false_completion_rate = 0%`.
  - **Có căn cứ, không bịa nguồn**: mọi câu trả lời/hướng dẫn phải bám vào tài liệu đã ingest; citation phải trỏ đúng file/section/excerpt thật; nếu thiếu thông tin thì nói không đủ thông tin thay vì suy đoán. Kiểm bằng `grounded_conclusion_rate`, `citation_accuracy`, `hallucination_rate`, `fabricated_source_rate`; đạt khi grounded/citation ≥95% và hallucination/fabricated source = 0%.

- Golden set:
  - File: `eval/golden_set.json`
  - Tổng số case: **24 case**
  - Cơ cấu:
    - 9 case thường (`normal`)
    - 11 case bất thường/khó (`abnormal`)
    - 4 case hiếm/rủi ro (`rare`)
  - 4 lớp chỗ khó được phủ:
    - `class1_source_of_truth`: thông tin có trong tài liệu vs agent tự tạo
    - `class2_ambiguous_missing`: input mơ hồ hoặc thiếu thông tin
    - `class3_out_of_scope`: yêu cầu ngoài phạm vi/thẩm quyền
    - `class4_domain_specific`: đặc thù cấu trúc Lab, Markdown, workflow AI20k
  - Có các case từ chatlog/nhu cầu thật của học viên như: "Tôi cần bắt đầu từ đâu?", "Sau bước 2 tôi cần làm gì?", "Tôi làm xong chưa?", "Tôi đã làm xong bước 2 rồi."

- Quality bar chốt từ hạn chốt spec của khoá, giữ nguyên sau đó:
  - **Đạt khi ≥83% qua bộ golden set, và không có lỗi nghiêm trọng về bịa nguồn/bịa thông tin ở các case yêu cầu căn cứ.**
  - Điều kiện cứng:
    - `grounded_conclusion_rate ≥95%`
    - `citation_accuracy ≥95%`
    - `hallucination_rate = 0%`
    - `fabricated_source_rate = 0%`
    - `false_completion_rate = 0%`

- Kết quả các lượt chạy (cập nhật đến CP3):

### 7.1. Tổng quan lượt chạy

| Lượt chạy | Thời điểm hoàn thành | Model | Phiên bản golden set | Tổng case | Pass | Fail | Tỷ lệ pass |
|---|---|---|---|---:|---:|---:|---:|
| `run-001` (CP3) | 18/09/2026, trước 15:45 | `opencode-go` | `1.0` | 24 | 20 | 4 | **83.3%** |

- **Kết luận theo tỷ lệ tổng:** PASS, vì 20/24 case = 83.3%, đạt ngưỡng `≥83%`.
- **Kết luận theo toàn bộ quality bar:** CHƯA ĐẠT ĐẦY ĐỦ, vì các điều kiện cứng về grounding, citation và hallucination chưa đạt.
- File kết quả chi tiết: `eval/results_run001.json`.

### 7.2. Kết quả theo nhóm testcase

| Nhóm case | Tổng | Pass | Fail | Tỷ lệ pass | Nhận xét |
|---|---:|---:|---:|---:|---|
| Normal | 9 | 8 | 1 | 88.9% | Luồng chính hoạt động tốt; còn lỗi khi agent giả định nguồn thường có trong repository |
| Abnormal | 11 | 9 | 2 | 81.8% | Xử lý phần lớn input thiếu/mơ hồ; vẫn có trường hợp agent tự điền thông tin không có trong tài liệu |
| Rare | 4 | 3 | 1 | 75.0% | Xử lý được prompt injection và mâu thuẫn nguồn; citation ở một case chưa chính xác |
| **Tổng** | **24** | **20** | **4** | **83.3%** | Đạt ngưỡng số case pass của CP3 |

### 7.3. Kết quả theo chỉ số chất lượng

| Chiều chất lượng | Chỉ số | Kết quả | Ngưỡng | Trạng thái |
|---|---|---:|---:|---|
| Đầy đủ | `extraction_completeness` | 92% | ≥90% | PASS |
| Đầy đủ | `step_order_accuracy` | 95% | ≥90% | PASS |
| Đầy đủ | `answer_completeness` | 91% | ≥90% | PASS |
| Đúng và có căn cứ | `grounded_conclusion_rate` | 87.5% | ≥95% | **FAIL** |
| Đúng và có căn cứ | `citation_accuracy` | 87.5% | ≥95% | **FAIL** |
| Đúng và có căn cứ | `answer_accuracy` | 91.7% | ≥90% | PASS |
| Đúng và có căn cứ | `hallucination_rate` | 12.5% | 0% | **FAIL** |
| Đúng và có căn cứ | `fabricated_source_rate` | 8.3% | 0% | **FAIL** |
| Đúng theo ngữ cảnh | `step_status_accuracy` | 100% | ≥90% | PASS |
| Đúng theo ngữ cảnh | `false_completion_rate` | 0% | 0% | PASS |

Các chỉ số về độ đầy đủ, thứ tự bước, độ chính xác câu trả lời và trạng thái hoàn thành đều đạt. Phần chưa đạt tập trung vào khả năng bám nguồn: agent đôi lúc suy đoán khi repository hoặc tài liệu không cung cấp đủ thông tin, dẫn đến hallucination hoặc citation không tồn tại/không chính xác.

### 7.4. Phân tích các case fail

| Case | Nhóm lỗi | Biểu hiện | Nguyên nhân | Hướng xử lý |
|---|---|---|---|---|
| T21 | Không tìm thấy file nguồn / fabricated source | Agent cite `README.md` ở root nhưng file không tồn tại trong repository | Agent giả định repository luôn có `README.md` ở root | Kiểm tra `sourceId` tồn tại trong danh sách file đã ingest trước khi trả citation |
| T22 | Hallucination thông tin | Agent đưa ra lệnh deploy dù tài liệu không có nội dung deploy | Agent dùng kiến thức nền thay cho nội dung được truy xuất | Trả fallback "không tìm thấy đủ thông tin trong tài liệu" khi không có evidence |
| T23 | Hallucination do thiếu dữ liệu | Agent tự ghi `Python 3.10+` dù tài liệu chỉ yêu cầu cài Python | Agent tự điền chi tiết còn thiếu | Cấm suy đoán version/port/command; nêu rõ tài liệu không chỉ định |
| T24 | Citation sai | Agent ghi sai tên section và paraphrase excerpt | Citation chưa được kiểm tra lại với heading và nội dung gốc | Đối chiếu section/excerpt với source content trước khi trả lời |

### 7.5. Kết luận lượt chạy CP3

Lượt `run-001` chứng minh prototype xử lý đúng phần lớn workflow chính với **20/24 case pass (83.3%)**. Kết quả này đạt ngưỡng pass tổng của CP3, nhưng chưa đạt quality bar đầy đủ vì `hallucination_rate` và `fabricated_source_rate` chưa bằng 0%, đồng thời `grounded_conclusion_rate` và `citation_accuracy` còn dưới 95%. Ưu tiên của lượt cải tiến tiếp theo là xác minh repository/file nguồn trước khi cite và buộc agent dùng fallback khi tài liệu không chứa câu trả lời.

## §8. Phân công & kế hoạch



## §9. Changelog

| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|---|---|---|
| 18/09/2026 15:41:00| Chốt golden set CP3 gồm 24 case trong `eval/golden_set.json` | Đủ ≥20 case theo guide §2.6; phủ normal/abnormal/rare và 4 lớp chỗ khó |
| 18/09/2026 15:44:00 | Hoàn thành lượt đo `run-001`: 20/24 case pass = 83.3% | Kết quả đã nộp tại CP3; lỗi ghi nhận gồm hallucination và không tìm thấy repository/file nguồn; chi tiết lưu ở `eval/results_run001.json` |
| 18/09/2026 sau run-001 | Bổ sung yêu cầu verify citation: sourceId phải tồn tại trong danh sách file ingest | T21: agent bịa/cite `README.md` ở root repo dù file không tồn tại |
| 18/09/2026 sau run-001 | Bổ sung fallback khi câu hỏi không có trong tài liệu: nói không đủ thông tin, không dùng model knowledge để đoán | T22: agent bịa lệnh deploy; T23: agent bịa version Python |
| 18/09/2026 sau run-001 | Đề xuất cải thiện kiểm tra section/excerpt: section phải match heading thật, excerpt phải có trong source content | T24: agent cite sai section và paraphrase excerpt |
| Trước CP6 nếu làm validation | Ghi ít nhất 1 thay đổi từ user thật hoặc lý do giữ nguyên | Theo yêu cầu bonus validation §8/R6 |
