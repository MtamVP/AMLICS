export type TaskType = 'classification' | 'regression';
export type RuntimeMode = 'pyodide' | 'cloud';
export type WorkerStatus = 'offline' | 'initializing' | 'idle' | 'busy' | 'error';

export type StepType =
  | 'data_load'
  | 'preprocess'
  | 'split_cv'
  | 'model_train'
  | 'evaluate'
  | 'custom';

export type NumericImputerStrategy = 'median' | 'mean' | 'most_frequent' | 'constant_zero';
export type NumericScalerStrategy = 'standard' | 'robust' | 'minmax' | 'none';
export type CategoricalImputerStrategy = 'most_frequent' | 'constant_missing';
export type CategoricalEncoderStrategy = 'onehot' | 'ordinal';
export type ImbalanceStrategy = 'none' | 'class_weight' | 'random_oversample';

export type ModelFamily =
  | 'HistGradientBoosting'
  | 'RandomForest'
  | 'ExtraTrees'
  | 'LinearModel'
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
  randomState: number;
}

export interface PipelineConfig {
  datasetSource: 'sample' | 'upload' | 'cloud_url';
  sampleDatasetId: string;
  uploadedFileName: string;
  cloudDatasetUrl: string;
  targetColumn: string;
  taskType: TaskType;
  dropColumns: string[];
  numericColumns: string[];
  categoricalColumns: string[];

  // Bước 2: Tiền xử lý chống Data Leakage (ColumnTransformer)
  numericImputer: NumericImputerStrategy;
  numericScaler: NumericScalerStrategy;
  addMissingIndicator: boolean;
  categoricalImputer: CategoricalImputerStrategy;
  categoricalEncoder: CategoricalEncoderStrategy;
  maxOneHotCategories: number;

  // Bước 3: Chia tập & Cross Validation
  testSize: number;
  cvFolds: number;
  stratifiedCV: boolean;
  imbalanceStrategy: ImbalanceStrategy;

  // Bước 4: Mô hình & Hyperparameters
  modelFamily: ModelFamily;
  hyperparameters: HyperparameterConfig;
}

export interface ColumnProfile {
  name: string;
  dtype: string;
  inferred_type: 'numeric' | 'categorical' | 'binary' | 'text_or_id';
  missing_pct: number;
  nunique: number;
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
  top_values?: Record<string, number>;
}

export interface DataProfile {
  dataset_name: string;
  shape: [number, number];
  memory_mb: number;
  columns: ColumnProfile[];
  head: Record<string, unknown>[];
}

export interface NotebookCell {
  id: string;
  order: number;
  stepType: StepType;
  title: string;
  subtitle: string;
  generatedCode: string;
  currentCode: string;
  isLocked: boolean;
  status: 'idle' | 'running' | 'success' | 'error' | 'stopped';
  outputText: string;
  figures: string[];
  durationMs?: number;
}

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
  cv_mean?: number;
  cv_std?: number;
  // Regression
  rmse?: number;
  mae?: number;
  r2?: number;
}

export interface ExperimentRecord {
  id: string;
  runNumber: number;
  timestamp: string;
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
    cvFolds: number;
    featureCount: number;
  };
  metrics: ExperimentMetrics;
  featureImportance: FeatureImportanceItem[];
  rocCurve?: RocPoint[];
  confusionMatrix?: number[][];
  figures: string[];
  durationMs: number;
  codeSnapshot: { title: string; code: string }[];
  configSnapshot: PipelineConfig;
}

export interface HardwareInfo {
  platform: string;
  gpu: string;
  ram_used_gb: number;
  ram_total_gb: number;
  python?: string;
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
