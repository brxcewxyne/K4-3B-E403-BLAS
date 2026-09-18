# AI SPEC — [AI20k LAB Workflow Guide Agent] · Nhóm [BLAS] · Zone [2]
Hướng: [ ] A — VLearn  [ ] B — Trợ lý Học viên  [X] C — Làn mở
Loại: [ ] Tối ưu tính năng có sẵn  [X] Tính năng mới

## §1. User & Job
- Job executor + workflow (đính kèm worksheet JTBD / ảnh sơ đồ): Học viên non-tech cần xác định mục tiêu, yêu cầu, trình tự và kết quả cần đạt trước khi thực hiện Lab.
- Core JTBD: Khi thực hiện một bài Lab, học viên non-tech cần hiểu mục tiêu của bài lab, các bước cần làm gì, theo thứ tự nào, kết quả đầu ra là gì và khi nào đủ điều kiện chuyển bước để có thể hoàn thành bài đúng yêu cầu.
- Problem statement:  Học viên non-tech tại khóa AI thực chiến đang gặp khó khăn trong việc đọc hiểu các file markdown hướng dẫn để xác định thứ tự, công việc và tiêu chí hoàn thành của từng bước, dẫn đến mất thời gian, bỏ sót yêu cầu bài hoặc thực hiện sai quy trình.
- Evidence:
**Nguồn:** Khảo sát học viên AI20k lớp 3B ngày 17/09/2026.
  - **Cỡ mẫu:** n = 22 học viên.
  - **Kết quả khảo sát:**
    - 19/22 học viên (**86,4%**) gặp khó khăn trong việc xác định nên bắt đầu từ đâu và thực hiện các bước theo thứ tự nào.
    - 20/22 học viên (**90,9%**) gặp khó khăn trong việc xác định công việc cụ thể cần làm ở từng bước.
    - 18/22 học viên (**81,8%**) không chắc mình đã làm đúng hoặc đủ yêu cầu để chuyển sang bước tiếp theo.
    - 19/22 học viên (**86,4%**) cho rằng việc tổng hợp các file Markdown và sắp xếp lại đúng trình tự sẽ giúp làm Lab dễ dàng hơn.
    - 21/22 học viên (**95,5%**) cho rằng tiêu chí hoàn thành rõ ràng giúp họ dễ tự kiểm tra tiến độ.
    - 20/22 học viên (**90,9%**) cần nhờ đến công cụ hỗ trợ để làm lab hơn bốn lần trong mỗi bài Lab.
   
  - **Ví dụ nguyên văn và nguồn:**
    1. Người trả lời 01: “Có” với cả ba vấn đề: khó xác định điểm bắt đầu, khó xác định công việc từng bước và không chắc đã đủ điều kiện chuyển bước.
    2. Người trả lời 06: “Có” với hai vấn đề về trình tự và công việc từng bước; “Không” với đề xuất tổng hợp Markdown và tiêu chí tự kiểm tra.
    3. Người trả lời 07: “Có” với khó khăn về trình tự và công việc; “Không” với việc đã đủ điều kiện chuyển bước.
    4. Người trả lời 14: “Không” với khó khăn xác định điểm bắt đầu nhưng “Có” với khó khăn xác định công việc và kiểm tra điều kiện chuyển bước.
    5. Người trả lời 15: “Không” với cả ba pain point nhưng “Có” với việc tổng hợp Markdown và cung cấp tiêu chí hoàn thành.
  - **Nguồn của các ví dụ:** https://docs.google.com/spreadsheets/d/1iWq2N038vn_eKN6Qs_xTkApswR4G6C725Nl0ONtUhCU/edit?gid=273414298#gid=273414298

## §2. Impact & quyết định chọn

- Bảng impact ứng viên:

| Ứng viên vấn đề | Số thành viên gặp | Tần suất | Tốn gì môi  lần | Khả năng giải quyết |
|---|---:|---|---|---|
| Thông tin hướng dẫn trực tiếp thời gian đầu  buổi Lab chưa đủ rõ | 4/4 |Thường xuyên-Mỗi khi coach giới thiệu hoặc hướng dẫn Lab | Tốn thời gian để hiểu mục tiêu của bài và chưa biết bắt đầu bài lab từ đâu | Thấp-phụ thuộc cách truyền đạt và thời gian hỗ trợ của lab coach |
| Các lab coach giải đáp thắc mắc còn mơ hồ | 3/4 | Thường xuyên-Mỗi khi thành viên gặp lỗi hoặc cần hỏi thêm | Tối thời gian để làm lab vì vẫn chưa xác định được cách xử lý hoặc bước tiếp theo sau khi nghe lab coach trả lời  | Trung bình-mỗi coach có thể diễn đạt và hướng dẫn khác nhau khi chưa có một nguồn trả lời chuẩn hóa; coach trả lời theo cách coach đang hiểu, trong khi học viên có thể hỏi không rõ ràng. |
| Các file markdown trong repository khó hiểu và phân tán | **4/4: An, Bảo, Long, Sáng** | Thường xuyên-Mỗi khi bắt đầu và thực hiện một bài Lab | Mất thời gian tìm, đọc và đối chiếu file, khó xác định thứ tự lam lab, công việc và tiêu chí hoàn thành | **Cao-dữ liệu có sẵn trong repository, phạm vi rõ và có thể kiểm thử** |

- Ứng viên ĐÃ LOẠI kèm lý do:
  - **Thông tin hướng dẫn trực tiếp trong buổi Lab chưa đủ rõ:** loại vì phụ thuộc nhiều vào cách truyền đạt của từng coach và nằm ngoài phạm vi nhóm có thể chủ động thay đổi.
  - **Các lab coach giải đáp thắc mắc còn mơ hồ:** loại vì cần chuẩn hóa cách coach lab trả lời học viên, học viên cũng có thể học cách đặt câu hỏi rõ ràng hơn, nhóm cũng chưa nghĩ ra nguồn dữ liệu giải đáp đầy đủ để xây dựng và kiểm thử.

- Ứng viên CHỌN và lý do:
  - **Chọn vấn đề các file markdown trong repository khó hiểu và bị phân tán thành nhiều .**
  - **Lý do: 4/4 thành viên trong nhóm(100%) gồm An, Bảo, Long và Sáng, đều xác nhận gặp vấn đề này trong quá trình làm lab.**
  - **Vấn đề xuất hiện trực tiếp trong workflow của cả bốn thành viên, có dữ liệu đầu vào sẵn trong repository và có thể giải quyết trong phạm vi MVP bằng cách tổng hợp, sắp xếp và dẫn nguồn nội dung.**

- **Phương án được chốt:** xây dựng agent tổng hợp các file Markdown, hướng dẫn, yêu cầu bài tập và checkpoint trong chương trình AI20k thành một workflow có cấu trúc, đồng thời cho phép học viên hỏi về yêu cầu và nhận hướng dẫn cho bước tiếp theo dựa trên tài liệu chính thức.
## §3. Giải pháp tương tự đã nghiên cứu
- **ChatGPT Study Mode:**
  - Flow: người học bật chế độ học tập, nêu mục tiêu hoặc câu hỏi, sau đó nhận câu hỏi gợi mở, hướng dẫn từng bước và  tạo bài kiểm tra kiến thưc. - https://openai.com/index/chatgpt-study-mode/
  - Đáng học: chia nội dung phức tạp thành từng phần nhỏ, hướng dẫn theo từng bước và sử dụng câu hỏi kiểm tra để khuyến khích người học chủ động suy nghĩ.
  - Đáng né: không mở rộng thành gia sư kiến thức tổng quát hoặc phụ thuộc vào hội thoại tự do mà không kiểm chứng câu trả lời với tài liệu chính thức.
  - **Điểm khác biệt:** MVP chỉ tập trung vào việc giúp học viên hoàn thành một bài lab cụ thể bằng workflow, checklist và trạng thái từng bước thay vì dạy kiến thức hoặc luyện tập khái niệm.

- **NotebookLM:**
  - Flow: người học tải tài liệu nguồn, chọn nguồn cần sử dụng, đặt câu hỏi và nhận câu trả lời kèm trích dẫn trực tiếp từ tài liệu. - https://notebook.google/?hl=vi
  - Đáng học: Cách giới hạn câu trả lời trong tài liệu được cung cấp, hiển thị trích dẫn ngay trong câu trả lời và cho phép người dùng kiểm tra lại đoạn nguồn.
  - Đáng né: không mở rộng thành công cụ nghiên cứu đa năng hoặc chỉ tóm tắt tài liệu mà không chuyển nội dung thành hành động cụ thể cho người học.
  - **Điểm khác biệt:** MVP chỉ đọc trực tiếp các file markdown trong repository, sắp xếp thành quy trình thực hiện Lab, theo dõi checklist và chỉ rõ bước tiếp theo hoặc tiêu chí chưa đạt.
## §4. Thiết kế
- Lát cắt MỘT CÂU: **Một học viên đang thực hiện Lab cần xác định các bước cụ thể để hoàn thành bài; AI tổng hợp và trả lời dựa trên các file markdown được cung cấp, chỉ đưa ra hướng dẫn khi truy xuất được nguồn tương ứng, và kết quả trả về phải kèm tên file cùng trích đoạn nguồn cụ thể.**
- Non-goals (≥3 thứ KHÔNG build):
	- tự chạy code;
	- sửa repository;
	- tự thêm requirement không tồn tại trong tài liệu;
- Mức prototype nhắm tới: [ ] Sketch [ ] Mock [x] Working — phần nào mock, phần nào thật: không có mock
- Automation: [ ] augment [x] conditional [ ] automate 
lý do theo cost-of-error: 
	-Agent được tự động đọc, phân loại, loại bỏ nội dung trùng lặp, sắp xếp workflow, tạo checklist và trả lời khi tìm thấy nguồn rõ ràng trong tài liệu.
	-Agent chỉ tự đánh dấu bước hoàn thành khi output của học viên đáp ứng đầy đủ các tiêu chí đã trích xuất.
  	-Khi thiếu nguồn, input mơ hồ, bằng chứng chưa đủ hoặc tài liệu không thống nhất, agent không được tự quyết mà phải yêu cầu người dùng bổ sung hoặc hiển thị trạng thái chưa đủ thông tin.
 	-Cost-of-error ở mức trung bình: quyết định sai không gây thiệt hại nghiêm trọng nhưng có thể khiến học viên làm sai quy trình, bỏ sót yêu cầu hoặc mất điểm.
- §4b. Nguyên tắc đã áp dụng (≥4 — HAX/PAIR, xem guide):
| Nguyên tắc | Áp cụ thể vào đâu trong prototype |
|---|---|
| **G1 · Làm rõ hệ thống làm được gì** | Màn hình đầu nêu rõ hệ thống nhận GitHub public hoặc file ZIP, tổng hợp các file markdown thành hướng dẫn lab và hỗ trợ trả lời các câu hỏi như “Tôi cần bắt đầu từ đâu?” hoặc “Sau bước này làm gì?”. |
| **G2 · Làm rõ nó làm tốt đến đâu** | UI thông báo hệ thống chỉ trả lời dựa trên tài liệu của bài lab; mỗi câu trả lời phải có tên file và đoạn nguồn, còn nội dung không tìm thấy sẽ được báo là “Chưa đủ thông tin”. |
| **G3 · Đưa dịch vụ đúng thời điểm** | Hướng dẫn bước tiếp theo chỉ xuất hiện sau khi người dùng mở guide hoặc khi checklist cho thấy bước hiện tại chưa hoàn thành, tránh đưa gợi ý khi người dùng chưa bắt đầu lab. |
| **G4 · Hiện thông tin đúng ngữ cảnh** | Khi người dùng đang ở một bước cụ thể, phần hỏi đáp ưu tiên sử dụng nội dung, checklist và nguồn liên quan đến chính bước đó.|
| **G7 · Gọi dễ dàng** | Người dùng có thể mở phần hỏi đáp ngay từ màn hình guide hoặc checklist để hỏi về yêu cầu, lệnh cần chạy, tiêu chí còn thiếu hoặc bước tiếp theo. |
| **G8 · Gạt bỏ dễ dàng** | Người dùng có thể bỏ qua gợi ý của hệ thống và tiếp tục xem guide hoặc thực hiện bài Lab mà không bị buộc phải xác nhận hay làm theo câu trả lời. |
| **G9 · Sửa dễ dàng** | Người dùng có thể sửa câu hỏi, bổ sung log/output hoặc tải lại link/file khi thông tin ban đầu chưa đủ mà không phải bắt đầu lại toàn bộ quy trình. |
| **G10 · Thu hẹp phạm vi khi nghi ngờ** | Khi thiếu nguồn, câu hỏi mơ hồ, chưa xác định được step hoặc nội dung nằm ngoài phạm vi tài liệu, hệ thống phải hỏi lại, nêu giới hạn hoặc từ chối thay vì tự suy đoán. |
| **G11 · Giải thích vì sao** | Mỗi hướng dẫn và quyết định cập nhật checklist phải hiển thị tiêu chí đã đối chiếu, tên file và đoạn trích làm căn cứ để người dùng kiểm tra lại. |
| **G12 · Nhớ tương tác gần** | Hệ thống giữ step hiện tại, các tiêu chí đã đạt, tiêu chí còn thiếu và lịch sử hỏi đáp gần nhất để hiểu những câu như “Còn thiếu gì?” hoặc “Sau bước này làm gì?”. |
| **G16 · Nói rõ hậu quả hành động của người dùng** | Khi người dùng bổ sung log/output, UI cho biết dữ liệu đó sẽ được dùng để kiểm tra checklist; nếu đủ tiêu chí hệ thống tự đánh dấu `Completed`, nếu chưa đủ thì giữ `Incomplete` và chỉ rõ phần còn thiếu. |
| **G17 · Kiểm soát toàn cục** | Người dùng chủ động chọn repository/file đầu vào, quyết định có sử dụng phần hỏi đáp hay không và có thể quay lại xem tài liệu gốc thay vì bị buộc làm theo hướng dẫn được tạo. |

## §5. Kiểu lỗi — 4 lớp chỗ khó + kịch bản

| Nhóm kiểm thử              | Test case thường   | Test case bất thường | Test case hiếm |
| -------------------------- | ------------------ | -------------------- | -------------- |
| `class1_source_of_truth`   | không có           | T21, T24             | T20            |
| `class2_ambiguous_missing` | T13, T14, T15      | T23                  | T17            |
| `class3_out_of_scope`      | không có           | không có             | T18, T19       |
| `class4_domain_specific`   | T09, T10, T11, T12 | T16                  | không có       |


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

- **Đinh Tuấn Long — AI Engineer**
  - Phụ trách prototype/vibe coding.
  - Tích hợp OpenCode Go vào hệ thống.
  - Xây dựng workflow generation, prompt và AI interaction.
  - Hỗ trợ retrieval và grounded response theo source.

- **Trần Quốc Sáng — Backend / Data**
  - Phụ trách backend và data pipeline.
  - Xử lý ingest repository / file `.md/.mdx`.
  - Chuẩn hoá, lưu và tổ chức source/chunk phục vụ workflow và chat.
  - Hỗ trợ API, logging và dữ liệu cho evaluation.

- **Lê Duy Bảo — Business Analyst**
  - Phụ trách khảo sát người dùng, problem/evidence.
  - Tổng hợp pain point, validation và feedback.
  - Hỗ trợ xây dựng test scenario và đánh giá output.

- **Phùng Thành An — BA / Requirement Translation**
  - Chuyển user needs thành requirement.
  - Thiết kế workflow, functional requirements và scope.
  - Hỗ trợ spec, automation boundary và failure cases.

- **Phân công theo hạng mục**
  - Spec: Lê Duy Bảo + Phùng Thành An
  - Evidence/User research: Lê Duy Bảo
  - Prompt/AI behavior/OpenCode: Đinh Tuấn Long
  - Backend/Data/Ingestion: Trần Quốc Sáng
  - Prototype integration: Đinh Tuấn Long + Trần Quốc Sáng
  - Demo: cả nhóm

- **Willing users**
  - Nguyễn Ngọc Linh — 02469
  - Nguyễn Khánh Linh — 02409
  - Đặng Văn Thái Anh — 02407

- **Kế hoạch validation**
  - Cho willing users thử flow:
    `Import repo/Markdown → Generate workflow → Follow current step → Ask AI → Check citation`.
  - Ghi nhận:
    - user có hiểu bước tiếp theo không;
    - workflow có bỏ sót requirement không;
    - AI có bám đúng current step không;
    - citation có đúng và dễ kiểm tra không;
    - workflow có thông tin lặp hoặc khó hiểu không.
  - Sửa các lỗi critical trước demo cuối.

- **Multi-prototype**
  - Nhóm tập trung vào một working prototype chính.
  - Các iteration chủ yếu nằm ở workflow generation, cách hiển thị step, ingestion data và contextual chat.



## §9. Changelog

| Thời điểm | Đổi gì | Vì sao (trỏ về feedback/case nào) |
|---|---|---|
| 18/09/2026 15:41:00| Chốt golden set CP3 gồm 24 case trong `eval/golden_set.json` | Đủ ≥20 case theo guide §2.6; phủ normal/abnormal/rare và 4 lớp chỗ khó |
| 18/09/2026 15:44:00 | Hoàn thành lượt đo `run-001`: 20/24 case pass = 83.3% | Kết quả đã nộp tại CP3; lỗi ghi nhận gồm hallucination và không tìm thấy repository/file nguồn; chi tiết lưu ở `eval/results_run001.json` |
| 18/09/2026 sau run-001 | Bổ sung yêu cầu verify citation: sourceId phải tồn tại trong danh sách file ingest | T21: agent bịa/cite `README.md` ở root repo dù file không tồn tại |
| 18/09/2026 sau run-001 | Bổ sung fallback khi câu hỏi không có trong tài liệu: nói không đủ thông tin, không dùng model knowledge để đoán | T22: agent bịa lệnh deploy; T23: agent bịa version Python |
| 18/09/2026 sau run-001 | Đề xuất cải thiện kiểm tra section/excerpt: section phải match heading thật, excerpt phải có trong source content | T24: agent cite sai section và paraphrase excerpt |
| Trước CP6 nếu làm validation | Ghi ít nhất 1 thay đổi từ user thật hoặc lý do giữ nguyên | Theo yêu cầu bonus validation §8/R6 |
