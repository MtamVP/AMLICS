# ⚡ AMLICS — AutoML & Interactive Code Studio

Nền tảng **Hybrid No-Code/Low-Code Anti-Leakage AutoML & Interactive Notebook IDE** kết hợp trải nghiệm cấu hình trực quan (giống KNIME/Orange) với trình soạn thảo **Monaco Notebook Cells & Live CLI** (giống Kaggle/Google Colab), vận hành trên kiến trúc **Dual-Runtime 0đ Server**:

1. **Tier 1 – Instant Browser Runtime (Pyodide WebAssembly):** Chạy Python 3.11 (`numpy`, `pandas`, `scikit-learn`, `matplotlib`) trực tiếp trong trình duyệt qua Web Worker với **0 giây cài đặt**.
2. **Tier 2 – Remote Cloud Runtime (Google Colab 12.7GB RAM / Kaggle 30GB RAM + GPU):** Kết nối thời gian thực qua **Supabase Realtime Broadcast** để huấn luyện dữ liệu lớn với `LightGBM`, `XGBoost`, `CatBoost` mà chỉ cần bấm Run 1 lần duy nhất trên Colab/Kaggle.

---

## 🌟 3 Giá trị cốt lõi (Giải quyết bài toán "Tại sao không mở thẳng Colab?")

- **🛡️ Zero-Boilerplate & Anti-Leakage Pipeline:** Chọn tham số trên Sidebar ➔ Tự động sinh code Python chuẩn công nghiệp (`sklearn.compose.ColumnTransformer` + `sklearn.pipeline.Pipeline`) theo 5 Cell tiêu chuẩn, đảm bảo mọi phép tính `Imputer`, `Scaler`, `OneHotEncoder` chỉ `fit()` trên tập Train của từng Fold CV.
- **🔒 Hybrid UI-to-Code (Lockable Cells):** Mỗi bước tương ứng với 1 Cell trên **Monaco Editor**. Chỉnh UI thì code tự nhảy. Ngay khi người dùng gõ sửa code bằng tay trong một Cell, Cell đó tự động chuyển sang **`🔒 Custom Locked`** (bảo vệ không cho UI ghi đè nhầm, kèm nút `↺ Reset to UI` bất cứ lúc nào).
- **🏆 Visual Experiment Leaderboard & `.ipynb` Export:** Tự động lưu mọi lần chạy vào bảng xếp hạng Leaderboard trực quan (so sánh `ROC-AUC`, `F1`, `Accuracy`, `RMSE`, `R²`), xem biểu đồ `ROC Curve`, `Confusion Matrix`, `Permutation Importance`, khôi phục cấu hình cũ trong 1 click (`⏪ Restore`), và xuất ra file `.ipynb` chuẩn Jupyter.

---

## 🚀 Hướng dẫn chạy & Triển khai nhanh

### 1. Chạy tại máy cục bộ (Local Development)
```bash
npm install
npm run dev
```
Mở trình duyệt tại địa chỉ hiển thị (mặc định `http://localhost:5173`). Hệ thống nạp sẵn **Tier 1 (Pyodide Wasm)** và 3 bộ dữ liệu mẫu để bạn bấm **`▶ Run Full Pipeline`** chạy thử ngay lập tức!

### 2. Kết nối Google Colab / Kaggle (Tier 2 Cloud Runtime)
1. Tạo 1 project miễn phí trên [Supabase](https://supabase.com), lấy **Project URL** và **Anon Public Key** (trong mục *Project Settings ➔ API*).
2. *(Tùy chọn)* Copy nội dung file [`supabase/schema.sql`](./supabase/schema.sql) dán vào **SQL Editor** trên Supabase và bấm **Run** để lưu trữ bền vững vào PostgreSQL & Storage.
3. Trên giao diện Web App, bấm nút **`Connect Cloud`** ở thanh trên cùng ➔ Dán `Supabase URL` & `Anon Key` ➔ Bấm **`Copy 1-Click Runner Code`**.
4. Mở 1 Notebook trên **Google Colab** hoặc **Kaggle** (bật Internet), dán đoạn code vừa copy vào 1 Cell duy nhất và bấm **Run**.
5. Khi thấy thông báo `🟢 ĐÃ KẾT NỐI REALTIME VỚI WEB APP!`, thu nhỏ tab Colab/Kaggle lại và điều khiển 100% từ Web App!

### 3. Deploy miễn phí lên Cloudflare Pages
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- File `public/_redirects` đã được cấu hình sẵn SPA routing cho Cloudflare Pages.
