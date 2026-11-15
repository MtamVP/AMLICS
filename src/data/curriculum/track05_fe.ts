import { LessonDefinition } from '../../types/curriculum';

export const TRACK05_FE_LESSONS: LessonDefinition[] = [
  {
    id: 'L042',
    order: 42,
    trackId: 'track05_fe',
    title: 'Domain Ratios & Interaction Features: Tạo Đặc trưng Nghiệp vụ',
    subtitle: 'Biến dữ liệu thô thành chỉ số chuyên ngành có sức phân tách vượt trội',
    difficulty: 'Cơ bản',
    libraries: ['Pandas', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing', 'titanic'],
    objectives: [
      'Thiết kế đặc trưng tỷ số (`LivingRatio = LivingArea / LotArea`), hiệu (`HouseAge = 2025 - YearBuilt`), và tổng gia đình (`FamilySize = SibSp + Parch + 1`).',
      'Tránh lỗi chia cho 0 bằng `+ 1e-6` hoặc `np.where`.',
    ],
    sections: [
      {
        title: '1. Tại sao tỷ số (Ratios) giúp mô hình học nhanh gấp bội?',
        contentMarkdown:
          'Cây quyết định (Decision Tree / XGBoost) cắt không gian theo trục tọa độ vuông góc (`LotArea > 500`, `LivingArea > 120`). Để xấp xỉ đường chéo `LivingArea / LotArea`, cây cần rất nhiều tầng cắt bậc thang! Nếu bạn tính sẵn cột `AreaRatio`, chỉ 1 nhát cắt đã nắm trọn quy luật.',
        callout: {
          type: 'tip',
          title: '3 công thức Interaction hay dùng ở Kaggle',
          text: '1) Tỷ số (`A / (B + eps)`), 2) Mật độ (`Giá trị / Diện tích hoặc Số lượng`), 3) Cờ đơn vị đặc biệt (`IsAlone = (FamilySize == 1)`).',
        },
      },
    ],
    exercise: {
      prompt: 'Trên `titanic.csv`, tạo 3 feature nghiệp vụ mới: `FamilySize = SibSp + Parch + 1`, `IsAlone = (FamilySize == 1).astype(int)`, và `FarePerPerson = Fare.fillna(Fare.median()) / FamilySize`. Tính hệ số tương quan của `IsAlone` với `Survived` lưu vào `corr_alone`.',
      requirements: [
        'Tạo đủ 3 cột `FamilySize`, `IsAlone`, `FarePerPerson` trong `df`.',
        'Tính `corr_alone = float(df["IsAlone"].corr(df["Survived"]))`.',
      ],
      starterCode: `df = pd.read_csv('titanic.csv')

# Tạo FamilySize, IsAlone, FarePerPerson
corr_alone = 0.0
`,
      hintText: '`df["FamilySize"] = df["SibSp"] + df["Parch"] + 1`, `df["IsAlone"] = (df["FamilySize"] == 1).astype(int)`, `df["FarePerPerson"] = df["Fare"].fillna(df["Fare"].median()) / df["FamilySize"]`.',
      solutionCode: `df = pd.read_csv('titanic.csv')
df['FamilySize'] = df['SibSp'] + df['Parch'] + 1
df['IsAlone'] = (df['FamilySize'] == 1).astype(int)
df['FarePerPerson'] = df['Fare'].fillna(df['Fare'].median()) / df['FamilySize']
corr_alone = float(df['IsAlone'].corr(df['Survived']))
`,
      checkPython: `assert {'FamilySize', 'IsAlone', 'FarePerPerson'}.issubset(df.columns), "Thiếu 1 trong 3 cột feature mới."
assert (df['FamilySize'] >= 1).all(), "FamilySize phải >= 1."
assert set(df['IsAlone'].unique()).issubset({0, 1}), "IsAlone chỉ chứa 0 và 1."
assert abs(float(corr_alone) - float(df['IsAlone'].corr(df['Survived']))) < 1e-6, "corr_alone chưa đúng."`,
    },
  },
  {
    id: 'L043',
    order: 43,
    trackId: 'track05_fe',
    title: 'Binning (Rời rạc hóa) & Polynomial Features',
    subtitle: 'Phân nhóm biến liên tục theo độ rộng/phân vị và mở rộng bậc 2 có kiểm soát',
    difficulty: 'Trung bình',
    libraries: ['Pandas', 'Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'housing'],
    objectives: [
      'Dùng `pd.cut` (chia khoảng đều) vs `pd.qcut` (chia đều số lượng mẫu theo phân vị).',
      'Khám phá `PolynomialFeatures(degree=2, include_bias=False)` và hiểu nguy cơ nổ số chiều.',
    ],
    sections: [
      {
        title: '1. Khi nào rời rạc hóa (Binning) lại tốt cho Linear/Tree?',
        contentMarkdown:
          'Rủi ro khách hàng đôi khi không tuyến tính theo tuổi: nhóm `18–25` và `> 60` có thể hành xử khác hẳn nhóm trung niên `30–50`. Dùng `pd.cut` biến `Age` thành nhóm tuổi hoặc `pd.qcut(..., q=4)` chia 4 tứ phân vị giúp Logistic Regression bắt được hiệu ứng phi tuyến ngay lập tức.',
      },
    ],
    exercise: {
      prompt: 'Chia cột `Age` trong `bank_churn.csv` thành 4 nhóm bằng `pd.cut(df["Age"], bins=[0, 30, 40, 50, 120], labels=["<30", "30-40", "40-50", ">50"])` lưu vào `df["AgeGroup"]`, đồng thời tạo ma trận đa thức bậc 2 `X_poly` (`PolynomialFeatures(degree=2, include_bias=False)`) trên `["CreditScore", "Balance"]`.',
      requirements: [
        'Cột `AgeGroup` đúng 4 nhãn `["<30", "30-40", "40-50", ">50"]` và không có NaN.',
        '`X_poly` có đúng 5 cột đầu ra (`x1, x2, x1^2, x1*x2, x2^2`).',
      ],
      starterCode: `from sklearn.preprocessing import PolynomialFeatures
df = pd.read_csv('bank_churn.csv')

df['AgeGroup'] = None
poly = PolynomialFeatures(degree=2, include_bias=False)
X_poly = None
`,
      hintText: '`df["AgeGroup"] = pd.cut(df["Age"], bins=[0, 30, 40, 50, 120], labels=["<30", "30-40", "40-50", ">50"])` và `X_poly = poly.fit_transform(df[["CreditScore", "Balance"]].fillna(0))`.',
      solutionCode: `from sklearn.preprocessing import PolynomialFeatures
df = pd.read_csv('bank_churn.csv')

df['AgeGroup'] = pd.cut(df['Age'], bins=[0, 30, 40, 50, 120], labels=['<30', '30-40', '40-50', '>50'])
poly = PolynomialFeatures(degree=2, include_bias=False)
X_poly = poly.fit_transform(df[['CreditScore', 'Balance']].fillna(0))
`,
      checkPython: `assert df['AgeGroup'].isna().sum() == 0, "AgeGroup còn giá trị NaN."
assert set(df['AgeGroup'].astype(str).unique()).issubset({'<30', '30-40', '40-50', '>50'}), "Nhãn AgeGroup chưa đúng."
assert X_poly.shape == (len(df), 5), f"Polynomial degree=2 cho 2 cột phải ra 5 cột, nhận {X_poly.shape}."`,
    },
  },
  {
    id: 'L044',
    order: 44,
    trackId: 'track05_fe',
    title: 'Mã hóa Tuần hoàn Thời gian (Cyclical sin/cos) & Calendar Features',
    subtitle: 'Giúp mô hình hiểu 23h đêm nằm sát 0h sáng thay vì cách xa 23 đơn vị',
    difficulty: 'Trung bình',
    libraries: ['NumPy', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['fraud', 'daily_sales'],
    objectives: [
      'Chuyển đổi giờ (`0..23`), ngày trong tuần (`0..6`), ngày trong năm (`1..365`) sang cặp `(sin, cos)`.',
      'Trích xuất `dayofweek`, `is_weekend`, `month` từ chuỗi ngày ISO.',
    ],
    sections: [
      {
        title: '1. Vì sao không để nguyên số giờ 0..23?',
        contentMarkdown:
          'Về mặt số học, `23` và `0` cách nhau `23` đơn vị, nhưng trên mặt đồng hồ chúng chỉ cách nhau `1 giờ`! Bằng cách chiếu lên vòng tròn lượng giác:\n$$x_{sin} = \\sin\\left(\\frac{2\\pi \\cdot h}{24}\\right), \\quad x_{cos} = \\cos\\left(\\frac{2\\pi \\cdot h}{24}\\right)$$\nKhoảng cách Euclid giữa `23h` và `0h` đúng bằng khoảng cách giữa `1h` và `2h`.',
      },
    ],
    exercise: {
      prompt: 'Trên `credit_fraud.csv`, tạo cặp đặc trưng tuần hoàn `hour_sin` và `hour_cos` từ cột `HourOfDay` (chu kỳ 24), và kiểm chứng `hour_sin**2 + hour_cos**2 == 1.0`.',
      requirements: [
        'Tạo 2 cột `hour_sin` và `hour_cos` dùng chu kỳ 24 (`2 * np.pi * HourOfDay / 24`).',
        'Tạo thêm cờ `is_night = ((df["HourOfDay"] <= 5) | (df["HourOfDay"] >= 23)).astype(int)`.',
      ],
      starterCode: `df = pd.read_csv('credit_fraud.csv')

# Tạo hour_sin, hour_cos và is_night
`,
      hintText: '`angle = 2 * np.pi * df["HourOfDay"] / 24.0`, `df["hour_sin"] = np.sin(angle)`, `df["hour_cos"] = np.cos(angle)`.',
      solutionCode: `df = pd.read_csv('credit_fraud.csv')
angle = 2.0 * np.pi * df['HourOfDay'] / 24.0
df['hour_sin'] = np.sin(angle)
df['hour_cos'] = np.cos(angle)
df['is_night'] = ((df['HourOfDay'] <= 5) | (df['HourOfDay'] >= 23)).astype(int)
`,
      checkPython: `assert {'hour_sin', 'hour_cos', 'is_night'}.issubset(df.columns), "Thiếu cột cần tạo."
radius_sq = df['hour_sin']**2 + df['hour_cos']**2
assert np.allclose(radius_sq, 1.0, atol=1e-6), "hour_sin^2 + hour_cos^2 phải luôn bằng 1."
assert set(df['is_night'].unique()).issubset({0, 1}), "is_night chỉ được chứa 0/1."`,
    },
  },
  {
    id: 'L045',
    order: 45,
    trackId: 'track05_fe',
    title: 'Group Aggregation Features: So sánh Cá nhân với Nhóm (`transform`)',
    subtitle: 'Tạo độ lệch chuẩn hóa theo nhóm (`Z-score within group`) cực mạnh trên bảng',
    difficulty: 'Trung bình',
    libraries: ['Pandas', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing', 'orders'],
    objectives: [
      'Dùng `groupby().transform("mean")` để tạo cột thống kê nhóm giữ nguyên số dòng.',
      'Tính khoảng cách so với trung bình khu vực: `PriceVsNeighborhood` / `AreaDiffFromMean`.',
    ],
    sections: [
      {
        title: '1. Đặc trưng tương đối mạnh hơn con số tuyệt đối',
        contentMarkdown:
          'Một căn nhà rộng `120 m2` là rất lớn ở Quận 1, nhưng lại nhỏ ở vùng ngoại ô. Bằng `df["AreaDiff"] = df["LivingArea"] - df.groupby("Neighborhood")["LivingArea"].transform("mean")`, mô hình ngay lập tức biết căn nhà này rộng hay hẹp **so với hàng xóm cùng khu**.',
      },
    ],
    exercise: {
      prompt: 'Từ `orders.csv`, tạo cột `OrderTotal = Quantity * UnitPrice`, sau đó dùng `groupby("CustomerId")["OrderTotal"].transform(...)` tạo 2 feature mới cho mỗi dòng: `CustMeanOrder` (giá trị đơn TB của khách đó) và `OrderRatioToMean = OrderTotal / (CustMeanOrder + 1e-6)`.',
      requirements: [
        'Tạo đủ 3 cột `OrderTotal`, `CustMeanOrder`, `OrderRatioToMean` giữ nguyên 400 dòng của `orders.csv`.',
        'Kiểm tra giá trị trung bình của `OrderRatioToMean` xấp xỉ quanh 1.0.',
      ],
      starterCode: `df = pd.read_csv('orders.csv')

# Tạo OrderTotal, CustMeanOrder, OrderRatioToMean
`,
      hintText: '`df["OrderTotal"] = df["Quantity"] * df["UnitPrice"]`, `df["CustMeanOrder"] = df.groupby("CustomerId")["OrderTotal"].transform("mean")`, `df["OrderRatioToMean"] = df["OrderTotal"] / (df["CustMeanOrder"] + 1e-6)`.',
      solutionCode: `df = pd.read_csv('orders.csv')
df['OrderTotal'] = df['Quantity'] * df['UnitPrice']
df['CustMeanOrder'] = df.groupby('CustomerId')['OrderTotal'].transform('mean')
df['OrderRatioToMean'] = df['OrderTotal'] / (df['CustMeanOrder'] + 1e-6)
`,
      checkPython: `assert {'OrderTotal', 'CustMeanOrder', 'OrderRatioToMean'}.issubset(df.columns), "Thiếu cột cần tạo."
assert len(df) == len(pd.read_csv('orders.csv')), "Phải dùng transform() để giữ nguyên số dòng."
assert abs(float(df['OrderRatioToMean'].mean()) - 1.0) < 0.25, "OrderRatioToMean không hợp lý."`,
    },
  },
  {
    id: 'L046',
    order: 46,
    trackId: 'track05_fe',
    title: 'Out-of-Fold Target Encoding (Chống Overfitting cho Biến High-Cardinality)',
    subtitle: 'Mã hóa danh mục theo trung bình Target chuẩn Kaggle Grandmaster với Smoothing',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas', 'NumPy'],
    estimatedMinutes: 35,
    datasetIds: ['kaggle_loan_train', 'kaggle_loan_test'],
    objectives: [
      'Hiểu vì sao Target Encoding ngây thơ gây Overfitting nghiêm trọng.',
      'Tự triển khai OOF Target Encoding có hệ số làm mượt (Bayesian m-estimate smoothing) cho tập Train và mapping an toàn cho tập Test.',
    ],
    sections: [
      {
        title: '1. Công thức Smoothed Target Encoding & OOF',
        contentMarkdown:
          'Thay vì thay trực tiếp bằng trung bình thô của hạng mục (dễ quá khớp nếu hạng mục chỉ có 2 mẫu), ta kéo nhẹ về trung bình toàn cục `global_mean`:\n$$\\hat{y}_c = \\frac{n_c \\cdot \\bar{y}_c + m \\cdot \\bar{y}_{global}}{n_c + m}$$\nQuan trọng hơn: trên tập Train, giá trị của dòng thuộc Fold $k$ **chỉ được tính từ các dòng ngoài Fold $k$** (Out-of-Fold)!',
        callout: {
          type: 'warning',
          title: 'Không bao giờ tính Target Encoding bằng full train rồi mới chạy CV',
          text: 'Làm vậy CV sẽ tăng ảo cực mạnh nhưng điểm Private Leaderboard sẽ rớt thảm hại vì leak trực tiếp `y_val` vào `X_val`.',
        },
      },
    ],
    exercise: {
      prompt: 'Cài đặt OOF Smoothed Target Encoding (`n_splits=5, smoothing=10`) cho cột `Purpose` trên `loan_train.csv` (target `LoanStatus`) để tạo vector `oof_purpose_te`, đồng thời tính `test_purpose_te` cho `loan_test.csv` từ toàn bộ train.',
      requirements: [
        '`oof_purpose_te` là mảng 1D dài đúng bằng `len(train_df)`, không có NaN.',
        'Các giá trị nằm gọn trong `[0, 1]` và gần bằng tỷ lệ duyệt vay từng `Purpose`.',
        '`test_purpose_te` dài đúng bằng `len(test_df)`, không có NaN.',
      ],
      starterCode: `from sklearn.model_selection import StratifiedKFold
train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_purpose_te = np.zeros(len(train_df))
m = 10.0

# Tính OOF Target Encoding cho từng fold + test_purpose_te từ toàn bộ train
test_purpose_te = np.zeros(len(test_df))
`,
      hintText: 'Trong vòng lặp `for tr_idx, va_idx in skf.split(train_df, train_df["LoanStatus"]):`, lấy `sub = train_df.iloc[tr_idx]`, `g_mean = sub["LoanStatus"].mean()`, `stats = sub.groupby("Purpose")["LoanStatus"].agg(["count", "mean"])`, `enc = (stats["count"]*stats["mean"] + m*g_mean) / (stats["count"] + m)`, rồi `train_df.iloc[va_idx]["Purpose"].map(enc).fillna(g_mean)`.',
      solutionCode: `from sklearn.model_selection import StratifiedKFold
train_df = pd.read_csv('loan_train.csv')
test_df = pd.read_csv('loan_test.csv')

skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
oof_purpose_te = np.zeros(len(train_df))
m = 10.0

for tr_idx, va_idx in skf.split(train_df, train_df['LoanStatus']):
    sub = train_df.iloc[tr_idx]
    g_mean = float(sub['LoanStatus'].mean())
    stats = sub.groupby('Purpose')['LoanStatus'].agg(['count', 'mean'])
    smooth_map = (stats['count'] * stats['mean'] + m * g_mean) / (stats['count'] + m)
    oof_purpose_te[va_idx] = train_df.iloc[va_idx]['Purpose'].map(smooth_map).fillna(g_mean).values

full_mean = float(train_df['LoanStatus'].mean())
full_stats = train_df.groupby('Purpose')['LoanStatus'].agg(['count', 'mean'])
full_map = (full_stats['count'] * full_stats['mean'] + m * full_mean) / (full_stats['count'] + m)
test_purpose_te = test_df['Purpose'].map(full_map).fillna(full_mean).values
`,
      checkPython: `assert len(oof_purpose_te) == len(train_df) and np.isnan(oof_purpose_te).sum() == 0, "oof_purpose_te sai độ dài hoặc còn NaN."
assert len(test_purpose_te) == len(test_df) and np.isnan(test_purpose_te).sum() == 0, "test_purpose_te sai độ dài hoặc còn NaN."
assert oof_purpose_te.min() >= 0.0 and oof_purpose_te.max() <= 1.0, "Giá trị encoding phải trong [0, 1]."
assert np.std(oof_purpose_te) > 1e-4, "oof_purpose_te toàn hằng số (chưa map đúng)."`,
    },
  },
  {
    id: 'L047',
    order: 47,
    trackId: 'track05_fe',
    title: 'Filter Selection: VarianceThreshold, SelectKBest & Mutual Information',
    subtitle: 'Loại bỏ đặc trưng rác/hằng số và xếp hạng độ phụ thuộc phi tuyến bằng MI',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'fraud'],
    objectives: [
      'Hiểu khác biệt giữa F-test tuyến tính (`f_classif`) và Thông tin tương hỗ phi tuyến (`mutual_info_classif`).',
      'Dùng `SelectKBest` bên trong Pipeline để chọn top-K cột có tín hiệu mạnh nhất.',
    ],
    sections: [
      {
        title: '1. Mutual Information bắt được quan hệ phi tuyến hình chữ U',
        contentMarkdown:
          'Nếu biến $X$ và $Y$ có quan hệ hình parabol $Y = X^2$, tương quan Pearson (và `f_regression`) sẽ ra bằng **0**! Ngược lại, `mutual_info_classif` / `mutual_info_regression` đo mức độ giảm Entropy bất kể dạng hàm tuyến tính hay phi tuyến.',
      },
    ],
    exercise: {
      prompt: 'Tính điểm `mutual_info_classif(X, y, random_state=42)` trên 6 cột số của `bank_churn.csv` (`CreditScore, Age, Balance, NumProducts, IsActiveMember, Churn` với 5 cột đầu làm `X`), lưu Series điểm số giảm dần vào `mi_scores`, và dùng `SelectKBest(mutual_info_classif, k=3)` trích xuất danh sách 3 cột top vào `top3_cols`.',
      requirements: [
        '`mi_scores` là Pandas Series có index là 5 tên cột feature, sắp giảm dần.',
        '`top3_cols` là list 3 tên cột được `SelectKBest(..., k=3)` chọn trên `X_train` (split 80/20).',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_selection import mutual_info_classif, SelectKBest

df = pd.read_csv('bank_churn.csv')
feats = ['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
X_tr, X_te, y_tr, y_te = train_test_split(df[feats], df['Churn'], test_size=0.2, stratify=df['Churn'], random_state=42)

mi_scores = pd.Series(dtype=float)
top3_cols = []
`,
      hintText: '`mi_vals = mutual_info_classif(X_tr, y_tr, random_state=42)`, `mi_scores = pd.Series(mi_vals, index=feats).sort_values(ascending=False)`. Với `SelectKBest`: `sel = SelectKBest(lambda a, b: mutual_info_classif(a, b, random_state=42), k=3).fit(X_tr, y_tr)`, `top3_cols = list(X_tr.columns[sel.get_support()])`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.feature_selection import mutual_info_classif, SelectKBest

df = pd.read_csv('bank_churn.csv')
feats = ['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']
X_tr, X_te, y_tr, y_te = train_test_split(df[feats], df['Churn'], test_size=0.2, stratify=df['Churn'], random_state=42)

mi_vals = mutual_info_classif(X_tr, y_tr, random_state=42)
mi_scores = pd.Series(mi_vals, index=feats).sort_values(ascending=False)

selector = SelectKBest(lambda a, b: mutual_info_classif(a, b, random_state=42), k=3)
selector.fit(X_tr, y_tr)
top3_cols = list(X_tr.columns[selector.get_support()])
`,
      checkPython: `assert len(mi_scores) == 5 and mi_scores.is_monotonic_decreasing, "mi_scores phải đủ 5 feature và sắp giảm dần."
assert len(top3_cols) == 3 and set(top3_cols).issubset(set(feats)), "top3_cols phải chứa đúng 3 tên feature hợp lệ."`,
    },
  },
  {
    id: 'L048',
    order: 48,
    trackId: 'track05_fe',
    title: 'Embedded & Permutation Feature Importance (Chẩn đoán Đóng góp Thực)',
    subtitle: 'Vì sao Gini importance hay thiên vị và Permutation Importance trên Validation công bằng hơn',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['housing'],
    objectives: [
      'Hiểu nhược điểm của `feature_importances_` mặc định trong cây (thổi phồng biến nhiều giá trị liên tục).',
      'Dùng `permutation_importance(model, X_val, y_val)` để đo mức rớt điểm thực sự khi xáo trộn từng cột.',
    ],
    sections: [
      {
        title: '1. Nguyên lý Xáo trộn (Permutation) trên tập Validation',
        contentMarkdown:
          'Để biết cột `LivingArea` quan trọng thế nào, `permutation_importance` giữ nguyên model đã train, chỉ tráo ngẫu nhiên thứ tự các phần tử trong cột `LivingArea` của tập Validation rồi đo lại $R^2$ hoặc RMSE. Cột nào càng làm điểm rơi tự do thì cột đó càng quan trọng thật sự!',
      },
    ],
    exercise: {
      prompt: 'Huấn luyện `RandomForestRegressor(n_estimators=80, random_state=42)` trên `housing.csv` (dùng các cột `["LotArea", "LivingArea", "Bedrooms", "YearBuilt", "DistCenterKm", "HasGarage"]`, split 80/20), sau đó tính `permutation_importance(..., n_repeats=8, random_state=42)` trên `X_test, y_test` và lưu tên cột quan trọng nhất vào `most_important_col`.',
      requirements: [
        'Khớp `RandomForestRegressor` trên tập train.',
        'Tính `perm_imp = permutation_importance(rf, X_test, y_test, n_repeats=8, random_state=42)`.',
        '`most_important_col` là tên cột có `importances_mean` cao nhất.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance

df = pd.read_csv('housing.csv')
cols = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[cols].fillna(df[cols].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

rf = RandomForestRegressor(n_estimators=80, random_state=42)
most_important_col = ''
`,
      hintText: '`rf.fit(X_tr, y_tr)`, `perm_imp = permutation_importance(rf, X_te, y_te, n_repeats=8, random_state=42)`, `most_important_col = cols[int(np.argmax(perm_imp.importances_mean))]`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.inspection import permutation_importance

df = pd.read_csv('housing.csv')
cols = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[cols].fillna(df[cols].median())
y = df['SalePrice']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

rf = RandomForestRegressor(n_estimators=80, random_state=42)
rf.fit(X_tr, y_tr)
perm_imp = permutation_importance(rf, X_te, y_te, n_repeats=8, random_state=42)
most_important_col = cols[int(np.argmax(perm_imp.importances_mean))]
`,
      checkPython: `assert 'perm_imp' in globals() and hasattr(perm_imp, 'importances_mean'), "Chưa chạy permutation_importance."
assert most_important_col in cols, "most_important_col phải thuộc danh sách cột."
assert perm_imp.importances_mean.max() > 0.05, "Permutation importance quá thấp (model chưa học được)."`,
    },
  },
  {
    id: 'L049',
    order: 49,
    trackId: 'track05_fe',
    title: 'SelectFromModel & Recursive Feature Elimination (RFE)',
    subtitle: 'Tự động tỉa bớt đặc trưng nhiễu bằng L1 Lasso hoặc độ quan trọng cây',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'So sánh `SelectFromModel` (nhanh, dùng ngưỡng) và `RFE` (cắt tỉa đệ quy từng bước).',
      'Kiểm chứng CV sau khi rút gọn feature có giữ hoặc cải thiện hiệu năng.',
    ],
    sections: [
      {
        title: '1. Ít feature hơn = Ít Overfitting hơn',
        contentMarkdown:
          'Sau vòng Feature Engineering bùng nổ tạo ra hàng chục cột mới, bước tỉa bỏ đặc trưng yếu (`RFE` với `step=1` hoặc `SelectFromModel` dựa trên `LogisticRegression(penalty="l1", solver="liblinear")`) giúp mô hình gọn nhẹ và ổn định hơn trên tập Private Test.',
      },
    ],
    exercise: {
      prompt: 'Trên `loan_train.csv` (dùng 5 cột số `["ApplicantIncome", "CoapplicantIncome", "LoanAmount", "CreditHistory", "EmploymentYears"]` điền median), dùng `RFE(estimator=LogisticRegression(max_iter=500), n_features_to_select=3)` để chọn ra 3 đặc trưng tốt nhất vào `selected_features`.',
      requirements: [
        'Chuẩn hóa bằng `StandardScaler` trước khi đưa vào `RFE` để so sánh công bằng hệ số Logistic.',
        '`len(selected_features) == 3` và tập `selected_features` là list tên cột.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import RFE
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats].fillna(df[feats].median())
y = df['LoanStatus']

selected_features = []
`,
      hintText: '`X_sc = StandardScaler().fit_transform(X)`, `rfe = RFE(LogisticRegression(max_iter=500), n_features_to_select=3).fit(X_sc, y)`, `selected_features = [f for f, keep in zip(feats, rfe.support_) if keep]`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
from sklearn.feature_selection import RFE
from sklearn.linear_model import LogisticRegression

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats].fillna(df[feats].median())
y = df['LoanStatus']

X_sc = StandardScaler().fit_transform(X)
rfe = RFE(estimator=LogisticRegression(max_iter=500), n_features_to_select=3)
rfe.fit(X_sc, y)
selected_features = [f for f, keep in zip(feats, rfe.support_) if keep]
`,
      checkPython: `assert isinstance(selected_features, list) and len(selected_features) == 3, "Phải chọn đúng 3 đặc trưng."
assert set(selected_features).issubset(set(feats)), "Tên cột chọn ra không hợp lệ."
assert 'CreditHistory' in selected_features, "CreditHistory là đặc trưng mạnh nhất nhưng không có trong kết quả."`,
    },
  },
];
