import { LessonDefinition } from '../../types/curriculum';

export const TRACK12_KAGGLE_LESSONS: LessonDefinition[] = [
  {
    id: 'L102',
    order: 102,
    trackId: 'track12_kaggle',
    title: 'Bước 1 Cuộc thi Kaggle: Khảo sát Schema, Kiểm tra Khớp Train–Test & Target',
    subtitle: 'Checklist 10 điểm đầu tiên trước khi viết một dòng code huấn luyện nào',
    difficulty: 'Trung bình',
    libraries: ['Pandas', 'NumPy'],
    estimatedMinutes: 20,
    datasetIds: ['kaggle_loan_train', 'kaggle_loan_test'],
    objectives: [
      'Đối chiếu danh sách cột giữa `loan_train.csv` và `loan_test.csv` để tìm cột ID và cột Target.',
      'Kiểm tra xem có hạng mục lạ nào xuất hiện ở Test mà Train không có hay không.',
    ],
    sections: [
      {
        title: '1. Nguyên tắc vàng phút đầu tiên nhận Dataset Kaggle',
        contentMarkdown:
          'Luôn kiểm tra 4 thứ trước tiên:\n1. Khác biệt cột `set(train.columns) - set(test.columns)` -> xác định chính xác cột Target.\n2. Tỷ lệ giá trị thiếu ở **cả Train lẫn Test** (nhiều cuộc thi cột A sạch ở Train nhưng khuyết 60% ở Test!).\n3. Phân phối `id` có trùng lặp hoặc chồng lấn giữa Train và Test không.\n4. Mất cân bằng của Target.',
      },
    ],
    exercise: {
      prompt: 'Kiểm tra cặp `loan_train.csv` và `loan_test.csv`: xác định cột chỉ có ở train (`target_cols`), kiểm tra tỷ lệ thiếu lớn nhất ở test (`max_test_missing_pct`), và kiểm tra xem hai tập `id` có giao nhau hay không (`id_overlap`).',
      requirements: [
        '`target_cols == ["LoanStatus"]`.',
        '`id_overlap == 0`.',
        '`max_test_missing_pct >= 0.0` (tính theo %).',
      ],
      starterCode: `train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

target_cols = []
id_overlap = -1
max_test_missing_pct = -1.0
`,
      hintText: '`target_cols = sorted(list(set(train_df.columns) - set(test_df.columns)))`, `id_overlap = len(set(train_df["id"]) & set(test_df["id"]))`, `max_test_missing_pct = float((test_df.isna().mean() * 100).max())`.',
      solutionCode: `train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

target_cols = sorted(list(set(train_df.columns) - set(test_df.columns)))
id_overlap = len(set(train_df['id']) & set(test_df['id']))
max_test_missing_pct = float((test_df.isna().mean() * 100.0).max())
`,
      checkPython: `assert target_cols == ['LoanStatus'], f"target_cols sai: {target_cols}."
assert id_overlap == 0, "id giữa train và test bị trùng!"
assert max_test_missing_pct >= 0.0, "Chưa tính max_test_missing_pct."`,
    },
  },
  {
    id: 'L103',
    order: 103,
    trackId: 'track12_kaggle',
    title: 'Bước 2: Dựng Fast E2E Baseline & Xuất `submission.csv` Hợp lệ đầu tiên',
    subtitle: 'Đi hết 100% quy trình nộp bài ngay trong 15 phút đầu để khóa định dạng Submission',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train', 'kaggle_loan_test'],
    objectives: [
      'Thiết lập Pipeline baseline + 5-fold Stratified CV cho `loan_train.csv`.',
      'Xuất file `submission.csv` có đúng 2 cột `["id", "LoanStatus"]`, đúng số dòng `120`, không có NaN.',
    ],
    sections: [
      {
        title: '1. Triết lý Baseline Sớm của Kaggle Grandmaster',
        contentMarkdown:
          'Sai lầm lớn nhất của người mới là dành 3 ngày làm Feature Engineering phức tạp trước khi thử nộp bài lần đầu. Hãy tạo **Fast End-to-End Baseline** càng sớm càng tốt để: (1) có mốc điểm CV tham chiếu, (2) chắc chắn pipeline tạo `submission.csv` đúng định dạng, đủ dòng, không NaN.',
      },
    ],
    exercise: {
      prompt: 'Train `ColumnTransformer + LogisticRegression` bằng 5-fold `StratifiedKFold` trên `loan_train.csv`, lấy trung bình xác suất dự đoán trên `loan_test.csv` qua 5 fold, lưu ra file `submission.csv` gồm đúng cột `["id", "LoanStatus"]` và ghi nhận `baseline_cv_auc`.',
      requirements: [
        'Tồn tại file `submission.csv` đọc lên có đúng 120 dòng và cột `["id", "LoanStatus"]`.',
        'Không có giá trị NaN và `LoanStatus` nằm gọn trong `[0, 1]`.',
        '`baseline_cv_auc >= 0.65`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = train_df[num_cols + cat_cols]
y = train_df['LoanStatus'].values
X_sub = test_df[num_cols + cat_cols]

baseline_cv_auc = 0.0
# Chạy 5-fold CV, gom oof_preds & sub_preds, lưu submission.csv
`,
      hintText: 'Tạo hàm `make_pipe()` trả về `Pipeline([("prep", ColumnTransformer(...)), ("clf", LogisticRegression(max_iter=500))])`. Trong vòng 5 fold cộng dồn `sub_preds += pipe.predict_proba(X_sub)[:, 1] / 5`. Cuối cùng `pd.DataFrame({"id": test_df["id"], "LoanStatus": sub_preds}).to_csv("submission.csv", index=False)`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score

train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = train_df[num_cols + cat_cols]
y = train_df['LoanStatus'].values
X_sub = test_df[num_cols + cat_cols]

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_preds = np.zeros(len(train_df))
sub_preds = np.zeros(len(test_df))

for tr, va in skf.split(X, y):
    prep = ColumnTransformer([
        ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
        ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore'))]), cat_cols),
    ])
    pipe = Pipeline([('prep', prep), ('clf', LogisticRegression(max_iter=500))])
    pipe.fit(X.iloc[tr], y[tr])
    oof_preds[va] = pipe.predict_proba(X.iloc[va])[:, 1]
    sub_preds += pipe.predict_proba(X_sub)[:, 1] / 5.0

baseline_cv_auc = float(roc_auc_score(y, oof_preds))
pd.DataFrame({'id': test_df['id'], 'LoanStatus': sub_preds}).to_csv('submission.csv', index=False)
`,
      checkPython: `assert os.path.exists('submission.csv'), "Chưa xuất file submission.csv."
sub_chk = pd.read_csv('submission.csv')
assert list(sub_chk.columns) == ['id', 'LoanStatus'], f"Cột submission sai: {list(sub_chk.columns)}."
assert len(sub_chk) == len(pd.read_csv('loan_test.csv')), "Số dòng submission chưa khớp loan_test.csv."
assert sub_chk['LoanStatus'].isna().sum() == 0, "submission còn NaN."
assert float(baseline_cv_auc) >= 0.65, f"baseline_cv_auc={baseline_cv_auc:.3f} quá thấp."`,
    },
  },
  {
    id: 'L104',
    order: 104,
    trackId: 'track12_kaggle',
    title: 'Bước 3: Adversarial Validation (Phát hiện Phân phối Train khác Test)',
    subtitle: 'Kỹ thuật gán nhãn Train=0, Test=1 để kiểm tra Covariate Shift trước khi tin vào CV',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['housing', 'housing_test'],
    objectives: [
      'Gắn `is_test = 0` cho train và `is_test = 1` cho test, trộn chung rồi train mô hình phân biệt.',
      'Diễn giải `adv_auc`: nếu ~`0.50` -> Train & Test giống hệt nhau; nếu `> 0.75` -> phát hiện Drift / khác biệt phân phối nguy hiểm!',
    ],
    sections: [
      {
        title: '1. Làm sao biết CV ở nhà có phản ánh điểm Private Test không?',
        contentMarkdown:
          'Hãy bỏ cột Target và cột ID đi, ghép `train` (gán nhãn `0`) với `test` (gán nhãn `1`), rồi chạy `RandomForest` dự đoán `is_test` với CV 5-fold.\n- **`adv_auc ≈ 0.50`**: mô hình bó tay không phân biệt nổi mẫu nào từ train, mẫu nào từ test -> chúc mừng, CV cục bộ cực kỳ đáng tin!\n- **`adv_auc > 0.80`**: tập test khác phân phối với train -> cần kiểm tra cột nào khiến mô hình phân biệt được để loại bỏ hoặc điều chỉnh CV!',
      },
    ],
    exercise: {
      prompt: 'Chạy Adversarial Validation giữa `housing.csv` (bỏ `HouseId`, `SalePrice`) và `housing_test.csv` (bỏ `HouseId`). Dùng 5-fold CV với `HistGradientBoostingClassifier` trên các cột số chung (`["LotArea", "LivingArea", "Bedrooms", "YearBuilt", "DistCenterKm", "HasGarage"]`) và tính `adv_auc`.',
      requirements: [
        'Tạo nhãn `is_test` (`0` cho train, `1` cho test) và tính `adv_auc = roc_auc_score(is_test, oof_adv)`.',
        'Xác nhận `0.35 <= adv_auc <= 0.70` (xác nhận bộ dữ liệu Housing đồng phân phối giữa train và test).',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

tr = pd.read_csv('housing.csv')
te = pd.read_csv('housing_test.csv')
common_num = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']

X_adv = pd.concat([tr[common_num], te[common_num]], ignore_index=True)
y_adv = np.concatenate([np.zeros(len(tr)), np.ones(len(te))])

adv_auc = 0.0
`,
      hintText: 'Dùng `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` chạy `HistGradientBoostingClassifier(max_iter=50, max_depth=3, random_state=42)` thu thập `oof_adv`, rồi tính `roc_auc_score(y_adv, oof_adv)`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

tr = pd.read_csv('housing.csv')
te = pd.read_csv('housing_test.csv')
common_num = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']

X_adv = pd.concat([tr[common_num], te[common_num]], ignore_index=True)
y_adv = np.concatenate([np.zeros(len(tr)), np.ones(len(te))])

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_adv = np.zeros(len(X_adv))
for tr_i, va_i in skf.split(X_adv, y_adv):
    clf = HistGradientBoostingClassifier(max_iter=50, max_depth=3, random_state=42)
    clf.fit(X_adv.iloc[tr_i], y_adv[tr_i])
    oof_adv[va_i] = clf.predict_proba(X_adv.iloc[va_i])[:, 1]

adv_auc = float(roc_auc_score(y_adv, oof_adv))
`,
      checkPython: `assert 0.35 <= float(adv_auc) <= 0.70, f"adv_auc={adv_auc:.3f} ngoài vùng đồng phân phối kỳ vọng."`,
    },
  },
  {
    id: 'L105',
    order: 105,
    trackId: 'track12_kaggle',
    title: 'Bước 4: Quy trình Cải tiến Đặc trưng Có Kiểm chứng (CV-Driven Iterative FE)',
    subtitle: 'Giữ lại feature giúp tăng CV, thẳng tay xóa feature làm giảm hoặc đi ngang CV',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Thiết kế thí nghiệm A/B chuẩn mực trên cùng bộ chia Fold (`random_state=42` cố định).',
      'Xây dựng hàm `eval_features(X, y)` đo delta CV AUC giữa Baseline Features và Engineered Features.',
    ],
    sections: [
      {
        title: '1. Kỷ luật vàng: Luôn giữ nguyên Seed & Fold khi A/B Test',
        contentMarkdown:
          'Nếu bản v1 dùng `seed=42` còn bản v2 dùng `seed=99`, bạn không bao giờ biết sự thay đổi điểm là do feature mới hay do cách chia dữ liệu khác đi. Mọi thí nghiệm lặp trên Kaggle phải chạy trên **cùng một đối tượng `cv` cố định**!',
      },
    ],
    exercise: {
      prompt: 'Trên `loan_train.csv`, giữ cố định `skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` với `HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42)`. Đo `auc_base` (5 cột số gốc) và `auc_fe` (thêm `TotalIncome`, `LoanToIncome`, `IncomePerYear = TotalIncome / (EmploymentYears + 1)`). Tính `delta_auc = auc_fe - auc_base`.',
      requirements: [
        'Cả hai lần đo dùng chung một đối tượng `skf`.',
        'Tính chính xác `auc_base`, `auc_fe`, `delta_auc`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv').copy()
base_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
y = df['LoanStatus']
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# 1) Đo auc_base trên base_cols
# 2) Tạo TotalIncome, LoanToIncome, IncomePerYear và đo auc_fe
auc_base = 0.0
auc_fe = 0.0
delta_auc = 0.0
`,
      hintText: 'Tạo các cột mới bằng `.fillna(0)` để tính tỷ số sạch, rồi chạy `cross_val_score(HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42), X, y, cv=skf, scoring="roc_auc").mean()`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv').copy()
base_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
y = df['LoanStatus']
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

model = HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42)
auc_base = float(cross_val_score(model, df[base_cols], y, cv=skf, scoring='roc_auc').mean())

df['TotalIncome'] = df['ApplicantIncome'].fillna(0) + df['CoapplicantIncome'].fillna(0)
df['LoanToIncome'] = df['LoanAmount'].fillna(0) / (df['TotalIncome'] + 1.0)
df['IncomePerYear'] = df['TotalIncome'] / (df['EmploymentYears'].fillna(0) + 1.0)
fe_cols = base_cols + ['TotalIncome', 'LoanToIncome', 'IncomePerYear']

auc_fe = float(cross_val_score(model, df[fe_cols], y, cv=skf, scoring='roc_auc').mean())
delta_auc = auc_fe - auc_base
`,
      checkPython: `assert float(auc_base) >= 0.65 and float(auc_fe) >= 0.65, "AUC quá thấp."
assert abs((auc_fe - auc_base) - delta_auc) < 1e-8, "delta_auc phải bằng auc_fe - auc_base."`,
    },
  },
  {
    id: 'L106',
    order: 106,
    trackId: 'track12_kaggle',
    title: 'Bước 5: Systematic Hyperparameter Tuning & Kiểm soát Overfitting',
    subtitle: 'Thu hẹp khoảng cách Train – Val trong quá trình tinh chỉnh siêu tham số Boosting',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Theo dõi **cả** `mean_train_score` và `mean_test_score` bằng `return_train_score=True` trong `GridSearchCV`/`RandomizedSearchCV`.',
      'Hiểu dấu hiệu nhận diện bộ tham số quá tham lam (`train_score = 0.99`, `val_score` bắt đầu đi xuống).',
    ],
    sections: [
      {
        title: '1. Tại sao `return_train_score=True` giúp cứu bạn khỏi chọn nhầm tham số?',
        contentMarkdown:
          'Nếu cấu hình A đạt `val=0.812, train=0.998` còn cấu hình B đạt `val=0.810, train=0.855`, nhiều Grandmaster sẽ chọn **cấu hình B** vì độ chênh lệch khái quát nhỏ hơn rất nhiều, ít rủi ro rung lắc trên Private Leaderboard!',
      },
    ],
    exercise: {
      prompt: 'Chạy `GridSearchCV` với `return_train_score=True` trên `HistGradientBoostingClassifier` cho `loan_train.csv` (numeric cols) dò `max_depth: [2, 3, 5]` và `l2_regularization: [0.0, 5.0]`. Trích xuất bảng `cv_summary` chứa `params, mean_train_score, mean_test_score, gap = train - test`.',
      requirements: [
        '`len(cv_summary) == 6` tổ hợp.',
        '`best_val_auc >= 0.68`.',
      ],
      starterCode: `from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']

grid = GridSearchCV(
    HistGradientBoostingClassifier(max_iter=80, learning_rate=0.06, random_state=42),
    param_grid={'max_depth': [2, 3, 5], 'l2_regularization': [0.0, 5.0]},
    cv=StratifiedKFold(n_splits=4, shuffle=True, random_state=42),
    scoring='roc_auc',
    return_train_score=True,
)
cv_summary = pd.DataFrame()
best_val_auc = 0.0
`,
      hintText: '`grid.fit(X, y)`, `cv_summary = pd.DataFrame(grid.cv_results_)[["params", "mean_train_score", "mean_test_score"]]`, `cv_summary["gap"] = cv_summary["mean_train_score"] - cv_summary["mean_test_score"]`, `best_val_auc = float(grid.best_score_)`.',
      solutionCode: `from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']

grid = GridSearchCV(
    HistGradientBoostingClassifier(max_iter=80, learning_rate=0.06, random_state=42),
    param_grid={'max_depth': [2, 3, 5], 'l2_regularization': [0.0, 5.0]},
    cv=StratifiedKFold(n_splits=4, shuffle=True, random_state=42),
    scoring='roc_auc',
    return_train_score=True,
)
grid.fit(X, y)
cv_summary = pd.DataFrame(grid.cv_results_)[['params', 'mean_train_score', 'mean_test_score']].copy()
cv_summary['gap'] = cv_summary['mean_train_score'] - cv_summary['mean_test_score']
best_val_auc = float(grid.best_score_)
`,
      checkPython: `assert len(cv_summary) == 6, "Phải có đúng 6 tổ hợp 3x2."
assert {'mean_train_score', 'mean_test_score', 'gap'}.issubset(cv_summary.columns), "cv_summary thiếu cột."
assert float(best_val_auc) >= 0.68, f"best_val_auc={best_val_auc:.3f} quá thấp."`,
    },
  },
  {
    id: 'L107',
    order: 107,
    trackId: 'track12_kaggle',
    title: 'Bước 6: Multi-Model OOF Ensembling, Tìm Trọng số Tối ưu & Post-Processing',
    subtitle: 'Tối ưu trọng số Blending trực tiếp trên OOF Predictions và xuất Submission cuối cùng',
    difficulty: 'Chuyên sâu',
    libraries: ['Scikit-Learn', 'NumPy', 'Pandas'],
    estimatedMinutes: 35,
    datasetIds: ['kaggle_loan_train', 'kaggle_loan_test'],
    objectives: [
      'Tạo 3 vector OOF và Test predictions từ 3 họ mô hình: `LogisticRegression`, `RandomForestClassifier`, `HistGradientBoostingClassifier`.',
      'Quét tìm bộ trọng số `w1, w2, w3` tối đa hóa OOF ROC-AUC, sau đó áp chính bộ trọng số đó lên `loan_test.csv`.',
    ],
    sections: [
      {
        title: '1. Tại sao Rank Averaging / Weighted Blending là vũ khí về đích?',
        contentMarkdown:
          'Dùng 3 mô hình hoàn toàn khác kiến trúc cùng học trên 5 fold giống hệt nhau tạo ra bộ `oof_m1, oof_m2, oof_m3`. Chỉ cần quét lưới `(w1, w2, w3)` sao cho `w1 + w2 + w3 = 1` để tối ưu điểm OOF, rồi áp công thức y hệt lên tập `test`: đây là chiêu tăng +0.005 đến +0.015 điểm Leaderboard ổn định nhất!',
      },
    ],
    exercise: {
      prompt: 'Chạy 5-fold CV thu thập `oof_lr`, `oof_rf`, `oof_hgb` (và dự đoán test tương ứng `sub_lr`, `sub_rf`, `sub_hgb`) trên `loan_train.csv` + `loan_test.csv`. Tìm bộ trọng số `(w1, w2, w3)` (mỗi `w` bội số `0.1`, tổng = `1.0`) tối đa hóa `roc_auc_score(y, w1*oof_lr + w2*oof_rf + w3*oof_hgb)` và lưu kết quả cuối cùng ra `final_submission.csv`.',
      requirements: [
        'Tạo được 3 vector OOF và tìm `best_weights` có tổng bằng `1.0`.',
        '`oof_blend_auc >= max(auc_lr, auc_rf, auc_hgb) - 1e-6`.',
        'Xuất `final_submission.csv` đúng 120 dòng, cột `["id", "LoanStatus"]`, không NaN.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')
num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = train_df[num_cols + cat_cols]
y = train_df['LoanStatus'].values
X_sub = test_df[num_cols + cat_cols]

best_weights = (0.0, 0.0, 1.0)
oof_blend_auc = 0.0
`,
      hintText: 'Ở mỗi fold tạo `prep` cho LR/RF và `OrdinalEncoder` (hoặc numeric + OHE) cho HGB, lấy 3 vector `oof` và 3 vector `sub`. Sau đó lặp `w1 in np.linspace(0, 1, 11)` và `w2 in np.linspace(0, 1 - w1, ...)` để tìm `w1, w2, w3` tối ưu `roc_auc_score`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')
num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = train_df[num_cols + cat_cols]
y = train_df['LoanStatus'].values
X_sub = test_df[num_cols + cat_cols]

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_lr = np.zeros(len(X)); sub_lr = np.zeros(len(X_sub))
oof_rf = np.zeros(len(X)); sub_rf = np.zeros(len(X_sub))
oof_hgb = np.zeros(len(X)); sub_hgb = np.zeros(len(X_sub))

def make_prep():
    return ColumnTransformer([
        ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
        ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_cols),
    ])

for tr, va in skf.split(X, y):
    m_lr = Pipeline([('p', make_prep()), ('c', LogisticRegression(max_iter=500))]).fit(X.iloc[tr], y[tr])
    m_rf = Pipeline([('p', make_prep()), ('c', RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42))]).fit(X.iloc[tr], y[tr])
    m_hgb = Pipeline([('p', make_prep()), ('c', HistGradientBoostingClassifier(max_iter=70, max_depth=4, random_state=42))]).fit(X.iloc[tr], y[tr])
    oof_lr[va] = m_lr.predict_proba(X.iloc[va])[:, 1]; sub_lr += m_lr.predict_proba(X_sub)[:, 1] / 5.0
    oof_rf[va] = m_rf.predict_proba(X.iloc[va])[:, 1]; sub_rf += m_rf.predict_proba(X_sub)[:, 1] / 5.0
    oof_hgb[va] = m_hgb.predict_proba(X.iloc[va])[:, 1]; sub_hgb += m_hgb.predict_proba(X_sub)[:, 1] / 5.0

best_auc = -1.0
best_weights = (0.0, 0.0, 1.0)
for i in range(11):
    for j in range(11 - i):
        k = 10 - i - j
        w1, w2, w3 = i / 10.0, j / 10.0, k / 10.0
        auc = float(roc_auc_score(y, w1 * oof_lr + w2 * oof_rf + w3 * oof_hgb))
        if auc > best_auc:
            best_auc = auc
            best_weights = (w1, w2, w3)

oof_blend_auc = best_auc
final_sub = best_weights[0] * sub_lr + best_weights[1] * sub_rf + best_weights[2] * sub_hgb
pd.DataFrame({'id': test_df['id'], 'LoanStatus': final_sub}).to_csv('final_submission.csv', index=False)
`,
      checkPython: `assert abs(sum(best_weights) - 1.0) < 1e-6, "Tổng 3 trọng số phải bằng 1.0."
max_single = max(roc_auc_score(y, oof_lr), roc_auc_score(y, oof_rf), roc_auc_score(y, oof_hgb))
assert oof_blend_auc >= max_single - 1e-6, "Ensemble phải >= mọi model đơn lẻ trên OOF."
assert os.path.exists('final_submission.csv'), "Chưa xuất final_submission.csv."
fs = pd.read_csv('final_submission.csv')
assert len(fs) == len(test_df) and fs['LoanStatus'].isna().sum() == 0, "final_submission.csv không hợp lệ."`,
    },
  },
  {
    id: 'L108',
    order: 108,
    trackId: 'track12_kaggle',
    title: 'Bước 7 (Tổng kết): Đóng gói Pipeline `.pkl`, Inference API & Báo cáo Thí nghiệm',
    subtitle: 'Hoàn thiện sản phẩm ML Production: Train -> Serialize -> Reload -> Predict Single & Batch',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['housing', 'housing_test'],
    objectives: [
      'Đóng gói trọn vẹn `ColumnTransformer` + `HistGradientBoostingRegressor` thành 1 file `housing_pipeline.pkl` bằng `pickle` / `joblib`.',
      'Nạp lại từ đĩa ở môi trường sạch và chạy inference lên `housing_test.csv` xuất `housing_submission.csv` + dictionary báo cáo thí nghiệm JSON.',
    ],
    sections: [
      {
        title: '1. Chặng cuối cùng của Kỹ sư ML: Reproducibility & Packaging',
        contentMarkdown:
          'Một dự án ML hoàn chỉnh không kết thúc ở điểm trên Notebook, mà ở việc bất kỳ ai cũng có thể nạp duy nhất file **`pipeline.pkl`**, đưa vào một DataFrame thô (chứa cả NaN lẫn chuỗi phân loại chưa mã hóa), và nhận ngay kết quả dự đoán chính xác!\n\nChúc mừng bạn đã đi trọn hành trình **108 bài học từ NumPy cơ bản đến Kaggle & Deep Learning hoàn chỉnh!**',
      },
    ],
    exercise: {
      prompt: 'Xây dựng và fit `full_pipeline` (`ColumnTransformer` xử lý cả số và `Neighborhood` + `HistGradientBoostingRegressor`) trên toàn bộ `housing.csv`. Lưu ra file `housing_pipeline.pkl` bằng `pickle`, đọc lại thành `loaded_pipe`, dự đoán lên `housing_test.csv` xuất `housing_submission.csv` (`HouseId, SalePrice`), và tạo dict `report` chứa `cv_r2`, `n_train_rows`, `n_test_rows`.',
      requirements: [
        'Tồn tại `housing_pipeline.pkl` và `loaded_pipe.predict(housing_test)` khớp 100% `full_pipeline.predict(housing_test)`.',
        'Tồn tại `housing_submission.csv` đúng 80 dòng, cột `["HouseId", "SalePrice"]`, mọi giá trị `SalePrice > 0`.',
        'Dict `report` chứa `cv_r2 >= 0.60`.',
      ],
      starterCode: `import pickle
from sklearn.model_selection import cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor

train_df = pd.read_csv('housing.csv')
test_df = pd.read_csv('housing_test.csv')

num_cols = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
cat_cols = ['Neighborhood']
X = train_df[num_cols + cat_cols]
y = train_df['SalePrice']

full_pipeline = None
loaded_pipe = None
report = {}
`,
      hintText: 'Dựng `prep = ColumnTransformer([("num", SimpleImputer(strategy="median"), num_cols), ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols)])`, `full_pipeline = Pipeline([("prep", prep), ("reg", HistGradientBoostingRegressor(max_iter=100, max_depth=4, random_state=42))])`, tính `cv_r2 = float(cross_val_score(full_pipeline, X, y, cv=5, scoring="r2").mean())`, rồi `.fit(X, y)` trên full train, `pickle.dump` / `pickle.load` và ghi `housing_submission.csv`.',
      solutionCode: `import pickle
from sklearn.model_selection import cross_val_score
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.ensemble import HistGradientBoostingRegressor

train_df = pd.read_csv('housing.csv')
test_df = pd.read_csv('housing_test.csv')

num_cols = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
cat_cols = ['Neighborhood']
X = train_df[num_cols + cat_cols]
y = train_df['SalePrice']

prep = ColumnTransformer([
    ('num', SimpleImputer(strategy='median'), num_cols),
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
])
full_pipeline = Pipeline([
    ('prep', prep),
    ('reg', HistGradientBoostingRegressor(max_iter=100, max_depth=4, random_state=42)),
])

cv_r2 = float(cross_val_score(full_pipeline, X, y, cv=5, scoring='r2').mean())
full_pipeline.fit(X, y)

with open('housing_pipeline.pkl', 'wb') as f:
    pickle.dump(full_pipeline, f)

with open('housing_pipeline.pkl', 'rb') as f:
    loaded_pipe = pickle.load(f)

test_preds = loaded_pipe.predict(test_df[num_cols + cat_cols])
pd.DataFrame({'HouseId': test_df['HouseId'], 'SalePrice': test_preds}).to_csv('housing_submission.csv', index=False)

report = {
    'cv_r2': cv_r2,
    'n_train_rows': int(len(train_df)),
    'n_test_rows': int(len(test_df)),
}
`,
      checkPython: `assert os.path.exists('housing_pipeline.pkl'), "Chưa lưu file housing_pipeline.pkl."
assert os.path.exists('housing_submission.csv'), "Chưa xuất housing_submission.csv."
assert np.allclose(full_pipeline.predict(test_df[num_cols + cat_cols]), loaded_pipe.predict(test_df[num_cols + cat_cols])), "Model sau khi load không khớp."
sub_h = pd.read_csv('housing_submission.csv')
assert list(sub_h.columns) == ['HouseId', 'SalePrice'] and len(sub_h) == 80, "housing_submission.csv sai định dạng hoặc thiếu dòng."
assert (sub_h['SalePrice'] > 0).all(), "Giá nhà dự đoán phải dương."
assert float(report.get('cv_r2', 0)) >= 0.60, f"cv_r2={report.get('cv_r2')} quá thấp."`,
    },
  },
];
