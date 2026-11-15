import { LessonDefinition } from '../../types/curriculum';

export const TRACK02_PANDAS_LESSONS: LessonDefinition[] = [
  {
    id: 'L011',
    order: 11,
    trackId: 'track02_pandas',
    title: 'DataFrame, Series và Khám phá dữ liệu sơ bộ',
    subtitle: 'Đọc CSV, dùng head(), info(), describe(), value_counts() đúng chuẩn EDA',
    difficulty: 'Cơ bản',
    libraries: ['Pandas'],
    estimatedMinutes: 12,
    datasetIds: ['titanic'],
    objectives: [
      'Phân biệt df["col"] (Series 1D) và df[["col"]] (DataFrame 2D).',
      'Thống kê phân phối lớp mục tiêu bằng value_counts(normalize=True).',
    ],
    sections: [
      {
        title: '1. Bộ 4 lệnh kiểm tra nhanh mọi bảng dữ liệu mới',
        contentMarkdown:
          'Ngay khi `pd.read_csv()` xong, luôn chạy 4 bước: `df.shape`, `df.head()`, `df.info()` (kiểm tra kiểu dữ liệu & số lượng non-null), và `df.describe(include="all")`. Với cột phân loại, `value_counts(dropna=False)` giúp nhìn ra tỷ lệ mất cân bằng lớp và giá trị lạ.',
        exampleCode: `import pandas as pd
df = pd.read_csv('titanic.csv')
print("Kích thước:", df.shape)
print("Tỷ lệ Survived:\n", df['Survived'].value_counts(normalize=True))
df.head()`,
      },
    ],
    exercise: {
      prompt:
        'Đọc titanic.csv vào df. Tính tỷ lệ sống sót chung survival_rate (float từ 0 đến 1) và đếm số lượng hành khách ở mỗi hạng vé Pclass vào Series pclass_counts (sắp theo index).',
      requirements: [
        'survival_rate là trung bình cột Survived.',
        'pclass_counts là pd.Series có 3 phần tử cho Pclass 1, 2, 3.',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('titanic.csv')

# TODO: Tính tỷ lệ sống sót và đếm hành khách theo Pclass
survival_rate = ...
pclass_counts = ...
`,
      hintText: 'df["Survived"].mean() và df["Pclass"].value_counts().sort_index()',
      solutionCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
survival_rate = float(df['Survived'].mean())
pclass_counts = df['Pclass'].value_counts().sort_index()
`,
      checkPython: `
assert abs(survival_rate - float(df['Survived'].mean())) < 1e-6
assert isinstance(pclass_counts, pd.Series) and len(pclass_counts) == 3
assert int(pclass_counts.sum()) == len(df)
`,
    },
  },
  {
    id: 'L012',
    order: 12,
    trackId: 'track02_pandas',
    title: 'Truy xuất loc, iloc, query() và tránh lỗi SettingWithCopyWarning',
    subtitle: 'Chọn dòng/cột theo tên nhãn vs vị trí số nguyên an toàn tuyệt đối',
    difficulty: 'Cơ bản',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['housing'],
    objectives: [
      'Phân biệt loc[label_row, label_col] (lấy cả mốc cuối) và iloc[int_row, int_col] (bỏ mốc cuối).',
      'Dùng .copy() khi tạo DataFrame con để sửa giá trị không bị cảnh báo.',
    ],
    sections: [
      {
        title: '1. Nguyên tắc sử dụng .loc và .iloc',
        contentMarkdown:
          '- `df.loc[df["SalePrice"] > 300000, ["LivingArea", "SalePrice"]]`: chọn theo **nhãn và điều kiện logic**.\n- `df.iloc[:10, :4]`: chọn theo **vị trí chỉ số 0-based** giống slicing Python.\n- Tuyệt đối tránh gán dạng chuỗi `df[cond]["col"] = val` mà hãy dùng `df.loc[cond, "col"] = val` hoặc `.copy()`.',
      },
    ],
    exercise: {
      prompt:
        'Từ housing.csv, lọc ra các căn nhà ở khu vực Downtown hoặc LakeSide có LivingArea >= 1500, chỉ lấy 3 cột ["HouseId", "Neighborhood", "SalePrice"] vào DataFrame luxury_df (bản sao độc lập).',
      requirements: [
        'luxury_df là pd.DataFrame gồm đúng 3 cột ["HouseId", "Neighborhood", "SalePrice"].',
        'Mọi dòng trong luxury_df có Neighborhood thuộc {"Downtown", "LakeSide"} và LivingArea gốc >= 1500.',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('housing.csv')

# TODO: Lọc nhà Downtown/LakeSide có LivingArea >= 1500 bằng .loc và .copy()
cond = ...
luxury_df = ...
`,
      hintText: 'cond = df["Neighborhood"].isin(["Downtown", "LakeSide"]) & (df["LivingArea"] >= 1500); luxury_df = df.loc[cond, ["HouseId", "Neighborhood", "SalePrice"]].copy()',
      solutionCode: `import pandas as pd

df = pd.read_csv('housing.csv')
cond = df['Neighborhood'].isin(['Downtown', 'LakeSide']) & (df['LivingArea'] >= 1500)
luxury_df = df.loc[cond, ['HouseId', 'Neighborhood', 'SalePrice']].copy()
`,
      checkPython: `
expected = df.loc[df['Neighborhood'].isin(['Downtown', 'LakeSide']) & (df['LivingArea'] >= 1500), ['HouseId', 'Neighborhood', 'SalePrice']]
assert list(luxury_df.columns) == ['HouseId', 'Neighborhood', 'SalePrice']
assert len(luxury_df) == len(expected) and len(luxury_df) > 0
`,
    },
  },
  {
    id: 'L013',
    order: 13,
    trackId: 'track02_pandas',
    title: 'Kiểm tra và xử lý Missing Values (isna, fillna, dropna)',
    subtitle: 'Thống kê tỷ lệ thiếu từng cột và điền giá trị thiếu có điều kiện',
    difficulty: 'Cơ bản',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['titanic'],
    objectives: [
      'Thống kê phần trăm giá trị thiếu theo từng cột.',
      'Phân biệt chiến lược điền số (median theo nhóm) và phân loại (mode / "Missing").',
    ],
    sections: [
      {
        title: '1. Kiểm tra bảng thiếu dữ liệu và điền thông minh theo nhóm',
        contentMarkdown:
          'Dùng `(df.isna().mean() * 100).round(2)` để thấy ngay % NaN mỗi cột. Thay vì điền `Age` bằng một con số trung bình toàn cục duy nhất, trên Titanic ta có thể điền trung vị `Age` **theo từng hạng vé `Pclass`** bằng `df.groupby("Pclass")["Age"].transform("median")`!',
        callout: {
          type: 'warning',
          title: 'Lưu ý Data Leakage',
          text: 'Trong bài tập EDA đơn lẻ ta có thể thao tác trên toàn bảng, nhưng khi huấn luyện mô hình ML phải fit giá trị median/mode CHỈ trên tập train!',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên titanic.csv, tính Series missing_counts chứa số lượng NaN của mỗi cột. Tạo bản sao df_clean: điền cột Age bằng trung vị của từng Pclass (dùng groupby + transform("median")), và điền cột Embarked bằng mode()[0].',
      requirements: [
        'missing_counts là Series đếm số NaN mỗi cột.',
        'df_clean không còn bất kỳ NaN nào ở toàn bộ DataFrame.',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
missing_counts = ...

df_clean = df.copy()
# TODO: Điền Age theo median của từng Pclass và Embarked theo mode
df_clean['Age'] = ...
df_clean['Embarked'] = ...
`,
      hintText: 'df_clean["Age"] = df_clean["Age"].fillna(df_clean.groupby("Pclass")["Age"].transform("median")). Với Embarked dùng df_clean["Embarked"].fillna(df_clean["Embarked"].mode()[0]).',
      solutionCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
missing_counts = df.isna().sum()
df_clean = df.copy()
df_clean['Age'] = df_clean['Age'].fillna(df_clean.groupby('Pclass')['Age'].transform('median'))
df_clean['Embarked'] = df_clean['Embarked'].fillna(df_clean['Embarked'].mode()[0])
`,
      checkPython: `
assert (missing_counts == df.isna().sum()).all()
assert int(df_clean.isna().sum().sum()) == 0, "df_clean vẫn còn NaN"
`,
    },
  },
  {
    id: 'L014',
    order: 14,
    trackId: 'track02_pandas',
    title: 'Xử lý Chuỗi (str.*) và Ngày Tháng (pd.to_datetime & .dt)',
    subtitle: 'Trích xuất thông tin ẩn từ văn bản ngắn và cột mốc thời gian',
    difficulty: 'Cơ bản',
    libraries: ['Pandas'],
    estimatedMinutes: 15,
    datasetIds: ['orders'],
    objectives: [
      'Chuyển cột chuỗi ngày sang datetime64 bằng pd.to_datetime().',
      'Trích xuất year, month, dayofweek, is_weekend qua accessor .dt.',
      'Thao tác chuỗi vectorized bằng accessor .str (lower, split, contains, len).',
    ],
    sections: [
      {
        title: '1. Accessor .dt và .str cực mạnh trong Pandas',
        contentMarkdown:
          'Khi đọc CSV, cột ngày luôn ở dạng `object` (chuỗi). Sau khi gọi `df["OrderDate"] = pd.to_datetime(df["OrderDate"])`, bạn dùng ngay:\n- `df["OrderDate"].dt.month`\n- `df["OrderDate"].dt.dayofweek` (0 = Thứ 2, 6 = Chủ nhật)\n- Tương tự với cột mã đơn `"ORD-1005"`, dùng `df["Category"].str.upper()` hoặc `df["OrderId"].str.split("-").str[1]` rất gọn.',
      },
    ],
    exercise: {
      prompt:
        'Đọc orders.csv. Chuyển OrderDate sang kiểu datetime, tạo 2 cột mới: OrderMonth (tháng 1..12) và IsWeekend (1 nếu thứ 7/CN tức dayofweek >= 5, ngược lại 0). Tính tổng số đơn hàng rơi vào cuối tuần weekend_orders.',
      requirements: [
        'df["OrderDate"] có kiểu datetime64.',
        'df có 2 cột OrderMonth và IsWeekend (0/1).',
        'weekend_orders là số nguyên đếm số đơn IsWeekend == 1.',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('orders.csv')

# TODO: Chuyển OrderDate sang datetime, tạo OrderMonth và IsWeekend
df['OrderDate'] = ...
df['OrderMonth'] = ...
df['IsWeekend'] = ...
weekend_orders = ...
`,
      hintText: 'df["OrderDate"] = pd.to_datetime(df["OrderDate"]); df["OrderMonth"] = df["OrderDate"].dt.month; df["IsWeekend"] = (df["OrderDate"].dt.dayofweek >= 5).astype(int)',
      solutionCode: `import pandas as pd

df = pd.read_csv('orders.csv')
df['OrderDate'] = pd.to_datetime(df['OrderDate'])
df['OrderMonth'] = df['OrderDate'].dt.month
df['IsWeekend'] = (df['OrderDate'].dt.dayofweek >= 5).astype(int)
weekend_orders = int(df['IsWeekend'].sum())
`,
      checkPython: `
assert pd.api.types.is_datetime64_any_dtype(df['OrderDate'])
assert 'OrderMonth' in df.columns and 'IsWeekend' in df.columns
assert set(df['IsWeekend'].unique()).issubset({0, 1})
assert weekend_orders == int((df['OrderDate'].dt.dayofweek >= 5).sum())
`,
    },
  },
  {
    id: 'L015',
    order: 15,
    trackId: 'track02_pandas',
    title: 'GroupBy, Agg đa hàm và Transform gắn ngược vào bảng gốc',
    subtitle: 'Tóm tắt thống kê theo nhóm và kỹ thuật Feature Engineering kinh điển trong Kaggle',
    difficulty: 'Trung bình',
    libraries: ['Pandas'],
    estimatedMinutes: 16,
    datasetIds: ['orders'],
    objectives: [
      'Dùng groupby().agg(col1=(...), col2=(...)) đặt tên cột tổng hợp sạch sẽ.',
      'Phân biệt groupby().agg() (thu gọn theo số nhóm) và groupby().transform() (giữ nguyên số dòng ban đầu).',
    ],
    sections: [
      {
        title: '1. Named Aggregation & Transform',
        contentMarkdown:
          'Cú pháp Named Aggregation:\n```python\nsummary = df.groupby("Category").agg(\n    total_orders=("OrderId", "count"),\n    avg_price=("UnitPrice", "mean"),\n    return_rate=("Returned", "mean")\n).reset_index()\n```\nCòn khi muốn so sánh giá đơn hàng so với **giá trung bình cùng Category** trên từng dòng: `df["cat_avg_price"] = df.groupby("Category")["UnitPrice"].transform("mean")`.',
      },
    ],
    exercise: {
      prompt:
        'Trên orders.csv, tạo cột Revenue = Quantity * UnitPrice. Tạo bảng tóm tắt cat_summary nhóm theo Category với 3 cột tổng hợp: total_orders (count của OrderId), total_revenue (sum của Revenue), return_rate (mean của Returned). Đồng thời thêm cột CustOrderCount vào df bằng transform("count").',
      requirements: [
        'cat_summary là DataFrame có các cột Category, total_orders, total_revenue, return_rate.',
        'df có cột CustOrderCount chứa số đơn của khách hàng tương ứng trên mỗi dòng.',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('orders.csv')
df['Revenue'] = df['Quantity'] * df['UnitPrice']

# TODO: Tạo bảng tổng hợp cat_summary và cột CustOrderCount
cat_summary = ...
df['CustOrderCount'] = ...
`,
      hintText: 'Dùng df.groupby("Category", as_index=False).agg(...) và df.groupby("CustomerId")["OrderId"].transform("count").',
      solutionCode: `import pandas as pd

df = pd.read_csv('orders.csv')
df['Revenue'] = df['Quantity'] * df['UnitPrice']
cat_summary = df.groupby('Category', as_index=False).agg(
    total_orders=('OrderId', 'count'),
    total_revenue=('Revenue', 'sum'),
    return_rate=('Returned', 'mean'),
)
df['CustOrderCount'] = df.groupby('CustomerId')['OrderId'].transform('count')
`,
      checkPython: `
assert {'Category', 'total_orders', 'total_revenue', 'return_rate'}.issubset(cat_summary.columns)
assert len(cat_summary) == df['Category'].nunique()
assert 'CustOrderCount' in df.columns and len(df['CustOrderCount']) == len(df)
assert int(cat_summary['total_orders'].sum()) == len(df)
`,
    },
  },
  {
    id: 'L016',
    order: 16,
    trackId: 'track02_pandas',
    title: 'Pivot Table & Crosstab phân tích đa chiều',
    subtitle: 'Xây dựng bảng tổng hợp hai chiều nhanh như Pivot Table trong Excel',
    difficulty: 'Trung bình',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['titanic'],
    objectives: [
      'Dùng pd.pivot_table(df, values=..., index=..., columns=..., aggfunc=...).',
      'Dùng pd.crosstab(normalize="index") xem tỷ lệ phân bố giữa 2 biến phân loại.',
    ],
    sections: [
      {
        title: '1. So sánh tỷ lệ sống sót theo Pclass x Sex',
        contentMarkdown:
          'Trong EDA, `pd.pivot_table(df, values="Survived", index="Pclass", columns="Sex", aggfunc="mean")` cho ta thấy ngay bức tranh tương tác giữa hai đặc trưng phân loại và biến mục tiêu.',
      },
    ],
    exercise: {
      prompt:
        'Trên titanic.csv, tạo pivot table surv_pivot thể hiện tỷ lệ sống sót trung bình (Survived) với hàng là Pclass và cột là Sex. Tìm hạng vé nào của nữ có tỷ lệ sống cao nhất.',
      requirements: [
        'surv_pivot có 3 hàng (Pclass 1, 2, 3) và 2 cột (female, male).',
        'female_pclass1 là tỷ lệ sống của nữ hạng vé 1 (float).',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('titanic.csv')

# TODO: Tạo surv_pivot và lấy giá trị female ở Pclass == 1
surv_pivot = ...
female_pclass1 = ...
`,
      hintText: 'surv_pivot = pd.pivot_table(df, values="Survived", index="Pclass", columns="Sex", aggfunc="mean"); female_pclass1 = float(surv_pivot.loc[1, "female"])',
      solutionCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
surv_pivot = pd.pivot_table(df, values='Survived', index='Pclass', columns='Sex', aggfunc='mean')
female_pclass1 = float(surv_pivot.loc[1, 'female'])
`,
      checkPython: `
assert surv_pivot.shape == (3, 2)
assert set(surv_pivot.columns) == {'female', 'male'}
ref = float(df[(df['Pclass'] == 1) & (df['Sex'] == 'female')]['Survived'].mean())
assert abs(female_pclass1 - ref) < 1e-6
`,
    },
  },
  {
    id: 'L017',
    order: 17,
    trackId: 'track02_pandas',
    title: 'Merge / Join nhiều bảng dữ liệu (orders.csv + customers.csv)',
    subtitle: 'Kỹ năng thiết yếu nối bảng giao dịch với bảng hồ sơ trong bài toán thực tế',
    difficulty: 'Trung bình',
    libraries: ['Pandas'],
    estimatedMinutes: 16,
    datasetIds: ['orders', 'customers'],
    objectives: [
      'Phân biệt left, inner, outer, right join trong pd.merge(..., on=..., how=..., validate=...).',
      'Sử dụng validate="many_to_one" để phát hiện khóa ngoại bị trùng lặp ngoài ý muốn.',
    ],
    sections: [
      {
        title: '1. Quy tắc an toàn khi Merge nhiều bảng',
        contentMarkdown:
          'Sai lầm kinh điển khi nối bảng là làm **nhân bản số dòng** do khóa bảng phụ bị trùng! Luôn truyền `validate="many_to_one"` (khi ghép nhiều đơn hàng vào 1 khách hàng) và kiểm tra `len(merged) == len(orders)` ngay sau khi merge.',
        exampleCode: `import pandas as pd
orders = pd.read_csv('orders.csv')
customers = pd.read_csv('customers.csv')
m = orders.merge(customers, on='CustomerId', how='left', validate='many_to_one')
print("Số dòng trước/sau merge:", len(orders), "->", len(m))`,
      },
    ],
    exercise: {
      prompt:
        'Đọc đồng thời orders.csv và customers.csv. Nối left join theo khóa CustomerId vào df_joined. Sau đó tính tổng doanh thu Revenue (= Quantity * UnitPrice) theo từng hạng khách hàng Tier vào Series tier_revenue.',
      requirements: [
        'df_joined có đúng 400 dòng và chứa đầy đủ các cột từ cả 2 bảng (Tier, City...).',
        'tier_revenue là Series tổng Revenue theo Tier.',
      ],
      starterCode: `import pandas as pd

orders = pd.read_csv('orders.csv')
customers = pd.read_csv('customers.csv')

# TODO: Merge orders với customers theo CustomerId, tính Revenue và tổng theo Tier
df_joined = ...
df_joined['Revenue'] = ...
tier_revenue = ...
`,
      hintText: 'df_joined = orders.merge(customers, on="CustomerId", how="left", validate="many_to_one") rồi groupby("Tier")["Revenue"].sum().',
      solutionCode: `import pandas as pd

orders = pd.read_csv('orders.csv')
customers = pd.read_csv('customers.csv')
df_joined = orders.merge(customers, on='CustomerId', how='left', validate='many_to_one')
df_joined['Revenue'] = df_joined['Quantity'] * df_joined['UnitPrice']
tier_revenue = df_joined.groupby('Tier')['Revenue'].sum()
`,
      checkPython: `
assert len(df_joined) == len(orders) == 400
assert {'Tier', 'City', 'AccountAgeMonths'}.issubset(df_joined.columns)
assert abs(float(tier_revenue.sum()) - float((orders['Quantity'] * orders['UnitPrice']).sum())) < 1e-4
`,
    },
  },
  {
    id: 'L018',
    order: 18,
    trackId: 'track02_pandas',
    title: 'Concat, Melt & Wide-to-Long Reshaping',
    subtitle: 'Ghép nối nhiều file train/test và xoay cấu trúc bảng để vẽ biểu đồ / mô hình hóa',
    difficulty: 'Trung bình',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['housing', 'housing_test'],
    objectives: [
      'Dùng pd.concat([train, test], ignore_index=True) kèm cột đánh dấu is_train.',
      'Dùng pd.melt() chuyển nhiều cột số sang định dạng dọc (long format) phục vụ Seaborn/Plotly.',
    ],
    sections: [
      {
        title: '1. Ghép Train + Test để kiểm tra lệch phân phối (Distribution Shift)',
        contentMarkdown:
          'Trước khi tạo feature, ta thường gán `train["is_train"] = 1`, `test["is_train"] = 0` rồi nối bằng `pd.concat` để kiểm tra xem tập test có giá trị lạ (unseen categories) hoặc thiếu dữ liệu khác với tập train không.',
      },
    ],
    exercise: {
      prompt:
        'Đọc housing.csv và housing_test.csv. Gán cột is_train = 1 cho train, 0 cho test rồi ghép theo chiều dọc (ignore_index=True) thành full_df (bỏ cột SalePrice trước khi ghép hoặc giữ NaN ở test). Đồng thời dùng pd.melt() xoay 2 cột ["LotArea", "LivingArea"] của housing.csv thành bảng dọc melted_df có cột metric và value.',
      requirements: [
        'full_df có tổng cộng 400 dòng (320 + 80) và chứa cột is_train.',
        'melted_df có 640 dòng (320 * 2) với cột var_name="metric", value_name="value".',
      ],
      starterCode: `import pandas as pd

train_df = pd.read_csv('housing.csv')
test_df = pd.read_csv('housing_test.csv')

# TODO: Gán is_train và concat thành full_df; tạo melted_df từ train_df
train_tmp = train_df.copy()
test_tmp = test_df.copy()
train_tmp['is_train'] = 1
test_tmp['is_train'] = 0

full_df = ...
melted_df = ...
`,
      hintText: 'pd.concat([train_tmp, test_tmp], ignore_index=True) và pd.melt(train_df, id_vars=["HouseId"], value_vars=["LotArea", "LivingArea"], var_name="metric", value_name="value").',
      solutionCode: `import pandas as pd

train_df = pd.read_csv('housing.csv')
test_df = pd.read_csv('housing_test.csv')
train_tmp = train_df.copy()
test_tmp = test_df.copy()
train_tmp['is_train'] = 1
test_tmp['is_train'] = 0
full_df = pd.concat([train_tmp, test_tmp], ignore_index=True)
melted_df = pd.melt(train_df, id_vars=['HouseId'], value_vars=['LotArea', 'LivingArea'], var_name='metric', value_name='value')
`,
      checkPython: `
assert len(full_df) == 400 and int(full_df['is_train'].sum()) == 320
assert len(melted_df) == 640 and {'metric', 'value'}.issubset(melted_df.columns)
`,
    },
  },
  {
    id: 'L019',
    order: 19,
    trackId: 'track02_pandas',
    title: 'Map, Replace, Cut/Qcut và Tránh lạm dụng .apply()',
    subtitle: 'Chia giỏ dữ liệu (Binning) và tăng tốc 50x khi biến đổi cột',
    difficulty: 'Trung bình',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['churn'],
    objectives: [
      'Dùng .map(dict) cho ánh xạ 1-1 nhanh hơn .apply(lambda).',
      'Dùng pd.cut (chia theo khoảng giá trị đều) và pd.qcut (chia theo số lượng mẫu đều nhau / quantile).',
    ],
    sections: [
      {
        title: '1. pd.cut vs pd.qcut trong Feature Engineering',
        contentMarkdown:
          '- `pd.cut(age, bins=[0, 30, 50, 100], labels=["Young", "Mid", "Senior"])`: chia theo ngưỡng miền nghiệp vụ cố định.\n- `pd.qcut(balance, q=4, labels=False, duplicates="drop")`: chia thành các nhóm tứ phân vị (Quartile) cân bằng kích thước — rất hữu ích cho dữ liệu bị lệch nặng.',
      },
    ],
    exercise: {
      prompt:
        'Trên bank_churn.csv, ánh xạ Gender ("Male" -> 1, "Female" -> 0) vào cột GenderCode bằng .map(). Chia cột Age thành 3 nhóm bằng pd.cut với ngưỡng [0, 30, 50, 120] và nhãn ["Young", "Middle", "Senior"] vào cột AgeGroup.',
      requirements: [
        'GenderCode chỉ gồm 0 và 1 không có NaN.',
        'AgeGroup có đúng 3 nhóm "Young", "Middle", "Senior".',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('bank_churn.csv')

# TODO: Map Gender và chia giỏ AgeGroup
df['GenderCode'] = ...
df['AgeGroup'] = ...
`,
      hintText: 'df["Gender"].map({"Male": 1, "Female": 0}) và pd.cut(df["Age"], bins=[0, 30, 50, 120], labels=["Young", "Middle", "Senior"]).',
      solutionCode: `import pandas as pd

df = pd.read_csv('bank_churn.csv')
df['GenderCode'] = df['Gender'].map({'Male': 1, 'Female': 0})
df['AgeGroup'] = pd.cut(df['Age'], bins=[0, 30, 50, 120], labels=['Young', 'Middle', 'Senior'])
`,
      checkPython: `
assert set(df['GenderCode'].unique()) == {0, 1}
assert set(df['AgeGroup'].dropna().astype(str).unique()).issubset({'Young', 'Middle', 'Senior'})
assert int(df['AgeGroup'].isna().sum()) == 0
`,
    },
  },
  {
    id: 'L020',
    order: 20,
    trackId: 'track02_pandas',
    title: 'Window Functions: Rolling, Shift & Diff cho Chuỗi thời gian',
    subtitle: 'Tính trung bình trượt 7 ngày và giá trị trễ (Lag) đúng thứ tự thời gian',
    difficulty: 'Nâng cao',
    libraries: ['Pandas'],
    estimatedMinutes: 16,
    datasetIds: ['daily_sales'],
    objectives: [
      'Luôn sort_values("Date") trước khi gọi shift() hoặc rolling().',
      'Tính lag feature với shift(k) và trung bình trượt rolling(window=7).mean().',
    ],
    sections: [
      {
        title: '1. Quy tắc bất di bất dịch: Sort + Shift trước khi Rolling',
        contentMarkdown:
          'Nếu bạn muốn dùng trung bình doanh số 7 ngày gần nhất để dự đoán **ngày hôm nay (`t`)**, bạn PHẢI `shift(1)` trước khi `rolling(7)` (`s.shift(1).rolling(7).mean()`), nếu không doanh số của chính ngày hôm nay sẽ lọt vào đặc trưng dự đoán chính nó (Target Leakage)!',
      },
    ],
    exercise: {
      prompt:
        'Đọc daily_sales.csv, sắp theo Date tăng dần. Tạo 2 cột: Sales_Lag1 = doanh số ngày hôm trước (`shift(1)`) và Sales_Roll7 = trung bình trượt 7 ngày trước đó không bao gồm ngày hiện tại (`shift(1).rolling(7).mean()`).',
      requirements: [
        'df được sắp xếp tăng dần theo Date.',
        'Sales_Lag1 là shift(1) của Sales.',
        'Sales_Roll7 tại index 10 khớp đúng trung bình của Sales[3:10].',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('daily_sales.csv')
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values('Date').reset_index(drop=True)

# TODO: Tạo Sales_Lag1 và Sales_Roll7 (chống leakage bằng shift(1))
df['Sales_Lag1'] = ...
df['Sales_Roll7'] = ...
`,
      hintText: 'df["Sales_Lag1"] = df["Sales"].shift(1) và df["Sales_Roll7"] = df["Sales"].shift(1).rolling(7).mean().',
      solutionCode: `import pandas as pd

df = pd.read_csv('daily_sales.csv')
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values('Date').reset_index(drop=True)
df['Sales_Lag1'] = df['Sales'].shift(1)
df['Sales_Roll7'] = df['Sales'].shift(1).rolling(7).mean()
`,
      checkPython: `
assert df['Date'].is_monotonic_increasing
assert pd.isna(df.loc[0, 'Sales_Lag1'])
assert abs(float(df.loc[10, 'Sales_Lag1']) - float(df.loc[9, 'Sales'])) < 1e-6
assert abs(float(df.loc[10, 'Sales_Roll7']) - float(df.loc[3:9, 'Sales'].mean())) < 1e-6
`,
    },
  },
  {
    id: 'L021',
    order: 21,
    trackId: 'track02_pandas',
    title: 'Tối ưu Bộ Nhớ RAM DataFrame (Downcasting & Category)',
    subtitle: 'Giảm 50–80% RAM khi xử lý dữ liệu triệu dòng trên Browser hoặc Kaggle 16GB RAM',
    difficulty: 'Nâng cao',
    libraries: ['Pandas'],
    estimatedMinutes: 14,
    datasetIds: ['orders'],
    objectives: [
      'Đo bộ nhớ thực tế bằng df.memory_usage(deep=True).sum().',
      'Downcast int64 -> int32/int16, float64 -> float32 và chuyển chuỗi lặp lại nhiều sang dtype="category".',
    ],
    sections: [
      {
        title: '1. Kỹ thuật giảm RAM tiêu chuẩn Kaggle',
        contentMarkdown:
          'Mỗi cột `object` chứa chuỗi lặp lại nhiều lần (như `"Electronics"`, `"Fashion"`) tốn rất nhiều RAM. Chuyển sang `.astype("category")` và downcast `float64 -> float32`, `int64 -> int32` thường giảm dung lượng bảng xuống còn 1/3 mà không mất thông tin.',
      },
    ],
    exercise: {
      prompt:
        'Đọc orders.csv, đo mem_before = df.memory_usage(deep=True).sum(). Tạo df_opt chuyển Category sang category, Quantity sang int16, UnitPrice sang float32, Returned sang int8, rồi đo mem_after.',
      requirements: [
        'df_opt["Category"] có dtype category.',
        'mem_after < mem_before * 0.7 (giảm ít nhất 30% RAM).',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('orders.csv')
mem_before = int(df.memory_usage(deep=True).sum())

df_opt = df.copy()
# TODO: Tối ưu dtype cho Category, Quantity, UnitPrice, Returned
...
mem_after = int(df_opt.memory_usage(deep=True).sum())
print(f"RAM: {mem_before} -> {mem_after} bytes")
`,
      hintText: 'Dùng df_opt["Category"] = df_opt["Category"].astype("category"); df_opt["Quantity"] = df_opt["Quantity"].astype("int16"); df_opt["UnitPrice"] = df_opt["UnitPrice"].astype("float32"); df_opt["Returned"] = df_opt["Returned"].astype("int8")',
      solutionCode: `import pandas as pd

df = pd.read_csv('orders.csv')
mem_before = int(df.memory_usage(deep=True).sum())
df_opt = df.copy()
df_opt['Category'] = df_opt['Category'].astype('category')
df_opt['Quantity'] = df_opt['Quantity'].astype('int16')
df_opt['UnitPrice'] = df_opt['UnitPrice'].astype('float32')
df_opt['Returned'] = df_opt['Returned'].astype('int8')
mem_after = int(df_opt.memory_usage(deep=True).sum())
`,
      checkPython: `
assert str(df_opt['Category'].dtype) == 'category'
assert df_opt['UnitPrice'].dtype.name == 'float32'
assert mem_after < mem_before * 0.7, f"Chưa giảm đủ RAM: {mem_before} -> {mem_after}"
`,
    },
  },
  {
    id: 'L022',
    order: 22,
    trackId: 'track02_pandas',
    title: 'Tổng hợp Pipeline EDA Pandas (.pipe & Method Chaining)',
    subtitle: 'Viết code Pandas sạch, dễ đọc, nối chuỗi biến đổi chuyên nghiệp',
    difficulty: 'Nâng cao',
    libraries: ['Pandas'],
    estimatedMinutes: 18,
    datasetIds: ['orders', 'customers'],
    objectives: [
      'Kết hợp Method Chaining (.assign(), .dropna(), .sort_values()) và .pipe(func).',
      'Xây báo cáo RFM/Customer Profiling hoàn chỉnh từ 2 bảng giao dịch và khách hàng.',
    ],
    sections: [
      {
        title: '1. Tư duy Method Chaining & .pipe()',
        contentMarkdown:
          'Thay vì tạo hàng chục biến tạm `df1`, `df2`, `df3`, viết hàm nhận DataFrame rồi xâu chuỗi qua `.pipe(step1).pipe(step2)` giúp pipeline làm sạch tái sử dụng được cho cả `train` và `test`.',
      },
    ],
    exercise: {
      prompt:
        'Kết hợp orders.csv và customers.csv: lọc những đơn từ khách hàng City thuộc ["HaNoi", "HCM"], tính Revenue = Quantity * UnitPrice, rồi tạo bảng cust_top5 gồm Top 5 khách hàng có tổng doanh thu cao nhất (cột CustomerId và total_spend, sắp giảm dần).',
      requirements: [
        'cust_top5 là DataFrame có đúng 5 dòng và cột CustomerId, total_spend.',
        'total_spend được sắp xếp giảm dần.',
      ],
      starterCode: `import pandas as pd

orders = pd.read_csv('orders.csv')
customers = pd.read_csv('customers.csv')

# TODO: Nối bảng, lọc City HaNoi/HCM, tính Revenue, gom nhóm theo CustomerId lấy Top 5
cust_top5 = ...
`,
      hintText: 'Dùng orders.merge(customers, on="CustomerId", how="left").query("City in [\'HaNoi\', \'HCM\']").assign(Revenue=lambda d: d.Quantity * d.UnitPrice).groupby("CustomerId", as_index=False)["Revenue"].sum().rename(columns={"Revenue": "total_spend"}).sort_values("total_spend", ascending=False).head(5)',
      solutionCode: `import pandas as pd

orders = pd.read_csv('orders.csv')
customers = pd.read_csv('customers.csv')
cust_top5 = (
    orders.merge(customers, on='CustomerId', how='left')
    .query("City in ['HaNoi', 'HCM']")
    .assign(Revenue=lambda d: d['Quantity'] * d['UnitPrice'])
    .groupby('CustomerId', as_index=False)['Revenue']
    .sum()
    .rename(columns={'Revenue': 'total_spend'})
    .sort_values('total_spend', ascending=False)
    .head(5)
    .reset_index(drop=True)
)
`,
      checkPython: `
assert len(cust_top5) == 5
assert {'CustomerId', 'total_spend'}.issubset(cust_top5.columns)
assert cust_top5['total_spend'].is_monotonic_decreasing
`,
    },
  },
];
