# BÁO CÁO TỔNG KẾT & TÀI LIỆU NGHIỆM THU HỆ THỐNG AMLICS (V2.0)
**Tên dự án:** **AMLICS** (*AutoML & Interactive Code Studio*)  
**Địa chỉ triển khai (Production URL):** `https://amlics.pages.dev`  
**Mã nguồn (GitHub Repository):** `https://github.com/MtamVP/AMLICS`  
**Định hướng:** Nền tảng Hybrid Low-code/No-code Anti-Leakage AutoML kết hợp Interactive Jupyter Notebook Studio với kiến trúc Dual-Runtime 0đ Server.

---

## 1. TỔNG QUAN BÀI TOÁN & GIÁ TRỊ CỐT LÕI

**AMLICS** kết hợp tính chặt chẽ của một công cụ xây dựng Pipeline chống rò rỉ dữ liệu (Data Leakage) với sự linh hoạt của một Notebook IDE tương tác thực thụ:
1. **Chống Data Leakage Toàn Diện (Từ Schema, Tiền xử lý đến Phân chia CV):**
   - **Tự động loại bỏ cột Định danh & Cột hằng (`Auto-drop ID / Constant`):** Tự động phát hiện các cột định danh (`id`, `PassengerId`, `*_id`, hoặc cột số nguyên/chuỗi có độ duy nhất `>= 95%` số dòng) và cột hằng (`nunique <= 1`) để đưa thẳng vào danh sách `drop`, ngăn chặn triệt để hiện tượng mô hình học vẹt theo ID.
   - **Đóng gói `ColumnTransformer` + `Pipeline`:** Mọi bước xử lý khuyết (`SimpleImputer`), biến đổi phi tuyến (`FunctionTransformer(np.log1p)`), chuẩn hóa (`RobustScaler`, `StandardScaler`) và mã hóa (`OneHotEncoder`) chỉ được `fit()` bên trong tập Train của từng Fold CV.
   - **Đa chiến lược Cross-Validation:** Hỗ trợ `StratifiedKFold`, `KFold`, **`GroupKFold`** (chống rò rỉ theo nhóm khách hàng/bệnh nhân) và **`TimeSeriesSplit`** (chống rò rỉ tương lai theo thời gian).
2. **Trải nghiệm Notebook IDE Thực Thụ (Hybrid UI-to-Code + Markdown + Import/Export `.ipynb`):**
   - Hỗ trợ song song **Code Cells** (Monaco Editor) và **Markdown Cells (`+ Code` / `+ Text`)** có chế độ chia đôi màn hình soạn thảo / xem trước GFM (bảng biểu, checklist, code block, lọc XSS an toàn).
   - Cơ chế **Locked Cells**: Chỉnh thông số bên Sidebar thì code tự cập nhật; ngay khi sửa code bằng tay trong Cell, Cell đó tự động chuyển sang **`Locked`** để bảo vệ code sửa tay (kèm nút `Reset` về mẫu chuẩn).
   - Hỗ trợ đầy đủ thao tác quản lý Cell: Di chuyển lên/xuống (`↑`/`↓`), Nhân đôi (`Copy`), Xóa (`×`), Chạy từ Cell hiện tại trở xuống (`▶↓`), phím tắt **`Shift + Enter`** / **`Ctrl + Enter`**, và tự động hiển thị biểu thức cuối cùng của Cell (ví dụ gõ `df.head(5)` tự động render bảng HTML chuẩn Jupyter).
   - Hỗ trợ cả **Import `.ipynb`** (mang notebook có sẵn từ Kaggle/Colab vào chỉnh sửa) và **Export `.ipynb`**.
3. **Quy trình Thực chiến Kaggle (`train.csv` + `test.csv` ➔ `submission.csv`) & Cảnh báo Dữ liệu lớn:**
   - Cho phép tải lên cả `train.csv` và `test.csv` để tự động huấn luyện Pipeline và xuất file **`submission.csv`** tải trực tiếp về máy.
   - Khi nạp bộ dữ liệu lớn (`> 30,000 dòng`) trên trình duyệt Wasm, hệ thống tự động hiển thị cảnh báo kèm nút **Subsample (`10,000 rows`)** để thử nghiệm nhanh không bị tràn RAM Wasm, hoặc chuyển 1-Click sang **Colab / Kaggle Runtime**.

---

## 2. DANH MỤC CẬP NHẬT & SỬA LỖI TRONG PHIÊN BẢN V2.0

1. **Đã sửa triệt để lỗi `NameError: name 'config' is not defined` ở Cell 1:** Chuẩn hóa toàn bộ nội suy chuỗi f-string trong [`src/engine/codeGenerator.ts`](./src/engine/codeGenerator.ts) và đồng bộ trạng thái thực thi Cell (`idle`, `running`, `success`, `error`, `stopped`).
2. **Loại bỏ hoàn toàn dữ liệu giả lập `RandomState`:** Bỏ toàn bộ đoạn code tự sinh dữ liệu giả trong Cell 1. Thay bằng hệ thống nạp dữ liệu trung thực từ 3 nguồn:
   - **Upload CSV:** Nạp `train.csv` và `test.csv` thực tế từ máy tính.
   - **Public URL (kèm Cloudflare Pages Function CORS Proxy `/api/proxy-csv`):** Tự động chuyển đổi link GitHub `blob` sang `raw.githubusercontent.com`, link Google Drive share sang link tải trực tiếp, đi kèm các bộ dữ liệu chuẩn thật (`titanic.csv`, `housing.csv`) tải qua `pd.read_csv`.
   - **Colab / Kaggle Path:** Làm mờ kèm hướng dẫn rõ ràng khi đang ở chế độ Browser, và tự động quét danh sách file trong `/kaggle/input` & `/content` khi kết nối với Colab/Kaggle Worker.
3. **Tự động phát hiện và loại bỏ cột `id` (`Auto-drop ID`) & Cảnh báo Chất lượng Dữ liệu:** Tự động gắn nhãn `ID` / `Const` và đưa vào `dropColumns`, đồng thời liệt kê cảnh báo dòng trùng (`duplicate_rows`), tỷ lệ khuyết cao tại tab **`Data & Warnings`**.
4. **Bổ sung Cell Markdown (`+ Text`), Quản lý Cell, Import `.ipynb` & Tự động tạo Báo cáo Thực nghiệm (`+ MD Note`):** Cho phép chèn báo cáo Markdown tự động từ bất kỳ lần chạy nào trên Leaderboard.
5. **Bổ sung Kiểm tra Overfitting (`Train Score` vs `CV Mean ± Std` vs `Holdout`) & Lọc Leaderboard theo Dataset:** Giúp phát hiện ngay hiện tượng quá khớp và không trộn lẫn kết quả của các bộ dữ liệu khác nhau.
6. **Bảo mật kênh thực thi Cloud Worker (`WORKER_SECRET` Auth Token):** Mỗi phiên làm việc sinh một khóa bí mật ngẫu nhiên 36 ký tự (`auth_token`). Worker trên Colab/Kaggle từ chối mọi lệnh `run_cell` / `stop_cell` nếu không khớp `WORKER_SECRET`.

---

## 3. KỊCH BẢN KIỂM THỬ & NGHIỆM THU (ACCEPTANCE TEST)

1. **Kiểm thử Nạp Dữ liệu Thật & Tự động Drop cột ID:**
   - Mở `https://amlics.pages.dev` (mặc định nạp sẵn bộ dữ liệu thật `titanic.csv`, trong đó `PassengerId`, `Name`, `Ticket` đã tự động được gắn nhãn `ID` và đưa vào `drop`).
   - Hoặc bấm **`Upload CSV`** tải lên file `train.csv` (ví dụ 200,000 dòng): Kiểm tra cột `id` tự động được gạch ngang (`drop`), thanh cảnh báo màu vàng hiện lên cho phép bấm **`Subsample 10k rows`** để chạy mượt trên trình duyệt.
2. **Kiểm thử Chạy Pipeline, Kiểm tra Overfit & Tải `submission.csv`:**
   - Bấm **`Run all`**. Sau khi 5 Cell chạy xong, nút **`↓ submission.csv`** xuất hiện trên thanh công cụ trên cùng -> bấm để tải file dự đoán chuẩn Kaggle về máy.
   - Quan sát **`Leaderboard`** bên phải: Hiển thị đầy đủ `Holdout AUC`, `CV Mean±Std` và `Train AUC`. Bấm **`+ MD Note`** trên thẻ kết quả để tự động chèn 1 Cell Markdown tổng kết thực nghiệm vào cuối Notebook.
3. **Kiểm thử Cell Markdown (`+ Text`), Sắp xếp Cell & Import/Export `.ipynb`:**
   - Rê chuột vào khoảng giữa 2 Cell bất kỳ -> bấm **`+ Text`** hoặc **`+ Code`**.
   - Nhấp đúp vào Cell Markdown để mở chế độ chia đôi màn hình (Soạn thảo + Xem trước bảng GFM), bấm **`Shift + Enter`** để hoàn tất.
   - Bấm **`Export .ipynb`** để tải Notebook về máy, sau đó bấm **`Import .ipynb`** chọn lại đúng file đó để kiểm chứng toàn bộ Code, Markdown và Biểu đồ được khôi phục nguyên vẹn.
