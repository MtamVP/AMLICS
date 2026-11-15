import { LessonDefinition } from '../../types/curriculum';

export const TRACK06_CV_LESSONS: LessonDefinition[] = [
  {
    id: 'L050',
    order: 50,
    trackId: 'track06_cv',
    title: 'Train / Validation / Test Split & Vai trò của Stratification',
    subtitle: 'Vì sao không được chỉnh hyperparameter trên tập Test cuối cùng',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 20,
    datasetIds: ['fraud'],
    objectives: [
      'Thiết lập chia 3 phần (Train 60% / Val 20% / Test 20%) hoặc Train/Val + Holdout.',
      'Chứng minh `stratify=y` giữ nguyên tỷ lệ lớp thiểu số (~4.5% gian lận) ở mọi tập con.',
    ],
    sections: [
      {
        title: '1. Tập Test phải được khóa trong két sắt cho đến phút chót!',
        contentMarkdown:
          'Mỗi lần bạn sửa tham số vì thấy điểm Test tăng hay giảm, tập Test dần bị biến thành một tập Validation thứ hai. Hãy chia riêng 1 tập **Validation** (hoặc dùng Cross-Validation trên Train) để dò tham số, chỉ mở **Holdout Test** đúng 1 lần duy nhất sau khi chốt mô hình.',
      },
    ],
    exercise: {
      prompt: 'Từ `credit_fraud.csv`, tách thành 3 tập `Train (60%)`, `Val (20%)`, `Test (20%)` sao cho tỷ lệ `IsFraud == 1` ở cả 3 tập đều bảo toàn bằng `stratify`. Lưu số mẫu và tỷ lệ dương tính của từng tập.',
      requirements: [
        'Dùng 2 lần `train_test_split` với `stratify` và `random_state=42`.',
        'Độ dài `len(y_tr) == 300`, `len(y_val) == 100`, `len(y_te) == 100` (trên 500 dòng).',
        'Chênh lệch tỷ lệ `IsFraud.mean()` giữa 3 tập < 0.015.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'HourOfDay', 'DistanceKm', 'IsForeign', 'V1']]
y = df['IsFraud']

# Bước 1: tách X_temp (80%) và X_te (20%)
# Bước 2: tách X_temp thành X_tr (75% của 80% = 60%) và X_val (25% của 80% = 20%)
X_tr = X_val = X_te = None
y_tr = y_val = y_te = None
`,
      hintText: '`X_temp, X_te, y_temp, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)` rồi `X_tr, X_val, y_tr, y_val = train_test_split(X_temp, y_temp, test_size=0.25, stratify=y_temp, random_state=42)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'HourOfDay', 'DistanceKm', 'IsForeign', 'V1']]
y = df['IsFraud']

X_temp, X_te, y_temp, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
X_tr, X_val, y_tr, y_val = train_test_split(X_temp, y_temp, test_size=0.25, stratify=y_temp, random_state=42)
`,
      checkPython: `assert len(y_tr) == 300 and len(y_val) == 100 and len(y_te) == 100, f"Tỷ lệ 60/20/20 sai: {len(y_tr)}/{len(y_val)}/{len(y_te)}."
r_tr, r_val, r_te = float(y_tr.mean()), float(y_val.mean()), float(y_te.mean())
assert max(abs(r_tr - r_val), abs(r_tr - r_te)) < 0.015, "Tỷ lệ lớp dương tính giữa 3 tập bị lệch (quên stratify=y?)."`,
    },
  },
  {
    id: 'L051',
    order: 51,
    trackId: 'track06_cv',
    title: 'K-Fold vs StratifiedKFold & Vector Dự đoán Out-of-Fold (OOF)',
    subtitle: 'Trái tim của mọi giải pháp vô địch Kaggle: Train 5 fold và thu thập OOF Predictions',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Hiểu rõ `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`.',
      'Tạo vòng lặp train 5 fold, lưu xác suất dự đoán vào mảng `oof_preds` để chấm điểm toàn cục chính xác nhất.',
    ],
    sections: [
      {
        title: '1. Tại sao tính điểm trên `oof_preds` chuẩn hơn trung bình 5 fold với AUC/F1?',
        contentMarkdown:
          'Với ROC-AUC hay LogLoss trên dữ liệu nhỏ hoặc mất cân bằng, tính trung bình từng fold có thể dao động theo kích thước từng lát cắt. Thu thập toàn bộ dự đoán Out-of-Fold vào đúng vị trí ban đầu rồi gọi `roc_auc_score(y, oof_preds)` cho một thước đo tổng thể cực kỳ tin cậy — đồng thời chính `oof_preds` đó sẽ dùng làm đầu vào cho Blending & Stacking sau này!',
      },
    ],
    exercise: {
      prompt: 'Chạy 5-fold `StratifiedKFold` trên `loan_train.csv` với `Pipeline([SimpleImputer, StandardScaler, LogisticRegression])`, điền đầy đủ xác suất `predict_proba[:, 1]` vào mảng `oof_probs` và tính `oof_auc = roc_auc_score(y, oof_probs)`.',
      requirements: [
        '`oof_probs` dài đúng 400 phần tử, tất cả đều nằm trong `(0, 1)`.',
        '`oof_auc >= 0.65`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus'].values

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_probs = np.zeros(len(df))
oof_auc = 0.0
`,
      hintText: 'Trong vòng lặp `for tr_idx, va_idx in skf.split(X, y):`, dựng `pipe = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(max_iter=500))`, `pipe.fit(X.iloc[tr_idx], y[tr_idx])`, rồi `oof_probs[va_idx] = pipe.predict_proba(X.iloc[va_idx])[:, 1]`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus'].values

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_probs = np.zeros(len(df))

for tr_idx, va_idx in skf.split(X, y):
    pipe = make_pipeline(
        SimpleImputer(strategy='median'),
        StandardScaler(),
        LogisticRegression(max_iter=500),
    )
    pipe.fit(X.iloc[tr_idx], y[tr_idx])
    oof_probs[va_idx] = pipe.predict_proba(X.iloc[va_idx])[:, 1]

oof_auc = float(roc_auc_score(y, oof_probs))
`,
      checkPython: `assert len(oof_probs) == len(df), "Sai độ dài oof_probs."
assert (oof_probs > 0).all() and (oof_probs < 1).all(), "Chưa điền hết OOF probs cho toàn bộ mẫu."
assert float(oof_auc) >= 0.65, f"oof_auc={oof_auc:.3f} quá thấp."`,
    },
  },
  {
    id: 'L052',
    order: 52,
    trackId: 'track06_cv',
    title: 'RepeatedKFold & Độ ổn định Độ lệch chuẩn CV (`mean ± std`)',
    subtitle: 'Đừng bao giờ tin thay đổi +0.002 nếu nhỏ hơn độ lệch chuẩn giữa các lần chia fold',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Dùng `RepeatedKFold(n_splits=5, n_repeats=3)` trên tập dữ liệu nhỏ (< 500 dòng) để giảm phương sai đánh giá.',
      'Tính cả `mean` lẫn `std` của RMSE qua 15 lần chạy.',
    ],
    sections: [
      {
        title: '1. Khi tập dữ liệu chỉ có ~300 dòng như Housing',
        contentMarkdown:
          'Chỉ đổi `random_state` từ `42` sang `7`, điểm CV 5-fold có thể nhảy ±5%. Chạy `RepeatedKFold(n_splits=5, n_repeats=3)` tạo ra `15` phép đo trên 3 cách xáo trộn khác nhau, giúp bạn biết chắc thay đổi feature mới có **thực sự cải thiện mô hình** hay chỉ là may mắn ngẫu nhiên.',
      },
    ],
    exercise: {
      prompt: 'Đánh giá `Ridge(alpha=10.0)` kết hợp `SimpleImputer` + `StandardScaler` trên `housing.csv` qua `RepeatedKFold(n_splits=5, n_repeats=3, random_state=42)` với metric `neg_root_mean_squared_error`. Lưu `mean_rmse` và `std_rmse` (dạng số dương).',
      requirements: [
        'Chạy `cross_val_score` đủ 15 folds (`len(scores) == 15`).',
        '`mean_rmse > 0` và `std_rmse > 0`.',
      ],
      starterCode: `from sklearn.model_selection import RepeatedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']

rkf = RepeatedKFold(n_splits=5, n_repeats=3, random_state=42)
pipe = make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), Ridge(alpha=10.0))

scores = np.array([])
mean_rmse = 0.0
std_rmse = 0.0
`,
      hintText: '`scores = -cross_val_score(pipe, X, y, cv=rkf, scoring="neg_root_mean_squared_error")`, rồi `mean_rmse = float(scores.mean())`, `std_rmse = float(scores.std())`.',
      solutionCode: `from sklearn.model_selection import RepeatedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']

rkf = RepeatedKFold(n_splits=5, n_repeats=3, random_state=42)
pipe = make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), Ridge(alpha=10.0))
scores = -cross_val_score(pipe, X, y, cv=rkf, scoring='neg_root_mean_squared_error')
mean_rmse = float(scores.mean())
std_rmse = float(scores.std())
`,
      checkPython: `assert len(scores) == 15, f"RepeatedKFold(5, 3) phải có 15 scores, nhận {len(scores)}."
assert mean_rmse > 0 and std_rmse > 0, "mean_rmse và std_rmse phải dương (đảo dấu neg_root_mean_squared_error)."`,
    },
  },
  {
    id: 'L053',
    order: 53,
    trackId: 'track06_cv',
    title: 'GroupKFold & StratifiedGroupKFold (Chống Rò Rỉ Theo Bệnh Nhân / Khách Hàng)',
    subtitle: 'Bắt buộc khi một đối tượng có nhiều dòng dữ liệu (y tế, đơn hàng, thiết bị IoT)',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['medical_vitals'],
    objectives: [
      'Nhận diện Group Leakage trong `medical_vitals.csv` (1 `PatientId` có 4 lần khám `VisitNo`).',
      'Kiểm chứng 100% `PatientId` trong Validation KHÔNG xuất hiện trong Train khi dùng `StratifiedGroupKFold`.',
    ],
    sections: [
      {
        title: '1. Thảm họa y tế khi dùng K-Fold thường trên bệnh nhân tái khám',
        contentMarkdown:
          'Mỗi bệnh nhân trong `medical_vitals.csv` có `4` lần tái khám (`VisitNo = 1..4`). Nếu bạn chia ngẫu nhiên, lần khám 1–3 vào Train còn lần khám 4 của **chính bệnh nhân đó** rơi vào Validation: mô hình chỉ việc học thuộc lòng huyết áp/tuổi của bệnh nhân để đạt AUC 0.99 giả tạo! Ra thực tế gặp bệnh nhân hoàn toàn mới, mô hình sụp đổ ngay lập tức.\n\nGiải pháp duy nhất đúng: **`GroupKFold` hoặc `StratifiedGroupKFold` với `groups=df["PatientId"]`!**',
      },
    ],
    exercise: {
      prompt: 'Dùng `StratifiedGroupKFold(n_splits=5)` với `groups=df["PatientId"]` trên `medical_vitals.csv`. Kiểm tra từng fold không có bất kỳ `PatientId` nào giao nhau giữa tập train và tập val, đồng thời tính `cv_auc` trung bình cho `LogisticRegression`.',
      requirements: [
        'Duyệt `sgkf.split(X, y, groups=groups)` và assert `set(groups[tr]).isdisjoint(set(groups[va]))` ở cả 5 fold.',
        'Tính `cv_auc` dạng float hợp lệ (> 0.6).',
      ],
      starterCode: `from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

df = pd.read_csv('medical_vitals.csv')
X = df[['SystolicBP', 'Glucose', 'BMI', 'Age']]
y = df['RiskHigh']
groups = df['PatientId']

sgkf = StratifiedGroupKFold(n_splits=5)
overlap_count = 0
cv_auc = 0.0
`,
      hintText: 'Khởi tạo `aucs = []`, trong vòng `for tr, va in sgkf.split(X, y, groups):`, kiểm tra `if set(groups.iloc[tr]) & set(groups.iloc[va]): overlap_count += 1`, fit `make_pipeline(StandardScaler(), LogisticRegression(max_iter=500))`, append `roc_auc_score`, rồi `cv_auc = float(np.mean(aucs))`.',
      solutionCode: `from sklearn.model_selection import StratifiedGroupKFold
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

df = pd.read_csv('medical_vitals.csv')
X = df[['SystolicBP', 'Glucose', 'BMI', 'Age']]
y = df['RiskHigh']
groups = df['PatientId']

sgkf = StratifiedGroupKFold(n_splits=5)
overlap_count = 0
aucs = []
for tr, va in sgkf.split(X, y, groups=groups):
    if set(groups.iloc[tr]) & set(groups.iloc[va]):
        overlap_count += 1
    pipe = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500))
    pipe.fit(X.iloc[tr], y.iloc[tr])
    aucs.append(roc_auc_score(y.iloc[va], pipe.predict_proba(X.iloc[va])[:, 1]))

cv_auc = float(np.mean(aucs))
`,
      checkPython: `assert overlap_count == 0, "Phát hiện PatientId bị trùng giữa train và validation!"
assert 0.60 <= float(cv_auc) <= 1.0, f"cv_auc={cv_auc} bất thường."`,
    },
  },
  {
    id: 'L054',
    order: 54,
    trackId: 'track06_cv',
    title: 'TimeSeriesSplit & Chống Look-Ahead Bias Trong Chuỗi Thời Gian',
    subtitle: 'Quá khứ dự đoán tương lai — Tuyệt đối không xáo trộn ngẫu nhiên theo thời gian',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['daily_sales'],
    objectives: [
      'Sắp xếp chuẩn theo `Date` trước khi tách.',
      'Dùng `TimeSeriesSplit(n_splits=4)` mô phỏng cửa sổ mở rộng (Expanding Window) và kiểm tra `max(train_date) < min(val_date)`.',
    ],
    sections: [
      {
        title: '1. Look-Ahead Bias: Gian lận nhìn thấy tương lai',
        contentMarkdown:
          'Nếu bạn dùng `KFold(shuffle=True)` trên dữ liệu doanh số bán lẻ `daily_sales.csv`, bạn đang dùng doanh số ngày **20/12** để dự đoán doanh số ngày **19/12**! Ngoài đời thực không bao giờ có điều đó. Luôn sort theo ngày tăng dần và dùng `TimeSeriesSplit`.',
      },
    ],
    exercise: {
      prompt: 'Lọc riêng `StoreId == "S1"` từ `daily_sales.csv`, sắp xếp tăng dần theo `Date`, tạo biến chỉ số `day_num = np.arange(len(s1))` và đánh giá `TimeSeriesSplit(n_splits=4)` cho `LinearRegression` dự đoán `Sales` từ `["Promo", "TempC", "day_num"]`. Xác nhận ở mọi fold ngày train tối đa luôn nhỏ hơn ngày val tối thiểu.',
      requirements: [
        'Sắp xếp đúng thứ tự thời gian trước khi `TimeSeriesSplit(n_splits=4)`.',
        'Kiểm chứng `temporal_ok == True` (mọi fold `train_dates.max() < val_dates.min()`) và tính `ts_mae_mean`.',
      ],
      starterCode: `from sklearn.model_selection import TimeSeriesSplit
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)
s1['day_num'] = np.arange(len(s1))

tscv = TimeSeriesSplit(n_splits=4)
temporal_ok = False
ts_mae_mean = 0.0
`,
      hintText: 'Dùng `for tr, va in tscv.split(X):` kiểm tra `s1["Date"].iloc[tr].max() < s1["Date"].iloc[va].min()`, fit `LinearRegression()` và tính `mean_absolute_error`.',
      solutionCode: `from sklearn.model_selection import TimeSeriesSplit
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error

df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)
s1['day_num'] = np.arange(len(s1))

X = s1[['Promo', 'TempC', 'day_num']]
y = s1['Sales']

tscv = TimeSeriesSplit(n_splits=4)
temporal_ok = True
maes = []
for tr, va in tscv.split(X):
    if not (s1['Date'].iloc[tr].max() < s1['Date'].iloc[va].min()):
        temporal_ok = False
    reg = LinearRegression().fit(X.iloc[tr], y.iloc[tr])
    maes.append(mean_absolute_error(y.iloc[va], reg.predict(X.iloc[va])))

ts_mae_mean = float(np.mean(maes))
`,
      checkPython: `assert temporal_ok is True, "Thứ tự thời gian train < val bị vi phạm!"
assert 0.0 < float(ts_mae_mean) < 100.0, f"ts_mae_mean={ts_mae_mean} bất thường."`,
    },
  },
  {
    id: 'L055',
    order: 55,
    trackId: 'track06_cv',
    title: 'Hệ sinh thái Metrics: Accuracy vs F1 vs ROC-AUC vs PR-AUC & LogLoss',
    subtitle: 'Chọn đúng thước đo quyết định trực tiếp đến chiến lược tối ưu của bạn',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['fraud'],
    objectives: [
      'Hiểu vì sao Accuracy 95.5% trên dữ liệu 4.5% gian lận lại VÔ GIÁ TRỊ.',
      'So sánh `roc_auc_score`, `average_precision_score` (PR-AUC), `f1_score` và `log_loss` trên cùng một tập dự đoán.',
    ],
    sections: [
      {
        title: '1. Cạm bẫy Accuracy Paradox',
        contentMarkdown:
          'Nếu 95.5% giao dịch là hợp lệ và chỉ 4.5% là gian lận, một mô hình lười biếng dự đoán **TẤT CẢ LÀ 0** vẫn đạt Accuracy **95.5%**, nhưng bắt được **0 ca gian lận nào (Recall = 0, F1 = 0)**! Trong bài toán mất cân bằng nặng, hãy ưu tiên **PR-AUC (`average_precision_score`)** hoặc **F1 / Recall@Precision**.',
      },
    ],
    exercise: {
      prompt: 'Trên `credit_fraud.csv`, so sánh mô hình ngốc `DummyClassifier(strategy="most_frequent")` với `LogisticRegression(class_weight="balanced")` trên cùng test 25%. Tính `acc_dummy`, `f1_dummy`, `f1_logreg`, `pr_auc_logreg` (`average_precision_score`).',
      requirements: [
        '`acc_dummy > 0.90` nhưng `f1_dummy == 0.0` (chứng minh Accuracy Paradox).',
        '`f1_logreg > 0.25` và `pr_auc_logreg > 0.30`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, average_precision_score

df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'HourOfDay', 'DistanceKm', 'IsForeign', 'V1']]
y = df['IsFraud']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

acc_dummy = 0.0
f1_dummy = 0.0
f1_logreg = 0.0
pr_auc_logreg = 0.0
`,
      hintText: 'Fit `DummyClassifier(strategy="most_frequent")`, dự đoán `y_dum`. Fit `make_pipeline(StandardScaler(), LogisticRegression(class_weight="balanced", max_iter=500))`, lấy `y_pred` và `y_prob = [:, 1]`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.dummy import DummyClassifier
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, average_precision_score

df = pd.read_csv('credit_fraud.csv')
X = df[['Amount', 'HourOfDay', 'DistanceKm', 'IsForeign', 'V1']]
y = df['IsFraud']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

dum = DummyClassifier(strategy='most_frequent').fit(X_tr, y_tr)
pred_dum = dum.predict(X_te)
acc_dummy = float(accuracy_score(y_te, pred_dum))
f1_dummy = float(f1_score(y_te, pred_dum, zero_division=0))

pipe = make_pipeline(StandardScaler(), LogisticRegression(class_weight='balanced', max_iter=500)).fit(X_tr, y_tr)
pred_lr = pipe.predict(X_te)
prob_lr = pipe.predict_proba(X_te)[:, 1]
f1_logreg = float(f1_score(y_te, pred_lr))
pr_auc_logreg = float(average_precision_score(y_te, prob_lr))
`,
      checkPython: `assert float(acc_dummy) > 0.90 and float(f1_dummy) == 0.0, "Dummy phải có accuracy > 0.90 nhưng F1 = 0."
assert float(f1_logreg) > 0.25, f"f1_logreg={f1_logreg:.3f} quá thấp."
assert float(pr_auc_logreg) > 0.30, f"pr_auc_logreg={pr_auc_logreg:.3f} quá thấp."`,
    },
  },
  {
    id: 'L056',
    order: 56,
    trackId: 'track06_cv',
    title: 'Threshold Tuning: Tối ưu Ngưỡng Quyết định Sau Khi Có Xác suất',
    subtitle: 'Vì sao ngưỡng mặc định 0.50 hiếm khi tối ưu cho F1 hoặc bài toán mất cân bằng',
    difficulty: 'Trung bình',
    libraries: ['NumPy', 'Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'fraud'],
    objectives: [
      'Quét lưới ngưỡng `thresholds = np.linspace(0.1, 0.9, 81)` trên xác suất Out-of-Fold.',
      'Tìm `best_threshold` tối đa hóa F1 và đo phần tăng trưởng so với ngưỡng mặc định 0.50.',
    ],
    sections: [
      {
        title: '1. Tách rời bài toán dự đoán xác suất và ra quyết định',
        contentMarkdown:
          'Mọi mô hình phân loại tốt nên trả về xác suất `p = predict_proba(X)[:, 1]`. Sau khi có `p` trên OOF, bạn hoàn toàn có thể chọn ngưỡng `t*` tối ưu trực tiếp cho metric của cuộc thi (F1, Accuracy, hoặc lợi nhuận kinh doanh) mà không cần train lại model!',
      },
    ],
    exercise: {
      prompt: 'Từ xác suất `oof_probs` của `LogisticRegression` (5-fold StratifiedKFold) trên `bank_churn.csv`, quét `thresholds = np.linspace(0.15, 0.85, 71)` để tìm `best_threshold` đạt `best_f1` cao nhất và so sánh với `f1_default_05`.',
      requirements: [
        'Tính `oof_probs` bằng 5-fold StratifiedKFold.',
        'Tìm `best_threshold` trong `[0.15, 0.85]` và chứng minh `best_f1 >= f1_default_05`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn'].values

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_probs = np.zeros(len(df))
for tr, va in skf.split(X, y):
    m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500)).fit(X.iloc[tr], y[tr])
    oof_probs[va] = m.predict_proba(X.iloc[va])[:, 1]

f1_default_05 = float(f1_score(y, (oof_probs >= 0.5).astype(int)))
thresholds = np.linspace(0.15, 0.85, 71)
best_threshold = 0.5
best_f1 = 0.0
`,
      hintText: 'Duyệt `for th in thresholds:`, tính `s = f1_score(y, (oof_probs >= th).astype(int))`, cập nhật `best_f1` và `best_threshold = float(th)` khi `s > best_f1`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn'].values

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_probs = np.zeros(len(df))
for tr, va in skf.split(X, y):
    m = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500)).fit(X.iloc[tr], y[tr])
    oof_probs[va] = m.predict_proba(X.iloc[va])[:, 1]

f1_default_05 = float(f1_score(y, (oof_probs >= 0.5).astype(int)))
thresholds = np.linspace(0.15, 0.85, 71)
best_f1 = -1.0
best_threshold = 0.5
for th in thresholds:
    score = float(f1_score(y, (oof_probs >= th).astype(int)))
    if score > best_f1:
        best_f1 = score
        best_threshold = float(th)
`,
      checkPython: `assert 0.15 <= float(best_threshold) <= 0.85, "best_threshold ngoài khoảng quét."
assert float(best_f1) >= float(f1_default_05), "best_f1 phải >= f1 ở ngưỡng 0.5."
assert float(best_f1) > 0.35, f"best_f1={best_f1:.3f} quá thấp."`,
    },
  },
];
