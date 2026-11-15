import { LessonDefinition } from '../../types/curriculum';

export const TRACK01_NUMPY_LESSONS: LessonDefinition[] = [
  {
    id: 'L001',
    order: 1,
    trackId: 'track01_numpy',
    title: 'Khởi tạo ndarray, shape, dtype và chuyển đổi dữ liệu bảng',
    subtitle: 'Nền tảng mảng đa chiều NumPy và lý do nó nhanh hơn list Python gấp hàng chục lần',
    difficulty: 'Cơ bản',
    libraries: ['Python', 'NumPy'],
    estimatedMinutes: 12,
    datasetIds: ['titanic'],
    objectives: [
      'Phân biệt Python list và numpy.ndarray (vùng nhớ liên tiếp, đồng nhất kiểu dữ liệu).',
      'Nắm vững thuộc tính shape, ndim, size, dtype và ép kiểu bằng .astype().',
      'Trích xuất cột số từ DataFrame sang ndarray để tính toán nhanh.',
    ],
    sections: [
      {
        title: '1. Vì sao Machine Learning bắt buộc dùng NumPy thay vì Python list?',
        contentMarkdown:
          'Một `list` trong Python lưu trữ danh sách các con trỏ tới từng object rời rạc trong RAM, nên vòng lặp `for` phải kiểm tra kiểu dữ liệu ở từng phần tử. Ngược lại, `np.ndarray` lưu toàn bộ giá trị cùng kiểu (`float64`, `int32`...) liền kề nhau trên một khối bộ nhớ duy nhất, cho phép CPU thực thi lệnh vector hóa SIMD (Single Instruction Multiple Data) cực nhanh.',
        exampleCode: `import numpy as np
import pandas as pd

df = pd.read_csv('titanic.csv')
fares = df['Fare'].to_numpy(dtype=np.float64)
print('Shape:', fares.shape, '| ndim:', fares.ndim, '| dtype:', fares.dtype)
print('5 giá trị đầu:', fares[:5])`,
        callout: {
          type: 'note',
          title: 'Quy tắc bộ nhớ trong ML',
          text: 'Hầu hết các thư viện như Scikit-Learn, PyTorch hay TensorFlow đều nhận đầu vào dạng ndarray hoặc chuyển đổi ngầm qua NumPy trước khi huấn luyện.',
        },
      },
      {
        title: '2. Các hàm tạo mảng chuẩn và kiểm tra kiểu dữ liệu',
        contentMarkdown:
          'Các hàm thường dùng nhất: `np.array(...)`, `np.zeros((rows, cols))`, `np.ones(...)`, `np.arange(start, stop, step)` và `np.linspace(start, stop, num)`. Khi dữ liệu có `NaN`, kiểu dữ liệu tự động chuyển sang `float64` vì `int64` không thể biểu diễn `NaN`.',
      },
    ],
    exercise: {
      prompt:
        'Đọc file titanic.csv, trích xuất 2 cột Pclass và Fare thành ma trận NumPy 2 chiều X kiểu float64, và tạo vector y từ cột Survived kiểu int64.',
      requirements: [
        'Tạo biến X là np.ndarray 2D có shape (300, 2) và dtype float64 từ [\'Pclass\', \'Fare\'].',
        'Tạo biến y là np.ndarray 1D có shape (300,) và kiểu số nguyên (int32 hoặc int64) từ cột Survived.',
        'Tính biến mean_fare là giá trị trung bình của cột Fare bằng np.mean().',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('titanic.csv')

# TODO: Chuyển ['Pclass', 'Fare'] thành mảng 2D float64 tên X
X = ...

# TODO: Chuyển 'Survived' thành mảng 1D số nguyên tên y
y = ...

# TODO: Tính giá vé trung bình
mean_fare = ...
`,
      hintText:
        'Dùng df[["Pclass", "Fare"]].to_numpy(dtype=np.float64) cho X, df["Survived"].to_numpy(dtype=np.int64) cho y, và float(np.mean(X[:, 1])) cho mean_fare.',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Fare']].to_numpy(dtype=np.float64)
y = df['Survived'].to_numpy(dtype=np.int64)
mean_fare = float(np.mean(X[:, 1]))
`,
      checkPython: `
assert isinstance(X, np.ndarray), "X phải là numpy.ndarray"
assert X.shape == (300, 2), f"X.shape mong đợi (300, 2), nhận được {X.shape}"
assert X.dtype == np.float64, f"X.dtype phải là float64, nhận {X.dtype}"
assert isinstance(y, np.ndarray) and y.shape == (300,), "y phải có shape (300,)"
assert np.issubdtype(y.dtype, np.integer), "y phải có kiểu số nguyên"
assert abs(float(mean_fare) - float(df['Fare'].mean())) < 1e-6, "mean_fare chưa chính xác"
`,
    },
  },
  {
    id: 'L002',
    order: 2,
    trackId: 'track01_numpy',
    title: 'Indexing, Slicing 2D/3D và Fancy Indexing',
    subtitle: 'Cắt lát ma trận dữ liệu không copy thừa bộ nhớ (View vs Copy)',
    difficulty: 'Cơ bản',
    libraries: ['NumPy'],
    estimatedMinutes: 12,
    datasetIds: ['housing'],
    objectives: [
      'Sử dụng cú pháp M[row_slice, col_slice] để trích xuất hàng, cột, ma trận con.',
      'Phân biệt Basic Slicing (trả về View) và Fancy Indexing M[[0, 2, 5]] (trả về Copy).',
    ],
    sections: [
      {
        title: '1. Cú pháp cắt lát ma trận X[rows, cols]',
        contentMarkdown:
          'Với mảng 2D `X` có shape `(N, D)` (N mẫu, D đặc trưng):\n- `X[:, 0]` lấy toàn bộ cột 0 (trả về vector 1D).\n- `X[:, :2]` lấy 2 cột đầu.\n- `X[-10:, :]` lấy 10 dòng cuối.\n\nLưu ý quan trọng: Basic slicing tạo ra **View** (trỏ chung vùng nhớ với mảng gốc). Nếu sửa giá trị trên slice, mảng gốc cũng thay đổi theo! Dùng `.copy()` khi cần độc lập.',
        exampleCode: `import numpy as np
A = np.arange(12).reshape(3, 4)
sub = A[:2, 1:3]
print("Ma trận con:\n", sub)
print("Cột cuối 1D:", A[:, -1])`,
      },
    ],
    exercise: {
      prompt:
        'Từ housing.csv, trích xuất các cột số [\'LotArea\', \'Bedrooms\', \'YearBuilt\', \'DistCenterKm\'] vào ma trận H (320, 4). Lấy 50 dòng đầu vào H_head và chỉ số các cột [0, 3] vào H_pair.',
      requirements: [
        'H có shape (320, 4).',
        'H_head là 50 dòng đầu tiên của H (shape (50, 4)).',
        'H_pair lấy toàn bộ dòng nhưng chỉ giữ cột 0 (LotArea) và cột 3 (DistCenterKm) có shape (320, 2).',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('housing.csv')
H = df[['LotArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm']].to_numpy(dtype=np.float64)

# TODO: 50 dòng đầu
H_head = ...

# TODO: toàn bộ dòng, cột index 0 và 3
H_pair = ...
`,
      hintText: 'Dùng H[:50, :] cho H_head và fancy indexing H[:, [0, 3]] cho H_pair.',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('housing.csv')
H = df[['LotArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm']].to_numpy(dtype=np.float64)
H_head = H[:50, :]
H_pair = H[:, [0, 3]]
`,
      checkPython: `
assert H.shape == (320, 4)
assert H_head.shape == (50, 4) and np.allclose(H_head, H[:50])
assert H_pair.shape == (320, 2) and np.allclose(H_pair[:, 0], H[:, 0]) and np.allclose(H_pair[:, 1], H[:, 3])
`,
    },
  },
  {
    id: 'L003',
    order: 3,
    trackId: 'track01_numpy',
    title: 'Broadcasting: Phép toán giữa các mảng khác kích thước',
    subtitle: 'Hiểu cơ chế tự giãn chiều để viết công thức chuẩn hóa Z-score không cần vòng lặp',
    difficulty: 'Cơ bản',
    libraries: ['NumPy'],
    estimatedMinutes: 15,
    datasetIds: ['iris_ext'],
    objectives: [
      'Nắm 2 quy tắc tương thích Broadcasting từ phải sang trái.',
      'Tự cài đặt StandardScaler (trừ mean theo cột, chia std theo cột) chỉ bằng 1 dòng NumPy.',
    ],
    sections: [
      {
        title: '1. Hai quy tắc vàng của Broadcasting',
        contentMarkdown:
          'Khi thực hiện phép toán hai mảng `A` và `B`, NumPy so khớp kích thước các chiều **từ phải sang trái**:\n1. Hai chiều tương thích nếu chúng **bằng nhau** hoặc **một trong hai bằng 1**.\n2. Mảng ít chiều hơn được tự động thêm chiều `1` ở bên trái.\n\nVí dụ: Ma trận `X` có shape `(180, 4)`, vector trung bình theo cột `mu = X.mean(axis=0)` có shape `(4,)` → xem như `(1, 4)` → giãn thành `(180, 4)` khi thực hiện `X - mu`!',
        callout: {
          type: 'formula',
          title: 'Công thức chuẩn hóa Z-Score (Standardization)',
          text: 'X_scaled = (X - mu) / sigma, trong đó mu = X.mean(axis=0) và sigma = X.std(axis=0).',
        },
        exampleCode: `import numpy as np
X = np.array([[10., 200.], [20., 400.], [30., 600.]])
mu = X.mean(axis=0)
sigma = X.std(axis=0)
print("Z-score:\n", (X - mu) / sigma)`,
      },
    ],
    exercise: {
      prompt:
        'Đọc iris_extended.csv, lấy 4 cột số [\'SepalLength\', \'SepalWidth\', \'PetalLength\', \'PetalWidth\'] vào X_iris và tự chuẩn hóa Min-Max về đoạn [0, 1] bằng Broadcasting (không dùng sklearn).',
      requirements: [
        'X_iris có shape (180, 4).',
        'Tính min_col = X_iris.min(axis=0) và max_col = X_iris.max(axis=0).',
        'X_minmax = (X_iris - min_col) / (max_col - min_col) nằm trong [0.0, 1.0].',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
X_iris = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].to_numpy(dtype=np.float64)

# TODO: Tính min và max theo cột (axis=0) và chuẩn hóa Min-Max
min_col = ...
max_col = ...
X_minmax = ...
`,
      hintText: 'Dùng axis=0 cho min() và max(). Broadcasting sẽ tự trừ/chia từng cột tương ứng.',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
X_iris = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].to_numpy(dtype=np.float64)
min_col = X_iris.min(axis=0)
max_col = X_iris.max(axis=0)
X_minmax = (X_iris - min_col) / (max_col - min_col)
`,
      checkPython: `
assert X_minmax.shape == (180, 4)
assert np.allclose(X_minmax.min(axis=0), 0.0, atol=1e-7), "Min mỗi cột sau MinMax phải bằng 0"
assert np.allclose(X_minmax.max(axis=0), 1.0, atol=1e-7), "Max mỗi cột sau MinMax phải bằng 1"
`,
    },
  },
  {
    id: 'L004',
    order: 4,
    trackId: 'track01_numpy',
    title: 'Aggregations theo trục (axis=0 vs axis=1) & np.nan*',
    subtitle: 'Thống kê trên cột, hàng và tránh lỗi NaN lan truyền toàn bộ phép tính',
    difficulty: 'Cơ bản',
    libraries: ['NumPy'],
    estimatedMinutes: 12,
    datasetIds: ['titanic'],
    objectives: [
      'Phân biệt axis=0 (gộp dọc qua các dòng → thống kê theo cột) và axis=1 (gộp ngang qua các cột → thống kê theo mẫu).',
      'Dùng np.nanmean, np.nanmedian, np.nansum, np.isnan để xử lý giá trị thiếu.',
    ],
    sections: [
      {
        title: '1. Nhớ nhanh axis=0 và axis=1',
        contentMarkdown:
          'Mẹo nhớ không bao giờ nhầm: `axis=0` là **thu gọn trục 0 (trục dòng)** → kết quả còn lại số phần tử bằng số cột. Tương tự, `axis=1` là **thu gọn trục 1 (trục cột)** → kết quả còn lại số phần tử bằng số dòng.\n\nNếu mảng chứa dù chỉ 1 giá trị `np.nan`, `np.mean(arr)` sẽ trả về `nan`. Trong ML, hãy dùng `np.nanmean` hoặc `np.nanmedian` khi tính thống kê trên dữ liệu thô.',
      },
    ],
    exercise: {
      prompt:
        'Trên titanic.csv, lấy cột Age (có NaN) thành mảng 1D age_arr. Đếm số phần tử bị thiếu n_missing, tính trung vị bỏ qua NaN med_age, và điền các chỗ thiếu bằng med_age vào mảng age_filled (dùng np.where).',
      requirements: [
        'n_missing là số nguyên đếm số NaN trong age_arr.',
        'med_age = float(np.nanmedian(age_arr)).',
        'age_filled không còn giá trị NaN nào.',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('titanic.csv')
age_arr = df['Age'].to_numpy(dtype=np.float64)

# TODO: Đếm số NaN, tính median bỏ NaN và điền giá trị thiếu
n_missing = ...
med_age = ...
age_filled = ...
`,
      hintText: 'Dùng np.isnan(age_arr).sum(), np.nanmedian(age_arr), và np.where(np.isnan(age_arr), med_age, age_arr).',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('titanic.csv')
age_arr = df['Age'].to_numpy(dtype=np.float64)
n_missing = int(np.isnan(age_arr).sum())
med_age = float(np.nanmedian(age_arr))
age_filled = np.where(np.isnan(age_arr), med_age, age_arr)
`,
      checkPython: `
assert n_missing == int(df['Age'].isna().sum()) and n_missing > 0
assert abs(med_age - float(df['Age'].median())) < 1e-6
assert int(np.isnan(age_filled).sum()) == 0, "age_filled vẫn còn NaN"
assert age_filled.shape == age_arr.shape
`,
    },
  },
  {
    id: 'L005',
    order: 5,
    trackId: 'track01_numpy',
    title: 'Boolean Masking, np.where & np.select phân tầng điều kiện',
    subtitle: 'Lọc mẫu thỏa điều kiện phức tạp và mã hóa điều kiện đa nhánh',
    difficulty: 'Cơ bản',
    libraries: ['NumPy'],
    estimatedMinutes: 14,
    datasetIds: ['churn'],
    objectives: [
      'Kết hợp điều kiện logic bằng & (AND), | (OR), ~ (NOT) với ngoặc đơn bắt buộc.',
      'Dùng np.where(cond, a, b) và np.select(condlist, choicelist) để tạo nhãn/feature mới.',
    ],
    sections: [
      {
        title: '1. Lọc điều kiện kép và np.select',
        contentMarkdown:
          'Trong NumPy/Pandas, tuyệt đối không dùng `and`/`or` của Python cho mảng mà phải dùng `&`, `|`, `~` và **bọc ngoặc đơn** từng điều kiện: `(age > 45) & (balance > 50000)`. Khi có từ 3 điều kiện phân nhóm trở lên (ví dụ chia nhóm tuổi Trẻ/Trung niên/Cao tuổi), `np.select` giúp code sạch và nhanh hơn hẳn `if-elif`.',
      },
    ],
    exercise: {
      prompt:
        'Trên bank_churn.csv, dùng NumPy tạo mask vip_churn là khách hàng có Balance > 100000 VÀ Churn == 1, đếm số lượng n_vip_churn. Đồng thời dùng np.select phân nhóm CreditScore thành risk_tier ("HighRisk" nếu < 580, "Medium" nếu < 700, ngược lại "LowRisk").',
      requirements: [
        'n_vip_churn là số lượng khách hàng có Balance > 100000 và Churn == 1.',
        'risk_tier là mảng có độ dài 350 chứa đúng 3 nhãn "HighRisk", "Medium", "LowRisk".',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('bank_churn.csv')
balance = df['Balance'].to_numpy()
churn = df['Churn'].to_numpy()
score = df['CreditScore'].to_numpy()

# TODO: Đếm VIP churn và phân nhóm risk_tier
vip_mask = ...
n_vip_churn = ...
risk_tier = ...
`,
      hintText: 'vip_mask = (balance > 100000) & (churn == 1). Dùng np.select([score < 580, score < 700], ["HighRisk", "Medium"], default="LowRisk").',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('bank_churn.csv')
balance = df['Balance'].to_numpy()
churn = df['Churn'].to_numpy()
score = df['CreditScore'].to_numpy()

vip_mask = (balance > 100000) & (churn == 1)
n_vip_churn = int(vip_mask.sum())
risk_tier = np.select([score < 580, score < 700], ['HighRisk', 'Medium'], default='LowRisk')
`,
      checkPython: `
expected_n = int(((df['Balance'] > 100000) & (df['Churn'] == 1)).sum())
assert n_vip_churn == expected_n
assert len(risk_tier) == len(df)
assert set(np.unique(risk_tier)).issubset({'HighRisk', 'Medium', 'LowRisk'})
assert (risk_tier[score < 580] == 'HighRisk').all()
`,
    },
  },
  {
    id: 'L006',
    order: 6,
    trackId: 'track01_numpy',
    title: 'Đại số tuyến tính (np.dot, @, Norm, Cosine Similarity)',
    subtitle: 'Trái tim của Hồi quy tuyến tính, Mạng Neural và Tìm kiếm Vector',
    difficulty: 'Trung bình',
    libraries: ['NumPy'],
    estimatedMinutes: 16,
    datasetIds: ['housing'],
    objectives: [
      'Thực hiện nhân ma trận bằng toán tử @ hoặc np.matmul.',
      'Tính chuẩn vector L2 (np.linalg.norm) và Cosine Similarity giữa hai mẫu dữ liệu.',
      'Giải bài toán hồi quy tuyến tính OLS bằng công thức chuẩn hoặc np.linalg.lstsq.',
    ],
    sections: [
      {
        title: '1. Nhân ma trận y_hat = X @ w + b và Cosine Similarity',
        contentMarkdown:
          'Mọi mô hình tuyến tính và tầng Linear (`nn.Linear`) trong Deep Learning đều tính `z = X @ w + b`.\n\n**Cosine Similarity** đo độ giống nhau về hướng giữa 2 vector `u` và `v`: `cos(u, v) = (u @ v) / (||u||_2 * ||v||_2)`. Giá trị gần `1.0` nghĩa là hai mẫu rất tương đồng.',
        callout: {
          type: 'formula',
          title: 'Normal Equation cho Linear Regression',
          text: 'w = np.linalg.lstsq(X_aug, y, rcond=None)[0] ổn định số học hơn so với nghịch đảo trực tiếp (X^T X)^-1 X^T y.',
        },
      },
    ],
    exercise: {
      prompt:
        'Trên housing.csv (bỏ NaN ở LivingArea), chuẩn bị ma trận X gồm cột [LivingArea, Bedrooms] nối thêm cột toàn số 1 (bias) thành X_aug, và tìm vector trọng số w (dài 3) dự đoán SalePrice bằng np.linalg.lstsq. Tính dự đoán y_hat = X_aug @ w.',
      requirements: [
        'X_aug có shape (N, 3) với cột cuối toàn số 1.0.',
        'w có shape (3,) tìm được từ np.linalg.lstsq(X_aug, y, rcond=None)[0].',
        'rmse là Root Mean Squared Error nhỏ hơn 80000.',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('housing.csv').dropna(subset=['LivingArea']).reset_index(drop=True)
X = df[['LivingArea', 'Bedrooms']].to_numpy(dtype=np.float64)
y = df['SalePrice'].to_numpy(dtype=np.float64)

# TODO: Nối cột bias=1 vào X tạo X_aug, giải w và tính y_hat, rmse
X_aug = ...
w = ...
y_hat = ...
rmse = ...
`,
      hintText: 'Dùng np.column_stack([X, np.ones(len(X))]), sau đó np.linalg.lstsq(X_aug, y, rcond=None)[0] và np.sqrt(np.mean((y - y_hat)**2)).',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('housing.csv').dropna(subset=['LivingArea']).reset_index(drop=True)
X = df[['LivingArea', 'Bedrooms']].to_numpy(dtype=np.float64)
y = df['SalePrice'].to_numpy(dtype=np.float64)
X_aug = np.column_stack([X, np.ones(len(X))])
w = np.linalg.lstsq(X_aug, y, rcond=None)[0]
y_hat = X_aug @ w
rmse = float(np.sqrt(np.mean((y - y_hat) ** 2)))
`,
      checkPython: `
assert X_aug.shape == (len(df), 3) and np.allclose(X_aug[:, 2], 1.0)
assert w.shape == (3,)
assert rmse < 80000 and abs(rmse - float(np.sqrt(np.mean((y - X_aug @ w)**2)))) < 1e-4
`,
    },
  },
  {
    id: 'L007',
    order: 7,
    trackId: 'track01_numpy',
    title: 'Sinh số ngẫu nhiên tái lập (RandomState & default_rng)',
    subtitle: 'Kiểm soát seed để thí nghiệm ML cho ra cùng kết quả mỗi lần chạy',
    difficulty: 'Cơ bản',
    libraries: ['NumPy'],
    estimatedMinutes: 10,
    datasetIds: ['iris_ext'],
    objectives: [
      'Phân biệt np.random.default_rng(seed) và seed toàn cục.',
      'Tự xáo trộn chỉ số dữ liệu bằng rng.permutation(n) để chia Train/Test thủ công.',
    ],
    sections: [
      {
        title: '1. Tạo Train/Test split tái lập bằng permutation',
        contentMarkdown:
          'Trong nghiên cứu khoa học và thi đấu Kaggle, tính tái lập (Reproducibility) là bắt buộc. Dùng `rng = np.random.default_rng(42)` giúp dòng sinh số ngẫu nhiên độc lập, không bị ảnh hưởng bởi code khác gọi `np.random`.',
      },
    ],
    exercise: {
      prompt:
        'Dùng np.random.default_rng(42) xáo trộn chỉ số từ 0..179 của iris_extended.csv, chia 80% đầu (144 mẫu) vào train_idx và 20% cuối (36 mẫu) vào test_idx.',
      requirements: [
        'train_idx có độ dài 144, test_idx có độ dài 36.',
        'train_idx và test_idx không giao nhau và hợp lại đủ 180 chỉ số.',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
n = len(df)
rng = np.random.default_rng(42)

# TODO: Xáo trộn chỉ số và tách 80/20
perm = ...
train_idx = ...
test_idx = ...
`,
      hintText: 'perm = rng.permutation(n); split = int(0.8 * n); train_idx = perm[:split]; test_idx = perm[split:]',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
n = len(df)
rng = np.random.default_rng(42)
perm = rng.permutation(n)
split = int(0.8 * n)
train_idx = perm[:split]
test_idx = perm[split:]
`,
      checkPython: `
assert len(train_idx) == 144 and len(test_idx) == 36
assert len(set(train_idx) & set(test_idx)) == 0
assert len(set(train_idx) | set(test_idx)) == 180
`,
    },
  },
  {
    id: 'L008',
    order: 8,
    trackId: 'track01_numpy',
    title: 'Reshape, Transpose, Flatten và Stack mảng',
    subtitle: 'Chuẩn bị đúng shape tensor cho Scikit-Learn, CNN 1D và PyTorch/TensorFlow',
    difficulty: 'Trung bình',
    libraries: ['NumPy'],
    estimatedMinutes: 14,
    datasetIds: ['sensor_iot'],
    objectives: [
      'Dùng reshape(-1, 1) biến vector 1D (N,) thành ma trận cột (N, 1) cho sklearn.',
      'Hiểu sự khác nhau giữa np.vstack, np.hstack và np.stack (thêm trục mới).',
    ],
    sections: [
      {
        title: '1. Quy tắc -1 trong reshape và np.stack',
        contentMarkdown:
          'Scikit-Learn yêu cầu `X` luôn phải là 2D `(N, D)` ngay cả khi chỉ có 1 đặc trưng: `x.reshape(-1, 1)` tự suy ra `N`. Khi tạo dữ liệu chuỗi thời gian / tín hiệu cho 1D-CNN hoặc LSTM, ta xếp các cửa sổ trượt (sliding windows) bằng `np.stack(...)` để tạo tensor 3D `(Batch, TimeSteps, Channels)`.',
      },
    ],
    exercise: {
      prompt:
        'Từ sensor_iot.csv (300 dòng), lấy cột TempC thành vector 1D và reshape thành X_col shape (300, 1). Ngoài ra, tách 300 dòng của [TempC, VibrationMm] thành 30 cửa sổ liên tiếp mỗi cửa sổ 10 bước thời gian thành tensor W có shape (30, 10, 2).',
      requirements: [
        'X_col có shape (300, 1).',
        'W có shape (30, 10, 2).',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('sensor_iot.csv')
temp = df['TempC'].to_numpy()
signals = df[['TempC', 'VibrationMm']].to_numpy()

# TODO: Reshape temp thành (300, 1) và signals thành (30, 10, 2)
X_col = ...
W = ...
`,
      hintText: 'Dùng temp.reshape(-1, 1) và signals.reshape(30, 10, 2).',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('sensor_iot.csv')
temp = df['TempC'].to_numpy()
signals = df[['TempC', 'VibrationMm']].to_numpy()
X_col = temp.reshape(-1, 1)
W = signals.reshape(30, 10, 2)
`,
      checkPython: `
assert X_col.shape == (300, 1)
assert W.shape == (30, 10, 2)
assert np.allclose(W[0, :, :], signals[:10, :])
`,
    },
  },
  {
    id: 'L009',
    order: 9,
    trackId: 'track01_numpy',
    title: 'Xử lý Inf, Clipping Outlier và Biến đổi Log1p an toàn',
    subtitle: 'Bảo vệ mô hình tuyến tính và mạng Neural khỏi nổ gradient do outlier/skew',
    difficulty: 'Trung bình',
    libraries: ['NumPy'],
    estimatedMinutes: 14,
    datasetIds: ['fraud'],
    objectives: [
      'Dùng np.clip(x, low, high) hoặc phân vị np.percentile() để cắt ngưỡng Winsorize.',
      'Dùng np.log1p(x) cho dữ liệu không âm lệch phải và np.expm1(y_log) để hoàn nguyên dự đoán.',
    ],
    sections: [
      {
        title: '1. Vì sao phải dùng log1p thay vì log?',
        contentMarkdown:
          'Nếu dữ liệu có giá trị bằng `0`, `np.log(0)` trả về `-inf` làm sập toàn bộ mô hình! `np.log1p(x) = ln(1 + x)` an toàn khi `x = 0` và hàm nghịch đảo chính xác là `np.expm1(z) = exp(z) - 1`.',
      },
    ],
    exercise: {
      prompt:
        'Cột Amount trong credit_fraud.csv bị lệch phải rất mạnh. Tính phân vị thứ 99 (p99), cắt ngưỡng trên của Amount tại p99 vào amount_clipped, sau đó biến đổi bằng np.log1p vào amount_log.',
      requirements: [
        'p99 là np.percentile(amount, 99).',
        'amount_clipped <= p99 với mọi phần tử.',
        'amount_log = np.log1p(amount_clipped) không chứa NaN hay Inf.',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('credit_fraud.csv')
amount = df['Amount'].to_numpy(dtype=np.float64)

# TODO: Tính p99, clip và log1p
p99 = ...
amount_clipped = ...
amount_log = ...
`,
      hintText: 'p99 = float(np.percentile(amount, 99)); amount_clipped = np.clip(amount, None, p99); amount_log = np.log1p(amount_clipped)',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('credit_fraud.csv')
amount = df['Amount'].to_numpy(dtype=np.float64)
p99 = float(np.percentile(amount, 99))
amount_clipped = np.clip(amount, 0.0, p99)
amount_log = np.log1p(amount_clipped)
`,
      checkPython: `
assert abs(p99 - float(np.percentile(amount, 99))) < 1e-6
assert amount_clipped.max() <= p99 + 1e-9
assert np.isfinite(amount_log).all()
assert np.allclose(np.expm1(amount_log), amount_clipped)
`,
    },
  },
  {
    id: 'L010',
    order: 10,
    trackId: 'track01_numpy',
    title: 'Vectorization nâng cao: Tính ma trận khoảng cách cặp (Pairwise Distance)',
    subtitle: 'Tư duy vector hóa 3 chiều ứng dụng cho KNN và K-Means không dùng vòng lặp for',
    difficulty: 'Nâng cao',
    libraries: ['NumPy'],
    estimatedMinutes: 18,
    datasetIds: ['iris_ext'],
    objectives: [
      'Áp dụng Broadcasting 3D: A[:, None, :] - B[None, :, :] để tính khoảng cách giữa mọi cặp điểm.',
      'Hoặc dùng hằng đẳng thức ||a - b||^2 = ||a||^2 + ||b||^2 - 2 a.b siêu tiết kiệm RAM.',
    ],
    sections: [
      {
        title: '1. Viết thuật toán tìm hàng xóm gần nhất (1-NN) thuần NumPy',
        contentMarkdown:
          'Nếu bạn có `Q` điểm truy vấn shape `(M, D)` và `X` tập dữ liệu `(N, D)`, thay vì dùng 2 vòng `for` lồng nhau chậm chạp, ta mở rộng trục bằng `None` (`np.newaxis`): `(Q[:, None, :] - X[None, :, :])**2` rồi tính `.sum(axis=-1)` để ra thẳng ma trận khoảng cách bình phương `(M, N)`!',
      },
    ],
    exercise: {
      prompt:
        'Cho ma trận X_iris (180, 4). Lấy 10 mẫu đầu làm Q = X_iris[:10] và 170 mẫu sau làm R = X_iris[10:]. Tính ma trận khoảng cách Euclid D có shape (10, 170) và tìm chỉ số hàng xóm gần nhất trong R của từng mẫu Q (nearest_idx có shape (10,)).',
      requirements: [
        'D có shape (10, 170) chứa khoảng cách Euclid (>= 0).',
        'nearest_idx là np.argmin(D, axis=1) có shape (10,).',
      ],
      starterCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
X_iris = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].to_numpy(dtype=np.float64)
Q = X_iris[:10]
R = X_iris[10:]

# TODO: Tính ma trận khoảng cách Euclid D (10, 170) không dùng vòng for và tìm nearest_idx
D = ...
nearest_idx = ...
`,
      hintText: 'diff = Q[:, None, :] - R[None, :, :]; D = np.sqrt(np.sum(diff ** 2, axis=-1)); nearest_idx = np.argmin(D, axis=1)',
      solutionCode: `import numpy as np
import pandas as pd

df = pd.read_csv('iris_extended.csv')
X_iris = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].to_numpy(dtype=np.float64)
Q = X_iris[:10]
R = X_iris[10:]
diff = Q[:, None, :] - R[None, :, :]
D = np.sqrt(np.sum(diff ** 2, axis=-1))
nearest_idx = np.argmin(D, axis=1)
`,
      checkPython: `
assert D.shape == (10, 170)
assert nearest_idx.shape == (10,)
ref0 = np.sqrt(((Q[0] - R)**2).sum(axis=1))
assert np.allclose(D[0], ref0)
assert nearest_idx[0] == int(np.argmin(ref0))
`,
    },
  },
];
