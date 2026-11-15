import {
  CategoricalEncoderStrategy,
  CVStrategy,
  HyperparameterConfig,
  ImbalanceStrategy,
  ModelFamily,
  NotebookCell,
  NumericImputerStrategy,
  NumericScalerStrategy,
  PipelineConfig,
  RuntimeIntrospection,
  TaskType,
  TuningStrategy,
} from '../types/studio';

export const CLASS_TO_MODEL_INFO: Record<
  string,
  { family: ModelFamily; taskType?: TaskType }
> = {
  HistGradientBoostingClassifier: {
    family: 'HistGradientBoosting',
    taskType: 'classification',
  },
  HistGradientBoostingRegressor: {
    family: 'HistGradientBoosting',
    taskType: 'regression',
  },
  GradientBoostingClassifier: {
    family: 'GradientBoosting',
    taskType: 'classification',
  },
  GradientBoostingRegressor: {
    family: 'GradientBoosting',
    taskType: 'regression',
  },
  RandomForestClassifier: {
    family: 'RandomForest',
    taskType: 'classification',
  },
  RandomForestRegressor: {
    family: 'RandomForest',
    taskType: 'regression',
  },
  ExtraTreesClassifier: {
    family: 'ExtraTrees',
    taskType: 'classification',
  },
  ExtraTreesRegressor: {
    family: 'ExtraTrees',
    taskType: 'regression',
  },
  DecisionTreeClassifier: {
    family: 'DecisionTree',
    taskType: 'classification',
  },
  DecisionTreeRegressor: {
    family: 'DecisionTree',
    taskType: 'regression',
  },
  LogisticRegression: {
    family: 'LinearModel',
    taskType: 'classification',
  },
  Ridge: {
    family: 'LinearModel',
    taskType: 'regression',
  },
  SVC: { family: 'SVM', taskType: 'classification' },
  SVR: { family: 'SVM', taskType: 'regression' },
  KNeighborsClassifier: {
    family: 'KNeighbors',
    taskType: 'classification',
  },
  KNeighborsRegressor: {
    family: 'KNeighbors',
    taskType: 'regression',
  },
  MLPClassifier: {
    family: 'MLPNeuralNet',
    taskType: 'classification',
  },
  MLPRegressor: {
    family: 'MLPNeuralNet',
    taskType: 'regression',
  },
  LGBMClassifier: { family: 'LightGBM', taskType: 'classification' },
  LGBMRegressor: { family: 'LightGBM', taskType: 'regression' },
  XGBClassifier: { family: 'XGBoost', taskType: 'classification' },
  XGBRegressor: { family: 'XGBoost', taskType: 'regression' },
  CatBoostClassifier: { family: 'CatBoost', taskType: 'classification' },
  CatBoostRegressor: { family: 'CatBoost', taskType: 'regression' },
};

const KNOWN_ESTIMATOR_CLASSES = Object.keys(CLASS_TO_MODEL_INFO);

function stripPythonComments(code: string): string {
  return code
    .split(/\r?\n/)
    .map((line) => {
      let inSingle = false;
      let inDouble = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        const prev = i > 0 ? line[i - 1] : '';
        if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
        else if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
        else if (ch === '#' && !inSingle && !inDouble) {
          return line.slice(0, i);
        }
      }
      return line;
    })
    .join('\n');
}

function extractParenBody(code: string, openParenIdx: number): string {
  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  for (let i = openParenIdx; i < code.length; i++) {
    const ch = code[i];
    const prev = i > 0 ? code[i - 1] : '';
    if (ch === "'" && !inDouble && prev !== '\\') inSingle = !inSingle;
    else if (ch === '"' && !inSingle && prev !== '\\') inDouble = !inDouble;
    if (inSingle || inDouble) continue;
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return code.slice(openParenIdx + 1, i);
      }
    }
  }
  return code.slice(openParenIdx + 1);
}

function parseNumericArg(text: string, keys: string[]): number | undefined {
  for (const key of keys) {
    const regex = new RegExp(`(?:^|[,\\s(])${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)`);
    const m = text.match(regex);
    if (m) {
      const val = Number(m[1]);
      if (Number.isFinite(val)) return val;
    }
  }
  return undefined;
}

function parseBooleanArg(text: string, keys: string[]): boolean | undefined {
  for (const key of keys) {
    const regex = new RegExp(`(?:^|[,\\s(])${key}\\s*=\\s*(True|False)\\b`);
    const m = text.match(regex);
    if (m) return m[1] === 'True';
  }
  return undefined;
}

function findPrimaryModelClass(
  code: string
): { className: string; argsBody: string } | null {
  let latest: { className: string; argsBody: string; index: number } | null = null;
  let match: RegExpExecArray | null;

  // 1. Scan all 24 known estimator classes
  const knownPattern = new RegExp(
    `\\b(${KNOWN_ESTIMATOR_CLASSES.join('|')})\\s*\\(`,
    'g'
  );
  while ((match = knownPattern.exec(code)) !== null) {
    const className = match[1];
    const openIdx = match.index + match[0].length - 1;
    if (!latest || match.index >= latest.index) {
      latest = {
        className,
        argsBody: extractParenBody(code, openIdx),
        index: match.index,
      };
    }
  }

  // 2. Scan custom sklearn-like estimators outside built-in 12 families;
  // whoever appears later in the ordered code takes precedence!
  const customPattern =
    /\b([A-Z][A-Za-z0-9_]*(?:Classifier|Regressor|NB|Regression)|Lasso|ElasticNet|BayesianRidge|HuberRegressor|SGDClassifier|SGDRegressor|AdaBoostClassifier|AdaBoostRegressor|BaggingClassifier|BaggingRegressor|VotingClassifier|VotingRegressor|StackingClassifier|StackingRegressor)\s*\(/g;
  while ((match = customPattern.exec(code)) !== null) {
    const className = match[1];
    if (
      className === 'SelectFromModel' ||
      className === 'OneHotEncoder' ||
      className === 'OrdinalEncoder' ||
      KNOWN_ESTIMATOR_CLASSES.includes(className)
    ) {
      continue;
    }
    const openIdx = match.index + match[0].length - 1;
    if (!latest || match.index > latest.index) {
      latest = {
        className,
        argsBody: extractParenBody(code, openIdx),
        index: match.index,
      };
    }
  }

  return latest ? { className: latest.className, argsBody: latest.argsBody } : null;
}

function mapRawParamsToHyperparams(
  rawSource: Record<string, string | number | boolean | null | undefined>,
  baseHp: HyperparameterConfig
): { nextHp: HyperparameterConfig; changed: boolean } {
  const nextHp: HyperparameterConfig = { ...baseHp };
  let changed = false;

  const numFrom = (keys: string[]) => {
    for (const k of keys) {
      const v = rawSource[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
    }
    return undefined;
  };

  const nEst = numFrom(['n_estimators', 'max_iter', 'iterations']);
  if (nEst !== undefined && nEst >= 1 && nEst <= 50000 && Math.round(nEst) !== nextHp.nEstimators) {
    nextHp.nEstimators = Math.round(nEst);
    changed = true;
  }

  const lr = numFrom(['learning_rate', 'eta']);
  if (lr !== undefined && lr > 0 && lr <= 10 && lr !== nextHp.learningRate) {
    nextHp.learningRate = Number(lr.toFixed(6));
    changed = true;
  }

  const depth = numFrom(['max_depth', 'depth']);
  if (depth !== undefined && depth >= 1 && depth <= 100 && Math.round(depth) !== nextHp.maxDepth) {
    nextHp.maxDepth = Math.round(depth);
    changed = true;
  }

  const minLeaf = numFrom(['min_samples_leaf', 'min_child_samples', 'min_data_in_leaf']);
  if (minLeaf !== undefined && minLeaf >= 1 && minLeaf <= 1000 && Math.round(minLeaf) !== nextHp.minSamplesLeaf) {
    nextHp.minSamplesLeaf = Math.round(minLeaf);
    changed = true;
  }

  const l2 = numFrom(['l2_regularization', 'reg_lambda', 'l2_leaf_reg', 'alpha']);
  if (l2 !== undefined && l2 >= 0 && l2 <= 1000 && l2 !== nextHp.l2Regularization) {
    nextHp.l2Regularization = Number(l2.toFixed(4));
    changed = true;
  }

  const cParam = numFrom(['C']);
  if (cParam !== undefined && cParam > 0 && l2 === undefined) {
    const equivL2 = Number((1 / cParam).toFixed(4));
    if (equivL2 >= 0 && equivL2 <= 1000 && equivL2 !== nextHp.l2Regularization) {
      nextHp.l2Regularization = equivL2;
      changed = true;
    }
  }

  const sub = numFrom(['subsample']);
  if (sub !== undefined && sub > 0 && sub <= 1 && sub !== nextHp.subsample) {
    nextHp.subsample = Number(sub.toFixed(4));
    changed = true;
  }

  const es = rawSource['early_stopping'];
  if (typeof es === 'boolean' && es !== nextHp.earlyStopping) {
    nextHp.earlyStopping = es;
    changed = true;
  }

  const rs = numFrom(['random_state', 'random_seed']);
  if (rs !== undefined && Number.isInteger(rs) && rs !== nextHp.randomState) {
    nextHp.randomState = rs;
    changed = true;
  }

  return { nextHp, changed };
}

export interface CodeSyncResult {
  nextConfig: PipelineConfig;
  changedFields: string[];
}

/**
 * Parse edits from notebook code cells back into PipelineConfig so UI sidebar
 * stays synchronized with user-authored Python code without overwriting locked cells.
 */
export function parseCodeIntoConfigPatch(
  cells: NotebookCell[],
  currentConfig: PipelineConfig,
  editedCellId?: string
): CodeSyncResult | null {
  const codeCells = cells.filter((c) => c.cellType === 'code');
  if (codeCells.length === 0) return null;

  // Put edited cell last so its values take precedence if duplicates exist
  const orderedCells = editedCellId
    ? [
        ...codeCells.filter((c) => c.id !== editedCellId),
        ...codeCells.filter((c) => c.id === editedCellId),
      ]
    : codeCells;

  let nextConfig: PipelineConfig = {
    ...currentConfig,
    hyperparameters: { ...currentConfig.hyperparameters },
  };
  const changed = new Set<string>();

  // 1. Model & Hyperparameters (only inspect model_train and custom cells to avoid SelectFromModel false positives)
  const modelCells = orderedCells.filter(
    (c) => c.stepType === 'model_train' || c.stepType === 'custom'
  );
  const modelCode = stripPythonComments(modelCells.map((c) => c.currentCode).join('\n'));
  if (modelCode.trim()) {
    const primary = findPrimaryModelClass(modelCode);
    if (primary) {
      const info = CLASS_TO_MODEL_INFO[primary.className];
      if (info) {
        if (nextConfig.modelFamily !== info.family) {
          nextConfig.modelFamily = info.family;
          changed.add('modelFamily');
        }
        if (nextConfig.customModelName) {
          nextConfig.customModelName = null;
          changed.add('customModelName');
        }
        if (info.taskType && nextConfig.taskType !== info.taskType) {
          nextConfig.taskType = info.taskType;
          changed.add('taskType');
        }
      } else {
        const inferredTask: TaskType | undefined =
          /Regressor|Regression|Lasso|ElasticNet|Ridge/i.test(primary.className)
            ? 'regression'
            : /Classifier|Logistic|NB$/i.test(primary.className)
            ? 'classification'
            : undefined;
        if (nextConfig.customModelName !== primary.className) {
          nextConfig.customModelName = primary.className;
          changed.add('customModelName');
        }
        if (inferredTask && nextConfig.taskType !== inferredTask) {
          nextConfig.taskType = inferredTask;
          changed.add('taskType');
        }
      }

      const rawParams: Record<string, number | boolean | undefined> = {
        n_estimators: parseNumericArg(primary.argsBody, ['n_estimators', 'max_iter', 'iterations']),
        learning_rate: parseNumericArg(primary.argsBody, ['learning_rate', 'eta']),
        max_depth: parseNumericArg(primary.argsBody, ['max_depth', 'depth']),
        min_samples_leaf: parseNumericArg(primary.argsBody, ['min_samples_leaf', 'min_child_samples']),
        l2_regularization: parseNumericArg(primary.argsBody, ['l2_regularization', 'reg_lambda', 'l2_leaf_reg', 'alpha']),
        C: parseNumericArg(primary.argsBody, ['C']),
        subsample: parseNumericArg(primary.argsBody, ['subsample']),
        early_stopping: parseBooleanArg(primary.argsBody, ['early_stopping']),
        random_state: parseNumericArg(primary.argsBody, ['random_state', 'random_seed']),
      };

      const { nextHp, changed: hpChanged } = mapRawParamsToHyperparams(
        rawParams,
        nextConfig.hyperparameters
      );
      if (hpChanged) {
        nextConfig.hyperparameters = nextHp;
        changed.add('hyperparameters');
      }
    } else {
      // Even without a standard constructor call, allow inline variable overrides like n_estimators = 300
      const inlineRaw: Record<string, number | boolean | undefined> = {
        n_estimators: parseNumericArg(modelCode, ['n_estimators', 'max_iter', 'iterations']),
        learning_rate: parseNumericArg(modelCode, ['learning_rate', 'eta']),
        max_depth: parseNumericArg(modelCode, ['max_depth', 'depth']),
        min_samples_leaf: parseNumericArg(modelCode, ['min_samples_leaf', 'min_child_samples']),
        l2_regularization: parseNumericArg(modelCode, ['l2_regularization', 'reg_lambda', 'l2_leaf_reg', 'alpha']),
        subsample: parseNumericArg(modelCode, ['subsample']),
        random_state: parseNumericArg(modelCode, ['random_state', 'random_seed']),
      };
      const { nextHp, changed: hpChanged } = mapRawParamsToHyperparams(
        inlineRaw,
        nextConfig.hyperparameters
      );
      if (hpChanged) {
        nextConfig.hyperparameters = nextHp;
        changed.add('hyperparameters');
      }
    }

    // Detect Tuning Strategy edits
    let detectedTuning: TuningStrategy | undefined;
    if (/\bGridSearchCV\s*\(/.test(modelCode)) detectedTuning = 'grid_search';
    else if (/\bRandomizedSearchCV\s*\(/.test(modelCode)) detectedTuning = 'randomized_search';
    if (detectedTuning && detectedTuning !== nextConfig.tuningStrategy) {
      nextConfig.tuningStrategy = detectedTuning;
      changed.add('tuningStrategy');
    }
    const nIter = parseNumericArg(modelCode, ['n_iter']);
    if (nIter !== undefined && nIter >= 1 && nIter <= 100 && Math.round(nIter) !== nextConfig.tuningIterations) {
      nextConfig.tuningIterations = Math.round(nIter);
      changed.add('tuningIterations');
    }

    // Detect class_weight / oversample edits
    if (/RandomOverSampler/.test(modelCode) && nextConfig.imbalanceStrategy !== 'random_oversample') {
      nextConfig.imbalanceStrategy = 'random_oversample';
      changed.add('imbalanceStrategy');
    } else if (/RandomUnderSampler/.test(modelCode) && nextConfig.imbalanceStrategy !== 'random_undersample') {
      nextConfig.imbalanceStrategy = 'random_undersample';
      changed.add('imbalanceStrategy');
    } else if (
      /class_weight\s*=\s*['"]balanced['"]/.test(modelCode) &&
      nextConfig.imbalanceStrategy !== 'class_weight'
    ) {
      nextConfig.imbalanceStrategy = 'class_weight';
      changed.add('imbalanceStrategy');
    } else if (
      /class_weight\s*=\s*None/.test(modelCode) &&
      nextConfig.imbalanceStrategy === 'class_weight'
    ) {
      nextConfig.imbalanceStrategy = 'none';
      changed.add('imbalanceStrategy');
    }
  }

  // 2. Split & CV params (split_cv + custom)
  const splitCells = orderedCells.filter(
    (c) => c.stepType === 'split_cv' || c.stepType === 'custom'
  );
  const splitCode = stripPythonComments(splitCells.map((c) => c.currentCode).join('\n'));
  if (splitCode.trim()) {
    const testSize = parseNumericArg(splitCode, ['test_size']);
    if (testSize !== undefined && testSize >= 0.05 && testSize <= 0.5 && testSize !== nextConfig.testSize) {
      nextConfig.testSize = Number(testSize.toFixed(2));
      changed.add('testSize');
    }
    const cvFolds = parseNumericArg(splitCode, ['n_splits', 'cv_folds']);
    if (cvFolds !== undefined && cvFolds >= 2 && cvFolds <= 20 && Math.round(cvFolds) !== nextConfig.cvFolds) {
      nextConfig.cvFolds = Math.round(cvFolds);
      changed.add('cvFolds');
    }
    let nextCv: CVStrategy | undefined;
    if (/\bRepeatedStratifiedKFold\s*\(/.test(splitCode)) nextCv = 'repeated_stratified_kfold';
    else if (/\bStratifiedKFold\s*\(/.test(splitCode)) nextCv = 'stratified_kfold';
    else if (/\bGroupKFold\s*\(/.test(splitCode)) nextCv = 'group_kfold';
    else if (/\bTimeSeriesSplit\s*\(/.test(splitCode)) nextCv = 'timeseries_split';
    else if (/\bKFold\s*\(/.test(splitCode)) nextCv = 'kfold';
    if (nextCv && nextCv !== nextConfig.cvStrategy) {
      nextConfig.cvStrategy = nextCv;
      changed.add('cvStrategy');
    }

    const groupMatch = splitCode.match(/\bGROUP_COL\s*=\s*['"]([^'"]+)['"]/);
    if (groupMatch && groupMatch[1] !== nextConfig.groupColumn) {
      nextConfig.groupColumn = groupMatch[1];
      changed.add('groupColumn');
    }
  }

  // 3. Target column from data_load or custom
  const dataCells = orderedCells.filter(
    (c) => c.stepType === 'data_load' || c.stepType === 'custom'
  );
  const dataCode = stripPythonComments(dataCells.map((c) => c.currentCode).join('\n'));
  if (dataCode.trim()) {
    const targetMatch = dataCode.match(/\bTARGET_COL\s*=\s*['"]([^'"]+)['"]/);
    if (targetMatch && targetMatch[1] && targetMatch[1] !== nextConfig.targetColumn) {
      nextConfig.targetColumn = targetMatch[1];
      changed.add('targetColumn');
    }
  }

  // 4. Preprocessing choices from preprocess or custom
  const prepCells = orderedCells.filter(
    (c) => c.stepType === 'preprocess' || c.stepType === 'custom'
  );
  const prepCode = stripPythonComments(prepCells.map((c) => c.currentCode).join('\n'));
  if (prepCode.trim()) {
    let nextScaler: NumericScalerStrategy | undefined;
    if (/\bRobustScaler\s*\(/.test(prepCode)) nextScaler = 'robust';
    else if (/\bStandardScaler\s*\(/.test(prepCode)) nextScaler = 'standard';
    else if (/\bMinMaxScaler\s*\(/.test(prepCode)) nextScaler = 'minmax';
    else if (/\bQuantileTransformer\s*\(/.test(prepCode)) nextScaler = 'quantile_normal';
    else if (/\bPowerTransformer\s*\(/.test(prepCode)) nextScaler = 'power_yeojohnson';
    if (nextScaler && nextScaler !== nextConfig.numericScaler) {
      nextConfig.numericScaler = nextScaler;
      changed.add('numericScaler');
    }

    const numImpBlock = prepCode.match(/numeric_transformer\s*=[\s\S]*?(?=cat_transformer|preprocessor|$)/);
    if (numImpBlock) {
      let nextImp: NumericImputerStrategy | undefined;
      if (/KNNImputer\s*\(/.test(numImpBlock[0])) nextImp = 'knn';
      else if (/strategy\s*=\s*['"]median['"]/.test(numImpBlock[0])) nextImp = 'median';
      else if (/strategy\s*=\s*['"]mean['"]/.test(numImpBlock[0])) nextImp = 'mean';
      else if (/strategy\s*=\s*['"]most_frequent['"]/.test(numImpBlock[0])) nextImp = 'most_frequent';
      else if (/strategy\s*=\s*['"]constant['"]/.test(numImpBlock[0])) nextImp = 'constant_zero';
      if (nextImp && nextImp !== nextConfig.numericImputer) {
        nextConfig.numericImputer = nextImp;
        changed.add('numericImputer');
      }
    }

    let nextEnc: CategoricalEncoderStrategy | undefined;
    if (/\bTargetEncoder\s*\(/.test(prepCode)) nextEnc = 'target';
    else if (/\bOrdinalEncoder\s*\(/.test(prepCode)) nextEnc = 'ordinal';
    else if (/\bOneHotEncoder\s*\(/.test(prepCode)) nextEnc = 'onehot';
    if (nextEnc && nextEnc !== nextConfig.categoricalEncoder) {
      nextConfig.categoricalEncoder = nextEnc;
      changed.add('categoricalEncoder');
    }
  }

  // Fallback imbalance check on split_cv if user didn't put it in model_train
  if (splitCode && /\bclass_weight\s*=\s*['"]balanced['"]/.test(splitCode)) {
    const strat: ImbalanceStrategy = 'class_weight';
    if (nextConfig.imbalanceStrategy !== strat) {
      nextConfig.imbalanceStrategy = strat;
      changed.add('imbalanceStrategy');
    }
  }

  if (changed.size === 0) return null;

  // Strip Auto badge from fields edited directly in code
  if (nextConfig.autoSelectedFields && nextConfig.autoSelectedFields.length > 0) {
    nextConfig.autoSelectedFields = nextConfig.autoSelectedFields.filter(
      (f) => !changed.has(f)
    );
  }

  return {
    nextConfig,
    changedFields: Array.from(changed),
  };
}

/**
 * Merge runtime Python introspection (actual fitted class & get_params() in kernel)
 * into PipelineConfig so dynamic expressions / tuned params stay reflected accurately.
 */
export function mergeRuntimeIntrospectionIntoConfig(
  currentConfig: PipelineConfig,
  introspection?: RuntimeIntrospection | null
): { nextConfig: PipelineConfig; resolvedModelName: string; changed: boolean } {
  if (!introspection) {
    return {
      nextConfig: currentConfig,
      resolvedModelName: currentConfig.customModelName || currentConfig.modelFamily,
      changed: false,
    };
  }

  let nextConfig: PipelineConfig = {
    ...currentConfig,
    hyperparameters: { ...currentConfig.hyperparameters },
  };
  let changed = false;
  let resolvedModelName =
    introspection.model_name ||
    introspection.model_class ||
    currentConfig.customModelName ||
    currentConfig.modelFamily;

  if (introspection.model_class) {
    const info = CLASS_TO_MODEL_INFO[introspection.model_class];
    if (info) {
      if (nextConfig.modelFamily !== info.family) {
        nextConfig.modelFamily = info.family;
        changed = true;
      }
      if (nextConfig.customModelName) {
        nextConfig.customModelName = null;
        changed = true;
      }
      if (info.taskType && nextConfig.taskType !== info.taskType) {
        nextConfig.taskType = info.taskType;
        changed = true;
      }
      if (!introspection.model_name) {
        resolvedModelName = info.family;
      }
    } else {
      if (nextConfig.customModelName !== introspection.model_class) {
        nextConfig.customModelName = introspection.model_class;
        changed = true;
      }
      resolvedModelName = introspection.model_name || introspection.model_class;
    }
  }

  if (introspection.task_type && nextConfig.taskType !== introspection.task_type) {
    nextConfig.taskType = introspection.task_type;
    changed = true;
  }

  if (
    introspection.target_col &&
    introspection.target_col !== nextConfig.targetColumn
  ) {
    nextConfig.targetColumn = introspection.target_col;
    changed = true;
  }

  if (introspection.params) {
    const { nextHp, changed: hpChanged } = mapRawParamsToHyperparams(
      introspection.params,
      nextConfig.hyperparameters
    );
    if (hpChanged) {
      nextConfig.hyperparameters = nextHp;
      changed = true;
    }
  }

  return { nextConfig, resolvedModelName, changed };
}
