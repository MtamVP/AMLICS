import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { SAMPLE_DATASETS } from '../data/sampleDatasets';
import {
  CategoricalEncoderStrategy,
  CategoricalImputerStrategy,
  DataProfile,
  ImbalanceStrategy,
  ModelFamily,
  NumericImputerStrategy,
  NumericScalerStrategy,
  PipelineConfig,
  TaskType,
} from '../types/studio';

interface LeftPipelineSidebarProps {
  config: PipelineConfig;
  dataProfile: DataProfile | null;
  onChangeConfig: (updater: (prev: PipelineConfig) => PipelineConfig) => void;
  onSelectSampleDataset: (sampleId: string) => void;
  onUploadCsvClick: () => void;
}

const MODEL_OPTIONS: { id: ModelFamily; label: string }[] = [
  { id: 'HistGradientBoosting', label: 'HistGradientBoosting' },
  { id: 'LightGBM', label: 'LightGBM' },
  { id: 'XGBoost', label: 'XGBoost' },
  { id: 'CatBoost', label: 'CatBoost' },
  { id: 'RandomForest', label: 'RandomForest' },
  { id: 'ExtraTrees', label: 'ExtraTrees' },
  { id: 'LinearModel', label: 'Logistic / Ridge Regression' },
  { id: 'MLPNeuralNet', label: 'MLP Neural Network' },
];

export const LeftPipelineSidebar: React.FC<LeftPipelineSidebarProps> = ({
  config,
  dataProfile,
  onChangeConfig,
  onSelectSampleDataset,
  onUploadCsvClick,
}) => {
  const [openSection, setOpenSection] = useState<number>(1);

  const toggleSection = (sec: number) => {
    setOpenSection((prev) => (prev === sec ? 0 : sec));
  };

  const columns = dataProfile?.columns || [];

  const handleRoleToggle = (colName: string, role: 'numeric' | 'categorical' | 'drop') => {
    if (colName === config.targetColumn) return;
    onChangeConfig((prev) => {
      const numSet = new Set(prev.numericColumns.filter((c) => c !== colName));
      const catSet = new Set(prev.categoricalColumns.filter((c) => c !== colName));
      const dropSet = new Set(prev.dropColumns.filter((c) => c !== colName));

      if (role === 'numeric') numSet.add(colName);
      if (role === 'categorical') catSet.add(colName);
      if (role === 'drop') dropSet.add(colName);

      return {
        ...prev,
        numericColumns: Array.from(numSet),
        categoricalColumns: Array.from(catSet),
        dropColumns: Array.from(dropSet),
      };
    });
  };

  const handleTargetChange = (newTarget: string) => {
    const colMeta = columns.find((c) => c.name === newTarget);
    const guessedTask: TaskType =
      colMeta && colMeta.nunique <= 10 ? 'classification' : config.taskType;

    onChangeConfig((prev) => ({
      ...prev,
      targetColumn: newTarget,
      taskType: guessedTask,
      numericColumns: prev.numericColumns.filter((c) => c !== newTarget),
      categoricalColumns: prev.categoricalColumns.filter((c) => c !== newTarget),
      dropColumns: prev.dropColumns.filter((c) => c !== newTarget),
    }));
  };

  return (
    <aside className="w-full h-full bg-[#202124] border-r border-[#3c4043] flex flex-col overflow-hidden select-none">
      {/* Minimal Header */}
      <div className="px-3.5 py-2.5 border-b border-[#3c4043] flex items-center justify-between">
        <span className="text-xs font-semibold text-[#e8eaed]">
          Pipeline Configuration
        </span>
        <span className="text-[11px] font-mono text-[#9aa0a6]">
          sklearn.pipeline
        </span>
      </div>

      {/* Accordion Sections */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#3c4043] custom-scrollbar">
        {/* ==================== 1. DATASET & TARGET ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(1)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              1. Dataset & Feature Roles
            </span>
            {openSection === 1 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 1 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              {/* Source Tabs */}
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded bg-[#202124] border border-[#3c4043] text-[11px]">
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'sample' }))
                  }
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'sample'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  Sample
                </button>
                <button
                  type="button"
                  onClick={onUploadCsvClick}
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'upload'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  Local CSV
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onChangeConfig((p) => ({ ...p, datasetSource: 'cloud_url' }))
                  }
                  className={`py-1 rounded-sm transition-colors ${
                    config.datasetSource === 'cloud_url'
                      ? 'bg-[#303134] text-[#e8eaed] font-medium'
                      : 'text-[#9aa0a6] hover:text-[#e8eaed]'
                  }`}
                >
                  URL / Path
                </button>
              </div>

              {config.datasetSource === 'sample' && (
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    Dataset
                  </label>
                  <select
                    value={config.sampleDatasetId}
                    onChange={(e) => onSelectSampleDataset(e.target.value)}
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                  >
                    {SAMPLE_DATASETS.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.rowsCount} rows)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {config.datasetSource === 'upload' && (
                <div className="p-2.5 rounded bg-[#202124] border border-[#3c4043] flex items-center justify-between">
                  <span className="text-xs font-mono text-[#e8eaed] truncate">
                    {config.uploadedFileName || 'No file selected'}
                  </span>
                  <button
                    type="button"
                    onClick={onUploadCsvClick}
                    className="px-2 py-1 rounded bg-[#303134] hover:bg-[#3c4043] text-[#e8eaed] text-[11px] shrink-0"
                  >
                    Browse...
                  </button>
                </div>
              )}

              {config.datasetSource === 'cloud_url' && (
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    CSV Path or URL
                  </label>
                  <input
                    type="text"
                    placeholder="/kaggle/input/... or https://..."
                    value={config.cloudDatasetUrl}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        cloudDatasetUrl: e.target.value,
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono focus:outline-none focus:border-[#8ab4f8]"
                  />
                </div>
              )}

              {/* Target & Task */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    Target column (y)
                  </label>
                  <select
                    value={config.targetColumn}
                    onChange={(e) => handleTargetChange(e.target.value)}
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#8ab4f8] font-mono focus:outline-none focus:border-[#8ab4f8]"
                  >
                    {columns.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name} ({c.nunique})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-[#9aa0a6] block mb-1">
                    Task type
                  </label>
                  <select
                    value={config.taskType}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        taskType: e.target.value as TaskType,
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] focus:outline-none focus:border-[#8ab4f8]"
                  >
                    <option value="classification">Classification</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
              </div>

              {/* Feature Role Table */}
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#9aa0a6] mb-1">
                  <span>Columns ({columns.length - 1})</span>
                  <span className="font-mono text-[10px]">
                    num:{config.numericColumns.length} cat:{config.categoricalColumns.length} drop:{config.dropColumns.length}
                  </span>
                </div>
                <div className="max-h-44 overflow-y-auto rounded border border-[#3c4043] bg-[#202124] divide-y divide-[#292a2d]">
                  {columns
                    .filter((c) => c.name !== config.targetColumn)
                    .map((col) => {
                      const isNum = config.numericColumns.includes(col.name);
                      const isCat = config.categoricalColumns.includes(col.name);
                      const isDrop = config.dropColumns.includes(col.name);
                      return (
                        <div
                          key={col.name}
                          className="px-2 py-1.5 flex items-center justify-between gap-1 text-[11px]"
                        >
                          <div className="min-w-0 flex-1 flex items-center gap-1.5">
                            <span
                              className={`font-mono truncate ${
                                isDrop ? 'line-through text-[#5f6368]' : 'text-[#e8eaed]'
                              }`}
                              title={col.name}
                            >
                              {col.name}
                            </span>
                            {col.missing_pct > 0 && (
                              <span className="text-[10px] font-mono text-[#9aa0a6]">
                                ({col.missing_pct}% NaN)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0 font-mono">
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'numeric')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isNum
                                  ? 'bg-[#8ab4f8] text-[#202124] font-semibold'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              num
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'categorical')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isCat
                                  ? 'bg-[#8ab4f8] text-[#202124] font-semibold'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              cat
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(col.name, 'drop')}
                              className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                                isDrop
                                  ? 'bg-[#5f6368] text-[#e8eaed]'
                                  : 'bg-[#292a2d] text-[#9aa0a6] hover:text-[#e8eaed]'
                              }`}
                            >
                              drop
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== 2. PREPROCESSING ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(2)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              2. Preprocessing (ColumnTransformer)
            </span>
            {openSection === 2 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 2 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              <div className="space-y-2">
                <span className="text-[11px] font-medium text-[#9aa0a6] block">
                  Numeric features
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Imputer
                    </label>
                    <select
                      value={config.numericImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericImputer: e.target.value as NumericImputerStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="median">median</option>
                      <option value="mean">mean</option>
                      <option value="most_frequent">most_frequent</option>
                      <option value="constant_zero">constant (0)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Scaler
                    </label>
                    <select
                      value={config.numericScaler}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          numericScaler: e.target.value as NumericScalerStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="robust">RobustScaler</option>
                      <option value="standard">StandardScaler</option>
                      <option value="minmax">MinMaxScaler</option>
                      <option value="none">passthrough</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] pt-0.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.addMissingIndicator}
                    onChange={() =>
                      onChangeConfig((p) => ({
                        ...p,
                        addMissingIndicator: !p.addMissingIndicator,
                      }))
                    }
                    className="accent-[#8ab4f8]"
                  />
                  <span>add_indicator=True (Missing mask)</span>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#292a2d]">
                <span className="text-[11px] font-medium text-[#9aa0a6] block">
                  Categorical features
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Imputer
                    </label>
                    <select
                      value={config.categoricalImputer}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalImputer: e.target.value as CategoricalImputerStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="most_frequent">most_frequent</option>
                      <option value="constant_missing">constant ('Missing')</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Encoder
                    </label>
                    <select
                      value={config.categoricalEncoder}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          categoricalEncoder: e.target.value as CategoricalEncoderStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1 text-xs text-[#e8eaed]"
                    >
                      <option value="onehot">OneHotEncoder</option>
                      <option value="ordinal">OrdinalEncoder</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ==================== 3. VALIDATION & SPLIT ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(3)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              3. Validation & Class Balance
            </span>
            {openSection === 3 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 3 && (
            <div className="px-3.5 pb-3.5 pt-1 space-y-3 bg-[#18191a]">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    CV Folds
                  </label>
                  <select
                    value={config.cvFolds}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        cvFolds: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value={3}>3-Fold CV</option>
                    <option value={5}>5-Fold CV</option>
                    <option value={10}>10-Fold CV</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-[#9aa0a6] block mb-1">
                    Holdout test_size
                  </label>
                  <select
                    value={config.testSize}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        testSize: Number(e.target.value),
                      }))
                    }
                    className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                  >
                    <option value={0.15}>0.15 (15%)</option>
                    <option value={0.2}>0.20 (20%)</option>
                    <option value={0.25}>0.25 (25%)</option>
                    <option value={0.3}>0.30 (30%)</option>
                  </select>
                </div>
              </div>

              {config.taskType === 'classification' && (
                <>
                  <div>
                    <label className="text-[10px] text-[#9aa0a6] block mb-1">
                      Imbalance handling
                    </label>
                    <select
                      value={config.imbalanceStrategy}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          imbalanceStrategy: e.target.value as ImbalanceStrategy,
                        }))
                      }
                      className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed]"
                    >
                      <option value="class_weight">class_weight='balanced'</option>
                      <option value="random_oversample">Random Oversample (train fold)</option>
                      <option value="none">None</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-xs text-[#9aa0a6] hover:text-[#e8eaed] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.stratifiedCV}
                      onChange={() =>
                        onChangeConfig((p) => ({
                          ...p,
                          stratifiedCV: !p.stratifiedCV,
                        }))
                      }
                      className="accent-[#8ab4f8]"
                    />
                    <span>Stratified split & K-Fold</span>
                  </label>
                </>
              )}
            </div>
          )}
        </div>

        {/* ==================== 4. MODEL & HYPERPARAMETERS ==================== */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection(4)}
            className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-[#292a2d] transition-colors text-left"
          >
            <span className="text-xs font-medium text-[#e8eaed]">
              4. Estimator & Hyperparameters
            </span>
            {openSection === 4 ? (
              <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6]" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6]" />
            )}
          </button>

          {openSection === 4 && (
            <div className="px-3.5 pb-4 pt-1 space-y-3 bg-[#18191a]">
              <div>
                <label className="text-[10px] text-[#9aa0a6] block mb-1">
                  Estimator
                </label>
                <select
                  value={config.modelFamily}
                  onChange={(e) =>
                    onChangeConfig((p) => ({
                      ...p,
                      modelFamily: e.target.value as ModelFamily,
                    }))
                  }
                  className="w-full bg-[#202124] border border-[#3c4043] rounded px-2 py-1.5 text-xs text-[#e8eaed] font-mono focus:outline-none focus:border-[#8ab4f8]"
                >
                  {MODEL_OPTIONS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2.5 pt-1">
                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-0.5">
                    <span className="text-[#9aa0a6]">n_estimators</span>
                    <span className="text-[#e8eaed]">
                      {config.hyperparameters.nEstimators}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={30}
                    max={500}
                    step={10}
                    value={config.hyperparameters.nEstimators}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        hyperparameters: {
                          ...p.hyperparameters,
                          nEstimators: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono mb-0.5">
                    <span className="text-[#9aa0a6]">learning_rate</span>
                    <span className="text-[#e8eaed]">
                      {config.hyperparameters.learningRate}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.01}
                    max={0.3}
                    step={0.01}
                    value={config.hyperparameters.learningRate}
                    onChange={(e) =>
                      onChangeConfig((p) => ({
                        ...p,
                        hyperparameters: {
                          ...p.hyperparameters,
                          learningRate: Number(e.target.value),
                        },
                      }))
                    }
                    className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-0.5">
                      <span className="text-[#9aa0a6]">max_depth</span>
                      <span className="text-[#e8eaed]">
                        {config.hyperparameters.maxDepth}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={16}
                      step={1}
                      value={config.hyperparameters.maxDepth}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          hyperparameters: {
                            ...p.hyperparameters,
                            maxDepth: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-mono mb-0.5">
                      <span className="text-[#9aa0a6]">l2_reg</span>
                      <span className="text-[#e8eaed]">
                        {config.hyperparameters.l2Regularization}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.0}
                      max={10.0}
                      step={0.5}
                      value={config.hyperparameters.l2Regularization}
                      onChange={(e) =>
                        onChangeConfig((p) => ({
                          ...p,
                          hyperparameters: {
                            ...p.hyperparameters,
                            l2Regularization: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full accent-[#8ab4f8] h-1 bg-[#3c4043] rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
