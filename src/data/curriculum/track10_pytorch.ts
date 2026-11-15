import { LessonDefinition } from '../../types/curriculum';

export const TRACK10_PYTORCH_LESSONS: LessonDefinition[] = [
  {
    id: 'L085',
    order: 85,
    trackId: 'track10_pytorch',
    title: 'PyTorch Tensor & Autograd: Đạo hàm Tự động Hoạt động Ra sao',
    subtitle: 'Hiểu `torch.Tensor`, đồ thị tính toán động và cơ chế `.backward()`',
    difficulty: 'Trung bình',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['housing'],
    objectives: [
      'Nắm sự tương đồng giữa `torch.tensor` và `np.ndarray`, thiết lập `dtype=torch.float32` và `device` (CPU/CUDA).',
      'Tính đạo hàm tự động của $L(w) = (w \\cdot x - y)^2$ bằng `.backward()` và đối chiếu với giải tích tay.',
    ],
    sections: [
      {
        title: '1. Trái tim của PyTorch: Dynamic Computation Graph (Autograd)',
        contentMarkdown:
          'Mỗi phép toán trên Tensor có `requires_grad=True` đều âm thầm dựng một đồ thị phép tính. Khi bạn gọi `loss.backward()`, PyTorch đi ngược đồ thị bằng Quy tắc Dây chuyền (Chain Rule) để điền $\\frac{\\partial L}{\\partial w}$ vào thuộc tính `w.grad`!',
        exampleCode: `# Cú pháp PyTorch chuẩn (Colab / Kaggle / Local GPU):
import torch
w = torch.tensor(3.0, requires_grad=True)
x = torch.tensor(2.0)
y = torch.tensor(10.0)
loss = (w * x - y) ** 2   # (6 - 10)^2 = 16
loss.backward()
print("dw =", w.grad.item())  # 2 * (6 - 10) * 2 = -16.0`,
        callout: {
          type: 'note',
          title: 'Thực thi Dual-Mode (Browser & Colab)',
          text: 'Các bài PyTorch đều dạy cú pháp `torch` chuẩn và tích hợp fallback NumPy tự động trong phần bài tập để chạy mượt ngay trên Browser Pyodide mà không cần cài CUDA!',
        },
      },
    ],
    exercise: {
      prompt: 'Tính giá trị `loss = (w * x - y)^2` và đạo hàm `grad_w = d(loss)/dw` tại `w = 2.5, x = 4.0, y = 14.0` bằng PyTorch Autograd (`torch.tensor(..., requires_grad=True)` -> `loss.backward()`) hoặc fallback giải tích NumPy chính xác khi chạy ở Pyodide nhẹ.',
      requirements: [
        '`loss_val` đúng bằng `(2.5 * 4.0 - 14.0)**2 == 16.0`.',
        '`grad_w` đúng bằng `2 * (2.5 * 4.0 - 14.0) * 4.0 == -32.0`.',
      ],
      starterCode: `w_init, x_val, y_val = 2.5, 4.0, 14.0
loss_val = 0.0
grad_w = 0.0

try:
    import torch
    # Viết tính toán torch & loss.backward()
except ImportError:
    # Fallback NumPy tương đương autograd cho đa thức
    pass
`,
      hintText: 'Với `torch`: `w = torch.tensor(w_init, requires_grad=True); loss = (w * x_val - y_val) ** 2; loss.backward(); loss_val = float(loss.item()); grad_w = float(w.grad.item())`. Fallback NumPy: `err = w_init * x_val - y_val; loss_val = float(err ** 2); grad_w = float(2 * err * x_val)`.',
      solutionCode: `w_init, x_val, y_val = 2.5, 4.0, 14.0
try:
    import torch
    w = torch.tensor(w_init, dtype=torch.float32, requires_grad=True)
    x = torch.tensor(x_val, dtype=torch.float32)
    y = torch.tensor(y_val, dtype=torch.float32)
    loss = (w * x - y) ** 2
    loss.backward()
    loss_val = float(loss.item())
    grad_w = float(w.grad.item())
except ImportError:
    err = w_init * x_val - y_val
    loss_val = float(err ** 2)
    grad_w = float(2.0 * err * x_val)
`,
      checkPython: `assert abs(float(loss_val) - 16.0) < 1e-4, f"loss_val={loss_val}, kỳ vọng 16.0."
assert abs(float(grad_w) - (-32.0)) < 1e-4, f"grad_w={grad_w}, kỳ vọng -32.0."`,
    },
  },
  {
    id: 'L086',
    order: 86,
    trackId: 'track10_pytorch',
    title: 'Huấn luyện Mô hình Tuyến tính từ Con số 0 bằng Gradient Descent Loop',
    subtitle: 'Hiểu 4 bước thiêng liêng: Forward -> Loss -> Backward -> Step & Zero Grad',
    difficulty: 'Trung bình',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['housing'],
    objectives: [
      'Hiểu vòng lặp cập nhật `w -= lr * grad`, `b -= lr * grad_b` trong 100 epochs.',
      'Chú ý bắt buộc phải gọi `zero_grad()` sau mỗi bước vì PyTorch **cộng dồn** gradient!',
    ],
    sections: [
      {
        title: '1. Nhịp tim 4 bước của mọi mạng Neural',
        contentMarkdown:
          'Mọi bài toán từ Linear Regression nhỏ bé tới GPT nghìn tỷ tham số đều lặp đi lặp lại đúng 4 dòng:\n1. `y_pred = model(X)` (**Forward**)\n2. `loss = loss_fn(y_pred, y)` (**Compute Loss**)\n3. `optimizer.zero_grad()` -> `loss.backward()` (**Backprop**)\n4. `optimizer.step()` (**Cập nhật trọng số**)',
      },
    ],
    exercise: {
      prompt: 'Khớp đường hồi quy dự đoán `SalePrice` chuẩn hóa (đã `StandardScaler`) theo `LivingArea` chuẩn hóa trên `housing.csv` qua **60 bước Gradient Descent** (`lr = 0.08`, MSE Loss). Xác nhận `final_loss < initial_loss * 0.4`.',
      requirements: [
        'Bắt đầu từ `w = 0.0, b = 0.0`, chạy 60 bước cập nhật gradient MSE.',
        '`final_loss < initial_loss * 0.4`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('housing.csv')[['LivingArea', 'SalePrice']].dropna()
x_np = StandardScaler().fit_transform(df[['LivingArea']]).ravel().astype(np.float32)
y_np = StandardScaler().fit_transform(df[['SalePrice']]).ravel().astype(np.float32)

initial_loss = 0.0
final_loss = 0.0
lr = 0.08

try:
    import torch
    # Gradient Descent bằng torch
except ImportError:
    # Gradient Descent bằng NumPy tương đương chính xác
    pass
`,
      hintText: 'Công thức MSE trên batch $N$: `err = (w * x_np + b) - y_np`, `loss = mean(err^2)`, `dw = 2 * mean(err * x_np)`, `db = 2 * mean(err)`, `w -= lr * dw; b -= lr * db`. Trong PyTorch dùng `loss.backward()` và `with torch.no_grad(): w -= lr * w.grad; b -= lr * b.grad; w.grad.zero_(); b.grad.zero_()`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('housing.csv')[['LivingArea', 'SalePrice']].dropna()
x_np = StandardScaler().fit_transform(df[['LivingArea']]).ravel().astype(np.float32)
y_np = StandardScaler().fit_transform(df[['SalePrice']]).ravel().astype(np.float32)

initial_loss = 0.0
final_loss = 0.0
lr = 0.08
try:
    import torch
    x_t = torch.from_numpy(x_np)
    y_t = torch.from_numpy(y_np)
    w = torch.tensor(0.0, requires_grad=True)
    b = torch.tensor(0.0, requires_grad=True)
    for epoch in range(60):
        pred = w * x_t + b
        loss = torch.mean((pred - y_t) ** 2)
        if epoch == 0:
            initial_loss = float(loss.item())
        loss.backward()
        with torch.no_grad():
            w -= lr * w.grad
            b -= lr * b.grad
            w.grad.zero_()
            b.grad.zero_()
    final_loss = float(torch.mean((w * x_t + b - y_t) ** 2).item())
except ImportError:
    w, b = 0.0, 0.0
    for epoch in range(60):
        err = (w * x_np + b) - y_np
        loss = float(np.mean(err ** 2))
        if epoch == 0:
            initial_loss = loss
        dw = float(2.0 * np.mean(err * x_np))
        db = float(2.0 * np.mean(err))
        w -= lr * dw
        b -= lr * db
    final_loss = float(np.mean(((w * x_np + b) - y_np) ** 2))
`,
      checkPython: `assert initial_loss > 0 and final_loss > 0, "Chưa ghi nhận initial_loss và final_loss."
assert final_loss < initial_loss * 0.4, f"Loss chưa giảm đủ: {initial_loss:.4f} -> {final_loss:.4f}."`,
    },
  },
  {
    id: 'L087',
    order: 87,
    trackId: 'track10_pytorch',
    title: 'Kiến trúc `nn.Module`, Tầng Linear & Hàm Kích hoạt Phi tuyến (ReLU/GELU)',
    subtitle: 'Vì sao thiếu Activation thì mạng 100 tầng cũng chỉ bằng 1 phép nhân tuyến tính',
    difficulty: 'Trung bình',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['iris_ext'],
    objectives: [
      'Thiết kế class kế thừa `nn.Module` (`__init__`, `forward`).',
      'Tính số lượng tham số có thể học (`in * out + out`) và hiểu vai trò bẻ cong không gian của `ReLU` / `GELU` / `SiLU`.',
    ],
    sections: [
      {
        title: '1. Mẫu chuẩn `nn.Module` cho Bảng dữ liệu',
        contentMarkdown:
          '```python\nclass TabularMLP(nn.Module):\n    def __init__(self, in_dim, hidden=32, out_dim=1):\n        super().__init__()\n        self.net = nn.Sequential(\n            nn.Linear(in_dim, hidden),\n            nn.ReLU(),\n            nn.Linear(hidden, out_dim),\n        )\n    def forward(self, x):\n        return self.net(x)\n```',
      },
    ],
    exercise: {
      prompt: 'Xây dựng khối Forward 2 tầng Linear `(in=4 -> hidden=16 -> out=3)` có ReLU ở giữa (`TabularNet`) nhận batch `(10, 4)` từ `iris_extended.csv`. Tính đúng tổng số tham số `total_params = (4*16 + 16) + (16*3 + 3)` và kiểm tra output có shape `(10, 3)`.',
      requirements: [
        '`out.shape == (10, 3)`.',
        '`total_params == 131`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('iris_extended.csv')
X_batch = StandardScaler().fit_transform(df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']])[:10].astype(np.float32)

out = None
total_params = 0

try:
    import torch
    import torch.nn as nn
    # Định nghĩa nn.Module và chạy forward
except ImportError:
    # Mô phỏng chuẩn kiến trúc Linear(4,16)->ReLU->Linear(16,3) bằng NumPy
    pass
`,
      hintText: 'Dùng `nn.Sequential(nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, 3))` hoặc tính trực tiếp `sum(p.numel() for p in model.parameters())`. Trong NumPy: khởi tạo `W1 (4,16), b1 (16,), W2 (16,3), b2 (3,)` rồi `h = np.maximum(0, X_batch @ W1 + b1); out = h @ W2 + b2`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('iris_extended.csv')
X_batch = StandardScaler().fit_transform(df[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']])[:10].astype(np.float32)

try:
    import torch
    import torch.nn as nn
    class IrisNet(nn.Module):
        def __init__(self):
            super().__init__()
            self.net = nn.Sequential(nn.Linear(4, 16), nn.ReLU(), nn.Linear(16, 3))
        def forward(self, x):
            return self.net(x)
    model = IrisNet()
    total_params = sum(p.numel() for p in model.parameters())
    with torch.no_grad():
        out = model(torch.from_numpy(X_batch)).numpy()
except ImportError:
    rng = np.random.default_rng(42)
    W1, b1 = rng.normal(0, 0.2, (4, 16)), np.zeros(16)
    W2, b2 = rng.normal(0, 0.2, (16, 3)), np.zeros(3)
    total_params = W1.size + b1.size + W2.size + b2.size
    out = np.maximum(0.0, X_batch @ W1 + b1) @ W2 + b2
`,
      checkPython: `assert out is not None and tuple(out.shape) == (10, 3), f"Output shape phải là (10, 3), nhận {getattr(out, 'shape', None)}."
assert int(total_params) == 131, f"Tổng tham số phải là 131, nhận {total_params}."`,
    },
  },
  {
    id: 'L088',
    order: 88,
    trackId: 'track10_pytorch',
    title: '`Dataset`, `DataLoader` & Mini-Batch Shuffling',
    subtitle: 'Chia dữ liệu thành từng lô nhỏ chuẩn xác không làm tràn RAM',
    difficulty: 'Trung bình',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Cài đặt `Dataset` (`__len__`, `__getitem__`) và `DataLoader(batch_size=32, shuffle=True)`.',
      'Xác nhận chỉ bật `shuffle=True` cho Train Loader, còn Val/Test Loader luôn để `shuffle=False`.',
    ],
    sections: [
      {
        title: '1. Kích thước Batch ảnh hưởng gì đến hội tụ?',
        contentMarkdown:
          'Batch nhỏ (`16–64`) tạo nhiễu gradient giúp mô hình nhảy thoát các hố cực tiểu nông; Batch lớn (`256–1024`) tận dụng GPU song song nhưng dễ hội tụ phẳng kém khái quát nếu không tăng Learning Rate.',
      },
    ],
    exercise: {
      prompt: 'Tạo bộ nạp Mini-Batch (`batch_size = 64`) cho `bank_churn.csv` (`350` dòng -> đúng `ceil(350/64) = 6` batches với batch cuối có `30` mẫu). Lưu kích thước từng batch qua 1 epoch vào list `batch_sizes`.',
      requirements: [
        '`sum(batch_sizes) == 350` và `batch_sizes == [64, 64, 64, 64, 64, 30]`.',
      ],
      starterCode: `df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']].values.astype(np.float32)
y = df['Churn'].values.astype(np.float32)

batch_size = 64
batch_sizes = []

try:
    import torch
    from torch.utils.data import TensorDataset, DataLoader
    # Tạo DataLoader và thu thập len(bx)
except ImportError:
    # Cài đặt batch iterator tương đương DataLoader(shuffle=True)
    pass
`,
      hintText: 'Dùng `DataLoader(TensorDataset(torch.from_numpy(X), torch.from_numpy(y)), batch_size=64, shuffle=True)`. Trong NumPy: `idx = np.random.permutation(len(X))`, lặp `for start in range(0, len(X), batch_size): bx = X[idx[start:start+batch_size]]`.',
      solutionCode: `df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']].values.astype(np.float32)
y = df['Churn'].values.astype(np.float32)

batch_size = 64
batch_sizes = []
try:
    import torch
    from torch.utils.data import TensorDataset, DataLoader
    loader = DataLoader(TensorDataset(torch.from_numpy(X), torch.from_numpy(y)), batch_size=batch_size, shuffle=True)
    for bx, _ in loader:
        batch_sizes.append(len(bx))
except ImportError:
    rng = np.random.default_rng(42)
    perm = rng.permutation(len(X))
    for start in range(0, len(X), batch_size):
        batch_idx = perm[start:start + batch_size]
        batch_sizes.append(len(X[batch_idx]))
`,
      checkPython: `assert batch_sizes == [64, 64, 64, 64, 64, 30], f"batch_sizes={batch_sizes}, kỳ vọng [64, 64, 64, 64, 64, 30]."`,
    },
  },
  {
    id: 'L089',
    order: 89,
    trackId: 'track10_pytorch',
    title: 'Loss Functions & Optimizers: `BCEWithLogitsLoss`, `CrossEntropyLoss` & `AdamW`',
    subtitle: 'Vì sao không bao giờ đặt Sigmoid/Softmax thủ công trước Loss của PyTorch',
    difficulty: 'Trung bình',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['churn'],
    objectives: [
      'Hiểu `BCEWithLogitsLoss` và `CrossEntropyLoss` nhận **Logits thô** (trước Sigmoid/Softmax) để tính Log-Sum-Exp ổn định số học.',
      'Phân biệt `Adam` và `AdamW` (Decoupled Weight Decay chuẩn trong Deep Learning hiện đại).',
    ],
    sections: [
      {
        title: '1. Logits vs Probabilities — Lỗi khiến Gradient biến mất',
        contentMarkdown:
          'Nếu bạn tự thêm `torch.sigmoid(out)` rồi ném vào `nn.BCELoss()`, với các logit lớn hơn `+20` hoặc nhỏ hơn `-20`, đạo hàm bị bão hòa hoặc gây lỗi `log(0) = NaN`! Hãy luôn xuất **Logits thô** từ tầng Linear cuối và dùng `BCEWithLogitsLoss()`.',
      },
    ],
    exercise: {
      prompt: 'Tính hàm mất mát nhị phân ổn định số học (`BCEWithLogitsLoss`) cho vector logits `z = np.array([-3.0, 0.0, 3.0])` và nhãn `y = np.array([0.0, 1.0, 1.0])` lưu vào `bce_val`. (Công thức ổn định: `max(z, 0) - z*y + log(1 + exp(-|z|))`).',
      requirements: [
        'Kết quả `bce_val` khớp `nn.BCEWithLogitsLoss()` tới `1e-5` (~`0.2602`).',
      ],
      starterCode: `z_np = np.array([-3.0, 0.0, 3.0], dtype=np.float32)
y_np = np.array([0.0, 1.0, 1.0], dtype=np.float32)
bce_val = 0.0

try:
    import torch
    import torch.nn as nn
    # Dùng nn.BCEWithLogitsLoss()
except ImportError:
    # Công thức Log-Sum-Exp ổn định số học
    pass
`,
      hintText: 'Công thức chuẩn: `losses = np.maximum(z_np, 0) - z_np * y_np + np.log1p(np.exp(-np.abs(z_np)))`, `bce_val = float(np.mean(losses))`.',
      solutionCode: `z_np = np.array([-3.0, 0.0, 3.0], dtype=np.float32)
y_np = np.array([0.0, 1.0, 1.0], dtype=np.float32)

try:
    import torch
    import torch.nn as nn
    bce_val = float(nn.BCEWithLogitsLoss()(torch.from_numpy(z_np), torch.from_numpy(y_np)).item())
except ImportError:
    losses = np.maximum(z_np, 0.0) - z_np * y_np + np.log1p(np.exp(-np.abs(z_np)))
    bce_val = float(np.mean(losses))
`,
      checkPython: `expected = float(np.mean(np.maximum(z_np, 0) - z_np * y_np + np.log1p(np.exp(-np.abs(z_np)))))
assert abs(float(bce_val) - expected) < 1e-4, f"bce_val={bce_val:.5f} chưa khớp {expected:.5f}."`,
    },
  },
  {
    id: 'L090',
    order: 90,
    trackId: 'track10_pytorch',
    title: 'MLP cho Dữ liệu Bảng: BatchNorm, Dropout & `model.train()` vs `model.eval()`',
    subtitle: 'Xây dựng mạng Neural Tabular hoàn chỉnh trên bài toán Bank Churn',
    difficulty: 'Nâng cao',
    libraries: ['PyTorch', 'Scikit-Learn'],
    estimatedMinutes: 35,
    datasetIds: ['churn'],
    objectives: [
      'Nắm vai trò của `BatchNorm1d` (ổn định phân phối giữa các tầng) và `Dropout(p=0.2)` (chống đồng thích nghi/Overfit).',
      'Ghi nhớ quy tắc sống còn: bật `model.train()` khi huấn luyện và **`model.eval()` + `torch.no_grad()`** khi đánh giá/dự đoán!',
    ],
    sections: [
      {
        title: '1. Quên `model.eval()` = Sai lệch kết quả đánh giá!',
        contentMarkdown:
          'Nếu bạn quên gọi `model.eval()`, tầng `Dropout` vẫn tiếp tục tắt ngẫu nhiên 20% neuron ngay cả lúc dự đoán test, còn `BatchNorm1d` vẫn tính Mean/Std của batch nhỏ thay vì dùng Running Mean/Var toàn cục!',
      },
    ],
    exercise: {
      prompt: 'Huấn luyện mạng Neural MLP (Input 5 -> Hidden 32 ReLU -> Output 1) trên `bank_churn.csv` (split 80/20 `stratify=y, random_state=42`, chuẩn hóa bằng `StandardScaler`) và đánh giá `mlp_auc >= 0.76` trên tập test.',
      requirements: [
        'Sử dụng `torch` MLP với `AdamW` + `BCEWithLogitsLoss` nếu có `torch`, hoặc `MLPClassifier` + `StandardScaler` tương đương ở môi trường không có `torch`.',
        '`mlp_auc >= 0.76`.',
      ],
      starterCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.neural_network import MLPClassifier

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']].values
y = df['Churn'].values
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

sc = StandardScaler().fit(X_tr)
X_tr_s = sc.transform(X_tr).astype(np.float32)
X_te_s = sc.transform(X_te).astype(np.float32)

mlp_auc = 0.0
# Huấn luyện PyTorch MLP (hoặc MLPClassifier fallback) và tính roc_auc_score
`,
      hintText: 'Dùng `try: import torch, torch.nn as nn` train 80 epochs với `AdamW(lr=1e-2)` và `BCEWithLogitsLoss`, nhớ `model.eval()` trước khi lấy `torch.sigmoid(model(X_te_t))`. Fallback `MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=300, random_state=42)`.',
      solutionCode: `from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import roc_auc_score
from sklearn.neural_network import MLPClassifier

df = pd.read_csv('bank_churn.csv')
X = df[['CreditScore', 'Age', 'Balance', 'NumProducts', 'IsActiveMember']].values
y = df['Churn'].values
X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, stratify=y, random_state=42)

sc = StandardScaler().fit(X_tr)
X_tr_s = sc.transform(X_tr).astype(np.float32)
X_te_s = sc.transform(X_te).astype(np.float32)

try:
    import torch
    import torch.nn as nn
    torch.manual_seed(42)
    model = nn.Sequential(
        nn.Linear(5, 32), nn.BatchNorm1d(32), nn.ReLU(), nn.Dropout(0.15),
        nn.Linear(32, 16), nn.ReLU(),
        nn.Linear(16, 1),
    )
    opt = torch.optim.AdamW(model.parameters(), lr=1e-2, weight_decay=1e-4)
    loss_fn = nn.BCEWithLogitsLoss()
    X_t, y_t = torch.from_numpy(X_tr_s), torch.from_numpy(y_tr.astype(np.float32)).unsqueeze(1)
    for _ in range(100):
        model.train()
        opt.zero_grad()
        loss = loss_fn(model(X_t), y_t)
        loss.backward()
        opt.step()
    model.eval()
    with torch.no_grad():
        probs = torch.sigmoid(model(torch.from_numpy(X_te_s))).numpy().ravel()
except ImportError:
    clf = MLPClassifier(hidden_layer_sizes=(32, 16), max_iter=400, alpha=0.01, random_state=42)
    clf.fit(X_tr_s, y_tr)
    probs = clf.predict_proba(X_te_s)[:, 1]

mlp_auc = float(roc_auc_score(y_te, probs))
`,
      checkPython: `assert float(mlp_auc) >= 0.76, f"mlp_auc={mlp_auc:.3f} chưa đạt >= 0.76."`,
    },
  },
  {
    id: 'L091',
    order: 91,
    trackId: 'track10_pytorch',
    title: 'Training Loop Chuyên nghiệp: Cosine LR Scheduler, Gradient Clipping & Early Stopping',
    subtitle: 'Kiểm soát sự ổn định của Deep Learning và giữ lại trọng số epoch tốt nhất',
    difficulty: 'Nâng cao',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 30,
    datasetIds: ['kaggle_loan_train'],
    objectives: [
      'Hiểu vì sao giảm Learning Rate dần về cuối (CosineAnnealingLR / ReduceLROnPlateau) giúp mạng lắng xuống đáy cực tiểu mịn hơn.',
      'Dùng `copy.deepcopy(state_dict)` để khôi phục trọng số tại `best_val_loss` khi kích hoạt Early Stopping.',
    ],
    sections: [
      {
        title: '1. Ba công cụ giữ cho Deep Learning không bao giờ phát nổ Gradient',
        contentMarkdown:
          '- **`torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)`**: cắt trần chuẩn gradient tránh `NaN`.\n- **`CosineAnnealingLR`**: hạ nhịp Learning Rate êm mượt theo hình sin/cos.\n- **Early Stopping Patience**: theo dõi `val_loss`, lưu lại bản chụp trọng số tốt nhất mỗi khi phá kỷ lục.',
      },
    ],
    exercise: {
      prompt: 'Viết hàm chọn checkpoint tốt nhất qua Early Stopping (`patience = 3`) mô phỏng chuỗi `val_losses = [0.68, 0.54, 0.49, 0.51, 0.50, 0.52, 0.55]`. Xác định `best_epoch` (chỉ số 0-based), `best_val_loss`, và `stopped_epoch` (epoch mà bộ đếm `no_improve == patience`).',
      requirements: [
        '`best_epoch == 2` (`val_loss == 0.49`).',
        '`stopped_epoch == 5` (vì epoch 3, 4, 5 đều không thấp hơn `0.49`, đạt `patience = 3`).',
      ],
      starterCode: `val_losses = [0.68, 0.54, 0.49, 0.51, 0.50, 0.52, 0.55]
patience = 3

best_val_loss = float('inf')
best_epoch = -1
stopped_epoch = -1
no_improve = 0

# Cài đặt vòng lặp Early Stopping chuẩn
`,
      hintText: 'Ở mỗi `epoch, vl in enumerate(val_losses)`: nếu `vl < best_val_loss`: cập nhật `best_val_loss, best_epoch` và reset `no_improve = 0`; ngược lại `no_improve += 1`, nếu `no_improve >= patience`: gán `stopped_epoch = epoch` và `break`.',
      solutionCode: `val_losses = [0.68, 0.54, 0.49, 0.51, 0.50, 0.52, 0.55]
patience = 3

best_val_loss = float('inf')
best_epoch = -1
stopped_epoch = -1
no_improve = 0

for epoch, vl in enumerate(val_losses):
    if vl < best_val_loss:
        best_val_loss = float(vl)
        best_epoch = epoch
        no_improve = 0
    else:
        no_improve += 1
        if no_improve >= patience:
            stopped_epoch = epoch
            break
`,
      checkPython: `assert best_epoch == 2 and abs(best_val_loss - 0.49) < 1e-6, "best_epoch/best_val_loss sai."
assert stopped_epoch == 5, f"stopped_epoch phải là 5 (đủ patience=3 sau epoch 2), nhận {stopped_epoch}."`,
    },
  },
  {
    id: 'L092',
    order: 92,
    trackId: 'track10_pytorch',
    title: '1D-CNN & Sequence Modeling cho Chuỗi Cảm biến / Thời gian',
    subtitle: 'Hiểu shape `(Batch, Channels, SeqLen)` của `nn.Conv1d` và Global Average Pooling',
    difficulty: 'Chuyên sâu',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 35,
    datasetIds: ['daily_sales'],
    objectives: [
      'Đóng gói chuỗi `Sales` thành cửa sổ trượt (Sliding Window) độ dài `seq_len = 7` để dự đoán ngày thứ 8.',
      'Hiểu chuyển vị trục `(B, L, C) -> (B, C, L)` bắt buộc cho `nn.Conv1d` trong PyTorch.',
    ],
    sections: [
      {
        title: '1. Sliding Window Biến Chuỗi 1D thành Mẫu Học Sâu',
        contentMarkdown:
          'Từ chuỗi doanh số 365 ngày, ta trượt cửa sổ dài `7` ngày (`window[t-7 : t]`) để làm input $X_t$ (shape `(N, 1, 7)`) và `Sales[t]` làm nhãn $y_t$. Đây chính là bước chuẩn bị đầu vào cho mọi mô hình `Conv1D`, `LSTM`, hoặc `Transformer`!',
      },
    ],
    exercise: {
      prompt: 'Tạo tập Sliding Window độ dài `window = 7` từ chuỗi `Sales` của Store `"S1"` (`daily_sales.csv`, đã sắp theo `Date`, chuẩn hóa về `[0, 1]` hoặc giữ nguyên), tạo ma trận `X_seq` có shape `(N - 7, 1, 7)` (chuẩn `Conv1d`: `(Batch, Channels=1, SeqLen=7)`) và vector `y_seq` dài `N - 7`, rồi thực hiện tích chập 1D (bằng `nn.Conv1d(1, 4, kernel_size=3)` hoặc lọc 1D NumPy tương đương) thu được đầu ra shape `(N - 7, 4, 5)`.',
      requirements: [
        '`X_seq.shape == (len(sales) - 7, 1, 7)`.',
        '`conv_out.shape == (len(sales) - 7, 4, 5)` (vì `SeqLen - kernel_size + 1 = 7 - 3 + 1 = 5`).',
      ],
      starterCode: `df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].sort_values('Date').reset_index(drop=True)
series = s1['Sales'].values.astype(np.float32)

window = 7
# Tạo X_seq shape (N-7, 1, 7) và y_seq shape (N-7,)
X_seq = None
y_seq = None
conv_out = None
`,
      hintText: '`X_list = [series[i:i+window] for i in range(len(series) - window)]`, `X_seq = np.array(X_list)[:, None, :]` (thêm trục channel ở giữa), `y_seq = series[window:]`. Với tích chập 1D (4 filters, kernel=3): `torch.nn.Conv1d(1, 4, 3)` hoặc NumPy sliding `np.stack([X_seq[:, 0, k:k+3] for k in range(5)], axis=1)` nhân với `W (4, 3)`.',
      solutionCode: `df = pd.read_csv('daily_sales.csv')
s1 = df[df['StoreId'] == 'S1'].sort_values('Date').reset_index(drop=True)
series = s1['Sales'].values.astype(np.float32)

window = 7
X_seq = np.array([series[i:i + window] for i in range(len(series) - window)], dtype=np.float32)[:, None, :]
y_seq = series[window:]

try:
    import torch
    import torch.nn as nn
    conv = nn.Conv1d(in_channels=1, out_channels=4, kernel_size=3)
    with torch.no_grad():
        conv_out = conv(torch.from_numpy(X_seq)).numpy()
except ImportError:
    rng = np.random.default_rng(42)
    kernels = rng.normal(0, 0.1, (4, 3)).astype(np.float32)
    # X_seq: (B, 1, 7) -> 5 vị trí trượt kernel_size=3 -> (B, 4, 5)
    patches = np.stack([X_seq[:, 0, k:k + 3] for k in range(5)], axis=2)  # (B, 3, 5)
    conv_out = np.einsum('oc,bcl->bol', kernels, patches)
`,
      checkPython: `n = len(s1)
assert X_seq.shape == (n - 7, 1, 7), f"X_seq shape sai: {X_seq.shape}."
assert y_seq.shape == (n - 7,), f"y_seq shape sai: {y_seq.shape}."
assert conv_out.shape == (n - 7, 4, 5), f"conv_out shape phải là ({n-7}, 4, 5), nhận {conv_out.shape}."`,
    },
  },
  {
    id: 'L093',
    order: 93,
    trackId: 'track10_pytorch',
    title: 'Lưu/Tải Checkpoint, Đóng gói Trọng số & Sanity Check Overfit 1 Batch',
    subtitle: 'Kỹ thuật debug Deep Learning số 1: "Thử Overfit 16 mẫu trước khi train cả triệu mẫu"',
    difficulty: 'Nâng cao',
    libraries: ['PyTorch', 'NumPy'],
    estimatedMinutes: 25,
    datasetIds: ['iris_ext'],
    objectives: [
      'Thực hành quy tắc Karpathy: lấy 1 batch nhỏ (16 mẫu) và chứng minh mạng có khả năng đẩy loss về gần 0 trước khi chạy tập lớn.',
      'Hiểu cách lưu `state_dict` (`torch.save(model.state_dict(), path)`) thay vì pickle cả object model.',
    ],
    sections: [
      {
        title: '1. Vì sao phải lưu `state_dict()` chứ không lưu nguyên object?',
        contentMarkdown:
          'Lưu nguyên object Python bằng `torch.save(model, ...)` gắn chặt với cấu trúc thư mục code tại thời điểm lưu — đổi tên file là gãy! Chuẩn mực luôn là chỉ lưu từ điển trọng số **`model.state_dict()`**, rồi khởi tạo lại kiến trúc trống trước khi gọi `load_state_dict()`.',
      },
    ],
    exercise: {
      prompt: 'Áp dụng "Sanity Check Overfit 1 Batch": lấy 16 mẫu đầu tiên (2 lớp 0/1 đã lọc) từ `iris_extended.csv`, huấn luyện bộ phân loại tuyến tính hoặc MLP 200 bước sao cho có thể **ghi nhớ 100% 16 mẫu đó (`batch_acc == 1.0`)**, đồng thời lưu trọng số ra file `checkpoint_l093.npz` (hoặc `.pt`) và tải lại kiểm chứng dự đoán trùng khớp 100%.',
      requirements: [
        '`batch_acc == 1.0` trên 16 mẫu đầu (xác nhận luồng forward/backward không có bug!).',
        'Lưu file checkpoint trên đĩa và load lại kiểm tra `np.allclose(pred_before, pred_after)`.',
      ],
      starterCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('iris_extended.csv')
sub = df[df['Species'].isin(df['Species'].unique()[:2])].groupby('Species', group_keys=False).head(8).copy()
X16 = StandardScaler().fit_transform(sub[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]).astype(np.float32)
y16 = (sub['Species'] == sub['Species'].unique()[1]).astype(np.float32).values

batch_acc = 0.0
pred_before = None
pred_after = None
`,
      hintText: 'Dùng `torch` hoặc hồi quy Logistic GD NumPy 200 vòng trên `X16, y16`. Lưu bằng `np.savez("checkpoint_l093.npz", W=W, b=b)` (hoặc `torch.save(model.state_dict(), "checkpoint_l093.pt")`), sau đó nạp lại tính `pred_after`.',
      solutionCode: `from sklearn.preprocessing import StandardScaler
df = pd.read_csv('iris_extended.csv')
sub = df[df['Species'].isin(df['Species'].unique()[:2])].groupby('Species', group_keys=False).head(8).copy()
X16 = StandardScaler().fit_transform(sub[['SepalLength', 'SepalWidth', 'PetalLength', 'PetalWidth']]).astype(np.float32)
y16 = (sub['Species'] == sub['Species'].unique()[1]).astype(np.float32).values

W = np.zeros(4, dtype=np.float32)
b = np.float32(0.0)
lr = 0.5
for _ in range(200):
    logits = X16 @ W + b
    probs = 1.0 / (1.0 + np.exp(-logits))
    err = probs - y16
    W -= lr * (X16.T @ err) / len(X16)
    b -= lr * np.mean(err)

pred_before = 1.0 / (1.0 + np.exp(-(X16 @ W + b)))
batch_acc = float(np.mean((pred_before >= 0.5) == (y16 >= 0.5)))

np.savez('checkpoint_l093.npz', W=W, b=np.array([b]))
loaded = np.load('checkpoint_l093.npz')
pred_after = 1.0 / (1.0 + np.exp(-(X16 @ loaded['W'] + loaded['b'][0])))
`,
      checkPython: `assert float(batch_acc) == 1.0, f"Overfit sanity check trên 16 mẫu phải đạt 1.0, nhận {batch_acc}."
assert os.path.exists('checkpoint_l093.npz') or os.path.exists('checkpoint_l093.pt'), "Chưa lưu file checkpoint."
assert np.allclose(pred_before, pred_after, atol=1e-6), "Dự đoán sau khi load checkpoint không khớp."`,
    },
  },
];
