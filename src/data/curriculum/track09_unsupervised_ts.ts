import { LessonDefinition } from '../../types/curriculum';

export const TRACK09_UNSUPERVISED_TS_LESSONS: LessonDefinition[] = [
  {
    id: 'L077',
    order: 77,
    trackId: 'track09_unsupervised_ts',
    title: 'K-Means Clustering, Phương pháp Elbow & Silhouette Score',
    subtitle: 'Phân khúc khách hàng không nhãn bằng khoảng cách tâm cụm chuẩn hóa',
    difficulty: 'Cơ bản',
    libraries: ['Scikit-Learn', 'Matplotlib'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext', 'churn'],
    objectives: [
      'Chuẩn hóa dữ liệu trước khi phân cụm K-Means.',
      'Tính `inertia_` (Elbow) và `silhouette_score` để chọn số cụm `k` tối ưu.',
    ],
    sections: [
      {
        title: '1. Đo chất lượng phân cụm khi không có nhãn `y`',
        contentMarkdown:
          '**Silhouette Score** nằm trong `[-1, +1]`: gần `+1` nghĩa là điểm nằm rất khít trong cụm của mình và cách xa cụm hàng xóm; gần `0` là các cụm chồng lấn lên nhau.',
      },
    ],
    exercise: {
      prompt: 'Chạy `KMeans(n_clusters=k, n_init=10, random_state=42)` trên `iris_extended.csv` (4 cột số đã chuẩn hóa `StandardScaler`) cho `k` trong `[2, 3, 4, 5, 6]`. Lưu dict `sil_scores` và tìm `best_k` có Silhouette cao nhất.',
      requirements: [
        '`sil_scores` có đủ 5 khóa `2..6`.',
        '`sil_scores[best_k] >= 0.40`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

df = pd.read_csv('iris_extended.csv')
X = StandardScaler().fit_transform(df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']])

sil_scores = {}
best_k = 2
`,
      hintText: 'Lặp `for k in [2, 3, 4, 5, 6]: labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X); sil_scores[k] = float(silhouette_score(X, labels))`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

df = pd.read_csv('iris_extended.csv')
X = StandardScaler().fit_transform(df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']])

sil_scores = {}
for k in [2, 3, 4, 5, 6]:
    labels = KMeans(n_clusters=k, n_init=10, random_state=42).fit_predict(X)
    sil_scores[k] = float(silhouette_score(X, labels))

best_k = max(sil_scores, key=sil_scores.get)
`,
      checkPython: `assert set(sil_scores.keys()) == {2, 3, 4, 5, 6}, "sil_scores phải đủ k=2..6."
assert sil_scores[best_k] >= 0.40, f"Silhouette cao nhất {sil_scores[best_k]:.3f} quá thấp."`,
    },
  },
  {
    id: 'L078',
    order: 78,
    trackId: 'track09_unsupervised_ts',
    title: 'DBSCAN & Agglomerative Clustering: Cụm Hình dạng Phi cầu & Nhiễu',
    subtitle: 'Phân cụm dựa trên mật độ tự động phát hiện điểm nhiễu nhãn `-1`',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['sensor_iot'],
    objectives: [
      'Hiểu 2 tham số cốt lõi của DBSCAN: `eps` (bán kính lân cận) và `min_samples`.',
      'Phát hiện nhãn `-1` (Noise/Outlier) từ DBSCAN mà không cần biết trước số cụm `k`.',
    ],
    sections: [
      {
        title: '1. Khi nào DBSCAN đánh bại K-Means?',
        contentMarkdown:
          'K-Means ép mọi điểm bất thường phải gia nhập một cụm hình cầu gần nhất. Trái lại, `DBSCAN` chỉ gom nhóm các vùng có mật độ dày đặc và gán nhãn **`-1`** cho các điểm lạc loài cô độc — cực kỳ phù hợp cho dữ liệu cảm biến IoT.',
      },
    ],
    exercise: {
      prompt: 'Chuẩn hóa 4 biến cảm biến của `sensor_iot.csv` bằng `StandardScaler`, sau đó chạy `DBSCAN(eps=0.9, min_samples=6)` và lưu mảng nhãn vào `db_labels`. Tính số điểm nhiễu (`label == -1`) vào `n_noise` và số cụm thực sự (`n_clusters`, không tính `-1`).',
      requirements: [
        '`n_clusters >= 1` và `n_noise >= 1`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN

df = pd.read_csv('sensor_iot.csv')
X = StandardScaler().fit_transform(df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']])

db_labels = DBSCAN(eps=0.9, min_samples=6).fit_predict(X)
n_noise = 0
n_clusters = 0
`,
      hintText: '`n_noise = int((db_labels == -1).sum())` và `n_clusters = len(set(db_labels) - {-1})`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN

df = pd.read_csv('sensor_iot.csv')
X = StandardScaler().fit_transform(df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']])

db_labels = DBSCAN(eps=0.9, min_samples=6).fit_predict(X)
n_noise = int((db_labels == -1).sum())
n_clusters = len(set(db_labels) - {-1})
`,
      checkPython: `assert len(db_labels) == len(df), "Sai độ dài db_labels."
assert n_clusters >= 1 and n_noise >= 1, f"Cần ít nhất 1 cụm và 1 noise, nhận clusters={n_clusters}, noise={n_noise}."`,
    },
  },
  {
    id: 'L079',
    order: 79,
    trackId: 'track09_unsupervised_ts',
    title: 'PCA (Principal Component Analysis): Giảm Chiều & Tỷ lệ Phương sai Giữ lại',
    subtitle: 'Nén nhiều cảm biến tương quan cao về 2–3 thành phần trực giao chính',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Matplotlib'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext', 'sensor_iot'],
    objectives: [
      'Chuẩn hóa dữ liệu trước PCA (`StandardScaler`).',
      'Đọc `explained_variance_ratio_` và chọn số chiều đủ giữ >= 90% thông tin bằng `PCA(n_components=0.90)`.',
    ],
    sections: [
      {
        title: '1. Chọn số chiều tự động theo ngưỡng phương sai',
        contentMarkdown:
          'Thay vì đoán `n_components=2`, trong Scikit-Learn bạn có thể truyền số thực `PCA(n_components=0.90)`: thuật toán tự động giữ đúng số thành phần tối thiểu giải thích được >= 90% tổng phương sai!',
      },
    ],
    exercise: {
      prompt: 'Chạy `PCA(n_components=2, random_state=42)` sau `StandardScaler` trên 4 cột cảm biến của `sensor_iot.csv`. Lưu tọa độ giảm chiều vào `X_pca` (shape `(300, 2)`) và tổng tỷ lệ phương sai giữ lại vào `var_ratio_sum`.',
      requirements: [
        '`X_pca.shape == (len(df), 2)`.',
        '`var_ratio_sum > 0.50` và `<= 1.0`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

df = pd.read_csv('sensor_iot.csv')
X = StandardScaler().fit_transform(df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']])

pca = PCA(n_components=2, random_state=42)
X_pca = None
var_ratio_sum = 0.0
`,
      hintText: '`X_pca = pca.fit_transform(X)` và `var_ratio_sum = float(pca.explained_variance_ratio_.sum())`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA

df = pd.read_csv('sensor_iot.csv')
X = StandardScaler().fit_transform(df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']])

pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X)
var_ratio_sum = float(pca.explained_variance_ratio_.sum())
`,
      checkPython: `assert X_pca is not None and X_pca.shape == (len(df), 2), "Sai shape X_pca."
assert 0.50 < float(var_ratio_sum) <= 1.0, f"var_ratio_sum={var_ratio_sum} bất thường."`,
    },
  },
  {
    id: 'L080',
    order: 80,
    trackId: 'track09_unsupervised_ts',
    title: 'Phát hiện Bất thường Không Giám sát: Isolation Forest',
    subtitle: 'Tìm điểm hỏng hóc máy móc hoặc gian lận mà KHÔNG cần nhãn huấn luyện',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['sensor_iot', 'fraud'],
    objectives: [
      'Hiểu nguyên lý "điểm dị thường rất dễ bị tách cô lập chỉ sau vài lần chia ngẫu nhiên".',
      'Dùng `IsolationForest(contamination=...)` dự đoán `(-1 anomaly, +1 normal)` và kiểm chứng với nhãn thực tế.',
    ],
    sections: [
      {
        title: '1. Isolation Forest hoạt động thế nào?',
        contentMarkdown:
          'Nếu bạn chặt ngẫu nhiên không gian dữ liệu bằng những đường cắt trục tọa độ, các điểm bình thường tụ thành đám đông cần **nhiều nhát cắt sâu** mới tách riêng được; ngược lại, một điểm dị thường đứng chơ vơ ngoài rìa chỉ cần **1–2 nhát cắt** là bị cô lập ngay (`path_length` rất ngắn)!',
      },
    ],
    exercise: {
      prompt: 'Train không giám sát `IsolationForest(contamination=0.10, random_state=42)` CHỈ trên 4 cột cảm biến `["TempC", "VibrationMm", "PressureBar", "PowerKw"]` của `sensor_iot.csv` (không đưa cột `IsAnomaly` vào fit!). Sau đó dùng `-iso.score_samples(X)` làm anomaly score và tính `iso_auc = roc_auc_score(df["IsAnomaly"], anomaly_scores)`.',
      requirements: [
        'Không dùng nhãn `IsAnomaly` trong `fit`.',
        'Đạt `iso_auc >= 0.70` chứng minh IsolationForest phát hiện được bất thường cảm biến.',
      ],
      starterCode: `from sklearn.ensemble import IsolationForest
from sklearn.metrics import roc_auc_score

df = pd.read_csv('sensor_iot.csv')
X = df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']]
y = df['IsAnomaly']

iso = IsolationForest(contamination=0.10, random_state=42)
anomaly_scores = np.zeros(len(df))
iso_auc = 0.0
`,
      hintText: '`iso.fit(X)`, `anomaly_scores = -iso.score_samples(X)` (càng âm thì càng dị thường nên đổi dấu `-`), rồi `roc_auc_score(y, anomaly_scores)`.',
      solutionCode: `from sklearn.ensemble import IsolationForest
from sklearn.metrics import roc_auc_score

df = pd.read_csv('sensor_iot.csv')
X = df[['TempC', 'VibrationMm', 'PressureBar', 'PowerKw']]
y = df['IsAnomaly']

iso = IsolationForest(contamination=0.10, random_state=42)
iso.fit(X)
anomaly_scores = -iso.score_samples(X)
iso_auc = float(roc_auc_score(y, anomaly_scores))
`,
      checkPython: `assert len(anomaly_scores) == len(df), "Sai độ dài anomaly_scores."
assert float(iso_auc) >= 0.70, f"iso_auc={iso_auc:.3f} chưa đạt >= 0.70."`,
    },
  },
  {
    id: 'L081',
    order: 81,
    trackId: 'track09_unsupervised_ts',
    title: 'Đặc trưng Chuỗi Thời gian: Lag Features, Diff & Rolling Statistics',
    subtitle: 'Biến bài toán Time Series thành Tabular bằng `.shift()` và `.rolling()` đúng chuẩn không rò rỉ',
    difficulty: 'Trung bình',
    libraries: ['Pandas', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['daily_sales'],
    objectives: [
      'Tạo `lag_1`, `lag_7` và `rolling_mean_7` với `.shift(1)` BẮT BUỘC đi trước `.rolling(7)`!',
      'Giải thích lỗi kinh điển: quên `.shift(1)` khiến rolling bao gồm chính ngày `t` cần dự đoán.',
    ],
    sections: [
      {
        title: '1. Bẫy Leakage kinh điển của Rolling Window',
        contentMarkdown:
          'Nếu hôm nay là ngày $t$ và bạn muốn dự đoán doanh số `Sales[t]`, bạn **CHỈ ĐƯỢC NHÌN ĐẾN HẾT NGÀY $t-1$**. Vì vậy, công thức chuẩn luôn là:\n```python\ns1["roll7_mean"] = s1["Sales"].shift(1).rolling(7).mean()\n```\nThiếu `.shift(1)` là bạn vừa nhét đáp án ngày $t$ vào biến đầu vào!',
      },
    ],
    exercise: {
      prompt: 'Lọc `StoreId == "S1"` từ `daily_sales.csv`, sắp theo `Date`, rồi tạo 3 đặc trưng không rò rỉ: `lag_1` (`Sales.shift(1)`), `lag_7` (`Sales.shift(7)`), và `roll7_mean` (`Sales.shift(1).rolling(7).mean()`). Lưu `clean_s1 = s1.dropna().reset_index(drop=True)`.',
      requirements: [
        'Không rò rỉ tương lai (`roll7_mean` dùng `.shift(1).rolling(7).mean()`).',
        '`clean_s1` không còn NaN và chứa đủ `lag_1, lag_7, roll7_mean`.',
      ],
      starterCode: `df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)

# Tạo lag_1, lag_7, roll7_mean (có shift(1) trước rolling!)
clean_s1 = pd.DataFrame()
`,
      hintText: '`s1["lag_1"] = s1["Sales"].shift(1)`, `s1["lag_7"] = s1["Sales"].shift(7)`, `s1["roll7_mean"] = s1["Sales"].shift(1).rolling(7).mean()`, rồi `clean_s1 = s1.dropna().reset_index(drop=True)`.',
      solutionCode: `df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)

s1['lag_1'] = s1['Sales'].shift(1)
s1['lag_7'] = s1['Sales'].shift(7)
s1['roll7_mean'] = s1['Sales'].shift(1).rolling(7).mean()
clean_s1 = s1.dropna().reset_index(drop=True)
`,
      checkPython: `assert {'lag_1', 'lag_7', 'roll7_mean'}.issubset(clean_s1.columns), "Thiếu cột lag/rolling."
assert clean_s1.isna().sum().sum() == 0, "clean_s1 còn NaN."
# Kiểm tra row đầu tiên của clean_s1 (ứng với index=7 ban đầu)
raw_s1 = pd.read_csv('daily_sales.csv').query("StoreId == 'S1'").sort_values('Date').reset_index(drop=True)
expected_roll = float(raw_s1.loc[0:6, 'Sales'].mean())
assert abs(float(clean_s1.loc[0, 'roll7_mean']) - expected_roll) < 1e-4, "roll7_mean phải là trung bình 7 ngày trước đó (dùng shift(1).rolling(7))!"`,
    },
  },
  {
    id: 'L082',
    order: 82,
    trackId: 'track09_unsupervised_ts',
    title: 'Phân rã Xu hướng + Mùa vụ & Mô hình Hồi quy Chuỗi Thời gian',
    subtitle: 'Tách Trend (xu hướng dài hạn), Seasonality (thứ trong tuần) và tác động Promo',
    difficulty: 'Trung bình',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['daily_sales'],
    objectives: [
      'Kết hợp Calendar Features (`dayofweek` OneHot / `sin, cos`), Trend (`t`) và Lag Features trong cùng Pipeline Ridge.',
      'So sánh MAE với Naive Baseline ("ngày mai bán bằng hôm qua").',
    ],
    sections: [
      {
        title: '1. Luôn so sánh mô hình Time Series với Naive Baseline!',
        contentMarkdown:
          'Trước khi khoe điểm số của mô hình dự báo thời tiết hay bán hàng, hãy tính MAE của chiến lược ngây thơ **y_hat(t) = y(t-1)** (Persistence/Naive Baseline). Mô hình ML của bạn bắt buộc phải thắng được mốc này!',
      },
    ],
    exercise: {
      prompt: 'Trên `StoreId == "S1"` của `daily_sales.csv` (sắp theo `Date`), tạo `t = np.arange(len(s1))`, `dow = Date.dt.dayofweek`, `lag_1 = Sales.shift(1)`, `lag_7 = Sales.shift(7)`. Chia 80% đầu làm Train, 20% cuối làm Test (KHÔNG shuffle!). Train `Ridge` dự đoán `Sales` và chứng minh `mae_ridge < mae_naive` (`mean_absolute_error(y_te, X_te["lag_1"])`).',
      requirements: [
        'Tách theo thứ tự thời gian 80% đầu / 20% cuối (không shuffle).',
        '`mae_ridge < mae_naive`.',
      ],
      starterCode: `from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error

df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)

s1['t'] = np.arange(len(s1))
s1['dow_sin'] = np.sin(2 * np.pi * s1['Date'].dt.dayofweek / 7.0)
s1['dow_cos'] = np.cos(2 * np.pi * s1['Date'].dt.dayofweek / 7.0)
s1['lag_1'] = s1['Sales'].shift(1)
s1['lag_7'] = s1['Sales'].shift(7)
s1 = s1.dropna().reset_index(drop=True)

split = int(len(s1) * 0.8)
feats = ['t', 'Promo', 'TempC', 'dow_sin', 'dow_cos', 'lag_1', 'lag_7']
X_tr, X_te = s1[feats].iloc[:split], s1[feats].iloc[split:]
y_tr, y_te = s1['Sales'].iloc[:split], s1['Sales'].iloc[split:]

mae_naive = float(mean_absolute_error(y_te, X_te['lag_1']))
mae_ridge = 999.0
`,
      hintText: '`reg = Ridge(alpha=1.0).fit(X_tr, y_tr)`; `mae_ridge = float(mean_absolute_error(y_te, reg.predict(X_te)))`.',
      solutionCode: `from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error

df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].copy()
s1['Date'] = pd.to_datetime(s1['Date'])
s1 = s1.sort_values('Date').reset_index(drop=True)

s1['t'] = np.arange(len(s1))
s1['dow_sin'] = np.sin(2 * np.pi * s1['Date'].dt.dayofweek / 7.0)
s1['dow_cos'] = np.cos(2 * np.pi * s1['Date'].dt.dayofweek / 7.0)
s1['lag_1'] = s1['Sales'].shift(1)
s1['lag_7'] = s1['Sales'].shift(7)
s1 = s1.dropna().reset_index(drop=True)

split = int(len(s1) * 0.8)
feats = ['t', 'Promo', 'TempC', 'dow_sin', 'dow_cos', 'lag_1', 'lag_7']
X_tr, X_te = s1[feats].iloc[:split], s1[feats].iloc[split:]
y_tr, y_te = s1['Sales'].iloc[:split], s1['Sales'].iloc[split:]

mae_naive = float(mean_absolute_error(y_te, X_te['lag_1']))
reg = Ridge(alpha=1.0).fit(X_tr, y_tr)
mae_ridge = float(mean_absolute_error(y_te, reg.predict(X_te)))
`,
      checkPython: `assert mae_ridge < mae_naive, f"Ridge ({mae_ridge:.2f}) chưa thắng được Naive Baseline ({mae_naive:.2f})."`,
    },
  },
  {
    id: 'L083',
    order: 83,
    trackId: 'track09_unsupervised_ts',
    title: 'Multi-Store Panel Time Series & Dự báo Đệ quy (Recursive Multi-Step)',
    subtitle: 'Train một mô hình chung cho nhiều cửa hàng và dự báo nhiều bước tới tương lai',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Pandas'],
    estimatedMinutes: 30,
    datasetIds: ['daily_sales'],
    objectives: [
      'Tạo `lag_1` riêng theo từng `StoreId` bằng `df.groupby("StoreId")["Sales"].shift(1)` (tránh trộn chéo cửa hàng S1 sang S2!).',
      'Thực hiện vòng lặp Recursive Forecast 7 ngày kế tiếp bằng cách nạp dự đoán ngày trước làm `lag_1` cho ngày sau.',
    ],
    sections: [
      {
        title: '1. Cẩn thận ranh giới khi `shift()` nhiều chuỗi cùng lúc!',
        contentMarkdown:
          'Nếu bảng chứa 3 cửa hàng `S1, S2, S3`, dùng `df["Sales"].shift(1)` trực tiếp sẽ lấy nhầm doanh số ngày cuối của `S1` làm `lag_1` cho ngày đầu của `S2`! Bắt buộc viết `df.groupby("StoreId")["Sales"].shift(1)`.',
      },
    ],
    exercise: {
      prompt: 'Tạo `lag_1` chuẩn theo nhóm bằng `groupby("StoreId")["Sales"].shift(1)` trên `daily_sales.csv` (đã sort theo `["StoreId", "Date"]`). Train `HistGradientBoostingRegressor` trên tất cả cửa hàng (mã hóa `StoreId` thành số `store_code`) và thực hiện dự báo đệ quy 5 bước tiếp theo cho Store `"S1"` lưu vào list `future_5`.',
      requirements: [
        'Dùng `groupby("StoreId")["Sales"].shift(1)` tránh rò rỉ giữa các cửa hàng.',
        '`len(future_5) == 5` và mọi giá trị dự báo đều là số thực dương.',
      ],
      starterCode: `from sklearn.ensemble import HistGradientBoostingRegressor

df = pd.read_csv('daily_sales.csv')
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(['StoreId', 'Date']).reset_index(drop=True)
df['store_code'] = df['StoreId'].astype('category').cat.codes
df['lag_1'] = df.groupby('StoreId')['Sales'].shift(1)
train_df = df.dropna().copy()

feats = ['store_code', 'Promo', 'TempC', 'lag_1']
model = HistGradientBoostingRegressor(max_iter=80, random_state=42).fit(train_df[feats], train_df['Sales'])

# Dự báo đệ quy 5 ngày kế tiếp cho S1 (giả sử Promo=0, TempC=26.0)
s1_last = df[df['StoreId'] == 'S1'].iloc[-1]
cur_lag = float(s1_last['Sales'])
s1_code = int(s1_last['store_code'])
future_5 = []
`,
      hintText: 'Lặp `for _ in range(5):`, tạo dòng input `pd.DataFrame([{"store_code": s1_code, "Promo": 0, "TempC": 26.0, "lag_1": cur_lag}])`, `yhat = float(model.predict(row)[0])`, `future_5.append(yhat)`, `cur_lag = yhat`.',
      solutionCode: `from sklearn.ensemble import HistGradientBoostingRegressor

df = pd.read_csv('daily_sales.csv')
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values(['StoreId', 'Date']).reset_index(drop=True)
df['store_code'] = df['StoreId'].astype('category').cat.codes
df['lag_1'] = df.groupby('StoreId')['Sales'].shift(1)
train_df = df.dropna().copy()

feats = ['store_code', 'Promo', 'TempC', 'lag_1']
model = HistGradientBoostingRegressor(max_iter=80, random_state=42).fit(train_df[feats], train_df['Sales'])

s1_last = df[df['StoreId'] == 'S1'].iloc[-1]
cur_lag = float(s1_last['Sales'])
s1_code = int(s1_last['store_code'])
future_5 = []
for _ in range(5):
    row = pd.DataFrame([{'store_code': s1_code, 'Promo': 0, 'TempC': 26.0, 'lag_1': cur_lag}])
    yhat = float(model.predict(row)[0])
    future_5.append(yhat)
    cur_lag = yhat
`,
      checkPython: `assert len(future_5) == 5, "future_5 phải có đúng 5 bước."
assert all(v > 0 for v in future_5), "Giá trị dự báo phải dương."
first_lag_s2 = df[df['StoreId'] == 'S2']['lag_1'].iloc[0]
assert pd.isna(first_lag_s2), "Dòng đầu tiên của S2 phải có lag_1=NaN (chứng tỏ có groupby('StoreId').shift(1))."`,
    },
  },
  {
    id: 'L084',
    order: 84,
    trackId: 'track09_unsupervised_ts',
    title: 'Biểu diễn Cụm PCA 2D & K-Means Feature Engineering cho Bài toán Có Giám sát',
    subtitle: 'Dùng nhãn cụm K-Means và tọa độ PCA làm đặc trưng tăng sức mạnh cho mô hình cây',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'Matplotlib'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Kết hợp Unsupervised + Supervised: fit `KMeans` trên `X_train` rồi dùng khoảng cách tới tâm cụm `km.transform(X)` làm cột mới!',
      'Đảm bảo fit `KMeans` & `PCA` chỉ trên `X_train` để không rò rỉ phân phối validation.',
    ],
    sections: [
      {
        title: '1. Unsupervised Features giúp Cây Quyết Định thấy Khoảng cách Tròn',
        contentMarkdown:
          'Cây quyết định cắt vuông góc theo từng trục nên yếu khi mô tả ranh giới hình tròn. Khi bạn thêm cột `dist_to_cluster_0`, `dist_to_cluster_1`, `dist_to_cluster_2` từ `km.transform(X_scaled)`, cây bất ngờ nhìn thấy khoảng cách Euclid xuyên chéo không gian!',
      },
    ],
    exercise: {
      prompt: 'Tách `bank_churn.csv` thành train/test 80/20 `stratify=y, random_state=42`. Fit `StandardScaler` và `KMeans(n_clusters=4, n_init=10, random_state=42)` CHỈ trên `X_tr`, lấy ma trận khoảng cách 4 chiều `km.transform(...)` nối vào tập đặc trưng gốc thành `X_tr_aug`, `X_te_aug`, sau đó vẽ scatter PCA 2D tô màu theo nhãn cụm.',
      requirements: [
        '`X_tr_aug.shape[1] == 5 + 4 == 9` và `X_te_aug.shape[1] == 9`.',
        'Vẽ scatter 2D (`fig, ax`) phân biệt 4 cụm K-Means.',
      ],
      starterCode: `import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

X_tr_aug = None
X_te_aug = None
fig, ax = plt.subplots(figsize=(6, 5))
`,
      hintText: '`sc = StandardScaler().fit(X_tr)`; `X_tr_s, X_te_s = sc.transform(X_tr), sc.transform(X_te)`; `km = KMeans(n_clusters=4, n_init=10, random_state=42).fit(X_tr_s)`; `X_tr_aug = np.hstack([X_tr_s, km.transform(X_tr_s)])`, `X_te_aug = np.hstack([X_te_s, km.transform(X_te_s)])`. Sau đó giảm `X_tr_s` về 2D bằng `PCA(2)` rồi scatter theo `km.labels_`.',
      solutionCode: `import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

sc = StandardScaler().fit(X_tr)
X_tr_s, X_te_s = sc.transform(X_tr), sc.transform(X_te)

km = KMeans(n_clusters=4, n_init=10, random_state=42).fit(X_tr_s)
X_tr_aug = np.hstack([X_tr_s, km.transform(X_tr_s)])
X_te_aug = np.hstack([X_te_s, km.transform(X_te_s)])

coords = PCA(n_components=2, random_state=42).fit_transform(X_tr_s)
fig, ax = plt.subplots(figsize=(6, 5))
for c in range(4):
    mask = (km.labels_ == c)
    ax.scatter(coords[mask, 0], coords[mask, 1], alpha=0.7, label=f'Cluster {c}')
ax.set_title('PCA 2D of Customer Clusters')
ax.legend()
plt.tight_layout()
`,
      checkPython: `assert X_tr_aug.shape == (len(X_tr), 9) and X_te_aug.shape == (len(X_te), 9), "Số cột tăng cường phải là 5 + 4 = 9."
assert len(ax.collections) >= 4, "Chưa vẽ scatter đủ 4 cụm trên PCA 2D."`,
    },
  },
];
