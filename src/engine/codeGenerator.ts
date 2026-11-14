import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import { NotebookCell, PipelineConfig } from '../types/studio';

function formatPyList(items: string[]): string {
  if (items.length === 0) return '[]';
  return '[' + items.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(', ') + ']';
}

export function generateCell1DataLoad(config: PipelineConfig): string {
  const sample =
    SAMPLE_DATASETS.find((s) => s.id === config.sampleDatasetId) || SAMPLE_DATASETS[0];

  let loadBlock = '';
  if (config.datasetSource === 'upload' && config.uploadedFileName) {
    loadBlock = `# Đọc dữ liệu từ file CSV người dùng đã tải lên
DATASET_NAME = '${config.uploadedFileName}'
csv_path = f'/tmp/{DATASET_NAME}' if os.path.exists(f'/tmp/{DATASET_NAME}') else DATASET_NAME
df = pd.read_csv(csv_path)`;
  } else if (config.datasetSource === 'cloud_url' && config.cloudDatasetUrl.trim()) {
    loadBlock = `# Tải trực tiếp Dataset từ URL / Kaggle / Đường dẫn Colab
DATASET_NAME = '${config.cloudDatasetUrl.trim().split('/').pop() || 'cloud_dataset.csv'}'
df = pd.read_csv('${config.cloudDatasetUrl.trim()}')`;
  } else {
    loadBlock = sample.pythonGeneratorCode;
  }

  return `# ==============================================================================
# [CELL 1] NẠP DỮ LIỆU & ĐỒNG BỘ DATA PROFILE (SCHEMA DISCOVERY)
# ==============================================================================
import os
import json
import time
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

warnings.filterwarnings('ignore')

${loadBlock}

print(f"✅ Đã nạp Dataset: {DATASET_NAME}")
print(f"📊 Kích thước: {df.shape[0]:,} dòng × {df.shape[1]} cột")
print(f"🎯 Cột mục tiêu (Target): '${config.targetColumn}' | Bài toán: ${config.taskType.toUpperCase()}")
print("\\n--- Tỷ lệ Missing Values (%) ở các cột có dữ liệu khuyết ---")
missing_s = (df.isna().sum() / len(df) * 100).round(2)
print(missing_s[missing_s > 0].to_string() if (missing_s > 0).any() else "Không có giá trị khuyết (0% NaN)")

# Tự động gửi gói JSON Data Profile nhẹ về giao diện Web Studio
if '_emit_data_profile' in globals():
    _emit_data_profile(df, DATASET_NAME)
`;
}

export function generateCell2Preprocess(config: PipelineConfig): string {
  const numImputerMap: Record<string, string> = {
    median: "SimpleImputer(strategy='median', add_indicator=" + (config.addMissingIndicator ? 'True' : 'False') + ')',
    mean: "SimpleImputer(strategy='mean', add_indicator=" + (config.addMissingIndicator ? 'True' : 'False') + ')',
    most_frequent: "SimpleImputer(strategy='most_frequent')",
    constant_zero: "SimpleImputer(strategy='constant', fill_value=0)",
  };

  const numScalerMap: Record<string, string> = {
    standard: 'StandardScaler()',
    robust: 'RobustScaler()',
    minmax: 'MinMaxScaler()',
    none: "'passthrough'",
  };

  const catImputerMap: Record<string, string> = {
    most_frequent: "SimpleImputer(strategy='most_frequent')",
    constant_missing: "SimpleImputer(strategy='constant', fill_value='Missing')",
  };

  const catEncoderCode =
    config.categoricalEncoder === 'onehot'
      ? `OneHotEncoder(handle_unknown='ignore', sparse_output=False, max_categories=${config.maxOneHotCategories})`
      : `OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)`;

  return `# ==============================================================================
# [CELL 2] THIẾT KẾ ANTI-LEAKAGE PREPROCESSING (COLUMNTRANSFORMER)
# 💡 Mọi phép tính (Median/Mean Imputation, Scaling, One-Hot) được đóng gói trong
#    Pipeline để CHỈ fit() trên tập Train của từng Fold, chống tuyệt đối Data Leakage!
# ==============================================================================
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, RobustScaler, MinMaxScaler, OneHotEncoder, OrdinalEncoder

TARGET_COL = '${config.targetColumn}'
DROP_COLS = ${formatPyList(config.dropColumns)}

# Tự động lọc các cột hợp lệ hiện có trong DataFrame df
requested_num_cols = ${formatPyList(config.numericColumns)}
requested_cat_cols = ${formatPyList(config.categoricalColumns)}

numeric_features = [c for c in requested_num_cols if c in df.columns and c != TARGET_COL and c not in DROP_COLS]
categorical_features = [c for c in requested_cat_cols if c in df.columns and c != TARGET_COL and c not in DROP_COLS]

# Nếu danh sách cột trống (VD: vừa đổi bộ dữ liệu mới), tự động suy luận thông minh
if not numeric_features and not categorical_features:
    feature_candidates = [c for c in df.columns if c != TARGET_COL and c not in DROP_COLS]
    numeric_features = [c for c in feature_candidates if pd.api.types.is_numeric_dtype(df[c])]
    categorical_features = [c for c in feature_candidates if not pd.api.types.is_numeric_dtype(df[c]) and df[c].nunique() <= 50]

numeric_transformer = Pipeline(steps=[
    ('imputer', ${numImputerMap[config.numericImputer]}),
    ('scaler', ${numScalerMap[config.numericScaler]})
])

categorical_transformer = Pipeline(steps=[
    ('imputer', ${catImputerMap[config.categoricalImputer]}),
    ('encoder', ${catEncoderCode})
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', numeric_transformer, numeric_features),
        ('cat', categorical_transformer, categorical_features)
    ],
    remainder='drop',
    verbose_feature_names_out=True
)

print(f"🛡️ Đã khởi tạo Anti-Leakage ColumnTransformer:")
print(f"   • Nhánh biến số (Numeric - {len(numeric_features)} cột): {numeric_features}")
print(f"   • Nhánh phân loại (Categorical - {len(categorical_features)} cột): {categorical_features}")
print(f"   • Cột loại bỏ (Dropped): {DROP_COLS}")
`;
}

export function generateCell3SplitCV(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';
  const stratifyExpr = isClass && config.stratifiedCV ? 'y' : 'None';
  const cvClass = isClass && config.stratifiedCV ? 'StratifiedKFold' : 'KFold';

  return `# ==============================================================================
# [CELL 3] PHÂN CHIA TRAIN / HOLDOUT TEST & THIẾT LẬP CROSS-VALIDATION
# ==============================================================================
from sklearn.model_selection import train_test_split, StratifiedKFold, KFold

# Loại bỏ các dòng bị khuyết ở biến mục tiêu (Target)
clean_df = df.dropna(subset=[TARGET_COL]).copy()
X = clean_df[numeric_features + categorical_features].copy()
y = clean_df[TARGET_COL].copy()

${
  isClass
    ? `# Đảm bảo nhãn phân loại ở dạng số nguyên (0, 1, ...)
if not pd.api.types.is_numeric_dtype(y):
    y = pd.factorize(y)[0]
else:
    y = y.astype(int)`
    : `y = y.astype(float)`
}

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=${config.testSize},
    random_state=${config.hyperparameters.randomState},
    stratify=${stratifyExpr}
)

cv_splitter = ${cvClass}(
    n_splits=${config.cvFolds},
    shuffle=True,
    random_state=${config.hyperparameters.randomState}
)

print(f"✂️ Đã chia dữ liệu chuẩn chống rò rỉ:")
print(f"   • Tập Train: {X_train.shape[0]:,} mẫu | Tập Holdout Test: {X_test.shape[0]:,} mẫu")
print(f"   • Chiến lược Cross-Validation: ${cvClass}(n_splits=${config.cvFolds})")
${
  isClass
    ? `class_counts = pd.Series(y_train).value_counts().to_dict()
print(f"   • Phân phối nhãn trên tập Train: {class_counts}")`
    : `print(f"   • Trung bình Target trên tập Train: {y_train.mean():.3f} ± {y_train.std():.3f}")`
}
`;
}

export function generateCell4ModelTrain(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';
  const hp = config.hyperparameters;
  const useBalancedWeight = isClass && config.imbalanceStrategy === 'class_weight';

  let modelInitBlock = '';
  switch (config.modelFamily) {
    case 'HistGradientBoosting':
      modelInitBlock = isClass
        ? `from sklearn.ensemble import HistGradientBoostingClassifier
estimator = HistGradientBoostingClassifier(
    max_iter=${hp.nEstimators},
    learning_rate=${hp.learningRate},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    l2_regularization=${hp.l2Regularization},
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "HistGradientBoostingClassifier"`
        : `from sklearn.ensemble import HistGradientBoostingRegressor
estimator = HistGradientBoostingRegressor(
    max_iter=${hp.nEstimators},
    learning_rate=${hp.learningRate},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    l2_regularization=${hp.l2Regularization},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "HistGradientBoostingRegressor"`;
      break;

    case 'RandomForest':
      modelInitBlock = isClass
        ? `from sklearn.ensemble import RandomForestClassifier
estimator = RandomForestClassifier(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "RandomForestClassifier"`
        : `from sklearn.ensemble import RandomForestRegressor
estimator = RandomForestRegressor(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "RandomForestRegressor"`;
      break;

    case 'ExtraTrees':
      modelInitBlock = isClass
        ? `from sklearn.ensemble import ExtraTreesClassifier
estimator = ExtraTreesClassifier(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "ExtraTreesClassifier"`
        : `from sklearn.ensemble import ExtraTreesRegressor
estimator = ExtraTreesRegressor(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "ExtraTreesRegressor"`;
      break;

    case 'LinearModel':
      modelInitBlock = isClass
        ? `from sklearn.linear_model import LogisticRegression
estimator = LogisticRegression(
    C=${(1.0 / Math.max(hp.l2Regularization, 0.05)).toFixed(2)},
    max_iter=500,
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "LogisticRegression"`
        : `from sklearn.linear_model import Ridge
estimator = Ridge(
    alpha=${hp.l2Regularization},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "RidgeRegression"`;
      break;

    case 'MLPNeuralNet':
      modelInitBlock = isClass
        ? `from sklearn.neural_network import MLPClassifier
estimator = MLPClassifier(
    hidden_layer_sizes=(128, 64),
    learning_rate_init=${hp.learningRate},
    alpha=${hp.l2Regularization},
    max_iter=${Math.min(hp.nEstimators, 300)},
    early_stopping=True,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "MLPNeuralNetClassifier"`
        : `from sklearn.neural_network import MLPRegressor
estimator = MLPRegressor(
    hidden_layer_sizes=(128, 64),
    learning_rate_init=${hp.learningRate},
    alpha=${hp.l2Regularization},
    max_iter=${Math.min(hp.nEstimators, 300)},
    early_stopping=True,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "MLPNeuralNetRegressor"`;
      break;

    case 'LightGBM':
      modelInitBlock = isClass
        ? `try:
    from lightgbm import LGBMClassifier
    estimator = LGBMClassifier(
        n_estimators=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        num_leaves=${Math.min(127, Math.pow(2, hp.maxDepth) - 1)},
        subsample=${hp.subsample},
        reg_lambda=${hp.l2Regularization},
        class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
        random_state=${hp.randomState},
        verbose=-1
    )
    ACTIVE_MODEL_NAME = "LightGBMClassifier (Cloud Native)"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    print("ℹ️ Đang chạy trên Browser Wasm -> dùng HistGradientBoosting (thuật toán LightGBM trong sklearn)")
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "LightGBM (HistGB-Wasm)"`
        : `try:
    from lightgbm import LGBMRegressor
    estimator = LGBMRegressor(
        n_estimators=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        subsample=${hp.subsample},
        reg_lambda=${hp.l2Regularization},
        random_state=${hp.randomState},
        verbose=-1
    )
    ACTIVE_MODEL_NAME = "LightGBMRegressor (Cloud Native)"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "LightGBM (HistGB-Wasm)"`;
      break;

    case 'XGBoost':
      modelInitBlock = isClass
        ? `try:
    from xgboost import XGBClassifier
    estimator = XGBClassifier(
        n_estimators=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        subsample=${hp.subsample},
        reg_lambda=${hp.l2Regularization},
        eval_metric='logloss',
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoostClassifier"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    print("ℹ️ XGBoost C++ yêu cầu Cloud Runtime (Colab/Kaggle) -> tự động chuyển sang HistGradientBoosting trên Wasm")
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoost (HistGB-Fallback)"`
        : `try:
    from xgboost import XGBRegressor
    estimator = XGBRegressor(
        n_estimators=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        subsample=${hp.subsample},
        reg_lambda=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoostRegressor"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoost (HistGB-Fallback)"`;
      break;

    case 'CatBoost':
      modelInitBlock = isClass
        ? `try:
    from catboost import CatBoostClassifier
    estimator = CatBoostClassifier(
        iterations=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        depth=${Math.min(hp.maxDepth, 10)},
        l2_leaf_reg=${hp.l2Regularization},
        verbose=0,
        random_seed=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoostClassifier"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    print("ℹ️ CatBoost yêu cầu Cloud Runtime (Colab/Kaggle) -> tự động dùng HistGradientBoosting trên Wasm")
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoost (HistGB-Fallback)"`
        : `try:
    from catboost import CatBoostRegressor
    estimator = CatBoostRegressor(
        iterations=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        depth=${Math.min(hp.maxDepth, 10)},
        l2_leaf_reg=${hp.l2Regularization},
        verbose=0,
        random_seed=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoostRegressor"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoost (HistGB-Fallback)"`;
      break;
  }

  const oversampleBlock =
    isClass && config.imbalanceStrategy === 'random_oversample'
      ? `# Cân bằng lớp thiểu số CHỈ trên tập X_train, y_train (Không chạm vào tập Test!)
from sklearn.utils import resample
train_combined = X_train.copy()
train_combined['__target__'] = y_train.values
maj_class = train_combined['__target__'].mode()[0]
df_maj = train_combined[train_combined['__target__'] == maj_class]
df_min = train_combined[train_combined['__target__'] != maj_class]
df_min_upsampled = resample(df_min, replace=True, n_samples=len(df_maj), random_state=${hp.randomState})
train_balanced = pd.concat([df_maj, df_min_upsampled]).sample(frac=1.0, random_state=${hp.randomState})
X_train_fit = train_balanced.drop(columns=['__target__'])
y_train_fit = train_balanced['__target__']
print(f"⚖️ Random Oversampling (Train Only): Tăng mẫu từ {len(X_train)} -> {len(X_train_fit)} mẫu cân bằng")`
      : `X_train_fit, y_train_fit = X_train, y_train`;

  return `# ==============================================================================
# [CELL 4] KHỞI TẠO PIPELINE HOÀN CHỈNH & HUẤN LUYỆN K-FOLD CROSS-VALIDATION
# ==============================================================================
from sklearn.base import clone
from sklearn.metrics import roc_auc_score, f1_score, root_mean_squared_error, r2_score

${modelInitBlock}

full_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('model', estimator)
])

${oversampleBlock}

print(f"🚀 Bắt đầu huấn luyện {ACTIVE_MODEL_NAME} với ${config.cvFolds}-Fold Cross-Validation...")
cv_scores = []
train_start_t = time.perf_counter()

for fold_idx, (tr_idx, val_idx) in enumerate(cv_splitter.split(X_train, y_train), start=1):
    f_t0 = time.perf_counter()
    X_fold_tr, y_fold_tr = X_train.iloc[tr_idx], y_train.iloc[tr_idx]
    X_fold_val, y_fold_val = X_train.iloc[val_idx], y_train.iloc[val_idx]

    fold_pipe = clone(full_pipeline)
    fold_pipe.fit(X_fold_tr, y_fold_tr)

${
  isClass
    ? `    if hasattr(fold_pipe, "predict_proba"):
        val_probs = fold_pipe.predict_proba(X_fold_val)[:, 1]
        score = roc_auc_score(y_fold_val, val_probs)
        metric_label = "ROC-AUC"
    else:
        val_preds = fold_pipe.predict(X_fold_val)
        score = f1_score(y_fold_val, val_preds, average='weighted')
        metric_label = "F1"`
    : `    val_preds = fold_pipe.predict(X_fold_val)
    score = root_mean_squared_error(y_fold_val, val_preds)
    metric_label = "RMSE"`
}
    cv_scores.append(float(score))
    print(f"   • [Fold {fold_idx}/${config.cvFolds}] {metric_label}: {score:.4f} ({(time.perf_counter() - f_t0)*1000:.0f} ms)")

cv_mean = float(np.mean(cv_scores))
cv_std = float(np.std(cv_scores))
print(f"📊 Trung bình CV ({metric_label}): {cv_mean:.4f} ± {cv_std:.4f}")

# Fit mô hình cuối cùng trên toàn bộ tập Train
full_pipeline.fit(X_train_fit, y_train_fit)
total_train_ms = int((time.perf_counter() - train_start_t) * 1000)
print(f"✅ Huấn luyện hoàn tất full_pipeline trong {total_train_ms} ms!")
`;
}

export function generateCell5Evaluate(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';

  if (isClass) {
    return `# ==============================================================================
# [CELL 5] ĐÁNH GIÁ TRÊN TẬP HOLDOUT TEST, VẼ BIỂU ĐỒ & GHI LEADERBOARD
# ==============================================================================
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix
)
from sklearn.inspection import permutation_importance

y_pred = full_pipeline.predict(X_test)
if hasattr(full_pipeline, "predict_proba"):
    y_prob = full_pipeline.predict_proba(X_test)[:, 1]
else:
    y_prob = y_pred.astype(float)

acc = float(accuracy_score(y_test, y_pred))
prec = float(precision_score(y_test, y_pred, zero_division=0))
rec = float(recall_score(y_test, y_pred, zero_division=0))
f1 = float(f1_score(y_test, y_pred, zero_division=0))
auc_val = float(roc_auc_score(y_test, y_prob))
cm = confusion_matrix(y_test, y_pred).tolist()

fpr_arr, tpr_arr, _ = roc_curve(y_test, y_prob)
step_stride = max(1, len(fpr_arr) // 35)
roc_points = [
    {"fpr": round(float(fpr_arr[i]), 4), "tpr": round(float(tpr_arr[i]), 4)}
    for i in range(0, len(fpr_arr), step_stride)
]
if roc_points[-1]["fpr"] < 1.0:
    roc_points.append({"fpr": 1.0, "tpr": 1.0})

# Trích xuất mức độ quan trọng của các biến (Feature Importance)
perm_res = permutation_importance(
    full_pipeline, X_test, y_test, n_repeats=5, random_state=42, scoring='roc_auc'
)
raw_feat_names = numeric_features + categorical_features
fi_pairs = sorted(
    zip(raw_feat_names, perm_res.importances_mean),
    key=lambda x: abs(x[1]),
    reverse=True
)[:10]
feature_importance_list = [
    {"feature": str(k), "importance": round(float(max(v, 0.001)), 4)}
    for k, v in fi_pairs
]

print("=" * 64)
print(f"🏆 KẾT QUẢ ĐÁNH GIÁ HOLDOUT TEST — {ACTIVE_MODEL_NAME}")
print("=" * 64)
print(f"   • ROC-AUC   : {auc_val:.4f}   (CV Mean: {cv_mean:.4f} ± {cv_std:.4f})")
print(f"   • F1-Score  : {f1:.4f}")
print(f"   • Accuracy  : {acc:.4f}")
print(f"   • Precision : {prec:.4f}   | Recall: {rec:.4f}")
print("=" * 64)

# Vẽ bộ 3 biểu đồ chẩn đoán mô hình (Dark Studio Theme)
plt.style.use('dark_background')
fig, axes = plt.subplots(1, 3, figsize=(14.5, 4.2), dpi=120)
fig.patch.set_facecolor('#0f172a')

# 1. Đường cong ROC
axes[0].set_facecolor('#1e293b')
axes[0].plot(fpr_arr, tpr_arr, color='#6366f1', lw=2.5, label=f'AUC = {auc_val:.4f}')
axes[0].plot([0, 1], [0, 1], color='#64748b', linestyle='--', lw=1.2)
axes[0].fill_between(fpr_arr, tpr_arr, alpha=0.18, color='#6366f1')
axes[0].set_title('ROC Curve (Holdout Test)', fontsize=11, fontweight='bold', color='#f8fafc')
axes[0].set_xlabel('False Positive Rate')
axes[0].set_ylabel('True Positive Rate')
axes[0].legend(loc='lower right')
axes[0].grid(alpha=0.15)

# 2. Ma trận nhầm lẫn (Confusion Matrix)
axes[1].set_facecolor('#1e293b')
cm_np = np.array(cm)
im = axes[1].imshow(cm_np, cmap='Blues')
axes[1].set_title('Confusion Matrix', fontsize=11, fontweight='bold', color='#f8fafc')
axes[1].set_xlabel('Predicted Label')
axes[1].set_ylabel('Actual Label')
axes[1].set_xticks([0, 1])
axes[1].set_yticks([0, 1])
for i in range(cm_np.shape[0]):
    for j in range(cm_np.shape[1]):
        axes[1].text(j, i, f"{cm_np[i, j]}", ha="center", va="center", color="white", fontsize=12, fontweight="bold")

# 3. Top Feature Importances
axes[2].set_facecolor('#1e293b')
top_names = [x['feature'] for x in reversed(feature_importance_list[:8])]
top_vals = [x['importance'] for x in reversed(feature_importance_list[:8])]
axes[2].barh(top_names, top_vals, color='#10b981', height=0.6)
axes[2].set_title('Top Permutation Importance', fontsize=11, fontweight='bold', color='#f8fafc')
axes[2].set_xlabel('Mean AUC Drop')
axes[2].grid(axis='x', alpha=0.15)

plt.tight_layout()

# Đóng gói kết quả để tự động lưu vào Experiment Leaderboard
_automl_experiment_result = {
    "model_name": ACTIVE_MODEL_NAME,
    "task_type": "classification",
    "metrics": {
        "roc_auc": round(auc_val, 4),
        "f1": round(f1, 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "cv_mean": round(cv_mean, 4),
        "cv_std": round(cv_std, 4)
    },
    "feature_importance": feature_importance_list,
    "roc_curve": roc_points,
    "confusion_matrix": cm
}
`;
  }

  return `# ==============================================================================
# [CELL 5] ĐÁNH GIÁ HỒI QUY (REGRESSION METRICS), BIỂU ĐỒ & LEADERBOARD
# ==============================================================================
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
from sklearn.inspection import permutation_importance

y_pred = full_pipeline.predict(X_test)
rmse_val = float(root_mean_squared_error(y_test, y_pred))
mae_val = float(mean_absolute_error(y_test, y_pred))
r2_val = float(r2_score(y_test, y_pred))

perm_res = permutation_importance(
    full_pipeline, X_test, y_test, n_repeats=5, random_state=42, scoring='r2'
)
raw_feat_names = numeric_features + categorical_features
fi_pairs = sorted(
    zip(raw_feat_names, perm_res.importances_mean),
    key=lambda x: abs(x[1]),
    reverse=True
)[:10]
feature_importance_list = [
    {"feature": str(k), "importance": round(float(max(v, 0.001)), 4)}
    for k, v in fi_pairs
]

print("=" * 64)
print(f"🏆 KẾT QUẢ ĐÁNH GIÁ REGRESSION — {ACTIVE_MODEL_NAME}")
print("=" * 64)
print(f"   • RMSE (Sai số căn bậc 2) : {rmse_val:.4f} (CV Mean: {cv_mean:.4f})")
print(f"   • MAE  (Sai số tuyệt đối) : {mae_val:.4f}")
print(f"   • R² Score                : {r2_val:.4f}")
print("=" * 64)

plt.style.use('dark_background')
fig, axes = plt.subplots(1, 2, figsize=(11.5, 4.2), dpi=120)
fig.patch.set_facecolor('#0f172a')

axes[0].set_facecolor('#1e293b')
axes[0].scatter(y_test, y_pred, alpha=0.65, color='#6366f1', edgecolors='none', s=32)
min_v, max_v = float(min(y_test.min(), y_pred.min())), float(max(y_test.max(), y_pred.max()))
axes[0].plot([min_v, max_v], [min_v, max_v], '--', color='#f43f5e', lw=2)
axes[0].set_title(f'Actual vs Predicted (R² = {r2_val:.3f})', fontsize=11, fontweight='bold')
axes[0].set_xlabel('Actual Target')
axes[0].set_ylabel('Predicted Target')
axes[0].grid(alpha=0.15)

axes[1].set_facecolor('#1e293b')
top_names = [x['feature'] for x in reversed(feature_importance_list[:8])]
top_vals = [x['importance'] for x in reversed(feature_importance_list[:8])]
axes[1].barh(top_names, top_vals, color='#10b981', height=0.6)
axes[1].set_title('Top Permutation Importance (R² Drop)', fontsize=11, fontweight='bold')
axes[1].grid(axis='x', alpha=0.15)

plt.tight_layout()

_automl_experiment_result = {
    "model_name": ACTIVE_MODEL_NAME,
    "task_type": "regression",
    "metrics": {
        "rmse": round(rmse_val, 4),
        "mae": round(mae_val, 4),
        "r2": round(r2_val, 4),
        "cv_mean": round(cv_mean, 4),
        "cv_std": round(cv_std, 4)
    },
    "feature_importance": feature_importance_list
}
`;
}

export function buildAllPipelineCells(
  config: PipelineConfig,
  existingCells?: NotebookCell[]
): NotebookCell[] {
  const templates: {
    id: string;
    order: number;
    stepType: NotebookCell['stepType'];
    title: string;
    subtitle: string;
    code: string;
  }[] = [
    {
      id: 'cell_01_load',
      order: 1,
      stepType: 'data_load',
      title: '01. Data Ingestion & Schema Profiling',
      subtitle: 'Nạp dữ liệu & tự động trích xuất Data Profile JSON',
      code: generateCell1DataLoad(config),
    },
    {
      id: 'cell_02_preprocess',
      order: 2,
      stepType: 'preprocess',
      title: '02. Anti-Leakage ColumnTransformer',
      subtitle: 'Đóng gói Imputer, Scaler & Encoder chống rò rỉ dữ liệu',
      code: generateCell2Preprocess(config),
    },
    {
      id: 'cell_03_split',
      order: 3,
      stepType: 'split_cv',
      title: '03. Stratified Split & Cross-Validation',
      subtitle: 'Tách tập Holdout Test & cấu hình K-Fold CV',
      code: generateCell3SplitCV(config),
    },
    {
      id: 'cell_04_train',
      order: 4,
      stepType: 'model_train',
      title: `04. Pipeline Training (${config.modelFamily})`,
      subtitle: 'Huấn luyện Pipeline qua từng Fold & xử lý mất cân bằng mẫu',
      code: generateCell4ModelTrain(config),
    },
    {
      id: 'cell_05_eval',
      order: 5,
      stepType: 'evaluate',
      title: '05. Holdout Diagnostics & Leaderboard Sync',
      subtitle: 'Đánh giá độc lập, vẽ biểu đồ ROC/CM/Importance & lưu Leaderboard',
      code: generateCell5Evaluate(config),
    },
  ];

  if (!existingCells || existingCells.length === 0) {
    return templates.map((t) => ({
      id: t.id,
      order: t.order,
      stepType: t.stepType,
      title: t.title,
      subtitle: t.subtitle,
      generatedCode: t.code,
      currentCode: t.code,
      isLocked: false,
      status: 'idle',
      outputText: '',
      figures: [],
    }));
  }

  // Giữ nguyên các cell đã bị khóa (Custom Locked) và các cell Custom do người dùng thêm
  const updatedStandardCells = templates.map((t) => {
    const prev = existingCells.find((c) => c.id === t.id || c.stepType === t.stepType);
    if (!prev) {
      return {
        id: t.id,
        order: t.order,
        stepType: t.stepType,
        title: t.title,
        subtitle: t.subtitle,
        generatedCode: t.code,
        currentCode: t.code,
        isLocked: false,
        status: 'idle' as const,
        outputText: '',
        figures: [],
      };
    }

    return {
      ...prev,
      title: t.title,
      subtitle: t.subtitle,
      generatedCode: t.code,
      // Chỉ cập nhật currentCode nếu Cell KHÔNG bị khóa (isLocked === false)
      currentCode: prev.isLocked ? prev.currentCode : t.code,
    };
  });

  const customCells = existingCells.filter((c) => c.stepType === 'custom');
  return [...updatedStandardCells, ...customCells];
}
