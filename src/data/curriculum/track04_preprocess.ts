import { LessonDefinition } from '../../types/curriculum';

export const TRACK04_PREPROCESS_LESSONS: LessonDefinition[] = [
  {
    id: 'L033',
    order: 33,
    trackId: 'track04_preprocess',
    title: 'Data Leakage: Sai lầm Kinh điển Làm Hỏng Điểm Thực tế',
    subtitle: 'Hiểu rõ Fit vs Transform và lý do BẮT BUỘC split trước khi tiền xử lý',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Phân biệt `fit_transform(X_train)` và `transform(X_test)`.',
      'Chứng minh bằng thực nghiệm hiện tượng rò rỉ thông tin từ `X_test` sang bước Scaling/Imputation.',
      'Đóng gói biến đổi vào `Pipeline` để triệt tiêu hoàn toàn Data Leakage.',
    ],
    sections: [
      {
        title: '1. Nguyên tắc vàng chống rò rỉ dữ liệu',
        contentMarkdown:
          'Mọi tham số học được từ dữ liệu — bao gồm `mean`, `std`, `median`, từ điển `OneHotEncoder`, bộ chọn đặc trưng `SelectKBest` — **CHỈ ĐƯỢC PHÉP TÍNH TRÊN TẬP TRAIN** (`fit`). Sau đó đem bộ tham số đó áp lên Validation/Test (`transform`).\n\nNếu bạn chạy `scaler.fit_transform(X)` trên toàn bộ dataset rồi mới `train_test_split`, bạn đã vô tình cho tập train "nhìn lén" phân phối của tập test!',
        callout: {
          type: 'warning',
          title: 'Rò rỉ ngầm hay gặp ở Kaggle',
          text: 'Thậm chí điền giá trị thiếu bằng `df["Age"].fillna(df["Age"].median())` trước khi tách K-Fold cũng là một dạng Data Leakage nhẹ. Với CV nhiều fold, luôn dùng `SimpleImputer` nằm bên trong `Pipeline`.',
        },
      },
    ],
    exercise: {
      prompt: 'Tách `housing.csv` thành `X_train, X_test, y_train, y_test` (test_size=0.2, random_state=42) trên 4 cột số `["LotArea", "LivingArea", "Bedrooms", "DistCenterKm"]`. Fit `SimpleImputer(strategy="median")` + `StandardScaler` ĐÚNG CÁCH chỉ trên `X_train`, transform cả train/test thành `X_tr_scaled`, `X_te_scaled`.',
      requirements: [
        'Sử dụng `make_pipeline(SimpleImputer(strategy="median"), StandardScaler())`.',
        '`X_tr_scaled` có trung bình xấp xỉ 0 (sai số < 1e-6) và không còn NaN.',
        '`X_te_scaled` KHÔNG có trung bình bằng 0 tuyệt đối vì dùng mean/std học từ `X_train`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

df = pd.read_csv('housing.csv')
cols = ['LotArea', 'LivingArea', 'Bedrooms', 'DistCenterKm']
X = df[cols]
y = df['SalePrice']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
prep = make_pipeline(SimpleImputer(strategy='median'), StandardScaler())

# Fit trên X_train và transform cho X_train, X_test
X_tr_scaled = None
X_te_scaled = None
`,
      hintText: '`X_tr_scaled = prep.fit_transform(X_train)` và `X_te_scaled = prep.transform(X_test)`. Tuyệt đối không gọi `fit_transform` lên `X_test`!',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline

df = pd.read_csv('housing.csv')
cols = ['LotArea', 'LivingArea', 'Bedrooms', 'DistCenterKm']
X = df[cols]
y = df['SalePrice']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
prep = make_pipeline(SimpleImputer(strategy='median'), StandardScaler())
X_tr_scaled = prep.fit_transform(X_train)
X_te_scaled = prep.transform(X_test)
`,
      checkPython: `assert X_tr_scaled is not None and X_te_scaled is not None, "Chưa gán X_tr_scaled / X_te_scaled."
assert np.isnan(X_tr_scaled).sum() == 0 and np.isnan(X_te_scaled).sum() == 0, "Vẫn còn giá trị NaN."
assert np.allclose(X_tr_scaled.mean(axis=0), 0, atol=1e-6), "Mean của X_tr_scaled phải ~ 0."
assert not np.allclose(X_te_scaled.mean(axis=0), 0, atol=1e-6), "Phát hiện X_te_scaled có mean == 0 (khả năng đã fit lại trên X_test!)."`,
    },
  },
  {
    id: 'L034',
    order: 34,
    trackId: 'track04_preprocess',
    title: 'Chiến lược Xử lý Giá trị Thiếu (SimpleImputer & Missing Indicator)',
    subtitle: 'Mean/Median/Mode, KNNImputer và giữ cờ `_isna` khi sự thiếu hụt mang thông tin',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['titanic', 'housing'],
    objectives: [
      'Lựa chọn giữa `mean`, `median`, `most_frequent` và `constant` theo kiểu dữ liệu & ngoại lai.',
      'Bật `add_indicator=True` trong `SimpleImputer` để mô hình biết mẫu nào từng bị thiếu.',
      'Trải nghiệm `KNNImputer` cho các đặc trưng số có tương quan mạnh.',
    ],
    sections: [
      {
        title: '1. Thiếu dữ liệu đôi khi chính là tín hiệu cực mạnh!',
        contentMarkdown:
          'Ví dụ trong bảng vay ngân hàng, người không khai báo `Income` hoặc số năm công tác thường có tỷ lệ rủi ro khác hẳn người khai báo đầy đủ. Nếu chỉ điền số median vào là làm mất dấu. Tham số `SimpleImputer(strategy="median", add_indicator=True)` tự động thêm một cột nhị phân `0/1` đánh dấu vị trí từng bị thiếu!',
      },
    ],
    exercise: {
      prompt: 'Áp dụng `SimpleImputer(strategy="median", add_indicator=True)` lên các cột `["Age", "Fare"]` của `titanic.csv` (chia train/test 80/20 trước) và kiểm tra shape đầu ra có tự động tăng từ 2 lên 3 hoặc 4 cột hay không.',
      requirements: [
        'Khởi tạo `imp = SimpleImputer(strategy="median", add_indicator=True)`.',
        '`X_tr_imp = imp.fit_transform(X_train)` không còn NaN và có số cột > 2 (`Age` hoặc `Fare` có NaN).',
        'Lưu số cột chỉ báo được tạo thêm vào `n_extra_cols`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer

df = pd.read_csv('titanic.csv')
X = df[['Age', 'Fare']]
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

imp = SimpleImputer(strategy='median', add_indicator=True)
X_tr_imp = None
n_extra_cols = 0
`,
      hintText: '`X_tr_imp = imp.fit_transform(X_train)` và `n_extra_cols = int(X_tr_imp.shape[1] - X_train.shape[1])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.impute import SimpleImputer

df = pd.read_csv('titanic.csv')
X = df[['Age', 'Fare']]
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

imp = SimpleImputer(strategy='median', add_indicator=True)
X_tr_imp = imp.fit_transform(X_train)
X_te_imp = imp.transform(X_test)
n_extra_cols = int(X_tr_imp.shape[1] - X_train.shape[1])
`,
      checkPython: `assert X_tr_imp is not None, "Chưa fit_transform X_train."
assert np.isnan(X_tr_imp).sum() == 0, "Còn NaN trong X_tr_imp."
assert int(n_extra_cols) >= 1 and X_tr_imp.shape[1] > 2, "Cần bật add_indicator=True để tạo thêm cột đánh dấu thiếu dữ liệu."`,
    },
  },
  {
    id: 'L035',
    order: 35,
    trackId: 'track04_preprocess',
    title: 'Xử lý Ngoại lai (Outliers): IQR Clipping vs Winsorization',
    subtitle: 'Giới hạn điểm dị thường không làm mất dòng dữ liệu quan trọng',
    difficulty: 'Trung bình',
    libraries: ['NumPy', 'Pandas'],
    estimatedMinutes: 20,
    datasetIds: ['housing', 'fraud'],
    objectives: [
      'Nhận diện ngoại lai bằng quy tắc `[Q1 - 1.5*IQR, Q3 + 1.5*IQR]` và phân vị `[1%, 99%]`.',
      'Thay vì xóa bỏ (drop rows - nguy hiểm khi test vẫn có outlier), thực hành `clip()` theo ngưỡng học từ tập train.',
    ],
    sections: [
      {
        title: '1. Clip tốt hơn Drop ở đâu?',
        contentMarkdown:
          'Trên tập Test ngoài đời thực (hoặc Kaggle `test.csv`), bạn **không được phép xóa dòng**, bắt buộc phải dự đoán đủ 100% số dòng! Nếu bạn kẹp (`clip`) giá trị về khoảng phân vị `[p01, p99]` tính trên `train`, bạn vẫn bảo toàn số dòng mà không làm mô hình tuyến tính bị nổ trọng số.',
      },
    ],
    exercise: {
      prompt: 'Tính ngưỡng phân vị 1% (`low`) và 99% (`high`) trên `X_train["LotArea"]` (`housing.csv`, split 80/20), sau đó `clip` cả `train` và `test` theo cặp ngưỡng `(low, high)` vừa học.',
      requirements: [
        'Tính `low, high` chỉ từ `X_train["LotArea"]`.',
        'Tạo `train_clipped` và `test_clipped` có `min >= low` và `max <= high`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('housing.csv')
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

low, high = 0.0, 0.0
train_clipped = None
test_clipped = None
`,
      hintText: '`low = float(train_df["LotArea"].quantile(0.01))`, `high = float(train_df["LotArea"].quantile(0.99))`, rồi `.clip(lower=low, upper=high)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('housing.csv')
train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)

low = float(train_df['LotArea'].quantile(0.01))
high = float(train_df['LotArea'].quantile(0.99))
train_clipped = train_df['LotArea'].clip(lower=low, upper=high)
test_clipped = test_df['LotArea'].clip(lower=low, upper=high)
`,
      checkPython: `assert low < high, "Ngưỡng low phải nhỏ hơn high."
assert train_clipped.min() >= low - 1e-9 and train_clipped.max() <= high + 1e-9, "train_clipped vượt ngưỡng."
assert test_clipped.min() >= low - 1e-9 and test_clipped.max() <= high + 1e-9, "test_clipped vượt ngưỡng."
assert len(test_clipped) == len(test_df), "Không được drop dòng trên test."`,
    },
  },
  {
    id: 'L036',
    order: 36,
    trackId: 'track04_preprocess',
    title: 'Chuẩn hóa Đặc trưng Số: StandardScaler, MinMaxScaler & RobustScaler',
    subtitle: 'Chọn bộ chuẩn hóa tối ưu cho Logistic/SVM/Neural Net vs dữ liệu nhiều nhiễu',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 20,
    datasetIds: ['fraud', 'housing'],
    objectives: [
      'Nắm công thức của `StandardScaler`, `MinMaxScaler`, `RobustScaler` (dựa trên Median & IQR).',
      'Biết khi nào mô hình cây (Tree/RF/XGBoost) KHÔNG cần scale, còn mô hình khoảng cách/gradient BẮT BUỘC phải scale.',
    ],
    sections: [
      {
        title: '1. So sánh 3 Scaler phổ biến nhất',
        contentMarkdown:
          '- **`StandardScaler`**: `(x - mean) / std` → tốt cho phân phối gần chuẩn, mặc định cho Linear, SVM, KNN, PCA.\n- **`MinMaxScaler`**: đưa về `[0, 1]` → tốt cho ảnh `[0..255]` hoặc feature có biên cứng.\n- **`RobustScaler`**: `(x - median) / IQR` → kháng ngoại lai xuất sắc vì không bị một điểm siêu lớn kéo lệch `mean` và `std`.',
      },
    ],
    exercise: {
      prompt: 'So sánh tác động của `StandardScaler` và `RobustScaler` trên `credit_fraud.csv` cột `["Amount", "DistanceKm"]` bằng cách kiểm tra giá trị cực đại sau transform.',
      requirements: [
        'Tạo `X_std` bằng `StandardScaler().fit_transform(X)` và `X_rob` bằng `RobustScaler().fit_transform(X)`.',
        'Kiểm tra median mỗi cột của `X_rob` xấp xỉ 0 (`np.allclose(np.median(X_rob, axis=0), 0)`).',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler, RobustScaler
df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'DistanceKm']].values

X_std = None
X_rob = None
`,
      hintText: '`X_std = StandardScaler().fit_transform(X)` và `X_rob = RobustScaler().fit_transform(X)`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler, RobustScaler
df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'DistanceKm']].values

X_std = StandardScaler().fit_transform(X)
X_rob = RobustScaler().fit_transform(X)
`,
      checkPython: `assert X_std.shape == X.shape and X_rob.shape == X.shape, "Shape đầu ra phải giữ nguyên."
assert np.allclose(X_std.mean(axis=0), 0, atol=1e-6), "X_std phải có mean ~ 0."
assert np.allclose(np.median(X_rob, axis=0), 0, atol=1e-6), "X_rob phải có median ~ 0."`,
    },
  },
  {
    id: 'L037',
    order: 37,
    trackId: 'track04_preprocess',
    title: 'Biến đổi Phân phối: PowerTransformer (Yeo-Johnson) & QuantileTransformer',
    subtitle: 'Ép dữ liệu lệch nặng về phân phối chuẩn cho Linear Model & Neural Network',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['fraud', 'churn'],
    objectives: [
      'Phân biệt `Box-Cox` (chỉ số dương > 0) và `Yeo-Johnson` (nhận cả số 0 và âm).',
      'Sử dụng `QuantileTransformer(output_distribution="normal")` khi biến có phân bố kỳ dị.',
    ],
    sections: [
      {
        title: '1. Yeo-Johnson: Vũ khí bí mật cho các cột có số 0',
        contentMarkdown:
          'Cột `Balance` trong ngân hàng (`bank_churn.csv`) thường có rất nhiều giá trị bằng `0` xen lẫn vài tỷ đồng. `Box-Cox` sẽ báo lỗi vì đòi `x > 0`, trong khi `PowerTransformer(method="yeo-johnson")` chạy mượt mà.',
      },
    ],
    exercise: {
      prompt: 'Áp dụng `PowerTransformer(method="yeo-johnson")` lên `["CreditScore", "Age", "Balance"]` của `bank_churn.csv` (split 80/20) và kiểm tra độ lệch trung bình sau biến đổi giảm xuống.',
      requirements: [
        'Fit `PowerTransformer(method="yeo-johnson")` chỉ trên `X_train`, transform thành `X_tr_pt`, `X_te_pt`.',
        'Tính `skew_balance_before` và `skew_balance_after` cho cột `Balance` trên tập train.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PowerTransformer

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance']]
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

pt = PowerTransformer(method='yeo-johnson')
X_tr_pt = None
X_te_pt = None
skew_balance_before = 0.0
skew_balance_after = 0.0
`,
      hintText: '`X_tr_pt = pt.fit_transform(X_train)`; `X_te_pt = pt.transform(X_test)`; `skew_balance_before = float(X_train["Balance"].skew())`, `skew_balance_after = float(pd.Series(X_tr_pt[:, 2]).skew())`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PowerTransformer

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance']]
X_train, X_test = train_test_split(X, test_size=0.2, random_state=42)

pt = PowerTransformer(method='yeo-johnson')
X_tr_pt = pt.fit_transform(X_train)
X_te_pt = pt.transform(X_test)
skew_balance_before = float(X_train['Balance'].skew())
skew_balance_after = float(pd.Series(X_tr_pt[:, 2]).skew())
`,
      checkPython: `assert X_tr_pt.shape == X_train.shape and X_te_pt.shape == X_test.shape, "Sai shape sau PowerTransformer."
assert isinstance(skew_balance_before, float) and abs(float(skew_balance_after)) < 1.0, "skew_balance_after chưa hợp lý."
assert np.allclose(X_tr_pt.mean(axis=0), 0, atol=1e-6), "PowerTransformer mặc định standardize=True nên mean ~ 0."
assert np.allclose(X_tr_pt.std(axis=0), 1, atol=1e-6), "PowerTransformer mặc định standardize=True nên std ~ 1."`,
    },
  },
  {
    id: 'L038',
    order: 38,
    trackId: 'track04_preprocess',
    title: 'Mã hóa Phân loại: OneHotEncoder, OrdinalEncoder & Unseen Categories',
    subtitle: 'Xử lý chuỗi hạng mục an toàn khi tập test xuất hiện nhãn lạ',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train', 'kaggle_loan_test'],
    objectives: [
      'Cấu hình `OneHotEncoder(handle_unknown="ignore", sparse_output=False)` để không bao giờ crash trên production.',
      'Dùng `OrdinalEncoder` theo đúng thứ tự bậc thực sự (`Grade`: A < B < C < D < E).',
    ],
    sections: [
      {
        title: '1. Cạm bẫy `handle_unknown="error"` mặc định',
        contentMarkdown:
          'Nếu bạn quên `handle_unknown="ignore"`, chỉ cần 1 dòng trên `test.csv` xuất hiện tỉnh thành mới mà `train.csv` chưa từng thấy, toàn bộ pipeline sẽ sập với `ValueError: Found unknown categories`!',
      },
    ],
    exercise: {
      prompt: 'Từ `loan_train.csv` và `loan_test.csv`, dùng `OrdinalEncoder` mã hóa có thứ tự cột `Grade` (`["A", "B", "C", "D", "E"]`) và `OneHotEncoder(handle_unknown="ignore", sparse_output=False)` cho `["Purpose", "Region"]`.',
      requirements: [
        'Khởi tạo `ord_enc = OrdinalEncoder(categories=[["A", "B", "C", "D", "E"]])` fit trên train, transform train & test thành `grade_tr`, `grade_te`.',
        'Khởi tạo `ohe = OneHotEncoder(handle_unknown="ignore", sparse_output=False)` fit trên train, transform `["Purpose", "Region"]` thành `cat_tr`, `cat_te`.',
      ],
      starterCode: `from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder
train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

ord_enc = OrdinalEncoder(categories=[['A', 'B', 'C', 'D', 'E']])
ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False)

grade_tr = None
grade_te = None
cat_tr = None
cat_te = None
`,
      hintText: 'Gọi `ord_enc.fit_transform(train_df[["Grade"]])` và `ord_enc.transform(test_df[["Grade"]])`. Tương tự với `ohe` trên `[["Purpose", "Region"]]`.',
      solutionCode: `from sklearn.preprocessing import OrdinalEncoder, OneHotEncoder
train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

ord_enc = OrdinalEncoder(categories=[['A', 'B', 'C', 'D', 'E']])
ohe = OneHotEncoder(handle_unknown='ignore', sparse_output=False)

grade_tr = ord_enc.fit_transform(train_df[['Grade']])
grade_te = ord_enc.transform(test_df[['Grade']])
cat_tr = ohe.fit_transform(train_df[['Purpose', 'Region']])
cat_te = ohe.transform(test_df[['Purpose', 'Region']])
`,
      checkPython: `assert grade_tr.shape == (len(train_df), 1) and grade_te.shape == (len(test_df), 1), "Sai shape grade_tr/te."
assert set(np.unique(grade_tr)).issubset({0.0, 1.0, 2.0, 3.0, 4.0}), "OrdinalEncoder Grade chưa khớp 0..4."
assert cat_tr.shape[1] == cat_te.shape[1] and cat_tr.shape[1] >= 5, "OneHotEncoder số cột train/test phải khớp."`,
    },
  },
  {
    id: 'L039',
    order: 39,
    trackId: 'track04_preprocess',
    title: 'ColumnTransformer: Kiến trúc Xử lý Bảng Hỗn hợp Số + Danh mục',
    subtitle: 'Xây dựng bộ tiền xử lý chuẩn mực tách nhánh Numeric và Categorical sạch sẽ',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['titanic'],
    objectives: [
      'Kết hợp `ColumnTransformer` + `Pipeline` cho 2 luồng `num_pipe` và `cat_pipe`.',
      'Trích xuất tên cột đầu ra bằng `preprocessor.get_feature_names_out()`.',
    ],
    sections: [
      {
        title: '1. ColumnTransformer — Trái tim của Tabular Scikit-Learn',
        contentMarkdown:
          'Dữ liệu bảng thực tế luôn trộn lẫn cột số (có NaN) và cột chữ (có NaN). `ColumnTransformer` giúp bạn định tuyến từng nhóm cột qua đúng nhánh `Pipeline` riêng biệt mà không tạo ra một biến trung gian dư thừa nào, sẵn sàng lưu thành file `.pkl`.',
        exampleCode: `from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder

num_pipe = Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())])
cat_pipe = Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore'))])
prep = ColumnTransformer([('num', num_pipe, num_cols), ('cat', cat_pipe, cat_cols)])`,
      },
    ],
    exercise: {
      prompt: 'Xây dựng `preprocessor` hoàn chỉnh bằng `ColumnTransformer` cho `titanic.csv` với `num_cols = ["Age", "Fare", "SibSp", "Parch"]` và `cat_cols = ["Sex", "Embarked", "Pclass"]`, ghép với `LogisticRegression(max_iter=500)` thành `full_pipe` và đánh giá Accuracy trên test 20%.',
      requirements: [
        '`full_pipe` là `Pipeline` gồm `"prep"` (`ColumnTransformer`) và `"clf"` (`LogisticRegression`).',
        'Fit trên `X_train, y_train` (split 80/20 `stratify=y, random_state=42`) và đạt `acc >= 0.70`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

df = pd.read_csv('titanic.csv')
num_cols = ['Age', 'Fare', 'SibSp', 'Parch']
cat_cols = ['Sex', 'Embarked', 'Pclass']
X = df[num_cols + cat_cols]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

full_pipe = None
acc = 0.0
`,
      hintText: 'Tạo `num_pipe`, `cat_pipe`, đưa vào `ColumnTransformer`, rồi `full_pipe = Pipeline([("prep", preprocessor), ("clf", LogisticRegression(max_iter=500))])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

df = pd.read_csv('titanic.csv')
num_cols = ['Age', 'Fare', 'SibSp', 'Parch']
cat_cols = ['Sex', 'Embarked', 'Pclass']
X = df[num_cols + cat_cols]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

num_pipe = Pipeline([
    ('imp', SimpleImputer(strategy='median')),
    ('sc', StandardScaler()),
])
cat_pipe = Pipeline([
    ('imp', SimpleImputer(strategy='most_frequent')),
    ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False)),
])
preprocessor = ColumnTransformer([
    ('num', num_pipe, num_cols),
    ('cat', cat_pipe, cat_cols),
])
full_pipe = Pipeline([
    ('prep', preprocessor),
    ('clf', LogisticRegression(max_iter=500)),
])
full_pipe.fit(X_tr, y_tr)
acc = float(accuracy_score(y_te, full_pipe.predict(X_te)))
`,
      checkPython: `assert isinstance(full_pipe, Pipeline), "full_pipe phải là sklearn Pipeline."
assert isinstance(full_pipe.named_steps.get('prep'), ColumnTransformer), "Bước 'prep' phải là ColumnTransformer."
assert float(acc) >= 0.70, f"Accuracy {acc:.3f} quá thấp (< 0.70)."`,
    },
  },
  {
    id: 'L040',
    order: 40,
    trackId: 'track04_preprocess',
    title: 'Tiền xử lý Văn bản Cơ bản: CountVectorizer & TF-IDF',
    subtitle: 'Biến đổi cột review bình luận thành ma trận đặc trưng N-gram kết hợp Tabular',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['text_reviews'],
    objectives: [
      'Hiểu TF-IDF (Term Frequency – Inverse Document Frequency) và tham số `ngram_range=(1, 2)`, `min_df`.',
      'Xây dựng classifier phân loại cảm xúc (`Sentiment`) trên `text_reviews.csv` đạt độ chính xác cao.',
    ],
    sections: [
      {
        title: '1. Khi bảng dữ liệu có cả cột văn bản ngắn (Review, Mô tả)',
        contentMarkdown:
          'Rất nhiều bài toán Kaggle có cột văn bản như tên sản phẩm, phản hồi khách hàng. `TfidfVectorizer(ngram_range=(1, 2), max_features=300)` chuyển chuỗi chữ thành vector thưa cực nhanh và có thể nhúng trực tiếp vào `ColumnTransformer`!',
      },
    ],
    exercise: {
      prompt: 'Xây dựng `Pipeline` gồm `TfidfVectorizer(ngram_range=(1, 2), min_df=2)` và `LogisticRegression(max_iter=500)` dự đoán `Sentiment` từ `ReviewText` trong `text_reviews.csv`. Tính `acc_text` trên test 25%.',
      requirements: [
        'Chia 75/25 `stratify=y, random_state=42`.',
        'Đạt `acc_text >= 0.80` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

df = pd.read_csv('text_reviews.csv')
X_tr, X_te, y_tr, y_te = train_test_split(df['ReviewText'], df['Sentiment'], test_size=0.25, stratify=df['Sentiment'], random_state=42)

text_pipe = None
acc_text = 0.0
`,
      hintText: '`text_pipe = Pipeline([("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=2)), ("clf", LogisticRegression(max_iter=500))]).fit(X_tr, y_tr)` rồi đánh giá `accuracy_score`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score

df = pd.read_csv('text_reviews.csv')
X_tr, X_te, y_tr, y_te = train_test_split(df['ReviewText'], df['Sentiment'], test_size=0.25, stratify=df['Sentiment'], random_state=42)

text_pipe = Pipeline([
    ('tfidf', TfidfVectorizer(ngram_range=(1, 2), min_df=2)),
    ('clf', LogisticRegression(max_iter=500)),
])
text_pipe.fit(X_tr, y_tr)
acc_text = float(accuracy_score(y_te, text_pipe.predict(X_te)))
`,
      checkPython: `assert isinstance(text_pipe, Pipeline), "text_pipe phải là Pipeline."
assert isinstance(text_pipe.named_steps['tfidf'], TfidfVectorizer), "Phải dùng TfidfVectorizer."
assert float(acc_text) >= 0.80, f"Accuracy {acc_text:.3f} chưa đạt >= 0.80."`,
    },
  },
  {
    id: 'L041',
    order: 41,
    trackId: 'track04_preprocess',
    title: 'Custom Transformer chuẩn Scikit-Learn (`BaseEstimator`, `TransformerMixin`)',
    subtitle: 'Tự viết bước Feature Engineering tái sử dụng trong `Pipeline` & `GridSearchCV`',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Kế thừa `BaseEstimator, TransformerMixin` để triển khai `fit()` và `transform()`.',
      'Đóng gói logic tạo tỷ lệ thu nhập vay vào một transformer không phụ thuộc dữ liệu ngoài.',
    ],
    sections: [
      {
        title: '1. Tại sao phải viết Custom Transformer thay vì sửa DataFrame ở ngoài?',
        contentMarkdown:
          'Nếu bạn thêm cột bên ngoài `Pipeline`, mỗi lần đem model đi dự đoán file `test.csv` mới hoặc chạy `cross_val_score` bạn phải nhớ copy lại y nguyên đoạn code xử lý. Khi viết `class LoanRatioBuilder(BaseEstimator, TransformerMixin)`, toàn bộ logic sống chung bên trong 1 file `.pkl` duy nhất!',
      },
    ],
    exercise: {
      prompt: 'Hoàn thiện class `LoanFeatureBuilder(BaseEstimator, TransformerMixin)` nhận DataFrame từ `loan_train.csv` và trả về DataFrame mới có thêm 2 cột: `TotalIncome = ApplicantIncome + CoapplicantIncome` và `LoanToIncome = LoanAmount / (TotalIncome + 1.0)`. Kiểm chứng chạy thông qua `cross_val_score` 3-fold.',
      requirements: [
        '`LoanFeatureBuilder` kế thừa `BaseEstimator, TransformerMixin` và có `fit`, `transform`.',
        'Ghép vào `Pipeline` cùng `ColumnTransformer`/`SimpleImputer` + `LogisticRegression` và tính `cv_roc_auc >= 0.65`.',
      ],
      starterCode: `from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus'])
y = df['LoanStatus']

class LoanFeatureBuilder(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        out = X.copy()
        # Tạo TotalIncome và LoanToIncome
        return out

cv_roc_auc = 0.0
`,
      hintText: 'Trong `transform`: `out["TotalIncome"] = out["ApplicantIncome"].fillna(0) + out["CoapplicantIncome"].fillna(0)` và `out["LoanToIncome"] = out["LoanAmount"].fillna(0) / (out["TotalIncome"] + 1.0)`. Sau đó đưa vào `Pipeline([("feat", LoanFeatureBuilder()), ("prep", ColumnTransformer(...)), ("clf", LogisticRegression(max_iter=500))])`.',
      solutionCode: `from sklearn.base import BaseEstimator, TransformerMixin
from sklearn.model_selection import cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus'])
y = df['LoanStatus']

class LoanFeatureBuilder(BaseEstimator, TransformerMixin):
    def fit(self, X, y=None):
        return self
    def transform(self, X):
        out = X.copy()
        out['TotalIncome'] = out['ApplicantIncome'].fillna(0) + out['CoapplicantIncome'].fillna(0)
        out['LoanToIncome'] = out['LoanAmount'].fillna(0) / (out['TotalIncome'] + 1.0)
        return out

num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears', 'TotalIncome', 'LoanToIncome']
cat_cols = ['Grade', 'Purpose', 'Region']

prep = ColumnTransformer([
    ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
    ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore'))]), cat_cols),
])

pipe = Pipeline([
    ('feat', LoanFeatureBuilder()),
    ('prep', prep),
    ('clf', LogisticRegression(max_iter=500)),
])
cv_roc_auc = float(cross_val_score(pipe, X, y, cv=3, scoring='roc_auc').mean())
`,
      checkPython: `builder = LoanFeatureBuilder()
transformed = builder.fit_transform(X.head(5))
assert 'TotalIncome' in transformed.columns and 'LoanToIncome' in transformed.columns, "Transformer thiếu cột mới."
assert float(cv_roc_auc) >= 0.65, f"cv_roc_auc={cv_roc_auc:.3f} chưa đạt >= 0.65."`,
    },
  },
  {
    id: 'L109',
    order: 42,
    trackId: 'track04_preprocess',
    title: 'KNNImputer: Điền Giá Trị Thiếu Thông Minh Theo Hàng Xóm Gần Nhất',
    subtitle: 'Khi nào dùng KNNImputer thay vì median và vì sao bắt buộc đặt StandardScaler trước KNNImputer',
    difficulty: 'Trung bình',
    libraries: ['Preprocessing', 'Scikit-Learn'],
    estimatedMinutes: 22,
    datasetIds: ['housing', 'medical_vitals'],
    objectives: [
      'Hiểu cách `KNNImputer(n_neighbors=5)` tìm `k` dòng giống nhất về các cột còn lại để ước lượng giá trị thiếu.',
      'Biết lý do phải đưa `StandardScaler()` (hoặc `RobustScaler`) **trước** `KNNImputer` để cột đơn vị lớn không át khoảng cách.',
      'So khớp tùy chọn `numericImputer = "knn"` ngay trên thanh tiền xử lý AMLICS Studio.',
    ],
    sections: [
      {
        title: '1. Điểm yếu của Mean/Median & Sức mạnh của KNNImputer',
        contentMarkdown:
          'Nếu một căn nhà có `LotArea = 600 m2`, `Bedrooms = 5`, nhưng bị thiếu cột `LivingArea`, việc điền bằng **trung vị chung** (ví dụ `110 m2` của căn nhà bình dân) là sai lệch nghiêm trọng!\n\n**`KNNImputer(n_neighbors=5)`** sẽ đi tìm **5 căn nhà có diện tích đất, số phòng ngủ, năm xây giống hệt nhất** và lấy trung bình diện tích sàn của 5 hàng xóm đó để điền vào ô thiếu.\n\n| Chiến lược Imputer (AMLICS Studio) | Điểm mạnh | Hạn chế & Khi nào tránh |\n| :--- | :--- | :--- |\n| `median` | An toàn, nhanh, miễn nhiễm outlier | Bỏ qua mối quan hệ giữa các cột |\n| `mean` | Nhanh | Nhạy cảm với giá trị cực đoan (outlier) |\n| `knn` (`KNNImputer`) | Chính xác cao khi các cột tương quan mạnh | Chậm với >50.000 dòng; **bắt buộc scale trước** |\n| `constant_zero` + `MissingIndicator` | Giữ nguyên dấu hiệu giá trị thiếu | Đôi khi làm lệch phân phối nếu 0 mang nghĩa thật |',
        exampleCode: `from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import KNNImputer
import pandas as pd

df = pd.read_csv('housing.csv')
X = df[['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'SalePrice']].copy()
print("Số NaN LivingArea trước khi điền:", int(X['LivingArea'].isna().sum()))

pipe_knn = make_pipeline(StandardScaler(), KNNImputer(n_neighbors=5))
X_filled = pipe_knn.fit_transform(X)
print("Số NaN sau KNNImputer:", int(np.isnan(X_filled).sum()))`,
        callout: {
          type: 'warning',
          title: 'Quy tắc thứ tự với KNNImputer',
          text: 'Khoảng cách Euclid rất nhạy thang đo: `LotArea` (1.000–10.000) sẽ đè bẹp `Bedrooms` (1–5). Vì vậy luôn bọc `Pipeline([("scaler", StandardScaler()), ("knn_imp", KNNImputer(n_neighbors=5))])` (hợp lý nhất cho tập vừa & nhỏ).',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên `housing.csv` (lấy các cột `["LotArea", "LivingArea", "Bedrooms", "YearBuilt", "DistCenterKm", "HasGarage"]`), chia Train/Test 80/20 `random_state=42`. Dùng `Pipeline([("scaler", StandardScaler()), ("imp", KNNImputer(n_neighbors=5)), ("reg", Ridge(alpha=5.0))])` huấn luyện dự đoán `SalePrice` và tính `r2_knn` trên tập Test (`r2_knn >= 0.55`).',
      requirements: [
        'Sử dụng `KNNImputer(n_neighbors=5)` đặt bên trong `Pipeline` sau khi chia Train/Test (không fit trên tập Test).',
        '`r2_knn >= 0.55` và kiểm chứng sau khi điền không còn `NaN`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import KNNImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

# TODO: Tạo pipe có StandardScaler + KNNImputer(n_neighbors=5) + Ridge(alpha=5.0)
pipe = None
r2_knn = 0.0
`,
      hintText:
        '`pipe = Pipeline([("scaler", StandardScaler()), ("imp", KNNImputer(n_neighbors=5)), ("reg", Ridge(alpha=5.0))]).fit(X_tr, y_tr)`, `r2_knn = float(r2_score(y_te, pipe.predict(X_te)))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import KNNImputer
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

pipe = Pipeline([
    ('scaler', StandardScaler()),
    ('imp', KNNImputer(n_neighbors=5)),
    ('reg', Ridge(alpha=5.0)),
]).fit(X_tr, y_tr)
r2_knn = float(r2_score(y_te, pipe.predict(X_te)))
`,
      checkPython: `assert isinstance(pipe, Pipeline) and any(isinstance(s, KNNImputer) for _, s in pipe.steps)
assert float(r2_knn) >= 0.55, f"r2_knn={r2_knn:.3f} quá thấp"`,
    },
  },
  {
    id: 'L110',
    order: 43,
    trackId: 'track04_preprocess',
    title: 'OneHotEncoder(max_categories) & Chọn Đúng Scaler Trong 5 Chế Độ Studio',
    subtitle: 'Giới hạn số cột bùng nổ khi One-Hot và so sánh Standard / Robust / MinMax / Quantile / Power',
    difficulty: 'Trung bình',
    libraries: ['Preprocessing', 'Scikit-Learn'],
    estimatedMinutes: 22,
    datasetIds: ['kaggle_loan_train', 'fraud'],
    objectives: [
      'Dùng `OneHotEncoder(max_categories=k, handle_unknown="ignore")` gộp các hạng mục hiếm vào nhóm `"infrequent"`.',
      'Nắm bảng tra nhanh chọn 1 trong 5 chiến lược `numericScaler` trên AMLICS Studio.',
    ],
    sections: [
      {
        title: '1. Cạm bẫy bùng nổ số cột & Giải pháp max_categories',
        contentMarkdown:
          'Nếu cột `Ward` (Phường/Xã) có 300 giá trị khác nhau, `OneHotEncoder()` thường sẽ đẻ ra 300 cột toàn số `0` — làm mô hình cây chạy chậm và dễ overfit vào các phường chỉ xuất hiện 1–2 lần.\n\nTham số `max_categories=10` (tương ứng thanh trượt `Max One-Hot Categories` trên AMLICS Studio) tự động giữ lại **9 hạng mục phổ biến nhất** và gom toàn bộ hạng mục hiếm vào đúng **1 cột gộp `infrequent`**!',
      },
      {
        title: '2. Bảng tra 5 chế độ Numeric Scaler của AMLICS Studio',
        contentMarkdown:
          '| Scaler trong Studio | Công thức biến đổi | Khi nào chọn? |\n| :--- | :--- | :--- |\n| `standard` (`StandardScaler`) | $(x - \\mu) / \\sigma$ | Mặc định tốt cho dữ liệu gần chuẩn + Linear/SVM/MLP |\n| `robust` (`RobustScaler`) | $(x - \\text{median}) / \\text{IQR}$ | **Có nhiều ngoại lai (Outlier)** như `Amount` trong `credit_fraud.csv` |\n| `minmax` (`MinMaxScaler`) | Đưa về đoạn $[0, 1]$ | Dữ liệu không ngoại lai, mạng Nơ-ron hoặc dữ liệu thưa |\n| `quantile_normal` | Ép mọi phân phối về Chuẩn tắc | Dữ liệu lệch nặng, đa đỉnh hoặc có outlier cực lớn |\n| `power_yeojohnson` | Biến đổi lũy thừa (chấp nhận cả số 0 & âm) | Làm đối xứng dữ liệu lệch vừa để tăng điểm Linear/Logistic |',
      },
    ],
    exercise: {
      prompt:
        'Trên `loan_train.csv`, dùng `OneHotEncoder(max_categories=3, handle_unknown="ignore", sparse_output=False)` cho cột `Purpose` (có 5 giá trị) → kiểm tra số cột sinh ra đúng bằng `3` (`ohe_mat.shape[1] == 3`). Đồng thời so sánh `RobustScaler` vs `StandardScaler` trên cột `Amount` của `credit_fraud.csv` (lấy max tuyệt đối sau scale: `robust_max > std_max` hay không — kiểm tra `rob_scaled` có IQR ~ 1).',
      requirements: [
        '`ohe_mat.shape[1] == 3` nhờ `max_categories=3`.',
        'Áp dụng `RobustScaler()` lên `df_fraud[["Amount"]]` lưu vào `rob_scaled`.',
      ],
      starterCode: `from sklearn.preprocessing import OneHotEncoder, RobustScaler

df_loan = pd.read_csv('loan_train.csv')
df_fraud = pd.read_csv('credit_fraud.csv')

# TODO: OHE cột ['Purpose'] với max_categories=3, handle_unknown='ignore', sparse_output=False
ohe = OneHotEncoder(max_categories=3, handle_unknown='ignore', sparse_output=False)
ohe_mat = ohe.fit_transform(df_loan[['Purpose']])

# TODO: RobustScaler trên df_fraud[['Amount']]
rob_scaled = RobustScaler().fit_transform(df_fraud[['Amount']])
`,
      hintText:
        'Code mẫu đã gần hoàn chỉnh: kiểm tra thêm `np.median(rob_scaled)` xấp xỉ `0.0` và `ohe_mat.shape == (len(df_loan), 3)`.',
      solutionCode: `from sklearn.preprocessing import OneHotEncoder, RobustScaler

df_loan = pd.read_csv('loan_train.csv')
df_fraud = pd.read_csv('credit_fraud.csv')

ohe = OneHotEncoder(max_categories=3, handle_unknown='ignore', sparse_output=False)
ohe_mat = ohe.fit_transform(df_loan[['Purpose']])
rob_scaled = RobustScaler().fit_transform(df_fraud[['Amount']])
`,
      checkPython: `assert ohe_mat.shape == (len(df_loan), 3), f"Kỳ vọng 3 cột nhờ max_categories=3, nhận {ohe_mat.shape}"
assert rob_scaled.shape == (len(df_fraud), 1) and abs(float(np.median(rob_scaled))) < 1e-6`,
    },
  },
];
