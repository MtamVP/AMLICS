export type TrackId =
  | 'track01_numpy'
  | 'track02_pandas'
  | 'track03_viz'
  | 'track04_preprocess'
  | 'track05_fe'
  | 'track06_cv'
  | 'track07_sklearn'
  | 'track08_boosting'
  | 'track09_unsupervised_ts'
  | 'track10_pytorch'
  | 'track11_tensorflow'
  | 'track12_kaggle';

export type DifficultyLevel = 'Cơ bản' | 'Trung bình' | 'Nâng cao' | 'Chuyên sâu';

export type LibraryTag =
  | 'Python'
  | 'NumPy'
  | 'Pandas'
  | 'Matplotlib'
  | 'Seaborn'
  | 'Plotly'
  | 'Preprocessing'
  | 'Feature Eng'
  | 'Validation/CV'
  | 'Scikit-Learn'
  | 'XGBoost'
  | 'LightGBM'
  | 'CatBoost'
  | 'Unsupervised'
  | 'Time Series'
  | 'PyTorch'
  | 'TensorFlow'
  | 'Kaggle E2E';

export interface LessonDatasetSpec {
  id: string;
  fileName: string;
  title: string;
  description: string;
  rows: number;
  cols: number;
  targetColumn?: string;
  columnsSummary: string[];
  generatorPython: string;
}

export interface LessonSection {
  title: string;
  contentMarkdown: string;
  exampleCode?: string;
  callout?: {
    type: 'tip' | 'warning' | 'formula' | 'note';
    title: string;
    text: string;
  };
}

export interface LessonExercise {
  prompt: string;
  requirements: string[];
  starterCode: string;
  hintText: string;
  solutionCode: string;
  checkPython: string;
}

export interface LessonDefinition {
  id: string;
  order: number;
  trackId: TrackId;
  title: string;
  subtitle: string;
  difficulty: DifficultyLevel;
  libraries: LibraryTag[];
  estimatedMinutes: number;
  requiresCloudRuntime?: boolean;
  datasetIds: string[];
  objectives: string[];
  sections: LessonSection[];
  exercise: LessonExercise;
}

export interface TrackDefinition {
  id: TrackId;
  order: number;
  title: string;
  shortTitle: string;
  description: string;
  levelRange: string;
  libraries: LibraryTag[];
}

export interface LessonProgressState {
  completed: boolean;
  attempts: number;
  lastCode?: string;
  completedAt?: number;
}

export interface GradingResult {
  passed: boolean;
  message: string;
  checkedAt: number;
}
