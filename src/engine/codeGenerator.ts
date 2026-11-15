import {
  NotebookCell,
  PipelineConfig,
  PipelineTemplateId,
  QuickSnippetId,
} from '../types/studio';

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
  const gsheetMatch = trimmed.match(
    /^https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i
  );
  if (gsheetMatch) {
    const gidMatch = trimmed.match(/[?&#]gid=([0-9]+)/i);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    return `https://docs.google.com/spreadsheets/d/${gsheetMatch[1]}/export?format=csv${gidParam}`;
  }
  if (trimmed.includes('drive.google.com')) {
    const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
    const idQueryMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/i);
    const driveId = fileMatch?.[1] || idQueryMatch?.[1];
    if (driveId) {
      return `https://drive.google.com/uc?export=download&id=${driveId}`;
    }
  }
  if (/^https?:\/\/(www\.)?dropbox\.com\//i.test(trimmed)) {
    if (/[?&]dl=0/i.test(trimmed)) {
      return trimmed.replace(/([?&])dl=0/i, '$1dl=1');
    }
    if (!/[?&]dl=1/i.test(trimmed)) {
      return trimmed + (trimmed.includes('?') ? '&dl=1' : '?dl=1');
    }
  }
  const hfMatch = trimmed.match(
    /^https?:\/\/huggingface\.co\/(datasets\/[^/]+\/[^/]+|[^/]+\/[^/]+)\/blob\/(.+)$/i
  );
  if (hfMatch) {
    return `https://huggingface.co/${hfMatch[1]}/resolve/${hfMatch[2]}`;
  }
  if (trimmed.includes('/-/blob/')) {
    return trimmed.replace('/-/blob/', '/-/raw/');
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
df = _smart_read_csv(csv_path)`;
  } else if (config.datasetSource === 'cloud_path') {
    const cPath = (config.cloudDatasetPath.trim() || '/kaggle/input/dataset/train.csv').replace(
      /'/g,
      "\\'"
    );
    const baseName = cPath.split('/').pop() || 'cloud_dataset.csv';
    const lowerPath = cPath.toLowerCase();
    const readExpr = lowerPath.endsWith('.parquet')
      ? `pd.read_parquet('${cPath}')`
      : lowerPath.endsWith('.tsv')
      ? `pd.read_csv('${cPath}', sep='\\t')`
      : `_smart_read_csv('${cPath}')`;
    loadBlock = `DATASET_NAME = '${baseName}'
if not os.path.exists('${cPath}'):
    raise FileNotFoundError(
        f"Không tìm thấy file '${cPath}' trên Colab/Kaggle. Hãy kiểm tra lại đường dẫn hoặc kết nối Cloud Worker."
    )
df = ${readExpr}`;
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
    df = _smart_read_csv('/tmp/_cached_url_dataset.csv')
else:
    df = _smart_read_csv(DATASET_URL)`;
  }

  const testLoadBlock = config.testUploadedFileName
    ? `
# Load Kaggle / Competition Test Dataset for submission.csv generation
TEST_DATASET_NAME = '${config.testUploadedFileName.replace(/'/g, "\\'")}'
test_csv_path = f'/tmp/{TEST_DATASET_NAME}' if os.path.exists(f'/tmp/{TEST_DATASET_NAME}') else TEST_DATASET_NAME
if os.path.exists(test_csv_path):
    df_test = _smart_read_csv(test_csv_path)
    df_test.replace([np.inf, -np.inf], np.nan, inplace=True)
    print(f"Test set: {TEST_DATASET_NAME} ({df_test.shape[0]:,} rows, {df_test.shape[1]} cols)")`
    : '';

  const dropDupBlock = config.dropDuplicates
    ? `
# Remove exact duplicate rows to prevent Train/Test leakage
dup_count = int(df.duplicated().sum())
if dup_count > 0:
    print(f"Dropping {dup_count:,} duplicate rows...")
    df = df.drop_duplicates().reset_index(drop=True)`
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

def _smart_read_csv(path_or_url):
    for enc in ('utf-8-sig', 'utf-8', 'latin1'):
        try:
            d = pd.read_csv(path_or_url, encoding=enc)
            if d.shape[1] <= 1:
                try:
                    d_auto = pd.read_csv(path_or_url, sep=None, engine='python', encoding=enc)
                    if d_auto.shape[1] > d.shape[1]:
                        d = d_auto
                except Exception:
                    pass
            d.columns = [str(c).lstrip('\\ufeff').strip() for c in d.columns]
            return d
        except UnicodeDecodeError:
            continue
        except Exception:
            try:
                d = pd.read_csv(path_or_url, sep=None, engine='python', encoding=enc)
                d.columns = [str(c).lstrip('\\ufeff').strip() for c in d.columns]
                return d
            except Exception:
                continue
    return pd.read_csv(path_or_url)

${loadBlock}
df.replace([np.inf, -np.inf], np.nan, inplace=True)${testLoadBlock}${dropDupBlock}${subsampleBlock}

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
    knn: 'KNNImputer(n_neighbors=5)',
  };

  const numScalerMap: Record<string, string> = {
    standard: 'StandardScaler()',
    robust: 'RobustScaler()',
    minmax: 'MinMaxScaler()',
    quantile_normal: `QuantileTransformer(output_distribution='normal', random_state=${config.hyperparameters.randomState})`,
    power_yeojohnson: "PowerTransformer(method='yeo-johnson')",
    none: "'passthrough'",
  };

  const catImputerMap: Record<string, string> = {
    most_frequent: "SimpleImputer(strategy='most_frequent')",
    constant_missing: "SimpleImputer(strategy='constant', fill_value='Missing')",
  };

  let catEncoderCode = '';
  if (config.categoricalEncoder === 'onehot') {
    catEncoderCode = `OneHotEncoder(handle_unknown='ignore', sparse_output=False, max_categories=${config.maxOneHotCategories})`;
  } else if (config.categoricalEncoder === 'target') {
    catEncoderCode = `TargetEncoder(random_state=${config.hyperparameters.randomState})`;
  } else {
    catEncoderCode = `OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)`;
  }

  const logStepCode = config.logTransformNumeric
    ? `\n    ('log_transform', FunctionTransformer(lambda x: np.sign(x) * np.log1p(np.abs(np.nan_to_num(x, nan=0.0))))),`
    : '';

  const polyStepCode = config.polynomialInteractions
    ? `\n    ('poly_interactions', PolynomialFeatures(degree=2, interaction_only=True, include_bias=False)),`
    : '';

  const extraStepsList: string[] = [];
  if (config.varianceThreshold) {
    extraStepsList.push("('var_thresh', VarianceThreshold(threshold=0.0))");
  }
  if (config.featureSelection === 'select_k_best_10') {
    const scoreFn = config.taskType === 'classification' ? 'f_classif' : 'f_regression';
    extraStepsList.push(`('feat_select', SelectKBest(score_func=${scoreFn}, k=10))`);
  } else if (config.featureSelection === 'select_k_best_20') {
    const scoreFn = config.taskType === 'classification' ? 'f_classif' : 'f_regression';
    extraStepsList.push(`('feat_select', SelectKBest(score_func=${scoreFn}, k=20))`);
  } else if (config.featureSelection === 'select_from_model') {
    const sfEst =
      config.taskType === 'classification'
        ? `RandomForestClassifier(n_estimators=50, max_depth=6, random_state=${config.hyperparameters.randomState})`
        : `RandomForestRegressor(n_estimators=50, max_depth=6, random_state=${config.hyperparameters.randomState})`;
    extraStepsList.push(`('feat_select', SelectFromModel(${sfEst}))`);
  }

  return `# [2] Anti-Leakage Preprocessing (ColumnTransformer)
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.preprocessing import (
    StandardScaler, RobustScaler, MinMaxScaler,
    QuantileTransformer, PowerTransformer,
    OneHotEncoder, OrdinalEncoder, TargetEncoder,
    FunctionTransformer, PolynomialFeatures
)
from sklearn.feature_selection import VarianceThreshold, SelectKBest, SelectFromModel, f_classif, f_regression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor

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
    ('imputer', ${numImputerMap[config.numericImputer]}),${logStepCode}${polyStepCode}
    ('scaler', ${numScalerMap[config.numericScaler]})
])

categorical_transformer = Pipeline(steps=[
    ('imputer', ${catImputerMap[config.categoricalImputer]}),
    ('encoder', ${catEncoderCode})
])

transformers_list = []
if numeric_features:
    transformers_list.append(('num', numeric_transformer, numeric_features))
if categorical_features:
    transformers_list.append(('cat', categorical_transformer, categorical_features))

if not transformers_list:
    raise ValueError("Cần ít nhất 1 cột 'num' hoặc 'cat' làm biến đầu vào (Features) để huấn luyện.")

preprocessor = ColumnTransformer(
    transformers=transformers_list,
    remainder='drop',
    verbose_feature_names_out=True
)

pipeline_extra_steps = [${extraStepsList.join(', ')}]

print(f"ColumnTransformer configured:")
print(f"  Numeric ({len(numeric_features)})     : {numeric_features}")
print(f"  Categorical ({len(categorical_features)}) : {categorical_features}")
if pipeline_extra_steps:
    print(f"  Extra Steps ({len(pipeline_extra_steps)}) : {[s[0] for s in pipeline_extra_steps]}")
if DROP_COLS:
    print(f"  Dropped ({len(DROP_COLS)})     : {DROP_COLS}")
`;
}

export function generateCell3SplitCV(config: PipelineConfig): string {
  const isClass = config.taskType === 'classification';
  const isTimeSeries = config.cvStrategy === 'timeseries_split';
  const isGroup = config.cvStrategy === 'group_kfold';
  const isRepeated = isClass && config.cvStrategy === 'repeated_stratified_kfold';
  const isStratified =
    isClass && (config.cvStrategy === 'stratified_kfold' || isRepeated);

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
  } else if (isRepeated) {
    cvInitCode = `from sklearn.model_selection import RepeatedStratifiedKFold
cv_splitter = RepeatedStratifiedKFold(n_splits=${config.cvFolds}, n_repeats=2, random_state=${config.hyperparameters.randomState})`;
  } else if (isStratified) {
    cvInitCode = `from sklearn.model_selection import StratifiedKFold
cv_splitter = StratifiedKFold(n_splits=${config.cvFolds}, shuffle=True, random_state=${config.hyperparameters.randomState})`;
  } else {
    cvInitCode = `from sklearn.model_selection import KFold
cv_splitter = KFold(n_splits=${config.cvFolds}, shuffle=True, random_state=${config.hyperparameters.randomState})`;
  }

  return `# [3] Train / Holdout Split & Cross-Validation Setup
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
${cvInitCode}

clean_df = df.dropna(subset=[TARGET_COL]).copy()

# Sanitize real-world numeric & categorical features before splitting
_active_num = [c for c in numeric_features if c in clean_df.columns]
_active_cat = [c for c in categorical_features if c in clean_df.columns]
X = clean_df[_active_num + _active_cat].copy()
X = X.replace([np.inf, -np.inf], np.nan)
for _nc in _active_num:
    X[_nc] = pd.to_numeric(X[_nc].astype(str).str.replace(',', '', regex=False), errors='coerce') if X[_nc].dtype == object else pd.to_numeric(X[_nc], errors='coerce')
for _cc in _active_cat:
    X[_cc] = X[_cc].where(X[_cc].notna(), np.nan).apply(lambda _v: str(_v) if pd.notna(_v) else np.nan)

# Guard against 100% NaN columns so SimpleImputer/ColumnTransformer never mismatches shapes
_all_nan_cols = [c for c in X.columns if X[c].isna().all()]
if _all_nan_cols:
    print(f"Filling 100% NaN columns with safe defaults: {_all_nan_cols}")
    for _anc in _all_nan_cols:
        X[_anc] = 0.0 if _anc in _active_num else 'Missing'

y = clean_df[TARGET_COL].copy()

${
  isClass
    ? `# Encode arbitrary class labels (strings, non-0-indexed ints, negatives) to 0..K-1
target_label_encoder = LabelEncoder()
y = pd.Series(target_label_encoder.fit_transform(y.astype(str)), index=clean_df.index)
_cls_counts = y.value_counts()
_rare_classes = _cls_counts[_cls_counts < 2].index.tolist()
if _rare_classes:
    print(f"Dropping {len(_rare_classes)} rare class(es) with < 2 samples so stratified split/CV stays valid.")
    _keep_mask = ~y.isin(_rare_classes)
    X = X.loc[_keep_mask]
    y = pd.Series(target_label_encoder.fit_transform(clean_df.loc[_keep_mask, TARGET_COL].astype(str)), index=X.index)`
    : `y = pd.to_numeric(y.astype(str).str.replace(',', '', regex=False), errors='coerce')
_valid_y = y.notna()
if not _valid_y.all():
    X = X.loc[_valid_y]
    y = y.loc[_valid_y]
y = y.astype(float)`
}

_strat_arg = ${stratifyExpr}
if _strat_arg is not None and pd.Series(_strat_arg).value_counts().min() < 2:
    _strat_arg = None

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=${config.testSize},
    shuffle=${shuffleSplit},
    random_state=${config.hyperparameters.randomState},
    stratify=_strat_arg
)

# Clamp CV n_splits to avoid crashing on small or imbalanced real-world datasets
if hasattr(cv_splitter, 'n_splits'):
    _max_splits = int(pd.Series(y_train).value_counts().min()) if ${isStratified ? 'True' : 'False'} else len(X_train)
    if _max_splits >= 2 and cv_splitter.n_splits > _max_splits:
        print(f"Clamping CV n_splits from {cv_splitter.n_splits} -> {_max_splits} to fit smallest class/sample count.")
        cv_splitter.n_splits = _max_splits

print(f"Split: Train={X_train.shape[0]:,} | Holdout Test={X_test.shape[0]:,} | CV=${config.cvStrategy}(n_splits={getattr(cv_splitter, 'n_splits', ${config.cvFolds})})")
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
    early_stopping=${hp.earlyStopping ? 'True' : 'False'},
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
    early_stopping=${hp.earlyStopping ? 'True' : 'False'},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "HistGradientBoosting"`;
      break;

    case 'GradientBoosting':
      modelInitBlock = isClass
        ? `from sklearn.ensemble import GradientBoostingClassifier
estimator = GradientBoostingClassifier(
    n_estimators=${hp.nEstimators},
    learning_rate=${hp.learningRate},
    max_depth=${Math.min(hp.maxDepth, 8)},
    min_samples_leaf=${hp.minSamplesLeaf},
    subsample=${hp.subsample},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "GradientBoosting"`
        : `from sklearn.ensemble import GradientBoostingRegressor
estimator = GradientBoostingRegressor(
    n_estimators=${hp.nEstimators},
    learning_rate=${hp.learningRate},
    max_depth=${Math.min(hp.maxDepth, 8)},
    min_samples_leaf=${hp.minSamplesLeaf},
    subsample=${hp.subsample},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "GradientBoosting"`;
      break;

    case 'DecisionTree':
      modelInitBlock = isClass
        ? `from sklearn.tree import DecisionTreeClassifier
estimator = DecisionTreeClassifier(
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "DecisionTree"`
        : `from sklearn.tree import DecisionTreeRegressor
estimator = DecisionTreeRegressor(
    max_depth=${hp.maxDepth},
    min_samples_leaf=${hp.minSamplesLeaf},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "DecisionTree"`;
      break;

    case 'SVM':
      modelInitBlock = isClass
        ? `from sklearn.svm import SVC
estimator = SVC(
    C=${(1.0 / Math.max(hp.l2Regularization, 0.05)).toFixed(2)},
    probability=True,
    class_weight=${useBalancedWeight ? "'balanced'" : 'None'},
    random_state=${hp.randomState}
)
ACTIVE_MODEL_NAME = "SVM (RBF)"`
        : `from sklearn.svm import SVR
estimator = SVR(
    C=${(1.0 / Math.max(hp.l2Regularization, 0.05)).toFixed(2)}
)
ACTIVE_MODEL_NAME = "SVR (RBF)"`;
      break;

    case 'KNeighbors':
      modelInitBlock = isClass
        ? `from sklearn.neighbors import KNeighborsClassifier
estimator = KNeighborsClassifier(
    n_neighbors=${Math.max(3, Math.min(25, hp.maxDepth))},
    weights='distance'
)
ACTIVE_MODEL_NAME = "KNeighbors"`
        : `from sklearn.neighbors import KNeighborsRegressor
estimator = KNeighborsRegressor(
    n_neighbors=${Math.max(3, Math.min(25, hp.maxDepth))},
    weights='distance'
)
ACTIVE_MODEL_NAME = "KNeighbors"`;
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
      : isClass && config.imbalanceStrategy === 'random_undersample'
      ? `from sklearn.utils import resample
train_combined = X_train.copy()
train_combined['__target__'] = y_train.values
min_class = train_combined['__target__'].value_counts().idxmin()
df_min = train_combined[train_combined['__target__'] == min_class]
df_maj = train_combined[train_combined['__target__'] != min_class]
df_maj_downsampled = resample(df_maj, replace=False, n_samples=len(df_min), random_state=${hp.randomState})
train_balanced = pd.concat([df_min, df_maj_downsampled]).sample(frac=1.0, random_state=${hp.randomState})
X_train_fit = train_balanced.drop(columns=['__target__'])
y_train_fit = train_balanced['__target__']
print(f"Undersampled train set: {len(X_train)} -> {len(X_train_fit)} rows")`
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
      : config.tuningStrategy === 'grid_search'
      ? `
# Exhaustive Hyperparameter Tuning via GridSearchCV
from sklearn.model_selection import GridSearchCV
param_grid = {}
if hasattr(estimator, 'max_depth'):
    param_grid['model__max_depth'] = [3, 6, 10]
if hasattr(estimator, 'learning_rate'):
    param_grid['model__learning_rate'] = [0.03, 0.08]
elif hasattr(estimator, 'C'):
    param_grid['model__C'] = [0.1, 1.0, 5.0]

if param_grid:
    print("Running GridSearchCV...")
    search = GridSearchCV(
        full_pipeline,
        param_grid=param_grid,
        cv=3,
        scoring='${isClass ? 'roc_auc' : 'neg_root_mean_squared_error'}'
    )
    search.fit(X_train_fit, y_train_fit)
    full_pipeline = search.best_estimator_
    print("Best GridSearch params:", search.best_params_)
else:
    full_pipeline.fit(X_train_fit, y_train_fit)`
      : `full_pipeline.fit(X_train_fit, y_train_fit)`;

  const splitCallExpr =
    config.cvStrategy === 'group_kfold' && config.groupColumn
      ? `cv_splitter.split(X_train, y_train, groups=clean_df.loc[X_train.index, GROUP_COL] if GROUP_COL in clean_df.columns else X_train.iloc[:, 0])`
      : `cv_splitter.split(X_train, y_train)`;

  return `# [4] Pipeline Training & Cross-Validation
from sklearn.base import clone
from sklearn.pipeline import Pipeline
from sklearn.metrics import roc_auc_score, f1_score, root_mean_squared_error, r2_score

${modelInitBlock}

extra_steps = pipeline_extra_steps if 'pipeline_extra_steps' in globals() else []
full_pipeline = Pipeline(steps=[('preprocessor', preprocessor)] + extra_steps + [('model', estimator)])

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
  const sampleSub = config.sampleSubmission;
  const idCol = (sampleSub?.idColumn || config.idColumnForSubmission || 'id').replace(/'/g, "\\'");
  const sampleTargetCols = sampleSub?.targetColumns || [];
  const isMultiColSub = isClass && sampleTargetCols.length > 1;
  const singleTargetCol = sampleTargetCols.length === 1 ? sampleTargetCols[0].replace(/'/g, "\\'") : '';
  const expectsProba = sampleSub ? sampleSub.expectsProbabilities : isClass;

  const predCode = isMultiColSub
    ? `# Multi-class probability submission matching sample_submission.csv columns
_sub_cols = [${sampleTargetCols.map((c) => `'${c.replace(/'/g, "\\'")}'`).join(', ')}]
if hasattr(full_pipeline, "predict_proba"):
    _probs = full_pipeline.predict_proba(sub_X)
    _cls_list = [str(c) for c in getattr(full_pipeline, "classes_", range(_probs.shape[1]))]
    for _idx, _sc in enumerate(_sub_cols):
        if _sc in _cls_list:
            submission_data[_sc] = np.round(_probs[:, _cls_list.index(_sc)], 6)
        elif _idx < _probs.shape[1]:
            submission_data[_sc] = np.round(_probs[:, _idx], 6)
        else:
            submission_data[_sc] = 0.0
else:
    _preds = full_pipeline.predict(sub_X)
    for _sc in _sub_cols:
        submission_data[_sc] = (_preds.astype(str) == _sc).astype(float)`
    : isClass && expectsProba
    ? `sub_preds = full_pipeline.predict_proba(sub_X)[:, 1] if hasattr(full_pipeline, "predict_proba") and len(np.unique(y_train if 'y_train' in globals() else y_test)) == 2 else full_pipeline.predict(sub_X)
submission_data[${singleTargetCol ? `'${singleTargetCol}'` : 'TARGET_COL'}] = np.round(sub_preds, 6) if np.issubdtype(np.asarray(sub_preds).dtype, np.number) else sub_preds`
    : `sub_preds = full_pipeline.predict(sub_X)
submission_data[${singleTargetCol ? `'${singleTargetCol}'` : 'TARGET_COL'}] = np.round(sub_preds, 6) if np.issubdtype(np.asarray(sub_preds).dtype, np.number) else sub_preds`;

  const submissionExportBlock = `
# Export predictions to submission.csv (uses df_test if loaded and schema matches, otherwise holdout X_test)
_req_cols = list(X_train.columns) if 'X_train' in globals() and hasattr(X_train, 'columns') else (list(X_test.columns) if hasattr(X_test, 'columns') else [])
_use_df_test = (
    'df_test' in globals()
    and isinstance(df_test, pd.DataFrame)
    and len(_req_cols) > 0
    and set(_req_cols).issubset(set(df_test.columns))
)
if 'df_test' in globals() and isinstance(df_test, pd.DataFrame) and not _use_df_test:
    print("Note: Loaded df_test columns do not match trained features; using holdout X_test for submission.csv.")
elif not _use_df_test:
    print("Note: No test.csv loaded — generating submission.csv from Holdout X_test split.")
sub_source_df = df_test if _use_df_test else (clean_df.loc[X_test.index] if 'clean_df' in globals() and hasattr(X_test, 'index') else X_test)
if _use_df_test:
    sub_X = sub_source_df[_req_cols].copy()
    sub_X = sub_X.replace([np.inf, -np.inf], np.nan)
    for _nc in globals().get('numeric_features', []):
        if _nc in sub_X.columns:
            sub_X[_nc] = pd.to_numeric(sub_X[_nc].astype(str).str.replace(',', '', regex=False), errors='coerce') if sub_X[_nc].dtype == object else pd.to_numeric(sub_X[_nc], errors='coerce')
    for _cc in globals().get('categorical_features', []):
        if _cc in sub_X.columns:
            sub_X[_cc] = sub_X[_cc].where(sub_X[_cc].notna(), np.nan).apply(lambda _v: str(_v) if pd.notna(_v) else np.nan)
else:
    sub_X = X_test.copy()
id_col_name = '${idCol}'
_id_vals = sub_source_df[id_col_name].values if hasattr(sub_source_df, 'columns') and id_col_name in sub_source_df.columns else (sub_source_df.iloc[:, 0].values if hasattr(sub_source_df, 'iloc') and len(sub_source_df.columns) > 0 else np.arange(len(sub_X)))
submission_data = {id_col_name: _id_vals}
${predCode}
submission_df = pd.DataFrame(submission_data)
submission_df.to_csv('/tmp/submission.csv', index=False) if os.path.exists('/tmp') else None
submission_df.to_csv('submission.csv', index=False)
print(f"Saved submission.csv ({len(submission_df):,} rows, columns: {list(submission_df.columns)})")`;

  const customBridgePrelude = `# Auto-resolve custom user model & metric variables if Cell 1-4 were written manually
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
if 'full_pipeline' not in globals():
    for _cand_name in ('pipeline', 'pipe', 'best_model', 'search', 'model', 'clf', 'reg', 'estimator'):
        if _cand_name in globals() and (hasattr(globals()[_cand_name], 'predict') or hasattr(globals()[_cand_name], 'best_estimator_')):
            full_pipeline = getattr(globals()[_cand_name], 'best_estimator_', globals()[_cand_name])
            break
if 'full_pipeline' not in globals():
    raise NameError("Chưa tìm thấy mô hình đã huấn luyện (full_pipeline / model / clf / reg / estimator). Hãy chạy Cell Train trước.")
_final_est = full_pipeline.steps[-1][1] if hasattr(full_pipeline, 'steps') and getattr(full_pipeline, 'steps', None) else full_pipeline
if 'ACTIVE_MODEL_NAME' not in globals():
    ACTIVE_MODEL_NAME = type(_final_est).__name__
if 'DATASET_NAME' not in globals():
    DATASET_NAME = 'custom_dataset.csv'
if 'TARGET_COL' not in globals():
    TARGET_COL = getattr(globals().get('y_test'), 'name', None) or 'target'
numeric_features = globals().get('numeric_features', list(X_test.select_dtypes(include=[np.number]).columns) if hasattr(X_test, 'select_dtypes') else [])
categorical_features = globals().get('categorical_features', [c for c in X_test.columns if c not in numeric_features] if hasattr(X_test, 'columns') else [])
cv_mean = float(globals().get('cv_mean', 0.0))
cv_std = float(globals().get('cv_std', 0.0))
train_score = float(globals().get('train_score', 0.0))`;

  if (isClass) {
    return `# [5] Holdout Evaluation, Diagnostics & submission.csv Export
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, roc_curve, confusion_matrix
)
from sklearn.inspection import permutation_importance

${customBridgePrelude}

y_pred = full_pipeline.predict(X_test)
_uniq_y = np.unique(y_test)
_pos_lbl = (full_pipeline.classes_[-1] if hasattr(full_pipeline, 'classes_') and len(full_pipeline.classes_) == 2 else (_uniq_y[-1] if len(_uniq_y) == 2 else None))
if hasattr(full_pipeline, "predict_proba") and len(_uniq_y) == 2:
    y_prob = full_pipeline.predict_proba(X_test)[:, 1]
    auc_val = float(roc_auc_score((y_test == _pos_lbl).astype(int) if not np.issubdtype(np.asarray(y_test).dtype, np.number) else y_test, y_prob))
else:
    y_prob = (y_pred == _pos_lbl).astype(float) if _pos_lbl is not None else np.zeros(len(y_pred), dtype=float)
    auc_val = float(f1_score(y_test, y_pred, average='weighted', zero_division=0))

_bin_avg = 'binary' if len(_uniq_y) == 2 else 'weighted'
acc = float(accuracy_score(y_test, y_pred))
prec = float(precision_score(y_test, y_pred, average=_bin_avg, pos_label=_pos_lbl if _bin_avg == 'binary' else 1, zero_division=0) if len(_uniq_y) == 2 else precision_score(y_test, y_pred, average='weighted', zero_division=0))
rec = float(recall_score(y_test, y_pred, average=_bin_avg, pos_label=_pos_lbl if _bin_avg == 'binary' else 1, zero_division=0) if len(_uniq_y) == 2 else recall_score(y_test, y_pred, average='weighted', zero_division=0))
f1 = float(f1_score(y_test, y_pred, average=_bin_avg, pos_label=_pos_lbl if _bin_avg == 'binary' else 1, zero_division=0) if len(_uniq_y) == 2 else f1_score(y_test, y_pred, average='weighted', zero_division=0))
cm = confusion_matrix(y_test, y_pred).tolist()

if len(_uniq_y) == 2:
    _y_bin = (y_test == _pos_lbl).astype(int) if not np.issubdtype(np.asarray(y_test).dtype, np.number) else y_test
    fpr_arr, tpr_arr, _ = roc_curve(_y_bin, y_prob)
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
X_perm = (X_test.iloc[:2000] if hasattr(X_test, 'iloc') else X_test[:2000]) if len(X_test) > 2000 else X_test
y_perm = (y_test.iloc[:2000] if hasattr(y_test, 'iloc') else y_test[:2000]) if len(y_test) > 2000 else y_test
perm_res = permutation_importance(
    full_pipeline, X_perm, y_perm, n_repeats=4, random_state=42
)
raw_feat_names = (list(X_test.columns) if hasattr(X_test, 'columns') else [f'f{i}' for i in range(X_test.shape[1])]) if len(numeric_features) + len(categorical_features) == 0 else (numeric_features + categorical_features)
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

${customBridgePrelude}

y_pred = full_pipeline.predict(X_test)
rmse_val = float(root_mean_squared_error(y_test, y_pred))
mae_val = float(mean_absolute_error(y_test, y_pred))
r2_val = float(r2_score(y_test, y_pred))

X_perm = (X_test.iloc[:2000] if hasattr(X_test, 'iloc') else X_test[:2000]) if len(X_test) > 2000 else X_test
y_perm = (y_test.iloc[:2000] if hasattr(y_test, 'iloc') else y_test[:2000]) if len(y_test) > 2000 else y_test
perm_res = permutation_importance(
    full_pipeline, X_perm, y_perm, n_repeats=4, random_state=42, scoring='r2'
)
raw_feat_names = (list(X_test.columns) if hasattr(X_test, 'columns') else [f'f{i}' for i in range(X_test.shape[1])]) if len(numeric_features) + len(categorical_features) == 0 else (numeric_features + categorical_features)
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

export function generateQuickSnippetCell(
  snippetId: QuickSnippetId,
  config: PipelineConfig,
  order: number
): NotebookCell {
  const dsLabel = config.uploadedFileName || (config.publicDatasetUrl ? config.publicDatasetUrl.split('/').pop() : '') || 'dataset.csv';
  const safeTarget = config.targetColumn.replace(/'/g, "\\'");
  const numColsPy = formatPyList(config.numericColumns.slice(0, 6));
  const firstCatCol = (config.categoricalColumns[0] || '').replace(/'/g, "\\'");
  const isClass = config.taskType === 'classification';

  let title = '';
  let subtitle = '';
  let code = '';

  switch (snippetId) {
    case 'model_benchmark':
      title = `So sánh 4 Mô hình (${dsLabel})`;
      subtitle = 'Bảng tổng hợp CV Score + Thời gian chạy + Biểu đồ cột';
      code = `# So sánh nhanh các mô hình trên tập '${dsLabel}' (Target: '${safeTarget}')
from sklearn.base import clone
from sklearn.model_selection import cross_val_score
from sklearn.ensemble import HistGradientBoostingClassifier, HistGradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor, ExtraTreesClassifier, ExtraTreesRegressor
from sklearn.linear_model import LogisticRegression, Ridge

if 'X_train' not in globals() or 'preprocessor' not in globals():
    raise RuntimeError("Hãy chạy Cell Load Dataset, Cell Preprocess và Cell Split trước khi chạy Benchmark.")

candidates = {
    ${
      isClass
        ? `'LogisticRegression': LogisticRegression(max_iter=500, random_state=${config.hyperparameters.randomState}),
    'RandomForest': RandomForestClassifier(n_estimators=100, max_depth=8, n_jobs=-1, random_state=${config.hyperparameters.randomState}),
    'ExtraTrees': ExtraTreesClassifier(n_estimators=100, max_depth=8, n_jobs=-1, random_state=${config.hyperparameters.randomState}),
    'HistGradientBoosting': HistGradientBoostingClassifier(max_iter=120, learning_rate=0.06, random_state=${config.hyperparameters.randomState})`
        : `'RidgeRegression': Ridge(alpha=1.0, random_state=${config.hyperparameters.randomState}),
    'RandomForest': RandomForestRegressor(n_estimators=100, max_depth=8, n_jobs=-1, random_state=${config.hyperparameters.randomState}),
    'ExtraTrees': ExtraTreesRegressor(n_estimators=100, max_depth=8, n_jobs=-1, random_state=${config.hyperparameters.randomState}),
    'HistGradientBoosting': HistGradientBoostingRegressor(max_iter=120, learning_rate=0.06, random_state=${config.hyperparameters.randomState})`
    }
}

from sklearn.pipeline import Pipeline as _BenchPipeline
scoring_metric = '${isClass ? 'roc_auc' : 'neg_root_mean_squared_error'}'
bench_rows = []

for m_name, m_est in candidates.items():
    t0 = time.perf_counter()
    pipe = _BenchPipeline([('preprocessor', clone(preprocessor)), ('model', m_est)])
    scores = cross_val_score(pipe, X_train, y_train, cv=min(${config.cvFolds}, 3), scoring=scoring_metric)
    if not ${isClass ? 'True' : 'False'}:
        scores = -scores  # Convert neg_rmse to positive RMSE
    elapsed_ms = int((time.perf_counter() - t0) * 1000)
    bench_rows.append({
        'Model': m_name,
        'CV_Mean': round(float(scores.mean()), 4),
        'CV_Std': round(float(scores.std()), 4),
        'Time_ms': elapsed_ms
    })

bench_df = pd.DataFrame(bench_rows).sort_values('CV_Mean', ascending=${isClass ? 'False' : 'True'}).reset_index(drop=True)

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(8.5, 3.2), dpi=115)
fig.patch.set_facecolor('#202124')
ax.set_facecolor('#18191a')
ax.barh(bench_df['Model'][::-1], bench_df['CV_Mean'][::-1], xerr=bench_df['CV_Std'][::-1], color='#8ab4f8', height=0.55)
ax.set_title(f"Model Benchmark on {DATASET_NAME if 'DATASET_NAME' in globals() else '${dsLabel}'} ({scoring_metric})", fontsize=10, color='#e8eaed')
ax.grid(axis='x', alpha=0.15)
plt.tight_layout()

bench_df`;
      break;

    case 'dist_boxplots':
      title = `Phân phối & Boxplot (${dsLabel})`;
      subtitle = 'Histogram + Boxplot phát hiện ngoại lai trên các biến số';
      code = `# Phân phối & Boxplot các cột số của '${dsLabel}'
plot_cols = [c for c in ${numColsPy} if c in df.columns]
if not plot_cols:
    plot_cols = df.select_dtypes(include=[np.number]).columns.tolist()[:6]

n_cols = min(len(plot_cols), 6)
if n_cols == 0:
    print("Không tìm thấy cột số nào để vẽ phân phối.")
else:
    plt.style.use('dark_background')
    fig, axes = plt.subplots(n_cols, 2, figsize=(10.5, 2.5 * n_cols), dpi=110)
    fig.patch.set_facecolor('#202124')
    if n_cols == 1:
        axes = np.array([axes])
    for i, col in enumerate(plot_cols[:n_cols]):
        s = df[col].dropna()
        axes[i, 0].set_facecolor('#18191a')
        axes[i, 0].hist(s, bins=25, color='#8ab4f8', edgecolor='#202124')
        axes[i, 0].set_title(f'{col} — Histogram (skew={s.skew():.2f})', fontsize=9, color='#e8eaed')
        axes[i, 0].grid(alpha=0.12)

        axes[i, 1].set_facecolor('#18191a')
        axes[i, 1].boxplot(s, vert=False, patch_artist=True, boxprops=dict(facecolor='#3c4043', color='#8ab4f8'), medianprops=dict(color='#fdd663'))
        axes[i, 1].set_title(f'{col} — Boxplot (Outliers)', fontsize=9, color='#e8eaed')
        axes[i, 1].grid(alpha=0.12)
    plt.tight_layout()

df[plot_cols[:6]].describe().T.round(3)`;
      break;

    case 'corr_heatmap':
      title = `Tương quan & Target (${safeTarget})`;
      subtitle = 'Correlation Heatmap + Biểu đồ tương quan với Target';
      code = `# Ma trận tương quan & Mức độ liên hệ với Target '${safeTarget}'
num_df = df.select_dtypes(include=[np.number])
if num_df.shape[1] < 2:
    print("Cần ít nhất 2 cột số để tính ma trận tương quan.")
else:
    corr_mat = num_df.iloc[:, :14].corr()
    plt.style.use('dark_background')
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.3), dpi=115)
    fig.patch.set_facecolor('#202124')

    axes[0].set_facecolor('#18191a')
    im = axes[0].imshow(corr_mat, cmap='coolwarm', vmin=-1, vmax=1)
    axes[0].set_xticks(range(len(corr_mat.columns)))
    axes[0].set_yticks(range(len(corr_mat.columns)))
    axes[0].set_xticklabels(corr_mat.columns, rotation=45, ha='right', fontsize=8)
    axes[0].set_yticklabels(corr_mat.columns, fontsize=8)
    axes[0].set_title('Correlation Matrix', fontsize=10, color='#e8eaed')
    fig.colorbar(im, ax=axes[0], fraction=0.046, pad=0.04)

    axes[1].set_facecolor('#18191a')
    if '${safeTarget}' in corr_mat.columns:
        t_corr = corr_mat['${safeTarget}'].drop('${safeTarget}').sort_values()
        colors = ['#81c995' if v >= 0 else '#f28b82' for v in t_corr.values]
        axes[1].barh(t_corr.index, t_corr.values, color=colors, height=0.6)
        axes[1].axvline(0, color='#5f6368', lw=1)
        axes[1].set_title("Correlation with Target '${safeTarget}'", fontsize=10, color='#e8eaed')
    else:
        axes[1].text(0.5, 0.5, "Target '${safeTarget}' is non-numeric", ha='center', va='center', color='#9aa0a6')
    axes[1].grid(axis='x', alpha=0.12)
    plt.tight_layout()

corr_mat.round(3)`;
      break;

    case 'missing_cardinality':
      title = `Kiểm tra Missing & Cardinality (${dsLabel})`;
      subtitle = 'Bảng chi tiết giá trị thiếu + Biểu đồ cột';
      code = `# Bảng tổng hợp chất lượng dữ liệu cho '${dsLabel}'
quality_df = pd.DataFrame({
    'dtype': df.dtypes.astype(str),
    'missing_cnt': df.isna().sum(),
    'missing_pct (%)': (df.isna().sum() / max(len(df), 1) * 100).round(2),
    'nunique': df.nunique(dropna=True),
    'sample_val': [df[c].dropna().iloc[0] if df[c].notna().any() else None for c in df.columns]
}).sort_values('missing_pct (%)', ascending=False)

missing_nonzero = quality_df[quality_df['missing_pct (%)'] > 0]
if len(missing_nonzero) > 0:
    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8.5, 3.0), dpi=115)
    fig.patch.set_facecolor('#202124')
    ax.set_facecolor('#18191a')
    ax.barh(missing_nonzero.index[::-1], missing_nonzero['missing_pct (%)'][::-1], color='#fdd663', height=0.55)
    ax.set_xlabel('Missing (%)', fontsize=9)
    ax.set_title(f'Missing Values Breakdown ({len(missing_nonzero)} columns)', fontsize=10, color='#e8eaed')
    ax.grid(axis='x', alpha=0.12)
    plt.tight_layout()
else:
    print("Tuyệt vời: Không có cột nào bị thiếu dữ liệu (0% missing).")

quality_df`;
      break;

    case 'groupby_pivot':
      title = `Thống kê GroupBy (${firstCatCol || 'Nhóm'})`;
      subtitle = 'Bảng Pivot tổng hợp Target theo nhóm phân loại';
      code = `# Thống kê Target '${safeTarget}' theo nhóm phân loại của '${dsLabel}'
group_col = '${firstCatCol}'
if not group_col or group_col not in df.columns:
    cat_cands = [c for c in df.select_dtypes(include=['object', 'category', 'bool']).columns if c != '${safeTarget}' and df[c].nunique() <= 20]
    group_col = cat_cands[0] if cat_cands else None

if not group_col:
    print("Không tìm thấy cột phân loại phù hợp (<= 20 giá trị) để GroupBy.")
else:
    pivot_df = df.groupby(group_col, dropna=False)['${safeTarget}'].agg(['count', 'mean']).sort_values('count', ascending=False).head(12)
    pivot_df['mean'] = pivot_df['mean'].round(4)

    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8.5, 3.2), dpi=115)
    fig.patch.set_facecolor('#202124')
    ax.set_facecolor('#18191a')
    ax.bar(pivot_df.index.astype(str), pivot_df['mean'], color='#8ab4f8', width=0.55)
    ax.set_title(f"Mean '${safeTarget}' by '{group_col}'", fontsize=10, color='#e8eaed')
    ax.tick_params(axis='x', rotation=25)
    ax.grid(axis='y', alpha=0.12)
    plt.tight_layout()
    pivot_df`;
      break;

    case 'learning_curve':
      title = `Learning Curve (${dsLabel})`;
      subtitle = 'Đường cong học tập Train vs CV — chẩn đoán Overfitting / Underfitting';
      code = `# Đường cong học tập (Learning Curve) cho full_pipeline
from sklearn.base import clone
from sklearn.model_selection import learning_curve

if 'full_pipeline' not in globals() or 'X_train' not in globals():
    raise RuntimeError("Hãy chạy đủ 5 cell pipeline trước khi vẽ Learning Curve.")

_lc_metric = '${isClass ? 'accuracy' : 'neg_root_mean_squared_error'}'
_train_sizes, _train_scores, _val_scores = learning_curve(
    clone(full_pipeline),
    X_train,
    y_train,
    cv=min(3, ${config.cvFolds}),
    train_sizes=np.linspace(0.2, 1.0, 5),
    scoring=_lc_metric,
    n_jobs=1
)
_tr_mean = np.abs(_train_scores.mean(axis=1)) if 'neg_' in _lc_metric else _train_scores.mean(axis=1)
_va_mean = np.abs(_val_scores.mean(axis=1)) if 'neg_' in _lc_metric else _val_scores.mean(axis=1)
_tr_std = _train_scores.std(axis=1)
_va_std = _val_scores.std(axis=1)

plt.style.use('dark_background')
fig, ax = plt.subplots(figsize=(8.2, 3.6), dpi=115)
fig.patch.set_facecolor('#202124')
ax.set_facecolor('#18191a')
ax.plot(_train_sizes, _tr_mean, 'o-', color='#8ab4f8', lw=2, label='Train')
ax.fill_between(_train_sizes, _tr_mean - _tr_std, _tr_mean + _tr_std, alpha=0.12, color='#8ab4f8')
ax.plot(_train_sizes, _va_mean, 'o-', color='#81c995', lw=2, label='Validation (CV)')
ax.fill_between(_train_sizes, _va_mean - _va_std, _va_mean + _va_std, alpha=0.12, color='#81c995')
ax.set_title('Learning Curve (Train vs CV)', fontsize=10, color='#e8eaed')
ax.set_xlabel('Số lượng mẫu Train', fontsize=9)
ax.set_ylabel('RMSE' if 'neg_' in _lc_metric else 'Accuracy', fontsize=9)
ax.legend(fontsize=8)
ax.grid(alpha=0.12)
plt.tight_layout()
print(f"Final Train: {_tr_mean[-1]:.4f} | Final CV: {_va_mean[-1]:.4f}")`;
      break;

    case 'error_analysis':
      title = `Error Analysis (${dsLabel})`;
      subtitle = 'Top 10 mẫu trên tập Test có sai số / nhầm lẫn lớn nhất';
      code = `# Phân tích lỗi (Error Analysis) trên tập Holdout X_test
if 'full_pipeline' not in globals() or 'X_test' not in globals():
    raise RuntimeError("Hãy chạy đủ 5 cell pipeline trước khi phân tích lỗi.")

_err_df = X_test.copy()
_y_true_arr = np.asarray(y_test)
_y_pred_arr = np.asarray(full_pipeline.predict(X_test))
_err_df['y_true'] = _y_true_arr
_err_df['y_pred'] = _y_pred_arr

if '${config.taskType}' == 'classification':
    if hasattr(full_pipeline, 'predict_proba') and len(np.unique(_y_true_arr)) == 2:
        _prob1 = full_pipeline.predict_proba(X_test)[:, 1]
        _err_df['prob_1'] = np.round(_prob1, 4)
        _err_df['error_margin'] = np.abs(_y_true_arr - _prob1)
    else:
        _err_df['error_margin'] = (_y_true_arr != _y_pred_arr).astype(float)
    _mis = _err_df[_err_df['y_true'] != _err_df['y_pred']].sort_values('error_margin', ascending=False)
    print(f"Tổng số mẫu dự đoán sai: {len(_mis):,} / {len(_err_df):,} ({len(_mis)/max(1,len(_err_df))*100:.1f}%)")
    _top_errors = _mis.head(10)
else:
    _err_df['abs_error'] = np.abs(_y_true_arr - _y_pred_arr)
    _top_errors = _err_df.sort_values('abs_error', ascending=False).head(10)
    print(f"MAE trung bình: {_err_df['abs_error'].mean():.4f} | Sai số lớn nhất: {_err_df['abs_error'].max():.4f}")

_top_errors`;
      break;

    case 'threshold_tuning':
      title = `Threshold Tuning (${dsLabel})`;
      subtitle = 'Quét ngưỡng 0.10 -> 0.90 để cân bằng Precision / Recall / F1';
      code = `# Tối ưu ngưỡng quyết định (Decision Threshold) cho phân loại nhị phân
from sklearn.metrics import precision_score, recall_score, f1_score

if 'full_pipeline' not in globals() or 'X_test' not in globals():
    raise RuntimeError("Hãy chạy đủ 5 cell pipeline trước.")
if '${config.taskType}' != 'classification' or len(np.unique(y_test)) != 2 or not hasattr(full_pipeline, 'predict_proba'):
    print("Threshold Tuning áp dụng cho bài toán Phân loại nhị phân (2 lớp) có predict_proba.")
else:
    _probs = full_pipeline.predict_proba(X_test)[:, 1]
    _ths = np.linspace(0.10, 0.90, 17)
    _precs, _recs, _f1s = [], [], []
    for _t in _ths:
        _p = (_probs >= _t).astype(int)
        _precs.append(precision_score(y_test, _p, zero_division=0))
        _recs.append(recall_score(y_test, _p, zero_division=0))
        _f1s.append(f1_score(y_test, _p, zero_division=0))
    _best_idx = int(np.argmax(_f1s))
    print(f"Ngưỡng F1 tối ưu: {_ths[_best_idx]:.2f} -> F1={_f1s[_best_idx]:.4f} (Precision={_precs[_best_idx]:.4f}, Recall={_recs[_best_idx]:.4f})")

    plt.style.use('dark_background')
    fig, ax = plt.subplots(figsize=(8.2, 3.4), dpi=115)
    fig.patch.set_facecolor('#202124')
    ax.set_facecolor('#18191a')
    ax.plot(_ths, _precs, 'o-', color='#8ab4f8', label='Precision')
    ax.plot(_ths, _recs, 'o-', color='#fdd663', label='Recall')
    ax.plot(_ths, _f1s, 'o-', color='#81c995', lw=2, label='F1-Score')
    ax.axvline(_ths[_best_idx], color='#f28b82', linestyle='--', label=f'Best Th={_ths[_best_idx]:.2f}')
    ax.set_title('Precision / Recall / F1 theo Ngưỡng xác suất', fontsize=10, color='#e8eaed')
    ax.set_xlabel('Threshold', fontsize=9)
    ax.legend(fontsize=8)
    ax.grid(alpha=0.12)
    plt.tight_layout()`;
      break;

    case 'export_model_pkl':
      title = `Export model.pkl (${dsLabel})`;
      subtitle = 'Lưu full_pipeline bằng joblib & kiểm tra dự đoán sau khi nạp lại';
      code = `# Lưu mô hình (full_pipeline) ra file model.pkl và kiểm tra round-trip
import joblib

if 'full_pipeline' not in globals():
    raise RuntimeError("Chưa có full_pipeline. Hãy chạy Cell Train Model trước.")

_artifact = {
    'pipeline': full_pipeline,
    'features': list(X_train.columns),
    'target': TARGET_COL,
    'label_encoder': globals().get('target_label_encoder', None),
}
_pkl_path = '/tmp/model.pkl' if os.path.exists('/tmp') else 'model.pkl'
joblib.dump(_artifact, _pkl_path)
if _pkl_path != 'model.pkl':
    joblib.dump(_artifact, 'model.pkl')

_loaded = joblib.load(_pkl_path)
_sample_pred = _loaded['pipeline'].predict(X_test.head(3))
print(f"Đã lưu thành công: {_pkl_path} ({os.path.getsize(_pkl_path)/1024:.1f} KB)")
print("Dự đoán thử 3 dòng đầu X_test sau khi reload:", _sample_pred)`;
      break;
  }

  return {
    id: `snip_${snippetId}_${Date.now()}`,
    order,
    cellType: 'code',
    stepType: 'custom',
    title,
    subtitle,
    customTitle: true,
    generatedCode: code,
    currentCode: code,
    isLocked: true,
    status: 'idle',
    outputText: '',
    figures: [],
  };
}
