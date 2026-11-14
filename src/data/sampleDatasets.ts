import { PipelineConfig, PipelineTemplateId } from '../types/studio';

export interface PublicDatasetPreset {
  id: string;
  label: string;
  url: string;
  targetColumn: string;
  idColumn: string;
  taskType: 'classification' | 'regression';
  dropColumns: string[];
}

export interface PipelineTemplatePreset {
  id: PipelineTemplateId;
  label: string;
  shortLabel: string;
  description: string;
}

export const PIPELINE_TEMPLATES: PipelineTemplatePreset[] = [
  {
    id: 'classification_pipeline',
    label: 'Phân loại chuẩn (Classification + StratifiedKFold)',
    shortLabel: 'Phân loại (Classification)',
    description:
      'Sinh 5 cell chống Data Leakage: Đọc CSV -> ColumnTransformer -> StratifiedKFold -> Huấn luyện -> Đánh giá ROC-AUC & Confusion Matrix.',
  },
  {
    id: 'regression_pipeline',
    label: 'Dự báo Hồi quy (Regression + Log Transform + RMSE)',
    shortLabel: 'Hồi quy (Regression)',
    description:
      'Sinh 5 cell cho bài toán dự báo số liên tục: Imputer + FunctionTransformer(log1p) -> KFold -> Regressor -> Đánh giá RMSE, MAE, R².',
  },
  {
    id: 'kaggle_submission',
    label: 'Kaggle Competition (train.csv + test.csv -> submission.csv)',
    shortLabel: 'Kaggle Submission',
    description:
      'Đọc đồng thời train.csv và test.csv, tự động loại bỏ cột ID, chạy Cross-Validation và xuất file submission.csv.',
  },
  {
    id: 'eda_exploration',
    label: 'Khám phá dữ liệu (EDA, Missing Values & Tương quan)',
    shortLabel: 'Khám phá EDA',
    description:
      'Sinh các cell phân tích thống kê mô tả, kiểm tra tỷ lệ khuyết thiếu, dòng trùng lặp và vẽ biểu đồ tương quan.',
  },
  {
    id: 'timeseries_group_cv',
    label: 'Chống rò rỉ Thời gian / Nhóm (TimeSeriesSplit & GroupKFold)',
    shortLabel: 'TimeSeries / GroupCV',
    description:
      'Cấu hình kiểm định chéo không trộn thứ tự thời gian (TimeSeriesSplit) hoặc tách biệt theo nhóm (GroupKFold).',
  },
  {
    id: 'blank_notebook',
    label: 'Notebook Trống (1 Cell Python tự do)',
    shortLabel: 'Notebook Trống',
    description:
      'Khởi tạo 1 cell Python sạch (import pandas, numpy, matplotlib) để bạn tự viết code từ đầu như Google Colab / Kaggle.',
  },
];

export const PUBLIC_URL_PRESETS: PublicDatasetPreset[] = [
  {
    id: 'titanic',
    label: 'Titanic Survival (CSV thực tế - Phân loại)',
    url: '/datasets/titanic.csv',
    targetColumn: 'Survived',
    idColumn: 'PassengerId',
    taskType: 'classification',
    dropColumns: ['PassengerId', 'Name', 'Ticket'],
  },
  {
    id: 'titanic_github',
    label: 'Titanic 891 dòng (GitHub Raw CSV)',
    url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    targetColumn: 'Survived',
    idColumn: 'PassengerId',
    taskType: 'classification',
    dropColumns: ['PassengerId', 'Name', 'Ticket', 'Cabin'],
  },
  {
    id: 'housing_github',
    label: 'California Housing (GitHub Raw CSV - Hồi quy)',
    url: 'https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv',
    targetColumn: 'median_house_value',
    idColumn: '',
    taskType: 'regression',
    dropColumns: [],
  },
];

export function createDefaultPipelineConfig(): PipelineConfig {
  return {
    datasetSource: 'upload',
    uploadedFileName: '',
    testUploadedFileName: '',
    publicDatasetUrl: '',
    cloudDatasetPath: '/kaggle/input/',
    subsampleRows: 0,
    targetColumn: 'target',
    idColumnForSubmission: 'id',
    taskType: 'classification',
    dropColumns: ['id'],
    numericColumns: [],
    categoricalColumns: [],

    numericImputer: 'median',
    numericScaler: 'robust',
    addMissingIndicator: true,
    logTransformNumeric: false,
    categoricalImputer: 'most_frequent',
    categoricalEncoder: 'onehot',
    maxOneHotCategories: 20,

    testSize: 0.2,
    cvFolds: 5,
    cvStrategy: 'stratified_kfold',
    groupColumn: '',
    imbalanceStrategy: 'class_weight',

    modelFamily: 'HistGradientBoosting',
    tuningStrategy: 'none',
    tuningIterations: 8,
    hyperparameters: {
      nEstimators: 150,
      learningRate: 0.06,
      maxDepth: 6,
      minSamplesLeaf: 15,
      l2Regularization: 1.0,
      subsample: 0.85,
      randomState: 42,
    },
  };
}
