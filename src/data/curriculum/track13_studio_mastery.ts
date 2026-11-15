import { LessonDefinition } from '../../types/curriculum';

export const TRACK13_STUDIO_MASTERY_LESSONS: LessonDefinition[] = [
  {
    id: 'S001',
    order: 120,
    trackId: 'track13_studio_mastery',
    title: 'Bản Đồ Toàn Tập 12 Mô Hình Trong AMLICS Studio & Khi Nào Chọn Gì',
    subtitle: 'Tra cứu chi tiết ưu/nhược điểm cả 12 ModelFamily trên Sidebar Studio: từ Linear đến CatBoost & MLP',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'XGBoost', 'LightGBM', 'CatBoost'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train', 'housing'],
    objectives: [
      'Nắm vững toàn bộ 12 lựa chọn trong mục Model Family của AMLICS Studio.',
      'Phân loại 12 mô hình thành 4 nhóm kiến trúc: Tuyến tính/Khoảng cách, Rừng cây Độc lập (Bagging), Gradient Boosting, và Mạng Nơ-ron.',
      'Biết chọn đúng model khởi điểm theo kích thước dữ liệu (`<500` dòng vs `>50.000` dòng), có `NaN` hay không, và yêu cầu tốc độ.',
    ],
    sections: [
      {
        title: '1. Bảng đối chiếu đầy đủ 12 Model Families của AMLICS Studio',
        contentMarkdown:
          '| # | Model trên AMLICS Studio | Class Classification / Regression | Cần Scale? | Xử lý NaN gốc? | Khi nào nên chọn nhất? |\n| :--- | :--- | :--- | :---: | :---: | :--- |\n| 1 | `HistGradientBoosting` | `HistGradientBoostingClassifier/Regressor` | Không | Có | **Mặc định đa năng**: chạy nhanh trên cả Browser Pyodide lẫn Cloud |\n| 2 | `GradientBoosting` | `GradientBoostingClassifier/Regressor` | Không | Không | Dữ liệu nhỏ–vừa (`<5k` dòng), cần tinh chỉnh `subsample` |\n| 3 | `RandomForest` | `RandomForestClassifier/Regressor` | Không | Không | Baseline cây chắc chắn, ít phải chỉnh nhiều tham số |\n| 4 | `ExtraTrees` | `ExtraTreesClassifier/Regressor` | Không | Không | Bảng nhiều biến số liên tục có nhiễu, chạy nhanh hơn RF |\n| 5 | `DecisionTree` | `DecisionTreeClassifier/Regressor` | Không | Không | Cần luật giải thích rõ ràng (`if-else`) cho nghiệp vụ |\n| 6 | `LinearModel` | `LogisticRegression` / `Ridge` | **Bắt buộc** | Không | Dữ liệu ít dòng (`<300`), quan hệ tuyến tính hoặc High-dim thưa |\n| 7 | `SVM` | `SVC(probability=True)` / `SVR` | **Bắt buộc** | Không | Ranh giới phi tuyến mượt trên tập nhỏ–vừa (`<5.000` dòng) |\n| 8 | `KNeighbors` | `KNeighborsClassifier/Regressor` | **Bắt buộc** | Không | Dữ liệu cụm địa lý/cảm biến ít chiều (`<= 15` cột) |\n| 9 | `MLPNeuralNet` | `MLPClassifier` / `MLPRegressor` | **Bắt buộc** | Không | Dữ liệu bảng đã chuẩn hóa kỹ, cần ranh giới liên tục mượt |\n| 10 | `LightGBM` | `LGBMClassifier/Regressor` | Không | Có | Kaggle bảng vừa–lớn (`>10k` dòng), tốc độ train siêu nhanh |\n| 11 | `XGBoost` | `XGBClassifier/Regressor` | Không | Có | Chuẩn mực thi đấu Kaggle, mạnh về Regularization chống overfit |\n| 12 | `CatBoost` | `CatBoostClassifier/Regressor` | Không | Có | **Bảng nhiều cột chữ/hạng mục (Categorical)** & ít bị Overfit |',
      },
      {
        title: '2. Công thức chọn nhanh trong 10 giây khi mới nạp CSV vào AMLICS',
        contentMarkdown:
          '1. **Bước đầu luôn bật `Compare 4 Models` (Auto-Tournament)** hoặc thử lần lượt `LinearModel`, `RandomForest`, `HistGradientBoosting` để biết dữ liệu có tính phi tuyến hay không.\n2. Nếu `LinearModel` thắng hoặc xấp xỉ cây → dữ liệu khá tuyến tính, hãy tập trung tạo **Interaction / Polynomial / Target Encoding**.\n3. Nếu nhóm Cây/Boosting bỏ xa `LinearModel` từ 5–10% → tập trung tối ưu **`HistGradientBoosting`, `LightGBM`, `XGBoost`, `CatBoost`** hoặc **Ensemble nhiều họ mô hình khác nhau**.',
      },
    ],
    exercise: {
      prompt:
        'Trên `loan_train.csv` (numeric + OneHot), hãy tự chạy một vòng so sánh **4 họ mô hình đại diện từ 4 kiến trúc khác nhau của Studio**: `LogisticRegression`, `KNeighborsClassifier(n_neighbors=9, weights="distance")`, `RandomForestClassifier(n_estimators=80, max_depth=6, random_state=42)`, và `HistGradientBoostingClassifier(max_iter=120, learning_rate=0.05, max_depth=5, random_state=42)`. Đánh giá ROC-AUC trên tập test split 80/20 vào dict `scores_by_family` và tìm `best_family`.',
      requirements: [
        '`scores_by_family` có đúng 4 khóa tên 4 họ mô hình với ROC-AUC là số thực > 0.55.',
        '`best_family` là tên mô hình đạt AUC cao nhất trong 4 mô hình.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus'])
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
prep = ColumnTransformer([
    ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
    ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_cols),
])

scores_by_family = {}
best_family = ""
`,
      hintText:
        'Khởi tạo dict `models = {"LinearModel": LogisticRegression(max_iter=500), "KNeighbors": KNeighborsClassifier(n_neighbors=9, weights="distance"), "RandomForest": RandomForestClassifier(n_estimators=80, max_depth=6, random_state=42), "HistGradientBoosting": HistGradientBoostingClassifier(max_iter=120, learning_rate=0.05, max_depth=5, random_state=42)}`, bọc mỗi cái vào `Pipeline([("prep", prep), ("clf", est)])` để train và chấm `roc_auc_score`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus'])
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
prep = ColumnTransformer([
    ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
    ('cat', Pipeline([('imp', SimpleImputer(strategy='most_frequent')), ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))]), cat_cols),
])

models = {
    'LinearModel': LogisticRegression(max_iter=500, random_state=42),
    'KNeighbors': KNeighborsClassifier(n_neighbors=9, weights='distance'),
    'RandomForest': RandomForestClassifier(n_estimators=80, max_depth=6, random_state=42),
    'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=120, learning_rate=0.05, max_depth=5, random_state=42),
}

scores_by_family = {}
for name, est in models.items():
    p = Pipeline([('prep', prep), ('clf', est)]).fit(X_tr, y_tr)
    scores_by_family[name] = float(roc_auc_score(y_te, p.predict_proba(X_te)[:, 1]))

best_family = max(scores_by_family, key=scores_by_family.get)
`,
      checkPython: `assert set(scores_by_family.keys()) == {'LinearModel', 'KNeighbors', 'RandomForest', 'HistGradientBoosting'}
assert all(0.55 < v <= 1.0 for v in scores_by_family.values())
assert best_family == max(scores_by_family, key=scores_by_family.get)`,
    },
  },
  {
    id: 'S002',
    order: 121,
    trackId: 'track13_studio_mastery',
    title: 'Giải Mã Từng Thanh Trượt Hyperparameter Trong AMLICS Studio',
    subtitle: 'Hiểu sâu nEstimators, learningRate, maxDepth, minSamplesLeaf, l2Regularization, subsample & earlyStopping',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'XGBoost', 'LightGBM'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Biết chính xác mỗi thanh trượt ở Bước 4 bên trái Studio ánh xạ tới tham số nào của từng thuật toán (`C`, `alpha`, `num_leaves`, `max_iter`, `reg_lambda`).',
      'Hiểu bản chất chiều tăng/giảm độ phức tạp (Model Complexity) của từng tham số để không chỉnh mù.',
    ],
    sections: [
      {
        title: '1. Từ điển ánh xạ 8 Hyperparameters từ UI Studio sang Python',
        contentMarkdown:
          '| Tham số trên UI Studio | Tác động khi TĂNG giá trị | Tương ứng với mô hình cụ thể |\n| :--- | :--- | :--- |\n| **`nEstimators`** (`50–1000`) | Tăng số lượng cây (hoặc `max_iter` của HistGB/MLP) | Boosting cần tăng cùng lúc khi giảm `learningRate`; RF/ET chỉ cần `150–400` |\n| **`learningRate`** (`0.005–0.3`) | Mỗi cây sửa lỗi mạnh hơn → học nhanh hơn nhưng dễ Overfit | Giảm xuống `0.02–0.05` + tăng `nEstimators` + bật `earlyStopping` |\n| **`maxDepth`** (`2–16`) | Cây sâu hơn, học tương tác phức tạp hơn | Boosting đặt nhỏ (`3–7`); RF/ET đặt sâu hơn (`8–16`); LightGBM tự đổi thành `num_leaves = min(127, 2^d - 1)`; KNN dùng làm `n_neighbors` |\n| **`minSamplesLeaf`** (`1–100`) | **Ép lá phải chứa tối thiểu nhiều mẫu** → **Chống Overfit mạnh** | Tập <500 dòng để `5–15`; tập >10k dòng đặt `20–80` |\n| **`l2Regularization`** (`0.0–10.0`) | Phạt nặng trọng số lớn → **Làm mượt & Chống Overfit** | Trong Studio: `Logistic/SVM` lấy `C = 1 / l2Regularization`; `Ridge/MLP` lấy trực tiếp `alpha`; `XGB/LGBM` lấy `reg_lambda`; `CatBoost` lấy `l2_leaf_reg` |\n| **`subsample`** (`0.5–1.0`) | Mỗi cây Boosting chỉ lấy một phần ngẫu nhiên dòng/cột | Đặt `0.75–0.90` giúp tăng đa dạng giữa các cây và giảm Variance |\n| **`earlyStopping`** (`True/False`) | Tự dừng sớm khi Validation không cải thiện | Luôn bật khi dùng `nEstimators >= 300` với Boosting hoặc MLP |\n| **`randomState`** (`42`, `2026`...) | Khóa mầm ngẫu nhiên giúp lặp lại y hệt kết quả | Giữ cố định khi thử nghiệm Feature/Tuning; đổi nhiều seed khi Ensemble |',
        callout: {
          type: 'formula',
          title: 'Quy tắc vàng nghịch đảo giữa l2Regularization và C',
          text: 'Trong `LogisticRegression` và `SVC`, tham số **`C` tỷ lệ nghịch với độ phạt L2** ($C = 1/\\lambda$). Studio tự tính `C = 1.0 / max(l2Regularization, 0.05)` giúp bạn tăng thanh `l2Regularization` là luôn giảm Overfit đồng nhất cho mọi mô hình!',
        },
      },
    ],
    exercise: {
      prompt:
        'Thực nghiệm chứng minh mối quan hệ nghịch đảo trong `LinearModel` trên `bank_churn.csv`: với `l2_vals = [0.05, 1.0, 10.0]`, ánh xạ sang `C = 1.0 / l2` cho `LogisticRegression` (kèm `StandardScaler()`, split 80/20 Stratified `random_state=42`), lưu giá trị tổng bình phương trọng số $\\sum w_j^2$ (`np.sum(coef ** 2)`) vào dict `weight_norms`. Chứng minh khi `l2` tăng từ `0.05` lên `10.0`, norm trọng số **giảm dần chặt** (`norm(0.05) > norm(1.0) > norm(10.0)`).',
      requirements: [
        'Tính `weight_norms = {0.05: ..., 1.0: ..., 10.0: ...}` bằng `float(np.sum(clf.coef_ ** 2))`.',
        'Xác nhận `weight_norms[0.05] > weight_norms[1.0] > weight_norms[10.0]`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

sc = StandardScaler()
X_tr_s = sc.fit_transform(X_tr)

l2_vals = [0.05, 1.0, 10.0]
weight_norms = {}
# TODO: Với mỗi l2, fit LogisticRegression(C=1.0 / l2, max_iter=500, random_state=42) và lưu tổng bình phương coef_
`,
      hintText:
        'Trong vòng `for l2 in l2_vals:`, fit `clf = LogisticRegression(C=1.0 / l2, max_iter=500, random_state=42).fit(X_tr_s, y_tr)` rồi `weight_norms[l2] = float(np.sum(clf.coef_ ** 2))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

sc = StandardScaler()
X_tr_s = sc.fit_transform(X_tr)

l2_vals = [0.05, 1.0, 10.0]
weight_norms = {}
for l2 in l2_vals:
    clf = LogisticRegression(C=1.0 / l2, max_iter=500, random_state=42).fit(X_tr_s, y_tr)
    weight_norms[l2] = float(np.sum(clf.coef_ ** 2))
`,
      checkPython: `assert set(weight_norms.keys()) == {0.05, 1.0, 10.0}
assert weight_norms[0.05] > weight_norms[1.0] > weight_norms[10.0], "Khi l2 tăng (C giảm), norm trọng số phải giảm dần"`,
    },
  },
  {
    id: 'S003',
    order: 122,
    trackId: 'track13_studio_mastery',
    title: 'Chiến Lược Tối Ưu Tham Số Có Hệ Thống: Chữa Bệnh Overfitting & Underfitting',
    subtitle: 'Quy trình 4 bước của Kaggle Competitor: từ Baseline đến cấu hình tối ưu trên Leaderboard',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Đọc 4 chỉ số trên thẻ Leaderboard AMLICS (`CV Mean`, `CV Std`, `Train Score`, `Holdout`) để chẩn đoán bệnh ngay lập tức.',
      'Áp dụng đúng đơn thuốc cho từng bệnh: Overfitting (Variance cao) vs Underfitting (Bias cao) vs Bất ổn định (`CV Std` cao).',
    ],
    sections: [
      {
        title: '1. Cẩm nang Bắt bệnh & Kê đơn Tham số',
        contentMarkdown:
          '| Triệu chứng trên Leaderboard | Nguyên nhân | Cách chỉnh tham số ngay lập tức |\n| :--- | :--- | :--- |\n| **Train = 0.99, CV = 0.72** (`Gap > 0.10`) | **Overfitting nặng** (mô hình học thuộc nhiễu) | 1. Giảm `max_depth` (`10 -> 4`)<br>2. Tăng `min_samples_leaf` (`1 -> 15..30`)<br>3. Tăng `l2_regularization` (`0 -> 2..5`)<br>4. Giảm `subsample` (`1.0 -> 0.8`) |\n| **Train = 0.66, CV = 0.65** (Cả hai cùng thấp) | **Underfitting** (mô hình quá đơn giản hoặc thiếu feature) | 1. Đổi `LinearModel` sang `HistGradientBoosting` / `XGBoost`<br>2. Tăng `max_depth` (`3 -> 6`)<br>3. Giảm `min_samples_leaf`<br>4. Tạo thêm Ratio / Interaction Features |\n| **CV Std lớn** (`0.78 ± 0.09`) | Tập dữ liệu nhỏ/lệch phân phối | 1. Tăng `cvFolds` (`5 -> 10`) hoặc dùng `RepeatedStratifiedKFold`<br>2. Giảm `learning_rate` + Ensemble 2–3 mô hình khác họ |',
      },
    ],
    exercise: {
      prompt:
        'Trên `loan_train.csv` (numeric cols điền median), thực nghiệm "chữa bệnh Overfitting": khởi tạo một câyBoosting cấu hình quá hung hăng `bad_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.25, max_depth=12, min_samples_leaf=1, l2_regularization=0.0, random_state=42)` và một cấu hình đã điều chuẩn tốt `tuned_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.04, max_depth=4, min_samples_leaf=18, l2_regularization=3.0, random_state=42)`. Đo `gap_bad` vs `gap_tuned` (`train_auc - test_auc`) và `test_auc_tuned >= test_auc_bad` (hoặc `gap_tuned < gap_bad * 0.6`).',
      requirements: [
        'Đo AUC trên cả tập train và tập test (split 80/20 Stratified `random_state=42`) cho `bad_cfg` và `tuned_cfg`.',
        'Xác nhận `gap_tuned < gap_bad * 0.65` (Overfitting giảm mạnh nhờ điều chuẩn bộ tham số!).',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

bad_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.25, max_depth=12, min_samples_leaf=1, l2_regularization=0.0, random_state=42).fit(X_tr, y_tr)
tuned_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.04, max_depth=4, min_samples_leaf=18, l2_regularization=3.0, random_state=42).fit(X_tr, y_tr)

# TODO: Tính train/test AUC và gap_bad, gap_tuned
gap_bad = 0.0
gap_tuned = 0.0
`,
      hintText:
        '`gap_bad = roc_auc_score(y_tr, bad_cfg.predict_proba(X_tr)[:,1]) - roc_auc_score(y_te, bad_cfg.predict_proba(X_te)[:,1])`. Làm tương tự cho `tuned_cfg`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

bad_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.25, max_depth=12, min_samples_leaf=1, l2_regularization=0.0, random_state=42).fit(X_tr, y_tr)
tuned_cfg = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.04, max_depth=4, min_samples_leaf=18, l2_regularization=3.0, random_state=42).fit(X_tr, y_tr)

gap_bad = float(roc_auc_score(y_tr, bad_cfg.predict_proba(X_tr)[:, 1]) - roc_auc_score(y_te, bad_cfg.predict_proba(X_te)[:, 1]))
gap_tuned = float(roc_auc_score(y_tr, tuned_cfg.predict_proba(X_tr)[:, 1]) - roc_auc_score(y_te, tuned_cfg.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert gap_bad > 0.15, f"gap_bad={gap_bad:.3f} đáng lẽ phải rất cao (overfit)"
assert gap_tuned < gap_bad * 0.65, f"gap_tuned={gap_tuned:.3f} chưa giảm rõ so với gap_bad={gap_bad:.3f}"`,
    },
  },
  {
    id: 'S004',
    order: 123,
    trackId: 'track13_studio_mastery',
    title: 'Chỉnh Tay Code Hoàn Toàn Trong AMLICS & Đồng Bộ Ngược Code-to-Config',
    subtitle: 'Cách viết estimator tùy biến ngoài 12 model UI, thay tham số trực tiếp và giữ Cell 5 chạy trơn tru',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn'],
    estimatedMinutes: 20,
    datasetIds: ['iris_ext'],
    objectives: [
      'Biết cách tự thay thế `estimator` trong Cell 4 của AMLICS bằng bất kỳ mô hình nào (ví dụ `VotingClassifier`, `GaussianNB`, `AdaBoostClassifier`).',
      'Hiểu hợp đồng kết nối với Cell 5 Evaluate của AMLICS: chỉ cần định nghĩa biến `full_pipeline` hoặc `clf` / `model` có `.fit()` + `.predict()`.',
    ],
    sections: [
      {
        title: '1. Tự do viết bất kỳ mô hình nào trong AMLICS Studio',
        contentMarkdown:
          'Giao diện sidebar Studio giúp tạo nhanh 5 cell chuẩn, nhưng bạn **không bao giờ bị khóa vào 12 model sẵn có**. Trong AMLICS:\n- Khi bạn sửa trực tiếp số `n_estimators`, `max_depth`, `cv` trong Cell 3 / Cell 4 và bấm Run, hệ thống **Code-to-Config Sync** tự đọc ngược tham số về UI.\n- Khi bạn tự code hẳn một mô hình lạ như `VotingClassifier` hay `GaussianNB` (gán vào `full_pipeline` hoặc `clf`, `model`), Cell 5 Evaluate của AMLICS tự động dò bằng `introspect_active_model`, vẫn tính đúng CV/Holdout, vẫn vẽ biểu đồ ROC/Confusion Matrix, ghi vào Leaderboard và xuất `submission.csv`!',
      },
    ],
    exercise: {
      prompt:
        'Đóng vai tự code tay hoàn toàn không phụ thuộc UI: lắp một `VotingClassifier(voting="soft")` kết hợp 3 estimator có bản chất khác nhau (`GaussianNB()`, `LogisticRegression(max_iter=500)`, `RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42)`) vào biến tên `full_pipeline` cùng `StandardScaler()` trên `iris_extended.csv` (split 80/20 Stratified `random_state=42`). Đảm bảo `acc >= 0.90` và `hasattr(full_pipeline, "predict_proba")`.',
      requirements: [
        'Đặt tên biến cuối là `full_pipeline` (để tương thích trực tiếp với Cell 5 Evaluate của Studio!).',
        '`acc >= 0.90` trên tập Test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.naive_bayes import GaussianNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# TODO: Khởi tạo full_pipeline dùng VotingClassifier(voting='soft') gồm GaussianNB, LogisticRegression, RandomForestClassifier
full_pipeline = None
acc = 0.0
`,
      hintText:
        '`voting = VotingClassifier(estimators=[("nb", GaussianNB()), ("lr", LogisticRegression(max_iter=500)), ("rf", RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42))], voting="soft")` rồi `full_pipeline = make_pipeline(StandardScaler(), voting).fit(X_tr, y_tr)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.naive_bayes import GaussianNB
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import accuracy_score

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

voting = VotingClassifier(
    estimators=[
        ('nb', GaussianNB()),
        ('lr', LogisticRegression(max_iter=500, random_state=42)),
        ('rf', RandomForestClassifier(n_estimators=60, max_depth=4, random_state=42)),
    ],
    voting='soft',
)
full_pipeline = make_pipeline(StandardScaler(), voting).fit(X_tr, y_tr)
acc = float(accuracy_score(y_te, full_pipeline.predict(X_te)))
`,
      checkPython: `assert hasattr(full_pipeline, 'predict') and hasattr(full_pipeline, 'predict_proba')
assert float(acc) >= 0.90, f"acc={acc:.3f} quá thấp"`,
    },
  },
  {
    id: 'S005',
    order: 124,
    trackId: 'track13_studio_mastery',
    title: 'Làm Chủ Các Công Tắc Tiền Xử Lý Nâng Cao Trên Sidebar Studio',
    subtitle: 'LogTransform, PolynomialInteractions, VarianceThreshold, SelectKBest & SelectFromModel hoạt động ra sao',
    difficulty: 'Nâng cao',
    libraries: ['Preprocessing', 'Feature Eng', 'Scikit-Learn'],
    estimatedMinutes: 24,
    datasetIds: ['housing'],
    objectives: [
      'Hiểu chính xác từng checkbox ở Bước 2 AMLICS Studio: `addMissingIndicator`, `logTransformNumeric`, `polynomialInteractions`, `varianceThreshold`, và `featureSelection`.',
      'Xây dựng lại đúng luồng `Pipeline` đa bước của Cell 2 Studio và quan sát biến đổi số cột (`n_features_before -> n_features_after`).',
    ],
    sections: [
      {
        title: '1. Khi nào nên bật / tắt từng công tắc ở Bước 2 Studio?',
        contentMarkdown:
          '| Công tắc trên Studio UI | Khi nào NÊN bật? | Khi nào nên TẮT? |\n| :--- | :--- | :--- |\n| **`Missing Indicator`** (`addMissingIndicator`) | Việc thiếu dữ liệu tự nó mang tín hiệu (khách cố tình bỏ trống thu nhập) | Dữ liệu không có `NaN` hoặc `NaN` rải ngẫu nhiên hoàn toàn |\n| **`Log1p Numeric`** (`logTransformNumeric`) | Các cột lệch phải nặng (Giá, Doanh thu, Diện tích) khi chạy `LinearModel`/`MLP`/`SVM` | Bật cho mô hình tuyến tính là chính; mô hình cây thường không bắt buộc |\n| **`Polynomial Interactions`** | Quan hệ đường cong/tương tác cặp ($x_1 \\cdot x_2$) cho `Ridge`/`Logistic` | **TẮT khi bảng đã >40 cột** để tránh bùng nổ $p^2$ cột gây chậm & Overfit |\n| **`Variance Threshold`** | Loại các cột hằng số hoặc gần như không đổi | Hầu hết các bài bảng có cột nhị phân rác |\n| **`Feature Selection`** (`SelectKBest`/`SelectFromModel`) | Sau khi OHE + Poly đẻ ra hàng chục–trăm cột dư thừa | Bảng chỉ có vài cột gốc (`<10` cột) — chọn lọc nữa dễ mất thông tin |',
      },
    ],
    exercise: {
      prompt:
        'Trên `housing.csv` (numeric cols `["LotArea", "LivingArea", "Bedrooms", "YearBuilt", "DistCenterKm", "HasGarage"]`), dựng chuỗi pipeline mô phỏng Bước 2 nâng cao của Studio: `SimpleImputer(strategy="median", add_indicator=True)` → `PolynomialFeatures(degree=2, include_bias=False)` → `StandardScaler()` → `VarianceThreshold(threshold=0.0)` → `SelectKBest(score_func=f_regression, k=10)` → `Ridge(alpha=10.0)`. Split 80/20 `random_state=42`, xác nhận số feature đi qua SelectKBest đúng bằng `10` và `r2_pipe >= 0.72`.',
      requirements: [
        '`pipe.named_steps["sel"].get_support().sum() == 10`.',
        '`r2_pipe >= 0.72` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.feature_selection import VarianceThreshold, SelectKBest, f_regression
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

# TODO: Dựng Pipeline: imp -> poly -> sc -> vt -> sel -> reg
pipe = None
r2_pipe = 0.0
`,
      hintText:
        '`Pipeline([("imp", SimpleImputer(strategy="median", add_indicator=True)), ("poly", PolynomialFeatures(degree=2, include_bias=False)), ("sc", StandardScaler()), ("vt", VarianceThreshold(0.0)), ("sel", SelectKBest(f_regression, k=10)), ("reg", Ridge(alpha=10.0))])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.feature_selection import VarianceThreshold, SelectKBest, f_regression
from sklearn.linear_model import Ridge
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

pipe = Pipeline([
    ('imp', SimpleImputer(strategy='median', add_indicator=True)),
    ('poly', PolynomialFeatures(degree=2, include_bias=False)),
    ('sc', StandardScaler()),
    ('vt', VarianceThreshold(threshold=0.0)),
    ('sel', SelectKBest(score_func=f_regression, k=10)),
    ('reg', Ridge(alpha=10.0)),
]).fit(X_tr, y_tr)
r2_pipe = float(r2_score(y_te, pipe.predict(X_te)))
`,
      checkPython: `assert int(pipe.named_steps['sel'].get_support().sum()) == 10
assert float(r2_pipe) >= 0.72, f"r2_pipe={r2_pipe:.3f} quá thấp"`,
    },
  },
  {
    id: 'S006',
    order: 125,
    trackId: 'track13_studio_mastery',
    title: 'Auto-Tournament Benchmarker & Đọc Bảng Xếp Hạng Đa Mô Hình Chuẩn Khoa Học',
    subtitle: 'Cách chọn nhà vô địch dựa trên điểm CV Mean, Độ lệch chuẩn Std, Gap Overfitting và Thời gian Train',
    difficulty: 'Nâng cao',
    libraries: ['Validation/CV', 'Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Xây dựng một hàm Auto-Tournament mini giống nút `Compare 4 Models` trong bảng Leaderboard AMLICS.',
      'Biết cách cân bằng giữa **CV Mean cao** và **CV Std thấp** + **Gap `Train - CV` nhỏ**, không mù quáng chọn model điểm test hên xui cao hơn `0.001` nhưng không ổn định.',
    ],
    sections: [
      {
        title: '1. Nguyên tắc chọn Champion trên Leaderboard (Không chỉ nhìn mỗi Holdout!)',
        contentMarkdown:
          'Khi bấm **`Compare 4 Models`** ở cột phải AMLICS Studio, hệ thống chạy lần lượt nhiều họ mô hình trên **cùng 1 bộ chia Fold** và **cùng 1 bộ tiền xử lý**. Tiêu chí chọn nhà vô địch đúng chuẩn:\n1. **CV Mean** cao và **CV Std** nhỏ (`0.84 ± 0.02` tốt hơn `0.85 ± 0.09`).\n2. **Train - CV Gap** nhỏ (`< 0.08`) chứng tỏ không học vẹt.\n3. Nếu top 2 mô hình khác họ nhau (ví dụ `HistGradientBoosting` và `LogisticRegression`) đạt điểm sát nhau → **Blending 2 mô hình đó** hầu như luôn thắng cả hai trên dữ liệu thực!',
      },
    ],
    exercise: {
      prompt:
        'Viết vòng lặp Auto-Tournament 5-Fold `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` trên `bank_churn.csv` (numeric cols + `OneHotEncoder` cho `Country, Gender`) so sánh 4 ứng viên của Studio: `LinearModel`, `RandomForest`, `ExtraTrees`, `HistGradientBoosting`. Tạo bảng `tournament_df` gồm 4 cột `["Model", "CV_Mean", "CV_Std", "Train_Mean"]` sắp xếp giảm dần theo `CV_Mean`.',
      requirements: [
        '`tournament_df` có đúng 4 dòng ứng với 4 mô hình và được sắp giảm dần theo `CV_Mean`.',
        'Top 1 trong `tournament_df` đạt `CV_Mean >= 0.72`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier

df = pd.read_csv('bank_churn.csv')
X = df.drop(columns=['CustomerId', 'Churn'])
y = df['Churn']

num_cols = ['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
cat_cols = ['Country', 'Gender']
prep = ColumnTransformer([
    ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
])
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

# TODO: Chạy cross_validate(..., scoring='roc_auc', return_train_score=True) cho 4 model và tạo tournament_df
tournament_df = pd.DataFrame()
`,
      hintText:
        'Dùng `res = cross_validate(pipe, X, y, cv=cv, scoring="roc_auc", return_train_score=True)`, lấy `res["test_score"].mean()`, `res["test_score"].std()`, `res["train_score"].mean()`, ghép thành DataFrame rồi `.sort_values("CV_Mean", ascending=False).reset_index(drop=True)`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold, cross_validate
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier, HistGradientBoostingClassifier

df = pd.read_csv('bank_churn.csv')
X = df.drop(columns=['CustomerId', 'Churn'])
y = df['Churn']

num_cols = ['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
cat_cols = ['Country', 'Gender']
prep = ColumnTransformer([
    ('num', Pipeline([('imp', SimpleImputer(strategy='median')), ('sc', StandardScaler())]), num_cols),
    ('cat', OneHotEncoder(handle_unknown='ignore', sparse_output=False), cat_cols),
])
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

candidates = {
    'LinearModel': LogisticRegression(max_iter=500, random_state=42),
    'RandomForest': RandomForestClassifier(n_estimators=80, max_depth=6, random_state=42),
    'ExtraTrees': ExtraTreesClassifier(n_estimators=80, max_depth=8, random_state=42),
    'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=100, learning_rate=0.05, max_depth=4, min_samples_leaf=15, random_state=42),
}

rows = []
for name, est in candidates.items():
    pipe = Pipeline([('prep', prep), ('clf', est)])
    out = cross_validate(pipe, X, y, cv=cv, scoring='roc_auc', return_train_score=True)
    rows.append({
        'Model': name,
        'CV_Mean': float(out['test_score'].mean()),
        'CV_Std': float(out['test_score'].std()),
        'Train_Mean': float(out['train_score'].mean()),
    })

tournament_df = pd.DataFrame(rows).sort_values('CV_Mean', ascending=False).reset_index(drop=True)
`,
      checkPython: `assert list(tournament_df.columns) == ['Model', 'CV_Mean', 'CV_Std', 'Train_Mean']
assert len(tournament_df) == 4
assert tournament_df['CV_Mean'].is_monotonic_decreasing
assert float(tournament_df.loc[0, 'CV_Mean']) >= 0.72`,
    },
  },
];
