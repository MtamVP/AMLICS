# BÁO CÁO TỔNG KẾT & TÀI LIỆU NGHIỆM THU HỆ THỐNG AMLICS
**Tên dự án:** **AMLICS** (*AutoML & Interactive Code Studio*)  
**Địa chỉ triển khai (Production URL):** `https://amlics.pages.dev`  
**Mã nguồn (GitHub Repository):** `https://github.com/MtamVP/AMLICS`  
**Định hướng:** Nền tảng Hybrid Low-code/No-code AutoML kết hợp Interactive Python Notebook Studio với kiến trúc Dual-Runtime 0đ Server (dự thi phát triển phần mềm SEAPP).

---

## 1. TỔNG QUAN BÀI TOÁN & GIÁ TRỊ ĐỘC BẢN CỦA AMLICS

Trong thực tế làm Khoa học Dữ liệu (Data Science / Machine Learning), người dùng luôn gặp sự đánh đổi giữa hai thái cực:
1. **Công cụ kéo-thả No-code (KNIME, Orange, RapidMiner):** Dễ cấu hình nhưng đóng kín (Black-box), khó tùy biến bằng code Python và không xuất ra được Notebook chuẩn công nghiệp.
2. **Jupyter Notebook thuần túy (Google Colab, Kaggle):** Tự do viết code nhưng tốn thời gian viết lại code lặp (Boilerplate), **rất dễ mắc lỗi rò rỉ dữ liệu (Data Leakage)** khi tiền xử lý trước khi chia tập Train/Validation, và thiếu công cụ lưu vết/so sánh trực quan các lần chạy thử nghiệm (Experiment Tracking).

**AMLICS giải quyết triệt để vấn đề trên bằng 3 trụ cột kỹ thuật:**
- **Zero-Boilerplate & Anti-Leakage Pipeline Generation:** Tự động chuyển đổi cấu hình trên giao diện thành mã nguồn Python chuẩn công nghiệp sử dụng `sklearn.compose.ColumnTransformer` và `sklearn.pipeline.Pipeline` theo cấu trúc 5 Cell rõ ràng, đảm bảo mọi phép tính thống kê (`SimpleImputer`, `RobustScaler`, `OneHotEncoder`) chỉ được `fit()` bên trong tập Train của từng Fold Cross-Validation.
- **Hybrid UI-to-Code với Cơ chế Lockable Cells:** Cho phép đồng bộ hai chiều thông minh giữa bảng cấu hình UI và trình soạn thảo **Monaco Editor**. Khi người dùng tự gõ chỉnh sửa code trong bất kỳ Cell nào, Cell đó lập tức chuyển sang trạng thái **`Locked`** (khóa bảo vệ để các thao tác chỉnh UI sau đó không ghi đè mất code sửa tay), đồng thời hỗ trợ nút **`Reset`** để quay về mẫu tự động bất cứ lúc nào.
- **Visual Experiment Leaderboard & Dual-Runtime (0đ Server):** Kết hợp chạy tức thì trên trình duyệt (**Tier 1: Pyodide WebAssembly**) và chạy dữ liệu lớn/GPU từ xa (**Tier 2: Google Colab / Kaggle** đồng bộ qua **Supabase Realtime Broadcast**). Mọi lần chạy đều tự động trích xuất chỉ số đánh giá, biểu đồ chẩn đoán và lưu vào bảng xếp hạng Leaderboard.

---

## 2. KIẾN TRÚC KỸ THUẬT & CÁC HẠNG MỤC ĐÃ HOÀN THÀNH

### 2.1. Kiến trúc Giao diện Tối giản trên 1 Màn hình Duy nhất (Single-Screen Minimalist IDE)
Thiết kế theo phong cách tối giản của **Google Colab / Kaggle Dark Mode** (`#18191a` / `#202124`), bố cục chia làm 3 phân vùng trực quan:
- **Thanh công cụ trên cùng (`TopNavbar`):**
  - Đổi tên dự án (`.ipynb`), nút **`Run all`** (chạy tuần tự toàn bộ Pipeline), **`Interrupt execution`** (dừng khẩn cấp Cell đang chạy), **`Upload CSV`** và **`Download .ipynb`**.
  - Bộ chuyển đổi Runtime tức thì: **`Browser (Pyodide)`** ↔ **`Colab / Kaggle`** kèm nút **`Connect Cloud`** hiển thị thông số phần cứng thực tế (GPU, dung lượng RAM).
- **Phân vùng Trái – Cấu hình Pipeline 4 Bước (`LeftPipelineSidebar`):**
  - **Bước 1 (Dataset & Feature Roles):** Chuyển đổi giữa 3 bộ dữ liệu chuẩn có sẵn (*Telco Customer Churn*, *Credit Loan Default Risk*, *Smart Housing Valuation*), tải file `.CSV` từ máy hoặc nhập đường dẫn URL/Kaggle. Tự động nhận diện biến mục tiêu (`Target y`), bài toán (`Classification` / `Regression`) và phân vai từng cột (`num`, `cat`, `drop`).
  - **Bước 2 (Preprocessing - ColumnTransformer):** Cấu hình xử lý khuyết (`median`, `mean`, `most_frequent`, `constant`) kèm cờ đánh dấu vị trí khuyết (`add_indicator=True`), chuẩn hóa biến số (`RobustScaler`, `StandardScaler`, `MinMaxScaler`, `passthrough`) và mã hóa biến phân loại (`OneHotEncoder` tự bỏ qua nhãn lạ `handle_unknown='ignore'`, `OrdinalEncoder`).
  - **Bước 3 (Validation & Class Balance):** Tuỳ chỉnh số lượng Fold (`3-Fold`, `5-Fold`, `10-Fold CV`), tỷ lệ tập kiểm thử độc lập (`Holdout test_size`), bảo toàn tỷ lệ nhãn (`Stratified K-Fold`) và xử lý dữ liệu mất cân bằng (`class_weight='balanced'` hoặc `Random Oversampling` chỉ áp dụng trên tập Train).
  - **Bước 4 (Estimator & Hyperparameters):** Hỗ trợ 8 họ thuật toán (`HistGradientBoosting`, `LightGBM`, `XGBoost`, `CatBoost`, `RandomForest`, `ExtraTrees`, `Logistic/Ridge Regression`, `MLP Neural Network`) cùng các thanh trượt tinh chỉnh siêu tham số (`n_estimators`, `learning_rate`, `max_depth`, `l2_reg`).
- **Phân vùng Giữa – Interactive Notebook Cells (`CenterNotebookPane`):**
  - Tích hợp **Monaco Editor** (nhân trình soạn thảo của VS Code) cho từng Cell Python.
  - Gồm 5 Cell tiêu chuẩn:
    1. `1. Load Dataset & Profile`
    2. `2. ColumnTransformer Pipeline`
    3. `3. Train / Holdout Split & CV`
    4. `4. Train Model`
    5. `5. Evaluate & Log Experiment`
  - Hỗ trợ thêm Cell tùy chỉnh (`+ Code` / `Add code cell`) dùng chung bộ nhớ biến (`global_namespace`) để người dùng viết lệnh khám phá dữ liệu nâng cao.
- **Phân vùng Phải – Experiment Studio, Data Explorer & Console (`RightStudioPane`):**
  - **Tab `Leaderboard`:** Xếp hạng tự động tất cả các lần chạy theo `ROC-AUC`, `F1`, `Accuracy` (Classification) hoặc `R²`, `RMSE`, `MAE` (Regression); vẽ biểu đồ cột so sánh trực quan bằng `Recharts`; hỗ trợ nút **`Restore config`** để khôi phục lại toàn bộ cấu hình của bất kỳ lần chạy nào trước đó.
  - **Tab `Plots & Importance`:** Hiển thị mức độ quan trọng của từng biến (`Permutation Importance`) và bộ biểu đồ Matplotlib độ phân giải cao (`ROC Curve`, `Confusion Matrix`, `Actual vs Predicted`).
  - **Tab `Data Explorer`:** Hiển thị kích thước bảng dữ liệu, dung lượng bộ nhớ, danh sách cột kèm kiểu dữ liệu (`dtype`), số giá trị duy nhất (`nunique`), tỷ lệ khuyết (`% NaN`) và bảng xem trước 5 dòng đầu (`df.head(5)`).
  - **Ngăn dưới `Console & Kernel Variables`:** Hiển thị luồng log thời gian thực (`stdout` / `stderr`), danh sách các biến đang sống trong bộ nhớ Kernel (`df`, `preprocessor`, `X_train`, `full_pipeline`...) và ô nhập lệnh Python tương tác nhanh (`REPL`).

---

### 2.2. Kiến trúc Dual-Runtime Engine (Vận hành 0đ Server)
| Tiêu chí | Tier 1: Browser Runtime (Pyodide Wasm) | Tier 2: Remote Cloud Runtime (Colab / Kaggle) |
| :--- | :--- | :--- |
| **Môi trường chạy** | Chạy trực tiếp trong trình duyệt qua **Web Worker** (Python 3.11 WebAssembly). | Chạy trên máy ảo Google Colab (12.7GB RAM + T4 GPU) hoặc Kaggle (30GB RAM + GPU). |
| **Thời gian cài đặt** | **0 giây** (mở trang web là chạy được ngay lập tức). | **~10 giây** (Copy mã 1-Click dán vào 1 Cell trên Colab/Kaggle và bấm Run 1 lần duy nhất). |
| **Thư viện hỗ trợ** | `numpy`, `pandas`, `scikit-learn` (bao gồm `HistGradientBoosting`), `matplotlib`. | Đầy đủ `lightgbm`, `xgboost`, `catboost`, `scikit-learn`, `pandas`, `matplotlib`, GPU CUDA. |
| **Cơ chế truyền tải** | Giao tiếp qua `postMessage` giữa Main Thread và Web Worker (không gây đơ giao diện). | Giao tiếp qua **Supabase Realtime Broadcast** (WebSocket độ trễ thấp, gom log mỗi 500ms). |

---

### 2.3. Hạ tầng Cơ sở dữ liệu & Đồng bộ Thời gian thực (Supabase Backend)
- **Supabase PostgreSQL (`supabase/schema.sql`):**
  - Bảng `public.sessions`: Lưu thông tin phiên làm việc, cấu hình Pipeline UI (`ui_pipeline_config`), thông tin phần cứng Worker (`worker_meta`) và gói `data_profile` JSON.
  - Bảng `public.cells`: Lưu mã nguồn sinh tự động (`generated_code`), mã nguồn thực tế (`current_code`), trạng thái khóa (`is_locked`) và kết quả chạy của từng Cell.
  - Bảng `public.experiments`: Lưu toàn bộ lịch sử chạy mô hình, siêu tham số, bảng điểm `metrics`, biểu đồ và bản chụp code (`code_snapshot`).
- **Supabase Storage (`datasets` bucket):** Tự động lưu trữ file `.CSV` khi người dùng tải lên để cả trình duyệt và Colab/Kaggle đều truy cập được.
- **Supabase Realtime Broadcast (`session:{session_id}`):** Tách biệt hoàn toàn luồng stream log tần suất cao (`run_cell`, `stop_cell`, `log_chunk`, `heartbeat`, `data_profile`, `cell_result`) ra khỏi ổ cứng Database để chống nghẽn kết nối.

---

## 3. KỊCH BẢN KIỂM THỬ & NGHIỆM THU CHỨC NĂNG (ACCEPTANCE CHECKLIST)

Bạn có thể dùng trực tiếp bảng kịch bản 6 bước dưới đây khi trình bày và nghiệm thu hệ thống trên `https://amlics.pages.dev`:

### ✅ Kịch bản 1: Kiểm thử Chạy tức thì trên Trình duyệt (Tier 1 - Pyodide Wasm)
1. Mở trang web `https://amlics.pages.dev`. Quan sát góc trên bên phải: đèn **`Browser (Pyodide)`** chuyển từ màu vàng (đang nạp Wasm) sang **màu xanh lá** trong vài giây.
2. Bấm nút **`Run all`** trên thanh công cụ trên cùng.
3. **Kết quả nghiệm thu:**
   - 5 Cell ở cột giữa lần lượt sáng viền xanh và chạy tuần tự từ `[1]` đến `[5]`.
   - Dưới mỗi Cell hiển thị log kết quả (`stdout`) và thời gian thực thi (ví dụ `✓ 1.24s`).
   - Tại Cell 5, bộ 3 biểu đồ (`ROC Curve`, `Confusion Matrix`, `Permutation Importance`) xuất hiện rõ nét.
   - Bên cột phải, mục **`Leaderboard (1)`** tự động ghi nhận `Run 1: HistGradientBoosting` kèm đầy đủ điểm số `AUC`, `F1`, `Acc`, `CV`.

### ✅ Kịch bản 2: Kiểm thử Đồng bộ UI-to-Code & Cơ chế Khóa Cell (Lockable Cells)
1. Tại cột cấu hình bên trái, mở mục **2. Preprocessing** ➔ Đổi `Imputer` từ `median` sang `mean`, hoặc mở mục **4. Estimator** ➔ Đổi thuật toán sang `RandomForest` và kéo thanh trượt `n_estimators` lên `200`.
2. Quan sát **Cell 2** và **Cell 4** ở giữa màn hình: Code Python bên trong Monaco Editor **tự động cập nhật theo thời gian thực** khớp với thông số vừa chọn.
3. Click chuột vào trong ô code của **Cell 2**, gõ thêm một dòng comment bất kỳ (ví dụ: `# Tinh chinh thu cong`).
4. **Kết quả nghiệm thu:**
   - Nhãn góc phải của Cell 2 lập tức chuyển từ **`UI Synced`** sang **`Locked`** (màu vàng).
   - Thử đổi lại `Scaler` ở cột bên trái: Code của Cell 2 được **giữ nguyên tuyệt đối**, không bị ghi đè mất dòng vừa gõ.
   - Bấm nút **`Reset`** trên thanh tiêu đề Cell 2: Cell quay trở về trạng thái `UI Synced` và cập nhật lại code chuẩn từ UI.

### ✅ Kịch bản 3: Kiểm thử So sánh Đa Mô hình & Khôi phục Cấu hình (Leaderboard & Restore)
1. Sau khi đã đổi mô hình sang `RandomForest` (hoặc chỉnh `max_depth`), bấm **`Run all`** lần thứ 2.
2. **Kết quả nghiệm thu:**
   - Tab **`Leaderboard (2)`** bên phải hiển thị biểu đồ cột so sánh trực tiếp giữa `Run 1` và `Run 2`, đồng thời tự động sắp xếp mô hình có điểm `AUC` cao hơn lên vị trí `#1`.
   - Bấm vào nút **`Restore config`** ở thẻ của `Run 1`: Toàn bộ cấu hình bên thanh công cụ trái và code trong các Cell lập tức khôi phục về đúng trạng thái của `Run 1`.

### ✅ Kịch bản 4: Kiểm thử Tải lên File CSV Mới & Tự động Khám phá Schema (Data Explorer)
1. Bấm nút **`Upload CSV`** trên thanh công cụ trên cùng và chọn một file `.csv` bất kỳ từ máy tính (hoặc đổi giữa 3 bộ dữ liệu mẫu ở mục **1. Dataset & Feature Roles**).
2. **Kết quả nghiệm thu:**
   - Hệ thống tự động đọc file CSV, trích xuất gói `DataProfile` đẩy sang tab **`Data Explorer`** bên phải (hiển thị số dòng, số cột, tỷ lệ `% NaN` của từng cột và 5 dòng đầu `df.head(5)`).
   - Danh sách cột bên thanh cấu hình trái tự động cập nhật và tự động gợi ý phân loại cột `num` / `cat` / `drop`.

### ✅ Kịch bản 5: Kiểm thử Kết nối Google Colab / Kaggle (Tier 2 - Remote Cloud Runtime)
1. Bấm nút **`Connect Cloud`** ở góc trên bên phải màn hình.
2. Bấm nút **`Copy code`** (đoạn mã đã nhúng sẵn `SESSION_ID` và kết nối Supabase).
3. Mở một Notebook mới trên **Google Colab** (hoặc **Kaggle**), dán mã vào 1 Cell duy nhất và bấm **Run**.
4. **Kết quả nghiệm thu:**
   - Ngay khi Colab báo kết nối thành công, trên giao diện Web `amlics.pages.dev`, đèn **`Colab / Kaggle`** chuyển sang **màu xanh lá**, nút bên cạnh hiển thị tên phần cứng thực tế (ví dụ: `Tesla T4 • 1.6/12.7GB`).
   - Chọn mô hình `LightGBM`, `XGBoost` hoặc `CatBoost` trên Web rồi bấm **`Run all`**: Toàn bộ lệnh được gửi qua WebSocket sang Colab thực thi, log trả về theo từng dòng mỗi 500ms và biểu đồ kết quả hiển thị ngay trên Web.
   - Bấm **`Interrupt execution`** khi đang chạy: Luồng Python trên Colab bị ngắt ngay lập tức (`KeyboardInterrupt`) mà không làm sập kết nối Worker.

### ✅ Kịch bản 6: Kiểm thử Xuất File Chuẩn Jupyter Notebook (`Download .ipynb`)
1. Bấm nút **`Download .ipynb`** trên thanh công cụ trên cùng.
2. **Kết quả nghiệm thu:**
   - Trình duyệt tải về file `<ten_du_an>_automl_pipeline.ipynb` đúng chuẩn định dạng Jupyter Notebook v4.
   - Khi mở file này trên VS Code, JupyterLab, Google Colab hoặc Kaggle, toàn bộ các Cell tiêu đề Markdown, code Python, kết quả log `stdout` và cả **ảnh biểu đồ PNG** đều hiển thị đầy đủ, sẵn sàng nộp báo cáo hoặc đưa vào vận hành thực tế.

---

## 4. DANH MỤC TỆP TIN CHÍNH TRONG DỰ ÁN

- [`src/App.tsx`](./src/App.tsx): Điều phối trung tâm trạng thái ứng dụng, kết nối Web Worker và Supabase Broker.
- [`src/engine/codeGenerator.ts`](./src/engine/codeGenerator.ts): Bộ sinh mã nguồn Python chống Data Leakage (`ColumnTransformer` & `Pipeline`).
- [`src/engine/pyodideWorker.ts`](./src/engine/pyodideWorker.ts): Nhân thực thi Python 3.11 WebAssembly chạy ngầm trong trình duyệt (Tier 1).
- [`src/engine/supabaseCloudClient.ts`](./src/engine/supabaseCloudClient.ts): Bộ điều phối Supabase Realtime Broadcast, PostgreSQL, Storage và trình sinh mã 1-Click cho Colab/Kaggle (Tier 2).
- [`src/utils/ipynbExporter.ts`](./src/utils/ipynbExporter.ts): Bộ đóng gói và xuất file chuẩn Jupyter Notebook (`.ipynb`).
- [`src/components/TopNavbar.tsx`](./src/components/TopNavbar.tsx), [`LeftPipelineSidebar.tsx`](./src/components/LeftPipelineSidebar.tsx), [`CenterNotebookPane.tsx`](./src/components/CenterNotebookPane.tsx), [`RightStudioPane.tsx`](./src/components/RightStudioPane.tsx), [`CloudConnectModal.tsx`](./src/components/CloudConnectModal.tsx): Hệ thống giao diện tối giản chuẩn Google Colab / Kaggle.
- [`supabase/schema.sql`](./supabase/schema.sql): Cấu trúc bảng cơ sở dữ liệu PostgreSQL và phân quyền RLS trên Supabase.
- [`cloud_worker/worker.py`](./cloud_worker/worker.py) & [`cloud_worker/Colab_Kaggle_Runner.ipynb`](./cloud_worker/Colab_Kaggle_Runner.ipynb): Mã nguồn Daemon chạy trên Google Colab / Kaggle.
