## §6. Bốn đường đi của trải nghiệm

- **Happy path**
  - User nhập repo hoặc upload `.md/.mdx`.
  - Hệ thống đọc source, tổng hợp thành workflow theo thứ tự.
  - Mỗi step có Goal, Requirements, What to do, How to do it, Done when và Sources.
  - AI trả lời theo `currentStepId` và dẫn citation liên quan.

- **Low-confidence**
  - Khi tài liệu chưa đủ rõ về thứ tự, requirement hoặc cách làm, AI không khẳng định chắc chắn.
  - Hệ thống nêu phần chưa chắc và dẫn các source liên quan để user kiểm tra.

- **Failure / không có căn cứ**
  - Nếu source không có đủ thông tin, AI không tự bịa command, requirement hoặc success criteria.
  - Hệ thống báo rõ là chưa đủ căn cứ.
  - Nếu workflow generation lỗi, Sources và Chat vẫn phải dùng được.

- **Correction**
  - User có thể đổi step đang làm bằng `Set as current`.
  - `currentStepId` là tiến độ thật, `selectedStepId` chỉ là step đang xem.
  - AI sử dụng current step mới trong các câu hỏi tiếp theo.

- **Ngoài phạm vi**
  - AI không tự chạy code, sửa repo, thêm requirement hoặc quyết định thay user khi source không đủ rõ.
  - Chỉ hỗ trợ trong phạm vi tài liệu đã ingest.

- **Case đặc thù domain**
  - Nếu nhiều Markdown mâu thuẫn nhau, hệ thống hiển thị conflict và dẫn cả hai source.
  - Không tự chọn một nguồn là đúng nếu không có căn cứ.


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

- Kết quả các lượt chạy:

| Lượt chạy | Thời điểm | Bộ case | Pass | Fail | % qua bộ | So với quality bar | Ghi chú |
|---|---:|---:|---:|---:|---:|---|---|
| run-001 (CP3) | 18/09/2026, trước 15:45 | 24 | 20 | 4 | 83.3% | Chưa đạt đầy đủ | Đạt ngưỡng % tổng thể; lỗi chính gồm hallucination và không tìm thấy repository/file nguồn |

- Phân tích lỗi chính của lượt chạy CP3 từ `eval/results_run001.json`:
  - **Nhóm lỗi ghi nhận**: hallucination; không tìm thấy repository hoặc file nguồn cần thiết để kiểm chứng câu trả lời.
  - **T21**: agent cite `README.md` ở root repo dù file này không tồn tại.
  - **T22**: agent bịa lệnh deploy dù tài liệu Lab không có thông tin deploy.
  - **T23**: agent bịa version Python cụ thể dù tài liệu chỉ ghi "cài Python".
  - **T24**: agent cite sai section/excerpt, section thực tế trong tài liệu có tên khác.

## §8. Phân công & kế hoạch



## §9. Changelog

| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|---|---|---|
| 18/09/2026 15:41:00| Chốt golden set CP3 gồm 24 case trong `eval/golden_set.json` | Đủ ≥20 case theo guide §2.6; phủ normal/abnormal/rare và 4 lớp chỗ khó |
| 18/09/2026 15:48:32| Hoàn thành lượt đo `run-001`: 20/24 case pass = 83.3% | Kết quả đã nộp tại CP3; lỗi ghi nhận gồm hallucination và không tìm thấy repository/file nguồn; chi tiết lưu ở `eval/results_run001.json` |
| 18/09/2026 sau run-001 | Bổ sung yêu cầu verify citation: sourceId phải tồn tại trong danh sách file ingest | T21: agent bịa/cite `README.md` ở root repo dù file không tồn tại |
| 18/09/2026 sau run-001 | Bổ sung fallback khi câu hỏi không có trong tài liệu: nói không đủ thông tin, không dùng model knowledge để đoán | T22: agent bịa lệnh deploy; T23: agent bịa version Python |
| 18/09/2026 sau run-001 | Đề xuất cải thiện kiểm tra section/excerpt: section phải match heading thật, excerpt phải có trong source content | T24: agent cite sai section và paraphrase excerpt |
| Trước CP6 nếu làm validation | Ghi ít nhất 1 thay đổi từ user thật hoặc lý do giữ nguyên | Theo yêu cầu bonus validation §8/R6 |
