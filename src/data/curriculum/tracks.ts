import { TrackDefinition } from '../../types/curriculum';

export const CURRICULUM_TRACKS: TrackDefinition[] = [
  {
    id: 'track01_numpy',
    order: 1,
    title: 'Phần 1: Python & NumPy Vectorization Cốt Lõi',
    shortTitle: '1. NumPy Căn bản → Nâng cao',
    description:
      'Làm chủ mảng đa chiều ndarray, slicing, broadcasting, boolean masking, đại số tuyến tính và tối ưu tốc độ vector hóa.',
    levelRange: 'Cơ bản → Trung bình',
    libraries: ['Python', 'NumPy'],
  },
  {
    id: 'track02_pandas',
    order: 2,
    title: 'Phần 2: Pandas Thành Thạo (Xử Lý Bảng & Đa Bảng)',
    shortTitle: '2. Pandas & Multi-Table',
    description:
      'Đọc/ghi dữ liệu, loc/iloc, làm sạch NaN, groupby, pivot_table, merge nhiều bảng (orders + customers), rolling và tối ưu RAM.',
    levelRange: 'Cơ bản → Nâng cao',
    libraries: ['Pandas'],
  },
  {
    id: 'track03_viz',
    order: 3,
    title: 'Phần 3: Trực Quan Hóa Dữ Liệu (Matplotlib, Seaborn & Plotly)',
    shortTitle: '3. Matplotlib, Seaborn & Plotly',
    description:
      'Xây dựng biểu đồ phân tích EDA chuyên sâu: histogram, boxplot, heatmap tương quan, subplots, biểu đồ tương tác Plotly và chẩn đoán mô hình.',
    levelRange: 'Cơ bản → Nâng cao',
    libraries: ['Matplotlib', 'Seaborn', 'Plotly'],
  },
  {
    id: 'track04_preprocess',
    order: 4,
    title: 'Phần 4: Làm Sạch Dữ Liệu & Tiền Xử Lý Chống Data Leakage',
    shortTitle: '4. Preprocessing & Anti-Leakage',
    description:
      'Phát hiện trùng lặp/outlier, Imputation, Scaling, log-transform, Encoding, Text TF-IDF và ColumnTransformer chuẩn Scikit-Learn.',
    levelRange: 'Cơ bản → Nâng cao',
    libraries: ['Preprocessing', 'Scikit-Learn'],
  },
  {
    id: 'track05_fe',
    order: 5,
    title: 'Phần 5: Feature Engineering Nâng Cao & Chọn Lọc Đặc Trưng',
    shortTitle: '5. Feature Engineering',
    description:
      'Tạo biến tỷ lệ/tương tác, chu kỳ thời gian sin/cos, aggregation theo nhóm, Out-of-Fold Target Encoding, Mutual Info và Permutation Importance.',
    levelRange: 'Trung bình → Nâng cao',
    libraries: ['Feature Eng', 'Pandas', 'Scikit-Learn'],
  },
  {
    id: 'track06_cv',
    order: 6,
    title: 'Phần 6: Chia Tập, Cross-Validation & Xử Lý Mất Cân Bằng',
    shortTitle: '6. Validation, CV & Imbalance',
    description:
      'StratifiedKFold, GroupKFold chống rò rỉ theo bệnh nhân/khách hàng, TimeSeriesSplit, chọn đúng Metric và tối ưu Threshold.',
    levelRange: 'Trung bình → Nâng cao',
    libraries: ['Validation/CV', 'Scikit-Learn'],
  },
  {
    id: 'track07_sklearn',
    order: 7,
    title: 'Phần 7: Các Thuật Toán Scikit-Learn Từ A Đến Z',
    shortTitle: '7. Thuật toán Scikit-Learn',
    description:
      'Bản chất toán học và code thực hành cho Linear/Ridge/Lasso, Logistic, KNN, Decision Tree, SVM, Naive Bayes, Random Forest, ExtraTrees, HistGB và Tuning.',
    levelRange: 'Cơ bản → Nâng cao',
    libraries: ['Scikit-Learn'],
  },
  {
    id: 'track08_boosting',
    order: 8,
    title: 'Phần 8: Gradient Boosting (XGBoost, LightGBM, CatBoost) & Ensembling',
    shortTitle: '8. Boosting & Ensembling',
    description:
      'Hiểu sâu Residual Boosting, Regularization cây, Early Stopping, Voting/Averaging, Out-of-Fold Stacking và giải thích mô hình.',
    levelRange: 'Nâng cao → Chuyên sâu',
    libraries: ['XGBoost', 'LightGBM', 'CatBoost', 'Scikit-Learn'],
  },
  {
    id: 'track09_unsupervised_ts',
    order: 9,
    title: 'Phần 9: Học Không Giám Sát, Anomaly Detection & Chuỗi Thời Gian',
    shortTitle: '9. Unsupervised & Time Series',
    description:
      'K-Means, Silhouette, DBSCAN, PCA giảm chiều, IsolationForest phát hiện bất thường, đặc trưng Lag/Rolling và Walk-Forward CV.',
    levelRange: 'Trung bình → Chuyên sâu',
    libraries: ['Unsupervised', 'Time Series', 'Scikit-Learn'],
  },
  {
    id: 'track10_pytorch',
    order: 10,
    title: 'Phần 10: Deep Learning Thực Chiến Với PyTorch (A → Z)',
    shortTitle: '10. Deep Learning PyTorch',
    description:
      'Từ Tensor, Autograd backward(), nn.Module, Dataset/DataLoader đến MLP Tabular, BatchNorm, Dropout, AdamW, Early Stopping và 1D-CNN.',
    levelRange: 'Nâng cao → Chuyên sâu',
    libraries: ['PyTorch'],
  },
  {
    id: 'track11_tensorflow',
    order: 11,
    title: 'Phần 11: Deep Learning Với TensorFlow & Keras API',
    shortTitle: '11. TensorFlow / Keras',
    description:
      'tf.Tensor, GradientTape, Sequential & Functional API, Multi-input Tabular, Callbacks, Regularization, tf.data và so sánh kiến trúc.',
    levelRange: 'Nâng cao → Chuyên sâu',
    libraries: ['TensorFlow'],
  },
  {
    id: 'track12_kaggle',
    order: 12,
    title: 'Phần 12: Quy Trình Thi Đấu Kaggle & ML Production End-to-End',
    shortTitle: '12. Kaggle Competition E2E',
    description:
      '7 bước hoàn chỉnh của Grandmaster: Baseline nhanh, Audit Leakage, Adversarial Validation, FE theo CV, Tuning, Blend/Threshold và đóng gói .pkl.',
    levelRange: 'Nâng cao → Chuyên sâu',
    libraries: ['Kaggle E2E', 'Scikit-Learn'],
  },
];
