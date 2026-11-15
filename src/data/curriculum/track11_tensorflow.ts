import { LessonDefinition } from '../../types/curriculum';

export const TRACK11_TENSORFLOW_LESSONS: LessonDefinition[] = [
  {
    id: 'L094',
    order: 94,
    trackId: 'track11_tensorflow',
    title: 'TensorFlow Tensors & `tf.GradientTape`: Cơ chế Tính Đạo hàm Khác gì PyTorch?',
    subtitle: 'Hiểu Eager Execution, `tf.Variable` và cách băng ghi hình `GradientTape` theo dõi phép toán',
    difficulty: 'Trung bình',
    libraries: ['TensorFlow', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Phân biệt hằng số `tf.constant` và tham số học được `tf.Variable`.',
      'Sử dụng `with tf.GradientTape() as tape:` để lấy đạo hàm bậc 1 của hàm mất mát.',
    ],
    sections: [
      {
        title: '1. So sánh tư duy `GradientTape` (TF2) vs `.backward()` (PyTorch)',
        contentMarkdown:
          'Trong TensorFlow 2, mọi phép toán liên quan tới `tf.Variable` diễn ra bên trong khối **`with tf.GradientTape() as tape:`** sẽ được ghi lại như một cuộn băng video. Cuối khối, bạn chỉ cần gọi `tape.gradient(loss, [w, b])` là nhận ngay danh sách gradient!',
        exampleCode: `# Chuẩn TensorFlow 2 (Colab / Kaggle):
import tensorflow as tf
w = tf.Variable(2.0)
x = tf.constant(3.0)
y = tf.constant(10.0)
with tf.GradientTape() as tape:
    loss = tf.square(w * x - y)   # (6 - 10)^2 = 16
dw = tape.gradient(loss, w)        # 2 * (-4) * 3 = -24.0`,
      },
    ],
    exercise: {
      prompt: 'Tính đạo hàm `dw, db` của hàm mục tiêu `L(w, b) = (w * x + b - y)^2` tại `w = 1.5, b = 0.5, x = 4.0, y = 10.0` bằng `tf.GradientTape` (hoặc giải tích NumPy tương đương khi chạy ở trình duyệt nhẹ).',
      requirements: [
        '`loss_val == (1.5*4 + 0.5 - 10)^2 == 12.25`.',
        '`dw == 2 * (-3.5) * 4 == -28.0` và `db == 2 * (-3.5) == -7.0`.',
      ],
      starterCode: `w_val, b_val, x_val, y_val = 1.5, 0.5, 4.0, 10.0
loss_val = 0.0
dw = 0.0
db = 0.0

try:
    import tensorflow as tf
    # Dùng tf.Variable và tf.GradientTape()
except ImportError:
    # Giải tích NumPy tương đương
    pass
`,
      hintText: 'Trong `tf`: `w, b = tf.Variable(w_val), tf.Variable(b_val)`, `with tf.GradientTape() as tape: loss = tf.square(w * x_val + b - y_val)`, `dw_t, db_t = tape.gradient(loss, [w, b])`. Trong NumPy: `err = w_val * x_val + b_val - y_val; loss_val = float(err**2); dw = float(2*err*x_val); db = float(2*err)`.',
      solutionCode: `w_val, b_val, x_val, y_val = 1.5, 0.5, 4.0, 10.0
try:
    import tensorflow as tf
    w = tf.Variable(w_val, dtype=tf.float32)
    b = tf.Variable(b_val, dtype=tf.float32)
    x = tf.constant(x_val, dtype=tf.float32)
    y = tf.constant(y_val, dtype=tf.float32)
    with tf.GradientTape() as tape:
        loss = tf.square(w * x + b - y)
    dw_t, db_t = tape.gradient(loss, [w, b])
    loss_val = float(loss.numpy())
    dw = float(dw_t.numpy())
    db = float(db_t.numpy())
except ImportError:
    err = w_val * x_val + b_val - y_val
    loss_val = float(err ** 2)
    dw = float(2.0 * err * x_val)
    db = float(2.0 * err)
`,
      checkPython: `assert abs(float(loss_val) - 12.25) < 1e-4, f"loss_val={loss_val} sai."
assert abs(float(dw) - (-28.0)) < 1e-4, f"dw={dw} sai."
assert abs(float(db) - (-7.0)) < 1e-4, f"db={db} sai."`,
    },
  },
  {
    id: 'L095',
    order: 95,
    trackId: 'track11_tensorflow',
    title: 'Keras Sequential API: `Dense`, `compile()`, `fit()` & `evaluate()`',
    subtitle: 'Xây dựng và huấn luyện mạng Neural chuẩn Keras chỉ trong 8 dòng code',
    difficulty: 'Trung bình',
    libraries: ['TensorFlow', 'Scikit-Learn'],
    estimatedMinutes: 30,
    datasetIds: ['housing'],
    objectives: [
      'Thiết kế `keras.Sequential([layers.Dense(32, activation="relu"), layers.Dense(16, activation="relu"), layers.Dense(1)])`.',
      'Nắm 3 thành phần của `.compile(optimizer="adam", loss="mse", metrics=["mae"])` và `validation_split`.',
    ],
    sections: [
      {
        title: '1. Nhớ chuẩn hóa cả Input lẫn hiểu rõ thang đo Output trong Keras Hồi quy!',
        contentMarkdown:
          'Khác với Scikit-Learn LinearRegression có nghiệm đóng tức thì, mạng Keras khởi tạo trọng số nhỏ quanh `0`. Nếu `SalePrice` cỡ `300,000` mà bạn không scale `y` (hoặc tăng Learning Rate hợp lý), Loss MSE ban đầu là `90,000,000,000` khiến gradient rất chậm hội tụ!',
      },
    ],
    exercise: {
      prompt: 'Xây dựng và train mô hình hồi quy Neural Network (Sequential 32 -> 16 -> 1) dự đoán `SalePrice` chuẩn hóa trên `housing.csv` (numeric cols đã `StandardScaler` cho cả `X` và `y`, split 80/20 `random_state=42`). Dùng Keras nếu có `tensorflow`, fallback `MLPRegressor` nếu chạy Pyodide. Đạt `r2_nn >= 0.55` trên test.',
      requirements: [
        'Chuẩn hóa `X` và `y` chỉ fit trên tập train.',
        'Đạt `r2_nn >= 0.55` trên test.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
from sklearn.neural_network import MLPRegressor

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median()).values
y = df['SalePrice'].values.reshape(-1, 1)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

sx = StandardScaler().fit(X_tr)
sy = StandardScaler().fit(y_tr)
X_tr_s, X_te_s = sx.transform(X_tr), sx.transform(X_te)
y_tr_s = sy.transform(y_tr).ravel()

r2_nn = 0.0
`,
      hintText: 'Dùng `try: import tensorflow as tf` với `tf.keras.Sequential([tf.keras.layers.Dense(32, activation="relu"), tf.keras.layers.Dense(16, activation="relu"), tf.keras.layers.Dense(1)])`, `compile(optimizer="adam", loss="mse")`, `fit(..., epochs=50, verbose=0)`. Fallback: `MLPRegressor(hidden_layer_sizes=(32, 16), max_iter=500, random_state=42).fit(X_tr_s, y_tr_s)`. Đừng quên `sy.inverse_transform(...)` khi tính R² (hoặc tính trên `y_te_s`).',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score
from sklearn.neural_network import MLPRegressor

df = pd.read_csv('housing.csv')
feats = ['LotArea', 'LivingArea', 'Bedrooms', 'YearBuilt', 'DistCenterKm', 'HasGarage']
X = df[feats].fillna(df[feats].median()).values
y = df['SalePrice'].values.reshape(-1, 1)
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=42)

sx = StandardScaler().fit(X_tr)
sy = StandardScaler().fit(y_tr)
X_tr_s, X_te_s = sx.transform(X_tr), sx.transform(X_te)
y_tr_s = sy.transform(y_tr).ravel()

try:
    import tensorflow as tf
    tf.random.set_seed(42)
    model = tf.keras.Sequential([
        tf.keras.layers.Input(shape=(X_tr_s.shape[1],)),
        tf.keras.layers.Dense(32, activation='relu'),
        tf.keras.layers.Dense(16, activation='relu'),
        tf.keras.layers.Dense(1),
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X_tr_s, y_tr_s, epochs=60, batch_size=32, verbose=0)
    pred_s = model.predict(X_te_s, verbose=0).reshape(-1, 1)
except ImportError:
    reg = MLPRegressor(hidden_layer_sizes=(32, 16), max_iter=500, random_state=42)
    reg.fit(X_tr_s, y_tr_s)
    pred_s = reg.predict(X_te_s).reshape(-1, 1)

pred_real = sy.inverse_transform(pred_s).ravel()
r2_nn = float(r2_score(y_te.ravel(), pred_real))
`,
      checkPython: `assert float(r2_nn) >= 0.55, f"r2_nn={r2_nn:.3f} chưa đạt >= 0.55."`,
    },
  },
  {
    id: 'L096',
    order: 96,
    trackId: 'track11_tensorflow',
    title: 'Keras Functional API: Multi-Input Wide & Deep Architecture',
    subtitle: 'Thiết kế mạng nhiều nhánh (Residual Skip Connection / Wide & Deep cho Tabular)',
    difficulty: 'Nâng cao',
    libraries: ['TensorFlow', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Hiểu hạn chế của `Sequential` (chỉ đi thẳng 1 đường) và sức mạnh của **Functional API** (`Concatenate`, Skip Connection `Add`).',
      'Xây dựng kiến trúc **Wide & Deep** nối thẳng Input gốc (`Wide`) với nhánh phi tuyến (`Deep`).',
    ],
    sections: [
      {
        title: '1. Kiến trúc Wide & Deep của Google cho Dữ liệu Bảng',
        contentMarkdown:
          '```python\ninp = keras.Input(shape=(n_feats,))\n# Nhánh Deep học tương tác phi tuyến\nd = layers.Dense(32, activation="relu")(inp)\nd = layers.Dense(16, activation="relu")(d)\n# Nối nhánh Wide (inp gốc) + Deep\nmerged = layers.Concatenate()([inp, d])\nout = layers.Dense(1, activation="sigmoid")(merged)\n```',
      },
    ],
    exercise: {
      prompt: 'Tính số chiều tensor tại các điểm của mạng **Wide & Deep** nhận `in_dim = 8`: nhánh Deep đi qua `Dense(24) -> Dense(12)`, sau đó `Concatenate([inp, deep])` trước tầng `Dense(1)`. Lưu `concat_dim` và tổng số tham số `total_params` (theo công thức chuẩn `(in*out + out)` cho 3 tầng Dense).',
      requirements: [
        '`concat_dim == 8 + 12 == 20`.',
        '`total_params == (8*24+24) + (24*12+12) + (20*1+1) == 537`.',
      ],
      starterCode: `in_dim, h1, h2, out_dim = 8, 24, 12, 1
concat_dim = 0
total_params = 0

try:
    import tensorflow as tf
    # Dựng keras.Model Functional API và đếm model.count_params()
except ImportError:
    # Tính theo đúng kiến trúc Wide & Deep
    pass
`,
      hintText: 'Tầng 1 (`8->24`): `8*24+24 = 216`. Tầng 2 (`24->12`): `24*12+12 = 300`. Sau `Concatenate([inp(8), h2(12)])` ra `concat_dim = 20`. Tầng cuối (`20->1`): `20*1+1 = 21`. Tổng = `537`.',
      solutionCode: `in_dim, h1, h2, out_dim = 8, 24, 12, 1
try:
    import tensorflow as tf
    inp = tf.keras.Input(shape=(in_dim,))
    d = tf.keras.layers.Dense(h1, activation='relu')(inp)
    d = tf.keras.layers.Dense(h2, activation='relu')(d)
    merged = tf.keras.layers.Concatenate()([inp, d])
    out = tf.keras.layers.Dense(out_dim, activation='sigmoid')(merged)
    model = tf.keras.Model(inputs=inp, outputs=out)
    concat_dim = int(merged.shape[-1])
    total_params = int(model.count_params())
except ImportError:
    concat_dim = in_dim + h2
    p1 = in_dim * h1 + h1
    p2 = h1 * h2 + h2
    p3 = concat_dim * out_dim + out_dim
    total_params = p1 + p2 + p3
`,
      checkPython: `assert int(concat_dim) == 20, f"concat_dim phải là 20, nhận {concat_dim}."
assert int(total_params) == 537, f"total_params phải là 537, nhận {total_params}."`,
    },
  },
  {
    id: 'L097',
    order: 97,
    trackId: 'track11_tensorflow',
    title: 'Loss Functions, Class Weight & Custom AUC Metric trong Keras',
    subtitle: 'Xử lý mất cân bằng lớp trên Neural Net với `class_weight` & `BinaryCrossentropy`',
    difficulty: 'Trung bình',
    libraries: ['TensorFlow', 'Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['fraud'],
    objectives: [
      'Tính `class_weight = compute_class_weight("balanced", ...)` và truyền vào mô hình.',
      'Hiểu `BinaryCrossentropy(from_logits=True)` tương đương `BCEWithLogitsLoss` của PyTorch.',
    ],
    sections: [
      {
        title: '1. Neural Net bị "chết lười" khi lớp 1 chỉ chiếm 4.5%!',
        contentMarkdown:
          'Nếu không truyền `class_weight` hoặc `pos_weight`, mạng Neural đoán bừa tất cả bằng `0` đã giảm Loss xuống cực thấp rất nhanh! Truyền trọng số cân bằng `{0: 0.52, 1: 11.1}` ép mô hình chú ý gấp ~20 lần vào mỗi ca gian lận.',
      },
    ],
    exercise: {
      prompt: 'Tính từ điển trọng số lớp cân bằng `cw_dict` cho cột `IsFraud` của `credit_fraud.csv` bằng `sklearn.utils.class_weight.compute_class_weight("balanced", classes=np.array([0, 1]), y=y)` và kiểm tra tỷ lệ `cw_dict[1] / cw_dict[0]` xấp xỉ tỷ lệ mất cân bằng `count(0) / count(1)`.',
      requirements: [
        '`cw_dict` có đủ key `0` và `1`.',
        '`cw_dict[1] > 10.0 * cw_dict[0]`.',
      ],
      starterCode: `from sklearn.utils.class_weight import compute_class_weight
df = pd.read_csv('credit_fraud.csv')
y = df['IsFraud'].values

cw_dict = {}
ratio_pos_neg = 0.0
`,
      hintText: '`weights = compute_class_weight("balanced", classes=np.array([0, 1]), y=y)`, `cw_dict = {0: float(weights[0]), 1: float(weights[1])}`, `ratio_pos_neg = cw_dict[1] / cw_dict[0]`.',
      solutionCode: `from sklearn.utils.class_weight import compute_class_weight
df = pd.read_csv('credit_fraud.csv')
y = df['IsFraud'].values

weights = compute_class_weight('balanced', classes=np.array([0, 1]), y=y)
cw_dict = {0: float(weights[0]), 1: float(weights[1])}
ratio_pos_neg = cw_dict[1] / cw_dict[0]
`,
      checkPython: `assert set(cw_dict.keys()) == {0, 1}, "cw_dict phải có key 0 và 1."
n0, n1 = (y == 0).sum(), (y == 1).sum()
assert abs(ratio_pos_neg - (n0 / n1)) < 1e-4, "Tỷ lệ trọng số chưa khớp n0 / n1."`,
    },
  },
  {
    id: 'L098',
    order: 98,
    trackId: 'track11_tensorflow',
    title: 'Keras Callbacks: `EarlyStopping(restore_best_weights=True)` & `ReduceLROnPlateau`',
    subtitle: 'Tự động giảm tốc độ học khi val_loss chững lại và phục hồi trọng số đỉnh cao',
    difficulty: 'Trung bình',
    libraries: ['TensorFlow', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Cấu hình chuẩn bộ đôi Callback trong mọi dự án Keras/TF.',
      'Mô phỏng cơ chế `ReduceLROnPlateau(factor=0.5, patience=2, min_lr=1e-5)` qua các epoch.',
    ],
    sections: [
      {
        title: '1. Bộ ba Callback không thể thiếu khi gọi `model.fit()`',
        contentMarkdown:
          '```python\ncallbacks = [\n    keras.callbacks.EarlyStopping(monitor="val_loss", patience=10, restore_best_weights=True),\n    keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=4, min_lr=1e-5),\n    keras.callbacks.ModelCheckpoint("best.keras", save_best_only=True),\n]\n```',
      },
    ],
    exercise: {
      prompt: 'Mô phỏng logic `ReduceLROnPlateau(factor=0.5, patience=2, min_lr=1e-4)` bắt đầu từ `lr = 0.01` đi qua dãy `val_losses = [0.60, 0.52, 0.53, 0.54, 0.48, 0.49, 0.50]`. Lưu lịch sử Learning Rate sau mỗi epoch vào list `lr_history` (7 phần tử).',
      requirements: [
        'Tại epoch 0..1: loss giảm nên giữ `lr = 0.01`.',
        'Sau epoch 2 và 3 không cải thiện (`patience=2` kích hoạt sau epoch 3): giảm một nửa còn `0.005`, reset counter.',
        'Sau epoch 5 và 6 không cải thiện so với `0.48`: giảm tiếp một nửa còn `0.0025`.',
      ],
      starterCode: `val_losses = [0.60, 0.52, 0.53, 0.54, 0.48, 0.49, 0.50]
lr = 0.01
factor = 0.5
patience = 2
min_lr = 1e-4

best = float('inf')
wait = 0
lr_history = []
# Tính lr_history qua 7 epoch
`,
      hintText: 'Với mỗi `vl` trong `val_losses`: nếu `vl < best`: `best = vl; wait = 0`; else `wait += 1`; nếu `wait >= patience`: `lr = max(min_lr, lr * factor); wait = 0`. Ghi `lr_history.append(lr)` ở cuối mỗi epoch.',
      solutionCode: `val_losses = [0.60, 0.52, 0.53, 0.54, 0.48, 0.49, 0.50]
lr = 0.01
factor = 0.5
patience = 2
min_lr = 1e-4

best = float('inf')
wait = 0
lr_history = []
for vl in val_losses:
    if vl < best:
        best = vl
        wait = 0
    else:
        wait += 1
        if wait >= patience:
            lr = max(min_lr, lr * factor)
            wait = 0
    lr_history.append(float(lr))
`,
      checkPython: `expected = [0.01, 0.01, 0.01, 0.005, 0.005, 0.005, 0.0025]
assert len(lr_history) == 7 and np.allclose(lr_history, expected, atol=1e-7), f"lr_history={lr_history}, kỳ vọng {expected}."`,
    },
  },
  {
    id: 'L099',
    order: 99,
    trackId: 'track11_tensorflow',
    title: 'Regularization Mạng Sâu: L2 Weight Decay, Dropout & BatchNormalization',
    subtitle: 'Thu hẹp khoảng cách Train Loss – Val Loss khi mạng Neural bị học thuộc lòng',
    difficulty: 'Trung bình',
    libraries: ['TensorFlow', 'Scikit-Learn'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'So sánh `MLPClassifier(alpha=0.0001)` (ít phạt L2) vs `MLPClassifier(alpha=1.0)` (phạt L2 mạnh) hoặc Keras `kernel_regularizer=l2(...)`.',
      'Đo mức giảm chênh lệch `train_acc - val_acc` nhờ Regularization.',
    ],
    sections: [
      {
        title: '1. Dấu hiệu nhận biết khi nào cần thêm Dropout / L2?',
        contentMarkdown:
          'Nếu `Train Accuracy = 99%` nhưng `Validation Accuracy = 76%`, mạng đang bị **High Variance (Overfitting)**. Hãy giảm bớt số neuron ẩn, tăng `alpha` (`l2 weight decay`) và chèn `Dropout(0.3)` ngay sau các tầng Dense lớn!',
      },
    ],
    exercise: {
      prompt: 'Huấn luyện 2 cấu hình MLP trên `bank_churn.csv` (numeric cols đã `StandardScaler`, split 80/20 `stratify=y, random_state=42`): `mlp_low_reg` (`alpha=1e-5`) và `mlp_high_reg` (`alpha=2.0`) với `hidden_layer_sizes=(64, 32), max_iter=400`. Chứng minh `norm_high < norm_low` (tổng bình phương trọng số L2 của mạng phạt mạnh luôn nhỏ hơn!).',
      requirements: [
        'Tính `norm_low` và `norm_high` = tổng $\\sum W^2$ trên tất cả `coefs_`.',
        '`norm_high < norm_low`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
sc = StandardScaler().fit(X_tr)
X_tr_s, X_te_s = sc.transform(X_tr), sc.transform(X_te)

norm_low = 0.0
norm_high = 0.0
`,
      hintText: 'Khớp cả hai `MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=400, alpha=..., random_state=42)`, tính `sum(float(np.sum(w ** 2)) for w in m.coefs_)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPClassifier

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']]
y = df['Churn']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)
sc = StandardScaler().fit(X_tr)
X_tr_s, X_te_s = sc.transform(X_tr), sc.transform(X_te)

m_low = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=400, alpha=1e-5, random_state=42).fit(X_tr_s, y_tr)
m_high = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=400, alpha=2.0, random_state=42).fit(X_tr_s, y_tr)

norm_low = float(sum(np.sum(w ** 2) for w in m_low.coefs_))
norm_high = float(sum(np.sum(w ** 2) for w in m_high.coefs_))
`,
      checkPython: `assert norm_low > 0 and norm_high > 0, "Chưa tính weight norm."
assert norm_high < norm_low, f"Phạt L2 alpha=2.0 ({norm_high:.2f}) phải cho trọng số nhỏ hơn alpha=1e-5 ({norm_low:.2f})."`,
    },
  },
  {
    id: 'L100',
    order: 100,
    trackId: 'track11_tensorflow',
    title: 'Pipeline Dữ liệu `tf.data` & Layer Tiền xử lý Tích hợp (`Normalization`)',
    subtitle: 'Nhúng tham số Mean/Std trực tiếp vào bên trong mô hình Keras khi xuất deploy',
    difficulty: 'Nâng cao',
    libraries: ['TensorFlow', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext'],
    objectives: [
      'Hiểu quy trình `.shuffle(buffer).batch(32).prefetch(AUTOTUNE)` trong `tf.data.Dataset`.',
      'Nắm lợi ích của tầng `keras.layers.Normalization().adapt(X_train)`: không cần lưu file scaler rời bên ngoài khi deploy!',
    ],
    sections: [
      {
        title: '1. Tự đóng gói Normalization vào bên trong Graph của Model',
        contentMarkdown:
          'Nếu bạn scale bằng Sklearn bên ngoài Keras rồi deploy mô hình `.keras` lên server, người dùng gửi dữ liệu thô chưa chia cho Mean/Std sẽ làm model đoán sai bét! Đặt `norm = layers.Normalization(); norm.adapt(X_train)` ngay tầng đầu tiên biến tiền xử lý thành hằng số nằm gọn trong file model.',
      },
    ],
    exercise: {
      prompt: 'Xây dựng lớp `EmbeddedStandardizer` (hoặc dùng `tf.keras.layers.Normalization`) có phương thức `.adapt(X_train)` lưu `mean_` và `std_`, sau đó gọi trực tiếp lên `X_test` thô của `iris_extended.csv` mà không cần `StandardScaler` ngoài.',
      requirements: [
        '`X_tr_norm` sau `.adapt(X_tr)` có mean ~ 0 và std ~ 1 theo từng cột.',
        '`X_te_norm` dùng đúng `mean_, std_` đã học từ `X_tr`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].values.astype(np.float32)
X_tr, X_te = train_test_split(X, test_size=0.2, random_state=42)

class EmbeddedNormalizer:
    def __init__(self):
        self.mean_ = None
        self.std_ = None
    def adapt(self, X_train):
        # Học mean_ và std_ theo axis=0
        pass
    def __call__(self, X_input):
        # Trả về (X_input - self.mean_) / (self.std_ + 1e-7)
        pass

norm_layer = EmbeddedNormalizer()
X_tr_norm = None
X_te_norm = None
`,
      hintText: 'Trong `adapt`: `self.mean_ = X_train.mean(axis=0); self.std_ = X_train.std(axis=0)`. Trong `__call__`: `return (X_input - self.mean_) / (self.std_ + 1e-7)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
df = pd.read_csv('iris_extended.csv')
X = df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']].values.astype(np.float32)
X_tr, X_te = train_test_split(X, test_size=0.2, random_state=42)

class EmbeddedNormalizer:
    def __init__(self):
        self.mean_ = None
        self.std_ = None
    def adapt(self, X_train):
        self.mean_ = np.mean(X_train, axis=0)
        self.std_ = np.std(X_train, axis=0)
    def __call__(self, X_input):
        return (X_input - self.mean_) / (self.std_ + 1e-7)

norm_layer = EmbeddedNormalizer()
norm_layer.adapt(X_tr)
X_tr_norm = norm_layer(X_tr)
X_te_norm = norm_layer(X_te)
`,
      checkPython: `assert np.allclose(X_tr_norm.mean(axis=0), 0, atol=1e-5), "X_tr_norm phải có mean ~ 0."
assert np.allclose(X_tr_norm.std(axis=0), 1, atol=1e-4), "X_tr_norm phải có std ~ 1."
assert not np.allclose(X_te_norm.mean(axis=0), 0, atol=1e-4), "X_te_norm không được adapt lại trên X_te."`,
    },
  },
  {
    id: 'L101',
    order: 101,
    trackId: 'track11_tensorflow',
    title: 'So sánh Thực chứng: Tree Boosting vs Deep Neural Network trên Dữ liệu Bảng',
    subtitle: 'Hiểu quy tắc chọn kiến trúc phù hợp và kết hợp Neural Net + GBDT để đạt đỉnh Ensemble',
    difficulty: 'Nâng cao',
    libraries: ['Scikit-Learn', 'TensorFlow', 'PyTorch'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Đo thực nghiệm `HistGradientBoostingClassifier` vs `MLPClassifier` / Keras trên cùng tập CV của `loan_train.csv`.',
      'Chứng minh pha trộn xác suất `0.6 * p_gbdt + 0.4 * p_mlp` thường mượt và ổn định hơn mỗi họ đứng riêng!',
    ],
    sections: [
      {
        title: '1. Khi nào Tree thắng Deep Learning và Khi nào nên Trộn cả hai?',
        contentMarkdown:
          'Trên dữ liệu bảng cỡ nhỏ/trung bình (< 100k dòng) với hỗn hợp NaN và Category, **GBDT (XGBoost/LightGBM/CatBoost)** thường thắng về độ chính xác và tốc độ. Tuy nhiên vì Neural Net tạo ra biên quyết định trơn mượt rất khác với biên bậc thang của cây, **pha trộn 1 Neural Net với 2 GBDT** là công thức quen thuộc giúp leo top Kaggle!',
      },
    ],
    exercise: {
      prompt: 'Train cả `HistGradientBoostingClassifier` (`p_gbdt`) và `StandardScaler + SimpleImputer + MLPClassifier` (`p_nn`) trên `loan_train.csv` (numeric cols, split 80/20 `stratify=y, random_state=42`), rồi tạo tổ hợp `p_blend = 0.6 * p_gbdt + 0.4 * p_nn`. Lưu `auc_gbdt`, `auc_nn`, `auc_blend`.',
      requirements: [
        'Cả 3 giá trị AUC đều hợp lệ và `auc_blend >= 0.68`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

auc_gbdt = 0.0
auc_nn = 0.0
auc_blend = 0.0
`,
      hintText: 'Fit `gbdt = HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42).fit(X_tr, y_tr)` và `nn = make_pipeline(SimpleImputer(strategy="median"), StandardScaler(), MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=400, random_state=42)).fit(X_tr, y_tr)`. Tính `p_blend = 0.6 * p_gbdt + 0.4 * p_nn`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import roc_auc_score

df = pd.read_csv('loan_train.csv')
feats = ['ApplicantIncome', 'CoapplicantIncome', 'LoanAmount', 'CreditHistory', 'EmploymentYears']
X = df[feats]
y = df['LoanStatus']
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

gbdt = HistGradientBoostingClassifier(max_iter=80, max_depth=4, random_state=42).fit(X_tr, y_tr)
nn = make_pipeline(
    SimpleImputer(strategy='median'),
    StandardScaler(),
    MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=400, random_state=42),
).fit(X_tr, y_tr)

p_gbdt = gbdt.predict_proba(X_te)[:, 1]
p_nn = nn.predict_proba(X_te)[:, 1]
p_blend = 0.6 * p_gbdt + 0.4 * p_nn

auc_gbdt = float(roc_auc_score(y_te, p_gbdt))
auc_nn = float(roc_auc_score(y_te, p_nn))
auc_blend = float(roc_auc_score(y_te, p_blend))
`,
      checkPython: `assert float(auc_gbdt) > 0.65 and float(auc_nn) > 0.65, "Mô hình đơn lẻ AUC quá thấp."
assert float(auc_blend) >= 0.68, f"auc_blend={auc_blend:.3f} chưa đạt >= 0.68."`,
    },
  },
];
