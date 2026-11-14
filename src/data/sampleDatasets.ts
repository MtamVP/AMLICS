import { DataProfile, PipelineConfig } from '../types/studio';

export interface PublicDatasetPreset {
  id: string;
  label: string;
  url: string;
  targetColumn: string;
  idColumn: string;
  taskType: 'classification' | 'regression';
  dropColumns: string[];
}

export const PUBLIC_URL_PRESETS: PublicDatasetPreset[] = [
  {
    id: 'titanic',
    label: 'Titanic Survival (titanic.csv - Real Dataset)',
    url: '/datasets/titanic.csv',
    targetColumn: 'Survived',
    idColumn: 'PassengerId',
    taskType: 'classification',
    dropColumns: ['PassengerId', 'Name', 'Ticket'],
  },
  {
    id: 'titanic_github',
    label: 'Titanic Full 891 rows (GitHub Raw CSV)',
    url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
    targetColumn: 'Survived',
    idColumn: 'PassengerId',
    taskType: 'classification',
    dropColumns: ['PassengerId', 'Name', 'Ticket', 'Cabin'],
  },
  {
    id: 'housing_github',
    label: 'California Housing Regression (GitHub Raw CSV)',
    url: 'https://raw.githubusercontent.com/ageron/handson-ml2/master/datasets/housing/housing.csv',
    targetColumn: 'median_house_value',
    idColumn: '',
    taskType: 'regression',
    dropColumns: [],
  },
];

export const INITIAL_TITANIC_PROFILE: DataProfile = {
  dataset_name: 'titanic.csv',
  shape: [200, 11],
  memory_mb: 0.04,
  duplicate_rows: 0,
  columns: [
    { name: 'PassengerId', dtype: 'int64', inferred_type: 'id_or_constant', missing_pct: 0.0, nunique: 200, is_id_like: true, min: 1, max: 200 },
    { name: 'Survived', dtype: 'int64', inferred_type: 'binary', missing_pct: 0.0, nunique: 2, mean: 0.345, std: 0.476, min: 0, max: 1 },
    { name: 'Pclass', dtype: 'int64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 3, mean: 2.38, std: 0.81, min: 1, max: 3 },
    { name: 'Name', dtype: 'object', inferred_type: 'text', missing_pct: 0.0, nunique: 200, is_id_like: true },
    { name: 'Sex', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.0, nunique: 2, top_values: { male: 129, female: 71 } },
    { name: 'Age', dtype: 'float64', inferred_type: 'numeric', missing_pct: 20.5, nunique: 62, mean: 28.4, std: 15.1, min: 0.83, max: 71 },
    { name: 'SibSp', dtype: 'int64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 6, mean: 0.63, std: 1.25, min: 0, max: 8 },
    { name: 'Parch', dtype: 'int64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 6, mean: 0.41, std: 0.88, min: 0, max: 5 },
    { name: 'Ticket', dtype: 'object', inferred_type: 'text', missing_pct: 0.0, nunique: 178, is_id_like: true },
    { name: 'Fare', dtype: 'float64', inferred_type: 'numeric', missing_pct: 0.0, nunique: 112, mean: 29.8, std: 46.2, min: 0, max: 263 },
    { name: 'Embarked', dtype: 'object', inferred_type: 'categorical', missing_pct: 0.5, nunique: 3, top_values: { S: 144, C: 36, Q: 19 } },
  ],
  head: [
    { PassengerId: 1, Survived: 0, Pclass: 3, Name: 'Braund, Mr. Owen Harris', Sex: 'male', Age: 22, SibSp: 1, Parch: 0, Ticket: 'A/5 21171', Fare: 7.25, Embarked: 'S' },
    { PassengerId: 2, Survived: 1, Pclass: 1, Name: 'Cumings, Mrs. John Bradley', Sex: 'female', Age: 38, SibSp: 1, Parch: 0, Ticket: 'PC 17599', Fare: 71.2833, Embarked: 'C' },
    { PassengerId: 3, Survived: 1, Pclass: 3, Name: 'Heikkinen, Miss. Laina', Sex: 'female', Age: 26, SibSp: 0, Parch: 0, Ticket: 'STON/O2. 3101282', Fare: 7.925, Embarked: 'S' },
    { PassengerId: 4, Survived: 1, Pclass: 1, Name: 'Futrelle, Mrs. Jacques Heath', Sex: 'female', Age: 35, SibSp: 1, Parch: 0, Ticket: '113803', Fare: 53.1, Embarked: 'S' },
    { PassengerId: 5, Survived: 0, Pclass: 3, Name: 'Allen, Mr. William Henry', Sex: 'male', Age: 35, SibSp: 0, Parch: 0, Ticket: '373450', Fare: 8.05, Embarked: 'S' },
  ],
  warnings: [
    {
      level: 'warning',
      column: 'PassengerId',
      kind: 'id_column',
      message: "Column 'PassengerId' has 100% unique sequential values (ID column) -> Automatically added to Drop list to prevent overfitting/leakage.",
    },
    {
      level: 'info',
      column: 'Age',
      kind: 'high_missing',
      message: "Column 'Age' has 20.5% missing values -> Will be imputed inside each CV fold via SimpleImputer.",
    },
  ],
};

export function createDefaultPipelineConfig(): PipelineConfig {
  return {
    datasetSource: 'public_url',
    uploadedFileName: '',
    testUploadedFileName: '',
    publicDatasetUrl: '/datasets/titanic.csv',
    cloudDatasetPath: '/kaggle/input/',
    subsampleRows: 0,
    targetColumn: 'Survived',
    idColumnForSubmission: 'PassengerId',
    taskType: 'classification',
    dropColumns: ['PassengerId', 'Name', 'Ticket'],
    numericColumns: ['Pclass', 'Age', 'SibSp', 'Parch', 'Fare'],
    categoricalColumns: ['Sex', 'Embarked'],

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
