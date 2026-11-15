import { LessonDefinition } from '../../types/curriculum';

export const TRACK07_SKLEARN_LESSONS: LessonDefinition[] = [
  {
    id: 'L057',
    order: 57,
    trackId: 'track07_sklearn',
    title: 'Linear Regression (OLS), Hệ số Giải thích & R² vs RMSE',
    subtitle: 'Hiểu giải tích hồi quy tuyến tính và diễn giải từng trọng số mô hình',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Khớp `LinearRegression` trên các biến diện tích, khoảng cách của `housing.csv`.',
      'Đọc `coef_` và `intercept_`, kiểm tra dấu dương/âm có khớp thực tế kinh tế hay không.',
    ],
    sections: [
      {
        title: '1. Phương trình Hồi quy Đa biến & Ý nghĩa Trọng số',
        contentMarkdown:
          '$$\\hat{y} = w_1 x_1 + w_2 x_2 + \\dots + w_p x_p + b$$\nMỗi hệ số $w_j$ cho biết khi biến $x_j$ tăng thêm `1` đơn vị (giữ nguyên các biến khác), giá trị dự đoán $\\hat{y}$ thay đổi bao nhiêu. Ví dụ `DistCenterKm` (khoảng cách tới trung tâm) thường mang dấu **âm** vì càng xa trung tâm nhà càng rẻ.',
      },
    ],
    exercise: {
      prompt: 'Train `LinearRegression()` trên `housing.csv` với `["LivingArea", "Bedrooms", "DistCenterKm", "HasGarage"]` (điền thiếu bằng median trước hoặc Pipeline, split 80/20 `random_state=42`). Tính `r2` và `rmse` trên tập test, đồng thời lưu dict `coef_map` map tên cột -> hệ số.',
      requirements: [
        'Khớp `LinearRegression` và tính `r2 >= 0.55`, `rmse > 0`.',
        '`coef_map` có đủ 4 khóa tên cột với giá trị float.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, root_mean_squared_error

df = pd.read_csv('housing.csv')
feats = ['LivingArea', 'Bedrooms', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

reg = LinearRegression()
r2 = 0.0
rmse = 0.0
coef_map = {}
`,
      hintText: '`reg.fit(X_tr, y_tr)`; `preds = reg.predict(X_te)`; `r2 = float(r2_score(y_te, preds))`; `rmse = float(root_mean_squared_error(y_te, preds))`; `coef_map = {c: float(w) for c, w in zip(feats, reg.coef_)}`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import r2_score, root_mean_squared_error

df = pd.read_csv('housing.csv')
feats = ['LivingArea', 'Bedrooms', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

reg = LinearRegression().fit(X_tr, y_tr)
preds = reg.predict(X_te)
r2 = float(r2_score(y_te, preds))
rmse = float(root_mean_squared_error(y_te, preds))
coef_map = {c: float(w) for c, w in zip(feats, reg.coef_)}
`,
      checkPython: `assert float(r2) >= 0.55, f"r2={r2:.3f} quá thấp."
assert float(rmse) > 0, "rmse phải dương."
assert set(coef_map.keys()) == set(feats), "coef_map thiếu feature."
assert coef_map['LivingArea'] > 0 and coef_map['DistCenterKm'] < 0, "Dấu hệ số chưa khớp trực giác kinh tế."`,
    },
  },
  {
    id: 'L058',
    order: 58,
    trackId: 'track07_sklearn',
    title: 'Regularization: Ridge (L2), Lasso (L1) & ElasticNet',
    subtitle: 'Kiểm soát phương sai, chống đa cộng tuyến và tự động chọn đặc trưng bằng phạt L1/L2',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Phân biệt L2 (thu nhỏ tất cả trọng số về gần 0) và L1 (ép nhiều trọng số về 0 tuyệt đối).',
      'Dùng `RidgeCV` / `LassoCV` tự động chọn hệ số điều chuẩn `alpha`.',
    ],
    sections: [
      {
        title: '1. Khi đa thức hoặc nhiều feature tạo Overfitting',
        contentMarkdown:
          '- **Ridge ($\\alpha \\sum w_j^2$)**: ổn định khi các cột tương quan nhau mạnh (như `LivingArea` và `Bedrooms`).\n- **Lasso ($\\alpha \\sum |w_j|$)**: đóng vai trò dao tỉa đặc trưng tự động vì tạo nghiệm thưa (`w_j == 0`).\n- Luôn nhớ đặt `StandardScaler()` trước Ridge/Lasso để phạt công bằng các đơn vị đo khác nhau!',
      },
    ],
    exercise: {
      prompt: 'Tạo tập đa thức `PolynomialFeatures(degree=2)` trên 4 cột `["LotArea", "LivingArea", "Bedrooms", "DistCenterKm"]` của `housing.csv`, sau đó đánh giá `RidgeCV(alphas=[0.1, 1.0, 10.0, 100.0])` (sau `StandardScaler`) trên test 20%. Lưu `best_alpha` và `r2_ridge`.',
      requirements: [
        'Ghép `Pipeline([StandardScaler(), RidgeCV(alphas=[0.1, 1.0, 10.0, 100.0])])` chạy trên đặc trưng bậc 2.',
        'Lưu `best_alpha` đã chọn và đạt `r2_ridge >= 0.55`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import RidgeCV
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'DistCenterKm']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

best_alpha = 0.0
r2_ridge = 0.0
`,
      hintText: '`pipe = Pipeline([("poly", PolynomialFeatures(degree=2, include_bias=False)), ("sc", StandardScaler()), ("ridge", RidgeCV(alphas=[0.1, 1.0, 10.0, 100.0]))]).fit(X_tr, y_tr)`, lấy `best_alpha = float(pipe.named_steps["ridge"].alpha_)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import PolynomialFeatures, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import RidgeCV
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'DistCenterKm']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

pipe = Pipeline([
    ('poly', PolynomialFeatures(degree=2, include_bias=False)),
    ('sc', StandardScaler()),
    ('ridge', RidgeCV(alphas=[0.1, 1.0, 10.0, 100.0])),
])
pipe.fit(X_tr, y_tr)
best_alpha = float(pipe.named_steps['ridge'].alpha_)
r2_ridge = float(r2_score(y_te, pipe.predict(X_te)))
`,
      checkPython: `assert best_alpha in [0.1, 1.0, 10.0, 100.0], f"best_alpha={best_alpha} không thuộc tập alphas."
assert float(r2_ridge) >= 0.55, f"r2_ridge={r2_ridge:.3f} chưa đạt >= 0.55."`,
    },
  },
  {
    id: 'L059',
    order: 59,
    trackId: 'track07_sklearn',
    title: 'Logistic Regression, Log-Odds & Siêu tham số Điều chuẩn `C`',
    subtitle: 'Hiểu hàm Sigmoid, xác suất hiệu chuẩn tốt và ý nghĩa nghịch đảo của `C`',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['titanic'],
    objectives: [
      'Phân biệt `predict()` (0/1) và `predict_proba()[:, 1]` (xác suất thuộc lớp dương).',
      'Hiểu tham số `C` (nghịch đảo độ mạnh regularization: `C` nhỏ = phạt mạnh, `C` lớn = ít phạt).',
    ],
    sections: [
      {
        title: '1. Vì sao Logistic Regression vẫn là Baseline Số 1?',
        contentMarkdown:
          'Dù đơn giản và chạy trong vài mili-giây, Logistic Regression tạo ra xác suất **được hiệu chuẩn rất tốt** (calibrated), giải thích được bằng Odds Ratio ($e^{w_j}$), và hầu như không bị Overfitting trên bộ dữ liệu nhỏ!',
      },
      {
        title: '2. Bảng Tham Số LogisticRegression & Cách Tinh Chỉnh',
        contentMarkdown:
          '| Tham số | Ý nghĩa & Khoảng chỉnh | Mẹo cho người mới |\n| :--- | :--- | :--- |\n| `C` (`0.01 – 100`) | **Nghịch đảo độ phạt L2** ($C = 1/\\lambda$). **`C` nhỏ = phạt mạnh hơn = chống Overfit** | Nếu điểm Train cao nhưng Test thấp → giảm `C` (`1.0 -> 0.1`); nếu bị Underfit → tăng `C` (`1.0 -> 10.0`) |\n| `penalty` | `"l2"` (mặc định), `"l1"`, `"elasticnet"` | Dùng `"l1"` (cùng `solver="liblinear"` hoặc `"saga"`) để tự đẩy trọng số feature rác về `0` |\n| `max_iter` | Số vòng lặp hội tụ (`100` mặc định hay bị thiếu!) | Luôn đặt `500–2000` (và nhớ bọc `StandardScaler()`) để tránh cảnh báo `ConvergenceWarning` |\n| `class_weight` | `None` hoặc `"balanced"` | Bật `"balanced"` khi nhãn `1` hiếm (`< 20%`) để tăng Recall |',
      },
    ],
    exercise: {
      prompt: 'So sánh `LogisticRegression` với `C=0.01`, `C=1.0`, `C=100.0` (đều đi qua `SimpleImputer` + `StandardScaler`) bằng `cross_val_score(..., cv=5, scoring="roc_auc")` trên `titanic.csv` (numeric cols). Lưu kết quả vào dict `auc_by_c` và chọn `best_c`.',
      requirements: [
        '`auc_by_c` có đủ 3 key `0.01, 1.0, 100.0`.',
        '`best_c` là giá trị `C` cho AUC cao nhất và `max(auc_by_c.values()) >= 0.70`.',
      ],
      starterCode: `from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']

auc_by_c = {}
best_c = None
`,
      hintText: 'Lặp `for c in [0.01, 1.0, 100.0]:`, tính `auc_by_c[c] = float(cross_val_score(make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), LogisticRegression(C=c, max_iter=500)), X, y, cv=5, scoring="roc_auc").mean())`.',
      solutionCode: `from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']

auc_by_c = {}
for c in [0.01, 1.0, 100.0]:
    pipe = make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), LogisticRegression(C=c, max_iter=500))
    auc_by_c[c] = float(cross_val_score(pipe, X, y, cv=5, scoring='roc_auc').mean())

best_c = max(auc_by_c, key=auc_by_c.get)
`,
      checkPython: `assert set(auc_by_c.keys()) == {0.01, 1.0, 100.0}, "auc_by_c thiếu mức C."
assert best_c in [0.01, 1.0, 100.0], "best_c không hợp lệ."
assert max(auc_by_c.values()) >= 0.70, "AUC quá thấp."`,
    },
  },
  {
    id: 'L060',
    order: 60,
    trackId: 'track07_sklearn',
    title: 'K-Nearest Neighbors (KNN): Thuật toán Không Tham số & Bẫy Thang Đo',
    subtitle: 'Lý do KNN phụ thuộc sống còn vào Feature Scaling và `n_neighbors`',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 20,
    datasetIds: ['iris_ext'],
    objectives: [
      'Chứng minh chênh lệch hiệu năng KNN khi có và không có `StandardScaler`.',
      'Tìm `k` tối ưu cân bằng Bias–Variance (`k=1` dễ nhiễu, `k` quá lớn dễ mờ ranh giới).',
    ],
    sections: [
      {
        title: '1. KNN đo khoảng cách Euclid — Nên đơn vị lớn sẽ nuốt chửng đơn vị nhỏ!',
        contentMarkdown:
          'Nếu cột `Balance` chạy từ `0..200,000` còn `NumProducts` từ `1..4`, khoảng cách Euclid bị chi phối 99.99% bởi `Balance`. Do đó **LUÔN BỌC `StandardScaler` TRƯỚC `KNeighborsClassifier`**.',
      },
      {
        title: '2. Bảng Tham Số KNeighborsClassifier / KNeighborsRegressor',
        contentMarkdown:
          '| Tham số | Ý nghĩa & Giá trị khuyên dùng | Khi nào chỉnh? |\n| :--- | :--- | :--- |\n| `n_neighbors` (`K`) | Số hàng xóm lấy biểu quyết (`3–25`, nên chọn số **lẻ** cho phân loại 2 lớp) | `K=1..3` → ranh giới lởm chởm dễ Overfit; `K=15..25` → mượt hơn, chống nhiễu tốt hơn |\n| `weights` | `"uniform"` (bỏ phiếu ngang nhau) vs **`"distance"`** (hàng xóm gần nặng phiếu hơn) | Trong AMLICS Studio dùng mặc định `"distance"` cho điểm mượt và chính xác hơn |\n| `metric` / `p` | `"minkowski"` (`p=2` là Euclid, `p=1` là Manhattan) | Thử `p=1` (Manhattan) nếu dữ liệu có nhiều hơn 10 cột liên tục |',
      },
    ],
    exercise: {
      prompt: 'Trên `iris_extended.csv` (4 cột đo hoa), thử các giá trị `k` lẻ `[1, 3, 5, 9, 15]` với `Pipeline([StandardScaler(), KNeighborsClassifier(n_neighbors=k)])` qua `cross_val_score(..., cv=5)`. Lưu dict `cv_scores` và `best_k`.',
      requirements: [
        '`cv_scores` map mỗi `k` tới Accuracy 5-fold CV.',
        '`cv_scores[best_k] >= 0.90`.',
      ],
      starterCode: `from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']

cv_scores = {}
best_k = 1
`,
      hintText: 'Duyệt `for k in [1, 3, 5, 9, 15]:`, dựng `make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k))`, tính mean CV score.',
      solutionCode: `from sklearn.model_selection import cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neighbors import KNeighborsClassifier

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']

cv_scores = {}
for k in [1, 3, 5, 9, 15]:
    pipe = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=k))
    cv_scores[k] = float(cross_val_score(pipe, X, y, cv=5).mean())

best_k = max(cv_scores, key=cv_scores.get)
`,
      checkPython: `assert set(cv_scores.keys()) == {1, 3, 5, 9, 15}, "cv_scores phải đủ 5 giá trị k."
assert cv_scores[best_k] >= 0.90, f"KNN Iris CV score={cv_scores[best_k]:.3f} quá thấp."`,
    },
  },
  {
    id: 'L061',
    order: 61,
    trackId: 'track07_sklearn',
    title: 'Decision Tree: Gini/Entropy, Max Depth & Chống Overfitting Cây Đơn',
    subtitle: 'Hiểu cơ chế chia nhánh tham lam và cắt tỉa `max_depth`, `min_samples_leaf`',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Quan sát cây không giới hạn độ sâu (`max_depth=None`) đạt train accuracy 100% nhưng rớt val score.',
      'Chỉnh `max_depth` và `min_samples_leaf` để thu hẹp khoảng cách Train – Test.',
    ],
    sections: [
      {
        title: '1. Con dao hai lưỡi của Cây Quyết Định',
        contentMarkdown:
          'Một cây để tự do (`max_depth=None`) sẽ tiếp tục tách cho đến khi mỗi chiếc lá chỉ còn đúng 1 mẫu — tức **học vẹt nhiễu 100%**! Việc hãm lại bằng `max_depth=4` hoặc `min_samples_leaf=15` giúp cây giữ đúng các quy luật khái quát nhất.',
      },
      {
        title: '2. Bảng Tham Số DecisionTreeClassifier / DecisionTreeRegressor',
        contentMarkdown:
          '| Tham số | Khoảng tối ưu khuyên dùng | Vai trò chống Overfit |\n| :--- | :--- | :--- |\n| `max_depth` | `3–8` (`None` mặc định rất nguy hiểm!) | Giới hạn số tầng hỏi đáp tối đa từ gốc xuống lá |\n| `min_samples_leaf` | `5–30` | Ép mỗi lá cuối phải có tối thiểu `k` mẫu → xóa ngay các nhánh sinh ra chỉ để nhớ 1 điểm nhiễu |\n| `min_samples_split` | `10–40` | Số mẫu tối thiểu để một nút được phép tách đôi tiếp |\n| `criterion` | `"gini"` / `"entropy"` (hoặc `"squared_error"`) | Tiêu chuẩn đo độ thuần khiết nút — `"gini"` nhanh hơn, `"entropy"` cho kết quả gần tương đương |\n| `ccp_alpha` | `0.0 – 0.02` | Cắt tỉa hậu kỳ (Cost-Complexity Pruning) cắt bỏ các nhánh đóng góp quá ít |',
      },
    ],
    exercise: {
      prompt: 'So sánh 2 `DecisionTreeClassifier` trên `loan_train.csv` (numeric cols, split 75/25 `stratify=y, random_state=42`): `tree_deep = DecisionTreeClassifier(max_depth=None, random_state=42)` và `tree_pruned = DecisionTreeClassifier(max_depth=4, min_samples_leaf=12, random_state=42)`. Lưu `acc_deep_train`, `acc_deep_test`, `acc_pruned_test`.',
      requirements: [
        '`acc_deep_train > 0.98` (nhớ gần như thuộc lòng tập train).',
        '`acc_pruned_test >= acc_deep_test` (cây tỉa khái quát tốt hơn hoặc bằng trên test).',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats].fillna(df[feats].median())
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

acc_deep_train = 0.0
acc_deep_test = 0.0
acc_pruned_test = 0.0
`,
      hintText: 'Fit cả `tree_deep` và `tree_pruned` trên `X_tr, y_tr`, sau đó chấm `accuracy_score` trên train và test.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats].fillna(df[feats].median())
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

tree_deep = DecisionTreeClassifier(max_depth=None, random_state=42).fit(X_tr, y_tr)
tree_pruned = DecisionTreeClassifier(max_depth=4, min_samples_leaf=12, random_state=42).fit(X_tr, y_tr)

acc_deep_train = float(accuracy_score(y_tr, tree_deep.predict(X_tr)))
acc_deep_test = float(accuracy_score(y_te, tree_deep.predict(X_te)))
acc_pruned_test = float(accuracy_score(y_te, tree_pruned.predict(X_te)))
`,
      checkPython: `assert float(acc_deep_train) > 0.98, "Cây không giới hạn phải đạt ~100% trên train."
assert float(acc_pruned_test) >= 0.65, f"acc_pruned_test={acc_pruned_test:.3f} quá thấp."`,
    },
  },
  {
    id: 'L062',
    order: 62,
    trackId: 'track07_sklearn',
    title: 'Support Vector Machines (SVC): Kernel RBF, Margin & Gamma',
    subtitle: 'Biên phân tách cực đại (Max Margin) và mẹo Kernel Trick phi tuyến',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['sensor_iot'],
    objectives: [
      'Hiểu ý nghĩa của siêu tham số `C` (độ rộng lề mềm) và `gamma` (độ uốn lượn biên RBF).',
      'Bật `probability=True` khi cần xuất xác suất từ SVC để tính ROC-AUC.',
    ],
    sections: [
      {
        title: '1. Khi ranh giới bất thường có hình vòng cung hoặc đảo cô lập',
        contentMarkdown:
          'SVM với nhân `kernel="rbf"` ánh xạ dữ liệu vào không gian vô hạn chiều để tìm siêu phẳng phân tách phi tuyến. Nếu `gamma` quá lớn, mỗi điểm tạo thành một "hòn đảo" tách biệt gây Overfitting cực nặng. Luôn kết hợp `StandardScaler()` trước SVC!',
      },
      {
        title: '2. Bảng Tham Số SVC / SVR & Lưu ý tốc độ',
        contentMarkdown:
          '| Tham số SVM | Ý nghĩa & Khoảng chỉnh | Cách tối ưu |\n| :--- | :--- | :--- |\n| `kernel` | `"rbf"` (phi tuyến, khuyên dùng), `"linear"` (tuyến tính), `"poly"` | Chọn `"linear"` nếu số cột > số dòng; `"rbf"` cho bảng ít–vừa (<5k dòng) |\n| `C` | `0.1 – 100.0` (độ khắt khe với điểm sai lề) | `C` lớn = cố phân loại đúng từng điểm (dễ Overfit); `C` nhỏ = lề rộng mượt hơn |\n| `gamma` | `"scale"`, `"auto"`, hoặc `0.001 – 1.0` | **`gamma` lớn** → biên uốn quanh từng điểm; **`"scale"`** thường là điểm khởi đầu an toàn nhất |\n| `probability` | `True` (cần cho `predict_proba` / ROC-AUC) | Lưu ý: bật `True` làm chậm train thêm 5 lần vì phải chạy 5-fold Platt Scaling ngầm |',
      },
    ],
    exercise: {
      prompt: 'Train `Pipeline([StandardScaler(), SVC(kernel="rbf", C=2.0, gamma="scale", probability=True, random_state=42)])` trên `sensor_iot.csv` (dự đoán `IsAnomaly` từ 4 cảm biến `["TempC", "VibrationMm", "PressureBar", "PowerKw"]`, split 80/20 `stratify=y`). Tính `svc_auc`.',
      requirements: [
        'Sử dụng `SVC(..., probability=True)` bên trong Pipeline có `StandardScaler`.',
        'Đạt `svc_auc >= 0.70` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import roc_auc_score

df = pd.read_csv('sensor_iot.csv')
X = df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']]
y = df['IsAnomaly']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

svc_auc = 0.0
`,
      hintText: '`pipe = make_pipeline(StandardScaler(), SVC(kernel="rbf", C=2.0, gamma="scale", probability=True, random_state=42)).fit(X_tr, y_tr)`, tính `roc_auc_score(y_te, pipe.predict_proba(X_te)[:, 1])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.metrics import roc_auc_score

df = pd.read_csv('sensor_iot.csv')
X = df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']]
y = df['IsAnomaly']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

pipe = make_pipeline(
    StandardScaler(),
    SVC(kernel='rbf', C=2.0, gamma='scale', probability=True, random_state=42),
)
pipe.fit(X_tr, y_tr)
svc_auc = float(roc_auc_score(y_te, pipe.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert float(svc_auc) >= 0.70, f"svc_auc={svc_auc:.3f} chưa đạt >= 0.70."`,
    },
  },
  {
    id: 'L063',
    order: 63,
    trackId: 'track07_sklearn',
    title: 'Naive Bayes: GaussianNB cho Bảng & MultinomialNB cho Văn bản',
    subtitle: 'Thuật toán xác suất siêu nhanh làm Baseline văn bản và Streaming',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 20,
    datasetIds: ['text_reviews', 'iris_ext'],
    objectives: [
      'Hiểu giả định độc lập có điều kiện của Bayes.',
      'Dùng `MultinomialNB(alpha=0.5)` trên TF-IDF / CountVectorizer để phân loại văn bản trong tích tắc.',
    ],
    sections: [
      {
        title: '1. Tại sao MultinomialNB + TF-IDF là cặp bài trùng cho NLP nhẹ?',
        contentMarkdown:
          'Dù dữ liệu văn bản có hàng vạn từ vựng (chiều cực lớn), `MultinomialNB` chỉ cần đếm tần suất từ trong 1 lượt quét nên tốc độ gần như tức thì, đặc biệt tốt khi số lượng mẫu ít.',
      },
    ],
    exercise: {
      prompt: 'Xây dựng `Pipeline([TfidfVectorizer(), MultinomialNB(alpha=0.5)])` trên `text_reviews.csv` (split 75/25 `stratify=Sentiment, random_state=42`). Tính `nb_acc` và dự đoán thử câu `"Sản phẩm tuyệt vời giao hàng rất nhanh"` lưu vào `sample_pred` (0 hoặc 1).',
      requirements: [
        '`nb_acc >= 0.80` trên tập test.',
        '`int(sample_pred)` trong `{0, 1}`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score

df = pd.read_csv('text_reviews.csv')
X_tr, X_te, y_tr, y_te = train_test_split(df['ReviewText'], df['Sentiment'], test_size=0.25, stratify=df['Sentiment'], random_state=42)

nb_pipe = make_pipeline(TfidfVectorizer(), MultinomialNB(alpha=0.5))
nb_acc = 0.0
sample_pred = -1
`,
      hintText: '`nb_pipe.fit(X_tr, y_tr)`; `nb_acc = float(accuracy_score(y_te, nb_pipe.predict(X_te)))`; `sample_pred = int(nb_pipe.predict(["Sản phẩm tuyệt vời giao hàng rất nhanh"])[0])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import make_pipeline
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import accuracy_score

df = pd.read_csv('text_reviews.csv')
X_tr, X_te, y_tr, y_te = train_test_split(df['ReviewText'], df['Sentiment'], test_size=0.25, stratify=df['Sentiment'], random_state=42)

nb_pipe = make_pipeline(TfidfVectorizer(), MultinomialNB(alpha=0.5)).fit(X_tr, y_tr)
nb_acc = float(accuracy_score(y_te, nb_pipe.predict(X_te)))
sample_pred = int(nb_pipe.predict(['Sản phẩm tuyệt vời giao hàng rất nhanh'])[0])
`,
      checkPython: `assert float(nb_acc) >= 0.80, f"nb_acc={nb_acc:.3f} quá thấp."
assert int(sample_pred) in (0, 1), "sample_pred phải là 0 hoặc 1."`,
    },
  },
  {
    id: 'L064',
    order: 64,
    trackId: 'track07_sklearn',
    title: 'Random Forest & Bagging: Giảm Phương sai bằng Hàng trăm Cây Độc lập',
    subtitle: 'Hiểu Bootstrap Sampling, `max_features` và Out-of-Bag (`oob_score=True`)',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'housing'],
    objectives: [
      'Hiểu 2 nguồn ngẫu nhiên giúp Random Forest thoát bẫy Overfitting: lấy mẫu có hoàn lại (Bootstrap) + chọn ngẫu nhiên tập con cột (`max_features`).',
      'Sử dụng `oob_score=True` như một Validation miễn phí đi kèm quá trình train.',
    ],
    sections: [
      {
        title: '1. Trí tuệ đám đông (Wisdom of the Crowd)',
        contentMarkdown:
          'Mỗi cây đơn lẻ dễ mắc sai lầm cục bộ (High Variance). Khi bạn trồng 200 cây khác nhau trên 200 mẫu bootstrap và lấy trung bình dự đoán của cả 200 cây, sai số ngẫu nhiên tự triệt tiêu nhau!',
      },
      {
        title: '2. Bảng Tham Số RandomForestClassifier / RandomForestRegressor',
        contentMarkdown:
          '| Tham số Random Forest | Khoảng tối ưu | Tác dụng & Kinh nghiệm chỉnh |\n| :--- | :--- | :--- |\n| `n_estimators` | `100 – 500` | Càng nhiều cây càng **giảm phương sai và ổn định**, không gây Overfit thêm (chỉ chậm hơn) |\n| `max_depth` | `6 – 18` hoặc `None` | Giới hạn chiều sâu từng cây — nếu dữ liệu nhiễu nên hãm lại ở `8–12` |\n| `min_samples_leaf` | `1 – 20` | Tăng lên `5–15` giúp làm mượt xác suất và chống Overfitting rất tốt |\n| `max_features` | `"sqrt"` (Classification), `0.5–1.0` (Regression) | Số cột tối đa được xét tại mỗi nút — giảm xuống tăng tính đa dạng giữa các cây |\n| `oob_score` | `True` / `False` | Tận dụng ~36.8% dòng không lọt vào bootstrap mỗi cây để đánh giá Validation miễn phí |\n| `n_jobs` | `-1` | Tận dụng toàn bộ nhân CPU song song để rút ngắn thời gian chạy |',
      },
    ],
    exercise: {
      prompt: 'Train `RandomForestClassifier(n_estimators=150, max_depth=8, max_features="sqrt", oob_score=True, random_state=42)` trên `bank_churn.csv` (numeric cols + OneHot `Country/Gender` hoặc chỉ 5 cột số, chọn `["CreditScore", "Age", "Balance", "NumProducts", "IsActiveMember"]` split 80/20 `stratify=y`). Lưu `oob_acc` (`rf.oob_score_`) và `test_auc`.',
      requirements: [
        'Bật `oob_score=True` và giữ `rf.oob_score_ >= 0.72`.',
        '`test_auc >= 0.75` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

rf = RandomForestClassifier(n_estimators=150, max_depth=8, max_features='sqrt', oob_score=True, random_state=42)
oob_acc = 0.0
test_auc = 0.0
`,
      hintText: '`rf.fit(X_tr, y_tr)`; `oob_acc = float(rf.oob_score_)`; `test_auc = float(roc_auc_score(y_te, rf.predict_proba(X_te)[:, 1]))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

rf = RandomForestClassifier(n_estimators=150, max_depth=8, max_features='sqrt', oob_score=True, random_state=42)
rf.fit(X_tr, y_tr)
oob_acc = float(rf.oob_score_)
test_auc = float(roc_auc_score(y_te, rf.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert float(oob_acc) >= 0.72, f"oob_acc={oob_acc:.3f} thấp hơn kỳ vọng."
assert float(test_auc) >= 0.75, f"test_auc={test_auc:.3f} thấp hơn kỳ vọng."`,
    },
  },
  {
    id: 'L065',
    order: 65,
    trackId: 'track07_sklearn',
    title: 'ExtraTrees vs HistGradientBoostingClassifier (LightGBM bản Scikit-Learn)',
    subtitle: 'So sánh Bagging ngẫu nhiên hóa (ExtraTrees) với Histogram Boosting siêu tốc',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Biết `HistGradientBoostingClassifier` xử lý sẵn **NaN** tự nhiên mà không cần `SimpleImputer`!',
      'So sánh tốc độ và điểm CV 5-fold giữa `ExtraTreesClassifier` và `HistGradientBoostingClassifier`.',
    ],
    sections: [
      {
        title: '1. HistGradientBoosting: Ngôi sao ẩn mình trong Scikit-Learn',
        contentMarkdown:
          '`HistGradientBoostingClassifier` / `Regressor` được truyền cảm hứng trực tiếp từ LightGBM: chia dữ liệu thành tối đa 255 histogram bin, hỗ trợ **missing values bản địa**, tham số `categorical_features` và tốc độ nhanh gấp chục lần `GradientBoostingClassifier` cổ điển!',
      },
    ],
    exercise: {
      prompt: 'Chạy 5-fold Stratified CV (`scoring="roc_auc"`) trên `loan_train.csv` (giữ nguyên NaN cho `HistGradientBoostingClassifier`, điền median cho `ExtraTreesClassifier`) để lưu `auc_et` và `auc_hgb`.',
      requirements: [
        '`HistGradientBoostingClassifier(max_iter=80, max_depth=4, learning_rate=0.08, random_state=42)` chạy trực tiếp trên `X` có chứa NaN.',
        'Cả `auc_et` và `auc_hgb` đều `>= 0.65`.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

auc_et = 0.0
auc_hgb = 0.0
`,
      hintText: '`et_pipe = make_pipeline(SimpleImputer(strategy="median"), ExtraTreesClassifier(n_estimators=120, max_depth=6, random_state=42))`, `hgb = HistGradientBoostingClassifier(max_iter=80, max_depth=4, learning_rate=0.08, random_state=42)`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import ExtraTreesClassifier, HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

et_pipe = make_pipeline(
    SimpleImputer(strategy='median'),
    ExtraTreesClassifier(n_estimators=120, max_depth=6, random_state=42),
)
hgb = HistGradientBoostingClassifier(max_iter=80, max_depth=4, learning_rate=0.08, random_state=42)

auc_et = float(cross_val_score(et_pipe, X, y, cv=cv, scoring='roc_auc').mean())
auc_hgb = float(cross_val_score(hgb, X, y, cv=cv, scoring='roc_auc').mean())
`,
      checkPython: `assert float(auc_et) >= 0.65 and float(auc_hgb) >= 0.65, f"AUC thấp: et={auc_et:.3f}, hgb={auc_hgb:.3f}."`,
    },
  },
  {
    id: 'L066',
    order: 66,
    trackId: 'track07_sklearn',
    title: 'GridSearchCV & RandomizedSearchCV trên toàn bộ Pipeline',
    subtitle: 'Tối ưu đồng thời tham số Imputer/Scaler lẫn Estimator bằng cú pháp `step__param`',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['titanic'],
    objectives: [
      'Nắm quy tắc đặt tên lưới tham số `<tên_bước>__<tên_tham_số>` trong `Pipeline`.',
      'Hiểu vì sao `RandomizedSearchCV` hiệu quả hơn GridSearch khi có > 3 siêu tham số.',
    ],
    sections: [
      {
        title: '1. Dùng `step__param` để dò toàn Pipeline không lo Leakage',
        contentMarkdown:
          'Khi đưa nguyên `Pipeline([("imp", SimpleImputer()), ("rf", RandomForestClassifier())])` vào `RandomizedSearchCV`, bên trong mỗi vòng lặp CV, bộ Imputer được fit lại độc lập trên 4 fold train trước khi đánh giá fold val — đảm bảo 0% leakage ngay cả lúc dò siêu tham số!',
      },
    ],
    exercise: {
      prompt: 'Chạy `RandomizedSearchCV` (`n_iter=8, cv=4, scoring="roc_auc", random_state=42`) trên `Pipeline([("imp", SimpleImputer()), ("rf", RandomForestClassifier(random_state=42))])` cho `titanic.csv`. Không gian tìm kiếm: `imp__strategy`: `["median", "mean"]`, `rf__n_estimators`: `[60, 120, 180]`, `rf__max_depth`: `[3, 5, 7, None]`. Lưu `best_params` và `best_cv_score`.',
      requirements: [
        'Sử dụng cú pháp `imp__strategy`, `rf__n_estimators`, `rf__max_depth`.',
        '`best_cv_score >= 0.72`.',
      ],
      starterCode: `from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']

pipe = Pipeline([('imp', SimpleImputer()), ('rf', RandomForestClassifier(random_state=42))])
param_dist = {
    'imp__strategy': ['median', 'mean'],
    'rf__n_estimators': [60, 120, 180],
    'rf__max_depth': [3, 5, 7, None],
}

search = RandomizedSearchCV(pipe, param_dist, n_iter=8, cv=4, scoring='roc_auc', random_state=42)
best_params = {}
best_cv_score = 0.0
`,
      hintText: '`search.fit(X, y)`; `best_params = search.best_params_`; `best_cv_score = float(search.best_score_)`.',
      solutionCode: `from sklearn.model_selection import RandomizedSearchCV
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']

pipe = Pipeline([('imp', SimpleImputer()), ('rf', RandomForestClassifier(random_state=42))])
param_dist = {
    'imp__strategy': ['median', 'mean'],
    'rf__n_estimators': [60, 120, 180],
    'rf__max_depth': [3, 5, 7, None],
}

search = RandomizedSearchCV(pipe, param_dist, n_iter=8, cv=4, scoring='roc_auc', random_state=42)
search.fit(X, y)
best_params = dict(search.best_params_)
best_cv_score = float(search.best_score_)
`,
      checkPython: `assert {'imp__strategy', 'rf__n_estimators', 'rf__max_depth'}.issubset(best_params.keys()), "Thiếu khóa trong best_params."
assert float(best_cv_score) >= 0.72, f"best_cv_score={best_cv_score:.3f} quá thấp."`,
    },
  },
  {
    id: 'L067',
    order: 67,
    trackId: 'track07_sklearn',
    title: 'Multi-Class Classification & Calibration Xác suất (CalibratedClassifierCV)',
    subtitle: 'Phân loại đa lớp One-vs-Rest/Multinomial và hiệu chỉnh xác suất trung thực',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext'],
    objectives: [
      'Đọc `classification_report` đa lớp (Macro Avg vs Weighted Avg) và tổng xác suất mỗi hàng bằng 1.0.',
      'Dùng `CalibratedClassifierCV(method="isotonic"|"sigmoid")` hiệu chuẩn mô hình Random Forest / SVM.',
    ],
    sections: [
      {
        title: '1. Xác suất thô của Random Forest thường bị dạt khỏi biên 0 và 1',
        contentMarkdown:
          'Random Forest và SVM thường đẩy xác suất co cụm về khoảng `[0.2, 0.8]`. Trong bài toán chấm điểm LogLoss (`multi_logloss`), việc hiệu chuẩn lại bằng `CalibratedClassifierCV` (Platt Scaling hoặc Isotonic Regression) giúp cải thiện Brier Score và LogLoss rõ rệt!',
      },
    ],
    exercise: {
      prompt: 'Train `CalibratedClassifierCV(estimator=RandomForestClassifier(n_estimators=80, random_state=42), method="sigmoid", cv=3)` trên `iris_extended.csv` (split 75/25 `stratify=y, random_state=42`). Tính `cal_logloss` và kiểm tra ma trận xác suất `probs` có shape `(len(y_te), 3)` và tổng mỗi hàng bằng 1.',
      requirements: [
        '`probs.shape == (len(y_te), 3)` và `np.allclose(probs.sum(axis=1), 1.0)`.',
        '`cal_logloss < 0.35`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import log_loss

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

cal = CalibratedClassifierCV(estimator=RandomForestClassifier(n_estimators=80, random_state=42), method='sigmoid', cv=3)
probs = None
cal_logloss = 999.0
`,
      hintText: '`cal.fit(X_tr, y_tr)`; `probs = cal.predict_proba(X_te)`; `cal_logloss = float(log_loss(y_te, probs, labels=cal.classes_))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import log_loss

df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]
y = df['Species']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, stratify=y, random_state=42)

cal = CalibratedClassifierCV(
    estimator=RandomForestClassifier(n_estimators=80, random_state=42),
    method='sigmoid',
    cv=3,
)
cal.fit(X_tr, y_tr)
probs = cal.predict_proba(X_te)
cal_logloss = float(log_loss(y_te, probs, labels=cal.classes_))
`,
      checkPython: `assert probs is not None and probs.shape == (len(y_te), 3), "Sai shape ma trận xác suất 3 lớp."
assert np.allclose(probs.sum(axis=1), 1.0, atol=1e-6), "Tổng xác suất từng hàng phải bằng 1."
assert float(cal_logloss) < 0.35, f"cal_logloss={cal_logloss:.3f} còn cao (>= 0.35)."`,
    },
  },
  {
    id: 'L068',
    order: 68,
    trackId: 'track07_sklearn',
    title: 'TransformedTargetRegressor: Dự đoán trên thang Log1p và Trả về Giá trị Thực',
    subtitle: 'Tự động log1p(y) lúc fit và expm1(y_hat) lúc predict cực sạch trong Pipeline',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Dùng `TransformedTargetRegressor(regressor=..., func=np.log1p, inverse_func=np.expm1)` để triệt tiêu lỗi quên biến đổi ngược `expm1`.',
      'Đo mức cải thiện RMSLE (Root Mean Squared Log Error) trên bài toán giá nhà.',
    ],
    sections: [
      {
        title: '1. Vì sao bài toán giá cả thường tối ưu `log1p(y)` thay vì `y` gốc?',
        contentMarkdown:
          'Sai số 50 triệu trên căn nhà 500 triệu (10%) khác hoàn toàn sai số 50 triệu trên biệt thự 10 tỷ (0.5%). Biến đổi mục tiêu bằng `np.log1p` giúp mô hình tối ưu **sai số tương đối theo phần trăm**, đồng thời `TransformedTargetRegressor` tự động đảo ngược `np.expm1` khi gọi `.predict()`.',
      },
    ],
    exercise: {
      prompt: 'Bọc `Ridge(alpha=5.0)` cùng `StandardScaler()` vào `TransformedTargetRegressor(..., func=np.log1p, inverse_func=np.expm1)` trên `housing.csv` (numeric cols, split 80/20 `random_state=42`). Tính `rmsle_val = root_mean_squared_log_error(y_te, np.maximum(0, preds))`.',
      requirements: [
        'Sử dụng `TransformedTargetRegressor(..., func=np.log1p, inverse_func=np.expm1)`.',
        '`preds` trả về ở thang giá trị thật (trung bình > 50,000), không phải thang log (~12), và `rmsle_val < 0.45`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import TransformedTargetRegressor
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.metrics import root_mean_squared_log_error

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

ttr = TransformedTargetRegressor(
    regressor=make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), Ridge(alpha=5.0)),
    func=np.log1p,
    inverse_func=np.expm1,
)
preds = None
rmsle_val = 999.0
`,
      hintText: '`ttr.fit(X_tr, y_tr)`; `preds = ttr.predict(X_te)`; `rmsle_val = float(root_mean_squared_log_error(y_te, np.maximum(0, preds)))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.compose import TransformedTargetRegressor
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
from sklearn.metrics import root_mean_squared_log_error

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

ttr = TransformedTargetRegressor(
    regressor=make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), Ridge(alpha=5.0)),
    func=np.log1p,
    inverse_func=np.expm1,
)
ttr.fit(X_tr, y_tr)
preds = ttr.predict(X_te)
rmsle_val = float(root_mean_squared_log_error(y_te, np.maximum(0, preds)))
`,
      checkPython: `assert preds is not None and float(np.mean(preds)) > 50000, "Dự đoán phải đã được inverse_func=np.expm1 trả về thang giá thật."
assert float(rmsle_val) < 0.45, f"rmsle_val={rmsle_val:.4f} quá cao."`,
    },
  },
  {
    id: 'L112',
    order: 73,
    trackId: 'track07_sklearn',
    title: 'GradientBoosting Cổ Điển (GBDT) & Tham Số subsample (Stochastic Boosting)',
    subtitle: 'Hiểu sâu GradientBoostingClassifier/Regressor và bộ 5 tham số tinh chỉnh trong AMLICS Studio',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'housing'],
    objectives: [
      'Phân biệt `GradientBoostingClassifier` (cây tuần tự cổ điển, hỗ trợ `subsample < 1.0`) với `HistGradientBoosting` (dùng bin histogram tốc độ cao).',
      'Hiểu ý nghĩa từng tham số trên Studio: `n_estimators`, `learning_rate`, `max_depth` (nhỏ 2–5), `min_samples_leaf`, và `subsample`.',
    ],
    sections: [
      {
        title: '1. Vì sao GradientBoosting thường đặt max_depth nhỏ (2–5) thay vì sâu 10–15?',
        contentMarkdown:
          'Khác với Random Forest (mỗi cây độc lập phải đủ sâu để tự quyết định), **Gradient Boosting xây từng cây nhỏ sửa sai dần cho nhau**:\n- Cây số 1 đoán thô, cây số 2 học phần sai sót (`residual`) của cây số 1, cây số 3 sửa lỗi còn lại của tổng (cây 1 + cây 2)...\n- Vì mỗi cây cộng dồn nối tiếp, nếu để `max_depth=10` thì chỉ sau 20 cây mô hình đã **Overfit cực nặng**!\n\n| Tham số `GradientBoosting` | Vai trò & Khoảng tối ưu khuyên dùng |\n| :--- | :--- |\n| `n_estimators` (`100–500`) | Số vòng sửa sai liên tiếp. Luôn tăng khi giảm `learning_rate`. |\n| `learning_rate` (`0.03–0.1`) | Độ lớn mỗi bước sửa sai. Giá trị nhỏ giúp mượt và khó Overfit hơn. |\n| `max_depth` (`2–5`) | Số tầng tương tác giữa các cột (`depth=3` đã học được tương tác bậc 3!). |\n| `min_samples_leaf` (`5–30`) | Số mẫu tối thiểu ở nút lá — tăng lên khi dữ liệu nhiều nhiễu. |\n| `subsample` (`0.7–0.9`) | Mỗi cây chỉ bốc ngẫu nhiên 70–90% dòng train (**Stochastic Gradient Boosting**) để giảm Variance rất hiệu quả. |',
        callout: {
          type: 'warning',
          title: 'Giới hạn thực tế của GradientBoosting cổ điển',
          text: 'Với dữ liệu nhỏ–vừa (< 10.000 dòng), `GradientBoosting` cực kỳ mạnh và ổn định. Nhưng với > 20.000 dòng hoặc có nhiều `NaN`, hãy chuyển sang **`HistGradientBoosting` / `LightGBM` / `XGBoost`** nhanh hơn gấp 20–50 lần!',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên `bank_churn.csv` (numeric cols `["CreditScore", "Age", "Balance", "NumProducts", "IsActiveMember"]`, chia Stratified 80/20 `random_state=42`), train `GradientBoostingClassifier(n_estimators=120, learning_rate=0.05, max_depth=3, min_samples_leaf=10, subsample=0.8, random_state=42)`. Tính `roc_auc_gb >= 0.72`.',
      requirements: [
        'Sử dụng `GradientBoostingClassifier` với `subsample=0.8`, `learning_rate=0.05`, `max_depth=3`.',
        '`roc_auc_gb >= 0.72` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

# TODO: Khớp GradientBoostingClassifier với subsample=0.8, learning_rate=0.05, max_depth=3
gb = None
roc_auc_gb = 0.0
`,
      hintText:
        '`gb = GradientBoostingClassifier(n_estimators=120, learning_rate=0.05, max_depth=3, min_samples_leaf=10, subsample=0.8, random_state=42).fit(X_tr, y_tr)` và `roc_auc_gb = float(roc_auc_score(y_te, gb.predict_proba(X_te)[:, 1]))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

gb = GradientBoostingClassifier(
    n_estimators=120, learning_rate=0.05, max_depth=3,
    min_samples_leaf=10, subsample=0.8, random_state=42
).fit(X_tr, y_tr)
roc_auc_gb = float(roc_auc_score(y_te, gb.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert isinstance(gb, GradientBoostingClassifier) and abs(gb.subsample - 0.8) < 1e-6
assert float(roc_auc_gb) >= 0.72, f"roc_auc_gb={roc_auc_gb:.3f} chưa đạt >= 0.72"`,
    },
  },
  {
    id: 'L113',
    order: 74,
    trackId: 'track07_sklearn',
    title: 'ExtraTrees (Extremely Randomized Trees): Cơ Chế & Tối Ưu Tham Số',
    subtitle: 'Khác biệt cốt lõi giữa ExtraTrees vs RandomForest và khi nào ExtraTrees thắng điểm CV',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 22,
    datasetIds: ['housing', 'medical_vitals'],
    objectives: [
      'Hiểu vì sao `RandomForest` tìm **ngưỡng chia tốt nhất** tại mỗi nút còn `ExtraTrees` bốc **ngưỡng chia ngẫu nhiên** rồi chọn cái tốt nhất trong số đó.',
      'Biết cách chỉnh `max_depth`, `min_samples_leaf`, `max_features` cho ExtraTrees để tối đa hóa tốc độ & giảm Overfitting.',
    ],
    sections: [
      {
        title: '1. ExtraTrees làm việc khác Random Forest ở đúng 1 điểm nhưng tạo lợi thế lớn',
        contentMarkdown:
          '| Tiêu chí | `RandomForest` | `ExtraTrees` |\n| :--- | :--- | :--- |\n| Lấy mẫu dòng | Bootstrap có hoàn lại (~63.2% mỗi cây) | Mặc định dùng **toàn bộ** tập train (`bootstrap=False`) |\n| Chọn ngưỡng chia nút | Quét **mọi ngưỡng có thể** để tìm Gini/MSE tốt nhất | Bốc **vài ngưỡng ngẫu nhiên** rồi chọn tốt nhất trong nhóm nhỏ |\n| Tốc độ huấn luyện | Chậm hơn | **Nhanh hơn 2–4 lần** |\n| Điểm mạnh nhất | Tổng quát đều trên nhiều bảng | **Giảm Variance mạnh**, chống nhiễu tốt trên bảng nhiều feature số liên tục |\n\n**Mẹo tối ưu ExtraTrees trên Studio:** Do chọn ngưỡng ngẫu nhiên, cây của ExtraTrees thường **cần `max_depth` lớn hơn RandomForest một chút** (ví dụ `8–16` thay vì `6`) để bù lại phần Bias.',
      },
    ],
    exercise: {
      prompt:
        'Trên `housing.csv` (numeric cols điền median trước khi split hoặc bọc `Pipeline`), chia 80/20 `random_state=42`, so sánh thời gian hoặc điểm $R^2$ giữa `ExtraTreesRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)` và `RandomForestRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)`. Lưu `r2_et` và `r2_rf` (`r2_et >= 0.72`).',
      requirements: [
        'Khớp cả `ExtraTreesRegressor` và `RandomForestRegressor` trong Pipeline có `SimpleImputer(strategy="median")`.',
        '`r2_et >= 0.72`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

# TODO: Train et_pipe và rf_pipe rồi tính r2_et, r2_rf
r2_et = 0.0
r2_rf = 0.0
`,
      hintText:
        '`et_pipe = make_pipeline(SimpleImputer(strategy="median"), ExtraTreesRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)).fit(X_tr, y_tr)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

et_pipe = make_pipeline(SimpleImputer(strategy='median'), ExtraTreesRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)).fit(X_tr, y_tr)
rf_pipe = make_pipeline(SimpleImputer(strategy='median'), RandomForestRegressor(n_estimators=120, max_depth=12, min_samples_leaf=2, random_state=42)).fit(X_tr, y_tr)
r2_et = float(r2_score(y_te, et_pipe.predict(X_te)))
r2_rf = float(r2_score(y_te, rf_pipe.predict(X_te)))
`,
      checkPython: `assert float(r2_et) >= 0.72, f"r2_et={r2_et:.3f} quá thấp"
assert float(r2_rf) >= 0.70`,
    },
  },
  {
    id: 'L114',
    order: 75,
    trackId: 'track07_sklearn',
    title: 'HistGradientBoosting: Mô Hình Mặc Định Mạnh Nhất Có Sẵn Trong Scikit-Learn',
    subtitle: 'Giải mã max_iter, learning_rate, l2_regularization, early_stopping và xử lý NaN tự động',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Hiểu vì sao AMLICS Studio chọn **`HistGradientBoosting`** làm mô hình mặc định thay vì XGBoost/LightGBM: chạy cực nhanh trên cả Pyodide lẫn Cloud và lấy cảm hứng trực tiếp từ LightGBM!',
      'Nắm vững tính năng **xử lý `NaN` bản địa** (không cần Imputer!) và đánh dấu cột hạng mục `categorical_features="from_dtype"`.',
      'Tối ưu bộ tham số `max_iter`, `learning_rate`, `max_depth`, `min_samples_leaf`, `l2_regularization`, `early_stopping`.',
    ],
    sections: [
      {
        title: '1. Bảng giải mã 7 tham số của HistGradientBoosting trong AMLICS Studio',
        contentMarkdown:
          '| Tham số Python | Tên trên AMLICS Studio | Ý nghĩa & Cách chỉnh tối ưu |\n| :--- | :--- | :--- |\n| `max_iter` | `N Estimators` (`100–500`) | Số câyBoosting tối đa. Nên để lớn hơn nếu bật `early_stopping=True`. |\n| `learning_rate` | `Learning Rate` (`0.03–0.1`) | Tốc độ học. Giảm còn `0.03` và tăng `max_iter=300` thường cho CV cao nhất. |\n| `max_depth` | `Max Depth` (`4–8`) | Độ sâu tối đa mỗi cây (`None` mặc định, nhưng đặt `5–8` giúp chặn Overfit). |\n| `min_samples_leaf` | `Min Samples Leaf` (`10–50`) | Số mẫu ít nhất trong 1 lá — cực hữu ích với dữ liệu nhiễu hoặc lớn. |\n| `l2_regularization` | `L2 Regularization` (`0.0–10.0`) | Phạt L2 trên giá trị lá giống hệt `reg_lambda` của XGB/LGBM — tăng lên nếu `Train >> Val`. |\n| `early_stopping` | `Early Stopping` (`True/False`) | Tự trích 10% validation nội bộ, dừng ngay khi điểm không tăng nữa. |\n| `class_weight` | `Imbalance: class_weight` | Đặt `"balanced"` nếu nhãn `1` hiếm gặp (`< 15%`). |',
        callout: {
          type: 'tip',
          title: 'Xử lý trực tiếp NaN và Category không cần One-Hot',
          text: 'Với dữ liệu vừa–lớn, chỉ cần ép các cột chữ sang `.astype("category")` và truyền `categorical_features="from_dtype"`, `HistGradientBoostingClassifier` tự học cách chia nhóm + nhánh đi cho `NaN` luôn!',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên `loan_train.csv` (có cả `NaN` ở `CreditHistory` lẫn cột category `Grade`, `Purpose`, `Region`), không dùng `SimpleImputer` hay `OneHotEncoder`! Hãy chuyển 3 cột chữ sang `dtype="category"`, chia Stratified 80/20 `random_state=42`, rồi train `HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=5, min_samples_leaf=15, l2_regularization=1.0, early_stopping=True, categorical_features="from_dtype", random_state=42)`. Tính `auc_hgb >= 0.68`.',
      requirements: [
        'Truyền trực tiếp `X` còn chứa `NaN` ở `CreditHistory` và cột `category` vào `HistGradientBoostingClassifier` (tính năng native của HistGB!).',
        '`auc_hgb >= 0.68` trên tập Test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus']).copy()
for c in ['Grade', 'Purpose', 'Region']:
    X[c] = X[c].astype('category')
y = df['LoanStatus']

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
hgb = None
auc_hgb = 0.0
`,
      hintText:
        '`hgb = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.05, max_depth=5, min_samples_leaf=15, l2_regularization=1.0, early_stopping=True, categorical_features="from_dtype", random_state=42).fit(X_tr, y_tr)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
X = df.drop(columns=['id', 'LoanStatus']).copy()
for c in ['Grade', 'Purpose', 'Region']:
    X[c] = X[c].astype('category')
y = df['LoanStatus']

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
hgb = HistGradientBoostingClassifier(
    max_iter=200, learning_rate=0.05, max_depth=5, min_samples_leaf=15,
    l2_regularization=1.0, early_stopping=True, categorical_features='from_dtype', random_state=42
).fit(X_tr, y_tr)
auc_hgb = float(roc_auc_score(y_te, hgb.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert isinstance(hgb, HistGradientBoostingClassifier)
assert float(auc_hgb) >= 0.68, f"auc_hgb={auc_hgb:.3f} quá thấp"`,
    },
  },
  {
    id: 'L115',
    order: 76,
    trackId: 'track07_sklearn',
    title: 'MLPNeuralNet (MLPClassifier / MLPRegressor) Trong Scikit-Learn',
    subtitle: 'Làm chủ mạng nơ-ron đa tầng nhẹ mà không cần PyTorch: hidden_layer_sizes, alpha, learning_rate_init',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'iris_ext'],
    objectives: [
      'Biết cách dùng `MLPClassifier(hidden_layer_sizes=(128, 64), ...)` và vì sao nó là model `MLPNeuralNet` trên AMLICS Studio.',
      'Hiểu từng tham số trọng yếu: `hidden_layer_sizes`, `activation="relu"`, `alpha` (L2 weight decay), `learning_rate_init`, `early_stopping=True`.',
      'Khắc phục lỗi mạng Nơ-ron không hội tụ bằng cách chuẩn hóa `StandardScaler()` bắt buộc.',
    ],
    sections: [
      {
        title: '1. Kiến trúc & Bộ tham số chuẩn của MLPNeuralNet trong AMLICS Studio',
        contentMarkdown:
          'Mục **`MLPNeuralNet`** trong thanh chọn mô hình của AMLICS Studio gọi thẳng `MLPClassifier` / `MLPRegressor` của Scikit-Learn — cực gọn cho bài toán cần ranh giới trơn hoặc học biểu diễn phi tuyến nhẹ:\n\n| Tham số `MLPClassifier` | Giá trị Studio sinh ra | Giải thích & Cách tối ưu |\n| :--- | :--- | :--- |\n| `hidden_layer_sizes` | `(128, 64)` | Tuple số nơ-ron mỗi tầng ẩn: 2 tầng `(128, 64)` cho bảng vừa; `(64, 32)` nếu ít dòng (<500) để tránh Overfit. |\n| `activation` | `"relu"` (mặc định) | Hàm kích hoạt: `"relu"` nhanh và chống mất đạo hàm; `"tanh"` đôi khi mượt hơn trên dữ liệu nhỏ đã scale `[-1, 1]`. |\n| `learning_rate_init` | Map từ `Learning Rate` (`0.001–0.05`) | Bước nhảy ban đầu của Adam. Với MLP nên để **nhỏ hơn cây** (tốt nhất `0.001 – 0.01`) kẻo Loss nhảy loạn! |\n| `alpha` | Map từ `L2 Regularization` | Trọng số phạt L2 trên ma trận trọng số $W$ (nên thử `0.0001`, `0.01`, `0.1`, `1.0`). |\n| `early_stopping` | `True` | Tách 10% validation, tự dừng khi val score đứng yên `n_iter_no_change=10` epoch. |',
        callout: {
          type: 'warning',
          title: 'Bắt buộc chuẩn hóa thang đo & lưu ý Early Stopping trên bảng nhỏ!',
          text: 'Nếu quên `StandardScaler()`, cột `Balance = 150,000` sẽ khiến gradient nổ tung ngay epoch 1! Ngoài ra, trên bảng nhỏ (< 500 dòng), `early_stopping=True` sẽ cắt mất 10% làm validation (~28 dòng) khiến mạng dễ dừng sớm trước khi kịp hội tụ — khi dữ liệu nhỏ nên đặt `early_stopping=False` và tăng `alpha` L2 (`0.5–1.0`) để chống Overfit.',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên `bank_churn.csv` (`["CreditScore", "Age", "Balance", "NumProducts", "IsActiveMember"]`), chia 80/20 Stratified `random_state=42`. Đóng gói `StandardScaler()` + `MLPClassifier(hidden_layer_sizes=(32, 16), learning_rate_init=0.01, alpha=0.5, max_iter=300, early_stopping=False, random_state=42)`. Tính `auc_mlp >= 0.72`.',
      requirements: [
        'Bọc `StandardScaler()` trước `MLPClassifier` trong `Pipeline`.',
        '`auc_mlp >= 0.72` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

pipe_mlp = None
auc_mlp = 0.0
`,
      hintText:
        '`pipe_mlp = Pipeline([("sc", StandardScaler()), ("mlp", MLPClassifier(hidden_layer_sizes=(32, 16), learning_rate_init=0.01, alpha=0.5, max_iter=300, early_stopping=False, random_state=42))]).fit(X_tr, y_tr)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

pipe_mlp = Pipeline([
    ('sc', StandardScaler()),
    ('mlp', MLPClassifier(hidden_layer_sizes=(32, 16), learning_rate_init=0.01, alpha=0.5, max_iter=300, early_stopping=False, random_state=42)),
]).fit(X_tr, y_tr)
auc_mlp = float(roc_auc_score(y_te, pipe_mlp.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert isinstance(pipe_mlp, Pipeline) and any(isinstance(s, MLPClassifier) for _, s in pipe_mlp.steps)
assert float(auc_mlp) >= 0.72, f"auc_mlp={auc_mlp:.3f} quá thấp"`,
    },
  },
];
