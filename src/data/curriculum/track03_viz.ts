import { LessonDefinition } from '../../types/curriculum';

export const TRACK03_VIZ_LESSONS: LessonDefinition[] = [
  {
    id: 'L023',
    order: 23,
    trackId: 'track03_viz',
    title: 'Matplotlib Architecture: Figure, Axes & Object-Oriented API',
    subtitle: 'Hiểu bản chất Figure/Axes và chuẩn hóa code vẽ đồ thị chuyên nghiệp',
    difficulty: 'Cơ bản',
    libraries: ['Matplotlib', 'NumPy'],
    estimatedMinutes: 20,
    datasetIds: ['daily_sales'],
    objectives: [
      'Phân biệt stateful `plt.plot()` và Object-Oriented `fig, ax = plt.subplots()`.',
      'Cấu hình tiêu đề (`set_title`), nhãn trục (`set_xlabel`, `set_ylabel`), `grid`, `legend`.',
      'Xuất nhiều đường trên cùng Axes với style rõ ràng, không đè chữ.',
    ],
    sections: [
      {
        title: '1. Hai tầng kiến trúc cốt lõi: Figure và Axes',
        contentMarkdown:
          'Trong Matplotlib, **`Figure`** giống như tờ giấy vẽ tổng thể (khung ảnh chứa toàn bộ biểu đồ), còn **`Axes`** mới là vùng tọa độ thực sự nơi đường cong, điểm dữ liệu và trục X/Y hiển thị. Một `Figure` có thể chứa 1 hoặc nhiều `Axes`.\n\nDù hàm nhanh `plt.plot()` tiện cho nháp nhanh, chuẩn mực khoa học và Kaggle Notebook luôn ưu tiên **OO API (`fig, ax = plt.subplots(...)`)** vì bạn nắm quyền kiểm soát tuyệt đối từng biểu đồ con.',
        exampleCode: `import matplotlib.pyplot as plt
import pandas as pd

df = pd.read_csv('daily_sales.csv').head(30)
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(range(len(df)), df['Sales'], color='#2563eb', linewidth=2, marker='o', markersize=4, label='Daily Sales')
ax.set_title('Doanh số 30 ngày đầu tiên', fontsize=12, fontweight='bold')
ax.set_xlabel('Ngày thứ')
ax.set_ylabel('Doanh số')
ax.grid(True, linestyle='--', alpha=0.4)
ax.legend()
plt.tight_layout()`,
        callout: {
          type: 'tip',
          title: 'Luôn gọi plt.tight_layout()',
          text: 'Trong report nhiều subplot hoặc nhãn trục dài, `plt.tight_layout()` tự động giãn khoảng cách để chữ không bị cắt mất khi lưu PNG.',
        },
      },
      {
        title: '2. Đường tham chiếu (`axhline`, `axvline`) và chú thích',
        contentMarkdown:
          'Khi theo dõi chuỗi thời gian hoặc Learning Curve, đường trung bình `ax.axhline(mean_val, linestyle="--")` giúp người đọc lập tức thấy điểm nào vượt ngưỡng.',
      },
    ],
    exercise: {
      prompt: 'Đọc `daily_sales.csv`, lọc riêng `StoreId == "S1"`, vẽ biểu đồ đường `Sales` theo 60 ngày đầu trên OO API (`fig, ax = plt.subplots()`), thêm đường ngang trung bình và gán tiêu đề.',
      requirements: [
        'Tạo `fig, ax = plt.subplots(...)` với ít nhất 2 line trên `ax` (đường Sales và đường trung bình `axhline`).',
        'Đặt tiêu đề bằng `ax.set_title(...)` (không rỗng) và nhãn trục Y bằng `ax.set_ylabel(...)`.',
        'Lưu biến `mean_s1` là giá trị trung bình `Sales` của 60 dòng đầu Store S1.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].head(60).reset_index(drop=True)

mean_s1 = 0.0
fig, ax = plt.subplots(figsize=(8, 4))
# Vẽ Sales và axhline(mean_s1), đặt title & ylabel

plt.tight_layout()
`,
      hintText: 'Tính `mean_s1 = float(s1["Sales"].mean())`, gọi `ax.plot(s1.index, s1["Sales"], label="Sales")`, `ax.axhline(mean_s1, color="red", linestyle="--", label="Mean")`, rồi `ax.set_title(...)`, `ax.set_ylabel(...)`, `ax.legend()`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].head(60).reset_index(drop=True)

mean_s1 = float(s1['Sales'].mean())
fig, ax = plt.subplots(figsize=(8, 4))
ax.plot(s1.index, s1['Sales'], color='#2563eb', label='Sales S1')
ax.axhline(mean_s1, color='#ef4444', linestyle='--', label=f'Mean ({mean_s1:.1f})')
ax.set_title('Doanh số 60 ngày - Cửa hàng S1')
ax.set_xlabel('Ngày')
ax.set_ylabel('Sales')
ax.legend()
plt.tight_layout()
`,
      checkPython: `assert 'fig' in globals() and 'ax' in globals(), "Thiếu biến fig hoặc ax từ plt.subplots()."
assert len(ax.lines) >= 2, f"Cần ít nhất 2 line (Sales + axhline trung bình), hiện có {len(ax.lines)}."
assert bool(ax.get_title().strip()), "Bạn chưa đặt tiêu đề bằng ax.set_title()."
assert bool(ax.get_ylabel().strip()), "Bạn chưa đặt nhãn trục Y bằng ax.set_ylabel()."
expected = float(pd.read_csv('daily_sales.csv').query("StoreId == 'S1'").head(60)['Sales'].mean())
assert abs(float(mean_s1) - expected) < 1e-4, "Giá trị mean_s1 chưa khớp trung bình 60 ngày đầu của S1."`,
    },
  },
  {
    id: 'L024',
    order: 24,
    trackId: 'track03_viz',
    title: 'Subplots Lưới Đa Biểu Đồ & Chia Sẻ Trục',
    subtitle: 'Tạo dashboard so sánh nhiều feature song song với `plt.subplots(nrows, ncols)`',
    difficulty: 'Cơ bản',
    libraries: ['Matplotlib', 'Pandas'],
    estimatedMinutes: 20,
    datasetIds: ['housing'],
    objectives: [
      'Khởi tạo lưới `fig, axes = plt.subplots(1, 3)` hoặc `(2, 2)` và duyệt qua `axes.flat`.',
      'Sử dụng `sharey=True` để so sánh công bằng cùng thang đo giữa các nhóm.',
      'Thêm tiêu đề chung cho toàn bộ Figure bằng `fig.suptitle()`.',
    ],
    sections: [
      {
        title: '1. Quản lý mảng `axes` không bị lỗi Index',
        contentMarkdown:
          'Khi tạo `fig, axes = plt.subplots(2, 2, figsize=(10, 7))`, biến `axes` là mảng NumPy 2D shape `(2, 2)`. Thay vì viết lồng vòng lặp `axes[i, j]`, bạn có thể duyệt phẳng bằng `for ax, col in zip(axes.flat, cols):` cực kỳ gọn và sạch.',
        exampleCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
cols = ['LotArea', 'LivingArea', 'DistCenterKm', 'SalePrice']
fig, axes = plt.subplots(2, 2, figsize=(9, 6))
for ax, col in zip(axes.flat, cols):
    ax.hist(df[col].dropna(), bins=25, color='#0ea5e9', edgecolor='white')
    ax.set_title(f'Phân phối {col}')
fig.suptitle('Tổng quan phân phối dữ liệu nhà ở', fontsize=13)
plt.tight_layout()`,
      },
    ],
    exercise: {
      prompt: 'Tạo lưới `fig, axes = plt.subplots(1, 3, figsize=(12, 4))` vẽ histogram cho 3 cột `["LivingArea", "DistCenterKm", "SalePrice"]` từ `housing.csv` và gán `fig.suptitle(...)`.',
      requirements: [
        'Tạo `fig, axes` có đúng 3 `Axes` con (`len(fig.axes) == 3`).',
        'Mỗi `ax` chứa các cột histogram (`len(ax.patches) >= 10`) và có tiêu đề riêng.',
        'Đặt `fig.suptitle(...)` khác rỗng.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
target_cols = ['LivingArea', 'DistCenterKm', 'SalePrice']

fig, axes = plt.subplots(1, 3, figsize=(12, 4))
# Duyệt zip(axes, target_cols) để vẽ hist và set_title

plt.tight_layout()
`,
      hintText: 'Dùng `for ax, col in zip(axes, target_cols): ax.hist(df[col].dropna(), bins=20); ax.set_title(col)` và `fig.suptitle("Housing Distributions")`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
target_cols = ['LivingArea', 'DistCenterKm', 'SalePrice']

fig, axes = plt.subplots(1, 3, figsize=(12, 4))
for ax, col in zip(axes, target_cols):
    ax.hist(df[col].dropna(), bins=20, color='#3b82f6', alpha=0.85, edgecolor='white')
    ax.set_title(col)
    ax.set_xlabel('Giá trị')
fig.suptitle('Phân phối 3 biến chính Housing')
plt.tight_layout()
`,
      checkPython: `assert 'fig' in globals() and len(fig.axes) == 3, f"Cần 3 Axes con, hiện có {len(fig.axes) if 'fig' in globals() else 0}."
for i, ax in enumerate(fig.axes):
    assert len(ax.patches) >= 10, f"Axes thứ {i} chưa có histogram (>= 10 bins)."
    assert bool(ax.get_title().strip()), f"Axes thứ {i} chưa có tiêu đề."
assert fig._suptitle is not None and bool(fig._suptitle.get_text().strip()), "Chưa gọi fig.suptitle()."`,
    },
  },
  {
    id: 'L025',
    order: 25,
    trackId: 'track03_viz',
    title: 'Histogram, KDE & Phát hiện Phân phối Lệch (Skewness)',
    subtitle: 'Nhìn nhận đuôi dài, đa đỉnh và so sánh trực quan phân phối gốc vs log1p',
    difficulty: 'Cơ bản',
    libraries: ['Matplotlib', 'Seaborn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing', 'fraud'],
    objectives: [
      'Vẽ Histogram kèm mật độ `density=True` và KDE (Seaborn `kdeplot` hoặc Gaussian KDE).',
      'So sánh `SalePrice` trước và sau khi lấy `np.log1p()` để quyết định biến đổi mục tiêu.',
      'Tính độ lệch `skew()` và gắn trực tiếp lên tiêu đề biểu đồ.',
    ],
    sections: [
      {
        title: '1. Tại sao Skewness quan trọng trong hồi quy?',
        contentMarkdown:
          'Các mô hình tuyến tính (Linear Regression, Ridge) và Neural Net thường bị ảnh hưởng nặng bởi một vài giá trị ngoại lai cực lớn ở đuôi phải (right-skewed). Quan sát cặp Histogram `[Raw, np.log1p(Raw)]` cho bạn câu trả lời tức thì trước khi train.',
        exampleCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
raw = df['SalePrice'].dropna()
logged = np.log1p(raw)

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
ax1.hist(raw, bins=30, color='#f97316', alpha=0.8)
ax1.set_title(f'Raw SalePrice (skew={raw.skew():.2f})')
ax2.hist(logged, bins=30, color='#10b981', alpha=0.8)
ax2.set_title(f'log1p(SalePrice) (skew={logged.skew():.2f})')
plt.tight_layout()`,
      },
    ],
    exercise: {
      prompt: 'Với cột `Amount` trong `credit_fraud.csv`, tính `skew_raw` và `skew_log` (sau `np.log1p`), sau đó vẽ 2 histogram cạnh nhau so sánh trước và sau `log1p`.',
      requirements: [
        'Tính `skew_raw = float(df["Amount"].skew())` và `skew_log = float(np.log1p(df["Amount"]).skew())`.',
        'Tạo `fig` gồm 2 `Axes` chứa histogram của `Amount` và `np.log1p(Amount)`.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('credit_fraud.csv')

skew_raw = 0.0
skew_log = 0.0
fig, axes = plt.subplots(1, 2, figsize=(10, 4))
# Vẽ hist Amount và hist log1p(Amount)

plt.tight_layout()
`,
      hintText: '`amt = df["Amount"].dropna()`, `log_amt = np.log1p(amt)`. Tính `.skew()` cho cả hai rồi vẽ `axes[0].hist(amt, bins=30)` và `axes[1].hist(log_amt, bins=30)`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('credit_fraud.csv')
amt = df['Amount'].dropna()
log_amt = np.log1p(amt)

skew_raw = float(amt.skew())
skew_log = float(log_amt.skew())

fig, axes = plt.subplots(1, 2, figsize=(10, 4))
axes[0].hist(amt, bins=30, color='#ef4444', alpha=0.8)
axes[0].set_title(f'Amount Raw (skew={skew_raw:.2f})')
axes[1].hist(log_amt, bins=30, color='#22c55e', alpha=0.8)
axes[1].set_title(f'log1p(Amount) (skew={skew_log:.2f})')
plt.tight_layout()
`,
      checkPython: `df_chk = pd.read_csv('credit_fraud.csv')
exp_raw = float(df_chk['Amount'].dropna().skew())
exp_log = float(np.log1p(df_chk['Amount'].dropna()).skew())
assert abs(float(skew_raw) - exp_raw) < 1e-4, "skew_raw chưa đúng."
assert abs(float(skew_log) - exp_log) < 1e-4, "skew_log chưa đúng."
assert abs(skew_log) < abs(skew_raw), "Phải giảm độ lệch sau log1p."
assert len(fig.axes) == 2 and all(len(a.patches) >= 10 for a in fig.axes), "Cả 2 subplot đều phải vẽ histogram."`,
    },
  },
  {
    id: 'L026',
    order: 26,
    trackId: 'track03_viz',
    title: 'Boxplot, Violin & Quan sát Ngoại lai theo Nhóm (Target)',
    subtitle: 'So sánh phân vị, IQR và khác biệt giữa các lớp phân loại/danh mục',
    difficulty: 'Cơ bản',
    libraries: ['Matplotlib', 'Seaborn'],
    estimatedMinutes: 25,
    datasetIds: ['titanic', 'housing'],
    objectives: [
      'Hiểu 5 con số tóm tắt trên Boxplot (Q1, Median, Q3, Whiskers, Outliers).',
      'So sánh `Fare` giữa hai nhóm `Survived == 0` và `Survived == 1`.',
      'Kết hợp Seaborn `boxplot` (khi có) hoặc OO `ax.boxplot(...)` chuẩn xác.',
    ],
    sections: [
      {
        title: '1. So sánh phân bố Feature theo biến mục tiêu',
        contentMarkdown:
          'Trong bài toán phân loại nhị phân (ví dụ sống sót Titanic hay Churn ngân hàng), câu hỏi đầu tiên của EDA là: *"Phân bố của feature X ở lớp 0 và lớp 1 có dịch chuyển khỏi nhau không?"* Boxplot hoặc Violinplot cho cái nhìn sắc nét hơn hẳn một con số trung bình đơn lẻ.',
        exampleCode: `import matplotlib.pyplot as plt
df = pd.read_csv('titanic.csv')
groups = [df.loc[df['Survived'] == k, 'Fare'].dropna() for k in [0, 1]]

fig, ax = plt.subplots(figsize=(6, 4))
ax.boxplot(groups, labels=['Không qua khỏi (0)', 'Sống sót (1)'], patch_artist=True)
ax.set_title('Giá vé Fare theo trạng thái Survived')
ax.set_ylabel('Fare')
plt.tight_layout()`,
      },
    ],
    exercise: {
      prompt: 'Từ `housing.csv`, tạo biến `neighborhoods` được sắp xếp theo thứ tự bảng chữ cái và vẽ Boxplot so sánh `SalePrice` giữa tất cả các `Neighborhood`, đồng thời lưu trung vị từng khu vào dict `median_by_nb`.',
      requirements: [
        'Tạo `neighborhoods = sorted(df["Neighborhood"].dropna().unique().tolist())`.',
        'Vẽ `ax.boxplot(...)` cho đúng `len(neighborhoods)` nhóm.',
        'Tính dict `median_by_nb` map tên khu -> median `SalePrice` dạng float.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
neighborhoods = sorted(df['Neighborhood'].dropna().unique().tolist())

median_by_nb = {}
fig, ax = plt.subplots(figsize=(8, 4))
# Tạo groups và vẽ ax.boxplot(...)

plt.tight_layout()
`,
      hintText: '`groups = [df.loc[df["Neighborhood"] == nb, "SalePrice"].dropna() for nb in neighborhoods]` và `median_by_nb = {nb: float(g.median()) for nb, g in zip(neighborhoods, groups)}`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('housing.csv')
neighborhoods = sorted(df['Neighborhood'].dropna().unique().tolist())
groups = [df.loc[df['Neighborhood'] == nb, 'SalePrice'].dropna() for nb in neighborhoods]
median_by_nb = {nb: float(g.median()) for nb, g in zip(neighborhoods, groups)}

fig, ax = plt.subplots(figsize=(8, 4))
ax.boxplot(groups, patch_artist=True)
ax.set_xticks(range(1, len(neighborhoods) + 1), neighborhoods)
ax.set_title('Giá nhà SalePrice theo từng Neighborhood')
ax.set_ylabel('SalePrice')
plt.tight_layout()
`,
      checkPython: `df_chk = pd.read_csv('housing.csv')
nbs = sorted(df_chk['Neighborhood'].dropna().unique().tolist())
assert list(neighborhoods) == nbs, "Danh sách neighborhoods chưa đúng."
assert isinstance(median_by_nb, dict) and set(median_by_nb.keys()) == set(nbs), "median_by_nb thiếu khóa."
for nb in nbs:
    exp_m = float(df_chk.loc[df_chk['Neighborhood'] == nb, 'SalePrice'].median())
    assert abs(float(median_by_nb[nb]) - exp_m) < 1e-4, f"Median của {nb} sai."
assert len(ax.get_xticklabels()) == len(nbs), "Số nhóm trên boxplot chưa khớp số Neighborhood."`,
    },
  },
  {
    id: 'L027',
    order: 27,
    trackId: 'track03_viz',
    title: 'Scatter Plot, Hue Phân Tách Lớp & Đường Xu Hướng',
    subtitle: 'Phát hiện tương quan phi tuyến, cụm dữ liệu và ngưỡng phân tách tuyến tính',
    difficulty: 'Cơ bản',
    libraries: ['Matplotlib', 'Seaborn', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext', 'housing'],
    objectives: [
      'Vẽ Scatter plot tô màu theo phân loại (`c=` / vòng lặp theo class với `legend`).',
      'Khớp và vẽ kèm đường hồi quy bậc 1 (`np.polyfit`) để trực quan hóa xu hướng.',
      'Điều chỉnh `alpha` và kích thước điểm `s` tránh chồng chéo điểm (overplotting).',
    ],
    sections: [
      {
        title: '1. Tô màu theo lớp & Khớp đường xu hướng nhanh',
        contentMarkdown:
          'Khi dữ liệu có nhiều hơn 200 điểm, các điểm dễ đè lên nhau. Thiết lập `alpha=0.65` và viền mỏng `edgecolors="white"` giúp nhận diện mật độ cực rõ.',
        exampleCode: `import matplotlib.pyplot as plt
df = pd.read_csv('iris_ext.csv') if False else pd.read_csv('iris_extended.csv')
fig, ax = plt.subplots(figsize=(7, 5))
for sp, sub in df.groupby('Species'):
    ax.scatter(sub['PetalLength'], sub['PetalWidth'], alpha=0.75, label=sp)
ax.set_xlabel('PetalLength')
ax.set_ylabel('PetalWidth')
ax.legend()
plt.tight_layout()`,
      },
    ],
    exercise: {
      prompt: 'Trên `iris_extended.csv`, vẽ Scatter giữa `PetalLength` (trục X) và `PetalWidth` (trục Y) tách màu theo từng `Species` (có legend), đồng thời vẽ đường hồi quy tuyến tính toàn cục bằng `np.polyfit` và lưu hệ số góc vào `slope`.',
      requirements: [
        'Số `PathCollection` (scatter) >= số loài (`3`).',
        'Vẽ thêm đường hồi quy tuyến tính (`len(ax.lines) >= 1`) và lưu biến `slope`.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('iris_extended.csv')

slope = 0.0
fig, ax = plt.subplots(figsize=(7, 5))
# Vẽ scatter theo Species + đường polyfit bậc 1

plt.tight_layout()
`,
      hintText: '`slope, intercept = np.polyfit(df["PetalLength"], df["PetalWidth"], 1)`. Sau khi scatter từng Species trong vòng lặp `df.groupby("Species")`, vẽ đường `xs = np.linspace(df["PetalLength"].min(), df["PetalLength"].max(), 50)` và `ax.plot(xs, slope * xs + intercept, color="black", linestyle="--")`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('iris_extended.csv')

fig, ax = plt.subplots(figsize=(7, 5))
for sp, sub in df.groupby('Species'):
    ax.scatter(sub['PetalLength'], sub['PetalWidth'], alpha=0.75, label=sp)

slope, intercept = np.polyfit(df['PetalLength'], df['PetalWidth'], 1)
slope = float(slope)
xs = np.linspace(df['PetalLength'].min(), df['PetalLength'].max(), 50)
ax.plot(xs, slope * xs + intercept, color='black', linestyle='--', linewidth=2, label='Trendline')
ax.set_title('PetalLength vs PetalWidth theo Species')
ax.set_xlabel('PetalLength')
ax.set_ylabel('PetalWidth')
ax.legend()
plt.tight_layout()
`,
      checkPython: `df_chk = pd.read_csv('iris_extended.csv')
exp_slope, _ = np.polyfit(df_chk['PetalLength'], df_chk['PetalWidth'], 1)
assert abs(float(slope) - float(exp_slope)) < 1e-4, "Hệ số góc slope chưa khớp np.polyfit(..., 1)."
assert len(ax.collections) >= 3, "Cần vẽ scatter cho đủ 3 loài Species."
assert len(ax.lines) >= 1, "Cần vẽ đường xu hướng tuyến tính bằng ax.plot()."`,
    },
  },
  {
    id: 'L028',
    order: 28,
    trackId: 'track03_viz',
    title: 'Heatmap Ma Trận Tương Quan & Multicollinearity',
    subtitle: 'Vẽ ma trận Pearson/Spearman bằng `imshow`/Seaborn để phát hiện feature dư thừa',
    difficulty: 'Trung bình',
    libraries: ['Matplotlib', 'Seaborn', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['sensor_iot', 'housing'],
    objectives: [
      'Tính ma trận tương quan `corr(numeric_only=True)` và chọn lọc cột số.',
      'Vẽ Heatmap đối xứng thang màu phân kỳ (`RdBu_r`, `vmin=-1, vmax=1`), gắn colorbar và ghi số trực tiếp vào từng ô.',
      'Xác định cặp feature có tương quan tuyệt đối cao nhất (đa cộng tuyến tiềm tàng).',
    ],
    sections: [
      {
        title: '1. Vì sao phải ghi giá trị số lên từng ô Heatmap?',
        contentMarkdown:
          'Mắt người khó phân biệt chính xác màu hồng `0.72` với `0.85`. Thêm annotation số vào giữa từng ô + cố định `vmin=-1, vmax=1` giúp ma trận tương quan trung thực tuyệt đối.',
        exampleCode: `import matplotlib.pyplot as plt
df = pd.read_csv('sensor_iot.csv')
corr = df.select_dtypes('number').corr()

fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(corr.values, cmap='RdBu_r', vmin=-1, vmax=1)
fig.colorbar(im, ax=ax)
ax.set_xticks(range(len(corr.columns)), labels=corr.columns, rotation=30, ha='right')
ax.set_yticks(range(len(corr.columns)), labels=corr.columns)
for i in range(len(corr)):
    for j in range(len(corr)):
        ax.text(j, i, f'{corr.iloc[i, j]:.2f}', ha='center', va='center', fontsize=8)
plt.tight_layout()`,
      },
    ],
    exercise: {
      prompt: 'Tính ma trận tương quan `corr_mat` cho các cột số của `sensor_iot.csv` (bỏ `DeviceId` nếu có), vẽ Heatmap có colorbar, và tìm cặp 2 biến khác nhau có `|corr|` lớn nhất lưu vào tuple `top_pair` (sắp xếp theo tên).',
      requirements: [
        '`corr_mat` là DataFrame vuông kích thước số cột số của `sensor_iot.csv`.',
        'Vẽ `ax.imshow(...)` có colorbar (`len(fig.axes) >= 2`).',
        '`top_pair` là tuple 2 tên cột (sắp xếp alphabet) có tương quan tuyệt đối cao nhất (loại đường chéo chính).',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('sensor_iot.csv')
num_df = df.select_dtypes(include='number')

corr_mat = num_df.corr()
top_pair = ('', '')
fig, ax = plt.subplots(figsize=(6, 5))
# Vẽ imshow, colorbar, annotations và tìm top_pair

plt.tight_layout()
`,
      hintText: 'Dùng `abs_c = corr_mat.abs().copy(); np.fill_diagonal(abs_c.values, 0.0)`, tìm vị trí argmax trên `abs_c.stack().idxmax()`, rồi `tuple(sorted(idx))`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('sensor_iot.csv')
num_df = df.select_dtypes(include='number')
corr_mat = num_df.corr()

abs_c = corr_mat.abs().copy()
np.fill_diagonal(abs_c.values, 0.0)
best_idx = abs_c.stack().idxmax()
top_pair = tuple(sorted((str(best_idx[0]), str(best_idx[1]))))

fig, ax = plt.subplots(figsize=(6, 5))
im = ax.imshow(corr_mat.values, cmap='RdBu_r', vmin=-1, vmax=1)
fig.colorbar(im, ax=ax)
cols = list(corr_mat.columns)
ax.set_xticks(range(len(cols)), labels=cols, rotation=30, ha='right')
ax.set_yticks(range(len(cols)), labels=cols)
for i in range(len(cols)):
    for j in range(len(cols)):
        ax.text(j, i, f'{corr_mat.iloc[i, j]:.2f}', ha='center', va='center', fontsize=8)
ax.set_title('Sensor IoT Correlation Matrix')
plt.tight_layout()
`,
      checkPython: `df_chk = pd.read_csv('sensor_iot.csv').select_dtypes(include='number')
exp_c = df_chk.corr()
abs_e = exp_c.abs().copy()
np.fill_diagonal(abs_e.values, 0.0)
b = abs_e.stack().idxmax()
exp_pair = tuple(sorted((str(b[0]), str(b[1]))))
assert tuple(sorted(top_pair)) == exp_pair, f"top_pair phải là {exp_pair}, nhận được {top_pair}."
assert len(fig.axes) >= 2, "Cần thêm colorbar bằng fig.colorbar()."
assert len(ax.images) >= 1, "Chưa vẽ heatmap bằng ax.imshow()."`,
    },
  },
  {
    id: 'L029',
    order: 29,
    trackId: 'track03_viz',
    title: 'Biểu đồ Dữ liệu Phân loại: Barh Sorted & Stacked Proportion',
    subtitle: 'Trực quan hóa tỷ lệ Target theo Category (Churn Rate / Survival Rate)',
    difficulty: 'Trung bình',
    libraries: ['Matplotlib', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['churn', 'titanic'],
    objectives: [
      'Sắp xếp các thanh ngang (`barh`) từ thấp đến cao để dễ đọc nhãn.',
      'Tính và vẽ tỷ lệ `mean(Target)` kết hợp số lượng quan sát cho mỗi nhóm Category.',
    ],
    sections: [
      {
        title: '1. Nguyên tắc Barh khi nhãn Category dài',
        contentMarkdown:
          'Đừng bao giờ dùng bar đứng rồi xoay chữ 90 độ khiến người đọc phải nghiêng đầu! Dùng `ax.barh()` và sắp xếp tăng dần sao cho nhóm có giá trị lớn nhất nằm trên cùng.',
      },
    ],
    exercise: {
      prompt: 'Từ `bank_churn.csv`, tính tỷ lệ rời bỏ `Churn` trung bình theo `Country`, sắp xếp tăng dần thành Series `churn_by_country`, rồi vẽ biểu đồ cột ngang (`ax.barh`).',
      requirements: [
        '`churn_by_country` là Series sắp xếp tăng dần theo tỷ lệ `Churn`.',
        'Vẽ `ax.barh(...)` với số thanh đúng bằng số quốc gia (`len(churn_by_country)`).',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('bank_churn.csv')

churn_by_country = pd.Series(dtype=float)
fig, ax = plt.subplots(figsize=(7, 4))
# Tính churn_by_country.sort_values() và vẽ ax.barh

plt.tight_layout()
`,
      hintText: '`churn_by_country = df.groupby("Country")["Churn"].mean().sort_values(ascending=True)`, sau đó `ax.barh(churn_by_country.index, churn_by_country.values)`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('bank_churn.csv')
churn_by_country = df.groupby('Country')['Churn'].mean().sort_values(ascending=True)

fig, ax = plt.subplots(figsize=(7, 4))
bars = ax.barh(churn_by_country.index, churn_by_country.values, color='#0ea5e9')
ax.set_xlabel('Tỷ lệ Churn')
ax.set_title('Tỷ lệ rời bỏ ngân hàng theo Country')
for bar, val in zip(bars, churn_by_country.values):
    ax.text(val + 0.005, bar.get_y() + bar.get_height()/2, f'{val:.1%}', va='center')
plt.tight_layout()
`,
      checkPython: `df_chk = pd.read_csv('bank_churn.csv')
exp = df_chk.groupby('Country')['Churn'].mean().sort_values(ascending=True)
assert list(churn_by_country.index) == list(exp.index), "Thứ tự Country chưa được sắp tăng dần theo Churn."
assert np.allclose(churn_by_country.values, exp.values), "Giá trị tỷ lệ Churn chưa đúng."
assert len(ax.patches) == len(exp), "Số cột trên barh chưa khớp số Country."`,
    },
  },
  {
    id: 'L030',
    order: 30,
    trackId: 'track03_viz',
    title: 'Seaborn Statistical Plots: Pairplot, FacetGrid & Regplot',
    subtitle: 'Khám phá đa biến nhanh chóng bằng API khai báo bậc cao của Seaborn',
    difficulty: 'Trung bình',
    libraries: ['Seaborn', 'Matplotlib'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext', 'titanic'],
    objectives: [
      'Hiểu triết lý Tidy Data (`x`, `y`, `hue`, `col`, `row`) trong Seaborn.',
      'Vẽ lưới so sánh đa điều kiện và xử lý tương thích fallback Matplotlib nếu chạy ở môi trường nhẹ.',
    ],
    sections: [
      {
        title: '1. Seaborn xây trên Matplotlib như thế nào?',
        contentMarkdown:
          'Mọi hàm `sns.boxplot(..., ax=ax)` hay `sns.scatterplot(..., ax=ax)` đều nhận tham số `ax=` để gắn trực tiếp vào lưới `plt.subplots()` của Matplotlib. Riêng `FacetGrid` / `pairplot` / `catplot` là *Figure-level*, tự quản lý `Figure` riêng.\n\n**Lưu ý môi trường:** Trên Colab/Kaggle/Local Python đầy đủ có sẵn `seaborn`, còn trên Browser Pyodide mặc định có thể dùng wrapper tương thích Matplotlib để đảm bảo luôn hiển thị đồ thị.',
      },
    ],
    exercise: {
      prompt: 'Vẽ biểu đồ Scatter + hồi quy tách theo nhóm `Sex` giữa `Age` và `Fare` trên `titanic.csv` (dùng Seaborn `scatterplot`/`regplot` nếu import được `seaborn`, hoặc `ax.scatter` + `polyfit` fallback nếu chưa cài `seaborn`).',
      requirements: [
        'Tạo `fig, ax = plt.subplots(...)` có ít nhất 2 tập điểm (`male` và `female`) và có legend.',
        'Lưu biến `used_seaborn` (bool) phản ánh thực tế môi trường có import được `seaborn` hay không.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('titanic.csv').dropna(subset=['Age', 'Fare', 'Sex'])

used_seaborn = False
fig, ax = plt.subplots(figsize=(7, 4))
# Dùng try: import seaborn as sns ... except ImportError: fallback matplotlib

plt.tight_layout()
`,
      hintText: 'Trong `try`: `import seaborn as sns; used_seaborn = True; sns.scatterplot(data=df, x="Age", y="Fare", hue="Sex", ax=ax)`. Trong `except ImportError`: dùng vòng lặp `for sex, g in df.groupby("Sex"): ax.scatter(g["Age"], g["Fare"], label=sex, alpha=0.6)`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('titanic.csv').dropna(subset=['Age', 'Fare', 'Sex'])

fig, ax = plt.subplots(figsize=(7, 4))
try:
    import seaborn as sns
    used_seaborn = True
    sns.scatterplot(data=df, x='Age', y='Fare', hue='Sex', alpha=0.7, ax=ax)
except ImportError:
    used_seaborn = False
    for sex, g in df.groupby('Sex'):
        ax.scatter(g['Age'], g['Fare'], alpha=0.7, label=sex)
    ax.legend(title='Sex')

ax.set_title('Age vs Fare theo Sex')
ax.set_xlabel('Age')
ax.set_ylabel('Fare')
plt.tight_layout()
`,
      checkPython: `assert isinstance(used_seaborn, bool), "used_seaborn phải là bool."
assert len(ax.collections) >= 1, "Axes chưa có điểm dữ liệu scatter."
assert ax.get_legend() is not None, "Biểu đồ cần có legend phân biệt Sex."`,
    },
  },
  {
    id: 'L031',
    order: 31,
    trackId: 'track03_viz',
    title: 'Plotly Tương Tác (Interactive Charts) & HTML Export',
    subtitle: 'Tạo biểu đồ có hover tooltip, zoom, pan với `plotly.express` & `graph_objects`',
    difficulty: 'Trung bình',
    libraries: ['Plotly', 'Pandas'],
    estimatedMinutes: 25,
    datasetIds: ['daily_sales'],
    objectives: [
      'Nắm cấu trúc JSON `data` + `layout` của Plotly Figure (`px.line`, `px.scatter`, `go.Figure`).',
      'Xuất cấu trúc dữ liệu/JSON chuẩn để render tương tác hoặc kiểm tra chuỗi thời gian.',
    ],
    sections: [
      {
        title: '1. Tại sao Plotly mạnh cho EDA hiện đại?',
        contentMarkdown:
          'Với biểu đồ tĩnh, khi có 500 điểm chồng lên nhau bạn không biết điểm ngoại lai kia là `HouseId` nào. Plotly gắn trực tiếp `hover_data=["HouseId", "Neighborhood"]` để bạn rê chuột vào kiểm tra ngay.\n\nTrên nền tảng web AMLICS, chúng ta cũng có thể dựng từ điển đặc tả biểu đồ hoặc gọi `plotly.express` khi môi trường hỗ trợ.',
        exampleCode: `# Chuẩn Plotly Express trên Colab/Kaggle/Python:
# import plotly.express as px
# fig = px.line(df, x='Date', y='Sales', color='StoreId', title='Daily Sales Interactive')
# fig.update_layout(hovermode='x unified')`,
      },
    ],
    exercise: {
      prompt: 'Chuẩn bị dữ liệu tổng hợp doanh số hàng tháng `monthly_df` từ `daily_sales.csv` (cột `YearMonth`, `StoreId`, `Sales`) và tạo `plotly_spec` (hoặc `fig.to_plotly_json()` nếu có `plotly`) gồm các trace theo từng `StoreId`. Đồng thời vẽ chart tổng quan bằng Matplotlib để nhìn ngay.',
      requirements: [
        'Tạo `monthly_df` gồm tổng `Sales` theo `YearMonth` (`YYYY-MM`) và `StoreId`.',
        'Tạo dict `plotly_spec` chứa khóa `"data"` (list các trace dict mỗi trace có `"x"`, `"y"`, `"name"`, `"type": "scatter"`) và `"layout"`.',
      ],
      starterCode: `import matplotlib.pyplot as plt
df = pd.read_csv('daily_sales.csv')
df['YearMonth'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m')
monthly_df = df.groupby(['YearMonth', 'StoreId'], as_index=False)['Sales'].sum()

plotly_spec = {}
# Dựng plotly_spec (ưu tiên plotly.express nếu import được, không thì dict chuẩn Plotly JSON)
`,
      hintText: 'Tạo `traces = [{"type": "scatter", "mode": "lines+markers", "name": st, "x": g["YearMonth"].tolist(), "y": g["Sales"].round(2).tolist()} for st, g in monthly_df.groupby("StoreId")]` và `plotly_spec = {"data": traces, "layout": {"title": "Monthly Sales by Store"}}`.',
      solutionCode: `import matplotlib.pyplot as plt
df = pd.read_csv('daily_sales.csv')
df['YearMonth'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m')
monthly_df = df.groupby(['YearMonth', 'StoreId'], as_index=False)['Sales'].sum()

try:
    import plotly.express as px
    pfig = px.line(monthly_df, x='YearMonth', y='Sales', color='StoreId', markers=True, title='Monthly Sales by Store')
    plotly_spec = pfig.to_plotly_json()
except ImportError:
    traces = [
        {
            'type': 'scatter',
            'mode': 'lines+markers',
            'name': str(st),
            'x': g['YearMonth'].tolist(),
            'y': [float(v) for v in g['Sales']],
        }
        for st, g in monthly_df.groupby('StoreId')
    ]
    plotly_spec = {'data': traces, 'layout': {'title': 'Monthly Sales by Store'}}

fig, ax = plt.subplots(figsize=(8, 4))
for st, g in monthly_df.groupby('StoreId'):
    ax.plot(g['YearMonth'], g['Sales'], marker='o', label=st)
ax.tick_params(axis='x', rotation=45)
ax.set_title('Monthly Sales by Store')
ax.legend()
plt.tight_layout()
`,
      checkPython: `assert {'YearMonth', 'StoreId', 'Sales'}.issubset(monthly_df.columns), "monthly_df thiếu cột."
assert isinstance(plotly_spec, dict) and 'data' in plotly_spec and 'layout' in plotly_spec, "plotly_spec phải có 'data' và 'layout'."
assert len(plotly_spec['data']) == monthly_df['StoreId'].nunique(), "Số trace trong plotly_spec['data'] phải khớp số StoreId."`,
    },
  },
  {
    id: 'L032',
    order: 32,
    trackId: 'track03_viz',
    title: 'Biểu đồ Đánh giá Mô hình: ROC Curve, PR Curve & Residual Plot',
    subtitle: 'Thiết kế bộ đồ thị chẩn đoán hậu kiểm sau khi train xong mô hình ML',
    difficulty: 'Trung bình',
    libraries: ['Matplotlib', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['churn', 'housing'],
    objectives: [
      'Vẽ đường ROC-AUC với đường ngẫu nhiên chéo `y=x`.',
      'Vẽ Precision-Recall Curve cho bài toán mất cân bằng lớp.',
      'Vẽ Residual Plot (`y_true - y_pred` vs `y_pred`) kiểm tra giả định phương sai đồng nhất (homoscedasticity).',
    ],
    sections: [
      {
        title: '1. Nhìn Residual Plot để biết mô hình hồi quy hỏng ở đâu',
        contentMarkdown:
          'Nếu phần dư `residual = y_true - y_pred` tạo thành hình cái phễu (phình to khi `y_pred` lớn) hoặc hình chữ U rõ rệt, đó là dấu hiệu bạn cần biến đổi `log(y)` hoặc thêm đặc trưng phi tuyến (`poly`, `tree`).',
      },
    ],
    exercise: {
      prompt: 'Train nhanh `LogisticRegression` trên `bank_churn.csv` (numeric cols) trên tập train/test split, tính `roc_curve` + `roc_auc_score` và vẽ biểu đồ ROC Curve hoàn chỉnh (kèm đường tham chiếu `(0,0)->(1,1)`).',
      requirements: [
        'Chia train/test 80/20 `stratify=y, random_state=42`.',
        'Tính `roc_auc = float(roc_auc_score(y_test, y_prob))`.',
        'Vẽ lên `ax` ít nhất 2 đường: ROC curve của model và đường diagonal tham chiếu.',
      ],
      starterCode: `import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve, roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']

roc_auc = 0.0
fig, ax = plt.subplots(figsize=(6, 5))
# Split, train, predict_proba[:, 1], roc_curve & plot

plt.tight_layout()
`,
      hintText: 'Dùng `pipe = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500)).fit(X_tr, y_tr)`, lấy `y_prob = pipe.predict_proba(X_te)[:, 1]`, `fpr, tpr, _ = roc_curve(y_te, y_prob)`, `ax.plot(fpr, tpr)` và `ax.plot([0, 1], [0, 1], "k--")`.',
      solutionCode: `import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_curve, roc_auc_score

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
pipe = make_pipeline(StandardScaler(), LogisticRegression(max_iter=500))
pipe.fit(X_tr, y_tr)
y_prob = pipe.predict_proba(X_te)[:, 1]
fpr, tpr, _ = roc_curve(y_te, y_prob)
roc_auc = float(roc_auc_score(y_te, y_prob))

fig, ax = plt.subplots(figsize=(6, 5))
ax.plot(fpr, tpr, color='#2563eb', linewidth=2, label=f'LogReg (AUC = {roc_auc:.3f})')
ax.plot([0, 1], [0, 1], 'k--', alpha=0.6, label='Random (0.5)')
ax.set_xlabel('False Positive Rate')
ax.set_ylabel('True Positive Rate')
ax.set_title('ROC Curve - Bank Churn')
ax.legend()
plt.tight_layout()
`,
      checkPython: `assert 0.55 < float(roc_auc) < 1.0, f"roc_auc={roc_auc} bất thường."
assert len(ax.lines) >= 2, "Cần vẽ đường ROC và đường chéo random baseline."
assert ax.get_legend() is not None, "Cần hiển thị legend AUC."`,
    },
  },
];
