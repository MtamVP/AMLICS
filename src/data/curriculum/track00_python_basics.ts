import { LessonDefinition } from '../../types/curriculum';

export const TRACK00_PYTHON_BASICS_LESSONS: LessonDefinition[] = [
  {
    id: 'P001',
    order: 1,
    trackId: 'track00_python_basics',
    title: 'Python Từ Con Số 0: Biến, Kiểu Dữ Liệu & Phép Toán',
    subtitle: 'Làm quen int, float, str, bool, type() và f-string cho người mới hoàn toàn',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 15,
    datasetIds: [],
    objectives: [
      'Hiểu biến (variable) là cái hộp đặt tên để cất giữ dữ liệu trong bộ nhớ RAM.',
      'Phân biệt 4 kiểu dữ liệu nền tảng trong mọi bài toán ML: int, float, str, bool.',
      'Biết dùng f-string để in báo cáo điểm mô hình rõ ràng, có làm tròn chữ số thập phân.',
    ],
    sections: [
      {
        title: '1. Biến (Variable) & 4 kiểu dữ liệu cốt lõi',
        contentMarkdown:
          'Khi viết Python, dấu `=` **không phải dấu bằng toán học**, mà là lệnh **gán giá trị bên phải cất vào tên biến bên trái**.\n\n| Kiểu dữ liệu | Tên Python | Ví dụ thực tế trong ML | Kết quả `type(x)` |\n| :--- | :--- | :--- | :--- |\n| Số nguyên | `int` | `n_estimators = 200`, `max_depth = 6` | `<class \'int\'>` |\n| Số thực | `float` | `learning_rate = 0.05`, `roc_auc = 0.892` | `<class \'float\'>` |\n| Chuỗi ký tự | `str` | `model_name = "XGBoost"`, `target = "Churn"` | `<class \'str\'>` |\n| Đúng / Sai | `bool` | `early_stopping = True`, `is_fraud = False` | `<class \'bool\'>` |',
        exampleCode: `model_name = "HistGradientBoosting"
n_estimators = 200
learning_rate = 0.05
early_stopping = True

print("Kiểu của n_estimators:", type(n_estimators))
print(f"Mô hình {model_name}: {n_estimators} cây, lr={learning_rate}, dừng sớm={early_stopping}")`,
        callout: {
          type: 'tip',
          title: 'Quy tắc đặt tên biến sạch sẽ',
          text: 'Dùng chữ thường và dấu gạch dưới (snake_case) như `train_score`, `max_depth`. Không bắt đầu bằng số và không dùng khoảng trắng.',
        },
      },
      {
        title: '2. Phép toán cơ bản & f-string in số thập phân chuẩn',
        contentMarkdown:
          'Trong Python, ngoài `+`, `-`, `*`, `/` (chia ra số thực), còn có:\n- `//`: chia lấy phần nguyên (`7 // 2 == 3`).\n- `%`: chia lấy phần dư (`7 % 2 == 1`).\n- `**`: lũy thừa (`2 ** 6 == 64` — công thức tính `num_leaves` của LightGBM từ `max_depth`!).\n\nĐể in đẹp một số thực kiểu `0.874512` thành `0.875`, viết **`f"{auc:.3f}"`** (giữ 3 chữ số sau dấu phẩy) hoặc **`f"{acc:.1%}"`** (tự nhân 100 và thêm `%`).',
        exampleCode: `max_depth = 6
max_leaves = 2 ** max_depth - 1
val_auc = 0.87456

print(f"Với độ sâu max_depth={max_depth} -> tối đa {max_leaves} lá")
print(f"Validation AUC = {val_auc:.4f} (tương đương {val_auc:.1%})")`,
      },
    ],
    exercise: {
      prompt:
        'Khởi tạo cấu hình mô hình đầu tiên bằng 4 biến: `model_name = "RandomForest"` (str), `n_estimators = 150` (int), `learning_rate = 0.08` (float), `use_early_stopping = True` (bool). Tính `max_leaves = (2 ** 5) - 1` và tạo chuỗi báo cáo `summary` bằng f-string chứa tên mô hình và `learning_rate`.',
      requirements: [
        'Đúng kiểu dữ liệu cho `model_name` (str), `n_estimators` (int), `learning_rate` (float), `use_early_stopping` (bool).',
        '`max_leaves` bằng `31` (tính từ `2 ** 5 - 1`).',
        '`summary` là chuỗi chứa cả `"RandomForest"` lẫn `"0.08"`.',
      ],
      starterCode: `# Khai báo 4 biến cấu hình cơ bản
model_name = "RandomForest"
n_estimators = ...
learning_rate = ...
use_early_stopping = ...

# Tính 2 lũy thừa 5 trừ 1
max_leaves = ...

# Tạo chuỗi f-string chứa model_name và learning_rate
summary = ...
`,
      hintText:
        'Điền `n_estimators = 150`, `learning_rate = 0.08`, `use_early_stopping = True`, `max_leaves = 2 ** 5 - 1`, và `summary = f"{model_name} | lr={learning_rate:.2f}"`.',
      solutionCode: `model_name = "RandomForest"
n_estimators = 150
learning_rate = 0.08
use_early_stopping = True
max_leaves = 2 ** 5 - 1
summary = f"{model_name} | trees={n_estimators} | lr={learning_rate:.2f}"
`,
      checkPython: `assert isinstance(model_name, str) and model_name == "RandomForest"
assert isinstance(n_estimators, int) and n_estimators == 150
assert isinstance(learning_rate, float) and abs(learning_rate - 0.08) < 1e-9
assert isinstance(use_early_stopping, bool) and use_early_stopping is True
assert max_leaves == 31
assert "RandomForest" in summary and "0.08" in summary`,
    },
  },
  {
    id: 'P002',
    order: 2,
    trackId: 'track00_python_basics',
    title: 'Điều Kiện if / elif / else & Toán Tử Logic Chẩn Đoán Mô Hình',
    subtitle: 'Viết luật phân loại ngưỡng xác suất và tự động phát hiện Overfitting bằng Python',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 14,
    datasetIds: [],
    objectives: [
      'Hiểu thụt lề (indentation 4 dấu cách) trong Python — sai thụt lề sẽ báo IndentationError.',
      'Sử dụng thành thạo `==`, `!=`, `>`, `<`, `>=`, `<=` cùng `and`, `or`, `not`.',
      'Áp dụng cấu trúc `if / elif / else` để phân loại mức rủi ro và chẩn đoán mô hình ML.',
    ],
    sections: [
      {
        title: '1. Cấu trúc if / elif / else & Quy tắc thụt lề 4 spaces',
        contentMarkdown:
          'Python dùng **thụt lề** để biết dòng nào nằm trong nhánh `if`. Khi chuyển xác suất dự đoán $p \\in [0, 1]$ thành nhãn `0` hoặc `1`, ta dùng ngưỡng quyết định (`threshold`). Còn khi đọc bảng kết quả AMLICS, ta kiểm tra chênh lệch `gap = train_score - cv_score`:\n\n| Tình huống | Điều kiện | Chẩn đoán |\n| :--- | :--- | :--- |\n| Quá khớp | `train_score - cv_score > 0.10` | `"Overfitting"` — giảm độ sâu cây hoặc tăng L2 |\n| Học chưa tới | `train_score < 0.65 and cv_score < 0.65` | `"Underfitting"` — tăng số cây hoặc thêm đặc trưng |\n| Tốt | Còn lại | `"Good Fit"` — mô hình khái quát hóa tốt |',
        exampleCode: `train_auc = 0.96
cv_auc = 0.79
gap = train_auc - cv_auc

if gap > 0.10:
    status = "Overfitting (Học vẹt)"
elif train_auc < 0.65 and cv_auc < 0.65:
    status = "Underfitting (Học thiếu)"
else:
    status = "Good Fit (Tổng quát tốt)"

print(f"Gap = {gap:.2f} -> Chẩn đoán: {status}")`,
        callout: {
          type: 'warning',
          title: 'Phân biệt = và ==',
          text: '`x = 5` là gán số 5 cho `x`. `x == 5` là đặt câu hỏi "`x` có bằng 5 không?" trả về `True` hoặc `False`.',
        },
      },
    ],
    exercise: {
      prompt:
        'Viết logic xếp hạng khách hàng vay theo `prob_default` (`0.72`) và `credit_score` (`610`): nếu `prob_default >= 0.7 or credit_score < 500` thì `risk = "HIGH"`; ngược lại nếu `prob_default >= 0.4` thì `risk = "MEDIUM"`; còn lại `risk = "LOW"`. Tính thêm `gap = 0.94 - 0.78` và gán `is_overfit = True` nếu `gap > 0.10`.',
      requirements: [
        'Với `prob_default = 0.72` và `credit_score = 610`, biến `risk` phải là `"HIGH"`.',
        '`is_overfit` phải là `bool` bằng `True` vì `gap = 0.16 > 0.10`.',
      ],
      starterCode: `prob_default = 0.72
credit_score = 610
train_score = 0.94
cv_score = 0.78

# TODO: Xếp loại risk ("HIGH" / "MEDIUM" / "LOW")
risk = ""

# TODO: Kiểm tra gap > 0.10
gap = train_score - cv_score
is_overfit = False
`,
      hintText:
        'Dùng `if prob_default >= 0.7 or credit_score < 500: risk = "HIGH"` rồi `elif prob_default >= 0.4:` và `else:`. Với `is_overfit`, viết `is_overfit = gap > 0.10`.',
      solutionCode: `prob_default = 0.72
credit_score = 610
train_score = 0.94
cv_score = 0.78

if prob_default >= 0.7 or credit_score < 500:
    risk = "HIGH"
elif prob_default >= 0.4:
    risk = "MEDIUM"
else:
    risk = "LOW"

gap = train_score - cv_score
is_overfit = bool(gap > 0.10)
`,
      checkPython: `assert risk == "HIGH", f"Kỳ vọng HIGH, nhận {risk}"
assert isinstance(is_overfit, bool) and is_overfit is True`,
    },
  },
  {
    id: 'P003',
    order: 3,
    trackId: 'track00_python_basics',
    title: 'List, Tuple & Kỹ Thuật Cắt Lát Slicing [start:stop:step]',
    subtitle: 'Làm chủ danh sách cột dữ liệu, chỉ số âm và copy list an toàn',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 15,
    datasetIds: [],
    objectives: [
      'Nắm vững chỉ số 0-based (`scores[0]`) và chỉ số âm (`scores[-1]` là phần tử cuối).',
      'Thành thạo slicing `arr[start:stop]` — quy tắc "lấy start, bỏ stop" giống hệt NumPy & Pandas.',
      'Phân biệt `list` (thay đổi được) vs `tuple` (cố định, hay dùng cho kích thước `shape=(300, 5)` hoặc `hidden_layer_sizes=(128, 64)`).',
    ],
    sections: [
      {
        title: '1. Index dương, Index âm & Slicing chuẩn Python',
        contentMarkdown:
          'Mọi chỉ số trong Python, NumPy, Pandas, PyTorch đều đếm từ **`0`**. Một mẹo cực quan trọng khi dùng slicing `a[start:stop]`:\n- `a[:3]` → lấy 3 phần tử đầu (`index 0, 1, 2`).\n- `a[-2:]` → lấy 2 phần tử cuối.\n- `a[::-1]` → đảo ngược danh sách.\n\n**Tuple `(a, b)`** dùng ngoặc tròn và **không thể sửa** sau khi tạo — Scikit-Learn dùng Tuple cho kích thước tầng ẩn `MLPClassifier(hidden_layer_sizes=(128, 64))` và NumPy dùng Tuple cho `X.shape`.',
        exampleCode: `cols = ["HouseId", "LotArea", "LivingArea", "Neighborhood", "SalePrice"]
id_col = cols[0]
target_col = cols[-1]
feature_cols = cols[1:-1]  # Bỏ đầu (ID) và cuối (Target)

print("ID:", id_col, "| Target:", target_col)
print("Features:", feature_cols)`,
        callout: {
          type: 'tip',
          title: 'Cạm bẫy gán List: b = a vs b = a.copy()',
          text: 'Nếu viết `b = a`, `b` và `a` trỏ tới **cùng 1 vùng nhớ**, sửa `b.append(...)` sẽ làm `a` bị đổi theo! Luôn dùng `a.copy()` hoặc `a[:]` để sao chép độc lập.',
        },
      },
    ],
    exercise: {
      prompt:
        'Cho danh sách cột `columns = ["PassengerId", "Pclass", "Age", "Fare", "Embarked", "Survived"]`. Hãy tách: `id_col` là phần tử đầu, `target_col` là phần tử cuối, `features` là các cột ở giữa (bỏ đầu và cuối), và `top3_features` là 3 cột đầu của `features`. Tạo `hidden_layers = (128, 64)` kiểu tuple.',
      requirements: [
        '`id_col == "PassengerId"`, `target_col == "Survived"`.',
        '`features == ["Pclass", "Age", "Fare", "Embarked"]`.',
        '`top3_features == ["Pclass", "Age", "Fare"]`.',
        '`hidden_layers` là `tuple` bằng `(128, 64)`.',
      ],
      starterCode: `columns = ["PassengerId", "Pclass", "Age", "Fare", "Embarked", "Survived"]

id_col = ...
target_col = ...
features = ...
top3_features = ...
hidden_layers = ...
`,
      hintText:
        '`id_col = columns[0]`, `target_col = columns[-1]`, `features = columns[1:-1]`, `top3_features = features[:3]`, `hidden_layers = (128, 64)`.',
      solutionCode: `columns = ["PassengerId", "Pclass", "Age", "Fare", "Embarked", "Survived"]
id_col = columns[0]
target_col = columns[-1]
features = columns[1:-1]
top3_features = features[:3]
hidden_layers = (128, 64)
`,
      checkPython: `assert id_col == "PassengerId" and target_col == "Survived"
assert features == ["Pclass", "Age", "Fare", "Embarked"]
assert top3_features == ["Pclass", "Age", "Fare"]
assert isinstance(hidden_layers, tuple) and hidden_layers == (128, 64)`,
    },
  },
  {
    id: 'P004',
    order: 4,
    trackId: 'track00_python_basics',
    title: 'Dictionary & Set: Quản Lý Siêu Tham Số & Lọc Nhãn Duy Nhất',
    subtitle: 'Cách Scikit-Learn lưu params bằng dict `{key: value}` và JSON',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 15,
    datasetIds: [],
    objectives: [
      'Tạo, đọc an toàn bằng `.get(key, default)`, cập nhật và duyệt `dict` (`.items()`).',
      'Hiểu vì sao `RandomForestClassifier(**params)` nhận trực tiếp một Dictionary tham số.',
      'Dùng `set()` để tìm giá trị duy nhất và kiểm tra tập nhãn của Train vs Test có khớp nhau không.',
    ],
    sections: [
      {
        title: '1. Dictionary — Xương sống của cấu hình mô hình ML',
        contentMarkdown:
          'Mọi cấu hình trong AMLICS, Scikit-Learn (`model.get_params()`), GridSearch hay JSON API đều là `dict`: ghép mỗi **khóa (`key`)** với một **giá trị (`value`)**.\n- `d["learning_rate"]`: lấy giá trị (báo `KeyError` nếu thiếu khóa).\n- `d.get("subsample", 1.0)`: lấy an toàn, nếu không có thì trả `1.0`.\n- `model_cls(**params)`: **giải nén dictionary** thành hàng loạt tham số đặt tên cho hàm khởi tạo model!',
        exampleCode: `hp = {"n_estimators": 200, "max_depth": 6, "learning_rate": 0.05}
hp["random_state"] = 42
print("Subsample mặc định:", hp.get("subsample", 1.0))

for k, v in hp.items():
    print(f"  - {k}: {v}")`,
      },
      {
        title: '2. Set — Tập hợp phần tử không trùng lặp & So khớp cột',
        contentMarkdown:
          '`set` tự động loại bỏ phần tử trùng và hỗ trợ phép toán tập hợp cực hữu ích trước khi train mô hình:\n- `missing_in_test = set(train_cols) - set(test_cols)`: tìm xem cột nào có trong Train mà bị thiếu ở Test.\n- `extra_cats = set(test_cities) - set(train_cities)`: phát hiện nhãn lạ trong dữ liệu thực tế!',
        exampleCode: `train_cities = ["HN", "HCM", "DN", "HN"]
test_cities = ["HCM", "CT"]
unseen = set(test_cities) - set(train_cities)
print("Thành phố duy nhất tập train:", set(train_cities))
print("Nhãn lạ chưa từng thấy ở train:", unseen)`,
      },
    ],
    exercise: {
      prompt:
        'Cho dict `params = {"n_estimators": 100, "max_depth": 5}`. Hãy: (1) cập nhật `max_depth` thành `8`, (2) thêm `"learning_rate": 0.05`, (3) dùng `.get("subsample", 1.0)` lưu vào `sub_val`. Đồng thời tìm tập nhãn lạ `unseen_labels = set(["A", "C", "E"]) - set(["A", "B", "C", "A"])`.',
      requirements: [
        '`params["max_depth"] == 8` và `params["learning_rate"] == 0.05`.',
        '`sub_val == 1.0`.',
        '`unseen_labels == {"E"}`.',
      ],
      starterCode: `params = {"n_estimators": 100, "max_depth": 5}

# TODO: Sửa max_depth=8, thêm learning_rate=0.05, đọc an toàn subsample
sub_val = ...

train_labels = ["A", "B", "C", "A"]
test_labels = ["A", "C", "E"]
# TODO: Tìm nhãn có ở test nhưng chưa từng xuất hiện ở train
unseen_labels = ...
`,
      hintText:
        '`params["max_depth"] = 8`, `params["learning_rate"] = 0.05`, `sub_val = params.get("subsample", 1.0)`, `unseen_labels = set(test_labels) - set(train_labels)`.',
      solutionCode: `params = {"n_estimators": 100, "max_depth": 5}
params["max_depth"] = 8
params["learning_rate"] = 0.05
sub_val = params.get("subsample", 1.0)

train_labels = ["A", "B", "C", "A"]
test_labels = ["A", "C", "E"]
unseen_labels = set(test_labels) - set(train_labels)
`,
      checkPython: `assert params["max_depth"] == 8 and abs(params["learning_rate"] - 0.05) < 1e-9
assert sub_val == 1.0
assert unseen_labels == {"E"}`,
    },
  },
  {
    id: 'P005',
    order: 5,
    trackId: 'track00_python_basics',
    title: 'Vòng Lặp for, enumerate(), zip() & List Comprehension',
    subtitle: 'Duyệt các Fold Cross-Validation và ghép tên đặc trưng với độ quan trọng gọn 1 dòng',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 16,
    datasetIds: [],
    objectives: [
      'Dùng `enumerate()` lấy đồng thời chỉ số fold (`0, 1, 2...`) và giá trị điểm CV.',
      'Dùng `zip(cols, importances)` để ghép đôi hai danh sách thành cặp `(tên_cột, điểm)`.',
      'Viết List & Dict Comprehension ngắn gọn, dễ đọc thay cho vòng lặp dài dòng.',
    ],
    sections: [
      {
        title: '1. enumerate() & zip() — Hai người bạn thân trong code Kaggle',
        contentMarkdown:
          'Thay vì viết `for i in range(len(arr)):` dễ nhầm lẫn, Python cung cấp:\n- **`enumerate(items, start=1)`**: vừa lấy số thứ tự fold vừa lấy phần tử.\n- **`zip(feature_names, importances)`**: ghép song song hai danh sách cùng độ dài.\n- **List Comprehension**: `[x * 2 for x in nums if x > 0]` — lọc và biến đổi danh sách chỉ trong 1 dòng.',
        exampleCode: `features = ["LivingArea", "Neighborhood", "DistCenterKm", "Id"]
scores = [0.52, 0.24, 0.19, 0.05]

for col, imp in zip(features, scores):
    print(f"{col:<15} -> {imp:.2f}")

# Lọc cột có độ quan trọng >= 0.10 bằng List Comprehension
strong_feats = [col for col, imp in zip(features, scores) if imp >= 0.10]
print("Đặc trưng mạnh:", strong_feats)`,
      },
    ],
    exercise: {
      prompt:
        'Cho `feats = ["Age", "Fare", "Pclass", "Sex"]` và `imps = [0.18, 0.35, 0.12, 0.35]`. Hãy tạo dict `imp_dict` ghép tên cột với độ quan trọng dùng `zip` + Dict Comprehension, và tạo list `important_feats` gồm các tên cột có `imp >= 0.15`. Tính điểm trung bình 5 fold `fold_scores = [0.81, 0.84, 0.80, 0.85, 0.82]` vào `mean_cv`.',
      requirements: [
        '`imp_dict` là dict có 4 khóa khớp `feats`.',
        '`important_feats == ["Age", "Fare", "Sex"]`.',
        '`abs(mean_cv - 0.824) < 1e-6`.',
      ],
      starterCode: `feats = ["Age", "Fare", "Pclass", "Sex"]
imps = [0.18, 0.35, 0.12, 0.35]
fold_scores = [0.81, 0.84, 0.80, 0.85, 0.82]

imp_dict = ...
important_feats = ...
mean_cv = ...
`,
      hintText:
        '`imp_dict = {f: w for f, w in zip(feats, imps)}`, `important_feats = [f for f, w in zip(feats, imps) if w >= 0.15]`, `mean_cv = sum(fold_scores) / len(fold_scores)`.',
      solutionCode: `feats = ["Age", "Fare", "Pclass", "Sex"]
imps = [0.18, 0.35, 0.12, 0.35]
fold_scores = [0.81, 0.84, 0.80, 0.85, 0.82]

imp_dict = {f: w for f, w in zip(feats, imps)}
important_feats = [f for f, w in zip(feats, imps) if w >= 0.15]
mean_cv = sum(fold_scores) / len(fold_scores)
`,
      checkPython: `assert imp_dict == {"Age": 0.18, "Fare": 0.35, "Pclass": 0.12, "Sex": 0.35}
assert important_feats == ["Age", "Fare", "Sex"]
assert abs(mean_cv - 0.824) < 1e-6`,
    },
  },
  {
    id: 'P006',
    order: 6,
    trackId: 'track00_python_basics',
    title: 'Hàm (def), Tham Số Mặc Định, **kwargs & Hàm Lambda',
    subtitle: 'Đóng gói logic tiền xử lý thành hàm tái sử dụng sạch sẽ cho nhiều dataset',
    difficulty: 'Cơ bản',
    libraries: ['Python'],
    estimatedMinutes: 16,
    datasetIds: [],
    objectives: [
      'Định nghĩa hàm `def func(x, default_val=1.0):` và hiểu sự khác biệt giữa `print()` vs `return`.',
      'Trả về nhiều giá trị cùng lúc từ hàm (unpacking `mean_s, std_s = eval_folds(...)`).',
      'Sử dụng `lambda` khi sắp xếp bảng danh sách theo key tùy chọn.',
    ],
    sections: [
      {
        title: '1. Tái sử dụng code bằng def & Đừng nhầm print với return',
        contentMarkdown:
          '- `print(kq)` chỉ in chữ ra màn hình rồi vứt bỏ.\n- `return kq` mới trả kết quả về để dòng code khác nhận lấy tính tiếp!\n\nHàm còn có thể đặt **giá trị mặc định** cho tham số (`def clip_outliers(values, low=0.0, high=100.0):`), rất giống cách Scikit-Learn đặt sẵn mặc định cho `max_depth`, `learning_rate`.',
        exampleCode: `def minmax_scale_list(vals):
    mn, mx = min(vals), max(vals)
    denom = mx - mn if mx > mn else 1.0
    return [(v - mn) / denom for v in vals]

scaled = minmax_scale_list([10, 20, 50])
print("Sau Min-Max scaling:", scaled)`,
      },
    ],
    exercise: {
      prompt:
        'Viết hàm `calc_metrics(tp, fp, fn)` trả về 2 giá trị `(precision, recall)` với công thức `precision = tp / max(tp + fp, 1)` và `recall = tp / max(tp + fn, 1)`. Sau đó dùng `sorted(..., key=lambda x: x[1], reverse=True)` sắp xếp `leaderboard = [("Linear", 0.78), ("XGB", 0.89), ("RF", 0.85)]` giảm dần theo điểm vào `sorted_lb`.',
      requirements: [
        '`calc_metrics(80, 20, 10)` trả về tuple `(0.8, 80/90)`.',
        '`sorted_lb[0][0] == "XGB"` (mô hình điểm cao nhất đứng đầu).',
      ],
      starterCode: `def calc_metrics(tp, fp, fn):
    # TODO: Tính precision và recall rồi return cả hai
    pass

prec, rec = calc_metrics(80, 20, 10)
leaderboard = [("Linear", 0.78), ("XGB", 0.89), ("RF", 0.85)]
sorted_lb = ...
`,
      hintText:
        'Trong `calc_metrics`: `precision = tp / max(tp + fp, 1)`, `recall = tp / max(tp + fn, 1)`, `return precision, recall`. Sắp xếp: `sorted_lb = sorted(leaderboard, key=lambda item: item[1], reverse=True)`.',
      solutionCode: `def calc_metrics(tp, fp, fn):
    precision = tp / max(tp + fp, 1)
    recall = tp / max(tp + fn, 1)
    return precision, recall

prec, rec = calc_metrics(80, 20, 10)
leaderboard = [("Linear", 0.78), ("XGB", 0.89), ("RF", 0.85)]
sorted_lb = sorted(leaderboard, key=lambda item: item[1], reverse=True)
`,
      checkPython: `assert abs(prec - 0.8) < 1e-6 and abs(rec - (80.0 / 90.0)) < 1e-6
assert sorted_lb == [("XGB", 0.89), ("RF", 0.85), ("Linear", 0.78)]`,
    },
  },
  {
    id: 'P007',
    order: 7,
    trackId: 'track00_python_basics',
    title: 'Đọc Dữ Liệu CSV, Hàng (Sample), Cột (Feature) & Giá Trị Thiếu (NaN)',
    subtitle: 'Cầu nối từ Python thuần sang bảng dữ liệu chuẩn Kaggle (`titanic.csv`)',
    difficulty: 'Cơ bản',
    libraries: ['Python', 'Pandas'],
    estimatedMinutes: 16,
    datasetIds: ['titanic'],
    objectives: [
      'Hiểu định dạng CSV (Comma-Separated Values): dòng 1 là tiêu đề cột, các dòng sau là mẫu quan sát.',
      'Nhận diện 3 loại dữ liệu bảng phổ biến: Số liên tục (Numeric), Hạng mục chữ (Categorical), và Giá trị thiếu (`NaN`).',
      'Mở và kiểm tra nhanh `titanic.csv` chỉ với 3 dòng Python.',
    ],
    sections: [
      {
        title: '1. Giải phẫu một bảng dữ liệu Machine Learning',
        contentMarkdown:
          'Trong dữ liệu bảng (Tabular Data):\n- **Mỗi hàng (Row / Sample)** là một đối tượng cần dự đoán (1 hành khách, 1 căn nhà, 1 giao dịch).\n- **Mỗi cột (Column / Feature)** là một thông tin mô tả (`Age`, `Fare`, `Pclass`, `Embarked`).\n- **Cột Mục tiêu (Target / `y`)** là đáp án ta muốn mô hình học để đoán (ví dụ `Survived`: `1` là sống sót, `0` là không qua khỏi).\n\nĐời thực luôn có ô bị bỏ trống → Python/Pandas ký hiệu là **`NaN` (Not a Number)**. Thuật toán cổ điển như LinearRegression hay SVM sẽ báo lỗi ngay nếu bạn đưa `NaN` thẳng vào mà chưa điền (Impute)!',
        exampleCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
print("Số dòng, số cột:", df.shape)
print("Tên các cột:", df.columns.tolist())
print("Số ô trống (NaN) ở mỗi cột:\n", df.isna().sum())`,
      },
    ],
    exercise: {
      prompt:
        'Đọc file `titanic.csv` bằng `pd.read_csv`. Lưu số dòng vào `n_rows`, số cột vào `n_cols`, danh sách tên các cột có ít nhất 1 giá trị bị thiếu (`NaN`) vào `cols_with_nan`, và kiểm tra kiểu dữ liệu của cột `"Sex"` vào `sex_dtype` (dạng chuỗi `str(df["Sex"].dtype)`).',
      requirements: [
        '`n_rows == 300`, `n_cols == 9`.',
        '`cols_with_nan` chứa đúng các cột có `isna().sum() > 0` (ví dụ `Age`, `Embarked`).',
      ],
      starterCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
n_rows, n_cols = df.shape

# TODO: Tìm danh sách tên cột có ít nhất 1 giá trị NaN
cols_with_nan = ...
sex_dtype = ...
`,
      hintText:
        '`nan_counts = df.isna().sum()`, rồi `cols_with_nan = [col for col, cnt in nan_counts.items() if cnt > 0]` và `sex_dtype = str(df["Sex"].dtype)`.',
      solutionCode: `import pandas as pd

df = pd.read_csv('titanic.csv')
n_rows, n_cols = df.shape
nan_counts = df.isna().sum()
cols_with_nan = [str(col) for col, cnt in nan_counts.items() if cnt > 0]
sex_dtype = str(df['Sex'].dtype)
`,
      checkPython: `assert n_rows == 300 and n_cols == 9
expected_nan = [str(c) for c, cnt in df.isna().sum().items() if cnt > 0]
assert set(cols_with_nan) == set(expected_nan) and len(cols_with_nan) >= 1
assert len(sex_dtype) > 0`,
    },
  },
  {
    id: 'P008',
    order: 8,
    trackId: 'track00_python_basics',
    title: 'Tư Duy Machine Learning Từ Số 0: Features (X), Target (y) & 2 Bài Toán Lớn',
    subtitle: 'Phân biệt Supervised vs Unsupervised, Classification vs Regression bằng ví dụ thực tế',
    difficulty: 'Cơ bản',
    libraries: ['Python', 'Scikit-Learn'],
    estimatedMinutes: 18,
    datasetIds: ['housing', 'titanic'],
    objectives: [
      'Phân biệt chính xác khi nào dùng Classification (Phân loại) và khi nào dùng Regression (Hồi quy).',
      'Tách đúng ma trận đầu vào `X` (2D) và vector mục tiêu `y` (1D) mà không làm lọt Target vào `X`.',
      'Chạy thành công lệnh `.fit(X, y)` và `.predict(X)` đầu tiên trong đời.',
    ],
    sections: [
      {
        title: '1. Phân biệt 2 nhánh chính của Học Có Giám Sát (Supervised Learning)',
        contentMarkdown:
          '| Loại bài toán | Cột `y` là gì? | Ví dụ Dataset trong AMLICS | Thước đo phổ biến |\n| :--- | :--- | :--- | :--- |\n| **Classification (Phân loại)** | Nhãn rời rạc (`0/1`, `"Yes/No"`, `0/1/2`) | `titanic.csv` (`Survived`), `bank_churn.csv` (`Churn`) | Accuracy, F1, **ROC-AUC** |\n| **Regression (Hồi quy)** | Con số liên tục đo được | `housing.csv` (`SalePrice`), `daily_sales.csv` (`Sales`) | **RMSE**, MAE, $R^2$ |',
        exampleCode: `import pandas as pd
from sklearn.tree import DecisionTreeRegressor

df = pd.read_csv('housing.csv')
X = df[['LivingArea', 'Bedrooms']].fillna(0)
y = df['SalePrice']

model = DecisionTreeRegressor(max_depth=3, random_state=42)
model.fit(X, y)
print("Dự đoán giá 3 căn nhà đầu:", model.predict(X.head(3)).round(0))`,
        callout: {
          type: 'warning',
          title: 'Quy tắc vàng tách X và y',
          text: '`X` luôn phải **2 chiều** (`(số_dòng, số_cột)` — dùng `df[["col"]]` hoặc `df.drop(columns=[target])`) còn `y` là **1 chiều** (`(số_dòng,)` — dùng `df[target]`). Đặc biệt không bao giờ để cột ID (như `HouseId`, `PassengerId`) hay cột Target lọt vào `X`!',
        },
      },
    ],
    exercise: {
      prompt:
        'Từ `housing.csv`, loại bỏ cột ID (`"HouseId"`) và cột mục tiêu (`"SalePrice"`), giữ lại các cột số `["LotArea", "LivingArea", "Bedrooms", "YearBuilt", "DistCenterKm", "HasGarage"]` (điền thiếu bằng median) để tạo ma trận `X_house` (2D) và `y_house` (1D). Huấn luyện mô hình `DecisionTreeRegressor(max_depth=4, random_state=42)` và tạo dự đoán `preds` trên `X_house`.',
      requirements: [
        '`X_house.ndim == 2` và có đúng 6 cột đặc trưng (không chứa `HouseId` hay `SalePrice`).',
        '`y_house.ndim == 1` và độ dài khớp `X_house`.',
        '`len(preds) == len(y_house)` và giá trị dự đoán trung bình hợp lý.',
      ],
      starterCode: `from sklearn.tree import DecisionTreeRegressor

df = pd.read_csv('housing.csv')
num_feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']

# TODO: Tách X_house (2D, điền thiếu bằng median), y_house (1D)
X_house = ...
y_house = ...

# TODO: Khớp DecisionTreeRegressor(max_depth=4, random_state=42) và dự đoán preds
model = ...
preds = ...
`,
      hintText:
        '`X_house = df[num_feats].fillna(df[num_feats].median())`, `y_house = df["SalePrice"]`, `model = DecisionTreeRegressor(max_depth=4, random_state=42).fit(X_house, y_house)`, `preds = model.predict(X_house)`.',
      solutionCode: `from sklearn.tree import DecisionTreeRegressor

df = pd.read_csv('housing.csv')
num_feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X_house = df[num_feats].fillna(df[num_feats].median())
y_house = df['SalePrice']

model = DecisionTreeRegressor(max_depth=4, random_state=42).fit(X_house, y_house)
preds = model.predict(X_house)
`,
      checkPython: `assert X_house.ndim == 2 and list(X_house.columns) == num_feats
assert 'SalePrice' not in X_house.columns and 'HouseId' not in X_house.columns
assert y_house.ndim == 1 and len(preds) == len(y_house)
assert np.mean(preds) > 50000`,
    },
  },
  {
    id: 'P009',
    order: 9,
    trackId: 'track00_python_basics',
    title: 'Train vs Test, Học Vẹt (Overfitting) & Học Chưa Tới (Underfitting)',
    subtitle: 'Vì sao không bao giờ được đánh giá mô hình trên chính dữ liệu vừa học',
    difficulty: 'Cơ bản',
    libraries: ['Python', 'Scikit-Learn'],
    estimatedMinutes: 18,
    datasetIds: ['titanic'],
    objectives: [
      'Hiểu bản chất Overfitting (nhớ đáp án thay vì hiểu quy luật) bằng thực nghiệm trực tiếp trên cây sâu `max_depth=20` vs `max_depth=3`.',
      'Dùng `train_test_split` tách 80% học (Train) và 20% thi thử (Test/Validation).',
      'Nhận diện Bias cao (Underfitting) vs Variance cao (Overfitting) thông qua khoảng cách điểm Train – Test.',
    ],
    sections: [
      {
        title: '1. Nếu chấm điểm ngay trên dữ liệu Train, mô hình "học vẹt" luôn đạt 100%!',
        contentMarkdown:
          'Hãy tưởng tượng một học sinh được phát trước **đúng 100 câu đề thi** rồi hôm sau thi lại y chang 100 câu đó → đạt **10/10 điểm** nhưng gặp đề mới là **trượt thẳng**!\n\n- **Underfitting (Quá đơn giản / Bias cao):** Ví dụ cây quyết định `max_depth=1` — chỉ hỏi đúng 1 câu, điểm Train thấp (`0.68`) và điểm Test cũng thấp (`0.67`).\n- **Good Fit (Vừa vặn):** `max_depth=3..5` — học được quy luật chung, điểm Train (`0.82`) và Test (`0.80`) gần nhau.\n- **Overfitting (Học vẹt / Variance cao):** `max_depth=None` (cây mọc hết cỡ) — điểm Train lên tới `0.98–1.00`, nhưng điểm Test **rơi tự do** xuống `0.68`!',
        exampleCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Age', 'SibSp', 'Fare']].fillna(df[['Pclass', 'Age', 'SibSp', 'Fare']].median())
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

for depth in [1, 3, 20]:
    clf = DecisionTreeClassifier(max_depth=depth, random_state=42).fit(X_tr, y_tr)
    print(f"depth={depth:<2} | Train Acc={clf.score(X_tr, y_tr):.3f} | Test Acc={clf.score(X_te, y_te):.3f}")`,
      },
    ],
    exercise: {
      prompt:
        'Trên `titanic.csv` (4 cột số `["Pclass", "Age", "SibSp", "Fare"]`, fillna bằng median trên tập tổng hoặc tốt hơn là dùng `SimpleImputer` sau khi split 75/25 `random_state=42`, `stratify=y`), huấn luyện 2 cây: `tree_shallow = DecisionTreeClassifier(max_depth=3, random_state=42)` và `tree_overfit = DecisionTreeClassifier(max_depth=25, random_state=42)`. Ghi lại `gap_shallow` và `gap_overfit` (`train_acc - test_acc`) để thấy cây quá sâu bị overfitting nặng hơn hẳn.',
      requirements: [
        'Tách dữ liệu 75% Train / 25% Test với `random_state=42, stratify=y`.',
        '`gap_overfit > gap_shallow + 0.05` (chứng minh cây sâu học vẹt).',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.impute import SimpleImputer

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Age', 'SibSp', 'Fare']]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

imp = SimpleImputer(strategy='median')
X_tr_i = imp.fit_transform(X_tr)
X_te_i = imp.transform(X_te)

# TODO: Train tree_shallow (max_depth=3) và tree_overfit (max_depth=25)
gap_shallow = 0.0
gap_overfit = 0.0
`,
      hintText:
        'Với mỗi mô hình `clf.fit(X_tr_i, y_tr)`, tính `clf.score(X_tr_i, y_tr) - clf.score(X_te_i, y_te)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.impute import SimpleImputer

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Age', 'SibSp', 'Fare']]
y = df['Survived']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

imp = SimpleImputer(strategy='median')
X_tr_i = imp.fit_transform(X_tr)
X_te_i = imp.transform(X_te)

tree_shallow = DecisionTreeClassifier(max_depth=3, random_state=42).fit(X_tr_i, y_tr)
tree_overfit = DecisionTreeClassifier(max_depth=25, random_state=42).fit(X_tr_i, y_tr)

gap_shallow = float(tree_shallow.score(X_tr_i, y_tr) - tree_shallow.score(X_te_i, y_te))
gap_overfit = float(tree_overfit.score(X_tr_i, y_tr) - tree_overfit.score(X_te_i, y_te))
`,
      checkPython: `assert gap_overfit > gap_shallow + 0.05, f"gap_overfit={gap_overfit:.3f} phải lớn hơn rõ so với gap_shallow={gap_shallow:.3f}"`,
    },
  },
  {
    id: 'P010',
    order: 10,
    trackId: 'track00_python_basics',
    title: 'Bản Đồ 6 Bước Của Mọi Dự Án ML & Cách Làm Chủ Giao Diện AMLICS Studio',
    subtitle: 'Hiểu mối liên hệ giữa 6 bước ML chuẩn quốc tế với từng khu vực trong AMLICS Studio',
    difficulty: 'Cơ bản',
    libraries: ['Python', 'Scikit-Learn', 'Pandas'],
    estimatedMinutes: 18,
    datasetIds: ['titanic'],
    objectives: [
      'Thuộc lòng 6 bước chuẩn: (1) Đọc & Khám phá → (2) Tách Train/Test → (3) Tiền xử lý trong Pipeline → (4) Cross-Validation → (5) Huấn luyện & Tối ưu tham số → (6) Đánh giá & Xuất dự đoán.',
      'Hiểu vì sao AMLICS Studio chia thanh bên trái thành đúng 4 khối tương ứng và sinh 5 cell Python chuẩn mực.',
      'Tự tay lắp ráp một `Pipeline` end-to-end đầu tiên chạy ngon trên `titanic.csv`.',
    ],
    sections: [
      {
        title: '1. Từ Lý thuyết 6 Bước → Giao diện AMLICS Studio',
        contentMarkdown:
          '| Bước quy trình ML | Làm bằng Code Python | Vị trí tương ứng trên AMLICS Studio |\n| :--- | :--- | :--- |\n| 1. Nạp dữ liệu & chọn cột | `pd.read_csv()`, bỏ cột ID, chọn Target `y` | **Bước 1: Data Source & Schema** (cột trái) |\n| 2. Tiền xử lý số + chữ | `SimpleImputer`, `StandardScaler`, `OneHotEncoder`, `ColumnTransformer` | **Bước 2: Preprocessing & Feature Eng.** |\n| 3. Chia tập & Cross-Val | `train_test_split`, `StratifiedKFold`, `cross_val_score` | **Bước 3: Validation & Anti-Leakage Split** |\n| 4. Chọn Model & Tinh chỉnh | `RandomForest`, `HistGradientBoosting`, `XGBoost` + tham số | **Bước 4: Estimator & Hyperparameter Tuning** |\n| 5. Chấm điểm & So sánh | Holdout ROC-AUC / RMSE, Biểu đồ ROC, Confusion Matrix | **Bảng Leaderboard & Plots** (cột phải) |',
        callout: {
          type: 'note',
          title: 'Lời khuyên vàng cho người mới',
          text: 'Mỗi khi chọn bất kỳ tùy chọn nào ở thanh trái Studio, **hãy đọc code Python tự động sinh ra ở các cell giữa**. Sau Track 00–13 này, bạn sẽ hiểu 100% từng dòng code đó và có thể tự sửa tay mọi thứ!',
        },
      },
    ],
    exercise: {
      prompt:
        'Lắp ráp một `Pipeline` Scikit-Learn đầu tiên chạy 3-Fold Cross-Validation trên `titanic.csv` với các cột `["Pclass", "Age", "Fare"]`, dùng `SimpleImputer(strategy="median")` + `StandardScaler()` + `LogisticRegression(max_iter=500, random_state=42)`. Tính điểm ROC-AUC trung bình `cv_auc`.',
      requirements: [
        'Sử dụng `make_pipeline` hoặc `Pipeline` kết hợp `SimpleImputer`, `StandardScaler`, `LogisticRegression`.',
        'Tính `cv_auc = float(cross_val_score(..., cv=3, scoring="roc_auc").mean())` với `cv_auc > 0.65`.',
      ],
      starterCode: `from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Age', 'Fare']]
y = df['Survived']

# TODO: Tạo pipe 3 bước rồi chạy cross_val_score cv=3, scoring='roc_auc'
pipe = None
cv_auc = 0.0
`,
      hintText:
        '`pipe = Pipeline([("imp", SimpleImputer(strategy="median")), ("scaler", StandardScaler()), ("clf", LogisticRegression(max_iter=500, random_state=42))])` và `cv_auc = float(cross_val_score(pipe, X, y, cv=3, scoring="roc_auc").mean())`.',
      solutionCode: `from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score

df = pd.read_csv('titanic.csv')
X = df[['Pclass', 'Age', 'Fare']]
y = df['Survived']

pipe = Pipeline([
    ('imp', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression(max_iter=500, random_state=42)),
])
cv_auc = float(cross_val_score(pipe, X, y, cv=3, scoring='roc_auc').mean())
`,
      checkPython: `assert isinstance(pipe, Pipeline) and len(pipe.steps) == 3
assert 0.65 < cv_auc <= 1.0, f"cv_auc={cv_auc:.3f} chưa hợp lý"`,
    },
  },
];
