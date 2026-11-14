export function explainPythonError(errorText: string): string | null {
  if (!errorText) return null;
  const lower = errorText.toLowerCase();

  if (lower.includes('filenotfounderror') || lower.includes('no such file')) {
    return 'Gợi ý: Không tìm thấy file CSV trong bộ nhớ. Hãy bấm "Upload CSV" hoặc chọn lại file ở cột 1. Data Source & Schema.';
  }
  if (lower.includes('keyerror')) {
    return 'Gợi ý: Tên cột không tồn tại trong DataFrame (có thể do đổi file dữ liệu hoặc sai tên Target/Group). Kiểm tra lại cột Target ở mục 1.';
  }
  if (lower.includes('could not convert string to float')) {
    return 'Gợi ý: Có cột dạng chữ (string) đang bị xếp nhầm vào nhóm "num". Hãy chuyển cột đó sang "cat" hoặc "drop" ở mục 1.';
  }
  if (lower.includes('input x contains nan') || lower.includes('contains nan')) {
    return 'Gợi ý: Dữ liệu còn giá trị thiếu (NaN). Hãy bật SimpleImputer / KNNImputer ở mục 2 hoặc chạy lại từ Cell 2.';
  }
  if (lower.includes('nameerror') && (lower.includes('df') || lower.includes('x_train') || lower.includes('preprocessor'))) {
    return 'Gợi ý: Biến chưa được tạo trong bộ nhớ (hoặc Kernel vừa khởi động lại). Hãy bấm "Run all" hoặc "Run before selected cell" để chạy lại từ Cell 1.';
  }
  if (lower.includes('memoryerror') || lower.includes('out of memory')) {
    return 'Gợi ý: Hết RAM trình duyệt (Wasm). Hãy bật "Subsample 10k rows" ở cột trái hoặc chuyển sang Colab / Kaggle Runtime.';
  }
  if (lower.includes('only one class present') || lower.includes('number of classes')) {
    return 'Gợi ý: Cột Target chỉ có 1 giá trị duy nhất hoặc quá ít mẫu cho mỗi lớp khi chia Fold. Hãy giảm CV Folds xuống 3 hoặc kiểm tra lại Target.';
  }
  if (lower.includes('syntaxerror') || lower.includes('indentationerror')) {
    return 'Gợi ý: Lỗi cú pháp hoặc thụt lề Python (Indent). Kiểm tra dấu ngoặc, dấu hai chấm (:) hoặc khoảng trắng đầu dòng.';
  }
  return null;
}
