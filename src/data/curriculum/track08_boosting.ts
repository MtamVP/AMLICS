import { LessonDefinition } from '../../types/curriculum';

export const TRACK08_BOOSTING_LESSONS: LessonDefinition[] = [
  {
    id: 'L069',
    order: 69,
    trackId: 'track08_boosting',
    title: 'Nguyên lý Gradient Boosting: Học từ Phần dư (Residuals) qua từng Vòng',
    subtitle: 'Hiểu bản chất toán học của Gradient Boosting trước khi dùng XGBoost/LightGBM',
    difficulty: 'Trung bình',
    libraries: ['NumPy', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['housing'],
    objectives: [
      'Tự code vòng lặp Boosting 3 bước đơn giản bằng tay với `DecisionTreeRegressor(max_depth=2)` để chứng kiến sai số giảm dần.',
      'Hiểu vai trò của `learning_rate` (shrinkage $\\eta$) trong cộng dồn cây.',
    ],
    sections: [
      {
        title: '1. Boosting khác Bagging (Random Forest) ở chỗ nào?',
        contentMarkdown:
          '- **Random Forest (Bagging)**: các cây mọc **song song, độc lập**, cùng cố dự đoán trực tiếp `y` rồi lấy trung bình.\n- **Gradient Boosting**: các cây mọc **nối tiếp**: cây thứ `t` không học `y`, mà học phần **sai số còn sót lại (pseudo-residual $r = y - \\hat{y}_{t-1}$)** của tổng các cây trước đó, rồi cộng nhẹ thêm $\\eta \\cdot f_t(x)$!',
        exampleCode: `from sklearn.tree import DecisionTreeRegressor
y_hat = np.full(len(y_tr), y_tr.mean())
lr = 0.2
for step in range(5):
    residual = y_tr - y_hat
    tree = DecisionTreeRegressor(max_depth=2, random_state=42).fit(X_tr, residual)
    y_hat += lr * tree.predict(X_tr)`,
      },
    ],
    exercise: {
      prompt: 'Tự cài đặt vòng lặp Manual Gradient Boosting 15 bước (`learning_rate = 0.2`, cây gốc `DecisionTreeRegressor(max_depth=2, random_state=42)`) trên `housing.csv` (numeric cols, split 80/20). Kiểm chứng `rmse_step1 > rmse_step15` trên tập test.',
      requirements: [
        'Lưu RMSE test ở bước 1 (`rmse_step1`) và bước 15 (`rmse_step15`).',
        '`rmse_step15 < rmse_step1 * 0.85` (mô hình thực sự giảm sai số nhờ cộng dồn phần dư).',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import root_mean_squared_error

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice'].values
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

lr = 0.2
pred_tr = np.full(len(y_tr), float(y_tr.mean()))
pred_te = np.full(len(y_te), float(y_tr.mean()))

rmse_step1 = 0.0
rmse_step15 = 0.0
`,
      hintText: 'Lặp `for m in range(1, 16): res = y_tr - pred_tr; t = DecisionTreeRegressor(max_depth=2, random_state=42).fit(X_tr, res); pred_tr += lr * t.predict(X_tr); pred_te += lr * t.predict(X_te)`, ghi lại `rmse_step1` khi `m == 1` và `rmse_step15` khi `m == 15`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import root_mean_squared_error

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median())
y = df['SalePrice'].values
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

lr = 0.2
pred_tr = np.full(len(y_tr), float(y_tr.mean()))
pred_te = np.full(len(y_te), float(y_tr.mean()))

rmse_step1 = 0.0
rmse_step15 = 0.0
for m in range(1, 16):
    res = y_tr - pred_tr
    t = DecisionTreeRegressor(max_depth=2, random_state=42).fit(X_tr, res)
    pred_tr += lr * t.predict(X_tr)
    pred_te += lr * t.predict(X_te)
    if m == 1:
        rmse_step1 = float(root_mean_squared_error(y_te, pred_te))
    if m == 15:
        rmse_step15 = float(root_mean_squared_error(y_te, pred_te))
`,
      checkPython: `assert rmse_step1 > 0 and rmse_step15 > 0, "Chưa tính rmse_step1 hoặc rmse_step15."
assert rmse_step15 < rmse_step1 * 0.85, f"RMSE chưa giảm đủ mạnh từ {rmse_step1:.1f} xuống {rmse_step15:.1f}."`,
    },
  },
  {
    id: 'L070',
    order: 70,
    trackId: 'track08_boosting',
    title: 'XGBoost Chuyên sâu: Regularization Cây, Subsample & `colsample_bytree`',
    subtitle: 'Làm chủ vũ khí Kaggle phổ biến nhất cho dữ liệu bảng',
    difficulty: 'Trung bình',
    libraries: ['XGBoost', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Nắm bộ tham số trụ cột của `XGBClassifier`: `max_depth`, `learning_rate`, `n_estimators`, `subsample`, `colsample_bytree`, `reg_alpha`, `reg_lambda`.',
      'Xử lý mất cân bằng lớp bằng `scale_pos_weight = count(0) / count(1)`.',
    ],
    sections: [
      {
        title: '1. Kiến trúc XGBoost & Tương thích Fallback trên Trình duyệt',
        contentMarkdown:
          '`XGBoost` bổ sung đạo hàm bậc 2 (Hessian) + thành phần điều chuẩn $\\gamma T + \\frac{1}{2}\\lambda \\sum w^2$ ngay vào hàm mục tiêu tách lá, giúp chống Overfitting vượt trội so với Gradient Boosting cổ điển.\n\nTrên Colab/Kaggle chạy native `xgboost.XGBClassifier`; trên Browser Pyodide nhẹ dùng `HistGradientBoostingClassifier` có thuật toán chia bin tương đương để kiểm thử nhanh.',
      },
      {
        title: '2. Bảng Toàn Tập Tham Số XGBoost & Cách Tối Ưu Từng Bước',
        contentMarkdown:
          '| Tham số XGBoost | Giá trị khuyên dùng | Ý nghĩa & Chiến lược tối ưu |\n| :--- | :--- | :--- |\n| `n_estimators` | `200–2000` (kèm EarlyStopping) | Số cây tối đa — để dư rồi chặn bằng `early_stopping_rounds=50` |\n| `learning_rate` (`eta`) | `0.02–0.1` | Bước học; hạ xuống `0.03` giúp tăng ổn định CV nhưng cần nhiều cây hơn |\n| `max_depth` | `3–7` | Độ sâu tối đa mỗi cây — giảm xuống `3–4` ngay nếu Train cao hơn Test |\n| `min_child_weight` | `1–20` | Tương đương độ khắt khe tạo lá mới — tăng lên khi dữ liệu nhiều nhiễu hoặc mất cân bằng |\n| `subsample` | `0.7–0.9` | Tỷ lệ mẫu dòng lấy ngẫu nhiên cho mỗi cây để chống Overfitting |\n| `colsample_bytree` | `0.6–0.9` | Tỷ lệ **cột** lấy cho mỗi cây (cực hiệu quả khi nhiều feature tương quan mạnh) |\n| `reg_alpha` / `reg_lambda` | `0–10` / `1–10` | Phạt L1 (triệt feature yếu) và L2 (làm mượt trọng số lá, map từ `l2Regularization` Studio) |\n| `scale_pos_weight` | `count(0) / count(1)` | Cân bằng nhãn hiếm khi gian lận chỉ chiếm 1–5% |',
      },
    ],
    exercise: {
      prompt: 'Train mô hình `XGBClassifier(n_estimators=120, max_depth=4, learning_rate=0.06, subsample=0.8, colsample_bytree=0.8, eval_metric="logloss", random_state=42)` (tự fallback sang `HistGradientBoostingClassifier` nếu môi trường không có `xgboost`) trên `loan_train.csv` (split 80/20 `stratify=y`). Tính `xgb_auc`.',
      requirements: [
        'Ưu tiên dùng `xgboost.XGBClassifier` khi import được; fallback sang `HistGradientBoostingClassifier` khi `ImportError`.',
        'Đạt `xgb_auc >= 0.65` trên tập test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

xgb_auc = 0.0
backend_used = ''
`,
      hintText: 'Dùng `try: from xgboost import XGBClassifier; clf = XGBClassifier(...); backend_used = "xgboost"` và `except ImportError: clf = HistGradientBoostingClassifier(max_iter=120, max_depth=4, learning_rate=0.06, random_state=42); backend_used = "hgb"`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

try:
    from xgboost import XGBClassifier
    clf = XGBClassifier(
        n_estimators=120,
        max_depth=4,
        learning_rate=0.06,
        subsample=0.8,
        colsample_bytree=0.8,
        eval_metric='logloss',
        random_state=42,
    )
    backend_used = 'xgboost'
except ImportError:
    clf = HistGradientBoostingClassifier(max_iter=120, max_depth=4, learning_rate=0.06, random_state=42)
    backend_used = 'hgb'

clf.fit(X_tr, y_tr)
xgb_auc = float(roc_auc_score(y_te, clf.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert backend_used in ('xgboost', 'hgb'), "Chưa thiết lập backend_used."
assert float(xgb_auc) >= 0.65, f"xgb_auc={xgb_auc:.3f} chưa đạt >= 0.65."`,
    },
  },
  {
    id: 'L071',
    order: 71,
    trackId: 'track08_boosting',
    title: 'LightGBM: Leaf-wise Tree Growth, `num_leaves` & Xử lý Category Bản địa',
    subtitle: 'Hiểu tại sao LightGBM vừa nhanh hơn vừa dễ Overfit nếu `num_leaves` quá lớn',
    difficulty: 'Trung bình',
    libraries: ['LightGBM', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['churn'],
    objectives: [
      'Phân biệt Depth-wise (XGBoost) và Leaf-wise (LightGBM: luôn chia chiếc lá giảm loss nhiều nhất).',
      'Ghi nhớ công thức vàng tránh Overfitting: `num_leaves <= 2^(max_depth) - 1` (ví dụ `max_depth=5` -> `num_leaves=15..25`).',
    ],
    sections: [
      {
        title: '1. Cột kiểu `category` bản địa trong LightGBM & HistGradientBoosting',
        contentMarkdown:
          'Thay vì One-Hot làm phình bảng thêm hàng chục cột thưa, cả LightGBM lẫn `HistGradientBoostingClassifier(categorical_features=...)` đều tìm cách gom nhóm hạng mục tối ưu trên histogram trực tiếp!',
      },
      {
        title: '2. Bảng Tham Số Quan Trọng Nhất Của LightGBM (Tránh Bẫy num_leaves)',
        contentMarkdown:
          '| Tham số LightGBM | Công thức / Khoảng chuẩn | Ghi chú thực chiến |\n| :--- | :--- | :--- |\n| `num_leaves` | **`< 2^max_depth`** (ví dụ `depth=5` → `num_leaves=15..25`) | **Tham số số 1 của LightGBM!** Để mặc định `31` với `max_depth=4` rất dễ bị Overfit |\n| `max_depth` | `4–8` (hoặc `-1`) | Ghìm lại cùng `num_leaves` để khống chế độ phức tạp cây |\n| `min_child_samples` | `20–100` | Giống `min_samples_leaf` — tăng lên `50–100` khi dữ liệu > 20.000 dòng |\n| `colsample_bytree` | `0.6–0.9` | Chọn tập con cột cho từng cây giúp cây đa dạng và chạy nhanh hơn |\n| `subsample` + `subsample_freq=1` | `0.7–0.9` | Nhớ đặt `subsample_freq=1` thì LightGBM mới kích hoạt subsample mỗi cây! |\n| `reg_alpha` / `reg_lambda` | `0–5` / `1–10` | Điều chuẩn L1/L2 giảm dao động dự đoán |',
      },
    ],
    exercise: {
      prompt: 'Chuyển các cột phân loại `["Country", "Gender"]` trong `bank_churn.csv` sang mã số hoặc `category` dtype và huấn luyện `LGBMClassifier(n_estimators=120, num_leaves=20, max_depth=5, learning_rate=0.06, random_state=42)` (fallback `HistGradientBoostingClassifier` hỗ trợ `categorical_features`). Tính `lgb_auc` trên test 20%.',
      requirements: [
        'Xử lý đủ cả biến số và 2 biến phân loại `Country`, `Gender`.',
        'Đạt `lgb_auc >= 0.75`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('bank_churn.csv')
feats = ['CreditScore', 'Country', 'Gender', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
X = df[feats].copy()
for c in ['Country', 'Gender']:
    X[c] = X[c].astype('category')
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

lgb_auc = 0.0
`,
      hintText: 'Dùng `try: from lightgbm import LGBMClassifier; clf = LGBMClassifier(n_estimators=120, num_leaves=20, max_depth=5, learning_rate=0.06, random_state=42, verbose=-1)` và `except ImportError: clf = HistGradientBoostingClassifier(max_iter=120, max_leaf_nodes=20, max_depth=5, learning_rate=0.06, categorical_features="from_dtype", random_state=42)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('bank_churn.csv')
feats = ['CreditScore', 'Country', 'Gender', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
X = df[feats].copy()
for c in ['Country', 'Gender']:
    X[c] = X[c].astype('category')
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

try:
    from lightgbm import LGBMClassifier
    clf = LGBMClassifier(
        n_estimators=120,
        num_leaves=20,
        max_depth=5,
        learning_rate=0.06,
        random_state=42,
        verbose=-1,
    )
except ImportError:
    clf = HistGradientBoostingClassifier(
        max_iter=120,
        max_leaf_nodes=20,
        max_depth=5,
        learning_rate=0.06,
        categorical_features='from_dtype',
        random_state=42,
    )

clf.fit(X_tr, y_tr)
lgb_auc = float(roc_auc_score(y_te, clf.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert float(lgb_auc) >= 0.75, f"lgb_auc={lgb_auc:.3f} chưa đạt >= 0.75."`,
    },
  },
  {
    id: 'L072',
    order: 72,
    trackId: 'track08_boosting',
    title: 'CatBoost: Symmetric Oblivious Trees & Ordered Target Statistics',
    subtitle: 'Vì sao CatBoost hầu như cho kết quả xuất sắc ngay từ tham số mặc định khi nhiều cột Category',
    difficulty: 'Trung bình',
    libraries: ['CatBoost', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Hiểu cấu trúc Cây Đối Xứng (Symmetric Tree: mọi nút cùng độ sâu dùng chung một điều kiện tách) giúp chống Overfit mạnh và suy luận cực nhanh.',
      'Khai báo `cat_features` trực tiếp trên chuỗi string thô.',
    ],
    sections: [
      {
        title: '1. Ordered Boosting chống Target Leakage trong chính thuật toán',
        contentMarkdown:
          '`CatBoost` (Yandex) giải quyết khéo léo hai vấn đề lớn của dữ liệu bảng: (1) biến phân loại có rất nhiều giá trị được mã hóa theo hoán vị thời gian giả (Ordered Target Encoding) không bị rò rỉ nhãn; (2) cây đối xứng hoạt động như một Regularizer tự nhiên rất khó học vẹt.',
      },
      {
        title: '2. Bảng Tham Số CatBoost & Cách Tinh Chỉnh Chuẩn Kaggle',
        contentMarkdown:
          '| Tham số CatBoost | Khoảng khuyên dùng | Cách tối ưu |\n| :--- | :--- | :--- |\n| `iterations` | `300–2000` | Tổng số cây (= `n_estimators`), kết hợp `early_stopping_rounds=50` |\n| `learning_rate` | `0.02–0.1` | CatBoost tự ước lượng learning rate khá thông minh nếu để `None`, hoặc chỉnh tay `0.03–0.06` |\n| `depth` | **`4–8`** (mặc định `6`) | Chú ý CatBoost chỉ tăng tối đa `<= 10`; `depth=6` đã rất mạnh cho phần lớn bảng |\n| `l2_leaf_reg` | `1.0–10.0` (mặc định `3.0`) | Phạt L2 giúp làm mượt lá (= `l2Regularization` Studio) |\n| `random_strength` | `1.0–5.0` | Thêm nhiễu ngẫu nhiên khi chọn ngưỡng chia sớm → tăng chống Overfit |\n| `auto_class_weights` | `"Balanced"` / `None` | Tự cân bằng trọng số khi lớp `1` hiếm gặp |',
      },
    ],
    exercise: {
      prompt: 'Train mô hình `CatBoostClassifier(iterations=150, depth=5, learning_rate=0.06, verbose=0, random_seed=42)` với `cat_features=["Grade", "Purpose", "Region"]` trên `loan_train.csv` (có fallback sang `ColumnTransformer + OrdinalEncoder + HistGradientBoostingClassifier` nếu không có `catboost`). Tính `cat_auc` trên test 20%.',
      requirements: [
        'Đưa cả cột số lẫn `["Grade", "Purpose", "Region"]` vào mô hình.',
        'Đạt `cat_auc >= 0.65`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = df[num_cols + cat_cols].copy()
for c in cat_cols:
    X[c] = X[c].astype(str)
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

cat_auc = 0.0
`,
      hintText: 'Dùng `try: from catboost import CatBoostClassifier` truyền `cat_features=cat_cols`; `except ImportError:` dùng `ColumnTransformer([("cat", OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1), cat_cols)], remainder="passthrough")` + `HistGradientBoostingClassifier`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OrdinalEncoder
from sklearn.pipeline import Pipeline
from sklearn.ensemble import HistGradientBoostingClassifier

df = pd.read_csv('loan_train.csv')
num_cols = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
cat_cols = ['Grade', 'Purpose', 'Region']
X = df[num_cols + cat_cols].copy()
for c in cat_cols:
    X[c] = X[c].astype(str)
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

try:
    from catboost import CatBoostClassifier
    model = CatBoostClassifier(iterations=150, depth=5, learning_rate=0.06, verbose=0, random_seed=42)
    model.fit(X_tr, y_tr, cat_features=cat_cols)
    probs = model.predict_proba(X_te)[:, 1]
except ImportError:
    prep = ColumnTransformer([
        ('cat', OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1), cat_cols),
    ], remainder='passthrough')
    model = Pipeline([
        ('prep', prep),
        ('hgb', HistGradientBoostingClassifier(max_iter=120, max_depth=5, learning_rate=0.06, random_state=42)),
    ])
    model.fit(X_tr, y_tr)
    probs = model.predict_proba(X_te)[:, 1]

cat_auc = float(roc_auc_score(y_te, probs))
`,
      checkPython: `assert float(cat_auc) >= 0.65, f"cat_auc={cat_auc:.3f} quá thấp."`,
    },
  },
  {
    id: 'L073',
    order: 73,
    trackId: 'track08_boosting',
    title: 'Early Stopping & Theo dõi Learning Curve (Train Loss vs Val Loss)',
    subtitle: 'Dừng đúng thời điểm vàng trước khi mô hình Boosting học thuộc nhiễu',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Matplotlib'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Bật `early_stopping=True, n_iter_no_change=15` trong Boosting.',
      'Trích xuất lịch sử loss qua từng vòng lặp (`staged_predict` hoặc `train_score_` / `validation_score_`) để tìm `best_iter`.',
    ],
    sections: [
      {
        title: '1. Chọn `learning_rate` nhỏ + `early_stopping` thay vì đoán mò `n_estimators`',
        contentMarkdown:
          'Thay vì vất vả thử `n_estimators=100, 300, 500`, cách chuẩn nhất là đặt `max_iter=1000`, `learning_rate=0.03`, bật **`early_stopping=True`** với một tập Validation `validation_fraction=0.15`. Ngay khi điểm Validation đi ngang 15–30 vòng liên tiếp, thuật toán tự động dừng và lưu lại mô hình tại đỉnh phong độ!',
      },
    ],
    exercise: {
      prompt: 'Khởi tạo `HistGradientBoostingRegressor(max_iter=500, learning_rate=0.05, early_stopping=True, validation_fraction=0.2, n_iter_no_change=15, random_state=42)` trên `housing.csv` (numeric cols, split 80/20). Kiểm chứng `n_iter_done = hgb.n_iter_` nhỏ hơn `500` và tính `r2_es`.',
      requirements: [
        'Train mô hình với `early_stopping=True` và lưu `n_iter_done = int(hgb.n_iter_)`.',
        'Xác nhận `10 <= n_iter_done < 500` và `r2_es >= 0.60`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

hgb = HistGradientBoostingRegressor(
    max_iter=500,
    learning_rate=0.05,
    early_stopping=True,
    validation_fraction=0.2,
    n_iter_no_change=15,
    random_state=42,
)
n_iter_done = 0
r2_es = 0.0
`,
      hintText: '`hgb.fit(X_tr, y_tr)`; `n_iter_done = int(hgb.n_iter_)`; `r2_es = float(r2_score(y_te, hgb.predict(X_te)))`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import r2_score

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

hgb = HistGradientBoostingRegressor(
    max_iter=500,
    learning_rate=0.05,
    early_stopping=True,
    validation_fraction=0.2,
    n_iter_no_change=15,
    random_state=42,
)
hgb.fit(X_tr, y_tr)
n_iter_done = int(hgb.n_iter_)
r2_es = float(r2_score(y_te, hgb.predict(X_te)))
`,
      checkPython: `assert 5 <= int(n_iter_done) < 500, f"Early stopping phải dừng trước 500 vòng, hiện là {n_iter_done}."
assert float(r2_es) >= 0.60, f"r2_es={r2_es:.3f} quá thấp."`,
    },
  },
  {
    id: 'L074',
    order: 74,
    trackId: 'track08_boosting',
    title: 'Voting & Weighted Probability Blending (Đa dạng Họ Mô hình)',
    subtitle: 'Vì sao kết hợp Linear + RandomForest + Boosting lại thắng mọi model đơn lẻ',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Hiểu nguyên tắc Đa dạng (Model Diversity): cây mạnh về tương tác phi tuyến, Logistic mạnh về xu hướng tuyến tính mượt.',
      'Dùng `VotingClassifier(voting="soft", weights=[...])` kết hợp 3 họ thuật toán khác nhau.',
    ],
    sections: [
      {
        title: '1. Bí quyết Ensembling thực chiến: Khác họ > Cùng họ',
        contentMarkdown:
          'Trộn 5 biến thể XGBoost với nhau thường chỉ tăng +0.0005. Nhưng trộn **LogisticRegression + RandomForest + HistGradientBoosting** thường mang lại bước nhảy rõ rệt vì sai số của mô hình tuyến tính và mô hình cây ít tương quan với nhau!',
      },
    ],
    exercise: {
      prompt: 'Xây dựng `VotingClassifier(voting="soft", weights=[1, 2, 2])` kết hợp 3 estimator: (1) `StandardScaler + LogisticRegression`, (2) `RandomForestClassifier`, (3) `HistGradientBoostingClassifier` trên `bank_churn.csv` (numeric cols, split 80/20 `stratify=y`). Tính `voting_auc`.',
      requirements: [
        'Sử dụng `VotingClassifier(..., voting="soft")`.',
        'Đạt `voting_auc >= 0.78` trên test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, VotingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

voting_auc = 0.0
`,
      hintText: '`clf = VotingClassifier([("lr", make_pipeline(StandardScaler(), LogisticRegression(max_iter=500))), ("rf", RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42)), ("hgb", HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42))], voting="soft", weights=[1, 2, 2]).fit(X_tr, y_tr)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, VotingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

voting = VotingClassifier(
    estimators=[
        ('lr', make_pipeline(StandardScaler(), LogisticRegression(max_iter=500))),
        ('rf', RandomForestClassifier(n_estimators=120, max_depth=6, random_state=42)),
        ('hgb', HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42)),
    ],
    voting='soft',
    weights=[1, 2, 2],
)
voting.fit(X_tr, y_tr)
voting_auc = float(roc_auc_score(y_te, voting.predict_proba(X_te)[:, 1]))
`,
      checkPython: `assert isinstance(voting, VotingClassifier) and voting.voting == 'soft', "Phải dùng VotingClassifier voting='soft'."
assert float(voting_auc) >= 0.78, f"voting_auc={voting_auc:.3f} chưa đạt >= 0.78."`,
    },
  },
  {
    id: 'L075',
    order: 75,
    trackId: 'track08_boosting',
    title: 'OOF Stacking (2-Level Meta-Learning) Chống Rò rỉ Chuẩn Kaggle',
    subtitle: 'Dùng đầu ra Out-of-Fold của các mô hình Tầng 1 làm đặc trưng cho Meta-Learner Tầng 2',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 35,
    datasetIds: ['titanic'],
    objectives: [
      'Hiểu kiến trúc Stacking 2 tầng (`StackingClassifier` dùng nội bộ CV để tạo meta-features sạch 100%).',
      'Kiểm chứng trọng số học được của Meta-Learner `LogisticRegression` cho thấy model Tầng 1 nào được tin dùng nhất.',
    ],
    sections: [
      {
        title: '1. Khác biệt giữa Blending trọng số cố định và Stacking?',
        contentMarkdown:
          'Thay vì chọn tay trọng số `[0.3, 0.7]`, **Stacking** huấn luyện một mô hình Tầng 2 (Meta-Learner như `LogisticRegression` hoặc `Ridge`) nhận dự đoán OOF của 3–4 mô hình Tầng 1 làm input. `StackingClassifier(..., cv=5)` của Scikit-Learn tự lo toàn bộ việc tạo OOF sạch sẽ cho bạn!',
      },
    ],
    exercise: {
      prompt: 'Xây dựng `StackingClassifier` 2 tầng (`cv=5`) cho `titanic.csv` với 3 base estimators: `LogisticRegression`, `RandomForestClassifier`, `HistGradientBoostingClassifier`, và `final_estimator=LogisticRegression()`. Đánh giá `stack_auc` trên holdout test 20%.',
      requirements: [
        'Dùng `StackingClassifier(estimators=..., final_estimator=LogisticRegression(), cv=5)`.',
        'Đạt `stack_auc >= 0.75` và trích xuất `meta_coefs` có đúng 3 trọng số tương ứng 3 base models.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, StackingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

stack_auc = 0.0
meta_coefs = np.array([])
`,
      hintText: 'Tạo `StackingClassifier(estimators=[...], final_estimator=LogisticRegression(), cv=5)` (nhớ bọc `SimpleImputer` cho LR và RF), fit trên `X_tr, y_tr`, rồi lấy `stack.final_estimator_.coef_[0]`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier, StackingClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('titanic.csv')
df['IsMale'] = (df['Sex'] == 'male').astype(int)
X = df[['Pclass', 'IsMale', 'Age', 'SibSp', 'Parch', 'Fare']]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

stack = StackingClassifier(
    estimators=[
        ('lr', make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), LogisticRegression(max_iter=500))),
        ('rf', make_pipeline(SimpleImputer(strategy='median'), RandomForestClassifier(n_estimators=100, max_depth=6, random_state=42))),
        ('hgb', HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42)),
    ],
    final_estimator=LogisticRegression(),
    cv=5,
)
stack.fit(X_tr, y_tr)
stack_auc = float(roc_auc_score(y_te, stack.predict_proba(X_te)[:, 1]))
meta_coefs = stack.final_estimator_.coef_[0]
`,
      checkPython: `assert isinstance(stack, StackingClassifier), "Phải dùng StackingClassifier."
assert len(meta_coefs) == 3, "Meta-learner phải có 3 trọng số ứng với 3 base estimators."
assert float(stack_auc) >= 0.75, f"stack_auc={stack_auc:.3f} quá thấp."`,
    },
  },
  {
    id: 'L076',
    order: 76,
    trackId: 'track08_boosting',
    title: 'Diễn giải Mô hình: Partial Dependence & Error Analysis (Top Sai số Lớn nhất)',
    subtitle: 'Hiểu sâu tại sao mô hình dự đoán cao/thấp và kiểm tra 5 ca dự đoán sai thảm nhất',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['housing'],
    objectives: [
      'Dùng `partial_dependence` đo hiệu ứng biên của từng biến (ví dụ khi `LivingArea` tăng thì giá dự đoán thay đổi ra sao).',
      'Xây dựng bảng `top_errors` liệt kê 5 căn nhà có sai số tuyệt đối `|y_true - y_pred|` cao nhất để tìm insight tạo feature mới.',
    ],
    sections: [
      {
        title: '1. Error Analysis — Việc làm tách biệt Senior ML và Người mới',
        contentMarkdown:
          'Sau khi train xong, đừng chỉ nhìn vào 1 con số RMSE rồi dừng! Hãy lọc ra 5–10 dòng bị sai lệch nhiều nhất để soi: *Liệu có outlier nào chưa kẹp, hay thiếu một feature về địa lý/tình trạng nhà không?*',
      },
    ],
    exercise: {
      prompt: 'Train `HistGradientBoostingRegressor(max_iter=80, random_state=42)` trên `housing.csv` (numeric cols, split 80/20 `random_state=42`). Tạo DataFrame `top5_errors` gồm 5 mẫu test có `abs_error = |y_true - y_pred|` cao nhất (sắp giảm dần), và tính Partial Dependence của cột `"LivingArea"` bằng `sklearn.inspection.partial_dependence`.',
      requirements: [
        '`top5_errors` dài đúng 5 dòng, có cột `abs_error` được sắp xếp giảm dần.',
        '`pdp_res` trả về từ `partial_dependence(model, X_te, features=["LivingArea"])` có giá trị đơn điệu tăng theo diện tích.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import partial_dependence

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

model = HistGradientBoostingRegressor(max_iter=80, random_state=42).fit(X_tr, y_tr)
top5_errors = pd.DataFrame()
pdp_res = None
`,
      hintText: '`eval_df = X_te.copy(); eval_df["y_true"] = y_te; eval_df["y_pred"] = model.predict(X_te); eval_df["abs_error"] = (eval_df["y_true"] - eval_df["y_pred"]).abs()`, lấy `.sort_values("abs_error", ascending=False).head(5)`. Gọi `pdp_res = partial_dependence(model, X_te, features=["LivingArea"])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.inspection import partial_dependence

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats]
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

model = HistGradientBoostingRegressor(max_iter=80, random_state=42).fit(X_tr, y_tr)
eval_df = X_te.copy()
eval_df['y_true'] = y_te
eval_df['y_pred'] = model.predict(X_te)
eval_df['abs_error'] = (eval_df['y_true'] - eval_df['y_pred']).abs()
top5_errors = eval_df.sort_values('abs_error', ascending=False).head(5)

pdp_res = partial_dependence(model, X_te, features=['LivingArea'])
`,
      checkPython: `assert len(top5_errors) == 5 and 'abs_error' in top5_errors.columns, "top5_errors phải có 5 dòng và cột abs_error."
assert top5_errors['abs_error'].is_monotonic_decreasing, "top5_errors phải sắp xếp giảm dần theo abs_error."
assert pdp_res is not None and 'average' in pdp_res, "Chưa tính partial_dependence."
avg = pdp_res['average'][0]
assert avg[-1] > avg[0], "Partial dependence của LivingArea phải có xu hướng tăng khi diện tích tăng."`,
    },
  },
];
