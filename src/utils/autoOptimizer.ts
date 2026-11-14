import {
  DataProfile,
  ExperimentRecord,
  PipelineConfig,
  TaskType,
} from '../types/studio';

export interface AutoOptimizeResult {
  nextConfig: PipelineConfig;
  autoFields: string[];
  reasons: string[];
}

export function inferTaskTypeAndReason(
  profile: DataProfile,
  targetCol: string
): { taskType: TaskType; reason: string } {
  const col = profile.columns.find((c) => c.name === targetCol);
  if (!col) {
    return { taskType: 'classification', reason: 'Mặc định Classification.' };
  }
  const isNumericDtype =
    col.dtype.includes('int') || col.dtype.includes('float');

  if (!isNumericDtype) {
    return {
      taskType: 'classification',
      reason: `Cột '${targetCol}' là kiểu chữ/phân loại (${col.nunique} nhãn) -> Tự động chọn Classification.`,
    };
  }
  if (col.nunique <= 12) {
    return {
      taskType: 'classification',
      reason: `Cột '${targetCol}' có ${col.nunique} giá trị rời rạc (<= 12) -> Tự động chọn Classification.`,
    };
  }
  return {
    taskType: 'regression',
    reason: `Cột '${targetCol}' là số liên tục (${col.nunique} giá trị) -> Tự động chọn Regression.`,
  };
}

export function computeAutoOptimizedConfig(
  profile: DataProfile,
  current: PipelineConfig
): AutoOptimizeResult {
  const reasons: string[] = [];
  const autoFields: string[] = [];

  const targetCol = current.targetColumn || profile.columns[profile.columns.length - 1]?.name;
  const { taskType, reason: taskReason } = inferTaskTypeAndReason(profile, targetCol);
  reasons.push(taskReason);
  autoFields.push('taskType');

  const nRows = profile.shape[0];
  const hasMissing = profile.columns.some((c) => c.missing_pct > 0);
  const hasHighMissing = profile.columns.some((c) => c.missing_pct >= 15);
  const hasDupes = (profile.duplicate_rows || 0) > 0;

  // Check skewness or wide range in numeric columns
  const hasSkewedNumeric = profile.columns.some(
    (c) =>
      c.inferred_type === 'numeric' &&
      c.max !== undefined &&
      c.min !== undefined &&
      c.std !== undefined &&
      c.std > 0 &&
      (c.max - c.min) / c.std > 8
  );

  // Check target imbalance for binary classification
  const targetMeta = profile.columns.find((c) => c.name === targetCol);
  const isImbalanced =
    taskType === 'classification' &&
    targetMeta?.mean !== undefined &&
    (targetMeta.mean < 0.25 || targetMeta.mean > 0.75);

  const numericImputer: PipelineConfig['numericImputer'] =
    hasHighMissing && nRows <= 15000 ? 'knn' : 'median';
  autoFields.push('numericImputer');
  if (numericImputer === 'knn') {
    reasons.push('Có cột thiếu >= 15% dữ liệu -> Chọn KNNImputer (k=5) để giữ tương quan.');
  }

  const numericScaler: PipelineConfig['numericScaler'] = hasSkewedNumeric
    ? 'robust'
    : 'standard';
  autoFields.push('numericScaler');

  const logTransformNumeric = hasSkewedNumeric;
  if (hasSkewedNumeric) {
    autoFields.push('logTransformNumeric');
    reasons.push('Phát hiện biến số có ngoại lai/lệch phân phối -> Bật RobustScaler + np.log1p.');
  }

  const hasHighCardCat = current.categoricalColumns.some((colName) => {
    const cm = profile.columns.find((c) => c.name === colName);
    return cm && cm.nunique > 15;
  });
  const categoricalEncoder: PipelineConfig['categoricalEncoder'] = hasHighCardCat
    ? 'target'
    : 'onehot';
  autoFields.push('categoricalEncoder');
  if (hasHighCardCat) {
    reasons.push('Có biến phân loại nhiều nhóm (>15) -> Chọn TargetEncoder (CV-safe).');
  }

  const cvStrategy: PipelineConfig['cvStrategy'] =
    taskType === 'classification' ? 'stratified_kfold' : 'kfold';
  autoFields.push('cvStrategy');

  const imbalanceStrategy: PipelineConfig['imbalanceStrategy'] = isImbalanced
    ? 'class_weight'
    : 'none';
  if (isImbalanced) {
    autoFields.push('imbalanceStrategy');
    reasons.push("Phát hiện mất cân bằng lớp -> Bật class_weight='balanced'.");
  }

  // Choose best estimator for tabular data
  const modelFamily: PipelineConfig['modelFamily'] =
    nRows < 400 ? 'RandomForest' : 'HistGradientBoosting';
  autoFields.push('modelFamily');

  const tuningStrategy: PipelineConfig['tuningStrategy'] =
    nRows <= 25000 ? 'randomized_search' : 'none';
  autoFields.push('tuningStrategy');
  if (tuningStrategy === 'randomized_search') {
    reasons.push(
      `Chọn ${modelFamily} + RandomizedSearchCV để tự động tối ưu điểm CV cao nhất.`
    );
  }

  // Auto-tune hyperparameters based on dataset size
  const autoHp: PipelineConfig['hyperparameters'] =
    nRows < 1000
      ? {
          ...current.hyperparameters,
          nEstimators: 150,
          learningRate: 0.05,
          maxDepth: 4,
          l2Regularization: 2.0,
          minSamplesLeaf: 10,
          subsample: 0.85,
          earlyStopping: false,
        }
      : nRows <= 15000
      ? {
          ...current.hyperparameters,
          nEstimators: 250,
          learningRate: 0.05,
          maxDepth: 6,
          l2Regularization: 1.0,
          minSamplesLeaf: 15,
          subsample: 0.85,
          earlyStopping: true,
        }
      : {
          ...current.hyperparameters,
          nEstimators: 300,
          learningRate: 0.06,
          maxDepth: 8,
          l2Regularization: 1.5,
          minSamplesLeaf: 20,
          subsample: 0.8,
          earlyStopping: true,
        };

  autoFields.push(
    'hp.nEstimators',
    'hp.learningRate',
    'hp.maxDepth',
    'hp.l2Regularization',
    'hp.minSamplesLeaf',
    'hp.subsample',
    'hp.earlyStopping'
  );
  reasons.push(
    `Tự động tinh chỉnh siêu tham số theo quy mô ${nRows.toLocaleString()} dòng (n_estimators=${autoHp.nEstimators}, lr=${autoHp.learningRate}, max_depth=${autoHp.maxDepth}, early_stopping=${autoHp.earlyStopping}).`
  );

  const nextConfig: PipelineConfig = {
    ...current,
    taskType,
    dropDuplicates: hasDupes,
    numericImputer,
    numericScaler,
    addMissingIndicator: hasMissing,
    logTransformNumeric,
    categoricalEncoder,
    cvStrategy,
    cvFolds: nRows < 300 ? 3 : 5,
    imbalanceStrategy,
    modelFamily,
    tuningStrategy,
    tuningIterations: nRows <= 5000 ? 8 : 5,
    subsampleRows: nRows > 30000 ? 10000 : 0,
    hyperparameters: autoHp,
    autoSelectedFields: autoFields,
  };

  return { nextConfig, autoFields, reasons };
}

export interface ModelHealthReport {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D';
  healthScore: number;
  badges: {
    label: string;
    level: 'good' | 'warn' | 'bad';
    tip: string;
  }[];
}

export function evaluateModelHealth(exp: ExperimentRecord): ModelHealthReport {
  const badges: ModelHealthReport['badges'] = [];
  const m = exp.metrics;
  let score = 70;

  if (exp.taskType === 'classification') {
    const primary = m.roc_auc ?? m.f1 ?? 0.5;
    score = Math.round(primary * 100);

    if (primary >= 0.999) {
      badges.push({
        label: 'Leakage Suspect',
        level: 'bad',
        tip: 'Điểm gần 1.000 bất thường — kiểm tra lại xem có cột nào làm lộ đáp án Target không.',
      });
      score -= 20;
    } else if (primary >= 0.85) {
      badges.push({
        label: 'High Accuracy',
        level: 'good',
        tip: 'Mô hình phân tách các lớp rất tốt trên tập kiểm định.',
      });
    }

    if (m.train_score !== undefined && m.cv_mean !== undefined) {
      const gap = m.train_score - m.cv_mean;
      if (gap > 0.08) {
        badges.push({
          label: `Overfit (+${gap.toFixed(2)})`,
          level: 'warn',
          tip: 'Train cao hơn CV nhiều. Hãy tăng l2_reg, tăng min_samples_leaf hoặc giảm max_depth.',
        });
        score -= 10;
      } else {
        badges.push({
          label: 'Generalizes Well',
          level: 'good',
          tip: 'Chênh lệch Train và CV thấp, mô hình không bị học vẹt.',
        });
      }
    }
  } else {
    const r2 = m.r2 ?? 0;
    score = Math.max(25, Math.min(99, Math.round(r2 * 100)));
    if (r2 >= 0.999) {
      badges.push({
        label: 'Leakage Suspect',
        level: 'bad',
        tip: 'R² gần 1.000 bất thường — kiểm tra khả năng lộ biến mục tiêu.',
      });
      score -= 20;
    } else if (r2 >= 0.75) {
      badges.push({
        label: 'Strong Fit',
        level: 'good',
        tip: `Mô hình giải thích được ${(r2 * 100).toFixed(1)}% phương sai dữ liệu.`,
      });
    } else if (r2 < 0.3) {
      badges.push({
        label: 'Underfitting',
        level: 'warn',
        tip: 'R² còn thấp. Thử bật PolynomialFeatures, log1p hoặc đổi sang HistGradientBoosting.',
      });
    }
  }

  if (m.cv_std !== undefined && exp.taskType === 'classification' && m.cv_std > 0.06) {
    badges.push({
      label: 'High Variance',
      level: 'warn',
      tip: `Độ lệch giữa các Fold cao (±${m.cv_std.toFixed(2)}). Thử tăng dữ liệu hoặc dùng RepeatedStratifiedKFold.`,
    });
    score -= 5;
  }

  score = Math.max(10, Math.min(100, score));
  const grade: ModelHealthReport['grade'] =
    score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 55 ? 'C' : 'D';

  return { grade, healthScore: score, badges };
}
