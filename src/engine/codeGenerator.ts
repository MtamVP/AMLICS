import { NotebookCell, PipelineConfig, PipelineTemplateId } from '../types/studio';

function formatPyList(items: string[]): string {
  if (items.length === 0) return '[]';
  return '[' + items.map((s) => `'${s.replace(/'/g, "\\'")}'`).join(', ') + ']';
}

export function normalizeUrlForPython(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const ghMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/(.+)$/i
  );
  if (ghMatch) {
    return `https://raw.githubusercontent.com/${ghMatch[1]}/${ghMatch[2]}/${ghMatch[3]}`;
  }
  const gdriveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  if (gdriveMatch && trimmed.includes('drive.google.com')) {
    return `https://drive.google.com/uc?export=download&id=${gdriveMatch[1]}`;
  }
  return trimmed;
}

export function generateCell1DataLoad(config: PipelineConfig): string {
  let loadBlock = '';

  if (config.datasetSource === 'upload') {
    const safeFile = (config.uploadedFileName || 'train.csv').replace(/'/g, "\\'");
    loadBlock = `DATASET_NAME = '${safeFile}'
csv_path = f'/tmp/{DATASET_NAME}' if os.path.exists(f'/tmp/{DATASET_NAME}') else DATASET_NAME
if not os.path.exists(csv_path):
    raise FileNotFoundError(
        f"Chưa tìm thấy file '{DATASET_NAME}'. Hãy bấm nút 'Upload CSV' (hoặc chọn tab Public URL) ở cột trái để nạp dữ liệu."
    )
df = pd.read_csv(csv_path)`;
  } else if (config.datasetSource === 'cloud_path') {
    const cPath = (config.cloudDatasetPath.trim() || '/kaggle/input/dataset/train.csv').replace(
      /'/g,
      "\\'"
    );
    const baseName = cPath.split('/').pop() || 'cloud_dataset.csv';
    loadBlock = `DATASET_NAME = '${baseName}'
df = pd.read_csv('${cPath}')`;
  } else {
    const normUrl = normalizeUrlForPython(
      config.publicDatasetUrl ||
        'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv'
    ).replace(/'/g, "\\'");
    const baseName = normUrl.split('/').pop()?.split('?')[0] || 'remote_dataset.csv';
    loadBlock = `DATASET_NAME = '${baseName}'
DATASET_URL = '${normUrl}'
# Use cached file if pre-fetched in browser Wasm, otherwise read directly from URL
if os.path.exists('/tmp/_cached_url_dataset.csv'):
    df = pd.read_csv('/tmp/_cached_url_dataset.csv')
else:
    df = pd.read_csv(DATASET_URL)`;
  }

  const testLoadBlock = config.testUploadedFileName
    ? `
# Load Kaggle / Competition Test Dataset for submission.csv generation
TEST_DATASET_NAME = '${config.testUploadedFileName.replace(/'/g, "\\'")}'
test_csv_path = f'/tmp/{TEST_DATASET_NAME}' if os.path.exists(f'/tmp/{TEST_DATASET_NAME}') else TEST_DATASET_NAME
if os.path.exists(test_csv_path):
    df_test = pd.read_csv(test_csv_path)
    print(f"Test set: {TEST_DATASET_NAME} ({df_test.shape[0]:,} rows, {df_test.shape[1]} cols)")`
    : '';

  const subsampleBlock =
    config.subsampleRows > 0
      ? `
# Subsample large dataset for fast interactive iteration
if len(df) > ${config.subsampleRows}:
    print(f"Subsampling dataset from {len(df):,} -> ${config.subsampleRows.toLocaleString()} rows (random_state=${config.hyperparameters.randomState})")
    df = df.sample(n=${config.subsampleRows}, random_state=${config.hyperparameters.randomState}).reset_index(drop=True)`
      : '';

  return `# [1] Load Dataset & Sync Schema Profile
import os
import json
import time
import warnings
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

warnings.filterwarnings('ignore')

${loadBlock}${testLoadBlock}${subsampleBlock}

print(f"Dataset : {DATASET_NAME} ({df.shape[0]:,} rows, {df.shape[1]} cols)")
print(f"Target  : '${config.targetColumn.replace(/'/g, "\\'")}' | Task: ${config.taskType}")

missing_s = (df.isna().sum() / len(df) * 100).round(2)
missing_cols = missing_s[missing_s > 0]
if len(missing_cols) > 0:
    print("Missing (%):", missing_cols.to_dict())

if '_emit_data_profile' in globals():
    _emit_data_profile(df, DATASET_NAME)
`;
}

export function generateCell2Preprocess(config: PipelineConfig): string {
  const numImputerMap: Record<string, string> = {
    median:
      "SimpleImputer(strategy='median', add_indicator=" +
      (config.addMissingIndicator ? 'True' : 'False') +
      ')',
    mean:
      "SimpleImputer(strategy='mean', add_indicator=" +
      (config.addMissingIndicator ? 'True' : 'False') +
      ')',
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

  const logStepCode = config.logTransformNumeric
    ? `\n    ('log_transform', FunctionTransformer(lambda x: np.sign(x) * np.log1p(np.abs(np.nan_to_num(x, nan=0.0))))),`
    : '';

  return `# [2] Anti-Leakage Preprocessing (ColumnTransformer)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import (
    StandardScaler, RobustScaler, MinMaxScaler,
    OneHotEncoder, OrdinalEncoder, FunctionTransformer
)

TARGET_COL = '${config.targetColumn.replace(/'/g, "\\'")}'
DROP_COLS = ${formatPyList(config.dropColumns)}

requested_num_cols = ${formatPyList(config.numericColumns)}
requested_cat_cols = ${formatPyList(config.categoricalColumns)}

numeric_features = [c for c in requested_num_cols if c in df.columns and c != TARGET_COL and c not in DROP_COLS]
categorical_features = [c for c in requested_cat_cols if c in df.columns and c != TARGET_COL and c not in DROP_COLS]

# Safeguard: Auto-exclude ID/constant columns if feature lists are empty
if not numeric_features and not categorical_features:
    for c in df.columns:
        if c == TARGET_COL or c in DROP_COLS:
            continue
        c_low = str(c).lower()
        if c_low in ('id', 'index', 'uuid', 'passengerid', 'customerid') or c_low.endswith('_id'):
            DROP_COLS.append(c)
            continue
        if df[c].nunique(dropna=True) <= 1:
            DROP_COLS.append(c)
            continue
        if pd.api.types.is_numeric_dtype(df[c]):
            if len(df) >= 20 and pd.api.types.is_integer_dtype(df[c]) and (df[c].nunique() / len(df)) >= 0.95:
                DROP_COLS.append(c)
            else:
                numeric_features.append(c)
        elif df[c].nunique(dropna=True) <= 50:
            categorical_features.append(c)
        else:
            DROP_COLS.append(c)

numeric_transformer = Pipeline(steps=[
    ('imputer', ${numImputerMap[config.numericImputer]}),${logStepCode}
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

print(f"ColumnTransformer configured:")
print(f"  Numeric ({len(numeric_features)})     : {numeric_features}")
print(f"  Categorical ({len(categorical_features)}) : {categorical_features}")
if DROP_COLS:
    print(f"  Dropped ({len(DROP_COLS)})     : {DROP_COLS}")
`;
}

export function generateCell3SplitCV(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';
  const isTimeSeries = config.cvStrategy === 'timeseries_split';
  const isGroup = config.cvStrategy === 'group_kfold';
  const isStratified = isClass && config.cvStrategy === 'stratified_kfold';

  const stratifyExpr = isStratified && !isTimeSeries ? 'y' : 'None';
  const shuffleSplit = isTimeSeries ? 'False' : 'True';

  let cvInitCode = '';
  if (isTimeSeries) {
    cvInitCode = `from sklearn.model_selection import TimeSeriesSplit
cv_splitter = TimeSeriesSplit(n_splits=${config.cvFolds})`;
  } else if (isGroup) {
    cvInitCode = `from sklearn.model_selection import GroupKFold
cv_splitter = GroupKFold(n_splits=${config.cvFolds})
GROUP_COL = '${(config.groupColumn || '').replace(/'/g, "\\'")}'`;
  } else if (isStratified) {
    cvInitCode = `from sklearn.model_selection import StratifiedKFold
cv_splitter = StratifiedKFold(n_splits=${config.cvFolds}, shuffle=True, random_state=${config.hyperparameters.randomState})`;
  } else {
    cvInitCode = `from sklearn.model_selection import KFold
cv_splitter = KFold(n_splits=${config.cvFolds}, shuffle=True, random_state=${config.hyperparameters.randomState})`;
  }

  return `# [3] Train / Holdout Split & Cross-Validation Setup
from sklearn.model_selection import train_test_split
${cvInitCode}

clean_df = df.dropna(subset=[TARGET_COL]).copy()
X = clean_df[numeric_features + categorical_features].copy()
y = clean_df[TARGET_COL].copy()

${
  isClass
    ? `if not pd.api.types.is_numeric_dtype(y):
    y = pd.Series(pd.factorize(y)[0], index=clean_df.index)
else:
    y = y.astype(int)`
    : `y = y.astype(float)`
}

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=${config.testSize},
    shuffle=${shuffleSplit},
    random_state=${config.hyperparameters.randomState},
    stratify=${stratifyExpr}
)

print(f"Split: Train={X_train.shape[0]:,} | Holdout Test={X_test.shape[0]:,} | CV=${config.cvStrategy}(n_splits=${config.cvFolds})")
${
  isClass
    ? `print("Train class distribution:", pd.Series(y_train).value_counts().to_dict())`
    : `print(f"Train target mean={y_train.mean():.3f}, std={y_train.std():.3f}")`
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
    early_stopping=True,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "HistGradientBoosting"`
        : `from sklearn.ensemble import HistGradientBoostingRegressor
estimator = HistGradientBoostingRegressor(
    max_iter=${hp.nEstimators},
    learning_rate=${hp.learningRate},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    l2_regularization=${hp.l2Regularization},
    early_stopping=True,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "HistGradientBoosting"`;
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
ACTIVE_MODEL_NAME = "RandomForest"`
        : `from sklearn.ensemble import RandomForestRegressor
estimator = RandomForestRegressor(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "RandomForest"`;
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
ACTIVE_MODEL_NAME = "ExtraTrees"`
        : `from sklearn.ensemble import ExtraTreesRegressor
estimator = ExtraTreesRegressor(
    n_estimators=${hp.nEstimators},
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    n_jobs=-1,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "ExtraTrees"`;
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
ACTIVE_MODEL_NAME = "Ridge"`;
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
ACTIVE_MODEL_NAME = "MLPNeuralNet"`
        : `from sklearn.neural_network import MLPRegressor
estimator = MLPRegressor(
    hidden_layer_sizes=(128, 64),
    learning_rate_init=${hp.learningRate},
    alpha=${hp.l2Regularization},
    max_iter=${Math.min(hp.nEstimators, 300)},
    early_stopping=True,
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "MLPNeuralNet"`;
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
    ACTIVE_MODEL_NAME = "LightGBM"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "LightGBM (HistGB)"`
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
    ACTIVE_MODEL_NAME = "LightGBM"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "LightGBM (HistGB)"`;
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
    ACTIVE_MODEL_NAME = "XGBoost"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoost (HistGB)"`
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
    ACTIVE_MODEL_NAME = "XGBoost"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "XGBoost (HistGB)"`;
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
    ACTIVE_MODEL_NAME = "CatBoost"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingClassifier
    estimator = HistGradientBoostingClassifier(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoost (HistGB)"`
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
    ACTIVE_MODEL_NAME = "CatBoost"
except ImportError:
    from sklearn.ensemble import HistGradientBoostingRegressor
    estimator = HistGradientBoostingRegressor(
        max_iter=${hp.nEstimators},
        learning_rate=${hp.learningRate},
        max_depth=${hp.maxDepth},
        l2_regularization=${hp.l2Regularization},
        random_state=${hp.randomState}
    )
    ACTIVE_MODEL_NAME = "CatBoost (HistGB)"`;
      break;
  }

  const oversampleBlock =
    isClass && config.imbalanceStrategy === 'random_oversample'
      ? `from sklearn.utils import resample
train_combined = X_train.copy()
train_combined['__target__'] = y_train.values
maj_class = train_combined['__target__'].mode()[0]
df_maj = train_combined[train_combined['__target__'] == maj_class]
df_min = train_combined[train_combined['__target__'] != maj_class]
df_min_upsampled = resample(df_min, replace=True, n_samples=len(df_maj), random_state=${hp.randomState})
train_balanced = pd.concat([df_maj, df_min_upsampled]).sample(frac=1.0, random_state=${hp.randomState})
X_train_fit = train_balanced.drop(columns=['__target__'])
y_train_fit = train_balanced['__target__']
print(f"Oversampled train set: {len(X_train)} -> {len(X_train_fit)} rows")`
      : `X_train_fit, y_train_fit = X_train, y_train`;

  const tuningBlock =
    config.tuningStrategy === 'randomized_search'
      ? `
# Automated Hyperparameter Tuning via RandomizedSearchCV
from sklearn.model_selection import RandomizedSearchCV
param_dist = {}
if hasattr(estimator, 'max_depth'):
    param_dist['model__max_depth'] = [3, 5, 7, 10]
if hasattr(estimator, 'learning_rate'):
    param_dist['model__learning_rate'] = [0.02, 0.05, 0.1, 0.15]
if hasattr(estimator, 'min_samples_leaf'):
    param_dist['model__min_samples_leaf'] = [5, 15, 30]

if param_dist:
    print(f"Running RandomizedSearchCV (n_iter=${config.tuningIterations})...")
    search = RandomizedSearchCV(
        full_pipeline,
        param_distributions=param_dist,
        n_iter=${config.tuningIterations},
        cv=3,
        scoring='${isClass ? 'roc_auc' : 'neg_root_mean_squared_error'}',
        random_state=${hp.randomState}
    )
    search.fit(X_train_fit, y_train_fit)
    full_pipeline = search.best_estimator_
    print("Best tuned params:", search.best_params_)
else:
    full_pipeline.fit(X_train_fit, y_train_fit)`
      : `full_pipeline.fit(X_train_fit, y_train_fit)`;

  const splitCallExpr =
    config.cvStrategy === 'group_kfold' && config.groupColumn
      ? `cv_splitter.split(X_train, y_train, groups=clean_df.loc[X_train.index, GROUP_COL] if GROUP_COL in clean_df.columns else X_train.iloc[:, 0])`
      : `cv_splitter.split(X_train, y_train)`;

  return `# [4] Pipeline Training & Cross-Validation
from sklearn.base import clone
from sklearn.metrics import roc_auc_score, f1_score, root_mean_squared_error, r2_score

${modelInitBlock}

full_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('model', estimator)
])

${oversampleBlock}

print(f"Training {ACTIVE_MODEL_NAME} (${config.cvFolds}-Fold CV)...")
cv_scores = []
train_start_t = time.perf_counter()

for fold_idx, (tr_idx, val_idx) in enumerate(${splitCallExpr}, start=1):
    f_t0 = time.perf_counter()
    X_fold_tr, y_fold_tr = X_train.iloc[tr_idx], y_train.iloc[tr_idx]
    X_fold_val, y_fold_val = X_train.iloc[val_idx], y_train.iloc[val_idx]

    fold_pipe = clone(full_pipeline)
    fold_pipe.fit(X_fold_tr, y_fold_tr)

${
  isClass
    ? `    if hasattr(fold_pipe, "predict_proba") and len(np.unique(y_fold_val)) == 2:
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
    print(f"  Fold {fold_idx}/${config.cvFolds} | {metric_label}: {score:.4f} ({(time.perf_counter() - f_t0)*1000:.0f} ms)")

cv_mean = float(np.mean(cv_scores))
cv_std = float(np.std(cv_scores))
${tuningBlock}

# Compute Train Score to check for Overfitting (Train vs CV gap)
${
  isClass
    ? `if hasattr(full_pipeline, "predict_proba") and len(np.unique(y_train)) == 2:
    train_score = float(roc_auc_score(y_train, full_pipeline.predict_proba(X_train)[:, 1]))
else:
    train_score = float(f1_score(y_train, full_pipeline.predict(X_train), average='weighted'))`
    : `train_score = float(root_mean_squared_error(y_train, full_pipeline.predict(X_train)))`
}
total_train_ms = int((time.perf_counter() - train_start_t) * 1000)
print(f"Summary -> Train {metric_label}: {train_score:.4f} | CV {metric_label}: {cv_mean:.4f} +/- {cv_std:.4f} ({total_train_ms} ms)")
`;
}

export function generateCell5Evaluate(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';
  const idCol = (config.idColumnForSubmission || 'id').replace(/'/g, "\\'");

  const submissionExportBlock = `
# Export predictions to submission.csv (uses df_test if loaded, otherwise holdout X_test)
sub_source_df = df_test if 'df_test' in globals() and isinstance(df_test, pd.DataFrame) else clean_df.loc[X_test.index]
sub_X = sub_source_df[[c for c in (numeric_features + categorical_features) if c in sub_source_df.columns]]
${
  isClass
    ? `sub_preds = full_pipeline.predict_proba(sub_X)[:, 1] if hasattr(full_pipeline, "predict_proba") else full_pipeline.predict(sub_X)`
    : `sub_preds = full_pipeline.predict(sub_X)`
}
id_col_name = '${idCol}' if '${idCol}' in sub_source_df.columns else sub_source_df.columns[0]
submission_df = pd.DataFrame({
    id_col_name: sub_source_df[id_col_name].values if id_col_name in sub_source_df.columns else np.arange(len(sub_X)),
    TARGET_COL: np.round(sub_preds, 6)
})
submission_df.to_csv('/tmp/submission.csv', index=False) if os.path.exists('/tmp') else None
submission_df.to_csv('submission.csv', index=False)
print(f"Saved submission.csv ({len(submission_df):,} rows, columns: {list(submission_df.columns)})")`;

  if (isClass) {
    return `# [5] Holdout Evaluation, Diagnostics & submission.csv Export
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix
)
from sklearn.inspection import permutation_importance

y_pred = full_pipeline.predict(X_test)
if hasattr(full_pipeline, "predict_proba") and len(np.unique(y_test)) == 2:
    y_prob = full_pipeline.predict_proba(X_test)[:, 1]
    auc_val = float(roc_auc_score(y_test, y_prob))
else:
    y_prob = y_pred.astype(float)
    auc_val = float(f1_score(y_test, y_pred, average='weighted'))

acc = float(accuracy_score(y_test, y_pred))
prec = float(precision_score(y_test, y_pred, average='binary' if len(np.unique(y_test)) == 2 else 'weighted', zero_division=0))
rec = float(recall_score(y_test, y_pred, average='binary' if len(np.unique(y_test)) == 2 else 'weighted', zero_division=0))
f1 = float(f1_score(y_test, y_pred, average='binary' if len(np.unique(y_test)) == 2 else 'weighted', zero_division=0))
cm = confusion_matrix(y_test, y_pred).tolist()

if len(np.unique(y_test)) == 2:
    fpr_arr, tpr_arr, _ = roc_curve(y_test, y_prob)
else:
    fpr_arr, tpr_arr = np.array([0.0, 1.0]), np.array([0.0, 1.0])

step_stride = max(1, len(fpr_arr) // 35)
roc_points = [
    {"fpr": round(float(fpr_arr[i]), 4), "tpr": round(float(tpr_arr[i]), 4)}
    for i in range(0, len(fpr_arr), step_stride)
]
if roc_points[-1]["fpr"] < 1.0:
    roc_points.append({"fpr": 1.0, "tpr": 1.0})

# Subsample X_test if > 2000 rows so permutation_importance stays fast
X_perm = X_test.iloc[:2000] if len(X_test) > 2000 else X_test
y_perm = y_test.iloc[:2000] if len(y_test) > 2000 else y_test
perm_res = permutation_importance(
    full_pipeline, X_perm, y_perm, n_repeats=4, random_state=42
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

print(f"Holdout Results ({ACTIVE_MODEL_NAME}):")
print(f"  ROC-AUC   : {auc_val:.4f} | Train: {train_score:.4f} | CV: {cv_mean:.4f} +/- {cv_std:.4f}")
print(f"  F1-Score  : {f1:.4f} | Accuracy : {acc:.4f}")
print(f"  Precision : {prec:.4f} | Recall   : {rec:.4f}")
${submissionExportBlock}

plt.style.use('dark_background')
fig, axes = plt.subplots(1, 3, figsize=(13.5, 3.8), dpi=115)
fig.patch.set_facecolor('#202124')

axes[0].set_facecolor('#18191a')
axes[0].plot(fpr_arr, tpr_arr, color='#8ab4f8', lw=2, label=f'AUC = {auc_val:.4f}')
axes[0].plot([0, 1], [0, 1], color='#5f6368', linestyle='--', lw=1)
axes[0].set_title('ROC Curve', fontsize=10, color='#e8eaed')
axes[0].set_xlabel('FPR', fontsize=9)
axes[0].set_ylabel('TPR', fontsize=9)
axes[0].legend(loc='lower right', fontsize=8)
axes[0].grid(alpha=0.12)

axes[1].set_facecolor('#18191a')
cm_np = np.array(cm)
axes[1].imshow(cm_np, cmap='Blues')
axes[1].set_title('Confusion Matrix', fontsize=10, color='#e8eaed')
axes[1].set_xlabel('Predicted', fontsize=9)
axes[1].set_ylabel('Actual', fontsize=9)
for i in range(cm_np.shape[0]):
    for j in range(cm_np.shape[1]):
        axes[1].text(j, i, f"{cm_np[i, j]}", ha="center", va="center", color="white", fontsize=10)

axes[2].set_facecolor('#18191a')
top_names = [x['feature'] for x in reversed(feature_importance_list[:8])]
top_vals = [x['importance'] for x in reversed(feature_importance_list[:8])]
axes[2].barh(top_names, top_vals, color='#8ab4f8', height=0.55)
axes[2].set_title('Permutation Importance', fontsize=10, color='#e8eaed')
axes[2].grid(axis='x', alpha=0.12)

plt.tight_layout()

_automl_experiment_result = {
    "dataset_name": DATASET_NAME,
    "target_column": TARGET_COL,
    "model_name": ACTIVE_MODEL_NAME,
    "task_type": "classification",
    "metrics": {
        "roc_auc": round(auc_val, 4),
        "f1": round(f1, 4),
        "accuracy": round(acc, 4),
        "precision": round(prec, 4),
        "recall": round(rec, 4),
        "train_score": round(train_score, 4),
        "cv_mean": round(cv_mean, 4),
        "cv_std": round(cv_std, 4)
    },
    "feature_importance": feature_importance_list,
    "roc_curve": roc_points,
    "confusion_matrix": cm
}
`;
  }

  return `# [5] Holdout Regression Evaluation & submission.csv Export
from sklearn.metrics import root_mean_squared_error, mean_absolute_error, r2_score
from sklearn.inspection import permutation_importance

y_pred = full_pipeline.predict(X_test)
rmse_val = float(root_mean_squared_error(y_test, y_pred))
mae_val = float(mean_absolute_error(y_test, y_pred))
r2_val = float(r2_score(y_test, y_pred))

X_perm = X_test.iloc[:2000] if len(X_test) > 2000 else X_test
y_perm = y_test.iloc[:2000] if len(y_test) > 2000 else y_test
perm_res = permutation_importance(
    full_pipeline, X_perm, y_perm, n_repeats=4, random_state=42, scoring='r2'
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

print(f"Holdout Results ({ACTIVE_MODEL_NAME}):")
print(f"  RMSE : {rmse_val:.4f} | Train RMSE: {train_score:.4f} | CV: {cv_mean:.4f}")
print(f"  MAE  : {mae_val:.4f} | R2        : {r2_val:.4f}")
${submissionExportBlock}

plt.style.use('dark_background')
fig, axes = plt.subplots(1, 2, figsize=(10.5, 3.8), dpi=115)
fig.patch.set_facecolor('#202124')

axes[0].set_facecolor('#18191a')
axes[0].scatter(y_test, y_pred, alpha=0.65, color='#8ab4f8', s=24)
min_v, max_v = float(min(y_test.min(), y_pred.min())), float(max(y_test.max(), y_pred.max()))
axes[0].plot([min_v, max_v], [min_v, max_v], '--', color='#9aa0a6', lw=1.2)
axes[0].set_title(f'Actual vs Predicted (R2 = {r2_val:.3f})', fontsize=10)
axes[0].grid(alpha=0.12)

axes[1].set_facecolor('#18191a')
top_names = [x['feature'] for x in reversed(feature_importance_list[:8])]
top_vals = [x['importance'] for x in reversed(feature_importance_list[:8])]
axes[1].barh(top_names, top_vals, color='#8ab4f8', height=0.55)
axes[1].set_title('Permutation Importance', fontsize=10)
axes[1].grid(axis='x', alpha=0.12)

plt.tight_layout()

_automl_experiment_result = {
    "dataset_name": DATASET_NAME,
    "target_column": TARGET_COL,
    "model_name": ACTIVE_MODEL_NAME,
    "task_type": "regression",
    "metrics": {
        "rmse": round(rmse_val, 4),
        "mae": round(mae_val, 4),
        "r2": round(r2_val, 4),
        "train_score": round(train_score, 4),
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
      title: '1. Load Dataset & Profile',
      subtitle: 'Read CSV and sync schema metadata',
      code: generateCell1DataLoad(config),
    },
    {
      id: 'cell_02_preprocess',
      order: 2,
      stepType: 'preprocess',
      title: '2. ColumnTransformer Pipeline',
      subtitle: 'Numeric & categorical preprocessing without data leakage',
      code: generateCell2Preprocess(config),
    },
    {
      id: 'cell_03_split',
      order: 3,
      stepType: 'split_cv',
      title: '3. Train / Holdout Split & CV',
      subtitle: 'Partition dataset and configure cross-validation',
      code: generateCell3SplitCV(config),
    },
    {
      id: 'cell_04_train',
      order: 4,
      stepType: 'model_train',
      title: `4. Train Model (${config.modelFamily})`,
      subtitle: 'Fit pipeline across CV folds and full training set',
      code: generateCell4ModelTrain(config),
    },
    {
      id: 'cell_05_eval',
      order: 5,
      stepType: 'evaluate',
      title: '5. Evaluate & Export submission.csv',
      subtitle: 'Compute holdout metrics, plots, and save submission.csv',
      code: generateCell5Evaluate(config),
    },
  ];

  if (!existingCells || existingCells.length === 0) {
    return templates.map((t) => ({
      id: t.id,
      order: t.order,
      cellType: 'code',
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

  // Update the 5 standard pipeline cells in-place while preserving user cell order, custom titles, Markdown cells, and custom cells
  const templateByStep = new Map(templates.map((t) => [t.stepType, t]));

  const updated = existingCells.map((cell) => {
    if (cell.cellType === 'markdown' || cell.stepType === 'custom' || cell.stepType === 'markdown_doc') {
      return cell;
    }
    const tpl = templateByStep.get(cell.stepType);
    if (!tpl) return cell;
    return {
      ...cell,
      title: cell.customTitle ? cell.title : tpl.title,
      subtitle: cell.customTitle ? cell.subtitle : tpl.subtitle,
      generatedCode: tpl.code,
      currentCode: cell.isLocked ? cell.currentCode : tpl.code,
    };
  });

  return updated;
}

export function buildCellsFromTemplate(
  templateId: PipelineTemplateId,
  currentConfig: PipelineConfig
): { nextConfig: PipelineConfig; cells: NotebookCell[] } {
  const fileName = currentConfig.uploadedFileName || 'train.csv';

  if (templateId === 'blank_notebook') {
    const blankCell: NotebookCell = {
      id: `code_blank_${Date.now()}`,
      order: 1,
      cellType: 'code',
      stepType: 'custom',
      title: '1. Python Code Cell',
      subtitle: 'Interactive Python notebook cell',
      customTitle: true,
      generatedCode: '',
      currentCode: `import numpy as np\nimport pandas as pd\nimport matplotlib.pyplot as plt\n\n# Nạp file CSV hoặc viết code phân tích tự do tại đây\n# df = pd.read_csv('/tmp/${fileName}')\n# df.head(5)`,
      isLocked: true,
      status: 'idle',
      outputText: '',
      figures: [],
    };
    return { nextConfig: currentConfig, cells: [blankCell] };
  }

  if (templateId === 'eda_exploration') {
    const cell1Code = generateCell1DataLoad(currentConfig);
    const cell2Code = `# [2] Kiểm tra Chất lượng Dữ liệu, Missing Values & Cardinality
summary_df = pd.DataFrame({
    'dtype': df.dtypes.astype(str),
    'missing_count': df.isna().sum(),
    'missing_pct (%)': (df.isna().sum() / len(df) * 100).round(2),
    'nunique': df.nunique(dropna=True),
    'unique_ratio (%)': (df.nunique(dropna=True) / max(len(df), 1) * 100).round(1)
})
print(f"Tổng số dòng trùng lặp (Duplicate rows): {df.duplicated().sum():,}")
summary_df`;

    const cell3Code = `# [3] Trực quan hoá Phân phối & Ma trận Tương quan (Correlation Heatmap)
plt.style.use('dark_background')
num_cols = df.select_dtypes(include=[np.number]).columns.tolist()

if len(num_cols) >= 2:
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.2), dpi=115)
    fig.patch.set_facecolor('#202124')

    # 1. Phân phối cột mục tiêu hoặc cột số đầu tiên
    target_c = '${currentConfig.targetColumn.replace(/'/g, "\\'")}' if '${currentConfig.targetColumn.replace(/'/g, "\\'")}' in df.columns else num_cols[-1]
    axes[0].set_facecolor('#18191a')
    df[target_c].dropna().hist(bins=25, ax=axes[0], color='#8ab4f8', edgecolor='#202124')
    axes[0].set_title(f'Distribution of {target_c}', fontsize=10, color='#e8eaed')
    axes[0].grid(alpha=0.15)

    # 2. Ma trận tương quan giữa các biến số
    corr_mat = df[num_cols[:12]].corr()
    axes[1].set_facecolor('#18191a')
    im = axes[1].imshow(corr_mat, cmap='coolwarm', vmin=-1, vmax=1)
    axes[1].set_xticks(range(len(corr_mat.columns)))
    axes[1].set_yticks(range(len(corr_mat.columns)))
    axes[1].set_xticklabels(corr_mat.columns, rotation=45, ha='right', fontsize=8)
    axes[1].set_yticklabels(corr_mat.columns, fontsize=8)
    axes[1].set_title('Feature Correlation Matrix', fontsize=10, color='#e8eaed')
    fig.colorbar(im, ax=axes[1], fraction=0.046, pad=0.04)
    plt.tight_layout()

df.describe().round(3)`;

    const edaCells: NotebookCell[] = [
      {
        id: 'cell_01_load',
        order: 1,
        cellType: 'code',
        stepType: 'data_load',
        title: '1. Nạp Dữ liệu & Đồng bộ Schema',
        subtitle: 'Đọc file CSV vào DataFrame df',
        generatedCode: cell1Code,
        currentCode: cell1Code,
        isLocked: false,
        status: 'idle',
        outputText: '',
        figures: [],
      },
      {
        id: `eda_quality_${Date.now()}`,
        order: 2,
        cellType: 'code',
        stepType: 'custom',
        title: '2. Thống kê Khuyết thiếu, Kiểu dữ liệu & Dòng trùng',
        subtitle: 'Hiển thị bảng tổng hợp chất lượng từng cột',
        customTitle: true,
        generatedCode: cell2Code,
        currentCode: cell2Code,
        isLocked: true,
        status: 'idle',
        outputText: '',
        figures: [],
      },
      {
        id: `eda_corr_${Date.now() + 1}`,
        order: 3,
        cellType: 'code',
        stepType: 'custom',
        title: '3. Phân phối Biến & Ma trận Tương quan',
        subtitle: 'Biểu đồ Histogram và Correlation Matrix',
        customTitle: true,
        generatedCode: cell3Code,
        currentCode: cell3Code,
        isLocked: true,
        status: 'idle',
        outputText: '',
        figures: [],
      },
    ];
    return { nextConfig: currentConfig, cells: edaCells };
  }

  let nextConfig: PipelineConfig = { ...currentConfig };
  if (templateId === 'classification_pipeline') {
    nextConfig = {
      ...currentConfig,
      taskType: 'classification',
      cvStrategy: 'stratified_kfold',
      imbalanceStrategy: 'class_weight',
    };
  } else if (templateId === 'regression_pipeline') {
    nextConfig = {
      ...currentConfig,
      taskType: 'regression',
      cvStrategy: 'kfold',
      logTransformNumeric: true,
    };
  } else if (templateId === 'kaggle_submission') {
    nextConfig = {
      ...currentConfig,
      datasetSource: 'upload',
      uploadedFileName: currentConfig.uploadedFileName || 'train.csv',
      testUploadedFileName: currentConfig.testUploadedFileName || 'test.csv',
      tuningStrategy: 'randomized_search',
    };
  } else if (templateId === 'timeseries_group_cv') {
    nextConfig = {
      ...currentConfig,
      cvStrategy: 'timeseries_split',
    };
  }

  return {
    nextConfig,
    cells: buildAllPipelineCells(nextConfig),
  };
}
