export type TaskType = 'classification' | 'regression';
export type RuntimeMode = 'pyodide' | 'cloud';
export type WorkerStatus = 'offline' | 'initializing' | 'idle' | 'busy' | 'error';

export type CellType = 'code' | 'markdown';

export type StepType =
  | 'data_load'
  | 'preprocess'
  | 'split_cv'
  | 'model_train'
  | 'evaluate'
  | 'submission'
  | 'custom'
  | 'markdown_doc';

export type NumericImputerStrategy = 'median' | 'mean' | 'most_frequent' | 'constant_zero' | 'knn';
export type NumericScalerStrategy = 'standard' | 'robust' | 'minmax' | 'quantile_normal' | 'power_yeojohnson' | 'none';
export type CategoricalImputerStrategy = 'most_frequent' | 'constant_missing';
export type CategoricalEncoderStrategy = 'onehot' | 'ordinal' | 'target';
export type FeatureSelectionStrategy = 'none' | 'select_k_best_10' | 'select_k_best_20' | 'select_from_model';
export type ImbalanceStrategy = 'none' | 'class_weight' | 'random_oversample' | 'random_undersample';
export type CVStrategy = 'stratified_kfold' | 'kfold' | 'repeated_stratified_kfold' | 'group_kfold' | 'timeseries_split';
export type TuningStrategy = 'none' | 'randomized_search' | 'grid_search';
export type ScoringMetricStrategy = 'auto' | 'roc_auc' | 'f1_weighted' | 'accuracy' | 'rmse' | 'mae' | 'r2';

export type ModelFamily =
  | 'HistGradientBoosting'
  | 'GradientBoosting'
  | 'RandomForest'
  | 'ExtraTrees'
  | 'DecisionTree'
  | 'LinearModel'
  | 'SVM'
  | 'KNeighbors'
  | 'MLPNeuralNet'
  | 'LightGBM'
  | 'XGBoost'
  | 'CatBoost';

export interface HyperparameterConfig {
  nEstimators: number;
  learningRate: number;
  maxDepth: number;
  minSamplesLeaf: number;
  l2Regularization: number;
  subsample: number;
  earlyStopping: boolean;
  randomState: number;
}

export interface PipelineConfig {
  datasetSource: 'upload' | 'public_url' | 'cloud_path';
  uploadedFileName: string;
  testUploadedFileName: string;
  publicDatasetUrl: string;
  cloudDatasetPath: string;
  subsampleRows: number; // 0 = full dataset, >0 = sample n rows for fast iteration
  targetColumn: string;
  idColumnForSubmission: string;
  taskType: TaskType;
  dropColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];

  // Bước 1: Dữ liệu & Schema
  dropDuplicates: boolean;

  // Bước 2: Tiền xử lý & Feature Engineering trong Pipeline (Chống Data Leakage)
  numericImputer: NumericImputerStrategy;
  numericScaler: NumericScalerStrategy;
  addMissingIndicator: boolean;
  logTransformNumeric: boolean;
  polynomialInteractions: boolean;
  varianceThreshold: boolean;
  featureSelection: FeatureSelectionStrategy;
  categoricalImputer: CategoricalImputerStrategy;
  categoricalEncoder: CategoricalEncoderStrategy;
  maxOneHotCategories: number;

  // Bước 3: Chia tập & Cross Validation (Chống Leakage theo Nhóm / Thời gian)
  testSize: number;
  cvFolds: number;
  cvStrategy: CVStrategy;
  groupColumn: string;
  imbalanceStrategy: ImbalanceStrategy;
  scoringMetric: ScoringMetricStrategy;

  // Bước 4: Mô hình, Hyperparameters & Tuning
  modelFamily: ModelFamily;
  tuningStrategy: TuningStrategy;
  tuningIterations: number;
  hyperparameters: HyperparameterConfig;

  // Danh sách các trường đã được Auto-Optimize / AI BYOK tự động chọn (hiển thị nhãn [Auto])
  autoSelectedFields?: string[];
}

export interface NotebookWorkspaceMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  inferred_type: 'numeric' | 'categorical' | 'binary' | 'id_or_constant' | 'text';
  missing_pct: number;
  nunique: number;
  is_id_like?: boolean;
  is_constant?: boolean;
  target_corr?: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  top_values?: Record<string, number>;
}

export interface DataQualityWarning {
  level: 'info' | 'warning' | 'critical';
  column?: string;
  kind: 'id_column' | 'constant_column' | 'high_missing' | 'high_cardinality' | 'duplicate_rows' | 'leakage_risk' | 'large_dataset';
  message: string;
}

export interface DataProfile {
  dataset_name: string;
  shape: [number, number];
  memory_mb: number;
  duplicate_rows?: number;
  columns: ColumnProfile[];
  head: Record<string, unknown>[];
  warnings?: DataQualityWarning[];
}

export interface NotebookCell {
  id: string;
  order: number;
  cellType: CellType;
  stepType: StepType;
  title: string;
  subtitle: string;
  customTitle?: boolean;
  generatedCode: string;
  currentCode: string;
  isLocked: boolean;
  status: 'idle' | 'running' | 'success' | 'error' | 'stopped';
  outputText: string;
  htmlOutput?: string;
  figures: string[];
  durationMs?: number;
}

export type PipelineTemplateId =
  | 'classification_pipeline'
  | 'regression_pipeline'
  | 'kaggle_submission'
  | 'eda_exploration'
  | 'timeseries_group_cv'
  | 'blank_notebook';

export type QuickSnippetId =
  | 'model_benchmark'
  | 'dist_boxplots'
  | 'corr_heatmap'
  | 'missing_cardinality'
  | 'groupby_pivot';

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface RocPoint {
  fpr: number;
  tpr: number;
}

export interface ExperimentMetrics {
  // Classification
  roc_auc?: number;
  f1?: number;
  accuracy?: number;
  precision?: number;
  recall?: number;
  // Regression
  rmse?: number;
  mae?: number;
  r2?: number;
  // Cross-validation & Overfit diagnostics
  train_score?: number;
  cv_mean?: number;
  cv_std?: number;
}

export interface ExperimentRecord {
  id: string;
  runNumber: number;
  timestamp: string;
  datasetName: string;
  targetColumn: string;
  modelName: string;
  modelFamily: ModelFamily;
  taskType: TaskType;
  runtimeUsed: string;
  hyperparameters: HyperparameterConfig;
  preprocessingSummary: {
    numericImputer: string;
    numericScaler: string;
    categoricalEncoder: string;
    imbalanceStrategy: string;
    cvStrategy: string;
    cvFolds: number;
    featureCount: number;
  };
  metrics: ExperimentMetrics;
  featureImportance: FeatureImportanceItem[];
  rocCurve?: RocPoint[];
  confusionMatrix?: number[][];
  figures: string[];
  durationMs: number;
  codeSnapshot: { title: string; cellType: CellType; code: string }[];
  configSnapshot: PipelineConfig;
}

export interface HardwareInfo {
  platform: string;
  gpu: string;
  ram_used_gb: number;
  ram_total_gb: number;
  python?: string;
  available_files?: string[];
}

export interface CliLogEntry {
  id: string;
  timestamp: string;
  stream: 'stdout' | 'stderr' | 'system';
  text: string;
  cellId?: string;
}

export interface SupabaseCredentials {
  url: string;
  anonKey: string;
}
