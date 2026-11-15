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
];
